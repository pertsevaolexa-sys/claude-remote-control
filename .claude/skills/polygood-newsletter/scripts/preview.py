"""Screenshot a built newsletter at desktop and phone width, so you can look at it and send it to the user.

usage: python3 preview.py <edition>/preview.html <out-dir> [--no-style]

Writes desktop.png and mobile.png (full length) plus desktop-1.jpg, desktop-2.jpg ... and
mobile-1.jpg ... slices that are easy to read one at a time.

--no-style removes the <style> media query first. That shows the email the way clients that drop
<style> render it (some Gmail apps, Outlook, Mailchimp's own editor preview): the two story columns
then stay side by side on a phone. Check this version too: it must still read well.

Needs a Chrome or Chromium binary. Set CHROME=/path/to/chrome if it isn't found on its own.
"""
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image


def find_chrome():
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    for pattern in ("/opt/pw-browsers/chromium-*/chrome-linux64/chrome", "/opt/pw-browsers/chromium-*/chrome-linux/chrome"):
        hits = sorted(glob.glob(pattern))
        if hits:
            return hits[-1]
    for name in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        if shutil.which(name):
            return shutil.which(name)
    mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if Path(mac).exists():
        return mac
    sys.exit("No Chrome or Chromium found. Set CHROME=/path/to/chrome and run again.")


def shoot(chrome, page, png, width, scale):
    subprocess.run(
        [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
         f"--force-device-scale-factor={scale}", f"--window-size={width},9000",
         "--virtual-time-budget=20000", f"--screenshot={png}", page.resolve().as_uri()],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120,
    )


def trim(png):
    """Cut the empty page colour off the bottom of the tall screenshot."""
    im = Image.open(png).convert("RGB")
    w, h = im.size
    bg = im.getpixel((2, h - 2))
    px = im.load()
    bottom = h
    for y in range(h - 1, 0, -4):
        if any(px[x, y] != bg for x in range(0, w, 6)):
            bottom = min(h, y + 40)
            break
    im.crop((0, 0, w, bottom)).save(png)
    return im.crop((0, 0, w, bottom))


def slices(im, prefix, out, step):
    w, h = im.size
    n = 0
    for top in range(0, h, step):
        n += 1
        im.crop((0, top, w, min(h, top + step))).save(out / f"{prefix}-{n}.jpg", quality=86)
    return n


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        sys.exit(__doc__)
    page, out = Path(args[0]), Path(args[1])
    out.mkdir(parents=True, exist_ok=True)
    if "--no-style" in sys.argv:
        tmp = Path(tempfile.mkdtemp()) / "nostyle.html"
        tmp.write_text(re.sub(r"<style>.*?</style>", "", page.read_text(), flags=re.S))
        page = tmp
    chrome = find_chrome()
    for name, width, scale, step in (("desktop", 680, 2, 1900), ("mobile", 390, 2, 1950)):
        png = out / f"{name}.png"
        shoot(chrome, page, png, width, scale)
        n = slices(trim(png), name, out, step)
        print(f"{name}: {png} and {n} slices")


if __name__ == "__main__":
    main()
