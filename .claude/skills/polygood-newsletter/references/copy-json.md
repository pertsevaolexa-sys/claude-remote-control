# copy.json: every field

`scripts/build_email.py` reads one `copy.json` per edition and writes the HTML. Words, links and image names live in this file; the look lives in `theme`. Two complete, sent examples are in `examples/`:

- `2026-11-kitchen-edit.copy.json`: `"layout": "story"`, the current default
- `2026-10-project-edit.copy.json`: `"layout": "edit"`

Unknown keys are ignored, so notes can live in keys that start with `_`.

## Top level

| Field | Used for |
|---|---|
| `layout` | `"story"`: chapters with the photo beside the text. `"edit"`: big photos with centred headlines. Missing: the first, older layout with an umbrella headline |
| `header_in_mailchimp` | `true` when the user builds the header, subject and preview as Mailchimp blocks. The code block then starts at the bold intro, and the preview leaves the header out |
| `subject_lines`, `preview_text` | Not shown in the email. Give them to the user for Mailchimp settings |
| `hero.title`, `hero.subtitle` | The header ("The Polygood® Kitchen Edit"). Only used when the header is in code |
| `hero.intro` | The bold, centred intro at the top of the body: two sentences that explain the edition's idea |
| `hero.image_file`, `hero.image_url`, `hero.image_alt` | The header strip, `images/hero-strip.jpg` (720 × 420) |
| `story_header.title` | The story layout's title under the intro ("The life of a worktop"). The chapter list under it is built from each case's `toc` |
| `cases` | The projects, in order. See below |
| `patterns` | The pattern library for this edition. See below |
| `partner` | The open-call box at the end: `eyebrow` (italic line), `heading`, `body` (`\n\n` between paragraphs), `button_label`, `button_url` |
| `closing_cta` | `{text, url}`: a closing link line. Set `text` to `""` to drop it |
| `intro_button` | `{label, url}`: an optional filled button under the intro |
| `proof` | An optional boxed list under the intro: `heading`, `items` [{`title`, `text`}], `note` |
| `swatch_cta` | Text on each sample bar ("Order sample") |
| `swatch_links`, `swatch_buttons` | `true` in both editions: swatches and names link to `pattern_url` |
| `palette_label`, `palette_label_one`, `palette_cta`, `palette_cta_one` | Labels for the edit and old layouts' swatch rows |
| `samples_url` | https://polygood.com/order-samples/ (used by the older layouts) |
| `chooser` | Keep `{"enabled": false}`. The sample-chooser page is retired |
| `image_base_url` | The public folder the images load from. See "Images" below |
| `theme` | Colours. See below |
| `eyebrow`, `headline`, `umbrella_statement`, `intro`, `closing`, `cta_label`, `signoff` | The old layout only. Keep them filled (the build counts words in `intro` and `closing`) |

## Each case

| Field | Story layout | Edit layout |
|---|---|---|
| `key` | Short unique id, no spaces | same |
| `title` | Names the case in code comments and placeholders | same |
| `place_title` | The large name beside the logos: "Maison Kyka, Paris" | Name and city under the photo |
| `kicker_line` | The italic line above the name, in sentence case: "Shaped in the workshop" | |
| `toc` | One or two words for the chapter list under the story title: "Shaped" | |
| `chapter`, `headline`, `sector`, `kicker` | Fallbacks. Keep them filled | `headline` is the centred line over the photo, and `sector` the small label |
| `body` | The chapter text (`\n\n` for a new paragraph) | same |
| `pattern` | Pattern names, separated by commas, exactly as in `patterns[].name`. Each one gets a sample card | Swatch row |
| `application` | Not shown | "Application: …" line |
| `link_label`, `page_url` | "See the project" and the project page. The photo links there too | same |
| `image_file`, `image_url`, `image_alt` | Photo, 600 × 750 portrait, shown 240 px wide | 1200 × 800, shown 552 px wide |
| `logos` | [{`file`, `alt`, `width`, `url`, `image_url`}]. `file` sits in `images/logos/`, a PNG 60 px tall. `width` is the logo's width when it is 30 px tall (the file width divided by 2). They show 22 px tall at the right of the name | A row under the photo |
| `credits` | [{`role`, `name`, `url`}]. Small text at the end of the chapter. `url` links the name | Under the text |
| `story` | Optional labelled steps [{`label`, `text`}] | same |
| `note` | Optional centred line after the case: {`before`, `link_text`, `url`, `after`} | same |

## Each pattern

| Field | Use |
|---|---|
| `name` | As polygood.com writes it: "Terrazzo Nuovo" |
| `caption` | The code, "#PS1901". The October edition used "Colourful Splash Collection · PS2121" style in the old layout |
| `pattern_url` | https://polygood.com/product/<slug>/. Check that it returns 200 |
| `file` | The swatch in `images/swatches/`, 240 × 240 |
| `swatch_url` | A direct link, which wins over `image_base_url` (for example a Mailchimp Content Studio URL) |
| `id` | The pattern code without "#" (not shown) |

## Images

Each image's address is chosen in this order:

1. its own `image_url` or `swatch_url`, or the logo's `image_url`;
2. otherwise `image_base_url` plus the file name (`/swatches/` or `/logos/` are added for those);
3. otherwise the Mailchimp files get `PASTE-…-URL-HERE` placeholders, and the build lists them.

`preview.html` uses a hosted address when there is one. Otherwise it embeds the local file, so with `image_base_url: ""` you can preview before anything is hosted.

## theme

Colour keys:

| Key | What it colours |
|---|---|
| `paper` | Email background |
| `outer` | Page around the email (preview and full email) |
| `ink` | Text and headings |
| `muted` | Credits and small text |
| `accent` | Buttons, the "Order sample" text and the dots in the chapter list |
| `line` | Dashed lines |
| `caption` | Italic kicker lines, chapter list words and pattern codes |
| `panel` | Open-call box |
| `card_border`, `card_bg`, `card_bar` | Sample card |
| `box` | Background of the `proof` box |
| `note` | Grey note above the preview |
| `button_text` | Text on filled buttons, white by default |

Leave `theme` out to get the October colours: teal on warm off-white.
