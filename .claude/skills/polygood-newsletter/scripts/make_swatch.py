"""Make a 240 x 240 pattern swatch from the official pattern image on polygood.com.

usage: python3 make_swatch.py <source> <out.jpg> [--box left,top,width,height]

<source> is either a polygood.com product page (https://polygood.com/product/emerald-ghost/), whose
og:image is downloaded, or a local image file.

Without --box the script takes the centre square of the image at 45% of its shorter side, which on
the product photos usually lands on the panel face. If the crop catches background, a shadow or the
panel edge, look at the image and pass --box as fractions of the width and height, for example
--box 0.30,0.35,0.30,0.30. Always look at the result: very pale patterns (White Lollipop) need a
hand-set box because there is little contrast to see where the panel ends.

Use the official pattern image, never a crop from a project photo: lighting and perspective in
project photos change the colour, and the swatch is what people order from.
"""
import io
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

UA = "Mozilla/5.0 (newsletter swatch)"


def load(source):
    if source.startswith("http"):
        page = urllib.request.urlopen(urllib.request.Request(source, headers={"User-Agent": UA}), timeout=30).read().decode("utf-8", "ignore")
        m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', page) or re.search(r'content="([^"]+)"[^>]+property="og:image"', page)
        if not m:
            sys.exit(f"no og:image on {source}; download the pattern image by hand and pass the file")
        data = urllib.request.urlopen(urllib.request.Request(m.group(1), headers={"User-Agent": UA}), timeout=30).read()
        print(f"pattern image: {m.group(1)}")
        return Image.open(io.BytesIO(data)).convert("RGB")
    return Image.open(source).convert("RGB")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--box")]
    if len(args) < 2:
        sys.exit(__doc__)
    im = load(args[0])
    w, h = im.size
    box = next((a.split("=", 1)[1] if "=" in a else sys.argv[sys.argv.index(a) + 1] for a in sys.argv if a.startswith("--box")), None)
    if box:
        l, t, bw, bh = (float(v) for v in box.split(","))
        crop = (round(l * w), round(t * h), round((l + bw) * w), round((t + bh) * h))
    else:
        side = round(min(w, h) * 0.45)
        crop = ((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2)
    out = Path(args[1])
    out.parent.mkdir(parents=True, exist_ok=True)
    im.crop(crop).resize((240, 240), Image.LANCZOS).save(out, quality=90)
    print(f"wrote {out} from crop {crop} of a {w}x{h} image")


if __name__ == "__main__":
    main()
