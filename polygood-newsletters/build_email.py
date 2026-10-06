"""Render the newsletter copy (JSON) into a Mailchimp Code-block snippet and a preview page.

usage: python3 build_email.py 2026-10-case-studies/copy.json 2026-10-case-studies

Writes mailchimp-code-block.html (paste into a Mailchimp Code block) and
preview.html (same email with the photos embedded, for checking).
"""
import base64
import html
import json
import sys
from pathlib import Path

copy = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])

FONT = "Helvetica, Arial, sans-serif"
INK = "#1b1b1b"
MUTED = "#6e6a64"
RULE = "#e4e0da"
LINK = "#1b1b1b"

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
        "alt": "Kitchenette worktop in the Emerald Ghost pattern at Orion's Paris office",
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


def esc(s):
    """Escape text content; apostrophes stay readable for editing in Mailchimp."""
    return html.escape(s, quote=False)


def attr(s):
    return html.escape(s, quote=True)


def paras(text, size=16, color=INK, margin=16):
    blocks = [p.strip() for p in text.split("\n\n") if p.strip()]
    return "".join(
        f'<p style="margin:0 0 {margin}px 0;font-family:{FONT};font-size:{size}px;line-height:1.6;color:{color};">'
        f"{esc(p).replace(chr(10), '<br>')}</p>"
        for p in blocks
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
    rule = "" if last else (
        f'<tr><td style="padding:0 0 36px 0;"><div style="border-top:1px solid {RULE};font-size:0;line-height:0;">&nbsp;</div></td></tr>'
    )
    return f"""
<!-- Case: {esc(c['title'])} -->
<tr><td style="padding:0 0 18px 0;">
{img_note}<a href="{meta['url']}" target="_blank" style="text-decoration:none;"><img src="{src}" width="560" alt="{attr(meta['alt'])}" style="display:block;width:100%;max-width:560px;height:auto;border:0;"></a>
</td></tr>
<tr><td style="padding:0 0 6px 0;font-family:{FONT};font-size:12px;line-height:1.4;letter-spacing:0.06em;text-transform:uppercase;color:{MUTED};">{esc(c['kicker'])}</td></tr>
<tr><td style="padding:0 0 10px 0;font-family:{FONT};font-size:22px;line-height:1.3;font-weight:bold;color:{INK};">{esc(c['title'])}</td></tr>
<tr><td style="padding:0;">{paras(c['body'], margin=12)}</td></tr>
<tr><td style="padding:0 0 14px 0;font-family:{FONT};font-size:13px;line-height:1.6;color:{MUTED};">Pattern: {esc(c['pattern'])}<br>Application: {esc(c['application'])}</td></tr>
<tr><td style="padding:0 0 36px 0;font-family:{FONT};font-size:15px;line-height:1.4;font-weight:bold;">
{note}<a href="{meta['url']}" target="_blank" style="color:{LINK};text-decoration:underline;">{esc(c['link_label'])}</a>
</td></tr>
{rule}"""


def snippet(images):
    cases = copy["cases"]
    body = "".join(case_block(c, images, i == len(cases) - 1) for i, c in enumerate(cases))
    return f"""<!-- Polygood newsletter: four new projects. Paste into a Mailchimp Code block. -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr><td style="padding:32px 20px 8px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:0 0 10px 0;font-family:{FONT};font-size:12px;line-height:1.4;letter-spacing:0.06em;text-transform:uppercase;color:{MUTED};">{esc(copy.get('eyebrow', 'New projects'))}</td></tr>
<tr><td style="padding:0 0 18px 0;font-family:{FONT};font-size:30px;line-height:1.2;font-weight:bold;color:{INK};">{esc(copy['headline'])}</td></tr>
<tr><td style="padding:0 0 20px 0;">{paras(copy['intro'], size=17)}</td></tr>
<tr><td style="padding:0 0 36px 0;"><div style="border-top:2px solid {INK};font-size:0;line-height:0;">&nbsp;</div></td></tr>
{body}
<tr><td style="padding:0 0 36px 0;"><div style="border-top:2px solid {INK};font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td style="padding:0 0 8px 0;">{paras(copy['closing'])}</td></tr>
<tr><td style="padding:4px 0 32px 0;">
<!-- Button: replace the link with your samples or contact page -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="{INK}" style="background:{INK};border-radius:2px;">
<a href="{CTA_URL}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:{FONT};font-size:15px;font-weight:bold;line-height:1;color:#ffffff;text-decoration:none;">{esc(copy['cta_label'])}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 0 32px 0;">{paras(copy['signoff'], size=15)}</td></tr>
</table>
</td></tr>
</table>
"""


code = snippet({})
(out / "mailchimp-code-block.html").write_text(code)

imgdir = out / "images"
data = {}
for key, meta in CASES.items():
    if meta["file"]:
        b64 = base64.b64encode((imgdir / meta["file"]).read_bytes()).decode()
        data[key] = f"data:image/jpeg;base64,{b64}"
    else:
        data[key] = (
            "data:image/svg+xml;base64,"
            + base64.b64encode(
                b'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#ece8e2"/>'
                b'<text x="50%" y="50%" text-anchor="middle" font-family="Helvetica,Arial" font-size="40" fill="#6e6a64">Henriette photo from Notion</text></svg>'
            ).decode()
        )

subject = esc(copy["subject_lines"][0])
preview = esc(copy["preview_text"])
page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Newsletter preview</title></head>
<body style="margin:0;padding:24px 12px;background:#f1eee9;">
<div style="max-width:600px;margin:0 auto 16px auto;font-family:{FONT};font-size:13px;line-height:1.5;color:#444;">
<div><b>Subject:</b> {subject}</div><div><b>Preview text:</b> {preview}</div>
</div>
{snippet(data)}
</body></html>
"""
(out / "preview.html").write_text(page)

words = sum(len(t.split()) for t in [copy["intro"], copy["closing"]] + [c["body"] for c in copy["cases"]])
print("body words:", words)
