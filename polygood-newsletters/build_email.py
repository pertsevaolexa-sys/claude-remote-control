"""Render the newsletter copy (JSON) into Mailchimp-ready HTML and a preview page.

usage: python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies

Writes five files into the output folder:
  mailchimp-code-block.html  everything after the header and intro: paste into a Code block
                             under the Project Edit header you built in Mailchimp
  mailchimp-hero.html        the Project Edit header, dashed line and intro, if you want those in code too
  mailchimp-full-email.html  the whole email (header + body + footer), for Mailchimp's "Paste in code"
  mailchimp-palettes.html    each case's swatch row alone, for an email built from Mailchimp's own blocks
  preview.html               the whole email to check in a browser, with the same hosted pictures as Mailchimp

Words, links and images live in copy.json. The look (colours, fonts, sizes) is set below.
Images: an image_url or swatch_url wins; otherwise image_base_url + the file name is used
(swatches from image_base_url + "/swatches/"). With neither, the code gets a PASTE-...-URL-HERE
placeholder. An empty samples_url becomes a placeholder too.
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
WARM = "#9a5b34"    # the "Made from ..." captions under the swatches
WHITE = "#ffffff"   # text on the filled buttons

HERO_TITLE_SIZE = 26
HEADLINE_SIZE = 28
STATEMENT_SIZE = 20
TITLE_SIZE = 22
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


def swatch_cell(p, swatches):
    """One swatch in a plain table cell. Tables keep their layout in Mailchimp, Gmail and Outlook alike."""
    src = swatches.get(p["name"], url_or_placeholder(hosted(p.get("swatch_url"), p.get("file"), "swatches/"), "SWATCH-" + slug(p["name"])))
    share = f"{100 // COLUMNS}%"
    return (
        f'<td width="{share}" valign="top" style="width:{share};padding:0 12px 18px 0;vertical-align:top;">'
        f'<img src="{attr(src)}" width="{SWATCH}" height="{SWATCH}" alt="{attr(p["name"])} pattern swatch" '
        f'style="display:block;width:100%;max-width:{SWATCH}px;height:auto;border:0;border-radius:2px;">'
        f'<div style="padding:8px 0 0 0;font-family:{SANS};font-size:13px;line-height:1.25;font-weight:bold;color:{INK};">{esc(p["name"])}</div>'
        f'<div style="padding:2px 0 0 0;font-family:{SANS};font-size:12px;line-height:1.4;color:{WARM};">Made from {esc(p["from"])}</div>'
        f"</td>"
    )


def empty_cell():
    share = f"{100 // COLUMNS}%"
    return f'<td width="{share}" style="width:{share};padding:0;">&nbsp;</td>'


def palette(c, swatches):
    """The swatches under a case, COLUMNS to a row: one per pattern the case used."""
    cells = [swatch_cell(p, swatches) for p in case_patterns(c)]
    rows = []
    for i in range(0, len(cells), COLUMNS):
        row = cells[i:i + COLUMNS]
        row += [empty_cell()] * (COLUMNS - len(row))  # keep every column the same width
        rows.append("<tr>" + "".join(row) + "</tr>")
    grid = "\n".join(rows)
    return f"""<!-- Palette: {esc(c['title']).replace("--", "-")} -->
{label(copy['palette_label'], color=MUTED, pad="0 0 10px 0")}
<tr><td style="padding:0 0 4px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
{grid}
</table>
</td></tr>
{button(copy['palette_cta'], SAMPLES_URL, pad="0 0 32px 0")}"""


def colour_key():
    return (
        f"<!-- Colours, for find and replace: background {PAPER} · text {INK} · small text {MUTED} · "
        f"teal lines, labels, links and buttons {TEAL} · Made from captions {WARM} -->"
    )


def hero(images):
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
<tr><td bgcolor="{PAPER}" style="background:{PAPER};padding:24px 24px 4px 24px;">{paras(h['intro'], size=18)}</td></tr>
</table>
"""


def body(images, swatches):
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
{button(copy['cta_label'], SAMPLES_URL, pad="4px 0 32px 0")}
<tr><td style="padding:0 0 32px 0;">{paras(copy['signoff'], size=15)}</td></tr>
</table>
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
{hero(images)}
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


code = code_block({}, {})
(out / "mailchimp-code-block.html").write_text(code)
(out / "mailchimp-hero.html").write_text(hero_block({}))
(out / "mailchimp-full-email.html").write_text(full_email({}, {}))
(out / "mailchimp-palettes.html").write_text(palettes_only())


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
{hero(images)}
{body(images, swatches)}
</body></html>
"""
(out / "preview.html").write_text(page)

placeholders = sorted(set(part.split('"')[0] for part in (code + hero_block({})).split("PASTE-")[1:]))
words = sum(len(t.split()) for t in [copy["intro"], copy["closing"]] + [c["body"] for c in copy["cases"]])
print(f"body words: {words}")
print(f"placeholders still to fill: {len(placeholders)}" + "".join(f"\n  PASTE-{p}" for p in placeholders))
