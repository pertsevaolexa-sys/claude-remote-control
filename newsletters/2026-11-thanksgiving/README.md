# Polygood® Thanksgiving postcard (send 27 November 2026)

A short Thanksgiving greeting from The Good Plastic Company to the whole database, laid out as a postcard. The front is a tilted photo card with three stills from the Thanksgiving film. The back has the message, a Polygood stamp with a postmark, and *To* / *From* address lines.

| File | What it is |
|---|---|
| `email.html` | The newsletter. 600 px, table layout, inline styles, Mailchimp merge tags in the header and footer |
| `images/` | 3 images, about 180 KB: the postcard front, the stamp with postmark, and the logo |
| `plain-text.txt` | Plain-text version for the campaign's text part |
| `stills/` | 6 full-resolution stills (1080 × 1920) from `Polygood_Thanksgiving_2026_-_9x16_v12_1.mp4`, one per scene |
| `polygood-thanksgiving-2026-mailchimp.zip` (not committed) | `index.html` + `images/`, for Mailchimp's *Code your own → Import zip* |
| `polygood-thanksgiving-2026-stills.zip` (not committed) | The six stills, for download |

Earlier versions are in git history: the project edition (Sea Containers London, De Bijenkorf, Paagman, Solané) at commit `2c336c3`.

## Subject line and preheader

- **Subject:** Happy Thanksgiving from The Good Plastic Company (47 characters)
- **A/B alternative:** A Thanksgiving postcard from us (31)
- **Preheader** (already in the HTML): A Thanksgiving postcard from all of us at The Good Plastic Company (66)

## The postcard

- **Front:** stills 02, 04 and 06 side by side on a cream card with a white border, tilted 1.6° on the espresso background. The caption reads “Happy Thanksgiving · from The Good Plastic Company”. It is one image (`images/postcard-front.jpg`), so it scales on phones.
- **Back:** a cream card with a “Postcard” header. The message is on the left and the address side on the right, split by a vertical rule. On phones the two halves stack and the rule turns horizontal.
- **Stamp:** a perforated stamp with a Translucent Bronze (#PS1302) picture, the Polygood mark and “Thanksgiving 2026”. The postmark reads “The Good Plastic Company · Thanksgiving”, dated 26 Nov 2026 (Thanksgiving Day), with wavy cancellation lines across the stamp.
- **Message:** echoes the film's line “To the architects and designers who brought us into their projects, the fabricators who shaped every piece, the hotels, shops and…”. The clip stops at “and”, so the ending “…and homes that gave them a place: thank you” is new copy. Swap in the film's real ending if it differs.

Colours: espresso `#2B1E17` background, card `#F6F1E7` with a `#E3D9CA` border, ink `#252525`, bronze `#8A4F2A` for the signature, and muted `#B9B1A8` for the footer on espresso.

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
- [ ] Check the message ending (“…and homes that gave them a place”) against the full film.
- [ ] Links: https://polygood.com/, Instagram and LinkedIn (all live on 26 Nov).

## Import into Mailchimp

1. *Create → Email → Code your own → Import zip*, then choose `polygood-thanksgiving-2026-mailchimp.zip`. Mailchimp uploads the images and rewrites their paths.
2. Paste the subject. The preheader is already in the HTML, so leave Mailchimp’s preview-text field empty or paste the same line.
3. Paste `plain-text.txt` into the plain-text version.
4. Send the tests, then schedule.

If you paste the HTML into Mailchimp’s code editor instead of importing the ZIP, upload the 3 images to Content Studio first and replace each `images/…` path with its Mailchimp link.
