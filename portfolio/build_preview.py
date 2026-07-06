#!/usr/bin/env python3
"""Merge the multi-page portfolio/ into ONE self-contained, hash-routed HTML
preview (all assets inlined as data URIs) so it can be published as an Artifact
and viewed live without deploying to Vercel. Re-runnable on every iteration."""
import re, base64, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
OUT  = ROOT / 'portfolio_preview.html'

MIME = {'.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}

def data_uri(relpath):
    p = ROOT / relpath
    b = p.read_bytes()
    mime = MIME.get(p.suffix.lower(), 'application/octet-stream')
    return 'data:%s;base64,%s' % (mime, base64.b64encode(b).decode())

def inline_assets(html):
    # replace every portfolio_light_assets/... reference with a data URI
    def repl(m):
        rel = m.group(0).lstrip('./')          # drop any leading ../ or ./
        if not rel.startswith('portfolio_light_assets'):
            rel = 'portfolio_light_assets' + rel.split('portfolio_light_assets',1)[1]
        try:
            return data_uri(rel)
        except FileNotFoundError:
            return m.group(0)
    return re.sub(r'(?:\.\./)*portfolio_light_assets/[^"\')\s]+', repl, html)

def body_inner(html):
    m = re.search(r'<body[^>]*>(.*)</body>', html, re.S)
    inner = m.group(1)
    # drop the per-page external <script src="…site.js"> — the merged file has its
    # own single combined runtime script, so these would double-bind every handler.
    inner = re.sub(r'<script[^>]*\bsrc="[^"]*"[^>]*>\s*</script>', '', inner)
    return inner

def get_style(html):
    m = re.search(r'<style[^>]*>(.*?)</style>', html, re.S)
    return m.group(1) if m else ''

CASES = [
    '01-museum-connections','02-what-matters-platform','03-leleka-eurovision',
    '04-lumosa-sustainability','05-conscious-toolkit','06-tomorrows-leadership',
]

idx_html  = (ROOT/'index.html').read_text()
case_htmls = {c: (ROOT/'cases'/(c+'.html')).read_text() for c in CASES}

# --- shared style: index base + the scroll-gallery override from a case page ---
base_css = get_style(idx_html)
case_css = get_style(case_htmls[CASES[0]])
# the case CSS extends the base with plate-frame fit + horizontal scroll + scroll-hint;
# pull only the lines that differ (everything after the base's closing is appended in build).
# Simplest & safe: use case CSS as the full stylesheet (it is a superset of base for our needs)
# but index-only selectors (.hero-tile etc.) also live in base — case pages share the same
# token/base block, so case_css already contains all shared rules. Use case_css as the sheet
# and additionally include any index-only rules missing from it.
sheet = case_css
# capture @media blocks atomically (one level of nesting) OR plain rules, so
# index-only media queries survive intact instead of being split on their braces.
for chunk in re.findall(r'@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}|[^{}]+\{[^{}]*\}', base_css):
    if chunk.lstrip().startswith('@media'):
        if chunk not in sheet:
            sheet += chunk
    else:
        sel = chunk.split('{')[0].strip()
        if sel and sel not in sheet:
            sheet += chunk

# route display rules + keep only active section visible
sheet += ('\n.route{display:none}.route.is-active{display:block}'
          'html{scroll-behavior:smooth}')

# --- inline fonts into the sheet ---
sheet = inline_assets(sheet)

# --- build each route section from page body ---
def make_section(route, html, is_home):
    inner = body_inner(html)
    inner = inline_assets(inner)
    if is_home:
        # index case-card links -> hash routes
        inner = re.sub(r'href="cases/(\d\d)-[^"]+\.html"',
                       lambda m: 'href="#case-%s"' % m.group(1), inner)
    else:
        # case prev/next sibling links -> hash routes
        inner = re.sub(r'href="(\d\d)-[^"]+\.html"',
                       lambda m: 'href="#case-%s"' % m.group(1), inner)
        # links back to index (with or without anchor)
        inner = re.sub(r'href="\.\./index\.html#([a-z]+)"', r'href="#\1"', inner)
        inner = inner.replace('href="../index.html"', 'href="#home"')
        # strip duplicate ids that collide with the home section (keep mbstats)
        inner = re.sub(r'\sid="top"', '', inner)
        inner = re.sub(r'\sid="contact"', '', inner)
    cls = 'route is-active' if is_home else 'route'
    return '<section class="%s" data-route="%s">%s</section>' % (cls, route, route)  # placeholder

sections = []
sections.append('<section class="route is-active" data-route="home">%s</section>'
                % inline_assets(_home_inner := re.sub(r'href="cases/(\d\d)-[^"]+\.html"',
                    lambda m: 'href="#case-%s"' % m.group(1), body_inner(idx_html))))
for c in CASES:
    n = c[:2]
    h = case_htmls[c]
    inner = body_inner(h)
    inner = re.sub(r'href="(\d\d)-[^"]+\.html"', lambda m: 'href="#case-%s"' % m.group(1), inner)
    inner = re.sub(r'href="\.\./index\.html#([a-z]+)"', r'href="#\1"', inner)
    inner = inner.replace('href="../index.html"', 'href="#home"')
    inner = re.sub(r'\sid="top"', '', inner)
    inner = re.sub(r'\sid="contact"', '', inner)
    inner = inline_assets(inner)
    sections.append('<section class="route" data-route="case-%s">%s</section>' % (n, inner))

# --- combined runtime script (router + stats + lightbox + drag-scroll) ---
SCRIPT = r"""
<script>
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var routes={};
  document.querySelectorAll('.route').forEach(function(s){routes[s.getAttribute('data-route')]=s;});
  function show(name){
    Object.keys(routes).forEach(function(k){routes[k].classList.toggle('is-active',k===name);});
  }
  function route(){
    var h=(location.hash||'').replace('#','');
    var target='home',anchor=null;
    if(/^case-0[1-6]$/.test(h)) target=h;
    else if(h===''||h==='home'||h==='top') target='home';
    else { target='home'; anchor=h; }
    show(target);
    if(target==='home'&&anchor&&routes.home.querySelector('#'+anchor)){
      var el=routes.home.querySelector('#'+anchor);
      var y=el.getBoundingClientRect().top+window.pageYOffset-64;
      window.scrollTo({top:y,behavior:reduce?'auto':'smooth'});
    } else { window.scrollTo(0,0); }
  }
  window.addEventListener('hashchange',route);
  route();

  // animated stats
  var stats=document.getElementById('mbstats');
  function fmt(v,p){var s=Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');return p?s+'+':s;}
  if(stats){var ran=false;function run(){if(ran)return;ran=true;stats.querySelectorAll('.stat-n').forEach(function(el){var tg=parseInt(el.getAttribute('data-n'),10),p=el.hasAttribute('data-plus');if(reduce){el.textContent=fmt(tg,p);return;}var t0=null;function step(ts){if(!t0)t0=ts;var pr=Math.min((ts-t0)/1200,1),e=1-Math.pow(1-pr,3);el.textContent=fmt(tg*e,p);if(pr<1)requestAnimationFrame(step);}requestAnimationFrame(step);});}
    if('IntersectionObserver' in window){var so=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){run();}});},{threshold:.3});so.observe(stats);}else{run();}}

  // lightbox (scoped to the clicked image's section)
  var allImgs=[].slice.call(document.querySelectorAll('.plate img.media-asset'));
  if(allImgs.length){
    var lb=document.createElement('div');lb.className='lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Image viewer');
    lb.innerHTML='<button class="lb-close" aria-label="Close viewer">Close ×</button><button class="lb-prev" aria-label="Previous image">←</button><img alt=""><button class="lb-next" aria-label="Next image">→</button><div class="lb-bar"><span class="lbcap"></span><span class="lbc"></span></div>';
    document.body.appendChild(lb);
    var im=lb.querySelector('img'),cap=lb.querySelector('.lbcap'),cnt=lb.querySelector('.lbc'),group=[],gi=0,lf=null;
    function cof(x){var f=x.closest('figure');var c=f&&f.querySelector('figcaption');return c?c.textContent:(x.alt||'');}
    function op(i){gi=i;im.src=group[gi].currentSrc||group[gi].src;im.alt=group[gi].alt||'';cap.textContent=cof(group[gi]);cnt.textContent=(gi+1)+' / '+group.length;lb.classList.add('open');lb.querySelector('.lb-close').focus();}
    function mv(d){op((gi+d+group.length)%group.length);}
    function cl(){lb.classList.remove('open');im.removeAttribute('src');if(lf&&lf.focus)lf.focus();}
    allImgs.forEach(function(x){x.addEventListener('click',function(){var sec=x.closest('.route');group=[].slice.call(sec.querySelectorAll('.plate img.media-asset'));lf=document.activeElement;op(group.indexOf(x));});});
    lb.querySelector('.lb-prev').addEventListener('click',function(e){e.stopPropagation();mv(-1);});
    lb.querySelector('.lb-next').addEventListener('click',function(e){e.stopPropagation();mv(1);});
    lb.querySelector('.lb-close').addEventListener('click',function(e){e.stopPropagation();cl();});
    im.addEventListener('click',cl);
    lb.addEventListener('click',function(e){if(e.target===lb)cl();});
    document.addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;if(e.key==='Escape')cl();if(e.key==='ArrowRight')mv(1);if(e.key==='ArrowLeft')mv(-1);});
  }

  // horizontal drag-to-scroll galleries + scroll hint
  document.querySelectorAll('.plates-grid').forEach(function(g){
    if(g.querySelectorAll('.plate').length>1){
      var hint=document.createElement('p');hint.className='scroll-hint container';hint.textContent='Scroll / swipe →';
      g.parentNode.insertBefore(hint,g);
    }
    var down=false,sx=0,sl=0,moved=false;
    g.addEventListener('pointerdown',function(e){if(e.pointerType==='touch')return;down=true;moved=false;sx=e.clientX;sl=g.scrollLeft;g.classList.add('dragging');});
    window.addEventListener('pointerup',function(){if(down){down=false;g.classList.remove('dragging');}});
    g.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-sx;if(Math.abs(dx)>4)moved=true;g.scrollTo({left:sl-dx,behavior:'auto'});});
    g.addEventListener('click',function(e){if(moved){e.stopPropagation();e.preventDefault();moved=false;}},true);
  });

  // scroll-reveal for editorial sections
  if(!reduce&&'IntersectionObserver' in window){
    var rev=[].slice.call(document.querySelectorAll('.statement-grid,.section-head,.work-grid,.dark-grid'));
    rev.forEach(function(el){el.classList.add('reveal-init');});
    var ro=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('reveal-in');ro.unobserve(x.target);}});},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
    rev.forEach(function(el){ro.observe(el);});
  }
})();
</script>
"""

doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
       '<meta name="viewport" content="width=device-width,initial-scale=1">'
       '<title>Oleksandra Pertseva — Portfolio</title><style>%s</style></head>'
       '<body id="top">%s%s</body></html>') % (sheet, '\n'.join(sections), SCRIPT)

OUT.write_text(doc)
kb = len(doc.encode())/1024
print('wrote', OUT, '%.0f KB' % kb)
print('sections:', len(sections))
print('remaining external asset refs:', len(re.findall(r'portfolio_light_assets/', doc)))
print('remaining .html file links:', len(re.findall(r'\.html"', doc)))
