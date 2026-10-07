# The Polygood® Project Edit, autumn 2026: four new case studies

Umbrella headline: **One recycled panel, four jobs**

Umbrella statement: **Every swatch below says what the plastic used to be: Emerald Ghost is made from home appliances, Maldives from CD cases.**

| Case | Label | Headline |
|---|---|---|
| De Bijenkorf (display plinths) | De Bijenkorf · Amsterdam | Old spools now lift mannequins on Dam Square |
| Henriette Stadthotel (washstands) | Henriette Stadthotel · Vienna | Three washstand patterns, White Terrazzo from fridges |
| Orion (kitchenette worktops) | Orion · Paris | Sea-green worktops a shade lighter than teal cabinets |
| ONE DUST Studio (furniture and objects) | ONE DUST Studio · Taipei | Surface specialists turned Polygood into furniture and sculpture |

Each headline was written against the case PDFs and the pattern library, then fact-checked and style-checked. The Henriette headline names White Terrazzo as the fridge pattern because the photo shows a Sapphire Terrazzo washstand, which is made from spools.

The design follows the Project Edit header built in Mailchimp:
- warm off-white background
- bold black sans-serif headings
- teal dashed lines between sections

Each case has a "See the … project" button under its text, then its own row of pattern swatches (name and what it was made from) and an "Order samples of these patterns" button.

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
3. The photos and swatches are already linked. They load from this public GitHub repository, so they show in Mailchimp's preview, in the test email and for subscribers. If you'd rather host them in Mailchimp, see "Where the pictures live" in the editing guide.

| Image | File | Credit |
|---|---|---|
| De Bijenkorf | `images/de-bijenkorf.jpg` | Milenka Backx |
| Henriette Stadthotel | `images/henriette.jpg` | Supplied on 6 Oct 2026: Patrick Johannsen Fotografie or supersusi.com, so check which |
| Orion | `images/orion.jpg` | |
| ONE DUST Studio | `images/one-dust-studio.jpg` | ONE DUST Studio |
| Header strip | `images/hero-strip.jpg` | Crops of the four case photos. Only in `mailchimp-hero.html` and the full email |
| Seven swatches | `images/swatches/` | Salmon Terra is cropped from the De Bijenkorf plinths. Translucent Glitter Gold is the first image on its Notion pattern page |

4. The samples link is already set to `https://polygood.com/order-samples/`.
5. Leave the template's own footer in place, because it carries the unsubscribe link.

## Before sending

- [ ] Henriette, Orion and ONE DUST are still drafts. Publish their pages first, or change the links: the code expects `/projects/henriette-stadthotel/`, `/projects/orion/` and `/projects/one-dust-studio/`. Only `/projects/de-bijenkorf/` is live.
- [ ] The Henriette photographer confirmed, and the photo credits cleared for email use
- [ ] Test email sent to yourself and opened in Outlook and on a phone: every photo and swatch shows, each case's swatches sit three to a row, and every button opens the right page

## The Henriette fridge line

The Henriette PDF says the washstands are made "from plastic that once lined fridges and freezers". The Notion pattern library gives different origins for two of the three patterns: Sapphire Terrazzo comes from spools, Emerald Ghost from home appliances, and White Terrazzo from refrigerators and single-use plastic cutlery. The swatches under each case show those origins, so the newsletter now credits fridges to White Terrazzo only. If the Henriette washstands really were all made from fridge linings, correct the pattern library and change the line back in `copy.json`.

The Henriette project page has the same problem in its subtitle, "Washstands from recycled fridges for Austria's first circular hotel". It also states "Austria's first" as our own claim and drops "Living" from the owners' phrase. Before the page goes live, a safer subtitle is: "Washstands in three Polygood patterns for a Vienna hotel its owners call Austria's first Circular Living hotel".

## Changing the copy

See [`../EDITING.md`](../EDITING.md). In short: edit `copy.json`, then run `python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies` from `polygood-newsletters/`. It rebuilds all the HTML files and lists any placeholders still to fill.
