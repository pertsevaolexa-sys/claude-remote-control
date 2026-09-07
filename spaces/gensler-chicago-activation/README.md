# Polygood — Gensler Chicago office activation

Interactive 3D **concept model** of a compact Polygood installation on the
existing window counter of the Gensler Chicago office, built from the reference
photograph `IMG_3511.jpeg`.

Campaign: **LOOK CLOSER.** · Invitation: *Bring your next detail.* ·
Interaction: *Find the groove. Find the joint.*

> **What this is.** A tool for reviewing appearance, scale, placement, material
> combinations and the visitor sequence.
>
> **What this is not.** Not a fabrication drawing, not an engineering check, not
> a certified wet-area assembly, and not a product order. No dimension here is a
> site measurement. No texture is colour-accurate or tied to a SKU. Official
> event naming and date are unconfirmed; the model uses “Gensler Chicago office
> activation” throughout.

---

## Run it

No build step, no package install, no network, no login.

```
open spaces/gensler-chicago-activation/index.html
```

Any current Chrome, Edge, Firefox or Safari with hardware acceleration. Opening
the file directly from disk works — all scripts are classic (non-module) scripts
and three.js is vendored, so nothing is fetched at run time. To serve it instead:

```
cd spaces/gensler-chicago-activation && python3 -m http.server 8000
```

If WebGL cannot start, the page says so and points here.

### Controls

| Input | Action |
| --- | --- |
| Drag | Orbit |
| Scroll | Dolly |
| Shift + drag (or right-drag) | Pan |
| `1`–`6` | Vantage points |
| `0` | Reset the current vantage |

Every control in the panel is a real button or checkbox and is keyboard
operable. The panel is a review instrument — at the event the visitor is not
expected to touch a screen.

---

## Deploy

`dist/index.html` is the whole model in one file — three.js, all scene code, all
textures and all copy inlined. It makes **one HTTP request: itself.** 723 KB on
disk, about 190 KB over the wire once gzipped. Nothing is fetched at run time,
so it also still works if someone saves it to their desktop or receives it as an
email attachment.

Rebuild it after editing `config.js` (or anything else):

```
node build.mjs
```

Three ways onto Vercel, in increasing order of ceremony:

1. **Drag** `dist/index.html` onto vercel.com/new. No repo, no config.
2. **CLI**, from inside `dist/`: `vercel deploy --prod`
3. **Git-connected**: import the repo and set *Root Directory* to
   `spaces/gensler-chicago-activation/dist`. Framework preset: Other. No build
   command, no output directory override.

There is deliberately **no `vercel.json` at the repository root** — one there
would capture every future deployment from this repo, which is not a decision
this piece of work should make on its own. Route 3 needs no config file.

The built page carries `<meta name="robots" content="noindex, nofollow">`. That
is intentional: it shows a proposed credit line subject to brand approval,
placeholder dimensions and illustrative textures. It should be reachable by a
link you send, not by search. If the client later wants it indexed, remove that
line in `build.mjs` — but only once the credit and the product data are approved.

**Vercel deployments are public by default.** Anyone with the URL can open it.
If that matters here, turn on Deployment Protection (Vercel Authentication or a
password) in the project settings before sharing the link.

## Files

| File | What it holds |
| --- | --- |
| `config.js` | **The file to edit.** All dimensions (mm), copy, surfaces, product status, daylight, furniture reset. |
| `lib.js` | mm→m conversion, deterministic textures, card rendering, per-face UV mapping, counter polyline. |
| `venue.js` | The room, ported from `spaces/bow-window-lounge/` (rev `6e3c3c7`). |
| `installation.js` | Wall fragment, Growth surface, palette, coupon, supports, cards, fit checks. |
| `annotations.js` | Plan and height dimensions, annotation leaders, clear-floor band. |
| `app.js` | Renderer, cameras, controls, exports, palette record. |
| `vendor/three.min.js` | three.js r149 (MIT, licence included). |
| `exports/` | Review stills, each carrying its status footer. |
| `build.mjs` | Inlines everything into `dist/index.html`. |
| `dist/index.html` | **The deployable single file.** Rebuilt by `build.mjs`. |

The previous venue-only model at `spaces/bow-window-lounge/` is **unchanged and
still runnable**. This is a variant, not a replacement. Its camera work, bay
set-out, window construction, host counter, stools, credenza and daylight rig
are carried over; the constants they used now come from `config.js`.

---

## Assumption register

Everything below was chosen by us because the information was absent. All of it
needs replacing with supplied data before anything is made.

### Dimensions — all concept placeholders

| Parameter | Value | Basis |
| --- | ---: | --- |
| Counter height | 1000 mm | Brief placeholder. **Unmeasured.** |
| Counter depth at active zone | 450 mm | Brief placeholder. **Must be measured.** |
| Allocated display length | 1400 mm | Brief envelope. Model uses 1228 mm of it. |
| Active display depth | 400 mm | Brief placeholder. |
| Wall fragment | 700 × 650 mm | Cropped exhibition fragment, not a product module. |
| Growth fragment | 700 × 350 mm | Brief placeholder. |
| Growth top above counter | 120 mm | Brief placeholder, subject to fabricator detail. |
| Wall panel thickness | 12 mm | Visualisation choice. Confirm selected product. |
| Growth thickness | 19 mm | Visualisation choice. Confirm selected product. |
| Palette surface | 650 × 400 mm | Deepened from 300 for the sample boxes (inside the 400 mm active-depth cap) and widened from 500 for the four engraved samples — the widening **does** spend envelope. |
| Engraved Growth samples | 150 × 150 mm × 4 | One per engraving. 150 mm is set by the tallest cell, not chosen. |
| Sample boxes | 200 × 68 × 46 mm | Proportions from the supplied photographs. |
| Translucent Collection box | 360 × 95 × 68 mm, 150 mm lid | Proportions from the supplied photograph. Eleven blocks, colours illustrative. |
| Translucent unit tray | 400 × 180 mm | Our choice. This is what pushes the envelope past 1400 mm. |
| Coupon | 150 × 100 mm | Brief placeholder. |
| Clear-floor review band | 1200 mm | Planning overlay. **Not a compliance certification.** |
| Room, bay, windows, column | see `config.js` | From the photograph. Appearance and adjacency only. |
| Set-out angle on the counter | −18° | Our choice, for daylight and approach. |
| Support tray, rails, fins, gussets | all | **Our concept geometry. No engineering.** |

### Textures

Three deterministic placeholders — *Light*, *Medium*, *Dark — illustrative
texture*. Generated from a seeded PRNG as angular flakes in a matte matrix, one
tile representing 1000 mm so grain size is correct on a 150 mm sample and a
700 mm panel alike. **Not colour-accurate. No SKU attached.** Replace with
approved photographs or texture maps, preserving physical scale.

Because every texture is a same-origin canvas, PNG export can never be tainted.

### Engravings — partly supplied

The four engravings — **01 Oyster, 02 Pearl, 03 Jade, 04 Terracotta** — and
their shapes come from the client sheet *Polygood® Wall Tiles — Selected Tiles*.
Three are rectangular cells at different proportions; Jade is a fan/fish-scale
field with a bowed bottom edge. Those shapes are theirs.

What was **not** supplied is any dimension. The cell sizes in `config.js`
(43×43, 50×150, 50×150, 18.8×75 mm) are derived from the proportions in that
photograph against an **assumed 300 mm reference sheet**. They are illustrative.
The sheet itself says *“Illustrative numbering 01–04; final product codes to be
confirmed”*, so `engravingRefsConfirmed` is `false` and the model says so.

**The engravings are shown on the Growth collection**, in the palette: four
150 mm samples lying flat, one per engraving, all carrying the selected Growth
surface so the row compares engravings rather than colours. The wall fragment
keeps the coarse illustrative grid it was deployed with.

150 mm is the floor for those samples, not a preference: the Pearl and Jade
cells are 150 mm tall, so anything smaller cannot show one whole cell.

They were supplied for Wall Tiles. Whether they can be machined into Growth
panels, and in which thicknesses, is **not established** —
`product.engravingOnGrowthConfirmed` is `false`, and both the control panel and
the scene annotation say so. Nothing here should be read as saying Growth is
available engraved.

This replaces the brief's *three positions for 150 mm samples* with four
engraved ones, at the client's direction. The three Growth colours are still
comparable — on the swatches, which retexture all four samples at once.

### Sample boxes

The two Polygood sample boxes are modelled from the supplied product
photographs: a shallow tray of upright material sticks with the lid standing
behind. Proportions are read off those photographs — not a product drawing.
The lid copy is **reproduced from the photograph, not authored here**; confirm
exact wording and brand assets before this goes anywhere.

### Groove and joint

The groove is modelled as real geometry cut into **one continuous panel**: a
full-extent backing slab with raised fields standing proud of it, each field
eased at its top edge. The material is UV-mapped from its position *in the
panel*, so it runs unbroken through every groove. This is the point of the
piece — a groove is machined into one panel; a joint is the line between two.

- Groove 8 × 4 mm, square-cut with an eased lip: **illustrative approximation**,
  labelled as such in the scene. Manufacturer profile requested.
- The published 700 × 700 mm reference is described for residential projects. It
  is **not** treated here as the commercial module.
- **No panel-to-panel joint sample is shown.** Showing one would imply an
  approved connection that has not been detailed. The model marks where the real
  joint would occur and says the detail is requested.

One rendering approximation is worth naming: the groove floor is drawn with the
same material at 93% brightness, standing in for occlusion inside a 4 mm recess
that no shadow map at this scale resolves. It is a lighting cheat, not a product
property — and it is kept slight, because a uniformly dark recess is exactly
what grout looks like.

### Product

`wallTileSku` and `growthSurfaceSku` are **independent and both null**. A
same-pattern wall/counter setting is deliberately absent until availability is
confirmed (`samePatternAvailabilityConfirmed: false`).

### Daylight

Building orientation is unknown. The model assumes a WSW-facing bay (248°
azimuth) so the review has a defined geometry, and offers two legibility
conditions: soft daylight and bright backlight. **This is not a sun study.**

### Deliberately absent

No recycling statistics, no Lake Michigan silhouette, no awards, no
certification badges, no prices, no carbon figures, and no scannable QR — the
destination has not been supplied, so the card carries a plainly-labelled
placeholder instead.

---

## What the model checks, and what it found

The fit check runs live against `config.js` and reports rather than absorbs.

### The Translucent Collection box does not fit the allocation

Added as its own sub-assembly to the right of the Growth palette, as asked.
It is a markedly larger object than the two standard sample boxes — 360 × 95 ×
68 mm plus a 150 mm lid standing open — so it needs its own 400 × 180 mm tray.

The envelope is now **1826 mm against the 1400 mm allocated — over by 426 mm**,
and the fit check reports it as a failure rather than absorbing it.

Three ways out, in the order we would recommend:

1. **Raise the allocation.** The counter itself has the length — the run is
   about 4.4 m and the composition ends around 23° of arc, well clear of the
   credenza. The 1400 mm was a concept envelope, not a measured limit. This
   needs the real counter measured and the host's agreement, nothing more.
2. **Drop the two standard sample boxes** and let the Translucent box be the
   only box. That returns roughly 480 mm and brings the envelope back inside.
3. **Crop the exhibition fragment** from 700 mm, which the brief allows once
   the real engraving pattern has been reviewed — which it now has.

We have not chosen for you. The model shows the arrangement you asked for and
states the cost.

**Before the box was added, the composition used almost all of its allocation.** Adding the four
engraved Growth samples took the palette from 500 to 650 mm wide, and the
envelope from 1228 mm to **1384 mm of the 1400 mm allocated**. It passes, with
16 mm to spare. Anything further along the counter — a wider palette, a bigger
gap, a rotation — will fail the check rather than fit. That is the number to
watch if more is asked for.

**A finding worth acting on:** the counter is curved (2.28 m mean radius) and the
composition is rigid. A single 1240 mm object set out across that arc swings
roughly **78 mm** off the counter. So the composition is set out as **two rigid
sub-assemblies** — the 700 mm main unit and the 500 mm palette — each tangent to
the counter at its own centre, with the 40 mm gap measured at the front edge a
visitor reads. Their individual arc deviations are 25 mm and 13 mm, and the whole
thing then sits inside the 450 mm depth. As configured: envelope **1228 mm**
along the counter against 1400 mm allocated.

Change any dimension in `config.js` and the check re-runs. Overhang, running past
the end of the counter run, or colliding with the credenza are reported as
failures — the counter is never quietly made deeper.

Also modelled honestly:

- Everything is supported. The wall fragment stands in a slotted tray with fins
  and end gussets; the Growth surface sits on two rails, not a cantilever.
  All of it is labelled **concept support — fabricator review required**.
- Protective contact pads under every bearing point. **Nothing is fixed to the
  counter, glazing, historic trim or the column.**
- Two stools are **reset, not deleted**, and the rest of the room is untouched.
  The Existing/Proposed toggle shows the comparison.
- The freestanding fallback stands in its own allocated floor area, clear of the
  lounge furniture. It is a fallback needing site confirmation, not the default.

---

## Still needed before this goes further

1. **Site dimensions** — counter height, depth, length, and the real counter
   polyline. Everything in the table above is a placeholder.
2. **Counter load capacity and venue permission.** Unknown. Nothing in this model
   is a load approval, and no mass estimate should be read as one.
3. **Groove profile drawing** — real profile and depth, the real cell sizes for
   the four engravings, their final product codes, and the commercial panel
   module (the residential 700 × 700 reference is not it).
3a. **Whether the four engravings can be produced on Growth at all**, and in
   which thicknesses. The model shows them there because you asked to see it,
   not because it is established.
4. **Panel-to-panel joint detail.** Until supplied, no joint sample is shown.
5. **Product availability** — which Growth patterns, thicknesses and finishes can
   actually be ordered as Wall Tiles, and whether same-pattern is possible.
6. **Approved textures or photography**, with physical scale, plus SKUs.
7. **Support design**, reviewed by a fabricator: tray gauge, fixings, stability.
8. **Brand assets** and approval of the Growth credit line, which currently reads
   *“Growth collection, developed with Gensler serving as product design
   consultant.”* — proposed, attributed to Growth only, and covering neither the
   Wall Tiles range nor this installation's assembly.
9. **QR destination**, if one is wanted.
10. **Accessibility confirmation with the host** — floor circulation, and a
    nearby surface for seated or portable interaction. The photographed high
    counter is not on its own an accessibility answer; the coupon and samples are
    portable by design.

## Known limitations

- The freestanding fallback is a clone of the main composition and shares its
  materials, so palette changes carry — but its coupon does not animate with the
  Inspect toggle.
- Annotation labels are world-anchored sprites; at some orbit angles they
  overlap. Orbit slightly, or turn a group off.
- The room is modelled only far enough to judge the intervention. No entry
  location, building identity or survey accuracy is implied.
