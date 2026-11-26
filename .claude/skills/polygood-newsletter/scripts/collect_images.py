"""Put every image the email uses into one folder, numbered in reading order, and zip it.

usage: python3 collect_images.py <edition-dir> [--header <header.png>]

Reads <edition-dir>/copy.json and copies from <edition-dir>/images into <edition-dir>/newsletter-images/:
  00-header-<name>.png                  the header strip (--header, or the first *-header.png in the edition)
  01-<chapter>-photo-<project>.jpg      then, for each case in order: its photo,
  01-<chapter>-logo-<firm>.png          its logos,
  01-<chapter>-swatch-<pattern>.jpg     and its swatches
and writes <edition-dir>/<edition-name>-images.zip with the same files.

<chapter> is the case's toc word ("shaped", "lived-in") when it has one, else its key.
A logo used in two chapters is copied into both, so each chapter is complete on its own.
The email keeps loading its images from images/; this folder is a copy for the user to keep,
upload to Notion or hand to a designer.
"""
import re
import shutil
import sys
import zipfile
import json
from pathlib import Path


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    ed = Path(args[0])
    copy = json.loads((ed / "copy.json").read_text())
    img = ed / "images"
    out = ed / "newsletter-images"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir()
    header = sys.argv[sys.argv.index("--header") + 1] if "--header" in sys.argv else next((str(p) for p in sorted(ed.glob("*-header.png"))), None)
    files = []

    def put(src, name):
        src = Path(src)
        if not src.exists():
            print(f"missing: {src}")
            return
        dst = out / (name + src.suffix.lower())
        shutil.copyfile(src, dst)
        files.append(dst)

    if header:
        put(header, "00-header-" + slug(Path(header).stem.replace("-header", "")))
    patterns = {p["name"]: p for p in copy.get("patterns", [])}
    for i, c in enumerate(copy["cases"], 1):
        ch = f"{i:02d}-{slug(c.get('toc') or c['key'])}"
        put(img / c["image_file"], f"{ch}-photo-{slug(c.get('place_title') or c['title'])}")
        for lg in c.get("logos") or []:
            put(img / "logos" / lg["file"], f"{ch}-logo-{slug(lg['alt'])}")
        for name in [n.strip() for n in c.get("pattern", "").split(",") if n.strip()]:
            p = patterns.get(name)
            if p and p.get("file"):
                put(img / "swatches" / p["file"], f"{ch}-swatch-{slug(name)}")
    zpath = ed / f"{ed.name}-images.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(f, f.name)
    for f in files:
        print(f.name)
    print(f"\n{len(files)} files in {out}, zipped as {zpath}")


if __name__ == "__main__":
    main()
