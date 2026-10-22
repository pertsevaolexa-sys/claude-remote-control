#!/usr/bin/env python3
"""Build the Polygood AutoCAD package: hatch patterns (.pat), sheet blocks (DXF) and previews.

    python tools/build_autocad.py

Needs ezdxf and Pillow; matplotlib too for the DXF preview. Every random choice uses a fixed
seed, so a rebuild writes the same files.

How the stylised patterns stay seamless: each pattern is drawn on a square tile of side T (mm).
Every chip edge or vein segment runs between points on a millimetre grid, so its direction is a
whole-number vector (a, b). A line family at that angle, repeated with the offsets below, puts
exactly one copy of the segment in every tile and nowhere else:

    delta-y = T / n,  delta-x = T * (a*p + b*q) / n,  dash = L,  gap = n*T - L
    where n = sqrt(a^2 + b^2) and a*q - b*p = 1.
"""
import math
import random
import zipfile
from pathlib import Path

import ezdxf
from ezdxf.enums import TextEntityAlignment
from ezdxf.tools import pattern as ezpattern
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent  # polygood-bim/autocad
VERSION = "1.0-draft"

# Sheet formats and thicknesses from public sources (Wikipedia, Cradle to Cradle listing).
# Check them against the Polygood technical data sheet before release.
SHEETS = [(2800, 1400), (1400, 1400), (1000, 1000)]
THICKNESSES = [12, 19]


# ---------------------------------------------------------------- pattern geometry

def segment_family(x, y, a, b, length, tile):
    """Line family that repeats a segment from (x, y) along whole-number direction (a, b) once per tile."""
    g = math.gcd(abs(a), abs(b))
    a, b = a // g, b // g
    n = math.hypot(a, b)
    if b < 0 or (b == 0 and a < 0):  # keep angles in 0..180: start from the other end instead
        x, y, a, b = x + a / n * length, y + b / n * length, -a, -b
    p, q = next((p, q) for p in range(-50, 51) for q in range(-50, 51) if a * q - b * p == 1)
    angle = math.degrees(math.atan2(b, a))
    period = n * tile
    shift = (tile * (a * p + b * q) / n + period / 2) % period - period / 2  # same lines, smallest number
    return (angle, x, y, shift, tile / n, [length, -(period - length)])


def edge_family(p0, p1, tile):
    ex, ey = p1[0] - p0[0], p1[1] - p0[1]
    return segment_family(p0[0], p0[1], ex, ey, math.hypot(ex, ey), tile)


def dot_family(x, y, tile):
    return (0.0, x, y, 0.0, tile, [0.0, -tile])


def edge_n(p0, p1):
    ex, ey = p1[0] - p0[0], p1[1] - p0[1]
    g = math.gcd(abs(ex), abs(ey))
    return math.hypot(ex / g, ey / g)


def wrap(d, tile):
    return (d + tile / 2) % tile - tile / 2


def far_enough(x, y, r, placed, tile, gap):
    return all(math.hypot(wrap(x - px, tile), wrap(y - py, tile)) >= r + pr + gap for px, py, pr in placed)


def chip(rng, cx, cy, r, grid):
    """Irregular chip: 4-7 corners around (cx, cy), stretched and turned, snapped to the grid."""
    k = rng.choice((4, 5, 5, 6, 6, 7))
    stretch, turn, start = rng.uniform(1.0, 1.7), rng.uniform(0, math.pi), rng.uniform(0, 2 * math.pi)
    pts = []
    for i in range(k):
        t = start + 2 * math.pi * (i + rng.uniform(-0.3, 0.3)) / k
        rr = r * rng.uniform(0.6, 1.0)
        x, y = rr * math.cos(t) * stretch, rr * math.sin(t) / math.sqrt(stretch)
        x, y = x * math.cos(turn) - y * math.sin(turn), x * math.sin(turn) + y * math.cos(turn)
        pts.append((round((cx + x) / grid) * grid, round((cy + y) / grid) * grid))
    return pts


def chip_ok(pts, cx, cy, grid, nmax):
    if len(set(pts)) != len(pts):
        return False
    for p0, p1 in zip(pts, pts[1:] + pts[:1]):
        if math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 2 * grid or edge_n(p0, p1) > nmax:
            return False
        if (p0[0] - cx) * (p1[1] - cy) - (p0[1] - cy) * (p1[0] - cx) <= 0:  # keep it star-shaped
            return False
    return True


def clearance(x, y, r, placed, tile):
    return min((math.hypot(wrap(x - px, tile), wrap(y - py, tile)) - r - pr for px, py, pr in placed), default=tile)


def scatter(rng, count, make, placed, tile, gap, candidates=12):
    """Best-candidate sampling: of several tries keep the one farthest from what is placed, so the spread is even."""
    found = []
    for _ in range(count):
        best = None
        for _ in range(candidates):
            item = make()
            if item is None:
                continue
            room = clearance(item[0], item[1], item[2], placed, tile)
            if best is None or room > best[0]:
                best = (room, item)
        if best is None or best[0] < gap:
            break
        x, y, r, payload = best[1]
        placed.append((x, y, r))
        found.append(payload)
    return found


def terrazzo(seed, tile, grid, chips, rmin, rmax, dots, nmax, gap):
    rng = random.Random(seed)
    placed = []

    def make_chip():
        cx, cy = rng.uniform(0, tile), rng.uniform(0, tile)
        r = rng.uniform(rmin, rmax) if rng.random() < 0.6 else rng.uniform(rmin, (rmin + rmax) / 2)
        pts = chip(rng, cx, cy, r, grid)
        if not chip_ok(pts, cx, cy, grid, nmax):
            return None
        return cx, cy, max(math.hypot(x - cx, y - cy) for x, y in pts), pts

    def make_dot():
        x, y = round(rng.uniform(0, tile) * 2) / 2, round(rng.uniform(0, tile) * 2) / 2
        return x, y, 1, (x, y)

    lines = []
    for pts in scatter(rng, chips, make_chip, placed, tile, gap):
        lines += [edge_family(p0, p1, tile) for p0, p1 in zip(pts, pts[1:] + pts[:1])]
    lines += [dot_family(x, y, tile) for x, y in scatter(rng, dots, make_dot, placed, tile, gap / 3)]
    return lines


def speckle(seed, tile, dots, dashes):
    rng = random.Random(seed)
    placed = []
    directions = [(1, 0), (0, 1), (1, 1), (1, -1), (2, 1), (1, 2), (2, -1), (1, -2)]

    def make_dash():
        x, y = round(rng.uniform(0, tile)), round(rng.uniform(0, tile))
        return x, y, 3, (x, y, rng.choice(directions), rng.uniform(2.0, 5.0))

    def make_dot():
        x, y = round(rng.uniform(0, tile) * 2) / 2, round(rng.uniform(0, tile) * 2) / 2
        return x, y, 1, (x, y)

    lines = [segment_family(x, y, a, b, length, tile)
             for x, y, (a, b), length in scatter(rng, dashes, make_dash, placed, tile, 6)]
    lines += [dot_family(x, y, tile) for x, y in scatter(rng, dots, make_dot, placed, tile, 4)]
    return lines


def vein_path(rng, start, delta, grid, amplitude, seg_len):
    """Wavy path from start to start + delta; the sine terms vanish at both ends, so tiles join up."""
    length = math.hypot(*delta)
    nx, ny = -delta[1] / length, delta[0] / length
    amps = [amplitude * rng.uniform(-1, 1) / m ** 1.2 for m in range(1, 6)]
    steps = max(2, round(length / seg_len))
    weights = [rng.uniform(0.6, 1.4) for _ in range(steps)]
    ts, acc = [0.0], 0.0
    for w in weights:
        acc += w
        ts.append(acc / sum(weights))
    pts = []
    for t in ts:
        off = sum(a * math.sin(math.pi * (m + 1) * t) for m, a in enumerate(amps))
        x = start[0] + t * delta[0] + off * nx
        y = start[1] + t * delta[1] + off * ny
        pts.append((round(x / grid) * grid, round(y / grid) * grid))
    pts[0], pts[-1] = start, (start[0] + delta[0], start[1] + delta[1])
    return [p for i, p in enumerate(pts) if i == 0 or p != pts[i - 1]]


def branch_path(rng, start, heading, grid, length, seg_len):
    pts, (x, y) = [start], start
    for _ in range(max(2, round(length / seg_len))):
        heading += rng.uniform(-0.35, 0.35)
        step = seg_len * rng.uniform(0.7, 1.3)
        x, y = x + step * math.cos(heading), y + step * math.sin(heading)
        p = (round(x / grid) * grid, round(y / grid) * grid)
        if p != pts[-1]:
            pts.append(p)
    return pts


def marble(seed, tile, grid):
    """Veins running at about 27 degrees: each main vein ends one tile up and two across from where it starts."""
    rng = random.Random(seed)
    at = lambda f: round(f * tile / grid) * grid
    flow = (2 * tile, tile)
    paths = [
        vein_path(rng, (0, at(0.10)), flow, grid, 0.09 * tile, 120),
        vein_path(rng, (0, at(0.17)), flow, grid, 0.04 * tile, 100),
        vein_path(rng, (0, at(0.62)), flow, grid, 0.07 * tile, 120),
    ]
    heading = math.atan2(flow[1], flow[0])
    for main in (paths[0], paths[2]):
        for _ in range(3):
            s = main[rng.randrange(1, len(main) - 1)]
            turn = rng.choice((-1, 1)) * rng.uniform(0.35, 0.8)
            paths.append(branch_path(rng, s, heading + turn, grid, rng.uniform(250, 650), 90))
    lines = []
    for pts in paths:
        lines += [edge_family(p0, p1, tile) for p0, p1 in zip(pts, pts[1:])]
    return lines


PATTERNS = {
    "PG_SHEET_2800X1400": ("Polygood sheet joints, 2800 x 1400 mm",
                           [(0, 0, 0, 0, 1400, []), (90, 0, 0, 0, 2800, [])]),
    "PG_SHEET_2800X1400_STAGGER": ("Polygood sheet joints, 2800 x 1400 mm, staggered",
                                   [(0, 0, 0, 0, 1400, []), (90, 0, 0, 1400, 1400, [1400, -1400])]),
    "PG_SHEET_1400X1400": ("Polygood sheet joints, 1400 x 1400 mm",
                           [(0, 0, 0, 0, 1400, []), (90, 0, 0, 0, 1400, [])]),
    "PG_TERRAZZO": ("Polygood terrazzo, medium chips, 600 mm repeat",
                    terrazzo(seed=11, tile=600, grid=2, chips=52, rmin=7, rmax=19, dots=70, nmax=16, gap=10)),
    "PG_TERRAZZO_COARSE": ("Polygood terrazzo, large chips, 1000 mm repeat",
                           terrazzo(seed=23, tile=1000, grid=4, chips=34, rmin=18, rmax=48, dots=60, nmax=14, gap=18)),
    "PG_SPECKLE": ("Polygood fine speckle, 300 mm repeat", speckle(seed=5, tile=300, dots=70, dashes=26)),
    "PG_MARBLE_VEIN": ("Polygood marble veins, 2800 mm repeat", marble(seed=7, tile=2800, grid=5)),
}


# ---------------------------------------------------------------- .pat files

def num(v, digits=6):
    s = f"{v:.{digits}f}".rstrip("0").rstrip(".")
    return "0" if s in ("", "-0") else s


def pat_line(line):
    angle, x, y, dx, dy, dashes = line
    text = ",".join([num(angle, 7), num(x), num(y), num(dx), num(dy)] + [num(d) for d in dashes])
    assert len(text) <= 80, text  # AutoCAD reads at most 80 characters per line
    return text


def pat_body(name, title, lines, revit=False):
    out = [f"*{name}, {title}"]
    if revit:
        out.append(";%TYPE=MODEL")
    return out + [pat_line(l) for l in lines]


def write_pats():
    acad = ROOT / "hatches" / "autocad"
    acad.mkdir(parents=True, exist_ok=True)
    head = [f";; Polygood hatch pattern, v{VERSION}. Units: 1 = 1 mm (metric drawings).",
            ";; Made by tools/build_autocad.py. File name must match the pattern name."]
    for name, (title, lines) in PATTERNS.items():
        (acad / f"{name}.pat").write_text("\n".join(head + pat_body(name, title, lines)) + "\n\n", newline="\r\n")
    revit = ROOT / "hatches" / "revit"
    revit.mkdir(parents=True, exist_ok=True)
    out = [";%UNITS=MM", f";; Polygood model patterns for Revit, version {VERSION}."]
    for name, (title, lines) in PATTERNS.items():
        out += pat_body(name, title, lines, revit=True) + [""]
    (revit / "Polygood_Revit_model.pat").write_text("\n".join(out) + "\n", newline="\r\n")


# ---------------------------------------------------------------- previews

def clip(p0, p1, w, h):
    """Liang-Barsky clip of segment p0-p1 to the rectangle 0..w x 0..h."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy, t0, t1 = x1 - x0, y1 - y0, 0.0, 1.0
    for p, q in ((-dx, x0), (dx, w - x0), (-dy, y0), (dy, h - y0)):
        if p == 0:
            if q < 0:
                return None
            continue
        t = q / p
        if p < 0:
            t0 = max(t0, t)
        else:
            t1 = min(t1, t)
        if t0 > t1:
            return None
    return (x0 + t0 * dx, y0 + t0 * dy), (x0 + t1 * dx, y0 + t1 * dy)


def pattern_segments(lines, w, h, scale=1.0):
    """Segments and dots the way AutoCAD lays out a .pat over the rectangle 0..w x 0..h."""
    segs, dots = [], []
    cx, cy, reach = w / 2, h / 2, math.hypot(w, h) / 2
    for angle, ox, oy, dx, dy, dashes in lines:
        ox, oy, dx, dy = ox * scale, oy * scale, dx * scale, dy * scale
        dashes = [d * scale for d in dashes]
        ux, uy = math.cos(math.radians(angle)), math.sin(math.radians(angle))
        vx, vy = -uy, ux
        wx, wy = dx * ux + dy * vx, dx * uy + dy * vy
        s0 = (ox - cx) * vx + (oy - cy) * vy
        k0, k1 = sorted(((-reach - s0) / dy, (reach - s0) / dy))
        for k in range(math.ceil(k0), math.floor(k1) + 1):
            bx, by = ox + k * wx, oy + k * wy
            tc = (cx - bx) * ux + (cy - by) * uy
            if not dashes:
                c = clip((bx + (tc - reach) * ux, by + (tc - reach) * uy),
                         (bx + (tc + reach) * ux, by + (tc + reach) * uy), w, h)
                if c:
                    segs.append(c)
                continue
            period = sum(abs(d) for d in dashes)
            t = math.floor((tc - reach) / period) * period
            while t <= tc + reach:
                for d in dashes:
                    if d > 0:
                        c = clip((bx + t * ux, by + t * uy), (bx + (t + d) * ux, by + (t + d) * uy), w, h)
                        if c:
                            segs.append(c)
                    elif d == 0 and 0 <= bx + t * ux <= w and 0 <= by + t * uy <= h:
                        dots.append((bx + t * ux, by + t * uy))
                    t += abs(d)
    return segs, dots


def render_pattern(lines, w, h, px_per_mm, label, overlay=None):
    ss = 3
    W, H = round(w * px_per_mm), round(h * px_per_mm)
    img = Image.new("L", (W * ss, H * ss), 255)
    draw = ImageDraw.Draw(img)
    k = px_per_mm * ss
    for group, width in ((lines, 1.0), (overlay or [], 2.2)):
        segs, dots = pattern_segments(group, w, h)
        for (x0, y0), (x1, y1) in segs:
            draw.line([(x0 * k, (h - y0) * k), (x1 * k, (h - y1) * k)], fill=0, width=round(width * ss))
        for x, y in dots:
            r = 1.2 * ss
            draw.ellipse([x * k - r, (h - y) * k - r, x * k + r, (h - y) * k + r], fill=0)
    img = img.resize((W, H), Image.LANCZOS).convert("RGB")
    framed = Image.new("RGB", (W + 2, H + 40), "white")
    framed.paste(img, (1, 1))
    d = ImageDraw.Draw(framed)
    d.rectangle([0, 0, W + 1, H + 1], outline=(150, 150, 150))
    d.text((2, H + 10), label, fill=(40, 40, 40), font=ImageFont.load_default(16))
    return framed


def write_previews():
    out = ROOT / "previews"
    out.mkdir(parents=True, exist_ok=True)
    views = {
        "PG_TERRAZZO": (1800, 1200, 0.5),
        "PG_TERRAZZO_COARSE": (3000, 2000, 0.3),
        "PG_SPECKLE": (900, 600, 1.0),
        "PG_MARBLE_VEIN": (5600, 2800, 0.16),
        "PG_SHEET_2800X1400": (8400, 4200, 0.107),
        "PG_SHEET_2800X1400_STAGGER": (8400, 4200, 0.107),
        "PG_SHEET_1400X1400": (8400, 4200, 0.107),
    }
    tiles = []
    for name, (w, h, ppm) in views.items():
        title, lines = PATTERNS[name]
        img = render_pattern(lines, w, h, ppm, f"{name}  ({w} x {h} mm, scale 1)")
        img.save(out / f"{name}.png")
        tiles.append(img)
    cols, pad = 2, 24
    cw = max(t.width for t in tiles)
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    sheet = Image.new("RGB", (cols * cw + (cols + 1) * pad, sum(max(t.height for t in r) + pad for r in rows) + pad), "white")
    y = pad
    for r in rows:
        for i, t in enumerate(r):
            sheet.paste(t, (pad + i * (cw + pad), y))
        y += max(t.height for t in r) + pad
    sheet.save(out / "all_hatches.png")


# ---------------------------------------------------------------- DXF library

def rect(space, x, y, w, h, **attrs):
    return space.add_lwpolyline([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], close=True, dxfattribs=attrs)


def hatch(space, x, y, w, h, name, defs, layer, angle=0.0, scale=1.0):
    ht = space.add_hatch(dxfattribs={"layer": layer})
    ht.set_pattern_fill(name, color=256, angle=angle, scale=scale, pattern_type=2, definition=defs[name])
    ht.paths.add_polyline_path([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], is_closed=True)
    return ht


def label(space, text, x, y, height=60, layer="PG-TEXT"):
    space.add_text(text, height=height, dxfattribs={"layer": layer}).set_placement((x, y), align=TextEntityAlignment.LEFT)


def write_dxf():
    doc = ezdxf.new("R2013", setup=True, units=ezdxf.units.MM)
    doc.header["$MEASUREMENT"] = 1
    for name, color in (("PG-SHEET", 7), ("PG-SECTION", 7), ("PG-PATTERN", 8), ("PG-JOINT", 7), ("PG-TEXT", 7)):
        doc.layers.add(name, color=color)

    pat_text = "\n".join(line for name, (title, lines) in PATTERNS.items() for line in pat_body(name, title, lines))
    defs = ezpattern.parse(pat_text)

    blocks = []
    for w, h in SHEETS:
        name = f"PG_SHEET_{w}x{h}_FACE"
        blk = doc.blocks.new(name=name)
        rect(blk, 0, 0, w, h, layer="0")
        blocks.append(name)
    for t in THICKNESSES:
        for length in sorted({w for w, h in SHEETS} | {h for w, h in SHEETS}, reverse=True):
            edge = doc.blocks.new(name=f"PG_EDGE_{t}x{length}")
            rect(edge, 0, 0, length, t, layer="0")
            sec = doc.blocks.new(name=f"PG_SECTION_{t}x{length}")
            rect(sec, 0, 0, length, t, layer="0")
            fill = sec.add_hatch(color=8, dxfattribs={"layer": "0"})
            fill.paths.add_polyline_path([(0, 0), (length, 0), (length, t), (0, t)], is_closed=True)
            blocks += [edge.name, sec.name]

    msp = doc.modelspace()
    label(msp, f"POLYGOOD - AutoCAD sheet blocks and hatch patterns, v{VERSION} (units: mm)", 0, 4300, 140)
    label(msp, "Check sheet sizes and thicknesses against the Polygood technical data sheet before release.", 0, 4080, 70)

    x = 0
    for w, h in SHEETS:
        msp.add_blockref(f"PG_SHEET_{w}x{h}_FACE", (x, 2300), dxfattribs={"layer": "PG-SHEET"})
        label(msp, f"PG_SHEET_{w}x{h}_FACE", x, 2300 + h + 60)
        x += w + 500

    y = 1700
    for t in THICKNESSES:
        for length in (2800, 1400, 1000):
            msp.add_blockref(f"PG_SECTION_{t}x{length}", (0, y), dxfattribs={"layer": "PG-SECTION"})
            label(msp, f"PG_SECTION_{t}x{length}", 3000, y - 10, 45)
            msp.add_blockref(f"PG_EDGE_{t}x{length}", (4400, y), dxfattribs={"layer": "PG-SHEET"})
            label(msp, f"PG_EDGE_{t}x{length}", 7400, y - 10, 45)
            y -= 140
    y -= 1500

    x = 0
    for name in ("PG_TERRAZZO", "PG_TERRAZZO_COARSE", "PG_SPECKLE", "PG_MARBLE_VEIN"):
        rect(msp, x, y, 1200, 1200, layer="PG-SHEET")
        hatch(msp, x, y, 1200, 1200, name, defs, "PG-PATTERN")
        label(msp, name, x, y - 120)
        x += 1700

    # Hatch lines start from the drawing origin, so the example walls sit on multiples of the sheet
    # size; that puts a joint exactly on each wall corner.
    y = -2 * 2800
    label(msp, "Wall example: 2 x 2 sheets 2800 x 1400, PG_SHEET_2800X1400 + PG_TERRAZZO", 0, y + 2800 + 80, 70)
    rect(msp, 0, y, 5600, 2800, layer="PG-SHEET")
    hatch(msp, 0, y, 5600, 2800, "PG_TERRAZZO", defs, "PG-PATTERN")
    hatch(msp, 0, y, 5600, 2800, "PG_SHEET_2800X1400", defs, "PG-JOINT")
    label(msp, "Staggered: PG_SHEET_2800X1400_STAGGER + PG_MARBLE_VEIN", 3 * 2800, y + 2800 + 80, 70)
    rect(msp, 3 * 2800, y, 5600, 2800, layer="PG-SHEET")
    hatch(msp, 3 * 2800, y, 5600, 2800, "PG_MARBLE_VEIN", defs, "PG-PATTERN")
    hatch(msp, 3 * 2800, y, 5600, 2800, "PG_SHEET_2800X1400_STAGGER", defs, "PG-JOINT")

    out = ROOT / "blocks"
    out.mkdir(parents=True, exist_ok=True)
    path = out / "Polygood_AutoCAD_blocks.dxf"
    doc.saveas(path)
    return path, blocks


def write_dxf_preview(path):
    from ezdxf.addons.drawing import matplotlib as mpl_drawing
    doc = ezdxf.readfile(path)
    mpl_drawing.qsave(doc.modelspace(), str(ROOT / "previews" / "Polygood_AutoCAD_blocks.png"), bg="#FFFFFF", dpi=220)


def write_zip():
    (ROOT / "dist").mkdir(exist_ok=True)
    zpath = ROOT / "dist" / f"Polygood_AutoCAD_v{VERSION}.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for sub in ("hatches", "blocks", "previews"):
            for f in sorted((ROOT / sub).rglob("*")):
                if f.is_file():
                    z.write(f, f.relative_to(ROOT))
        z.write(ROOT / "README.md", "README.md")
    return zpath


if __name__ == "__main__":
    write_pats()
    write_previews()
    dxf_path, block_names = write_dxf()
    write_dxf_preview(dxf_path)
    for name, (title, lines) in PATTERNS.items():
        print(f"{name:28s} {len(lines):4d} lines")
    print(f"{len(block_names)} blocks -> {dxf_path.relative_to(ROOT)}")
    if (ROOT / "README.md").exists():
        print("zip ->", write_zip().name)
