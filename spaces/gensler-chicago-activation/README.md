# Polygood · LOOK CLOSER — Gensler Chicago office activation

An interactive 3-D model of the Polygood material presentation on the existing
curved black counter in the Gensler Chicago bay-window room. It exists so the
team can review the display, walk through the visitor journey, and brief the
representatives who will host it.

**This is a spatial prototype, not a fabrication set.** Most dimensions in it
are estimates or placeholders. The unresolved ones are listed below, shown in
the model's dimension overlay in amber and red, and printed by `npm run check`.

---

## Running it

```bash
cd spaces/gensler-chicago-activation
npm install        # three.js, plus Playwright only if you want to re-render screenshots
npm run dev        # http://localhost:5173
```

`npm run dev` copies the three.js ES modules into `vendor/` and serves the page.
There is no bundler and nothing is fetched at run time.

| Command | What it does |
|---|---|
| `npm run dev` | Vendor three.js and serve the model on port 5173 |
| `npm run build` | Vendor three.js only (what a static deploy needs) |
| `npm run check` | Print the fit report — dimensions and clashes read from geometry, not from a screenshot |
| `npm run shots` | Re-render `screenshots/` and report console errors |
| `npm run bundle` | Build `dist/index.html` — the whole model as ONE self-contained file |

### Controls

Orbit with the left mouse button, pan with the right, zoom with the wheel.
Five review cameras across the top: **Room overview**, **Whole counter**,
**Installation detail**, **Top layout**, **Conversation area**. **Dimensions**
turns on the measurement overlay (off by default). **Click the plain Oyster
coupon** on the installation base to lift it — it is removable, not glued —
and **Reset sample** puts it back.

---

## Deploying to Vercel

`npm run bundle` writes **`dist/index.html`** — a single ~1 MB file with
three.js, all of `src/`, the stylesheet and the markup inlined. It fetches
nothing at run time, so it works on any static host and also opens straight from
disk by double-clicking it. `dist/index.html` is committed, so you can deploy
without running anything.

Verified with `node verify-dist.mjs`: loads clean over HTTP and over `file://`,
zero console errors, zero external network requests.

**Quickest — drag and drop.** Upload the `dist` folder at
[vercel.com/new](https://vercel.com/new), or from this directory:

```bash
npm run bundle
cd dist && vercel deploy --prod
```

**From Git.** Point the Vercel project at this repository and set:

| Setting | Value |
|---|---|
| Framework Preset | Other |
| Root Directory | `spaces/gensler-chicago-activation/dist` |
| Build Command | *(leave empty)* |
| Output Directory | `.` |

**Building on Vercel instead of committing `dist/`.** Set Root Directory to
`spaces/gensler-chicago-activation`, Build Command to `npm run bundle`, and
Output Directory to `dist`.

Rebuild the file after any change to `src/` — `dist/index.html` is generated,
never edited by hand.

---

## What is on the counter, left to right

Left and right are as a visitor sees them, standing in the room looking at the
counter and the windows.

| | Display | Purpose |
|---|---|---|
| — | **Roll-up banner** on the floor, immediately left of the counter | Starts the presentation. 457.2 × 1122.68 mm (18 × 44.2 in) — a narrow ~1.12 m display, not a two-metre banner. |
| 1 | **Three brochures**, 200 × 200 mm | A familiar introduction and something to take away. |
| 2 | **Growth Collection A4 + open Growth box** | Eight samples in two rows of four make the range tangible. The A4 is offset sideways because the full-size propped cover would hide its heading. |
| 3 | **LOOK CLOSER installation** | 450 × 450 mm engraved Oyster panel on a 450 × 420 mm black base; LOOK CLOSER sign front-left; removable **plain, unengraved** portrait Oyster coupon front-right. |
| 4 | **Six engraved samples + two general sample boxes** | Three across, two rows deep, with the black and grey boxes behind them. Comparison zone. |
| 5 | **Translucent block + A4** | Ten upright translucent samples in an unbranded black block, with its card behind. |
| 6 | **Three stools**, floor, right end, room side | The conversation area. |

The single existing bookcase stays under the rounded right end of the counter.

---

## The visitor journey

A suggested route, not a forced one. Visitors may join anywhere, or pick up a
brochure on the way out.

**Arrival — recognise the material.** The banner on the left establishes
Polygood. The brochures give people something familiar to hold and to take.

**Growth — connect the palette to a design story.** The open box makes the range
real; the A4 beside it explains the collection. The box carries the supplied
credit identifying **Gensler as Product Design Consultant for the Growth
Collection**. That credit belongs to the Growth Collection — not to every
Polygood product, and not to the installation as a whole.

**LOOK CLOSER — connect material choice with surface treatment.** The central
panel is a Growth Collection material, machined as **one continuous sheet**: the
four-by-four grid is 4 mm × 3 mm recessed grooves with the material floor
showing through, not sixteen tiles with grout. The plain coupon on the same base
is the same sheet with no engraving, so a visitor can feel the material, the
edge and the thickness in their hand and compare it with the panel.

**Compare — from one example to possible applications.** Six loose engraved
samples let a representative compare surface treatments. The two general boxes
widen the material conversation without competing for attention.

**Translucent — colour and light.** The upright samples are the last distinct
material experience, lit from the bay behind them. Their A4 sits directly
behind the block.

**Discuss — connect a material to a real project.** Three representatives sit
together at the right, facing the visitor area, able to stand and demonstrate.
The route from the displays to them stays clear.

### Hosting sequence for representatives

1. Open with: **"What kind of project are you working on?"**
2. Introduce Growth and its supplied Gensler credit, then show the Oyster panel
   and hand over the removable sample.
3. Ask which **colour, finish or surface detail** matters for that project.
4. Use the engraved samples, the general boxes and the translucent display to
   compare options.
5. Ask: **"What detail would you need to resolve before specifying this?"**
6. Agree a relevant next step — selected samples, a technical discussion, or a
   quotation enquiry.

Do not state technical approvals, guaranteed performance, prices or
sustainability claims. Use the approved supplied artwork for product statements.
The aim is a useful, project-specific conversation, not a sales target.

---

## What still needs confirming

Run `npm run check` for the full report. The short version:

### Conflicts — decisions recorded, none approved

1. **Main panel thickness: 12 mm or 19 mm.** The assembly drawing and the
   12.1 mm base slot indicate 12 mm; the cut list labels the same 450 × 450
   panel as 19 mm stock. A 19 mm panel cannot enter a 12.1 mm slot. The model
   uses 12 mm. **No manufacturing file has been changed.**
2. **Removable coupon: drawn landscape, required portrait.** The drawn slot is
   190 × 15.64 × 12 mm, 60 mm from the front and offset 90 mm right — sized for
   a landscape 180 × 120 coupon. The brief now requires portrait 120 × 180. The
   portrait coupon is centred in the existing slot, leaving 35 mm of open slot
   at each end. A redesigned slot is **not** approved here.
3. **The installation does not fit the counter with the margin asked for.** The
   base is 450 × 420 mm. A 20 mm margin all round needs 490 × 460 mm of flat
   top. The provisional 450 mm deep counter, curved at R6000, offers about
   26 mm of total front-to-back slack — a best balanced margin of **13.0 mm**,
   7 mm short per edge. The object has **not** been scaled down and the counter
   has **not** been widened. **The counter depth needs measuring.**
4. **Translucent slot rotation datum is ambiguous.** 20° clockwise is specified
   but not what from. Measured from the block's width axis, ten 15 mm slots at
   25 mm pitch would overlap by 6.45 mm and merge into a single channel.
   Measured from the depth axis they clear by 23.5 mm. The buildable reading is
   modelled; confirm it against the drawing.
5. **Counter top thickness.** The legacy model carries 45 mm; the photograph
   shows a markedly thinner top. Modelled at 20 mm to keep the real appearance.
6. **The translucent block cannot be one part from 19 mm sheet.** It is
   represented visually as specified at 300 × 80 × 80 mm; a laminated or
   constructed body still has to be resolved. This does not hold up the visual
   model.

### Measurements and sizes still open

- **Counter**: length, depth, height, curve radius and top thickness are all
  read off the photograph or inherited as legacy estimates. A photograph is not
  a survey.
- **Growth box**: the 330 × 310 × 20 mm envelope is an explicit **modelling
  assumption**, not a measurement anyone supplied. The `33 × 31` and `3 × 3`
  notes have unclear units and an unclear subject and were not treated as sizes.
  The way the box opens could not be established either: a flat-open cover needs
  about 620 mm of depth, which the counter does not have, so the full-size cover
  is propped at 78°. Provisional presentation method.
- **General sample boxes**: placeholder geometry scaled from the venue
  photograph, because the legacy project geometry the brief points to could not
  be reached. No production size has been invented and neither box was removed.
- **LOOK CLOSER sign**: size unconfirmed; 210 × 148 mm landscape used
  provisionally.
- **Stools and furniture clearances**: layout assumptions. They are **not**
  claims about statutory clearances.
- **Six engraving patterns and ten translucent colours**: provisional
  assortments, exposed in `src/config.js` so they can be swapped without
  touching geometry.

### Sources that did not reach this session

The legacy concept model and every supplied file except the venue photograph
were unavailable — the site and the Oyster product page are blocked by this
environment's egress policy, and no prior repository for this space exists in
this workspace. All printed artwork is therefore a clearly-labelled placeholder
with no fabricated QR code, certification mark or body copy. See
[`assets/README.md`](assets/README.md) for the full register.

---

## How the code is arranged

| File | Responsibility |
|---|---|
| `src/config.js` | **Every** source dimension, in millimetres, plus `PROVENANCE` (a source and a status for all 186 values), `CONFLICTS` and `ASSUMPTIONS`. Change dimensions here and nowhere else. |
| `src/units.js` | The single millimetre → metre conversion. One world unit = one metre. |
| `src/layout.js` | Placement maths for the curved counter. Positions only — it never scales anything. |
| `src/fit.js` | The fit report: counts, order, footprints, clashes, margins. Pure, so Node and the browser see identical numbers. |
| `src/geom.js` | Geometry helpers, including real slots via shapes-with-holes and the physical UV bake that keeps fragment size correct on every part. |
| `src/textures.js` | Procedural materials and placeholder artwork. |
| `src/materials.js` | Shared materials. |
| `src/room.js` | Venue: room, bay, column, counter, bookcase, stools, surrounding furniture. |
| `src/displays.js` | The eight display groups. Each returns its own footprint. |
| `src/overlay.js` | The dimension overlay, colour-coded by status. |
| `src/main.js` | Scene, daylight, cameras, controls, review panel, sample-lift interaction. |

Dimensions are separated from placement throughout: moving a group along the
counter cannot change its size, and `npm run check` fails if any configuration
value loses its provenance entry.

### Model export

GLB export is **not** included. The brief allows identifying it as a separate
follow-up where no export workflow already exists, and none did. Everything in
the scene is standard three.js geometry, so adding `GLTFExporter` later is
straightforward.

---

## Screenshots

`screenshots/` holds the current renders: room overview, whole counter,
installation detail, top layout, conversation area, the dimension overlay, and
the review interface. Regenerate them with `npm run shots`.
