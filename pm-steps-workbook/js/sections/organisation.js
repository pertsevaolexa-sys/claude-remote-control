/* Framework section 4.1: project organisation (chart, roles, expectations, incorporation) and communication, culture and team development. */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const W = 960; // width of every drawing in this file
  const P = 16;

  // =====================================================================================
  // Shared helpers
  // =====================================================================================
  const has = (p, r) => !!p && Array.isArray(p.roles) && p.roles.includes(r);
  const norm = (s) => String(s || '').trim().toLowerCase();
  const r1 = (n) => Math.round(n * 10) / 10;

  const ROLE_LABEL = {
    'Project owner': 'Project owner', 'Project manager': 'Project manager', PMTM: 'Core team member',
    'Team member': 'Team member', 'Project assistant': 'Project assistant', 'Project coach': 'Project coach',
    'PSC member': 'Board member', PMO: 'PMO', Expert: 'Expert', 'External partner': 'External partner',
  };
  const mainRole = (p) => {
    const r = ((p && p.roles) || [])[0];
    return r ? ROLE_LABEL[r] || r : 'No role yet';
  };
  const pName = (q, p) => (p ? p.name || q.label(p, 'name') || p.initials || 'Unnamed' : '');

  // ---------- organisational incorporation: reference data ----------
  const FORMS = [
    { id: 'Influence organisation', short: 'Influence', key: 'infl' },
    { id: 'Matrix organisation', short: 'Matrix', key: 'matrix' },
    { id: 'Pure project organisation', short: 'Pure project', key: 'pure' },
  ];
  const INC = [
    { _id: 'what', q: 'What?', content: 'Work package, content', staff: 'Tasks, competencies', infl: 'Line', matrix: 'PM', pure: 'PM' },
    { _id: 'when', q: 'When?', content: 'WP dates, deadlines', staff: 'Holidays, time off', infl: 'Line', matrix: 'PM', pure: 'PM' },
    { _id: 'how', q: 'How?', content: 'Methods, procedures', staff: 'Qualifications, equipment', infl: 'Line', matrix: 'Line', pure: 'PM' },
    { _id: 'howgood', q: 'How good?', content: 'Quality', staff: 'Performance assessment', infl: 'Line', matrix: 'Line', pure: 'PM' },
    { _id: 'howmuch', q: 'How much?', content: 'Resources, costs', staff: 'Salary, bonus', infl: 'Line', matrix: 'PM', pure: 'PM' },
    { _id: 'who', q: 'Who?', content: 'Responsible person for the WP', staff: 'Selection of team members', infl: 'Line', matrix: 'Line', pure: 'PM' },
  ];
  const FORM_REF = [
    {
      _id: 'influence', form: 'Influence organisation',
      position: 'Coordinates from a staff position without authority to decide',
      adv: 'Team members stay in their departments; continuous workload; heads of department keep control of the resources',
      dis: 'Long decision paths; line work often comes first; low identification with the project; escalation through the line is laborious',
    },
    {
      _id: 'pure', form: 'Pure project organisation',
      position: 'Leads a temporary organisational unit with full authority to decide',
      adv: 'Full concentration on the project; fast decisions; strong identification',
      dis: 'Staff have to be released and re-integrated; continuous workload for project staff has to be ensured; people may lose touch with the home organisation',
    },
    {
      _id: 'matrix', form: 'Matrix organisation',
      position: 'Cross-sectional function with responsibility for the whole project',
      adv: 'Flexible use of staff; specialists are coordinated; team members stay anchored in their departments',
      dis: 'Team members report twice; resource management is demanding; highest coordination effort of the three',
    },
  ];
  const FORM_CAPTION = {
    infl: 'The PM coordinates from a staff position without authority. Team members stay in their departments.',
    matrix: 'Team members stay in their departments and report to their line manager and to the PM.',
    pure: 'Team members move into a project unit led by the PM, who decides on content and staff.',
  };

  /** Scores of the three forms against the user's answers. Shared counts half for Line and PM. */
  function formScores(q) {
    const rows = q.rows('orgIncorporation');
    const score = { infl: 0, matrix: 0, pure: 0 };
    const counts = { Line: 0, PM: 0, Shared: 0 };
    let n = 0;
    rows.forEach((r) => {
      const ref = INC.find((x) => x._id === r._id);
      if (!ref) return;
      ['contentDec', 'staffDec'].forEach((c) => {
        const v = r[c];
        if (!v || counts[v] === undefined) return;
        n += 1;
        counts[v] += 1;
        FORMS.forEach((f) => {
          score[f.key] += v === 'Shared' ? 0.5 : v === ref[f.key] ? 1 : 0;
        });
      });
    });
    if (!n) return null;
    let best = FORMS[0];
    FORMS.forEach((f) => {
      if (score[f.key] > score[best.key]) best = f;
    });
    const ties = FORMS.filter((f) => score[f.key] === score[best.key]);
    return { n, score, counts, best, ties };
  }
  function suggestionText(q) {
    const s = formScores(q);
    if (!s) return '';
    const pts = r1(s.score[s.best.key]) + ' of ' + s.n + ' points';
    if (s.ties.length > 1) return s.ties.map((f) => f.id).join(' or ') + ' (tie, ' + pts + ')';
    return s.best.id + ' (' + pts + ')';
  }

  // ---------- communication plan helpers ----------
  const RHYTHMS = ['Weekly', 'Every 2 weeks', 'Every 4 weeks', 'Monthly', 'Quarterly', 'As required', 'Once'];
  const STEP_DAYS = { Weekly: 7, 'Every 2 weeks': 14, 'Every 4 weeks': 28 };
  const STEP_MONTHS = { Monthly: 1, Quarterly: 3 };

  function addMonths(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const t = m - 1 + n;
    const yy = y + Math.floor(t / 12);
    const mm = ((t % 12) + 12) % 12;
    const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
    return yy + '-' + String(mm + 1).padStart(2, '0') + '-' + String(Math.min(d, last)).padStart(2, '0');
  }
  /** Dates of a meeting from its first date and rhythm up to `end`. 'req' for "As required", null without a first date. */
  function occurrences(row, end) {
    const r = row.rhythm;
    if (r === 'As required') return 'req';
    const f = row.first;
    if (!f || !U.isDate(f)) return null;
    if (!r || r === 'Once') return [f];
    const out = [];
    for (let i = 0; i < 800; i++) {
      const d = STEP_DAYS[r] ? U.addDays(f, STEP_DAYS[r] * i) : addMonths(f, (STEP_MONTHS[r] || 1) * i);
      if (end && d > end) break;
      out.push(d);
      if (!end) break;
    }
    return out;
  }
  function commRange(q) {
    const pd = q.projectDates();
    const firsts = q.rows('orgComm').map((r) => r.first).filter((d) => U.isDate(d));
    let start = U.minDate([pd.start].concat(firsts).filter(Boolean));
    let end = U.maxDate([pd.end].concat(firsts).filter(Boolean));
    if (!start || !end) return null;
    if (!pd.end) end = U.addDays(end, 90);
    if (end < start) return null;
    return { start, end };
  }

  // =====================================================================================
  // Graphic: organisation chart
  // =====================================================================================
  function orgModel(q) {
    const people = q.people();
    const used = new Set();
    const take = (fn) =>
      people.filter((p) => !used.has(p._id) && fn(p)).map((p) => {
        used.add(p._id);
        return p;
      });
    const board = take((p) => has(p, 'Project owner') || has(p, 'PSC member')).sort((a, b) => (has(b, 'Project owner') ? 1 : 0) - (has(a, 'Project owner') ? 1 : 0));
    const pms = take((p) => has(p, 'Project manager'));
    const staff = take((p) => has(p, 'Project assistant') || has(p, 'Project coach'));
    const core = take((p) => has(p, 'PMTM'));
    const others = people.filter((p) => !used.has(p._id));

    const teams = [];
    const byName = {};
    q.rows('orgSubteams').forEach((r) => {
      const name = q.label(r, 'name');
      const ph = q.isPlaceholder(r, 'name');
      const mem = (r.members || []).filter((id) => q.person(id));
      if (!name && !r.lead && !mem.length) return;
      const lead = q.person(r.lead) ? r.lead : '';
      const t = { name: name || 'Unnamed sub-team', ph: ph || !name, type: r.type || '', lead, members: [], decision: r.decision || '', meets: r.meets || '' };
      mem.forEach((id) => {
        if (id !== lead && !t.members.includes(id)) t.members.push(id);
      });
      teams.push(t);
      if (!t.ph && !byName[norm(name)]) byName[norm(name)] = t;
    });
    people.forEach((p) => {
      const k = norm(p.subteam);
      if (!k) return;
      let t = byName[k];
      if (!t) {
        t = { name: String(p.subteam).trim(), implicit: true, type: '', lead: '', members: [], decision: '', meets: '' };
        byName[k] = t;
        teams.push(t);
      }
      if (p._id !== t.lead && !t.members.includes(p._id)) t.members.push(p._id);
    });
    teams.forEach((t) => {
      if (t.implicit && !t.lead) {
        const l = t.members.find((id) => has(q.person(id), 'PMTM'));
        if (l) {
          t.lead = l;
          t.members = t.members.filter((x) => x !== l);
        }
      }
    });
    const inTeam = new Set();
    teams.forEach((t) => {
      if (t.lead) inTeam.add(t.lead);
      t.members.forEach((id) => inTeam.add(id));
    });
    const loose = others.filter((p) => !inTeam.has(p._id) && (p.name || (p.roles || []).length));
    // core team order: leads in sub-team order first
    const order = [];
    teams.forEach((t) => {
      if (t.lead && core.some((p) => p._id === t.lead) && !order.includes(t.lead)) order.push(t.lead);
    });
    core.sort((a, b) => {
      const ia = order.indexOf(a._id);
      const ib = order.indexOf(b._id);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    const leads = {};
    teams.forEach((t) => {
      if (t.lead && !leads[t.lead]) leads[t.lead] = t.name;
    });
    return { board, pms, staff, core, teams, loose, leads };
  }

  function renderOrgChart(q, pal) {
    const m = orgModel(q);
    const BW = 128;
    const BH = 46;
    const G = 12;
    const st = {
      po: { fill: pal.strong, stroke: pal.strong, color: pal.strongInk, ph: pal.strongInk },
      board: { fill: pal.box, stroke: pal.boxLine, color: pal.ink, ph: pal.muted, sub: pal.ink2 },
      pm: { fill: pal.accent, stroke: pal.accent, color: pal.accentInk, ph: pal.accentInk },
      core: { fill: pal.bg, stroke: pal.accent, color: pal.ink, ph: pal.muted, sub: pal.ink2 },
      staff: { fill: pal.bg, stroke: pal.ink2, dash: '4 3', color: pal.ink, ph: pal.muted, sub: pal.ink2 },
    };
    const lineC = pal.muted;
    const pbox = (x, y, p, empty, sub, sty) => {
      const ph = !p || !p.name;
      if (ph) {
        empty = sub;
        sub = 'name not set yet';
      }
      return S.box(x, y, BW, BH, ph ? empty : pName(q, p), {
        fill: sty.fill, stroke: sty.stroke, dash: sty.dash, sw: sty.dash ? 1.2 : 1,
        color: ph ? sty.ph : sty.color, italic: ph, sub, subColor: sty.sub || sty.color,
        size: 12, maxLines: 1, subMaxLines: 2,
      });
    };
    let s = '';
    let y = P;

    // ---- project board ----
    const board = m.board.length ? m.board : [null];
    const perB = 6;
    const bRows = Math.ceil(board.length / perB);
    const bCols = Math.min(board.length, perB);
    const fW = Math.max(bCols * BW + (bCols - 1) * G + 28, 220);
    const fX = (W - fW) / 2;
    const fH = 28 + bRows * (BH + G) - G + 12;
    s += S.rect(fX, y, fW, fH, { rx: 10, stroke: pal.boxLine, dash: '5 4' });
    s += S.text(fX + 12, y + 8, 'Project board', { size: 12, weight: 600, fill: pal.ink2 });
    board.forEach((p, i) => {
      const row = Math.floor(i / perB);
      const col = i % perB;
      const nIn = Math.min(perB, board.length - row * perB);
      const bx = (W - (nIn * BW + (nIn - 1) * G)) / 2 + col * (BW + G);
      const by = y + 28 + row * (BH + G);
      const isPO = !p || has(p, 'Project owner');
      s += pbox(bx, by, p, 'Project owner', isPO ? 'Project owner' : has(p, 'PSC member') ? 'Board member' : mainRole(p), isPO ? st.po : st.board);
    });
    const boardBottom = y + fH;
    y = boardBottom + 30;

    // ---- core team band with the PM, staff beside it ----
    const pms = m.pms.length ? m.pms : [null];
    const core = m.core.length ? m.core : [null];
    const staffL = [];
    const staffR = [];
    m.staff.forEach((p, i) => (i % 2 ? staffR : staffL).push(p));
    const side = m.staff.length ? BW + 28 : 0;
    const bandMax = W - 2 * P - 2 * side;
    const perC = Math.max(1, Math.floor((bandMax - 32 + G) / (BW + G)));
    const cRows = Math.ceil(core.length / perC);
    const cCols = Math.min(core.length, perC);
    const pmCols = Math.min(pms.length, perC);
    const innerW = Math.max(cCols * BW + (cCols - 1) * G, pmCols * BW + (pmCols - 1) * G);
    const bandW = Math.min(bandMax, Math.max(innerW + 36, 520));
    const bandX = (W - bandW) / 2;
    const bandY = y;
    const pmY = bandY + 30;
    const coreY = pmY + BH + 24;
    const bandH = coreY - bandY + cRows * (BH + G) - G + 16;
    s += S.rect(bandX, bandY, bandW, bandH, { rx: 22, fill: pal.accentSoft, stroke: pal.accent, sw: 1 });
    s += S.text(bandX + 18, bandY + 9, 'Core team (project management team)', { size: 12, weight: 600, fill: pal.ink2 });
    s += S.line(W / 2, boardBottom, W / 2, pms.length === 1 ? pmY : bandY, { stroke: lineC, sw: 1.5 });
    const pmRowW = pmCols * BW + (pmCols - 1) * G;
    pms.forEach((p, i) => {
      s += pbox((W - pmRowW) / 2 + (i % perC) * (BW + G), pmY + Math.floor(i / perC) * (BH + G), p, 'Project manager', 'Project manager', st.pm);
    });
    // PM to the first row of core team members
    const row1 = Math.min(core.length, perC);
    const row1W = row1 * BW + (row1 - 1) * G;
    const row1X = (W - row1W) / 2;
    const busY = coreY - 12;
    s += S.line(W / 2, pmY + BH, W / 2, busY, { stroke: lineC, sw: 1.2 });
    if (row1 > 1) s += S.line(row1X + BW / 2, busY, row1X + row1W - BW / 2, busY, { stroke: lineC, sw: 1.2 });
    core.forEach((p, i) => {
      const row = Math.floor(i / perC);
      const col = i % perC;
      const nIn = Math.min(perC, core.length - row * perC);
      const cx = (W - (nIn * BW + (nIn - 1) * G)) / 2 + col * (BW + G);
      const cy = coreY + row * (BH + G);
      if (row === 0) s += S.line(cx + BW / 2, busY, cx + BW / 2, cy, { stroke: lineC, sw: 1.2 });
      const lead = p && m.leads[p._id];
      s += pbox(cx, cy, p, 'Core team member', lead ? 'Leads ' + lead : 'Core team member', st.core);
    });
    let staffBottom = 0;
    const pmLeft = (W - pmRowW) / 2;
    const drawStaff = (list, left) => {
      if (!list.length) return;
      const xs = left ? bandX - 10 : bandX + bandW + 10;
      list.forEach((p, i) => {
        const sx = left ? bandX - 20 - BW : bandX + bandW + 20;
        const sy = pmY + i * (BH + G);
        s += pbox(sx, sy, p, 'Staff', has(p, 'Project coach') ? 'Project coach (staff)' : 'Project assistant (staff)', st.staff);
        s += S.line(left ? sx + BW : sx, sy + BH / 2, xs, sy + BH / 2, { stroke: pal.ink2, sw: 1.2, dash: '4 3' });
        staffBottom = Math.max(staffBottom, sy + BH);
      });
      const yc = pmY + BH / 2;
      if (list.length > 1) s += S.line(xs, yc, xs, pmY + (list.length - 1) * (BH + G) + BH / 2, { stroke: pal.ink2, sw: 1.2, dash: '4 3' });
      s += S.line(xs, yc, left ? pmLeft : pmLeft + pmRowW, yc, { stroke: pal.ink2, sw: 1.2, dash: '4 3' });
    };
    drawStaff(staffL, true);
    drawStaff(staffR, false);
    const bandBottom = bandY + bandH;
    y = Math.max(bandBottom, staffBottom) + 36;

    // ---- sub-teams ----
    const cards = m.teams.slice();
    if (m.loose.length) cards.push({ name: 'Not in a sub-team', loose: true, lead: '', members: m.loose.map((p) => p._id), type: '', decision: '', meets: '' });
    const perT = 4;
    const CG = 14;
    const cW = (W - 2 * P - (perT - 1) * CG) / perT;
    const tw = cW - 24;
    const layout = cards.map((t) => {
      const subBits = [t.type, t.implicit ? 'from the people list' : '', t.meets ? 'meets ' + t.meets : ''].filter(Boolean);
      const sub = subBits.length ? S.fit(subBits.join(' · '), tw, 10.5) : '';
      const dec = t.decision ? S.textBlock(0, 0, 'Decides: ' + t.decision, { maxW: tw, size: 10.5, maxLines: 2 }) : null;
      const ids = (t.lead ? [t.lead] : []).concat(t.members);
      const shown = ids.length > 8 ? ids.slice(0, 7) : ids;
      const lines = shown.length + (ids.length > 8 ? 1 : 0);
      const h = 12 + 16 + (sub ? 15 : 0) + (dec ? dec.h + 6 : 0) + 10 + Math.max(1, lines) * 18 + 8;
      return { t, sub, dec, ids, shown, h };
    });
    if (!cards.length) {
      s += S.line(W / 2, bandBottom, W / 2, y, { stroke: lineC, sw: 1.5, dash: '3 3' });
      s += S.rect(P + 180, y, W - 2 * P - 360, 44, { rx: 10, stroke: pal.boxLine, dash: '5 4' });
      s += S.text(W / 2, y + 22, 'Sub-teams appear here once you add them above or fill in "Sub-team" for people', { size: 11.5, fill: pal.muted, italic: true, anchor: 'middle', v: 'middle' });
      y += 44;
    } else {
      const nRows = Math.ceil(cards.length / perT);
      const multi = nRows > 1;
      const trunkX = 8;
      let ry = y;
      let prevBus = null;
      for (let r = 0; r < nRows; r++) {
        const items = layout.slice(r * perT, r * perT + perT);
        const rowW = items.length * cW + (items.length - 1) * CG;
        const x0 = (W - rowW) / 2;
        const rowH = Math.max.apply(null, items.map((l) => l.h));
        const bus = ry - 16;
        const centres = items.map((_, i) => x0 + i * (cW + CG) + cW / 2);
        let bx0 = Math.min.apply(null, centres);
        let bx1 = Math.max.apply(null, centres);
        if (r === 0) {
          bx0 = Math.min(bx0, W / 2);
          bx1 = Math.max(bx1, W / 2);
          s += S.line(W / 2, bandBottom, W / 2, bus, { stroke: lineC, sw: 1.5 });
        }
        if (multi) bx0 = trunkX;
        if (bx1 > bx0) s += S.line(bx0, bus, bx1, bus, { stroke: lineC, sw: 1.5 });
        if (multi && prevBus !== null) s += S.line(trunkX, prevBus, trunkX, bus, { stroke: lineC, sw: 1.5 });
        prevBus = bus;
        items.forEach((l, i) => {
          const cx = x0 + i * (cW + CG);
          s += S.line(centres[i], bus, centres[i], ry, { stroke: lineC, sw: 1.5 });
          s += drawCard(q, pal, l, cx, ry, cW, rowH);
        });
        ry += rowH + 34;
      }
      y = ry - 34;
    }

    // ---- legend ----
    const lg = S.legend(
      [
        { label: 'Project owner', color: pal.strong },
        { label: 'Project manager', color: pal.accent },
        { label: 'Core team', color: pal.accentSoft, stroke: pal.accent },
        { label: 'Staff position', color: pal.ink2, shape: 'dash' },
        { label: 'Reporting line', color: lineC, shape: 'line' },
      ],
      P, y + 18, pal, { maxW: W - 2 * P }
    );
    s += lg.svg;
    y += 18 + lg.h;
    return S.svg(W, y + P, s, { pal, label: 'Organisation chart of the project' });
  }

  function drawCard(q, pal, l, x, y, w, h) {
    const t = l.t;
    const tw = w - 24;
    let s = S.rect(x, y, w, h, { rx: 10, fill: t.loose ? pal.bg : pal.box, stroke: pal.boxLine, dash: t.loose ? '5 4' : null });
    let cy = y + 12;
    s += S.text(x + 12, cy, S.fit(t.name, tw, 12.5, 600), { size: 12.5, weight: 600, fill: t.ph ? pal.muted : pal.ink, italic: t.ph });
    cy += 16;
    if (l.sub) {
      s += S.text(x + 12, cy, l.sub, { size: 10.5, fill: pal.ink2 });
      cy += 15;
    }
    if (l.dec) {
      s += S.textBlock(x + 12, cy, 'Decides: ' + t.decision, { maxW: tw, size: 10.5, maxLines: 2, fill: pal.ink2 }).svg;
      cy += l.dec.h + 6;
    }
    s += S.line(x + 12, cy + 3, x + w - 12, cy + 3, { stroke: pal.line });
    cy += 10;
    if (!l.ids.length) {
      s += S.text(x + 12, cy + 9, 'No lead or members yet', { size: 11, fill: pal.muted, italic: true, v: 'middle' });
      return s;
    }
    l.shown.forEach((id) => {
      const p = q.person(id);
      const isLead = id === t.lead;
      const ym = cy + 9;
      s += S.circle(x + 16, ym, 4, isLead ? { fill: pal.accent } : { fill: pal.bg, stroke: pal.ink2, sw: 1.2 });
      const name = pName(q, p);
      const role = isLead ? 'lead' : mainRole(p);
      const nameFit = S.fit(name, tw - 14, 11.5, isLead ? 600 : 400);
      const nw = S.measure(nameFit, 11.5, isLead ? 600 : 400);
      s += S.text(x + 26, ym, nameFit, { size: 11.5, weight: isLead ? 600 : 400, fill: p && p.name ? pal.ink : pal.muted, v: 'middle', italic: !(p && p.name) });
      const rest = tw - 14 - nw - 4;
      if (rest > 30) s += S.text(x + 26 + nw + 4, ym, S.fit('· ' + role, rest, 10.5), { size: 10.5, fill: pal.muted, v: 'middle' });
      cy += 18;
    });
    if (l.ids.length > l.shown.length) s += S.text(x + 26, cy + 9, '+ ' + (l.ids.length - l.shown.length) + ' more', { size: 11, fill: pal.muted, v: 'middle' });
    return s;
  }

  // =====================================================================================
  // Graphic: mutual expectations
  // =====================================================================================
  function roleNames(q) {
    const out = [];
    q.rows('orgRoles').forEach((r) => {
      const v = String(r.role || '').trim();
      if (v && !out.includes(v)) out.push(v);
    });
    return out;
  }
  function roleHolders(q, role) {
    const row = q.rows('orgRoles').find((r) => norm(r.role) === norm(role));
    let ids = row && Array.isArray(row.heldBy) ? row.heldBy.filter((id) => q.person(id)) : [];
    if (!ids.length && PM.ROLES.includes(role)) ids = q.withRole(role).filter((p) => p.name).map((p) => p._id);
    return ids.map((id) => q.name(id)).filter(Boolean);
  }
  function pickPair(q) {
    const rows = q.rows('orgExpectations').filter((r) => r.from && r.to && r.from !== r.to);
    const count = {};
    const first = {};
    rows.forEach((r) => {
      const k = [r.from, r.to].sort().join('\u0001');
      count[k] = (count[k] || 0) + 1;
      if (!first[k]) first[k] = r;
    });
    const keys = Object.keys(count);
    if (!keys.length) return null;
    let best = keys[0];
    keys.forEach((k) => {
      if (count[k] > count[best]) best = k;
    });
    const a = first[best].from;
    const b = first[best].to;
    const all = q.rows('orgExpectations');
    return {
      a, b,
      ab: all.filter((r) => r.from === a && r.to === b),
      ba: all.filter((r) => r.from === b && r.to === a),
      other: all.filter((r) => (r.from || r.to || r.expectation) && !((r.from === a && r.to === b) || (r.from === b && r.to === a))).length,
    };
  }

  function renderExpectations(q, pal) {
    const pr = pickPair(q);
    const BWx = 180;
    const mx0 = P + BWx + 24;
    const mx1 = W - P - BWx - 24;
    const tw = mx1 - mx0 - 22;
    const ah = S.uid('ex');
    const items = (rows) =>
      rows.map((r) => {
        const ph = !r.expectation;
        const txt = q.label(r, 'expectation') || 'Expectation not written yet';
        return { r, ph, tb: S.textBlock(0, 0, txt, { maxW: tw, size: 12, lineH: 1.3, maxLines: 3 }), txt };
      });
    const A = items(pr.ab);
    const B = items(pr.ba);
    const listH = (L) => (L.length ? L.reduce((a, it) => a + it.tb.h + 8, 0) - 8 : 15);
    const headH = 20;
    let s = '<defs>' + S.arrowDef(ah, pal.accent, 9) + '</defs>';
    const topH = headH + listH(A) + 14;
    const midY = P + Math.max(topH + 16, 52);
    const yA = midY - 14;
    const yB = midY + 14;
    // role boxes
    const roleBox = (x, role) => {
      const names = roleHolders(q, role);
      return S.box(x, midY - 40, BWx, 80, role, { fill: pal.box, stroke: pal.accent, sw: 1.5, color: pal.ink, size: 14, sub: names.length ? names.join(', ') : 'No holder named yet', subColor: names.length ? pal.ink2 : pal.muted, maxLines: 2, subMaxLines: 2, rx: 10 });
    };
    s += roleBox(P, pr.a);
    s += roleBox(W - P - BWx, pr.b);
    s += S.line(P + BWx + 4, yA, W - P - BWx - 6, yA, { stroke: pal.accent, sw: 2, markerEnd: ah });
    s += S.line(W - P - BWx - 4, yB, P + BWx + 6, yB, { stroke: pal.accent, sw: 2, markerEnd: ah });
    const drawList = (L, y) => {
      let out = '';
      let cy = y;
      if (!L.length) {
        out += S.text(mx0, cy, 'No expectations in this direction yet', { size: 11.5, fill: pal.muted, italic: true });
        return out;
      }
      L.forEach((it) => {
        const ym = cy + 7;
        if (it.r.agreed) out += S.path('M' + (mx0 + 1) + ',' + ym + ' l3.5,3.5 l6.5,-7.5', { stroke: pal.good, sw: 2.2 });
        else out += S.circle(mx0 + 5, ym, 4, { stroke: pal.muted, sw: 1.4, fill: pal.bg });
        out += S.textBlock(mx0 + 22, cy, it.txt, { maxW: tw, size: 12, lineH: 1.3, maxLines: 3, fill: it.ph ? pal.muted : pal.ink, italic: it.ph }).svg;
        cy += it.tb.h + 8;
      });
      return out;
    };
    // top: what A expects from B (above the arrows)
    const topStart = yA - 12 - listH(A) - headH;
    s += S.text(mx0, topStart, S.fit(pr.a + ' expects from ' + pr.b, mx1 - mx0, 12.5, 600), { size: 12.5, weight: 600, fill: pal.ink });
    s += drawList(A, topStart + headH);
    // bottom: what B expects from A
    const botStart = yB + 14;
    s += S.text(mx0, botStart, S.fit(pr.b + ' expects from ' + pr.a, mx1 - mx0, 12.5, 600), { size: 12.5, weight: 600, fill: pal.ink });
    s += drawList(B, botStart + headH);
    let y = Math.max(botStart + headH + listH(B), midY + 40) + 18;
    // legend
    s += S.path('M' + (mx0 + 1) + ',' + (y + 6) + ' l3.5,3.5 l6.5,-7.5', { stroke: pal.good, sw: 2.2 });
    s += S.text(mx0 + 16, y + 6, 'agreed', { size: 11, fill: pal.ink2, v: 'middle' });
    s += S.circle(mx0 + 75, y + 6, 4, { stroke: pal.muted, sw: 1.4, fill: pal.bg });
    s += S.text(mx0 + 85, y + 6, 'still open', { size: 11, fill: pal.ink2, v: 'middle' });
    if (pr.other) s += S.text(mx1, y + 6, '+ ' + pr.other + ' between other roles (see table)', { size: 11, fill: pal.muted, v: 'middle', anchor: 'end' });
    y += 14;
    return S.svg(W, y + P, s, { pal, label: 'Mutual expectations of ' + pr.a + ' and ' + pr.b });
  }

  // =====================================================================================
  // Graphic: organisational incorporation
  // =====================================================================================
  function incDepts(q, max) {
    const people = q.people();
    const team = people.filter((p) => !['Project owner', 'PSC member', 'Project manager', 'Project assistant', 'Project coach', 'PMO'].some((r) => has(p, r)));
    const by = {};
    const groups = [];
    let noUnit = [];
    team.forEach((p) => {
      const u = String(p.unit || '').trim();
      if (!u) {
        noUnit.push(p);
        return;
      }
      const k = norm(u);
      if (!by[k]) {
        by[k] = { name: u, members: [] };
        groups.push(by[k]);
      }
      by[k].members.push(p);
    });
    if (!groups.length) {
      return ['Dept. A', 'Dept. B', 'Dept. C'].slice(0, max).map((n) => ({ name: n, members: [null], generic: true }));
    }
    let depts = groups.sort((a, b) => b.members.length - a.members.length);
    if (noUnit.length) depts.push({ name: 'Unit not set', members: noUnit });
    if (depts.length > max) {
      const keep = depts.slice(0, max - 1);
      keep.push({ name: 'Other units', members: depts.slice(max - 1).reduce((a, g) => a.concat(g.members), []) });
      depts = keep;
    }
    return depts;
  }

  function drawForm(q, pal, form, X, Y, Wd, Ht, o) {
    const big = !!o.big;
    const mut = !!o.muted;
    const c = {
      lineC: mut ? pal.muted : pal.ink2,
      pmC: mut ? pal.muted : pal.accent,
      txt: mut ? pal.ink2 : pal.ink,
      pmF: mut ? pal.box : pal.accent,
      pmT: mut ? pal.ink2 : pal.accentInk,
      pmS: mut ? pal.muted : pal.accent,
      memF: mut ? pal.box : pal.accentSoft,
      boxS: mut ? pal.line : pal.boxLine,
    };
    let s = S.rect(X, Y, Wd, Ht, { rx: 10, fill: pal.bg, stroke: big ? pal.accent : pal.line, sw: big ? 1.5 : 1 });
    const tSize = big ? 14 : 12;
    s += S.text(X + 14, Y + 12, form.id, { size: tSize, weight: 600, fill: c.txt });
    if (o.tag) {
      const tw = S.measure(o.tag, 10.5, 600) + 16;
      const tx = X + 14 + S.measure(form.id, tSize, 600) + 10;
      s += S.rect(tx, Y + 10, tw, 19, { rx: 9.5, fill: pal.accent });
      s += S.text(tx + tw / 2, Y + 19.5, o.tag, { size: 10.5, weight: 600, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
    }
    const fs = 11;
    const ix = X + 14;
    const iw = Wd - 28;
    const top = Y + (big ? 46 : 34);
    const mgW = big ? 150 : 96;
    const mgH = big ? 28 : 20;
    const dH = big ? 34 : 20;
    const gap1 = big ? 60 : 42;
    const gap2 = big ? 40 : 22;
    const r = big ? 11 : 5;
    const pmW = big ? 100 : 52;
    const pmH = big ? 28 : 20;
    const pmName = big ? (q.withRole('Project manager').filter((p) => p.name).map((p) => p.name)[0] || '') : '';
    const pmLabel = big ? (pmName ? 'PM · ' + pmName : 'Project manager') : 'PM';
    const depts = incDepts(q, big ? 4 : 3);
    const n = depts.length;

    let a0 = ix;
    let a1 = ix + iw;
    if (form.key === 'infl') a1 = ix + iw - 22;
    if (form.key === 'matrix') a0 = ix + pmW + 18;
    const projW = big ? 150 : 82;
    if (form.key === 'pure') a1 = ix + iw - projW - 16;
    const colW = (a1 - a0) / n;
    const dW = Math.min(colW - (big ? 12 : 6), 150);
    const dTop = top + mgH + gap1;
    const busY = dTop - (big ? 14 : 9);
    const rowY = dTop + dH + gap2;
    const centres = depts.map((_, i) => a0 + colW * i + colW / 2);
    const projX = ix + iw - projW;
    const projC = projX + projW / 2;
    const spanC = form.key === 'matrix' ? [ix + pmW / 2].concat(centres) : form.key === 'pure' ? centres.concat([projC]) : centres;
    const mgC = (Math.min.apply(null, spanC) + Math.max.apply(null, spanC)) / 2;
    // management and line tree
    s += S.box(mgC - mgW / 2, top, mgW, mgH, 'Management', { fill: pal.box, stroke: c.boxS, color: c.txt, size: fs, weight: 600, maxLines: 1, rx: 5 });
    s += S.line(mgC, top + mgH, mgC, busY, { stroke: c.lineC, sw: 1.5 });
    s += S.line(Math.min.apply(null, spanC), busY, Math.max.apply(null, spanC), busY, { stroke: c.lineC, sw: 1.5 });
    depts.forEach((d, i) => {
      const cx = centres[i];
      s += S.line(cx, busY, cx, dTop, { stroke: c.lineC, sw: 1.5 });
      s += S.box(cx - dW / 2, dTop, dW, dH, big ? d.name : S.fit(d.name, dW - 8, fs, 600), { fill: pal.box, stroke: c.boxS, color: d.generic ? pal.muted : c.txt, italic: d.generic, size: fs, weight: 600, maxLines: big ? 2 : 1, rx: 5, pad: 5 });
    });

    // member circles per department
    const maxPer = big ? 3 : 2;
    const memberPos = []; // {x, p, more}
    depts.forEach((d, i) => {
      const list = d.members.length > maxPer ? d.members.slice(0, maxPer - 1) : d.members;
      const more = d.members.length - list.length;
      const k = list.length + (more ? 1 : 0);
      const step = 2 * r + (big ? 6 : 4);
      const x0 = centres[i] - ((k - 1) * step) / 2;
      const xs = [];
      list.forEach((p, j) => {
        xs.push(x0 + j * step);
        memberPos.push({ x: x0 + j * step, p, dept: i });
      });
      if (more) {
        xs.push(x0 + list.length * step);
        memberPos.push({ x: x0 + list.length * step, more, dept: i });
      }
      d._xs = xs;
    });
    const circle = (x, y, it, ghost) => {
      if (ghost) return S.circle(x, y, r, { stroke: pal.muted, sw: 1, dash: '2 2', fill: pal.bg });
      let out = S.circle(x, y, r, { fill: c.memF, stroke: c.pmS, sw: 1.2 });
      if (big && it.more) out += S.text(x, y, '+' + it.more, { size: 9.5, weight: 600, fill: c.txt, anchor: 'middle', v: 'middle' });
      else if (big && it.p && it.p.name) out += S.text(x, y, q.initials(it.p._id).slice(0, 2), { size: 9.5, weight: 600, fill: c.txt, anchor: 'middle', v: 'middle' });
      return out;
    };
    const deptDrops = (ghost) => {
      let out = '';
      depts.forEach((d, i) => {
        const xs = d._xs;
        const yb = rowY - r - (big ? 9 : 6);
        const lo = { stroke: ghost ? pal.line : c.lineC, sw: 1.5, dash: ghost ? '3 3' : null };
        out += S.line(centres[i], dTop + dH, centres[i], xs.length > 1 ? yb : rowY - r, lo);
        if (xs.length > 1) {
          out += S.line(xs[0], yb, xs[xs.length - 1], yb, lo);
          xs.forEach((x) => (out += S.line(x, yb, x, rowY - r, lo)));
        }
      });
      return out;
    };

    if (form.key === 'infl') {
      // PM as staff unit beside the management trunk
      const pmy = top + mgH + (busY - top - mgH) / 2;
      const px = mgC + 22;
      s += S.line(mgC, pmy, px, pmy, { stroke: c.pmC, sw: 1.5, dash: '4 3' });
      s += S.box(px, pmy - pmH / 2, pmW, pmH, pmLabel, { fill: c.pmF, stroke: c.pmS, color: c.pmT, size: fs, weight: 600, maxLines: 1, rx: 5, pad: 5 });
      s += deptDrops(false);
      const xsAll = memberPos.map((m) => m.x);
      const eL = Math.min.apply(null, xsAll) - r - 8;
      const eR = Math.max.apply(null, xsAll) + r + 8;
      const eT = rowY - r - 5;
      const eB = rowY + r + 5;
      s += S.rect(eL, eT, eR - eL, eB - eT, { rx: (eB - eT) / 2, stroke: c.pmC, sw: 1.5, dash: '5 4' });
      memberPos.forEach((m) => (s += circle(m.x, rowY, m)));
      const xr = ix + iw - 6;
      s += S.path('M' + (px + pmW) + ',' + pmy + ' H' + xr + ' V' + rowY + ' H' + eR, { stroke: c.pmC, sw: 1.5, dash: '5 4' });
      if (big) s += S.text(eL + 4, eB + 6, 'Project team, stays in the line', { size: 10.5, fill: pal.ink2 });
    } else if (form.key === 'matrix') {
      const pmTop = rowY - pmH / 2;
      s += S.line(ix + pmW / 2, busY, ix + pmW / 2, pmTop, { stroke: c.lineC, sw: 1.5 });
      s += S.box(ix, pmTop, pmW, pmH, big ? 'Project manager' : 'PM', { fill: c.pmF, stroke: c.pmS, color: c.pmT, size: fs, weight: 600, maxLines: 1, rx: 5, pad: 5 });
      s += deptDrops(false);
      const xe = Math.max.apply(null, memberPos.map((m) => m.x)) + r + (big ? 18 : 10);
      s += S.line(ix + pmW, rowY, xe, rowY, { stroke: c.pmC, sw: 2 });
      memberPos.forEach((m) => (s += circle(m.x, rowY, m)));
      if (big) s += S.text(ix + pmW + 8, rowY + r + 6, 'Project line: each member reports twice', { size: 10.5, fill: pal.ink2 });
    } else {
      // pure project: ghosts stay in the departments, the team sits in the project unit
      s += deptDrops(true);
      memberPos.forEach((m) => (s += circle(m.x, rowY, m, true)));
      const uT = dTop - 6;
      const all = depts.reduce((acc, d) => acc.concat(d.members), []);
      const cap = Math.max(1, Math.floor((projW - 12) / (2 * r + (big ? 6 : 4))));
      const list = all.length > cap ? all.slice(0, cap - 1) : all;
      const more = all.length - list.length;
      const k = list.length + (more ? 1 : 0);
      const step = 2 * r + (big ? 6 : 4);
      const x0 = projC - ((k - 1) * step) / 2;
      const uB = rowY + r + 8;
      s += S.line(projC, busY, projC, uT, { stroke: c.lineC, sw: 1.5 });
      s += S.rect(projX, uT, projW, uB - uT, { rx: 8, fill: c.memF, stroke: c.pmS, sw: 1.2 });
      s += S.box(projX + 6, dTop, projW - 12, dH, big ? pmLabel : 'PM', { fill: c.pmF, stroke: c.pmS, color: c.pmT, size: fs, weight: 600, maxLines: 1, rx: 5, pad: 5 });
      const yb = rowY - r - (big ? 9 : 6);
      s += S.line(projC, dTop + dH, projC, k > 1 ? yb : rowY - r, { stroke: c.pmC, sw: 1.5 });
      if (k > 1) s += S.line(x0, yb, x0 + (k - 1) * step, yb, { stroke: c.pmC, sw: 1.5 });
      for (let j = 0; j < k; j++) {
        const x = x0 + j * step;
        if (k > 1) s += S.line(x, yb, x, rowY - r, { stroke: c.pmC, sw: 1.5 });
        s += circle(x, rowY, j < list.length ? { p: list[j] } : { more });
      }
      if (big) s += S.text(projC, uB + 6, 'Project unit', { size: 10.5, fill: pal.ink2, anchor: 'middle' });
    }
    if (big) s += S.textBlock(X + 14, Y + Ht - 36, FORM_CAPTION[form.key], { maxW: Wd - 28, size: 11, maxLines: 2, fill: pal.ink2 }).svg;
    return s;
  }

  function renderIncorporation(q, pal) {
    const sc = formScores(q);
    const chosenId = q.f('org.form');
    let chosen = FORMS.find((f) => f.id === chosenId);
    let tag = chosen ? 'Chosen' : '';
    if (!chosen && sc && sc.ties.length === 1) {
      chosen = sc.best;
      tag = 'Suggested';
    }
    let s = '';
    let y = P;
    if (chosen) {
      const bigW = 620;
      const H = 316;
      const smallW = W - 2 * P - bigW - 14;
      const smallH = (H - 14) / 2;
      s += drawForm(q, pal, chosen, P, y, bigW, H, { big: true, tag });
      FORMS.filter((f) => f !== chosen).forEach((f, i) => {
        s += drawForm(q, pal, f, P + bigW + 14, y + i * (smallH + 14), smallW, smallH, { muted: true });
      });
      y += H;
    } else {
      const w3 = (W - 2 * P - 28) / 3;
      FORMS.forEach((f, i) => {
        s += drawForm(q, pal, f, P + i * (w3 + 14), y, w3, 150, {});
      });
      y += 150;
    }
    const lg = S.legend(
      [
        { label: 'Line authority', color: pal.ink2, shape: 'line' },
        { label: 'PM authority', color: pal.accent, shape: 'line' },
        { label: 'Coordination only', color: pal.accent, shape: 'dash' },
        { label: 'Team member', color: pal.accentSoft, stroke: pal.accent },
      ],
      P, y + 14, pal, { maxW: W - 2 * P }
    );
    s += lg.svg;
    y += 14 + lg.h + 6;
    let sum;
    if (sc) {
      sum = 'Your answers: PM ' + sc.counts.PM + ' · Line ' + sc.counts.Line + ' · Shared ' + sc.counts.Shared + '. Closest form: ' + suggestionText(q) + '.';
    } else sum = 'Answer the six questions in the table to get a suggestion.';
    s += S.text(P, y, S.fit(sum, W - 2 * P, 12), { size: 12, fill: sc ? pal.ink : pal.muted, italic: !sc });
    y += 16;
    return S.svg(W, y + P, s, { pal, label: 'Organisational incorporation of the project' });
  }

  // =====================================================================================
  // Graphic: communication calendar
  // =====================================================================================
  function renderCalendar(q, pal) {
    const rg = commRange(q);
    const rows = q.rows('orgComm').filter((r) => q.label(r, 'name') || r.first || r.rhythm);
    const LW = 236;
    const CW = 64;
    const x0 = P + LW;
    const x1 = W - P - CW;
    const sc = S.timeScale(rg.start, rg.end, x0, x1);
    const RH = 38;
    const top = P + 26;
    const bottom = top + Math.max(1, rows.length) * RH;
    let s = S.timeAxis(sc, P, 24, bottom, pal);
    s += S.text(W - P, P + 12, 'Count', { size: 11, weight: 600, fill: pal.ink2, anchor: 'end', v: 'middle' });
    const colour = (r) => (r.kind === 'Content' ? pal.series[0] : r.kind === 'Project management' ? pal.accent : pal.muted);
    rows.forEach((r, i) => {
      const y = top + i * RH;
      const ym = y + RH / 2;
      if (i > 0) s += S.line(P, y, W - P, y, { stroke: pal.grid });
      const nm = q.label(r, 'name') || 'Meeting';
      const ph = q.isPlaceholder(r, 'name') || !r.name;
      s += S.text(P, ym - 7, S.fit(nm, LW - 12, 12, 600), { size: 12, weight: 600, fill: ph ? pal.muted : pal.ink, italic: ph, v: 'middle' });
      const sub = [r.rhythm, r.form, r.chair ? 'chair ' + q.initials(r.chair) : ''].filter(Boolean).join(' · ');
      if (sub) s += S.text(P, ym + 8, S.fit(sub, LW - 12, 10.5), { size: 10.5, fill: pal.ink2, v: 'middle' });
      const col = colour(r);
      const occ = occurrences(r, rg.end);
      let count = '';
      if (occ === 'req') {
        const from = U.isDate(r.first) ? r.first : rg.start;
        const bx = sc.x(from);
        const bw = Math.max(20, x1 - bx);
        s += S.rect(bx, ym - 6, bw, 12, { rx: 6, fill: pal.bg, stroke: col, sw: 1.5, dash: '5 3' });
        const lab = 'as required';
        const lw = S.measure(lab, 10.5) + 10;
        if (bw > lw + 10) {
          s += S.rect(bx + bw / 2 - lw / 2, ym - 6, lw, 12, { fill: pal.bg });
          s += S.text(bx + bw / 2, ym, lab, { size: 10.5, fill: pal.ink2, anchor: 'middle', v: 'middle', italic: true });
        }
        count = 'as req.';
      } else if (!occ) {
        s += S.text(x0 + 8, ym, r.rhythm ? 'Add a first date to place this meeting' : 'Add a rhythm and a first date', { size: 11, fill: pal.muted, italic: true, v: 'middle' });
      } else {
        const once = occ.length === 1 && (!r.rhythm || r.rhythm === 'Once');
        const k = sc.k;
        const stepPx = occ.length > 1 ? (STEP_DAYS[r.rhythm] || 30) * k : 99;
        if (stepPx < 11) {
          const a = sc.x(occ[0]);
          const b = sc.xEnd(occ[occ.length - 1]);
          s += S.rect(a, ym - 4, Math.max(8, b - a), 8, { rx: 4, fill: col });
        } else {
          occ.forEach((d) => {
            const cx = sc.x(d) + k / 2;
            s += once ? S.circle(cx, ym, 6.5, { fill: col, stroke: pal.bg, sw: 1.5 }) : S.circle(cx, ym, 4.5, { fill: col });
          });
          if (once) {
            const cx = sc.x(occ[0]) + k / 2;
            const lab = U.fmtDateShort(occ[0]);
            const right = cx + 12 + S.measure(lab, 10.5) < x1;
            s += S.text(right ? cx + 11 : cx - 11, ym, lab, { size: 10.5, fill: pal.ink2, v: 'middle', anchor: right ? 'start' : 'end' });
          }
        }
        count = occ.length + '×';
      }
      if (count) s += S.text(W - P, ym, count, { size: count === 'as req.' ? 11 : 12, weight: count === 'as req.' ? 400 : 600, fill: count === 'as req.' ? pal.muted : pal.ink, anchor: 'end', v: 'middle' });
    });
    s += S.line(P, bottom, W - P, bottom, { stroke: pal.axis });
    const lg = S.legend(
      [
        { label: 'Project management meeting', color: pal.accent, shape: 'dot' },
        { label: 'Content meeting', color: pal.series[0], shape: 'dot' },
        { label: 'As required', color: pal.ink2, shape: 'dash' },
      ],
      P, bottom + 12, pal, { maxW: W - 2 * P }
    );
    s += lg.svg;
    s += S.text(W - P, bottom + 12 + 5.5, 'Larger dot with date: one-off event', { size: 11, fill: pal.muted, anchor: 'end', v: 'middle' });
    return S.svg(W, bottom + 12 + lg.h + P, s, { pal, label: 'Communication calendar' });
  }

  // =====================================================================================
  // Graphic: team development
  // =====================================================================================
  const PHASES = [
    { _id: 'forming', phase: 'Forming', signs: 'Polite, careful, insecure', v: 0.42 },
    { _id: 'storming', phase: 'Storming', signs: 'Conflicts, unclear roles, slow progress', v: 0.2 },
    { _id: 'norming', phase: 'Norming', signs: 'Ground rules, roles settle, feedback', v: 0.56 },
    { _id: 'performing', phase: 'Performing', signs: 'Efficient, flexible, mutual support', v: 0.9 },
    { _id: 'adjourning', phase: 'Adjourning', signs: 'Joint review, taking in what was learned', v: 0.64 },
  ];

  function renderTeam(q, pal) {
    const rows = q.rows('orgTeamPhases');
    const get = (id) => rows.find((r) => r._id === id) || {};
    const ax = P + 8;
    const ax1 = W - P - 8;
    const bw = (ax1 - ax) / PHASES.length;
    const headTop = P;
    const chartT = P + 52;
    const chartB = chartT + 150;
    const active = PHASES.map((ph) => {
      const r = get(ph._id);
      return !!(r.when || r.noticed || r.pmDid);
    });
    const arrowId = S.uid('td');
    let s = '<defs>' + S.arrowDef(arrowId, pal.axis) + '</defs>';
    // bands and headers
    PHASES.forEach((ph, i) => {
      const x = ax + i * bw;
      const on = active[i];
      s += S.rect(x + 1, chartT, bw - 2, chartB - chartT, on ? { fill: pal.box } : { stroke: pal.line, dash: '3 3' });
      s += S.text(x + bw / 2, headTop, ph.phase, { size: 13, weight: 600, fill: on ? pal.ink : pal.muted, anchor: 'middle' });
      const tb = S.wrap(ph.signs, bw - 14, 10.5).slice(0, 2);
      tb.forEach((ln, j) => (s += S.text(x + bw / 2, headTop + 19 + j * 13, ln, { size: 10.5, fill: pal.muted, anchor: 'middle' })));
    });
    // axes
    s += S.line(ax, chartB, ax, chartT - 8, { stroke: pal.axis, sw: 1.5, markerEnd: arrowId });
    s += S.line(ax, chartB, ax1 + 4, chartB, { stroke: pal.axis, sw: 1.5, markerEnd: arrowId });
    s += S.text(ax + 8, chartT + 6, 'Performance', { size: 10.5, fill: pal.ink2 });
    // curve through the phase centres (Catmull-Rom, sampled)
    const yv = (v) => chartB - 10 - v * (chartB - chartT - 22);
    const pts = [[ax, yv(0.34)]].concat(PHASES.map((ph, i) => [ax + i * bw + bw / 2, yv(ph.v)])).concat([[ax1, yv(0.5)]]);
    const samples = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || pts[i + 1];
      for (let t = 0; t < 1; t += 1 / 20) {
        const t2 = t * t;
        const t3 = t2 * t;
        const f = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
        samples.push([f(p0[0], p1[0], p2[0], p3[0]), Math.min(chartB - 4, Math.max(chartT + 4, f(p0[1], p1[1], p2[1], p3[1])))]);
      }
    }
    samples.push(pts[pts.length - 1]);
    PHASES.forEach((ph, i) => {
      const xa = ax + i * bw;
      const xb = xa + bw;
      const seg = samples.filter((p) => p[0] >= xa && p[0] <= xb);
      const prev = samples.filter((p) => p[0] < xa).pop();
      if (prev) seg.unshift(prev);
      if (seg.length > 1) s += S.polyline(seg, active[i] ? { stroke: pal.accent, sw: 2.5 } : { stroke: pal.muted, sw: 2, dash: '5 4' });
      const c = pts[i + 1];
      s += S.circle(c[0], c[1], 4.5, active[i] ? { fill: pal.accent, stroke: pal.bg, sw: 1.5 } : { fill: pal.bg, stroke: pal.muted, sw: 1.5 });
    });
    s += S.text(ax1, chartB + 6, 'Time', { size: 11, fill: pal.ink2, anchor: 'end' });
    // notes under each phase
    const nTop = chartB + 24;
    let maxH = 0;
    PHASES.forEach((ph, i) => {
      const r = get(ph._id);
      const x = ax + i * bw + 6;
      const mw = bw - 12;
      let cy = nTop;
      if (!active[i]) {
        s += S.text(x, cy, 'No entries yet', { size: 11, fill: pal.muted, italic: true });
        cy += 14;
      } else {
        const when = S.textBlock(x, cy, r.when || 'When not set', { maxW: mw, size: 12, weight: 600, maxLines: 2, fill: r.when ? pal.ink : pal.muted, italic: !r.when });
        s += when.svg;
        cy += when.h + 6;
        if (r.pmDid) {
          const tb = S.textBlock(x, cy, 'PM: ' + r.pmDid, { maxW: mw, size: 11, lineH: 1.3, maxLines: 6, fill: pal.ink2 });
          s += tb.svg;
          cy += tb.h;
        }
      }
      maxH = Math.max(maxH, cy - nTop);
    });
    for (let i = 1; i < PHASES.length; i++) s += S.line(ax + i * bw, nTop - 4, ax + i * bw, nTop + maxH, { stroke: pal.grid });
    return S.svg(W, nTop + maxH + P, s, { pal, label: 'Team development through five phases' });
  }

  // =====================================================================================
  // Section 4.1: Project organisation
  // =====================================================================================
  PM.section({
    id: 'organisation',
    part: 'start',
    order: 41,
    num: '4.1',
    step: 'S1',
    slides: '85–90, 97–102',
    title: 'Project organisation',
    intro: 'Set up who steers, who leads and who works in the project, what each role may decide, and how the project sits in the line organisation.',
    landscape: true,
    blocks: [
      { type: 'step', step: 'S1' },
      {
        type: 'group', cols: 2,
        blocks: [
          {
            type: 'guide', title: 'Principles',
            text: 'Plan the organisation on purpose once the charter is released.',
            items: [
              'Start from the scope plan: bring in every unit and every kind of know-how the work packages need, internal and external.',
              'Everyone responsible for a work package belongs to the core team.',
              'Make the paths for information and decisions clear: who informs whom, who decides what.',
              'Settle the sub-teams, functional or interdisciplinary, and what each of them may decide.',
            ],
          },
          {
            type: 'guide', title: 'Six steps', ordered: true,
            items: [
              'Draw the organisation chart.',
              'Describe the roles.',
              'Set up the communication plan (next section).',
              'Agree the cultural elements (next section).',
              'Check the organisational incorporation.',
              'Optional: create a RACI chart (section 4.2).',
            ],
          },
        ],
      },
      { type: 'table', key: 'people', title: 'People and roles', hint: 'Everyone who holds a project role. Fill in the department for the incorporation graphic and the sub-team for the organisation chart.' },
      {
        type: 'table', key: 'orgSubteams', title: 'Sub-teams', numbered: true, addLabel: 'Add sub-team',
        hint: 'Functional sub-teams come from one department; interdisciplinary ones mix several. Members also join a sub-team through the "Sub-team" column of the people list.',
        columns: [
          { key: 'name', label: 'Sub-team', kind: 'text', w: 16, placeholder: 'e.g. Logistics' },
          { key: 'type', label: 'Type', kind: 'select', options: ['Functional', 'Interdisciplinary'], w: 12 },
          { key: 'lead', label: 'Lead', kind: 'person', w: 14 },
          { key: 'members', label: 'Members', kind: 'people', w: 20 },
          { key: 'decision', label: 'Decision power', kind: 'text', w: 22, placeholder: 'What the sub-team may decide alone' },
          { key: 'meets', label: 'Meets', kind: 'text', w: 12, placeholder: 'e.g. Weekly' },
        ],
        defaults: [
          { _ph: { name: 'e.g. Logistics', decision: 'e.g. Orders up to €2,000', meets: 'e.g. Weekly' } },
          { _ph: { name: 'e.g. Communication', decision: 'e.g. Wording of all mailings', meets: 'e.g. As required' } },
        ],
      },
      {
        type: 'graphic', title: 'Organisation chart',
        caption: 'The board with the project owner on top, the PM and the core team in the band, staff positions beside the PM and the sub-teams below. People with a sub-team that is not in the table form their own sub-team.',
        empty: (q) => (q.people().length ? null : 'Add people with their project roles to see the organisation chart.'),
        render: renderOrgChart,
      },
      { type: 'h', text: 'Role descriptions', sub: 'Each role has tasks, powers and responsibilities. Roles are independent of people; one person often holds several.' },
      {
        type: 'table', key: 'orgRoles', title: 'Roles', numbered: true, addLabel: 'Add role',
        hint: 'Individual roles are held by one person, group roles by a body. Note who holds each role.',
        columns: [
          { key: 'role', label: 'Role', kind: 'text', w: 16, placeholder: 'Name of the role' },
          { key: 'kind', label: 'Kind', kind: 'select', options: ['Individual', 'Group'], w: 10 },
          { key: 'tasks', label: 'Tasks', kind: 'textarea', w: 24 },
          { key: 'powers', label: 'Powers', kind: 'textarea', w: 22, sub: 'may decide' },
          { key: 'resp', label: 'Responsibilities', kind: 'textarea', w: 22, sub: 'answers for' },
          { key: 'heldBy', label: 'Held by', kind: 'people', w: 16 },
        ],
        defaults: [
          { role: 'Project owner', kind: 'Individual', _ph: { tasks: 'Commissions the project, sets objectives and priorities', powers: 'Releases charter, PM plan, budget and changes', resp: 'Benefit of the project for the organisation' } },
          { role: 'Project manager', kind: 'Individual', _ph: { tasks: 'Plans, steers and controls the project, leads the core team, reports to the owner', powers: 'Decides within the approved plan, assigns work packages', resp: 'Reaching the objectives in scope, time and budget' } },
          { role: 'Project management team member', kind: 'Individual', _ph: { tasks: 'Plans and runs own work packages, often leads a sub-team', powers: 'Decides on content within own work packages', resp: 'Results, dates and costs of own work packages' } },
          { role: 'Project team member', kind: 'Individual', _ph: { tasks: 'Does the work in the work packages', powers: 'Decides how to carry out assigned tasks', resp: 'Quality and dates of own tasks' } },
          { role: 'Project board', kind: 'Group', _ph: { tasks: 'Steers the project from the organisation\'s side, settles conflicts', powers: 'Decides on milestones, changes and escalations', resp: 'Fit with the strategy of the organisation' } },
          { role: 'Project management team', kind: 'Group', _ph: { tasks: 'Coordinates the work packages, prepares decisions', powers: 'Decides cross-cutting questions in the controlling meeting', resp: 'Integrated plan and status of the whole project' } },
          { role: 'Project team(s)', kind: 'Group', _ph: { tasks: 'Does the content work in sub-teams', powers: 'Decision power as agreed for each sub-team', resp: 'Results of the sub-team' } },
        ],
      },
      {
        type: 'table', key: 'orgExpectations', title: 'Mutual expectations', numbered: true, addLabel: 'Add expectation',
        hint: 'Flip-chart method: two roles write down what they expect from each other, then agree. Start with project owner and project manager.',
        columns: [
          { key: 'from', label: 'From role', kind: 'select', options: (q) => roleNames(q), w: 16 },
          { key: 'to', label: 'To role', kind: 'select', options: (q) => roleNames(q), w: 16 },
          { key: 'expectation', label: 'Expectation', kind: 'textarea', w: 40 },
          { key: 'agreed', label: 'Agreed', kind: 'check', w: 6 },
        ],
        defaults: [
          { from: 'Project owner', to: 'Project manager', _ph: { expectation: 'What the project owner expects from the project manager' } },
          { from: 'Project manager', to: 'Project owner', _ph: { expectation: 'What the project manager expects from the project owner' } },
        ],
      },
      {
        type: 'graphic', title: 'Mutual expectations',
        caption: 'The pair of roles with the most expectations, facing each other. The upper list is what the left role expects, the lower list what the right role expects.',
        empty: (q) => (pickPair(q) ? null : 'Pick a "from" and a "to" role for an expectation to see the two roles face to face.'),
        render: renderExpectations,
      },
      { type: 'h', text: 'Organisational incorporation', sub: 'The form of organisation settles who decides about a team member: the line manager or the PM.' },
      {
        type: 'table', key: 'orgIncorporation', title: 'Who decides?',
        hint: 'The middle columns show the three classic forms. In the last two columns, write who decides in your project, on the content side and on the staff side.',
        fixed: INC,
        columns: [
          { key: 'q', label: 'Question', from: true, w: 9 },
          { key: 'content', label: 'Content side', from: true, w: 16 },
          { key: 'staff', label: 'Staff side', from: true, w: 16 },
          { key: 'infl', label: 'Influence', from: true, w: 8 },
          { key: 'matrix', label: 'Matrix', from: true, w: 8 },
          { key: 'pure', label: 'Pure project', from: true, w: 8 },
          { key: 'contentDec', label: 'Content side', sub: 'in our project the decision lies with', kind: 'select', options: ['Line', 'PM', 'Shared'], w: 12 },
          { key: 'staffDec', label: 'Staff side', sub: 'in our project the decision lies with', kind: 'select', options: ['Line', 'PM', 'Shared'], w: 12 },
        ],
      },
      {
        type: 'fields', title: 'Form of organisation', cols: 2,
        hint: 'The suggestion counts how many of your answers match each form (Shared counts half).',
        fields: [
          { key: 'org.form', label: 'Form we use', kind: 'select', options: FORMS.map((f) => f.id) },
          { key: 'org.formSuggestion', label: 'Closest to your answers', kind: 'text', compute: (q) => suggestionText(q) },
          { key: 'org.formReason', label: 'Why this form', kind: 'textarea', wide: true, placeholder: 'Reasons for the form, and how you deal with its weak points' },
        ],
      },
      {
        type: 'table', key: 'orgForms', title: 'The three forms compared',
        fixed: FORM_REF,
        columns: [
          { key: 'form', label: 'Form', from: true, w: 12 },
          { key: 'position', label: 'Position of the PM', from: true, w: 18 },
          { key: 'adv', label: 'Advantages', from: true, w: 24 },
          { key: 'dis', label: 'Disadvantages', from: true, w: 24 },
          { key: 'fits', label: 'Fits us?', kind: 'select', options: ['Yes', 'Partly', 'No'], w: 8 },
        ],
      },
      {
        type: 'graphic', title: 'Organisational incorporation',
        caption: 'The line organisation with its departments and the project side by side. The large panel shows the chosen form (or the suggested one); the two small panels show the other forms for comparison. Departments come from the people list.',
        render: renderIncorporation,
      },
      {
        type: 'checks', title: 'Checks',
        run(q) {
          const out = [];
          const po = q.withRole('Project owner').filter((p) => p.name);
          const pm = q.withRole('Project manager').filter((p) => p.name);
          out.push({ ok: po.length > 0 && pm.length > 0, text: po.length && pm.length ? 'Project owner and project manager are named.' : 'Name the project owner and the project manager in the people list.' });
          const resp = [];
          q.wps().forEach((w) => {
            if (w.responsible && !resp.includes(w.responsible)) resp.push(w.responsible);
          });
          if (!resp.length) out.push({ ok: null, text: 'Assign responsible persons to the work packages to check the core team.' });
          else {
            const miss = resp.filter((id) => {
              const p = q.person(id);
              return p && !has(p, 'PMTM') && !has(p, 'Project manager');
            });
            out.push({ ok: !miss.length, text: miss.length ? 'Responsible for work packages but not in the core team: ' + miss.map((id) => q.name(id)).join(', ') + '.' : 'Everyone responsible for a work package is in the core team.' });
          }
          const teams = q.rows('orgSubteams').filter((r) => r.name);
          if (teams.length) {
            const noLead = teams.filter((r) => !r.lead).map((r) => r.name);
            out.push({ ok: !noLead.length, text: noLead.length ? 'Sub-teams without a lead: ' + noLead.join(', ') + '.' : 'Every sub-team has a lead.' });
            const noDec = teams.filter((r) => !r.decision).map((r) => r.name);
            out.push({ ok: !noDec.length, text: noDec.length ? 'Decision power not set for: ' + noDec.join(', ') + '.' : 'Every sub-team knows its decision power.' });
          }
          const roles = q.rows('orgRoles').filter((r) => r.role);
          const empty = roles.filter((r) => !(r.heldBy || []).length).map((r) => r.role);
          out.push({ ok: !empty.length, text: empty.length ? 'Roles without a holder: ' + empty.join(', ') + '.' : 'Every role has a holder.' });
          const sug = formScores(q);
          const form = q.f('org.form');
          if (sug && form) {
            const same = sug.ties.some((f) => f.id === form);
            out.push({ ok: same ? true : null, text: same ? 'The chosen form matches your answers.' : 'Your answers are closest to ' + sug.best.id + '. Explain why you use ' + form + '.' });
          }
          return out;
        },
      },
    ],
  });

  // =====================================================================================
  // Section 4.1 (cont.): Communication, culture and team development
  // =====================================================================================
  const COMM_BOARD = 'Present progress; discuss deviations with causes and measures; take the decisions the controlling meeting asks for; approve the progress report';
  const COMM_CTRL = 'Project status; controlling of scope, dates, resources and costs; stakeholder relations and risks; overarching problems; prepare decisions for the board; next steps';
  const COMM_SUB = 'Coordinate the sub-team; discuss content topics and the decisions they need; plan next steps';

  PM.section({
    id: 'communication',
    part: 'start',
    order: 41.5,
    num: '4.1',
    step: 'S1',
    slides: '91–96',
    title: 'Communication, culture and team development',
    navTitle: 'Communication and culture',
    intro: 'Plan the regular meetings, agree the culture of the project and follow how the team grows together.',
    landscape: true,
    blocks: [
      {
        type: 'guide', title: 'Communication plan',
        items: [
          'Set clear paths for information and decisions, and cover the regular needs, including information for stakeholders.',
          'Keep content meetings apart from project management meetings.',
          'Choose the form by purpose: one-to-one talk, meeting, workshop or presentation.',
          'Give every regular meeting a chair, a rhythm and someone who writes the minutes.',
        ],
      },
      {
        type: 'table', key: 'orgComm', title: 'Communication plan', numbered: true, addLabel: 'Add meeting',
        columns: [
          { key: 'name', label: 'Meeting', kind: 'text', w: 16, placeholder: 'Name of the meeting' },
          { key: 'objectives', label: 'Objectives and content', kind: 'textarea', w: 28 },
          { key: 'participants', label: 'Participants', kind: 'text', w: 16 },
          { key: 'chair', label: 'Chair', kind: 'person', w: 12 },
          { key: 'rhythm', label: 'Rhythm', kind: 'select', options: RHYTHMS, w: 11 },
          { key: 'first', label: 'First date', kind: 'date' },
          { key: 'place', label: 'Place', kind: 'text', w: 12, placeholder: 'Room' },
          { key: 'form', label: 'Form', kind: 'select', options: ['One-to-one talk', 'Meeting', 'Workshop', 'Presentation'], w: 11 },
          { key: 'kind', label: 'Kind', kind: 'select', options: ['Project management', 'Content'], w: 12 },
          { key: 'minutesBy', label: 'Minutes by', kind: 'person', w: 12 },
        ],
        defaults: [
          { name: 'Project board meeting', objectives: COMM_BOARD, participants: 'PO, PM, board members', rhythm: 'Every 4 weeks', form: 'Meeting', kind: 'Project management' },
          { name: 'Project controlling meeting', objectives: COMM_CTRL, participants: 'PM, core team members', rhythm: 'Every 4 weeks', form: 'Meeting', kind: 'Project management' },
          { name: 'Sub-team meeting', objectives: COMM_SUB, participants: 'Sub-team', rhythm: 'As required', form: 'Meeting', kind: 'Content' },
          { name: 'Project start workshop', objectives: 'Work out planning and organisation together; agree roles, meetings and ground rules', participants: 'PM, core team, team members', rhythm: 'Once', form: 'Workshop', kind: 'Project management' },
          { name: 'Kick-off meeting', objectives: 'Present the results so far and brief the whole team', participants: 'PO, PM, core team, team members', rhythm: 'Once', form: 'Presentation', kind: 'Project management' },
        ],
      },
      {
        type: 'graphic', title: 'Communication calendar',
        caption: 'Each dot is one meeting, computed from the first date and the rhythm up to the project end. The number on the right counts the meetings.',
        empty: (q) => (commRange(q) ? null : 'Add the project start and end dates (time boundaries) or a first date for a meeting to see the calendar.'),
        render: renderCalendar,
      },
      { type: 'h', text: 'Project culture', sub: 'Every project has its own culture, which can differ from the company\'s. Name, logo, slogan, roles, ground rules, rituals and the style of management give it an identity.' },
      {
        type: 'fields', title: 'Identity', cols: 3,
        fields: [
          { key: 'org.projectName', label: 'Project name', kind: 'text', placeholder: 'Short name the team uses' },
          { key: 'org.slogan', label: 'Slogan', kind: 'text', placeholder: 'One line the team can stand behind' },
          { key: 'org.logo', label: 'Logo', kind: 'text', placeholder: 'Describe the logo or where it is stored' },
          { key: 'org.style', label: 'Style of management and communication', kind: 'textarea', wide: true, placeholder: 'How decisions are made, how open the team talks, how feedback works' },
        ],
      },
      {
        type: 'table', key: 'orgRules', title: 'Ground rules', numbered: true, addLabel: 'Add rule',
        hint: 'Agree the rules with the team, usually at the start workshop, and write down why each one matters.',
        columns: [
          { key: 'rule', label: 'Rule', kind: 'text', w: 24 },
          { key: 'why', label: 'Why', kind: 'textarea', w: 32 },
          { key: 'agreed', label: 'Agreed on', kind: 'date' },
        ],
        defaults: [
          { rule: 'No deputies', _ph: { why: 'e.g. Decisions need the people who carry them out' } },
          { rule: 'Minutes are binding', _ph: { why: 'e.g. What is in the minutes counts' } },
          { rule: 'E-mail is the primary channel', _ph: { why: 'e.g. Everyone gets the same information' } },
          { rule: 'Phones off in meetings', _ph: { why: 'e.g. Short meetings with full attention' } },
          { rule: 'We give and receive feedback', _ph: { why: 'e.g. A feedback round at the end of each meeting' } },
        ],
      },
      {
        type: 'table', key: 'orgRituals', title: 'Rituals and social events', numbered: true, addLabel: 'Add ritual',
        columns: [
          { key: 'what', label: 'What', kind: 'text', w: 22 },
          { key: 'when', label: 'When', kind: 'text', w: 18 },
          { key: 'who', label: 'Who', kind: 'text', w: 18 },
        ],
        defaults: [
          { _ph: { what: 'e.g. Weekly team coffee', when: 'e.g. Fridays, 9:00', who: 'Whole team' } },
          { _ph: { what: 'e.g. Wrap-up party', when: 'After the end event', who: 'Team, PO and helpers' } },
        ],
      },
      { type: 'h', text: 'Team development', sub: 'Teams go through five phases. Watch for the signs and steer: give orientation early, settle conflicts, delegate once the norms hold, close with a joint review.' },
      {
        type: 'table', key: 'orgTeamPhases', title: 'Team phases',
        fixed: PHASES.map((p) => ({ _id: p._id, phase: p.phase, signs: p.signs })),
        columns: [
          { key: 'phase', label: 'Phase', from: true, w: 11 },
          { key: 'signs', label: 'Typical signs', from: true, w: 18 },
          { key: 'when', label: 'When', kind: 'text', w: 12, placeholder: 'e.g. Feb 2026' },
          { key: 'noticed', label: 'What we noticed', kind: 'textarea', w: 26 },
          { key: 'pmDid', label: 'What the PM did', kind: 'textarea', w: 26 },
        ],
      },
      {
        type: 'graphic', title: 'Team development',
        caption: 'Performance over time through the five phases, with the dip in storming. Under each phase: when it happened and what the PM did. Phases without entries are drawn muted.',
        render: renderTeam,
      },
      {
        type: 'checks', title: 'Checks',
        run(q) {
          const out = [];
          const rows = q.rows('orgComm').filter((r) => r.name);
          const names = rows.map((r) => norm(r.name)).join('|');
          out.push({ ok: /board|steering|psc/.test(names), text: /board|steering|psc/.test(names) ? 'The plan has a board meeting.' : 'Add a board (steering) meeting.' });
          out.push({ ok: /controlling/.test(names), text: /controlling/.test(names) ? 'The plan has a controlling meeting.' : 'Add a project controlling meeting.' });
          const noKind = rows.filter((r) => !r.kind).map((r) => r.name);
          out.push({ ok: !noKind.length, text: noKind.length ? 'Kind not set (content or project management): ' + noKind.join(', ') + '.' : 'Content and project management meetings are kept apart.' });
          const reg = rows.filter((r) => STEP_DAYS[r.rhythm] || STEP_MONTHS[r.rhythm]);
          const gaps = reg.filter((r) => !r.chair || !r.minutesBy).map((r) => r.name);
          if (reg.length) out.push({ ok: !gaps.length, text: gaps.length ? 'Chair or minute-taker missing: ' + gaps.join(', ') + '.' : 'Every regular meeting has a chair and a minute-taker.' });
          const rules = q.rows('orgRules').filter((r) => r.rule);
          const open = rules.filter((r) => !r.agreed).length;
          out.push({ ok: rules.length ? !open : null, text: !rules.length ? 'No ground rules yet.' : open ? open + ' ground rule(s) not agreed with the team yet.' : 'All ground rules are agreed.' });
          return out;
        },
      },
    ],
  });

  PM.metric('teamSize', { label: 'Team size', kind: 'number', unit: 'people', section: 'organisation', fn: (q) => q.people().filter((p) => p.name).length || null });
  PM.metric('meetings', { label: 'Regular meetings', kind: 'number', section: 'communication', fn: (q) => q.rows('orgComm').filter((r) => r.name && r.rhythm && r.rhythm !== 'Once').length || null });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  PM.example({
    f: {
      'org.form': 'Matrix organisation',
      'org.formReason': 'Team members stay in their departments and work on the festival part-time, so a pure project unit would be too much. The PM needs a say on dates and costs, so a staff position would be too weak. Weak point: double reporting. We agreed with the heads of department in February how many days each person gives to the project.',
      'org.projectName': 'Sommerfest 26',
      'org.slogan': 'One team, one summer',
      'org.logo': 'A sun over a festival tent in the company colours, drawn by the marketing team; stored in the shared project folder',
      'org.style': 'Open and direct. Decisions are taken in the controlling meeting and written into the minutes. Sub-team leads decide within their budget. Five minutes of feedback at the end of each controlling meeting.',
    },
    t: {
      orgSubteams: [
        { _id: 's1', name: 'Programme', type: 'Interdisciplinary', lead: 'p3', members: [], decision: 'Books artists up to €2,000 per booking', meets: 'As required' },
        { _id: 's2', name: 'Venue and logistics', type: 'Functional', lead: 'p4', members: ['p7'], decision: 'Orders from suppliers up to €5,000 within budget', meets: 'Weekly' },
        { _id: 's3', name: 'Communication', type: 'Functional', lead: 'p5', members: ['p8'], decision: 'Wording and design of all festival communication', meets: 'As required' },
        { _id: 's4', name: 'Budget and sponsoring', type: 'Functional', lead: 'p6', members: [], decision: 'Sponsor packages according to the agreed price list', meets: 'As required' },
      ],
      orgRoles: [
        { _id: 'r1', role: 'Project owner', kind: 'Individual', tasks: 'Commissions the festival, sets objectives and the budget frame, opens the festival', powers: 'Releases charter, PM plan and changes over €2,000; decides on escalations', resp: 'Benefit of the festival for employer branding and team spirit', heldBy: ['p1'] },
        { _id: 'r2', role: 'Project manager', kind: 'Individual', tasks: 'Plans and steers the project, leads the core team, chairs the controlling meeting, reports every four weeks', powers: 'Decides within the approved plan; uses up to 50% of the reserve', resp: 'Festival held on 27 June within budget and with the agreed quality', heldBy: ['p2'] },
        { _id: 'r3', role: 'Project management team member', kind: 'Individual', tasks: 'Plans and runs own work packages, leads a sub-team, reports status in the controlling meeting', powers: 'Decides on content and suppliers within own work packages and sub-team budget', resp: 'Results, dates and costs of own work packages', heldBy: ['p3', 'p4', 'p5', 'p6'] },
        { _id: 'r4', role: 'Project team member', kind: 'Individual', tasks: 'Works on tasks in a sub-team, e.g. set-up plan or mailings', powers: 'Decides how to carry out assigned tasks', resp: 'Quality and dates of own tasks', heldBy: ['p7', 'p8'] },
        { _id: 'r5', role: 'Project assistant', kind: 'Individual', tasks: 'Keeps the project folder, writes the minutes, prepares status reports', powers: 'Sends invitations and minutes on behalf of the PM', resp: 'Complete and current project documents', heldBy: ['p9'] },
        { _id: 'r6', role: 'Project board', kind: 'Group', tasks: 'Steers the festival from the management side, settles conflicts between departments', powers: 'Approves milestones, changes over €2,000 and the use of the reserve above 50%', resp: 'Fit of the festival with the HR and communication strategy', heldBy: ['p1', 'p10'] },
        { _id: 'r7', role: 'Project management team', kind: 'Group', tasks: 'Coordinates the work packages and prepares decisions for the board', powers: 'Decides cross-cutting questions in the controlling meeting', resp: 'Integrated plan and status of the whole festival', heldBy: ['p2', 'p3', 'p4', 'p5', 'p6'] },
        { _id: 'r8', role: 'Project team(s)', kind: 'Group', tasks: 'Do the content work in the four sub-teams', powers: 'Decision power as set for each sub-team', resp: 'Results of the sub-team', heldBy: ['p3', 'p4', 'p5', 'p6', 'p7', 'p8'] },
      ],
      orgExpectations: [
        { _id: 'e1', from: 'Project owner', to: 'Project manager', expectation: 'Reports deviations as soon as they appear, with causes and options', agreed: true },
        { _id: 'e2', from: 'Project owner', to: 'Project manager', expectation: 'Keeps the festival within the approved budget and asks before using more than half of the reserve', agreed: true },
        { _id: 'e3', from: 'Project owner', to: 'Project manager', expectation: 'Sends a one-page status report two days before each board meeting', agreed: true },
        { _id: 'e4', from: 'Project manager', to: 'Project owner', expectation: 'Decides within five working days when the controlling meeting asks for a decision', agreed: true },
        { _id: 'e5', from: 'Project manager', to: 'Project owner', expectation: 'Backs the project with the heads of department when staff are needed', agreed: true },
        { _id: 'e6', from: 'Project manager', to: 'Project owner', expectation: 'Takes part in the first hour of the kick-off and opens the festival', agreed: false },
      ],
      orgComm: [
        { _id: 'c1', name: 'Kick-off meeting', objectives: 'Present the charter and the festival idea, introduce the team and the roles, explain the next steps', participants: 'PO, PM, core team, team members', chair: 'p2', rhythm: 'Once', first: '2026-02-04', place: 'Canteen, head office', form: 'Presentation', kind: 'Project management', minutesBy: 'p9' },
        { _id: 'c2', name: 'Project start workshop', objectives: 'Agree objectives, WBS, roles, meetings and ground rules; build the team', participants: 'PM, core team, team members', chair: 'p2', rhythm: 'Once', first: '2026-02-05', place: 'Seminar hotel by the lake', form: 'Workshop', kind: 'Project management', minutesBy: 'p9' },
        { _id: 'c3', name: 'Project controlling meeting', objectives: COMM_CTRL, participants: 'PM, core team, project assistant', chair: 'p2', rhythm: 'Every 2 weeks', first: '2026-02-18', place: 'Room 2.14', form: 'Meeting', kind: 'Project management', minutesBy: 'p9' },
        { _id: 'c4', name: 'Project board meeting', objectives: COMM_BOARD, participants: 'PO, management board member, PM', chair: 'p1', rhythm: 'Every 4 weeks', first: '2026-03-02', place: 'Board room', form: 'Meeting', kind: 'Project management', minutesBy: 'p9' },
        { _id: 'c5', name: 'Sub-team Venue and logistics', objectives: 'Coordinate suppliers, set-up plan and safety topics; plan next steps', participants: 'Tom Schmid, Mia Fischer, suppliers when needed', chair: 'p4', rhythm: 'Weekly', first: '2026-03-04', place: 'Facility office', form: 'Meeting', kind: 'Content', minutesBy: 'p7' },
        { _id: 'c6', name: 'Other sub-team meetings', objectives: COMM_SUB + ' (Programme, Communication, Budget and sponsoring)', participants: 'Sub-team lead and members', chair: '', rhythm: 'As required', first: '', place: 'Team rooms', form: 'Meeting', kind: 'Content', minutesBy: '' },
      ],
      orgRules: [
        { _id: 'g1', rule: 'No deputies', why: 'Decisions need the people who carry them out', agreed: '2026-02-05' },
        { _id: 'g2', rule: 'Minutes are binding', why: 'What is in the minutes counts; objections within two working days', agreed: '2026-02-05' },
        { _id: 'g3', rule: 'E-mail is the primary channel', why: 'Everyone gets the same information; chat only for quick questions', agreed: '2026-02-05' },
        { _id: 'g4', rule: 'Phones off in meetings', why: 'Short meetings with full attention', agreed: '2026-02-05' },
        { _id: 'g5', rule: 'We give and receive feedback', why: 'Five minutes of feedback at the end of each controlling meeting', agreed: '2026-02-05' },
      ],
      orgRituals: [
        { _id: 'k1', what: 'Friday coffee', when: 'Every Friday, 9:00, 15 minutes', who: 'Whole project team' },
        { _id: 'k2', what: 'Festival crew T-shirts', when: 'Handed out at the start workshop, worn on the festival day', who: 'Everyone in the project' },
        { _id: 'k3', what: 'Wrap-up party', when: '24 Jul 2026', who: 'Project team, PO and helpers' },
      ],
    },
    x: {
      orgIncorporation: {
        what: { contentDec: 'PM', staffDec: 'PM' },
        when: { contentDec: 'PM', staffDec: 'Shared' },
        how: { contentDec: 'Line', staffDec: 'Line' },
        howgood: { contentDec: 'Line', staffDec: 'Shared' },
        howmuch: { contentDec: 'PM', staffDec: 'Line' },
        who: { contentDec: 'Line', staffDec: 'Line' },
      },
      orgForms: {
        influence: { fits: 'No' },
        pure: { fits: 'No' },
        matrix: { fits: 'Yes' },
      },
      orgTeamPhases: {
        forming: { when: 'Feb 2026', noticed: 'Polite, careful questions at the kick-off; many questions went to the PM', pmDid: 'Explained goals and roles; ran the start workshop with team exercises' },
        storming: { when: 'Mar 2026', noticed: 'Conflict between Programme and Budget about artist fees; sub-team leads unsure what they may decide', pmDid: 'Moderated a clarification meeting; set spending limits per sub-team' },
        norming: { when: 'Apr 2026', noticed: 'Ground rules are lived; sub-teams coordinate on their own', pmDid: 'Delegated decisions to the sub-team leads; started the Friday coffee' },
        performing: { when: 'May–Jun 2026', noticed: 'Fast decisions and mutual help in the festival week', pmDid: 'Stayed out of details; kept extra requests away from the team' },
        adjourning: { when: 'Jul 2026', noticed: 'Lessons learned workshop and wrap-up party', pmDid: 'Held the review, thanked the team, released members back to the line' },
      },
    },
  });
})();
