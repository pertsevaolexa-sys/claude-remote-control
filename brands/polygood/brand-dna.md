BRAND DNA DOCUMENT
==================

> **Status: PARTIAL — visual system is an interpretation, not the brand book.**
> The official brand book lives in Figma:
> https://www.figma.com/design/zJaug2zgIaarencklAzluL/the-good-plastic-company-♻️--Branding-Assets-?node-id=1319-464
> The Figma MCP connection (account `pertsevaolexa@gmail.com`) has view-only
> access and the MCP requires **editor** access, so nothing below marked
> `[INTERPRETED]` was read from the brand book. `polygood.com` is also blocked
> by this environment's egress policy, so on-site analysis was done through web
> search rather than by fetching the pages directly.
>
> To finish this document: share the Figma file to that account as **can edit**,
> then re-read node `1319-464` and replace every `[INTERPRETED]` value.

BRAND OVERVIEW
--------------
**Name:** Polygood® — the surface-material brand of The Good Plastic Company
**Product in scope:** Polygood® Wall Tiles
**Positioning:** Large-format recycled-plastic panels with the tile pattern
CNC-machined into the slab, so a tiled field can be specified without grout joints.
**Voice adjectives:** Technical, plain-spoken, evidence-led, unfussy, confident
**Audience:** Architects, interior designers and specifiers — commercial,
hospitality and washroom interiors.
**Competitive differentiation:**
- vs. **ceramic and porcelain tile** — no grout joint, so no sealing, staining,
  moisture retention or joint replacement cycle; a continuous field instead of
  an assembly.
- vs. **solid-surface panels (Corian, HI-MACS)** — comparable format and
  workability, but 100% recycled feedstock and 100% recyclable at end of life,
  with third-party certification behind the claim.
- vs. **other recycled-plastic surfaces** — Cradle to Cradle Certified® Bronze
  (first material of its kind) plus a verified EPD, which most competitors in
  the category cannot show.

VISUAL SYSTEM
-------------
All values `[INTERPRETED]` — placeholders pending the Figma brand book.
They are defined once, in the `TOKENS` block and `CHIPS` list at the top of
`carousel/build.py`. Change them there and re-run the build to restyle all
eight slides.

**Primary font:** Archivo (variable 400–700) — architectural grotesque, tight
tracking, holds up at 116px. Fallback: Helvetica Neue / Arial. `[INTERPRETED]`
**Secondary font:** IBM Plex Mono (400/500) — labels, spec values, slide
numbers. Reads as technical documentation. `[INTERPRETED]`
**Ground:** `#F2F0EB` warm paper off-white `[INTERPRETED]`
**Material field:** `#E6E2DA` `[INTERPRETED]`
**Ink:** `#15171A` near-black; body `#4E5257`; tertiary `#83878C` `[INTERPRETED]`
**Rule / hairline:** `#CDC7BB` `[INTERPRETED]`
**Accent:** `#2F6B4F` deep green — eyebrow labels and list bullets only `[INTERPRETED]`
**CTA style:** solid near-black block, mono uppercase, no radius `[INTERPRETED]`
**Terrazzo fragment palette:** mostly tonal (taupe, stone, chalk, near-black)
with terracotta, green, slate blue and ochre used sparingly. `[INTERPRETED]`
**Logo:** not available. The wordmark is currently set as live text in the
display face and must be replaced with the real logo asset from the brand book.

MATERIAL AND PRODUCT DETAILS
----------------------------
Sourced from web research (see `carousel/SOURCES.md`), not from the brand book.

**Panel size:** 2800 × 1400 mm (110 × 55 in)
**Thickness:** 12 mm or 19 mm
**Weight:** 50–78 kg (110–172 lb) per panel, depending on thickness
**Material:** 100% recycled and recyclable polystyrene (PS)
**Feedstock:** post-consumer and post-industrial PS waste — refrigerator
insulation, electronics housings, CD cases, disposable food containers, toys,
building components
**Palette:** 50+ colourways; patterns resembling terrazzo, marble, resin, acrylic
**Wall Tiles surface:** grooves precision CNC-machined into slab-format panels
to create a continuous tiled field with no grout joints
**Properties:** durable, long-lasting, lightweight, waterproof; cuts and shapes
with standard tooling
**Applications:** bathrooms, kitchens, hospitality, offices, reception desks,
wet zones, public and high-traffic commercial interiors
**Certification:** Cradle to Cradle Certified® Bronze — first material of its
kind to achieve it; verified Environmental Product Declaration (EPD)

**Deliberately NOT claimed** (no verified source found — do not add without
confirming against the technical guide):
- fire rating / reaction-to-fire class
- slip resistance
- acoustic performance
- specific CO₂ or embodied-carbon figures
- warranty period

DESIGN DIRECTION (as built)
---------------------------
**Concept:** the layout system *is* the product. Every material field is drawn,
not photographed: a seamless terrazzo of irregular fragments (generated as SVG
from the `CHIPS` palette) overlaid with a machined V-groove field on a 168px
pitch. Slide 2 is the only slide that shows conventional tile-and-grout, and it
is deliberately the least attractive frame in the set.
**Composition:** strict left-aligned single column, 84px side margins, mono
eyebrow label, display headline, body paragraph, then a full-bleed material
field that absorbs the remaining height. Every slide closes on a hairline rule
with `NN / 08` at left and a caption at right.
**Photography:** none used. No product photography was available and none was
fabricated. If the brand book supplies approved photography, the material
fields are the natural place to swap it in.
**Text overlay style:** no text over the material fields — copy and material
occupy separate bands, which keeps every slide legible at feed thumbnail size.

AD CREATIVE STYLE
-----------------
**Formats:** Instagram carousel 4:5 (1080 × 1350). Slide 1 carries the hook,
slides 2–3 the problem/solution turn, 4–7 the evidence, 8 the ask.
**Offer presentation:** soft, specifier-appropriate. One CTA, on the last slide
only: order a sample box.
**Emoji:** none.
