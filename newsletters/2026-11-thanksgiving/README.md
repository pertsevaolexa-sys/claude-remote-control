# Polygood® Thanksgiving postcard (send 27 November 2026)

A short Thanksgiving greeting from The Good Plastic Company to the whole database, laid out as a two-sided postcard on an espresso background. The front is a tilted photo card with three stills from the Thanksgiving film. The back has the message on the left and a round postmark with *To* / *From* lines on the right.

| File | What it is |
|---|---|
| `email.html` | The newsletter with relative `images/…` paths, for the Mailchimp ZIP import |
| `email-github-images.html` | The same newsletter with its 3 images linked from this public repo (pinned to commit `3e6dc74`), so it shows images wherever you paste it |
| `images/` | 3 images, about 160 KB: the postcard front, the postmark, and the logo |
| `plain-text.txt` | Plain-text version for the campaign's text part |
| `stills/` | 6 full-resolution stills (1080 × 1920) from `Polygood_Thanksgiving_2026_-_9x16_v12_1.mp4`, one per scene |
| `polygood-thanksgiving-2026-mailchimp.zip` (not committed) | `index.html` + `images/`, for Mailchimp's *Code your own → Import zip* |
| `polygood-thanksgiving-2026-stills.zip` (not committed) | The six stills, for download |

Other versions in git history: the project edition at `2c336c3`, the one-card version at `9512866`, the light two-sided version at `dc6cc50`, and this version with a square stamp at `cea9cd3`.

## Subject line and preheader

- **Subject:** Happy Thanksgiving from The Good Plastic Company (47 characters)
- **A/B alternative:** A Thanksgiving postcard from us (31)
- **Preheader** (already in the HTML): A Thanksgiving postcard from all of us at The Good Plastic Company (66)

## The postcard

- **Front:** stills 02, 04 and 06 side by side on a cream card with a white border, tilted 1.6°, captioned “Happy Thanksgiving · from The Good Plastic Company”. One image (`images/postcard-front.jpg`).
- **Back, left:** “Happy Thanksgiving”, “To the architects and designers who brought us into their projects, the fabricators who shaped every piece, and the hotels, shops and homes that gave them a place: thank you.”, “Wishing you a warm Thanksgiving, from all of us.”, signed The Good Plastic Company.
- **Back, right:** a round postmark dated 26 Nov 2026 (Thanksgiving Day), tilted slightly like a hand stamp, then *To: Our friends, near and far* and *From: The Good Plastic Company*. On phones the two halves stack.
- The film clip stops at “the hotels, shops and…”, so “…and homes that gave them a place” is new copy. Swap in the film's real ending if it differs.

Colours: espresso `#2B1E17` background, card `#F6F1E7`, ink `#252525`, bronze `#8A4F2A` for the signature.

## Images: GitHub links are for previews, Mailchimp for the send

The links in `email-github-images.html` work only while this repository is public. Use them to preview and test. For the real send, import the ZIP or upload the 3 images to Mailchimp and use those links. If the email went out with GitHub links and the repo were made private later, the images would break in every inbox that already has it.

## Before sending

- [ ] Send a test to Gmail, Outlook and an iPhone. Mailchimp fills in the `*|…|*` merge tags at send time, so a local preview shows them raw.
- [ ] Check the message ending (“…and homes that gave them a place”) against the full film.
- [ ] Use Mailchimp-hosted images for the send (see above).

## Import into Mailchimp

1. *Create → Email → Code your own → Import zip*, then choose `polygood-thanksgiving-2026-mailchimp.zip`. Mailchimp uploads the images and rewrites their paths.
2. Paste the subject. The preheader is already in the HTML, so leave Mailchimp’s preview-text field empty or paste the same line.
3. Paste `plain-text.txt` into the plain-text version.
4. Send the tests, then schedule.
