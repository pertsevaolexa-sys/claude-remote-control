#!/usr/bin/env python3
"""Build the Polygood Wall Tiles Instagram carousel artboards.

Generates one <Name>.dc.html per slide (1080x1350, Instagram 4:5) plus
canvas.json, for the Claude Design canvas.

Fonts are embedded as base64 woff2 so PNG/PDF exports render with the real
faces instead of a fallback.

    python3 build.py
"""
import base64
import json
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")

W, H = 1080, 1350
GROUND_2 = "#E6E2DA"   # material field ground; keep in sync with --pg-ground-2


def b64(name):
    with open(os.path.join(FONTS, name), "rb") as fh:
        return base64.b64encode(fh.read()).decode("ascii")


# --------------------------------------------------------------------------
# Terrazzo field.
# Polygood is pressed from shredded recycled polystyrene, so the surface reads
# as irregular angular fragments, not dots.  We generate a seamless SVG tile
# of random convex fragments (fixed seed, so the build is reproducible) and
# use it as a repeating background.  Chip colours live in CHIPS below and are
# also emitted as CSS tokens, so the palette swaps in one place.
# --------------------------------------------------------------------------
TILE = 760          # seamless tile size in px (large, so the repeat is hard to read)
N_CHIPS = 300       # fragments per tile, tuned to hold density at this size

# (hex, relative weight) - mostly tonal, with colour used sparingly
CHIPS = [
    ("#8B8275", 10),   # taupe
    ("#A79E90", 9),    # light stone
    ("#6E675C", 7),    # deep taupe
    ("#1C1E21", 6),    # near-black
    ("#C9C2B4", 8),    # pale stone
    ("#FBFAF7", 7),    # chalk white
    ("#2F6B4F", 3),    # green
    ("#B34A33", 3),    # terracotta
    ("#56688A", 2),    # slate blue
    ("#D3A03C", 2),    # ochre
]


def _fragment(rnd, cx, cy, r):
    """One irregular convex fragment as an SVG polygon points string."""
    n = rnd.randint(5, 8)
    rot = rnd.uniform(0, math.tau)
    pts = []
    for i in range(n):
        a = rot + (math.tau * i / n) + rnd.uniform(-0.22, 0.22)
        rr = r * rnd.uniform(0.62, 1.32)
        pts.append("%.1f,%.1f" % (cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return " ".join(pts)


def terrazzo_svg():
    rnd = random.Random(20240917)
    palette = []
    for hexv, wt in CHIPS:
        palette.extend([hexv] * wt)

    body = []
    for _ in range(N_CHIPS):
        cx, cy = rnd.uniform(0, TILE), rnd.uniform(0, TILE)
        # heavily weighted towards small fragments, with a few large ones
        r = rnd.choice([rnd.uniform(3, 7), rnd.uniform(4, 10), rnd.uniform(6, 14),
                        rnd.uniform(9, 19), rnd.uniform(13, 23)])
        fill = rnd.choice(palette)
        op = rnd.uniform(0.72, 0.95)
        # repeat across edges so the tile is seamless
        xs = [0.0]
        ys = [0.0]
        pad = r * 1.45
        if cx < pad:
            xs.append(float(TILE))
        elif cx > TILE - pad:
            xs.append(float(-TILE))
        if cy < pad:
            ys.append(float(TILE))
        elif cy > TILE - pad:
            ys.append(float(-TILE))
        for dx in xs:
            for dy in ys:
                body.append(
                    '<polygon points="%s" fill="%s" fill-opacity="%.2f"/>'
                    % (_fragment(random.Random(int(cx * 1000 + cy)), cx + dx, cy + dy, r),
                       fill, op))

    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
        'viewBox="0 0 %d %d">' % (TILE, TILE, TILE, TILE)
        + '<rect width="%d" height="%d" fill="%s"/>' % (TILE, TILE, GROUND_2)
        + "".join(body)
        + "</svg>"
    )
    return svg


# --------------------------------------------------------------------------
# Brand tokens.  Everything brand-governed lives in this one block: swapping
# in the real values from the Figma brand book is a single edit here plus a
# rebuild.  Current values are a documented interpretation of the Polygood
# look, NOT lifted from the brand book (no editor access at time of build).
# --------------------------------------------------------------------------
TOKENS = """
    /* ==== POLYGOOD BRAND TOKENS =========================================
       PLACEHOLDER VALUES - interpretation, not the brand book.
       Replace with the real palette/type from Figma, then re-run build.py.
       ==================================================================== */
    --pg-ground:      #F2F0EB;   /* warm paper off-white, primary ground   */
    --pg-ground-2:    #E6E2DA;   /* secondary tint, material fields        */
    --pg-ink:         #15171A;   /* near-black, headlines                  */
    --pg-ink-70:      #4E5257;   /* body copy                              */
    --pg-ink-45:      #83878C;   /* tertiary / captions                    */
    --pg-line:        #CDC7BB;   /* hairlines and rules                    */
    --pg-accent:      #2F6B4F;   /* deep green, labels and accents         */
    --pg-accent-soft: #DBE4DD;   /* accent wash                            */
    /* terrazzo fragment colours live in CHIPS in this file */
"""

CSS = """
  @font-face{font-family:'PG Display';font-style:normal;font-weight:400 700;
    font-display:block;src:url(data:font/woff2;base64,__ARCHIVO__) format('woff2');}
  @font-face{font-family:'PG Mono';font-style:normal;font-weight:400;
    font-display:block;src:url(data:font/woff2;base64,__MONO400__) format('woff2');}
  @font-face{font-family:'PG Mono';font-style:normal;font-weight:500;
    font-display:block;src:url(data:font/woff2;base64,__MONO500__) format('woff2');}

  :root{
__TOKENS__
    --pg-sans:'PG Display','Helvetica Neue',Helvetica,Arial,sans-serif;
    --pg-mono:'PG Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace;
  }

  *{box-sizing:border-box;}
  body{margin:0;background:var(--pg-ground);}
  a{color:var(--pg-accent);text-decoration:none;}
  a:hover{color:var(--pg-ink);}

  .slide{
    width:1080px;height:1350px;overflow:hidden;position:relative;
    display:flex;flex-direction:column;
    background:var(--pg-ground);color:var(--pg-ink);
    font-family:var(--pg-sans);
    -webkit-font-smoothing:antialiased;
  }
  .pad{padding:0 84px;}

  /* --- type ----------------------------------------------------------- */
  .label{
    font-family:var(--pg-mono);font-weight:500;font-size:23px;
    letter-spacing:.18em;text-transform:uppercase;color:var(--pg-accent);
    margin:0;
  }
  .h1{font-size:116px;font-weight:600;line-height:.94;letter-spacing:-.038em;margin:0;}
  .h2{font-size:78px;font-weight:600;line-height:1.02;letter-spacing:-.032em;margin:0;}
  .body{
    font-size:33px;font-weight:400;line-height:1.45;letter-spacing:-.004em;
    color:var(--pg-ink-70);margin:0;max-width:830px;text-wrap:pretty;
  }
  .lede{font-size:37px;line-height:1.38;color:var(--pg-ink-70);margin:0;max-width:830px;}
  .mono{font-family:var(--pg-mono);font-weight:400;}

  /* --- structure ------------------------------------------------------ */
  .head{display:flex;flex-direction:column;gap:34px;padding-top:84px;}
  .figure{flex:1 1 auto;min-height:0;position:relative;overflow:hidden;}
  .foot{
    display:flex;justify-content:space-between;align-items:center;
    padding-top:26px;padding-bottom:70px;
    font-family:var(--pg-mono);font-weight:400;font-size:22px;
    letter-spacing:.12em;text-transform:uppercase;color:var(--pg-ink-45);
    border-top:2px solid var(--pg-line);margin-top:34px;
  }
  .wordmark{
    font-family:var(--pg-sans);font-weight:600;font-size:26px;
    letter-spacing:.02em;text-transform:none;color:var(--pg-ink);
  }

  /* --- material fields ------------------------------------------------ */
  .terrazzo{
    position:absolute;inset:0;
    background-color:var(--pg-ground-2);
    background-image:url("./terrazzo.svg");
    background-size:760px 760px;
  }
  /* machined V-groove field: dark cut + lit edge */
  .grooves{
    position:absolute;inset:0;
    background-image:
      repeating-linear-gradient(90deg,
        transparent 0 168px,
        rgba(21,23,26,.42) 168px 171px,
        rgba(255,255,255,.36) 171px 175px,
        transparent 175px 176px),
      repeating-linear-gradient(0deg,
        transparent 0 168px,
        rgba(21,23,26,.42) 168px 171px,
        rgba(255,255,255,.36) 171px 175px,
        transparent 175px 176px);
  }
  .edge{position:absolute;inset:0;box-shadow:inset 0 0 0 2px rgba(21,23,26,.14);}

  /* --- slide 2: conventional tile + grout ------------------------------ */
  .grout{
    position:absolute;inset:0;overflow:hidden;
    background-color:#8E8574;
    background-image:
      radial-gradient(ellipse 250px 160px at 22% 34%, rgba(44,36,24,.74) 0 38%, transparent 100%),
      radial-gradient(ellipse 290px 180px at 76% 70%, rgba(44,36,24,.68) 0 34%, transparent 100%),
      radial-gradient(ellipse 210px 140px at 52% 8%,  rgba(44,36,24,.52) 0 34%, transparent 100%),
      radial-gradient(ellipse 230px 150px at 9%  88%, rgba(44,36,24,.58) 0 34%, transparent 100%);
    display:grid;grid-template-columns:repeat(6,minmax(0,1fr));
    grid-auto-rows:164px;gap:14px;padding:14px;
  }
  .grout .t{background:#EFECE5;box-shadow:inset 0 0 0 1px rgba(21,23,26,.06);}

  /* --- lists and spec table ------------------------------------------- */
  .feed{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
    gap:18px 40px;margin:0;padding:0;list-style:none;
  }
  .feed li{
    font-family:var(--pg-mono);font-size:27px;letter-spacing:-.01em;
    color:var(--pg-ink);display:flex;gap:16px;align-items:baseline;
  }
  .feed .b{color:var(--pg-accent);}
  .spec{display:flex;flex-direction:column;gap:0;}
  .spec .row{
    display:flex;justify-content:space-between;align-items:baseline;gap:30px;
    padding:29px 0;border-bottom:2px solid var(--pg-line);
  }
  .spec .k{
    font-family:var(--pg-mono);font-weight:500;font-size:23px;letter-spacing:.16em;
    text-transform:uppercase;color:var(--pg-ink-45);white-space:nowrap;
  }
  .spec .v{
    font-family:var(--pg-sans);font-weight:600;font-size:42px;letter-spacing:-.028em;
    color:var(--pg-ink);text-align:right;
  }
  .spec .v small{
    display:block;font-family:var(--pg-mono);font-weight:400;font-size:22px;
    letter-spacing:.02em;color:var(--pg-ink-45);margin-top:6px;
  }
  .proof{display:flex;flex-direction:column;gap:34px;}
  .proof .item{display:flex;gap:26px;align-items:flex-start;}
  .proof .n{
    font-family:var(--pg-mono);font-weight:500;font-size:23px;color:var(--pg-accent);
    letter-spacing:.14em;padding-top:12px;
  }
  .proof .t{font-size:41px;font-weight:600;letter-spacing:-.028em;line-height:1.12;margin:0;}
  .proof .d{font-size:28px;line-height:1.4;color:var(--pg-ink-70);margin:8px 0 0;max-width:700px;}
  .tags{display:flex;flex-wrap:wrap;gap:14px;}
  .tags span{
    font-family:var(--pg-mono);font-size:25px;letter-spacing:.02em;color:var(--pg-ink);
    border:2px solid var(--pg-line);border-radius:999px;padding:11px 24px;
  }
  .cta{
    display:inline-flex;align-items:center;gap:18px;align-self:flex-start;
    background:var(--pg-ink);color:var(--pg-ground);
    font-family:var(--pg-mono);font-weight:500;font-size:27px;letter-spacing:.08em;
    text-transform:uppercase;padding:26px 40px;
  }
  .swipe{display:flex;align-items:center;gap:13px;}

  /* --- engraving swatches (slide 08) ---------------------------------- */
  .swatches{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
    gap:26px 26px;height:100%;
  }
  .sw{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;}
  .sw .field{position:absolute;inset:0;}
  .sw .cap{
    position:relative;font-family:var(--pg-mono);font-weight:500;font-size:21px;
    letter-spacing:.1em;text-transform:uppercase;color:var(--pg-ink);
    background:var(--pg-ground);padding:12px 16px;align-self:flex-start;margin:14px;
  }

  /* --- thickness bars (slide 07) --------------------------------------- */
  .gauge{display:flex;flex-direction:column;justify-content:center;gap:58px;height:100%;}
  .gauge .g{display:flex;align-items:center;gap:30px;}
  .gauge .bar{position:relative;overflow:hidden;flex:1 1 auto;
    box-shadow:inset 0 0 0 2px rgba(21,23,26,.16);}
  .gauge .k{
    font-family:var(--pg-mono);font-weight:500;font-size:30px;letter-spacing:-.01em;
    color:var(--pg-ink);width:132px;flex:0 0 132px;
  }
  /* the tag sits inside the bar so all three bars keep an identical width
     and the thickness comparison stays honest */
  .gauge .tag{
    position:absolute;right:18px;top:50%;transform:translateY(-50%);
    font-family:var(--pg-mono);font-weight:500;font-size:20px;letter-spacing:.1em;
    text-transform:uppercase;color:var(--pg-ink);background:var(--pg-ground);
    padding:7px 14px;white-space:nowrap;
  }
"""

ARROW = ('<svg width="30" height="14" viewBox="0 0 30 14" fill="none" '
         'aria-hidden="true"><path d="M1 7h26M21.5 1.5 27.5 7l-6 5.5" '
         'stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>')


def engraving(kind, w=420, h=300):
    """An inline SVG of one machined groove pattern, drawn over the material."""
    L = []
    st = 'stroke="rgba(21,23,26,.42)" stroke-width="3"'
    hl = 'stroke="rgba(255,255,255,.34)" stroke-width="3"'
    if kind == "grid":
        for x in range(0, w + 1, 60):
            L += ['<line x1="%d" y1="0" x2="%d" y2="%d" %s/>' % (x, x, h, st),
                  '<line x1="%d" y1="0" x2="%d" y2="%d" %s/>' % (x + 3, x + 3, h, hl)]
        for y in range(0, h + 1, 60):
            L += ['<line x1="0" y1="%d" x2="%d" y2="%d" %s/>' % (y, w, y, st),
                  '<line x1="0" y1="%d" x2="%d" y2="%d" %s/>' % (y + 3, w, y + 3, hl)]
    elif kind == "bond":
        row = 0
        for y in range(0, h + 1, 60):
            L += ['<line x1="0" y1="%d" x2="%d" y2="%d" %s/>' % (y, w, y, st),
                  '<line x1="0" y1="%d" x2="%d" y2="%d" %s/>' % (y + 3, w, y + 3, hl)]
            off = -70 if row % 2 == 0 else -140
            for x in range(off, w + 141, 140):
                L += ['<line x1="%d" y1="%d" x2="%d" y2="%d" %s/>' % (x, y, x, y + 60, st),
                      '<line x1="%d" y1="%d" x2="%d" y2="%d" %s/>' % (x + 3, y, x + 3, y + 60, hl)]
            row += 1
    elif kind == "flute":
        for x in range(0, w + 1, 32):
            L += ['<line x1="%d" y1="0" x2="%d" y2="%d" %s/>' % (x, x, h, st),
                  '<line x1="%d" y1="0" x2="%d" y2="%d" %s/>' % (x + 3, x + 3, h, hl)]
    elif kind == "diagonal":
        for i in range(-h, w + h + 1, 54):
            L += ['<line x1="%d" y1="%d" x2="%d" y2="0" %s/>' % (i, h, i + h, st),
                  '<line x1="%d" y1="%d" x2="%d" y2="0" %s/>' % (i + 3, h, i + h + 3, hl)]
    return ('<svg class="field" xmlns="http://www.w3.org/2000/svg" '
            'viewBox="0 0 %d %d" preserveAspectRatio="none" '
            'width="100%%" height="100%%">%s</svg>' % (w, h, "".join(L)))


def swatch(kind, caption):
    return ('<div class="sw"><div class="field terrazzo"></div>%s'
            '<span class="cap">%s</span></div>' % (engraving(kind), caption))


def foot(num, right_html):
    return (
        '<div class="foot pad">'
        '<span>' + num + ' / 09</span>'
        '<span>' + right_html + '</span>'
        '</div>'
    )


# --------------------------------------------------------------------------
# Slides
# --------------------------------------------------------------------------
SLIDES = []

# ---- 01 cover -------------------------------------------------------------
SLIDES.append(("Main", """
<div class="slide">
  <div class="head pad" style="gap:38px;">
    <p class="label">Polygood&#174;</p>
    <h1 class="h1">Wall Tiles<br>are here.</h1>
  </div>
  <div class="figure" style="margin-top:56px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("01", '<span class="swipe">Swipe ' + ARROW + '</span>') + """
</div>
"""))

# ---- 02 what it is --------------------------------------------------------
SLIDES.append(("WhatItIs", """
<div class="slide">
  <div class="head pad">
    <p class="label">01 &#8212; What it is</p>
    <h2 class="h2">Large-format panels,<br>tile pattern cut<br>into the surface.</h2>
    <p class="body">100% recycled polystyrene, engraved by CNC until the field
      reads as tile.</p>
  </div>
  <div class="figure" style="margin-top:50px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("02", "100% recycled polystyrene") + """
</div>
"""))

# ---- 03 the news ----------------------------------------------------------
SLIDES.append(("Texture", """
<div class="slide">
  <div class="head pad">
    <p class="label">02 &#8212; What&#39;s new</p>
    <h2 class="h2">Our first surface<br>with real,<br>physical texture.</h2>
    <p class="body">Until now the pattern came from the material&#39;s own
      speckle. Engraving opens a whole new design language for Polygood.</p>
  </div>
  <div class="figure" style="margin-top:50px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("03", "A new design language") + """
</div>
"""))

# ---- 04 no grout ----------------------------------------------------------
SLIDES.append(("NoGrout", """
<div class="slide">
  <div class="head pad">
    <p class="label">03 &#8212; No grout</p>
    <h2 class="h2">A wall that appears<br>to have a hundred<br>joints has none.</h2>
    <p class="body">The grooves are precision-machined into a full slab. The
      panel underneath stays continuous, so there is no grout anywhere in it.</p>
  </div>
  <div class="figure" style="margin-top:50px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("04", "One continuous sheet") + """
</div>
"""))

# ---- 05 how it behaves ----------------------------------------------------
SLIDES.append(("Behaves", """
<div class="slide">
  <div class="head pad">
    <p class="label">04 &#8212; How it behaves</p>
    <h2 class="h2" style="font-size:70px;">Installs like a panel.<br>Performs like a<br>solid surface.<br>Reads like tile.</h2>
  </div>
  <div class="figure" style="margin-top:50px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("05", "Panel / solid surface / tile") + """
</div>
"""))

# ---- 06 through-colour ----------------------------------------------------
SLIDES.append(("ThroughColour", """
<div class="slide">
  <div class="head pad">
    <p class="label">05 &#8212; Through-colour</p>
    <h2 class="h2" style="font-size:72px;">A trolley knock<br>shows the same<br>colour underneath.</h2>
    <p class="body">Solid and through-colour with no surface coatings, so impact
      damage never exposes a substrate.</p>
  </div>
  <div class="figure" style="margin-top:50px;">
    <div class="terrazzo"></div>
    <div class="edge"></div>
  </div>
""" + foot("06", "No coatings, no substrate") + """
</div>
"""))

# ---- 07 thickness ---------------------------------------------------------
SLIDES.append(("Thickness", """
<div class="slide">
  <div class="head pad">
    <p class="label">06 &#8212; Thickness</p>
    <h2 class="h2">6, 8 and 12 mm.</h2>
    <p class="body">Specify by exposure. 12 mm is made for high-impact
      environments.</p>
  </div>
  <div class="figure pad" style="margin-top:20px;">
    <div class="gauge">
      <div class="g">
        <span class="k">6 mm</span>
        <span class="bar" style="height:54px;"><span class="terrazzo"></span></span>
      </div>
      <div class="g">
        <span class="k">8 mm</span>
        <span class="bar" style="height:72px;"><span class="terrazzo"></span></span>
      </div>
      <div class="g">
        <span class="k">12 mm</span>
        <span class="bar" style="height:108px;"><span class="terrazzo"></span><span class="tag">High impact</span></span>
      </div>
    </div>
  </div>
""" + foot("07", "Solid through the full thickness") + """
</div>
"""))

# ---- 08 launch engravings -------------------------------------------------
SLIDES.append(("Engravings", """
<div class="slide">
  <div class="head pad">
    <p class="label">07 &#8212; At launch</p>
    <h2 class="h2">Four engravings.</h2>
  </div>
  <div class="figure pad" style="margin-top:44px;padding-bottom:8px;">
    <div class="swatches">
""" + swatch("grid", "[Engraving 1]") + swatch("bond", "[Engraving 2]")
    + swatch("flute", "[Engraving 3]") + swatch("diagonal", "[Engraving 4]") + """
    </div>
  </div>
""" + foot("08", "Names and patterns to confirm") + """
</div>
"""))

# ---- 09 custom + CTA ------------------------------------------------------
SLIDES.append(("Custom", """
<div class="slide">
  <div class="head pad">
    <p class="label">08 &#8212; Beyond those</p>
    <h2 class="h2">The pattern<br>can be yours.</h2>
    <p class="body">Custom engraving works the way custom patterns have always
      worked at Polygood. Send us your brief and we&#39;ll create a bespoke
      engraving for your project.</p>
    <div class="cta">polygood.com</div>
  </div>
  <div class="figure" style="margin-top:46px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("09", '<span class="wordmark">Polygood&#174;</span>') + """
</div>
"""))


# --------------------------------------------------------------------------
# Emit
# --------------------------------------------------------------------------
def main():
    # the terrazzo field is a canvas asset, referenced by filename from CSS,
    # so the 8 artboards share one copy instead of embedding it eight times
    with open(os.path.join(HERE, "terrazzo.svg"), "w", encoding="utf-8") as fh:
        fh.write(terrazzo_svg())

    css = (CSS
           .replace("__TOKENS__", TOKENS.rstrip("\n"))
           .replace("__ARCHIVO__", b64("archivo-var-latin.woff2"))
           .replace("__MONO400__", b64("plexmono-400-latin.woff2"))
           .replace("__MONO500__", b64("plexmono-500-latin.woff2"))
           )

    for name, body in SLIDES:
        doc = (
            "<!doctype html>\n<html>\n<head>\n"
            '  <meta charset="utf-8">\n'
            '  <script src="./support.js"></script>\n'
            "</head>\n<body>\n<x-dc>\n"
            "<helmet>\n  <style>" + css + "  </style>\n</helmet>\n"
            + body.strip() + "\n"
            "</x-dc>\n</body>\n</html>\n"
        )
        path = os.path.join(HERE, name + ".dc.html")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(doc)
        print("wrote %-22s %6.1f KB" % (name + ".dc.html", len(doc) / 1024.0))

    # canvas layout: two rows of four, reading order left to right
    boards = []
    for i, (name, _) in enumerate(SLIDES):
        col, row = i % 5, i // 5
        boards.append({
            "file": name + ".dc.html",
            "x": col * (W + 120),
            "y": row * (H + 200),
            "w": W, "h": H,
            "title": "%02d  %s" % (i + 1, name),
        })
    canvas = {
        "artboards": boards,
        "annotations": [{
            "id": "brand-note",
            "x": 0, "y": -190, "w": 900,
            "text": ("Polygood Wall Tiles - Instagram carousel, 9 x 1080x1350.\n"
                     "Colours and type are a placeholder interpretation, not the "
                     "Figma brand book. Swap the token block at the top of "
                     "build.py and re-run to apply the real brand values."),
        }],
        "launch": {"view": "canvas"},
    }
    with open(os.path.join(HERE, "canvas.json"), "w", encoding="utf-8") as fh:
        json.dump(canvas, fh, indent=2)
    print("wrote canvas.json (%d artboards)" % len(boards))


if __name__ == "__main__":
    main()
