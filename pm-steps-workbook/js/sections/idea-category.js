/* Framework 3.1 (assess the idea, step I1) and 3.2 (categorise the project, step I2). */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const W = 1000; // width of every drawing in this file
  const PAD = 16;

  /** Number from a cell, or null when empty or not a number. */
  const numOf = (v) => {
    const x = U.num(v);
    return x == null || !isFinite(x) ? null : x;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // =====================================================================================
  // 3.1 Assess the idea
  // =====================================================================================
  const RATINGS = ['Yes', 'Partly', 'No', 'Unclear'];
  const GROUPS = [
    { id: 'A', title: 'A. Strategy fit' },
    { id: 'B', title: 'B. Technical feasibility' },
    { id: 'C', title: 'C. Economic viability' },
  ];
  const CHECKS = [
    { _id: 'a1', group: 'A', check: 'A. Strategy fit', short: 'Closes a strategy gap', question: 'Does the project close a gap between our objectives and the company strategy?' },
    { _id: 'a2', group: 'A', check: 'A. Strategy fit', short: 'Improves the portfolio', question: 'Does it make our project portfolio better as a whole?' },
    { _id: 'b1', group: 'B', check: 'B. Technical feasibility', short: 'Objectives manageable', question: 'Are the objectives manageable with our skills, tools and capacity?' },
    { _id: 'b2', group: 'B', check: 'B. Technical feasibility', short: 'Project type clear', question: 'Is it clear whether this is a concept project or an implementation project?' },
    { _id: 'b3', group: 'B', check: 'B. Technical feasibility', short: 'No study needed', question: 'Can we plan it without a feasibility study first?' },
    { _id: 'c1', group: 'C', check: 'C. Economic viability', short: 'Business case positive', question: 'Do the benefits outweigh the costs over the whole life cycle (business case)?' },
    { _id: 'c2', group: 'C', check: 'C. Economic viability', short: 'Uncertainty acceptable', question: 'Are the uncertainties in costs and benefits known and acceptable?' },
    { _id: 'c3', group: 'C', check: 'C. Economic viability', short: 'Best alternative', question: 'Is this the best of the alternatives we compared, including doing nothing?' },
  ];

  /** Colours and label for an assessment (1 Yes, 2 Partly, 3 No, 4 Unclear); null when not rated. */
  function ratingStyle(v, pal) {
    switch (Number(v)) {
      case 1: return { label: 'Yes', fill: pal.goodSoft, stroke: pal.good, pill: pal.good };
      case 2: return { label: 'Partly', fill: pal.warnSoft, stroke: pal.warn, pill: pal.warn };
      case 3: return { label: 'No', fill: pal.critSoft, stroke: pal.crit, pill: pal.crit };
      case 4: return { label: 'Unclear', fill: pal.box, stroke: pal.muted, pill: pal.muted };
      default: return null;
    }
  }

  /** "2 yes, 1 partly, 1 open" for the questions of one check. */
  function countText(list) {
    if (!list.some((r) => Number(r.assessment))) return 'Not assessed yet';
    const parts = [];
    RATINGS.forEach((lab, i) => {
      const n = list.filter((r) => Number(r.assessment) === i + 1).length;
      if (n) parts.push(n + ' ' + lab.toLowerCase());
    });
    const open = list.filter((r) => !Number(r.assessment)).length;
    if (open) parts.push(open + ' open');
    return parts.join(', ');
  }

  /** Business case sums per period, totals and the running net. */
  function bcModel(q) {
    let cost = 0;
    let benefit = 0;
    let any = false;
    const byP = new Map();
    for (const r of q.rows('ideaBusinessCase')) {
      const a = numOf(r.amount);
      if (a == null || (r.type !== 'Cost' && r.type !== 'Benefit')) continue;
      any = true;
      const p = String(r.period || '').trim() || 'No period';
      if (!byP.has(p)) byP.set(p, { label: p, cost: 0, benefit: 0 });
      const g = byP.get(p);
      if (r.type === 'Cost') {
        g.cost += a;
        cost += a;
      } else {
        g.benefit += a;
        benefit += a;
      }
    }
    const periods = [...byP.values()].sort(
      (a, b) => (a.label === 'No period') - (b.label === 'No period') || a.label.localeCompare(b.label, 'en', { numeric: true })
    );
    let cum = 0;
    periods.forEach((p) => {
      cum += p.benefit - p.cost;
      p.cum = cum;
    });
    // break-even: first period from which the running net stays at or above zero
    let be = null;
    for (let i = periods.length - 1; i >= 0 && periods[i].cum >= 0; i -= 1) be = periods[i].label;
    return { any, cost, benefit, net: benefit - cost, ratio: cost > 0 ? benefit / cost : null, periods, breakEven: be };
  }

  const signedCompact = (v, cur) => (v < 0 ? '−' : v > 0 ? '+' : '') + cur + ' ' + S.compact(Math.abs(v));

  // ---------- graphic: business case ----------
  function renderBusinessCase(q, pal) {
    const m = bcModel(q);
    const P = m.periods;
    const n = P.length;
    const cur = q.cur();
    const x0 = 100;
    const x1 = W - PAD;
    const top = 52;
    const plotH = 240;
    const bottom = top + plotH;
    const cCost = pal.series[0];
    const cBen = pal.series[1];

    let lo = Math.min(0, ...P.map((p) => Math.min(p.cum, p.cost, p.benefit)));
    let hi = Math.max(0, ...P.map((p) => Math.max(p.cum, p.cost, p.benefit)));
    if (hi - lo <= 0) hi = lo + 1;
    const t = S.niceTicks(hi - lo, 6);
    const step = t.ticks.length > 1 ? t.ticks[1] - t.ticks[0] : 1;
    lo = Math.floor(lo / step - 1e-9) * step;
    hi = Math.ceil(hi / step - 1e-9) * step;
    if (hi - lo <= 0) hi = lo + step;
    const y = (v) => top + ((hi - v) / (hi - lo)) * plotH;

    let body = '';
    // header: legend left, result right
    const lg = S.legend(
      [
        { label: 'Cost', color: cCost },
        { label: 'Benefit', color: cBen },
        { label: 'Cumulative net', color: pal.strong, shape: 'line' },
      ],
      PAD, 10, pal, { maxW: 420 }
    );
    body += lg.svg;
    let summary = 'Net ' + q.money(m.net);
    if (m.ratio != null) summary += '  ·  Benefit / cost ' + U.fmtNum(m.ratio, 2);
    summary += '  ·  ' + (m.breakEven ? 'Break-even: ' + m.breakEven : 'No break-even in these periods');
    body += S.text(x1, 10, S.fit(summary, W - PAD * 2 - lg.w - 30, 12.5, 600), { size: 12.5, weight: 600, fill: pal.ink, anchor: 'end' });

    // grid and value axis
    for (let v = lo; v <= hi + step / 2; v += step) {
      const vv = Math.round(v * 1e6) / 1e6;
      const yy = y(vv);
      if (Math.abs(vv) > 1e-9) body += S.line(x0, yy, x1, yy, { stroke: pal.grid, sw: 1 });
      body += S.text(x0 - 8, yy, (vv < 0 ? '−' : '') + cur + ' ' + S.compact(Math.abs(vv)), { size: 11, fill: pal.muted, anchor: 'end', v: 'middle' });
    }

    const gw = (x1 - x0) / n;
    const bw = clamp((gw - 16) / 2 - 1, 4, 24);
    const cx = (i) => x0 + gw * (i + 0.5);
    const barSvg = (x, v, fill) => {
      if (!v) return '';
      if (v > 0) return S.bar(x, y(v), bw, y(0) - y(v), { fill });
      return S.rect(x, y(0), bw, y(v) - y(0), { fill });
    };
    const barLabel = (x, v) => {
      if (!v || gw < 90) return '';
      const yy = v > 0 ? y(v) - 4 : y(v) + 4;
      return S.text(x + bw / 2, yy, S.compact(v), { size: 10.5, fill: pal.ink2, anchor: 'middle', v: v > 0 ? 'base' : 'top' });
    };
    P.forEach((p, i) => {
      const xc = cx(i) - 1 - bw;
      const xb = cx(i) + 1;
      body += barSvg(xc, p.cost, cCost) + barSvg(xb, p.benefit, cBen);
      body += barLabel(xc, p.cost) + barLabel(xb, p.benefit);
    });
    // zero line on top of the bars
    body += S.line(x0, y(0), x1, y(0), { stroke: pal.ink2, sw: 1.2 });

    // cumulative net line
    const pts = P.map((p, i) => [cx(i), y(p.cum)]);
    if (pts.length > 1) body += S.polyline(pts, { stroke: pal.strong, sw: 2 });
    pts.forEach((pt) => (body += S.circle(pt[0], pt[1], 4.5, { fill: pal.strong, stroke: pal.bg, sw: 2 })));

    // period labels and running net under the axis
    const widest = Math.max(...P.map((p) => S.measure(p.label, 12, 600)));
    const every = Math.max(1, Math.ceil((Math.min(widest, 110) + 10) / gw));
    body += S.text(x0 - 8, bottom + 30, 'Running net', { size: 10.5, fill: pal.muted, anchor: 'end', v: 'top' });
    P.forEach((p, i) => {
      const last = i === n - 1;
      // labels are counted back from the last period, so the last one always shows
      if ((n - 1 - i) % every === 0) {
        body += S.text(cx(i), bottom + 10, S.fit(p.label, Math.max(gw * every - 8, 30), 12, 600), { size: 12, weight: 600, fill: pal.ink, anchor: 'middle' });
      }
      const nt = { size: 11, fill: p.cum < 0 ? pal.crit : pal.ink2, anchor: 'middle' };
      if (gw >= 64) body += S.text(cx(i), bottom + 30, S.fit(signedCompact(p.cum, cur), gw - 6, 11), nt);
      else if (last) body += S.text(x1, bottom + 30, signedCompact(p.cum, cur), Object.assign(nt, { anchor: 'end' }));
    });

    return S.svg(W, bottom + 50, body, { pal, label: 'Business case: costs and benefits per period with the running net' });
  }

  // ---------- graphic: idea assessment ----------
  function decisionStyle(dec, pal) {
    switch (dec) {
      case 'Implement': return { fill: pal.goodSoft, stroke: pal.good };
      case 'Reject': return { fill: pal.critSoft, stroke: pal.crit };
      case 'Postpone': return { fill: pal.warnSoft, stroke: pal.warn };
      case 'Feasibility study first': return { fill: pal.accentSoft, stroke: pal.accent };
      default: return null;
    }
  }

  function checkCard(x, y, w, r, pal) {
    const st = ratingStyle(r.assessment, pal);
    const pillLabel = st ? st.label : 'Open';
    const pillW = S.measure(pillLabel, 11, 600) + 16;
    const ans = String(r.answer || '').trim();
    const tb = S.textBlock(x + 12, y + 34, ans || 'No answer yet', { size: 11, maxW: w - 22, maxLines: 4, lineH: 1.3, fill: ans ? pal.ink2 : pal.muted, italic: !ans });
    const h = 34 + tb.h + 10;
    let out = S.rect(x, y, w, h, { fill: st ? st.fill : pal.bg, stroke: st ? st.stroke : pal.line, dash: st ? null : '4 3', rx: 6 });
    out += S.text(x + 12, y + 11, S.fit(r.short, w - 30 - pillW, 12, 600), { size: 12, weight: 600, fill: pal.ink });
    const px = x + w - 10 - pillW;
    out += S.rect(px, y + 8, pillW, 18, { fill: st ? st.pill : 'none', stroke: st ? null : pal.muted, rx: 9 });
    out += S.text(px + pillW / 2, y + 17, pillLabel, { size: 11, weight: 600, fill: st ? pal.accentInk : pal.muted, anchor: 'middle', v: 'middle' });
    return { svg: out + tb.svg, h };
  }

  function renderAssessment(q, pal) {
    const gap = 14;
    const colW = (W - PAD * 2 - gap * 3) / 4;
    const hH = 46;
    const y0 = PAD + hH + 12;
    const rows = q.rows('ideaChecks');
    let body = '';
    let maxY = y0;

    GROUPS.forEach((g, i) => {
      const x = PAD + i * (colW + gap);
      const list = rows.filter((r) => r.group === g.id);
      body += S.chevron(x, PAD, colW + 8, hH, { first: i === 0, fill: pal.box, stroke: pal.boxLine });
      const tx = x + (i === 0 ? 12 : 22);
      body += S.text(tx, PAD + 8, S.fit(g.title, colW - 44, 12.5, 600), { size: 12.5, weight: 600, fill: pal.ink });
      body += S.text(tx, PAD + 26, S.fit(countText(list), colW - 44, 11), { size: 11, fill: pal.ink2 });
      let y = y0;
      list.forEach((r) => {
        const c = checkCard(x, y, colW, r, pal);
        body += c.svg;
        y += c.h + 8;
      });
      maxY = Math.max(maxY, y - 8);
    });

    // decision column
    const x = PAD + 3 * (colW + gap);
    const dec = q.f('idea.decision');
    const date = q.f('idea.decisionDate');
    body += S.chevron(x, PAD, colW, hH, { fill: pal.accent });
    body += S.text(x + 22, PAD + 8, 'Decision', { size: 12.5, weight: 600, fill: pal.accentInk });
    body += S.text(x + 22, PAD + 26, date ? U.fmtDate(date) : 'Not decided yet', { size: 11, fill: pal.accentInk });

    const st = decisionStyle(dec, pal);
    const iw = colW - 24;
    let inner = '';
    let cy = y0 + 12;
    inner += S.text(x + 12, cy, S.fit(dec || 'Decision open', iw, 15, 600), { size: 15, weight: 600, fill: dec ? pal.ink : pal.muted, italic: !dec });
    cy += 24;
    const by = q.f('idea.decidedBy');
    if (by) {
      const t = S.textBlock(x + 12, cy, 'By ' + by, { size: 11, maxW: iw, maxLines: 2, fill: pal.ink2 });
      inner += t.svg;
      cy += t.h + 4;
    }
    const cond = String(q.f('idea.conditions') || '').trim();
    inner += S.line(x + 12, cy + 4, x + colW - 12, cy + 4, { stroke: st ? st.stroke : pal.line, sw: 1, opacity: 0.5 });
    cy += 12;
    inner += S.text(x + 12, cy, 'Conditions', { size: 11, weight: 600, fill: pal.ink });
    cy += 16;
    const ct = S.textBlock(x + 12, cy, cond || 'None recorded', { size: 11, maxW: iw, maxLines: 5, lineH: 1.3, fill: cond ? pal.ink2 : pal.muted, italic: !cond });
    inner += ct.svg;
    cy += ct.h + 6;
    const m = bcModel(q);
    inner += S.line(x + 12, cy + 4, x + colW - 12, cy + 4, { stroke: st ? st.stroke : pal.line, sw: 1, opacity: 0.5 });
    cy += 12;
    inner += S.text(x + 12, cy, 'Business case', { size: 11, weight: 600, fill: pal.ink });
    cy += 16;
    const bcText = m.any ? 'Net ' + q.money(m.net) + (m.ratio != null ? ', ratio ' + U.fmtNum(m.ratio, 2) : '') : 'No amounts yet';
    inner += S.text(x + 12, cy, S.fit(bcText, iw, 11), { size: 11, fill: m.any ? pal.ink2 : pal.muted, italic: !m.any });
    cy += 14;
    const decH = Math.max(cy + 12 - y0, maxY - y0);
    body += S.rect(x, y0, colW, decH, { fill: st ? st.fill : pal.bg, stroke: st ? st.stroke : pal.line, dash: st ? null : '4 3', rx: 6, sw: st ? 1.5 : 1 });
    body += inner;
    maxY = Math.max(maxY, y0 + decH);

    return S.svg(W, maxY + PAD, body, { pal, label: 'Idea assessment: three checks and the decision' });
  }

  // ---------- fields of 3.1 ----------
  [
    { key: 'idea.description', label: 'Rough idea', kind: 'textarea', placeholder: 'What is the idea, for whom, and why now?' },
    { key: 'idea.origin', label: 'Proposed by', kind: 'text', placeholder: 'Person, department or customer' },
    { key: 'idea.date', label: 'Proposed on', kind: 'date' },
    { key: 'idea.type', label: 'Type of project', kind: 'select', options: ['Concept project', 'Implementation project'], hint: 'A concept project produces a plan or design; an implementation project builds or runs it.' },
    { key: 'idea.feasibilityStudy', label: 'Feasibility study', kind: 'select', options: ['Needed', 'Not needed', 'Done'] },
    { key: 'idea.totalCost', label: 'Total cost', kind: 'money', compute: (q) => (bcModel(q).any ? bcModel(q).cost : null) },
    { key: 'idea.totalBenefit', label: 'Total benefit', kind: 'money', compute: (q) => (bcModel(q).any ? bcModel(q).benefit : null) },
    { key: 'idea.net', label: 'Net benefit', kind: 'money', hint: 'Benefit minus cost', compute: (q) => (bcModel(q).any ? bcModel(q).net : null) },
    {
      key: 'idea.ratio', label: 'Benefit / cost ratio', kind: 'number', dec: 2, hint: 'Above 1 means the idea pays off',
      compute: (q) => {
        const r = bcModel(q).ratio;
        return r == null ? null : Math.round(r * 100) / 100;
      },
    },
    { key: 'idea.decision', label: 'Decision', kind: 'select', options: ['Implement', 'Reject', 'Postpone', 'Feasibility study first'] },
    { key: 'idea.decidedBy', label: 'Decided by', kind: 'text', placeholder: 'e.g. Management board' },
    { key: 'idea.decisionDate', label: 'Decided on', kind: 'date' },
    { key: 'idea.conditions', label: 'Conditions and next steps', kind: 'textarea', placeholder: 'Budget limits, deadlines, what must be clarified first' },
  ].forEach((f) => PM.defineField(f));

  PM.section({
    id: 'idea',
    part: 'initiation',
    order: 31,
    num: '3.1',
    step: 'I1',
    slides: '19',
    title: 'Assess the idea',
    intro: 'Before anyone plans, check whether the idea fits the strategy, can be done and pays off. The result is a recorded decision.',
    blocks: [
      {
        type: 'guide',
        title: 'How to assess an idea',
        ordered: true,
        items: [
          'Describe the idea in a few sentences: what it is, who proposed it and why now.',
          'Strategy fit: check that it serves the company strategy and makes the project portfolio better as a whole.',
          'Technical feasibility: check that the objectives are manageable, decide whether it is a concept or an implementation project, and whether a feasibility study must come first.',
          'Economic viability: set costs against benefits over the whole life cycle, name the uncertainties and compare the alternatives, including doing nothing.',
          'Close with a recorded decision: implement, reject, postpone or study feasibility first.',
        ],
      },
      { type: 'step', step: 'I1' },
      {
        type: 'fields',
        title: 'The idea',
        cols: 3,
        fields: [{ key: 'idea.description' }, { key: 'idea.origin' }, { key: 'idea.date' }, { key: 'idea.type' }, { key: 'idea.feasibilityStudy' }],
      },
      {
        type: 'table',
        key: 'ideaChecks',
        title: 'Three checks',
        hint: 'Answer each question in a sentence or two, then rate it. "Yes" means the point is in favour of the idea.',
        fixed: CHECKS,
        columns: [
          { key: 'check', label: 'Check', from: true, w: 13 },
          { key: 'question', label: 'Question', from: true, w: 30 },
          { key: 'answer', label: 'Answer', kind: 'textarea', w: 32, placeholder: 'Your answer' },
          { key: 'assessment', label: 'Assessment', kind: 'rating', options: RATINGS, w: 26, sub: 'in favour of the idea?' },
        ],
      },
      { type: 'h', text: 'Business case', sub: 'Costs and benefits over the whole life cycle, by year or period' },
      {
        type: 'table',
        key: 'ideaBusinessCase',
        title: 'Costs and benefits',
        hint: 'One line per cost or benefit and period. Include internal staff time as a cost. Mark estimates in the note.',
        numbered: true,
        addLabel: 'Add line',
        columns: [
          { key: 'item', label: 'Item', kind: 'text', w: 24, placeholder: 'What it is' },
          { key: 'type', label: 'Type', kind: 'select', options: ['Cost', 'Benefit'], w: 9 },
          { key: 'nature', label: 'Nature', kind: 'select', options: ['One-off', 'Recurring'], w: 10 },
          { key: 'period', label: 'Year or period', kind: 'text', w: 9, placeholder: 'e.g. 2026' },
          {
            key: 'amount', label: 'Amount', kind: 'money', w: 11,
            total: (rows, q) => {
              let c = 0;
              let b = 0;
              rows.forEach((r) => {
                const a = numOf(r.amount) || 0;
                if (r.type === 'Cost') c += a;
                if (r.type === 'Benefit') b += a;
              });
              return 'Cost ' + q.money(c) + ' / Benefit ' + q.money(b);
            },
          },
          { key: 'note', label: 'Note', kind: 'text', w: 20, placeholder: 'Source, estimate, assumption' },
        ],
        defaults: [
          { type: 'Cost', nature: 'One-off', _ph: { item: 'External services and purchases', period: 'Year 1', note: 'Quote or estimate' } },
          { type: 'Cost', nature: 'One-off', _ph: { item: 'Internal staff time (person-days × rate)', period: 'Year 1' } },
          { type: 'Cost', nature: 'Recurring', _ph: { item: 'Running costs after the project', period: 'Year 2' } },
          { type: 'Benefit', nature: 'Recurring', _ph: { item: 'Savings or extra revenue', period: 'Year 2' } },
          { type: 'Benefit', nature: 'One-off', _ph: { item: 'Funding, sponsoring or other income', period: 'Year 1' } },
        ],
      },
      { type: 'fields', title: 'Result', cols: 4, fields: [{ key: 'idea.totalCost' }, { key: 'idea.totalBenefit' }, { key: 'idea.net' }, { key: 'idea.ratio' }] },
      {
        type: 'graphic',
        title: 'Business case',
        caption: 'Columns show cost and benefit per period. The line adds up benefit minus cost over time; where it crosses zero, the idea has paid for itself.',
        empty: (q) => (bcModel(q).any ? null : 'Add amounts with a type (cost or benefit) to see the business case.'),
        render: renderBusinessCase,
      },
      {
        type: 'table',
        key: 'ideaAlternatives',
        title: 'Alternatives compared',
        hint: 'List the realistic ways to reach the same goal, including doing nothing, and record which one you chose.',
        numbered: true,
        addLabel: 'Add alternative',
        columns: [
          { key: 'alternative', label: 'Alternative', kind: 'text', w: 18, placeholder: 'Name' },
          { key: 'description', label: 'Description', kind: 'textarea', w: 24, placeholder: 'What it would mean' },
          { key: 'cost', label: 'Cost', kind: 'money', w: 10 },
          { key: 'benefit', label: 'Benefit', kind: 'text', w: 20, placeholder: 'What it brings' },
          { key: 'risk', label: 'Risk', kind: 'select', options: ['Low', 'Medium', 'High'], w: 8 },
          { key: 'decision', label: 'Decision', kind: 'select', options: ['Chosen', 'Rejected', 'Kept as fallback'], w: 12 },
        ],
        defaults: [
          { _ph: { alternative: 'The idea as proposed' } },
          { _ph: { alternative: 'Another way to reach the goal' } },
          { _ph: { alternative: 'Do nothing' } },
        ],
      },
      {
        type: 'fields',
        title: 'Decision',
        hint: 'Who decided what, when, and under which conditions.',
        cols: 3,
        fields: [{ key: 'idea.decision' }, { key: 'idea.decidedBy' }, { key: 'idea.decisionDate' }, { key: 'idea.conditions' }],
      },
      {
        type: 'graphic',
        title: 'Idea assessment',
        caption: 'Each card is one question of the three checks, coloured by its assessment. The last column shows the decision they led to.',
        render: renderAssessment,
      },
    ],
  });

  PM.metric('businessCaseNet', {
    label: 'Business case (net)',
    kind: 'money',
    section: 'idea',
    fn: (q) => {
      const m = bcModel(q);
      return m.any ? m.net : null;
    },
  });

  // =====================================================================================
  // 3.2 Categorise the project
  // =====================================================================================
  const LEVELS = ['Below', 'Plan or measure', 'Project', 'Programme'];
  const FINALS = ['Plan or measure', 'Project', 'Programme'];
  // Example thresholds of one customer. rule 'min' = at least, 'gt' = more than.
  const CRITERIA = [
    { _id: 'div', criterion: 'Divisions involved', unit: 'Divisions', vunit: 'divisions', rule: 'at least', op: 'min', d1: 2, d2: 3, d3: 5 },
    { _id: 'dur', criterion: 'Duration', unit: 'Months', vunit: 'months', rule: 'at least', op: 'min', d1: 1, d2: 3, d3: 16 },
    { _id: 'eff', criterion: 'Internal effort', unit: 'Person-days', vunit: 'person-days', rule: 'more than', op: 'gt', d1: 20, d2: 50, d3: 500 },
    { _id: 'ext', criterion: 'External spend', unit: 'Money', vunit: '', rule: 'more than', op: 'gt', d1: 5000, d2: 20000, d3: 100000, money: true },
  ];

  /** Effective thresholds of a criterion row: own value, else the example default. */
  function thresholds(r) {
    return [1, 2, 3].map((i) => {
      const own = numOf(r['t' + i]);
      return own != null ? own : r['d' + i];
    });
  }

  /** Level a criterion row reaches, or '' when no value is entered. */
  function reachOf(r) {
    const v = numOf(r.value);
    if (v == null) return '';
    const th = thresholds(r);
    const ok = (t) => (r.op === 'gt' ? v > t : v >= t);
    if (ok(th[2])) return 'Programme';
    if (ok(th[1])) return 'Project';
    if (ok(th[0])) return 'Plan or measure';
    return 'Below';
  }

  /** The level most criteria reach (ties go to the higher level). */
  function suggestion(q) {
    const reached = q.rows('categoryCriteria').map(reachOf).filter(Boolean);
    if (!reached.length) return { level: '', count: 0, n: 0 };
    let best = 'Below';
    let bestN = -1;
    LEVELS.forEach((lev) => {
      const c = reached.filter((x) => x === lev).length;
      if (c > 0 && c >= bestN) {
        best = lev;
        bestN = c;
      }
    });
    return { level: best, count: bestN, n: reached.length };
  }
  const levelText = (lev) => (lev === 'Below' ? 'Below the project thresholds' : lev);

  // ---------- graphic: where the project sits ----------
  function renderSits(q, pal) {
    const rows = q.rows('categoryCriteria');
    const sx0 = 272;
    const sx1 = W - 34;
    const bw = (sx1 - sx0) / 4;
    const top = 32;
    const rowH = 80;
    const cur = q.cur();
    let body = '';

    LEVELS.forEach((lev, i) => {
      body += S.text(sx0 + bw * (i + 0.5), 8, lev === 'Below' ? 'Below' : lev, { size: 12, weight: 600, fill: pal.ink2, anchor: 'middle' });
    });

    const fills = [
      { fill: pal.box, stroke: pal.boxLine },
      { fill: pal.accentSoft },
      { fill: pal.accent, fillOpacity: 0.5 },
      { fill: pal.accent },
    ];
    const fmtV = (r, v) => (r.money ? cur + ' ' + U.fmtNum(v) : U.fmtNum(v));

    rows.forEach((r, i) => {
      const y = top + i * rowH;
      const by = y + 28;
      const bh = 16;
      const th = thresholds(r);
      const v = numOf(r.value);
      const reach = reachOf(r);

      body += S.text(PAD, y + 18, S.fit(r.criterion, sx0 - PAD - 16, 12.5, 600), { size: 12.5, weight: 600, fill: pal.ink });
      body += S.text(PAD, y + 36, S.fit(r.unit + ', ' + r.rule, sx0 - PAD - 16, 11), { size: 11, fill: pal.ink2 });
      body += S.text(PAD, y + 52, S.fit(reach ? 'Reaches: ' + levelText(reach) : 'No value yet', sx0 - PAD - 16, 11, reach ? 600 : 400), {
        size: 11, weight: reach ? 600 : 400, fill: reach ? pal.ink : pal.muted, italic: !reach,
      });

      fills.forEach((f, k) => {
        body += S.rect(sx0 + bw * k, by, bw, bh, { fill: f.fill, fillOpacity: f.fillOpacity, stroke: f.stroke, sw: 1 });
      });
      th.forEach((t, k) => {
        const tx = sx0 + bw * (k + 1);
        body += S.line(tx, by - 4, tx, by + bh + 4, { stroke: pal.ink2, sw: 1.5 });
        body += S.text(tx, by + bh + 8, (r.op === 'gt' ? '> ' : '≥ ') + fmtV(r, t), { size: 11, fill: pal.ink2, anchor: 'middle' });
      });

      if (v != null) {
        const end = th[2] * 2 || 1;
        const seg = (a, b, k) => sx0 + bw * (k + clamp((v - a) / (b - a || 1), 0, 1));
        let px;
        if (v <= th[0]) px = seg(0, th[0], 0);
        else if (v <= th[1]) px = seg(th[0], th[1], 1);
        else if (v <= th[2]) px = seg(th[1], th[2], 2);
        else px = seg(th[2], end, 3);
        body += S.line(px, by - 6, px, by + bh + 6, { stroke: pal.ink, sw: 2 });
        body += S.circle(px, by + bh / 2, 5.5, { fill: pal.ink, stroke: pal.bg, sw: 2 });
        const label = r.money ? q.money(v) : U.fmtNum(v) + ' ' + r.vunit;
        const lw = S.measure(label, 12, 600);
        body += S.text(clamp(px, sx0 + lw / 2, sx1 - lw / 2), by - 9, label, { size: 12, weight: 600, fill: pal.ink, anchor: 'middle', v: 'base' });
        if (v > end) body += S.text(sx1 + 6, by + bh / 2, '›', { size: 14, weight: 600, fill: pal.ink, v: 'middle' });
      } else {
        body += S.text(sx0 + 6, by - 9, 'Enter your value in the table', { size: 11, fill: pal.muted, italic: true, v: 'base' });
      }
    });

    const fy = top + rows.length * rowH + 4;
    body += S.line(PAD, fy, W - PAD, fy, { stroke: pal.line, sw: 1 });
    const sg = suggestion(q);
    const fin = q.f('category.final');
    const cls = q.f('category.class');
    let txt = sg.n ? 'Suggestion: ' + levelText(sg.level) + ' (' + sg.count + ' of ' + sg.n + ' criteria)' : 'Suggestion: enter your project’s values';
    body += S.text(PAD, fy + 12, S.fit(txt, 470, 13, 600), { size: 13, weight: 600, fill: pal.ink });
    txt = fin ? 'Final: ' + fin + (cls ? ', class ' + cls : '') : 'Final category not chosen yet';
    body += S.text(W - PAD, fy + 12, S.fit(txt, 440, 13, fin ? 600 : 400), { size: 13, weight: fin ? 600 : 400, fill: fin ? pal.accent : pal.muted, italic: !fin, anchor: 'end' });

    return S.svg(W, fy + 40, body, { pal, label: 'Where the project sits against the category thresholds' });
  }

  // ---------- fields of 3.2 ----------
  [
    {
      key: 'category.result', label: 'Suggested category', kind: 'text',
      compute: (q) => {
        const s = suggestion(q);
        return s.n ? levelText(s.level) + ' (' + s.count + ' of ' + s.n + ' criteria)' : '';
      },
    },
    {
      key: 'category.final', label: 'Final category', kind: 'select',
      // the suggested level is marked in the list, so the list follows the table
      options: (q) => {
        const s = suggestion(q).level;
        return FINALS.map((v) => ({ value: v, label: v === s ? v + ' (suggested)' : v }));
      },
      placeholder: (q) => {
        const s = suggestion(q);
        return s.n ? 'Suggested: ' + levelText(s.level) : 'Choose';
      },
    },
    { key: 'category.class', label: 'Size class', kind: 'select', options: ['C (small)', 'B (medium)', 'A (large)'] },
    { key: 'category.worth', label: 'Worth a project?', kind: 'select', options: ['Yes, run it as a project', 'No, handle it in the line'] },
    { key: 'category.reason', label: 'Reason', kind: 'textarea', placeholder: 'Why this category, especially when you overrule the suggestion' },
  ].forEach((f) => PM.defineField(f));

  PM.section({
    id: 'category',
    part: 'initiation',
    order: 32,
    num: '3.2',
    step: 'I2',
    slides: '20–21',
    title: 'Categorise the project',
    intro: 'Decide whether the idea is worth a project and how big it is. Then appoint the project owner and the project manager.',
    blocks: [
      {
        type: 'guide',
        title: 'How to categorise',
        ordered: true,
        items: [
          'Check whether the task is worth a project at all. Small tasks run better in the line organisation.',
          'Compare the project with your company’s thresholds for divisions involved, duration, internal effort and external spend.',
          'Take the category most criteria reach, then confirm it or overrule it with a reason.',
          'Give it a size class if your company uses them: C small, B medium, A large.',
          'Appoint the project owner and the project manager, and name the first core team members if you can.',
        ],
      },
      { type: 'step', step: 'I2' },
      {
        type: 'callout',
        kind: 'tip',
        title: 'Your own thresholds.',
        text: 'Every company sets its own limits. The grey numbers are one company’s example; type your own values over them.',
      },
      {
        type: 'table',
        key: 'categoryCriteria',
        title: 'Category criteria',
        hint: 'Divisions and duration count from the threshold ("at least"). Effort and spend must exceed it ("more than").',
        fixed: (q) => CRITERIA.map((c) => (c.money ? Object.assign({}, c, { unit: 'Money (' + q.cur() + ')' }) : c)),
        columns: [
          { key: 'criterion', label: 'Criterion', from: true, w: 15 },
          { key: 'unit', label: 'Unit', from: true, w: 10 },
          { key: 'rule', label: 'Rule', from: true, w: 8 },
          { key: 't1', label: 'Plan or measure', sub: 'from', kind: 'number', w: 9, placeholder: (r) => U.fmtNum(r.d1) },
          { key: 't2', label: 'Project', sub: 'from', kind: 'number', w: 9, placeholder: (r) => U.fmtNum(r.d2) },
          { key: 't3', label: 'Programme', sub: 'from', kind: 'number', w: 9, placeholder: (r) => U.fmtNum(r.d3) },
          { key: 'value', label: 'Our project', kind: 'number', w: 9, placeholder: 'Value' },
          { key: 'reach', label: 'Reaches', kind: 'text', w: 12, compute: (r) => reachOf(r) },
        ],
      },
      {
        type: 'fields',
        title: 'Category',
        cols: 2,
        fields: [{ key: 'category.result' }, { key: 'category.final' }, { key: 'category.class' }, { key: 'category.worth' }, { key: 'category.reason' }],
      },
      {
        type: 'graphic',
        title: 'Where the project sits',
        caption: 'One scale per criterion. Each band runs from one threshold to the next and has the same width, so small and large numbers read alike. The dot is your project.',
        render: renderSits,
      },
      {
        type: 'table',
        key: 'categoryAppointments',
        title: 'First project roles',
        hint: 'Who was appointed, when and by whom.',
        numbered: true,
        addLabel: 'Add appointment',
        columns: [
          { key: 'role', label: 'Role', kind: 'select', options: ['Project owner', 'Project manager', 'Core team member', 'Team member', 'PMO contact'], w: 14 },
          { key: 'person', label: 'Person', kind: 'person', w: 14 },
          { key: 'date', label: 'Appointed on', kind: 'date' },
          { key: 'by', label: 'Appointed by', kind: 'text', w: 16, placeholder: 'e.g. Management board' },
          { key: 'note', label: 'Note', kind: 'text', w: 20 },
        ],
        defaults: [{ role: 'Project owner' }, { role: 'Project manager' }],
      },
      {
        type: 'note',
        text: 'From here on the project manager steers the process, usually with a vague brief, a preliminary status and a team that still has to be put together.',
      },
    ],
  });

  PM.metric('category', {
    label: 'Category',
    kind: 'text',
    section: 'category',
    fn: (q) => {
      const fin = q.f('category.final');
      if (fin) return fin;
      const s = suggestion(q);
      return s.n ? levelText(s.level) : null;
    },
  });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  const BC = (id, item, type, nature, period, amount, note) => ({ _id: id, item, type, nature, period, amount, note: note || '' });

  PM.example({
    f: {
      'idea.description': 'A summer festival for all employees and their families: one day with food, music and a children’s programme at a rented venue. It thanks staff for a hard year and shows the company as a family-friendly employer.',
      'idea.origin': 'Anna Berger (Head of HR) with Corporate Communications',
      'idea.date': '2025-11-18',
      'idea.type': 'Implementation project',
      'idea.feasibilityStudy': 'Not needed',
      'idea.decision': 'Implement',
      'idea.decidedBy': 'Management board, on the proposal of Anna Berger',
      'idea.decisionDate': '2025-12-15',
      'idea.conditions': 'External spend up to about €41,000; at least €5,000 from sponsors; one festival in 2026, repeat only after a positive evaluation.',
      'category.final': 'Project',
      'category.class': 'B (medium)',
      'category.worth': 'Yes, run it as a project',
      'category.reason': 'All four criteria reach the project level. Four divisions, six months and about €41,000 external spend need a temporary team; class B because the festival is new for the company but the risks are known.',
    },
    t: {
      ideaBusinessCase: [
        BC('bc1', 'Venue rent incl. cleaning', 'Cost', 'One-off', '2026', 9000, 'Quote'),
        BC('bc2', 'Catering for 400 guests', 'Cost', 'One-off', '2026', 16000, 'Quote, € 40 per guest'),
        BC('bc3', 'Programme: band, children’s programme, host', 'Cost', 'One-off', '2026', 7500, 'Estimate'),
        BC('bc4', 'Event technology: stage, sound, safety crew', 'Cost', 'One-off', '2026', 6000, '12 days × € 500'),
        BC('bc5', 'Communication: invitations, posters, decoration', 'Cost', 'One-off', '2026', 2500, 'Estimate'),
        BC('bc6', 'Internal staff time', 'Cost', 'One-off', '2026', 50000, 'About 125 person-days × € 400; not paid out'),
        BC('bc7', 'Sponsoring income', 'Benefit', 'One-off', '2026', 8000, 'Main sponsor, two instalments'),
        BC('bc8', 'Lower recruiting costs (referrals, fewer agency fees)', 'Benefit', 'Recurring', '2026', 15000, 'Estimate by HR'),
        BC('bc9', 'Lower recruiting costs (referrals, fewer agency fees)', 'Benefit', 'Recurring', '2027', 30000, 'Estimate by HR'),
        BC('bc10', 'Lower recruiting costs (referrals, fewer agency fees)', 'Benefit', 'Recurring', '2028', 25000, 'Estimate by HR'),
        BC('bc11', 'Higher engagement, lower staff turnover', 'Benefit', 'Recurring', '2026', 15000, 'Valued from the engagement survey; uncertain'),
        BC('bc12', 'Higher engagement, lower staff turnover', 'Benefit', 'Recurring', '2027', 10000, 'Uncertain'),
      ],
      ideaAlternatives: [
        { _id: 'al1', alternative: 'Summer festival for staff and families', description: 'One day at a rented venue for about 400 guests, with catering, band and a children’s programme', cost: 91000, benefit: 'Visible employer brand, families involved, sponsor income', risk: 'Medium', decision: 'Chosen' },
        { _id: 'al2', alternative: 'Vouchers for team events', description: 'Each team gets € 60 per person for an event of its own', cost: 24000, benefit: 'Team spirit inside the teams; no effect outside the company', risk: 'Low', decision: 'Kept as fallback' },
        { _id: 'al3', alternative: 'Do nothing', description: 'Keep the usual Christmas party only', cost: 0, benefit: 'None beyond today', risk: 'Low', decision: 'Rejected' },
      ],
      categoryAppointments: [
        { _id: 'ap1', role: 'Project owner', person: 'p1', date: '2026-01-12', by: 'Management board', note: 'Sponsor of the idea, Head of HR' },
        { _id: 'ap2', role: 'Project manager', person: 'p2', date: '2026-01-12', by: 'Management board', note: 'Corporate Communications' },
        { _id: 'ap3', role: 'Core team member', person: 'p3', date: '2026-01-19', by: 'Marc Huber with the line managers', note: 'Programme' },
        { _id: 'ap4', role: 'Core team member', person: 'p4', date: '2026-01-19', by: 'Marc Huber with the line managers', note: 'Venue and logistics' },
        { _id: 'ap5', role: 'Core team member', person: 'p5', date: '2026-01-19', by: 'Marc Huber with the line managers', note: 'Communication' },
        { _id: 'ap6', role: 'Core team member', person: 'p6', date: '2026-01-19', by: 'Marc Huber with the line managers', note: 'Budget and sponsoring' },
      ],
    },
    x: {
      ideaChecks: {
        a1: { answer: 'Yes. Employer branding is one of the HR goals for 2026; the festival shows us as a family-friendly employer.', assessment: 1 },
        a2: { answer: 'Yes. No other project works on engagement, and Corporate Communications has free capacity in spring.', assessment: 1 },
        b1: { answer: 'Yes. The team has run smaller events; venue, catering and artists can be bought in.', assessment: 1 },
        b2: { answer: 'Implementation project: the format is known, the work is organising it.', assessment: 1 },
        b3: { answer: 'No study needed, but the safety concept for 400 guests needs early talks with the authority.', assessment: 2 },
        c1: { answer: 'Costs about € 91,000 incl. staff time, benefits about € 103,000 over three years. Break-even in 2028.', assessment: 1 },
        c2: { answer: 'Recruiting savings and the value of engagement are estimates. Bad weather is a risk for the day.', assessment: 2 },
        c3: { answer: 'Compared with vouchers for team events and doing nothing. Only the festival reaches families and the public.', assessment: 1 },
      },
      categoryCriteria: {
        div: { value: 4 },
        dur: { value: 6 },
        eff: { value: 140 },
        ext: { value: 41000 },
      },
    },
  });
})();
