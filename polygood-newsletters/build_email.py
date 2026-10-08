"""Render the newsletter copy (JSON) into Mailchimp-ready HTML and a preview page.

usage: python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies

Writes seven files into the output folder:
  mailchimp-code-block.html  everything after the header and intro: paste into a Code block
                             under the Project Edit header you built in Mailchimp
  mailchimp-hero.html        the Project Edit header, dashed line and intro, if you want those in code too
  mailchimp-full-email.html  the whole email (header + body + footer), for Mailchimp's "Paste in code"
  mailchimp-palettes.html    each case's swatch row alone, for an email built from Mailchimp's own blocks
  preview.html               the whole email to check in a browser, with the same hosted pictures as Mailchimp
  sample-chooser.html        the "choose a sample" page the sample buttons open: one section per project,
                             each sample linking to its pattern page on polygood.com
  sample-chooser-wordpress.html  the same page as one block to paste into a WordPress Custom HTML block
  sample-menu/index.html     the pop-up style sample menu, published as a Claude artifact (with sample-menu/swatches/)

Words, links and images live in copy.json. The look (colours, fonts, sizes) is set below.
Images: an image_url or swatch_url wins; otherwise image_base_url + the file name is used
(swatches from image_base_url + "/swatches/"). With neither, the code gets a PASTE-...-URL-HERE
placeholder. An empty samples_url becomes a placeholder too.
Sample links: each case's "Order samples" button opens chooser.url at that case's section
(#de-bijenkorf, #henriette-stadthotel, ...). Each swatch links to its pattern_url, or to the
chooser section when a pattern has no pattern_url yet.
"""
import base64
import html
import json
import sys
from pathlib import Path

copy = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])

# ---- Look: change these to restyle the whole email -------------------------
SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"

PAPER = "#fff9f4"   # email background (warm off-white, as in the Project Edit header)
INK = "#141414"     # headings and text
MUTED = "#6b625b"   # small grey-brown text
TEAL = "#1b7f86"    # dashed lines, labels, links, buttons
WARM = "#9a5b34"    # the short caption under each swatch name
WHITE = "#ffffff"   # text on the filled buttons

HERO_TITLE_SIZE = 26
HEADLINE_SIZE = 28
STATEMENT_SIZE = 20
TITLE_SIZE = 22
EDIT_HEADLINE_SIZE = 26  # the centred headline over each photo in the Project Edit layout
BODY_SIZE = 16
HERO_TEXT_COL = 240  # header: text column width; the photo strip takes the rest of the 600px
COLUMNS = 3   # swatches per row; a case with more patterns continues on the next row
SWATCH = 160  # largest swatch size in px (on a computer); on a phone they shrink to fit
CONTENT = 552  # width of the case photos (600 minus 24px padding each side)
# -----------------------------------------------------------------------------


def esc(s):
    """Escape text content; apostrophes stay readable for editing in Mailchimp."""
    return html.escape(s, quote=False)


def attr(s):
    return html.escape(s, quote=True)


def slug(name):
    return name.upper().replace(" ", "-")


def url_or_placeholder(value, name):
    return value.strip() if value and value.strip() else f"PASTE-{name}-URL-HERE"


SAMPLES_URL = url_or_placeholder(copy.get("samples_url"), "ORDER-SAMPLES")
CHOOSER = copy.get("chooser", {})
CHOOSER_URL = url_or_placeholder(CHOOSER.get("url"), "SAMPLE-CHOOSER")


def anchor(c):
    """The id of a case's section on the chooser page, e.g. one-dust-studio."""
    return slug(c["title"]).lower()


def chooser_link(c=None):
    return CHOOSER_URL + (f"#{anchor(c)}" if c else "")


def pattern_link(p, c=None):
    """A pattern's own page on polygood.com, or the chooser section until that page is known."""
    url = (p.get("pattern_url") or "").strip()
    return url or chooser_link(c)
IMAGE_BASE = (copy.get("image_base_url") or "").strip().rstrip("/")


def hosted(url, file, sub=""):
    """The image's own URL if set, else the hosted copy under image_base_url, else nothing."""
    if url and url.strip():
        return url.strip()
    if IMAGE_BASE and file:
        return f"{IMAGE_BASE}/{sub}{file}"
    return ""


def paras(text, size=BODY_SIZE, color=INK, margin=16):
    blocks = [p.strip() for p in text.split("\n\n") if p.strip()]
    return "".join(
        f'<p style="margin:0 0 {margin}px 0;font-family:{SANS};font-size:{size}px;line-height:1.55;color:{color};">'
        f"{esc(p).replace(chr(10), '<br>')}</p>"
        for p in blocks
    )


def label(text, color=TEAL, pad="0 0 8px 0"):
    return (
        f'<tr><td style="padding:{pad};font-family:{SANS};font-size:12px;line-height:1.4;'
        f'letter-spacing:0.08em;text-transform:uppercase;font-weight:bold;color:{color};">{esc(text)}</td></tr>'
    )


def dashed(pad="0 0 32px 0"):
    """The teal dashed line from the Project Edit header, used between every section."""
    return (
        f'<tr><td style="padding:{pad};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td style="border-top:2px dashed {TEAL};font-size:1px;line-height:1px;mso-line-height-rule:exactly;">&nbsp;</td>'
        f"</tr></table></td></tr>"
    )


def heading(text, size, pad="0 0 12px 0"):
    return (
        f'<tr><td style="padding:{pad};font-family:{SANS};font-size:{size}px;line-height:1.2;font-weight:bold;'
        f'letter-spacing:-0.01em;color:{INK};">{esc(text)}</td></tr>'
    )


def button(text, href, filled=True, pad="0 0 26px 0"):
    """A button that stays a button in Mailchimp, Gmail and Outlook: the padding and colour sit
    on the table cell, so the whole shape shows even where the link styles are stripped."""
    fill = TEAL if filled else PAPER
    ink = WHITE if filled else TEAL
    return (
        f'<tr><td style="padding:{pad};">'
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td bgcolor="{fill}" style="background:{fill};border:2px solid {TEAL};border-radius:2px;padding:12px 22px;'
        f'font-family:{SANS};font-size:15px;font-weight:bold;line-height:1.2;">'
        f'<a href="{attr(href)}" target="_blank" style="font-family:{SANS};font-size:15px;font-weight:bold;line-height:1.2;'
        f'color:{ink};text-decoration:none;"><span style="color:{ink};">{esc(text)}</span></a>'
        f"</td></tr></table></td></tr>"
    )


def statement():
    """The umbrella statement: one sentence under the headline, a size up from the text."""
    text = copy.get("umbrella_statement", "").strip()
    if not text:
        return ""
    return (
        f'<tr><td style="padding:0 0 18px 0;font-family:{SANS};font-size:{STATEMENT_SIZE}px;line-height:1.4;'
        f'color:{INK};">{esc(text)}</td></tr>'
    )


def case_patterns(c):
    library = {p["name"]: p for p in copy["patterns"]}
    return [library[name.strip()] for name in c["pattern"].split(",")]


def case_block(c, images, swatches, last):
    src = images.get(c["key"], url_or_placeholder(hosted(c.get("image_url"), c.get("image_file")), slug(c["title"]) + "-IMAGE"))
    return f"""
<!-- Case: {esc(c['title']).replace("--", "-")} -->
<tr><td style="padding:0 0 18px 0;">
<a href="{attr(c['page_url'])}" target="_blank" style="text-decoration:none;"><img src="{attr(src)}" width="{CONTENT}" alt="{attr(c['image_alt'])}" style="display:block;width:100%;max-width:{CONTENT}px;height:auto;border:0;"></a>
</td></tr>
{label(c['kicker'], pad="0 0 6px 0")}
{heading(c.get('headline') or c['title'], TITLE_SIZE, pad="0 0 10px 0")}
<tr><td style="padding:0;">{paras(c['body'], margin=12)}</td></tr>
<tr><td style="padding:0 0 16px 0;font-family:{SANS};font-size:13px;line-height:1.6;color:{MUTED};">Application: {esc(c['application'])}</td></tr>
{button(c['link_label'], c['page_url'], filled=False, pad="0 0 28px 0")}
{palette(c, swatches)}
{'' if last else dashed()}"""


def swatch_src(p, swatches):
    return swatches.get(p["name"], url_or_placeholder(hosted(p.get("swatch_url"), p.get("file"), "swatches/"), "SWATCH-" + slug(p["name"])))


def swatch_cell(p, swatches, c=None):
    """One swatch in a plain table cell. Tables keep their layout in Mailchimp, Gmail and Outlook alike.
    With swatch_links on, the swatch and its name link to the pattern's page. Off (the default), the case's
    one button is the only link: it opens the sample menu, where the reader picks a pattern."""
    src = swatch_src(p, swatches)
    img = (f'<img src="{attr(src)}" width="{SWATCH}" height="{SWATCH}" alt="{attr(p["name"])} pattern swatch" '
           f'style="display:block;width:100%;max-width:{SWATCH}px;height:auto;border:0;border-radius:2px;">')
    name = esc(p["name"])
    href = attr(pattern_link(p, c))
    if copy.get("swatch_links") or copy.get("swatch_buttons"):
        img = f'<a href="{href}" target="_blank" style="text-decoration:none;">{img}</a>'
        name = f'<a href="{href}" target="_blank" style="color:{INK};text-decoration:none;">{name}</a>'
    share = f"{100 // COLUMNS}%"
    bottom = "10px" if copy.get("swatch_buttons") else "18px"  # the button row adds its own space below
    return (
        f'<td width="{share}" valign="top" style="width:{share};padding:0 12px {bottom} 0;vertical-align:top;">'
        f'{img}'
        f'<div style="padding:8px 0 0 0;font-family:{SANS};font-size:13px;line-height:1.25;font-weight:bold;color:{INK};">{name}</div>'
        + (f'<div style="padding:2px 0 0 0;font-family:{SANS};font-size:12px;line-height:1.4;color:{WARM};">{esc(p["caption"])}</div>'
           if p.get("caption", "").strip() else "")
        + "</td>"
    )


def sample_button_cell(p, c=None):
    """The small outline button under a sample. Buttons sit in their own row, so they line up
    even when a pattern name wraps to two lines."""
    href = attr(pattern_link(p, c))
    share = f"{100 // COLUMNS}%"
    return (
        f'<td width="{share}" valign="top" style="width:{share};padding:0 12px 24px 0;vertical-align:top;">'
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td bgcolor="{PAPER}" style="background:{PAPER};border:1px solid {TEAL};border-radius:2px;padding:6px 9px;font-family:{SANS};font-size:11px;font-weight:bold;line-height:1.2;">'
        f'<a href="{href}" target="_blank" style="font-family:{SANS};font-size:11px;font-weight:bold;line-height:1.2;color:{TEAL};text-decoration:none;white-space:nowrap;">'
        f'<span style="color:{TEAL};">{esc(copy.get("swatch_cta", "Order sample"))}</span></a></td></tr></table>'
        f"</td>"
    )


def empty_cell():
    share = f"{100 // COLUMNS}%"
    return f'<td width="{share}" style="width:{share};padding:0;">&nbsp;</td>'


def palette(c, swatches):
    """The swatches under a case, COLUMNS to a row: one per pattern the case used."""
    pats = case_patterns(c)
    rows = []
    for i in range(0, len(pats), COLUMNS):
        group = pats[i:i + COLUMNS]
        pad = [empty_cell()] * (COLUMNS - len(group))  # keep every column the same width
        rows.append("<tr>" + "".join(swatch_cell(p, swatches, c) for p in group) + "".join(pad) + "</tr>")
        if copy.get("swatch_buttons"):
            rows.append("<tr>" + "".join(sample_button_cell(p, c) for p in group) + "".join(pad) + "</tr>")
    grid = "\n".join(rows)
    return f"""<!-- Palette: {esc(c['title']).replace("--", "-")} -->
{label(copy['palette_label'] if len(case_patterns(c)) > 1 else copy.get('palette_label_one', copy['palette_label']), color=MUTED, pad="0 0 10px 0")}
<tr><td style="padding:0 0 {'14px' if copy.get('swatch_buttons') else '4px'} 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
{grid}
</table>
</td></tr>
{'' if copy.get('swatch_buttons') else button(copy['palette_cta'] if len(case_patterns(c)) > 1 else copy.get('palette_cta_one', copy['palette_cta']), chooser_link(c), pad="0 0 32px 0")}"""


def closing_cta():
    """The small call to action at the very end of the email, under a dashed line."""
    cta = copy.get("closing_cta") or {}
    if not (cta.get("text") or "").strip():
        return ""
    return (
        f"<!-- Closing call to action -->\n{dashed(pad='0 0 22px 0')}"
        f'<tr><td style="padding:0 0 32px 0;font-family:{SANS};font-size:16px;line-height:1.45;font-weight:bold;">'
        f'<a href="{attr(cta.get("url") or "https://polygood.com/")}" target="_blank" style="color:{TEAL};text-decoration:none;">'
        f'{esc(cta["text"])}&nbsp;&rarr;</a></td></tr>\n'
    )


def colour_key():
    return (
        f"<!-- Colours, for find and replace: background {PAPER} · text {INK} · small text {MUTED} · "
        f"teal lines, labels, links and buttons {TEAL} · swatch captions {WARM} -->"
    )


def hero(images, with_intro=True):
    """The Project Edit header: title and subtitle beside the photo strip, a dashed line, then the intro."""
    h = copy["hero"]
    src = images.get("hero", url_or_placeholder(hosted(h.get("image_url"), h.get("image_file")), "HERO-STRIP-IMAGE"))
    img_col = 600 - HERO_TEXT_COL
    # Two columns side by side on wide screens, stacked on phones (no media queries needed).
    col = "display:inline-block;vertical-align:middle;width:100%;max-width:100%;width:calc((480px - 100%) * 480);"
    return f"""<!-- Header: The Project Edit -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:{PAPER};">
<tr><td bgcolor="{PAPER}" style="background:{PAPER};padding:0;font-size:0;line-height:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td width="{HERO_TEXT_COL}" valign="middle"><![endif]-->
<div style="{col}min-width:{HERO_TEXT_COL}px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:28px 16px 24px 24px;">
<div style="font-family:{SANS};font-size:{HERO_TITLE_SIZE}px;line-height:1.15;font-weight:bold;letter-spacing:-0.01em;color:{INK};padding:0 0 12px 0;">{esc(h['title'])}</div>
<div style="font-family:{SANS};font-size:15px;line-height:1.5;color:{INK};">{esc(h['subtitle'])}</div>
</td></tr></table>
</div><!--[if mso]></td><td width="{img_col}" valign="middle"><![endif]--><div style="{col}min-width:{img_col}px;">
<img src="{attr(src)}" width="{img_col}" alt="{attr(h['image_alt'])}" style="display:block;width:100%;height:auto;border:0;">
</div>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border-top:2px dashed {TEAL};font-size:1px;line-height:1px;mso-line-height-rule:exactly;">&nbsp;</td>
</tr></table></td></tr>
{f'<tr><td bgcolor="{PAPER}" style="background:{PAPER};padding:24px 24px 4px 24px;">{paras(h["intro"], size=18)}</td></tr>' if with_intro else ''}
</table>
"""


def case_block_edit(c, images, swatches, last):
    """A case in the Project Edit layout: centred headline over the photo, then sector, name and city,
    application, text, project button and the samples, each with its own small button."""
    src = images.get(c["key"], url_or_placeholder(hosted(c.get("image_url"), c.get("image_file")), slug(c["title"]) + "-IMAGE"))
    return f"""
<!-- Case: {esc(c['title']).replace("--", "-")} -->
<tr><td style="padding:0 0 18px 0;font-family:{SANS};font-size:{EDIT_HEADLINE_SIZE}px;line-height:1.25;font-weight:bold;letter-spacing:-0.01em;color:{INK};text-align:center;">{esc(c.get('headline') or c['title'])}</td></tr>
<tr><td style="padding:0 0 18px 0;">
<a href="{attr(c['page_url'])}" target="_blank" style="text-decoration:none;"><img src="{attr(src)}" width="{CONTENT}" alt="{attr(c['image_alt'])}" style="display:block;width:100%;max-width:{CONTENT}px;height:auto;border:0;"></a>
</td></tr>
{label(c.get('sector') or c['kicker'], pad="0 0 6px 0")}
<tr><td style="padding:0 0 4px 0;font-family:{SANS};font-size:20px;line-height:1.25;font-weight:bold;color:{INK};">{esc(c.get('place_title') or c['title'])}</td></tr>
<tr><td style="padding:0 0 14px 0;font-family:{SANS};font-size:14px;line-height:1.5;font-weight:bold;color:{MUTED};">Application: {esc(c['application'])}</td></tr>
<tr><td style="padding:0 0 6px 0;">{paras(c['body'], margin=12)}</td></tr>
{button(c['link_label'], c['page_url'], filled=False, pad="0 0 28px 0")}
{palette(c, swatches)}
{'' if last else dashed()}"""


def body_edit(images, swatches):
    """The whole body in the Project Edit layout: the header intro, then the four cases, then the closing line."""
    cases = copy["cases"]
    blocks = "".join(case_block_edit(c, images, swatches, i == len(cases) - 1) for i, c in enumerate(cases))
    lead = copy["hero"]["intro"]
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:{PAPER};">
<tr><td bgcolor="{PAPER}" style="background:{PAPER};padding:24px 24px 8px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<!-- Intro -->
<tr><td style="padding:0 0 24px 0;font-family:{SANS};font-size:18px;line-height:1.5;font-weight:bold;color:{INK};text-align:center;">{esc(lead)}</td></tr>
{dashed()}
{blocks}
{closing_cta()}</table>
</td></tr>
</table>
"""


def body(images, swatches):
    if copy.get("layout") == "edit":
        return body_edit(images, swatches)
    cases = copy["cases"]
    blocks = "".join(case_block(c, images, swatches, i == len(cases) - 1) for i, c in enumerate(cases))
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:{PAPER};">
<tr><td bgcolor="{PAPER}" style="background:{PAPER};padding:24px 24px 8px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<!-- Headline and intro -->
{label(copy['eyebrow'])}
{heading(copy['headline'], HEADLINE_SIZE, pad="0 0 14px 0")}
{statement()}
<tr><td style="padding:0 0 16px 0;">{paras(copy['intro'], size=BODY_SIZE + 1)}</td></tr>
{dashed()}
{blocks}
{dashed()}
<!-- Closing and button -->
<tr><td style="padding:0 0 8px 0;">{paras(copy['closing'])}</td></tr>
{button(copy['cta_label'], chooser_link(), pad="4px 0 32px 0")}
<tr><td style="padding:0 0 32px 0;">{paras(copy['signoff'], size=15)}</td></tr>
{closing_cta()}</table>
</td></tr>
</table>
"""


def code_block(images, swatches):
    return (
        "<!-- Polygood newsletter: everything after the Project Edit header and intro. "
        "Paste into a Mailchimp Code block under your header. -->\n"
        f"{colour_key()}\n{body(images, swatches)}"
    )


def hero_block(images):
    return (
        "<!-- Polygood newsletter: the Project Edit header and intro. "
        "Paste into a Code block above the main code block, only if the header isn't already built in Mailchimp. -->\n"
        f"{hero(images)}"
    )


def full_email(images, swatches):
    """The whole email for Mailchimp's 'Paste in code', with the merge tags Mailchimp requires."""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>*|MC:SUBJECT|*</title>
</head>
<body style="margin:0;padding:0;background:#f3efe9;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">*|MC_PREVIEW_TEXT|*</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3efe9" style="background:#f3efe9;">
<tr><td align="center" style="padding:24px 0;">
{colour_key()}
{hero(images, with_intro=copy.get("layout") != "edit")}
{body(images, swatches)}
<!-- Footer: Mailchimp needs the unsubscribe link and your postal address -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;">
<tr><td style="padding:20px 24px;font-family:{SANS};font-size:12px;line-height:1.6;color:{MUTED};text-align:center;">
<a href="*|UNSUB|*" style="color:{MUTED};text-decoration:underline;">Unsubscribe</a> &middot; <a href="*|UPDATE_PROFILE|*" style="color:{MUTED};text-decoration:underline;">Update your preferences</a><br>
*|LIST:ADDRESSLINE|*
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""


def palettes_only():
    """Each case's swatch row on its own, for an email built from Mailchimp's own blocks."""
    parts = []
    for c in copy["cases"]:
        parts.append(f"""<!-- ===== {esc(c['title'])}: paste this into a Code block under the {esc(c['title'])} case ===== -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:{PAPER};">
<tr><td bgcolor="{PAPER}" style="background:{PAPER};padding:0 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
{palette(c, {})}
</table>
</td></tr>
</table>
""")
    return "\n".join(parts)


def chooser_sections(swatches):
    parts = []
    for c in copy["cases"]:
        pats = case_patterns(c)
        cards = "".join(
            f'<a class="pg-card" href="{attr((p.get("pattern_url") or "").strip() or SAMPLES_URL)}">'
            f'<img src="{attr(swatch_src(p, swatches))}" width="240" height="240" alt="{attr(p["name"])} pattern swatch" loading="lazy">'
            f'<span class="pg-name">{esc(p["name"])}</span>'
            + (f'<span class="pg-cap">{esc(p["caption"])}</span>' if p.get("caption", "").strip() else "")
            + f'<span class="pg-go">{esc(CHOOSER.get("card_cta", "Order this sample"))} &rarr;</span></a>'
            for p in pats
        )
        parts.append(f"""<section class="pg-case" id="{anchor(c)}">
<p class="pg-kicker">{esc(c['kicker'])}</p>
<h2>{esc(c.get('headline') or c['title'])}</h2>
<p class="pg-count">{esc(count_line(len(pats)))}</p>
<div class="pg-grid">{cards}</div>
<a class="pg-back" href="#">{esc(CHOOSER.get('back_link', 'See the patterns from all {n} projects').format(n=NUMBERS.get(len(copy['cases']), len(copy['cases']))))} &rarr;</a>
</section>""")
    return "\n".join(parts)


NUMBERS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine"}


def count_line(n):
    word = str(NUMBERS.get(n, n)).capitalize()
    if n == 1:
        return "One pattern from this project."
    return f"{word} patterns from this project. Choose one to order its sample."


def chooser_css(font):
    return f""".pg-chooser{{max-width:1040px;margin:0 auto;padding:8px 20px 48px;color:{INK};font-family:{font};}}
.pg-chooser *{{box-sizing:border-box;}}
.pg-chooser .pg-intro{{max-width:640px;font-size:18px;line-height:1.55;margin:0 0 8px;}}
.pg-chooser .pg-jump{{display:flex;flex-wrap:wrap;gap:8px 18px;margin:18px 0 8px;padding:0;list-style:none;font-size:14px;font-weight:bold;}}
.pg-chooser .pg-jump a{{color:{TEAL};text-decoration:none;border-bottom:2px solid transparent;}}
.pg-chooser .pg-jump a:hover{{border-bottom-color:{TEAL};}}
.pg-chooser .pg-case{{border-top:2px dashed {TEAL};padding:28px 0 8px;margin-top:28px;scroll-margin-top:110px;}}
/* Opened from a project's button (#one-dust-studio etc.): show only that project's patterns, as a small menu.
   Browsers without :has() show every project, scrolled to the right one. */
.pg-chooser:has(.pg-case:target) .pg-case:not(:target),
.pg-chooser:has(.pg-case:target) .pg-jump,
.pg-chooser:has(.pg-case:target) .pg-intro,
.pg-chooser:has(.pg-case:target) .pg-all{{display:none;}}
.pg-chooser .pg-case:target{{border-top:0;margin-top:0;padding-top:8px;}}
.pg-chooser .pg-back{{display:none;margin-top:26px;color:{TEAL};font-weight:bold;font-size:14px;text-decoration:none;}}
.pg-chooser .pg-case:target .pg-back{{display:inline-block;}}
.pg-chooser .pg-kicker{{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:bold;color:{TEAL};}}
.pg-chooser h2{{margin:0 0 6px;font-size:26px;line-height:1.2;letter-spacing:-.01em;}}
.pg-chooser .pg-count{{margin:0 0 18px;color:{MUTED};font-size:15px;}}
.pg-chooser .pg-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:22px 18px;}}
.pg-chooser .pg-card{{display:flex;flex-direction:column;gap:4px;color:{INK};text-decoration:none;}}
.pg-chooser .pg-card img{{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;border-radius:2px;margin-bottom:8px;transition:transform .2s ease;}}
.pg-chooser .pg-card:hover img,.pg-chooser .pg-card:focus-visible img{{transform:scale(1.03);}}
.pg-chooser .pg-card:focus-visible{{outline:2px solid {TEAL};outline-offset:4px;}}
.pg-chooser .pg-name{{font-weight:bold;font-size:16px;line-height:1.25;}}
.pg-chooser .pg-cap{{color:{WARM};font-size:13px;line-height:1.4;}}
.pg-chooser .pg-go{{margin-top:6px;color:{TEAL};font-weight:bold;font-size:14px;}}
.pg-chooser .pg-all{{margin:36px 0 0;padding-top:24px;border-top:2px dashed {TEAL};font-size:16px;}}
.pg-chooser .pg-all a{{color:{TEAL};font-weight:bold;}}
@media (max-width:480px){{.pg-chooser .pg-grid{{grid-template-columns:repeat(2,1fr);gap:18px 14px;}}.pg-chooser h2{{font-size:22px;}}}}"""


def chooser_body(swatches):
    jump = "".join(f'<li><a href="#{anchor(c)}">{esc(c["title"])}</a></li>' for c in copy["cases"])
    return f"""<div class="pg-chooser">
<p class="pg-intro">{esc(CHOOSER.get('intro', ''))}</p>
<ul class="pg-jump">{jump}</ul>
{chooser_sections(swatches)}
<p class="pg-all">{esc(CHOOSER.get('all_text', 'Looking for another pattern?'))} <a href="{attr(SAMPLES_URL)}">{esc(CHOOSER.get('all_link', 'See all samples'))} &rarr;</a></p>
</div>"""


def chooser_wordpress(swatches):
    """For a WordPress Custom HTML block: scoped styles plus the content. The theme supplies the font and page title."""
    return (
        "<!-- Polygood sample chooser: paste into a Custom HTML block on the page at " + esc(CHOOSER_URL) + " -->\n"
        f"<style>\n{chooser_css('inherit')}\n</style>\n{chooser_body(swatches)}\n"
    )


def chooser_standalone(swatches):
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(CHOOSER.get('title', 'Order samples'))}</title>
<style>
body{{margin:0;background:{PAPER};}}
.pg-head{{max-width:1040px;margin:0 auto;padding:40px 20px 0;font-family:{SANS};color:{INK};}}
.pg-head h1{{margin:0;font-size:34px;line-height:1.15;letter-spacing:-.01em;}}
{chooser_css(SANS)}
</style></head>
<body>
<header class="pg-head"><h1>{esc(CHOOSER.get('title', 'Order samples'))}</h1></header>
{chooser_body(swatches)}
</body></html>
"""


def sample_menu():
    """The pop-up style sample menu: a small card that lists one project's patterns, each opening its
    page on polygood.com. #one-dust-studio etc. picks the project; with no project it lists all four.
    Written for a Claude artifact: no html/head/body tags, swatches published next to it in swatches/."""
    cases = copy["cases"]
    title = CHOOSER.get("menu_title", "Project Edit Samples")
    rows_for = lambda c: "".join(
        f'<li><a class="pm-row" href="{attr((p.get("pattern_url") or "").strip() or SAMPLES_URL)}">'
        f'<img src="swatches/{attr(p["file"])}" width="56" height="56" alt="">'
        f'<span class="pm-text"><span class="pm-name">{esc(p["name"])}</span>'
        f'<span class="pm-code">{esc(p.get("caption", ""))}</span></span>'
        f'<span class="pm-go" aria-hidden="true">&rarr;</span></a></li>'
        for p in case_patterns(c)
    )

    def sub(n):
        if n == 1:
            return "One pattern from this project. It opens on polygood.com, where you order its sample."
        return f"{NUMBERS.get(n, n).capitalize()} patterns from this project. Each opens on polygood.com, where you order its sample."

    projects = "".join(
        f"""<section class="pm-view" id="{anchor(c)}" aria-labelledby="h-{anchor(c)}">
<a class="pm-back" href="#all">&larr; All projects</a>
<p class="pm-eyebrow">Order a sample</p>
<h1 class="pm-title" id="h-{anchor(c)}">{esc(c['kicker'])}</h1>
<p class="pm-sub">{esc(sub(len(case_patterns(c))))}</p>
<ul class="pm-list">{rows_for(c)}</ul>
</section>
"""
        for c in cases
    )
    picker_rows = "".join(
        f'<li><a class="pm-row" href="#{anchor(c)}">'
        f'<span class="pm-stack">'
        + "".join(f'<img src="swatches/{attr(p["file"])}" width="56" height="56" alt="">' for p in case_patterns(c)[:3])
        + f'</span><span class="pm-text"><span class="pm-name">{esc(c["title"])}</span>'
        f'<span class="pm-code">{esc(c["kicker"].split(" · ")[-1])} · {NUMBERS.get(len(case_patterns(c)), len(case_patterns(c))).capitalize()} pattern{"" if len(case_patterns(c)) == 1 else "s"}</span></span>'
        f'<span class="pm-go" aria-hidden="true">&rarr;</span></a></li>'
        for c in cases
    )
    return f"""<title>{esc(title)}</title>
<style>
/* Layout: one small card centred on a quiet ground, like a pop-up over the email; one project at a time. */
:root{{
  --ground:#ece5dc; --card:{PAPER}; --ink:{INK}; --muted:{MUTED}; --teal:{TEAL}; --warm:{WARM}; --line:#e2d8cc; --shadow:rgba(40,28,16,.14);
  --sans:{SANS};
}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{
  --ground:#14110e; --card:#1f1b17; --ink:#f3ede6; --muted:#b3a89c; --teal:#5cc1c8; --warm:#e0a47c; --line:#3a332c; --shadow:rgba(0,0,0,.5); color-scheme:dark;
}}}}
:root[data-theme="dark"]{{
  --ground:#14110e; --card:#1f1b17; --ink:#f3ede6; --muted:#b3a89c; --teal:#5cc1c8; --warm:#e0a47c; --line:#3a332c; --shadow:rgba(0,0,0,.5); color-scheme:dark;
}}
body{{background:var(--ground);color:var(--ink);font-family:var(--sans);}}
.pm-wrap{{min-height:100%;display:grid;grid-template-columns:minmax(0,520px);justify-content:center;align-content:start;padding-inline:16px;padding-block:clamp(24px,8vh,72px);}}
.pm-card{{min-width:0;background:var(--card);border-radius:6px;box-shadow:0 18px 50px var(--shadow),0 2px 6px var(--shadow);padding:clamp(20px,5vw,32px);}}
.pm-brand{{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:16px;margin-bottom:18px;border-bottom:2px dashed var(--teal);}}
.pm-brand b{{font-size:15px;letter-spacing:-.01em;}}
.pm-brand span{{font-size:12px;color:var(--muted);}}
.pm-eyebrow{{margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--teal);}}
.pm-title{{margin:0 0 8px;font-size:clamp(22px,5vw,26px);line-height:1.2;letter-spacing:-.01em;text-wrap:balance;}}
.pm-sub{{margin:0 0 18px;font-size:15px;line-height:1.5;color:var(--muted);max-width:60ch;}}
.pm-list{{list-style:none;margin:0;padding:0;display:grid;}}
.pm-list li+li{{border-top:1px solid var(--line);}}
.pm-row{{display:flex;align-items:center;gap:14px;padding:12px 4px;color:var(--ink);text-decoration:none;border-radius:4px;}}
.pm-row img{{width:56px;height:56px;max-width:100%;object-fit:cover;border-radius:3px;flex:none;}}
.pm-text{{display:grid;gap:2px;min-width:0;flex:1;}}
.pm-name{{font-weight:700;font-size:16px;line-height:1.25;}}
.pm-code{{font-size:13px;color:var(--warm);font-variant-numeric:tabular-nums;}}
.pm-go{{color:var(--teal);font-weight:700;font-size:18px;transition:transform .15s ease;}}
.pm-row:hover .pm-go,.pm-row:focus-visible .pm-go{{transform:translateX(3px);}}
.pm-row:hover{{background:color-mix(in srgb,var(--teal) 7%,transparent);}}
.pm-row:focus-visible{{outline:2px solid var(--teal);outline-offset:2px;}}
.pm-stack{{display:flex;flex:none;width:96px;}}
.pm-stack img{{width:40px;height:40px;border:2px solid var(--card);}}
.pm-stack img+img{{margin-left:-14px;}}
.pm-back{{display:inline-block;margin:0 0 14px;font-size:14px;font-weight:700;color:var(--teal);text-decoration:none;}}
.pm-back:focus-visible,.pm-all a:focus-visible{{outline:2px solid var(--teal);outline-offset:2px;}}
.pm-all{{margin:18px 0 0;padding-top:16px;border-top:1px solid var(--line);font-size:14px;color:var(--muted);}}
.pm-all a{{color:var(--teal);font-weight:700;}}
.pm-view+.pm-view{{margin-top:32px;padding-top:24px;border-top:2px dashed var(--teal);}}
.js .pm-view+.pm-view{{margin-top:0;padding-top:0;border-top:0;}}
@media (prefers-reduced-motion: reduce){{.pm-go{{transition:none;}}}}
</style>
<div class="pm-wrap"><div class="pm-card">
<div class="pm-brand"><b>The Polygood® Project Edit</b><span>Autumn 2026</span></div>
<section class="pm-view" id="all" aria-labelledby="h-all">
<p class="pm-eyebrow">Order a sample</p>
<h1 class="pm-title" id="h-all">Choose a project</h1>
<p class="pm-sub">See the patterns each project used, then pick the one you'd like to sample.</p>
<ul class="pm-list">{picker_rows}</ul>
<p class="pm-all">Looking for another pattern? <a href="{attr(SAMPLES_URL)}">See all samples &rarr;</a></p>
</section>
{projects}</div></div>
<script>
(function () {{
  document.documentElement.classList.add('js');
  var views = Array.prototype.slice.call(document.querySelectorAll('.pm-view'));
  function show() {{
    var id = decodeURIComponent((location.hash || '').slice(1));
    var current = views.some(function (v) {{ return v.id === id; }}) ? id : 'all';
    views.forEach(function (v) {{ v.hidden = v.id !== current; }});
    window.scrollTo(0, 0);
  }}
  window.addEventListener('hashchange', show);
  show();
}})();
</script>
"""


code = code_block({}, {})
(out / "mailchimp-code-block.html").write_text(code)
(out / "mailchimp-hero.html").write_text(hero_block({}))
(out / "mailchimp-full-email.html").write_text(full_email({}, {}))
(out / "mailchimp-palettes.html").write_text(palettes_only())
if CHOOSER.get("enabled", True):
    (out / "sample-chooser.html").write_text(chooser_standalone({}))
    (out / "sample-chooser-wordpress.html").write_text(chooser_wordpress({}))
    menu_dir = out / "sample-menu"
    (menu_dir / "swatches").mkdir(parents=True, exist_ok=True)
    (menu_dir / "index.html").write_text(sample_menu())
    for pat in copy["patterns"]:  # the menu publishes its own copies of the swatches next to it
        if pat.get("file") and (out / "images" / "swatches" / pat["file"]).exists():
            (menu_dir / "swatches" / pat["file"]).write_bytes((out / "images" / "swatches" / pat["file"]).read_bytes())


def data_uri(path, mime="image/jpeg"):
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def placeholder(w, h, text):
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}"><rect width="100%" height="100%" fill="#efe6dc"/>'
        f'<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica,Arial" '
        f'font-size="{max(12, min(w // 12, 44))}" fill="{MUTED}">{text}</text></svg>'
    )
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


def preview_image(url, local, folder, text, w, h):
    """Preview uses the hosted image if there is one, then the local file, then a grey placeholder.
    Hosted images keep preview.html small (embedding every photo made it over 1 MB, which some
    viewers cut short) and show exactly what Mailchimp will load."""
    if url and url.strip():
        return url.strip()
    if local and (folder / local).exists():
        return data_uri(folder / local)
    return placeholder(w, h, text)


imgdir = out / "images"
images = {
    c["key"]: preview_image(hosted(c.get("image_url"), c.get("image_file")), c.get("image_file"), imgdir, f"{c['title']} photo", 1200, 800)
    for c in copy["cases"]
}
images["hero"] = preview_image(hosted(copy["hero"].get("image_url"), copy["hero"].get("image_file")), copy["hero"].get("image_file"), imgdir, "Header photos", 720, 420)
swatches = {
    p["name"]: preview_image(hosted(p.get("swatch_url"), p.get("file"), "swatches/"), p.get("file"), imgdir / "swatches", "Add swatch", 240, 240)
    for p in copy["patterns"]
}

page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Newsletter preview</title></head>
<body style="margin:0;padding:24px 12px;background:#f3efe9;">
<div style="max-width:600px;margin:0 auto 16px auto;font-family:{SANS};font-size:13px;line-height:1.5;color:#4a4039;">
<div><b>Subject:</b> {esc(copy['subject_lines'][0])}</div><div><b>Preview text:</b> {esc(copy['preview_text'])}</div>
</div>
{hero(images, with_intro=copy.get("layout") != "edit")}
{body(images, swatches)}
</body></html>
"""
(out / "preview.html").write_text(page)

placeholders = sorted(set(part.split('"')[0] for part in (code + hero_block({})).split("PASTE-")[1:]))
words = sum(len(t.split()) for t in [copy["intro"], copy["closing"]] + [c["body"] for c in copy["cases"]])
print(f"body words: {words}")
print(f"placeholders still to fill: {len(placeholders)}" + "".join(f"\n  PASTE-{p}" for p in placeholders))
missing = [p["name"] for p in copy["patterns"] if not (p.get("pattern_url") or "").strip()]
if missing:
    print("patterns without a pattern_url (their links open the chooser section instead): " + ", ".join(missing))
