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
"""

ARROW = ('<svg width="30" height="14" viewBox="0 0 30 14" fill="none" '
         'aria-hidden="true"><path d="M1 7h26M21.5 1.5 27.5 7l-6 5.5" '
         'stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>')


def foot(num, right_html):
    return (
        '<div class="foot pad">'
        '<span>' + num + ' / 08</span>'
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
    <p class="label">Polygood&#174; Wall Tiles</p>
    <h1 class="h1">Tile,<br>without<br>the grout.</h1>
  </div>
  <div class="figure" style="margin-top:56px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("01", '<span class="swipe">Swipe ' + ARROW + '</span>') + """
</div>
"""))

# ---- 02 problem -----------------------------------------------------------
SLIDES.append(("Problem", """
<div class="slide">
  <div class="head pad">
    <p class="label">01 &#8212; The problem</p>
    <h2 class="h2">Every grout line<br>is a maintenance<br>contract.</h2>
    <p class="body">Joints hold moisture. They discolour, they collect
      build-up, and eventually they get re-done. In a hotel bathroom or a
      busy washroom, that cycle starts the week you hand over.</p>
  </div>
  <div class="figure" style="margin-top:52px;">
    <div class="grout">
      <div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div>
      <div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div>
      <div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div>
      <div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div>
      <div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div><div class="t"></div>
    </div>
    <div class="edge"></div>
  </div>
""" + foot("02", "Conventional tile assembly") + """
</div>
"""))

# ---- 03 the move ----------------------------------------------------------
SLIDES.append(("Solution", """
<div class="slide">
  <div class="head pad">
    <p class="label">02 &#8212; The move</p>
    <h2 class="h2">So the tile is<br>machined into<br>the slab.</h2>
    <p class="body">Grooves are CNC-cut into a single 2800 &#215; 1400 mm
      panel. You get a continuous tiled field with the joint pattern you
      specified, and no grout left to fail.</p>
  </div>
  <div class="figure" style="margin-top:52px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("03", "One panel, no joints") + """
</div>
"""))

# ---- 04 material ----------------------------------------------------------
SLIDES.append(("Material", """
<div class="slide">
  <div class="head pad">
    <p class="label">03 &#8212; The material</p>
    <h2 class="h2">100% recycled<br>polystyrene.</h2>
    <p class="body">Post-consumer and post-industrial waste, sorted and
      pressed into a solid surface:</p>
    <ul class="feed">
      <li><span class="b">/</span> Refrigerator insulation</li>
      <li><span class="b">/</span> Electronics housings</li>
      <li><span class="b">/</span> CD cases</li>
      <li><span class="b">/</span> Food containers</li>
      <li><span class="b">/</span> Toys</li>
      <li><span class="b">/</span> Building components</li>
    </ul>
  </div>
  <div class="figure" style="margin-top:48px;">
    <div class="terrazzo"></div>
    <div class="edge"></div>
  </div>
""" + foot("04", "Waste stream, visible") + """
</div>
"""))

# ---- 05 spec --------------------------------------------------------------
SLIDES.append(("Spec", """
<div class="slide">
  <div class="head pad">
    <p class="label">04 &#8212; Specification</p>
    <h2 class="h2">The numbers.</h2>
  </div>
  <div class="figure pad" style="margin-top:44px;">
    <div class="spec" style="height:100%;justify-content:space-between;">
      <div class="row">
        <span class="k">Panel</span>
        <span class="v">2800 &#215; 1400 mm<small>110 &#215; 55 in</small></span>
      </div>
      <div class="row">
        <span class="k">Thickness</span>
        <span class="v">12 or 19 mm</span>
      </div>
      <div class="row">
        <span class="k">Weight</span>
        <span class="v">50&#8211;78 kg<small>110&#8211;172 lb per panel</small></span>
      </div>
      <div class="row">
        <span class="k">Palette</span>
        <span class="v">50+ colourways</span>
      </div>
      <div class="row" style="border-bottom:none;">
        <span class="k">Surface</span>
        <span class="v">CNC-machined<small>groove field, pattern to order</small></span>
      </div>
    </div>
  </div>
""" + foot("05", "Full guide at polygood.com") + """
</div>
"""))

# ---- 06 application -------------------------------------------------------
SLIDES.append(("Application", """
<div class="slide">
  <div class="head pad">
    <p class="label">05 &#8212; Where it works</p>
    <h2 class="h2">Wet zones and<br>high traffic.</h2>
    <div class="tags">
      <span>Bathrooms</span><span>Kitchens</span><span>Hospitality</span>
      <span>Offices</span><span>Reception</span><span>Public space</span>
    </div>
    <p class="body">Waterproof, hard-wearing and light enough to handle on
      site. It cuts and shapes with standard woodworking tools.</p>
  </div>
  <div class="figure" style="margin-top:48px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("06", "Specified surface") + """
</div>
"""))

# ---- 07 circularity -------------------------------------------------------
SLIDES.append(("Circularity", """
<div class="slide">
  <div class="head pad">
    <p class="label">06 &#8212; Circularity</p>
    <h2 class="h2">Certified,<br>not claimed.</h2>
  </div>
  <div class="figure pad" style="margin-top:52px;">
    <div class="proof" style="height:100%;justify-content:space-between;padding-bottom:24px;">
      <div class="item">
        <span class="n">01</span>
        <div>
          <p class="t">Cradle to Cradle Certified&#174; Bronze</p>
          <p class="d">The first material of its kind to reach it.</p>
        </div>
      </div>
      <div class="item">
        <span class="n">02</span>
        <div>
          <p class="t">Verified EPD</p>
          <p class="d">A published Environmental Product Declaration, so the
            impact figures can be checked rather than taken on trust.</p>
        </div>
      </div>
      <div class="item">
        <span class="n">03</span>
        <div>
          <p class="t">100% recyclable</p>
          <p class="d">At end of life the panel goes back in and becomes the
            next panel.</p>
        </div>
      </div>
    </div>
  </div>
""" + foot("07", "The Good Plastic Company") + """
</div>
"""))

# ---- 08 CTA ---------------------------------------------------------------
SLIDES.append(("Samples", """
<div class="slide">
  <div class="head pad">
    <p class="label">Polygood&#174; Wall Tiles</p>
    <h2 class="h2">Order a<br>sample box.</h2>
    <p class="lede">Fifty-plus colourways read differently in daylight. Get
      them on the desk before you specify.</p>
    <div class="cta">polygood.com</div>
  </div>
  <div class="figure" style="margin-top:52px;">
    <div class="terrazzo"></div>
    <div class="grooves"></div>
    <div class="edge"></div>
  </div>
""" + foot("08", '<span class="wordmark">Polygood&#174;</span>') + """
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
        col, row = i % 4, i // 4
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
            "text": ("Polygood Wall Tiles - Instagram carousel, 8 x 1080x1350.\n"
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
