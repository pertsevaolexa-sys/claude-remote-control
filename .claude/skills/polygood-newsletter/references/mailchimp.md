# Getting the email into Mailchimp, and what goes wrong

## How the user assembles the email

1. The header, subject line and preview text are built in Mailchimp itself:
   - a header image block holding the edition's header PNG (1440 × 840, shown at 720 wide);
   - the title as a text block.
2. Under that comes one **Code** block with the whole of `mailchimp-code-block.html`, padding 0, email width 600 px.
3. Mailchimp's own footer stays, because it carries the unsubscribe link.

Paste the full code block into the chat in one fenced `html` block every time it changes, so the user can copy it in one go. Never paste `preview.html` into Mailchimp: it embeds images, is far over Gmail's 102 KB clipping limit, and is only for looking at.

`mailchimp-full-email.html` is for Mailchimp's "Paste in code" (classic builder, Standard plan or higher). It already has `*|MC:SUBJECT|*`, `*|MC_PREVIEW_TEXT|*`, `*|UNSUB|*`, `*|UPDATE_PROFILE|*` and `*|LIST:ADDRESSLINE|*`.

## Image hosting

Email apps can only show images at a public `https://` address.

**Mailchimp Content Studio (preferred).**
1. The user uploads the files from `newsletter-images/` (1 MB limit per file; ours are 3 to 300 KB) and sends the URLs.
2. Put each URL in that image's `image_url`, `swatch_url` or logo `image_url`, then rebuild.
3. These URLs don't depend on anyone's GitHub settings.

**GitHub raw links.**
- `image_base_url` points to `https://raw.githubusercontent.com/<owner>/<repo>/<commit-sha>/polygood-newsletters/<edition>/images`.
- Pin it to a commit SHA, not a branch, so a later push can't change a sent email.
- This works only while the repository is public. `pertsevaolexa-sys/claude-remote-control` has been switched to private twice, and each time every image in the sent editions broke: 404s for every subscriber.
- Use it only when the user confirms the repo stays public, and run `check_links.py` right before handing over code.
- The GitHub integration couldn't create a separate public repository (403 "Resource not accessible by integration").

Whichever you use, run `scripts/check_links.py` on the code block. Any image that isn't `ok 200` is broken in every inbox.

## What Mailchimp's editor does to code, and the fixes in build_email.py

| Symptom the user reports, often as a screenshot | Cause | Fix (already in the generator) |
|---|---|---|
| Centred intro turns left-aligned | Mailchimp's text styles override `text-align` | `align="center"` on the cell, plus `text-align:center !important` (`robust()`) |
| Chapter-list words or kickers turn black | Mailchimp's text colour overrides spans | Each word in its own span, with `color:… !important` |
| Links and buttons underlined | Mailchimp's link style setting | `text-decoration:none !important`. If underlines remain, the user turns off "underline links" in Styles › Links, and the code must be in a Code block, not a Text block |
| Columns stack on desktop, or cards appear twice | `calc()` and `display:none` tricks are stripped by the editor | Plain two-cell tables, no hidden duplicates. A `<style>` media query (`max-width:540px`) stacks `.pg-col` on phones. Where `<style>` is dropped, the two columns stay side by side, which still reads |
| Swatches one per row | `display:inline-block` removed | Table cells |
| Broken image icons everywhere | Images not public: the repo went private, a file wasn't pushed, or there is a placeholder | `check_links.py`, then re-host |
| "[Message clipped]" in Gmail | `preview.html` was pasted, or the code is over 102 KB | Paste `mailchimp-code-block.html` (about 30 KB) |
| Odd characters (`â€™`) | Not UTF-8 | Save and paste as UTF-8 |
| A fix made in Mailchimp disappears | It was rebuilt from copy.json afterwards | Put every change into copy.json, rebuild, and paste again |

Test both screenshots, `preview.py` and `preview.py --no-style`. The second shows clients that drop `<style>`.

## Before the user sends

- Run `check_links.py`. Every image must be 200. Project pages that 404 aren't published yet: name them to the user.
- There are no `PASTE-` placeholders left in the code (the build prints them).
- Credits and logo permissions on the README checklist are confirmed or removed.
- Send a test from Mailchimp to themselves, then open it in Gmail, Outlook on a computer, and on a phone.
- Subject and preview text are set in Mailchimp settings.
- Never send or schedule a campaign yourself. If a Mailchimp connector is available, create a draft at most, and only when asked.
