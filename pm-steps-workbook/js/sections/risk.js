/* Framework section 5: risk management (identify, assess, plan measures, implement and control). */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const W = 1000; // width of every drawing in this file

  const SOURCES = ['Project plans', 'Checklists', 'Content documentation', 'Expert interviews', 'Brainstorming', 'Lessons learned'];
  const CATS = ['Content and quality', 'Dates', 'Resources and costs', 'People and organisation', 'Stakeholders', 'External'];
  const STRATS = ['Avoid', 'Reduce', 'Transfer', 'Accept'];
  const STATUS = ['Open', 'Watching', 'Occurred', 'Closed'];
  const RUNNING = ['Implementation', 'Closing', 'Closed'];
  const DEF_HIGH = 5000;
  const DEF_MEDIUM = 1500;

  // =====================================================================================
  // Calculations
  // =====================================================================================
  const num = (v) => U.num(v);

  /** Priority thresholds: the fields, else High from 5,000 and Medium from 1,500. */
  function thr(q) {
    let H = num(q.f('risk.thresholdHigh'));
    let M = num(q.f('risk.thresholdMedium'));
    if (!(H > 0)) H = DEF_HIGH;
    if (!(M > 0)) M = Math.min(DEF_MEDIUM, H);
    if (M > H) M = H;
    return { H, M };
  }

  /** Risk value = risk cost × probability / 100 (probability is stored 0–100). */
  function riskValue(r) {
    const c = num(r.cost);
    const p = num(r.prob);
    return c != null && p != null ? Math.round(c * p) / 100 : null;
  }

  function priorityOf(v, q) {
    if (v == null || v === '') return '';
    const t = thr(q);
    return v >= t.H ? 'High' : v >= t.M ? 'Medium' : 'Low';
  }

  const isActive = (st) => !st || st === 'Open' || st === 'Watching';

  /** The risk table as plain items, numbered as on the page. */
  function riskList(q) {
    return q.rows('risks').map((r, i) => {
      const cost = num(r.cost);
      const prob = num(r.prob);
      const filled = !!(r.title || cost != null || prob != null || r.desc);
      const value = riskValue(r);
      return {
        r, no: i + 1, filled, ph: !filled,
        title: r.title || q.label(r, 'title') || 'Risk ' + (i + 1),
        cost, prob, value, pri: priorityOf(value, q),
        pcost: num(r.pcost), pos: !!r.positive, status: r.status || '',
      };
    });
  }
  const realRisks = (q) => riskList(q).filter((it) => it.filled);
  const threats = (q) => realRisks(q).filter((it) => !it.pos);

  const budget = (q) => U.sum(threats(q).filter((it) => isActive(it.status)), (it) => it.value);
  const valueTotal = (q) => U.sum(threats(q), (it) => it.value);
  const preventionTotal = (q) => U.sum(realRisks(q), (it) => it.pcost);
  const highOpen = (q) => threats(q).filter((it) => it.pri === 'High' && it.status !== 'Closed');

  function totalCost(q) {
    if (!PM.metrics.totalCost) return null;
    try {
      const v = PM.metrics.totalCost.fn(q);
      return typeof v === 'number' && v > 0 ? v : null;
    } catch (e) {
      return null;
    }
  }

  const names = (list) => list.map((it) => it.no + ' ' + it.title).join(', ');
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');

  // =====================================================================================
  // Drawing helpers
  // =====================================================================================
  function moneyShort(q, v) {
    const c = q.cur();
    return (c.length > 1 ? c + ' ' : c) + S.compact(v);
  }

  function floor125(v) {
    const k = Math.floor(Math.log10(v));
    const base = Math.pow(10, k);
    const m = Math.round((v / base) * 1e6) / 1e6;
    return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * base;
  }
  function ceil125(v) {
    const k = Math.floor(Math.log10(v));
    const base = Math.pow(10, k);
    const m = Math.round((v / base) * 1e6) / 1e6;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * base;
  }

  /** Fill, outline and number colour of a risk dot. */
  function dotStyle(it, pal) {
    if (it.status === 'Closed') return { fill: pal.box, stroke: pal.muted, sw: 1.2, dash: '2 2', ink: pal.muted };
    if (it.pos) return { fill: pal.bg, stroke: pal.good, sw: 2, ink: pal.ink };
    const fill = it.pri === 'High' ? pal.crit : it.pri === 'Medium' ? pal.warn : pal.good;
    return { fill, ink: pal.accentInk };
  }
  function dot(cx, cy, r, st) {
    return S.circle(cx, cy, r, { fill: st.fill, stroke: st.stroke, sw: st.sw, dash: st.dash });
  }

  /** Legend row with custom swatches. items: [{label, swatch(x, cy) => svg}]. Returns {svg, h}. */
  function legendRow(items, x, y, maxW, pal) {
    const size = 11;
    let cx = x;
    let cy = y;
    let out = '';
    for (const it of items) {
      const w = 14 + 6 + S.measure(it.label, size) + 18;
      if (cx + w > x + maxW && cx > x) {
        cx = x;
        cy += 18;
      }
      out += it.swatch(cx + 7, cy + 7);
      out += S.text(cx + 20, cy + 7, it.label, { size, fill: pal.ink2, v: 'middle' });
      cx += w;
    }
    return { svg: out, h: cy - y + 14 };
  }

  function priorityLegend(pal, withState) {
    const items = [
      { label: 'High', swatch: (x, y) => dot(x, y, 5.5, { fill: pal.crit }) },
      { label: 'Medium', swatch: (x, y) => dot(x, y, 5.5, { fill: pal.warn }) },
      { label: 'Low', swatch: (x, y) => dot(x, y, 5.5, { fill: pal.good }) },
    ];
    if (withState) {
      items.push({ label: 'Opportunity (positive risk)', swatch: (x, y) => dot(x, y, 5, { fill: pal.bg, stroke: pal.good, sw: 2 }) });
      items.push({ label: 'Closed', swatch: (x, y) => dot(x, y, 5.5, { fill: pal.box, stroke: pal.muted, sw: 1.2, dash: '2 2' }) });
    }
    return items;
  }

  // =====================================================================================
  // Graphic: the four steps, filled from the risk table
  // =====================================================================================
  function stepsSvg(q, pal) {
    const real = realRisks(q);
    const gap = 8;
    const pw = (W - 16 - gap * 3) / 4;
    const top = 50;
    const PH = 178;
    const titles = ['Identify risks', 'Assess risks', 'Plan measures', 'Implement and control'];
    let body = '';
    const px = (i) => 8 + i * (pw + gap);

    titles.forEach((t, i) => {
      body += S.chevron(px(i), 8, pw + (i < 3 ? gap : 0), 34, { first: i === 0, fill: pal.accent, tip: 14 });
      body += S.text(px(i) + (i ? 20 : 14), 25, String(i + 1), { size: 13, weight: 700, fill: pal.accentInk, v: 'middle' });
      body += S.text(px(i) + (i ? 36 : 30), 25, t, { size: 13, weight: 600, fill: pal.accentInk, v: 'middle' });
      body += S.rect(px(i), top, pw, PH, { fill: pal.box, stroke: pal.boxLine, rx: 8 });
    });

    // 1 Identify: the three sides of the project triangle
    {
      const cx = px(0) + pw / 2;
      const count = (cat) => real.filter((it) => it.r.cat === cat).length;
      const tp = [cx, top + 36];
      const bl = [cx - 64, top + 114];
      const br = [cx + 64, top + 114];
      body += S.poly([tp, bl, br], { fill: pal.accentSoft, stroke: pal.accent, sw: 1.5 });
      [[tp, count('Content and quality')], [bl, count('Resources and costs')], [br, count('Dates')]].forEach(([p, n]) => {
        body += S.circle(p[0], p[1], 12, { fill: pal.accent });
        body += S.text(p[0], p[1], String(n), { size: 11, weight: 700, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
      });
      body += S.text(cx + 18, tp[1], 'Content, quality', { size: 11, fill: pal.ink2, v: 'middle' });
      body += S.text(bl[0], bl[1] + 24, 'Resources, costs', { size: 11, fill: pal.ink2, anchor: 'middle', v: 'middle' });
      body += S.text(br[0], br[1] + 24, 'Dates', { size: 11, fill: pal.ink2, anchor: 'middle', v: 'middle' });
      body += S.text(cx, top + 92, real.length ? plural(real.length, 'risk') : 'No risks yet', { size: 12, weight: 700, fill: real.length ? pal.ink : pal.muted, anchor: 'middle', v: 'middle', italic: !real.length });
      const other = real.length - count('Content and quality') - count('Resources and costs') - count('Dates');
      const src = (q.f('risk.sources') || []).length;
      body += S.text(cx, top + PH - 14, S.fit(other + ' other · sources used: ' + src + ' of ' + SOURCES.length, pw - 16, 10.5), { size: 10.5, fill: pal.muted, anchor: 'middle', v: 'middle' });
    }

    // 2 Assess: R = E × P and the priorities
    {
      const cx = px(1) + pw / 2;
      const parts = [['R', -70, 'risk value'], ['=', -38], ['E', -4, 'risk cost'], ['×', 34], ['P', 70, 'probability']];
      parts.forEach(([t, dx, sub]) => {
        body += S.text(cx + dx, top + 32, t, { size: 24, weight: 700, fill: sub ? pal.ink : pal.ink2, anchor: 'middle', v: 'middle' });
        if (sub) body += S.text(cx + dx, top + 56, sub, { size: 10, fill: pal.muted, anchor: 'middle', v: 'middle' });
      });
      const pr = ['High', 'Medium', 'Low'].map((p, i) => ({ p, n: real.filter((it) => it.pri === p).length, fill: [pal.crit, pal.warn, pal.good][i] }));
      const ws = pr.map((c) => 26 + S.measure(c.p + ' ' + c.n, 11));
      let x = cx - (U.sum(ws) + 12) / 2;
      pr.forEach((c, i) => {
        body += S.rect(x, top + 76, ws[i], 22, { fill: pal.bg, stroke: pal.boxLine, rx: 11 });
        body += dot(x + 12, top + 87, 4.5, { fill: c.fill });
        body += S.text(x + 21, top + 87, c.p + ' ' + c.n, { size: 11, fill: pal.ink, v: 'middle' });
        x += ws[i] + 6;
      });
      const b = budget(q);
      body += S.text(cx, top + 120, b ? 'Risk budget ' + q.money(b) : 'Risk budget not known yet', { size: 12, weight: b ? 600 : 400, fill: b ? pal.ink : pal.muted, anchor: 'middle', v: 'middle', italic: !b });
      body += S.text(cx, top + 138, 'sum of the open risk values', { size: 10.5, fill: pal.muted, anchor: 'middle', v: 'middle' });
      const na = real.filter((it) => it.value == null).length;
      body += S.text(cx, top + PH - 14, na ? plural(na, 'risk') + ' not assessed yet' : 'Usual probability: 5% to 70%', { size: 10.5, fill: pal.muted, anchor: 'middle', v: 'middle' });
    }

    // 3 Plan measures: risks per strategy
    {
      const x0 = px(2);
      const cnt = STRATS.map((s) => real.filter((it) => it.r.strategy === s).length);
      const max = Math.max(1, ...cnt);
      STRATS.forEach((s, i) => {
        const y = top + 24 + i * 26;
        body += S.text(x0 + 14, y, s, { size: 11.5, fill: pal.ink2, v: 'middle' });
        const w = (cnt[i] / max) * 110;
        if (w > 0) body += S.bar(x0 + 82, y - 6, w, 12, { fill: pal.accent, horizontal: true });
        else body += S.line(x0 + 82, y - 6, x0 + 82, y + 6, { stroke: pal.axis });
        body += S.text(x0 + 82 + w + 6, y, String(cnt[i]), { size: 11, weight: 600, fill: pal.ink, v: 'middle' });
      });
      const prev = real.filter((it) => it.r.prevent).length;
      const corr = real.filter((it) => it.r.correct).length;
      body += S.text(x0 + 14, top + 134, 'Preventive measures: ' + prev, { size: 11, fill: pal.ink2, v: 'middle' });
      body += S.text(x0 + 14, top + 152, 'Corrective measures: ' + corr, { size: 11, fill: pal.ink2, v: 'middle' });
    }

    // 4 Implement and control
    {
      const x0 = px(3);
      const log = q.rows('riskLog').filter((l) => l.date || l.change);
      const dates = log.map((l) => l.date).filter(U.isDate).sort();
      const linked = real.filter((it) => it.r.prevent && it.r.wbs).length;
      const rows = [
        [String(linked), 'measures in the WBS'],
        [String(log.length), log.length === 1 ? 'entry in the risk log' : 'entries in the risk log'],
      ];
      rows.forEach(([n, label], i) => {
        const y = top + 26 + i * 36;
        body += S.text(x0 + 14, y, n, { size: 20, weight: 700, fill: pal.ink, v: 'middle' });
        body += S.text(x0 + 50, y, label, { size: 11, fill: pal.ink2, v: 'middle' });
      });
      body += S.text(x0 + 14, top + 102, dates.length ? 'Last review: ' + q.date(dates[dates.length - 1]) : 'No review recorded yet', { size: 11, fill: dates.length ? pal.ink2 : pal.muted, v: 'middle', italic: !dates.length });
      const st = STATUS.map((s) => s + ' ' + real.filter((it) => it.status === s).length);
      body += S.text(x0 + 14, top + 132, S.fit(st.slice(0, 2).join(' · '), pw - 28, 10.5), { size: 10.5, fill: pal.muted, v: 'middle' });
      body += S.text(x0 + 14, top + 150, S.fit(st.slice(2).join(' · '), pw - 28, 10.5), { size: 10.5, fill: pal.muted, v: 'middle' });
    }

    return S.svg(W, top + PH + 8, body, { pal, label: 'Risk management in four steps' });
  }

  // =====================================================================================
  // Graphic: risk matrix (probability × risk cost) with priority zones
  // =====================================================================================
  function matrixSvg(q, pal) {
    const t = thr(q);
    const items = riskList(q);
    const pts = items.filter((it) => !it.ph && it.cost > 0 && it.prob != null);
    const costs = pts.map((it) => it.cost);
    const lo = floor125(Math.min(t.M, ...costs) * 0.95);
    const hi = ceil125(Math.max(t.H * 4, ...costs.map((c) => c * 1.2)));
    const x0 = 78;
    const x1 = 590;
    const yTop = 44;
    const yBot = 384;
    const PMAX = 80;
    const R = 10;
    const X = (p) => x0 + (Math.max(0, Math.min(PMAX, p)) / PMAX) * (x1 - x0);
    const lnLo = Math.log(lo);
    const lnSpan = Math.log(hi) - lnLo;
    const Y = (c) => yBot - ((Math.log(Math.max(lo, Math.min(hi, c))) - lnLo) / lnSpan) * (yBot - yTop);

    let body = '';
    // zones: everything is Low, then the areas where the risk value reaches the thresholds
    body += S.rect(x0, yTop, x1 - x0, yBot - yTop, { fill: pal.bg });
    body += S.rect(x0, yTop, x1 - x0, yBot - yTop, { fill: pal.status.good, fillOpacity: 0.1 });
    const curve = (T) => {
      const pTop = (T * 100) / hi;
      if (pTop >= PMAX) return null;
      const pa = Math.max(pTop, 0.05);
      const out = [];
      for (let i = 0; i <= 60; i++) {
        const p = pa * Math.pow(PMAX / pa, i / 60);
        out.push([X(p), Y((T * 100) / p)]);
      }
      return out;
    };
    [[t.M, pal.status.warning, 0.18], [t.H, pal.status.critical, 0.14]].forEach(([T, col, op]) => {
      const c = curve(T);
      if (!c) return;
      const area = c.concat([[X(PMAX), yTop]]);
      body += S.poly(area, { fill: pal.bg });
      body += S.poly(area, { fill: col, opacity: op });
      body += S.polyline(c, { stroke: col, sw: 1.2 });
    });

    // grid and axes
    const ticks = [];
    for (let k = Math.floor(Math.log10(lo)); k <= Math.ceil(Math.log10(hi)); k++) {
      [1, 2, 5].forEach((m) => {
        const v = m * Math.pow(10, k);
        if (v >= lo * 0.999 && v <= hi * 1.001) ticks.push({ v, m });
      });
    }
    const shown = ticks.length > 10 ? ticks.filter((tk) => tk.m === 1) : ticks;
    shown.forEach((tk) => {
      const y = Y(tk.v);
      body += S.line(x0, y, x1, y, { stroke: pal.line, sw: 0.6 });
      body += S.text(x0 - 6, y, moneyShort(q, tk.v), { size: 11, fill: pal.ink2, anchor: 'end', v: 'middle' });
    });
    for (let p = 0; p <= PMAX; p += 10) {
      body += S.line(X(p), yTop, X(p), yBot, { stroke: pal.line, sw: 0.6 });
      body += S.text(X(p), yBot + 6, p + '%', { size: 11, fill: pal.ink2, anchor: 'middle', v: 'top' });
    }
    body += S.rect(x0, yTop, x1 - x0, yBot - yTop, { stroke: pal.axis });
    [5, 70].forEach((p) => {
      body += S.line(X(p), yTop - 6, X(p), yBot, { stroke: pal.muted, sw: 1, dash: '3 3' });
    });
    body += S.text((X(5) + X(70)) / 2, yTop - 12, 'usual range of probability: 5% to 70%', { size: 10.5, fill: pal.muted, anchor: 'middle', v: 'middle' });
    body += S.text(8, 12, 'Risk cost (impact), log scale', { size: 11, weight: 600, fill: pal.ink2, v: 'middle' });
    body += S.text((x0 + x1) / 2, yBot + 26, 'Probability of occurrence', { size: 11, weight: 600, fill: pal.ink2, anchor: 'middle', v: 'top' });

    // zone labels
    const zl = (x, y, a, b, anchor) => {
      const w = Math.max(S.measure(a, 12, 700), b ? S.measure(b, 10.5) : 0) + 8;
      body += S.rect(anchor === 'end' ? x - w + 4 : x - 4, y - 3, w, b ? 32 : 18, { fill: pal.bg, fillOpacity: 0.8, rx: 3 });
      body += S.text(x, y, a, { size: 12, weight: 700, fill: pal.ink, anchor, v: 'top' });
      if (b) body += S.text(x, y + 15, b, { size: 10.5, fill: pal.ink2, anchor, v: 'top' });
    };
    if (Y((t.H * 100) / PMAX) - yTop > 40) zl(x1 - 8, yTop + 8, 'High', 'risk value from ' + q.money(t.H), 'end');
    const yM = Y((t.M * 100) / 75);
    const yH = Y((t.H * 100) / 75);
    if (yM - yH > 34) zl(x1 - 8, (yM + yH) / 2 - 14, 'Medium', q.money(t.M) + ' to ' + q.money(t.H), 'end');
    else if (yM - yH > 16) zl(x1 - 8, (yM + yH) / 2 - 7, 'Medium', '', 'end');
    zl(x0 + 8, yBot - 36, 'Low', 'below ' + q.money(t.M), 'start');

    // dots: one per risk, moved aside when they would cover each other
    const placed = [];
    const free = (x, y) => x >= x0 + R && x <= x1 - R && y >= yTop + R && y <= yBot - R && placed.every((d) => Math.hypot(d.x - x, d.y - y) >= 2 * R + 1);
    pts.forEach((it) => {
      const bx = Math.max(x0 + R, Math.min(x1 - R, X(it.prob)));
      const by = Math.max(yTop + R, Math.min(yBot - R, Y(it.cost)));
      let pos = free(bx, by) ? { x: bx, y: by } : null;
      for (let k = 1; !pos && k <= 8; k++) {
        const n = 6 * k;
        for (let j = 0; j < n && !pos; j++) {
          const a = -Math.PI / 2 + (j * 2 * Math.PI) / n;
          const x = bx + Math.cos(a) * k * (2 * R + 2);
          const y = by + Math.sin(a) * k * (2 * R + 2);
          if (free(x, y)) pos = { x, y };
        }
      }
      pos = pos || { x: bx, y: by };
      placed.push({ x: pos.x, y: pos.y, bx, by, it });
    });
    placed.forEach((d) => {
      if (Math.hypot(d.x - d.bx, d.y - d.by) > 1) {
        body += S.line(d.bx, d.by, d.x, d.y, { stroke: pal.muted, sw: 1 });
        body += S.circle(d.bx, d.by, 2.5, { fill: pal.muted });
      }
    });
    placed.forEach((d) => {
      const st = dotStyle(d.it, pal);
      body += dot(d.x, d.y, R, st);
      body += S.text(d.x, d.y, String(d.it.no), { size: d.it.no > 99 ? 8.5 : 11, weight: 700, fill: st.ink, anchor: 'middle', v: 'middle' });
    });
    if (!pts.length) {
      const msg = 'Enter the risk cost and probability to place the risks';
      const w = S.measure(msg, 12) + 24;
      const cx = (x0 + x1) / 2;
      const cy = (yTop + yBot) / 2;
      body += S.rect(cx - w / 2, cy - 15, w, 30, { fill: pal.bg, stroke: pal.boxLine, rx: 6 });
      body += S.text(cx, cy, msg, { size: 12, fill: pal.muted, anchor: 'middle', v: 'middle', italic: true });
    }

    const lg = legendRow(priorityLegend(pal, true), x0, yBot + 50, x1 - x0, pal);
    body += lg.svg;
    let h = yBot + 50 + lg.h + 8;

    // list of the risks beside the matrix
    const xl = 624;
    const xr = W - 12;
    body += S.text(xl, 22, 'No.', { size: 10.5, weight: 600, fill: pal.muted, v: 'middle' });
    body += S.text(xl + 40, 22, 'Risk', { size: 10.5, weight: 600, fill: pal.muted, v: 'middle' });
    body += S.text(xr, 22, 'Risk value', { size: 10.5, weight: 600, fill: pal.muted, anchor: 'end', v: 'middle' });
    body += S.line(xl, 32, xr, 32, { stroke: pal.line });
    const rowH = 21;
    items.forEach((it, i) => {
      const y = yTop + i * rowH + rowH / 2 - 2;
      if (!it.ph && it.value != null) body += dot(xl + 5, y, 5, dotStyle(it, pal));
      body += S.text(xl + 16, y, String(it.no), { size: 11, weight: 600, fill: it.ph ? pal.muted : pal.ink, family: 'mono', v: 'middle' });
      body += S.text(xl + 40, y, S.fit(it.title + (it.pos && !it.ph ? ' (opportunity)' : ''), xr - 76 - (xl + 40), 11.5), { size: 11.5, fill: it.ph ? pal.muted : pal.ink, italic: it.ph, v: 'middle' });
      if (!it.ph) {
        const txt = it.value != null ? q.money(it.value) : 'not assessed';
        body += S.text(xr, y, txt, { size: 11, fill: it.value != null ? pal.ink2 : pal.muted, italic: it.value == null, anchor: 'end', v: 'middle' });
      }
      body += S.line(xl, y + rowH / 2, xr, y + rowH / 2, { stroke: pal.grid, sw: 0.8 });
    });
    if (!items.length) body += S.text(xl, yTop + 8, 'No risks in the table yet.', { size: 11.5, fill: pal.muted, italic: true, v: 'middle' });
    h = Math.max(h, yTop + items.length * rowH + 10);
    return S.svg(W, h, body, { pal, label: 'Risk matrix' });
  }

  // =====================================================================================
  // Graphic: risk strategies as a waterfall
  // =====================================================================================
  function strategyModel(q) {
    const th = threats(q).filter((it) => it.value > 0);
    const total = U.sum(th, (it) => it.value);
    const part = (s) => th.filter((it) => it.r.strategy === s);
    const sum = (list) => U.sum(list, (it) => it.value);
    const none = th.filter((it) => STRATS.indexOf(it.r.strategy) < 0);
    return {
      total, th,
      avoid: part('Avoid'), reduce: part('Reduce'), transfer: part('Transfer'), accept: part('Accept'), none,
      sum,
    };
  }

  function strategiesSvg(q, pal) {
    const m = strategyModel(q);
    const total = m.total;
    const topY = 86;
    const yB = 300;
    const hMax = yB - topY;
    const BW = 24;
    const hOf = (v) => (v / total) * hMax;
    const a = m.sum(m.avoid);
    const r = m.sum(m.reduce);
    const tr = m.sum(m.transfer);
    const rem = total - a - r - tr;
    const L1 = total - a;
    const L2 = L1 - r;
    const L3 = L2 - tr;
    const cols = [
      { label: 'Initial risk', sub: plural(m.th.length, 'risk'), from: 0, to: total, fill: pal.strong, val: q.money(total) },
      { label: 'Avoided', sub: plural(m.avoid.length, 'risk'), from: L1, to: total, fill: pal.accent, val: '−' + q.money(a) },
      { label: 'Reduced', sub: plural(m.reduce.length, 'risk'), from: L2, to: L1, fill: pal.accent, val: '−' + q.money(r) },
      { label: 'Transferred', sub: plural(m.transfer.length, 'risk'), from: L3, to: L2, fill: pal.accent, val: '−' + q.money(tr) },
      { label: 'Remaining', sub: m.accept.length + ' accepted' + (m.none.length ? ', ' + m.none.length + ' open' : ''), from: 0, to: rem, fill: pal.crit, val: q.money(rem) },
    ];
    const cx = (i) => 110 + i * 120;
    const Yv = (v) => yB - hOf(v);
    let body = '';
    body += S.line(48, yB, 650, yB, { stroke: pal.axis });
    cols.forEach((c, i) => {
      const x = cx(i) - BW / 2;
      const y1 = Yv(c.to);
      const y0 = Yv(c.from);
      const hh = y0 - y1;
      if (hh >= 1) {
        if (c.from === 0) body += S.bar(x, y1, BW, hh, { fill: c.fill });
        else body += S.rect(x, y1, BW, hh, { fill: c.fill, rx: 2 });
      } else body += S.line(x - 2, y1, x + BW + 2, y1, { stroke: c.fill, sw: 2 });
      body += S.text(cx(i), y1 - 7, c.val, { size: 11.5, weight: 600, fill: pal.ink, anchor: 'middle', v: 'base' });
      if (i > 0 && i < 4 && total > 0) body += S.text(cx(i) + BW / 2 + 5, (y1 + y0) / 2, Math.round(((c.to - c.from) / total) * 100) + '%', { size: 10.5, fill: pal.muted, v: 'middle' });
      body += S.text(cx(i), yB + 8, c.label, { size: 12, weight: 600, fill: pal.ink, anchor: 'middle', v: 'top' });
      body += S.text(cx(i), yB + 24, c.sub, { size: 10.5, fill: pal.muted, anchor: 'middle', v: 'top' });
      if (i < 4) {
        const lv = i === 0 ? total : c.from;
        body += S.line(cx(i) + BW / 2 + (i > 0 && i < 4 ? 34 : 2), Yv(lv), cx(i + 1) - BW / 2 - 2, Yv(lv), { stroke: pal.muted, sw: 1, dash: '3 3' });
      }
    });
    // measures of the first three strategies go into the plan
    const bx0 = cx(1) - 44;
    const bx1 = cx(3) + 44;
    body += S.path('M' + bx0 + ',62 V54 H' + bx1 + ' V62 M' + (bx0 + bx1) / 2 + ',54 V48', { stroke: pal.ink2, sw: 1.2 });
    const prev = preventionTotal(q);
    body += S.text((bx0 + bx1) / 2, 34, 'Preventive measures go into the WBS and the cost plan' + (prev ? ' (' + q.money(prev) + ')' : ''), { size: 11, fill: pal.ink2, anchor: 'middle', v: 'middle', italic: true });

    // remaining risk leads to corrective measures
    const ay = yB - 52;
    body += S.chevron(624, ay - 26, 34, 52, { first: true, fill: pal.critSoft, stroke: pal.crit, sw: 1.2, tip: 16 });
    const corr = realRisks(q).filter((it) => it.r.correct).length;
    const b = budget(q);
    const sub = plural(corr, 'corrective measure') + ' planned. Risk budget for the open risks: ' + (b ? q.money(b) : 'not known yet') + '.';
    body += S.box(670, ay - 46, W - 12 - 670, 92, 'Planning of corrective measures', { fill: pal.box, stroke: pal.boxLine, size: 13, color: pal.ink, sub, subSize: 11, subColor: pal.ink2, subMaxLines: 3 });

    // unidentified risks
    const by = yB + 46;
    const tres = num(q.f('risk.timeReserve'));
    body += S.rect(48, by, 602, 26, { fill: pal.box, stroke: pal.boxLine, dash: '4 3', rx: 4 });
    body += S.text(349, by + 13, 'Unidentified risks: some always remain. ' + (tres ? 'Time reserve: ' + plural(tres, 'day') + '.' : 'Keep a time reserve for them.'), { size: 11, fill: pal.ink2, italic: true, anchor: 'middle', v: 'middle' });
    return S.svg(W, by + 26 + 8, body, { pal, label: 'Risk strategies' });
  }

  // =====================================================================================
  // Graphic: risk value against the cost of prevention
  // =====================================================================================
  function preventionSvg(q, pal) {
    const rows = realRisks(q).filter((it) => it.value > 0 || it.pcost > 0);
    const top = 34;
    const rowH = 32;
    const bx = 272;
    const bw = 440;
    const max = Math.max(...rows.map((it) => Math.max(it.value || 0, it.pcost || 0)));
    const nt = S.niceTicks(max, 4);
    const sx = (v) => (v / nt.max) * bw;
    let body = '';
    const lg = S.legend([{ label: 'Risk value', color: pal.series[0] }, { label: 'Cost of prevention', color: pal.series[1] }], 8, 8, pal, { maxW: 500 });
    body += lg.svg;
    const bottom = top + rows.length * rowH;
    nt.ticks.forEach((v) => {
      body += S.line(bx + sx(v), top - 4, bx + sx(v), bottom, { stroke: pal.grid });
      body += S.text(bx + sx(v), bottom + 6, moneyShort(q, v), { size: 10.5, fill: pal.muted, anchor: 'middle', v: 'top' });
    });
    let dear = 0;
    rows.forEach((it, i) => {
      const y = top + i * rowH;
      body += S.text(8, y + 12, S.fit(it.no + '  ' + it.title + (it.pos ? ' (opportunity)' : ''), bx - 18, 12), { size: 12, fill: pal.ink, v: 'middle' });
      const v = it.value || 0;
      const p = it.pcost || 0;
      if (v > 0) body += S.bar(bx, y + 1, Math.max(2, sx(v)), 10, { fill: pal.series[0], horizontal: true });
      body += S.text(bx + sx(v) + 6, y + 6, v > 0 ? q.money(v) : 'no value', { size: 10.5, fill: pal.ink2, v: 'middle', italic: !(v > 0) });
      if (p > 0) body += S.bar(bx, y + 13, Math.max(2, sx(p)), 10, { fill: pal.series[1], horizontal: true });
      body += S.text(bx + sx(p) + 6, y + 18, p > 0 ? q.money(p) : 'no prevention cost', { size: 10.5, fill: pal.ink2, v: 'middle', italic: !(p > 0) });
      if (p > 0 && v > 0 && p > v) {
        dear += 1;
        const fx = 806;
        body += S.poly([[fx, y + 18], [fx + 7, y + 5], [fx + 14, y + 18]], { fill: pal.crit });
        body += S.text(fx + 7, y + 13.5, '!', { size: 9, weight: 700, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
        body += S.text(fx + 20, y + 12, 'costs more than the risk', { size: 11, fill: pal.ink, v: 'middle' });
      }
      if (i < rows.length - 1) body += S.line(8, y + rowH - 4, W - 8, y + rowH - 4, { stroke: pal.grid, sw: 0.6 });
    });
    body += S.line(bx, top - 4, bx, bottom, { stroke: pal.axis });
    const sumTxt = 'Risk value of all risks ' + q.money(valueTotal(q)) + ' · cost of prevention ' + q.money(preventionTotal(q)) + (dear ? ' · ' + plural(dear, 'measure') + ' cost more than the risk' : '');
    body += S.text(8, bottom + 30, sumTxt, { size: 11.5, weight: 600, fill: pal.ink2, v: 'middle' });
    return S.svg(W, bottom + 44, body, { pal, label: 'Risk value against the cost of prevention' });
  }

  // =====================================================================================
  // Checks (from the recommendations of the method)
  // =====================================================================================
  function runChecks(q) {
    const items = realRisks(q);
    if (!items.length) return [{ ok: null, text: 'Add risks to the risk table to run the checks.' }];
    const out = [];
    const t = thr(q);

    const withP = items.filter((it) => it.prob != null);
    const outside = withP.filter((it) => it.prob < 5 || it.prob > 70);
    if (outside.length) out.push({ ok: null, text: 'Probability outside the usual 5% to 70%: ' + names(outside) + '. Below 5% a measure rarely pays; above 70% the risk is close to certain, so plan it as work and cost.' });
    else if (withP.length) out.push({ ok: true, text: 'Every probability lies between 5% and 70%.' });
    const na = items.filter((it) => it.value == null);
    if (na.length) out.push({ ok: false, text: 'Not assessed yet (risk cost or probability missing): ' + names(na) + '.' });

    const high = items.filter((it) => !it.pos && it.pri === 'High' && it.status !== 'Closed');
    const highBad = high.filter((it) => !it.r.prevent || !it.r.owner);
    if (!high.length) out.push({ ok: null, text: 'No open High risk (High from ' + q.money(t.H) + ').' });
    else out.push(highBad.length ? { ok: false, text: 'High risks without a preventive measure or an owner: ' + names(highBad) + '.' } : { ok: true, text: 'Every High risk has a preventive measure and an owner.' });

    const noStrat = items.filter((it) => !it.pos && it.status !== 'Closed' && STRATS.indexOf(it.r.strategy) < 0);
    out.push(noStrat.length ? { ok: false, text: 'No strategy chosen yet: ' + names(noStrat) + '.' } : { ok: true, text: 'Every open risk has a strategy (avoid, reduce, transfer or accept).' });

    const meas = items.filter((it) => it.r.prevent);
    const noW = meas.filter((it) => !it.r.wbs);
    if (meas.length) out.push(noW.length ? { ok: false, text: 'Preventive measures without a WBS line: ' + names(noW) + '. Plan each measure as work in the WBS.' } : { ok: true, text: 'Every preventive measure is linked to a WBS line.' });

    const dear = items.filter((it) => it.pcost > 0 && it.value != null && it.pcost > it.value);
    out.push(dear.length ? { ok: false, text: 'Prevention costs more than the risk value: ' + names(dear) + '. Choose a cheaper measure or accept the risk.' } : { ok: true, text: 'No preventive measure costs more than its risk value.' });

    const highAll = items.filter((it) => !it.pos && it.pri === 'High');
    out.push(highAll.length <= 10 ? { ok: true, text: plural(highAll.length, 'High risk') + ': a number the team can manage.' } : { ok: null, text: highAll.length + ' High risks. Cut the list down to the critical risks you can influence.' });

    const appr = q.f('risk.budgetApproved');
    const b = budget(q);
    out.push(appr === 'Yes' ? { ok: true, text: 'The sponsor approved the risk budget' + (q.f('risk.budgetApprovedOn') ? ' on ' + q.date(q.f('risk.budgetApprovedOn')) : '') + '.' } : { ok: false, text: 'Have the sponsor approve the risk budget (' + q.money(b) + ') and the time reserve.' });

    const tc = totalCost(q);
    const inPlan = q.f('risk.inCostPlan') === 'Yes';
    out.push(inPlan ? { ok: true, text: 'The risk budget is part of the cost plan.' } : { ok: false, text: 'Include the risk budget in the cost plan.' });
    if (tc) out.push({ ok: null, text: 'Risk budget ' + q.money(b) + ' is ' + q.pct(Math.round((b / tc) * 1000) / 10) + ' of the planned cost (' + q.money(tc) + '); prevention adds ' + q.money(preventionTotal(q)) + '.' });

    if (RUNNING.indexOf(q.f('meta.status')) >= 0) {
      const dates = q.rows('riskLog').map((l) => l.date).filter(U.isDate);
      out.push(dates.length ? { ok: true, text: 'Risk controlling: ' + plural(dates.length, 'dated entry', 'dated entries') + ' in the risk log.' } : { ok: false, text: 'The project runs: record at least one risk review in the risk log.' });
    } else out.push({ ok: null, text: 'Once the project runs, review the risks regularly and record it in the risk log.' });
    return out;
  }

  // =====================================================================================
  // Section
  // =====================================================================================
  const riskOptions = (q) => q.rows('risks').map((r, i) => ({ value: r._id, label: i + 1 + ' ' + (r.title || q.label(r, 'title') || '…') }));

  PM.section({
    id: 'risk',
    part: 'risk',
    order: 50,
    num: '5',
    title: 'Risk management',
    slides: '138–146',
    landscape: true,
    intro: 'Find the risks, put a value on them and decide what you do about them. The risk values add up to the risk budget the sponsor approves.',
    blocks: [
      {
        type: 'guide',
        title: 'Risk management in four steps',
        text: 'The team does this together and repeats it throughout the project. It builds on the plans and can change them. Some risks will always stay unidentified.',
        ordered: true,
        items: [
          'Identify: collect risks from the project plans, checklists, content documents, expert interviews, brainstorming and lessons learned. Look at content and quality, dates, and resources and costs.',
          'Assess: estimate what the risk would cost if it happens and how likely it is, usually between 5% and 70%. Risk value = risk cost × probability. Work on the highest values first.',
          'Plan measures: preventive measures act now, corrective measures are ready for when the risk occurs. Pick a strategy for each risk: avoid, reduce, transfer or accept.',
          'Implement and control: put the preventive measures into the WBS and the cost plan. Review the risks regularly, reassess them, add new ones, trigger corrective measures and record the changes.',
        ],
      },
      {
        type: 'graphic',
        title: 'Risk management in four steps',
        caption: 'Filled from the risk table and the risk log. Corners of the triangle: risks on content and quality, resources and costs, and dates.',
        render: stepsSvg,
      },
      {
        type: 'table',
        key: 'riskTerms',
        title: 'Terms',
        hint: 'Write one example from your project next to each term.',
        compact: true,
        fixed: [
          { _id: 'risk', term: 'Risk', meaning: 'A single future event that may affect content and quality, dates, resources or costs. The effect can be negative or positive.' },
          { _id: 'crisis', term: 'Crisis', meaning: 'An event that threatens the project as a whole. It goes to the sponsor at once.' },
          { _id: 'rm', term: 'Risk management', meaning: 'Finding and assessing risks, planning measures, carrying them out and checking them.' },
        ],
        columns: [
          { key: 'term', label: 'Term', from: true, w: 12 },
          { key: 'meaning', label: 'Meaning', from: true, w: 40 },
          { key: 'example', label: 'In our project', kind: 'textarea', w: 30, placeholder: 'An example from your project' },
        ],
      },
      { type: 'h', text: 'Identify and assess', sub: 'Steps 1 and 2' },
      {
        type: 'fields',
        cols: 3,
        fields: [
          { key: 'risk.sources', label: 'Sources used', kind: 'multi', options: SOURCES, wide: true },
          { key: 'risk.firstAssessment', label: 'First risk assessment', kind: 'date', hint: 'Rough first look in step I3 of the initiation.' },
          { key: 'risk.fullAnalysis', label: 'Full risk analysis', kind: 'date', hint: 'Risk table completed in the start process (step S3).' },
        ],
      },
      {
        type: 'fields',
        title: 'Priority thresholds',
        hint: 'Risk value from which a risk counts as High or Medium. Left empty: High from 5,000, Medium from 1,500.',
        cols: 2,
        fields: [
          {
            key: 'risk.thresholdHigh', label: 'High from', kind: 'money',
            placeholder: (q) => {
              const tc = totalCost(q);
              return tc ? '10% of the cost plan: ' + U.fmtNum(Math.round(tc / 10)) : '5,000 (or 10% of the cost plan)';
            },
          },
          { key: 'risk.thresholdMedium', label: 'Medium from', kind: 'money', placeholder: '1,500' },
        ],
      },
      {
        type: 'table',
        key: 'risks',
        title: 'Risk table',
        hint: 'One line per risk. Risk value and priority are calculated. Name the WBS line where the preventive measure is planned; its cost goes into the cost plan.',
        numbered: true,
        addLabel: 'Add risk',
        columns: [
          { key: 'title', label: 'Title', kind: 'text', w: 20, placeholder: 'Short name' },
          { key: 'desc', label: 'Description and cause', kind: 'textarea', w: 24, placeholder: 'What could happen, and why' },
          { key: 'cat', label: 'Category', kind: 'select', options: CATS, w: 14 },
          { key: 'cost', label: 'Risk cost', kind: 'money', w: 9, sub: 'if it occurs' },
          { key: 'delay', label: 'Delay', kind: 'number', w: 6, sub: 'weeks' },
          { key: 'prob', label: 'Probability', kind: 'percent', w: 7, sub: 'about 5–70%' },
          {
            key: 'value', label: 'Risk value', kind: 'money', w: 9, sub: 'cost × probability',
            compute: (r) => riskValue(r),
            total: (rows, q) => {
              const s = U.sum(rows.filter((r) => !r.positive), (r) => riskValue(r));
              return s ? q.money(s) + (rows.some((r) => r.positive) ? ' (threats)' : '') : '';
            },
          },
          { key: 'priority', label: 'Priority', kind: 'text', w: 7, compute: (r, q) => priorityOf(r.value, q) },
          { key: 'strategy', label: 'Strategy', kind: 'select', options: STRATS, w: 9 },
          { key: 'prevent', label: 'Preventive measure', kind: 'textarea', w: 22, placeholder: 'What we do now' },
          { key: 'wbs', label: 'WBS of the measure', kind: 'wbs', w: 14 },
          { key: 'pcost', label: 'Cost of prevention', kind: 'money', w: 9, total: true },
          { key: 'correct', label: 'Corrective measure', kind: 'textarea', w: 22, placeholder: 'What we do if it happens' },
          { key: 'owner', label: 'Owner', kind: 'person', w: 12 },
          { key: 'status', label: 'Status', kind: 'select', options: STATUS, w: 9 },
          { key: 'positive', label: 'Positive', kind: 'check', w: 6, sub: 'opportunity' },
        ],
        defaults: [
          { _ph: { title: 'e.g. Key supplier delivers late' } },
          { _ph: { title: 'e.g. Key person drops out' } },
          { _ph: { title: 'e.g. Sponsor cuts the budget' } },
        ],
      },
      {
        type: 'fields',
        title: 'Totals',
        cols: 4,
        fields: [
          { key: 'risk.budget', label: 'Risk budget', kind: 'money', compute: (q) => budget(q) || null, hint: 'Risk values of the open and watched risks, without opportunities.' },
          { key: 'risk.valueTotal', label: 'Risk value of all risks', kind: 'money', compute: (q) => valueTotal(q) || null, hint: 'Every risk in the table, without opportunities.' },
          { key: 'risk.preventionTotal', label: 'Cost of prevention', kind: 'money', compute: (q) => preventionTotal(q) || null, hint: 'Sum of all preventive measures.' },
          { key: 'risk.highCount', label: 'High risks not closed', kind: 'number', compute: (q) => (realRisks(q).length ? highOpen(q).length : null) },
        ],
      },
      {
        type: 'graphic',
        title: 'Risk matrix',
        caption: 'Each dot is one risk, numbered as in the table. The curved lines are the thresholds: along each line the risk value is the same. Dots that would cover each other are moved aside, with a thin line to their exact spot.',
        render: matrixSvg,
      },
      {
        type: 'graphic',
        title: 'Risk strategies',
        caption: 'Start with the risk value of all risks, take off what you avoid, reduce and transfer, and what remains is the risk you accept. Opportunities are left out.',
        empty: (q) => (strategyModel(q).total > 0 ? null : 'Enter risk cost, probability and a strategy for the risks to see the strategies.'),
        render: strategiesSvg,
      },
      {
        type: 'graphic',
        title: 'Risk budget against prevention',
        caption: 'For each risk: what it is worth (risk value) and what the preventive measure costs. A measure that costs more than the risk value rarely pays.',
        empty: (q) => (realRisks(q).some((it) => it.value > 0 || it.pcost > 0) ? null : 'Enter risk cost, probability and the cost of prevention to compare them.'),
        render: preventionSvg,
      },
      { type: 'h', text: 'Risk budget and reserves' },
      {
        type: 'fields',
        hint: 'The sponsor approves the risk budget and the time reserve. Include the risk budget in the cost plan.',
        cols: 4,
        fields: [
          { key: 'risk.budgetApproved', label: 'Risk budget approved by the sponsor', kind: 'select', options: ['Yes', 'No', 'Pending'] },
          { key: 'risk.budgetApprovedOn', label: 'Approved on', kind: 'date' },
          { key: 'risk.timeReserve', label: 'Time reserve', kind: 'number', unit: 'days' },
          { key: 'risk.inCostPlan', label: 'Risk budget in the cost plan', kind: 'select', options: ['Yes', 'No'] },
        ],
      },
      { type: 'h', text: 'Risk controlling', sub: 'Step 4' },
      {
        type: 'table',
        key: 'riskLog',
        title: 'Risk log',
        hint: 'One line per review or change: a new assessment, a risk that occurred, a corrective measure that was triggered. Update the risk table at the same time.',
        addLabel: 'Add entry',
        columns: [
          { key: 'date', label: 'Date', kind: 'date' },
          { key: 'risk', label: 'Risk', kind: 'select', w: 20, options: riskOptions },
          { key: 'change', label: 'What changed', kind: 'textarea', w: 28 },
          { key: 'prob', label: 'New probability', kind: 'percent', w: 7 },
          { key: 'cost', label: 'New risk cost', kind: 'money', w: 9 },
          { key: 'measure', label: 'Measure triggered', kind: 'text', w: 20 },
          { key: 'by', label: 'By', kind: 'person', w: 12 },
        ],
        defaults: [{ _ph: { change: 'e.g. Risk review in the team meeting: all risks reassessed' } }],
      },
      {
        type: 'callout',
        kind: 'tip',
        title: 'Good practice.',
        text: 'Involve as many people as you can, also outside the core team. Build the first risk table on a flip chart. Keep the list to the critical risks you can influence. Use your company’s standard risk table if there is one.',
      },
      { type: 'checks', title: 'Checks', run: runChecks },
    ],
  });

  // =====================================================================================
  // Headline numbers
  // =====================================================================================
  PM.metric('riskBudget', { label: 'Risk budget', kind: 'money', section: 'risk', fn: (q) => budget(q) || null });
  PM.metric('highRisks', { label: 'High risks', kind: 'number', section: 'risk', fn: (q) => (realRisks(q).some((it) => it.value != null) ? highOpen(q).length : null) });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  // [id, title, desc, cat, cost, delay, prob, strategy, prevent, wbs, pcost, correct, owner, status, positive]
  const RK = (_id, title, desc, cat, cost, delay, prob, strategy, prevent, wbs, pcost, correct, owner, status, positive) => ({
    _id, title, desc, cat, cost, delay, prob, strategy, prevent, wbs, pcost, correct, owner, status, positive: !!positive,
  });

  PM.example({
    f: {
      'risk.sources': ['Project plans', 'Checklists', 'Expert interviews', 'Brainstorming', 'Lessons learned'],
      'risk.firstAssessment': '2026-01-20',
      'risk.fullAnalysis': '2026-02-20',
      'risk.thresholdHigh': 5000,
      'risk.thresholdMedium': 1500,
      'risk.budgetApproved': 'Yes',
      'risk.budgetApprovedOn': '2026-02-27',
      'risk.timeReserve': 5,
      'risk.inCostPlan': 'Yes',
    },
    t: {
      risks: [
        RK('rk1', 'Bad weather on the festival day', 'Rain or a storm on 27 June; an open-air programme cannot run.', 'External', 12000, null, 30, 'Reduce', 'Rent a marquee as a fallback and plan a bad-weather programme', 'w134', 2500, 'Move the programme into the marquee', 'p4', 'Watching'),
        RK('rk2', 'Venue contract delayed', 'The landlord is slow to sign; catering and technology cannot be booked before the venue is fixed.', 'Dates', 4000, 1, 40, 'Reduce', 'Start talks early and hold a second venue as an option', 'w131', 300, 'Shift the dependent bookings, use the second venue if needed', 'p4', 'Occurred'),
        RK('rk3', 'Permit refused by the city', 'The authority does not approve the safety concept; the festival cannot take place as planned.', 'Stakeholders', 40000, 4, 15, 'Avoid', 'Early talks with the authority, safety concept submitted six weeks ahead', 'w134', 500, 'Hold a smaller festival on the company grounds', 'p4', 'Closed'),
        RK('rk4', 'Catering supplier cancels', 'The caterer drops out at short notice; a replacement costs more.', 'Resources and costs', 9000, 0.5, 20, 'Transfer', 'Contractual penalty for cancellation, backup caterer on standby', 'w132', 400, 'Call in the backup caterer', 'p4', 'Watching'),
        RK('rk5', 'Low registrations', 'Fewer than 300 people register; fixed costs per guest rise and the event looks empty.', 'Content and quality', 6000, null, 25, 'Reduce', 'Reminder mails and ambassadors in every department', 'w142', 600, 'Invite partners and retirees, scale down the catering order', 'p5', 'Closed'),
        RK('rk6', 'ERP rollout blocks staff time', 'The ERP rollout in May needs the same people from Finance and Facility Management.', 'People and organisation', 4000, 2, 30, 'Accept', '', '', null, 'Hand tasks to the project assistant, buy external help for set-up', 'p2', 'Watching'),
        RK('rk7', 'Injuries at the festival', 'A guest or child is injured at the venue; liability claims follow.', 'External', 60000, null, 10, 'Transfer', 'Event liability insurance and a first-aid service on site', 'w134', 900, 'First aid on site, report the claim to the insurer', 'p4', 'Open'),
        RK('rk8', 'Sponsor withdraws', 'The main sponsor pulls out; €8,000 of income is missing.', 'Resources and costs', 8000, null, 20, 'Reduce', 'Signed agreement with instalments', 'w135', 200, 'Cut programme items, ask the board for extra budget', 'p6', 'Closed'),
        RK('rk9', 'Heat wave', 'Above 32 °C guests suffer and stay away in the afternoon.', 'External', 3000, null, 25, 'Reduce', 'Water stations and shade sails', 'w151', 1200, 'Shorten the afternoon programme, hand out more water', 'p7', 'Watching'),
        RK('rk10', 'Noise complaints from neighbours', 'Neighbours complain about the music in the evening; the city may order an early end.', 'Stakeholders', 2000, null, 30, 'Avoid', 'Letter to the neighbours, music ends at 22:00', 'w142', 150, 'Lower the volume, contact person on site', 'p3', 'Open'),
        RK('rk11', 'Second sponsor joins', 'A local supplier is interested in sponsoring the children’s programme.', 'Resources and costs', 4000, null, 30, 'Accept', 'Send the sponsoring package with the invitation', 'w135', null, 'Extend the children’s programme', 'p6', 'Watching', true),
      ],
      riskLog: [
        { _id: 'rl1', date: '2026-03-06', risk: '', change: 'Risk review in the team meeting: all risks reassessed, no changes.', prob: null, cost: null, measure: '', by: 'p2' },
        { _id: 'rl2', date: '2026-04-10', risk: 'rk2', change: 'Landlord asks to change the liability clause; signature moves from 10 to 14 April.', prob: 100, cost: 1500, measure: 'Catering and technology bookings shifted by 4 days', by: 'p4' },
        { _id: 'rl3', date: '2026-05-20', risk: 'rk5', change: '380 registrations after the first reminder; target reached by 5 June with 430.', prob: 5, cost: null, measure: 'Second reminder through the ambassadors', by: 'p5' },
        { _id: 'rl4', date: '2026-06-09', risk: 'rk3', change: 'The authority approved the safety concept; risk closed.', prob: null, cost: null, measure: '', by: 'p4' },
        { _id: 'rl5', date: '2026-06-19', risk: 'rk1', change: 'Long-range forecast for 27 June: showers likely in the afternoon. Assessment kept at 30%.', prob: 30, cost: 12000, measure: 'Marquee confirmed, bad-weather programme sent to the artists', by: 'p2' },
      ],
    },
    x: {
      riskTerms: {
        risk: { example: 'Rain on the festival day' },
        crisis: { example: 'Losing the venue two weeks before the festival' },
        rm: { example: 'Risk table built in the follow-up workshop on 20 February, reviewed every four weeks' },
      },
    },
  });
})();
