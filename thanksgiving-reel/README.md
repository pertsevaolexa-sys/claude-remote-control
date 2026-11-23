# Polygood Thanksgiving Reel

Remotion project for "Served with thanks", a 24-second Instagram Reel (1080 × 1920, 30 fps). The script, menu, shot list and caption are in [SCRIPT.md](SCRIPT.md). Notes for the Blender version are in [BLENDER.md](BLENDER.md).

## Preview and render

```bash
npm i
```

```bash
npm run dev
```

```bash
npx remotion render ThanksgivingReel out/polygood-thanksgiving-reel.mp4 --codec=h264 --crf=18
```

```bash
npx remotion still ReelCover out/reel-cover.png
```

Rendering needs no network: fonts, textures, photos and sound effects are all in `public/`. If Remotion cannot download its browser, point it at a local Chrome with `--browser-executable=/path/to/chrome`.

## How it is built

The table is one overhead "world" in world units of about 1 mm (`src/table/layout.ts`), filmed by a camera that moves from dish to dish. Every course in `COURSES` sets where its dish sits, which pattern it uses, how it is cooked (`pour`, `chop` or `roast`) and how long each step lasts. The timing of the whole table scene follows from those lengths.

| File | What it does |
|---|---|
| `src/table/layout.ts` | Courses, positions, timing, camera |
| `src/table/parts.tsx` | Tabletop, runner, place settings, serveware and the food layer |
| `src/table/Turkey.tsx` | The bird, platter and garnish |
| `src/scenes/TableScene.tsx` | Homepage hero, product pages, captions, the table |
| `src/scenes/Cooking.tsx` | Pouring, chopping, steam and the simmer |
| `src/scenes/ChefsScene.tsx` | "But all year, you did the cooking." |
| `src/scenes/EndCard.tsx` | Logo, pie and sign-off |
| `src/Cover.tsx` | Reel cover still |
| `src/products.ts` | Pattern ID, collection and origin for each menu pattern |

## Assets

`public/patterns/` holds the panel surface of each pattern and `public/products/` the full product photos, both cut from the photos on polygood.com/product/ by `tools/prepare_textures.py`. To add a pattern, download its full-size product photo, add the slug to that script and to `src/patterns.ts`, and run the script.

`public/brand/polygood-logo.svg` is the logo from polygood.com's stylesheet.

`public/fonts/` holds PP Neue Montreal Book and Bold. These are licensed to The Good Plastic Company, so keep this repository private.

The sound effects in `public/sfx/` come from remotion.media.

## Design rules

The root [CLAUDE.md](../CLAUDE.md) lists what we never use: no decorative gradients or glow, no badges, no all-caps labels above headings, no grey text on white, no motion that says nothing. Keep to it when editing.
