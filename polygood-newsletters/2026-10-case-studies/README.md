# The Polygood® Project Edit, autumn 2026: four new case studies

Umbrella headline: **Seven patterns in four cities**

Umbrella statement: **Under each project you'll find its swatches, named as you'd order them: the Amsterdam plinths are Salmon Terra, PS2121.**

| Case | Label | Headline |
|---|---|---|
| De Bijenkorf (display plinths) | De Bijenkorf · Amsterdam | On Dam Square, Salmon Terra plinths lift mannequins |
| Henriette Stadthotel (washstands) | Henriette Stadthotel · Vienna | Washstands in two terrazzos and Emerald Ghost |
| Orion (kitchenette worktops) | Orion · Paris | Sea-green worktops a shade lighter than teal cabinets |
| ONE DUST Studio (furniture and objects) | ONE DUST Studio · Taipei | Surface specialists made furniture and sculpture in Polygood |

The copy is written for a premium brand: it never says what the plastic was before. Each line was checked against the case PDFs and the Notion pattern library, then checked again for waste connotations, facts and style. Each swatch is captioned with its collection and code from the pattern library (for example "Colourful Splash Collection · PS2121").

The design follows the Project Edit header built in Mailchimp:
- warm off-white background
- bold black sans-serif headings
- teal dashed lines between sections

Each case has a "See the … project" button under its text, then its own row of pattern swatches (name, collection and code) and an "Order samples of these patterns" button.

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
| Subject, A/B option 2 | Seven Polygood® patterns in four cities |
| Subject, A/B option 3 | Emerald Ghost in a hotel, an office and a studio |
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

- [ ] All four project pages published with the copy from `web-pages.md`, and the ONE DUST slug set to `one-dust-studio-taipei`. Click every button in the test email to check it opens the right page.
- [ ] The Henriette photographer confirmed, and the photo credits cleared for email use
- [ ] Test email sent to yourself and opened in Outlook and on a phone: every photo and swatch shows, each case's swatches sit three to a row, and every button opens the right page

## The sample chooser page

Each case's sample button opens a "choose a sample" page at that project's section, and every swatch in the email links to its pattern. On the chooser page each sample links to its pattern page on polygood.com.

| File | Use |
|---|---|
| `sample-chooser-wordpress.html` | Paste into a **Custom HTML** block on a new WordPress page with the slug `project-edit-samples`. It brings its own styles and uses your theme's font |
| `sample-chooser.html` | The same page on its own, to preview in a browser |

The email links to `https://polygood.com/project-edit-samples/#de-bijenkorf`, `#henriette-stadthotel`, `#orion` and `#one-dust-studio`, and the closing button to the top of the page. If you give the page another address, change `chooser.url` in `copy.json` and rebuild. Each swatch and chooser card links to its pattern's product page on polygood.com (`pattern_url` in `copy.json`, for example `https://polygood.com/product/emerald-ghost/`), where the reader orders that sample. The seven addresses were matched to their page titles in polygood.com search results; the site itself is blocked from Claude's sandbox, so click each one once before sending. Search snapshots showed White Terrazzo and Translucent Glitter Gold samples as out of stock at some point: check them. If a pattern page ever goes away, empty its `pattern_url` and rebuild: the swatch then opens its project's section of the chooser, and the chooser card opens the general samples page.

## The project pages behind the buttons

`web-pages.md` has the copy for all four WordPress pages, written to match the newsletter: each text block, the slug, SEO title and meta description, alt text to check against the photos, and what to set in WordPress. It removes the waste wording the drafts had ("old cable spools", "once lined fridges and freezers", "recycled fridge and freezer plastic", "hint at the recycled plastic underneath").

The newsletter buttons link to the pages' own slugs:

| Case | Link |
|---|---|
| De Bijenkorf | `https://polygood.com/projects/de-bijenkorf/` |
| Henriette | `https://polygood.com/projects/henriette-stadthotel-vienna/` |
| Orion | `https://polygood.com/projects/orion-office-kitchenette-paris/` |
| ONE DUST | `https://polygood.com/projects/one-dust-studio-taipei/` (set this slug in WordPress: the draft has none yet) |


## Changing the copy

See [`../EDITING.md`](../EDITING.md). In short: edit `copy.json`, then run `python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies` from `polygood-newsletters/`. It rebuilds all the HTML files and lists any placeholders still to fill.
