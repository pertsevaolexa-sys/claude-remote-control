# How to edit the Polygood newsletter

There are six ways to change the newsletter. They differ in how much code you see and in where the master version lives.

**One rule first.** Pick one place where the master version lives and make every change there. If you fix a typo inside Mailchimp (route A) and later rebuild from `copy.json` (route D), the rebuild overwrites the Mailchimp fix. So either copy the fix into `copy.json` too, or stay in Mailchimp for that issue.

## The files

All paths are inside `polygood-newsletters/`.

| File | What it is | Do you edit it? |
|---|---|---|
| `2026-10-case-studies/copy.json` | Every word, link, image address and alt text in the email | Yes: this is the master version for routes D, E and F |
| `build_email.py` | Turns `copy.json` into the HTML. The top section sets colours, fonts and sizes | Only to change the look |
| `2026-10-case-studies/mailchimp-code-block.html` | The email body, for a Code block in Mailchimp | Paste it. Edit it only in route A |
| `2026-10-case-studies/mailchimp-full-email.html` | The whole email with footer, for Mailchimp's "Paste in code" | Route B |
| `2026-10-case-studies/mailchimp-patterns-block.html` | The patterns grid on its own | Route C |
| `2026-10-case-studies/preview.html` | The email with the photos built in, to look at in a browser | Never paste this into Mailchimp: it is about 850 KB and Gmail would clip it |
| `2026-10-case-studies/images/` | Case photos (1200 × 800) and `swatches/` (240 × 240) | Swap them for other photos |
| `2026-10-case-studies/briefs.json` and `build_brief.py` | The selling brief | Same way as `copy.json` |

## Which route?

| You want to… | Use |
|---|---|
| Fix a typo or change a sentence in this issue | A (in Mailchimp) or F (ask Claude) |
| Put in the image links and the samples link | A for this issue. D if you'll rebuild later: set them once in `copy.json` |
| Change colours or font sizes | A (find and replace) or D (top of `build_email.py`) |
| Add, remove or reorder a case or a pattern | D or F. In route A it is fiddly |
| Start the next newsletter from this one | D: copy the folder, edit, rebuild |
| Let teammates edit without seeing code | C (rebuild in Mailchimp's own blocks) |
| Control the whole email, footer included, as one HTML file | B |
| Not touch anything technical | F |

---

## Route A: edit inside Mailchimp's Code block

Best for: small changes to this issue, straight in Mailchimp.

1. Open the email in Mailchimp's builder and click the Code block. The code editor opens in the side panel.
2. Make the change and save.
3. Preview, then send yourself a test (see "Before you send").

For anything bigger than one word, use a text editor. Copy the whole block into a plain-text editor: VS Code, Sublime Text, Notepad, or TextEdit in plain-text mode (Format › Make Plain Text). Use its Find and Replace, then paste everything back. Don't use Word or Google Docs: they add hidden formatting that breaks the code.

**What you can safely change:**
- text between `>` and `<`
- links in `href="…"`
- image addresses in `src="…"`
- image descriptions in `alt="…"`

Leave `style="…"` and any line with `<!--[if mso]>` alone, unless a recipe below says otherwise. In text, write `&` as `&amp;`. Straight apostrophes (`'`) are fine.

**Find your way around.** The code is marked in order: `Headline and intro`, `Case: De Bijenkorf`, `Case: Henriette Stadthotel`, `Case: Orion`, `Case: ONE DUST Studio`, `Patterns in this issue`, `Closing and button`. Search for those words.

### Recipes for route A

**Change a sentence.** Search for three or four words of it and retype it.

**Change a project link.** Each case has its link twice: on the photo and on "See the … project". Replace both, for example every `https://polygood.com/projects/orion/`.

**Add or swap an image.**
1. In Mailchimp, open Content Studio, upload the image and copy its URL. Content Studio takes images up to 1 MB. Ours are 10 to 300 KB.
2. Paste the URL over the matching `PASTE-…-URL-HERE`, or over the old address, inside `src="…"`.

Case photos should be 1200 × 800 px (they display at 552 × 368). Swatches should be square, 240 × 240 px.

**Add the samples link.** Replace `PASTE-ORDER-SAMPLES-URL-HERE`. It appears twice: in the grid tile and in the button.

**Change a colour.** The first lines of the code list every colour. Use Replace All on the hex code. For example, `#9a3f22` (rust) colours the top band, labels, links, button and samples tile at once. `#fbf5ec` is both the background and the text colour on rust, so changing it changes both.

**Change a font size.** The sizes are in `style`:

| Text | Size |
|---|---|
| Headline | `font-size:34px` |
| Case titles and the patterns heading | `font-size:24px` |
| Intro | `font-size:17px` |
| Body | `font-size:16px` |

Change only the number.

**Change the band text.** Search for `Autumn 2026 · Four new case studies`.

**Change a pattern caption.** Search for the words, for example `Made from plastic spools`.

**Remove a case.**
1. Delete from its `<!-- Case: … -->` line down to, but not including, the next `<!-- Case:` line.
2. Each case except the last ends with a thin divider. If you delete the last case (ONE DUST), also delete the divider row at the end of the case above it: the `<tr>` that contains `height="1"` just before `<!-- Case: ONE DUST Studio -->`.
3. Then fix the intro and pattern tiles that mention the removed case.

**Reorder cases or remove a pattern tile.** It's possible, but the dividers and the Outlook grid code make it easy to break. Use route D or F instead.

**Undo.** The original code is in `mailchimp-code-block.html` in the repository. Paste it back to start over.

---

## Route B: the whole email as HTML ("Paste in code")

Best for: full control of the email, footer included, as one HTML file.

1. In Mailchimp, create an email. When it asks for a design, choose to code your own and use **Paste in code**.
   - Mailchimp's help says custom-coded templates are in the classic builder and need a Standard plan or higher.
   - The labels may differ slightly in your account.
2. Paste the whole of `mailchimp-full-email.html` and save.
3. Set the subject and the preview text in the email settings. The file already contains:
   - `*|MC:SUBJECT|*` and `*|MC_PREVIEW_TEXT|*`, which Mailchimp fills in
   - the unsubscribe link (`*|UNSUB|*`), the preferences link (`*|UPDATE_PROFILE|*`) and your postal address (`*|LIST:ADDRESSLINE|*`), which Mailchimp requires
4. Add the image links as in route A. Edit with the same recipes, in the code editor.

Trade-off: you control everything, but Mailchimp's drag-and-drop editing is off for this email.

---

## Route C: rebuild it in Mailchimp's own blocks (no code to edit later)

Best for: issues that teammates will edit in Mailchimp without touching HTML.

1. Start from a plain one-column layout, 600 px wide, background `#fbf5ec`.
2. Top band: a Text block on background `#9a3f22`, white or `#fbf5ec` text, small capitals: "Autumn 2026 · Four new case studies".
3. Headline: a Heading block in Georgia, colour `#2b1d15`, about 34 px. Intro: a Paragraph or Text block.
4. For each case:
   - an Image block with the photo, linked to the project page
   - a Text block with the label (rust `#9a3f22`, small capitals), the title (Georgia), the body, the pattern line in `#7a6455`, and the "See the … project" link
5. Patterns grid: Mailchimp's blocks can't lay out tiles like this. Add a Code block and paste `mailchimp-patterns-block.html`.
6. Closing: a Text block, then a Button block "Request a sample" in `#9a3f22`.

Trade-off: easy for anyone to edit afterwards, but spacing and fonts will be close to the design, not identical, especially in Outlook.

---

## Route D: edit `copy.json` and rebuild

Best for: bigger changes, reusing the design for the next newsletter, keeping one clean master version.

### One-time setup

1. **Get the files.** On GitHub, open `pertsevaolexa-sys/claude-remote-control`, switch to the branch `claude/wizardly-mccarthy-9h1wct`, then use **Code › Download ZIP** and unzip. Or clone it with git.
2. **Install Python 3.**
   - Mac: open Terminal and type `python3 --version`. If you see a version number, you have it. If not, install it from python.org.
   - Windows: install from python.org and tick "Add python.exe to PATH". Then use `py` wherever this guide says `python3`.
   - Nothing else needs installing.
3. **Get a code editor** (optional but helpful). VS Code is free and colours the JSON, so mistakes stand out.

### Every time

1. Open `polygood-newsletters/2026-10-case-studies/copy.json`, edit and save.
2. Open Terminal (or Command Prompt) in the `polygood-newsletters` folder and run:
   ```
   python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies
   ```
   It prints the word count and any `PASTE-…` placeholders you still need to fill.
3. Open `preview.html` in a browser to check it.
4. Paste the new `mailchimp-code-block.html` into the Code block in Mailchimp, replacing the old code.

### What each field in `copy.json` controls

| Field | Where it shows |
|---|---|
| `subject_lines`, `preview_text` | Not in the email. Copy them into Mailchimp's settings. The first subject shows on the preview page |
| `eyebrow` | Text in the rust band at the top |
| `headline`, `intro` | Big headline and opening paragraphs |
| `cases` | One block per case, in this order. Each has `kicker` (small rust label), `title`, `body`, `pattern`, `application`, `link_label`, `page_url`, `image_url` (Content Studio link), `image_file` (local photo for the preview) and `image_alt` |
| `patterns_eyebrow`, `patterns_heading`, `patterns_intro` | Top of the patterns block |
| `patterns` | One tile each, in this order: `name`, `used` (projects), `from` (shown as "Made from …"), `swatch_url` (Content Studio link), `file` (local swatch for the preview) |
| `tile_heading`, `tile_link` | The rust samples tile at the end of the grid |
| `closing`, `cta_label` | Last paragraph and the button text |
| `samples_url` | Where the tile and the button link to |
| `signoff` | Last lines |

**Fill the links once.** Put the Content Studio URLs into `image_url` and `swatch_url`, and the samples page into `samples_url`. Every rebuild after that comes out finished, with no placeholders.

### JSON rules

- Text sits between double quotes. Inside text, write a double quote as `\"`. Straight apostrophes are fine.
- `\n\n` starts a new paragraph, and `\n` a new line (the sign-off uses it).
- Put a comma after every item except the last in a list or block.
- If the script stops with something like `Expecting ',' delimiter: line 40 column 3`, look at that line for a missing comma or quote.

### Common changes

- **Add a case:** copy one `{ … }` block inside `cases`, give it a new `key` and new text, and put its photo in `images/`.
- **Remove a case:** delete its block and the comma before it.
- **Reorder cases:** move whole blocks around.
- **Patterns:** they work the same way. The grid reflows on its own: four per row, with the samples tile always last.
- **Change the look:** edit the section at the top of `build_email.py`:
  - colours: `PAPER`, `PANEL`, `INK`, `MUTED`, `RULE`, `RUST`, `CREAM`, `STRIPE`
  - fonts: `SANS`, `SERIF`
  - sizes: `HEADLINE_SIZE`, `TITLE_SIZE`, `BODY_SIZE`, `TILE`
- **Start the next newsletter:** copy the folder `2026-10-case-studies` to a new name, for example `2026-11-…`. Change its `copy.json` and `images/`, then run the same command with the new folder name, twice:
  ```
  python3 build_email.py 2026-11-…/copy.json 2026-11-…
  ```
- **Selling brief:** edit `briefs.json`, then run:
  ```
  python3 build_brief.py 2026-10-case-studies/briefs.json 2026-10-case-studies/selling-brief.md
  ```

---

## Route E: edit on GitHub in the browser

Best for: changing words without installing anything.

1. On github.com, open the repository, switch to the branch `claude/wizardly-mccarthy-9h1wct` and open `polygood-newsletters/2026-10-case-studies/copy.json`.
2. Click the pencil icon, edit, then click **Commit changes**.
3. GitHub doesn't run the build itself. Rebuild with route D on your computer, or ask Claude to rebuild (route F).
4. To copy any HTML file from GitHub, open it and click **Raw** or the copy button.

---

## Route F: ask Claude

Best for: anything, with no setup. Describe the change in plain words. Claude edits `copy.json`, rebuilds, checks the preview, pushes the change and sends you the new code. For example:

- "Change the headline to …"
- "Take Orion out and add the Polygood Paris showroom"
- "Here are the Content Studio links for the photos: …"
- "Make the rust darker" or "switch to a winter palette"
- "Write the November issue from these three PDFs in the same design"

If Mailchimp is connected to Zapier (the link was shared earlier in the chat), Claude can also create the draft campaign in Mailchimp. It won't send or schedule anything unless you say so.

---

## Before you send

1. Search the code for `PASTE-`. Nothing should come up.
2. In Mailchimp, preview the email, then send a test to yourself.
3. Open the test:
   - in Gmail
   - in Outlook on a computer
   - on a phone

   The patterns grid should show four across on a computer and two across on a phone.
4. Click every link. Three project pages (Henriette, Orion, ONE DUST) only work once they're published on polygood.com.
5. Check the subject line and preview text in Mailchimp's settings.

## If something looks wrong

| You see | Likely cause and fix |
|---|---|
| A broken-image icon | The `src` is still a placeholder, or the address isn't public. It must start with `https://`. Use the Content Studio URL |
| The grid shows three across on a computer | The Code block has padding. Set it to 0. Or in route D, lower `TILE` to 112 and rebuild |
| The grid stacks one tile per row in Outlook only | Mailchimp may have removed the Outlook-only lines (`<!--[if mso]>`). This hasn't been tested yet. The email still works. For a tidy grid in Outlook, ask Claude for a table-based version of the grid |
| "[Message clipped]" in Gmail | The email is over 102 KB. Usually this means `preview.html` was pasted instead of `mailchimp-code-block.html` |
| Odd characters such as `â€™` | The file was saved in a format other than UTF-8. Save it as UTF-8 and paste again |
| A Mailchimp edit disappeared | You rebuilt from `copy.json` (route D) after editing in Mailchimp (route A). Put the edit into `copy.json` and rebuild |
