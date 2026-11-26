---
name: polygood-newsletter
description: Build Polygood® email newsletters for Mailchimp in the Project Edit series (the October 2026 Project Edit, the November 2026 Kitchen Edit) from Notion case-study pages. Covers house-style copy that follows the premium brand rule, the story layout (photo beside text, partner logos, sample cards, credits, open call), a Mailchimp-safe Code block, the header photo strip, hosted images, previews and the send checklist. Use it whenever the user asks for a Polygood or The Good Plastic Company newsletter, email, Mailchimp campaign or code block, a new edition or theme (kitchens, hotels, offices, retail, furniture), turning Notion case studies into an email, or changing an existing edition (layout, buttons, colours, images, credits, logos), even if they only write "рассылка", "сделай письмо", "newsletter", "code" or send a Mailchimp screenshot.
---

# Polygood newsletter: the Project Edit series

The user is on the Polygood® marketing team (The Good Plastic Company). Polygood is a premium surface material made as panels in named patterns, sold to designers, architects, kitchen makers and fabricators.

Every month or two they send a case-study newsletter through Mailchimp. Each edition takes three to five new projects from the website case studies in Notion and tells them as one compact story. Each project shows one thing the material does, and the email ends with an action: order a sample, or join an open call.

Two editions exist. Both were built with `scripts/build_email.py` and are good references:

- **October 2026, "The Polygood® Project Edit"**: four projects (De Bijenkorf, Henriette Stadthotel, Orion, ONE DUST), `"layout": "edit"`, teal on warm off-white.
- **November 2026, "The Polygood® Kitchen Edit"**: "The life of a worktop" in four chapters (Shaped, Fitted, Lived in, Shared), then an open call to kitchen makers, `"layout": "story"`, blue with olive. This is the current house layout. Start new editions from it.

## What to hand over

1. **`mailchimp-code-block.html`**: everything under the header. Paste it into the chat in full, in one fenced `html` block. The user copies it from the chat into a Mailchimp Code block. They have asked for this every time ("code", "дай HTML-кодом полностью").
2. **The header strip** as one PNG, 1440 × 840. The user builds the header, subject line and preview text as Mailchimp blocks, so none of these go in the code (`"header_in_mailchimp": true`).
3. **Three subject lines and a preview text**, in the chat.
4. **Preview screenshots** at desktop and phone width, sent with the file tool, before or with the code.
5. **Images at public URLs**, plus a `newsletter-images/` folder and zip of every image in reading order. On request, the same images in a Notion folder under the case-studies page.
6. **An edition README** with the story, the files and a "Before sending" checklist: unpublished project pages, credits and logo permissions to confirm, and facts deliberately left out.

Reply in the language the user writes in (often Russian, sometimes mixed). The email itself is always in UK English.

## Where things live

- **Repository** `pertsevaolexa-sys/claude-remote-control`:
  - each edition is a folder `polygood-newsletters/<yyyy-mm-theme>/` with `copy.json`, `images/` (with `swatches/` and `logos/`) and the built files;
  - `polygood-newsletters/build_email.py` is the same generator as `scripts/build_email.py` here. If you change one, copy it to the other;
  - `polygood-newsletters/EDITING.md` is the user-facing editing guide.
  - Work on the branch the session assigns, and don't open pull requests unless asked.
- **Notion**:
  - Marketing team space › "Website case studies: November 2026 selection" (page id `41582e7c7c86816e93d9d5af3ad46dfe`) has one child page per case: intro, sections, a fact block with collaboration credits, pattern and code, and the photos. More selections may follow on sibling pages; search Notion for "Website case studies".
  - Text in [square brackets] is unconfirmed.
  - The pattern library is Marketing team space › All Patterns Images.
- **polygood.com**:
  - pattern pages `https://polygood.com/product/<slug>/`, where samples are ordered;
  - project pages `https://polygood.com/projects/<slug>/`;
  - contact `https://polygood.com/contact-us/`;
  - samples `https://polygood.com/order-samples/`.

## Workflow

### 1. Agree the edition

Find out the theme, which projects, and anything to announce (in November: "we're looking for kitchen-making partners for joint projects"). If the user gives Notion links, those are the projects.

Then propose the story in two or three lines before writing it all: a title, one word per chapter, and the one function each project shows. The November example was "The life of a worktop: Shaped (thermoforming) · Fitted (solid edge, no edging strip) · Lived in (stains and care) · Shared (daily use in an office pantry)". A good story follows something real (a material's life, a day, a space from studio to street) rather than a slogan. Don't ask about things you can decide well yourself.

### 2. Gather facts and photos from Notion

Fetch each case page with `notion-fetch` and `include_file_urls: true`. The signed image URLs expire after about five minutes, so download each page's photos straight after fetching it: one page, then its downloads, then the next page. Save originals under `images/src/`, outside the email's files.

From the fact block, take the credits, the pattern and its code, and the city. Anything in [brackets] stays out of the email and goes on the README checklist. Check each pattern's product URL and code on polygood.com.

If a fact you want isn't confirmed, write around it. Don't guess.

### 3. Write `copy.json`

Read `references/brand-and-claims.md` first, every time. It holds:
- the premium rule ("we do not make the connotation about the fact that litter used to be our panels");
- the claims checked on polygood.com and the ones to avoid;
- the voice: UK spelling, no "!", no em dashes, no capitals labels, no slogan headings;
- the partners' credit rules.

Start from `assets/copy-template.json` (story layout) and fill every TODO. Field meanings are in `references/copy-json.md`. A complete sent example is `references/examples/2026-11-kitchen-edit.copy.json`.

Choose a `theme` that differs from the previous edition (see "Colour themes" below). The user asked for that in November: "change the color scheme, so it is not repeating with the previous one".

### 4. Prepare the images

- **Chapter photos** show the whole room, not a close-up. Close-ups weren't self-explanatory: a cabbage on a worktop said nothing about the kitchen.
  - Story layout: portrait 600 × 750 (4:5), cropped from the largest original. Commerzbank needed 600 × 800 to show the full space.
  - Edit layout: 1200 × 800.
  - Choose the photo that shows the scale of the project (the user swapped Station Road for a wider shot).
- **Header strip**: four close-ups that show the material itself, in different colours. Run `python3 scripts/header_strip.py <edition> <name>-header photo1.jpg@40 photo2.jpg ...`. It writes the 1440 × 840 PNG and `images/hero-strip.jpg`.
- **Swatches**: `python3 scripts/make_swatch.py https://polygood.com/product/<slug>/ images/swatches/<slug>.jpg` crops the official pattern image to 240 × 240. Look at every result. Pale patterns need `--box`. Never crop a swatch from a project photo, because lighting changes the colour.
- **Logos**: PNG, 60 px tall, transparent or matching the background, in `images/logos/`. Set `width` in `copy.json` to the file width divided by 2. Take logos from the firm's own site. If you can't get one cleanly (CBRE's was blocked), leave it out and say so.

### 5. Host the images

Images must sit at public `https://` addresses before the code goes to Mailchimp. Read `references/mailchimp.md` › "Image hosting".

In short, Mailchimp Content Studio is the safe choice: the user uploads `newsletter-images/` and sends the URLs, and you put them into `image_url`, `swatch_url` and the logos' `image_url`. Raw GitHub links pinned to a commit work only while the repository is public. It has been switched back to private twice, which broke every image in sent editions.

For previews before hosting, set `"image_base_url": ""`. The preview then embeds the local files, and the Mailchimp files show `PASTE-…` placeholders.

### 6. Build, look, check

```bash
python3 scripts/build_email.py <edition>/copy.json <edition>
python3 scripts/preview.py <edition>/preview.html <shots-dir>               # desktop + phone screenshots
python3 scripts/preview.py <edition>/preview.html <shots-dir>/nostyle --no-style   # clients that drop <style>
python3 scripts/check_links.py <edition>/mailchimp-code-block.html          # every link and image
python3 scripts/collect_images.py <edition>                                 # numbered folder + zip
```

Run the scripts from the edition's parent folder. Paths are relative to where you run them.

Look at the screenshots yourself before showing them. Check that:
- photos and logos load;
- the intro and story title are centred;
- the chapter-list dots are the accent colour;
- buttons look like buttons;
- nothing is underlined except credit links;
- phones stack in order: photo, "See the project", text, sample card, credits.

`check_links.py` must show every image as 200. Project pages that 404 usually aren't published yet: tell the user which ones.

If you changed `build_email.py`, rebuild the earlier editions too and check `git diff`. Their HTML must not change. Restore any accidental change with `git checkout -- <edition>`.

### 7. Deliver

1. Send the screenshots with the file tool.
2. Paste the full code block.
3. Give the subject lines and preview text.
4. List what is still open in a few bullets: unpublished pages, credits to confirm, logo permissions, hosting.
5. Commit and push the edition folder.

Keep the message short. The user reads it on a phone.

### 8. Iterate

Feedback often arrives as a Mailchimp screenshot with an arrow or a one-line note. Make the change in `copy.json`, or in the generator for layout changes, rebuild, preview, and send the new code. `references/mailchimp.md` maps the usual Mailchimp symptoms to their causes.

When the user says "don't change" or "хотя не меняй", leave it as it is.

## Design the user settled on (story layout)

All of this is already built into `build_email.py`. Keep it unless the user asks otherwise.

- **Intro**: a bold, centred paragraph that explains the idea. Then a dashed line, the story title, and the chapter words in italics, separated by bold accent-colour dots.
- **Each chapter**: a two-column table.
  - Left column: the photo (240 px), with a filled "See the project" button under it.
  - Right column, from the top:
    - the kicker line, in italic sentence case;
    - the client or place name, large and bold, with the partners' logos right-aligned at its edge;
    - the text;
    - one sample card per pattern: swatch, name, code, and an "Order sample" bar;
    - the credits, in small text.
- **Phones**: the columns stack. If a client drops `<style>`, the columns stay side by side, which still reads.
- **The open call**: a tinted box at the end with an italic eyebrow, a heading, two paragraphs about what makers get, and one filled button.
- **Buttons** are filled, so they look clickable.
- **Labels** are never in capitals; use italics.
- **Mailchimp's text styles**: centring, colours, italics and `text-decoration` carry `!important` (`robust()`) so Mailchimp can't override them.
- **The header** is not in the code. It is the PNG strip plus the user's own Mailchimp blocks.

## Colour themes

Each edition gets its own palette from the brand gradients (green, blue, olive, mauve), with white text on buttons at a contrast of at least 4.5:1.

| Edition | accent (buttons) | line (dashes) | caption (italics) | paper | ink | panel / card bar |
|---|---|---|---|---|---|---|
| Oct 2026 (built-in default) | `#1b7f86` teal | teal | `#9a5b34` | `#fff9f4` | `#141414` | `#f4ebe1` |
| Nov 2026 Kitchen Edit | `#2e477e` blue | `#9f9f5d` olive | `#6e6c3a` | `#f6f6fa` | `#1d2c52` | `#efedd8` / `#ecebd6` |
| Suggested: green and mauve | `#1d5c50` | `#a88a80` | `#7a5a51` | `#f4f7f5` | `#102e28` | `#f0e6df` / `#ede2da` |
| Suggested: mauve and green | `#7a564c` | `#8fb0a6` | `#3f6e64` | `#faf6f3` | `#33241f` | `#e8efe9` / `#e3ece6` |

The full green-and-mauve theme is in `assets/copy-template.json`. Show a preview of any new palette before committing to it, and add the edition's palette to this table afterwards.

## Companion pieces the user may ask for

- **Instagram stories**: one opening frame that introduces the new cases and points to the next slide, then one frame per project with credits. The October version is in `polygood-newsletters/2026-10-case-studies/instagram-stories.md`. The same brand rules apply.
- **Project page copy** for polygood.com (`web-pages.md` in October). Make sure the newsletter's links match the slugs.
- **A Notion folder of the images** under the case-studies page:
  1. `notion-create-folder` with the page as parent;
  2. `notion-create-file-upload` for each file, then POST the file to the returned `upload_url` with its headers (`curl -F "file=@name;type=image/jpeg"`);
  3. `notion-update-folder` with `add_files`;
  4. add one line with a link to the folder on the parent page, because page-owned folders don't show in the page body.
