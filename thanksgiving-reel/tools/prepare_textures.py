"""Turn Polygood product photos into assets for the video.

The full-size photos on polygood.com/product/<slug>/ show a standing sample
on a white backdrop, with the Polygood mark engraved near the bottom-left.

- public/patterns/<slug>.jpg: the panel surface only, cropped above the
  mark, at native resolution. Used as the texture of every dish.
- public/products/<slug>.jpg: the whole product photo at half size, for the
  product-page shot that opens each course.

Crop boxes are mirrored in src/products.ts; keep the two in sync.

Usage:
    python3 tools/prepare_textures.py <folder with <slug>.jpg photos>

Add a slug to CROPS if a photo was shot with a different framing.
"""

import os
import sys

from PIL import Image

# (left, top, right, bottom) in a 2456 px wide product photo.
DEFAULT = (812, 196, 1632, 1320)
CROPS = {
    "espresso-noir": (770, 190, 1600, 1320),
    "translucent-orange": (790, 180, 1650, 1320),
    "translucent-glitter-gold": (800, 190, 1640, 1320),
    "translucent-glitter-green": (800, 190, 1640, 1320),
    "potpourri": (770, 190, 1650, 1320),
    "translucent-bronze": (800, 200, 1650, 1380),
}

PATTERNS = [
    # food
    "translucent-burgundy", "marbellous", "translucent-glitter-gold",
    "translucent-orange", "translucent-bronze", "milky-way",
    "translucent-glitter-green",
    # table setting
    "gossamer", "timeless-duo", "translucent-clear", "salt-dune",
    "vintage-pearl", "potpourri", "white-lollipop", "terrazzo-nuovo",
    "fleur-de-sel", "frost",
]

# Patterns that get a product-page shot before they turn into a dish.
PRODUCT_PHOTOS = [
    "translucent-burgundy", "marbellous", "translucent-glitter-gold",
    "translucent-orange", "translucent-bronze",
]


def main() -> None:
    src = sys.argv[1]
    out = os.path.join(os.path.dirname(__file__), "..", "public", "patterns")
    os.makedirs(out, exist_ok=True)
    for slug in PATTERNS:
        im = Image.open(os.path.join(src, f"{slug}.jpg")).convert("RGB")
        scale = im.width / 2456
        box = tuple(round(v * scale) for v in CROPS.get(slug, DEFAULT))
        im.crop(box).save(os.path.join(out, f"{slug}.jpg"), quality=88, optimize=True)
        print(f"{slug:28s} {box}")
    photos = os.path.join(os.path.dirname(__file__), "..", "public", "products")
    os.makedirs(photos, exist_ok=True)
    for slug in PRODUCT_PHOTOS:
        im = Image.open(os.path.join(src, f"{slug}.jpg")).convert("RGB")
        im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
        im.save(os.path.join(photos, f"{slug}.jpg"), quality=86, optimize=True)
        print(f"product photo {slug:20s} {im.size}")


if __name__ == "__main__":
    main()
