# The Polygood® Project Edit, autumn 2026: four new case studies

Umbrella message: **One recycled panel, four different jobs**

De Bijenkorf (display plinths, Amsterdam), Henriette Stadthotel (washstands, Vienna), Orion (kitchenette worktops, Paris) and ONE DUST Studio (furniture, Taipei).

The design follows the Project Edit header built in Mailchimp:
- warm off-white background
- bold black sans-serif headings
- teal dashed lines between sections

Each case ends with its own row of pattern swatches (name and what it was made from) and an "Order samples" link.

Facts come from the four case-study PDFs and the Notion pattern library (Marketing team space › All Patterns Images). `selling-brief.md` covers each detail in the newsletter: what it sells, who it's for, the proof, a line to reuse and the claim to avoid.

**To change anything, see [`../EDITING.md`](../EDITING.md).** It covers six ways to edit, from a quick fix inside Mailchimp to rebuilding from `copy.json`.

| File | Use |
|---|---|
| `mailchimp-code-block.html` | Everything after the Project Edit header and intro. Paste into a Code block under your header (the usual way) |
| `mailchimp-hero.html` | The header, dashed line and intro, only if they aren't already built in Mailchimp |
| `mailchimp-full-email.html` | The whole email (header, body, footer), for Mailchimp's "Paste in code" |
| `mailchimp-palettes.html` | Each case's swatch row alone, if you build the rest from Mailchimp's own blocks |
| `preview.html` | For looking at in a browser only. Never paste it into Mailchimp |
| `copy.json` | Every word, link and image address. Rebuild with `build_email.py` after editing |

## What the past campaigns say, and how this email uses it

From Mailchimp analytics for the 44 campaigns sent between October 2024 and September 2026: average 23.0% opens and 2.8% clicks, one audience ("The Good Plastic Company Newsletter").

| Finding | What this email does |
|---|---|
| The best clicks came from one concrete action. "Introducing GROWTH" (4.3%) was clicked most on **Order samples**. The Material Bank GROWTH email reached 6.4%. Wall Tiles and OLO Table pointed to "Contact us" and got 2.1% | One action throughout: **Order samples**, linked to `https://polygood.com/order-samples/`. It sits under each case's swatches and in the closing button |
| The best open rate was a seasonal subject with the brand name: "Polygood® is on fire this fall!" (39.4%). "Exhibiting Made Better: Booths from 100% Recycled and Recyclable Plastic" got 28.8% | The main subject has the brand and the season. The A/B options test a specific angle and a curiosity angle |
| Thursday had the best click rate among frequently used days (3.0% over 13 sends). Tuesday averaged 4.8% but from only 2 sends. 13:00 UTC was the best of the busy send hours (3.3%). Friday had the best opens (24.9%) | Suggested send: **Thursday at 13:00 UTC**. Or test Tuesday, given how few Tuesday sends there have been |

## Mailchimp settings

| Field | Text |
|---|---|
| Subject | The Polygood® Project Edit for autumn |
| Subject, A/B option 2 | Four jobs for one recycled panel |
| Subject, A/B option 3 | What old CD cases and fridges became |
| Preview text | Plinths in Amsterdam, washstands in Vienna, worktops in Paris, furniture in Taipei |
| Send | Thursday, 13:00 UTC |

## Putting it into Mailchimp

1. Under your Project Edit header and intro, drag a **Code** block into the email and set its padding to 0. The email should be 600px wide.
2. Paste the whole of `mailchimp-code-block.html` into the block and save.
3. Upload the images to **Content Studio**, copy each one's URL and paste it over its placeholder in the code. Or put the URLs into `copy.json` (`image_url`, `swatch_url`) and rebuild:

| Placeholder in the code | Image |
|---|---|
| `PASTE-DE-BIJENKORF-IMAGE-URL-HERE` | `images/de-bijenkorf.jpg` (photo: Milenka Backx) |
| `PASTE-HENRIETTE-STADTHOTEL-IMAGE-URL-HERE` | `images/henriette.jpg` (photo supplied on 6 Oct 2026; credit Patrick Johannsen Fotografie or supersusi.com, so check which) |
| `PASTE-ORION-IMAGE-URL-HERE` | `images/orion.jpg` |
| `PASTE-ONE-DUST-STUDIO-IMAGE-URL-HERE` | `images/one-dust-studio.jpg` (photo: ONE DUST Studio) |
| `PASTE-HERO-STRIP-IMAGE-URL-HERE` | `images/hero-strip.jpg`, only in `mailchimp-hero.html` and the full email |

A swatch appears once for every case that uses it (Emerald Ghost three times, Sapphire Terrazzo twice), so use Replace All for swatch links.

| Swatch placeholder | Image |
|---|---|
| `PASTE-SWATCH-SALMON-TERRA-URL-HERE` | `images/swatches/salmon-terra.jpg` (cropped from the De Bijenkorf plinths) |
| `PASTE-SWATCH-SAPPHIRE-TERRAZZO-URL-HERE` | `images/swatches/sapphire-terrazzo.jpg` |
| `PASTE-SWATCH-EMERALD-GHOST-URL-HERE` | `images/swatches/emerald-ghost.jpg` |
| `PASTE-SWATCH-WHITE-TERRAZZO-URL-HERE` | `images/swatches/white-terrazzo.jpg` |
| `PASTE-SWATCH-MALDIVES-URL-HERE` | `images/swatches/maldives.jpg` |
| `PASTE-SWATCH-BLACK-LOLLIPOP-URL-HERE` | `images/swatches/black-lollipop.jpg` |
| `PASTE-SWATCH-TRANSLUCENT-GLITTER-GOLD-URL-HERE` | Not exported. Take the first image on the Translucent Glitter Gold page in Notion and crop it square (240 × 240 px is enough) |

4. The samples link is already set to `https://polygood.com/order-samples/`.
5. Leave the template's own footer in place, because it carries the unsubscribe link.

## Before sending

- [ ] Henriette, Orion and ONE DUST are still drafts. Publish their pages first, or change the links: the code expects `/projects/henriette-stadthotel/`, `/projects/orion/` and `/projects/one-dust-studio/`. Only `/projects/de-bijenkorf/` is live.
- [ ] Translucent Glitter Gold swatch added, the Henriette photographer confirmed, and the photo credits cleared for email use
- [ ] Test email sent to yourself and opened in Outlook and on a phone (each case's swatches should sit in one row on a computer and wrap on a phone)

## The Henriette fridge line

The Henriette PDF says the washstands are made "from plastic that once lined fridges and freezers". The Notion pattern library gives different origins for two of the three patterns: Sapphire Terrazzo comes from spools, Emerald Ghost from home appliances, and White Terrazzo from refrigerators and single-use plastic cutlery. The swatches under each case show those origins, so the newsletter now credits fridges to White Terrazzo only. If the Henriette washstands really were all made from fridge linings, correct the pattern library and change the line back in `copy.json`.

## Changing the copy

See [`../EDITING.md`](../EDITING.md). In short: edit `copy.json`, then run `python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies` from `polygood-newsletters/`. It rebuilds all the HTML files and lists any placeholders still to fill.
