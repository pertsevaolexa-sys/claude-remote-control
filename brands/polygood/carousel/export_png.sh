#!/usr/bin/env bash
# Render each artboard to a 1080x1350 PNG in exports/.
# Needs a Chromium binary; override with CHROME=/path/to/chrome
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"
[ -x "$CHROME" ] || { echo "No Chromium at $CHROME - set CHROME=..." >&2; exit 1; }

python3 build.py
mkdir -p exports .render

python3 - <<'PY'
import re, os
order = [("Main","01-cover"),("WhatItIs","02-what-it-is"),("Texture","03-texture"),
         ("NoGrout","04-no-grout"),("Behaves","05-behaves"),("ThroughColour","06-through-colour"),
         ("Thickness","07-thickness"),("Engravings","08-engravings"),("Custom","09-custom")]
css = None
for n, out in order:
    s = open(n + ".dc.html", encoding="utf-8").read()
    if css is None:
        css = re.search(r"<style>(.*?)</style>", s, re.S).group(1)
    body = re.search(r"</helmet>\s*(.*?)\s*</x-dc>", s, re.S).group(1)
    open(".render/%s.html" % out, "w", encoding="utf-8").write(
        "<!doctype html><meta charset=utf-8><base href='file://%s/'>"
        "<style>%s body{margin:0}</style>%s" % (os.getcwd(), css, body))
PY

for f in .render/*.html; do
  out="exports/$(basename "${f%.html}").png"
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --allow-file-access-from-files --force-device-scale-factor=1 \
    --window-size=1080,1350 --screenshot="$out" "file://$PWD/$f" >/dev/null 2>&1
  echo "wrote $out"
done
rm -rf .render
