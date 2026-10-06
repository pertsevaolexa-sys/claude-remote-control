# Polygood newsletter, autumn 2026: four new case studies

Umbrella message: **One recycled panel, four different jobs**

De Bijenkorf (display plinths, Amsterdam), Henriette Stadthotel (washstands, Vienna), Orion (kitchenette worktops, Paris) and ONE DUST Studio (furniture, Taipei). Autumn design: warm paper, rust and ochre, Georgia headlines. After the four cases, a patterns block shows each of the seven patterns with its swatch, where it was used and what it was made from.

Facts come from the four case-study PDFs and the Notion pattern library (Marketing team space › All Patterns Images). `selling-brief.md` covers each detail in the newsletter: what it sells, who it's for, the proof, a line to reuse and the claim to avoid.

## Mailchimp settings

| Field | Text |
|---|---|
| Subject | Four jobs for one recycled panel |
| Subject, A/B option 2 | What old CD cases and fridges became |
| Subject, A/B option 3 | The pattern three of our four new projects chose |
| Preview text | Plinths in Amsterdam, washstands in Vienna, worktops in Paris, furniture in Taipei |

## Putting it into Mailchimp

1. Set the email width to 600px. Drag a **Code** block into the body and set its padding to 0.
2. Paste the whole of `mailchimp-code-block.html` into the block and save.
3. Upload the images to **Content Studio**, copy each one's URL and paste it over its placeholder in the code:

| Placeholder in the code | Image |
|---|---|
| `PASTE-DE-BIJENKORF-IMAGE-URL-HERE` | `images/de-bijenkorf.jpg` (photo: Milenka Backx) |
| `PASTE-HENRIETTE-IMAGE-URL-HERE` | Not in the PDF. Use one from the Henriette entry in Notion (Patrick Johannsen Fotografie or supersusi.com) |
| `PASTE-ORION-IMAGE-URL-HERE` | `images/orion.jpg` |
| `PASTE-ONE-DUST-IMAGE-URL-HERE` | `images/one-dust-studio.jpg` (photo: ONE DUST Studio) |
| `PASTE-SWATCH-SALMON-TERRA-URL-HERE` | `images/swatches/salmon-terra.jpg` (cropped from the De Bijenkorf plinths) |
| `PASTE-SWATCH-SAPPHIRE-TERRAZZO-URL-HERE` | `images/swatches/sapphire-terrazzo.jpg` |
| `PASTE-SWATCH-EMERALD-GHOST-URL-HERE` | `images/swatches/emerald-ghost.jpg` |
| `PASTE-SWATCH-WHITE-TERRAZZO-URL-HERE` | `images/swatches/white-terrazzo.jpg` |
| `PASTE-SWATCH-MALDIVES-URL-HERE` | `images/swatches/maldives.jpg` |
| `PASTE-SWATCH-BLACK-LOLLIPOP-URL-HERE` | `images/swatches/black-lollipop.jpg` |
| `PASTE-SWATCH-TRANSLUCENT-GLITTER-GOLD-URL-HERE` | Not exported. Take the first image on the Translucent Glitter Gold page in Notion and crop it square (240 × 240 px is enough) |

4. Replace `PASTE-ORDER-SAMPLES-URL-HERE` with the samples page. It appears twice: in the tile at the end of the patterns grid and in the button.
5. Leave the template's own footer in place, because it carries the unsubscribe link.

`preview.html` is the same email with the photos and swatches built in, for checking how it looks.

## Before sending

- [ ] Henriette, Orion and ONE DUST are still drafts. Publish their pages first, or change the links: the code expects `/projects/henriette-stadthotel/`, `/projects/orion/` and `/projects/one-dust-studio/`. Only `/projects/de-bijenkorf/` is live.
- [ ] Henriette photo and Translucent Glitter Gold swatch added, and the photo credits cleared for email use
- [ ] Samples link added in both places
- [ ] Test email sent to yourself and opened in Outlook and on a phone (the patterns grid should show 4 across on desktop, 2 across on a phone)

## The Henriette fridge line

The Henriette PDF says the washstands are made "from plastic that once lined fridges and freezers". The Notion pattern library gives different origins for two of the three patterns: Sapphire Terrazzo comes from spools, Emerald Ghost from home appliances, and White Terrazzo from refrigerators and single-use plastic cutlery. The patterns block shows those origins, so the newsletter now credits fridges to White Terrazzo only. If the Henriette washstands really were all made from fridge linings, correct the pattern library and change the line back in `copy.json`.

## Changing the copy

Edit `copy.json`, then run `python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies` from `polygood-newsletters/` to rebuild both HTML files. For the brief, edit `briefs.json` and run `python3 build_brief.py 2026-10-case-studies/briefs.json 2026-10-case-studies/selling-brief.md`.
