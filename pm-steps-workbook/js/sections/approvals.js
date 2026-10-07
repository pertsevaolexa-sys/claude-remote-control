/* Framework sections 3.6 (project approval), 4.3 (consolidate and coordinate), 4.4 (finalise the PM plan) and 4.5 (approve the PM plan). */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const r1 = (n) => S.round(n);
  const PAD = 16;

  // =====================================================================================
  // Shared helpers
  // =====================================================================================

  /** Section numbers of the given section ids in this workbook ("3.5, 4.2"), else the fallback. */
  function secNum(ids, fb) {
    const nums = [];
    (ids || []).forEach((id) => {
      const s = (PM.sections || []).find((x) => x.id === id);
      if (s && s.num && nums.indexOf(s.num) < 0) nums.push(s.num);
    });
    return nums.length ? nums.join(', ') : fb || '';
  }

  /** Polygon as a path, so it can be dashed. */
  function shape(points, o) {
    return S.path('M' + points.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' L') + ' Z', o);
  }

  function chev(x, y, w, h, first, o) {
    const t = 14;
    const pts = first
      ? [[x, y], [x + w - t, y], [x + w, y + h / 2], [x + w - t, y + h], [x, y + h]]
      : [[x, y], [x + w - t, y], [x + w, y + h / 2], [x + w - t, y + h], [x, y + h], [x + t, y + h / 2]];
    return shape(pts, o);
  }

  /** Folder icon, 16 x 12, top-left at (x, y). */
  function folder(x, y, o) {
    return shape([[x, y + 1], [x + 5.5, y + 1], [x + 7, y + 3], [x + 16, y + 3], [x + 16, y + 12], [x, y + 12]], Object.assign({ sw: 1.2, join: 'round' }, o));
  }

  function names(q, ids, short) {
    const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
    return list.map((id) => (short ? q.initials(id) : q.name(id))).filter(Boolean).join(', ');
  }

  function safeRows(q, key) {
    try {
      return q.rows(key) || [];
    } catch (e) {
      return [];
    }
  }

  const filled = (v) => !U.isEmpty(v) && !(Array.isArray(v) && !v.length);

  // =====================================================================================
  // Reference lists
  // =====================================================================================

  /** The plans that are checked in the follow-up workshop (S3). */
  const CHECKS = [
    { _id: 'ck1', plan: 'Linked bar chart / schedule', short: 'Linked bar chart', ids: ['network'], fb: '4.2' },
    { _id: 'ck2', plan: 'Staff deployment (resource plan)', short: 'Staff deployment', ids: ['detailcost'], fb: '4.2' },
    { _id: 'ck3', plan: 'Cost plan', short: 'Cost plan', ids: ['detailcost'], fb: '4.2' },
    { _id: 'ck4', plan: 'Risk analysis', short: 'Risk analysis', ids: ['risk'], fb: '5' },
    { _id: 'ck5', plan: 'RACI chart', short: 'RACI chart', ids: ['raci'], fb: '4.2' },
    { _id: 'ck6', plan: 'WP specifications', short: 'WP specifications', ids: ['wpspecs'], fb: '4.2' },
    { _id: 'ck7', plan: 'Communication plan', short: 'Communication plan', ids: ['communication'], fb: '4.1' },
    { _id: 'ck8', plan: 'Project marketing', short: 'Project marketing', ids: ['consolidate'], fb: '4.3' },
  ];
  const CHECK_STATUS = ['Validated', 'Changed', 'Open'];

  /** The documents of a PM plan, in order, with the workbook sections that hold them. */
  const DOCS = [
    { _id: 'pc1', doc: 'Project Charter', ids: ['charter'], fb: '3.3' },
    { _id: 'pc2', doc: 'Stakeholder analysis', ids: ['stakeholders'], fb: '3.4' },
    { _id: 'pc3', doc: 'Results plan', ids: ['scope'], fb: '3.5' },
    { _id: 'pc4', doc: 'Work breakdown structure (WBS)', short: 'WBS', ids: ['scope'], fb: '3.5' },
    { _id: 'pc5', doc: 'WP specifications', ids: ['wpspecs'], fb: '4.2' },
    { _id: 'pc6', doc: 'Milestone plan', ids: ['schedule'], fb: '3.5' },
    { _id: 'pc7', doc: 'Bar chart / schedule', ids: ['schedule', 'network'], fb: '3.5, 4.2' },
    { _id: 'pc8', doc: 'Network analysis', ids: ['network'], fb: '4.2' },
    { _id: 'pc9', doc: 'Resource plan', ids: ['budget', 'detailcost'], fb: '3.5, 4.2' },
    { _id: 'pc10', doc: 'Cost plan', ids: ['budget', 'detailcost'], fb: '3.5, 4.2' },
    { _id: 'pc11', doc: 'Organisation chart', ids: ['organisation'], fb: '4.1' },
    { _id: 'pc12', doc: 'Role descriptions', ids: ['organisation'], fb: '4.1' },
    { _id: 'pc13', doc: 'Communication plan', ids: ['communication'], fb: '4.1' },
    { _id: 'pc14', doc: 'Ground rules and project culture', short: 'Ground rules and culture', ids: ['communication'], fb: '4.1' },
    { _id: 'pc15', doc: 'RACI chart', ids: ['raci'], fb: '4.2' },
    { _id: 'pc16', doc: 'Risk table', ids: ['risk'], fb: '5' },
    { _id: 'pc17', doc: 'Change request process', ids: ['contract'], fb: '7' },
    { _id: 'pc18', doc: 'Project marketing plan', ids: ['consolidate'], fb: '4.3' },
    { _id: 'pc19', doc: 'Situational analysis and method check', short: 'Situational analysis, method check', ids: ['tailoring'], fb: '8' },
  ];

  const BASELINES = [
    { _id: 'bl1', item: 'Milestone baseline' },
    { _id: 'bl2', item: 'Schedule baseline' },
    { _id: 'bl3', item: 'Cost baseline (S-curve)' },
    { _id: 'bl4', item: 'Scope baseline (WBS)' },
    { _id: 'bl5', item: 'Risk budget' },
  ];

  const AGENDA = [
    { id: 'authorise', text: 'Authorise the current planning' },
    { id: 'forward', text: 'Decide how to go forward' },
    { id: 'appraisal', text: 'Verify the investment appraisal (business case)' },
    { id: 'approve', text: 'Approve the project and the further planning process' },
    { id: 'pmplan', text: 'Agree the PM plan draft' },
  ];

  const AGREED = [
    { id: 'roles', text: 'Roles agreed' },
    { id: 'comm', text: 'Communication structures agreed' },
    { id: 'report', text: 'Reporting rhythm agreed' },
    { id: 'changes', text: 'How changes are handled (change request process) agreed' },
    { id: 'baseline', text: 'Baseline saved' },
  ];

  /** Days from the project approval (I5) to the PM plan approval (S5), or null. */
  function startDays(q) {
    const a = q.f('appr.date');
    const b = q.f('plan.approvalDate');
    return U.isDate(a) && U.isDate(b) ? U.diffDays(a, b) : null;
  }

  /** Latest PM plan version: the last dated row of the version history, else the approved version field. */
  function currentVersion(q) {
    const rows = q.rows('planVersions').filter((r) => filled(r.version));
    if (rows.length) {
      const dated = rows.filter((r) => U.isDate(r.date)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      return (dated.length ? dated[dated.length - 1] : rows[rows.length - 1]).version;
    }
    return q.f('plan.version') || '';
  }

  // =====================================================================================
  // Graphic: Approval path (I5 and S5 gates)
  // =====================================================================================

  function gateState(which, q) {
    if (which === 'I5') {
      const st = q.f('appr.charterStatus');
      if (st === 'Released' || st === 'Preliminarily released') return 'passed';
      if (st === 'Rejected') return 'rejected';
      if (st === 'To be revised') return 'open';
      return q.f('appr.date') ? 'open' : 'empty';
    }
    const st = q.f('plan.approved');
    if (st === 'Approved' || st === 'Approved with changes') return 'passed';
    if (st === 'Not approved') return 'rejected';
    return q.f('plan.approvalDate') ? 'open' : 'empty';
  }

  function gateStyle(state, pal) {
    if (state === 'passed') return { fill: pal.mile, stroke: pal.mile, ink: pal.accentInk };
    if (state === 'rejected') return { fill: pal.crit, stroke: pal.crit, ink: pal.accentInk };
    if (state === 'open') return { fill: pal.mileSoft, stroke: pal.mile, ink: pal.ink };
    return { fill: pal.bg, stroke: pal.muted, dash: '4 3', ink: pal.muted };
  }

  function phaseStyle(state, pal) {
    if (state === 'done') return { fill: pal.accent, stroke: pal.accent, sw: 1, ink: pal.accentInk, sub: pal.accentInk };
    if (state === 'current') return { fill: pal.accentSoft, stroke: pal.accent, sw: 1.5, ink: pal.ink, sub: pal.ink2 };
    return { fill: pal.box, stroke: pal.boxLine, sw: 1, ink: pal.ink2, sub: pal.muted };
  }

  function renderApprovalPath(q, pal) {
    const W = 960;
    const g1 = gateState('I5', q);
    const g2 = gateState('S5', q);
    const p1 = g1 === 'passed' ? 'done' : 'current';
    const p2 = g2 === 'passed' ? 'done' : g1 === 'passed' ? 'current' : 'next';
    const p3 = g2 === 'passed' ? 'current' : 'next';
    const days = startDays(q);
    const ver = q.f('plan.version') || '1.0';

    const slot = 80;
    const cw = (W - PAD * 2 - slot * 2) / 3;
    const by = 14;
    const bh = 50;
    const cy = by + bh / 2;
    const xs = [PAD, PAD + cw + slot, PAD + (cw + slot) * 2];
    const gx = [PAD + cw + slot / 2, PAD + cw * 2 + slot * 1.5];
    const phases = [
      { label: 'Idea and initiation', sub: 'Steps I1–I4', st: p1 },
      { label: 'Project start process', sub: 'Steps S1–S4' + (days === null ? '' : days < 0 ? ' · check the dates' : ' · ' + days + ' days'), st: p2 },
      { label: 'Implementation', sub: 'Controlling against the baseline', st: p3 },
    ];
    let body = '';
    // connector line behind the gates
    body += S.line(xs[0] + cw - 2, cy, xs[1] + 8, cy, { stroke: pal.axis, sw: 2 });
    body += S.line(xs[1] + cw - 2, cy, xs[2] + 8, cy, { stroke: pal.axis, sw: 2 });
    phases.forEach((p, i) => {
      const st = phaseStyle(p.st, pal);
      body += chev(xs[i], by, cw, bh, i === 0, { fill: st.fill, stroke: st.stroke, sw: st.sw });
      const tx = xs[i] + cw / 2 - (i === 0 ? 7 : 0);
      body += S.text(tx, cy - 8, S.fit(p.label, cw - 40, 13, 600), { size: 13, weight: 600, fill: st.ink, anchor: 'middle', v: 'middle' });
      body += S.text(tx, cy + 10, S.fit(p.sub, cw - 40, 11), { size: 11, fill: st.sub, anchor: 'middle', v: 'middle' });
    });

    // gate cards
    const v = (val, ph) => (filled(val) ? { t: String(val), ph: false } : { t: ph, ph: true });
    const bc = q.f('appr.businessCaseVerified');
    const fc = q.f('plan.finalCharter');
    const cards = [
      {
        code: 'I5', title: 'Project approval', state: g1,
        meta: [q.f('appr.format'), q.f('appr.place')].filter(filled).join(' · '),
        rows: [
          ['Meeting', v(q.f('appr.date') && q.date(q.f('appr.date')), 'date not set')],
          ['Project Charter', v(q.f('appr.charterStatus'), 'status not set')],
          ['Business case', v(bc === 'Yes' ? 'Verified' : bc === 'With changes' ? 'Verified with changes' : bc === 'No' ? 'Not verified' : '', 'not checked yet')],
          ['Participants', v(names(q, q.f('appr.participants'), true), 'not set')],
        ],
        out: 'Result: Project Charter (preliminarily) released',
      },
      {
        code: 'S5', title: 'PM plan approval', state: g2,
        meta: [q.f('plan.approvalFormat')].filter(filled).join(' · '),
        rows: [
          ['Meeting', v(q.f('plan.approvalDate') && q.date(q.f('plan.approvalDate')), 'date not set')],
          ['PM plan ' + ver, v(q.f('plan.approved'), 'decision not set')],
          ['Final charter', v(fc === 'Yes' ? 'Approved' : fc === 'No' ? 'Not approved yet' : '', 'not set')],
          ['Baseline saved', v(q.f('plan.baselineDate') && q.date(q.f('plan.baselineDate')), 'date not set')],
          ['Participants', v(names(q, q.f('plan.approvalParticipants'), true), 'not set')],
        ],
        out: 'Result: final charter, PM plan ' + ver + ', baseline',
      },
    ];
    const cardW = 300;
    const cardY = by + bh + 26;
    const rowH = 19;
    const maxRows = Math.max(...cards.map((c) => c.rows.length));
    const cardH = 52 + maxRows * rowH + 34;
    cards.forEach((c, i) => {
      const gs = gateStyle(c.state, pal);
      const x = gx[i] - cardW / 2;
      body += S.line(gx[i], cy + 19, gx[i], cardY, { stroke: gs.stroke, sw: 1.5, dash: gs.dash });
      body += S.rect(x, cardY, cardW, cardH, { fill: pal.bg, stroke: c.state === 'empty' ? pal.boxLine : gs.stroke, sw: 1.2, rx: 8, dash: c.state === 'empty' ? '4 3' : null });
      body += S.text(x + 14, cardY + 12, c.code + '  ' + c.title, { size: 13, weight: 600, fill: pal.ink });
      body += S.text(x + 14, cardY + 32, S.fit(c.meta || 'Format and place not set', cardW - 28, 11), { size: 11, fill: pal.muted, italic: !c.meta });
      c.rows.forEach((r, j) => {
        const y = cardY + 52 + j * rowH;
        body += S.text(x + 14, y, r[0], { size: 11, fill: pal.muted });
        body += S.text(x + 118, y - 1, S.fit(r[1].t, cardW - 132, 12, r[1].ph ? 400 : 500), { size: 12, weight: r[1].ph ? 400 : 500, fill: r[1].ph ? pal.muted : pal.ink, italic: r[1].ph });
      });
      const fy = cardY + cardH - 26;
      body += S.line(x + 12, fy, x + cardW - 12, fy, { stroke: pal.line });
      body += S.text(x + 14, fy + 8, S.fit(c.out, cardW - 28, 11), { size: 11, fill: pal.ink2 });
    });
    // gate diamonds on top of the connectors
    cards.forEach((c, i) => {
      const gs = gateStyle(c.state, pal);
      body += shape([[gx[i], cy - 19], [gx[i] + 19, cy], [gx[i], cy + 19], [gx[i] - 19, cy]], { fill: gs.fill, stroke: gs.stroke, sw: 1.5, dash: gs.dash });
      body += S.text(gx[i], cy, c.code, { size: 11, weight: 700, fill: gs.ink, anchor: 'middle', v: 'middle' });
    });

    // legend
    const ly = cardY + cardH + 18;
    const items = [
      { label: 'Phase done', sw: 18, sym: (x, yy) => chev(x, yy - 6, 18, 12, true, { fill: pal.accent, stroke: pal.accent }) },
      { label: 'Current phase', sw: 18, sym: (x, yy) => chev(x, yy - 6, 18, 12, true, { fill: pal.accentSoft, stroke: pal.accent, sw: 1.5 }) },
      { label: 'Gate passed', sw: 12, sym: (x, yy) => S.diamond(x + 6, yy, 6, { fill: pal.mile, stroke: pal.mile }) },
      { label: 'Gate open or to be revised', sw: 12, sym: (x, yy) => S.diamond(x + 6, yy, 6, { fill: pal.mileSoft, stroke: pal.mile }) },
      { label: 'Rejected', sw: 12, sym: (x, yy) => S.diamond(x + 6, yy, 6, { fill: pal.crit, stroke: pal.crit }) },
      { label: 'Not held yet', sw: 12, sym: (x, yy) => shape([[x + 6, yy - 6], [x + 12, yy], [x + 6, yy + 6], [x, yy]], { stroke: pal.muted, dash: '2 2' }) },
    ];
    let lx = PAD;
    let lyy = ly;
    items.forEach((it) => {
      const w = it.sw + 6 + S.measure(it.label, 11) + 20;
      if (lx + w > W - PAD) {
        lx = PAD;
        lyy += 20;
      }
      body += it.sym(lx, lyy + 6);
      body += S.text(lx + it.sw + 6, lyy + 6, it.label, { size: 11, fill: pal.ink2, v: 'middle' });
      lx += w;
    });
    return S.svg(W, lyy + 22, body, { pal, label: 'Approval path from the idea through project approval and PM plan approval to implementation' });
  }

  // =====================================================================================
  // Graphic: Consolidation status (S3)
  // =====================================================================================

  function checkStyle(st, pal) {
    if (st === 'Validated') return { fill: pal.goodSoft, stroke: pal.good, sw: 1.2 };
    if (st === 'Changed') return { fill: pal.mileSoft, stroke: pal.mile, sw: 1.2 };
    if (st === 'Open') return { fill: pal.box, stroke: pal.muted, sw: 1.2 };
    return { fill: pal.bg, stroke: pal.boxLine, sw: 1, dash: '4 3' };
  }

  function statusIcon(st, cx, cy, pal) {
    if (st === 'Validated') {
      return S.circle(cx, cy, 7, { fill: pal.good }) + S.path('M' + (cx - 3.4) + ',' + cy + ' L' + (cx - 1) + ',' + (cy + 2.6) + ' L' + (cx + 3.6) + ',' + (cy - 2.6), { stroke: pal.bg, sw: 1.8 });
    }
    if (st === 'Changed') {
      return S.circle(cx, cy, 7, { fill: pal.mile }) + S.poly([[cx, cy - 3.6], [cx + 3.6, cy + 2.8], [cx - 3.6, cy + 2.8]], { fill: pal.bg });
    }
    if (st === 'Open') return S.circle(cx, cy, 6.5, { stroke: pal.muted, sw: 1.6 });
    return S.circle(cx, cy, 6.5, { stroke: pal.boxLine, sw: 1.2, dash: '2 2' });
  }

  function consolidationCounts(q) {
    const rows = q.rows('planCheck');
    const c = { Validated: 0, Changed: 0, Open: 0, none: 0, total: rows.length };
    rows.forEach((r) => {
      if (CHECK_STATUS.indexOf(r.status) >= 0) c[r.status] += 1;
      else c.none += 1;
    });
    return c;
  }

  function renderConsolidation(q, pal) {
    const W = 1000;
    const rows = q.rows('planCheck');
    const n = Math.max(1, rows.length);
    const gap = 10;
    const tw = (W - PAD * 2 - gap * (n - 1)) / n;
    const c = consolidationCounts(q);
    let body = '';
    const head = c.none === c.total
      ? c.total + ' plans, none checked yet'
      : c.total + ' plans: ' + c.Validated + ' validated, ' + c.Changed + ' changed, ' + c.Open + ' open' + (c.none ? ', ' + c.none + ' without status' : '');
    body += S.text(PAD, 12, head, { size: 13, weight: 600, fill: pal.ink });

    const top = 38;
    const inner = tw - 20;
    // measure every tile first so all tiles share one height
    const tiles = rows.map((r) => {
      const def = CHECKS.find((d) => d._id === r._id) || {};
      const name = S.textBlock(0, 0, def.short || r.plan || '', { size: 12, weight: 600, maxW: inner, maxLines: 2 });
      const note = filled(r.what) ? S.textBlock(0, 0, r.what, { size: 11, maxW: inner, maxLines: 6, lineH: 1.3 }) : { h: 0, lines: [] };
      const link = filled(r.links) ? r.links : secNum(def.ids, def.fb);
      const foot = [r.by ? q.initials(r.by) : '', link ? 'see ' + link : ''].filter(Boolean).join(' · ');
      return { r, def, name, note, foot, linkPh: !filled(r.links) };
    });
    const nameH = 32;
    const noteH = Math.max(0, ...tiles.map((t) => t.note.h));
    const th = Math.max(112, 36 + nameH + (noteH ? noteH + 8 : 0) + 26);
    tiles.forEach((t, i) => {
      const x = PAD + i * (tw + gap);
      const st = t.r.status;
      const cs = checkStyle(st, pal);
      body += S.rect(x, top, tw, th, { fill: cs.fill, stroke: cs.stroke, sw: cs.sw, dash: cs.dash, rx: 8 });
      body += statusIcon(st, x + 17, top + 17, pal);
      body += S.text(x + 30, top + 17, CHECK_STATUS.indexOf(st) >= 0 ? st : 'No status', { size: 11, weight: 600, fill: CHECK_STATUS.indexOf(st) >= 0 ? pal.ink : pal.muted, v: 'middle', italic: CHECK_STATUS.indexOf(st) < 0 });
      body += S.textBlock(x + 10, top + 34, (t.def.short || t.r.plan || ''), { size: 12, weight: 600, maxW: inner, maxLines: 2, fill: pal.ink }).svg;
      if (t.note.h) body += S.textBlock(x + 10, top + 34 + nameH + 4, t.r.what, { size: 11, maxW: inner, maxLines: 6, lineH: 1.3, fill: pal.ink2 }).svg;
      if (t.foot) body += S.text(x + 10, top + th - 14, S.fit(t.foot, inner, 11), { size: 11, fill: pal.muted, v: 'middle', italic: t.linkPh && !t.r.by });
    });
    const lg = S.legend(
      [
        { label: 'Validated', color: pal.goodSoft, stroke: pal.good },
        { label: 'Changed in the workshop', color: pal.mileSoft, stroke: pal.mile },
        { label: 'Open', color: pal.box, stroke: pal.muted },
      ],
      PAD, top + th + 16, pal, { maxW: W - PAD * 2 }
    );
    body += lg.svg;
    return S.svg(W, top + th + 16 + lg.h + 8, body, { pal, label: 'Consolidation status of the eight plans' });
  }

  // =====================================================================================
  // Graphic: Filing structure (WBS as folder tree)
  // =====================================================================================

  function filingItems(q) {
    const wbs = q.wbs();
    const root = wbs.find((r) => r.level === 1);
    const pm = wbs.find((r) => r.kind === 'PM phase') || wbs.find((r) => r.code === '1.1');
    const fromWbs = (r, depth, kind) => ({ depth, kind, code: r.code, name: q.label(r, 'name') || '(no name)', ph: q.isPlaceholder(r, 'name') || !r.name });
    const segs = [];

    // project management: the PM plan and its documents
    const pmItem = pm ? fromWbs(pm, 1, 'phase') : { depth: 1, kind: 'phase', code: '1.1', name: 'Project management', ph: true };
    const ver = currentVersion(q);
    const plan = { depth: 2, kind: 'plan', name: 'PM plan', extra: ver ? 'v' + ver : '', anc: [pmItem] };
    pmItem.anc = [];
    const docs = q.rows('planContents');
    const inc = docs.filter((r) => r.included);
    const docItems = (inc.length ? inc : docs).map((r) => {
      const def = DOCS.find((d) => d._id === r._id) || {};
      return { depth: 3, kind: 'doc', name: def.short || r.doc, extra: inc.length && filled(r.version) ? 'v' + r.version : '', ph: !inc.length, anc: [pmItem, plan] };
    });
    segs.push([pmItem, plan].concat(docItems));

    // other phases: one folder per work package for the result documentation
    wbs.filter((r) => r.level === 2 && r !== pm).forEach((ph) => {
      const head = fromWbs(ph, 1, 'phase');
      head.anc = [];
      const seg = [head];
      const stack = [head];
      wbs.filter((r) => r.level >= 3 && r.code.indexOf(ph.code + '.') === 0).forEach((r) => {
        const depth = r.level - 1;
        const it = fromWbs(r, depth, r.kind === 'Work package' ? 'wp' : 'group');
        stack.length = depth - 1;
        it.anc = stack.slice().filter(Boolean);
        stack[depth - 1] = it;
        seg.push(it);
      });
      segs.push(seg);
    });
    const rootItem = root ? fromWbs(root, 0, 'root') : { depth: 0, kind: 'root', code: '1', name: 'Project folder', ph: true };
    return { root: rootItem, segs };
  }

  function renderFiling(q, pal) {
    const W = 1000;
    const { root, segs } = filingItems(q);
    const total = segs.reduce((s, g) => s + g.length, 0);
    const ncols = total <= 24 ? 1 : total <= 52 ? 2 : 3;
    const target = Math.ceil(total / ncols);
    const limit = Math.max(target + 3, Math.ceil(target * 1.2));
    const cols = [[]];
    segs.forEach((seg) => {
      let cur = cols[cols.length - 1];
      if (cur.length && cur.length + seg.length > limit) {
        cur = [];
        cols.push(cur);
      }
      seg.forEach((it, i) => {
        if (cur.length >= limit && i > 0) {
          cur = (it.anc || []).map((a) => Object.assign({}, a, { cont: true }));
          cols.push(cur);
        }
        cur.push(it);
      });
    });
    const nc = cols.length;
    const cgap = 24;
    const colW = (W - PAD * 2 - cgap * (nc - 1)) / nc;
    const IND = 18;
    const rowH = 20;
    const rootY = 10;
    const busY = rootY + 28;
    const y0 = busY + 8;
    const maxRows = Math.max(...cols.map((c) => c.length));

    const iconStyle = (it) => {
      if (it.ph) return { fill: 'none', stroke: pal.muted, dash: '2.5 2' };
      if (it.kind === 'root') return { fill: pal.strong, stroke: pal.strong };
      if (it.kind === 'plan') return { fill: pal.accent, stroke: pal.accent };
      if (it.kind === 'phase') return { fill: pal.accentSoft, stroke: pal.accent };
      if (it.kind === 'doc') return { fill: pal.bg, stroke: pal.accent };
      return { fill: pal.box, stroke: pal.muted };
    };

    let lines = '';
    let marks = '';
    // root folder and the bus to every column
    marks += folder(PAD, rootY + 4, iconStyle(root));
    let rx = PAD + 24;
    if (root.code) {
      marks += S.text(rx, rootY + 10, root.code, { size: 12, family: 'mono', fill: pal.muted, v: 'middle' });
      rx += S.measure(root.code, 12, 400, 'mono') + 8;
    }
    marks += S.text(rx, rootY + 10, S.fit(root.name, W - rx - 160, 13, 600), { size: 13, weight: 600, fill: root.ph ? pal.muted : pal.ink, italic: root.ph, v: 'middle' });
    marks += S.text(W - PAD, rootY + 10, 'Project folder', { size: 11, fill: pal.muted, anchor: 'end', v: 'middle' });
    const colX = (ci) => PAD + ci * (colW + cgap);
    lines += S.line(PAD + 8, rootY + 16, PAD + 8, busY, { stroke: pal.axis });
    if (nc > 1) lines += S.line(PAD + 8, busY, colX(nc - 1) + 8, busY, { stroke: pal.axis });

    cols.forEach((col, ci) => {
      const cx0 = colX(ci);
      const centre = (i) => y0 + i * rowH + rowH / 2;
      const lastAt = [];
      const lastChild = {};
      col.forEach((it, i) => {
        const d = it.depth;
        const parent = d >= 2 ? lastAt[d - 1] : -1;
        const key = d + ':' + (parent === undefined ? 'top' : parent);
        lastChild[key] = { i, d, parent };
        lastAt[d] = i;
        lastAt.length = d + 1;
      });
      Object.keys(lastChild).forEach((k) => {
        const lc = lastChild[k];
        const gx = cx0 + (lc.d - 1) * IND + 8;
        const fromY = lc.parent === -1 || lc.parent === undefined ? (lc.d === 1 ? busY : y0) : centre(lc.parent) + 6;
        lines += S.line(gx, fromY, gx, centre(lc.i), { stroke: pal.axis });
      });
      col.forEach((it, i) => {
        const cy = centre(i);
        const ix = cx0 + it.depth * IND;
        lines += S.line(cx0 + (it.depth - 1) * IND + 8, cy, ix - 1, cy, { stroke: pal.axis });
        marks += folder(ix, cy - 6, iconStyle(it));
        let tx = ix + 22;
        const right = cx0 + colW;
        if (it.code && it.kind !== 'plan' && it.kind !== 'doc') {
          marks += S.text(tx, cy, it.code, { size: 11, family: 'mono', fill: pal.muted, v: 'middle' });
          tx += S.measure(it.code, 11, 400, 'mono') + 6;
        }
        let extraW = 0;
        if (it.extra && !it.cont) {
          marks += S.text(right, cy, it.extra, { size: 11, family: 'mono', fill: pal.muted, anchor: 'end', v: 'middle' });
          extraW = S.measure(it.extra, 11, 400, 'mono') + 8;
        }
        const strong = it.kind === 'phase' || it.kind === 'plan';
        const label = it.name + (it.cont ? ' (cont.)' : '');
        marks += S.text(tx, cy, S.fit(label, Math.max(20, right - tx - extraW), 12, strong ? 600 : 400), {
          size: 12, weight: strong ? 600 : 400, fill: it.ph || it.cont ? pal.muted : it.kind === 'doc' ? pal.ink2 : pal.ink, italic: it.ph, v: 'middle',
        });
      });
    });

    // legend
    const ly = y0 + maxRows * rowH + 18;
    const items = [
      { label: 'Project and phases', st: { fill: pal.accentSoft, stroke: pal.accent } },
      { label: 'PM plan', st: { fill: pal.accent, stroke: pal.accent } },
      { label: 'PM plan documents', st: { fill: pal.bg, stroke: pal.accent } },
      { label: 'Work package results', st: { fill: pal.box, stroke: pal.muted } },
      { label: 'Not filled in yet', st: { fill: 'none', stroke: pal.muted, dash: '2.5 2' } },
    ];
    let lx = PAD;
    let lyy = ly;
    items.forEach((it) => {
      const w = 22 + S.measure(it.label, 11) + 20;
      if (lx + w > W - PAD) {
        lx = PAD;
        lyy += 20;
      }
      marks += folder(lx, lyy, it.st);
      marks += S.text(lx + 22, lyy + 7, it.label, { size: 11, fill: pal.ink2, v: 'middle' });
      lx += w;
    });
    return S.svg(W, lyy + 22, lines + marks, { pal, label: 'Filing structure: the WBS as a folder tree' });
  }

  // =====================================================================================
  // Sections
  // =====================================================================================

  PM.section({
    id: 'approval',
    part: 'initiation',
    order: 36,
    num: '3.6',
    title: 'Project approval',
    step: 'I5',
    slides: '78–80',
    intro: 'The project owner and the project manager meet face to face to authorise the planning so far. The result is the (preliminarily) released Project Charter.',
    blocks: [
      { type: 'step', step: 'I5' },
      {
        type: 'fields', title: 'Approval meeting', cols: 3,
        fields: [
          { key: 'appr.date', label: 'Date', kind: 'date' },
          { key: 'appr.place', label: 'Place', kind: 'text', placeholder: 'Room or video link' },
          { key: 'appr.format', label: 'Format', kind: 'select', options: ['PO meeting face to face', 'Other'] },
          { key: 'appr.participants', label: 'Participants', kind: 'people', wide: true },
          { key: 'appr.charterStatus', label: 'Project Charter', kind: 'select', options: ['Preliminarily released', 'Released', 'To be revised', 'Rejected'] },
          { key: 'appr.businessCaseVerified', label: 'Business case verified', kind: 'select', options: ['Yes', 'With changes', 'No'] },
        ],
      },
      { type: 'checklist', key: 'appr.agenda', title: 'Agenda of the approval meeting', hint: 'Tick what the meeting covered.', items: AGENDA },
      {
        type: 'graphic', title: 'Approval path',
        caption: 'The two gates of the method. The project approval (I5) releases the charter, at least preliminarily, and opens the project start process. The PM plan approval (S5) confirms the final charter and the PM plan and freezes the baseline. Dates and decisions come from this section and from 4.5.',
        render: (q, pal) => renderApprovalPath(q, pal),
        empty: () => null,
      },
      {
        type: 'table', key: 'apprDecisions', title: 'Decisions and conditions', numbered: true, addLabel: 'Add decision',
        hint: 'What the project owner decided, and what still has to happen for the release to stand.',
        columns: [
          { key: 'decision', label: 'Decision', kind: 'text', w: 28, placeholder: 'What was decided' },
          { key: 'condition', label: 'Condition or requirement', kind: 'textarea', w: 30, placeholder: 'What still has to happen' },
          { key: 'owner', label: 'Owner', kind: 'person', w: 14 },
          { key: 'due', label: 'Due', kind: 'date' },
        ],
        defaults: [
          { _ph: { decision: 'e.g. Charter preliminarily released', condition: 'e.g. Confirm sponsor income by April' } },
          { _ph: { decision: 'e.g. Go ahead with the project start process' } },
        ],
      },
      {
        type: 'table', key: 'apprOpenPoints', title: 'Open points', numbered: true, addLabel: 'Add open point',
        hint: 'Questions the meeting could not settle. Close them before the PM plan is approved.',
        columns: [
          { key: 'point', label: 'Open point', kind: 'text', w: 32, placeholder: 'What is still open' },
          { key: 'owner', label: 'Owner', kind: 'person', w: 14 },
          { key: 'due', label: 'Due', kind: 'date' },
          { key: 'status', label: 'Status', kind: 'select', options: ['Open', 'Done'], w: 8 },
        ],
        defaults: [{ _ph: { point: 'e.g. Works council approval' } }, {}],
      },
      {
        type: 'callout', kind: 'tip', title: 'Preliminary release.',
        text: 'A preliminarily released charter lets the start process begin while some conditions are still open. Give each condition an owner and a date, and confirm the final charter in step S5.',
      },
    ],
  });

  PM.section({
    id: 'consolidate',
    part: 'start',
    order: 43,
    num: '4.3',
    title: 'Consolidate and coordinate the detailed planning',
    navTitle: 'Consolidate and coordinate',
    step: 'S3',
    slides: '130–131',
    intro: 'The plans from the detailed planning are brought together, checked against each other and agreed by the team. Afterwards everyone works from the same validated plans.',
    blocks: [
      { type: 'step', step: 'S3' },
      {
        type: 'guide', title: 'How the plans come together',
        items: [
          'Team members prepare their plans alone or in pairs.',
          'In a face-to-face follow-up workshop the team puts the plans side by side: dates, staff, costs and risks must fit each other.',
          'Change what does not fit and mark each plan as validated.',
          'Set up project marketing so the project is visible to the people it affects.',
          'Complex projects may need several planning cycles.',
        ],
        ordered: true,
      },
      {
        type: 'fields', title: 'Follow-up workshop', cols: 4,
        fields: [
          { key: 'plan.workshopDate', label: 'Date', kind: 'date' },
          { key: 'plan.workshopPlace', label: 'Place', kind: 'text', placeholder: 'Room or video link' },
          { key: 'plan.cycles', label: 'Planning cycles', kind: 'number', placeholder: '1', hint: 'How many rounds the planning took' },
          { key: 'plan.workshopParticipants', label: 'Participants', kind: 'people', wide: true },
        ],
      },
      {
        type: 'table', key: 'planCheck', title: 'Plan check',
        hint: 'One line per plan. Mark it validated when the team agreed it, note what changed and where the plan lives in this workbook.',
        fixed: CHECKS.map((c) => ({ _id: c._id, plan: c.plan })),
        columns: [
          { key: 'plan', label: 'Plan', from: true, w: 22 },
          { key: 'status', label: 'Status', kind: 'select', options: CHECK_STATUS, w: 10 },
          { key: 'what', label: 'What changed', kind: 'textarea', w: 30, placeholder: 'Changes agreed in the workshop' },
          { key: 'by', label: 'By', kind: 'person', w: 12 },
          {
            key: 'links', label: 'Section', kind: 'text', w: 7, sub: 'in this workbook',
            placeholder: (r) => {
              const def = CHECKS.find((c) => c._id === r._id);
              return def ? secNum(def.ids, def.fb) : 'e.g. 4.2';
            },
          },
        ],
      },
      {
        type: 'graphic', title: 'Consolidation status',
        caption: 'The eight plans at a glance. Green plans are validated, amber plans were changed in the workshop, grey plans are still open. The note shows what changed.',
        render: (q, pal) => renderConsolidation(q, pal),
        empty: () => null,
      },
      { type: 'h', text: 'Project marketing', sub: 'Make the project known to the people it affects, so they support it and are not surprised by it.' },
      {
        type: 'table', key: 'planMarketing', title: 'Project marketing plan', numbered: true, addLabel: 'Add measure',
        hint: 'Pick the target group from the stakeholder analysis (3.4). Plan the measures along the milestones.',
        columns: [
          { key: 'measure', label: 'Measure', kind: 'text', w: 24, placeholder: 'What you do' },
          {
            key: 'target', label: 'Target group', kind: 'select', w: 16,
            options: (q) => {
              const out = [];
              safeRows(q, 'stakeholders').forEach((r) => {
                if (r.name && out.indexOf(r.name) < 0) out.push(r.name);
              });
              ['All employees', 'Project team', 'Management', 'External partners'].forEach((s) => {
                if (out.indexOf(s) < 0) out.push(s);
              });
              return out;
            },
          },
          { key: 'channel', label: 'Channel', kind: 'select', options: ['Newsletter', 'Intranet', 'Meeting', 'E-mail', 'Poster', 'Event', 'Social media', 'Other'], w: 11 },
          { key: 'when', label: 'When', kind: 'date' },
          { key: 'responsible', label: 'Responsible', kind: 'person', w: 13 },
          { key: 'status', label: 'Status', kind: 'select', options: ['Planned', 'In progress', 'Done'], w: 9 },
        ],
        defaults: [
          { _ph: { measure: 'e.g. Teaser on the intranet' } },
          { _ph: { measure: 'e.g. Save-the-date e-mail' } },
          { _ph: { measure: 'e.g. Update at the department meeting' } },
        ],
      },
    ],
  });

  PM.section({
    id: 'pmplan',
    part: 'start',
    order: 44,
    num: '4.4',
    title: 'Finalise the PM plan',
    step: 'S4',
    slides: '132–134',
    landscape: true,
    intro: 'The PM plan collects every plan of the project in one place. Send it to all core team members and settle the last open points before it goes to the project owner.',
    blocks: [
      { type: 'step', step: 'S4' },
      {
        type: 'guide', title: 'What the PM plan does',
        items: [
          'Shows the current status of the project at any time.',
          'Keeps all project management instruments together and consistent.',
          'Records the project history, which helps when the project manager changes.',
          'Lets the organisation learn from the project.',
        ],
      },
      {
        type: 'fields', title: 'Finalising', cols: 3,
        fields: [
          { key: 'plan.sentDate', label: 'Sent to all PMTMs on', kind: 'date' },
          { key: 'plan.lastMeeting', label: 'Last internal meeting on open points', kind: 'date' },
          { key: 'plan.location', label: 'Where the PM plan is stored', kind: 'text', placeholder: 'Folder or link', wide: true },
        ],
      },
      {
        type: 'table', key: 'planContents', title: 'Contents of the PM plan',
        hint: 'Tick the documents this project uses. The section column shows where each one is prepared in this workbook.',
        fixed: (q) => DOCS.map((d) => ({ _id: d._id, sec: secNum(d.ids, d.fb), doc: d.doc })),
        columns: [
          { key: 'sec', label: 'Section', from: true, family: 'mono', w: 6 },
          { key: 'doc', label: 'Document', from: true, w: 24 },
          { key: 'included', label: 'Included', kind: 'check', w: 6 },
          { key: 'version', label: 'Version', kind: 'text', w: 6, placeholder: '1.0' },
          { key: 'location', label: 'File or location', kind: 'text', w: 20, placeholder: 'File name or folder' },
          { key: 'owner', label: 'Owner', kind: 'person', w: 12 },
          { key: 'status', label: 'Status', kind: 'select', options: ['Draft', 'Final', 'Not needed'], w: 9 },
        ],
      },
      {
        type: 'table', key: 'planVersions', title: 'Version history', numbered: true, addLabel: 'Add version',
        hint: 'One line per version that was sent round. Version 1.0 is the one the project owner approves.',
        columns: [
          { key: 'version', label: 'Version', kind: 'text', w: 6, family: 'mono' },
          { key: 'date', label: 'Date', kind: 'date' },
          { key: 'what', label: 'What changed', kind: 'textarea', w: 32 },
          { key: 'author', label: 'Author', kind: 'person', w: 13 },
          { key: 'sentTo', label: 'Sent to', kind: 'text', w: 18, placeholder: 'e.g. All PMTMs' },
        ],
        defaults: [
          { _ph: { version: '0.9', what: 'Draft with all plans, sent to the core team' } },
          { _ph: { version: '1.0', what: 'Approved by the project owner, baseline saved' } },
        ],
      },
      {
        type: 'graphic', title: 'Filing structure',
        caption: 'The WBS doubles as the filing structure. The project management phase holds the PM plan with one folder per included document; every other phase holds one folder per work package for its results.',
        render: (q, pal) => renderFiling(q, pal),
        empty: () => null,
      },
    ],
  });

  PM.section({
    id: 'pmapproval',
    part: 'start',
    order: 45,
    num: '4.5',
    title: 'Approve the PM plan',
    step: 'S5',
    slides: '135–137',
    intro: 'The project manager presents the planning to the project owner or the steering committee. Their approval of the final charter and the PM plan 1.0 ends the project start process.',
    blocks: [
      { type: 'step', step: 'S5' },
      {
        type: 'fields', title: 'Approval meeting', cols: 3,
        fields: [
          { key: 'plan.approvalDate', label: 'Date', kind: 'date' },
          { key: 'plan.approvalFormat', label: 'Format', kind: 'select', options: ['PO meeting', 'PSC meeting'] },
          { key: 'plan.approved', label: 'Decision', kind: 'select', options: ['Approved', 'Approved with changes', 'Not approved'] },
          { key: 'plan.approvalParticipants', label: 'Participants', kind: 'people', wide: true },
          { key: 'plan.finalCharter', label: 'Final charter approved', kind: 'select', options: ['Yes', 'No'] },
          { key: 'plan.version', label: 'Approved PM plan version', kind: 'text', placeholder: '1.0' },
          { key: 'plan.baselineDate', label: 'Baseline saved on', kind: 'date' },
        ],
      },
      { type: 'checklist', key: 'plan.agreed', title: 'Agreed in the meeting', hint: 'PM and project owner leave with one view of how the project is controlled.', items: AGREED },
      {
        type: 'table', key: 'planBaseline', title: 'Baseline',
        hint: 'Freeze each plan on the day of approval. Later changes go into revised values and leave the baseline as it is.',
        fixed: BASELINES,
        columns: [
          { key: 'item', label: 'Baseline', from: true, w: 22 },
          { key: 'frozen', label: 'Frozen on', kind: 'date' },
          { key: 'version', label: 'Version', kind: 'text', w: 6, placeholder: '1.0' },
          { key: 'where', label: 'Where stored', kind: 'text', w: 20, placeholder: 'File or folder' },
          { key: 'note', label: 'Note', kind: 'text', w: 26 },
        ],
      },
      {
        type: 'callout', kind: 'rule', title: 'The baseline is the reference point.',
        text: 'Project controlling compares every later status with the baseline: milestones, dates, costs, scope and the risk budget.',
      },
      {
        type: 'checks', title: 'Approval checks',
        run: (q) => {
          const out = [];
          const ap = q.f('plan.approved');
          const ver = q.f('plan.version') || '1.0';
          out.push(ap ? { ok: ap !== 'Not approved', text: 'PM plan ' + ver + ': ' + ap.toLowerCase() } : { ok: null, text: 'Record the decision on the PM plan.' });
          const fc = q.f('plan.finalCharter');
          out.push(fc === 'Yes' ? { ok: true, text: 'Final Project Charter approved' } : fc === 'No' ? { ok: false, text: 'Final Project Charter not approved yet' } : { ok: null, text: 'Record whether the final charter was approved.' });
          const bd = q.f('plan.baselineDate');
          const ad = q.f('plan.approvalDate');
          if (bd && ad) out.push({ ok: bd >= ad, text: bd >= ad ? 'Baseline saved on ' + q.date(bd) + (bd === ad ? ', the day of approval' : ', after the approval') : 'Baseline saved before the approval (' + q.date(bd) + ')' });
          else if (!bd && (ap === 'Approved' || ap === 'Approved with changes')) out.push({ ok: false, text: 'Save the baseline now that the plan is approved.' });
          else out.push({ ok: null, text: 'Save the baseline on the day of approval.' });
          const ticked = (q.f('plan.agreed') || []).filter((id) => AGREED.some((a) => a.id === id)).length;
          out.push({ ok: ticked === AGREED.length ? true : ticked ? false : null, text: ticked + ' of ' + AGREED.length + ' agreements ticked' });
          const days = startDays(q);
          if (days !== null) out.push({ ok: days >= 0 ? null : false, text: days >= 0 ? 'Project start process took ' + days + ' days, from project approval to PM plan approval' : 'PM plan approval is dated before the project approval' });
          return out;
        },
      },
    ],
  });

  // =====================================================================================
  // Metrics
  // =====================================================================================

  PM.metric('planValidated', {
    label: 'Plans validated', kind: 'text', section: 'consolidate',
    fn: (q) => {
      const c = consolidationCounts(q);
      return c.total - c.none ? c.Validated + ' of ' + c.total : null;
    },
  });
  PM.metric('planVersion', {
    label: 'PM plan version', kind: 'text', section: 'pmplan',
    fn: (q) => currentVersion(q) || null,
  });
  PM.metric('planStartDays', {
    label: 'Project start process', kind: 'number', unit: 'days', section: 'pmapproval',
    fn: (q) => {
      const d = startDays(q);
      return d !== null && d >= 0 ? d : null;
    },
  });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================

  const C = (status, what, by, links) => ({ status, what, by, links });
  const D = (included, version, location, owner, status) => ({ included, version, location, owner, status });
  const B = (frozen, version, where, note) => ({ frozen, version, where, note });

  PM.example({
    f: {
      'appr.date': '2026-01-30',
      'appr.place': 'Meeting room 4.12, head office',
      'appr.participants': ['p1', 'p2'],
      'appr.format': 'PO meeting face to face',
      'appr.charterStatus': 'Preliminarily released',
      'appr.businessCaseVerified': 'Yes',
      'appr.agenda': ['authorise', 'forward', 'appraisal', 'approve', 'pmplan'],
      'plan.workshopDate': '2026-02-20',
      'plan.workshopPlace': 'Training room, head office',
      'plan.workshopParticipants': ['p2', 'p3', 'p4', 'p5', 'p6', 'p9'],
      'plan.cycles': 1,
      'plan.sentDate': '2026-02-24',
      'plan.lastMeeting': '2026-02-25',
      'plan.location': 'Team drive: Summer Festival 2026 / 1.1 Project management / PM plan',
      'plan.approvalDate': '2026-02-27',
      'plan.approvalFormat': 'PSC meeting',
      'plan.approvalParticipants': ['p1', 'p10', 'p2'],
      'plan.approved': 'Approved',
      'plan.finalCharter': 'Yes',
      'plan.version': '1.0',
      'plan.baselineDate': '2026-02-27',
      'plan.agreed': ['roles', 'comm', 'report', 'changes', 'baseline'],
    },
    t: {
      apprDecisions: [
        { _id: 'ad1', decision: 'Project Charter preliminarily released', condition: 'Anna Berger signs the charter once the budget line is booked (signed on 2 Feb 2026)', owner: 'p1', due: '2026-02-02' },
        { _id: 'ad2', decision: 'Go ahead with the project start process, kick-off on 4 Feb', condition: 'Detailed planning ready for PM plan approval by the end of February', owner: 'p2', due: '2026-02-27' },
        { _id: 'ad3', decision: 'Business case accepted', condition: 'Confirm sponsor income by April; without it, shorten the evening programme', owner: 'p6', due: '2026-04-30' },
      ],
      apprOpenPoints: [
        { _id: 'ao1', point: 'Works council approval for helper shifts on a Saturday', owner: 'p2', due: '2026-02-20', status: 'Done' },
        { _id: 'ao2', point: 'Clash with the ERP go-live: no IT staff as helpers in June', owner: 'p2', due: '2026-02-20', status: 'Done' },
        { _id: 'ao3', point: 'Insurance cover for guests and families', owner: 'p6', due: '2026-03-13', status: 'Done' },
      ],
      planMarketing: [
        { _id: 'mk1', measure: 'Teaser on the intranet', target: 'Employees', channel: 'Intranet', when: '2026-03-02', responsible: 'p5', status: 'Done' },
        { _id: 'mk2', measure: 'Save-the-date e-mail to all staff', target: 'Employees', channel: 'E-mail', when: '2026-03-16', responsible: 'p8', status: 'Done' },
        { _id: 'mk3', measure: 'CEO video invitation', target: 'Employees', channel: 'Intranet', when: '2026-04-27', responsible: 'p5', status: 'Done' },
        { _id: 'mk4', measure: 'Posters in the canteens and at the entrances', target: 'Employees', channel: 'Poster', when: '2026-05-04', responsible: 'p8', status: 'Done' },
        { _id: 'mk5', measure: 'Status update at the board meeting', target: 'Management board', channel: 'Meeting', when: '2026-04-15', responsible: 'p2', status: 'Done' },
      ],
      planVersions: [
        { _id: 'pv1', version: '0.9', date: '2026-02-24', what: 'Draft with all plans after the follow-up workshop', author: 'p2', sentTo: 'All PMTMs, project assistant' },
        { _id: 'pv2', version: '1.0', date: '2026-02-27', what: 'Approved in the PSC meeting; baseline saved', author: 'p2', sentTo: 'PO, PSC, all PMTMs' },
        { _id: 'pv3', version: '1.1', date: '2026-04-14', what: 'Venue contract signed four days late: milestone plan, bar chart and risk table updated', author: 'p2', sentTo: 'PO, all PMTMs' },
      ],
    },
    x: {
      planCheck: {
        ck1: C('Changed', 'Catering and safety now start after the venue contract; predecessors added', 'p2', '4.2'),
        ck2: C('Changed', 'Helpers moved out of the ERP go-live week; two temporary staff for the setup', 'p4', '4.2'),
        ck3: C('Validated', '', 'p6', '4.2'),
        ck4: C('Validated', 'Two new risks from the workshop', 'p2', '5'),
        ck5: C('Validated', '', 'p2', '4.2'),
        ck6: C('Validated', '', 'p3', '4.2'),
        ck7: C('Validated', '', 'p5', '4.1'),
        ck8: C('Validated', 'Four measures agreed', 'p5', '4.3'),
      },
      planContents: {
        pc1: D(true, '1.0', 'Charter_v1.0.pdf', 'p2', 'Final'),
        pc2: D(true, '1.0', 'Stakeholders.xlsx', 'p2', 'Final'),
        pc3: D(true, '1.0', 'Results-plan.docx', 'p3', 'Final'),
        pc4: D(true, '1.0', 'WBS.xlsx', 'p2', 'Final'),
        pc5: D(true, '1.0', 'WP-specifications.docx', 'p9', 'Final'),
        pc6: D(true, '1.1', 'Schedule.xlsx, tab Milestones', 'p2', 'Final'),
        pc7: D(true, '1.1', 'Schedule.xlsx, tab Bar chart', 'p2', 'Final'),
        pc8: D(false, '', '', '', 'Not needed'),
        pc9: D(true, '1.0', 'Resources.xlsx', 'p2', 'Final'),
        pc10: D(true, '1.0', 'Cost-plan.xlsx', 'p6', 'Final'),
        pc11: D(true, '1.0', 'Organisation.pptx', 'p9', 'Final'),
        pc12: D(true, '1.0', 'Roles.docx', 'p2', 'Final'),
        pc13: D(true, '1.0', 'Communication-plan.xlsx', 'p5', 'Final'),
        pc14: D(true, '1.0', 'Ground-rules.docx', 'p9', 'Final'),
        pc15: D(true, '1.0', 'RACI.xlsx', 'p2', 'Final'),
        pc16: D(true, '1.1', 'Risks.xlsx', 'p2', 'Final'),
        pc17: D(true, '1.0', 'Change-requests.docx', 'p2', 'Final'),
        pc18: D(true, '1.0', 'Marketing-plan.xlsx', 'p5', 'Final'),
        pc19: D(true, '1.0', 'Tailoring.xlsx', 'p2', 'Final'),
      },
      planBaseline: {
        bl1: B('2026-02-27', '1.0', 'Schedule.xlsx, tab Milestones', 'Eight milestones, baseline column frozen'),
        bl2: B('2026-02-27', '1.0', 'Schedule.xlsx, tab Bar chart', 'Baseline start and end of every work package'),
        bl3: B('2026-02-27', '1.0', 'Cost-plan.xlsx', 'Planned cost per month, cumulated'),
        bl4: B('2026-02-27', '1.0', 'WBS.xlsx', 'All work packages with their results'),
        bl5: B('2026-02-27', '1.0', 'Risks.xlsx', 'Contingency for the top risks'),
      },
    },
  });
})();
