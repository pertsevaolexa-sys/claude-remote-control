/* Framework 3.5 (resources and costs) and 4.2 (detailed resources and costs over time): one cost plan, its summaries, histograms, cost curve and payments. */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const W = 960; // width of the drawings in section 3.5
  const WL = 1000; // width of the drawings in section 4.2 (landscape)
  const PAD = 16;

  const COST_TYPES = ['Staff', 'External labour', 'Material or investment', 'Other'];
  const UNITS = ['PD', 'hours', 'pieces', 't', 'other'];
  const PD_PER = { PD: 1, hours: 1 / 8 };
  const RUNNING = ['Implementation', 'Closing', 'Closed'];

  // =====================================================================================
  // Helpers
  // =====================================================================================
  function num(v) {
    const x = U.num(v);
    return x == null || !isFinite(x) ? null : x;
  }
  const lc = (s) => String(s || '').trim().toLowerCase();
  const pdText = (v) => (v == null ? '—' : U.fmtNum(Math.round(v * 10) / 10, Math.abs(v - Math.round(v)) < 0.05 ? 0 : 1));
  const moneyText = (q, v) => (v == null ? '—' : q.money(Math.round(v)));
  const pctText = (d) => (d >= 0 ? '+' : '−') + U.fmtNum(Math.abs(d), 0) + '%';
  const nsum = (a, b) => (a == null ? b : b == null ? a : a + b);

  /** Resource types by lower-case name, memoized per q. */
  const RT_MEMO = new WeakMap();
  function rtMap(q) {
    let m = RT_MEMO.get(q);
    if (m) return m;
    m = new Map();
    q.rows('resTypes').forEach((r, i) => {
      const name = String(r.name || '').trim();
      if (!name || m.has(lc(name))) return;
      const unit = r.unit || 'PD';
      m.set(lc(name), { id: r._id, idx: i, name, unit, rate: num(r.rate), cap: num(r.capacity), from: r.from || 'Internal', pdu: PD_PER[unit] || 0 });
    });
    RT_MEMO.set(q, m);
    return m;
  }
  const rtOf = (row, q) => (row && row.res ? rtMap(q).get(lc(row.res)) || null : null);
  const isCostType = (res) => COST_TYPES.indexOf(String(res || '').trim()) >= 0;

  /** Project cost type of a cost plan line. */
  function lineCostType(row, q) {
    const rt = rtOf(row, q);
    if (rt) return rt.pdu ? (rt.from === 'External' ? 'External labour' : 'Staff') : 'Material or investment';
    const t = String(row.res || '').trim();
    return isCostType(t) ? t : '';
  }

  function planOf(r, q) {
    const rate = r.rateEff;
    const qty = num(r.qty);
    if (rate == null) return null;
    if (rtOf(r, q)) return qty == null ? null : qty * rate;
    return (qty == null ? 1 : qty) * rate;
  }
  function forecastOf(r) {
    const a = num(r.actual);
    const rem = num(r.remaining);
    if (a == null && rem == null) return r.plan;
    return (a || 0) + (rem || 0);
  }

  /** The level-2 line (phase) a WBS line belongs to; the line itself for phases and the project. */
  function phaseOf(q, w) {
    if (!w || !w.code) return w || null;
    if (U.codeLevel(w.code) <= 2) return w;
    const parts = String(w.code).split('.');
    return q.wbsByCode(parts.slice(0, 2).join('.')) || w;
  }

  // =====================================================================================
  // Model: one memoized view of the cost plan per q
  // =====================================================================================
  const MEMO = new WeakMap();
  function model(q) {
    let m = MEMO.get(q);
    if (!m) {
      m = buildModel(q);
      MEMO.set(q, m);
    }
    return m;
  }

  function buildModel(q) {
    const rts = Array.from(rtMap(q).values());
    const pdTypes = rts.filter((t) => t.pdu);
    const lines = q.rows('costPlan').map((r) => {
      const rt = rtOf(r, q);
      const w = r.wbs ? q.wbsRow(r.wbs) : null;
      const plan = r.plan || 0;
      const actual = num(r.actual);
      const remaining = num(r.remaining);
      const L = { row: r, rt, w, ctype: r.ctype || '', plan, actual, remaining, forecast: r.forecast == null ? plan : r.forecast, dev: r.dev || 0, pd: null };
      if (rt && rt.pdu) {
        const qty = num(r.qty);
        const rate = r.rateEff;
        const toPd = (v) => (v == null || !rate ? null : (v / rate) * rt.pdu);
        const pPlan = qty == null ? 0 : qty * rt.pdu;
        const pFc = actual == null && remaining == null ? pPlan : rate ? (((actual || 0) + (remaining || 0)) / rate) * rt.pdu : null;
        L.pd = { plan: pPlan, actual: toPd(actual), remaining: toPd(remaining), forecast: pFc, dev: pFc == null ? null : pFc - pPlan };
      }
      const d = w ? q.dates(w._id) : null;
      L.start = d && U.isDate(d.start) ? d.start : '';
      L.end = d && U.isDate(d.end) ? d.end : '';
      L.dated = !!(L.start && L.end && L.end >= L.start);
      L.active = !!(L.ctype && (plan || actual || remaining || (L.pd && L.pd.plan)));
      return L;
    });
    const active = lines.filter((l) => l.active);
    const byType = {};
    COST_TYPES.forEach((t) => (byType[t] = 0));
    active.forEach((l) => (byType[l.ctype] += l.plan));
    const totalPlan = U.sum(active, (l) => l.plan);
    const totalPD = U.sum(active, (l) => (l.pd ? l.pd.plan : 0));

    // spread over the months of the schedule
    const pd0 = q.projectDates();
    const dated = active.filter((l) => l.dated);
    const start = U.minDate(dated.map((l) => l.start).concat([pd0.start || '']));
    const end = U.maxDate(dated.map((l) => l.end).concat([pd0.end || '']));
    const months = start && end && end >= start ? U.months(start, end) : [];
    const zeros = () => months.map(() => 0);
    const cost = {};
    const costND = {};
    COST_TYPES.forEach((t) => {
      cost[t] = zeros();
      costND[t] = 0;
    });
    const pd = {};
    const pdND = {};
    pdTypes.forEach((t) => {
      pd[t.name] = zeros();
      pdND[t.name] = 0;
    });
    for (const l of active) {
      if (!l.dated || !months.length) {
        costND[l.ctype] += l.plan;
        if (l.pd) pdND[l.rt.name] += l.pd.plan;
        continue;
      }
      const n = U.diffDays(l.start, l.end) + 1;
      months.forEach((ym, i) => {
        const od = U.overlapDays(l.start, l.end, U.monthStart(ym), U.monthEnd(ym));
        if (!od) return;
        const share = od / n;
        cost[l.ctype][i] += l.plan * share;
        if (l.pd) pd[l.rt.name][i] += l.pd.plan * share;
      });
    }
    return { rts, pdTypes, lines, active, byType, totalPlan, totalPD, start, end, months, cost, costND, pd, pdND };
  }

  /** Colour slots for the resource types with a time unit (fixed order, at most 8). */
  function pdSlots(m, pal) {
    const many = m.pdTypes.length > 8;
    const slots = [];
    const idx = new Map();
    m.pdTypes.forEach((t, i) => {
      const s = many && i >= 7 ? 7 : i;
      if (!slots[s]) slots[s] = { label: many && i >= 7 ? 'Other types' : t.name, color: pal.series[s] };
      idx.set(t.name, s);
    });
    return { slots, idx };
  }
  const costSlots = (pal) => COST_TYPES.map((t, i) => ({ label: t, color: pal.series[i] }));

  /**
   * Group lines by phase (or by their own WBS line) and colour slot.
   * Returns rows [{w, vals, total, head, indent, sub}] sorted by WBS code; in WBS mode a head row per phase.
   */
  function groupRows(q, lines, nSlots, slotOf, valOf, byWp) {
    const groups = new Map();
    for (const l of lines) {
      const v = valOf(l);
      if (!v) continue;
      const s = slotOf(l);
      if (s == null || s < 0) continue;
      const w = byWp ? l.w : phaseOf(q, l.w);
      const k = w ? w._id : '_none';
      if (!groups.has(k)) groups.set(k, { w, vals: new Array(nSlots).fill(0), total: 0 });
      const g = groups.get(k);
      g.vals[s] += v;
      g.total += v;
    }
    const list = Array.from(groups.values()).sort((a, b) => (a.w ? 0 : 1) - (b.w ? 0 : 1) || U.codeCmp(a.w ? a.w.code : '', b.w ? b.w.code : ''));
    if (!byWp) return list;
    const out = [];
    let cur = null;
    for (const g of list) {
      const ph = g.w ? phaseOf(q, g.w) : null;
      const inPhase = ph && U.codeLevel(ph.code) === 2;
      if (inPhase && (!cur || cur.w !== ph)) {
        cur = { head: true, w: ph, total: 0 };
        out.push(cur);
      } else if (!inPhase) cur = null;
      if (inPhase) cur.total += g.total;
      out.push(Object.assign({}, g, { indent: !!inPhase, onPhase: inPhase && g.w === ph }));
    }
    return out;
  }

  // =====================================================================================
  // Drawing helpers
  // =====================================================================================
  /** Row label: WBS code (mono, muted) and name; template names muted and italic. */
  function rowLabel(q, pal, r, x, y, maxX, o) {
    o = o || {};
    if (!r.w) return S.text(x, y, 'No WBS line', { size: 12, fill: pal.muted, italic: true, v: 'middle' });
    const code = r.w.code || '';
    const name = r.onPhase ? 'Booked on the phase' : q.label(r.w, 'name') || 'Unnamed';
    const ph = r.onPhase || q.isPlaceholder(r.w, 'name');
    const nx = x + Math.max(34, S.measure(code, 11, 400, 'mono') + 8);
    return (
      S.text(x, y, code, { size: 11, family: 'mono', fill: pal.muted, v: 'middle' }) +
      S.text(nx, y, S.fit(name, maxX - nx, 12, o.weight), { size: 12, weight: o.weight, fill: ph ? pal.muted : pal.ink, italic: ph, v: 'middle' })
    );
  }

  /** Stacked segments from x0 to the right, 2px gaps between touching segments. */
  function hSegments(x0, y, h, vals, k, colors) {
    let out = '';
    let x = x0;
    const idx = vals.map((v, i) => i).filter((i) => vals[i] > 0);
    idx.forEach((i, j) => {
      const w = vals[i] * k;
      if (j === idx.length - 1) out += S.bar(x, y, Math.max(w, 1), h, { fill: colors[i], horizontal: true });
      else out += S.rect(x, y, Math.max(w - 2, 1), h, { fill: colors[i] });
      x += w;
    });
    return out;
  }

  /** Horizontal stacked bars with labels at the left and values at the bar ends. */
  function hStack(q, pal, o) {
    const leg = S.legend(o.slots.map((s) => ({ label: s.label, color: s.color })), PAD, PAD, pal, { maxW: W - 2 * PAD });
    const x0 = PAD + 300;
    const x1 = W - PAD - o.valueW;
    const bars = o.rows.filter((r) => !r.head);
    const t = S.niceTicks(Math.max(...bars.map((r) => r.total), 0) || 1, 5);
    const k = (x1 - x0) / t.max;
    const axisY = PAD + leg.h + 10;
    const top = axisY + 20;
    const RH = 24;
    const BH = 14;
    let body = leg.svg;
    let y = top;
    const colors = o.slots.map((s) => s.color);
    let rowsSvg = '';
    for (const r of o.rows) {
      const cy = y + RH / 2;
      if (r.head) {
        rowsSvg += rowLabel(q, pal, r, PAD, cy, x0 - 10, { weight: 600 });
        rowsSvg += S.text(x1 + 8, cy, o.fmt(r.total), { size: 11, weight: 600, fill: pal.ink2, v: 'middle' });
      } else {
        rowsSvg += rowLabel(q, pal, r, PAD + (r.indent ? 14 : 0), cy, x0 - 10);
        rowsSvg += hSegments(x0, cy - BH / 2, BH, r.vals, k, colors);
        rowsSvg += S.text(x0 + r.total * k + 6, cy, o.fmt(r.total), { size: 11, fill: pal.ink2, v: 'middle' });
      }
      y += RH;
    }
    const bottom = y;
    t.ticks.forEach((v) => {
      const x = x0 + v * k;
      body += S.line(x, top - 4, x, bottom, { stroke: v === 0 ? pal.axis : pal.grid, sw: 1 });
      body += S.text(x, axisY, o.tick(v), { size: 11, fill: pal.muted, anchor: 'middle' });
    });
    body += rowsSvg;
    let h = bottom + 8;
    if (o.note) {
      body += S.text(PAD, h + 6, o.note, { size: 11, fill: pal.muted, italic: true });
      h += 22;
    }
    return S.svg(W, h + PAD, body, { pal, label: o.label });
  }

  /**
   * Monthly stacked columns. o: {months, slots: [{label, color, vals}], tick, fmt, labelAll, extraMax,
   * overlay(ctx) => svg, legendExtra, note, label}
   */
  function vStack(q, pal, o) {
    const items = o.slots.map((s) => ({ label: s.label, color: s.color })).concat(o.legendExtra || []);
    const leg = S.legend(items, PAD, PAD, pal, { maxW: WL - 2 * PAD });
    const yT = PAD + leg.h + 22;
    const PH = 240;
    const yB = yT + PH;
    const x0 = PAD + 50;
    const x1 = WL - PAD - 120;
    const n = o.months.length;
    const bw = (x1 - x0) / n;
    const cw = Math.min(44, bw * 0.62);
    const totals = o.months.map((ym, i) => U.sum(o.slots, (s) => s.vals[i]));
    const t = S.niceTicks(Math.max(Math.max(...totals, 0), o.extraMax || 0) || 1, 5);
    const Y = (v) => yB - (v / t.max) * PH;
    const cx = (i) => x0 + bw * (i + 0.5);
    let body = leg.svg;
    t.ticks.forEach((v) => {
      body += S.line(x0, Y(v), x1, Y(v), { stroke: v === 0 ? pal.axis : pal.grid, sw: 1 });
      body += S.text(x0 - 8, Y(v), o.tick(v), { size: 11, fill: pal.muted, anchor: 'end', v: 'middle' });
    });
    const maxI = totals.indexOf(Math.max(...totals));
    let labels = ''; // drawn last, on a background patch, so lines do not run through them
    o.months.forEach((ym, i) => {
      let base = 0;
      const segs = o.slots.map((s, j) => j).filter((j) => o.slots[j].vals[i] > 1e-9);
      segs.forEach((j, z) => {
        const v = o.slots[j].vals[i];
        const yt = Y(base + v);
        const hh = Y(base) - yt;
        if (z === segs.length - 1) body += S.bar(cx(i) - cw / 2, yt, cw, Math.max(hh, 1), { fill: o.slots[j].color });
        else if (hh > 2) body += S.rect(cx(i) - cw / 2, yt + 2, cw, hh - 2, { fill: o.slots[j].color });
        base += v;
      });
      if (totals[i] > 1e-9 && (o.labelAll ? n <= 14 || i === maxI : i === maxI)) {
        const lbl = o.fmt(totals[i]);
        const lw = S.measure(lbl, 11) + 6;
        labels += S.rect(cx(i) - lw / 2, Y(totals[i]) - 17, lw, 14, { fill: pal.bg, rx: 2 });
        labels += S.text(cx(i), Y(totals[i]) - 5, lbl, { size: 11, fill: pal.ink2, anchor: 'middle', v: 'base' });
      }
      if (n <= 14 || i % 2 === 0) body += S.text(cx(i), yB + 8, U.monthShort(ym), { size: 11, fill: pal.ink2, anchor: 'middle' });
    });
    if (o.overlay) body += o.overlay({ x0, x1, yT, yB, Y, cx, bw, cw, n, totals });
    body += labels;
    let h = yB + 30;
    if (o.note) {
      body += S.text(PAD, h + 4, o.note, { size: 11, fill: pal.muted, italic: true });
      h += 22;
    }
    return S.svg(WL, h + PAD - 4, body, { pal, label: o.label });
  }

  // =====================================================================================
  // Graphics of section 3.5
  // =====================================================================================
  function staffPlacement(q, pal) {
    const m = model(q);
    const { slots, idx } = pdSlots(m, pal);
    const byWp = q.f('res.depth') === 'Work package';
    const rows = groupRows(q, m.active.filter((l) => l.pd), slots.length, (l) => idx.get(l.rt.name), (l) => l.pd.plan, byWp);
    return hStack(q, pal, {
      rows, slots, valueW: 70, label: 'Staff placement: person-days per ' + (byWp ? 'work package' : 'phase') + ' by resource type',
      fmt: (v) => pdText(v) + ' PD', tick: (v) => U.fmtNum(v),
      note: 'Total ' + pdText(m.totalPD) + ' person-days' + (byWp ? '; phase totals on the phase lines.' : '.'),
    });
  }

  function costsByPhase(q, pal) {
    const m = model(q);
    const slots = costSlots(pal);
    const rows = groupRows(q, m.active, 4, (l) => COST_TYPES.indexOf(l.ctype), (l) => l.plan, false);
    return hStack(q, pal, {
      rows, slots, valueW: 90, label: 'Planned costs per phase by cost type',
      fmt: (v) => moneyText(q, v), tick: (v) => (v ? q.cur() + S.compact(v) : '0'),
      note: 'Total plan ' + moneyText(q, m.totalPlan) + ': ' + COST_TYPES.filter((t) => m.byType[t]).map((t) => t.toLowerCase() + ' ' + moneyText(q, m.byType[t])).join(', ') + '.',
    });
  }

  function availabilityRows(q) {
    const m = model(q);
    return m.pdTypes
      .map((t) => ({ t, need: U.sum(m.active.filter((l) => l.rt === t), (l) => l.pd.plan), cap: t.cap == null ? null : t.cap * t.pdu }))
      .filter((r) => r.need > 0 || r.cap > 0);
  }

  function availability(q, pal) {
    const m = model(q);
    const rows = availabilityRows(q);
    const items = [
      { label: 'Needed (plan)', color: pal.accent },
      { label: 'Needed beyond capacity', color: pal.crit },
      { label: 'Available capacity', color: pal.accentSoft, stroke: pal.boxLine },
    ];
    const leg = S.legend(items, PAD, PAD, pal, { maxW: W - 2 * PAD });
    const x0 = PAD + 230;
    const x1 = W - PAD - 200;
    const t = S.niceTicks(Math.max(...rows.map((r) => Math.max(r.need, r.cap || 0)), 0) || 1, 5);
    const k = (x1 - x0) / t.max;
    const axisY = PAD + leg.h + 10;
    const top = axisY + 20;
    const RH = 32;
    let body = leg.svg;
    let rowsSvg = '';
    rows.forEach((r, i) => {
      const cy = top + i * RH + RH / 2;
      rowsSvg += S.text(PAD, cy - 6, S.fit(r.t.name, x0 - PAD - 12, 12), { size: 12, fill: pal.ink, v: 'middle' });
      rowsSvg += S.text(PAD, cy + 8, r.t.from + (r.t.unit === 'hours' ? ', hours ÷ 8' : ''), { size: 10.5, fill: pal.muted, v: 'middle' });
      if (r.cap > 0) rowsSvg += S.rect(x0, cy - 10, r.cap * k, 20, { fill: pal.accentSoft, stroke: pal.boxLine, sw: 1, rx: 2 });
      const inCap = r.cap == null ? r.need : Math.min(r.need, r.cap);
      const over = r.cap == null ? 0 : Math.max(0, r.need - r.cap);
      if (over > 0) {
        rowsSvg += S.rect(x0, cy - 5, Math.max(inCap * k - 1, 0), 10, { fill: pal.accent });
        rowsSvg += S.bar(x0 + inCap * k + 1, cy - 5, Math.max(over * k - 1, 2), 10, { fill: pal.crit, horizontal: true });
      } else if (r.need > 0) rowsSvg += S.bar(x0, cy - 5, r.need * k, 10, { fill: pal.accent, horizontal: true });
      if (r.cap > 0) rowsSvg += S.line(x0 + r.cap * k, cy - 14, x0 + r.cap * k, cy + 14, { stroke: pal.ink, sw: 2 });
      const lx = x0 + Math.max(r.need, r.cap || 0) * k + 10;
      if (r.cap == null) rowsSvg += S.text(lx, cy, pdText(r.need) + ' PD, capacity not given', { size: 11, fill: pal.muted, v: 'middle' });
      else if (over > 0.05) rowsSvg += S.text(lx, cy, pdText(r.need) + ' of ' + pdText(r.cap) + ' PD, over by ' + pdText(over), { size: 11, weight: 600, fill: pal.crit, v: 'middle' });
      else rowsSvg += S.text(lx, cy, pdText(r.need) + ' of ' + pdText(r.cap) + ' PD', { size: 11, fill: pal.ink2, v: 'middle' });
    });
    const bottom = top + rows.length * RH;
    t.ticks.forEach((v) => {
      const x = x0 + v * k;
      body += S.line(x, top - 4, x, bottom, { stroke: v === 0 ? pal.axis : pal.grid, sw: 1 });
      body += S.text(x, axisY, U.fmtNum(v), { size: 11, fill: pal.muted, anchor: 'middle' });
    });
    body += rowsSvg;
    let h = bottom + 8;
    const others = m.rts.filter((rt) => !rt.pdu).map((rt) => rt.name);
    if (others.length) {
      body += S.text(PAD, h + 6, S.fit('Not compared here (other units): ' + others.join(', '), W - 2 * PAD, 11), { size: 11, fill: pal.muted, italic: true });
      h += 22;
    }
    return S.svg(W, h + PAD, body, { pal, label: 'Availability check: person-days needed against available capacity per resource type' });
  }

  // =====================================================================================
  // Graphics of section 4.2
  // =====================================================================================
  function resourceHistogram(q, pal) {
    const m = model(q);
    const { slots, idx } = pdSlots(m, pal);
    const vals = slots.map(() => m.months.map(() => 0));
    m.pdTypes.forEach((t) => m.pd[t.name].forEach((v, i) => (vals[idx.get(t.name)][i] += v)));
    const capSum = U.sum(m.pdTypes, (t) => (t.cap || 0) * t.pdu);
    const capM = capSum > 0 && m.months.length ? capSum / m.months.length : 0;
    const nd = U.sum(m.pdTypes, (t) => m.pdND[t.name]);
    return vStack(q, pal, {
      months: m.months,
      slots: slots.map((s, i) => Object.assign({}, s, { vals: vals[i] })),
      tick: (v) => U.fmtNum(v), fmt: (v) => pdText(v), labelAll: true, extraMax: capM,
      legendExtra: capM ? [{ label: 'Average capacity per month', color: pal.ink2, shape: 'dash' }] : [],
      overlay: (c) => {
        if (!capM) return '';
        const y = c.Y(capM);
        return (
          S.line(c.x0, y, c.x1, y, { stroke: pal.ink2, sw: 2, dash: '6 4' }) +
          S.text(c.x1 + 8, y - 7, 'Capacity', { size: 11, fill: pal.ink2, v: 'middle' }) +
          S.text(c.x1 + 8, y + 8, 'about ' + pdText(capM) + ' PD/month', { size: 11, fill: pal.ink2, v: 'middle' })
        );
      },
      note: nd > 0.05 ? 'Not shown: ' + pdText(nd) + ' PD on lines without dates.' : 'Person-days per month (PD); each line is spread evenly over the days of its WBS line.',
      label: 'Resource histogram: person-days per month by resource type',
    });
  }

  function costHistogram(q, pal) {
    const m = model(q);
    const slots = costSlots(pal).map((s) => Object.assign({}, s, { vals: m.cost[s.label] }));
    const totals = m.months.map((ym, i) => U.sum(slots, (s) => s.vals[i]));
    const cum = [];
    totals.reduce((a, v, i) => (cum[i] = a + v), 0);
    const total = cum.length ? cum[cum.length - 1] : 0;
    const nd = U.sum(COST_TYPES, (t) => m.costND[t]);
    return vStack(q, pal, {
      months: m.months, slots,
      tick: (v) => (v ? q.cur() + S.compact(v) : '0'), fmt: (v) => moneyText(q, v), extraMax: total,
      legendExtra: [{ label: 'Cumulative cost (cost baseline)', color: pal.strong, shape: 'line' }],
      overlay: (c) => {
        if (!cum.length) return '';
        const pts = cum.map((v, i) => [c.cx(i), c.Y(v)]);
        let out = S.polyline(pts, { stroke: pal.strong, sw: 2 });
        pts.forEach((p) => (out += S.circle(p[0], p[1], 4, { fill: pal.strong, stroke: pal.bg, sw: 1.5 })));
        const last = pts[pts.length - 1];
        const lx = last[0] + Math.max(c.cw / 2, 8) + 6;
        out += S.text(lx, last[1] - 2, 'Cumulative', { size: 11, fill: pal.ink2, v: 'middle' });
        out += S.text(lx, last[1] + 13, moneyText(q, total), { size: 11, weight: 600, fill: pal.ink, v: 'middle' });
        return out;
      },
      note: nd > 0.5 ? 'Not shown: ' + moneyText(q, nd) + ' on lines without dates.' : 'Columns: planned cost per month. Line: cumulative cost to the end of each month.',
      label: 'Cost histogram and cumulative cost curve',
    });
  }

  function payList(q) {
    return q.rows('costPayments').filter((p) => U.isDate(p.date) && num(p.amount)).map((p) => ({ date: p.date, amount: num(p.amount) }));
  }

  function costsAndPayments(q, pal) {
    const m = model(q);
    const pays = payList(q);
    const start = U.minDate([m.start].concat(pays.map((p) => p.date)));
    const end = U.maxDate([m.end].concat(pays.map((p) => p.date)));
    const items = [
      { label: 'Cost baseline (cumulative plan)', color: pal.accent, shape: 'line' },
      { label: 'Payments (cumulative)', color: pal.strong, shape: 'line' },
      { label: 'Costs ahead of payments', color: pal.critSoft, stroke: pal.crit },
      { label: 'Payments ahead of costs', color: pal.goodSoft, stroke: pal.good },
    ];
    const leg = S.legend(items, PAD, PAD, pal, { maxW: WL - 2 * PAD });
    const axT = PAD + leg.h + 8;
    const x0 = PAD + 52;
    const x1 = WL - PAD - 150;
    const sc = S.timeScale(start, end, x0, x1);
    const yT = axT + 22 + 14;
    const PH = 230;
    const yB = yT + PH;
    // daily cost accrual and cumulative values at day boundaries
    const a = S.dayNum(start);
    const n = S.dayNum(end) - a + 1;
    const daily = new Array(n).fill(0);
    m.active.filter((l) => l.dated).forEach((l) => {
      const s = Math.max(0, S.dayNum(l.start) - a);
      const e = Math.min(n - 1, S.dayNum(l.end) - a);
      const per = l.plan / (S.dayNum(l.end) - S.dayNum(l.start) + 1);
      for (let d = s; d <= e; d++) daily[d] += per;
    });
    const C = [0];
    for (let i = 0; i < n; i++) C.push(C[i] + daily[i]);
    const Pb = new Array(n + 1).fill(0);
    const Pa = new Array(n + 1).fill(0);
    const jumps = new Array(n + 1).fill(0);
    pays.forEach((p) => (jumps[Math.min(n - 1, Math.max(0, S.dayNum(p.date) - a))] += p.amount));
    for (let i = 0; i <= n; i++) {
      Pb[i] = i ? Pa[i - 1] : 0;
      Pa[i] = Pb[i] + jumps[i];
    }
    const pTot = Pa[n];
    const cTot = C[n];
    const t = S.niceTicks(Math.max(cTot, pTot) || 1, 5);
    const X = (i) => x0 + i * sc.k;
    const Y = (v) => yB - (v / t.max) * PH;
    let body = leg.svg + S.timeAxis(sc, axT, 22, yB, pal);
    t.ticks.forEach((v) => {
      body += S.line(x0, Y(v), x1, Y(v), { stroke: v === 0 ? pal.axis : pal.grid, sw: 1 });
      body += S.text(x0 - 8, Y(v), v ? q.cur() + S.compact(v) : '0', { size: 11, fill: pal.muted, anchor: 'end', v: 'middle' });
    });
    // shaded areas between the two curves
    const polys = { 1: [], '-1': [] };
    let run = null;
    const flush = () => {
      if (run && run.top.length > 1) polys[run.s].push(run.top.concat(run.bot.slice().reverse()));
      run = null;
    };
    const seg = (xa, xb, ca, cb, p, s) => {
      if (!s) return flush();
      if (!run || run.s !== s) {
        flush();
        run = { s, top: [[xa, Y(ca)]], bot: [[xa, Y(p)]], p };
      } else if (run.p !== p) run.bot.push([xa, Y(p)]);
      run.top.push([xb, Y(cb)]);
      run.bot.push([xb, Y(p)]);
      run.p = p;
    };
    const eps = 1e-6;
    for (let i = 0; i < n; i++) {
      const p = Pa[i];
      const dA = C[i] - p;
      const dB = C[i + 1] - p;
      if (dA * dB < 0) {
        const f = dA / (dA - dB);
        const xm = X(i) + f * (X(i + 1) - X(i));
        seg(X(i), xm, C[i], p, p, Math.sign(dA));
        seg(xm, X(i + 1), p, C[i + 1], p, Math.sign(dB));
      } else {
        const s = dA > eps || dB > eps ? 1 : dA < -eps || dB < -eps ? -1 : 0;
        seg(X(i), X(i + 1), C[i], C[i + 1], p, s);
      }
    }
    flush();
    polys[1].forEach((pts) => (body += S.poly(pts, { fill: pal.critSoft })));
    polys['-1'].forEach((pts) => (body += S.poly(pts, { fill: pal.goodSoft })));
    // cost baseline and payment steps
    body += S.polyline(C.map((v, i) => [X(i), Y(v)]), { stroke: pal.accent, sw: 2 });
    const pp = [[X(0), Y(Pb[0])]];
    const marks = [];
    for (let i = 0; i < n; i++) {
      if (jumps[i]) {
        pp.push([X(i), Y(Pb[i])], [X(i), Y(Pa[i])]);
        marks.push([X(i), Y(Pa[i])]);
      }
    }
    pp.push([X(n), Y(pTot)]);
    body += S.polyline(pp, { stroke: pal.strong, sw: 2 });
    marks.forEach((p) => (body += S.circle(p[0], p[1], 4, { fill: pal.strong, stroke: pal.bg, sw: 1.5 })));
    // end labels and gross margin
    let yc = Y(cTot);
    let yp = Y(pTot);
    if (Math.abs(yc - yp) < 16) {
      const mid = (yc + yp) / 2;
      const up = yc <= yp;
      yc = mid + (up ? -8 : 8);
      yp = mid + (up ? 8 : -8);
    }
    const lx = x1 + 18;
    body += S.line(x1 + 6, Y(cTot), x1 + 6, Y(pTot), { stroke: pal.ink2, sw: 1 });
    body += S.line(x1 + 2, Y(cTot), x1 + 10, Y(cTot), { stroke: pal.ink2, sw: 1 });
    body += S.line(x1 + 2, Y(pTot), x1 + 10, Y(pTot), { stroke: pal.ink2, sw: 1 });
    body += S.text(lx, yc, 'Costs ' + moneyText(q, cTot), { size: 11, fill: pal.ink, v: 'middle' });
    body += S.text(lx, yp, 'Payments ' + moneyText(q, pTot), { size: 11, fill: pal.ink, v: 'middle' });
    const gm = q.f('cost.grossMargin');
    let my = (Y(cTot) + Y(pTot)) / 2;
    if (Math.abs(Y(cTot) - Y(pTot)) < 64) my = Math.max(yc, yp) + 22;
    // a gross margin only means something when a customer pays; internal projects fund the gap themselves
    const external = q.f('meta.kind') === 'External (customer) project';
    const margin = typeof gm === 'number' ? gm : pTot - m.totalPlan;
    body += S.text(lx, my - 7, external ? 'Gross margin' : 'Own funding needed', { size: 11, fill: pal.ink2, v: 'middle' });
    body += S.text(lx, my + 8, moneyText(q, external ? margin : Math.max(0, -margin)), { size: 12, weight: 600, fill: pal.ink, v: 'middle' });
    const h = Math.max(yB + 14, my + 22);
    let foot = '';
    const undated = m.active.filter((l) => !l.dated);
    if (undated.length) foot = S.text(PAD, h + 4, 'Not in the cost line: ' + moneyText(q, U.sum(undated, (l) => l.plan)) + ' on lines without dates.', { size: 11, fill: pal.muted, italic: true });
    return S.svg(WL, h + (foot ? 26 : 0) + PAD, body + foot, { pal, label: 'Cumulative cost baseline against cumulative payments' });
  }

  // =====================================================================================
  // Read-only summary tables (HTML and Word export)
  // =====================================================================================
  function tableHtml(t) {
    const esc = U.esc;
    let h = '<div class="tbl-head"><h3 class="blk-t">' + esc(t.title) + '</h3></div>';
    if (t.hint) h += '<p class="hint">' + esc(t.hint) + '</p>';
    h += '<div class="tbl-scroll"><table class="grid compact"><thead><tr>';
    t.cols.forEach((c) => {
      h += '<th scope="col" class="k-' + (c.num ? 'number' : 'text') + '"' + (c.w ? ' style="min-width:' + c.w + 'ch"' : '') + '>' + esc(c.label) + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</th>';
    });
    h += '</tr></thead><tbody>';
    if (!t.rows.length) h += '<tr class="empty"><td colspan="' + t.cols.length + '">' + esc(t.empty) + '</td></tr>';
    t.rows.forEach((r) => {
      h += '<tr' + (r.sub ? ' data-level="2"' : '') + '>';
      r.cells.forEach((v, i) => {
        const c = t.cols[i];
        h += '<td class="ro k-' + (c.num ? 'number' : 'text') + (c.mono ? ' mono' : '') + (r.ph && i === 1 ? ' ph' : '') + '">' + esc(v) + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody>';
    if (t.foot && t.rows.length) {
      h += '<tfoot><tr>';
      t.foot.forEach((v, i) => {
        h += i === 0 ? '<td class="tot-l">' + esc(v) + '</td>' : '<td class="tot k-' + (t.cols[i].num ? 'number' : 'text') + '">' + esc(v) + '</td>';
      });
      h += '</tr></tfoot>';
    }
    return h + '</table></div>';
  }

  function summaryBlock(build) {
    return {
      type: 'custom',
      render(el, q) {
        el.innerHTML = tableHtml(build(q));
      },
      update(el, q) {
        el.innerHTML = tableHtml(build(q));
      },
      exportBlocks(q, opts) {
        const t = build(q);
        if (!t.rows.length && !(opts && opts.empty)) return [];
        const out = [{ type: 'h3', text: t.title }];
        if (t.hint) out.push({ type: 'p', text: t.hint, style: 'note' });
        out.push({
          type: 'table',
          columns: t.cols.map((c) => ({ label: c.label + (c.sub ? ' (' + c.sub + ')' : ''), width: c.ew || (c.num ? 1 : 2), align: c.num ? 'right' : undefined })),
          rows: t.rows.map((r) => r.cells),
          footer: t.foot && t.rows.length ? t.foot : null,
          emptyRows: t.rows.length ? 0 : 4,
          fontSize: 8,
        });
        return out;
      },
    };
  }

  /** Plan / actual / remaining / forecast / deviation per WBS line and type. */
  function fiveValueTable(q, o) {
    const m = model(q);
    const groups = new Map();
    for (const l of m.active) {
      const v = o.val(l);
      if (!v) continue;
      const k = (l.w ? l.w._id : '_none') + '|' + o.type(l);
      if (!groups.has(k)) groups.set(k, { w: l.w, type: o.type(l), order: o.order(l), plan: 0, actual: null, remaining: null, forecast: 0, dev: 0 });
      const g = groups.get(k);
      g.plan += v.plan;
      g.actual = nsum(g.actual, v.actual);
      g.remaining = nsum(g.remaining, v.remaining);
      g.forecast = nsum(g.forecast, v.forecast);
      g.dev = nsum(g.dev, v.dev);
    }
    const list = Array.from(groups.values()).sort((a, b) => (a.w ? 0 : 1) - (b.w ? 0 : 1) || U.codeCmp(a.w ? a.w.code : '', b.w ? b.w.code : '') || a.order - b.order);
    const rows = [];
    const F = ['plan', 'actual', 'remaining', 'forecast', 'dev'];
    const tot = { plan: 0, actual: null, remaining: null, forecast: 0, dev: 0 };
    let i = 0;
    while (i < list.length) {
      const w = list[i].w;
      const block = [];
      while (i < list.length && list[i].w === w) block.push(list[i++]);
      block.forEach((g, j) => {
        rows.push({ cells: [j ? '' : w ? w.code : '', j ? '' : w ? q.label(w, 'name') : 'No WBS line', g.type].concat(F.map((f) => o.fmt(g[f]))), ph: !j && w && q.isPlaceholder(w, 'name') });
        F.forEach((f) => (tot[f] = nsum(tot[f], g[f])));
      });
      if (block.length > 1) {
        const s = {};
        F.forEach((f) => (s[f] = block.reduce((acc, g) => nsum(acc, g[f]), null)));
        rows.push({ cells: ['', '', 'Sum'].concat(F.map((f) => o.fmt(s[f]))), sub: true });
      }
    }
    return {
      title: o.title, hint: o.hint, empty: o.empty, rows,
      cols: [
        { label: 'WBS', w: 6, mono: true, ew: 0.8 },
        { label: 'Phase / WP', w: 20, ew: 2.4 },
        { label: o.typeLabel, w: 16, ew: 1.8 },
        { label: 'Plan', sub: o.unit, num: true, w: 8 },
        { label: 'Actual', sub: o.unit, num: true, w: 8 },
        { label: 'Remaining', sub: o.unit, num: true, w: 8 },
        { label: 'Forecast', sub: o.unit, num: true, w: 8 },
        { label: 'Deviation', sub: o.unit, num: true, w: 8 },
      ],
      foot: ['Total', '', ''].concat(F.map((f) => o.fmt(tot[f]))),
    };
  }

  const staffTable = summaryBlock((q) => {
    const m = model(q);
    return fiveValueTable(q, {
      title: 'Staff placement table',
      hint: 'Built from the cost plan: person-days per WBS line and resource type. Actual and remaining are converted from money with the rate of the line.',
      empty: 'Lines appear here once the cost plan has person-days for a resource type.',
      typeLabel: 'Resource type', unit: 'PD',
      type: (l) => l.rt.name, order: (l) => l.rt.idx,
      val: (l) => (l.pd && l.pd.plan ? l.pd : null),
      fmt: (v) => pdText(v),
      m,
    });
  });

  const costTable = summaryBlock((q) =>
    fiveValueTable(q, {
      title: 'Cost table',
      hint: 'Built from the cost plan: costs per WBS line and project cost type.',
      empty: 'Lines appear here once the cost plan has amounts.',
      typeLabel: 'Cost type', unit: q.cur(),
      type: (l) => l.ctype, order: (l) => COST_TYPES.indexOf(l.ctype),
      val: (l) => (l.plan || l.actual || l.remaining ? { plan: l.plan, actual: l.actual, remaining: l.remaining, forecast: l.forecast, dev: l.dev } : null),
      fmt: (v) => moneyText(q, v),
    })
  );

  /** Rows = types, columns = months (+ no dates) + total. */
  function monthTable(q, o) {
    const m = model(q);
    const showND = o.types.some((t) => o.nd[t] > 1e-9);
    const cols = [{ label: o.typeLabel, w: 18, ew: 2.2 }]
      .concat(m.months.map((ym) => ({ label: U.monthShort(ym), num: true, w: 7 })))
      .concat(showND ? [{ label: 'No dates', num: true, w: 7 }] : [])
      .concat([{ label: 'Total', num: true, w: 8 }]);
    const colTot = m.months.map(() => 0);
    let ndTot = 0;
    let all = 0;
    const rows = o.types.map((t) => {
      const vals = o.vals[t] || [];
      vals.forEach((v, i) => (colTot[i] += v));
      ndTot += o.nd[t] || 0;
      const tot = U.sum(vals, (v) => v) + (o.nd[t] || 0);
      all += tot;
      return { cells: [t].concat(vals.map((v) => (v > 1e-9 ? o.fmt(v) : '–'))).concat(showND ? [o.nd[t] ? o.fmt(o.nd[t]) : '–'] : []).concat([o.fmt(tot)]) };
    });
    return {
      title: o.title, hint: o.hint, cols,
      rows: m.months.length || all ? rows : [],
      empty: 'Add dates to the work packages (schedule) and lines to the cost plan to fill this table.',
      foot: ['Total'].concat(colTot.map((v) => o.fmt(v))).concat(showND ? [o.fmt(ndTot)] : []).concat([o.fmt(all)]),
    };
  }

  const staffMonthTable = summaryBlock((q) => {
    const m = model(q);
    return monthTable(q, {
      title: 'Staff required per month',
      hint: 'Planned person-days per resource type and month. Each line is spread evenly over the calendar days of its WBS line.',
      typeLabel: 'Resource type', types: m.pdTypes.map((t) => t.name), vals: m.pd, nd: m.pdND, fmt: (v) => pdText(v),
    });
  });

  const costMonthTable = summaryBlock((q) => {
    const m = model(q);
    return monthTable(q, {
      title: 'Costs per month',
      hint: 'Planned costs per project cost type and month (' + q.cur() + ', rounded).',
      typeLabel: 'Cost type', types: COST_TYPES, vals: m.cost, nd: m.costND, fmt: (v) => moneyText(q, v),
    });
  });

  // =====================================================================================
  // Checks
  // =====================================================================================
  function compareRef(q, m, label, ref) {
    const ext = m.totalPlan - m.byType.Staff;
    const dt = ((m.totalPlan - ref) / ref) * 100;
    const de = ((ext - ref) / ref) * 100;
    const best = ext > 0 && Math.abs(de) < Math.abs(dt) ? { v: ext, d: de, what: 'without staff' } : { v: m.totalPlan, d: dt, what: 'in total' };
    const ok = Math.abs(best.d) <= 10;
    return {
      ok,
      text: label + ' ' + q.money(ref) + '; cost plan ' + moneyText(q, best.v) + ' ' + best.what + ' (' + pctText(best.d) + ').' + (ok ? '' : ' Explain the difference or update the plan.'),
    };
  }

  function budgetChecks(q) {
    const m = model(q);
    const act = m.active;
    if (!act.length) return [{ ok: null, text: 'Add lines with quantities or amounts to the cost plan to run the checks.' }];
    const out = [];
    const untyped = m.lines.filter((l) => !l.ctype && (l.plan || l.actual || l.remaining));
    if (untyped.length) out.push({ ok: false, text: untyped.length + ' line(s) with amounts have no known resource or cost type.' });
    const noWbs = act.filter((l) => !l.w);
    const noDates = act.filter((l) => l.w && !l.dated);
    if (noWbs.length || noDates.length) {
      const parts = [];
      if (noWbs.length) parts.push(noWbs.length + ' line(s) without a WBS line');
      if (noDates.length) parts.push('no dates for ' + Array.from(new Set(noDates.map((l) => l.w.code))).sort(U.codeCmp).join(', '));
      out.push({ ok: false, text: 'Resource plan against the schedule: ' + parts.join('; ') + '.' });
    } else out.push({ ok: true, text: 'Resource plan against the schedule: every line sits on a WBS line with dates.' });
    const covered = new Set(act.map((l) => phaseOf(q, l.w)).filter(Boolean).map((w) => w._id));
    const missing = q.phases().filter((p) => !covered.has(p._id));
    out.push(missing.length ? { ok: false, text: 'Phases without any line: ' + missing.map((p) => p.code + ' ' + q.label(p, 'name')).join(', ') + '.' } : { ok: true, text: 'Every phase has at least one line.' });
    if (PM.tables.ideaBusinessCase) {
      const bc = U.sum(q.rows('ideaBusinessCase').filter((r) => r.type === 'Cost'), (r) => num(r.amount) || 0);
      out.push(bc > 0 ? compareRef(q, m, 'Business case costs', bc) : { ok: null, text: 'No costs in the business case (section 3.1) to compare with.' });
    }
    const rb = num(q.f('content.budget'));
    out.push(rb ? compareRef(q, m, 'Rough budget', rb) : { ok: null, text: 'No rough budget in the content boundaries to compare with.' });
    if (PM.metrics.riskBudget) {
      let rv = null;
      try {
        rv = PM.metrics.riskBudget.fn(q);
      } catch (e) {
        rv = null;
      }
      if (typeof rv === 'number' && rv > 0) {
        const found = act.some((l) => l.ctype === 'Other' && /risk|reserve|contingenc/i.test((l.row.res || '') + ' ' + (l.row.note || '')));
        out.push(found ? { ok: true, text: 'The risk budget (' + q.money(rv) + ') has its own line in the cost plan.' } : { ok: null, text: 'Risk budget ' + q.money(rv) + ': add it as a line of type Other (for example "Risk reserve") so it is part of the plan.' });
      }
    }
    const withAct = act.filter((l) => l.actual != null).length;
    if (RUNNING.indexOf(q.f('meta.status')) >= 0) out.push({ ok: withAct === act.length ? true : null, text: withAct ? 'Actual values entered for ' + withAct + ' of ' + act.length + ' lines.' : 'The project is running: enter actual and remaining values to see the forecast.' });
    else out.push({ ok: null, text: 'Enter actual and remaining values once the project runs.' });
    return out;
  }

  function detailChecks(q) {
    const m = model(q);
    const act = m.active;
    if (!act.length) return [{ ok: null, text: 'Add lines to the cost plan (section 3.5) to run the checks.' }];
    const out = [];
    const undated = act.filter((l) => !l.dated);
    out.push(undated.length
      ? { ok: false, text: 'Not in the monthly view: ' + undated.length + ' line(s) without dates (' + moneyText(q, U.sum(undated, (l) => l.plan)) + '). Add dates to their work packages.' }
      : { ok: true, text: 'Every line has dates and appears in the monthly view.' });
    const capTypes = m.pdTypes.filter((t) => t.cap > 0);
    if (!capTypes.length || !m.months.length) out.push({ ok: null, text: 'Enter the available capacity of the resource types (section 3.5) to check the monthly peaks.' });
    else {
      const capM = U.sum(capTypes, (t) => t.cap * t.pdu) / m.months.length;
      const over = [];
      m.months.forEach((ym, i) => {
        const need = U.sum(capTypes, (t) => m.pd[t.name][i]);
        if (need > capM + 0.05) over.push(U.monthShort(ym) + ' (' + pdText(need) + ' PD)');
      });
      out.push(over.length
        ? { ok: false, text: 'Capacity exceeded: about ' + pdText(capM) + ' PD per month available, more needed in ' + over.join(', ') + '. Agree the peaks with the line managers.' }
        : { ok: true, text: 'The monthly need stays within the average capacity of about ' + pdText(capM) + ' PD per month.' });
    }
    const pays = payList(q);
    if (pays.length) {
      const late = pays.filter((p) => m.end && p.date > m.end).length;
      if (late) out.push({ ok: null, text: late + ' payment(s) fall after the end of the schedule.' });
    }
    return out;
  }

  // =====================================================================================
  // Tables and fields
  // =====================================================================================
  const resTypesTable = {
    type: 'table', key: 'resTypes', title: 'Resource types', numbered: true, addLabel: 'Add resource type',
    hint: 'The departments or qualifications you plan with: unit, internal cost rate and how much they can give the project. External types count as external labour.',
    columns: [
      { key: 'name', label: 'Resource type', kind: 'text', w: 20, sub: 'division or qualification', placeholder: 'e.g. IT, Purchasing' },
      { key: 'unit', label: 'Unit', kind: 'select', options: UNITS, w: 7 },
      { key: 'rate', label: 'Cost rate', kind: 'money', w: 9, sub: 'per unit' },
      { key: 'capacity', label: 'Available', kind: 'number', w: 8, sub: 'in the unit' },
      { key: 'from', label: 'From', kind: 'select', options: ['Internal', 'External'], w: 9 },
      { key: 'note', label: 'Note', kind: 'text', w: 22, placeholder: 'e.g. who agreed the capacity' },
    ],
    defaults: [
      { name: 'Project management', unit: 'PD', from: 'Internal', _ph: { rate: 'e.g. 480', capacity: 'PD', note: 'PM and project assistant' } },
      { unit: 'PD', from: 'Internal', _ph: { name: '(department A)', rate: 'internal rate', capacity: 'PD' } },
      { unit: 'PD', from: 'Internal', _ph: { name: '(department B)', rate: 'internal rate', capacity: 'PD' } },
      { name: 'External specialist', unit: 'PD', from: 'External', _ph: { rate: 'daily rate', note: 'Bought in; counts as external labour' } },
    ],
  };

  const COST_TYPE_HINT = {
    staff: 'Internal staff of all departments (person-days × internal rate)',
    ext: 'External services domestic and international, freelancers',
    mat: 'Material, equipment, investments for the project',
    oth: 'Travel, copying, electricity, postage, phone, fees, risk reserve',
  };
  const costTypesTable = {
    type: 'table', key: 'costTypes', title: 'Project cost types',
    hint: 'Many accounting cost types, four project cost types. Note which accounting cost types you group into each, so actual costs can be booked the same way.',
    fixed: [
      { _id: 'staff', type: 'Staff' },
      { _id: 'ext', type: 'External labour' },
      { _id: 'mat', type: 'Material or investment' },
      { _id: 'oth', type: 'Other' },
    ],
    columns: [
      { key: 'type', label: 'Project cost type', from: true, w: 18 },
      { key: 'accounts', label: 'Accounting cost types grouped here', kind: 'textarea', w: 40, placeholder: (r) => COST_TYPE_HINT[r._id] || '' },
      { key: 'plan', label: 'Plan', kind: 'money', w: 10, total: true, compute: (r, q) => U.sum(q.rows('costPlan').filter((l) => l.ctype === r.type), (l) => l.plan || 0) || null },
    ],
  };

  const costPlanTable = {
    type: 'table', key: 'costPlan', title: 'Resource and cost plan', numbered: true, addLabel: 'Add line',
    hint: 'One line per WBS line and resource or cost type. For a resource type, enter the quantity in its unit; the rate comes from the type unless you enter one. For a pure cost line, enter the amount as cost per unit. Enter actual and remaining as money; forecast and deviation follow.',
    columns: [
      { key: 'wbs', label: 'WBS', kind: 'wbs', w: 18, sub: 'phase or work package' },
      { key: 'res', label: 'Resource or cost type', kind: 'select', w: 18, options: (q) => Array.from(rtMap(q).values()).map((t) => t.name).filter((nm) => !isCostType(nm)).concat(COST_TYPES) },
      { key: 'ctype', label: 'Cost type', kind: 'text', w: 11, compute: (r, q) => lineCostType(r, q) },
      {
        key: 'qty', label: 'Quantity', kind: 'number', w: 7,
        placeholder: (r) => {
          const rt = rtOf(r, PM.q());
          return rt ? rt.unit : isCostType(r.res) ? '1' : '';
        },
      },
      { key: 'unit', label: 'Unit', kind: 'text', w: 5, compute: (r, q) => { const rt = rtOf(r, q); return rt ? rt.unit : isCostType(r.res) ? '—' : ''; } },
      {
        key: 'rate', label: 'Cost per unit', kind: 'money', w: 9,
        placeholder: (r) => {
          const rt = rtOf(r, PM.q());
          return rt && rt.rate != null ? U.fmtNum(rt.rate) : isCostType(r.res) ? 'amount' : '';
        },
      },
      { key: 'rateEff', label: 'Rate used', hidden: true, compute: (r, q) => { const own = num(r.rate); if (own != null) return own; const rt = rtOf(r, q); return rt ? rt.rate : null; } },
      { key: 'plan', label: 'Plan', kind: 'money', w: 9, total: true, compute: (r, q) => planOf(r, q) },
      { key: 'actual', label: 'Actual', kind: 'money', w: 9, total: true, sub: 'cost so far' },
      { key: 'remaining', label: 'Remaining', kind: 'money', w: 9, total: true, sub: 'still to come' },
      { key: 'forecast', label: 'Forecast', kind: 'money', w: 9, total: true, compute: (r) => forecastOf(r) },
      { key: 'dev', label: 'Deviation', kind: 'money', w: 9, total: true, sub: 'forecast − plan', compute: (r) => (r.forecast == null && r.plan == null ? null : (r.forecast || 0) - (r.plan || 0)) },
      { key: 'note', label: 'Note', kind: 'text', w: 20 },
    ],
    defaults: [
      { res: 'Project management', _ph: { note: 'e.g. 1.1 Project management, whole project' } },
      { _ph: { note: 'Staff of a department: pick the type, enter person-days' } },
      { res: 'External labour', _ph: { note: 'Bought-in services' } },
      { res: 'Material or investment', _ph: { note: 'Material, equipment' } },
      { res: 'Other', _ph: { note: 'Travel, printing, fees; also the risk reserve' } },
    ],
  };

  const paymentsTable = {
    type: 'table', key: 'costPayments', title: 'Incoming payments', numbered: true, addLabel: 'Add payment',
    hint: 'Instalments agreed with the customer or sponsor, with the date they are due or were received.',
    columns: [
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'desc', label: 'Description', kind: 'text', w: 30, placeholder: 'e.g. first instalment on signature' },
      { key: 'amount', label: 'Amount', kind: 'money', w: 10, total: true },
      { key: 'received', label: 'Received', kind: 'check', w: 6 },
    ],
    defaults: [{ _ph: { desc: 'First instalment, e.g. on contract signature' } }, { _ph: { desc: 'Final instalment, e.g. on acceptance' } }],
  };

  const billedTotal = (q) => {
    const rows = q.rows('costPayments').filter((p) => num(p.amount) != null);
    return rows.length ? U.sum(rows, (p) => num(p.amount)) : null;
  };

  // =====================================================================================
  // Sections
  // =====================================================================================
  PM.section({
    id: 'budget',
    part: 'initiation',
    order: 35.3,
    num: '3.5',
    step: 'I4',
    slides: '70–77',
    title: 'Resources and costs',
    navTitle: 'Resources and costs',
    intro: 'Plan who is needed, how many person-days and what it costs, per phase or work package. Every table and chart below comes from the one cost plan.',
    blocks: [
      {
        type: 'guide',
        title: 'How to plan resources and costs',
        text: 'Build on the WBS and the schedule, and on the experience of the people who will do the work. Plan it together with the team.',
        ordered: true,
        items: [
          'Choose the resource types (divisions or qualifications) and the cost types you plan with.',
          'Decide the planning depth: per phase for a rough plan, per work package for a detailed one.',
          'For each phase or work package, plan the person-days per resource type and the other costs.',
          'Merge the lines into the staff placement table and the cost table.',
          'Check with the line managers that the people and the budget are available.',
          'Optional: spread person-days and costs over the schedule (section 4.2).',
          'Optional: draw the histograms and the cumulative cost curve (section 4.2).',
        ],
      },
      {
        type: 'group', cols: 2, blocks: [
          { type: 'callout', kind: 'rule', title: 'Ask for every phase or work package.', text: 'Who is needed, with which qualification? How many person-days, and when? From where: internal or bought in? Are they available then? Staff cost = person-days × internal cost rate.' },
          { type: 'callout', kind: 'tip', title: 'Good practice.', text: 'Derive the staffing from the WBS, the work package specifications and the RACI chart. Plan critical resources in detail. Make sure actual values can be measured later, for example by booking time on WBS codes.' },
        ],
      },
      { type: 'h', text: 'Step 1: resource and cost types' },
      resTypesTable,
      costTypesTable,
      { type: 'h', text: 'Steps 2 and 3: depth and the plan per line' },
      {
        type: 'fields', cols: 2,
        fields: [{ key: 'res.depth', label: 'Planning depth', kind: 'select', options: ['Phase', 'Work package'], hint: 'Phase for a rough plan; work package once the WP specifications exist.' }],
      },
      costPlanTable,
      { type: 'h', text: 'Step 4: staff placement and cost table' },
      {
        type: 'graphic', title: 'Staff placement',
        caption: 'Person-days per phase or work package (as set in the planning depth), stacked by resource type. Built from the cost plan.',
        empty: (q) => (model(q).totalPD > 0 ? null : 'Plan person-days in the cost plan (a resource type with unit PD or hours and a quantity) to see the staff placement.'),
        render: staffPlacement,
      },
      staffTable,
      {
        type: 'graphic', title: 'Costs by phase and cost type',
        caption: 'Planned costs per phase, stacked by the four project cost types, with the phase totals.',
        empty: (q) => (model(q).totalPlan > 0 ? null : 'Enter quantities and rates or amounts in the cost plan to see the costs per phase.'),
        render: costsByPhase,
      },
      costTable,
      { type: 'h', text: 'Step 5: availability' },
      {
        type: 'graphic', title: 'Availability check',
        caption: 'Person-days needed per resource type against the capacity the line managers can give (box and tick). Hours count as 8 per person-day.',
        empty: (q) => (availabilityRows(q).length ? null : 'Enter the available capacity of the resource types and plan person-days in the cost plan to compare them.'),
        render: availability,
      },
      { type: 'checks', title: 'Checks', hint: 'From the recommendations of the method.', run: budgetChecks },
      { type: 'note', text: 'Steps 6 and 7 (spreading over time, histograms, cost curve) are in section 4.2.' },
    ],
  });

  PM.section({
    id: 'detailcost',
    part: 'start',
    order: 42.4,
    num: '4.2',
    step: 'S2',
    slides: '125–129',
    title: 'Detailed resources and costs: over time',
    navTitle: 'Resources and costs over time',
    landscape: true,
    intro: 'The cost plan of section 3.5 at work package level, spread over the months of the schedule: staff per month, costs per month, the cost curve and the payments.',
    blocks: [
      {
        type: 'guide',
        title: 'Resources and costs at work package level',
        items: [
          'Staff allocation plan: person-days per work package for each resource type or department.',
          'Cost plan: cost per work package for each project cost type. The many accounting cost types are grouped into four: staff, external labour, material or investment, other.',
          'Spread both over the schedule: each line evenly over the calendar days of its work package.',
          'The resource histogram shows the peaks; check them against what the departments can give.',
          'The cumulative cost curve has an S shape. It is the cost baseline you control against.',
          'Set the incoming payments against it to see when costs run ahead of payments. Total billed minus the budget is the gross margin.',
          'Use the comparison to agree payment plans and as the basis for earned value analysis.',
        ],
      },
      { type: 'h', text: 'Staff over time' },
      staffMonthTable,
      {
        type: 'graphic', title: 'Resource histogram',
        caption: 'Planned person-days per month, stacked by resource type. The dashed line is the total available capacity spread evenly over the project months.',
        empty: (q) => (model(q).months.length && model(q).totalPD > 0 ? null : 'Plan person-days in the cost plan and give the work packages dates to see the histogram.'),
        render: resourceHistogram,
      },
      { type: 'h', text: 'Costs over time' },
      costMonthTable,
      {
        type: 'graphic', title: 'Cost histogram and cumulative cost curve',
        caption: 'Planned costs per month by cost type (columns) and the cumulative cost (line) on the same axis. The line is the cost baseline.',
        empty: (q) => (model(q).months.length && model(q).totalPlan > 0 ? null : 'Enter costs in the cost plan and give the work packages dates to see the cost curve.'),
        render: costHistogram,
      },
      { type: 'h', text: 'Payments and gross margin' },
      paymentsTable,
      {
        type: 'fields', cols: 2,
        fields: [
          { key: 'cost.billedTotal', label: 'Total billed', kind: 'money', compute: (q) => billedTotal(q), hint: 'Sum of the payments.' },
          {
            key: 'cost.grossMargin', label: 'Gross margin', kind: 'money', hint: 'Total billed minus the planned budget (cost plan total).',
            compute: (q) => {
              const b = billedTotal(q);
              return b == null ? null : b - model(q).totalPlan;
            },
          },
        ],
      },
      {
        type: 'graphic', title: 'Costs and payments',
        caption: 'Cumulative cost baseline against cumulative payments. Red areas: costs run ahead of payments (you pre-finance); green areas: payments run ahead.',
        empty: (q) => {
          if (!payList(q).length) return 'Add payments for customer projects; internal projects can skip this.';
          return model(q).start || payList(q).length ? null : 'Add dates to the work packages to see the costs over time.';
        },
        render: costsAndPayments,
      },
      { type: 'checks', title: 'Checks', run: detailChecks },
    ],
  });

  // =====================================================================================
  // Headline numbers
  // =====================================================================================
  PM.metric('totalCost', { label: 'Planned cost', kind: 'money', section: 'budget', fn: (q) => model(q).totalPlan || null });
  PM.metric('personDays', { label: 'Person-days', kind: 'number', section: 'budget', fn: (q) => (model(q).totalPD ? Math.round(model(q).totalPD * 10) / 10 : null) });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  // [id, wbs, resource or cost type, quantity, own rate, actual, note]
  const RATE = { 'Project management': 480, 'Corporate Communications': 400, 'Facility Management': 360, Marketing: 380, Finance: 420, 'Event technology': 500 };
  const L = (id, wbs, res, qty, actualQty, note) => ({ _id: id, wbs, res, qty, actual: actualQty * RATE[res], remaining: 0, note: note || '' });
  const C = (id, wbs, res, amount, actual, note) => ({ _id: id, wbs, res, qty: 1, rate: amount, actual, remaining: 0, note });
  PM.example({
    f: { 'res.depth': 'Work package' },
    t: {
      resTypes: [
        { _id: 'rt1', name: 'Project management', unit: 'PD', rate: 480, capacity: 30, from: 'Internal', note: 'Marc Huber, Eva Lang' },
        { _id: 'rt2', name: 'Corporate Communications', unit: 'PD', rate: 400, capacity: 35, from: 'Internal', note: 'Programme and evaluation' },
        { _id: 'rt3', name: 'Facility Management', unit: 'PD', rate: 360, capacity: 30, from: 'Internal', note: 'Fewer days because of the ERP rollout' },
        { _id: 'rt4', name: 'Marketing', unit: 'PD', rate: 380, capacity: 30, from: 'Internal', note: 'Invitation and registrations' },
        { _id: 'rt5', name: 'Finance', unit: 'PD', rate: 420, capacity: 12, from: 'Internal', note: 'Sponsoring and invoices' },
        { _id: 'rt6', name: 'Event technology', unit: 'PD', rate: 500, capacity: 15, from: 'External', note: 'Stage, sound and safety crew (framework contract)' },
      ],
      costPlan: [
        L('c01', 'w111', 'Project management', 4, 4, 'Charter, start workshop'),
        L('c02', 'w112', 'Project management', 12, 14, 'Team meetings, coordination'),
        L('c03', 'w113', 'Project management', 6, 6, 'Reports every four weeks'),
        L('c04', 'w114', 'Project management', 3, 3),
        L('c05', 'w123', 'Project management', 1, 1),
        L('c06', 'w152', 'Project management', 1, 1, 'Lead on the festival day'),
        L('c07', 'w112', 'Corporate Communications', 4, 4, 'Project assistant: minutes, filing'),
        L('c08', 'w121', 'Corporate Communications', 4, 4),
        L('c09', 'w122', 'Corporate Communications', 10, 9),
        L('c10', 'w133', 'Corporate Communications', 6, 7, 'More artists to compare'),
        L('c11', 'w143', 'Corporate Communications', 2, 2),
        L('c12', 'w152', 'Corporate Communications', 2, 2),
        L('c13', 'w162', 'Corporate Communications', 4, 4),
        L('c14', 'w131', 'Facility Management', 3, 4, 'Contract talks took longer'),
        L('c15', 'w132', 'Facility Management', 4, 5),
        L('c16', 'w134', 'Facility Management', 6, 8, 'Extra round with the authority'),
        L('c17', 'w151', 'Facility Management', 10, 11),
        L('c18', 'w152', 'Facility Management', 3, 3),
        L('c19', 'w153', 'Facility Management', 6, 5),
        L('c20', 'w121', 'Marketing', 2, 2, 'Survey tool'),
        L('c21', 'w141', 'Marketing', 5, 4),
        L('c22', 'w142', 'Marketing', 8, 8),
        L('c23', 'w143', 'Marketing', 5, 6, 'Many late registrations'),
        L('c24', 'w152', 'Marketing', 2, 2),
        L('c25', 'w161', 'Marketing', 4, 3),
        L('c26', 'w113', 'Finance', 2, 2, 'Budget control'),
        L('c27', 'w135', 'Finance', 5, 5),
        L('c28', 'w163', 'Finance', 4, 3),
        L('c29', 'w134', 'Event technology', 4, 5, 'Safety concept, technical planning'),
        L('c30', 'w151', 'Event technology', 4, 4, 'Stage and sound set-up'),
        L('c31', 'w152', 'Event technology', 2, 3, 'Crew on the festival day'),
        L('c32', 'w153', 'Event technology', 2, 2, 'Dismantling'),
        C('c33', 'w131', 'Other', 9000, 9000, 'Venue rent incl. cleaning'),
        C('c34', 'w132', 'External labour', 16000, 17400, 'Catering for 400 guests; 30 more registered'),
        C('c35', 'w133', 'External labour', 7500, 7500, 'Band, children’s programme, host'),
        C('c36', 'w142', 'Material or investment', 1500, 1350, 'Printing invitations and posters'),
        C('c37', 'w151', 'Material or investment', 1000, 1150, 'Decoration and signage'),
        C('c38', 'w134', 'Other', 2500, 2400, 'Risk reserve: marquee as bad-weather fallback'),
      ],
      costPayments: [
        { _id: 'pay1', date: '2026-04-20', desc: 'Main sponsor, first instalment on signing', amount: 5000, received: true },
        { _id: 'pay2', date: '2026-07-10', desc: 'Main sponsor, second instalment after the festival', amount: 3000, received: true },
      ],
    },
    x: {
      costTypes: {
        staff: { accounts: 'Internal staff costs of all departments (person-days × internal cost rate)' },
        ext: { accounts: 'External services domestic, external services international, event technology crew, catering service, artists' },
        mat: { accounts: 'Material, printed matter, decoration, small equipment' },
        oth: { accounts: 'Rent, travel expenses, copying, electricity, postage, phone, fees, risk reserve' },
      },
    },
  });
})();
