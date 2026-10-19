"""The film's objects and their state at every frame (scenes 01–05).

Timing comes from scene-data.json (the Remotion config), so the 3D action
lines up with the headlines, checklist and sound composited in Remotion."""

import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

from .common import (
    DATA,
    LAST_3D_FRAME,
    S1,
    S2,
    S3,
    S4,
    S5,
    SCENES,
    THICK,
    lerp,
    lerp3,
    local,
    mm,
    plot_progress,
    point_at,
    ramp,
    sheet_xy,
    toolpath_state,
)
from .geometry import bisect_x, box_mesh, look_at_matrix, obj, ribbon, slab_mesh
from .rig import PALLET_TOP, TIP_UP, Gantry, pallet, pen

Z_TOP = mm(THICK)
CUT_Z = Z_TOP - 0.002
SENSOR = 36.0

# Ribbon widths (m) for the plotted drawing and the cut lines
W_PART, W_LINE, W_DIM, W_TICK, W_KERF = 0.0065, 0.005, 0.0038, 0.003, 0.0055


def parts_by_id():
    return {p["id"]: p for p in DATA["parts"]}


def square_tabletop():
    """In 3D the tabletop is square-cornered, so its end face shows the edge
    profile as a clean cross-section in scene 03."""
    return [(0, 0), (1600, 0), (1600, 800), (0, 800), (0, 0)]


def sheet_toolpath():
    """The exported toolpath, with the tabletop contour made square."""
    segs = [dict(s) for s in DATA["sheetToolpath"]]
    tt = parts_by_id()["tabletop"]
    nx, ny = tt["nest"]["x"], tt["nest"]["y"]
    rect = [(nx + x, ny + y) for x, y in square_tabletop()]
    lead = 36
    start = rect[0]
    lead_in = (start[0] - lead * 0.6, start[1] - lead)
    lead_out = (start[0] + lead * 0.6, start[1] - lead)
    segs[0] = {"type": "cut", "pts": [lead_in, *rect, lead_out]}
    segs[1] = {"type": "rapid", "pts": [lead_out, segs[1]["pts"][1]]}
    return segs


def dashes(pts, pattern):
    """Split a polyline into dash polylines (pattern in mm, on/off pairs)."""
    total = 0.0
    lengths = [0.0]
    for i in range(1, len(pts)):
        total += math.dist(pts[i - 1], pts[i])
        lengths.append(total)
    out, pos, k = [], 0.0, 0
    while pos < total:
        on = pattern[k % len(pattern)]
        off = pattern[(k + 1) % len(pattern)]
        a, b = pos, min(total, pos + on)
        out.append([point_at(pts, a / total), point_at(pts, b / total)])
        pos = b + off
        k += 2
    return out


class Film:
    def __init__(self, layout, rec, mats):
        self.L = layout
        self.rec = rec
        self.m = mats
        self.W, self.H = layout["width"], layout["height"]
        self.parts = parts_by_id()
        self.toolpath = sheet_toolpath()
        self._build_sheet_scene()
        self._build_tabletop()
        self._build_panel()
        self._build_stacks()
        self.gantry = Gantry(mats)
        self.pen = pen(mats)
        self._build_camera()
        self._smooth_cache = {}

    # ------------------------------------------------------------------ build

    def _part_slab(self, name, part, origin_center=False):
        outline = square_tabletop() if part["id"] == "tabletop" else part["outline"]
        if origin_center:
            cx, cy = part["w"] / 2, part["h"] / 2
            pts = [(mm(x - cx), -mm(y - cy)) for x, y in outline]
            off = (part["nest"]["x"] + cx, part["nest"]["y"] + cy, 0.0)
        else:
            pts = [(mm(x), -mm(y)) for x, y in outline]
            off = (part["nest"]["x"], part["nest"]["y"], 0.0)
        o = obj(name, slab_mesh(name, pts), self.m.terrazzo)
        o["tex_off"] = off
        return o

    def _build_sheet_scene(self):
        m = self.m
        rect = [(0, 0), (2.8, 0), (2.8, -1.4), (0, -1.4)]
        x0, y0 = sheet_xy(0, 0)
        self.sheet = obj("Sheet", slab_mesh("Sheet", rect), m.terrazzo, (x0, y0, 0))
        self.sheet["tex_off"] = (0.0, 0.0, 0.0)

        holes = []
        for p in DATA["parts"]:
            outline = square_tabletop() if p["id"] == "tabletop" else p["outline"]
            holes.append([(mm(p["nest"]["x"] + x), -mm(p["nest"]["y"] + y)) for x, y in outline])
        self.skeleton = obj("Skeleton", slab_mesh("Skeleton", rect, holes), m.terrazzo, (x0, y0, 0))
        self.skeleton["tex_off"] = (0.0, 0.0, 0.0)

        self.part_objs = {}
        for p in DATA["parts"]:
            center = p["id"] == "tabletop"
            o = self._part_slab(f"Part-{p['id']}", p, origin_center=center)
            self.part_objs[p["id"]] = o

        # Plotted drawing (world coordinates on the sheet surface)
        strokes = [dict(s) for s in DATA["plotStrokes"]]
        tt = self.parts["tabletop"]
        dx, dy, s = tt["drawing"]["x"], tt["drawing"]["y"], DATA["drawScale"]
        r = [(dx + x * s, dy + y * s) for x, y in square_tabletop()]
        strokes[0] = {"kind": "part", "pts": [r[1], r[2], r[3], r[0], r[1]]}
        self.plot_strokes = strokes
        self.plot_objs = []
        widths = {"part": W_PART, "line": W_LINE, "center": W_DIM, "dim": W_DIM, "tick": W_TICK}
        for i, st in enumerate(strokes):
            pl = [sheet_xy(x, y) for x, y in st["pts"]]
            lines = [pl] if st["kind"] != "center" else [
                [sheet_xy(*a), sheet_xy(*b)] for a, b in dashes(st["pts"], [45, 14, 8, 14])
            ]
            o = ribbon(f"Plot{i:02d}-{st['kind']}", lines, widths[st["kind"]], m.ink, z=Z_TOP + 0.0002)
            self.plot_objs.append(o)
        self.dim_strokes = DATA["dimensionStrokes"]
        self.dim_objs = [
            ribbon(f"Dim{i:02d}", [[sheet_xy(x, y) for x, y in st["pts"]]], widths[st["kind"]], m.ink, z=Z_TOP + 0.0002)
            for i, st in enumerate(self.dim_strokes)
        ]

        # Part outlines that slide from the drawing into the nest (scene 02)
        self.part_lines = {}
        for p in DATA["parts"]:
            outline = square_tabletop() if p["id"] == "tabletop" else p["outline"]
            pl = [(mm(x), -mm(y)) for x, y in outline]
            self.part_lines[p["id"]] = ribbon(f"PartLine-{p['id']}", [pl], W_PART, m.ink, z=Z_TOP + 0.00025)

        # Kerfs: one per cutting move, revealed behind the tool
        self.kerfs = []
        for i, seg in enumerate(self.toolpath):
            if seg["type"] != "cut":
                continue
            o = ribbon(f"Kerf{i:02d}", [[sheet_xy(x, y) for x, y in seg["pts"]]], W_KERF, m.kerf, z=Z_TOP + 0.0003)
            self.kerfs.append((i, o))

    def _build_tabletop(self):
        """Tabletop for scene 03: the end-face cross-section extruded along
        its length, with shape keys for each edge profile."""
        prof = DATA["profiles"]
        T = prof["thickness"]
        n = prof["points"]
        order = ["square", "bullnose", "chamfer", "bevelled"]
        width = 800.0

        def section(contour):
            left = [(-width - x, y) for x, y in reversed(contour)]
            loop = list(contour) + left
            # local Y across the width (centred), Z up from the floor
            return [(mm(x + width / 2), mm(T - y)) for x, y in loop]

        sections = [section(prof["contours"][k]) for k in order]
        L = 1.6
        me = bpy.data.meshes.new("Tabletop")
        verts = []
        for x in (-L / 2, L / 2):
            for yy, zz in sections[0]:
                verts.append((x, yy, zz))
        m_ = len(sections[0])
        faces = [list(range(m_))[::-1], list(range(m_, 2 * m_))]
        for i in range(m_):
            j = (i + 1) % m_
            faces.append([i, j, m_ + j, m_ + i])
        me.from_pydata(verts, [], faces)
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        me.update()
        o = obj("Tabletop", me, self.m.slab)
        tt = self.parts["tabletop"]
        o["tex_off"] = (tt["nest"]["x"] + 800.0, tt["nest"]["y"] + 400.0, 0.0)
        o.shape_key_add(name="square")
        for k, sec in zip(order[1:], sections[1:]):
            sk = o.shape_key_add(name=k)
            for idx, (x, _) in enumerate([(v[0], None) for v in verts]):
                yy, zz = sec[idx % m_]
                sk.data[idx].co = (x, yy, zz)
        self.tabletop = o
        self.profile_sections = sections
        self.profile_n = n

    def _build_panel(self):
        P = DATA["panel"]
        Wp, Hp = P["w"], P["h"]

        def to_local(u, v):
            # panel mm (u right, v down from the top) → build plane (x, y=height)
            return (mm(u) - mm(Wp) / 2, mm(Hp - v))

        outer = [to_local(0, 0), to_local(Wp, 0), to_local(Wp, Hp), to_local(0, Hp)]
        holes = [[to_local(u, v) for u, v in c["outline"]] for c in DATA["cutouts"]]
        me = slab_mesh("Panel", outer, holes)
        # build plane (x, y, z=thickness) → panel local (x, y=thickness, z=height)
        me.transform(Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, 1, 0, 0), (0, 0, 0, 1))))
        bisect_x(me, 0.02, -mm(Wp) / 2, mm(Wp) / 2)
        self.panel = obj("Panel", me, self.m.terrazzo)
        # texture: panel X ↔ sheet x around the sheet centre
        self.panel["tex_off"] = (1400.0, 700.0, 0.0)
        bend = self.panel.modifiers.new("Bend", "SIMPLE_DEFORM")
        bend.deform_method = "BEND"
        bend.deform_axis = "Z"
        bend.angle = 0.0
        self.bend = bend

        self.plugs, self.cut_kerfs = [], []
        for i, c in enumerate(DATA["cutouts"]):
            pts = [to_local(u, v) for u, v in c["outline"]]
            pm = slab_mesh(f"Plug{i:02d}", pts)
            pm.transform(Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, 1, 0, 0), (0, 0, 0, 1))))
            plug = obj(f"Plug{i:02d}", pm, self.m.terrazzo, parent=self.panel)
            plug["tex_off"] = (1400.0, 700.0, 0.0)
            self.plugs.append(plug)
            k = ribbon(f"CutKerf{i:02d}", [pts], W_KERF, self.m.kerf, z=0.0)
            k.parent = self.panel
            k.rotation_euler = (math.pi / 2, 0, 0)
            k.location = (0, -0.0004, 0)
            self.cut_kerfs.append(k)
        self.panel_toolpath = DATA["panelToolpath"]
        self.cut_index = []
        for c in DATA["cutouts"]:
            for j, s in enumerate(self.panel_toolpath):
                if s["type"] == "cut" and s["pts"] == c["outline"]:
                    self.cut_index.append(j)
                    break

    def _panel_world(self, u, v):
        """Panel mm → world point while the panel lies flat (scene 04)."""
        P = DATA["panel"]
        return (mm(u) - mm(P["w"]) / 2, -mm(P["h"]) / 2 + mm(P["h"] - v))

    def _build_stacks(self):
        m = self.m
        self.stack_root = obj("Stacks", None)
        self.pallet_a = pallet(m, "PalletSheets", 2.8, 1.4)
        self.pallet_b = pallet(m, "PalletParts", 1.7, 0.95)
        self.pallet_a.parent = self.stack_root
        self.pallet_b.parent = self.stack_root
        self.pallet_a.location = (-0.95, 0.55, 0)
        self.pallet_b.location = (1.35, -0.75, 0)
        rect = [(-1.4, 0.7), (1.4, 0.7), (1.4, -0.7), (-1.4, -0.7)]
        self.stack_sheets = []
        for i in range(5):
            o = obj(f"StackSheet{i}", slab_mesh(f"StackSheet{i}", rect), m.terrazzo, parent=self.pallet_a)
            o["tex_off"] = (1400.0 + i * 37.0, 700.0 + i * 23.0, 0.0)
            self.stack_sheets.append(o)
        layout = [
            ("tabletop", (0.0, 0.0), 0, False),
            ("tableLegA", (-0.52, 0.05), 1, False),
            ("tableLegB", (0.04, 0.05), 1, False),
            ("benchLegA", (0.62, 0.17), 1, True),
            ("benchLegB", (0.62, -0.21), 1, True),
            ("benchSeat", (0.0, -0.18), 2, False),
        ]
        self.stack_parts = []
        for pid, (x, y), level, rot in layout:
            p = self.parts[pid]
            o = self._part_slab(f"StackPart-{pid}", p, origin_center=True if pid == "tabletop" else False)
            if pid != "tabletop":
                # recentre the part mesh on its origin
                o.data.transform(Matrix.Translation((-mm(p["w"]) / 2, mm(p["h"]) / 2, 0)))
                o["tex_off"] = (p["nest"]["x"] + p["w"] / 2, p["nest"]["y"] + p["h"] / 2, 0.0)
            o.parent = self.pallet_b
            o.rotation_euler = (0, 0, math.pi / 2 if rot else 0)
            self.stack_parts.append((o, (x, y), level))

        # Offcuts, laid out in front of the parts pallet
        self.offcuts = []
        spots = [(-0.35, -0.05), (0.55, -0.05), (-0.2, -0.45), (0.25, -0.45), (0.65, -0.45), (0.95, -0.25), (1.1, -0.05)]
        for i, (oc, spot) in enumerate(zip(DATA["offcuts"], spots)):
            b = oc["bounds"]
            pts = [(mm(x - b["x"] - b["w"] / 2), -mm(y - b["y"] - b["h"] / 2)) for x, y in oc["outline"]]
            o = obj(f"Offcut-{oc['id']}", slab_mesh(f"Offcut{i}", pts), m.terrazzo, parent=self.stack_root)
            o["tex_off"] = (b["x"] + b["w"] / 2, b["y"] + b["h"] / 2, 0.0)
            scale = 0.55 if oc["id"] in ("strip", "bar", "block") else 0.8
            o.scale = (scale, scale, 1)
            self.offcuts.append((o, spot))

        # Offcuts gather at the grinder spot, burst into chips, and the chips
        # land where the new strip is growing at that moment.
        self.grind_spot = (0.04, -2.03)
        self.new_panel_origin = (0.26, -2.11)
        nx, ny = self.new_panel_origin
        self.new_panel = obj("NewPanel", slab_mesh("NewPanel", [(0, 0.22), (2.6, 0.22), (2.6, -0.22), (0, -0.22)]), m.terrazzo, parent=self.stack_root)
        self.new_panel["tex_off"] = (100.0, 900.0, 0.0)
        g0, g1 = S5["granules"]
        spread = g1 - g0
        rng = random.Random(11)
        self.chips = []
        for i in range(170):
            r = rng.uniform(0.018, 0.045)
            sides = rng.randint(5, 7)
            pts = []
            for k in range(sides):
                a = 2 * math.pi * k / sides + rng.uniform(-0.3, 0.3)
                rr = r * rng.uniform(0.6, 1.0)
                pts.append((math.cos(a) * rr, math.sin(a) * rr))
            me = slab_mesh(f"Chip{i}", pts, thickness=0.012)
            o = obj(f"Chip{i:03d}", me, rng.choice(self.m.chips), parent=self.stack_root)
            start, dur = rng.random(), rng.uniform(0.5, 0.7)
            land = g0 + start * spread * 0.3 + spread * dur
            reach = ramp(land, S5["newPanel"], "inOut")
            gx, gy = self.grind_spot
            self.chips.append({
                "obj": o,
                "start": start,
                "dur": dur,
                "from": (gx + rng.uniform(-0.18, 0.18), gy + rng.uniform(-0.12, 0.12)),
                "to": (nx + max(0.05, 2.6 * reach - rng.uniform(0.02, 0.25)), ny + rng.uniform(-0.18, 0.18)),
                "arc": rng.uniform(0.35, 0.8),
                "spin": (rng.uniform(-6, 6), rng.uniform(-6, 6), rng.uniform(-6, 6)),
            })

    def _build_camera(self):
        cam = bpy.data.cameras.new("Camera")
        cam.sensor_fit = "HORIZONTAL"
        cam.sensor_width = SENSOR
        cam.clip_start = 0.01
        cam.clip_end = 100
        cam.dof.use_dof = True
        self.cam_data = cam
        self.cam = obj("Camera", cam)
        bpy.context.scene.camera = self.cam

    # ------------------------------------------------------------- helpers

    def vis(self, o, on, f):
        self.rec.set(o, "hide_render", not on, f)
        self.rec.set(o, "hide_viewport", not on, f)

    def alpha(self, o, a, f):
        self.rec.set(o, "color", max(0.0, min(1.0, a)), f, index=3)

    def f_px(self, lens):
        return lens / SENSOR * self.W

    def shot(self, f, target, dist, elev_deg, lens, anchor, az_deg=0.0, fstop=8.0):
        """Camera `dist` metres from `target`, elevation/azimuth in degrees,
        with lens shift putting the target at screen point `anchor` (px)."""
        e, a = math.radians(elev_deg), math.radians(az_deg)
        d = Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e)))
        eye = Vector(target) + d * dist
        rot = look_at_matrix(eye, target)
        self.rec.set(self.cam, "location", tuple(eye), f)
        self.rec.set(self.cam, "rotation_euler", tuple(rot.to_euler("XYZ")), f)
        big = max(self.W, self.H)
        self.rec.set(self.cam_data, "lens", lens, f)
        self.rec.set(self.cam_data, "shift_x", -(anchor[0] - self.W / 2) / big, f)
        self.rec.set(self.cam_data, "shift_y", (anchor[1] - self.H / 2) / big, f)
        self.rec.set(self.cam_data, "dof.focus_distance", dist, f)
        self.rec.set(self.cam_data, "dof.aperture_fstop", fstop, f)

    def dist_for(self, px_per_mm, lens):
        return self.f_px(lens) / px_per_mm / 1000.0

    # ------------------------------------------------------------- frames

    def update(self, f):
        self._sheet_scene(f)
        self._tabletop_scene(f)
        self._panel_scene(f)
        self._stack_scene(f)
        self._camera(f)

    # Scene 01–02 ----------------------------------------------------------

    def _sheet_scene(self, f):
        rec = self.rec
        s1, s2 = SCENES["drawing"], SCENES["cutting"]
        l1, l2 = local("drawing", f), local("cutting", f)
        active = s1["from"] <= f < s2["from"] + s2["durationInFrames"]

        # Plot
        t_plot = ramp(f, S1["plot"], "linear") ** 1.6
        plot, pen_pt = plot_progress([s["pts"] for s in self.plot_strokes], t_plot)
        dims, _ = plot_progress([s["pts"] for s in self.dim_strokes], ramp(l1, S1["dims"], "standard"))
        detail_alpha = 1 - ramp(l2, S2["drawingFade"], "standard") if l2 >= 0 else 1.0
        in_s1 = f < s2["from"]
        for i, (o, st) in enumerate(zip(self.plot_objs, self.plot_strokes)):
            p = plot[i]
            is_part = st["kind"] == "part"
            on = active and p > 0 and (in_s1 or not is_part) and detail_alpha > 0
            self.vis(o, on, f)
            if st["kind"] == "center":
                rec.set(o.data, "bevel_factor_end", 1.0, f)
                self.alpha(o, min(1, p * 1.5) * detail_alpha, f)
            else:
                rec.set(o.data, "bevel_factor_end", max(0.0, min(1.0, p)), f)
                self.alpha(o, detail_alpha, f)
        for o, p in zip(self.dim_objs, dims):
            self.vis(o, active and p > 0 and detail_alpha > 0, f)
            rec.set(o.data, "bevel_factor_end", max(0.0, min(1.0, p)), f)
            self.alpha(o, detail_alpha, f)

        # Pen follows the plot
        self.vis_tree(self.pen, in_s1 and pen_pt is not None, f)
        if pen_pt is not None:
            x, y = sheet_xy(*pen_pt)
            rec.set(self.pen, "location", (x, y, Z_TOP + 0.0004), f)

        # Toolpath and gantry (scene 02)
        t_tool = ramp(l2, S2["toolpath"], "standard") if l2 >= 0 else 0.0
        progress, head, head_type = toolpath_state(self.toolpath, t_tool)
        for i, o in self.kerfs:
            rec.set(o.data, "bevel_factor_end", max(0.0, min(1.0, progress[i])), f)

        lift = ramp(l2, S2["lift"]) if l2 >= 0 else 0.0
        iso = ramp(l2, S2["isolate"], "inOut") if l2 >= 0 else 0.0
        others = ramp(l2, S2["othersOut"], "standard") if l2 >= 0 else 0.0
        sheet_out = ramp(l2, S2["sheetOut"], "in") if l2 >= 0 else 0.0
        swapped = l2 >= S2["lift"][0]

        self.vis(self.sheet, active and not swapped, f)
        self.vis(self.skeleton, active and swapped and sheet_out < 1, f)
        # The skeleton and its kerfs slide out towards the camera
        sk_off = -2.2 * sheet_out
        x0, y0 = sheet_xy(0, 0)
        rec.set(self.skeleton, "location", (x0, y0 + sk_off, 0.0), f)
        for i, o in self.kerfs:
            self.vis(o, active and progress[i] > 0 and sheet_out < 1, f)
            rec.set(o, "location", (0.0, sk_off, Z_TOP + 0.0003), f)

        # Part outlines slide from the drawing to the nest
        sep_t = {}
        for p in DATA["parts"]:
            start = S2["separate"][0] + p["stagger"] * S2["separateStagger"]
            t = ramp(l2, (start, start + S2["separateEach"]), "inOut") if l2 >= 0 else 0.0
            sep_t[p["id"]] = t
            s = lerp(DATA["drawScale"], 1.0, t)
            px = lerp(p["drawing"]["x"], p["nest"]["x"], t)
            py = lerp(p["drawing"]["y"], p["nest"]["y"], t)
            x, y = sheet_xy(px, py)
            o = self.part_lines[p["id"]]
            cut_done = self._part_cut_done(p, progress)
            self.vis(o, (not in_s1) and active and not cut_done, f)
            rec.set(o, "location", (x, y, Z_TOP + 0.00025), f)
            rec.set(o, "scale", (s, s, 0.12), f)

        # Cut parts: lift, then the tabletop moves to centre
        tt = self.parts["tabletop"]
        for pid, o in self.part_objs.items():
            p = self.parts[pid]
            if pid == "tabletop":
                cx, cy = sheet_xy(p["nest"]["x"] + 800, p["nest"]["y"] + 400)
                pos = lerp3((cx, cy, 0.03 * lift), (0.0, 0.0, 0.0), iso)
                rec.set(o, "location", pos, f)
                self.vis(o, active and swapped, f)
                self.alpha(o, 1.0, f)
            else:
                x, y = sheet_xy(p["nest"]["x"], p["nest"]["y"])
                away = Vector((x + mm(p["w"]) / 2, y - mm(p["h"]) / 2, 0)).normalized()
                pos = (x + away.x * 1.6 * others, y + away.y * 1.6 * others, 0.03 * lift + 0.25 * others)
                rec.set(o, "location", pos, f)
                self.vis(o, active and swapped and others < 1, f)
                self.alpha(o, 1 - others, f)

        # Gantry: rolls in, cuts, rolls out
        g_on = 0 <= l2 < S2["sheetOut"][0]
        self.gantry.visible(rec, f, g_on)
        if l2 >= 0:
            first = self.toolpath[0]["pts"][0]
            last = self.toolpath[-1]["pts"][-1]
            far = 3.8
            if l2 < S2["toolpath"][0]:
                t_in = ramp(l2, (0, 32), "inOut")
                tx, ty = sheet_xy(*first)
                y = lerp(ty + far, ty, t_in)
                rails = lerp(far, 0.0, t_in)
                self.gantry.set_tool(rec, f, tx, y, Z_TOP + TIP_UP, rails)
            elif t_tool < 1:
                tx, ty = sheet_xy(*head)
                z = self._smoothed_tool_z("sheet", f, l2)
                self.gantry.set_tool(rec, f, tx, ty, z, 0.0)
            else:
                t_out = ramp(l2, (S2["toolpath"][1], S2["toolpath"][1] + 16), "in")
                tx, ty = sheet_xy(*last)
                self.gantry.set_tool(rec, f, tx, lerp(ty, ty + far, t_out), Z_TOP + TIP_UP, lerp(0.0, far, t_out))

    def _part_cut_done(self, p, progress):
        nest = (p["nest"]["x"], p["nest"]["y"])
        for i, o in self.kerfs:
            seg = self.toolpath[i]
            first = seg["pts"][1]
            outline = square_tabletop() if p["id"] == "tabletop" else p["outline"]
            if abs(first[0] - (nest[0] + outline[0][0])) < 1e-6 and abs(first[1] - (nest[1] + outline[0][1])) < 1e-6:
                return progress[i] >= 1
        return False

    def _smoothed_tool_z(self, key, f, l):
        """Tool height with plunges and lifts eased over a few frames."""
        cache = self._smooth_cache.setdefault(key, {})

        def raw(lf):
            if key == "sheet":
                t = ramp(lf, S2["toolpath"], "standard")
                _, _, kind = toolpath_state(self.toolpath, t)
            else:
                t = ramp(lf, S4["toolpath"], "standard")
                _, _, kind = toolpath_state(self.panel_toolpath, t)
            return CUT_Z if kind == "cut" else Z_TOP + TIP_UP

        vals = []
        for k in range(-2, 3):
            lf = l + k
            if lf not in cache:
                cache[lf] = raw(lf)
            vals.append(cache[lf])
        return sum(vals) / len(vals)

    def vis_tree(self, root, on, f):
        def walk(o):
            yield o
            for c in o.children:
                yield from walk(c)

        for o in walk(root):
            self.vis(o, on, f)

    # Scene 03 --------------------------------------------------------------

    def _tabletop_scene(self, f):
        rec = self.rec
        l3 = local("edges", f)
        on = 0 <= l3 < SCENES["edges"]["durationInFrames"]
        self.vis(self.tabletop, on, f)
        spin = ramp(l3, S3["rotate"], "inOut")
        rec.set(self.tabletop, "rotation_euler", (0.0, 0.0, -math.pi / 2 * spin), f)
        rec.set(self.tabletop, "location", (0.0, 0.0, 0.0), f)
        t = [ramp(l3, r, "inOut") for r in S3["morphs"]]
        w_bull = t[0] * (1 - t[1])
        w_cham = t[1] * (1 - t[2])
        w_bev = t[2]
        key = self.tabletop.data.shape_keys
        rec.set(key, 'key_blocks["bullnose"].value', w_bull, f)
        rec.set(key, 'key_blocks["chamfer"].value', w_cham, f)
        rec.set(key, 'key_blocks["bevelled"].value', w_bev, f)

    # Scene 04 --------------------------------------------------------------

    def _panel_scene(self, f):
        rec = self.rec
        l4 = local("cnc", f)
        on = 0 <= l4 < SCENES["cnc"]["durationInFrames"]
        self.vis_tree(self.panel, on, f)
        P = DATA["panel"]

        stand = ramp(l4, (98, 120), "inOut")
        bend = ramp(l4, (108, S4["bend"][1]), "inOut")
        exit_ = ramp(l4, S4["exit"], "in")
        y_edge = -mm(P["h"]) / 2
        rec.set(self.panel, "rotation_euler", (-math.pi / 2 * (1 - stand), 0.0, 0.0), f)
        rec.set(self.panel, "location", (-2.6 * exit_, y_edge, Z_TOP * (1 - stand)), f)
        rec.set(self.panel, 'modifiers["Bend"].angle', math.radians(140) * bend, f)

        t_tool = ramp(l4, S4["toolpath"], "standard") if l4 >= 0 else 0.0
        progress, head, _ = toolpath_state(self.panel_toolpath, t_tool)
        n = len(self.plugs)
        span = S4["removal"][1] - S4["removal"][0] - S4["plugDrop"]
        for i, (plug, kerf) in enumerate(zip(self.plugs, self.cut_kerfs)):
            start = S4["removal"][0] + i / n * span
            d = ramp(l4, (start, start + S4["plugDrop"]), "in")
            rec.set(plug, "location", (0.0, -0.09 * d, 0.0), f)
            self.alpha(plug, 1 - d, f)
            self.vis(plug, on and d < 1, f)
            p = progress[self.cut_index[i]]
            rec.set(kerf.data, "bevel_factor_end", max(0.0, min(1.0, p)), f)
            self.vis(kerf, on and p > 0 and l4 < S4["removal"][1] + 4, f)

        g_on = 0 <= l4 < 96
        if g_on:
            self.gantry.visible(rec, f, True)
            far = 3.8
            if l4 < S4["toolpath"][0]:
                hx, hy = self._panel_world(*self.panel_toolpath[0]["pts"][0])
                self.gantry.set_tool(rec, f, hx, hy, Z_TOP + TIP_UP, 0.0)
            elif t_tool < 1:
                hx, hy = self._panel_world(*head)
                self.gantry.set_tool(rec, f, hx, hy, self._smoothed_tool_z("panel", f, l4), 0.0)
            else:
                t_out = ramp(l4, (S4["toolpath"][1], S4["toolpath"][1] + 16), "in")
                hx, hy = self._panel_world(*self.panel_toolpath[-1]["pts"][-1])
                self.gantry.set_tool(rec, f, hx, lerp(hy, hy + far, t_out), Z_TOP + TIP_UP, lerp(0.0, far, t_out))
        elif not (SCENES["cutting"]["from"] <= f < SCENES["cutting"]["from"] + S2["sheetOut"][0]):
            self.gantry.visible(rec, f, False)

    # Scene 05 --------------------------------------------------------------

    def _stack_scene(self, f):
        rec = self.rec
        l5 = local("benefits", f)
        on = 0 <= l5 < SCENES["benefits"]["durationInFrames"]
        self.vis_tree(self.stack_root, on, f)
        enter = ramp(l5, S5["enter"], "out")
        clear = ramp(l5, (142, 162), "inOut")
        rec.set(self.stack_root, "location", (3.8 * (1 - enter), 0.0, 0.0), f)

        def drop(o, base_z, window, fade=True):
            t = ramp(l5, window, "out")
            rec.set(o, "location", (o.location.x, o.location.y, base_z + 0.16 * (1 - t)), f)
            a = min(1.0, t * 2.5) * (1 - clear)
            self.alpha(o, a, f)
            self.vis(o, on and a > 0, f)

        for i, o in enumerate(self.stack_sheets):
            st = S5["sheets"][0] + i * S5["sheetStagger"] - 8
            drop(o, PALLET_TOP + i * Z_TOP, (st, st + S5["sheetDrop"]))
        delays = [0, 6, 9, 12, 15]
        for k, (o, (x, y), level) in enumerate(self.stack_parts):
            o.location.x, o.location.y = x, y
            rec.set(o, "location", (x, y, o.location.z), f)
            if k < len(delays):
                w = (S5["parts"][0] + delays[k], S5["parts"][0] + delays[k] + S5["partDrop"])
            else:
                w = (S5["parts"][1] - S5["partDrop"], S5["parts"][1])
            drop(o, PALLET_TOP + level * Z_TOP, w)
        for pal in (self.pallet_a, self.pallet_b):
            for o in [pal, *pal.children]:
                if o.type == "MESH":
                    self.alpha(o, 1 - clear, f)

        off_in = ramp(l5, S5["offcutsIn"], "out")
        away = ramp(l5, S5["offcutsAway"], "inOut")
        gone = l5 >= S5["granules"][0] + 4
        px, py = self.pallet_b.location.x, self.pallet_b.location.y
        gx, gy = self.grind_spot
        for o, (sx, sy) in self.offcuts:
            x = lerp(px + sx, gx + 0.15 * sx, away)
            y = lerp(py + sy - 0.75, gy + 0.15 * sy, away)
            rec.set(o, "location", (x, y, 0.12 * (1 - off_in)), f)
            self.alpha(o, off_in, f)
            self.vis(o, on and off_in > 0 and not gone, f)

        # Chips fly from the offcuts to the new panel
        g0, g1 = S5["granules"]
        spread = g1 - g0
        nx, ny = self.new_panel_origin
        for c in self.chips:
            st = g0 + c["start"] * spread * 0.3
            dur = spread * c["dur"]
            t = ramp(l5, (st, st + dur), "inOut")
            fx, fy = c["from"]
            tx, ty = c["to"]
            x = lerp(fx, tx, t)
            y = lerp(fy, ty, t)
            z = 0.04 + c["arc"] * 4 * t * (1 - t) + (0.02 if t >= 1 else 0)
            o = c["obj"]
            rec.set(o, "location", (x, y, z), f)
            rec.set(o, "rotation_euler", tuple(s * t for s in c["spin"]), f)
            self.vis(o, on and 0 < t < 1, f)

        reveal = ramp(l5, S5["newPanel"], "inOut")
        strip_out = ramp(l5, S5["stripOut"], "in")
        rec.set(self.new_panel, "location", (nx, ny, 0.0), f)
        rec.set(self.new_panel, "scale", (max(1e-4, reveal), 1.0, 1.0), f)
        self.alpha(self.new_panel, 1 - strip_out, f)
        self.vis(self.new_panel, on and reveal > 0 and strip_out < 1, f)

    # Camera ------------------------------------------------------------------

    def _camera(self, f):
        L = self.L
        stage = (L["stage"]["cx"], L["stage"]["cy"])
        l1, l2, l3, l4, l5 = (local(s, f) for s in ("drawing", "cutting", "edges", "cnc", "benefits"))
        lens = 50.0

        sheet_k = L["sheetWidthPx"] / 2800.0
        sheet_d = self.dist_for(sheet_k, lens)
        sheet_t = (0.0, 0.0, Z_TOP / 2)
        elev_sheet = 72.0

        if f < SCENES["cutting"]["from"]:
            mx, my = sheet_xy(DATA["assets"]["macroCenter"]["x"], DATA["assets"]["macroCenter"]["y"])
            macro_t = (mx, my, Z_TOP)
            d0 = self.dist_for(9.6, lens)
            d_push = self.dist_for(10.4, lens)
            push = ramp(l1, (0, S1["pushInEnd"]), "standard")
            d_start = math.exp(lerp(math.log(d0), math.log(d_push), push))
            pull = ramp(l1, (S1["pushInEnd"], S1["pullBackEnd"]), "inOut")
            d = math.exp(lerp(math.log(d_start), math.log(sheet_d), pull))
            w = (d - d_start) / (sheet_d - d_start)
            target = lerp3(macro_t, sheet_t, w)
            elev = lerp(89.9, elev_sheet, w)
            anchor = (lerp(self.W / 2, stage[0], w), lerp(self.H / 2, stage[1], w))
            self.shot(f, target, d, elev, lens, anchor, fstop=lerp(4.0, 11.0, w))
            return

        tt_k = L["tabletopWidthPx"] / 1600.0
        tt_d = self.dist_for(tt_k, lens)
        if f < SCENES["edges"]["from"]:
            iso = ramp(l2, S2["isolate"], "inOut")
            d = math.exp(lerp(math.log(sheet_d), math.log(tt_d), iso))
            self.shot(f, sheet_t, d, elev_sheet, lens, stage, fstop=11.0)
            return

        if f < SCENES["cnc"]["from"]:
            sec = L["section"]
            spin = ramp(l3, S3["rotate"], "inOut")
            zoom = ramp(l3, S3["zoom"], "inOut")
            face_k = sec["endFaceWidthPx"] / 800.0
            face_d = self.dist_for(face_k, lens)
            face_t = (0.0, -0.8, Z_TOP / 2)
            # turn: from above the tabletop to level with its end face
            d1 = math.exp(lerp(math.log(tt_d), math.log(face_d), spin))
            t1 = lerp3((0.0, 0.0, Z_TOP / 2), face_t, spin)
            e1 = lerp(elev_sheet, 4.0, spin)
            # push in to the edge
            lens2 = lerp(lens, 100.0, zoom)
            close_d = self.f_px(100.0) / sec["k"] / 1000.0
            d = math.exp(lerp(math.log(d1), math.log(close_d), zoom))
            edge_t = (0.4, -0.8, Z_TOP / 2)
            w = 0.0 if close_d == d1 else (d - d1) / (close_d - d1)
            target = lerp3(t1, edge_t, w)
            anchor = (lerp(stage[0], sec["edgeX"], w), lerp(stage[1], sec["cy"], w))
            self.shot(f, target, d, lerp(e1, 6.0, zoom), lens2, anchor, fstop=lerp(8.0, 16.0, zoom))
            return

        if f < SCENES["benefits"]["from"]:
            pan = L["panel"]
            P = DATA["panel"]
            flat_k = pan["heightPx"] / P["h"]
            d_flat = self.dist_for(flat_k, lens)
            move = ramp(l4, (92, 128), "inOut")
            flat_t = (0.0, 0.0, Z_TOP)
            stand_t = (0.0, -mm(P["h"]) / 2 + 0.25, mm(P["h"]) / 2)
            target = lerp3(flat_t, stand_t, move)
            d = lerp(d_flat, d_flat * 1.08, move)
            self.shot(f, target, d, lerp(72.0, 10.0, move), lens, (pan["cx"], pan["cy"]), az_deg=lerp(0.0, -22.0, move), fstop=11.0)
            return

        st = L["stacks"]
        stack_d = self.dist_for(st["mmToPx"] * 1.4, lens)
        self.shot(f, (0.85, -0.82, 0.2), stack_d, 33.0, lens, (st["cx"], st["cy"] + 140), az_deg=30.0, fstop=11.0)

    # Lights ------------------------------------------------------------------

    def lights(self):
        def area(name, loc, target, size, power, shape="RECTANGLE", size_y=None):
            ld = bpy.data.lights.new(name, "AREA")
            ld.shape = shape
            ld.size = size
            ld.size_y = size_y or size
            ld.energy = power
            o = obj(name, ld, location=loc)
            o.rotation_euler = look_at_matrix(loc, target).to_euler()
            return o, ld

        # Exposed so the terrazzo renders close to its photographed albedo
        self.key = area("Key", (-3.2, -3.0, 5.2), (0, 0, 0), 3.0, 320)
        self.fill = area("Fill", (3.6, -2.2, 2.6), (0, 0, 0.3), 4.0, 110)
        self.rim = area("Rim", (0.5, 4.2, 3.4), (0, 0, 0.2), 3.0, 170)
        sweep, sweep_d = area("Sweep", (0, 0, 1.0), (0, 0, 0), 0.25, 0, size_y=3.0)
        self.sweep, self.sweep_d = sweep, sweep_d

    def update_lights(self, f):
        l1 = local("drawing", f)
        a, b = S1["sweep"]
        mx, my = sheet_xy(DATA["assets"]["macroCenter"]["x"], DATA["assets"]["macroCenter"]["y"])
        t = max(0.0, min(1.0, (l1 - a) / (b - a)))
        x = mx - 0.35 + 0.7 * t
        win = ramp(l1, (a, a + 8)) * (1 - ramp(l1, (b - 8, b)))
        self.rec.set(self.sweep, "location", (x, my, 0.55), f)
        self.rec.set(self.sweep_d, "energy", 6.0 * win, f)
