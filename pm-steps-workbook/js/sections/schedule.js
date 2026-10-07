/* Framework 3.5 (schedule: milestone plan, phase plan, bar chart, duration estimates) and 4.2 (detailed schedule: linked bar chart, critical path, network diagram). */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const W = 1000; // width of the time-based drawings
  const PAD = 16;
  const r1 = (n) => S.round(n);

  // =====================================================================================
  // Small helpers
  // =====================================================================================
  /** A finite number or null. */
  function n(v) {
    if (v === null || v === undefined || v === '') return null;
    const x = typeof v === 'number' ? v : U.num(v);
    return typeof x === 'number' && isFinite(x) ? x : null;
  }
  const round1 = (x) => Math.round(x * 10) / 10;
  const short = (iso) => (U.isDate(iso) ? U.fmtDateShort(iso) : '');
  const xMid = (sc, iso) => (sc.x(iso) + sc.xEnd(iso)) / 2;
  const signed = (d) => (d > 0 ? '+' + d : d < 0 ? '−' + Math.abs(d) : '0');
  const list = (arr, max) => {
    max = max || 6;
    return arr.length > max ? arr.slice(0, max).join(', ') + ' and ' + (arr.length - max) + ' more' : arr.join(', ');
  };

  /** Earliest and latest date of the project dates plus the given dates. */
  function dateSpan(q, dates) {
    const pd = q.projectDates();
    const all = [pd.start, pd.end].concat(dates || []).filter(U.isDate);
    return { start: U.minDate(all), end: U.maxDate(all) };
  }

  /** Legend row with custom swatches. items: [{label, sw, swatch(x, cy) => svg}]. Returns {svg, h}. */
  function legendRow(items, x, y, maxW, pal) {
    const size = 11;
    let cx = x;
    let cy = y;
    let out = '';
    items.forEach((it) => {
      const sw = it.sw || 14;
      const w = sw + 6 + S.measure(it.label, size) + 18;
      if (cx + w > x + maxW && cx > x) {
        cx = x;
        cy += 18;
      }
      out += it.swatch(cx, cy + 6);
      out += S.text(cx + sw + 6, cy + 6, it.label, { size, fill: pal.ink2, v: 'middle' });
      cx += w;
    });
    return { svg: out, h: cy - y + 14 };
  }
  const swSquare = (label, fill, stroke, dash) => ({ label, sw: 14, swatch: (x, cy) => S.rect(x, cy - 5, 14, 10, { fill, stroke, sw: stroke ? 1.3 : null, rx: 2, dash }) });
  const swDiamond = (label, fill, stroke) => ({ label, sw: 12, swatch: (x, cy) => S.diamond(x + 6, cy, 5.5, { fill, stroke, sw: stroke ? 1.8 : null }) });
  const swDot = (label, fill, stroke) => ({ label, sw: 10, swatch: (x, cy) => S.circle(x + 5, cy, 4, { fill, stroke, sw: stroke ? 1.5 : null }) });
  const swLine = (label, stroke, dash) => ({ label, sw: 16, swatch: (x, cy) => S.line(x, cy, x + 16, cy, { stroke, sw: 2, dash }) });

  /** Milestone diamond: internal filled, external outlined. */
  function msDiamond(cx, cy, r, type, pal) {
    return type === 'External'
      ? S.diamond(cx, cy, r - 0.5, { fill: pal.bg, stroke: pal.mile, sw: 2 })
      : S.diamond(cx, cy, r, { fill: pal.mile, stroke: pal.bg, sw: 1.2 });
  }

  /** Label text of a WBS line (value or template hint) and whether it is a hint. */
  function wbsName(q, r) {
    return { text: q.label(r, 'name') || '(no name)', ph: q.isPlaceholder(r, 'name') || !r.name };
  }

  /** Summary bar of a phase: a thin bar with small downward points at both ends. */
  function summaryBar(x0, x1, y, h, fill) {
    const t = Math.min(5, Math.max(1, (x1 - x0) / 2));
    return S.path(
      'M' + r1(x0) + ',' + r1(y) + ' H' + r1(x1) + ' V' + r1(y + h + 4) + ' L' + r1(x1 - t) + ',' + r1(y + h) +
        ' H' + r1(x0 + t) + ' L' + r1(x0) + ',' + r1(y + h + 4) + ' Z',
      { fill }
    );
  }

  /** Code (mono) and name of a WBS line in the label column. */
  function rowLabel(q, r, x, cy, maxW, pal, o) {
    o = o || {};
    const nm = wbsName(q, r);
    const codeW = o.codeW || 44;
    const size = o.size || 11.5;
    let out = S.text(x, cy, String(r.code), { size: 11, family: 'mono', fill: pal.ink2, v: 'middle', weight: o.bold ? 600 : 400 });
    out += S.text(x + codeW, cy, S.fit(nm.text, maxW - codeW, size, o.bold ? 600 : 400), {
      size, v: 'middle', weight: o.bold ? 600 : 400, fill: nm.ph ? pal.muted : pal.ink, italic: nm.ph,
    });
    return out;
  }

  // =====================================================================================
  // Milestone rules
  // =====================================================================================
  const EVENT_RE = /\b(started|completed|approved|signed|held|sent|done|decided)\b/i;
  function isEventWording(name) {
    const s = String(name || '').trim().replace(/[.\s]+$/, '');
    return EVENT_RE.test(s) || /ed$/i.test(s);
  }
  function phaseCodeOf(code) {
    const parts = String(code || '').trim().split('.');
    return parts.length >= 2 ? parts[0] + '.' + parts[1] : '';
  }

  // =====================================================================================
  // Critical path method (CPM)
  // Day numbers count from the project start (day 0). ES/LS are start days, EF/LF finish
  // "times": a work package with ES 0 and duration 12 has EF 12 and runs on days 0 to 11.
  // =====================================================================================
  const CPM = new WeakMap();
  function cpm(q) {
    let res = CPM.get(q);
    if (!res) {
      res = calcCpm(q);
      CPM.set(q, res);
    }
    return res;
  }

  function excludedCodes(q) {
    return String(q.f('sched.cpmExclude') || '')
      .split(/[\s,;]+/)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter(Boolean);
  }

  /** Duration of a work package from the estimate table: three-point, else realistic, else analytical. */
  function estimateDays(est) {
    if (!est) return null;
    const v = n(est.te) || n(est.real) || n(est.ana);
    return v && v > 0 ? Math.ceil(v - 1e-9) : null;
  }

  function calcCpm(q) {
    const excl = excludedCodes(q);
    const isExcl = (code) => excl.some((c) => code === c || code.startsWith(c + '.'));
    const est = {};
    q.rows('schedEstimates').forEach((r) => {
      est[r._id] = r;
    });
    const nodes = [];
    const byId = {};
    const byCode = {};
    const missing = [];
    const excluded = [];
    q.wps().forEach((w) => {
      const code = String(w.code).trim();
      const d = q.dates(w._id);
      const nm = wbsName(q, w);
      const base = { id: w._id, code, name: nm.text, ph: nm.ph, resp: w.responsible || '', d, fixed: U.isDate((est[w._id] || {}).fixed) ? est[w._id].fixed : '' };
      if (isExcl(code)) {
        base.excluded = true;
        excluded.push(base);
        return;
      }
      let dur = null;
      let src = '';
      if (U.isDate(d.start) && U.isDate(d.end) && U.diffDays(d.start, d.end) >= 0) {
        dur = U.diffDays(d.start, d.end) + 1;
        src = 'dates';
      } else {
        dur = estimateDays(est[w._id]);
        src = dur ? 'estimate' : '';
      }
      if (!dur) {
        if (U.isDate(d.start) && U.isDate(d.end)) base.reason = 'end before start';
        missing.push(base);
        return;
      }
      const node = Object.assign(base, { dur, src, preds: [], succs: [] });
      nodes.push(node);
      byId[w._id] = node;
      byCode[code] = node;
    });

    // edges from the predecessor column
    const edges = [];
    const unknown = [];
    const invalid = [];
    const selfRefs = [];
    const seen = new Set();
    nodes.forEach((node) => {
      U.parsePred(node.d.pred).forEach((p) => {
        if (p.invalid) {
          invalid.push(node.code + ' "' + p.code + '"');
          return;
        }
        if (!q.wbsByCode(p.code)) {
          unknown.push(node.code + ' → ' + p.code);
          return;
        }
        // a phase or group code stands for all its work packages
        const froms = byCode[p.code] ? [byCode[p.code]] : nodes.filter((m) => m.code.startsWith(p.code + '.'));
        froms.forEach((from) => {
          if (from === node) {
            if (byCode[p.code]) selfRefs.push(node.code);
            return;
          }
          const key = from.id + '>' + node.id;
          if (seen.has(key)) return;
          seen.add(key);
          const e = { from, to: node, type: p.type, lag: p.lag || 0 };
          edges.push(e);
          from.succs.push(e);
          node.preds.push(e);
        });
      });
    });

    // topological order (Kahn); whatever is left sits in or behind a loop
    const indeg = new Map(nodes.map((x) => [x, x.preds.length]));
    const queue = nodes.filter((x) => !x.preds.length);
    const order = [];
    while (queue.length) {
      const x = queue.shift();
      order.push(x);
      x.succs.forEach((e) => {
        const k = indeg.get(e.to) - 1;
        indeg.set(e.to, k);
        if (k === 0) queue.push(e.to);
      });
    }
    const blocked = nodes.filter((x) => indeg.get(x) > 0);
    const blockedSet = new Set(blocked);
    const inLoop = blocked.filter((start) => {
      const seenB = new Set();
      const stack = start.succs.map((e) => e.to);
      while (stack.length) {
        const x = stack.pop();
        if (x === start) return true;
        if (seenB.has(x) || !blockedSet.has(x)) continue;
        seenB.add(x);
        x.succs.forEach((e) => stack.push(e.to));
      }
      return false;
    });

    const pdStart = q.f('time.startDate');
    const start0 = U.isDate(pdStart) ? pdStart : U.minDate(nodes.map((x) => x.d.start)) || '';
    const dayOf = (iso) => (start0 && U.isDate(iso) ? U.diffDays(start0, iso) : null);

    // forward pass
    order.forEach((x) => {
      let es = 0;
      x.preds.forEach((e) => {
        const f = e.from;
        let c;
        if (e.type === 'SS') c = f.es + e.lag;
        else if (e.type === 'FF') c = f.ef + e.lag - x.dur;
        else if (e.type === 'SF') c = f.es + e.lag - x.dur;
        else c = f.ef + e.lag;
        if (c > es) es = c;
      });
      x.driven = es;
      const fx = dayOf(x.fixed);
      if (fx != null && fx > es) es = fx;
      x.es = es;
      x.ef = es + x.dur;
      x.rank = x.preds.reduce((m, e) => Math.max(m, e.from.rank + 1), 0);
    });
    const end = order.length ? Math.max.apply(null, order.map((x) => x.ef)) : 0;

    // backward pass, floats
    for (let i = order.length - 1; i >= 0; i--) {
      const x = order[i];
      const succs = x.succs.filter((e) => !blockedSet.has(e.to));
      let lf = end;
      succs.forEach((e) => {
        const t = e.to;
        let c;
        if (e.type === 'SS') c = t.ls - e.lag + x.dur;
        else if (e.type === 'FF') c = t.lf - e.lag;
        else if (e.type === 'SF') c = t.lf - e.lag + x.dur;
        else c = t.ls - e.lag;
        if (c < lf) lf = c;
      });
      const fx = dayOf(x.fixed);
      if (fx != null && fx + x.dur < lf) lf = fx + x.dur; // a fixed start may not move later either
      x.lf = lf;
      x.ls = lf - x.dur;
      x.tf = x.ls - x.es;
      let ff = end - x.ef;
      succs.forEach((e) => {
        const t = e.to;
        let s;
        if (e.type === 'SS') s = t.es - (x.es + e.lag);
        else if (e.type === 'FF') s = t.ef - (x.ef + e.lag);
        else if (e.type === 'SF') s = t.ef - (x.es + e.lag);
        else s = t.es - (x.ef + e.lag);
        e.slack = s;
        if (s < ff) ff = s;
      });
      x.ff = Math.max(0, Math.min(ff, x.tf));
      x.critical = x.tf <= 0;
    }
    edges.forEach((e) => {
      e.critical = !!(e.from.critical && e.to.critical && e.slack === 0);
    });

    const day = (k) => (start0 ? U.addDays(start0, k) : '');
    order.forEach((x) => {
      x.esDate = day(x.es);
      x.efDate = day(x.ef - 1);
      x.lsDate = day(x.ls);
      x.lfDate = day(x.lf - 1);
      x.gap = U.isDate(x.d.start) && start0 ? U.diffDays(x.esDate, x.d.start) : null;
    });

    return {
      nodes, order, byId, edges, unknown, invalid, selfRefs, missing, excluded, blocked,
      loop: inLoop.map((x) => x.code), end, start0, endDate: order.length && start0 ? day(end - 1) : '',
    };
  }

  // =====================================================================================
  // Graphic: milestone plan (timeline)
  // =====================================================================================
  /** Assign label lanes; tries two orders and keeps the one with fewer leader crossings. */
  function assignLanes(items) {
    const run = (ordered) => {
      const placed = [];
      let cost = 0;
      ordered.forEach((it) => {
        const maxLane = placed.reduce((m, p) => Math.max(m, p.lane), -1) + 1;
        let best = null;
        for (let lane = 0; lane <= maxLane; lane++) {
          if (placed.some((p) => p.lane === lane && it.x0 < p.x1 + 12 && p.x0 < it.x1 + 12)) continue;
          let c = 0;
          placed.forEach((p) => {
            if (p.lane > lane && p.bx > it.x0 - 4 && p.bx < it.x1 + 4) c += 1; // my label hides a deeper leader
            if (p.lane < lane && it.bx > p.x0 - 4 && it.bx < p.x1 + 4) c += 1; // my leader runs behind a label
          });
          if (!best || c < best.c) best = { lane, c };
          if (c === 0) break;
        }
        it.lane = best.lane;
        cost += best.c;
        placed.push(it);
      });
      return { cost, lanes: placed.reduce((m, p) => Math.max(m, p.lane), -1) + 1, lanesOf: placed.map((p) => p.lane) };
    };
    const r2l = items.slice().sort((a, b) => b.bx - a.bx);
    const l2r = items.slice().sort((a, b) => a.bx - b.bx);
    const a = run(r2l);
    const la = r2l.map((it) => it.lane);
    const b = run(l2r);
    if (a.cost < b.cost || (a.cost === b.cost && a.lanes <= b.lanes)) {
      r2l.forEach((it, i) => {
        it.lane = la[i];
      });
      return a.lanes;
    }
    return b.lanes;
  }

  function drawMilestonePlan(q, pal) {
    const ms = q.rows('milestones');
    const dates = [];
    ms.forEach((m) => [m.baseline, m.revised, m.actual].forEach((d) => U.isDate(d) && dates.push(d)));
    const rg = dateSpan(q, dates);
    const pd = q.projectDates();
    const late = ms.some((m) => U.isDate(m.baseline) && n(m.slip) > 0);
    const early = ms.some((m) => U.isDate(m.baseline) && n(m.slip) < 0);
    const legItems = [
      swDiamond('Internal milestone (baseline)', pal.mile),
      swDiamond('External milestone (baseline)', pal.bg, pal.mile),
      swDot('Actual date', pal.ink),
      swDot('Revised date', pal.bg, pal.ink),
    ];
    if (late) legItems.push(swLine('Later than baseline', pal.crit));
    if (early) legItems.push(swLine('Earlier than baseline', pal.good));
    const leg = legendRow(legItems, PAD, PAD, W - 2 * PAD, pal);
    const ay = PAD + leg.h + 10;
    const AH = 20;
    const sc = S.timeScale(rg.start, rg.end, PAD + 8, W - PAD - 8);
    const seY = ay + AH + 6;
    const trackY = seY + 14 + 24;
    const lane0 = trackY + 24;
    const LANE = 38;
    const LBL = 190;

    const items = [];
    const undated = [];
    ms.forEach((m, i) => {
      const nameRaw = m.name || q.label(m, 'name') || 'Milestone ' + (i + 1);
      if (!U.isDate(m.baseline)) {
        undated.push(nameRaw);
        return;
      }
      const latest = U.isDate(m.actual) ? m.actual : U.isDate(m.revised) ? m.revised : '';
      const shift = latest ? U.diffDays(m.baseline, latest) : null;
      let line2 = short(m.baseline);
      if (U.isDate(m.actual)) line2 += shift ? ', actual ' + short(m.actual) + ' (' + signed(shift) + ' d)' : ', reached on time';
      else if (U.isDate(m.revised)) line2 += shift ? ', revised ' + short(m.revised) + ' (' + signed(shift) + ' d)' : ', revised: no change';
      const name = S.fit(nameRaw, LBL, 12, 600);
      const w = Math.min(LBL, Math.max(S.measure(name, 12, 600), S.measure(line2, 11)));
      const bx = xMid(sc, m.baseline);
      let x0;
      let anchor;
      if (bx + 6 + w <= W - PAD) {
        x0 = bx + 6;
        anchor = 'start';
      } else if (bx - 6 - w >= PAD) {
        x0 = bx - 6 - w;
        anchor = 'end';
      } else {
        x0 = W - PAD - w;
        anchor = 'start';
      }
      items.push({ m, name, ph: !m.name, line2, w, bx, x0, x1: x0 + w, anchor, latest, shift, lx: latest ? xMid(sc, latest) : null });
    });
    const lanes = items.length ? assignLanes(items) : 0;
    let bottom = lane0 + Math.max(lanes, 0) * LANE;
    let undatedSvg = '';
    if (undated.length) {
      const tb = S.textBlock(PAD, bottom + 4, 'No baseline date yet: ' + undated.join(', '), { maxW: W - 2 * PAD, size: 11.5, fill: pal.muted, italic: true, maxLines: 3 });
      undatedSvg = tb.svg;
      bottom += 4 + tb.h + 4;
    }
    const H = bottom + PAD;

    let body = leg.svg;
    body += S.timeAxis(sc, ay, AH, lane0 + Math.max(lanes, 0) * LANE - 6, pal);
    // project span on the track
    const ps = U.isDate(pd.start) ? pd.start : rg.start;
    const pe = U.isDate(pd.end) ? pd.end : rg.end;
    const px0 = sc.x(ps);
    const px1 = sc.xEnd(pe);
    body += S.rect(px0, trackY - 4, px1 - px0, 8, { fill: pal.accentSoft, rx: 3 });
    body += S.line(px0, trackY, px1, trackY, { stroke: pal.accent, sw: 2 });
    const sLbl = 'Start ' + short(ps);
    const eLbl = 'End ' + short(pe);
    body += S.text(px0, seY, sLbl, { size: 11, fill: pal.ink2, v: 'top' });
    if (px1 - px0 > S.measure(sLbl, 11) + S.measure(eLbl, 11) + 16) body += S.text(px1, seY, eLbl, { size: 11, fill: pal.ink2, v: 'top', anchor: 'end' });

    // leaders and labels
    items.forEach((it) => {
      const ly = lane0 + it.lane * LANE;
      body += S.line(it.bx, trackY + 9, it.bx, ly + 7, { stroke: pal.axis, sw: 1 });
      const tx = it.anchor === 'end' ? it.x1 : it.x0;
      body += S.rect(it.x0 - 3, ly - 2, it.w + 6, 33, { fill: pal.bg, rx: 3 });
      body += S.text(tx, ly + 7, it.name, { size: 12, weight: 600, fill: it.ph ? pal.muted : pal.ink, italic: it.ph, v: 'middle', anchor: it.anchor });
      body += S.text(tx, ly + 23, S.fit(it.line2, LBL + 20, 11), { size: 11, fill: pal.ink2, v: 'middle', anchor: it.anchor });
    });
    // shift connectors above the track
    const arrLate = S.uid('ms');
    const arrEarly = S.uid('ms');
    let defs = '<defs>' + S.arrowDef(arrLate, pal.crit, 6) + S.arrowDef(arrEarly, pal.good, 6) + '</defs>';
    items.forEach((it) => {
      if (!it.shift) return;
      const c = it.shift > 0 ? pal.crit : pal.good;
      body += S.path('M' + r1(it.bx) + ',' + r1(trackY - 9) + ' V' + r1(trackY - 17) + ' H' + r1(it.lx) + ' V' + r1(trackY - 6), {
        stroke: c, sw: 1.6, markerEnd: it.shift > 0 ? arrLate : arrEarly,
      });
    });
    // diamonds, then the actual / revised markers on top
    items.forEach((it) => {
      body += msDiamond(it.bx, trackY, 7.5, it.m.type, pal);
    });
    items.forEach((it) => {
      if (!it.latest) return;
      const actual = U.isDate(it.m.actual);
      if (!it.shift) {
        if (actual) body += S.circle(it.bx, trackY, 2.6, { fill: pal.ink });
        return;
      }
      body += actual ? S.circle(it.lx, trackY, 4.2, { fill: pal.ink, stroke: pal.bg, sw: 1 }) : S.circle(it.lx, trackY, 4, { fill: pal.bg, stroke: pal.ink, sw: 1.5 });
    });
    body += undatedSvg;
    return S.svg(W, H, defs + body, { pal, label: 'Milestone plan on a timeline' });
  }

  // =====================================================================================
  // Graphic: phase plan with milestones
  // =====================================================================================
  function drawPhasePlan(q, pal) {
    const pd = q.projectDates();
    const proj = q.wbs().find((r) => r.level === 1) || null;
    const phases = q.phases();
    const ms = q.rows('milestones');
    const dates = [];
    phases.forEach((p) => {
      const d = q.dates(p._id);
      dates.push(d.start, d.end, d.actualStart, d.actualEnd);
    });
    ms.forEach((m) => dates.push(m.baseline));
    const rg = dateSpan(q, dates.filter(U.isDate));
    const LW = 250;
    const leg = legendRow([
      swSquare('Baseline', pal.accent),
      swSquare('Actual', pal.ink2),
      swDiamond('Internal milestone', pal.mile),
      swDiamond('External milestone', pal.bg, pal.mile),
    ], PAD, PAD, W - 2 * PAD, pal);
    const ay = PAD + leg.h + 10;
    const AH = 22;
    const top = ay + AH + 4;
    const RH = 42;
    const sc = S.timeScale(rg.start, rg.end, LW, W - PAD);

    const pdAll = proj ? q.dates(proj._id) : {};
    const rows = [{
      code: proj ? proj.code : '1', r: proj, bold: true,
      d: { start: U.isDate(pd.start) ? pd.start : pdAll.start, end: U.isDate(pd.end) ? pd.end : pdAll.end, actualStart: pdAll.actualStart, actualEnd: pdAll.actualEnd },
    }].concat(phases.map((p) => ({ code: String(p.code).trim(), r: p, d: q.dates(p._id), bold: false })));
    const rowOf = (m) => {
      const w = q.wbsRow(m.wbs);
      const pc = w ? phaseCodeOf(w.code) : '';
      const i = pc ? rows.findIndex((r, k) => k > 0 && r.code === pc) : -1;
      return i < 0 ? 0 : i;
    };
    const H0 = top + rows.length * RH;

    // milestone key below the chart
    const keyItems = [];
    ms.forEach((m, i) => {
      if (!U.isDate(m.baseline)) return;
      const nm = S.fit(m.name || q.label(m, 'name') || 'Milestone', 230, 11);
      keyItems.push({
        label: (i + 1) + '  ' + nm + ', ' + short(m.baseline), sw: 12,
        swatch: (x, cy) => msDiamond(x + 6, cy, 5.5, m.type, pal),
      });
    });
    const key = keyItems.length ? legendRow(keyItems, PAD, H0 + 14, W - 2 * PAD, pal) : { svg: '', h: 0 };
    const H = H0 + (keyItems.length ? 14 + key.h : 0) + PAD;

    let body = leg.svg + S.timeAxis(sc, ay, AH, H0, pal);
    rows.forEach((row, i) => {
      const y = top + i * RH;
      if (i > 0) body += S.line(PAD, y, W - PAD, y, { stroke: pal.grid, sw: 1 });
      const label = row.r ? row : { code: row.code };
      body += row.r
        ? rowLabel(q, row.r, PAD, y + 19, LW - PAD - 10, pal, { bold: row.bold, size: 12, codeW: 34 })
        : S.text(PAD, y + 19, label.code + '  Project', { size: 12, weight: 600, v: 'middle', fill: pal.ink });
      const d = row.d;
      if (U.isDate(d.start) && U.isDate(d.end)) {
        const x0 = sc.x(d.start);
        body += row.bold ? summaryBar(x0, sc.xEnd(d.end), y + 13, 9, pal.accent) : S.rect(x0, y + 13, sc.xEnd(d.end) - x0, 12, { fill: pal.accent, rx: 2 });
      } else {
        body += S.text(LW + 6, y + 19, 'no dates yet', { size: 11, fill: pal.muted, italic: true, v: 'middle' });
      }
      if (U.isDate(d.actualStart) && U.isDate(d.actualEnd)) {
        const xa = sc.x(d.actualStart);
        body += S.rect(xa, y + 29, sc.xEnd(d.actualEnd) - xa, 6, { fill: pal.ink2, rx: 2 });
      }
    });
    // milestones on their phase row, numbered as in the milestone table
    const lastNum = {};
    ms.forEach((m, i) => {
      if (!U.isDate(m.baseline)) return;
      const ri = rowOf(m);
      const y = top + ri * RH;
      const cx = xMid(sc, m.baseline);
      body += msDiamond(cx, y + 19, 7, m.type, pal);
      let tx = cx;
      if (lastNum[ri] != null && tx - lastNum[ri] < 16) tx = lastNum[ri] + 16;
      tx = Math.min(tx, W - PAD - 6);
      lastNum[ri] = tx;
      body += S.text(tx, y + 6, String(i + 1), { size: 11, weight: 600, fill: pal.ink2, anchor: 'middle', v: 'middle' });
    });
    body += key.svg;
    return S.svg(W, H, body, { pal, label: 'Phase plan with milestones' });
  }

  // =====================================================================================
  // Graphic: bar chart of all WBS lines
  // =====================================================================================
  function drawBarChart(q, pal) {
    const lines = q.wbs().filter((r) => r.level >= 2);
    const ms = q.rows('milestones');
    const dates = [];
    lines.forEach((r) => {
      const d = q.dates(r._id);
      dates.push(d.start, d.end, d.actualStart, d.actualEnd);
    });
    const rg = dateSpan(q, dates.filter(U.isDate));
    const LW = 300;
    const items = [swSquare('Baseline', pal.accent), swSquare('Actual', pal.ink2)];
    const running = lines.some((r) => {
      const d = q.dates(r._id);
      return r.kind === 'Work package' && U.isDate(d.actualStart) && n(d.progress) != null && n(d.progress) < 100;
    });
    if (running) items.push(swSquare('Actual, in progress (fill = % done)', pal.box, pal.ink2));
    items.push(swDiamond('Milestone', pal.mile));
    const leg = legendRow(items, PAD, PAD, W - 2 * PAD, pal);
    const ay = PAD + leg.h + 10;
    const AH = 22;
    const top = ay + AH + 4;
    const sc = S.timeScale(rg.start, rg.end, LW, W - PAD);
    const rows = [];
    let y = top;
    lines.forEach((r) => {
      const sum = r.kind !== 'Work package';
      const h = sum ? 26 : 20;
      rows.push({ r, y, h, sum });
      y += h;
    });
    const H = y + PAD;

    let body = leg.svg + S.timeAxis(sc, ay, AH, y, pal);
    const yOf = {};
    rows.forEach((row) => {
      const r = row.r;
      const d = q.dates(r._id);
      const indent = Math.max(0, r.level - 2) * 12;
      if (r.level === 2) body += S.line(PAD, row.y, W - PAD, row.y, { stroke: pal.grid, sw: 1 });
      body += rowLabel(q, r, PAD + indent, row.y + row.h / 2, LW - PAD - indent - 10, pal, { bold: row.sum, size: row.sum ? 12 : 11.5 });
      yOf[r._id] = row;
      if (!(U.isDate(d.start) && U.isDate(d.end))) {
        body += S.text(LW + 6, row.y + row.h / 2, 'no dates', { size: 11, fill: pal.muted, italic: true, v: 'middle' });
        return;
      }
      const x0 = sc.x(d.start);
      const x1 = sc.xEnd(d.end);
      if (row.sum) {
        body += summaryBar(x0, x1, row.y + 8, 6, pal.accent);
        return;
      }
      body += S.rect(x0, row.y + 3, x1 - x0, 8, { fill: pal.accent, rx: 2 });
      if (U.isDate(d.actualStart)) {
        const aEnd = U.isDate(d.actualEnd) ? d.actualEnd : U.maxDate([d.end, d.actualStart]);
        const xa = sc.x(d.actualStart);
        const wa = sc.xEnd(aEnd) - xa;
        const pr = n(d.progress);
        if (pr != null && pr < 100) {
          body += S.rect(xa, row.y + 13, wa, 5, { fill: pal.box, stroke: pal.ink2, sw: 1, rx: 1.5 });
          body += S.rect(xa, row.y + 13, (wa * Math.max(0, pr)) / 100, 5, { fill: pal.ink2, rx: 1.5 });
          const lbl = Math.round(pr) + '%';
          const lx = xa + wa + 4;
          if (lx + S.measure(lbl, 11) < W - PAD) body += S.text(lx, row.y + 15.5, lbl, { size: 11, fill: pal.ink2, v: 'middle' });
        } else {
          body += S.rect(xa, row.y + 13, wa, 5, { fill: pal.ink2, rx: 1.5 });
        }
      }
    });
    ms.forEach((m) => {
      const row = yOf[m.wbs];
      if (!row || !U.isDate(m.baseline)) return;
      body += msDiamond(xMid(sc, m.baseline), row.y + (row.sum ? 11 : 7), 6, m.type, pal);
    });
    return S.svg(W, H, body, { pal, label: 'Bar chart of all work packages' });
  }

  // =====================================================================================
  // Graphic: linked bar chart
  // =====================================================================================
  /**
   * Elbow route from (sx, sy) leaving in direction dS (+1 right, -1 left) to (tx, ty), arriving
   * while moving in direction dT. gapY: a free horizontal lane between rows for detours.
   */
  function elbow(sx, sy, dS, tx, ty, dT, gapY) {
    const p1 = sx + dS * 6;
    const p3 = tx - dT * 8;
    const lo = Math.max(dS > 0 ? p1 : -Infinity, dT < 0 ? p3 : -Infinity);
    const hi = Math.min(dS < 0 ? p1 : Infinity, dT > 0 ? p3 : Infinity);
    if (lo <= hi) {
      const xv = Math.min(Math.max(p1, lo), hi);
      return 'M' + r1(sx) + ',' + r1(sy) + ' H' + r1(xv) + ' V' + r1(ty) + ' H' + r1(tx);
    }
    return 'M' + r1(sx) + ',' + r1(sy) + ' H' + r1(p1) + ' V' + r1(gapY) + ' H' + r1(p3) + ' V' + r1(ty) + ' H' + r1(tx);
  }

  function linkedRange(q, res) {
    const dates = [];
    res.order.concat(res.excluded).forEach((x) => {
      dates.push(x.d.start, x.d.end, x.esDate, x.efDate);
    });
    return dateSpan(q, dates.filter(U.isDate));
  }

  function drawLinked(q, pal) {
    const res = cpm(q);
    const shown = {};
    res.order.forEach((x) => {
      if (U.isDate(x.d.start) && U.isDate(x.d.end)) shown[x.id] = { x, s: x.d.start, e: x.d.end, kind: 'plan' };
      else if (x.esDate) shown[x.id] = { x, s: x.esDate, e: x.efDate, kind: 'est' };
    });
    res.excluded.forEach((x) => {
      if (U.isDate(x.d.start) && U.isDate(x.d.end)) shown[x.id] = { x, s: x.d.start, e: x.d.end, kind: 'out' };
    });
    const rg = linkedRange(q, res);
    const LW = 270;
    const RH = 22;
    const kinds = Object.keys(shown).map((k) => shown[k]);
    const legItems = [swSquare('Critical path (no total float)', pal.crit), swSquare('Work package with float', pal.accent)];
    if (kinds.some((s) => s.kind === 'est')) legItems.push(swSquare('No dates yet: earliest dates from the estimate', 'none', pal.accent, '3 2'));
    if (kinds.some((s) => s.kind === 'out')) legItems.push(swSquare('Left out of the network', pal.grid, pal.muted));
    legItems.push(swLine('Critical link', pal.crit), swLine('Other link', pal.accent));
    const leg = legendRow(legItems, PAD, PAD, W - 2 * PAD, pal);
    const ay = PAD + leg.h + 10;
    const AH = 22;
    const top = ay + AH + 4;
    const sc = S.timeScale(rg.start, rg.end, LW, W - PAD - 8);

    // rows: phase headers with the work packages that have a bar
    const rows = [];
    const lines = q.wbs().filter((r) => r.level >= 2);
    lines.forEach((r) => {
      if (shown[r._id]) rows.push({ r, wp: shown[r._id] });
      else if (r.kind !== 'Work package') {
        const code = String(r.code).trim();
        if (lines.some((o) => shown[o._id] && String(o.code).startsWith(code + '.'))) rows.push({ r, head: true });
      }
    });
    const H = top + rows.length * RH + PAD;
    const geo = {};
    let bars = '';
    rows.forEach((row, i) => {
      const y = top + i * RH;
      const indent = Math.max(0, row.r.level - 2) * 12;
      if (row.head && row.r.level === 2 && i > 0) bars += S.line(PAD, y, W - PAD, y, { stroke: pal.grid, sw: 1 });
      bars += rowLabel(q, row.r, PAD + indent, y + RH / 2, LW - PAD - indent - 10, pal, { bold: !!row.head, size: row.head ? 12 : 11.5 });
      if (row.head) return;
      const s = row.wp;
      const x0 = sc.x(s.s);
      const x1 = sc.xEnd(s.e);
      const crit = s.x.critical;
      const col = crit ? pal.crit : pal.accent;
      if (s.kind === 'out') bars += S.rect(x0, y + 6, x1 - x0, 10, { fill: pal.grid, stroke: pal.muted, sw: 1, rx: 2 });
      else if (s.kind === 'est') bars += S.rect(x0, y + 5, x1 - x0, 12, { fill: pal.bg, stroke: col, sw: 1.5, rx: 2, dash: '3 2' });
      else bars += S.rect(x0, y + 5, x1 - x0, 12, { fill: col, rx: 2 });
      geo[row.r._id] = { x0, x1, cy: y + RH / 2, y };
    });
    const aC = S.uid('lk');
    const aN = S.uid('lk');
    let links = '';
    res.edges.forEach((e) => {
      const a = geo[e.from.id];
      const b = geo[e.to.id];
      if (!a || !b) return;
      const fromEnd = e.type === 'FS' || e.type === 'FF';
      const toStart = e.type === 'FS' || e.type === 'SS';
      const sx = fromEnd ? a.x1 : a.x0;
      const tx = toStart ? b.x0 : b.x1;
      const gapY = b.cy > a.cy ? b.y : b.y + RH;
      const d = elbow(sx, a.cy, fromEnd ? 1 : -1, tx, b.cy, toStart ? 1 : -1, gapY);
      links += S.path(d, { stroke: e.critical ? pal.crit : pal.accent, sw: e.critical ? 1.6 : 1.1, markerEnd: e.critical ? aC : aN, opacity: e.critical ? null : 0.85 });
    });
    const defs = '<defs>' + S.arrowDef(aC, pal.crit, 7) + S.arrowDef(aN, pal.accent, 6) + '</defs>';
    const body = leg.svg + S.timeAxis(sc, ay, AH, top + rows.length * RH, pal) + links + bars;
    return S.svg(W, H, defs + body, { pal, label: 'Linked bar chart with the critical path' });
  }

  // =====================================================================================
  // Graphic: network diagram
  // =====================================================================================
  const NW = 152; // node width
  const NH = 104; // node height
  const CG = 50; // gap between columns (room for the links)
  const RG = 24; // gap between rows

  function networkLayout(res) {
    const nodes = res.order;
    const cols = [];
    nodes.forEach((x) => {
      (cols[x.rank] = cols[x.rank] || []).push(x);
    });
    for (let c = 0; c < cols.length; c++) cols[c] = cols[c] || [];
    cols.forEach((col, c) => {
      col.forEach((x, i) => {
        const ps = x.preds.map((e) => e.from).filter((p) => p.slot != null);
        x.want = ps.length ? ps.reduce((s, p) => s + p.slot, 0) / ps.length : i;
      });
      col.sort((a, b) => a.want - b.want || U.codeCmp(a.code, b.code));
      let prev = -1;
      col.forEach((x) => {
        x.slot = Math.max(Math.round(x.want), prev + 1);
        prev = x.slot;
      });
      // pull a column up when it was pushed down as a whole
      const minSlot = col.length ? col[0].slot : 0;
      const spare = col.length ? minSlot - Math.max(0, Math.round(col.reduce((s, x) => s + x.want, 0) / col.length - (col.length - 1) / 2)) : 0;
      if (spare > 0) col.forEach((x) => (x.slot -= spare));
    });
    const maxSlot = nodes.reduce((m, x) => Math.max(m, x.slot), 0);
    const occ = cols.map((col) => new Set(col.map((x) => x.slot)));
    return { cols, maxSlot, occ };
  }

  function drawNetwork(q, pal) {
    const res = cpm(q);
    const lay = networkLayout(res);
    const leg = legendRow([
      { label: 'Critical work package (TF 0)', sw: 18, swatch: (x, cy) => S.rect(x, cy - 6, 18, 12, { fill: pal.critSoft, stroke: pal.crit, sw: 2, rx: 2 }) },
      { label: 'Work package with float', sw: 18, swatch: (x, cy) => S.rect(x, cy - 6, 18, 12, { fill: pal.box, stroke: pal.boxLine, sw: 1, rx: 2 }) },
      swLine('Critical link', pal.crit),
      swLine('Other link', pal.muted),
    ], PAD, PAD, 900, pal);
    const keyY = PAD + leg.h + 2;
    const key = S.text(PAD, keyY + 6, 'ES/EF earliest start/finish, LS/LF latest start/finish, TF total float, FF free float: days from the project start (day 0). Labels on links: type and lag when not a plain finish-to-start.', { size: 11, fill: pal.muted, v: 'middle' });
    const top = keyY + 24;
    const colX = (c) => PAD + c * (NW + CG);
    const slotY = (s) => top + s * (NH + RG);
    const Wd = Math.max(W, colX(lay.cols.length - 1) + NW + PAD, PAD + S.measure('ES/EF earliest start/finish, LS/LF latest start/finish, TF total float, FF free float: days from the project start (day 0). Labels on links: type and lag when not a plain finish-to-start.', 11) + PAD);
    const H = slotY(lay.maxSlot) + NH + RG + PAD;

    // links
    const aC = S.uid('nw');
    const aN = S.uid('nw');
    let links = '';
    let labels = '';
    res.edges.forEach((e) => {
      const a = e.from;
      const b = e.to;
      if (a.slot == null || b.slot == null) return;
      const ca = a.rank;
      const cb = b.rank;
      const x1 = colX(ca) + NW;
      const y1 = slotY(a.slot) + NH / 2;
      const x2 = colX(cb);
      const y2 = slotY(b.slot) + NH / 2;
      const offA = 10 + (a.slot % 4) * 8;
      const offB = 10 + (b.slot % 4) * 8;
      let d;
      if (cb === ca + 1 || y1 === y2) {
        const xm = cb === ca + 1 ? x1 + offA : x2 - offB;
        d = y1 === y2 ? 'M' + r1(x1) + ',' + r1(y1) + ' H' + r1(x2) : 'M' + r1(x1) + ',' + r1(y1) + ' H' + r1(xm) + ' V' + r1(y2) + ' H' + r1(x2);
        if (y1 === y2) {
          // a straight line must not cross boxes in between
          let blockedRow = false;
          for (let c = ca + 1; c < cb; c++) if (lay.occ[c].has(a.slot)) blockedRow = true;
          if (blockedRow) d = null;
        }
      }
      if (!d) {
        const blockedAt = (s) => {
          for (let c = ca + 1; c < cb; c++) if (lay.occ[c].has(s)) return true;
          return false;
        };
        if (!blockedAt(a.slot)) d = 'M' + r1(x1) + ',' + r1(y1) + ' H' + r1(x2 - offB) + ' V' + r1(y2) + ' H' + r1(x2);
        else if (!blockedAt(b.slot)) d = 'M' + r1(x1) + ',' + r1(y1) + ' H' + r1(x1 + offA) + ' V' + r1(y2) + ' H' + r1(x2);
        else {
          const yc = b.slot >= a.slot ? slotY(a.slot) + NH + RG / 2 : slotY(a.slot) - RG / 2;
          d = 'M' + r1(x1) + ',' + r1(y1) + ' H' + r1(x1 + offA) + ' V' + r1(yc) + ' H' + r1(x2 - offB) + ' V' + r1(y2) + ' H' + r1(x2);
        }
      }
      links += S.path(d, { stroke: e.critical ? pal.crit : pal.muted, sw: e.critical ? 2 : 1.2, markerEnd: e.critical ? aC : aN });
      if (e.type !== 'FS' || e.lag) {
        const t = e.type + (e.lag ? (e.lag > 0 ? '+' : '−') + Math.abs(e.lag) : '');
        // next to the arrowhead, on the side away from the incoming vertical segment
        const tw = S.measure(t, 11, 600);
        const ty = y1 < y2 ? y2 + 9 : y2 - 9;
        const tx = x2 - 9 - tw;
        labels += S.rect(tx - 2, ty - 7, tw + 4, 14, { fill: pal.bg, rx: 2 });
        labels += S.text(tx, ty, t, { size: 11, weight: 600, fill: pal.ink2, v: 'middle' });
      }
    });

    // nodes
    let boxes = '';
    res.order.forEach((x) => {
      const bx = colX(x.rank);
      const by = slotY(x.slot);
      const crit = x.critical;
      const stroke = crit ? pal.crit : pal.boxLine;
      boxes += S.rect(bx, by, NW, NH, { fill: pal.bg, rx: 4 });
      boxes += S.rect(bx + 1, by + 1, NW - 2, 20, { fill: crit ? pal.critSoft : pal.box });
      boxes += S.line(bx, by + 21, bx + NW, by + 21, { stroke: pal.line, sw: 1 });
      boxes += S.text(bx + 7, by + 11, x.code, { size: 11, weight: 600, family: 'mono', fill: pal.ink, v: 'middle' });
      const ini = q.initials(x.resp);
      if (ini) boxes += S.text(bx + NW - 7, by + 11, ini, { size: 11, weight: 600, fill: pal.ink2, v: 'middle', anchor: 'end' });
      boxes += S.textBlock(bx + 7, by + 26, x.name, { maxW: NW - 14, size: 11.5, lineH: 1.15, maxLines: 2, fill: x.ph ? pal.muted : pal.ink, italic: x.ph }).svg;
      const dl = x.dur + ' d' + (x.esDate ? ' · ' + short(x.esDate) + '–' + short(x.efDate) : '');
      boxes += S.text(bx + 7, by + 62, S.fit(dl, NW - 14, 11), { size: 11, fill: pal.ink2, v: 'middle' });
      // six values
      const gy = by + 72;
      const cw = NW / 3;
      boxes += S.line(bx, gy, bx + NW, gy, { stroke: pal.line, sw: 1 });
      boxes += S.line(bx, gy + 16, bx + NW, gy + 16, { stroke: pal.line, sw: 1 });
      boxes += S.line(bx + cw, gy, bx + cw, by + NH, { stroke: pal.line, sw: 1 });
      boxes += S.line(bx + 2 * cw, gy, bx + 2 * cw, by + NH, { stroke: pal.line, sw: 1 });
      const cells = [['ES', x.es], ['EF', x.ef], ['TF', x.tf], ['LS', x.ls], ['LF', x.lf], ['FF', x.ff]];
      cells.forEach((cell, i) => {
        const cx = bx + (i % 3) * cw;
        const cy = gy + 8 + Math.floor(i / 3) * 16;
        boxes += S.text(cx + 5, cy, cell[0], { size: 11, fill: pal.muted, v: 'middle' });
        boxes += S.text(cx + cw - 5, cy, String(cell[1]), { size: 11, weight: 600, fill: pal.ink, v: 'middle', anchor: 'end' });
      });
      boxes += S.rect(bx, by, NW, NH, { stroke, sw: crit ? 2 : 1, rx: 4 });
    });
    const defs = '<defs>' + S.arrowDef(aC, pal.crit, 8) + S.arrowDef(aN, pal.muted, 7) + '</defs>';
    let svg = S.svg(Wd, H, defs + leg.svg + key + links + boxes + labels, { pal, label: 'Network diagram with the critical path' });
    // keep wide diagrams readable: scroll sideways instead of shrinking below ~80 %
    if (Wd > W) svg = svg.replace('style="color:', 'style="min-width:' + Math.round(Wd * 0.8) + 'px;color:');
    return svg;
  }

  // =====================================================================================
  // Section 3.5: Schedule
  // =====================================================================================
  const TOOLS = [
    { _id: 'ms', tool: 'Milestone plan', content: 'Time-critical events (duration 0) with baseline, revised and actual dates', use: 'Plans the critical dates at a high level and focuses the team' },
    { _id: 'list', tool: 'Schedule list', content: 'All work packages with start and end date', use: 'Detailed dates when there are only a few work packages' },
    { _id: 'bar', tool: 'Bar chart', content: 'Work packages as bars on a timeline', use: 'Makes the dates visible at a glance' },
    { _id: 'linked', tool: 'Linked bar chart', content: 'Bars plus the links between predecessors and successors', use: 'Shows dependencies; lets you simulate changes' },
    { _id: 'net', tool: 'Network diagram', content: 'Work packages and dependencies as a network with earliest and latest dates', use: 'Shows float and the critical path; for complex projects' },
  ];

  PM.section({
    id: 'schedule',
    part: 'initiation',
    order: 35.2,
    num: '3.5',
    step: 'I4',
    slides: '58–69',
    title: 'Schedule: milestones and bar chart',
    navTitle: 'Schedule',
    intro: 'Turn the WBS into dates: milestones first, then a phase plan and a bar chart. Estimate how long each work package takes.',
    blocks: [
      {
        type: 'guide',
        title: 'How to build the schedule',
        text: 'Inputs: the time boundaries with any fixed deadlines, the WBS, and first assumptions about who works on what.',
        ordered: true,
        items: [
          'Pick the tools that fit the project and the people who will read the plan (table below).',
          'Mark the time-critical events as milestones in the WBS.',
          'Move them into the milestone plan.',
          'Estimate the duration of each work package and set start and end dates.',
          'Draw the high-level schedule: a phase plan with the milestones. The detailed schedule with links follows in the start process (4.2).',
        ],
      },
      {
        type: 'guide',
        title: 'No project without a milestone plan',
        ordered: true,
        items: [
          'Find the time-critical events and place them as milestones in the WBS.',
          'Copy them into the milestone plan and word each one as an event ("… completed").',
          'Give each a realistic date, top-down from the deadline or bottom-up from the work packages.',
          'Freeze these baseline dates once the sponsor approves the project.',
          'During controlling, fill in the revised and actual dates.',
        ],
      },
      {
        type: 'table',
        key: 'schedTools',
        title: 'Scheduling tools',
        hint: 'Which tool fits depends on the type and complexity of the project and on who reads the plan.',
        fixed: TOOLS,
        columns: [
          { key: 'tool', label: 'Tool', from: true, w: 13 },
          { key: 'content', label: 'Content', from: true, w: 26 },
          { key: 'use', label: 'Use', from: true, w: 24 },
          { key: 'used', label: 'Used in our project?', kind: 'select', options: ['Yes', 'No', 'Later'], w: 9 },
          { key: 'readers', label: 'Who reads it', kind: 'text', w: 18, placeholder: 'e.g. Sponsor, core team' },
        ],
      },
      { type: 'h', text: 'Milestones', sub: 'Events with no duration that mark the start or end of a work package or phase.' },
      { type: 'table', key: 'milestones' },
      {
        type: 'checks',
        title: 'Milestone rules',
        run(q) {
          const ms = q.rows('milestones');
          const out = [];
          const named = ms.filter((m) => !U.isEmpty(m.name) || U.isDate(m.baseline) || m.wbs);
          // no phase without a milestone
          const codes = ms.map((m) => (q.wbsRow(m.wbs) || {}).code).filter(Boolean).map((c) => String(c).trim());
          const bare = q.phases().filter((p) => {
            const pc = String(p.code).trim();
            return !codes.some((c) => c === pc || c.startsWith(pc + '.'));
          });
          out.push(bare.length
            ? { ok: false, text: 'Phases without a milestone: ' + list(bare.map((p) => p.code + ' ' + q.label(p, 'name'))) + '. Link a milestone to the phase or one of its work packages (WBS column).' }
            : { ok: true, text: 'Every phase has at least one milestone.' });
          // worded as events
          const notEvent = ms.filter((m) => !U.isEmpty(m.name) && !isEventWording(m.name));
          out.push(notEvent.length
            ? { ok: false, text: 'Not worded as an event: ' + list(notEvent.map((m) => '"' + m.name + '"')) + '. Use "… started", "… completed", "… approved".' }
            : { ok: true, text: 'All milestones are worded as events.' });
          // baseline dates
          const noBase = named.filter((m) => !U.isDate(m.baseline));
          out.push(noBase.length
            ? { ok: false, text: 'Without a baseline date: ' + list(noBase.map((m) => m.name || q.label(m, 'name') || 'unnamed milestone')) + '.' }
            : { ok: named.length ? true : null, text: named.length ? 'Every milestone has a baseline date.' : 'No milestones yet.' });
          // one per controlling cycle
          const pd = q.projectDates();
          if (U.isDate(pd.start) && U.isDate(pd.end) && U.diffDays(pd.start, pd.end) > 0) {
            const days = U.diffDays(pd.start, pd.end) + 1;
            const cycles = days / 28;
            const cnt = ms.filter((m) => U.isDate(m.baseline)).length;
            let text = cnt + ' dated milestones over about ' + U.fmtNum(round1(cycles), 1) + ' controlling cycles of 4 weeks';
            if (cnt < cycles * 0.6) text += ': fewer than one per cycle. Add milestones so each report has a date to check.';
            else if (cnt > cycles * 2) text += ': many per cycle. Keep the ones the sponsor needs to see.';
            else text += ': about one per cycle.';
            out.push({ ok: null, text });
          } else {
            out.push({ ok: null, text: 'Set the project start and end dates (time boundaries) to compare the number of milestones with the controlling cycles.' });
          }
          // inside the project dates
          const s = q.f('time.startDate');
          const e = q.f('time.endDate');
          if (U.isDate(s) && U.isDate(e)) {
            const outside = ms.filter((m) => [m.baseline, m.revised, m.actual].some((d) => U.isDate(d) && (d < s || d > e)));
            out.push(outside.length
              ? { ok: false, text: 'Outside the project dates (' + short(s) + ' to ' + short(e) + '): ' + list(outside.map((m) => m.name || 'unnamed milestone')) + '.' }
              : { ok: true, text: 'All milestone dates lie between the start and end date.' });
          }
          // internal and external
          const ext = ms.filter((m) => m.type === 'External').length;
          const int = ms.filter((m) => m.type !== 'External' && (!U.isEmpty(m.name) || U.isDate(m.baseline))).length;
          out.push({
            ok: null,
            text: ext
              ? int + ' internal and ' + ext + ' external milestones. External ones are dates others see (customer, authority, guests).'
              : 'All milestones are internal. Mark the ones a customer, an authority or another outside party sees as external.',
          });
          return out;
        },
      },
      {
        type: 'graphic',
        title: 'Milestone plan',
        caption: 'Each diamond sits at its baseline date. A dot marks the actual date (filled) or the revised date (hollow); the bracket above the line shows the shift.',
        empty: (q) => {
          const ms = q.rows('milestones');
          const rg = dateSpan(q, ms.map((m) => m.baseline).filter(U.isDate));
          return rg.start && rg.end ? null : 'Add the project start and end dates or baseline dates for the milestones to see the milestone plan.';
        },
        render: drawMilestonePlan,
      },
      { type: 'h', text: 'Duration estimates', sub: 'Estimate per work package before you set dates.' },
      {
        type: 'table',
        key: 'schedEstimates',
        title: 'Duration estimates per work package',
        hint: 'Duration means elapsed time in calendar days, not effort, assuming normal use of the people involved. Intuitive: expert judgement. Analogous: experience from similar work. Analytical: amount of work divided by the output per day. The three-point estimate weights the scenarios (O + 4R + P) / 6; the spread shows how uncertain it is. A fixed start (e.g. the event day) is used by the network calculation in 4.2.',
        from: 'wbs',
        filter: (r) => r.kind === 'Work package',
        compact: true,
        columns: [
          { key: 'code', label: 'WBS', from: true, family: 'mono', w: 6 },
          { key: 'name', label: 'Work package', from: true, w: 20 },
          { key: 'method', label: 'Method', kind: 'select', options: ['Intuitive', 'Analogous', 'Analytical'], w: 10 },
          { key: 'opt', label: 'Optimistic', kind: 'number', sub: 'O, days', w: 6 },
          { key: 'real', label: 'Realistic', kind: 'number', sub: 'R, days', w: 6 },
          { key: 'pess', label: 'Pessimistic', kind: 'number', sub: 'P, days', w: 6 },
          {
            key: 'te', label: 'Three-point', kind: 'number', sub: '(O+4R+P)/6', dec: 1, w: 7,
            compute: (r) => {
              const o = n(r.opt);
              const m = n(r.real);
              const p = n(r.pess);
              return o != null && m != null && p != null ? round1((o + 4 * m + p) / 6) : null;
            },
          },
          {
            key: 'sd', label: 'Spread', kind: 'number', sub: '(P−O)/6', dec: 1, w: 6,
            compute: (r) => {
              const o = n(r.opt);
              const p = n(r.pess);
              return o != null && p != null ? round1((p - o) / 6) : null;
            },
          },
          { key: 'amount', label: 'Amount of work', kind: 'number', sub: 'analytical', w: 7 },
          { key: 'prod', label: 'Output per day', kind: 'number', sub: 'analytical', w: 7 },
          {
            key: 'ana', label: 'Analytical', kind: 'number', sub: 'days', dec: 1, w: 6,
            compute: (r) => {
              const a = n(r.amount);
              const p = n(r.prod);
              return a != null && p ? round1(a / p) : null;
            },
          },
          { key: 'plan', label: 'Planned', kind: 'number', sub: 'days in the schedule', w: 6, compute: (r, q) => U.spanDays(q.dates(r._id)) },
          { key: 'fixed', label: 'Fixed start', kind: 'date', sub: 'if any' },
          { key: 'basis', label: 'Basis and assumptions', kind: 'textarea', w: 22, placeholder: 'Where the numbers come from' },
        ],
      },
      { type: 'h', text: 'Dates', sub: 'Planned (baseline) and actual dates per work package.' },
      { type: 'table', key: 'schedule', title: 'Dates per work package' },
      {
        type: 'graphic',
        title: 'Phase plan with milestones',
        caption: 'The high-level schedule: the project and each phase as a bar from its earliest to its latest work package, the actual span below it, and the milestones (numbered as in the milestone table) on their phase.',
        empty: (q) => {
          const rg = dateSpan(q, []);
          return rg.start && rg.end ? null : 'Add the project start and end dates or dates for the work packages to see the phase plan.';
        },
        render: drawPhasePlan,
      },
      {
        type: 'graphic',
        title: 'Bar chart',
        caption: 'All WBS lines grouped by phase. Upper bar: baseline; lower bar: actual dates, partly filled while a work package is still running.',
        empty: (q) => {
          const rg = dateSpan(q, []);
          return rg.start && rg.end && q.wbs().some((r) => r.level >= 2) ? null : 'Add work packages with start and end dates to see the bar chart.';
        },
        render: drawBarChart,
      },
    ],
  });

  // =====================================================================================
  // Section 4.2: Detailed schedule and network analysis
  // =====================================================================================
  const DEP_TYPES = [
    { _id: 'FS', type: 'FS', name: 'Finish-to-start', meaning: 'B can start when A has ended', write: '1.2.1 or 1.2.1 FS+5', example: 'Set-up starts once the catering contract is signed' },
    { _id: 'SS', type: 'SS', name: 'Start-to-start', meaning: 'B can start when A has started', write: '1.2.1 SS+10', example: 'Registrations open 10 days after the invitation design starts' },
    { _id: 'FF', type: 'FF', name: 'Finish-to-finish', meaning: 'B can end when A has ended', write: '1.2.1 FF', example: 'Testing ends when development ends' },
    { _id: 'SF', type: 'SF', name: 'Start-to-finish', meaning: 'B can end when A has started', write: '1.2.1 SF', example: 'The old system runs until the new one starts' },
  ];
  const nodeOf = (q, id) => {
    const x = cpm(q).byId[id];
    return x && x.es != null ? x : null;
  };
  const cpmNum = (k) => (r, q) => {
    const x = nodeOf(q, r._id);
    return x ? x[k] : null;
  };

  PM.section({
    id: 'network',
    part: 'start',
    order: 42.3,
    num: '4.2',
    step: 'S2',
    slides: '116–124',
    title: 'Detailed schedule: linked bar chart and network',
    navTitle: 'Linked bar chart and network',
    intro: 'Link the work packages, find the critical path and see how much float each one has.',
    landscape: true,
    blocks: [
      {
        type: 'guide',
        title: 'From bar chart to linked bar chart',
        text: 'The schedule is finalised from the WP specifications. Network analysis is the most demanding method; use it for complex projects.',
        ordered: true,
        items: [
          'Give every work package a duration and name what it depends on.',
          'Draw the bars with their links.',
          'Calculate forwards and backwards: earliest and latest dates and the float. The chain without float is the critical path.',
          'Check the result against the resource plan and fixed dates, and optimise.',
        ],
      },
      {
        type: 'group',
        cols: 2,
        blocks: [
          {
            type: 'guide',
            title: 'Accuracy grows step by step',
            ordered: true,
            items: [
              'Rough: phases and milestones (initiation, 3.5).',
              'Detailed: work packages with dates and the main dependencies.',
              'Verified detailed: based on the WP specifications and the resource plan.',
            ],
          },
          {
            type: 'callout',
            kind: 'tip',
            title: 'Schedule hierarchies.',
            text: 'Give each reader the level they need: the sponsor the milestone plan, the core team the phase plan, work package owners the detailed bars. A detailed bar chart is rarely useful in a controlling meeting.',
          },
        ],
      },
      {
        type: 'table',
        key: 'schedDependencyTypes',
        title: 'Types of dependency',
        hint: 'A is the predecessor, B the successor. Tick the types you use.',
        fixed: DEP_TYPES,
        compact: true,
        columns: [
          { key: 'type', label: 'Type', from: true, family: 'mono', w: 4 },
          { key: 'name', label: 'Name', from: true, w: 13 },
          { key: 'meaning', label: 'Meaning', from: true, w: 22 },
          { key: 'write', label: 'Write it as', from: true, family: 'mono', w: 14 },
          { key: 'example', label: 'Example', from: true, w: 28 },
          { key: 'used', label: 'Used', kind: 'check', w: 5 },
        ],
      },
      {
        type: 'note',
        text: 'Type the predecessors in the table below: "1.2.1" is finish-to-start, "1.3.2 SS" start-to-start, "1.4.1 FS+5" finish-to-start with 5 days lag, "1.4.1 SS-2" starts 2 days before. Separate several with a comma or semicolon. A phase code such as "1.3" stands for all its work packages.',
      },
      { type: 'table', key: 'schedule', title: 'Dates and predecessors', hint: 'The same table as in 3.5: changes here show up there.' },
      {
        type: 'fields',
        title: 'Network settings',
        cols: 2,
        fields: [
          {
            key: 'sched.cpmExclude', label: 'Left out of the network', kind: 'text', placeholder: 'e.g. 1.1.2, 1.1.3',
            hint: 'WBS codes of ongoing work that runs alongside the whole project, such as coordinating and controlling. Left in, it sets the project end.',
          },
        ],
      },
      { type: 'h', text: 'Critical path', sub: 'Calculated from the durations and predecessors. Day 0 is the project start.' },
      {
        type: 'table',
        key: 'schedCpm',
        title: 'Earliest and latest dates per work package',
        hint: 'Duration from the planned dates, else from the estimate in 3.5. ES/EF earliest start/finish, LS/LF latest start/finish, TF total float (LS − ES), FF free float (how far it can slip without moving a successor). A work package with ES 0 and duration 12 runs on days 0 to 11 and has EF 12.',
        from: 'wbs',
        filter: (r) => r.kind === 'Work package',
        compact: true,
        columns: [
          { key: 'code', label: 'WBS', from: true, family: 'mono', w: 6 },
          { key: 'name', label: 'Work package', from: true, w: 18 },
          { key: 'resp', label: 'Responsible', kind: 'person', w: 10, compute: (r) => r.responsible || '' },
          {
            key: 'basis', label: 'Duration from', kind: 'text', w: 8,
            compute: (r, q) => {
              const res = cpm(q);
              const x = res.byId[r._id];
              if (x) return x.es == null ? 'Loop' : x.src === 'dates' ? 'Dates' : 'Estimate';
              if (res.excluded.some((e) => e.id === r._id)) return 'Left out';
              return 'Missing';
            },
          },
          { key: 'dur', label: 'Duration', kind: 'number', sub: 'days', w: 5, compute: cpmNum('dur') },
          { key: 'es', label: 'ES', kind: 'number', sub: 'day', w: 4, compute: cpmNum('es') },
          { key: 'ef', label: 'EF', kind: 'number', sub: 'day', w: 4, compute: cpmNum('ef') },
          { key: 'ls', label: 'LS', kind: 'number', sub: 'day', w: 4, compute: cpmNum('ls') },
          { key: 'lf', label: 'LF', kind: 'number', sub: 'day', w: 4, compute: cpmNum('lf') },
          { key: 'tf', label: 'TF', kind: 'number', sub: 'days', w: 4, compute: cpmNum('tf') },
          { key: 'ff', label: 'FF', kind: 'number', sub: 'days', w: 4, compute: cpmNum('ff') },
          { key: 'crit', label: 'Critical', kind: 'text', w: 5, compute: (r, q) => { const x = nodeOf(q, r._id); return x ? (x.critical ? 'Yes' : 'No') : ''; } },
          { key: 'esDate', label: 'Earliest start', kind: 'date', compute: cpmNum('esDate') },
          { key: 'lfDate', label: 'Latest finish', kind: 'date', compute: cpmNum('lfDate') },
          { key: 'gap', label: 'Planned start', sub: 'days after earliest', kind: 'number', w: 7, compute: cpmNum('gap') },
        ],
      },
      {
        type: 'checks',
        title: 'Network checks',
        run(q) {
          const res = cpm(q);
          const out = [];
          if (!res.nodes.length && !res.missing.length) return [{ ok: null, text: 'Add work packages to the WBS first.' }];
          out.push(res.unknown.length
            ? { ok: false, text: 'Unknown predecessor codes: ' + list(res.unknown) + '. Check them against the WBS.' }
            : { ok: true, text: 'All predecessor codes exist in the WBS.' });
          if (res.invalid.length) out.push({ ok: false, text: 'Predecessors that cannot be read: ' + list(res.invalid) + '. Write them like "1.2.1", "1.3.2 SS" or "1.4.1 FS+5".' });
          if (res.selfRefs.length) out.push({ ok: false, text: 'Work packages named as their own predecessor: ' + list(res.selfRefs) + '.' });
          out.push(res.blocked.length
            ? { ok: false, text: 'Loop in the dependencies' + (res.loop.length ? ' between ' + list(res.loop) : '') + '. ' + res.blocked.length + ' work packages cannot be calculated until it is broken.' }
            : { ok: true, text: 'No loops in the dependencies.' });
          out.push(res.missing.length
            ? { ok: false, text: 'No dates and no estimate, so not in the calculation: ' + list(res.missing.map((x) => x.code + (x.reason ? ' (' + x.reason + ')' : ''))) + '.' }
            : { ok: true, text: 'Every work package has a duration.' });
          if (!res.order.length) return out;
          const firstDay = U.minDate(res.order.map((x) => x.d.start));
          const loose = res.order.filter((x) => !x.preds.length && U.isDate(x.d.start) && firstDay && x.d.start !== firstDay && !x.fixed);
          out.push({
            ok: null,
            text: loose.length
              ? 'No predecessor although they start later: ' + list(loose.map((x) => x.code)) + '. Name the work package they wait for, or set a fixed start.'
              : 'Only the first work packages have no predecessor.',
          });
          const ends = res.order.filter((x) => !x.succs.length && x.ef < res.end);
          if (ends.length) out.push({ ok: null, text: 'Open ends without a successor: ' + list(ends.map((x) => x.code)) + '. Link them to a later work package (e.g. closing) so a delay shows in the end date.' });
          const early = res.order.filter((x) => x.gap != null && x.gap < 0);
          out.push(early.length
            ? { ok: false, text: 'Planned to start before the earliest possible start: ' + list(early.map((x) => x.code + ' (' + Math.abs(x.gap) + ' d early)')) + '.' }
            : { ok: true, text: 'No work package is planned to start before its predecessors allow.' });
          const missed = res.order.filter((x) => x.fixed && x.driven > U.diffDays(res.start0, x.fixed));
          if (missed.length) out.push({ ok: false, text: 'Fixed start cannot be met: ' + list(missed.map((x) => x.code + ' (earliest ' + short(U.addDays(res.start0, x.driven)) + ')')) + '.' });
          const endB = q.f('time.endDate');
          const cp = res.order.filter((x) => x.critical).map((x) => x.code);
          if (res.endDate && U.isDate(endB)) {
            const diff = U.diffDays(res.endDate, endB);
            out.push(diff >= 0
              ? { ok: true, text: 'Critical path ' + res.end + ' days (' + list(cp, 14) + '), ends ' + short(res.endDate) + ': ' + diff + ' days before the end date.' }
              : { ok: false, text: 'Critical path ' + res.end + ' days ends ' + short(res.endDate) + ', ' + -diff + ' days after the end date (' + short(endB) + '). Shorten it or move the end date.' });
          } else {
            out.push({ ok: null, text: 'Critical path: ' + res.end + ' days. Set an end date in the time boundaries to compare.' });
          }
          const ongoing = res.order.filter((x) => x.critical && res.end > 20 && x.dur >= 0.6 * res.end);
          if (ongoing.length) out.push({ ok: null, text: list(ongoing.map((x) => x.code)) + ' run for most of the project and set its end. Ongoing work like coordinating or controlling is usually left out of the network (field above).' });
          return out;
        },
      },
      {
        type: 'graphic',
        title: 'Linked bar chart',
        caption: 'Bars at the planned dates. Each arrow runs from the end (FS, FF) or start (SS, SF) of the predecessor to the start (FS, SS) or end (FF, SF) of the successor. The critical path and its links are drawn in red.',
        empty: (q) => {
          const res = cpm(q);
          return res.order.some((x) => U.isDate(x.d.start) || x.esDate) ? null : 'Add dates or duration estimates to the work packages to see the linked bar chart.';
        },
        render: drawLinked,
      },
      {
        type: 'graphic',
        title: 'Network diagram',
        caption: 'Work packages in columns by their position in the chain. Each box: WBS code and responsible person, name, duration with the earliest dates, then the six values. Red boxes and arrows form the critical path. Wide diagrams scroll sideways.',
        empty: (q) => (cpm(q).order.length ? null : 'Add dates or duration estimates and predecessors to the work packages to see the network diagram.'),
        render: drawNetwork,
      },
    ],
  });

  // =====================================================================================
  // Metrics
  // =====================================================================================
  PM.metric('milestones', {
    label: 'Milestones',
    kind: 'number',
    section: 'schedule',
    fn: (q) => q.rows('milestones').filter((m) => !U.isEmpty(m.name) || U.isDate(m.baseline)).length,
  });
  PM.metric('criticalPathDays', {
    label: 'Critical path',
    kind: 'number',
    unit: 'days',
    section: 'network',
    fn: (q) => {
      const res = cpm(q);
      return res.order.length ? res.end : null;
    },
  });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  const E = (method, opt, real, pess, basis, amount, prod) => ({ method, opt, real, pess, basis, amount: amount || null, prod: prod || null });
  PM.example({
    f: { 'sched.cpmExclude': '1.1.2, 1.1.3' },
    x: {
      schedTools: {
        ms: { used: 'Yes', readers: 'Sponsor, steering committee, whole team' },
        list: { used: 'Yes', readers: 'Core team (weekly meeting)' },
        bar: { used: 'Yes', readers: 'Core team, work package owners' },
        linked: { used: 'Yes', readers: 'Project manager, core team' },
        net: { used: 'Later', readers: 'Project manager (critical path check)' },
      },
      schedDependencyTypes: { FS: { used: true }, SS: { used: true }, FF: { used: false }, SF: { used: false } },
      schedEstimates: {
        w111: E('Intuitive', 8, 12, 16, 'Charter, kick-off and start workshop in the first two weeks'),
        w112: E('Analogous', 140, 152, 160, 'Runs alongside the project until the evaluation'),
        w113: E('Analogous', 140, 152, 160, 'Reports every four weeks until the evaluation'),
        w114: E('Analogous', 10, 12, 20, 'Closure report and lessons learned, as for the 2024 event'),
        w121: E('Analogous', 10, 12, 18, 'Online survey open for 10 days, as for the last staff survey'),
        w122: E('Intuitive', 14, 19, 28, 'Two concept workshops plus write-up; depends on the survey results'),
        w123: E('Intuitive', 3, 5, 10, 'One sponsor meeting; a second one if changes are needed'),
        w131: E('Analogous', 10, 12, 21, 'Three venue visits and contract; 2024 took 12 days'),
        w132: E('Analogous', 20, 26, 35, 'Tender to three caterers, tasting, contract'),
        w133: E('Intuitive', 35, 47, 60, 'Artists book 6 to 8 weeks ahead'),
        w134: E('Analogous', 45, 54, 70, 'Authority needs about 6 weeks for the safety approval'),
        w135: E('Intuitive', 45, 60, 75, 'Talks with five possible sponsors'),
        w141: E('Analogous', 10, 12, 15, 'Agency briefing, two design rounds'),
        w142: E('Analogous', 40, 47, 55, 'Invitation, two reminders, intranet posts'),
        w143: E('Analytical', 45, 54, 60, '400 guests, about 8 registrations handled per day', 400, 8),
        w151: E('Analytical', 4, 5, 7, '40 stands and tents, a crew of four sets up about 8 per day', 40, 8),
        w152: E('Intuitive', 1, 1, 1, 'The festival day itself'),
        w153: E('Analytical', 2, 3, 4, '40 stands and tents, about 15 taken down per day', 40, 15),
        w161: E('Analogous', 10, 12, 14, 'Online feedback survey open for 10 days'),
        w162: E('Intuitive', 8, 12, 18, 'Report starts while the survey is still open'),
        w163: E('Analytical', 12, 17, 24, 'About 60 invoices, 4 checked and paid per day', 60, 4),
      },
    },
  });
})();
