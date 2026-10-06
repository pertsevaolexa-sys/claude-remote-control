"""Render the newsletter copy (JSON) into Mailchimp-ready HTML and a preview page.

usage: python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies

Writes four files into the output folder:
  mailchimp-code-block.html      paste into a Code block in Mailchimp's email builder
  mailchimp-full-email.html      the whole email, for Mailchimp's "Paste in code" option
  mailchimp-palettes.html        each case's swatch row alone, for an email built from Mailchimp's own blocks
  preview.html                   the same email with the local photos and swatches built in

Words, links and images live in copy.json. The look (colours, fonts, sizes) is set below.
An empty image_url, swatch_url or samples_url becomes a PASTE-...-URL-HERE placeholder.
"""
import base64
import html
import json
import sys
from pathlib import Path

copy = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])

# ---- Look: change these to restyle the whole email -------------------------
SANS = "Helvetica, Arial, sans-serif"
SERIF = "Georgia, 'Times New Roman', serif"

PAPER = "#fbf5ec"   # email background
INK = "#2b1d15"     # main text
MUTED = "#7a6455"   # small grey-brown text
RULE = "#e5d3bc"    # thin lines between cases
RUST = "#9a3f22"    # top band, labels, links, button, sample tile
CREAM = "#fbf5ec"   # text on rust
STRIPE = ["#c98a2e", "#6e2430", "#6b6a2e", "#d9a066", "#4a3226"]  # ochre, burgundy, olive, amber, bark

HEADLINE_SIZE = 34
TITLE_SIZE = 24
BODY_SIZE = 16
TILE = 96  # swatch width in px; up to 5 per row: 5 x (96 + 12) = 540, inside the 552px column
GAP = 12   # space to the right of each swatch
MSO_CELL = TILE + GAP
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


def paras(text, size=BODY_SIZE, color=INK, margin=16):
    blocks = [p.strip() for p in text.split("\n\n") if p.strip()]
    return "".join(
        f'<p style="margin:0 0 {margin}px 0;font-family:{SANS};font-size:{size}px;line-height:1.6;color:{color};">'
        f"{esc(p).replace(chr(10), '<br>')}</p>"
        for p in blocks
    )


def eyebrow(text, color=RUST, pad="0 0 8px 0"):
    return (
        f'<tr><td style="padding:{pad};font-family:{SANS};font-size:12px;line-height:1.4;'
        f'letter-spacing:0.08em;text-transform:uppercase;font-weight:bold;color:{color};">{esc(text)}</td></tr>'
    )


def rule(color=RULE, weight=1, pad="0 0 36px 0"):
    return (
        f'<tr><td style="padding:{pad};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td height="{weight}" bgcolor="{color}" style="background:{color};height:{weight}px;font-size:{weight}px;'
        f'line-height:{weight}px;mso-line-height-rule:exactly;">&nbsp;</td></tr></table></td></tr>'
    )


def case_patterns(c):
    library = {p["name"]: p for p in copy["patterns"]}
    return [library[name.strip()] for name in c["pattern"].split(",")]


def case_block(c, images, swatches, last):
    src = images.get(c["key"], url_or_placeholder(c.get("image_url"), slug(c["title"]) + "-IMAGE"))
    return f"""
<!-- Case: {esc(c['title']).replace("--", "-")} -->
<tr><td style="padding:0 0 18px 0;">
<a href="{attr(c['page_url'])}" target="_blank" style="text-decoration:none;"><img src="{attr(src)}" width="{CONTENT}" alt="{attr(c['image_alt'])}" style="display:block;width:100%;max-width:{CONTENT}px;height:auto;border:0;"></a>
</td></tr>
{eyebrow(c['kicker'], pad="0 0 6px 0")}
<tr><td style="padding:0 0 10px 0;font-family:{SERIF};font-size:{TITLE_SIZE}px;line-height:1.25;color:{INK};">{esc(c['title'])}</td></tr>
<tr><td style="padding:0;">{paras(c['body'], margin=12)}</td></tr>
<tr><td style="padding:0 0 14px 0;font-family:{SANS};font-size:13px;line-height:1.6;color:{MUTED};">Application: {esc(c['application'])}</td></tr>
<tr><td style="padding:0 0 26px 0;font-family:{SANS};font-size:15px;line-height:1.4;font-weight:bold;">
<a href="{attr(c['page_url'])}" target="_blank" style="color:{RUST};text-decoration:underline;">{esc(c['link_label'])}</a>
</td></tr>
{palette(c, swatches)}
{'' if last else rule()}"""


def tile(inner):
    return (
        f'<div style="display:inline-block;width:{TILE}px;vertical-align:top;margin:0 {GAP}px 16px 0;text-align:left;">'
        f"{inner}</div>"
    )


def swatch_tile(p, swatches):
    src = swatches.get(p["name"], url_or_placeholder(p.get("swatch_url"), "SWATCH-" + slug(p["name"])))
    return tile(
        f'<img src="{attr(src)}" width="{TILE}" height="{TILE}" alt="{attr(p["name"])} pattern swatch" '
        f'style="display:block;width:{TILE}px;height:{TILE}px;border:0;border-radius:2px;">'
        f'<div style="padding:7px 0 0 0;font-family:{SERIF};font-size:14px;line-height:1.25;color:{INK};">{esc(p["name"])}</div>'
        f'<div style="padding:2px 0 0 0;font-family:{SANS};font-size:12px;line-height:1.4;color:{RUST};">Made from {esc(p["from"])}</div>'
    )


def palette(c, swatches):
    """The row of swatches under a case: one tile per pattern the case used."""
    tiles = [swatch_tile(p, swatches) for p in case_patterns(c)]
    cells = f'<!--[if mso]></td><td width="{MSO_CELL}" valign="top"><![endif]-->'.join(tiles)
    return f"""<!-- Palette: {esc(c['title']).replace("--", "-")} -->
{eyebrow(copy['palette_label'], color=MUTED, pad="0 0 10px 0")}
<tr><td style="padding:0 0 20px 0;font-size:0;line-height:0;text-align:left;">
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="{MSO_CELL}" valign="top"><![endif]-->{cells}<!--[if mso]></td></tr></table><![endif]-->
</td></tr>"""


def snippet(images, swatches):
    cases = copy["cases"]
    body = "".join(case_block(c, images, swatches, i == len(cases) - 1) for i, c in enumerate(cases))
    stripe = "".join(
        f'<td width="{100 // len(STRIPE)}%" height="6" bgcolor="{c}" style="background:{c};height:6px;font-size:6px;line-height:6px;mso-line-height-rule:exactly;">&nbsp;</td>'
        for c in STRIPE
    )
    return f"""<!-- Polygood newsletter. Paste into a Mailchimp Code block.
Colours, for find and replace: background {PAPER} · text {INK} · small text {MUTED} · thin lines {RULE} · rust {RUST} · strip {' '.join(STRIPE)} -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:{PAPER};">
<tr><td bgcolor="{RUST}" style="background:{RUST};padding:14px 24px;font-family:{SANS};font-size:12px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;font-weight:bold;color:{CREAM};">{esc(copy['eyebrow'])}</td></tr>
<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{stripe}</tr></table></td></tr>
<tr><td bgcolor="{PAPER}" style="background:{PAPER};padding:34px 24px 8px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<!-- Headline and intro -->
<tr><td style="padding:0 0 18px 0;font-family:{SERIF};font-size:{HEADLINE_SIZE}px;line-height:1.15;color:{INK};">{esc(copy['headline'])}</td></tr>
<tr><td style="padding:0 0 20px 0;">{paras(copy['intro'], size=BODY_SIZE + 1)}</td></tr>
{rule(STRIPE[0], 2)}
{body}
{rule(STRIPE[0], 2)}
<!-- Closing and button -->
<tr><td style="padding:0 0 8px 0;">{paras(copy['closing'])}</td></tr>
<tr><td style="padding:4px 0 32px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="{RUST}" style="background:{RUST};border-radius:2px;mso-padding-alt:14px 26px;">
<a href="{attr(SAMPLES_URL)}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:{SANS};font-size:15px;font-weight:bold;line-height:1;color:{CREAM};text-decoration:none;mso-padding-alt:0;"><span style="color:{CREAM};">{esc(copy['cta_label'])}</span></a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 0 32px 0;">{paras(copy['signoff'], size=15)}</td></tr>
</table>
</td></tr>
</table>
"""


def full_email(inner):
    """The whole email for Mailchimp's 'Paste in code', with the merge tags Mailchimp requires."""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>*|MC:SUBJECT|*</title>
</head>
<body style="margin:0;padding:0;background:#efe4d4;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">*|MC_PREVIEW_TEXT|*</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#efe4d4" style="background:#efe4d4;">
<tr><td align="center" style="padding:24px 0;">
{inner}
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


code = snippet({}, {})
(out / "mailchimp-code-block.html").write_text(code)
(out / "mailchimp-full-email.html").write_text(full_email(code))
(out / "mailchimp-palettes.html").write_text(palettes_only())


def data_uri(path, mime="image/jpeg"):
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def placeholder(w, h, label):
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}"><rect width="100%" height="100%" fill="#e9dcc9"/>'
        f'<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica,Arial" '
        f'font-size="{max(12, min(w // 12, 44))}" fill="{MUTED}">{label}</text></svg>'
    )
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


def preview_image(url, local, folder, label, w, h):
    """Preview uses the hosted image if there is one, then the local file, then a grey placeholder."""
    if url and url.strip():
        return url.strip()
    if local and (folder / local).exists():
        return data_uri(folder / local)
    return placeholder(w, h, label)


imgdir = out / "images"
images = {
    c["key"]: preview_image(c.get("image_url"), c.get("image_file"), imgdir, f"{c['title']} photo", 1200, 800)
    for c in copy["cases"]
}
swatches = {
    p["name"]: preview_image(p.get("swatch_url"), p.get("file"), imgdir / "swatches", "Add swatch", 240, 240)
    for p in copy["patterns"]
}

page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Newsletter preview</title></head>
<body style="margin:0;padding:24px 12px;background:#efe4d4;">
<div style="max-width:600px;margin:0 auto 16px auto;font-family:{SANS};font-size:13px;line-height:1.5;color:#4a3226;">
<div><b>Subject:</b> {esc(copy['subject_lines'][0])}</div><div><b>Preview text:</b> {esc(copy['preview_text'])}</div>
</div>
{snippet(images, swatches)}
</body></html>
"""
(out / "preview.html").write_text(page)

placeholders = sorted(set(part.split('"')[0] for part in code.split("PASTE-")[1:]))
words = sum(len(t.split()) for t in [copy["intro"], copy["closing"]] + [c["body"] for c in copy["cases"]])
print(f"body words: {words}")
print(f"placeholders still to fill: {len(placeholders)}" + "".join(f"\n  PASTE-{p}" for p in placeholders))
