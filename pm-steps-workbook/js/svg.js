/* PM Steps Workbook: SVG drawing helpers and the two figure palettes.
 *
 * Every graphic in the workbook is an SVG string built from these helpers. Graphics take a
 * palette (PM.pal.light or PM.pal.dark) and use only its colours, so the same function draws
 * the on-screen figure in the viewer's theme and the light figure that goes into Word.
 * Text uses the system sans stack and is measured with canvas, so wrapping matches what the
 * browser draws, including when the SVG is rasterised to PNG for the Word export.
 */
(function () {
  'use strict';
  const PM = (window.PM = window.PM || {});

  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

  // Chart series: the validated categorical order from the dataviz reference palette.
  // Status colours are reserved for good / warning / serious / critical and never used as series.
  PM.pal = {
    light: {
      mode: 'light',
      bg: '#FFFFFF', ink: '#18201D', ink2: '#47524D', muted: '#6E7A74',
      line: '#D8DDD6', grid: '#E8EBE5', axis: '#B9C1B9',
      box: '#F2F5F1', boxLine: '#C5CEC5',
      accent: '#0B6E63', accentSoft: '#D9EEEA', accentInk: '#FFFFFF',
      strong: '#1E2B28', strongInk: '#FFFFFF',
      mile: '#B7791F', mileSoft: '#F6E8CF',
      crit: '#C0392B', critSoft: '#F7DCD8',
      good: '#2E7D32', goodSoft: '#DDEEDD',
      warn: '#B7791F', warnSoft: '#F6E8CF',
      series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
      status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
    },
    dark: {
      mode: 'dark',
      bg: '#1A1F1E', ink: '#E8ECEA', ink2: '#B8C2BD', muted: '#8A9590',
      line: '#33403C', grid: '#262E2B', axis: '#3E4945',
      box: '#232B29', boxLine: '#3E4945',
      accent: '#3FB5A5', accentSoft: '#173A36', accentInk: '#0B1513',
      strong: '#D5DDD9', strongInk: '#121615',
      mile: '#E0A84A', mileSoft: '#3A2E17',
      crit: '#E06C5E', critSoft: '#3D201D',
      good: '#5CB85F', goodSoft: '#1C3320',
      warn: '#E0A84A', warnSoft: '#3A2E17',
      series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
      status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
    },
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function attrs(o) {
    let out = '';
    for (const k in o) {
      const v = o[k];
      if (v === undefined || v === null || v === false || v === '') continue;
      out += ' ' + k + '="' + esc(v) + '"';
    }
    return out;
  }

  let uidN = 0;
  function uid(prefix) {
    uidN += 1;
    return (prefix || 'g') + uidN.toString(36);
  }

  // ---------- text measurement and wrapping ----------
  let mctx = null;
  const mcache = new Map();
  function measure(text, size, weight, family) {
    size = size || 12;
    weight = weight || 400;
    const key = size + '|' + weight + '|' + (family || '') + '|' + text;
    const hit = mcache.get(key);
    if (hit !== undefined) return hit;
    let w;
    try {
      if (!mctx) mctx = document.createElement('canvas').getContext('2d');
      mctx.font = weight + ' ' + size + 'px ' + (family === 'mono' ? MONO : FONT);
      w = mctx.measureText(String(text)).width;
    } catch (e) {
      w = String(text).length * size * (family === 'mono' ? 0.62 : 0.56);
    }
    if (mcache.size > 5000) mcache.clear();
    mcache.set(key, w);
    return w;
  }

  /** Greedy word wrap. Returns an array of lines; never wider than maxW unless one character is. */
  function wrap(text, maxW, size, weight, family) {
    const out = [];
    const paras = String(text == null ? '' : text).split(/\n/);
    for (const para of paras) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) {
        out.push('');
        continue;
      }
      let line = '';
      for (let word of words) {
        const trial = line ? line + ' ' + word : word;
        if (measure(trial, size, weight, family) <= maxW) {
          line = trial;
          continue;
        }
        if (line) out.push(line);
        // a single word longer than the line: break it by characters
        while (measure(word, size, weight, family) > maxW && word.length > 1) {
          let cut = word.length - 1;
          while (cut > 1 && measure(word.slice(0, cut) + '-', size, weight, family) > maxW) cut--;
          out.push(word.slice(0, cut) + '-');
          word = word.slice(cut);
        }
        line = word;
      }
      out.push(line);
    }
    return out;
  }

  /** Shorten to fit maxW with an ellipsis. */
  function fit(text, maxW, size, weight, family) {
    text = String(text == null ? '' : text);
    if (measure(text, size, weight, family) <= maxW) return text;
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (measure(text.slice(0, mid) + '…', size, weight, family) <= maxW) lo = mid;
      else hi = mid - 1;
    }
    return text.slice(0, lo).trimEnd() + '…';
  }

  // ---------- primitives ----------
  function svg(w, h, body, opts) {
    opts = opts || {};
    const pal = opts.pal || PM.pal.light;
    w = Math.ceil(w);
    h = Math.ceil(h);
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"' +
      ' role="img" aria-label="' + esc(opts.label || '') + '"' +
      " font-family='" + FONT + "' style=\"color:" + pal.ink + '">' +
      (opts.transparent ? '' : '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="' + pal.bg + '"/>') +
      body +
      '</svg>'
    );
  }

  /**
   * One line of text. o: {size=12, weight=400, fill, anchor='start'|'middle'|'end',
   * v='middle'|'top'|'base' (vertical placement relative to y), family: 'mono', italic, opacity}
   */
  function text(x, y, str, o) {
    o = o || {};
    const size = o.size || 12;
    let yy = y;
    if (o.v === 'top' || o.v === undefined) yy = y + size * 0.8;
    else if (o.v === 'middle') yy = y + size * 0.35;
    return (
      '<text' +
      attrs({
        x: round(x),
        y: round(yy),
        'font-size': size,
        'font-weight': o.weight && o.weight !== 400 ? o.weight : null,
        'font-style': o.italic ? 'italic' : null,
        'font-family': o.family === 'mono' ? MONO : null,
        fill: o.fill || 'currentColor',
        'fill-opacity': o.opacity,
        'text-anchor': o.anchor && o.anchor !== 'start' ? o.anchor : null,
        'letter-spacing': o.spacing,
      }) +
      '>' + esc(str) + '</text>'
    );
  }

  /**
   * Wrapped text block. o: text options plus {maxW, lineH (multiplier, default 1.25), maxLines}.
   * y is the top of the block. Returns {svg, h, lines}.
   */
  function textBlock(x, y, str, o) {
    o = o || {};
    const size = o.size || 12;
    const lh = size * (o.lineH || 1.25);
    let lines = wrap(str, o.maxW || 200, size, o.weight, o.family);
    if (o.maxLines && lines.length > o.maxLines) {
      lines = lines.slice(0, o.maxLines);
      lines[lines.length - 1] = fit(lines[lines.length - 1] + '…', o.maxW || 200, size, o.weight, o.family);
    }
    let out = '';
    lines.forEach((ln, i) => {
      out += text(x, y + i * lh, ln, Object.assign({}, o, { v: 'top' }));
    });
    return { svg: out, h: lines.length ? (lines.length - 1) * lh + size * 1.05 : 0, lines };
  }

  function rect(x, y, w, h, o) {
    o = o || {};
    return (
      '<rect' +
      attrs({
        x: round(x), y: round(y), width: round(Math.max(0, w)), height: round(Math.max(0, h)),
        rx: o.rx, ry: o.ry || o.rx,
        fill: o.fill || 'none',
        'fill-opacity': o.fillOpacity,
        stroke: o.stroke, 'stroke-width': o.stroke ? o.sw || 1 : null,
        'stroke-dasharray': o.dash,
        opacity: o.opacity,
      }) +
      '/>'
    );
  }

  function line(x1, y1, x2, y2, o) {
    o = o || {};
    return (
      '<line' +
      attrs({
        x1: round(x1), y1: round(y1), x2: round(x2), y2: round(y2),
        stroke: o.stroke || 'currentColor', 'stroke-width': o.sw || 1,
        'stroke-dasharray': o.dash, 'stroke-linecap': o.cap,
        'marker-end': o.markerEnd ? 'url(#' + o.markerEnd + ')' : null,
        'marker-start': o.markerStart ? 'url(#' + o.markerStart + ')' : null,
        opacity: o.opacity,
      }) +
      '/>'
    );
  }

  function path(d, o) {
    o = o || {};
    return (
      '<path' +
      attrs({
        d,
        fill: o.fill || 'none',
        'fill-opacity': o.fillOpacity,
        stroke: o.stroke, 'stroke-width': o.stroke ? o.sw || 1 : null,
        'stroke-dasharray': o.dash,
        'stroke-linejoin': o.join || (o.stroke ? 'round' : null),
        'stroke-linecap': o.cap || (o.stroke ? 'round' : null),
        'marker-end': o.markerEnd ? 'url(#' + o.markerEnd + ')' : null,
        opacity: o.opacity,
      }) +
      '/>'
    );
  }

  function poly(points, o) {
    o = o || {};
    const pts = points.map((p) => round(p[0]) + ',' + round(p[1])).join(' ');
    return (
      '<polygon' +
      attrs({ points: pts, fill: o.fill || 'none', stroke: o.stroke, 'stroke-width': o.stroke ? o.sw || 1 : null, 'stroke-linejoin': 'round', opacity: o.opacity }) +
      '/>'
    );
  }

  function polyline(points, o) {
    o = o || {};
    const pts = points.map((p) => round(p[0]) + ',' + round(p[1])).join(' ');
    return (
      '<polyline' +
      attrs({ points: pts, fill: 'none', stroke: o.stroke || 'currentColor', 'stroke-width': o.sw || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': o.dash, 'marker-end': o.markerEnd ? 'url(#' + o.markerEnd + ')' : null }) +
      '/>'
    );
  }

  function circle(cx, cy, r, o) {
    o = o || {};
    return '<circle' + attrs({ cx: round(cx), cy: round(cy), r: round(r), fill: o.fill || 'none', 'fill-opacity': o.fillOpacity, stroke: o.stroke, 'stroke-width': o.stroke ? o.sw || 1 : null, 'stroke-dasharray': o.dash }) + '/>';
  }

  function ellipse(cx, cy, rx, ry, o) {
    o = o || {};
    return '<ellipse' + attrs({ cx: round(cx), cy: round(cy), rx: round(rx), ry: round(ry), fill: o.fill || 'none', 'fill-opacity': o.fillOpacity, stroke: o.stroke, 'stroke-width': o.stroke ? o.sw || 1 : null, 'stroke-dasharray': o.dash }) + '/>';
  }

  /** Milestone diamond centred on (cx, cy). */
  function diamond(cx, cy, r, o) {
    o = o || {};
    return poly([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], o);
  }

  /** Process chevron. first: flat left edge. tip: depth of the arrow point. */
  function chevron(x, y, w, h, o) {
    o = o || {};
    const t = o.tip == null ? Math.min(14, h / 2) : o.tip;
    const pts = o.first
      ? [[x, y], [x + w - t, y], [x + w, y + h / 2], [x + w - t, y + h], [x, y + h]]
      : [[x, y], [x + w - t, y], [x + w, y + h / 2], [x + w - t, y + h], [x, y + h], [x + t, y + h / 2]];
    return poly(pts, o);
  }

  /** Arrowhead marker definition; put inside <defs>. Reference with line(..., {markerEnd: id}). */
  function arrowDef(id, color, size) {
    const s = size || 7;
    return (
      '<marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="' + s + '" markerHeight="' + s +
      '" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + color + '"/></marker>'
    );
  }

  /**
   * Box with a centred, wrapped label and an optional second line.
   * o: {fill, stroke, rx=6, size=12, weight=600, color, sub, subSize=10.5, subColor, pad=8, maxLines=3, align='middle'|'start'}
   */
  function box(x, y, w, h, label, o) {
    o = o || {};
    const size = o.size || 12;
    const pad = o.pad == null ? 8 : o.pad;
    const subSize = o.subSize || 10.5;
    let out = rect(x, y, w, h, { fill: o.fill || 'none', stroke: o.stroke, sw: o.sw, rx: o.rx == null ? 6 : o.rx, dash: o.dash });
    const lines = wrap(label || '', w - pad * 2, size, o.weight || 600);
    const maxLines = o.maxLines || 3;
    let shown = lines.slice(0, maxLines);
    if (lines.length > maxLines) shown[maxLines - 1] = fit(shown[maxLines - 1] + '…', w - pad * 2, size, o.weight || 600);
    const subLines = o.sub ? wrap(o.sub, w - pad * 2, subSize, 400).slice(0, o.subMaxLines || 2) : [];
    const lh = size * 1.2;
    const blockH = shown.length * lh + (subLines.length ? 3 + subLines.length * subSize * 1.2 : 0);
    let ty = y + (h - blockH) / 2;
    const anchor = o.align === 'start' ? 'start' : 'middle';
    const tx = anchor === 'start' ? x + pad : x + w / 2;
    for (const ln of shown) {
      out += text(tx, ty, ln, { size, weight: o.weight || 600, fill: o.color, anchor, italic: o.italic });
      ty += lh;
    }
    if (subLines.length) {
      ty += 3;
      for (const ln of subLines) {
        out += text(tx, ty, ln, { size: subSize, fill: o.subColor || o.color, anchor, opacity: o.subColor ? null : 0.8 });
        ty += subSize * 1.2;
      }
    }
    return out;
  }

  /**
   * Legend row. items: [{label, color, shape: 'square'|'line'|'diamond'|'dot'|'dash'}].
   * Wraps to new rows inside maxW. Returns {svg, h, w}.
   */
  function legend(items, x, y, pal, o) {
    o = o || {};
    const size = o.size || 11;
    const maxW = o.maxW || 600;
    let cx = x;
    let cy = y;
    let out = '';
    let widest = 0;
    for (const it of items) {
      const w = 18 + measure(it.label, size) + 16;
      if (cx + w > x + maxW && cx > x) {
        cx = x;
        cy += size + 9;
      }
      const my = cy + size / 2;
      const c = it.color;
      if (it.shape === 'line') out += line(cx, my, cx + 12, my, { stroke: c, sw: 2, cap: 'round' });
      else if (it.shape === 'dash') out += line(cx, my, cx + 12, my, { stroke: c, sw: 2, dash: '3 2' });
      else if (it.shape === 'diamond') out += diamond(cx + 6, my, 5, { fill: c });
      else if (it.shape === 'dot') out += circle(cx + 6, my, 4.5, { fill: c });
      else out += rect(cx, my - 5, 12, 10, { fill: c, rx: 2, stroke: it.stroke, sw: 1 });
      out += text(cx + 18, my, it.label, { size, fill: pal.ink2, v: 'middle' });
      cx += w;
      widest = Math.max(widest, cx - x);
    }
    return { svg: out, h: cy - y + size + 4, w: widest };
  }

  /** Empty-state drawing: a dashed frame with a one-line message, for graphics without data yet. */
  function placeholder(w, h, msg, pal) {
    return svg(
      w,
      h,
      rect(8, 8, w - 16, h - 16, { stroke: pal.line, dash: '5 4', rx: 10 }) +
        textBlock(w / 2, h / 2 - 9, msg, { size: 13, fill: pal.muted, anchor: 'middle', maxW: w - 60 }).svg,
      { pal, label: msg }
    );
  }

  // ---------- time scales ----------
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function dayNum(iso) {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000;
  }

  function isoOfDay(n) {
    const d = new Date(n * 86400000);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Linear date scale from startISO to endISO (inclusive) onto x0..x1.
   * Returns {x(iso), xEnd(iso) (right edge of that day), months: [{key:'2026-03', label, x, w}], days}.
   */
  function timeScale(startISO, endISO, x0, x1) {
    const a = dayNum(startISO);
    const b = dayNum(endISO) + 1;
    const span = Math.max(1, b - a);
    const k = (x1 - x0) / span;
    const x = (iso) => x0 + (dayNum(iso) - a) * k;
    const xEnd = (iso) => x0 + (dayNum(iso) + 1 - a) * k;
    const months = [];
    const sd = new Date(a * 86400000);
    let y = sd.getUTCFullYear();
    let m = sd.getUTCMonth();
    for (;;) {
      const ms = Date.UTC(y, m, 1) / 86400000;
      if (ms >= b) break;
      const me = Date.UTC(y, m + 1, 1) / 86400000;
      const from = Math.max(ms, a);
      const to = Math.min(me, b);
      months.push({
        key: y + '-' + String(m + 1).padStart(2, '0'),
        label: MONTHS[m],
        year: y,
        x: x0 + (from - a) * k,
        w: (to - from) * k,
      });
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return { x, xEnd, months, days: span, k, x0, x1 };
  }

  /**
   * Month header and vertical gridlines for a time scale.
   * y: top of the header, h: header height, bodyBottom: where gridlines end.
   */
  function timeAxis(scale, y, h, bodyBottom, pal, o) {
    o = o || {};
    let out = '';
    const many = scale.months.length > 14;
    scale.months.forEach((mo, i) => {
      out += line(mo.x, y, mo.x, bodyBottom, { stroke: pal.grid, sw: 1 });
      const lbl = mo.label + (mo.key.endsWith('-01') || i === 0 ? ' ' + String(mo.year).slice(2) : '');
      const show = many ? i % 2 === 0 || mo.key.endsWith('-01') : true;
      if (show && mo.w > 14) out += text(mo.x + Math.min(mo.w, 60) / 2 + (many ? 2 : 0), y + h / 2, fit(lbl, Math.max(mo.w - 2, 24), 11), { size: 11, fill: pal.ink2, anchor: many ? 'start' : 'middle', v: 'middle' });
    });
    const last = scale.months[scale.months.length - 1];
    if (last) out += line(last.x + last.w, y, last.x + last.w, bodyBottom, { stroke: pal.grid, sw: 1 });
    out += line(scale.x0, y + h, scale.x1, y + h, { stroke: pal.axis, sw: 1 });
    return out;
  }

  /** "Nice" axis ticks for 0..max: returns {max, ticks: [numbers]}. */
  function niceTicks(max, count) {
    count = count || 4;
    if (!(max > 0)) return { max: 1, ticks: [0, 1] };
    const raw = max / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const top = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return { max: top, ticks };
  }

  /** Compact number for axis labels: 1200 -> 1.2K, 2500000 -> 2.5M. */
  function compact(n) {
    const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(Math.round(n * 100) / 100);
  }

  /** Column / bar path with a 4px rounded data end and a square baseline end. */
  function bar(x, y, w, h, o) {
    o = o || {};
    if (h <= 0 || w <= 0) return '';
    const r = Math.min(o.r == null ? 4 : o.r, w / 2, h);
    let d;
    if (o.horizontal) {
      // grows to the right from x
      d = 'M' + round(x) + ',' + round(y) + ' H' + round(x + w - r) + ' Q' + round(x + w) + ',' + round(y) + ' ' + round(x + w) + ',' + round(y + r) +
        ' V' + round(y + h - r) + ' Q' + round(x + w) + ',' + round(y + h) + ' ' + round(x + w - r) + ',' + round(y + h) + ' H' + round(x) + ' Z';
    } else {
      // grows up from y + h
      d = 'M' + round(x) + ',' + round(y + h) + ' V' + round(y + r) + ' Q' + round(x) + ',' + round(y) + ' ' + round(x + r) + ',' + round(y) +
        ' H' + round(x + w - r) + ' Q' + round(x + w) + ',' + round(y) + ' ' + round(x + w) + ',' + round(y + r) + ' V' + round(y + h) + ' Z';
    }
    return path(d, { fill: o.fill });
  }

  function round(n) {
    return Math.round(n * 10) / 10;
  }

  PM.svg = {
    FONT, MONO, MONTHS,
    esc, attrs, uid, measure, wrap, fit,
    svg, text, textBlock, rect, line, path, poly, polyline, circle, ellipse, diamond, chevron, arrowDef, box, legend, placeholder, bar,
    timeScale, timeAxis, niceTicks, compact, dayNum, isoOfDay, round,
  };
})();
