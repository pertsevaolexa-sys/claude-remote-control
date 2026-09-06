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
| Palette surface | 500 × 300 mm | Brief placeholder. |
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

### Groove and joint

The groove is modelled as real geometry cut into **one continuous panel**: a
full-extent backing slab with raised fields standing proud of it, each field
eased at its top edge. The material is UV-mapped from its position *in the
panel*, so it runs unbroken through every groove. This is the point of the
piece — a groove is machined into one panel; a joint is the line between two.

- Spacing 175 mm, groove 8 × 4 mm, square-cut: **illustrative approximation**,
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
3. **Groove profile drawing** — real profile, spacing and depth, and the
   commercial panel module (the residential 700 × 700 reference is not it).
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
