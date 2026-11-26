# Polygood® Thanksgiving postcard (send 27 November 2026)

A very short Thanksgiving greeting from The Good Plastic Company to the whole database, laid out as one simple postcard. A white card on the brand's paper background holds a photo from the Thanksgiving film, “Happy Thanksgiving”, one line of wishes, the signature and a small Polygood stamp.

| File | What it is |
|---|---|
| `email.html` | The newsletter. 600 px, table layout, inline styles, Mailchimp merge tags in the header and footer |
| `images/` | 3 images, about 125 KB: the photo, the stamp and the logo |
| `plain-text.txt` | Plain-text version for the campaign's text part |
| `stills/` | 6 full-resolution stills (1080 × 1920) from `Polygood_Thanksgiving_2026_-_9x16_v12_1.mp4`, one per scene |
| `polygood-thanksgiving-2026-mailchimp.zip` (not committed) | `index.html` + `images/`, for Mailchimp's *Code your own → Import zip* |
| `polygood-thanksgiving-2026-stills.zip` (not committed) | The six stills, for download |

Earlier versions are in git history: the project edition at commit `2c336c3`, and the first postcard (three stills, address lines) at `b7cc8aa`.

## Subject line and preheader

- **Subject:** Happy Thanksgiving from The Good Plastic Company (47 characters)
- **A/B alternative:** A Thanksgiving postcard from us (31)
- **Preheader** (already in the HTML): Wishing you a warm Thanksgiving and good company around the table (65)

## The card

- **Photo:** the top of still 04 (the kitchen with the fruit plate, green tiles and mugs), cropped above the film’s text overlay to 3:2.
- **Text:** “Happy Thanksgiving”, “Wishing you a warm Thanksgiving and good company around the table.”, then “From all of us at The Good Plastic Company” in bronze.
- **Stamp:** a small perforated stamp with a Translucent Bronze (#PS1302) picture, the Polygood mark and “Thanksgiving 2026”.
- Colours: paper `#F5F4F1` background, white card with a `#DEDAD3` border, ink `#252525`, bronze `#8A4F2A` for the signature.

## The stills

| File | Time | On screen |
|---|---|---|
| `…-01-paagman-opening.jpg` | 0.2 s | Opening shot, no text |
| `…-02-to-the-architects-and-designers.jpg` | 3.4 s | “To the architects and designers who brought us into their projects,” |
| `…-03-the-fabricators-light-wall.jpg` | 5.4 s | “the fabricators who shaped every piece,” |
| `…-04-the-fabricators-kitchen.jpg` | 6.4 s | “the fabricators who shaped every piece,” |
| `…-05-the-fabricators-terrazzo.jpg` | 7.4 s | “the fabricators who shaped every piece,” |
| `…-06-the-hotels-shops.jpg` | 9.5 s | “the hotels, shops” |

## Before sending

- [ ] Send a test to Gmail, Outlook and an iPhone. Mailchimp fills in the `*|…|*` merge tags at send time, so the local preview shows them raw.
- [ ] Links: https://polygood.com/, Instagram and LinkedIn (all live on 26 Nov).

## Import into Mailchimp

1. *Create → Email → Code your own → Import zip*, then choose `polygood-thanksgiving-2026-mailchimp.zip`. Mailchimp uploads the images and rewrites their paths.
2. Paste the subject. The preheader is already in the HTML, so leave Mailchimp’s preview-text field empty or paste the same line.
3. Paste `plain-text.txt` into the plain-text version.
4. Send the tests, then schedule.

If you paste the HTML into Mailchimp’s code editor instead of importing the ZIP, upload the 3 images to Content Studio first and replace each `images/…` path with its Mailchimp link.
