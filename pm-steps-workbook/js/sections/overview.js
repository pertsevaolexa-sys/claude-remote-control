/* Overview page plus framework sections 1 (process map of the ten steps) and 2 (core ideas and planning depth). */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const W = 1000; // width of every drawing in this file
  const PAD = 16;

  // =====================================================================================
  // Shared helpers
  // =====================================================================================
  const r1 = (n) => S.round(n);
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  /** Fill, outline and text colours for a step status (Done, In progress, Not started, Skipped). */
  function statusStyle(status, pal) {
    switch (status) {
      case 'Done':
        return { fill: pal.accent, stroke: pal.accent, sw: 1, ink: pal.accentInk, sub: pal.accentInk };
      case 'In progress':
        return { fill: pal.accentSoft, stroke: pal.accent, sw: 1.5, ink: pal.ink, sub: pal.ink2 };
      case 'Skipped':
        return { fill: pal.bg, stroke: pal.muted, sw: 1.2, dash: '4 3', ink: pal.muted, sub: pal.muted };
      default:
        return { fill: pal.box, stroke: pal.boxLine, sw: 1, ink: pal.ink, sub: pal.ink2 };
    }
  }

  /** Chevron as a path, so it can also be dashed. first: flat left edge. */
  function chev(x, y, w, h, first, tip, o) {
    const pts = first
      ? [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h]]
      : [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h], [x + tip, y + h / 2]];
    return S.path('M' + pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' L') + ' Z', { fill: o.fill, stroke: o.stroke, sw: o.sw, dash: o.dash, join: 'round' });
  }

  /** Document shape: a box with a folded top-right corner. */
  function doc(x, y, w, h, o) {
    const f = Math.min(12, h / 3);
    const d = 'M' + r1(x) + ',' + r1(y) + ' H' + r1(x + w - f) + ' L' + r1(x + w) + ',' + r1(y + f) + ' V' + r1(y + h) + ' H' + r1(x) + ' Z';
    return (
      S.path(d, { fill: o.fill, stroke: o.stroke, sw: o.sw || 1, dash: o.dash, join: 'round' }) +
      S.path('M' + r1(x + w - f) + ',' + r1(y) + ' V' + r1(y + f) + ' H' + r1(x + w), { stroke: o.stroke, sw: o.sw || 1 })
    );
  }

  /** Legend row with custom swatches. items: [{label, swatch(x, cy) => svg, sw}]. Returns {svg, h}. */
  function legendRow(items, x, y, maxW, pal) {
    const size = 11;
    let cx = x;
    let cy = y;
    let out = '';
    for (const it of items) {
      const sw = it.sw || 14;
      const w = sw + 6 + S.measure(it.label, size) + 18;
      if (cx + w > x + maxW && cx > x) {
        cx = x;
        cy += 18;
      }
      out += it.swatch(cx, cy + 6);
      out += S.text(cx + sw + 6, cy + 6, it.label, { size, fill: pal.ink2, v: 'middle' });
      cx += w;
    }
    return { svg: out, h: cy - y + 14 };
  }

  function statusLegendItems(pal) {
    return PM.STEP_STATUS.slice()
      .sort((a, b) => ['Done', 'In progress', 'Not started', 'Skipped'].indexOf(a) - ['Done', 'In progress', 'Not started', 'Skipped'].indexOf(b))
      .map((st) => {
        const s = statusStyle(st, pal);
        return { label: st, sw: 18, swatch: (x, cy) => chev(x, cy - 6, 18, 12, true, 5, s) };
      });
  }

  /**
   * Split a text into list items: always at ";" and line breaks, and at commas when asked.
   * Separators inside brackets are kept, so "(4 divisions, 6 months)" stays one item.
   */
  function splitItems(text, commas) {
    const out = [];
    let cur = '';
    let depth = 0;
    for (const ch of String(text || '')) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (depth === 0 && (ch === ';' || ch === '\n' || (commas && ch === ','))) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim().replace(/\.$/, '')).filter(Boolean).map(cap);
  }

  /** Formats that are events: meetings and workshops with a date. */
  const EVENT_RE = /kick[\s-]?off|workshop|\bws\b|\bpo meeting|\bpsc meeting|steering|board meeting/i;

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ---------- key figures (metrics registered by all modules) ----------
  function metricValue(m, q) {
    let v = null;
    try {
      v = typeof m.fn === 'function' ? m.fn(q) : null;
    } catch (e) {
      v = null;
    }
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !isFinite(v))) return null;
    return v;
  }
  function metricText(m, v, q) {
    if (v === null) return '';
    if (typeof v === 'number') {
      if (m.kind === 'money') return q.money(v);
      if (m.kind === 'percent') return q.pct(v);
      return q.num(v) + (m.unit ? ' ' + m.unit : '');
    }
    return String(v);
  }
  function sectionRef(id) {
    const s = PM.sections.find((x) => x.id === id);
    if (!s) return { id, label: id || '', num: '' };
    return { id, label: (s.num ? s.num + ' ' : '') + (s.navTitle || s.title), num: s.num || '' };
  }
  /** Every registered metric in the order of the sections it comes from. */
  function metricList(q) {
    const pos = (id) => {
      const i = PM.sections.findIndex((s) => s.id === id);
      return i < 0 ? 9999 : i;
    };
    return Object.keys(PM.metrics)
      .map((k, i) => {
        const m = PM.metrics[k];
        const v = metricValue(m, q);
        return { m, i, v, text: metricText(m, v, q), ref: sectionRef(m.section) };
      })
      .sort((a, b) => pos(a.m.section) - pos(b.m.section) || a.i - b.i);
  }

  // =====================================================================================
  // Graphic: Project at a glance
  // =====================================================================================

  /**
   * Put labels in lanes above a line. Each item: {x, w}. A label sits to the right of its leader
   * (or to the left near the right edge). A label may not overlap another label in its lane, its
   * leader may not cross a label in a lower lane, and no higher leader may cross it.
   */
  function placeLabels(items, xmin, xmax, maxLanes) {
    const placed = [];
    for (const it of items) {
      if (it.x + 5 + it.w <= xmax) {
        it.b0 = it.x;
        it.b1 = it.x + 5 + it.w;
        it.anchor = 'start';
      } else {
        it.b0 = Math.max(xmin, it.x - 5 - it.w);
        it.b1 = it.x;
        it.anchor = 'end';
      }
      it.lane = -1;
      for (let k = 0; k < maxLanes; k++) {
        const ok = placed.every((p) => {
          if (p.lane === k) return it.b1 + 10 <= p.b0 || it.b0 >= p.b1 + 10;
          if (p.lane < k) return !(it.x >= p.b0 - 4 && it.x <= p.b1 + 4);
          return !(p.x >= it.b0 - 4 && p.x <= it.b1 + 4);
        });
        if (ok) {
          it.lane = k;
          break;
        }
      }
      if (it.lane >= 0) placed.push(it);
    }
    return placed.reduce((m, p) => Math.max(m, p.lane + 1), 0);
  }

  function glance(q, pal) {
    const x0 = PAD + 4;
    const x1 = W - PAD - 4;
    let body = '';
    let y = 16;

    // ---------- header: name, kind, organisation, summary; status on the right ----------
    const name = q.f('meta.name');
    const kind = q.f('meta.kind');
    const org = q.f('meta.org');
    const status = q.f('meta.status');
    const rightW = 240;
    const leftW = x1 - x0 - rightW - 24;
    body += S.text(x0, y, name ? S.fit(name, leftW, 14, 600) : 'Project name', { size: 14, weight: 600, fill: name ? pal.ink : pal.muted, italic: !name });
    let ly = y + 22;
    const sub = [kind, org].filter(Boolean).join(' · ');
    body += S.text(x0, ly, sub ? S.fit(sub, leftW, 12) : 'Kind of project · organisation', { size: 12, fill: sub ? pal.ink2 : pal.muted, italic: !sub });
    ly += 18;
    const summary = q.f('meta.summary');
    if (summary) {
      const tb = S.textBlock(x0, ly, summary, { size: 12, fill: pal.ink2, maxW: leftW, maxLines: 2 });
      body += tb.svg;
      ly += tb.h + 4;
    }
    const pillTxt = status ? 'Status: ' + status : 'Status not set';
    const pw = S.measure(pillTxt, 12, 600) + 26;
    body += S.rect(x1 - pw, y - 4, pw, 24, { fill: status ? pal.accentSoft : pal.box, stroke: status ? pal.accent : pal.boxLine, rx: 12 });
    body += S.text(x1 - pw / 2, y + 8, pillTxt, { size: 12, weight: 600, fill: status ? pal.ink : pal.muted, anchor: 'middle', v: 'middle', italic: !status });
    let ry = y + 30;
    const version = q.f('meta.version');
    const updated = q.f('meta.updated');
    const author = q.f('meta.author');
    [version ? 'PM plan version ' + version : '', updated ? 'Updated ' + U.fmtDate(updated) : '', author ? 'Prepared by ' + author : ''].filter(Boolean).forEach((t) => {
      body += S.text(x1, ry, S.fit(t, rightW, 11), { size: 11, fill: pal.muted, anchor: 'end' });
      ry += 15;
    });
    y = Math.max(ly, ry) + 6;
    body += S.line(x0, y, x1, y, { stroke: pal.line });
    y += 14;

    // ---------- timeline with milestones ----------
    const pd = q.projectDates();
    const ms = q.rows('milestones');
    const msDates = [];
    ms.forEach((m) => [m.baseline, m.revised, m.actual].forEach((d) => U.isDate(d) && msDates.push(d)));
    let lo = U.minDate([pd.start].concat(msDates));
    let hi = U.maxDate([pd.end].concat(msDates));
    const timed = !!(lo && hi);
    if (timed && lo === hi) {
      lo = U.addDays(lo, -14);
      hi = U.addDays(hi, 14);
    }
    body += S.text(x0, y, 'Timeline and milestones', { size: 12, weight: 600, fill: pal.ink2 });
    const leg = legendRow(
      [
        { label: 'Baseline date', sw: 14, swatch: (x, cy) => S.diamond(x + 7, cy, 6, { fill: pal.bg, stroke: pal.mile, sw: 2 }) },
        { label: 'Actual date', sw: 14, swatch: (x, cy) => S.diamond(x + 7, cy, 5, { fill: pal.mile }) },
        { label: 'Project duration', sw: 18, swatch: (x, cy) => S.rect(x, cy - 3, 18, 6, { fill: pal.accent, rx: 3 }) },
      ],
      0, 0, 9999, pal
    );
    const legW = 3 * 34 + S.measure('Baseline date', 11) + S.measure('Actual date', 11) + S.measure('Project duration', 11) + 18 * 3;
    body += '<g transform="translate(' + r1(x1 - legW + 18) + ',' + r1(y) + ')">' + leg.svg + '</g>';
    y += 24;

    const tx0 = x0 + 4;
    const tx1 = x1 - 4;
    const laneH = 32;
    const maxLanes = 5;
    const sc = timed ? S.timeScale(lo, hi, tx0, tx1) : null;
    const items = [];
    const undated = [];
    ms.forEach((m, i) => {
      const plan = U.isDate(m.baseline) ? m.baseline : U.isDate(m.revised) ? m.revised : '';
      const act = U.isDate(m.actual) ? m.actual : '';
      const label = q.label(m, 'name') || 'Milestone ' + (i + 1);
      const ph = !m.name;
      let x;
      if (timed) {
        if (!plan && !act) {
          undated.push(label);
          return;
        }
        x = sc.x(plan || act) + (sc.xEnd(plan || act) - sc.x(plan || act)) / 2;
      } else {
        x = tx0 + ((i + 0.5) * (tx1 - tx0)) / Math.max(1, ms.length);
      }
      const multiYear = timed && lo.slice(0, 4) !== hi.slice(0, 4);
      const dateTxt = !timed
        ? 'No date yet'
        : plan && act && plan !== act
          ? (multiYear ? U.fmtDate(plan) : U.fmtDateShort(plan)) + ', actual ' + (multiYear ? U.fmtDate(act) : U.fmtDateShort(act))
          : multiYear ? U.fmtDate(plan || act) : U.fmtDateShort(plan || act);
      const nameFit = S.fit(label, 170, 12);
      const w = Math.max(S.measure(nameFit, 12), S.measure(dateTxt, 11));
      items.push({ x, w, nameFit, dateTxt, plan, act, ph, timed, label });
    });
    items.sort((a, b) => a.x - b.x);
    const lanes = Math.max(1, placeLabels(items, tx0, tx1, maxLanes));
    const axisY = y;
    const axisH = timed ? 20 : 0;
    const lineY = axisY + axisH + 10 + lanes * laneH + 14;
    if (timed) body += S.timeAxis(sc, axisY, axisH, lineY + 8, pal);
    // project bar or template line
    if (timed && pd.start && pd.end && pd.end >= pd.start) {
      body += S.rect(sc.x(pd.start), lineY - 3, sc.xEnd(pd.end) - sc.x(pd.start), 6, { fill: pal.accent, rx: 3 });
    } else if (timed) {
      body += S.line(tx0, lineY, tx1, lineY, { stroke: pal.axis, sw: 2, dash: '6 4' });
    } else {
      body += S.line(tx0, lineY, tx1, lineY, { stroke: pal.boxLine, sw: 2, dash: '6 4' });
    }
    // leaders, labels, diamonds
    const laneTop = (k) => lineY - 14 - (k + 1) * laneH;
    let marks = '';
    for (const it of items) {
      if (it.lane >= 0) {
        const top = laneTop(it.lane);
        body += S.line(it.x, top + 1, it.x, lineY - 8, { stroke: pal.axis, sw: 1 });
        body += S.rect(it.anchor === 'start' ? it.x + 2 : it.b0, top, it.w + 5, laneH - 4, { fill: pal.bg });
        const tx = it.anchor === 'start' ? it.x + 5 : it.x - 5;
        const muted = !it.timed || it.ph;
        body += S.text(tx, top + 1, it.nameFit, { size: 12, fill: muted ? pal.muted : pal.ink, anchor: it.anchor, italic: it.ph });
        body += S.text(tx, top + 16, it.dateTxt, { size: 11, fill: pal.muted, anchor: it.anchor });
      }
      if (!it.timed) {
        marks += S.diamond(it.x, lineY, 6, { fill: pal.bg, stroke: pal.boxLine, sw: 2 });
        continue;
      }
      if (it.plan && it.act && it.plan !== it.act) {
        const xa = sc.x(it.act) + (sc.xEnd(it.act) - sc.x(it.act)) / 2;
        marks += S.line(it.x, lineY, xa, lineY, { stroke: pal.mile, sw: 2 });
      }
      if (it.plan) marks += S.diamond(it.x, lineY, 7, { fill: pal.bg, stroke: pal.mile, sw: 2 });
      if (it.act) {
        const xa = sc.x(it.act) + (sc.xEnd(it.act) - sc.x(it.act)) / 2;
        marks += S.diamond(xa, lineY, 4.5, { fill: pal.mile });
      }
    }
    body += marks;
    // start and end below the line
    y = lineY + 14;
    const half = (tx1 - tx0) / 2 - 16;
    const startEv = q.f('time.startEvent');
    const endEv = q.f('time.endEvent');
    const sx = timed && pd.start ? Math.max(tx0, sc.x(pd.start)) : tx0;
    const ex = timed && pd.end ? Math.min(tx1, sc.xEnd(pd.end)) : tx1;
    body += S.text(sx, y, pd.start ? 'Start ' + U.fmtDate(pd.start) : 'Start date not set', { size: 12, weight: pd.start ? 600 : 400, fill: pd.start ? pal.ink : pal.muted, italic: !pd.start });
    body += S.text(ex, y, pd.end ? 'End ' + U.fmtDate(pd.end) : 'End date not set', { size: 12, weight: pd.end ? 600 : 400, fill: pd.end ? pal.ink : pal.muted, italic: !pd.end, anchor: 'end' });
    if (startEv) body += S.text(sx, y + 16, S.fit(startEv, half, 11), { size: 11, fill: pal.ink2 });
    if (endEv) body += S.text(ex, y + 16, S.fit(endEv, half, 11), { size: 11, fill: pal.ink2, anchor: 'end' });
    y += startEv || endEv ? 36 : 22;
    const hidden = items.filter((it) => it.lane < 0).map((it) => it.label);
    if (hidden.length) {
      const tb = S.textBlock(tx0, y, 'More milestones (no room for a label): ' + hidden.join(' · '), { size: 11, fill: pal.muted, maxW: tx1 - tx0, maxLines: 3 });
      body += tb.svg;
      y += tb.h + 6;
    }
    if (timed && undated.length) {
      const tb = S.textBlock(tx0, y, 'Milestones without a date: ' + undated.join(' · '), { size: 11, fill: pal.muted, maxW: tx1 - tx0, maxLines: 3 });
      body += tb.svg;
      y += tb.h + 6;
    }
    if (!timed) {
      body += S.text(tx0, y, 'Add the project dates and the milestone dates to place them in time.', { size: 11, fill: pal.muted, italic: true });
      y += 18;
    }
    y += 6;
    body += S.line(x0, y, x1, y, { stroke: pal.line });
    y += 14;

    // ---------- the ten steps as a status strip ----------
    const steps = PM.PROCESS;
    const rows = q.rows('steps');
    const stOf = (id) => (rows.find((r) => r._id === id) || {}).status || '';
    const done = steps.filter((s) => stOf(s.id) === 'Done').length;
    const skipped = steps.filter((s) => stOf(s.id) === 'Skipped').length;
    body += S.text(x0, y, 'The ten steps', { size: 12, weight: 600, fill: pal.ink2 });
    body += S.text(x1, y, done + ' of ' + steps.length + ' done' + (skipped ? ', ' + skipped + ' skipped' : ''), { size: 12, fill: pal.ink2, anchor: 'end' });
    y += 22;
    const tip = 10;
    const gGap = 22;
    const cw = (x1 - x0 - gGap + 8 * tip - 16) / 10;
    const stepX = cw - tip + 2;
    const groupW = 4 * stepX + cw;
    [['initiation', 'Initiation process'], ['start', 'Project start process']].forEach(([proc, lbl], g) => {
      const gx = x0 + g * (groupW + gGap);
      body += S.text(gx, y, lbl, { size: 11, weight: 600, fill: pal.muted });
      steps.filter((s) => s.process === proc).forEach((s, i) => {
        const sty = statusStyle(stOf(s.id), pal);
        const cx = gx + i * stepX;
        body += chev(cx, y + 18, cw, 26, i === 0, tip, sty);
        body += S.text(cx + (i === 0 ? 8 : tip + 4) + (cw - tip - (i === 0 ? 8 : tip + 4)) / 2, y + 31, s.id, { size: 11, weight: 600, fill: sty.ink, anchor: 'middle', v: 'middle', family: 'mono' });
        body += S.textBlock(cx + 2, y + 50, s.title, { size: 11, fill: pal.ink2, maxW: cw - 8, maxLines: 3, lineH: 1.15 }).svg;
      });
    });
    y += 50 + 3 * 11 * 1.15 + 8;
    const sl = legendRow(statusLegendItems(pal), x0, y, x1 - x0, pal);
    body += sl.svg;
    y += sl.h + 8;
    body += S.line(x0, y, x1, y, { stroke: pal.line });
    y += 14;

    // ---------- key figures ----------
    body += S.text(x0, y, 'Key figures', { size: 12, weight: 600, fill: pal.ink2 });
    y += 22;
    const figs = metricList(q).filter((f) => f.v !== null && f.v !== 0);
    if (!figs.length) {
      body += S.rect(x0, y, x1 - x0, 44, { stroke: pal.line, dash: '5 4', rx: 8 });
      body += S.text((x0 + x1) / 2, y + 22, 'Key figures such as costs, work packages and risks appear here as you fill in the plans.', { size: 12, fill: pal.muted, anchor: 'middle', v: 'middle', italic: true });
      y += 44;
    } else {
      const cols = Math.min(5, figs.length);
      const gap = 10;
      const tw = (x1 - x0 - (cols - 1) * gap) / cols;
      const th = 56;
      figs.forEach((f, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const tx = x0 + c * (tw + gap);
        const ty = y + r * (th + gap);
        body += S.rect(tx, ty, tw, th, { fill: pal.box, rx: 8 });
        const num = f.ref.num;
        const numW = num ? S.measure(num, 10.5, 400, 'mono') + 8 : 0;
        body += S.text(tx + 12, ty + 9, S.fit(f.m.label || f.m.key, tw - 24 - numW, 11.5), { size: 11.5, fill: pal.ink2 });
        if (num) body += S.text(tx + tw - 10, ty + 10, num, { size: 10.5, fill: pal.muted, anchor: 'end', family: 'mono' });
        body += S.text(tx + 12, ty + 28, S.fit(f.text, tw - 24, 18, 600), { size: 18, weight: 600, fill: pal.ink });
      });
      y += Math.ceil(figs.length / cols) * (th + gap) - gap;
    }
    y += 16;
    return S.svg(W, y, body, { pal, label: 'Project at a glance: ' + (name || 'project') });
  }

  // =====================================================================================
  // Graphic: process map (two rows of five steps)
  // =====================================================================================
  const PROCESSES = [
    { id: 'initiation', label: 'Initiation process', sub: 'steps I1 to I5, part 3 of this workbook', input: 'Project idea', output: '(Preliminarily) released Project Charter' },
    { id: 'start', label: 'Project start process', sub: 'steps S1 to S5, part 4 of this workbook', input: 'Preliminary Project Charter', output: 'Final Project Charter and approved PM plan 1.0' },
  ];

  function processMap(q, pal) {
    const inW = 108;
    const outW = 132;
    const gap = 26;
    const tip = 16;
    const ch = 96;
    const boxH = 72;
    const cxStart = PAD + inW + gap;
    const cxEnd = W - PAD - outW - gap;
    const cw = (cxEnd - cxStart + 4 * tip - 16) / 5;
    const stepX = cw - tip + 4;
    const aid = S.uid('pa');
    const aidM = S.uid('pm');
    let body = '<defs>' + S.arrowDef(aid, pal.ink2) + S.arrowDef(aidM, pal.muted) + '</defs>';
    let y = 12;
    const rowsOut = [];
    PROCESSES.forEach((p, pi) => {
      const rowTop = y;
      body += S.text(cxStart, rowTop, p.label, { size: 13, weight: 600, fill: pal.ink });
      body += S.text(cxStart + S.measure(p.label, 13, 600) + 8, rowTop + 1, p.sub, { size: 11, fill: pal.muted });
      const chevY = rowTop + 26;
      const boxY = chevY + (ch - boxH) / 2;
      // input
      body += S.text(PAD, boxY - 15, 'Input', { size: 11, fill: pal.muted });
      body += S.box(PAD, boxY, inW, boxH, p.input, { fill: pal.box, stroke: pal.boxLine, size: 12, color: pal.ink, maxLines: 4 });
      body += S.line(PAD + inW + 3, chevY + ch / 2, cxStart - 3, chevY + ch / 2, { stroke: pal.ink2, sw: 1.5, markerEnd: aid });
      // the five steps
      const steps = PM.PROCESS.filter((s) => s.process === p.id);
      steps.forEach((s, i) => {
        const row = q.row('steps', s.id) || {};
        const sty = statusStyle(row.status, pal);
        const cx = cxStart + i * stepX;
        body += chev(cx, chevY, cw, ch, i === 0, tip, sty);
        const ta = cx + (i === 0 ? 10 : tip + 5);
        const tw = cx + cw - tip - 3 - ta;
        const title = S.wrap(s.title, tw, 12, 600).slice(0, 3);
        const when = row.when ? S.fit(row.when, tw, 11) : '';
        const blockH = 14 + title.length * 14.5 + (when ? 17 : 0);
        let ty = chevY + (ch - blockH) / 2;
        body += S.text(ta, ty, s.id, { size: 11, weight: 600, fill: sty.sub, family: 'mono' });
        ty += 15;
        title.forEach((ln) => {
          body += S.text(ta, ty, ln, { size: 12, weight: 600, fill: sty.ink });
          ty += 14.5;
        });
        if (when) body += S.text(ta, ty + 3, when, { size: 11, fill: sty.sub });
      });
      // output
      const lastTip = cxStart + 4 * stepX + cw;
      const ox = W - PAD - outW;
      body += S.line(lastTip + 3, chevY + ch / 2, ox - 3, chevY + ch / 2, { stroke: pal.ink2, sw: 1.5, markerEnd: aid });
      body += S.text(ox, boxY - 15, 'Output', { size: 11, fill: pal.muted });
      body += doc(ox, boxY, outW, boxH, { fill: pal.accentSoft, stroke: pal.accent, sw: 1.5 });
      body += S.box(ox, boxY, outW - 6, boxH, p.output, { size: 12, color: pal.ink, maxLines: 4 });
      rowsOut.push({ boxY, chevY, ox });
      y = chevY + ch + (pi === 0 ? 50 : 18);
    });
    // connector: output of the initiation is the input of the project start
    const a = rowsOut[0];
    const b = rowsOut[1];
    const fromX = a.ox + outW / 2;
    const toX = PAD + inW / 2;
    const midY = a.chevY + ch + 18;
    body += S.path('M' + r1(fromX) + ',' + r1(a.boxY + boxH + 2) + ' V' + r1(midY) + ' H' + r1(toX) + ' V' + r1(b.boxY - 4), { stroke: pal.muted, sw: 1.5, markerEnd: aidM });
    const cl = 'Charter released (I5): the project starts';
    const clW = S.measure(cl, 11) + 16;
    const clX = (fromX + toX) / 2;
    body += S.rect(clX - clW / 2, midY - 9, clW, 18, { fill: pal.bg });
    body += S.text(clX, midY, cl, { size: 11, fill: pal.muted, anchor: 'middle', v: 'middle' });
    // legend
    y += 4;
    const lg = legendRow(statusLegendItems(pal), PAD, y, W - 2 * PAD, pal);
    body += lg.svg;
    y += lg.h + 10;
    return S.svg(W, y, body, { pal, label: 'Process map of the ten steps' });
  }

  // =====================================================================================
  // Graphic: activities, roles, formats and results per step (like the summary pages of the method)
  // =====================================================================================
  const MATRIX_ROWS = [
    { label: 'Activities', user: 'did', commas: false, fb: (s) => s.activities.slice() },
    { label: 'Roles', user: 'who', commas: true, fb: (s) => splitItems(s.roles, true) },
    { label: 'Format', user: 'format', commas: true, events: true, fb: (s) => splitItems(s.format, true) },
    { label: 'Result', user: 'result', commas: false, fb: (s) => splitItems(s.result, false) },
  ];

  /** A bulleted list inside a cell. items: [{text, muted, event}]. Returns {svg, h}. */
  function cellList(x, y, w, items, pal) {
    let out = '';
    let cy = y;
    const lh = 15;
    items.forEach((it) => {
      const weight = it.event ? 600 : 400;
      let lines = S.wrap(it.text, w - 22, 12, weight);
      if (lines.length > 8) {
        lines = lines.slice(0, 8);
        lines[7] = S.fit(lines[7] + '…', w - 22, 12, weight);
      }
      const h = lines.length * lh;
      if (it.event) {
        out += S.rect(x, cy - 3, w, h + 5, { fill: pal.mileSoft, rx: 4 });
        out += S.diamond(x + 9, cy + 7, 4, { fill: pal.mile });
      } else {
        out += S.text(x + 6, cy, '›', { size: 12, fill: pal.muted });
      }
      lines.forEach((ln, i) => {
        out += S.text(x + 18, cy + i * lh, ln, { size: 12, weight, fill: it.muted ? (it.event ? pal.ink2 : pal.muted) : pal.ink, italic: it.muted });
      });
      cy += h + (it.event ? 8 : 5);
    });
    return { svg: out, h: cy - y };
  }

  function stepMatrix(q, pal, proc) {
    const steps = PM.PROCESS.filter((s) => s.process === proc);
    const labelW = 86;
    const gx = PAD + labelW;
    const colW = (W - PAD - gx) / 5;
    const tip = 14;
    const hh = 56;
    let body = '';
    let y = 10;
    // header: the five steps as chevrons, coloured by status
    steps.forEach((s, i) => {
      const row = q.row('steps', s.id) || {};
      const sty = statusStyle(row.status, pal);
      const cx = gx + i * colW;
      const cw = i < 4 ? colW + tip - 4 : colW;
      body += chev(cx, y, cw, hh, i === 0, tip, sty);
      const ta = cx + (i === 0 ? 10 : tip + 5);
      const tw = cx + colW - (i < 4 ? 6 : tip + 4) - ta;
      const title = S.wrap(s.title, tw, 12, 600).slice(0, 2);
      const blockH = 14 + title.length * 14.5;
      let ty = y + (hh - blockH) / 2;
      body += S.text(ta, ty, s.id + (row.status ? ' · ' + row.status : ''), { size: 11, weight: 600, fill: sty.sub });
      ty += 15;
      title.forEach((ln) => {
        body += S.text(ta, ty, ln, { size: 12, weight: 600, fill: sty.ink });
        ty += 14.5;
      });
    });
    y += hh + 8;
    // rows
    const gridTop = y;
    MATRIX_ROWS.forEach((def, ri) => {
      const cells = steps.map((s, i) => {
        const row = q.row('steps', s.id) || {};
        const own = String(row[def.user] || '').trim();
        const list = own ? splitItems(own, def.commas) : def.fb(s);
        const items = list.map((t) => ({ text: t, muted: !own, event: !!def.events && EVENT_RE.test(t) }));
        return cellList(gx + i * colW + 6, 0, colW - 12, items, pal);
      });
      const rh = Math.max(44, Math.max.apply(null, cells.map((c) => c.h)) + 18);
      if (ri % 2 === 0) body += S.rect(PAD, y, W - 2 * PAD, rh, { fill: pal.box });
      body += S.text(PAD + 10, y + 11, def.label, { size: 12, weight: 600, fill: pal.ink2 });
      cells.forEach((c) => {
        body += '<g transform="translate(0,' + r1(y + 11) + ')">' + c.svg + '</g>';
      });
      y += rh;
      body += S.line(PAD, y, W - PAD, y, { stroke: pal.line });
    });
    // column separators
    for (let i = 0; i <= 4; i++) {
      const x = gx + i * colW;
      body += S.line(x, gridTop, x, y, { stroke: i === 0 ? pal.line : pal.axis, sw: 1, dash: i === 0 ? null : '3 3' });
    }
    y += 12;
    const lg = legendRow(
      [
        { label: 'Event format: meeting or workshop', sw: 18, swatch: (x, cy) => S.rect(x, cy - 7, 18, 14, { fill: pal.mileSoft, rx: 3 }) + S.diamond(x + 9, cy, 4, { fill: pal.mile }) },
        { label: 'Grey italic: the method’s default until you describe the step', sw: 22, swatch: (x, cy) => S.text(x, cy, 'Abc', { size: 11, fill: pal.muted, italic: true, v: 'middle' }) },
      ].concat(statusLegendItems(pal)),
      PAD, y, W - 2 * PAD, pal
    );
    body += lg.svg;
    y += lg.h + 8;
    return S.svg(W, y, body, { pal, label: (proc === 'initiation' ? 'Initiation' : 'Project start') + ' process: activities, roles, formats, results' });
  }

  // =====================================================================================
  // Graphic: project management process
  // =====================================================================================
  const STAGES = [
    { id: 'init', name: 'Initiating', sub: 'From idea to released charter', doc: 'Project Charter' },
    { id: 'plan', name: 'Planning', sub: 'Project start', doc: 'PM plan with the project plans' },
    { id: 'impl', name: 'Implementing', sub: 'Doing the work', doc: 'Project result' },
    { id: 'close', name: 'Closing', sub: 'Handover and review', doc: 'Project closure report' },
    { id: 'post', name: 'Post-project phase', sub: 'Use and evaluation', doc: null },
  ];
  const STATUS_STAGE = { Idea: 'init', Initiation: 'init', Planning: 'plan', Implementation: 'impl', Closing: 'close', Closed: 'post' };

  function pmProcess(q, pal) {
    const tip = 18;
    const ch = 66;
    const cw = (W - 2 * PAD + 4 * tip - 16) / 5;
    const stepX = cw - tip + 4;
    const chevY = 82;
    const cur = STATUS_STAGE[q.f('meta.status')] || '';
    const aid = S.uid('pl');
    const aidD = S.uid('pd');
    let body = '<defs>' + S.arrowDef(aid, pal.ink2) + S.arrowDef(aidD, pal.muted) + '</defs>';
    const docY = chevY + ch + 26;
    const docH = 46;
    // scope of this workbook: bracket over the first two stages and a dashed line where it ends
    const bx = PAD + 2 * stepX + tip / 2;
    body += S.line(bx, chevY - 44, bx, docY + docH + 12, { stroke: pal.axis, sw: 1.5, dash: '5 4' });
    const by = chevY - 16;
    body += S.path('M' + r1(PAD + 2) + ',' + r1(by + 7) + ' V' + r1(by) + ' H' + r1(bx - 8) + ' V' + r1(by + 7), { stroke: pal.ink2, sw: 1.5 });
    body += S.text((PAD + bx) / 2, by - 20, 'Covered by this workbook: initiation and project start', { size: 12, weight: 600, fill: pal.ink2, anchor: 'middle' });
    body += S.text(bx + 8, docY + docH + 2, 'Planning ends here', { size: 11, fill: pal.muted });
    STAGES.forEach((st, i) => {
      const x = PAD + i * stepX;
      const on = st.id === cur;
      const post = st.id === 'post';
      const sty = on
        ? { fill: pal.accent, stroke: pal.accent, ink: pal.accentInk, sub: pal.accentInk }
        : post
          ? { fill: pal.bg, stroke: pal.muted, dash: '5 4', ink: pal.ink2, sub: pal.muted }
          : { fill: pal.box, stroke: pal.boxLine, ink: pal.ink, sub: pal.ink2 };
      body += chev(x, chevY, cw, ch, i === 0, tip, { fill: sty.fill, stroke: sty.stroke, sw: on ? 1 : 1.2, dash: sty.dash });
      const ta = x + (i === 0 ? 12 : tip + 6);
      const tb = x + cw - tip - 4;
      const mid = (ta + tb) / 2;
      const lines = [{ t: st.name, size: 13, weight: 600, fill: sty.ink }, { t: st.sub, size: 11, weight: 400, fill: sty.sub }];
      if (on) lines.push({ t: 'Current stage', size: 11, weight: 700, fill: sty.ink });
      const bh = lines.reduce((s, l) => s + l.size * 1.3, 0);
      let ty = chevY + (ch - bh) / 2;
      lines.forEach((l) => {
        body += S.text(mid, ty, S.fit(l.t, tb - ta, l.size, l.weight), { size: l.size, weight: l.weight, fill: l.fill, anchor: 'middle' });
        ty += l.size * 1.3;
      });
      // document at the end of the stage
      const dw = Math.min(150, cw - 40);
      if (st.doc) {
        body += S.line(mid, chevY + ch + 3, mid, docY - 3, { stroke: pal.muted, sw: 1.2, markerEnd: aidD });
        body += doc(mid - dw / 2, docY, dw, docH, { fill: pal.bg, stroke: on ? pal.accent : pal.ink2, sw: on ? 2 : 1.2 });
        body += S.box(mid - dw / 2, docY, dw - 8, docH, st.doc, { size: 12, color: pal.ink, maxLines: 2, pad: 8 });
      } else {
        body += S.rect(mid - dw / 2, docY, dw, docH, { stroke: pal.boxLine, dash: '4 3', rx: 6 });
        body += S.box(mid - dw / 2, docY, dw, docH, 'Results in use, benefits measured', { size: 11.5, weight: 400, color: pal.muted, italic: true, maxLines: 2 });
      }
      // controlling loop over the implementation
      if (st.id === 'impl') {
        const r = 30;
        body += S.path('M' + r1(mid + r) + ',' + r1(chevY - 3) + ' C' + r1(mid + r) + ',' + r1(chevY - 42) + ' ' + r1(mid - r) + ',' + r1(chevY - 42) + ' ' + r1(mid - r) + ',' + r1(chevY - 5), { stroke: pal.ink2, sw: 1.5, markerEnd: aid });
        body += S.text(mid, chevY - 64, 'Controlling cycles', { size: 12, weight: 600, fill: pal.ink2, anchor: 'middle' });
      }
    });
    let y = docY + docH + 22;
    if (!cur) {
      body += S.text(PAD, y, 'Set the project status on the overview page to mark the current stage.', { size: 11, fill: pal.muted, italic: true });
      y += 18;
    }
    return S.svg(W, y, body, { pal, label: 'Project management process with its documents' });
  }

  // =====================================================================================
  // Graphic: planning effort ladder
  // =====================================================================================
  const LADDER = [
    { id: 'process', name: 'Process', sub: 'Routine work', perm: true },
    { id: 'line', name: 'Line task', sub: 'Plan or measure', perm: true },
    { id: 'C', name: 'Project C', sub: 'Small project' },
    { id: 'B', name: 'Project B', sub: 'Medium project' },
    { id: 'A', name: 'Project A', sub: 'Large project' },
    { id: 'prog', name: 'Programme', sub: 'Several projects' },
  ];

  /** Where the project sits on the ladder, from the categorisation in section 3.2. */
  function ladderPos(q) {
    const fin = q.f('category.final') || q.f('category.result');
    const cls = String(q.f('category.class') || '').trim().charAt(0).toUpperCase();
    const hasCls = ['A', 'B', 'C'].includes(cls);
    if (fin === 'Programme') return { ids: ['prog'] };
    if (fin === 'Project') return hasCls ? { ids: [cls] } : { ids: ['C', 'B', 'A'], note: 'class not set' };
    if (fin === 'Plan or measure') return { ids: ['line'] };
    if (fin === 'Below') return { ids: ['process'] };
    if (!fin && hasCls) return { ids: [cls] };
    return null;
  }

  function ladder(q, pal) {
    const gap = 8;
    const n = LADDER.length;
    const lx0 = PAD + 4;
    const colW = (W - 2 * PAD - 8 - (n - 1) * gap) / n;
    const baseY = 262;
    const hOf = (i) => 34 + i * 27;
    const pos = ladderPos(q);
    const marked = pos ? pos.ids : [];
    let body = '';
    const aid = S.uid('le');
    body += '<defs>' + S.arrowDef(aid, pal.ink2) + '</defs>';
    LADDER.forEach((l, i) => {
      const x = lx0 + i * (colW + gap);
      const h = hOf(i);
      const on = marked.includes(l.id);
      const fill = on ? pal.accent : l.perm ? pal.box : pal.accentSoft;
      const stroke = on ? pal.accent : l.perm ? pal.boxLine : pal.accent;
      body += S.path('M' + r1(x) + ',' + r1(baseY) + ' V' + r1(baseY - h + 4) + ' Q' + r1(x) + ',' + r1(baseY - h) + ' ' + r1(x + 4) + ',' + r1(baseY - h) + ' H' + r1(x + colW - 4) + ' Q' + r1(x + colW) + ',' + r1(baseY - h) + ' ' + r1(x + colW) + ',' + r1(baseY - h + 4) + ' V' + r1(baseY) + ' Z', { fill, stroke, sw: on ? 1.5 : 1 });
      body += S.text(x + colW / 2, baseY - h - 36, l.name, { size: 13, weight: 600, fill: pal.ink, anchor: 'middle' });
      body += S.text(x + colW / 2, baseY - h - 18, l.sub, { size: 11, fill: pal.ink2, anchor: 'middle' });
      body += S.text(x + colW / 2, baseY - 10, String(i + 1), { size: 11, weight: 600, fill: on ? pal.accentInk : pal.muted, anchor: 'middle', v: 'base' });
    });
    if (pos) {
      const idx = marked.map((id) => LADDER.findIndex((l) => l.id === id));
      const i0 = Math.min.apply(null, idx);
      const i1 = Math.max.apply(null, idx);
      const xa = lx0 + i0 * (colW + gap);
      const xb = lx0 + i1 * (colW + gap) + colW;
      const topY = baseY - hOf(i1) - 66;
      const label = 'This project' + (pos.note ? ' (' + pos.note + ')' : '');
      const pw = S.measure(label, 12, 600) + 24;
      const cx = (xa + xb) / 2;
      body += S.rect(cx - pw / 2, topY - 4, pw, 22, { fill: pal.accent, rx: 11 });
      body += S.text(cx, topY + 7, label, { size: 12, weight: 600, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
      if (idx.length > 1) body += S.path('M' + r1(xa + 6) + ',' + r1(topY + 26) + ' V' + r1(topY + 22) + ' H' + r1(xb - 6) + ' V' + r1(topY + 26), { stroke: pal.accent, sw: 1.5 });
      else body += S.poly([[cx - 6, topY + 18], [cx + 6, topY + 18], [cx, topY + 25]], { fill: pal.accent });
    } else {
      body += S.text(lx0, 10, 'Categorise the project in section 3.2 to mark where it sits.', { size: 11, fill: pal.muted, italic: true });
    }
    // permanent and temporary organisation
    let y = baseY + 10;
    const bracket = (xa, xb, label) => S.path('M' + r1(xa) + ',' + r1(y) + ' V' + r1(y + 6) + ' H' + r1(xb) + ' V' + r1(y), { stroke: pal.axis, sw: 1.5 }) + S.text((xa + xb) / 2, y + 12, label, { size: 12, fill: pal.ink2, anchor: 'middle' });
    body += bracket(lx0, lx0 + 2 * colW + gap, 'Permanent organisation');
    body += bracket(lx0 + 2 * (colW + gap), lx0 + n * colW + (n - 1) * gap, 'Temporary organisation');
    y += 46;
    const al = 'Planning effort and complexity grow';
    const alW = S.measure(al, 11, 600) + 16;
    body += S.line(lx0, y, W - PAD - 6, y, { stroke: pal.ink2, sw: 1.5, markerEnd: aid });
    body += S.rect(lx0 + 20, y - 9, alW, 18, { fill: pal.bg });
    body += S.text(lx0 + 28, y, al, { size: 11, weight: 600, fill: pal.ink2, v: 'middle' });
    y += 16;
    return S.svg(W, y, body, { pal, label: 'Planning effort ladder' });
  }

  // =====================================================================================
  // Graphic: triple constraint
  // =====================================================================================
  const DEPTHS = ['Rough', 'Detailed', 'Very detailed'];

  function depthGauge(x, y, val, pal) {
    const lvl = DEPTHS.indexOf(val) + 1;
    let out = '';
    for (let i = 0; i < 3; i++) out += S.rect(x + i * 17, y - 4, 14, 8, { fill: i < lvl ? pal.accent : pal.bg, stroke: i < lvl ? pal.accent : pal.boxLine, rx: 2 });
    out += S.text(x + 3 * 17 + 6, y, lvl ? val : 'Depth not set', { size: 12, weight: lvl ? 600 : 400, fill: lvl ? pal.ink : pal.muted, italic: !lvl, v: 'middle' });
    return out;
  }

  function triangle(q, pal) {
    const cx = W / 2;
    const top = { x: cx, y: 50 };
    const bl = { x: cx - 240, y: 300 };
    const br = { x: cx + 240, y: 300 };
    let body = '';
    body += S.poly([[top.x, top.y], [br.x, br.y], [bl.x, bl.y]], { fill: pal.accentSoft, stroke: pal.accent, sw: 2 });
    // centre: the project organisation
    const named = q.people().filter((p) => p.name);
    const pms = named.filter((p) => (p.roles || []).includes('Project manager')).length;
    const core = named.filter((p) => (p.roles || []).includes('PMTM')).length;
    const cy = (top.y + bl.y + br.y) / 3 + 6;
    body += S.text(cx, cy - 14, 'Project organisation', { size: 13, weight: 600, fill: pal.ink, anchor: 'middle' });
    const orgTxt = named.length ? named.length + ' people' + (pms || core ? ': ' + [pms ? pms + ' PM' : '', core ? core + ' core team' : ''].filter(Boolean).join(', ') : '') : 'No people named yet';
    body += S.text(cx, cy + 6, S.fit(orgTxt, 250, 12), { size: 12, fill: named.length ? pal.ink2 : pal.muted, italic: !named.length, anchor: 'middle' });
    // corner nodes
    const node = (p, label) => {
      const w = S.measure(label, 13, 600) + 30;
      return S.rect(p.x - w / 2, p.y - 17, w, 34, { fill: pal.bg, stroke: pal.accent, sw: 2, rx: 17 }) + S.text(p.x, p.y, label, { size: 13, weight: 600, fill: pal.ink, anchor: 'middle', v: 'middle' });
    };
    body += node(top, 'Scope') + node(bl, 'Time') + node(br, 'Resources and costs');
    // annotations
    const line = (x, y, t, o) => S.text(x, y, t, Object.assign({ size: 12, fill: pal.ink2 }, o || {}));
    const muted = { fill: pal.muted, italic: true };
    // scope, to the right of the top corner
    const sx = top.x + 52;
    let sy = top.y - 30;
    const tmplWbs = !q.state.t.wbs;
    const phases = q.phases();
    const content = phases.filter((p) => p.kind === 'Phase').length;
    const pmPh = phases.some((p) => p.kind === 'PM phase');
    const wps = q.wps().length;
    body += depthGauge(sx + 58, sy + 6, q.f('ov.depthScope'), pal);
    sy += 20;
    if (phases.length || wps) {
      body += line(sx + 58, sy, content + ' content phase' + (content === 1 ? '' : 's') + (pmPh ? ' + PM phase' : '') + (tmplWbs ? ' (template)' : ''), tmplWbs ? muted : null);
      body += line(sx + 58, sy + 17, wps + ' work package' + (wps === 1 ? '' : 's') + (tmplWbs ? ' (template)' : ''), tmplWbs ? muted : null);
    } else body += line(sx + 58, sy, 'No WBS yet', muted);
    // time, below the bottom-left corner
    const pd = q.projectDates();
    let ty = bl.y + 30;
    body += depthGauge(bl.x - 60, ty, q.f('ov.depthTime'), pal);
    ty += 16;
    if (pd.start || pd.end) {
      body += line(bl.x, ty, (pd.start ? U.fmtDate(pd.start) : '?') + ' to ' + (pd.end ? U.fmtDate(pd.end) : '?'), { anchor: 'middle' });
      const days = U.spanDays(pd);
      if (days > 0) body += line(bl.x, ty + 17, days + ' days, ' + q.rows('milestones').filter((m) => m.baseline || m.actual).length + ' dated milestones', { anchor: 'middle' });
    } else body += line(bl.x, ty, 'No dates yet', Object.assign({ anchor: 'middle' }, muted));
    // resources and costs, below the bottom-right corner
    let cy2 = br.y + 30;
    body += depthGauge(br.x - 60, cy2, q.f('ov.depthCost'), pal);
    cy2 += 16;
    const tc = PM.metrics.totalCost ? metricValue(PM.metrics.totalCost, q) : null;
    const budget = U.num(q.f('content.budget'));
    const pdays = PM.metrics.personDays ? metricValue(PM.metrics.personDays, q) : null;
    const costLines = [];
    if (typeof tc === 'number') costLines.push('Planned cost ' + q.money(tc));
    else if (budget) costLines.push('Rough budget ' + q.money(budget));
    if (typeof pdays === 'number' && pdays) costLines.push(q.num(pdays) + ' person-days');
    if (costLines.length) costLines.forEach((t, i) => (body += line(br.x, cy2 + i * 17, t, { anchor: 'middle' })));
    else body += line(br.x, cy2, 'No cost figures yet', Object.assign({ anchor: 'middle' }, muted));
    const h = Math.max(ty + 17, cy2 + 17) + 22;
    return S.svg(W, h, body, { pal, label: 'Triple constraint: scope, time, resources and costs' });
  }

  // =====================================================================================
  // Key figures block (HTML table, also exported to Word)
  // =====================================================================================
  const keyFigures = {
    type: 'custom',
    render(el, q) {
      const esc = U.esc;
      const list = metricList(q);
      let html = '<div class="tbl-head"><h3 class="blk-t">Key figures</h3></div>';
      html += '<p class="hint">Headline numbers from the other sections. They update as you fill in the plans.</p>';
      html += '<div class="tbl-scroll"><table class="grid compact"><thead><tr><th scope="col" style="min-width:22ch">Figure</th><th scope="col" class="k-number" style="min-width:12ch">Value</th><th scope="col" style="min-width:20ch">From section</th></tr></thead><tbody>';
      if (!list.length) html += '<tr class="empty"><td colspan="3">No key figures yet. They appear once the planning sections are in use.</td></tr>';
      list.forEach((f) => {
        const num = typeof f.v === 'number';
        html += '<tr><td class="ro">' + esc(f.m.label || f.m.key) + '</td>' +
          '<td class="ro' + (num ? ' k-number' : '') + (f.v === null ? ' ph' : '') + '">' + esc(f.v === null ? 'not filled in yet' : f.text) + '</td>' +
          '<td class="ro">' + (f.ref.id && PM.sections.some((s) => s.id === f.ref.id) ? '<a href="#' + esc(f.ref.id) + '">' + esc(f.ref.label) + '</a>' : esc(f.ref.label)) + '</td></tr>';
      });
      el.innerHTML = html + '</tbody></table></div>';
    },
    update(el, q) {
      keyFigures.render(el, q);
    },
    exportBlocks(q, opts) {
      let list = metricList(q);
      if (!opts.empty) list = list.filter((f) => f.v !== null);
      if (!list.length) return [];
      return [
        { type: 'h3', text: 'Key figures' },
        {
          type: 'table',
          columns: [{ label: 'Figure', width: 2.2 }, { label: 'Value', width: 1.4, align: 'right' }, { label: 'From section', width: 2.2 }],
          rows: list.map((f) => [f.m.label || f.m.key, f.v === null ? '' : f.text, f.ref.label]),
          fontSize: 9,
        },
      ];
    },
  };

  // =====================================================================================
  // Sections
  // =====================================================================================
  const TERMS = [
    ['po', 'PO, PS', 'Project owner or project sponsor: two names for the same role. Strategic responsibility; represents the company in the project.'],
    ['pm', 'PM', 'Project manager. Full operative responsibility; a project has exactly one.'],
    ['pmtm', 'PMTM, PTM', 'Project management team member: a core team member who is responsible for work packages.'],
    ['psc', 'PSC', 'Steering committee above the project.'],
    ['pmo', 'PMO', 'Project management office.'],
    ['charter', 'Project Charter', 'The project assignment, signed by PO and PM.'],
    ['pmplan', 'PM plan, PHB', 'All project plans and documents in one place, also called the project handbook.'],
    ['wbs', 'WBS', 'Work breakdown structure: every task of the project, ordered by phase.'],
    ['wp', 'WP', 'Work package: a task in the WBS with one responsible person.'],
    ['code', 'WBS code', 'Code of a WBS line, also called code of account (CoA), for example 1.3.3.'],
    ['pd', 'PD', 'Person-days (also written MD or PT).'],
    ['bc', 'BC', 'Business case: costs against benefits over the life cycle.'],
    ['cr', 'CR', 'Change request: a formal request to change scope, dates or costs.'],
  ];

  PM.section({
    id: 'overview',
    part: 'overview',
    order: 1,
    title: 'Project at a glance',
    navTitle: 'At a glance',
    intro: 'Your project file for the initiation and start of a project, from the first idea to the approved PM plan. Fill it in section by section; the graphics update as you type.',
    blocks: [
      {
        type: 'guide',
        title: 'How to use this workbook',
        ordered: true,
        items: [
          'Start with the project details below. Name, dates and status feed the graphics on every page.',
          'Work through the sections in the menu in order. Section 1 shows the ten steps and where each one is documented.',
          'Grey text in a field or table is a hint from the template. Replace it with your own words.',
          'Switch on Example at the top to see a filled-in sample project. It is read-only, and your own file stays as it is.',
          'Your entries are saved as you type.',
          'Export makes a Word file with every table and graphic, and an Excel file with every table.',
        ],
      },
      {
        type: 'fields',
        title: 'Project',
        cols: 4,
        fields: [
          { key: 'meta.name' },
          { key: 'meta.kind' },
          { key: 'meta.status' },
          { key: 'meta.org' },
          { key: 'meta.author' },
          { key: 'meta.version' },
          { key: 'meta.updated' },
          { key: 'meta.currency' },
          { key: 'meta.summary' },
        ],
      },
      {
        type: 'fields',
        title: 'Start and end',
        hint: 'Fix the start and the end both as an event and as a date. The event stays the same when the date moves.',
        cols: 2,
        fields: [{ key: 'time.startEvent' }, { key: 'time.startDate' }, { key: 'time.endEvent' }, { key: 'time.endDate' }, { key: 'time.duration' }],
      },
      {
        type: 'graphic',
        title: 'Project at a glance',
        caption: 'Project, timeline with the milestones, the status of the ten steps and the key figures of the plans. Hollow diamonds are baseline dates, filled ones actual dates.',
        render: glance,
      },
      keyFigures,
      {
        type: 'table',
        key: 'ovTerms',
        title: 'Glossary',
        hint: 'Abbreviations used in this workbook. Note the names your organisation uses, so every reader of the file understands them.',
        compact: true,
        fixed: TERMS.map(([id, term, meaning]) => ({ _id: id, term, meaning })),
        columns: [
          { key: 'term', label: 'Term', from: true, w: 12 },
          { key: 'meaning', label: 'Meaning', from: true, w: 44 },
          { key: 'ours', label: 'What we call it in our organisation', kind: 'text', w: 26, placeholder: 'Our term' },
        ],
      },
    ],
  });

  PM.section({
    id: 'process',
    part: 'overview',
    order: 2,
    num: '1',
    title: 'Process map: the ten steps',
    navTitle: 'Process map',
    intro: 'Two processes of five steps each take a project from the first idea to an approved PM plan. Record for each step what happened in your project.',
    blocks: [
      {
        type: 'guide',
        title: 'What goes in and what comes out',
        items: [
          'Initiation process (steps I1 to I5): starts with a project idea and ends with the (preliminarily) released Project Charter.',
          'Project start process (steps S1 to S5): starts with the preliminary charter and ends with the final charter and the approved PM plan, version 1.0.',
          'Each process ends with a decision of the PO: project approval in I5 and approval of the PM plan in S5.',
          'The ten steps are an example. Section 8 shows how to scale them to your project.',
        ],
      },
      {
        type: 'graphic',
        title: 'Process map',
        caption: 'Each chevron is one step, coloured by its status in the table below, with the date you entered. The released charter at the end of the initiation is the input of the project start.',
        render: processMap,
      },
      { type: 'table', key: 'steps' },
      {
        type: 'graphic',
        title: 'Initiation process: activities, roles, formats, results',
        caption: 'One column per step. Each cell shows what you wrote in the table above; until then it shows the method’s default in grey italics. Amber marks the formats that are events, the meetings and workshops.',
        render: (q, pal) => stepMatrix(q, pal, 'initiation'),
      },
      {
        type: 'graphic',
        title: 'Project start process: activities, roles, formats, results',
        caption: 'One column per step. Each cell shows what you wrote in the table above; until then it shows the method’s default in grey italics. Amber marks the formats that are events, the meetings and workshops.',
        render: (q, pal) => stepMatrix(q, pal, 'start'),
      },
    ],
  });

  PM.section({
    id: 'ideas',
    part: 'overview',
    order: 3,
    num: '2',
    title: 'Core ideas and planning depth',
    navTitle: 'Core ideas',
    intro: 'The ideas behind the method and how deep your planning goes. Note how each one applies to your project.',
    blocks: [
      { type: 'h', text: 'Three views of a project', sub: 'A project is a task, a temporary organisation and a social system at the same time. Each view asks something different of the planning.' },
      {
        type: 'fields',
        cols: 1,
        fields: [
          { key: 'ov.viewTask', label: 'Task with special characteristics', kind: 'textarea', placeholder: 'What makes this task a project?', hint: 'Unique, goal-oriented, new, complex, risky and dynamic. Each company sets its own project definition, categories and initiation process.' },
          { key: 'ov.viewOrg', label: 'Temporary organisation', kind: 'textarea', placeholder: 'How is the project organised next to the line?', hint: 'Own roles, organisation chart, processes, communication and culture, set up next to the permanent line organisation. This makes projects fast and flexible.' },
          { key: 'ov.viewSocial', label: 'Social system', kind: 'textarea', placeholder: 'How does the team build a shared view?', hint: 'It has boundaries, a context and inner structures, and its behaviour cannot be predicted. The team has to build a shared view of the project.' },
        ],
      },
      { type: 'h', text: 'Four principles of the approach', sub: 'The method rests on four principles. Describe how you applied each one.' },
      {
        type: 'table',
        key: 'ovMist',
        title: 'Principles in practice',
        hint: 'The first three columns explain the principle; the last column is yours.',
        fixed: [
          { _id: 'M', letter: 'M', principle: 'Management process', practice: 'Project management applies methods, tools, techniques and competencies to the project.' },
          { _id: 'I', letter: 'I', principle: 'Iterative, process-oriented', practice: 'Work in cycles of observing, deciding and acting. Plans are adapted step by step.' },
          { _id: 'S', letter: 'S', principle: 'Systemic-constructivist', practice: 'There is more than one reality, so the team has to build a common view.' },
          { _id: 'T', letter: 'T', principle: 'Team-oriented', practice: 'Project management is shared work: the whole team plans and controls.' },
        ],
        columns: [
          { key: 'letter', label: '', from: true, family: 'mono', w: 3 },
          { key: 'principle', label: 'Principle', from: true, w: 16 },
          { key: 'practice', label: 'In practice', from: true, w: 30 },
          {
            key: 'applied', label: 'How we applied it', kind: 'textarea', w: 34,
            placeholder: (r) => ({ M: 'e.g. which methods and tools you used', I: 'e.g. planning rounds, re-planning', S: 'e.g. how you built a shared picture', T: 'e.g. who planned together, and when' })[r && r._id] || '',
          },
        ],
      },
      { type: 'h', text: 'The project management process', sub: 'Every stage ends with a document. This workbook covers the first two stages.' },
      {
        type: 'graphic',
        title: 'Project management process',
        caption: 'Initiating and planning are covered here; controlling runs in cycles during the implementation. The stage that matches the project status on the overview page is highlighted.',
        render: pmProcess,
      },
      { type: 'h', text: 'Planning effort', sub: 'The more complex the task, the more planning it needs. Processes and line tasks stay in the line; projects and programmes get a temporary organisation.' },
      {
        type: 'graphic',
        title: 'Planning effort ladder',
        caption: 'From routine process to programme, each step needs more planning. The marker shows the category set in section 3.2 (project class C, B or A).',
        render: ladder,
      },
      { type: 'note', html: 'The marker comes from the categorisation in <a href="#category">section 3.2</a>.', text: 'The marker comes from the categorisation in section 3.2.' },
      { type: 'h', text: 'Triple constraint and planning depth', sub: 'Scope, time, and resources and costs each get a plan. How deep each plan goes depends on the project, but no corner may be skipped.' },
      {
        type: 'fields',
        title: 'How deep we plan',
        cols: 3,
        fields: [
          { key: 'ov.depthScope', label: 'Scope plan', kind: 'select', options: DEPTHS },
          { key: 'ov.depthTime', label: 'Schedule', kind: 'select', options: DEPTHS },
          { key: 'ov.depthCost', label: 'Resource and cost plan', kind: 'select', options: DEPTHS },
        ],
      },
      {
        type: 'graphic',
        title: 'Triple constraint',
        caption: 'The project organisation sits in the middle and holds the three plans together. Each corner shows the chosen planning depth and this project’s figures.',
        render: triangle,
      },
      { type: 'h', text: 'Method pyramid', sub: 'The more complex the project, the further up the pyramid the planning goes. Risk management grows with it.' },
      {
        type: 'graphic',
        title: 'Method pyramid',
        caption: 'Methods by level, from the foundation to optional detailed planning, styled by the decisions in the method check.',
        empty: () => (typeof PM.graphics.methodPyramid === 'function' ? null : 'The method pyramid appears once section 8 is available.'),
        emptyW: W,
        render: (q, pal) => PM.graphics.methodPyramid(q, pal),
      },
      { type: 'note', html: 'Decide in the method check of <a href="#tailoring">section 8</a> which methods this project uses.', text: 'Decide in the method check of section 8 which methods this project uses.' },
    ],
  });

  // =====================================================================================
  // Headline numbers of this file
  // =====================================================================================
  PM.metric('ovDuration', {
    label: 'Project duration',
    kind: 'number',
    unit: 'days',
    section: 'overview',
    fn: (q) => {
      const n = U.spanDays(q.projectDates());
      return n > 0 ? n : null;
    },
  });
  PM.metric('ovStepsDone', {
    label: 'Steps done',
    kind: 'text',
    section: 'process',
    fn: (q) => {
      const n = q.rows('steps').filter((r) => r.status === 'Done').length;
      return n ? n + ' of ' + PM.PROCESS.length : null;
    },
  });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  PM.example({
    f: {
      'ov.viewTask': 'A one-off festival for about 400 guests on a fixed date, 27 June. Nobody in the team had run an event of this size, and weather, safety and registrations were real risks.',
      'ov.viewOrg': 'A temporary team of six from Corporate Communications, Facility Management, Marketing and Finance, working on the festival next to their line jobs. The Head of HR was the project owner; a board member followed the project as steering committee.',
      'ov.viewSocial': 'Many people had an opinion about a staff festival: departments, the works council, families and the venue’s neighbours. The start workshop gave the team one shared picture, and the stakeholder plan kept the others on board.',
      'ov.depthScope': 'Detailed',
      'ov.depthTime': 'Detailed',
      'ov.depthCost': 'Rough',
    },
    x: {
      ovMist: {
        M: { applied: 'Used charter, WBS, milestone plan, cost plan and risk table, and reported to the sponsor every four weeks.' },
        I: { applied: 'Planned in two rounds (planning workshop in January, start workshop in February) and re-planned catering and safety when the venue contract slipped by four days.' },
        S: { applied: 'Collected the expectations of HR, the works council and the departments before fixing the concept; the employee survey gave the guests a voice.' },
        T: { applied: 'The core team planned together in the start workshop. Each core team member owned one phase and reported in the controlling meeting.' },
      },
      ovTerms: {
        po: { ours: 'Sponsor (Head of HR)' },
        psc: { ours: 'Management board' },
        pmo: { ours: 'None; HR project office helps' },
        charter: { ours: 'Project assignment' },
        pmplan: { ours: 'Project handbook (team drive)' },
        pd: { ours: 'Person-days' },
        cr: { ours: 'Change request form' },
      },
    },
  });
})();
