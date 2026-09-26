# The Grout Bill

Research on mould in steamy bathrooms and kitchens in Europe and the US, and a
20-year cost model that asks whether ceramic tiles with grout still pay off
where the steam is.

Published page: https://claude.ai/artifact/Qu6VbcLc9fUBVNsGu5Dxa6 (private to the owner until shared).

## Findings (default case: 6 m² shower wall, 20×25 cm tiles, average ventilation, 20 years)

- Mould grows in cement grout and silicone, not in glazed tile. Porcelain absorbs 0.5 % or less;
  EN 13888 lets standard CG1 grout take up 5 g of water in 30 min and 10 g in 4 h.
- A tiled shower uses about 3 L of chlorine mould spray a year (4 bottles, ~80 g sodium
  hypochlorite): €24, £18 or $17. Over 20 years that is ~60 L, ~80 bottles, ~1.6 kg NaOCl.
- Small tiles with cement grout cost 1.9–2.1× as much as grout-free wall panels in cash and
  2.3–2.5× counting scrubbing time (EU €4,131 vs €1,784; UK £3,890 vs £1,617; US $7,712 vs $3,099).
- Chemicals are only 4–12 % of that bill; about half is time, the rest regrouting and silicone work.
- Ventilation is the biggest lever: poor → good saves ~€5,000 / £5,000 / $9,300 per tiled
  shower over 20 years after paying for a fan.
- Epoxy grout adds ~€90 to the wall and pays back in 2 years (time counted) or 5 years (cash).
  Over 30 years, tiles with epoxy grout are the cheapest cash option in the EU and US.
- Kitchen splashbacks: about 0.2 L of spray a year; tiles remain a sound choice there.

## Files

| File | What it is |
| --- | --- |
| `model.js` | The cost model (runs in the browser and in Node). All prices and assumptions live here. |
| `run-scenarios.js` | Prints every scenario table; `node run-scenarios.js > scenarios.md` regenerates `scenarios.md`. |
| `scenarios.md` | Generated tables: grout geometry, spray volumes, 20-year totals by region and ventilation, robustness checks. |
| `template.html` | The research page, with a placeholder where the model is inlined. |
| `build.js` | `node build.js` writes the standalone `index.html`; `node build.js out.html` also writes the artifact fragment. |
| `index.html` | The built page; open it in any browser. |

## Limits

Prices are September 2026 snapshots from trade price guides and retailers, several read through
search-engine extracts. Treatment frequency, scrubbing speed, spray dose and joint lifetimes are
assumptions, all adjustable in the page's calculator. Water damage, health costs, weekly cleaning
and resale value are left out of the totals (see the page's "Method and limits" section).
