# Polygood newsletter: four new case studies

Umbrella message: **One recycled panel, four different jobs**

De Bijenkorf (display plinths, Amsterdam), Henriette Stadthotel (washstands, Vienna), Orion (kitchenette worktops, Paris) and ONE DUST Studio (furniture, Taipei). Every fact comes from the four case-study PDFs. Emerald Ghost appears in three of the projects, and the intro uses that to back the message.

## Mailchimp settings

| Field | Text |
|---|---|
| Subject | Four jobs for one recycled panel |
| Subject, A/B option 2 | Washstands from fridge plastic, plus three more jobs |
| Subject, A/B option 3 | Hotel washstands from plastic that once lined fridges |
| Preview text | Plinths in Amsterdam, washstands in Vienna, worktops in Paris, furniture in Taipei |

## Putting it into Mailchimp

1. Open the email in the builder and drag a **Code** block into the body.
2. Paste the whole of `mailchimp-code-block.html` into the block and save.
3. Upload the photos from `images/` to **Content Studio**, copy each image's URL, and swap it into the code:

| Placeholder in the code | Photo |
|---|---|
| `PASTE-DE-BIJENKORF-IMAGE-URL-HERE` | `images/de-bijenkorf.jpg` (photo: Milenka Backx) |
| `PASTE-HENRIETTE-IMAGE-URL-HERE` | Not in the PDF. Use one from the Henriette entry in Notion (Patrick Johannsen Fotografie or supersusi.com) |
| `PASTE-ORION-IMAGE-URL-HERE` | `images/orion.jpg` |
| `PASTE-ONE-DUST-IMAGE-URL-HERE` | `images/one-dust-studio.jpg` (photo: ONE DUST Studio) |

4. Replace `PASTE-ORDER-SAMPLES-URL-HERE` (the "Request samples" button) with the samples or contact page.
5. Leave the template's own footer in place, because it carries the unsubscribe link.

`preview.html` is the same email with the photos built in, for checking how it looks.

## Before sending

- [ ] Henriette, Orion and ONE DUST are still drafts. Publish their pages first, or change the links: the code expects `/projects/henriette-stadthotel/`, `/projects/orion/` and `/projects/one-dust-studio/`. Only `/projects/de-bijenkorf/` is live.
- [ ] Henriette photo added, and the photo credits cleared for email use
- [ ] Samples button links to a real page
- [ ] Test email sent to yourself and opened on a phone

## Changing the copy

Edit `copy.json`, then run `python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies` from `polygood-newsletters/` to rebuild both HTML files.
