"""Make the edition's header photo strip: four photos side by side as tall slices.

usage: python3 header_strip.py <out-dir> <name> photo1.jpg[@x] photo2.jpg[@x] photo3.jpg[@x] photo4.jpg[@x]

Writes two files into <out-dir>:
  <name>.png             1440 x 840, for the user's header block in Mailchimp (twice the shown size, so it is sharp)
  images/hero-strip.jpg  720 x 420, used by mailchimp-hero.html, the full email and the preview

Each photo is cropped to a 360 x 840 slice (tall and narrow), centred unless you add @x, the
horizontal focus as a percentage of the width: kitchen.jpg@30 keeps the area 30% from the left.
Pick close-ups that show the material itself (an edge, a surface, a pattern) and a mix of colours;
the chapter photos below the header can then show the whole room.
"""
import sys
from pathlib import Path

from PIL import Image

W, H, N = 1440, 840, 4


def slice_of(path_spec, w, h):
    path, _, focus = path_spec.partition("@")
    fx = float(focus) / 100 if focus else 0.5
    im = Image.open(path).convert("RGB")
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left = min(max(0, round(im.width * fx - w / 2)), im.width - w)
    top = (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def main():
    if len(sys.argv) != 3 + N:
        sys.exit(__doc__)
    out, name, specs = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    strip = Image.new("RGB", (W, H))
    for i, spec in enumerate(specs):
        strip.paste(slice_of(spec, W // N, H), (i * W // N, 0))
        src = Image.open(spec.partition("@")[0])
        if src.height < H:
            print(f"note: {spec} is only {src.width}x{src.height}; its slice will look soft. Use a larger original if there is one.")
    out.mkdir(parents=True, exist_ok=True)
    (out / "images").mkdir(exist_ok=True)
    strip.save(out / f"{name}.png", optimize=True)
    strip.resize((W // 2, H // 2), Image.LANCZOS).save(out / "images" / "hero-strip.jpg", quality=88)
    print(f"wrote {out / (name + '.png')} and {out / 'images' / 'hero-strip.jpg'}")


if __name__ == "__main__":
    main()
