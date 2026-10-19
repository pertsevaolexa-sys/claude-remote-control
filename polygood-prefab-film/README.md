# Polygood prefabrication film

A 15-second motion piece on Polygood's in-house prefabrication, from a technical drawing to finished parts, built with Remotion, React and TypeScript. Two compositions share every scene and differ only in layout:

| Composition | Size | Ratio | Length |
|---|---|---|---|
| `PolygoodPrefab-Reels` | 1080 × 1920 | 9:16 | 450 frames at 30 fps (15 s) |
| `PolygoodPrefab-LinkedIn` | 1080 × 1350 | 4:5 | 450 frames at 30 fps (15 s) |

Rendered previews and storyboard sheets are in [`renders/`](renders/).

> **Placeholders.** No material scan, renders, reference video or audio were supplied. The material is a procedural terrazzo-style texture and the finish identifier reads `PS 000 · Placeholder finish`. Both are clearly marked and are swapped in one config file (see [Replacing assets](#replacing-assets)). Don't publish the film until they are replaced.

## Quick start

```console
npm i
npm run dev              # Remotion Studio: preview, scrub, edit
npm run render           # both films to out/
npm run render:reels     # out/polygood-prefab-reels-1080x1920.mp4
npm run render:linkedin  # out/polygood-prefab-linkedin-1080x1350.mp4
npm run lint             # eslint + typecheck
```

If Remotion can't download its headless browser (offline or sandboxed machines), point it at a local Chromium:

```console
REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell npm run render
```

To check frames without rendering the whole film: `node scripts/stills.mjs PolygoodPrefab-Reels out/stills 0 120 449 --contact`.

## Storyboard

| # | Time | Frames | On screen | What happens |
|---|---|---|---|---|
| 01 | 0–2 s | 0–59 | Start with your drawing | Extreme macro of the material, light sweep, pull-back to the full sheet. A pen plots a plan and end elevations of a table and bench, then dimension lines and ticks (no numbers). |
| 02 | 2–4.5 s | 60–134 | Prefabricated in-house | The drawing separates into six parts that slide into a nested layout on a 2800 × 1400 mm sheet. An orange CAM toolpath cuts each part (dashed rapids between them), the parts lift off the dimmed skeleton, and the tabletop moves to centre. Checklist appears at exactly 2.0 s; **Cut** ticks. |
| 03 | 4.5–7 s | 135–209 | Your edge, your profile | The tabletop turns and tips (CSS 3D) until only its end face shows, which becomes a 2D cross-section. The camera pushes in on the edge, which morphs square → bullnose → chamfer → bevelled, with the active label and an orange contour. Thickness callout. **Edged** ticks. |
| 04 | 7–10 s | 210–299 | Curved without thermoforming | A toolpath crosses the frame, wiping the edge close-up away to reveal a second panel. The toolpath engraves a staggered pattern of capsule cut-outs; the plugs drop away; the panel bends into a curved partition built from 40 strips in 3D, with a floor shadow tracing the curve. **Machined** and **Curved** tick. |
| 05 | 10–12.5 s | 300–374 | Lighter to ship, less waste | Isometric delivery stacks: full sheets beside the shorter stack of finished parts (dry tap as they settle). Offcuts move away, break into chips and re-form as a strip of new panel material. |
| 06 | 12.5–15 s | 375–449 | Send your drawing | The new material rises into the top band (finish identifier inside it), then the logo, call to action and URL. Static for the final second; silent for the final 0.5 s. |

The finish identifier sits bottom-left from frame 0 until 12.5 s, then moves into the end-card band. LinkedIn adds the technical spec lines from the brief beneath each headline, and both URLs on the end card.

## Design system

- **Type:** PP Neue Montreal (Book for headlines and labels, Bold for the PS code), black on off-white `#F5F4F0`. Sentence case, five words or fewer per headline, set line by line behind masks. If the font files are missing, `config/typography.ts` logs a warning and falls back to Inter / Helvetica Neue instead of failing the render.
- **Colour:** the material keeps its own colours. Orange `#FF5A1F` marks anything the machine does (toolpaths, tool head, active profile, checkmarks). The drawing is plotted in white on the material and dimensioned in black on paper.
- **Grid:** 80 px side margins on Reels (72 on LinkedIn). On Reels, key content stays between y = 250 and y = 1500 to clear the platform UI.
- **Motion:** calm rather than snappy. Eases in `config/theme.ts` keep peak speed low (ease-in-out for camera moves, ease-out cubic for arrivals), and headline lines take 22 frames to rise and 13 to leave. Hero objects fill most of the stage. Every value is computed from the frame (`interpolate`, eased with Béziers). There are no CSS transitions and no randomness beyond seeded `random()`, so any frame renders the same way every time.

## Project structure

```
src/
├── Root.tsx                     both films + each scene on its own timeline (Scenes-reels/…)
├── compositions/
│   ├── PolygoodFilm.tsx         scenes on the timeline + finish tag, checklist, sound
│   ├── InstagramReel.tsx
│   └── LinkedInVideo.tsx
├── scenes/                      Scene01Drawing … Scene06EndCard, plus sheetCamera.ts (02→03 handover)
├── components/
│   ├── Headline.tsx             masked line reveal, optional labels over material, LinkedIn spec line
│   ├── FinishTag.tsx            swatch + PS code + pattern
│   ├── ProcessChecklist.tsx     Cut / Edged / Machined / Curved
│   ├── TechnicalLine.tsx        partial polylines, pen-plotter progress
│   ├── Toolpath.tsx             CAM toolpath with rapids and tool head
│   ├── SheetDrawing.tsx         the plotted drawing and dimension lines
│   ├── SheetFrame.tsx           sheet outline, crop marks, shadow
│   ├── MaterialTexture.tsx      image loading, zoom pyramid, texture windows
│   └── WorldSvg.tsx             camera → SVG viewBox (world space in mm)
├── geometry/
│   ├── sheet.ts                 parts, nesting, drawing, dimensions, toolpath, offcuts
│   ├── profiles.ts              edge profiles as morphable cross-sections
│   ├── partition.ts             cut-out pattern and its toolpath
│   ├── camera.ts                2D camera, pull-back and zoom maths, isometric projection
│   └── polyline.ts
├── audio/Soundtrack.tsx
└── config/
    ├── timing.ts                every frame number (scene beats, checklist, finish tag)
    ├── layout.ts                per-format layout: the only place Reels and LinkedIn differ
    ├── assets.ts                file paths, finish identifier, claims to confirm
    ├── copy.ts                  all on-screen text
    ├── audio.ts                 cue list and voice-over slot
    ├── theme.ts, typography.ts
    └── validate.ts              the brief's timing rules, checked on load
scripts/
├── generate_placeholder_material.py   procedural texture (sheet + 2 zoom levels)
├── generate_audio.py                  synthesised sound design
└── stills.mjs                         render chosen frames + contact sheet
```

Geometry is in millimetres on the real sheet. The nest is 1600 × 800 tabletop, 1600 × 360 bench seat and four arched slab legs, with 30 mm or more between parts. Scenes look at it through a camera, so lines stay sharp at any zoom.

## Replacing assets

Everything is referenced from `src/config/assets.ts`. Change it there, not in the scenes.

1. **Material.** Replace `public/images/placeholder-material-sheet.jpg` with a scan of a full 2800 × 1400 mm sheet (2:1, about 4096 px wide), and update `ASSETS.material.sheet`. The opening macro uses two higher-resolution crops listed in `MATERIAL_LEVELS`. Export matching crops of the same scan at those regions, or empty the array (the macro will be softer). The swatch in the finish tag, the parts, the panel and the band all crop the same image, so they stay consistent.
2. **Finish identifier.** Set `FINISH.code` and `FINISH.pattern` to the finish shown, then set `isPlaceholder: false`.
3. **Thickness.** `CLAIMS.thicknessLabel` reads "12 or 19 mm" because the real component's thickness isn't known. Set it to "19 mm" or "12 mm" once it is.
4. **Supporting line.** "100% recycled polystyrene" is wired in but hidden. Set `CLAIMS.material.confirmed: true` once it is confirmed for the finish shown.
5. **Logo.** `polygood-vertical-black-cropped.svg` is the supplied file with only its viewBox tightened to the artwork; the paths are unchanged. The original is kept next to it.
6. **Fonts.** These are `public/fonts/PPNeueMontreal-{Book,Bold}.otf`. Check that the Neue Montreal licence covers video use for this campaign.

To regenerate the placeholders: `npm run assets:material` and `npm run assets:audio`.

## Audio

All sound is synthesised by `scripts/generate_audio.py` (numpy only): pad, pen-plotter scratch, spindle whir, checklist clicks, three mechanical clicks for the profiles, CNC engraving, panel flex, a dry tap, and one resolving note. Being generated from scratch, none of it carries a third-party licence, so it is safe to publish. The sounds are deliberately restrained placeholders. Each cue is its own file in `public/audio/` and is placed in `src/config/audio.ts`, so any one can be swapped for a licensed library sound.

- Cue times are derived from the scene beats in `timing.ts`, so they move with the picture.
- Loading the project fails if any cue runs into the final 0.5 s (frame 435 onwards).
- Rendered mix: −23.0 LUFS integrated, −6.7 dBFS true peak, digital silence from 14.5 s.

**Voice-over (optional, not recorded).** Script: *Start with your drawing. We prefabricate in-house: cut to shape, edged in the profile you need, CNC milled, engraved, or cut to bend without thermoforming. Lighter to ship. Offcuts become new panels. Send your drawing.* Record it confident and understated, keep it inside 14.5 s, save it as `public/audio/voiceover.wav` and set `VOICEOVER` in `config/audio.ts`. Lower the pad volume when it's in.

## Validation

`src/config/validate.ts` checks on every load (Studio and render) that:

- the total is 450 frames and the six scenes are contiguous;
- the checklist appears at frame 60, the finish identifier runs from 0 to 12.5 s, and the end card fills the last 2.5 s with the final second static;
- the last 0.5 s is silent;
- the formats are 1080 × 1920 and 1080 × 1350.

On the rendered files I confirmed the following:

- Both are H.264 + AAC, 450 frames at 30 fps, and 15.0 s long.
- Frames 420 and 449 are identical apart from encoding noise (PSNR 69 dB).
- The audio from 14.5 s is at −91 dB.
- Scene boundaries are continuous: the S2→S3 tabletop handover lines up, S4 opens on S3's last frame and wipes it away, and the S5 strip and S6 band are the same window onto the sheet.

## Missing assets and claims to confirm

**Not supplied** (drawn procedurally or left as integration points): reference video, material scans, tabletop-and-bench line drawing, component renders, curved-partition render, CNC toolpath artwork, audio, voice-over.

**To confirm before publishing:**

- The real finish and its PS code and pattern name, and a matching scan.
- The tabletop thickness (12 or 19 mm).
- "100% recycled polystyrene" (hidden until confirmed).
- That production offcuts are recycled into new panels. The scene 05 visual and its "Offcuts become new panels" label follow the voice-over script, and the visual is abstract on purpose. It doesn't suggest a customer take-back programme.
- That `polygood.com/prefabrication` and `polygood.com/contact-us` are live.
- That the cut-out partition pattern matches a technique Polygood offers. It is drawn as through-cut openings, not kerf cuts, with no heat shown.
- The spec lines (panel size, thicknesses, edge profiles, CNC options), which are used exactly as given in the brief.
- The table and bench are generic illustrations, not a client project.
