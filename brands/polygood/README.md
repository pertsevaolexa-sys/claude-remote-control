# Polygood roll-up — 32 × 80 in

`poster/Polygood-Poster-32x80in.pdf` is the print file: the existing
`Poster-GExpo-18x44-2-inches.pdf` rebuilt at 32 × 80 inches without the
pixelation that simply enlarging it would have produced.

## What the enlargement did to the original

Scaling 18 × 44.2 in up to 32 in wide multiplies every dimension by 1.778, which
divides every raster asset's effective resolution by the same factor:

| asset | pixels | dpi at 18 in | dpi at 32 in |
|---|---|---|---|
| teal background photo | 768 × 869 | 22 | **12** |
| IISG / UL mark | 150 × 46 | 43 | **24** |
| EPD mark | 282 × 183 | 116 | **65** |
| indoor-air emissions label | 302 × 161 | 149 | 84 |
| ASCB / Quay Audit ISO marks | 405 × 257 | 143 | 80 |
| QR code | 528 × 528 | 135 | 76 |
| Prop 65, Cradle to Cradle, Declare | 1035–2000 px | 541–775 | 304–436 |

All the type, rules and pill outlines were already vector and stay
mathematically sharp at any size, so only the table above needed work.

## What was rebuilt

- **Background** — cropped to the part that actually lands on the page,
  de-blocked to strip the JPEG mottling, resampled to **145 dpi at final size**
  and given a whisper of grain so a 46-inch gradient cannot band on press. It
  stays DeviceCMYK, so the teal does not shift.
- **QR code** — its module matrix (25 × 25 plus a 4-module quiet zone) was read
  straight off the source bitmap and redrawn as vector rectangles. Lossless, and
  verified to still decode to `https://polygood.com/`.
- **IISG / UL, EPD, indoor-air emissions label, ASCB ISO marks** — traced to
  vector by colour separation, each layer filled with the DeviceCMYK value it
  had in the source file.
- **Prop 65, Cradle to Cradle, Declare** — untouched; they were already over
  300 dpi at the new size.

## Aspect ratio

18 : 44.2 is 1 : 2.456 and 32 : 80 is 1 : 2.5, so the two do not match exactly.
The artwork is scaled uniformly (×1.7778, no distortion) to 32 × 78.58 in and
the leftover **1.42 in is added as white at the foot**, where a roll-up
cassette hides it. The teal still bleeds off the top and both sides.

## File

- 32 × 80 in (2304 × 5760 pt), MediaBox/CropBox/Trim/Bleed all set to size
- fonts embedded (Neue Montreal, subset)
- DeviceCMYK throughout; the original's GRACoL 2013 CRPC6 output intent is kept
- no bleed allowance beyond the page — add one if the printer asks for it

## Rebuilding

Needs `pymupdf`, `pillow`, `numpy`, `scipy`, `opencv-python-headless` and the
`potrace` binary.

```sh
export POSTER_SRC=/path/to/Poster-GExpo-18x44-2-inches.pdf
mkdir -p vec
python3 scripts/extract_assets.py    # rasters + QR module matrix out of the source
python3 scripts/make_bg.py           # background -> 145 dpi CMYK
python3 scripts/make_qr.py           # QR -> vector
python3 scripts/assets.py            # certification marks -> vector
python3 scripts/build.py             # assemble the 32 x 80 in PDF
```

## Known limits

Tracing recovers clean edges, not detail that was never captured. The IISG / UL
mark came from a 150 × 46 px bitmap, so its letterforms carry that bitmap's
shape: sharp at any size now, but not a substitute for the vector original if
one can be obtained. The same applies, less visibly, to the other three marks
and to the background photo, whose real detail tops out around 23 dpi of the
original size.
