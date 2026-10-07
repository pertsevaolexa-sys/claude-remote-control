/* Framework 4.2, detailed planning: who does what (RACI chart) and work package specifications. */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;
  const esc = U.esc;
  const PAD = 16;

  // =====================================================================================
  // People and letters
  // =====================================================================================
  const LETTERS = ['R', 'C', 'A', 'I'];
  const LETTER_NAME = { R: 'Responsible', C: 'Contributes', A: 'Accountable', I: 'Informed' };
  const COLUMN_MODES = ['All people', 'Core team only (PO, PM, PMTMs)', 'People with a project role'];
  const CORE_ROLES = ['Project owner', 'Project manager', 'PMTM'];
  const OTHER_TEAM = ['Team member', 'Project assistant', 'Expert', 'External partner'];
  const ROLE_SHORT = {
    'Project owner': 'PO', 'Project manager': 'PM', PMTM: 'PMTM', 'Team member': 'Team', 'Project assistant': 'Asst',
    'Project coach': 'Coach', 'PSC member': 'PSC', PMO: 'PMO', Expert: 'Expert', 'External partner': 'Ext',
  };

  const rolesOf = (p) => (Array.isArray(p.roles) ? p.roles : p.roles ? [p.roles] : []);
  const hasRole = (p, list) => rolesOf(p).some((r) => list.includes(r));
  function roleShort(p) {
    const r = PM.ROLES.find((x) => rolesOf(p).includes(x));
    return r ? ROLE_SHORT[r] || r : '';
  }

  /** People who get a column, by the choice in field raci.columns. */
  function shownPeople(q) {
    const mode = q.f('raci.columns') || COLUMN_MODES[0];
    const all = q.people();
    if (mode === COLUMN_MODES[1]) return all.filter((p) => hasRole(p, CORE_ROLES));
    if (mode === COLUMN_MODES[2]) return all.filter((p) => rolesOf(p).length);
    return all;
  }

  /** Column tag per person: initials (or a role label such as "PMTM 2" when there are none), role as sub-line, full name. */
  function personTags(q, list) {
    const byRole = {};
    list.forEach((p) => {
      if (!q.initials(p._id)) {
        const r = roleShort(p) || 'Person';
        byRole[r] = (byRole[r] || 0) + 1;
      }
    });
    const seen = {};
    const out = {};
    list.forEach((p) => {
      const role = roleShort(p);
      let short = q.initials(p._id);
      let sub = role;
      if (!short) {
        const r = role || 'Person';
        seen[r] = (seen[r] || 0) + 1;
        short = byRole[r] > 1 ? r + ' ' + seen[r] : r;
        sub = '';
      }
      out[p._id] = { short, sub, name: q.name(p._id) || short, ph: !p.name };
    });
    return out;
  }

  function letter(row, p) {
    const v = String((row && row['p_' + p._id]) || '').trim().toUpperCase();
    return LETTERS.includes(v) ? v : '';
  }
  const isWp = (r) => r.kind === 'Work package';
  const byCode = (a, b) => U.codeCmp(a.code, b.code);
  function raciRows(q) {
    return q.rows('raci').slice().sort(byCode);
  }
  function anyLetter(q, rows) {
    const people = q.people();
    return rows.some((r) => people.some((p) => letter(r, p)));
  }
  function list(codes) {
    return codes.length > 12 ? codes.slice(0, 12).join(', ') + ' and ' + (codes.length - 12) + ' more' : codes.join(', ');
  }

  /** Fill, outline and letter colour per letter, the same in both drawings. */
  function letterStyle(pal) {
    return {
      R: { fill: pal.accent, ink: pal.accentInk },
      C: { fill: pal.accentSoft, stroke: pal.accent, ink: pal.ink },
      A: { fill: pal.mile, ink: pal.strongInk },
      I: { fill: pal.box, stroke: pal.muted, ink: pal.ink2 },
    };
  }
  function letterLegend(pal, x, y, maxW) {
    const st = letterStyle(pal);
    return S.legend(LETTERS.map((L) => ({ label: L + '  ' + LETTER_NAME[L], color: st[L].fill, stroke: st[L].stroke })), x, y, pal, { maxW });
  }

  // =====================================================================================
  // RACI table columns and checks
  // =====================================================================================
  function raciColumns(q) {
    const people = shownPeople(q);
    const tags = personTags(q, people);
    const cols = [
      { key: 'code', label: 'WBS', from: true, family: 'mono', w: 6 },
      { key: 'name', label: 'Work package', from: true, w: 22 },
    ];
    people.forEach((p) => {
      const t = tags[p._id];
      cols.push({ key: 'p_' + p._id, label: t.short, sub: t.sub, kind: 'select', options: LETTERS, w: 5, hint: t.name });
    });
    cols.push({
      key: 'involved', label: 'People', sub: 'involved', kind: 'number', w: 6,
      compute: (r, q2) => shownPeople(q2).filter((p) => letter(r, p)).length || null,
    });
    return cols;
  }

  function raciChecks(q) {
    const rows = raciRows(q);
    const people = q.people();
    if (!rows.length) return [{ ok: null, text: 'Add work packages to the WBS to fill the RACI chart.' }];
    if (!anyLetter(q, rows)) return [{ ok: null, text: 'Put R, C, A or I into the chart to run the checks.' }];
    const tag = (p) => q.initials(p._id) || q.name(p._id) || roleShort(p) || '?';
    const rOf = (r) => people.filter((p) => letter(r, p) === 'R');
    const out = [];

    // exactly one R per work package
    const noR = rows.filter((r) => !rOf(r).length).map((r) => r.code);
    const manyR = rows.filter((r) => rOf(r).length > 1).map((r) => r.code);
    if (!noR.length && !manyR.length) out.push({ ok: true, text: 'Every work package has exactly one R (' + rows.length + ' work packages).' });
    if (noR.length) out.push({ ok: false, text: 'No R yet: ' + list(noR) + '.' });
    if (manyR.length) out.push({ ok: false, text: 'More than one R: ' + list(manyR) + '. Give each work package one responsible person.' });

    // every PMTM leads at least one work package
    const pmtms = people.filter((p) => rolesOf(p).includes('PMTM'));
    if (pmtms.length) {
      const idle = pmtms.filter((p) => !rows.some((r) => letter(r, p) === 'R'));
      out.push(idle.length
        ? { ok: false, text: 'Core team members without an R: ' + idle.map(tag).join(', ') + '. Each PMTM should lead at least one work package.' }
        : { ok: true, text: 'Every core team member (PMTM) leads at least one work package.' });
    }

    // other team members only contribute
    const others = people.filter((p) => hasRole(p, OTHER_TEAM) && !hasRole(p, CORE_ROLES));
    if (others.length) {
      const bad = [];
      others.forEach((p) => {
        const hits = rows.filter((r) => ['R', 'A'].includes(letter(r, p))).map((r) => r.code + ' ' + letter(r, p));
        if (hits.length) bad.push(tag(p) + ' (' + hits.join(', ') + ')');
      });
      out.push(bad.length
        ? { ok: false, text: 'Team members outside the core team should contribute (C), not lead or approve: ' + bad.join('; ') + '.' }
        : { ok: true, text: 'Team members outside the core team only contribute (C) or are informed (I).' });
    }

    // R matches the responsible person in the WBS
    const mism = [];
    const noResp = [];
    let compared = 0;
    rows.forEach((r) => {
      const rs = rOf(r);
      if (rs.length !== 1) return;
      if (!r.responsible) {
        noResp.push(r.code);
        return;
      }
      compared += 1;
      if (r.responsible !== rs[0]._id) mism.push(r.code + ' (chart ' + tag(rs[0]) + ', WBS ' + (q.initials(r.responsible) || q.name(r.responsible) || '?') + ')');
    });
    if (mism.length) out.push({ ok: false, text: 'The R differs from the responsible person in the WBS: ' + mism.join('; ') + '. Change one of them.' });
    else if (compared) out.push({ ok: true, text: 'The R matches the responsible person in the WBS.' });
    if (noResp.length) out.push({ ok: null, text: 'No responsible person in the WBS yet: ' + list(noResp) + '.' });

    // people without any involvement
    const idlePeople = people.filter((p) => !rows.some((r) => letter(r, p)));
    out.push(idlePeople.length
      ? { ok: null, text: 'Not involved anywhere: ' + idlePeople.map((p) => q.name(p._id) || tag(p)).join(', ') + '. Is a specialist missing in the chart, or is the person not needed?' }
      : { ok: true, text: 'Everyone in the people list is involved in at least one work package.' });

    // counts
    const perWp = rows.map((r) => people.filter((p) => letter(r, p)).length);
    const avg = U.sum(perWp, (n) => n) / perWp.length;
    out.push({ ok: null, text: 'People per work package: ' + Math.min.apply(null, perWp) + ' to ' + Math.max.apply(null, perWp) + ' (average ' + q.num(avg, 1) + ').' });
    const perPerson = people
      .map((p) => ({ t: tag(p), n: rows.filter((r) => letter(r, p)).length }))
      .filter((x) => x.n)
      .sort((a, b) => b.n - a.n);
    if (perPerson.length) out.push({ ok: null, text: 'Work packages per person: ' + perPerson.map((x) => x.t + ' ' + x.n).join(', ') + '.' });
    return out;
  }

  // =====================================================================================
  // Graphic: involvement per person
  // =====================================================================================
  function involvementEmpty(q) {
    const rows = raciRows(q);
    if (!rows.length) return 'Add work packages to the WBS to see the involvement per person.';
    if (!shownPeople(q).length) return 'Add people to the people list to see their involvement.';
    if (!anyLetter(q, rows)) return 'Put R, C, A or I into the RACI chart to see how often each person is involved.';
    return null;
  }

  function involvementSvg(q, pal) {
    const rows = raciRows(q);
    const people = shownPeople(q);
    const tags = personTags(q, people);
    const st = letterStyle(pal);
    const data = people
      .map((p) => {
        const c = { R: 0, C: 0, A: 0, I: 0 };
        rows.forEach((r) => {
          const l = letter(r, p);
          if (l) c[l] += 1;
        });
        return { p, c, total: c.R + c.C + c.A + c.I, tag: tags[p._id] };
      })
      .sort((a, b) => b.total - a.total || b.c.R - a.c.R || String(a.tag.name).localeCompare(String(b.tag.name)));

    const W = 760;
    const labelW = 210;
    const x0 = PAD + labelW;
    const x1 = W - PAD - 30;
    const nt = S.niceTicks(Math.max(1, Math.max.apply(null, data.map((d) => d.total))), 5);
    const unit = (x1 - x0) / nt.max;
    const RH = 32;
    const BH = 18;
    const top = PAD + 20;
    const bottom = top + data.length * RH;
    let body = '';

    // value axis on top with hairline grid
    body += S.text(x0 - 10, PAD, 'Work packages', { size: 10.5, fill: pal.muted, anchor: 'end' });
    nt.ticks.forEach((v) => {
      const x = x0 + v * unit;
      body += S.line(x, top - 4, x, bottom, { stroke: v === 0 ? pal.axis : pal.grid });
      body += S.text(x, PAD, String(v), { size: 10.5, fill: pal.muted, anchor: 'middle' });
    });

    data.forEach((d, i) => {
      const y = top + i * RH;
      const by = y + (RH - BH) / 2;
      body += S.text(PAD, y + 4, S.fit(d.tag.name, labelW - 16, 12), { size: 12, fill: d.tag.ph ? pal.muted : pal.ink, italic: d.tag.ph });
      body += S.text(PAD, y + 19, [d.tag.short, d.tag.sub].filter(Boolean).join(' · '), { size: 10.5, fill: pal.muted });
      if (!d.total) {
        body += S.text(x0 + 6, by + BH / 2, 'no involvement', { size: 11, fill: pal.muted, italic: true, v: 'middle' });
        return;
      }
      const segs = LETTERS.filter((L) => d.c[L]);
      let cx = x0;
      segs.forEach((L, j) => {
        const w = d.c[L] * unit - (j < segs.length - 1 ? 2 : 0);
        const s = st[L];
        body += S.rect(cx + (s.stroke ? 0.5 : 0), by + (s.stroke ? 0.5 : 0), w - (s.stroke ? 1 : 0), BH - (s.stroke ? 1 : 0), { fill: s.fill, stroke: s.stroke, sw: 1, rx: 3 });
        if (w >= 16) body += S.text(cx + w / 2, by + BH / 2, String(d.c[L]), { size: 11, weight: 600, fill: s.ink, anchor: 'middle', v: 'middle' });
        cx += d.c[L] * unit;
      });
      body += S.text(x0 + d.total * unit + 6, by + BH / 2, String(d.total), { size: 11, weight: 600, fill: pal.ink2, v: 'middle' });
    });

    const lg = letterLegend(pal, PAD, bottom + 12, W - PAD * 2);
    body += lg.svg;
    return S.svg(W, bottom + 12 + lg.h + PAD, body, { pal, label: 'Number of work packages per person by R, C, A and I' });
  }

  // =====================================================================================
  // Graphic: RACI matrix
  // =====================================================================================
  function matrixEmpty(q) {
    if (!raciRows(q).length) return 'Add work packages to the WBS to see the RACI matrix.';
    if (!shownPeople(q).length) return 'Add people to the people list to see the RACI matrix.';
    return null;
  }

  function matrixSvg(q, pal) {
    const rows = raciRows(q);
    const people = shownPeople(q);
    const all = q.people();
    const tags = personTags(q, people);
    const st = letterStyle(pal);
    const flag = anyLetter(q, rows);
    const n = people.length;
    const colW = n > 14 ? 34 : 42;
    const codeW = 52;
    const sumW = 54;
    let nameW = 250;
    let W = PAD + codeW + nameW + n * colW + sumW + PAD;
    if (W < 680) {
      nameW += 680 - W;
      W = 680;
    }
    const RH = 22;
    const HH = 38;
    const xName = PAD + codeW;
    const xCols = xName + nameW;
    const xSum = xCols + n * colW;

    // group the work packages by phase (first two levels of the code)
    const phases = q.phases();
    const groups = [];
    const byPhase = new Map();
    rows.forEach((r) => {
      const pc = String(r.code).trim().split('.').slice(0, 2).join('.');
      let g = byPhase.get(pc);
      if (!g) {
        g = { code: pc, ph: phases.find((x) => String(x.code).trim() === pc), rows: [] };
        byPhase.set(pc, g);
        groups.push(g);
      }
      g.rows.push(r);
    });

    let body = '';
    // header
    const hy = PAD;
    body += S.text(PAD, hy + 14, 'WBS', { size: 11, weight: 600, fill: pal.ink2 });
    body += S.text(xName, hy + 14, 'Work package', { size: 11, weight: 600, fill: pal.ink2 });
    people.forEach((p, i) => {
      const t = tags[p._id];
      let a = t.short;
      let b = t.sub;
      if (!b && a.indexOf(' ') > 0) {
        b = a.slice(a.indexOf(' ') + 1);
        a = a.slice(0, a.indexOf(' '));
      }
      const cx = xCols + i * colW + colW / 2;
      const hs = S.measure(a, 11.5, 600) <= colW - 4 ? 11.5 : 10;
      body += S.text(cx, hy + 6, S.fit(a, colW - 3, hs, 600), { size: hs, weight: 600, fill: t.ph ? pal.muted : pal.ink, anchor: 'middle', italic: t.ph });
      if (b) body += S.text(cx, hy + 21, S.fit(b, colW - 2, 9.5), { size: 9.5, fill: pal.muted, anchor: 'middle' });
    });
    body += S.text(xSum + sumW / 2, hy + 14, 'People', { size: 11, weight: 600, fill: pal.ink2, anchor: 'middle' });

    let y = PAD + HH;
    const bodyTop = y;
    body += S.line(PAD, y, W - PAD, y, { stroke: pal.axis });
    let cells = '';
    let grid = '';
    groups.forEach((g) => {
      const label = g.ph ? q.label(g.ph, 'name') : 'Other work packages';
      body += S.rect(PAD, y, W - PAD * 2, RH, { fill: pal.box });
      body += S.text(PAD + 6, y + RH / 2, g.code, { size: 11, weight: 600, fill: pal.ink2, family: 'mono', v: 'middle' });
      body += S.text(xName, y + RH / 2, S.fit(label, W - PAD - xName - 8, 11.5, 600), { size: 11.5, weight: 600, fill: g.ph && q.isPlaceholder(g.ph, 'name') ? pal.muted : pal.ink2, italic: g.ph && q.isPlaceholder(g.ph, 'name'), v: 'middle' });
      y += RH;
      g.rows.forEach((r) => {
        const nR = all.filter((p) => letter(r, p) === 'R').length;
        const bad = flag && nR !== 1;
        const ph = q.isPlaceholder(r, 'name');
        body += S.text(PAD + 6, y + RH / 2, r.code, { size: 11, fill: bad ? pal.crit : pal.ink2, weight: bad ? 700 : 400, family: 'mono', v: 'middle' });
        body += S.text(xName, y + RH / 2, S.fit(q.label(r, 'name') || '(no name)', nameW - 10, 12), { size: 12, fill: ph ? pal.muted : pal.ink, italic: ph, v: 'middle' });
        let inv = 0;
        people.forEach((p, i) => {
          const L = letter(r, p);
          if (!L) return;
          inv += 1;
          const s = st[L];
          const cx = xCols + i * colW;
          cells += S.rect(cx + 3.5, y + 3.5, colW - 7, RH - 7, { fill: s.fill, stroke: s.stroke, sw: 1, rx: 3 });
          cells += S.text(cx + colW / 2, y + RH / 2, L, { size: 12, weight: 700, fill: s.ink, anchor: 'middle', v: 'middle' });
        });
        if (inv) body += S.text(xSum + sumW / 2, y + RH / 2, String(inv), { size: 11, fill: pal.ink2, anchor: 'middle', v: 'middle' });
        y += RH;
        grid += S.line(PAD, y, W - PAD, y, { stroke: pal.grid });
      });
    });
    const bodyBottom = y;
    for (let i = 0; i <= n; i++) {
      const x = xCols + i * colW;
      grid += S.line(x, bodyTop, x, bodyBottom, { stroke: pal.grid });
    }
    // totals row: work packages per person
    body += grid + cells;
    body += S.line(PAD, bodyBottom, W - PAD, bodyBottom, { stroke: pal.axis });
    const ty = bodyBottom + RH / 2 + 2;
    body += S.text(xCols - 10, ty, 'Work packages per person', { size: 11, fill: pal.muted, anchor: 'end', v: 'middle' });
    people.forEach((p, i) => {
      const cnt = rows.filter((r) => letter(r, p)).length;
      body += S.text(xCols + i * colW + colW / 2, ty, cnt ? String(cnt) : '–', { size: 11, weight: 600, fill: cnt ? pal.ink2 : pal.muted, anchor: 'middle', v: 'middle' });
    });

    const lg = letterLegend(pal, PAD, bodyBottom + RH + 14, W - PAD * 2);
    body += lg.svg;
    return S.svg(W, bodyBottom + RH + 14 + lg.h + PAD, body, { pal, label: 'RACI matrix: work packages by person' });
  }

  // =====================================================================================
  // Section 4.2a: RACI chart
  // =====================================================================================
  PM.section({
    id: 'raci',
    part: 'start',
    order: 42.1,
    num: '4.2',
    step: 'S2',
    slides: '105–108',
    title: 'Who does what: RACI chart',
    navTitle: 'RACI chart',
    intro: 'Decide for every work package who leads it, who works on it, who approves it and who is kept informed.',
    landscape: true,
    blocks: [
      { type: 'step', step: 'S2' },
      {
        type: 'guide',
        title: 'Three ways to record who does what',
        text: 'Pick the level of detail the project needs. Each way adds to the one before.',
        items: [
          'A list with the responsible person for each work package.',
          'Names or initials written into the WBS or the bar chart.',
          'A RACI chart: work packages as rows, people or roles as columns, a letter in each cell where someone is involved.',
        ],
        ordered: true,
      },
      {
        type: 'guide',
        title: 'The four letters',
        text: 'R and C are always used. A and I are optional; add them when approvals or reporting lines need to be clear.',
        items: [
          'R, responsible: leads the work package and delivers its result. Exactly one per work package.',
          'C, contributes: works on the package and supplies part of the result.',
          'A, accountable: approves the result, often the project owner.',
          'I, informed: hears about progress and results, without working on them.',
        ],
      },
      {
        type: 'note',
        text: 'The chart makes responsibilities explicit, gives target agreements a base, shows every person the number and kind of their tasks, and helps in conflicts and when planning staff.',
      },
      {
        type: 'callout',
        kind: 'tip',
        title: 'Fill it in twice',
        text: 'Make a first version now and complete it once the work package specifications are written. The specifications show who really has to contribute.',
      },
      {
        type: 'fields',
        title: 'Columns',
        cols: 2,
        fields: [
          {
            key: 'raci.columns', label: 'People shown as columns', kind: 'select', options: COLUMN_MODES, default: COLUMN_MODES[0],
            hint: 'Hidden people keep their letters; the checks still count them.',
          },
        ],
      },
      {
        type: 'table',
        key: 'raci',
        title: 'RACI chart',
        hint: 'One row per work package from the WBS. Put one R in every row, then add C, A and I where they apply.',
        from: 'wbs',
        filter: (r) => isWp(r),
        sort: 'code',
        compact: true,
        emptyText: 'Rows appear here once the WBS has work packages.',
        columns: raciColumns,
      },
      {
        type: 'checks',
        title: 'Checks',
        hint: 'The rules of the method applied to your chart.',
        run: raciChecks,
      },
      {
        type: 'graphic',
        title: 'Involvement per person',
        caption: 'How many work packages each person leads (R), works on (C), approves (A) or follows (I), sorted by total. Use it to spot overloaded people and people who are barely involved.',
        empty: involvementEmpty,
        render: involvementSvg,
      },
      {
        type: 'graphic',
        title: 'RACI matrix',
        caption: 'The chart as a picture for the PM plan, grouped by phase. The last column counts the people per work package, the last row the work packages per person. A red code marks a row without an R or with more than one.',
        empty: matrixEmpty,
        render: matrixSvg,
      },
    ],
  });

  // =====================================================================================
  // Work package specifications: data
  // =====================================================================================
  const SPEC_FIELDS = [
    { key: 'content', label: 'Content', kind: 'textarea', ph: 'What the work package includes: tasks, scope, standards to meet' },
    { key: 'nonContent', label: 'Not included (non-content)', kind: 'textarea', ph: 'What belongs to another work package or is left out on purpose' },
    { key: 'results', label: 'Results', kind: 'textarea', ph: (r) => r.result || 'What exists when the work package is done' },
    {
      key: 'progress', label: 'Measuring progress', kind: 'textarea', ph: 'e.g. Offers in = 25%, tasting held = 50%, contract signed = 100%',
      hint: 'Small milestones inside the work package, each with the share of work done when it is reached. Write them as "step = NN%".',
    },
    { key: 'days', label: 'Duration in this specification', kind: 'number', unit: 'days', ph: (r, q) => (sched(q, r._id).days ? String(sched(q, r._id).days) : '') },
    { key: 'resources', label: 'Resources', kind: 'textarea', ph: 'e.g. 12 PD event management, €2,000 external' },
    { key: 'notes', label: 'Notes', kind: 'textarea', ph: 'Open points, assumptions, interfaces' },
  ];
  const SPEC_TEXT_KEYS = ['content', 'nonContent', 'results', 'progress', 'days', 'resources', 'notes'];
  const fieldOf = (k) => SPEC_FIELDS.find((f) => f.key === k);

  PM.defineTable({
    key: 'wpSpecs',
    title: 'Work package specifications',
    from: 'wbs',
    filter: (r) => isWp(r),
    sort: 'code',
    columns: [
      { key: 'code', label: 'WBS', from: true, family: 'mono', w: 6 },
      { key: 'name', label: 'Work package', from: true, w: 22 },
      { key: 'content', label: 'Content', kind: 'textarea', w: 30 },
      { key: 'nonContent', label: 'Non-content', kind: 'textarea', w: 24 },
      { key: 'results', label: 'Results', kind: 'textarea', w: 24 },
      { key: 'progress', label: 'Measuring progress', kind: 'textarea', w: 30 },
      { key: 'days', label: 'Days', kind: 'number', w: 6 },
      { key: 'resources', label: 'Resources', kind: 'textarea', w: 20 },
      { key: 'notes', label: 'Notes', kind: 'textarea', w: 20 },
    ],
  });

  /** Schedule facts of a work package: calendar days, dates and predecessors. */
  function sched(q, id) {
    const d = q.dates(id) || {};
    return { days: U.spanDays(d), start: d.start, end: d.end, pred: d.pred || '' };
  }
  function schedText(q, id) {
    const s = sched(q, id);
    return s.days ? s.days + ' calendar days (' + q.date(s.start) + ' to ' + q.date(s.end) + ')' : 'No dates in the schedule yet';
  }
  function predText(q, id) {
    const parts = U.parsePred(sched(q, id).pred);
    if (!parts.length) return 'None';
    return parts
      .map((p) => {
        const w = q.wbsByCode(p.code);
        const rel = p.type !== 'FS' || p.lag ? ' ' + p.type + (p.lag ? (p.lag > 0 ? '+' : '') + p.lag : '') : '';
        return p.code + rel + (w ? ' ' + q.label(w, 'name') : ' (not in the WBS)');
      })
      .join('; ');
  }
  function metaText(q, r) {
    const sel = q.row('wpSelect', r._id) || {};
    return 'Responsible: ' + (q.name(r.responsible) || 'not set in the WBS') + ' · Status: ' + (sel.status || 'Not started');
  }

  /** Work packages that get a specification form: those marked Yes, or all when none is marked. */
  function specified(q) {
    const all = q.rows('wpSpecs').slice().sort(byCode);
    const yes = new Set(q.rows('wpSelect').filter((r) => r.spec === 'Yes').map((r) => r._id));
    if (yes.size) return { list: all.filter((r) => yes.has(r._id)), all: false };
    return { list: all, all: true };
  }

  /** "Offers in = 25%, contract signed = 100%" -> [{label, pct}] */
  function parseSteps(text) {
    const out = [];
    String(text || '')
      .split(/;|\n|,\s+/)
      .forEach((part) => {
        const s = part.trim().replace(/\.$/, '');
        const m = /^(.*?)\s*(?:=|:|–|-)\s*(\d{1,3}(?:[.,]\d+)?)\s*%$/.exec(s);
        if (m && m[1].trim()) out.push({ label: m[1].trim(), pct: Math.max(0, Math.min(100, parseFloat(m[2].replace(',', '.')))) });
      });
    return out;
  }

  // =====================================================================================
  // Custom block: one specification form per work package
  // =====================================================================================
  function cardHtml(q, r) {
    const id = r._id;
    const cid = (k) => PM.ui.id('c', 'wpSpecs', id, k);
    const fld = (k, wide) => {
      const f = fieldOf(k);
      const ph = typeof f.ph === 'function' ? f.ph(r, q) : f.ph;
      const ctrl = PM.ui.control({ key: k, kind: f.kind, label: f.label }, r[k], { id: cid(k), q, row: r, ro: q.readOnly, data: PM.ui.cell('wpSpecs', id, k, f.kind), ph });
      return '<div class="fld' + (wide ? ' wide' : '') + '"><label class="fld-l" for="' + cid(k) + '">' + esc(f.label) + (f.unit ? ' <span class="unit">(' + esc(f.unit) + ')</span>' : '') + '</label>' + ctrl + (f.hint ? '<small class="fld-h">' + esc(f.hint) + '</small>' : '') + '</div>';
    };
    const out = (label, key, text) => '<div class="fld"><span class="fld-l">' + esc(label) + '</span><output class="fld-out" data-wps-out="' + key + '">' + esc(text) + '</output></div>';
    return (
      '<div class="step-card" data-wps="' + esc(id) + '">' +
      '<div class="step-top"><span class="step-id" data-wps-out="code">' + esc(r.code) + '</span><div>' +
      '<h4 class="blk-t" data-wps-out="title">' + esc(q.label(r, 'name') || '(no name)') + '</h4>' +
      '<p class="hint" data-wps-out="meta">' + esc(metaText(q, r)) + '</p></div></div>' +
      '<div class="fields cols-2">' +
      fld('content', true) + fld('nonContent', true) + fld('results', true) + fld('progress', true) +
      out('Duration in the schedule', 'sched', schedText(q, id)) + fld('days') +
      out('Predecessors (from the schedule)', 'pred', predText(q, id)) + fld('resources') +
      fld('notes', true) +
      '</div></div>'
    );
  }

  function specSig(q, sp) {
    return (q.example ? 'x' : 'o') + (q.readOnly ? 'r' : 'w') + (sp.all ? 'a' : 's') + ':' + sp.list.map((r) => r._id).join(',');
  }

  function renderSpecs(el, q) {
    const sp = specified(q);
    let html = '<div class="tbl-head"><h3 class="blk-t">Specifications</h3></div>';
    if (!sp.list.length) {
      html += '<p class="hint">Add work packages to the WBS first. A specification form then appears here for each one you mark.</p>';
    } else {
      html += '<p class="hint">' + (sp.all
        ? 'No work package is marked yet, so every work package has a form. Mark the ones that need a specification in the table above to keep only those.'
        : 'One form per work package marked "Yes" above, in WBS order. The responsible person writes it; the team agrees it.') + '</p>';
      html += '<div style="display:grid;gap:14px">' + sp.list.map((r) => cardHtml(q, r)).join('') + '</div>';
    }
    el.innerHTML = html;
    el.querySelectorAll('textarea').forEach((ta) => PM.ui.autosize(ta));
    el._wpsSig = specSig(q, sp);
  }

  function updateSpecs(el, q) {
    const sp = specified(q);
    if (el._wpsSig !== specSig(q, sp)) {
      renderSpecs(el, q);
      return;
    }
    const byId = new Map(sp.list.map((r) => [r._id, r]));
    el.querySelectorAll('[data-wps]').forEach((card) => {
      const r = byId.get(card.getAttribute('data-wps'));
      if (!r) return;
      const set = (k, t) => {
        const o = card.querySelector('[data-wps-out="' + k + '"]');
        if (o && o.textContent !== t) o.textContent = t;
      };
      set('code', r.code || '');
      set('title', q.label(r, 'name') || '(no name)');
      set('meta', metaText(q, r));
      set('sched', schedText(q, r._id));
      set('pred', predText(q, r._id));
      const dayIn = card.querySelector('[data-c="days"]');
      const ph = fieldOf('days').ph(r, q);
      if (dayIn && dayIn.getAttribute('placeholder') !== ph) dayIn.setAttribute('placeholder', ph);
    });
    el.querySelectorAll('[data-k="wpSpecs"]').forEach((c) => {
      if (c === document.activeElement) return;
      const row = byId.get(c.getAttribute('data-r'));
      const raw = row ? row[c.getAttribute('data-c')] : '';
      const v = raw == null ? '' : String(raw);
      if (c.value !== v) {
        c.value = v;
        if (c.tagName === 'TEXTAREA') PM.ui.autosize(c);
      }
    });
  }

  function exportSpecs(q, opts) {
    const sp = specified(q);
    const empty = !opts || opts.empty !== false;
    const filled = (r) => SPEC_TEXT_KEYS.some((k) => !U.isEmpty(r[k]));
    const chosen = sp.all ? sp.list.filter(filled) : sp.list;
    const out = [];
    if (!chosen.length) {
      if (!empty) return [];
      out.push({ type: 'h3', text: 'Work package specification (form)' });
      out.push({
        type: 'table', kv: true, fontSize: 9,
        columns: [{ label: 'Field', width: 1 }, { label: 'Value', width: 3.2 }],
        rows: ['WBS code and name', 'Responsible', 'Content', 'Non-content', 'Results', 'Measuring progress', 'Duration', 'Resources', 'Predecessors', 'Notes'].map((l) => [l, '']),
      });
      return out;
    }
    chosen.forEach((r) => {
      const sel = q.row('wpSelect', r._id) || {};
      const s = sched(q, r._id);
      const d = Number(U.num(r.days));
      let dur = '';
      if (d > 0) dur = d + ' days' + (s.days ? ' (schedule: ' + s.days + ' calendar days)' : '');
      else if (s.days) dur = s.days + ' calendar days (from the schedule)';
      const rows = [
        ['Responsible', q.name(r.responsible) || ''],
        ['Status', sel.status || ''],
        ['Content', r.content || ''],
        ['Non-content', r.nonContent || ''],
        ['Results', r.results || ''],
        ['Measuring progress', r.progress || ''],
        ['Duration', dur],
        ['Resources', r.resources || ''],
        ['Predecessors', s.pred ? predText(q, r._id) : ''],
        ['Notes', r.notes || ''],
      ].filter((x) => empty || x[1]);
      out.push({ type: 'h3', text: 'WP ' + r.code + ' ' + (q.label(r, 'name') || '') });
      out.push({ type: 'table', kv: true, fontSize: 9, columns: [{ label: 'Field', width: 1 }, { label: 'Value', width: 3.2 }], rows });
    });
    return out;
  }

  // =====================================================================================
  // Graphic: progress measurement ladders
  // =====================================================================================
  function ladderItems(q) {
    return specified(q)
      .list.map((r) => ({ r, steps: parseSteps(r.progress) }))
      .filter((x) => x.steps.length);
  }

  function ladderSvg(q, pal) {
    const items = ladderItems(q);
    const cols = items.length > 1 ? 2 : 1;
    const PW = 440;
    const GAP = 16;
    const W = PAD * 2 + cols * PW + (cols - 1) * GAP;
    const AX = 40;
    const SH = 72;
    const LS = 11;
    const LH = LS * 1.25;
    const panels = items.map((it) => {
      const sw = (PW - AX - 14) / it.steps.length;
      const lines = Math.max.apply(null, it.steps.map((s) => Math.min(3, S.wrap(s.label, sw - 8, LS).length)));
      return { it, sw, h: 12 + 18 + 22 + SH + 8 + lines * LH + 10 };
    });
    let body = '';
    let y = PAD;
    for (let i = 0; i < panels.length; i += cols) {
      const rowPanels = panels.slice(i, i + cols);
      const rh = Math.max.apply(null, rowPanels.map((p) => p.h));
      rowPanels.forEach((pn, j) => {
        const px = PAD + j * (PW + GAP);
        const r = pn.it.r;
        body += S.rect(px + 0.5, y + 0.5, PW - 1, rh - 1, { stroke: pal.line, rx: 8 });
        // title: code, name, owner
        const codeW = S.measure(r.code, 12, 600, 'mono') + 10;
        const owner = q.initials(r.responsible);
        const ownW = owner ? S.measure(owner, 11) + 8 : 0;
        body += S.text(px + 12, y + 12, r.code, { size: 12, weight: 600, family: 'mono', fill: pal.ink });
        body += S.text(px + 12 + codeW, y + 12, S.fit(q.label(r, 'name') || '', PW - 24 - codeW - ownW, 12, 600), { size: 12, weight: 600, fill: pal.ink });
        if (owner) body += S.text(px + PW - 12, y + 12, owner, { size: 11, fill: pal.muted, anchor: 'end' });
        const base = y + 12 + 18 + 22 + SH;
        const xs = px + AX;
        const xe = px + PW - 14;
        [0, 50, 100].forEach((v) => {
          const gy = base - (v / 100) * SH;
          body += S.line(xs, gy, xe, gy, { stroke: v ? pal.grid : pal.axis });
          body += S.text(xs - 6, gy, v + '%', { size: 10, fill: pal.muted, anchor: 'end', v: 'middle' });
        });
        pn.it.steps.forEach((s, k) => {
          const x = xs + k * pn.sw;
          const top = base - (s.pct / 100) * SH;
          const done = s.pct >= 100;
          if (base - top > 0) body += S.rect(x + 1, top, pn.sw - 2, base - top, { fill: done ? pal.accent : pal.accentSoft });
          body += S.line(x + 1, top, x + pn.sw - 1, top, { stroke: pal.accent, sw: 2 });
          body += S.text(x + pn.sw / 2, top - 4, q.num(s.pct) + '%', { size: 11, weight: 600, fill: pal.ink, anchor: 'middle', v: 'base' });
          body += S.textBlock(x + pn.sw / 2, base + 8, s.label, { maxW: pn.sw - 8, size: LS, maxLines: 3, anchor: 'middle', fill: pal.ink2 }).svg;
        });
      });
      y += rh + GAP;
    }
    return S.svg(W, y - GAP + PAD, body, { pal, label: 'Progress steps inside each specified work package' });
  }

  // =====================================================================================
  // Checks for the specifications
  // =====================================================================================
  function specChecks(q) {
    const sel = q.rows('wpSelect').slice().sort(byCode);
    if (!sel.length) return [{ ok: null, text: 'Add work packages to the WBS first.' }];
    const yes = sel.filter((r) => r.spec === 'Yes');
    if (!yes.length) return [{ ok: null, text: 'Mark the work packages that need a specification in the column "Needs a specification".' }];
    const out = [];
    const agreed = yes.filter((r) => r.status === 'Agreed').length;
    out.push({ ok: null, text: yes.length + ' of ' + sel.length + ' work packages need a specification; ' + agreed + ' of them agreed.' });

    const miss = [];
    const not100 = [];
    const diff = [];
    const unknown = [];
    let compared = 0;
    yes.forEach((r) => {
      const s = q.row('wpSpecs', r._id) || {};
      const m = [];
      if (U.isEmpty(s.content)) m.push('content');
      if (U.isEmpty(s.results)) m.push('results');
      if (U.isEmpty(s.progress)) m.push('measuring progress');
      if (m.length) miss.push(r.code + ' ' + m.join(', '));
      const steps = parseSteps(s.progress);
      if (steps.length && Math.max.apply(null, steps.map((x) => x.pct)) < 100) not100.push(r.code);
      const d = Number(U.num(s.days));
      const sd = sched(q, r._id).days;
      if (d > 0 && sd) {
        compared += 1;
        if (Math.abs(d - sd) / sd > 0.2) diff.push(r.code + ' (' + d + ' against ' + sd + ' days)');
      }
      U.parsePred(sched(q, r._id).pred).forEach((p) => {
        if (!q.wbsByCode(p.code)) unknown.push(r.code + ' needs ' + p.code);
      });
    });
    out.push(miss.length
      ? { ok: false, text: 'Missing in the specification: ' + miss.join('; ') + '.' }
      : { ok: true, text: 'Every marked work package has content, results and a way to measure progress.' });
    if (not100.length) out.push({ ok: false, text: 'Progress steps do not reach 100%: ' + list(not100) + '. The last step should mark the work package as done.' });
    if (diff.length) out.push({ ok: false, text: 'Duration differs from the schedule by more than 20%: ' + diff.join(', ') + '. Update the specification or the schedule.' });
    else if (compared) out.push({ ok: true, text: 'Durations in the specifications match the schedule within 20%.' });
    if (unknown.length) out.push({ ok: null, text: 'Predecessors not found in the WBS: ' + unknown.join(', ') + '.' });
    return out;
  }

  // =====================================================================================
  // Section 4.2b: work package specifications
  // =====================================================================================
  PM.section({
    id: 'wpspecs',
    part: 'start',
    order: 42.2,
    num: '4.2',
    step: 'S2',
    slides: '110–114',
    title: 'Work package specifications',
    intro: 'Describe the larger or riskier work packages in a short, agreed form, so that the responsible person and the PM mean the same thing.',
    blocks: [
      {
        type: 'guide',
        title: 'What a specification is for',
        text: 'It gives the PM and the work package owner the same picture, avoids duplicated work and idle time, makes schedule, staff and cost estimates more reliable and makes progress measurable.',
        items: [
          'Settle who is responsible for each work package (RACI chart) and choose the work packages that need a specification.',
          'Agree a template if the one below does not fit.',
          'Define the specifications together with the whole team.',
          'Each responsible person works out the specification for their work package.',
          'Agree the specifications in the team, across all disciplines.',
          'Adapt, detail or extend the schedule, staff and cost plans where needed.',
        ],
        ordered: true,
      },
      {
        type: 'callout',
        kind: 'tip',
        title: 'Measure progress with steps',
        text: 'Split a long work package into a few visible steps and give each the share of work done when it is reached, for example "offers in = 25%". Progress is then counted, not guessed.',
      },
      {
        type: 'table',
        key: 'wpSelect',
        title: 'Which work packages need a specification',
        hint: 'Mark the work packages that are large, new, risky or shared by several people.',
        from: 'wbs',
        filter: (r) => isWp(r),
        sort: 'code',
        compact: true,
        emptyText: 'Rows appear here once the WBS has work packages.',
        columns: [
          { key: 'code', label: 'WBS', from: true, family: 'mono', w: 6 },
          { key: 'name', label: 'Work package', from: true, w: 24 },
          { key: 'owner', label: 'Responsible', sub: 'from the WBS', kind: 'text', w: 14, compute: (r, q) => q.name(r.responsible) || '' },
          { key: 'spec', label: 'Needs a specification', kind: 'select', options: ['Yes', 'No'], w: 9 },
          { key: 'status', label: 'Status', kind: 'select', options: ['Not started', 'Draft', 'Agreed'], w: 10 },
          { key: 'note', label: 'Note', kind: 'text', w: 22, placeholder: 'Why, or who else is involved' },
        ],
      },
      {
        type: 'custom',
        keys: ['x:wpSpecs'],
        render: renderSpecs,
        update: updateSpecs,
        exportBlocks: exportSpecs,
      },
      {
        type: 'graphic',
        title: 'Progress measurement',
        caption: 'One ladder per specified work package: each column is a step inside the work package and the share of work done when it is reached. The filled column is 100%.',
        empty: (q) => (ladderItems(q).length ? null : 'Write the progress steps of a work package as "step = NN%" to see its ladder.'),
        render: ladderSvg,
      },
      {
        type: 'checks',
        title: 'Checks',
        hint: 'Completeness of the marked specifications and their fit with the schedule.',
        run: specChecks,
      },
    ],
  });

  // =====================================================================================
  // Metrics
  // =====================================================================================
  PM.metric('raciOneR', {
    label: 'Work packages with one R',
    kind: 'text',
    section: 'raci',
    fn: (q) => {
      const rows = raciRows(q);
      if (!rows.length || !anyLetter(q, rows)) return null;
      const people = q.people();
      return rows.filter((r) => people.filter((p) => letter(r, p) === 'R').length === 1).length + ' of ' + rows.length;
    },
  });
  PM.metric('wpSpecsAgreed', {
    label: 'WP specifications agreed',
    kind: 'text',
    section: 'wpspecs',
    fn: (q) => {
      const yes = q.rows('wpSelect').filter((r) => r.spec === 'Yes');
      return yes.length ? yes.filter((r) => r.status === 'Agreed').length + ' of ' + yes.length : null;
    },
  });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  const RACI_EX = {
    w111: 'p1A p2R p3C p4C p5C p6C p9C p10I',
    w112: 'p1I p2R p3C p4C p5C p6C p9C',
    w113: 'p1I p2R p6C p9C p10I',
    w114: 'p1A p2R p3C p6C p9C p10I',
    w121: 'p1I p3R p5C p8C',
    w122: 'p1I p2C p3R p4C p5C p6C',
    w123: 'p1A p2R p3C p6C p10I',
    w131: 'p1I p4R p6C p7C',
    w132: 'p3C p4R p6C p7C',
    w133: 'p1I p3R p4C p6C',
    w134: 'p2I p3C p4R p7C',
    w135: 'p1I p5C p6R p9C',
    w141: 'p1I p3C p5R p8C',
    w142: 'p1I p5R p8C p9C',
    w143: 'p4I p5R p8C p9C',
    w151: 'p3C p4R p7C p8C',
    w152: 'p1I p2R p3C p4C p5C p6C p7C p8C p9C p10I',
    w153: 'p4R p6I p7C p9C',
    w161: 'p1I p3C p5R p8C',
    w162: 'p1A p2C p3R p5C p6C p9I p10I',
    w163: 'p1I p2I p4C p6R p9C',
  };
  const raciEx = {};
  Object.keys(RACI_EX).forEach((w) => {
    raciEx[w] = {};
    RACI_EX[w].split(/\s+/).forEach((t) => {
      const m = /^(p\d+)([RCAI])$/.exec(t);
      if (m) raciEx[w]['p_' + m[1]] = m[2];
    });
  });

  const SEL_YES = ['w122', 'w131', 'w132', 'w134', 'w142', 'w151', 'w152'];
  const selEx = {};
  Object.keys(RACI_EX).forEach((w) => {
    selEx[w] = SEL_YES.includes(w) ? { spec: 'Yes', status: 'Agreed' } : { spec: 'No' };
  });
  selEx.w111.note = 'Covered by the PM plan';
  selEx.w112.note = 'Covered by the PM plan';
  selEx.w113.note = 'Covered by the PM plan';
  selEx.w114.note = 'Covered by the PM plan';
  selEx.w133.note = 'Programme list is detailed enough';
  selEx.w122.note = 'Base for all later work packages';
  selEx.w134.note = 'Needs the authority, high risk';
  selEx.w152.note = 'Whole team on the day';

  PM.example({
    f: { 'raci.columns': 'All people' },
    x: {
      raci: raciEx,
      wpSelect: selEx,
      wpSpecs: {
        w122: {
          content: 'Turn the survey results into a festival concept: motto, programme outline for adults and children, food and drink idea, rough site layout and a budget frame. Test the draft with the core team.',
          nonContent: 'Booking artists, caterers or the venue; detailed safety planning.',
          results: 'Festival concept (12 pages) with motto, programme outline, site sketch and budget frame, ready for approval.',
          progress: 'Survey analysed = 20%, three concept options drafted = 50%, option chosen with the core team = 75%, concept document final = 100%',
          resources: '12 PD Lea Novak, 4 PD core team for the concept workshop',
          notes: 'Goes to the sponsor on 23 March for approval (WP 1.2.3).',
        },
        w131: {
          content: 'List the venue requirements (400 guests, shade, parking, power, toilets), visit three possible sites, compare the offers and negotiate the contract.',
          nonContent: 'Furnishing and decorating the venue; permits from the authority (WP 1.3.4).',
          results: 'Signed venue contract for 26 to 28 June, including the set-up and dismantling days.',
          progress: 'Requirements listed = 20%, three sites visited = 50%, offers compared = 70%, contract signed = 100%',
          resources: '6 PD Tom Schmid, 3 PD Mia Fischer, rent €6,500',
          notes: 'Signed on 14 April, four days late because the owner was on holiday.',
        },
        w132: {
          content: 'Write the catering brief from the concept (menu for adults and children, vegetarian and vegan dishes, drinks), get three offers, hold a tasting and sign the contract.',
          nonContent: 'Serving staff on the day (steered in WP 1.5.2); the ice cream stand paid by a sponsor.',
          results: 'Catering contract with final menu, quantities for 420 guests and a cancellation clause.',
          progress: 'Brief sent to three caterers = 25%, offers in = 50%, tasting held = 75%, contract signed = 100%',
          days: 24,
          resources: '5 PD Tom Schmid, 2 PD Mia Fischer, 1 PD Jonas Weber for the contract check',
        },
        w134: {
          content: 'Plan stage, sound, light and power with the technical service; write the safety concept (escape routes, first aid, security staff, bad-weather plan) and get it approved by the authority.',
          nonContent: 'Artists\' own equipment; Wi-Fi for guests.',
          results: 'Technical plan confirmed by the service provider and safety concept approved by the authority.',
          progress: 'Technical needs listed = 20%, technical service contracted = 40%, safety concept submitted = 70%, approval received = 100%',
          resources: '10 PD Tom Schmid, 6 PD Mia Fischer, external safety consultant for 3 days',
          notes: 'Approval came on 9 June after one round of questions from the authority.',
        },
        w142: {
          content: 'Send the invitation by e-mail and on the intranet, put up posters at all sites, send two reminders and answer questions from employees.',
          nonContent: 'Designing the invitation (WP 1.4.1); handling the registrations (WP 1.4.3).',
          results: 'Every employee invited, two reminders sent, intranet page live.',
          progress: 'Invitation sent = 40%, posters up at all sites = 60%, first reminder sent = 80%, second reminder sent = 100%',
          days: 40,
          resources: '6 PD Sara Kovac, 6 PD Ben Wolf, printing €900',
        },
        w151: {
          content: 'Put up tents, stage, signs and food stands; connect power and water; final walk-through with the safety officer.',
          nonContent: 'Decoration ideas (part of the concept); dismantling (WP 1.5.3).',
          results: 'Venue ready and inspected on the evening before the festival.',
          progress: 'Tents and stage up = 40%, power and water connected = 60%, stands and signs in place = 85%, safety inspection passed = 100%',
          resources: '4 PD Tom Schmid, 4 PD Mia Fischer, 2 PD Ben Wolf, set-up crew of the technical service',
        },
        w152: {
          content: 'Lead the festival day from the control tent: team briefing at 8:00, opening at 11:00, programme on two stages, closing at 22:00; handle incidents and guest questions.',
          nonContent: 'Set-up on the day before and clean-up on the day after.',
          results: 'Festival held for 412 guests without serious incidents.',
          progress: 'Team briefed = 10%, gates open = 30%, afternoon programme run = 70%, festival closed and site secured = 100%',
          resources: '8 PD project team (8 people for one day), 12 volunteer helpers from the staff',
          notes: 'The bad-weather plan was not needed.',
        },
      },
    },
  });
})();
