"""Shared helpers: scene data, easing (identical to the Remotion film), unit
conversion and a recorder that bakes per-frame values into keyframes."""

import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER_DIR = os.path.dirname(HERE)
PROJECT = os.path.dirname(BLENDER_DIR)
PUBLIC = os.path.join(PROJECT, "public")

with open(os.path.join(BLENDER_DIR, "scene-data.json")) as f:
    DATA = json.load(f)

TIMING = DATA["timing"]
FPS = TIMING["FPS"]
SCENES = TIMING["SCENES"]
S1, S2, S3, S4, S5 = (TIMING[k] for k in ("S1", "S2", "S3", "S4", "S5"))
# Blender renders scenes 01–05; scene 06 is the supplied logo clip.
LAST_3D_FRAME = SCENES["endCard"]["from"] - 1

SHEET_W, SHEET_H = DATA["sheet"]["w"], DATA["sheet"]["h"]
THICK = 19.0  # mm


def local(scene, frame):
    return frame - SCENES[scene]["from"]


def in_scene(scene, frame, pad=0):
    s = SCENES[scene]
    return s["from"] - pad <= frame < s["from"] + s["durationInFrames"] + pad


# --- easing, matching Remotion's interpolate + Easing.bezier ---------------

def _bezier(p1x, p1y, p2x, p2y):
    def coord(t, a, b):
        return 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3

    def solve(x):
        lo, hi = 0.0, 1.0
        t = x
        for _ in range(40):
            v = coord(t, p1x, p2x)
            if abs(v - x) < 1e-7:
                break
            if v < x:
                lo = t
            else:
                hi = t
            t = (lo + hi) / 2
        return coord(t, p1y, p2y)

    return solve


EASES = {
    "out": _bezier(0.33, 1, 0.68, 1),
    "inOut": _bezier(0.45, 0, 0.55, 1),
    "in": _bezier(0.32, 0, 0.67, 0),
    "standard": _bezier(0.4, 0, 0.2, 1),
    "linear": lambda t: t,
}


def clamp01(t):
    return max(0.0, min(1.0, t))


def ramp(frame, rng, ease="out"):
    a, b = rng
    if b == a:
        return 1.0 if frame >= b else 0.0
    return EASES[ease](clamp01((frame - a) / (b - a)))


def lerp(a, b, t):
    return a + (b - a) * t


def lerp3(a, b, t):
    return tuple(lerp(x, y, t) for x, y in zip(a, b))


# --- units ------------------------------------------------------------------

def mm(v):
    return v / 1000.0


def sheet_xy(x_mm, y_mm):
    """Sheet drawing coordinates (mm, y down) to world metres on the floor."""
    return (x_mm / 1000.0 - SHEET_W / 2000.0, SHEET_H / 2000.0 - y_mm / 1000.0)


def poly_length(pts):
    return sum(math.dist(pts[i - 1], pts[i]) for i in range(1, len(pts)))


def point_at(pts, t):
    """Point on a polyline at fraction t of its length."""
    total = poly_length(pts)
    target = clamp01(t) * total
    acc = 0.0
    for i in range(1, len(pts)):
        seg = math.dist(pts[i - 1], pts[i])
        if acc + seg >= target and seg > 0:
            u = (target - acc) / seg
            return (lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u))
        acc += seg
    return tuple(pts[-1])


def plot_progress(polylines, t):
    """Spread t over strokes by length, like a pen plotter (mirrors TS)."""
    lengths = [poly_length(p) for p in polylines]
    budget = clamp01(t) * sum(lengths)
    out, pen = [], None
    for p, L in zip(polylines, lengths):
        if budget <= 0:
            out.append(0.0)
            continue
        used = min(L, budget)
        budget -= used
        frac = 1.0 if L == 0 else used / L
        if frac < 1 or budget <= 0:
            pen = point_at(p, frac)
        out.append(frac)
    return out, (pen if 0 < t < 1 else None)


def toolpath_state(segments, t, rapid_time=0.25):
    """Per-segment progress and tool position for overall progress t (mirrors TS)."""
    cost = [poly_length(s["pts"]) * (rapid_time if s["type"] == "rapid" else 1) for s in segments]
    budget = clamp01(t) * sum(cost)
    progress, head, head_type = [], None, None
    for s, c in zip(segments, cost):
        if budget <= 0:
            progress.append(0.0)
            continue
        used = min(c, budget)
        budget -= used
        p = 1.0 if c == 0 else used / c
        if p < 1:
            head = point_at(s["pts"], p)
            head_type = s["type"]
        progress.append(p)
    if t <= 0:
        head = tuple(segments[0]["pts"][0])
        head_type = "rapid"
    elif t >= 1:
        # rounding can leave the last cut a hair short of 1
        progress = [1.0] * len(segments)
        head = tuple(segments[-1]["pts"][-1])
        head_type = "rapid"
    return progress, head, head_type


# --- baking -----------------------------------------------------------------

class Recorder:
    """Collects per-frame values for (datablock, data_path, index) channels and
    writes them as linear keyframes, keeping only frames where the value
    changes. Booleans become constant-interpolated channels."""

    def __init__(self):
        self.channels = {}

    def set(self, idblock, path, value, frame, index=-1):
        if isinstance(value, (tuple, list)):
            for i, v in enumerate(value):
                self.set(idblock, path, v, frame, i)
            return
        key = (idblock.name, type(idblock).__name__, path, index)
        ch = self.channels.setdefault(key, {"id": idblock, "path": path, "index": index, "values": {}})
        ch["values"][frame] = float(value) if not isinstance(value, bool) else bool(value)

    def state_signature(self, frame):
        return tuple(
            round(ch["values"].get(frame, 0.0), 6) if not isinstance(ch["values"].get(frame), bool) else ch["values"][frame]
            for ch in self.channels.values()
        )

    def write(self):
        import bpy

        interp_linear = bpy.types.Keyframe.bl_rna.properties["interpolation"].enum_items["LINEAR"].value
        interp_const = bpy.types.Keyframe.bl_rna.properties["interpolation"].enum_items["CONSTANT"].value
        by_id = {}
        for ch in self.channels.values():
            by_id.setdefault(id(ch["id"]), []).append(ch)
        for chans in by_id.values():
            idb = chans[0]["id"]
            ad = idb.animation_data or idb.animation_data_create()
            act = bpy.data.actions.new(f"{idb.name}-anim")
            ad.action = act
            slot = act.slots.new(id_type=idb.id_type, name=idb.name)
            ad.action_slot = slot
            layer = act.layers.new("Baked")
            strip = layer.strips.new(type="KEYFRAME")
            bag = strip.channelbag(slot, ensure=True)
            for ch in chans:
                frames = sorted(ch["values"])
                vals = [ch["values"][f] for f in frames]
                is_bool = isinstance(vals[0], bool)
                keep = []
                for i, f in enumerate(frames):
                    prev_same = i > 0 and vals[i - 1] == vals[i]
                    next_same = i < len(vals) - 1 and vals[i + 1] == vals[i]
                    if not (prev_same and next_same):
                        keep.append(i)
                fc = bag.fcurves.new(ch["path"], index=max(ch["index"], 0))
                fc.keyframe_points.add(len(keep))
                co = []
                for i in keep:
                    co += [float(frames[i]), float(vals[i])]
                fc.keyframe_points.foreach_set("co", co)
                fc.keyframe_points.foreach_set(
                    "interpolation", [interp_const if is_bool else interp_linear] * len(keep)
                )
                fc.update()
