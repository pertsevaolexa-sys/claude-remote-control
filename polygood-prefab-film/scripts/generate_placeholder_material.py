"""Generate the PLACEHOLDER Polygood-style material texture.

No material scan was supplied, so the film uses a procedural terrazzo-like
surface: chips of colour in a solid base, which is how recycled-plastic
panels typically read. It is NOT a real Polygood finish. Replace the outputs
with a real scan (see README, "Replacing assets") before publishing.

The same chip set is rendered three times, as a small image pyramid for the
opening pull-back (about 30x):
  public/images/placeholder-material-sheet.jpg  the full 2800 x 1400 mm sheet
  public/images/placeholder-material-mid.jpg    a 400 x 711 mm crop at 6 px/mm
  public/images/placeholder-material-macro.jpg  a 140 x 249 mm crop at 12 px/mm

Because all images come from one deterministic chip list, the crops line up
exactly with their regions of the sheet, so the camera can pass from one to
the next without a visible jump.

Usage:  python3 -I scripts/generate_placeholder_material.py
"""

import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SEED = 20261019
SHEET_W_MM, SHEET_H_MM = 2800, 1400

# Keep in sync with MATERIAL_LEVELS in src/config/assets.ts
MACRO = {"x": 1410, "y": 46, "w": 140, "h": 249}
MID = {"x": 1280, "y": 4, "w": 400, "h": 711}

SHEET_PX_PER_MM = 4096 / SHEET_W_MM
MID_PX_PER_MM = 6
MACRO_PX_PER_MM = 12
SUPERSAMPLE = 2

# Sapphire base with light, mid and dark chips. Orange is deliberately absent:
# it is reserved for toolpaths in the motion graphics.
BASE = (35, 64, 142)
CHIPS = [
    ((242, 239, 232), 0.34),  # warm white
    ((169, 192, 236), 0.20),  # pale blue
    ((61, 99, 201), 0.15),  # mid blue
    ((20, 37, 84), 0.13),  # navy
    ((16, 16, 18), 0.08),  # black
    ((142, 211, 192), 0.06),  # mint
    ((228, 201, 160), 0.04),  # sand
]

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "images")


def pick_colour(rng):
    r = rng.random()
    acc = 0.0
    for colour, weight in CHIPS:
        acc += weight
        if r <= acc:
            return colour
    return CHIPS[-1][0]


def jitter(colour, rng, amount=10):
    return tuple(max(0, min(255, c + rng.randint(-amount, amount))) for c in colour)


def make_chips():
    """Return a list of (polygon_mm, colour). Polygons are lists of (x, y) in mm."""
    rng = random.Random(SEED)
    chips = []

    def add(count, size_lo, size_hi, verts_lo, verts_hi, roundness):
        for _ in range(count):
            # Log-uniform size so there are many small chips and a few large ones.
            size = math.exp(rng.uniform(math.log(size_lo), math.log(size_hi)))
            cx = rng.uniform(-size, SHEET_W_MM + size)
            cy = rng.uniform(-size, SHEET_H_MM + size)
            n = rng.randint(verts_lo, verts_hi)
            rot = rng.uniform(0, math.tau)
            stretch = rng.uniform(0.55, 1.0)
            pts = []
            for i in range(n):
                a = rot + i * math.tau / n + rng.uniform(-0.35, 0.35) * math.tau / n
                rad = size / 2 * rng.uniform(roundness, 1.0)
                x = math.cos(a) * rad
                y = math.sin(a) * rad * stretch
                pts.append(
                    (
                        cx + x * math.cos(rot) - y * math.sin(rot),
                        cy + x * math.sin(rot) + y * math.cos(rot),
                    )
                )
            # Slight translucency lets overlapping chips read as layered, moulded material.
            alpha = int(255 * rng.uniform(0.8, 1.0))
            chips.append((pts, jitter(pick_colour(rng), rng) + (alpha,)))

    add(4200, 9, 34, 5, 8, 0.55)  # large flakes
    add(22000, 3, 10, 4, 7, 0.5)  # medium chips
    add(90000, 0.6, 2.6, 3, 5, 0.6)  # fine speckle
    add(260000, 0.2, 0.7, 3, 4, 0.6)  # dust, only visible in the macro crop
    return chips


def smooth_noise(w, h, cells_x, cells_y, rng_np):
    small = Image.fromarray((rng_np.random((cells_y, cells_x)) * 255).astype(np.uint8), "L")
    return np.asarray(small.resize((w, h), Image.BICUBIC), dtype=np.float32) / 255.0 - 0.5


def render(region, px_per_mm, chips, path):
    rx, ry, rw, rh = region["x"], region["y"], region["w"], region["h"]
    k = px_per_mm * SUPERSAMPLE
    W, H = round(rw * k), round(rh * k)

    # Low-frequency mottling of the base, sampled in sheet space so the macro
    # crop and the full sheet agree.
    rng_np = np.random.default_rng(SEED)
    full_w, full_h = 1024, 512
    mottle_full = smooth_noise(full_w, full_h, 48, 24, rng_np)
    sx0, sy0 = int(rx / SHEET_W_MM * full_w), int(ry / SHEET_H_MM * full_h)
    sx1 = max(sx0 + 2, int(math.ceil((rx + rw) / SHEET_W_MM * full_w)))
    sy1 = max(sy0 + 2, int(math.ceil((ry + rh) / SHEET_H_MM * full_h)))
    crop = mottle_full[sy0:sy1, sx0:sx1]
    mottle = np.asarray(
        Image.fromarray(((crop + 0.5) * 255).astype(np.uint8), "L").resize((W, H), Image.BICUBIC),
        dtype=np.float32,
    ) / 255.0 - 0.5

    base = np.empty((H, W, 3), dtype=np.float32)
    for c in range(3):
        base[..., c] = BASE[c] * (1 + mottle * 0.22)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")
    draw = ImageDraw.Draw(img, "RGBA")

    for pts, colour in chips:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        if max(xs) < rx or min(xs) > rx + rw or max(ys) < ry or min(ys) > ry + rh:
            continue
        draw.polygon([((x - rx) * k, (y - ry) * k) for x, y in pts], fill=colour)

    img = img.resize((round(rw * px_per_mm), round(rh * px_per_mm)), Image.LANCZOS)

    # Fine grain, so flat chip colours read as a moulded surface, not vector art.
    arr = np.asarray(img, dtype=np.float32)
    grain = np.random.default_rng(SEED + 1).normal(0, 3.2, arr.shape[:2])[..., None]
    arr = np.clip(arr + grain, 0, 255).astype(np.uint8)
    out = Image.fromarray(arr, "RGB").filter(ImageFilter.UnsharpMask(radius=1, percent=30, threshold=2))
    out.save(path, quality=90, optimize=True, progressive=True)
    print(f"wrote {path} {out.size[0]}x{out.size[1]}")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    chips = make_chips()
    render(
        {"x": 0, "y": 0, "w": SHEET_W_MM, "h": SHEET_H_MM},
        SHEET_PX_PER_MM,
        chips,
        os.path.join(OUT_DIR, "placeholder-material-sheet.jpg"),
    )
    render(MID, MID_PX_PER_MM, chips, os.path.join(OUT_DIR, "placeholder-material-mid.jpg"))
    render(MACRO, MACRO_PX_PER_MM, chips, os.path.join(OUT_DIR, "placeholder-material-macro.jpg"))


if __name__ == "__main__":
    main()
