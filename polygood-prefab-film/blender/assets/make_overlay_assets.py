"""Draw the small overlay graphics used by the Blender edit (Film scene).

    python3 -I blender/assets/make_overlay_assets.py

Writes PNGs to blender/assets/overlay/. Each is the same artwork as the SVG
in the Remotion component it replaces, drawn at 4x and downsampled for clean
edges. The edit scales them to size, so one file serves both formats.
"""

import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "overlay")
SS = 4  # supersampling

ACCENT = (0xFF, 0x5A, 0x1F, 255)
PENDING = (0xB4, 0xB2, 0xAC, 255)
WHITE = (255, 255, 255, 255)
PAPER = (0xF4, 0xF3, 0xED)


def canvas(units, px_per_unit):
    side = units * px_per_unit * SS
    return Image.new("RGBA", (side, side), (0, 0, 0, 0)), px_per_unit * SS


def save(img, name, px):
    img.resize((px, px), Image.LANCZOS).save(os.path.join(OUT, name))


def square(units, inset, stroke, outline, fill=None, px_per_unit=10):
    img, k = canvas(units, px_per_unit)
    d = ImageDraw.Draw(img)
    a = (inset - stroke / 2) * k
    b = (units - inset + stroke / 2) * k
    if fill:
        d.rectangle([a, a, b, b], fill=fill)
    w = round(stroke * k)
    d.rectangle([a, a, b, b], outline=outline, width=w)
    return img, units * px_per_unit


def tick():
    """ProcessChecklist tick: M5 10.4 L8.6 14 L15.2 6.6, stroke 2.2, square caps."""
    img, k = canvas(20, 10)
    d = ImageDraw.Draw(img)
    pts = [(5, 10.4), (8.6, 14), (15.2, 6.6)]
    w = 2.2 * k
    d.line([(x * k, y * k) for x, y in pts], fill=WHITE, width=round(w), joint="curve")
    # square caps: extend each end by half the stroke along the segment
    for (x0, y0), (x1, y1) in ((pts[1], pts[0]), (pts[1], pts[2])):
        dx, dy = x1 - x0, y1 - y0
        n = (dx * dx + dy * dy) ** 0.5
        ex, ey = x1 + dx / n * 1.1, y1 + dy / n * 1.1
        d.line([(x1 * k, y1 * k), (ex * k, ey * k)], fill=WHITE, width=round(w))
    return img, 200


def toolhead():
    """Toolpath.tsx ToolHead, 48 x 48 px around its centre."""
    img, k = canvas(48, 1)
    d = ImageDraw.Draw(img)
    c = 24 * k
    ring = (0xFF, 0x5A, 0x1F, int(255 * 0.9))
    r, w = 13 * k, 1.5 * k
    d.ellipse([c - r - w / 2, c - r - w / 2, c + r + w / 2, c + r + w / 2], outline=ring, width=round(w))
    r = 4.5 * k
    d.ellipse([c - r, c - r, c + r, c + r], fill=ACCENT)
    for (x0, y0, x1, y1) in ((-22, 0, -16, 0), (16, 0, 22, 0), (0, -22, 0, -16), (0, 16, 0, 22)):
        d.line([(c + x0 * k, c + y0 * k), (c + x1 * k, c + y1 * k)], fill=ACCENT, width=round(w))
    return img, 48 * 4


def feather(top):
    """Paper over the logo clip's top (or bottom) 18 %, opaque at the edge."""
    h = 256
    img = Image.new("RGBA", (4, h))
    for y in range(h):
        t = y / (h - 1)
        a = int(round(255 * (1 - t if top else t)))
        for x in range(4):
            img.putpixel((x, y), (*PAPER, a))
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    img, px = square(20, 0.75, 1.5, PENDING)
    save(img, "check-pending.png", px)
    img, px = square(20, 0.75, 1.5, ACCENT, fill=ACCENT)
    save(img, "check-done.png", px)
    img, px = tick()
    save(img, "check-tick.png", px)
    img, px = square(10, 0.75, 1.5, PENDING)
    save(img, "profile-pending.png", px)
    img, px = square(10, 0.75, 1.5, ACCENT, fill=ACCENT)
    save(img, "profile-lit.png", px)
    img, px = toolhead()
    save(img, "toolhead.png", px)
    feather(True).save(os.path.join(OUT, "feather-top.png"))
    feather(False).save(os.path.join(OUT, "feather-bottom.png"))
    print("wrote", sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
