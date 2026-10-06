"""Render the newsletter copy (JSON) into a Mailchimp Code-block snippet and a preview page.

usage: python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies

Writes mailchimp-code-block.html (paste into a Mailchimp Code block) and
preview.html (same email with the photos and swatches embedded, for checking).
"""
import base64
import html
import json
import sys
from pathlib import Path

copy = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])

SANS = "Helvetica, Arial, sans-serif"
SERIF = "Georgia, 'Times New Roman', serif"

# Autumn palette
PAPER = "#fbf5ec"
PANEL = "#f3e6d3"
INK = "#2b1d15"
MUTED = "#7a6455"
RULE = "#e5d3bc"
RUST = "#9a3f22"
CREAM = "#fbf5ec"
STRIPE = ["#c98a2e", "#6e2430", "#6b6a2e", "#d9a066", "#4a3226"]  # ochre, burgundy, olive, amber, bark

CASES = {
    "henriette": {
        "img": "PASTE-HENRIETTE-IMAGE-URL-HERE",
        "file": None,
        "alt": "Polygood washstand in a Circular Living room at Henriette Stadthotel, Vienna",
        "url": "https://polygood.com/projects/henriette-stadthotel/",
        "live": False,
    },
    "bijenkorf": {
        "img": "PASTE-DE-BIJENKORF-IMAGE-URL-HERE",
        "file": "de-bijenkorf.jpg",
        "alt": "Display stands in the Salmon Terra pattern at De Bijenkorf Amsterdam",
        "url": "https://polygood.com/projects/de-bijenkorf/",
        "live": True,
    },
    "orion": {
        "img": "PASTE-ORION-IMAGE-URL-HERE",
        "file": "orion.jpg",
        "alt": "Kitchenette worktop in the Emerald Ghost pattern at the Orion office in Paris",
        "url": "https://polygood.com/projects/orion/",
        "live": False,
    },
    "onedust": {
        "img": "PASTE-ONE-DUST-IMAGE-URL-HERE",
        "file": "one-dust-studio.jpg",
        "alt": "Translucent blue Polygood slab in a gravel garden at ONE DUST Studio, Taipei",
        "url": "https://polygood.com/projects/one-dust-studio/",
        "live": False,
    },
}
CTA_URL = "PASTE-ORDER-SAMPLES-URL-HERE"
TILE = 122  # swatch width in px; four tiles plus gutters fill the 512px panel


def esc(s):
    """Escape text content; apostrophes stay readable for editing in Mailchimp."""
    return html.escape(s, quote=False)


def attr(s):
    return html.escape(s, quote=True)


def slug(name):
    return name.upper().replace(" ", "-")


def paras(text, size=16, color=INK, margin=16):
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
        f'<tr><td style="padding:{pad};"><div style="border-top:{weight}px solid {color};'
        f'font-size:0;line-height:0;">&nbsp;</div></td></tr>'
    )


def case_block(c, images, last):
    meta = CASES[c["key"]]
    src = images.get(c["key"], meta["img"])
    note = "" if meta["live"] else "<!-- This case page is not live yet: publish it on polygood.com before sending, or the link will 404 -->\n"
    img_note = (
        "<!-- No photo in the case PDF: use one from Notion (Patrick Johannsen Fotografie or supersusi.com) -->\n"
        if meta["file"] is None
        else ""
    )
    return f"""
<!-- Case: {esc(c['title'])} -->
<tr><td style="padding:0 0 18px 0;">
{img_note}<a href="{meta['url']}" target="_blank" style="text-decoration:none;"><img src="{src}" width="552" alt="{attr(meta['alt'])}" style="display:block;width:100%;max-width:552px;height:auto;border:0;"></a>
</td></tr>
{eyebrow(c['kicker'], pad="0 0 6px 0")}
<tr><td style="padding:0 0 10px 0;font-family:{SERIF};font-size:24px;line-height:1.25;color:{INK};">{esc(c['title'])}</td></tr>
<tr><td style="padding:0;">{paras(c['body'], margin=12)}</td></tr>
<tr><td style="padding:0 0 14px 0;font-family:{SANS};font-size:13px;line-height:1.6;color:{MUTED};">Pattern: {esc(c['pattern'])}<br>Application: {esc(c['application'])}</td></tr>
<tr><td style="padding:0 0 36px 0;font-family:{SANS};font-size:15px;line-height:1.4;font-weight:bold;">
{note}<a href="{meta['url']}" target="_blank" style="color:{RUST};text-decoration:underline;">{esc(c['link_label'])}</a>
</td></tr>
{'' if last else rule()}"""


def tile(inner):
    return (
        f'<div style="display:inline-block;width:{TILE}px;vertical-align:top;margin:0 3px 20px 3px;text-align:left;">'
        f"{inner}</div>"
    )


def swatch_tile(p, swatches):
    if p["file"] is None:
        src = swatches.get(p["name"], f"PASTE-SWATCH-{slug(p['name'])}-URL-HERE")
        note = "<!-- Swatch: Notion > Marketing team space > All Patterns Images > Translucent Glitter Gold -->"
    else:
        src = swatches.get(p["name"], f"PASTE-SWATCH-{slug(p['name'])}-URL-HERE")
        note = ""
    return tile(
        f"{note}"
        f'<img src="{src}" width="{TILE}" height="{TILE}" alt="{attr(p["name"])} pattern swatch" '
        f'style="display:block;width:{TILE}px;height:{TILE}px;border:0;border-radius:2px;">'
        f'<div style="padding:8px 0 0 0;font-family:{SERIF};font-size:15px;line-height:1.25;color:{INK};">{esc(p["name"])}</div>'
        f'<div style="padding:3px 0 0 0;font-family:{SANS};font-size:12px;line-height:1.4;color:{MUTED};">{esc(p["used"])}</div>'
        f'<div style="padding:2px 0 0 0;font-family:{SANS};font-size:12px;line-height:1.4;color:{RUST};">Made from {esc(p["from"])}</div>'
    )


def cta_tile():
    return tile(
        f'<a href="{CTA_URL}" target="_blank" style="display:block;width:{TILE}px;height:{TILE}px;background:{RUST};'
        f'text-decoration:none;border-radius:2px;">'
        f'<table role="presentation" width="{TILE}" height="{TILE}" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td valign="bottom" bgcolor="{RUST}" style="padding:12px;font-family:{SERIF};font-size:16px;line-height:1.25;color:{CREAM};">'
        f"Your project next?<br><span style=\"font-family:{SANS};font-size:12px;font-weight:bold;\">Request a sample &rarr;</span>"
        f"</td></tr></table></a>"
    )


def patterns_block(swatches):
    tiles = [swatch_tile(p, swatches) for p in copy["patterns"]] + [cta_tile()]
    rows = [tiles[i:i + 4] for i in range(0, len(tiles), 4)]
    grid = ""
    for row in rows:
        cells = f'<!--[if mso]></td><td width="{TILE + 6}" valign="top"><![endif]-->'.join(row)
        grid += (
            f'<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="{TILE + 6}" valign="top"><![endif]-->'
            f"{cells}"
            f"<!--[if mso]></td></tr></table><![endif]-->\n"
        )
    return f"""
<!-- Patterns in this issue -->
<tr><td style="padding:0 0 36px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td bgcolor="{PANEL}" style="background:{PANEL};padding:28px 20px 12px 20px;border-radius:2px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
{eyebrow(copy['patterns_eyebrow'])}
<tr><td style="padding:0 0 10px 0;font-family:{SERIF};font-size:24px;line-height:1.25;color:{INK};">{esc(copy['patterns_heading'])}</td></tr>
<tr><td style="padding:0 0 18px 0;">{paras(copy['patterns_intro'], size=15, margin=0)}</td></tr>
<tr><td style="padding:0;font-size:0;line-height:0;text-align:left;">
{grid}</td></tr>
</table>
</td></tr>
</table>
</td></tr>"""


def snippet(images, swatches):
    cases = copy["cases"]
    body = "".join(case_block(c, images, i == len(cases) - 1) for i, c in enumerate(cases))
    stripe = "".join(
        f'<td width="20%" height="6" bgcolor="{c}" style="background:{c};font-size:0;line-height:0;height:6px;">&nbsp;</td>'
        for c in STRIPE
    )
    return f"""<!-- Polygood newsletter, autumn 2026: four new case studies. Paste into a Mailchimp Code block. -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:{PAPER};">
<tr><td bgcolor="{RUST}" style="background:{RUST};padding:14px 24px;font-family:{SANS};font-size:12px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;font-weight:bold;color:{CREAM};">{esc(copy['eyebrow'])}</td></tr>
<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{stripe}</tr></table></td></tr>
<tr><td bgcolor="{PAPER}" style="background:{PAPER};padding:34px 24px 8px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:0 0 18px 0;font-family:{SERIF};font-size:34px;line-height:1.15;color:{INK};">{esc(copy['headline'])}</td></tr>
<tr><td style="padding:0 0 20px 0;">{paras(copy['intro'], size=17)}</td></tr>
{rule(STRIPE[0], 2)}
{body}
{rule(STRIPE[0], 2)}
{patterns_block(swatches)}
<tr><td style="padding:0 0 8px 0;">{paras(copy['closing'])}</td></tr>
<tr><td style="padding:4px 0 32px 0;">
<!-- Button: replace the link with your samples or contact page -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="{RUST}" style="background:{RUST};border-radius:2px;">
<a href="{CTA_URL}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:{SANS};font-size:15px;font-weight:bold;line-height:1;color:{CREAM};text-decoration:none;">{esc(copy['cta_label'])}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 0 32px 0;">{paras(copy['signoff'], size=15)}</td></tr>
</table>
</td></tr>
</table>
"""


(out / "mailchimp-code-block.html").write_text(snippet({}, {}))


def data_uri(path, mime="image/jpeg"):
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def placeholder(w, h, label):
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}"><rect width="100%" height="100%" fill="#e9dcc9"/>'
        f'<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica,Arial" '
        f'font-size="{max(12, w // 12)}" fill="{MUTED}">{label}</text></svg>'
    )
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


imgdir = out / "images"
images = {
    key: data_uri(imgdir / meta["file"]) if meta["file"] else placeholder(1200, 800, "Henriette photo from Notion")
    for key, meta in CASES.items()
}
swatches = {
    p["name"]: data_uri(imgdir / "swatches" / p["file"]) if p["file"] else placeholder(240, 240, "Add swatch")
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

words = sum(len(t.split()) for t in [copy["intro"], copy["closing"], copy["patterns_intro"]] + [c["body"] for c in copy["cases"]])
print("body words:", words)
