/* Framework section 3.4: stakeholder analysis (six steps, stakeholder table and chart, influence grid, measures). */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const GROUPS = ['Project organisation', 'Client', 'Internal unit', 'Supplier', 'Competitor', 'Authority', 'Other environment'];
  const NOGROUP = 'Not grouped yet';
  const LEVELS = ['Hardly', 'Slightly', 'Moderately', 'Strongly', 'Very strongly'];
  const ATTITUDES = ['Supportive', 'Neutral', 'Critical'];
  const STATUS = ['Open', 'In progress', 'Done'];
  const W = 1000;
  const PAD = 16;

  // ---------- helpers ----------
  const has = (v) => !U.isEmpty(v);
  const lvl = (v) => {
    const n = Math.round(Number(v));
    return n >= 1 && n <= 5 ? n : 0;
  };

  /** Need for action: High when critical and strongly affected or influential; Medium when critical or influential. */
  function needFor(r) {
    const att = r.attitude || '';
    const inf = lvl(r.influence);
    const aff = lvl(r.affected);
    if (!att && !inf && !aff) return '';
    if (att === 'Critical' && (inf >= 4 || aff >= 4)) return 'High';
    if (att === 'Critical' || inf >= 4) return 'Medium';
    return 'Low';
  }

  const named = (q) => q.rows('stakeholders').filter((r) => has(r.name));
  const measureRows = (q) => q.rows('stakeholderMeasures').filter((r) => has(r.stakeholder) || has(r.measure) || has(r.description));
  function stakeName(q, r) {
    return (r && (r.name || q.label(r, 'name'))) || 'Unnamed';
  }

  function attColor(att, pal) {
    if (att === 'Critical') return pal.crit;
    if (att === 'Supportive') return pal.good;
    if (att === 'Neutral') return pal.muted;
    return null;
  }

  function chipStyle(r, pal) {
    if (r.attitude === 'Critical') return { fill: pal.critSoft, stroke: pal.crit, sw: needFor(r) === 'High' ? 2.4 : 1.2, badge: true };
    if (r.attitude === 'Supportive') return { fill: pal.goodSoft, stroke: pal.good, sw: 1.2 };
    if (r.attitude === 'Neutral') return { fill: pal.box, stroke: pal.boxLine, sw: 1.2 };
    return { fill: pal.bg, stroke: pal.boxLine, sw: 1.2, dash: '4 3' };
  }

  function dot(cx, cy, att, pal) {
    const c = attColor(att, pal);
    return c ? S.circle(cx, cy, 5, { fill: c }) : S.circle(cx, cy, 4.5, { fill: pal.bg, stroke: pal.muted, sw: 1.5 });
  }

  function badge(cx, cy, pal) {
    return S.circle(cx, cy, 7, { fill: pal.crit }) + S.text(cx, cy + 0.5, '!', { size: 11, weight: 700, fill: pal.bg, anchor: 'middle', v: 'middle' });
  }

  /** Legend row with custom swatches. items: [{label, sw, swatch(x, cy)}]. Returns {svg, h}. */
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
        cy += 20;
      }
      out += it.swatch(cx, cy + 7);
      out += S.text(cx + sw + 6, cy + 7, it.label, { size, fill: pal.ink2, v: 'middle' });
      cx += w;
    }
    return { svg: out, h: cy - y + 16 };
  }

  function chipSwatch(st, pal) {
    return (x, cy) => S.rect(x, cy - 7, 24, 14, { fill: st.fill, stroke: st.stroke, sw: st.sw, rx: 7, dash: st.dash });
  }

  // =====================================================================================
  // Graphic: the six steps in this file
  // =====================================================================================
  function chev(x, y, w, h, first, tip, o) {
    const r = S.round;
    const pts = first
      ? [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h]]
      : [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h], [x + tip, y + h / 2]];
    return S.path('M' + pts.map((p) => r(p[0]) + ',' + r(p[1])).join(' L') + ' Z', { fill: o.fill, stroke: o.stroke, sw: o.sw, join: 'round' });
  }
  function stepStyle(s, pal) {
    if (s === 'done') return { fill: pal.accent, stroke: pal.accent, sw: 1, ink: pal.accentInk };
    if (s === 'part') return { fill: pal.accentSoft, stroke: pal.accent, sw: 1.5, ink: pal.ink };
    return { fill: pal.box, stroke: pal.boxLine, sw: 1, ink: pal.ink };
  }

  function stepModel(q) {
    const st = named(q);
    const n = st.length;
    const grouped = st.filter((r) => has(r.group)).length;
    const assessed = st.filter((r) => has(r.attitude) && lvl(r.affected) && lvl(r.influence)).length;
    const crit = st.filter((r) => r.attitude === 'Critical').length;
    const ms = measureRows(q);
    const m = ms.length;
    const described = ms.filter((r) => has(r.description)).length;
    const withMeasure = ms.filter((r) => has(r.measure)).length;
    const complete = ms.filter((r) => has(r.responsible) && has(r.deadline)).length;
    const highOpen = st.filter((r) => needFor(r) === 'High' && !ms.some((x) => x.stakeholder === r._id && has(x.measure))).length;
    const state = (done, total) => (total > 0 && done >= total ? 'done' : done > 0 ? 'part' : 'none');
    return [
      { t: 'Collect the stakeholders', c: n ? n + ' named' : 'None named yet', s: n ? 'done' : 'none' },
      { t: 'Group them in a chart', c: n ? grouped + ' of ' + n + ' grouped' : 'Waits for step 1', s: state(grouped, n) },
      { t: 'Assess and mark', c: n ? assessed + ' of ' + n + ' assessed, ' + crit + ' critical' : 'Waits for step 1', s: state(assessed, n) },
      { t: 'Describe the relation', c: m ? described + ' of ' + m + ' lines described' : 'No lines yet', s: state(described, m) },
      { t: 'Derive measures', c: withMeasure ? withMeasure + ' measures' + (highOpen ? ', ' + highOpen + ' high need without one' : '') : 'No measures yet', s: withMeasure ? (highOpen ? 'part' : 'done') : 'none' },
      { t: 'Responsible and deadline', c: m ? complete + ' of ' + m + ' complete' : 'No measures yet', s: state(complete, m) },
    ];
  }

  function renderSteps(q, pal) {
    const steps = stepModel(q);
    const gap = 6;
    const tip = 12;
    const ch = 48;
    const cw = (W - 2 * PAD + 5 * (tip - gap)) / 6;
    const xs = steps.map((s, i) => PAD + i * (cw - tip + gap));
    let out = '';
    steps.forEach((s, i) => {
      const x = xs[i];
      const st = stepStyle(s.s, pal);
      out += chev(x, 0.5, cw, ch, i === 0, tip, st);
      const tx = x + (i ? tip + 6 : 10);
      const maxW = cw - (i ? tip + 6 : 10) - tip - 4;
      const tb = S.textBlock(tx, 0, i + 1 + '. ' + s.t, { size: 12, weight: 600, maxW, maxLines: 2, fill: st.ink });
      out += S.textBlock(tx, 0.5 + (ch - tb.h) / 2, i + 1 + '. ' + s.t, { size: 12, weight: 600, maxW, maxLines: 2, fill: st.ink }).svg;
      out += S.textBlock(x + (i ? tip : 2), ch + 8, s.c, { size: 11.5, maxW: cw - tip - (i ? tip : 2) - 2, maxLines: 2, fill: pal.ink2 }).svg;
    });
    const yb = ch + 44;
    const bracket = (xa, xb, label) =>
      S.path('M' + S.round(xa) + ',' + yb + ' V' + (yb + 6) + ' H' + S.round(xb) + ' V' + yb, { stroke: pal.axis, sw: 1.5 }) +
      S.text((xa + xb) / 2, yb + 12, label, { size: 11.5, weight: 600, fill: pal.ink2, anchor: 'middle' });
    out += bracket(xs[0] + 2, xs[2] + cw - tip, 'Steps 1 to 3: stakeholder table');
    out += bracket(xs[3] + tip, xs[5] + cw - 2, 'Steps 4 to 6: measures table (stakeholder tracking list)');
    const lg = legendRow(
      [
        { label: 'Done', sw: 20, swatch: (x, cy) => chev(x, cy - 6, 20, 12, true, 5, stepStyle('done', pal)) },
        { label: 'Started', sw: 20, swatch: (x, cy) => chev(x, cy - 6, 20, 12, true, 5, stepStyle('part', pal)) },
        { label: 'Not started', sw: 20, swatch: (x, cy) => chev(x, cy - 6, 20, 12, true, 5, stepStyle('none', pal)) },
      ],
      PAD,
      yb + 36,
      W - 2 * PAD,
      pal
    );
    out += lg.svg;
    return S.svg(W, yb + 36 + lg.h + 8, out, { pal, label: 'The six steps of the stakeholder analysis and how far this file has got' });
  }

  // =====================================================================================
  // Graphic: stakeholder chart (project in the centre, groups around it)
  // =====================================================================================
  function chartRows(q) {
    return q.rows('stakeholders').filter((r) => has(r.name) || q.isPlaceholder(r, 'name') || has(r.group));
  }

  function renderChart(q, pal) {
    const CW = 318;
    const R = 76;
    const HEAD = 30;
    const CH = 24;
    const CG = 6;
    const IP = 10;
    const innerW = CW - 2 * IP;
    const rows = chartRows(q);

    const panels = GROUPS.concat([NOGROUP])
      .map((g, gi) => {
        const list = rows.filter((r) => (g === NOGROUP ? !GROUPS.includes(r.group) : r.group === g));
        return { g, color: g === NOGROUP ? pal.muted : pal.series[gi], list };
      })
      .filter((p) => p.list.length);

    panels.forEach((p) => {
      let x = 0;
      let y = 0;
      p.chips = p.list.map((r) => {
        const st = chipStyle(r, pal);
        const ph = q.isPlaceholder(r, 'name') && !has(r.name);
        const extra = st.badge ? 18 : 0;
        const label = S.fit(stakeName(q, r), innerW - 20 - extra, 11.5, ph ? 400 : 500);
        const w = Math.min(innerW, S.measure(label, 11.5, ph ? 400 : 500) + 20 + extra);
        if (x > 0 && x + w > innerW) {
          x = 0;
          y += CH + CG;
        }
        const chip = { r, x, y, w, label, st, ph, extra };
        x += w + CG;
        return chip;
      });
      p.h = HEAD + y + CH + IP;
    });

    // Balance the panels over a left and a right column, keeping the group order.
    const cols = [[], []];
    const colH = [0, 0];
    const GAP = 14;
    panels.forEach((p) => {
      const c = colH[0] <= colH[1] ? 0 : 1;
      cols[c].push(p);
      colH[c] += (cols[c].length > 1 ? GAP : 0) + p.h;
    });
    const top = 8;
    const H = Math.max(colH[0], colH[1], 2 * R + 40);
    const cx = W / 2;
    const cy = top + H / 2;

    let spokes = '';
    let body = '';
    cols.forEach((list, c) => {
      let y = top + (H - colH[c]) / 2;
      const x = c === 0 ? PAD : W - PAD - CW;
      list.forEach((p) => {
        p.x = x;
        p.y = y;
        y += p.h + GAP;
        // spoke from the panel to the project
        const ax = c === 0 ? x + CW : x;
        const ay = p.y + p.h / 2;
        const ang = Math.atan2(ay - cy, ax - cx);
        spokes += S.line(ax, ay, cx + (R + 4) * Math.cos(ang), cy + (R + 4) * Math.sin(ang), { stroke: pal.axis, sw: 1.5 });
        spokes += S.circle(ax, ay, 4, { fill: p.color });
        // panel
        body += S.rect(x, p.y, CW, p.h, { fill: pal.bg, stroke: pal.line, rx: 8 });
        body += S.rect(x + IP, p.y + 10, 10, 10, { fill: p.color, rx: 2 });
        body += S.text(x + IP + 16, p.y + 15, p.g, { size: 12, weight: 600, fill: pal.ink, v: 'middle' });
        body += S.text(x + CW - IP, p.y + 15, String(p.list.length), { size: 11, fill: pal.muted, anchor: 'end', v: 'middle' });
        p.chips.forEach((k) => {
          const kx = x + IP + k.x;
          const ky = p.y + HEAD + k.y;
          body += S.rect(kx, ky, k.w, CH, { fill: k.st.fill, stroke: k.st.stroke, sw: k.st.sw, rx: 12, dash: k.st.dash });
          if (k.st.badge) body += badge(kx + 12, ky + CH / 2, pal);
          body += S.text(kx + 10 + k.extra, ky + CH / 2, k.label, { size: 11.5, weight: k.ph ? 400 : 500, italic: k.ph, fill: k.ph ? pal.muted : pal.ink, v: 'middle' });
        });
      });
    });

    // the project in the centre
    let centre = S.circle(cx, cy, R, { fill: pal.accent });
    const pname = q.f('meta.name');
    const nb = pname ? S.textBlock(0, 0, pname, { size: 11.5, maxW: 2 * R - 30, maxLines: 3 }) : { h: 0 };
    const blockH = 16 + (pname ? 4 + nb.h : 0);
    let ty = cy - blockH / 2;
    centre += S.text(cx, ty, 'Project', { size: 14, weight: 600, fill: pal.accentInk, anchor: 'middle' });
    if (pname) centre += S.textBlock(cx, ty + 20, pname, { size: 11.5, maxW: 2 * R - 30, maxLines: 3, anchor: 'middle', fill: pal.accentInk }).svg;

    const ly = top + H + 16;
    const lg = legendRow(
      [
        { label: 'Supportive', sw: 24, swatch: chipSwatch(chipStyle({ attitude: 'Supportive' }, pal), pal) },
        { label: 'Neutral', sw: 24, swatch: chipSwatch(chipStyle({ attitude: 'Neutral' }, pal), pal) },
        { label: 'Critical', sw: 24, swatch: (x, c) => chipSwatch(chipStyle({ attitude: 'Critical' }, pal), pal)(x, c) + badge(x + 7, c, pal) },
        { label: 'Critical with high need for action', sw: 24, swatch: (x, c) => chipSwatch(chipStyle({ attitude: 'Critical', influence: 5 }, pal), pal)(x, c) + badge(x + 7, c, pal) },
        { label: 'Not assessed yet', sw: 24, swatch: chipSwatch(chipStyle({}, pal), pal) },
      ],
      PAD,
      ly,
      W - 2 * PAD,
      pal
    );
    return S.svg(W, ly + lg.h + 8, spokes + body + centre + lg.svg, { pal, label: 'Stakeholder chart: the project in the centre, stakeholders grouped around it' });
  }

  // =====================================================================================
  // Graphic: influence and affectedness grid
  // =====================================================================================
  function renderGrid(q, pal) {
    const LW = 112;
    const x0 = PAD + LW;
    const x1 = W - PAD;
    const cw = (x1 - x0) / 5;
    const LINE = 18;
    const QL = 20;
    const all = q.rows('stakeholders').filter((r) => has(r.name) || lvl(r.affected) || lvl(r.influence));
    const placed = all.filter((r) => lvl(r.affected) && lvl(r.influence));
    const unrated = all.filter((r) => !(lvl(r.affected) && lvl(r.influence)));
    const cell = (inf, aff) => placed.filter((r) => lvl(r.influence) === inf && lvl(r.affected) === aff);

    const top = 26;
    const rowsY = {};
    let y = top;
    for (let inf = 5; inf >= 1; inf--) {
      let n = 0;
      for (let aff = 1; aff <= 5; aff++) n = Math.max(n, cell(inf, aff).length);
      const band = inf === 5 || inf === 3 ? QL : 0;
      const h = Math.max(38, 12 + n * LINE) + band;
      rowsY[inf] = { y, h, band };
      y += h;
    }
    const bottom = y;
    const colX = (aff) => x0 + (aff - 1) * cw;

    let out = S.text(PAD, 6, 'Influence on the project', { size: 12, weight: 600, fill: pal.ink2 });
    // quadrant fills
    for (let inf = 5; inf >= 1; inf--) {
      for (let aff = 1; aff <= 5; aff++) {
        const hiI = inf >= 4;
        const hiA = aff >= 4;
        const fill = hiI && hiA ? pal.accentSoft : hiI || hiA ? pal.box : pal.bg;
        out += S.rect(colX(aff), rowsY[inf].y, cw, rowsY[inf].h, { fill });
      }
    }
    // grid lines
    for (let aff = 2; aff <= 5; aff++) if (aff !== 4) out += S.line(colX(aff), top, colX(aff), bottom, { stroke: pal.grid, sw: 1 });
    for (let inf = 4; inf >= 1; inf--) if (inf !== 3) out += S.line(x0, rowsY[inf].y, x1, rowsY[inf].y, { stroke: pal.grid, sw: 1 });
    out += S.line(colX(4), top, colX(4), bottom, { stroke: pal.axis, sw: 1.5 });
    out += S.line(x0, rowsY[3].y, x1, rowsY[3].y, { stroke: pal.axis, sw: 1.5 });
    out += S.rect(x0, top, x1 - x0, bottom - top, { stroke: pal.axis, sw: 1 });
    // quadrant names
    const qn = (x, yy, t, strong) => S.text(x + 10, yy + 6, t, { size: 11, weight: 600, fill: strong ? pal.ink : pal.muted });
    out += qn(colX(1), rowsY[5].y, 'Keep satisfied');
    out += qn(colX(4), rowsY[5].y, 'Manage closely', true);
    out += qn(colX(1), rowsY[3].y, 'Monitor');
    out += qn(colX(4), rowsY[3].y, 'Keep informed');
    // axis labels
    for (let inf = 5; inf >= 1; inf--) {
      const r = rowsY[inf];
      out += S.text(x0 - 8, r.y + r.h / 2, inf + ' ' + LEVELS[inf - 1], { size: 11, fill: pal.ink2, anchor: 'end', v: 'middle' });
    }
    for (let aff = 1; aff <= 5; aff++) out += S.text(colX(aff) + cw / 2, bottom + 6, aff + ' ' + LEVELS[aff - 1], { size: 11, fill: pal.ink2, anchor: 'middle' });
    out += S.text(x0 + (x1 - x0) / 2, bottom + 26, 'How strongly the stakeholder is affected', { size: 12, weight: 600, fill: pal.ink2, anchor: 'middle' });
    // stakeholders
    for (let inf = 5; inf >= 1; inf--) {
      for (let aff = 1; aff <= 5; aff++) {
        cell(inf, aff).forEach((r, i) => {
          const cy = rowsY[inf].y + rowsY[inf].band + 6 + i * LINE + LINE / 2;
          out += dot(colX(aff) + 14, cy, r.attitude, pal);
          out += S.text(colX(aff) + 24, cy, S.fit(stakeName(q, r), cw - 32, 11.5), { size: 11.5, fill: pal.ink, v: 'middle' });
        });
      }
    }
    let ly = bottom + 50;
    const lg = legendRow(
      [
        { label: 'Supportive', sw: 10, swatch: (x, c) => dot(x + 5, c, 'Supportive', pal) },
        { label: 'Neutral', sw: 10, swatch: (x, c) => dot(x + 5, c, 'Neutral', pal) },
        { label: 'Critical', sw: 10, swatch: (x, c) => dot(x + 5, c, 'Critical', pal) },
        { label: 'Attitude not set', sw: 10, swatch: (x, c) => dot(x + 5, c, '', pal) },
      ],
      PAD,
      ly,
      W - 2 * PAD,
      pal
    );
    out += lg.svg;
    ly += lg.h + 6;
    let note = '';
    if (!placed.length) note = 'Rate how strongly each stakeholder is affected and how much influence they have to place them here.';
    if (unrated.length) note += (note ? ' ' : '') + 'Not rated yet: ' + unrated.map((r) => stakeName(q, r)).join(', ') + '.';
    if (note) {
      const tb = S.textBlock(PAD, ly, note, { size: 11.5, maxW: W - 2 * PAD, maxLines: 3, fill: pal.muted });
      out += tb.svg;
      ly += tb.h + 6;
    }
    return S.svg(W, ly + 6, out, { pal, label: 'Grid of influence against affectedness with every rated stakeholder' });
  }

  // =====================================================================================
  // Graphic: measures per stakeholder on a timeline
  // =====================================================================================
  function statusMark(cx, cy, status, pal) {
    if (status === 'Done') return S.circle(cx, cy, 6, { fill: pal.accent });
    if (status === 'In progress') return S.circle(cx, cy, 5.5, { fill: pal.accentSoft, stroke: pal.accent, sw: 1.5 });
    return S.circle(cx, cy, 5.5, { fill: pal.bg, stroke: pal.ink2, sw: 1.5 });
  }

  function timelineEmpty(q) {
    return measureRows(q).some((r) => U.isDate(r.deadline)) ? null : 'Add measures with a deadline to see them on a timeline.';
  }

  function renderTimeline(q, pal) {
    const LW = 200;
    const x0 = PAD + LW + 12;
    const x1 = W - PAD - 8;
    const LANE = 20;
    const AX = 24;
    const all = measureRows(q);
    const ms = all.filter((r) => U.isDate(r.deadline)).sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0));
    const pd = q.projectDates();
    const dates = ms.map((r) => r.deadline);
    let start = U.minDate(dates.concat(U.isDate(pd.start) ? [pd.start] : []));
    let end = U.maxDate(dates.concat(U.isDate(pd.end) ? [pd.end] : []));
    if (U.diffDays(start, end) < 28) {
      start = U.addDays(start, -14);
      end = U.addDays(end, 14);
    }
    const sc = S.timeScale(start, end, x0, x1);

    const order = q.rows('stakeholders').map((r) => r._id);
    const groups = [];
    order.forEach((id) => {
      const list = ms.filter((m) => m.stakeholder === id);
      if (list.length) groups.push({ label: stakeName(q, q.rows('stakeholders').find((r) => r._id === id)), list });
    });
    const orphans = ms.filter((m) => !order.includes(m.stakeholder));
    if (orphans.length) groups.push({ label: 'No stakeholder chosen', list: orphans, muted: true });

    let y = AX + 4;
    let body = '';
    groups.forEach((g) => {
      const lanes = [];
      const items = g.list.map((m) => {
        const cx = (sc.x(m.deadline) + sc.xEnd(m.deadline)) / 2;
        const label = S.fit(m.measure || 'Measure', 190, 11);
        const lw = S.measure(label, 11);
        const right = cx + 10 + lw <= x1 + 4;
        const a = right ? cx - 7 : cx - 10 - lw;
        const b = right ? cx + 10 + lw : cx + 7;
        let lane = lanes.findIndex((end) => end + 8 < a);
        if (lane < 0) {
          lane = lanes.length;
          lanes.push(b);
        } else lanes[lane] = b;
        return { m, cx, label, right, lane };
      });
      const h = lanes.length * LANE + 8;
      body += S.text(PAD, y + h / 2, S.fit(g.label, LW, 12), { size: 12, fill: g.muted ? pal.muted : pal.ink, italic: g.muted, v: 'middle' });
      items.forEach((it) => {
        const cy = y + 4 + it.lane * LANE + LANE / 2;
        body += statusMark(it.cx, cy, it.m.status, pal);
        body += S.text(it.right ? it.cx + 10 : it.cx - 10, cy, it.label, { size: 11, fill: pal.ink2, anchor: it.right ? 'start' : 'end', v: 'middle' });
      });
      y += h;
      body += S.line(PAD, y, x1, y, { stroke: pal.grid, sw: 1 });
    });
    const bottom = y;
    let out = S.timeAxis(sc, 0, AX, bottom, pal) + body;
    const lg = legendRow(
      STATUS.slice().reverse().map((s) => ({ label: s, sw: 12, swatch: (x, c) => statusMark(x + 6, c, s, pal) })),
      PAD,
      bottom + 12,
      W - 2 * PAD,
      pal
    );
    out += lg.svg;
    let h = bottom + 12 + lg.h;
    const noDate = all.length - ms.length;
    if (noDate) {
      out += S.text(PAD, h + 4, noDate + (noDate === 1 ? ' measure has' : ' measures have') + ' no deadline yet and are not shown.', { size: 11.5, fill: pal.muted });
      h += 22;
    }
    return S.svg(W, h + 8, out, { pal, label: 'Timeline of measure deadlines per stakeholder, coloured by status' });
  }

  // =====================================================================================
  // Checks
  // =====================================================================================
  function runChecks(q) {
    const st = named(q);
    const ms = measureRows(q);
    const out = [];
    const high = st.filter((r) => needFor(r) === 'High');
    const missing = high.filter((r) => !ms.some((m) => m.stakeholder === r._id && has(m.measure)));
    if (!high.length) out.push({ ok: null, text: 'No stakeholder has a high need for action yet.' });
    else if (missing.length) out.push({ ok: false, text: 'High need for action without a measure: ' + missing.map((r) => r.name).join(', ') + '.' });
    else out.push({ ok: true, text: 'All ' + high.length + ' stakeholders with a high need for action have at least one measure.' });

    if (!ms.length) out.push({ ok: null, text: 'No measures yet.' });
    else {
      const bad = ms.filter((m) => !has(m.responsible) || !has(m.deadline));
      out.push(
        bad.length
          ? { ok: false, text: bad.length + ' of ' + ms.length + ' measures lack a responsible person or a deadline.' }
          : { ok: true, text: 'Every measure has a responsible person and a deadline.' }
      );
      const pd = q.projectDates();
      const dated = ms.filter((m) => U.isDate(m.deadline));
      if (!U.isDate(pd.start) || !U.isDate(pd.end)) out.push({ ok: null, text: 'Add the project start and end dates to check the deadlines.' });
      else if (dated.length) {
        const outside = dated.filter((m) => m.deadline < pd.start || m.deadline > pd.end);
        out.push(
          outside.length
            ? { ok: false, text: outside.length + ' deadlines lie outside the project (' + q.date(pd.start) + ' to ' + q.date(pd.end) + ').' }
            : { ok: true, text: 'All deadlines lie inside the project (' + q.date(pd.start) + ' to ' + q.date(pd.end) + ').' }
        );
      }
      const linked = ms.filter((m) => has(m.wbs)).length;
      out.push({
        ok: linked === ms.length ? true : linked ? null : false,
        text: linked === ms.length ? 'Every measure is linked to a WBS line.' : linked + ' of ' + ms.length + ' measures are linked to a WBS line. Link the others where a work package fits.',
      });
    }
    const unassessed = st.filter((r) => !has(r.attitude) || !lvl(r.affected) || !lvl(r.influence));
    if (st.length) out.push({ ok: unassessed.length ? null : true, text: unassessed.length ? unassessed.length + ' stakeholders are not fully assessed yet.' : 'Every stakeholder is rated and has an attitude.' });
    return out;
  }

  // =====================================================================================
  // Section
  // =====================================================================================
  PM.section({
    id: 'stakeholders',
    part: 'initiation',
    order: 34,
    num: '3.4',
    title: 'Stakeholder analysis',
    navTitle: 'Stakeholders',
    step: 'I3',
    slides: '38–44',
    landscape: true,
    intro: 'Find everyone who is affected by the project or can influence it, judge where action is needed, and agree a measure, an owner and a deadline for each.',
    blocks: [
      {
        type: 'callout',
        kind: 'rule',
        title: 'Success = Quality × Acceptance.',
        text: 'A good result still fails when the people around the project reject it. Stakeholder management means managing expectations: know who is affected and who has influence, plan what you do for each group, and build the understanding that prevents conflict. It is also the base for project marketing.',
      },
      {
        type: 'guide',
        title: 'The six steps',
        ordered: true,
        items: [
          'Collect everyone who is affected by the project or holds an opinion about it. Inside: owner, manager, team. Outside: client, management, works council, suppliers, authorities, press, competitors. Start from the people context of the six fields. (Stakeholder table)',
          'Sort them into groups and draw them around the project in the stakeholder chart. (Stakeholder table, column Group)',
          'Rate how strongly each one is affected and how much influence they have, and mark them supportive, neutral or critical. The need for action follows from that. (Stakeholder table)',
          'For each one that needs attention, describe the relation: what each side expects, what they can offer, where conflicts lie. (Measures table)',
          'Derive a strategy and concrete measures, linked to a work package where one fits. (Measures table)',
          'Give every measure one responsible person and a deadline, and track its status. (Measures table)',
        ],
      },
      {
        type: 'graphic',
        title: 'The six steps in this file',
        caption: 'How far each step is filled in. Steps 1 to 3 live in the stakeholder table, steps 4 to 6 in the measures table.',
        render: renderSteps,
      },
      { type: 'h', text: 'Steps 1 to 3: collect, group and assess' },
      {
        type: 'table',
        key: 'stakeholders',
        title: 'Stakeholder table',
        hint: 'One line per person, group or institution. Need for action is calculated: high when a critical stakeholder is strongly affected or very influential, medium when they are critical or influential.',
        numbered: true,
        addLabel: 'Add stakeholder',
        columns: [
          { key: 'name', label: 'Stakeholder', kind: 'text', w: 20, placeholder: 'Person, group or institution' },
          { key: 'group', label: 'Group', kind: 'select', options: GROUPS, w: 17 },
          { key: 'side', label: 'Internal / external', kind: 'select', options: ['Internal', 'External'], w: 11 },
          { key: 'affected', label: 'How affected', kind: 'rating', options: LEVELS, w: 50, sub: '1 hardly to 5 very strongly' },
          { key: 'influence', label: 'Influence', kind: 'rating', options: LEVELS, w: 50, sub: 'on the project' },
          { key: 'attitude', label: 'Attitude', kind: 'select', options: ATTITUDES, w: 10 },
          { key: 'need', label: 'Need for action', kind: 'text', w: 8, compute: (r) => needFor(r) },
          { key: 'expectations', label: 'Expectations', kind: 'textarea', w: 26, placeholder: 'What they expect from the project' },
        ],
        defaults: [
          { group: 'Client', _ph: { name: 'Client or sponsor', expectations: 'What they expect from the result' } },
          { group: 'Internal unit', side: 'Internal', _ph: { name: 'Management board' } },
          { group: 'Internal unit', side: 'Internal', _ph: { name: 'Works council' } },
          { group: 'Supplier', side: 'External', _ph: { name: 'Main supplier' } },
          { group: 'Other environment', side: 'External', _ph: { name: 'Local press' } },
        ],
      },
      {
        type: 'graphic',
        title: 'Stakeholder chart',
        caption: 'Step 2 and 3: the project in the centre, the stakeholders grouped around it. A red "!" marks critical stakeholders; a thick outline means a high need for action.',
        empty: (q) => (chartRows(q).length ? null : 'Add stakeholders to the table to see the chart.'),
        render: renderChart,
      },
      {
        type: 'graphic',
        title: 'Influence and affectedness',
        caption: 'Step 3: each stakeholder placed by how strongly they are affected and how much influence they have. Those in the top right need the closest attention, especially when critical.',
        render: renderGrid,
      },
      { type: 'h', text: 'Steps 4 to 6: relation, measures, responsible and deadline' },
      {
        type: 'table',
        key: 'stakeholderMeasures',
        title: 'Measures table (stakeholder tracking list)',
        hint: 'One line per measure; a stakeholder can have several. Link each measure to the work package it belongs to.',
        numbered: true,
        addLabel: 'Add measure',
        columns: [
          { key: 'stakeholder', label: 'Stakeholder', kind: 'select', w: 22, options: (q) => q.rows('stakeholders').map((r) => ({ value: r._id, label: r.name || q.label(r, 'name') || '…' })) },
          { key: 'att', label: 'Attitude', hidden: true, compute: (r, q) => (r.stakeholder && (q.rows('stakeholders').find((s) => s._id === r.stakeholder) || {}).attitude) || '' },
          { key: 'relation', label: 'Relation', kind: 'select', options: ATTITUDES, w: 12, placeholder: (r) => (r && r.att) || '—' },
          { key: 'description', label: 'Description of relation', kind: 'textarea', w: 26, placeholder: 'Mutual expectations, potential, conflicts' },
          { key: 'measure', label: 'Measure', kind: 'textarea', w: 24, placeholder: 'What we will do' },
          { key: 'wbs', label: 'WBS', kind: 'wbs', w: 20 },
          { key: 'responsible', label: 'Responsible', kind: 'person', w: 16 },
          { key: 'deadline', label: 'Deadline', kind: 'date' },
          { key: 'status', label: 'Status', kind: 'select', options: STATUS, w: 10 },
        ],
        defaults: [{ _ph: { measure: 'e.g. Brief them before the kick-off' } }, {}, {}],
      },
      {
        type: 'graphic',
        title: 'Measures per stakeholder',
        caption: 'Step 6: every measure at its deadline, one line per stakeholder, filled when done.',
        empty: timelineEmpty,
        render: renderTimeline,
      },
      { type: 'checks', title: 'Checks', run: runChecks },
    ],
  });

  PM.metric('stakeholders', { label: 'Stakeholders', kind: 'number', section: 'stakeholders', fn: (q) => named(q).length || null });
  PM.metric('criticalStakeholders', {
    label: 'Critical stakeholders',
    kind: 'number',
    section: 'stakeholders',
    fn: (q) => {
      const st = named(q);
      return st.length ? st.filter((r) => r.attitude === 'Critical').length : null;
    },
  });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  const SH = (id, name, group, side, affected, influence, attitude, expectations) => ({ _id: id, name, group, side, affected, influence, attitude, expectations });
  const MS = (id, stakeholder, relation, description, measure, wbs, responsible, deadline, status) => ({ _id: id, stakeholder, relation, description, measure, wbs, responsible, deadline, status });

  PM.example({
    t: {
      stakeholders: [
        SH('s1', 'Management board', 'Client', 'Internal', 3, 5, 'Supportive', 'A visible thank-you to staff that strengthens the employer brand; budget kept; no incidents.'),
        SH('s2', 'Employees', 'Client', 'Internal', 5, 2, 'Supportive', 'A relaxed day with colleagues, easy registration, good food.'),
        SH('s3', 'Works council', 'Internal unit', 'Internal', 3, 4, 'Critical', 'Voluntary helper shifts, time off in lieu for Saturday work, a fair rota.'),
        SH('s4', 'HR department', 'Internal unit', 'Internal', 3, 3, 'Supportive', 'Festival fits the employer-branding campaign; data protection for registrations.'),
        SH('s5', 'Facility Management', 'Internal unit', 'Internal', 4, 3, 'Neutral', 'A clear setup plan; no extra work in the week of the office move.'),
        SH('s6', 'IT (ERP rollout)', 'Internal unit', 'Internal', 2, 3, 'Critical', 'ERP go-live in June needs the same staff; no helpers from IT in that week.'),
        SH('s7', 'Catering company', 'Supplier', 'External', 4, 4, 'Neutral', 'Final guest numbers early, a fixed menu, access for delivery vans.'),
        SH('s8', 'Venue owner', 'Supplier', 'External', 3, 4, 'Neutral', 'Venue handed back clean and undamaged, insurance proof.'),
        SH('s9', 'Event-technology supplier', 'Supplier', 'External', 3, 3, 'Supportive', 'Clear stage plan and power supply, setup time on Friday.'),
        SH('s10', 'Insurance company', 'Supplier', 'External', 2, 3, 'Neutral', 'Safety concept and guest numbers before the policy is issued.'),
        SH('s11', 'City authority', 'Authority', 'External', 2, 5, 'Critical', 'Complete permit application with safety concept; noise limits after 22:00.'),
        SH('s12', 'Neighbours of the venue', 'Other environment', 'External', 4, 2, 'Critical', 'Little noise and no parked cars in their street on a Saturday.'),
        SH('s13', 'Employees’ families', 'Other environment', 'External', 4, 1, 'Supportive', 'A programme for children, accessible paths, shade.'),
        SH('s14', 'Sponsors', 'Other environment', 'External', 2, 3, 'Supportive', 'Visible logo placement and a mention in the opening speech.'),
        SH('s15', 'Local press', 'Other environment', 'External', 1, 3, 'Neutral', 'A story and photos; they report on complaints too.'),
      ],
      stakeholderMeasures: [
        MS('sm1', 's2', 'Supportive', 'Staff want a say in the programme; good turnout depends on it.', 'Run the employee survey on festival wishes', 'w121', 'p3', '2026-02-27', 'Done'),
        MS('sm2', 's3', 'Critical', 'Wants voluntary shifts and time off in lieu; could block the helper rota.', 'Agree helper rota and time off in lieu with the works council', 'w112', 'p1', '2026-03-13', 'Done'),
        MS('sm3', 's3', 'Critical', 'Wants to be heard before the concept is fixed.', 'Present the festival concept at the works council meeting', 'w123', 'p2', '2026-03-25', 'Done'),
        MS('sm4', 's6', 'Critical', 'ERP go-live in June ties up the same people the festival needs as helpers.', 'Agree with the IT lead which staff are free in June; plan helpers outside IT', 'w112', 'p2', '2026-04-10', 'Done'),
        MS('sm5', 's11', 'Critical', 'Grants the event permit; noise limits could cut the evening programme.', 'Submit the permit application with safety and noise concept', 'w134', 'p4', '2026-05-15', 'Done'),
        MS('sm6', 's11', 'Critical', 'Inspects the venue before the permit is final.', 'Walk through the venue with the authority', 'w134', 'p4', '2026-06-05', 'Done'),
        MS('sm7', 's12', 'Critical', 'Expect noise and parking problems; may complain to the city.', 'Send a letter to the neighbours with times, a contact and an invitation', 'w142', 'p5', '2026-06-05', 'Done'),
        MS('sm8', 's7', 'Neutral', 'Needs reliable numbers to plan staff and food.', 'Send final guest numbers two weeks before the festival', 'w143', 'p5', '2026-06-12', 'Done'),
        MS('sm9', 's1', 'Supportive', 'Expects a visible employer-branding effect and a short report.', 'Invite board members to open the festival; send a summary afterwards', 'w152', 'p2', '2026-06-19', 'In progress'),
        MS('sm10', 's15', 'Neutral', 'Could report positively or pick up complaints.', 'Send a press release and invite a photographer', 'w142', 'p8', '2026-06-22', 'Open'),
      ],
    },
  });
})();
