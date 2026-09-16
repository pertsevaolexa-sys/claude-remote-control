# Reference assets — status

**None of the supplied reference files reached this session.** This directory is
therefore a register, not an archive: it records what each asset is for, whether
it was available, and what stands in for it.

Put the real files in this directory when you have them and the register below
tells you exactly what each one replaces.

## What was available

| Asset | Role | Status here |
|---|---|---|
| `IMG_3511(1).jpeg` | Venue: room, narrow curved counter, bookcase, stools | **Available** — supplied in the brief and used as the authoritative visual reference for the room shell, counter shape, bookcase, stools and surrounding furniture. Not present as a file in this repository. |
| `gExpo_holders_spec (1).pdf` | Holder and installation dimensions | **Not available.** Every dimension attributed to it comes from the tables in the brief text. The two drawing conflicts it contains are recorded in `src/config.js` (`CONFLICTS`) but the drawing itself could not be inspected. |
| `Polygood — A5 Exhibition Cards(1).pdf` | Growth and Translucent card artwork, displayed at landscape A4 | **Not available.** Replaced by a generated placeholder (`makeCollectionCard` in `src/textures.js`) at the correct 297 × 210 mm proportion. |
| `IMG_3777.jpeg` | Growth box appearance, Gensler credit, eight-sample arrangement | **Not available.** The box is modelled as geometry from the brief's description; the cover artwork is a generated placeholder carrying the required Gensler credit. |
| `IMG_3778.jpeg` | General brochure cover | **Not available.** Olive-green placeholder cover generated at 200 × 200 mm. |
| `IMG_3776.png`, `IMG_3775.jpeg` | Physical material and translucent sample references | **Not available.** Material appearance is generated procedurally; translucent colours are a provisional assortment read off the venue photograph. |
| `IMG_3774.jpeg` | Black triangular holder reference | **Not available.** The dimensioned construction from the brief takes priority anyway. |
| `IMG_3773(2).jpeg` | LOOK CLOSER sign artwork | **Not available.** Placeholder sign generated, including the invitation to lift the loose piece. |
| `Polygood · LOOK CLOSER · Blue Wave Roll-Up 33×81.jpeg` | Banner artwork | **Not available.** Placeholder generated at the revised 457.2 × 1122.68 mm proportion (the `33×81` in the filename is superseded). |
| Official Oyster product page (`polygood.com/product/oyster/`) | Oyster, PS2701 appearance | **Not reachable** — blocked by this environment's egress policy. The material is generated from the brief's written description: closely packed irregular white/ivory fragments, fine grey boundaries, occasional darker fragments. |
| Legacy concept model (`polygood-1.vercel.app`) | Existing geometry and configuration | **Not reachable** — blocked by this environment's egress policy, and no corresponding repository exists in this workspace (`spaces/gensler-chicago-activation/`, `config.js` and `build.mjs` did not exist before this work). A clean local implementation was built instead, as the brief directs. |
| Latest revised layout render | Arrangement reference | **Not available.** The arrangement follows the brief's numbered table directly. |

Superseded sources named in the brief — the older render
`31E287E6-D220-4F32-81DA-212C009D2982.jpeg` and the clear acrylic holder in
`IMG_3779.jpeg` — were not used, and would not be used if supplied.

## What the placeholders deliberately do NOT do

- **No fabricated QR code.** The banner shows a labelled grey block where the QR
  belongs. No certification mark is drawn anywhere.
- **No invented body copy.** Placeholder text is grey bars, not made-up
  sentences, so the model states no technical approval, performance figure,
  price or sustainability claim. The only running text is the card and sign
  headings, the banner headline visible in the venue photograph, and the Gensler
  Product Design Consultant credit the brief requires on the Growth box.
- **No photographs pasted onto flat planes.** The box, holders, samples and
  block are modelled as geometry with surfaces applied.
- Every placeholder carries a small `ARTWORK PLACEHOLDER` tag so a render can
  never be mistaken for approved artwork.

## Replacing a placeholder

Each generator lives in `src/textures.js` and is called from `src/displays.js`.
To use real artwork, load the image and pass it where the generated texture is
passed today — the geometry, sizes and positions do not change.
