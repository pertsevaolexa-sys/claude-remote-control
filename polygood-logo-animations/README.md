# Polygood logo animations

Five Remotion animations of the Polygood horizontal lockup with descriptor
("polygood – by the good plastic company"). All five are 1920 × 1080 at 30 fps
and end on the finished logo, so they work as intros, outros or stingers.

| Composition | Length | Background | What happens |
|---|---|---|---|
| `LineDraw` | 5 s | Paper | The mark and each letter are traced as outlines, then filled. The descriptor wipes in from the left. |
| `Terrazzo` | 6 s | Paper | Coloured plastic flakes drift across the frame, get pulled into the shape of the logo and set into a black terrazzo. Then they sink in and leave the plain logo. |
| `LoopSpin` | 5 s | Paper | The mark spins in at the centre like a recycling loop and sends out three coloured rings. Then it slides left while the letters pop up one by one. |
| `SheetWipe` | 5 s | Paper | Four slanted sheets of colour stack up across the frame and peel away. The mark, letters and descriptor rise out of masks behind them. |
| `PullBack` | 6 s | Night | The camera starts close in on the arrowhead and pulls back, then pans while the letters drift into focus. A band of colour glints across the finished logo. |

## Where things are

- `public/polygood-horizontal-descriptor-black.svg`: the source logo.
- `src/logo/paths.ts`: its path data, split into the mark, the eight letters
  and the descriptor so each part can be animated on its own.
- `src/logo/Stage.tsx`: a full-frame SVG in the logo's own coordinates, which
  centres the lockup at 1150 px wide.
- `src/logo/palette.ts`: logo black, the two backgrounds and the flake
  colours. These are picks for the animations, not official brand colours;
  change them here. `SheetWipe` repeats four flake colours inline so they can
  be edited in Studio.
- `src/versions/`: one file per animation. Each file registers its own
  `<Composition>`, and `src/Root.tsx` lists them in a `Polygood-logo` folder.

Timings sit inline in each `interpolate()` call. Elements wrapped in
`Interactive.*` (the mark, descriptor, sheets and similar) can be retimed
from the Studio timeline. The per-letter staggers are computed in loops, so
change those in code.

## Commands

```console
npm i
npm run dev                 # open Remotion Studio
npx remotion render LineDraw out/polygood-LineDraw.mp4
npm run lint                # eslint + tsc
```

If Remotion can't download its own headless Chrome, point it at an installed
one with `--browser-executable=/path/to/chrome`.

Remotion is free for individuals and teams of up to 3. Larger companies need
a [company license](https://www.remotion.pro/license).
