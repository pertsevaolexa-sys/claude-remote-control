#!/usr/bin/env python3
"""Groove layouts for Polygood Wall Tiles, drawn for CNC and for Blender.

Every layout repeats within the 700 x 700 mm tile module from the Polygood
Wall Tiles catalogue, so it also runs on without a break across a
2800 x 1400 mm slab. For each layout the script writes:

  <name>.svg  groove centrelines, stroked at the cutter width, in millimetres.
              This is the drawing to send to Polygood for a custom engraving,
              and it imports into Blender as curves.
  <name>.png  tileable height map for Blender, 2 px per mm by default
              (white = panel face, black = groove floor). Use it for bump on
              wide shots and for displacement on close-ups.

plus preview.png, a sheet showing each layout tiled 2 x 2.

Usage:
  python3 groove_patterns.py                          # every layout, 1/4" cutter
  python3 groove_patterns.py --cutter 4 --only fluted_25 arcade
  python3 groove_patterns.py --list

Needs Pillow (pip install pillow).
"""
import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

MODULE = 700.0  # mm, Polygood Wall Tiles module

# Maximum cutting depth per pass from the Polygood CNC Cutting Manual, in mm.
# Translucent patterns and Pebble take less (2.5 mm with 1/4", 2.0 mm with 5/32").
CUTTERS = {
    6.35: "1/4 in single-flute end mill, max 4.0 mm per pass",
    4.0: "5/32 in single-flute end mill, max 3.0 mm per pass",
}


def grid(w, h):
    polys = []
    for i in range(round(MODULE / w) + 1):
        polys.append([(i * w, 0.0), (i * w, MODULE)])
    for j in range(round(MODULE / h) + 1):
        polys.append([(0.0, j * h), (MODULE, j * h)])
    return polys


def running_bond(w, h):
    rows = round(MODULE / h)
    polys = [[(0.0, j * h), (MODULE, j * h)] for j in range(rows + 1)]
    for j in range(rows):
        offset = (j % 2) * w / 2
        for i in range(-1, round(MODULE / w) + 1):
            x = i * w + offset
            if 0 <= x <= MODULE:
                polys.append([(x, j * h), (x, (j + 1) * h)])
    return polys


def herringbone_45(period=87.5):
    """45-degree herringbone of a x 2a bricks.

    Cell (u, v) of an a-sized grid belongs to a horizontal brick when
    (u - v) mod 4 is 0 or 1 and to a vertical brick when it is 2 or 3.
    Rotated by 45 degrees the pattern repeats every period vertically and
    every 2 x period horizontally, so period has to divide 700 / 2.
    """
    a = period / math.sqrt(2)

    def brick(u, v):
        d = (u - v) % 4
        return {0: ("h", u, v), 1: ("h", u - 1, v), 2: ("v", u, v), 3: ("v", u, v + 1)}[d]

    c = s = math.sqrt(0.5)

    def rot(x, y):
        return (x * c - y * s, x * s + y * c)

    n = int(2 * MODULE / a) + 4
    polys = []
    for u in range(-n, n):
        for v in range(-n, n):
            if brick(u, v) != brick(u + 1, v):
                polys.append([rot((u + 1) * a, v * a), rot((u + 1) * a, (v + 1) * a)])
            if brick(u, v) != brick(u, v + 1):
                polys.append([rot(u * a, (v + 1) * a), rot((u + 1) * a, (v + 1) * a)])
    margin = 2 * a
    return [
        p for p in polys
        if max(x for x, _ in p) >= -margin and min(x for x, _ in p) <= MODULE + margin
        and max(y for _, y in p) >= -margin and min(y for _, y in p) <= MODULE + margin
    ]


def wave_stack(w, h, amplitude, step=1.0):
    """Vertical stack whose horizontal joints are one sine wave per column."""
    polys = [[(i * w, 0.0), (i * w, MODULE)] for i in range(round(MODULE / w) + 1)]
    xs = [k * step for k in range(round(w / step) + 1)]
    for j in range(round(MODULE / h) + 1):
        for i in range(round(MODULE / w)):
            polys.append([(i * w + x, j * h + amplitude * math.sin(2 * math.pi * x / w)) for x in xs])
    return polys


def fluted(pitch):
    return [[(pitch / 2 + i * pitch, 0.0), (pitch / 2 + i * pitch, MODULE)]
            for i in range(round(MODULE / pitch))]


def arcade(radii=(260.0, 200.0, 140.0), spring=320.0, steps=90):
    """Nested arches standing on a base line at the module joint."""
    cx = MODULE / 2
    polys = [[(0.0, 0.0), (MODULE, 0.0)], [(0.0, MODULE), (MODULE, MODULE)]]
    for r in radii:
        pts = [(cx - r, MODULE), (cx - r, spring)]
        for k in range(1, steps):
            t = math.pi - math.pi * k / steps
            pts.append((cx + r * math.cos(t), spring - r * math.sin(t)))
        pts += [(cx + r, spring), (cx + r, MODULE)]
        polys.append(pts)
    return polys


def tide(pitch=35.0, wavelength=175.0, amplitude=10.0, step=2.5):
    polys = []
    xs = [i * step for i in range(round(MODULE / step) + 1)]
    for j in range(round(MODULE / pitch)):
        y0 = pitch / 2 + j * pitch
        polys.append([(x, y0 + amplitude * math.sin(2 * math.pi * x / wavelength)) for x in xs])
    return polys


LAYOUTS = {
    # The four engravings on the tile samples in the Polygood Wall Tiles catalogue.
    "cat_wave_stack_117x350": (lambda: wave_stack(MODULE / 6, 350, 15),
                               "Catalogue (Smaragd sample): vertical stack, wavy joints, 116.7 x 350 mm."),
    "cat_stack_117x350": (lambda: grid(MODULE / 6, 350),
                          "Catalogue (Milky Way sample): vertical stack, 116.7 x 350 mm."),
    "cat_grid_140x175": (lambda: grid(140, 175),
                         "Catalogue (Oyster sample): grid of 140 x 175 mm."),
    "cat_stack_44x175": (lambda: grid(43.75, 175),
                         "Catalogue (Terracotta sample): fine vertical stack, 43.75 x 175 mm."),
    "grid_50": (lambda: grid(50, 50),
                "Small square grid, 50 mm. Mosaic look, as on the catalogue cover."),
    "grid_175": (lambda: grid(175, 175),
                 "Large square grid, 175 mm, 4 x 4 per module."),
    "stack_vertical_87x350": (lambda: grid(87.5, 350),
                              "Vertical stack bond, 87.5 x 350 mm, as in the catalogue's Smaragd kitchen."),
    "running_bond_175x87": (lambda: running_bond(175, 87.5),
                            "Horizontal running bond, 175 x 87.5 mm, half offset."),
    "herringbone_45": (lambda: herringbone_45(87.5),
                       "45-degree herringbone, bricks 61.9 x 123.7 mm, as in the catalogue's shower render."),
    "fluted_25": (lambda: fluted(25),
                  "Custom: vertical flutes at 25 mm centres. Reads like reeded timber under raking light."),
    "arcade": (lambda: arcade(),
               "Custom: three nested arches on a base line, one set per module."),
    "tide": (lambda: tide(),
             "Custom: horizontal waves, 35 mm pitch, 175 mm wavelength, 10 mm amplitude."),
}


def render_png(polys, cutter, ppm, path):
    size = round(MODULE * ppm)
    pad = round(3 * ppm)
    img = Image.new("L", (size + 2 * pad, size + 2 * pad), 255)
    draw = ImageDraw.Draw(img)
    w = cutter * ppm
    # Draw the neighbouring modules too, so grooves on the edges wrap and the map tiles.
    for ox in (-MODULE, 0.0, MODULE):
        for oy in (-MODULE, 0.0, MODULE):
            for poly in polys:
                pts = [((x + ox) * ppm + pad, (y + oy) * ppm + pad) for x, y in poly]
                draw.line(pts, fill=0, width=max(1, round(w)), joint="curve")
                # An end mill leaves round ends.
                for x, y in (pts[0], pts[-1]):
                    draw.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=0)
    # About 0.5 mm of softening, so bump reads as a machined arris rather than aliasing.
    img = img.filter(ImageFilter.GaussianBlur(0.5 * ppm))
    img.crop((pad, pad, pad + size, pad + size)).save(path)


def write_svg(name, note, polys, cutter, path):
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" width="700mm" height="700mm" viewBox="0 0 700 700">',
        f"<title>Polygood Wall Tile groove layout: {name}</title>",
        f"<desc>{note} Units: mm. Lines are tool centrelines; stroke width is the cutter "
        f"diameter ({cutter} mm, {CUTTERS.get(cutter, 'custom cutter')}). Groove depth to be "
        "confirmed with Polygood. Grooves on the module edge continue into the next module.</desc>",
        '<defs><clipPath id="module"><rect x="0" y="0" width="700" height="700"/></clipPath></defs>',
        '<rect id="module-outline" x="0" y="0" width="700" height="700" fill="none" stroke="#999999" stroke-width="0.5"/>',
        f'<g id="grooves" clip-path="url(#module)" fill="none" stroke="#000000" stroke-width="{cutter}" '
        'stroke-linecap="round" stroke-linejoin="round">',
    ]
    for poly in polys:
        pts = " ".join(f"{x:.3f},{y:.3f}" for x, y in poly)
        out.append(f'<polyline points="{pts}"/>')
    out += ["</g>", "</svg>", ""]
    path.write_text("\n".join(out))


def preview(names, out_dir, thumb=320):
    cols = 4
    rows = math.ceil(len(names) / cols)
    label_h = 28
    sheet = Image.new("L", (cols * thumb, rows * (thumb + label_h)), 255)
    try:
        font = ImageFont.load_default(size=16)
    except TypeError:
        font = ImageFont.load_default()
    draw = ImageDraw.Draw(sheet)
    for k, name in enumerate(names):
        tile = Image.open(out_dir / f"{name}.png")
        half = thumb // 2
        small = tile.resize((half, half), Image.LANCZOS)
        x0 = (k % cols) * thumb
        y0 = (k // cols) * (thumb + label_h)
        for dx in (0, half):
            for dy in (0, half):
                sheet.paste(small, (x0 + dx, y0 + dy))
        draw.rectangle([x0, y0, x0 + thumb - 1, y0 + thumb - 1], outline=160)
        draw.text((x0 + 6, y0 + thumb + 5), name, fill=0, font=font)
    sheet.save(out_dir / "preview.png")


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=here.parent / "textures" / "grooves")
    ap.add_argument("--cutter", type=float, default=6.35, help="groove width = cutter diameter, mm")
    ap.add_argument("--ppm", type=float, default=2.0, help="height map pixels per mm")
    ap.add_argument("--only", nargs="+", choices=sorted(LAYOUTS), help="layouts to draw")
    ap.add_argument("--list", action="store_true", help="list the layouts and exit")
    args = ap.parse_args()

    if args.list:
        for name, (_, note) in LAYOUTS.items():
            print(f"{name:24} {note}")
        return

    args.out.mkdir(parents=True, exist_ok=True)
    names = args.only or list(LAYOUTS)
    for name in names:
        make, note = LAYOUTS[name]
        polys = make()
        write_svg(name, note, polys, args.cutter, args.out / f"{name}.svg")
        render_png(polys, args.cutter, args.ppm, args.out / f"{name}.png")
        print(f"wrote {name}.svg and {name}.png")
    preview(names, args.out)
    print(f"wrote preview.png in {args.out}")


if __name__ == "__main__":
    main()
