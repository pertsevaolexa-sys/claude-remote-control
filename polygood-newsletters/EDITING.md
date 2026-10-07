# How to edit the Polygood newsletter

There are six ways to change the newsletter. They differ in how much code you see and in where the master version lives.

**One rule first.** Pick one place where the master version lives and make every change there. If you fix a typo inside Mailchimp (route A) and later rebuild from `copy.json` (route D), the rebuild overwrites the Mailchimp fix. So either copy the fix into `copy.json` too, or stay in Mailchimp for that issue.

## The files

All paths are inside `polygood-newsletters/`.

| File | What it is | Do you edit it? |
|---|---|---|
| `2026-10-case-studies/copy.json` | Every word, link, image address and alt text in the email | Yes: this is the master version for routes D, E and F |
| `build_email.py` | Turns `copy.json` into the HTML. The top section sets colours, fonts and sizes | Only to change the look |
| `2026-10-case-studies/mailchimp-code-block.html` | Everything after the Project Edit header and intro, for a Code block under your header in Mailchimp | Paste it. Edit it only in route A |
| `2026-10-case-studies/mailchimp-hero.html` | The Project Edit header (title, subtitle, photo strip), the dashed line and the intro | Only if the header isn't already built in Mailchimp |
| `2026-10-case-studies/mailchimp-full-email.html` | The whole email (header, body, footer), for Mailchimp's "Paste in code" | Route B |
| `2026-10-case-studies/mailchimp-palettes.html` | Each case's row of pattern swatches on its own | Route C |
| `2026-10-case-studies/preview.html` | The email with the photos built in, to look at in a browser | Never paste this into Mailchimp: it is about 1 MB and Gmail would clip it |
| `2026-10-case-studies/images/` | Case photos (1200 × 800), the header strip `hero-strip.jpg` (720 × 420) and `swatches/` (240 × 240). The code loads them from GitHub (see "Where the pictures live") | Swap them for other photos |
| `2026-10-case-studies/briefs.json` and `build_brief.py` | The selling brief | See "Selling brief" in route D |

## How the email is laid out

From top to bottom:

1. **The Project Edit header** (in Mailchimp, or `mailchimp-hero.html`):
   - "The Polygood® Project Edit" and its subtitle, beside the four-photo strip
   - a teal dashed line
   - the intro ("This autumn, we're back…")
2. **The main code block** (`mailchimp-code-block.html`):
   1. The small teal label "Autumn 2026 · New case studies", the headline "Seven patterns in four cities", the umbrella statement in larger type ("Under each project you'll find its swatches…") and two paragraphs
   2. A teal dashed line
   3. Four cases. Each one has:
      - a photo
      - a teal label with the client and city ("De Bijenkorf · Amsterdam"), a headline and text
      - the application line
      - a "See the … project" button (teal outline), linked to the project page
      - a "Patterns in this project" row of swatches
      - an "Order samples of these patterns" button (filled teal), linked to the samples page
      - a dashed line, except after the last case
   4. A dashed line
   5. The closing paragraph, the "Order samples" button and the sign-off

## Which route?

| You want to… | Use |
|---|---|
| Fix a typo or change a sentence in this issue | A (in Mailchimp) or F (ask Claude) |
| Swap a picture or a link | A for this issue. D if you'll rebuild later: set it once in `copy.json` |
| Change colours or font sizes | A (find and replace) or D (top of `build_email.py`) |
| Add, remove or reorder a case, or change which patterns a case shows | D or F. In route A it is fiddly |
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

Leave `style="…"` alone, unless a recipe below says otherwise. In the header file, also leave the lines with `<!--[if mso]>` alone: they are for Outlook. In text, write `&` as `&amp;`. Straight apostrophes (`'`) are fine.

**Find your way around.** Search for these markers, in this order:
- `Header: The Project Edit` (only in `mailchimp-hero.html` and the full email)
- `Headline and intro`
- `Case: De Bijenkorf`, `Palette: De Bijenkorf`
- `Case: Henriette Stadthotel`, `Palette: Henriette Stadthotel`
- `Case: Orion`, `Palette: Orion`
- `Case: ONE DUST Studio`, `Palette: ONE DUST Studio`
- `Closing and button`

### Recipes for route A

**Change a sentence.** Search for three or four words of it and retype it.

**Change a project link.** Each case has its link twice: on the photo and on the "See the … project" button. Replace both, for example every `https://polygood.com/projects/orion/`.

**Change a button's text.** Search for the words on the button, for example `See the Orion project` or `Order samples of these patterns`, and retype them. The text sits inside `<span …>` and `</span>`. Keep it short (five words at most) so the button stays on one line on a phone. "Order samples of these patterns" appears four times, once per case, so use Replace All if you change it.

**Add or swap an image.**
1. In Mailchimp, open Content Studio, upload the image and copy its URL. Content Studio takes images up to 1 MB. Ours are 10 to 300 KB.
2. Paste the URL over the old address inside `src="…"`. Each address ends in the file name, for example `…/images/orion.jpg` or `…/images/swatches/emerald-ghost.jpg`, so search for that. A swatch appears once for every case that uses it: Emerald Ghost three times, Sapphire Terrazzo twice. So use Replace All on the swatch's address.

Case photos should be 1200 × 800 px (they display at 552 × 368). Swatches should be square, 240 × 240 px.

**Change the samples link.** It is already set to `https://polygood.com/order-samples/`, the most-clicked link in your past campaigns. It appears five times: on the button under each case's swatches and on the closing button. To change it, use Replace All.

**Change a colour.** The first lines of the code list every colour. Use Replace All on the hex code:

| Colour | Used for |
|---|---|
| `#1b7f86` (teal) | The dashed lines, the small labels, the filled buttons, and the border and text of the outline buttons |
| `#9a5b34` (warm brown) | The captions under the swatches (collection and code) |
| `#fff9f4` | The background, also the inside of the outline buttons |
| `#141414` | Headings and text |
| `#ffffff` | The text on the filled buttons |
| `#6b625b` | Small grey text: the application lines and "Patterns in this project" |

If you change the teal, change it in your Mailchimp header's dashed line too.

**Change a font size.** The sizes are in `style`. Change only the number, and go up 2 to 4 px at most so the layout keeps its shape.

| Text | Size |
|---|---|
| Header title (header file only) | `font-size:26px` |
| Header intro (header file only) | `font-size:18px` |
| Headline | `font-size:28px` |
| Umbrella statement | `font-size:20px` |
| Case headlines | `font-size:22px` |
| The two paragraphs under the headline | `font-size:17px` |
| Case text and the closing paragraph | `font-size:16px` |
| Button text | `font-size:15px` |
| Application lines and pattern names under the swatches | `font-size:13px` |

**Change the small label above the headline.** Search for `Autumn 2026 · Four new case studies`.

**Change a headline or the umbrella statement.** Search for a few of its words, for example `lift mannequins` or `Under each project`, and retype it. Case headlines work best at eight words or fewer, without the client's name: the label above already gives it.

**Change a pattern caption.** Search for the pattern's name followed by `</div>`, for example `Emerald Ghost</div>`, and edit the caption just after it (for example `Colourful splash · PS1706`). A pattern appears once for each case that uses it, so change it in each of those cases. Keep captions to the collection and code: never say what a pattern is made from (see "Brand rule" below).

**Remove a case.**
1. Delete from its `<!-- Case: … -->` line down to the line just before the next `<!-- Case:` line. That takes out the case, its buttons, its palette and the dashed line under it.
2. The last case (ONE DUST) works differently, because nothing follows it:
   1. First delete the dashed line at the end of the case above it. That is the line directly above `<!-- Case: ONE DUST Studio -->`.
   2. Then delete from `<!-- Case: ONE DUST Studio -->` down to, but not including, the dashed line directly above `<!-- Closing and button -->`.
3. Then fix every place that names or counts the cases:
   - the label ("Four new case studies")
   - the headline ("four cities")
   - the intro
   - "these four projects use seven patterns" in the closing

**Remove a swatch.** Each swatch is one table cell, from `<td width="33%" valign="top"` to its `</td>`, and each row of the grid holds three cells. Delete the swatch's cell, then put an empty cell in its place so the row still has three:

```
<td width="33%" style="width:33%;padding:0;">&nbsp;</td>
```

**Reorder cases or add a swatch.** It's possible, but easy to break. Use route D or F instead.

**Undo.** The original code is in `mailchimp-code-block.html` in the repository. Paste it back to start over.

---

## Route B: the whole email as HTML ("Paste in code")

Best for: full control of the email, header and footer included, as one HTML file.

1. In Mailchimp, create an email. When it asks for a design, choose to code your own and use **Paste in code**.
   - Mailchimp's help says custom-coded templates are in the classic builder and need a Standard plan or higher.
   - The labels may differ slightly in your account.
2. Paste the whole of `mailchimp-full-email.html` and save.
3. Set the subject and the preview text in the email settings. The file already contains:
   - `*|MC:SUBJECT|*` and `*|MC_PREVIEW_TEXT|*`, which Mailchimp fills in
   - the unsubscribe link (`*|UNSUB|*`), the preferences link (`*|UPDATE_PROFILE|*`) and your postal address (`*|LIST:ADDRESSLINE|*`), which Mailchimp requires
4. The pictures and links are already in. Edit with the same recipes as route A, in the code editor.

Trade-off: you control everything, but Mailchimp's drag-and-drop editing is off for this email.

---

## Route C: rebuild it in Mailchimp's own blocks (no code to edit later)

Best for: issues that teammates will edit in Mailchimp without touching HTML.

1. Keep the Project Edit header you built. Set the email background to `#fff9f4`, 600 px wide.
2. Label and headline: a Text block with "Autumn 2026 · New case studies" in teal `#1b7f86`, small capitals. Then a Heading block, "Seven patterns in four cities", in a bold sans-serif, colour `#141414`, about 28 px. Then a Text block with the umbrella statement at about 20 px, and one for the two paragraphs.
3. A Divider block: 2 px, dashed, teal `#1b7f86`. Use the same divider between every section.
4. For each case:
   - an Image block with the photo, linked to the project page
   - a Text block with:
     - the label (client · city) in teal, small capitals
     - the headline in bold
     - the text
     - the application line in `#6b625b`
   - a Button block "See the … project", linked to the project page: outline style, border and text teal `#1b7f86`, background `#fff9f4`
   - a Code block for the swatches and their "Order samples of these patterns" button: in `mailchimp-palettes.html`, find that case's section (it starts with `===== Case name`) and paste it in
5. Closing: a Text block, then a Button block "Order samples" in teal `#1b7f86`, linked to the same page.

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
3. Open `preview.html` in a browser to check it. Each picture comes from its `image_url` or `swatch_url` if filled. Otherwise it comes from the local file named in `image_file` (in `images/`) or `file` (in `images/swatches/`). If neither is found, you see a grey box with the name. That usually means the file name is misspelled (capitals, and `.jpg` vs `.jpeg`, matter) or the file is in the wrong folder.
   The Mailchimp files get each picture from `image_url` or `swatch_url` if filled, otherwise from `image_base_url` plus the file name. A new photo must be pushed to GitHub (or put in Content Studio) before it shows in Mailchimp; see "Where the pictures live".
4. Paste the new `mailchimp-code-block.html` into the Code block in Mailchimp, replacing the old code.

### What each field in `copy.json` controls

| Field | Where it shows |
|---|---|
| `subject_lines`, `preview_text` | Not in the email. Copy them into Mailchimp's settings. The first subject shows on the preview page |
| `hero` | The Project Edit header: `title`, `subtitle`, `intro`, and the photo strip (`image_url`, `image_file`, `image_alt`). Used in `mailchimp-hero.html`, the full email and the preview |
| `eyebrow` | The small teal label above the headline |
| `headline` | The umbrella headline ("Seven patterns in four cities") |
| `umbrella_statement` | The one sentence under it, in larger type. Leave it empty (`""`) to drop it |
| `intro` | The two paragraphs under the statement |
| `cases` | One block per case, in this order. See the next table |
| `palette_label` | The small heading over each swatch row ("Patterns in this project") |
| `palette_cta` | The button under each swatch row ("Order samples of these patterns") |
| `patterns` | The pattern library. Each has `name`, `caption` (the line under the swatch: collection and code), `swatch_url` (leave empty to use the hosted copy, or paste a Content Studio link), `file` (the swatch in `images/swatches/`) and `id` (the Polygood pattern ID, not shown) |
| `closing`, `cta_label` | Last paragraph and the closing button's text |
| `samples_url` | Where the closing button and the button under each swatch row go (set to polygood.com/order-samples/) |
| `image_base_url` | The public folder the pictures load from. Each picture's address is this plus its file name (swatches add `/swatches/`). See "Where the pictures live" |
| `signoff` | Last lines |

Each case has these fields:

| Case field | What it is |
|---|---|
| `key` | A short unique name with no spaces, for example `paris-showroom`. Used only to match the preview photo |
| `kicker` | Small teal label above the headline: the client and city, for example "Henriette Stadthotel · Vienna" |
| `title` | The client's name. Not shown in the email: it names the case in the code's markers (`Case: Orion`) and in the placeholders |
| `headline` | The bold line above the text. Without one, the email shows `title` there instead |
| `body` | The text |
| `pattern` | The patterns this case shows as swatches, separated by commas. Each name must match a `name` in `patterns` exactly |
| `application` | The grey "Application:" line |
| `link_label`, `page_url` | The text on the outline button and the project page it opens (the photo links there too) |
| `image_url` | Leave empty to use the hosted copy, or paste a Content Studio link to use that instead |
| `image_file` | The photo's file name in `images/` |
| `image_alt` | What the photo shows, for screen readers and blocked images |

**Where the pictures live.** Email apps can only show a picture that sits at a public `https://` address. This issue's photos and swatches are in the public GitHub repository, and `image_base_url` points at them, pinned to one commit so the files can't change under a sent email:

```
https://raw.githubusercontent.com/pertsevaolexa-sys/claude-remote-control/428bdaf…/polygood-newsletters/2026-10-case-studies/images
```

That works as long as the repository stays public and the branch `claude/wizardly-mccarthy-9h1wct` (or a merge of it) stays on GitHub. If either might change, move the pictures to Mailchimp's Content Studio: upload them, paste each link into that picture's `image_url` or `swatch_url`, and rebuild. A filled `image_url` or `swatch_url` always wins over `image_base_url`.

To add a new picture: put it in `images/` (or `images/swatches/`), commit and push it, then set `image_base_url` to the new commit (replace the long code after `claude-remote-control/`), or ask Claude to do it. A picture that isn't pushed yet shows in `preview.html` but appears broken in Mailchimp.

### JSON rules

- Text sits between double quotes. Inside text, write a double quote as `\"`. Straight apostrophes are fine.
- Type `&`, `<` and `>` as they are: the script converts them. (Don't use `&amp;` here. That's only for route A.)
- `\n\n` starts a new paragraph, and `\n` a new line (the sign-off uses it).
- Every `{ … }` block in a list is followed by a comma, except the last one before `]`.
- **When the script stops with an error**, nothing is rebuilt until you fix it. Read the last line of the error:
  - `Expecting ',' delimiter: line 40 column 3`: look at the end of the line just above line 40 for a missing comma, or at line 40 for a missing or extra quote.
  - `Illegal trailing comma` or `Expecting value`: there is a comma too many, usually after the last block before `]` or `}`.

### Common changes

- **Add a case.**
  1. Copy one `{ … }` block inside `cases`.
  2. Give it a new `key`, then change all the text and links.
  3. Put its photo in `images/` and write that exact file name in `image_file`.
  4. List its patterns in `pattern`. If a pattern is new, add it to `patterns` with its swatch in `images/swatches/`.
  5. Check the commas.
- **Remove a case.**
  1. Delete its `{ … }` block, then check the commas:
     - If you deleted the last case, remove the comma after the new last block.
     - If you deleted the first case, remove the comma left at the top.
  2. Then update everything that names or counts the cases: `eyebrow`, `headline`, `umbrella_statement` (if it names a pattern from that case), `intro`, the pattern count in `closing`, `subject_lines` and `preview_text`.
- **Reorder cases:** move whole `{ … }` blocks, then check the commas the same way. The dashed lines between cases sort themselves out.
- **Change which swatches a case shows:** edit its `pattern` field.
- **Change a pattern's caption:** edit its `caption` in `patterns`. It changes under every case that uses it. Leave it empty (`""`) to show the name alone.
- **Change the look:** edit the section at the top of `build_email.py`:
  - colours: `PAPER`, `INK`, `MUTED`, `TEAL`, `WARM`, `WHITE`
  - font: `SANS`
  - sizes: `HERO_TITLE_SIZE`, `HEADLINE_SIZE`, `STATEMENT_SIZE` (the umbrella statement), `TITLE_SIZE` (case headlines), `BODY_SIZE`, `HERO_TEXT_COL` (width of the header's text column), `COLUMNS` (swatches per row, now 3), `SWATCH` (largest swatch size)
- **Start the next newsletter.**
  1. Copy the folder `2026-10-case-studies` and give the copy a new name with no spaces, for example `2026-11-showrooms`.
  2. Change its `copy.json` and `images/`.
  3. Run the build with the new name in both places. The first tells the script where to read and the second where to write:
     ```
     python3 build_email.py 2026-11-showrooms/copy.json 2026-11-showrooms
     ```
     If you change only the first name, the script overwrites the October files.
- **Selling brief.** Edit `briefs.json`, then run:
  ```
  python3 build_brief.py 2026-10-case-studies/briefs.json 2026-10-case-studies/selling-brief.md
  ```
  Each brief's `id` starts with a letter that puts it in a section: `x` across the newsletter, `b` De Bijenkorf, `h` Henriette, `o` Orion, `d` ONE DUST. A brief with any other letter is left out without warning. The section names and the title are set at the top of `build_brief.py`, so change them there for a new issue (or ask Claude).

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

- "Change the headline to …" or "Give me three other umbrella statements"
- "Take Orion out and add the Polygood Paris showroom"
- "Here are the Content Studio links for the photos: …"
- "Add this photo to the Orion case" (Claude pushes it and updates the address)
- "Make the teal darker" or "switch to a winter palette"
- "Write the November issue from these three PDFs in the same design"

If Mailchimp is connected to Zapier (the link was shared earlier in the chat), Claude can also create the draft campaign in Mailchimp. It won't send or schedule anything unless you say so.

---

## Brand rule: premium wording

Polygood is a premium material. The email never names or hints at what the plastic was before: no fridges, CD cases, spools, cutlery, appliances or electronics, and no "old", "waste", "used to be", "first life" or "made from". Talk about colour, pattern, finish, the designers and the spaces. The swatch captions give the collection and code, which is what a specifier needs to order a sample. The selling brief's "Don't" lines repeat this for sales calls.

## Before you send

1. Search the code for `PASTE-`. Nothing should come up.
2. In Mailchimp, preview the email, then send a test to yourself.
3. Open the test:
   - in Gmail
   - in Outlook on a computer
   - on a phone

   Each case's swatches should sit three to a row on a computer and on a phone. ONE DUST's five make a row of three and a row of two.
4. Click every link. Three project pages (Henriette, Orion, ONE DUST) only work once they're published on polygood.com.
5. Check the subject line and preview text in Mailchimp's settings.

## If something looks wrong

| You see | Likely cause and fix |
|---|---|
| A broken-image icon | The `src` is still a placeholder, the picture was never pushed to GitHub, or the address isn't public (it must start with `https://`). Open the address in a browser: if it doesn't show the picture, upload it to Content Studio and use that link |
| A button shows as plain underlined text | The code was pasted into a Text block instead of a Code block. Delete it and paste it into a Code block |
| The header's title and photos sit one above the other on a computer | Your email app doesn't support the trick that puts them side by side. The email still reads well. If it happens in Gmail or Apple Mail, tell Claude |
| Swatches stack one per row | An older copy of the code is in the block. The earlier version placed swatches side by side with `display:inline-block`, which Mailchimp's builder removes. Paste the current `mailchimp-code-block.html`: it uses table cells, which Mailchimp keeps |
| "[Message clipped]" in Gmail | The email is over 102 KB. Usually this means `preview.html` was pasted instead of `mailchimp-code-block.html` |
| Odd characters such as `â€™` | The file was saved in a format other than UTF-8. Save it as UTF-8 and paste again |
| A Mailchimp edit disappeared | You rebuilt from `copy.json` (route D) after editing in Mailchimp (route A). Put the edit into `copy.json` and rebuild |
