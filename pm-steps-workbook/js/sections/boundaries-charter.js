/* Framework 3.3: boundaries and context of the project (the six fields) and the Project Charter. */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const CLASSES = ['Schedule', 'Budget', 'Scope or functional', 'Procedural', 'Other'];
  const NO_CLASS = 'Not classified';
  const PRIOS = ['Must', 'Should', 'Nice to have'];
  const CTX_TYPES = ['Company strategy', 'Similar or parallel project', 'Line task', 'Legal', 'Political', 'Economic', 'Ecological', 'Social', 'Cultural', 'Assumption or critical parameter'];
  const NO_TYPE = 'Type not set';
  const EFFECTS = ['Supports', 'Conflicts', 'Neutral'];
  const RES_TYPES = ['Staff (internal)', 'External labour', 'Material or investment', 'Other'];
  /** Objective classes that pull against each other when both carry a Must objective (the triple constraint). */
  const CONFLICT_PAIRS = [['Schedule', 'Budget'], ['Scope or functional', 'Budget'], ['Scope or functional', 'Schedule']];
  /** Objectives that start like a task ("Create…", "Organise…") instead of describing a future state. */
  const VERB_RE = /^(to\s+)?(create|creating|build|building|organi[sz]e|organi[sz]ing|do|doing|make|making|develop|developing|plan|planning|implement|implementing|run|running|hold|holding|set up|setting up|prepare|preparing|write|writing|deliver|delivering|install|installing|introduce|introducing|carry out|conduct|conducting|establish|establishing|design|designing|launch|launching)\b/i;

  // =====================================================================================
  // Helpers
  // =====================================================================================

  /** Value of a cell for drawing: {t, ph}. ph = placeholder (draw muted and italic). */
  function val(q, row, col, fb) {
    const v = row ? row[col] : '';
    if (!U.isEmpty(v)) return { t: String(v), ph: false };
    const l = row ? q.label(row, col) : '';
    return { t: l || fb || '', ph: true };
  }
  function personVal(q, id, fb) {
    const p = id ? q.person(id) : null;
    if (p && p.name) return { t: p.name, ph: false };
    if (p) {
      const l = q.label(p, 'name');
      if (l) return { t: l, ph: true };
    }
    return { t: fb || '', ph: true };
  }
  function sty(v, base, pal) {
    return v.ph ? Object.assign({}, base, { fill: pal.muted, italic: true }) : base;
  }
  function fieldVal(q, key, fb) {
    const v = q.f(key);
    return U.isEmpty(v) ? { t: fb, ph: true } : { t: String(v), ph: false };
  }
  const idList = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []);
  const roleIds = (q, role) => q.withRole(role).map((p) => p._id);
  const poId = (q) => q.f('charter.po') || roleIds(q, 'Project owner')[0] || '';
  const pmId = (q) => q.f('charter.pm') || roleIds(q, 'Project manager')[0] || '';
  function coreIds(q) {
    const v = idList(q.f('charter.coreTeam'));
    return v.length ? v : roleIds(q, 'PMTM');
  }
  function teamIds(q) {
    const v = idList(q.f('charter.team'));
    return v.length ? v : roleIds(q, 'Team member');
  }
  const filled = (rows, col) => rows.filter((r) => !U.isEmpty(r[col]));
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

  /** The content phases (WBS level 2). Project management (1.1) is left out when other phases exist. */
  function phaseList(q) {
    const all = q.rows('boundPhases').slice().sort((a, b) => U.codeCmp(a.code, b.code));
    const content = all.filter((r) => r.kind !== 'PM phase');
    return content.length ? content : all;
  }
  /** First sentence or list item of a longer text. */
  function firstPart(text) {
    return String(text || '').split(/\n/)[0].split(/;\s|\.\s/)[0].replace(/[.;]\s*$/, '').trim();
  }
  function durText(q) {
    const a = q.f('time.startDate');
    const b = q.f('time.endDate');
    if (!U.isDate(a) || !U.isDate(b)) return '';
    const d = U.diffDays(a, b) + 1;
    if (d <= 0) return 'end is before the start';
    return d + ' days, about ' + Math.round((d / 30.44) * 10) / 10 + ' months';
  }
  function hex(x, y, w, h, t, o) {
    return S.poly([[x, y + h / 2], [x + t, y], [x + w - t, y], [x + w, y + h / 2], [x + w - t, y + h], [x + t, y + h]], o);
  }
  /** Fill, outline and edge style for an effect (Supports / Conflicts / Neutral). */
  function effStyle(eff, pal) {
    if (eff === 'Supports') return { fill: pal.goodSoft, stroke: pal.good, edge: { stroke: pal.good, sw: 2 } };
    if (eff === 'Conflicts') return { fill: pal.critSoft, stroke: pal.crit, edge: { stroke: pal.crit, sw: 2, dash: '6 4' } };
    return { fill: pal.box, stroke: pal.boxLine, edge: { stroke: pal.muted, sw: 1.5, dash: '2 3' } };
  }
  function effLegend(pal, labels) {
    return [
      { label: labels[0], color: pal.good, shape: 'line' },
      { label: labels[1], color: pal.crit, shape: 'dash' },
      { label: labels[2], color: pal.muted, shape: 'dash' },
    ];
  }
  function stakeholderGroups(q) {
    const t = PM.tables.stakeholders;
    if (!t || !(t.columns || []).length) return null;
    const rows = q.rows('stakeholders');
    if (!rows.length) return null;
    const map = new Map();
    rows.forEach((r) => {
      const g = r.group || 'Other environment';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(r);
    });
    return Array.from(map.entries()).map(([g, list]) => {
      const crit = list.some((r) => r.attitude === 'Critical');
      const sup = list.some((r) => r.attitude === 'Supportive');
      return { t: g + ' (' + list.length + ')', ph: list.every((r) => U.isEmpty(r.name)), eff: crit ? 'Conflicts' : sup ? 'Supports' : 'Neutral' };
    });
  }

  // =====================================================================================
  // Graphic: the six fields (summary board)
  // =====================================================================================

  function cellTimeBoundary(q, pal, x, y, iw, aid) {
    let o = '';
    const se = q.f('time.startEvent');
    const ee = q.f('time.endEvent');
    const sd = q.f('time.startDate');
    const ed = q.f('time.endDate');
    const half = iw / 2 - 8;
    o += S.text(x, y, 'Start', { size: 11, weight: 600, fill: pal.muted });
    o += S.text(x + iw, y, 'End', { size: 11, weight: 600, fill: pal.muted, anchor: 'end' });
    const sb = S.textBlock(x, y + 16, se || 'Start event', { maxW: half, size: 11.5, maxLines: 3, fill: se ? pal.ink : pal.muted, italic: !se });
    const eb = S.textBlock(x + iw, y + 16, ee || 'End event', { maxW: half, size: 11.5, maxLines: 3, fill: ee ? pal.ink : pal.muted, italic: !ee, anchor: 'end' });
    o += sb.svg + eb.svg;
    let yy = y + 16 + Math.max(sb.h, eb.h) + 6;
    o += S.text(x, yy, U.isDate(sd) ? U.fmtDate(sd) : 'Start date', { size: 12, weight: 600, fill: sd ? pal.ink : pal.muted, italic: !sd });
    o += S.text(x + iw, yy, U.isDate(ed) ? U.fmtDate(ed) : 'End date', { size: 12, weight: 600, fill: ed ? pal.ink : pal.muted, italic: !ed, anchor: 'end' });
    yy += 24;
    const bx0 = x + 4;
    const bx1 = x + iw - 4;
    const dur = durText(q);
    o += S.text(x + iw / 2, yy, S.fit(dur ? 'Duration ' + dur : 'Duration: add both dates', iw - 30, 11.5, 600), { size: 11.5, weight: dur ? 600 : 400, fill: dur ? pal.ink : pal.muted, italic: !dur, anchor: 'middle' });
    o += S.line(bx0, yy - 4, bx0, yy + 30, { stroke: pal.axis, dash: '3 3' });
    o += S.line(bx1, yy - 4, bx1, yy + 30, { stroke: pal.axis, dash: '3 3' });
    o += S.line(bx0 + 1, yy + 20, bx1 - 1, yy + 20, { stroke: pal.ink2, sw: 1.2, markerStart: aid, markerEnd: aid });
    const by = yy + 30;
    o += hex(bx0, by, bx1 - bx0, 30, 12, { fill: pal.accent });
    o += S.text(x + iw / 2, by + 15, S.fit(q.f('meta.name') || 'Project', iw - 40, 12, 600), { size: 12, weight: 600, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
    return { svg: o, h: by + 30 - y };
  }

  function cellContentBoundary(q, pal, x, y, iw) {
    let o = '';
    let yy = y;
    const head = (t) => {
      o += S.text(x, yy, t, { size: 11, weight: 600, fill: pal.muted });
      yy += 16;
    };
    const more = (n, dx) => {
      o += S.text(x + dx, yy, '+ ' + n + ' more', { size: 11, fill: pal.muted, italic: true });
      yy += 15;
    };
    // objectives
    const objs = q.rows('boundObjectives');
    head('Objectives');
    if (!objs.length) {
      o += S.text(x, yy, 'None yet', { size: 11.5, fill: pal.muted, italic: true });
      yy += 16;
    }
    objs.slice(0, 3).forEach((r) => {
      const v = val(q, r, 'objective', 'Objective');
      o += S.circle(x + 3, yy + 6, 2.5, { fill: pal.accent });
      o += S.text(x + 11, yy, S.fit(v.t, iw - 11, 11.5), sty(v, { size: 11.5, fill: pal.ink }, pal));
      yy += 16;
    });
    if (objs.length > 3) more(objs.length - 3, 11);
    yy += 4;
    // non-objectives, crossed out
    const nons = q.rows('boundNonObjectives');
    head('Non-objectives');
    if (!nons.length) {
      o += S.text(x, yy, 'None yet', { size: 11.5, fill: pal.muted, italic: true });
      yy += 16;
    }
    nons.slice(0, 2).forEach((r) => {
      const v = val(q, r, 'exclusion', 'Non-objective');
      const t = S.fit(v.t, iw - 13, 11.5);
      o += S.line(x, yy + 2, x + 7, yy + 9, { stroke: pal.crit, sw: 1.5, cap: 'round' });
      o += S.line(x, yy + 9, x + 7, yy + 2, { stroke: pal.crit, sw: 1.5, cap: 'round' });
      o += S.text(x + 13, yy, t, sty(v, { size: 11.5, fill: pal.ink2 }, pal));
      o += S.line(x + 13, yy + 6, x + 13 + S.measure(t, 11.5), yy + 6, { stroke: v.ph ? pal.muted : pal.ink2, sw: 1 });
      yy += 16;
    });
    if (nons.length > 2) more(nons.length - 2, 13);
    yy += 4;
    // phases as a chevron strip
    head('Phases');
    const ph = phaseList(q);
    if (!ph.length) {
      o += S.text(x, yy, 'Add phases (1.2, 1.3 …) to the WBS', { size: 11.5, fill: pal.muted, italic: true });
      yy += 18;
    } else {
      const shown = ph.length > 8 ? ph.slice(0, 7) : ph;
      const cells = shown.map((r) => ({ code: r.code, v: val(q, r, 'name', 'Phase') }));
      if (ph.length > 8) cells.push({ code: '+' + (ph.length - 7), v: { t: (ph.length - 7) + ' more phases', ph: true } });
      const n = cells.length;
      const cw = iw / n;
      const tip = Math.min(8, cw / 3);
      cells.forEach((c, i) => {
        o += S.chevron(x + i * cw, yy, cw - 2, 22, { first: i === 0, fill: pal.accentSoft, stroke: pal.accent, sw: 1, tip });
        o += S.text(x + i * cw + (cw - 2) / 2 + (i ? tip / 4 : -tip / 4), yy + 11, S.fit(c.code, cw - 2 * tip - 2, 11, 400, 'mono'), { size: 11, family: 'mono', fill: pal.ink, anchor: 'middle', v: 'middle' });
      });
      yy += 28;
      const colW = iw / 2 - 6;
      cells.forEach((c, i) => {
        const cx = x + (i % 2) * (iw / 2 + 6);
        const cy = yy + Math.floor(i / 2) * 15;
        const codeW = S.measure(c.code, 11, 400, 'mono') + 5;
        o += S.text(cx, cy, c.code, { size: 11, family: 'mono', fill: pal.muted });
        o += S.text(cx + codeW, cy, S.fit(c.v.t, colW - codeW, 11.5), sty(c.v, { size: 11.5, fill: pal.ink }, pal));
      });
      yy += Math.ceil(n / 2) * 15 + 2;
    }
    yy += 6;
    // rough budget
    const bud = U.num(q.f('content.budget'));
    o += S.line(x, yy - 4, x + iw, yy - 4, { stroke: pal.line });
    o += S.text(x, yy + 2, 'Rough budget', { size: 11, weight: 600, fill: pal.muted });
    o += S.text(x + iw, yy + 1, bud ? q.money(bud) : 'not set', { size: 12, weight: 600, fill: bud ? pal.ink : pal.muted, italic: !bud, anchor: 'end' });
    yy += 16;
    return { svg: o, h: yy - y };
  }

  function cellPeopleBoundary(q, pal, x, y, iw) {
    let o = '';
    const cx = x + iw / 2;
    const pos = q.withRole('Project owner');
    const pms = q.withRole('Project manager');
    const tms = q.withRole('PMTM');
    const pv = pos[0] ? personVal(q, pos[0]._id, 'Project owner') : { t: 'Project owner', ph: true };
    const poW = Math.min(190, iw);
    // the line from PO to PM goes first, so the boxes sit on top of it
    const pw = 96;
    const gap = 10;
    let pills = tms.map((p) => personVal(q, p._id, 'Core team member'));
    if (pills.length > 6) pills = pills.slice(0, 5).concat([{ t: '+ ' + (pills.length - 5) + ' more', ph: true }]);
    const none = !pills.length;
    const rows = none ? 1 : Math.ceil(pills.length / 2);
    const innerW = pw * 2 + gap;
    const innerH = 22 + 8 + rows * 28 - 6;
    const rx = Math.min(iw / 2, (innerW / 2) * 1.42);
    const ry = (innerH / 2) * 1.42 + 2;
    const ey = y + 24 + 14 + ry;
    const pmTop = ey - innerH / 2;
    o += S.line(cx, y + 24, cx, pmTop, { stroke: pal.ink2, sw: 1.2 });
    o += S.ellipse(cx, ey, rx, ry, { stroke: pal.ink2, sw: 1.2, dash: '4 3' });
    o += S.rect(cx - poW / 2, y, poW, 24, { fill: pv.ph ? pal.bg : pal.strong, stroke: pv.ph ? pal.boxLine : null, dash: pv.ph ? '3 2' : null, rx: 12 });
    o += S.text(cx, y + 12, S.fit('PO · ' + pv.t, poW - 16, 11.5, 600), { size: 11.5, weight: 600, fill: pv.ph ? pal.muted : pal.strongInk, italic: pv.ph, anchor: 'middle', v: 'middle' });
    const mv = pms[0] ? personVal(q, pms[0]._id, 'Project manager') : { t: 'Project manager', ph: true };
    o += S.rect(cx - 75, pmTop, 150, 22, { fill: mv.ph ? pal.bg : pal.accent, stroke: mv.ph ? pal.boxLine : null, dash: mv.ph ? '3 2' : null, rx: 11 });
    o += S.text(cx, pmTop + 11, S.fit('PM · ' + mv.t, 138, 11.5, 600), { size: 11.5, weight: 600, fill: mv.ph ? pal.muted : pal.accentInk, italic: mv.ph, anchor: 'middle', v: 'middle' });
    if (none) {
      o += S.rect(cx - innerW / 2, pmTop + 30, innerW, 22, { fill: pal.bg, stroke: pal.boxLine, dash: '3 2', rx: 11 });
      o += S.text(cx, pmTop + 41, 'Core team members (PMTM)', { size: 11, fill: pal.muted, italic: true, anchor: 'middle', v: 'middle' });
    }
    pills.forEach((v, i) => {
      const row = Math.floor(i / 2);
      const alone = i === pills.length - 1 && pills.length % 2 === 1;
      const px = alone ? cx - pw / 2 : cx - innerW / 2 + (i % 2) * (pw + gap);
      const py = pmTop + 30 + row * 28;
      o += S.rect(px, py, pw, 22, { fill: v.ph ? pal.bg : pal.accentSoft, stroke: v.ph ? pal.boxLine : pal.accent, dash: v.ph ? '3 2' : null, rx: 11 });
      o += S.text(px + pw / 2, py + 11, S.fit(v.t, pw - 12, 11), sty(v, { size: 11, fill: pal.ink, anchor: 'middle', v: 'middle' }, pal));
    });
    let h = 24 + 14 + 2 * ry;
    const extra = [];
    if (pms.length > 1) extra.push({ t: pms.length + ' people have the PM role: only one allowed', crit: true });
    const others = [['Team member', 'team member'], ['Project assistant', 'assistant'], ['PSC member', 'PSC member']]
      .map(([role, word]) => [q.withRole(role).length, word])
      .filter(([n]) => n)
      .map(([n, word]) => plural(n, word));
    if (others.length) extra.push({ t: 'Also: ' + others.join(', ') });
    extra.forEach((e) => {
      o += S.text(cx, y + h + 6, S.fit(e.t, iw, 11, e.crit ? 600 : 400), { size: 11, weight: e.crit ? 600 : 400, fill: e.crit ? pal.crit : pal.ink2, anchor: 'middle' });
      h += 18;
    });
    return { svg: o, h: h + (extra.length ? 4 : 0) };
  }

  function cellTimeContext(q, pal, x, y, iw) {
    let o = '';
    const sd = q.f('time.startDate');
    const ed = q.f('time.endDate');
    const b1 = x + iw * 0.3;
    const b2 = x + iw * 0.7;
    const tip = 10;
    const H = 30;
    o += S.text(b1, y, U.isDate(sd) ? U.fmtDate(sd) : 'Start', { size: 11, weight: 600, fill: sd ? pal.ink2 : pal.muted, italic: !sd, anchor: 'middle' });
    o += S.text(b2, y, U.isDate(ed) ? U.fmtDate(ed) : 'End', { size: 11, weight: 600, fill: ed ? pal.ink2 : pal.muted, italic: !ed, anchor: 'middle' });
    const by = y + 20;
    o += S.line(b1, y + 14, b1, by + H + 4, { stroke: pal.axis, dash: '3 3' });
    o += S.line(b2, y + 14, b2, by + H + 4, { stroke: pal.axis, dash: '3 3' });
    const p1 = b1 - tip + 3;
    const p2 = b2 - tip + 3;
    o += S.chevron(x, by, b1 - x, H, { first: true, fill: pal.box, stroke: pal.boxLine, tip });
    o += S.chevron(p1, by, b2 - p1, H, { fill: pal.accent, tip });
    o += S.chevron(p2, by, x + iw - p2, H, { fill: pal.box, stroke: pal.boxLine, tip });
    o += S.text((x + b1 - tip) / 2, by + H / 2, S.fit('Pre-project', b1 - x - tip - 4, 11, 600), { size: 11, weight: 600, fill: pal.ink2, anchor: 'middle', v: 'middle' });
    o += S.text((p1 + tip + b2 - tip) / 2, by + H / 2, 'Project', { size: 11.5, weight: 600, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
    o += S.text((p2 + tip + x + iw - tip) / 2, by + H / 2, S.fit('Post-project', x + iw - p2 - 2 * tip, 11, 600), { size: 11, weight: 600, fill: pal.ink2, anchor: 'middle', v: 'middle' });
    let yy = by + H + 12;
    const lists = [
      ['Before the start', [['History', 'pre.history'], ['Decided', 'pre.decisions'], ['Support', 'pre.supporters'], ['Resistance', 'pre.opponents']], 'Fill in the pre-project phase below'],
      ['After the end', [['Results', 'post.results'], ['Follow-up', 'post.followUp'], ['Benefits', 'post.benefits']], 'Fill in the post-project phase below'],
    ];
    lists.forEach(([title, items, empty], li) => {
      if (li) yy += 6;
      o += S.text(x, yy, title, { size: 11, weight: 600, fill: pal.muted });
      yy += 16;
      const got = items.filter(([, k]) => !U.isEmpty(q.f(k))).slice(0, 3);
      if (!got.length) {
        o += S.text(x, yy, empty, { size: 11, fill: pal.muted, italic: true });
        yy += 15;
      }
      got.forEach(([label, k]) => {
        const lw = S.measure(label + ':', 11, 600) + 5;
        o += S.text(x, yy, label + ':', { size: 11, weight: 600, fill: pal.ink2 });
        o += S.text(x + lw, yy, S.fit(firstPart(q.f(k)), iw - lw, 11), { size: 11, fill: pal.ink });
        yy += 15;
      });
    });
    return { svg: o, h: yy - y };
  }

  /** Centre circle with chips on the left and right, joined by edges styled by effect. items: [{t, ph, eff}]. */
  function chipsAround(items, x, y, iw, pal, emptyText) {
    const R = 30;
    const CH = 32;
    const GAP = 8;
    const chipW = (iw - 2 * R - 28) / 2;
    let list = items;
    if (list.length > 8) list = list.slice(0, 7).concat([{ t: '+ ' + (list.length - 7) + ' more', ph: true, eff: '' }]);
    const nl = Math.ceil(list.length / 2);
    const left = list.slice(0, nl);
    const right = list.slice(nl);
    const colH = Math.max(1, nl) * (CH + GAP) - GAP;
    const H = Math.max(colH, 2 * R + 8);
    const cx = x + iw / 2;
    const cy = y + H / 2;
    let edges = '';
    let chips = '';
    const place = (arr, side) => {
      const off = (H - (arr.length * (CH + GAP) - GAP)) / 2;
      arr.forEach((it, i) => {
        const top = y + off + i * (CH + GAP);
        const chx = side < 0 ? x : x + iw - chipW;
        const px = side < 0 ? chx + chipW : chx;
        const py = top + CH / 2;
        const a = Math.atan2(py - cy, px - cx);
        const st = effStyle(it.eff, pal);
        edges += S.line(px, py, cx + R * Math.cos(a), cy + R * Math.sin(a), st.edge);
        chips += S.box(chx, top, chipW, CH, it.t, {
          fill: it.ph ? pal.bg : st.fill, stroke: it.ph ? pal.boxLine : st.stroke, dash: it.ph ? '3 2' : null,
          size: 11, weight: 400, color: it.ph ? pal.muted : pal.ink, italic: it.ph, maxLines: 2, pad: 6, rx: 6,
        });
      });
    };
    place(left, -1);
    place(right, 1);
    let o = edges + chips;
    o += S.circle(cx, cy, R, { fill: pal.accent });
    o += S.text(cx, cy, 'Project', { size: 11, weight: 600, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
    let h = H;
    if (!items.length && emptyText) {
      o += S.text(cx, y + H + 8, S.fit(emptyText, iw, 11), { size: 11, fill: pal.muted, italic: true, anchor: 'middle' });
      h += 24;
    }
    return { svg: o, h };
  }

  function cellContentContext(q, pal, x, y, iw) {
    const rows = q.rows('boundContext').slice().sort((a, b) => {
      const ia = CTX_TYPES.indexOf(a.type);
      const ib = CTX_TYPES.indexOf(b.type);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const items = rows.map((r) => Object.assign(val(q, r, 'factor', 'Factor'), { eff: r.effect }));
    return chipsAround(items, x, y, iw, pal, 'Add factors in the context table below');
  }

  function cellPeopleContext(q, pal, x, y, iw) {
    const groups = stakeholderGroups(q);
    if (!groups) {
      const r = chipsAround([], x, y, iw, pal, '');
      let o = r.svg;
      o += S.text(x + iw / 2, y + r.h + 8, 'Stakeholders: see 3.4', { size: 11.5, weight: 600, fill: pal.ink2, anchor: 'middle' });
      o += S.text(x + iw / 2, y + r.h + 26, S.fit('Everyone affected who may try to influence the project', iw, 11), { size: 11, fill: pal.muted, anchor: 'middle' });
      return { svg: o, h: r.h + 42 };
    }
    return chipsAround(groups, x, y, iw, pal, '');
  }

  function sixFields(q, pal) {
    const W = 1100;
    const PAD = 16;
    const LW = 92;
    const G = 10;
    const HEAD = 26;
    const TT = 36;
    const colW = (W - PAD * 2 - LW - G * 3) / 3;
    const colX = [0, 1, 2].map((i) => PAD + LW + G + i * (colW + G));
    const iw = colW - 24;
    const aid = S.uid('a');
    let o = '<defs>' + S.arrowDef(aid, pal.ink2, 7) + '</defs>';
    ['Time', 'Content', 'People'].forEach((t, i) => {
      o += S.rect(colX[i], PAD, colW, HEAD, { fill: pal.box, rx: 6 });
      o += S.text(colX[i] + colW / 2, PAD + HEAD / 2, t, { size: 13, weight: 600, fill: pal.ink, anchor: 'middle', v: 'middle' });
    });
    const top1 = PAD + HEAD + 8;
    const c1 = [
      cellTimeBoundary(q, pal, colX[0] + 12, top1 + TT, iw, aid),
      cellContentBoundary(q, pal, colX[1] + 12, top1 + TT, iw),
      cellPeopleBoundary(q, pal, colX[2] + 12, top1 + TT, iw),
    ];
    const h1 = Math.max(...c1.map((c) => c.h)) + TT + 14;
    const top2 = top1 + h1 + G;
    const c2 = [
      cellTimeContext(q, pal, colX[0] + 12, top2 + TT, iw),
      cellContentContext(q, pal, colX[1] + 12, top2 + TT, iw),
      cellPeopleContext(q, pal, colX[2] + 12, top2 + TT, iw),
    ];
    const h2 = Math.max(...c2.map((c) => c.h)) + TT + 14;
    const rowsDef = [
      [top1, h1, 'Boundaries', 'inside view', ['Start and end', 'Objectives, non-objectives, phases', 'Project organisation'], c1],
      [top2, h2, 'Context', 'outside view', ['Before and after the project', 'Strategy, other projects and tasks', 'Stakeholders'], c2],
    ];
    rowsDef.forEach(([top, h, label, sub, titles, cells]) => {
      o += S.rect(PAD, top, LW, h, { fill: pal.box, rx: 6 });
      o += S.text(PAD + LW / 2, top + h / 2 - 9, label, { size: 13, weight: 600, fill: pal.ink, anchor: 'middle', v: 'middle' });
      o += S.text(PAD + LW / 2, top + h / 2 + 9, sub, { size: 11, fill: pal.muted, anchor: 'middle', v: 'middle' });
      titles.forEach((t, i) => {
        o += S.rect(colX[i], top, colW, h, { fill: pal.bg, stroke: pal.boxLine, rx: 8 });
        o += S.text(colX[i] + 12, top + 12, S.fit(t, iw, 12.5, 600), { size: 12.5, weight: 600, fill: pal.ink });
        o += cells[i].svg;
      });
    });
    const lg = S.legend(effLegend(pal, ['Supports / supportive', 'Conflicts / critical', 'Neutral']), colX[1], top2 + h2 + 10, pal, { maxW: colW * 2 });
    o += lg.svg;
    return S.svg(W, top2 + h2 + 10 + lg.h + PAD, o, { pal, label: 'The six fields: boundaries and context of time, content and people' });
  }

  // =====================================================================================
  // Graphic: pre-project phase, project, post-project phase
  // =====================================================================================

  function prePost(q, pal) {
    const W = 1000;
    const PAD = 16;
    const b0 = PAD;
    const b1 = 336;
    const b2 = 664;
    const b3 = W - PAD;
    let o = '';
    const ev = (bx, label, k, fb) => {
      const e = q.f(k);
      let s = S.text(bx, PAD, label, { size: 11, weight: 600, fill: pal.muted, anchor: 'middle' });
      const tb = S.textBlock(bx, PAD + 16, e || fb, { maxW: 290, size: 12, maxLines: 2, anchor: 'middle', fill: e ? pal.ink : pal.muted, italic: !e });
      s += tb.svg;
      return { s, h: 16 + tb.h };
    };
    const a = ev(b1, 'Start event', 'time.startEvent', 'What marks the start');
    const b = ev(b2, 'End event', 'time.endEvent', 'What marks the end');
    o += a.s + b.s;
    let yy = PAD + Math.max(a.h, b.h) + 6;
    [[b1, 'time.startDate', 'Start date'], [b2, 'time.endDate', 'End date']].forEach(([bx, k, fb]) => {
      const d = q.f(k);
      o += S.text(bx, yy, U.isDate(d) ? U.fmtDate(d) : fb, { size: 12.5, weight: 600, fill: d ? pal.ink : pal.muted, italic: !d, anchor: 'middle' });
    });
    yy += 22;
    const dy = yy + 7;
    const by = yy + 22;
    const BH = 40;
    const tip = 16;
    const p1 = b1 - tip + 4;
    const p2 = b2 - tip + 4;
    // cards (measured first, so the boundary lines can run to their bottom)
    const cardTop = by + BH + 14;
    const dur = durText(q);
    const phases = phaseList(q);
    const phaseText = phases.length ? phases.map((r) => val(q, r, 'name', 'Phase').t).join(' → ') : '';
    const F = (label, key, fb, mark) => ({ label, v: fieldVal(q, key, fb), mark });
    const cols = [
      {
        x: b0, w: b1 - b0 - 8, title: 'Before the start: the history',
        items: [
          F('What happened', 'pre.history', 'What happened before the start'),
          F('Decisions taken', 'pre.decisions', 'Which decisions exist already'),
          F('Documents', 'pre.documents', 'Studies, offers, minutes'),
          F('Supported by', 'pre.supporters', 'Who pushed the project', 'good'),
          F('Held back by', 'pre.opponents', 'Who slowed it down', 'crit'),
        ],
      },
      {
        x: b1 + 8, w: b2 - b1 - 16, title: 'During the project',
        items: [
          { label: 'Duration', v: dur ? { t: dur, ph: false } : { t: 'Add start and end dates', ph: true } },
          { label: 'Phases', v: phaseText ? { t: phaseText, ph: phases.every((r) => U.isEmpty(r.name)) } : { t: 'Phases from the WBS', ph: true } },
          F('Prepared now for the time after', 'post.prepare', 'What we organise during the project for the post-project phase'),
        ],
      },
      {
        x: b2 + 8, w: b3 - b2 - 8, title: 'After the end: the consequences',
        items: [
          F('What happens with the results', 'post.results', 'Who uses the results and how'),
          F('Decisions and follow-up projects', 'post.followUp', 'What is decided or started after the end'),
          F('Further benefits', 'post.benefits', 'What else the project brings'),
        ],
      },
    ];
    let cardH = 0;
    const cardSvg = cols.map((c) => {
      let s = S.text(c.x + 12, cardTop + 12, S.fit(c.title, c.w - 24, 12.5, 600), { size: 12.5, weight: 600, fill: pal.ink });
      let cy = cardTop + 36;
      c.items.forEach((it) => {
        let lx = c.x + 12;
        if (it.mark) {
          s += S.circle(lx + 4, cy + 6, 4, { fill: it.mark === 'good' ? pal.good : pal.crit });
          lx += 13;
        }
        s += S.text(lx, cy, S.fit(it.label, c.w - 24, 11, 600), { size: 11, weight: 600, fill: pal.muted });
        const tb = S.textBlock(c.x + 12, cy + 16, it.v.t, sty(it.v, { maxW: c.w - 24, size: 12, maxLines: 3, fill: pal.ink }, pal));
        s += tb.svg;
        cy += 16 + tb.h + 10;
      });
      cardH = Math.max(cardH, cy - cardTop);
      return s;
    });
    const bottom = cardTop + cardH;
    o += S.line(b1, dy + 8, b1, bottom, { stroke: pal.axis, dash: '4 4' });
    o += S.line(b2, dy + 8, b2, bottom, { stroke: pal.axis, dash: '4 4' });
    o += S.diamond(b1, dy, 7, { fill: pal.mile }) + S.diamond(b2, dy, 7, { fill: pal.mile });
    o += S.chevron(b0, by, b1 - b0, BH, { first: true, fill: pal.box, stroke: pal.boxLine, tip });
    o += S.chevron(p1, by, b2 - p1, BH, { fill: pal.accent, tip });
    o += S.chevron(p2, by, b3 - p2, BH, { fill: pal.box, stroke: pal.boxLine, tip });
    o += S.text((b0 + b1 - tip) / 2, by + BH / 2, 'Pre-project phase', { size: 13, weight: 600, fill: pal.ink2, anchor: 'middle', v: 'middle' });
    o += S.text((p1 + b2) / 2, by + BH / 2, S.fit('Project' + (dur ? ' · ' + dur : ''), b2 - p1 - 2 * tip - 8, 13, 600), { size: 13, weight: 600, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
    o += S.text((p2 + tip + b3 - tip) / 2, by + BH / 2, 'Post-project phase', { size: 13, weight: 600, fill: pal.ink2, anchor: 'middle', v: 'middle' });
    cols.forEach((c, i) => {
      o += S.rect(c.x, cardTop, c.w, cardH, { fill: i === 1 ? pal.box : pal.bg, stroke: pal.boxLine, rx: 8 });
      o += cardSvg[i];
    });
    return S.svg(W, bottom + PAD, o, { pal, label: 'Pre-project phase, project and post-project phase with start and end events' });
  }

  // =====================================================================================
  // Graphic: objective pyramid
  // =====================================================================================

  function classInfo(q) {
    const map = {};
    q.rows('boundObjectives').forEach((r) => {
      const c = CLASSES.includes(r.cls) ? r.cls : NO_CLASS;
      if (!map[c]) map[c] = { name: c, rows: [], must: 0 };
      map[c].rows.push(r);
      if (r.prio === 'Must') map[c].must += 1;
    });
    const order = CLASSES.concat([NO_CLASS]).filter((c) => map[c]);
    const conflicts = CONFLICT_PAIRS.filter(([a, b]) => map[a] && map[b] && map[a].must && map[b].must);
    return { map, order, conflicts };
  }

  function pyramid(q, pal) {
    const W = 1000;
    const PAD = 16;
    const RAIL = 118;
    const x0 = PAD + RAIL + 12;
    const AW = W - PAD - x0;
    const acx = x0 + AW / 2;
    const { map, order, conflicts } = classInfo(q);
    const inConflict = new Set([].concat(...conflicts));
    const colorOf = (c) => (CLASSES.indexOf(c) >= 0 ? pal.series[CLASSES.indexOf(c)] : pal.muted);
    let bands = '';
    let o = '';
    const rail = (y, t, sub) => {
      o += S.text(PAD, y, t, { size: 11.5, weight: 600, fill: pal.ink2 });
      if (sub) o += S.textBlock(PAD, y + 16, sub, { maxW: RAIL, size: 11, fill: pal.muted, maxLines: 2 }).svg;
    };
    // level 1: top objective
    let y = PAD;
    const top = fieldVal(q, 'content.topObjective', 'Top objective: why the project exists');
    const b1w = AW * 0.46;
    const tw = b1w - 24;
    const tbM = S.textBlock(0, 0, top.t, { maxW: tw - 24, size: 12.5, weight: 600, maxLines: 3 });
    const topH = tbM.h + 20;
    bands += S.rect(acx - b1w / 2, y, b1w, topH + 20, { fill: pal.box, rx: 8 });
    o += S.rect(acx - tw / 2, y + 10, tw, topH, { fill: top.ph ? pal.bg : pal.strong, stroke: top.ph ? pal.boxLine : null, dash: top.ph ? '4 3' : null, rx: 6 });
    o += S.textBlock(acx, y + 20, top.t, { maxW: tw - 24, size: 12.5, weight: 600, maxLines: 3, anchor: 'middle', fill: top.ph ? pal.muted : pal.strongInk, italic: top.ph }).svg;
    rail(y + 10, 'Top objective', 'why the project exists');
    const topBottom = y + 10 + topH;
    y += topH + 20;
    if (!order.length) {
      o += S.text(acx, y + 20, 'Add objectives below to fill the pyramid.', { size: 12, fill: pal.muted, italic: true, anchor: 'middle' });
      return S.svg(W, y + 44, bands + o, { pal, label: 'Objective pyramid' });
    }
    y += 28;
    // level 2: classes
    const n = order.length;
    const b2w = Math.min(AW, AW * (n <= 2 ? 0.6 : n <= 3 ? 0.72 : 0.88));
    const cbw = Math.min(170, (b2w - 24 - (n - 1) * 10) / n);
    const cbh = 46;
    const rowW = n * cbw + (n - 1) * 10;
    bands += S.rect(acx - b2w / 2, y, b2w, cbh + 20, { fill: pal.box, rx: 8 });
    rail(y + 10, 'Objective classes', 'schedule, budget, scope, procedure');
    const boxTop = y + 10;
    const midY1 = topBottom + (boxTop - topBottom) / 2;
    const classX = {};
    order.forEach((c, i) => {
      const bx = acx - rowW / 2 + i * (cbw + 10);
      classX[c] = bx;
      const info = map[c];
      const conf = inConflict.has(c);
      o += S.path('M' + S.round(acx) + ',' + S.round(topBottom) + ' V' + S.round(midY1) + ' H' + S.round(bx + cbw / 2) + ' V' + S.round(boxTop), { stroke: pal.axis, sw: 1.2 });
      o += S.rect(bx, boxTop, cbw, cbh, { fill: pal.bg, stroke: conf ? pal.crit : pal.boxLine, sw: conf ? 2 : 1, rx: 6 });
      o += S.rect(bx + 6, boxTop + 4, cbw - 12, 4, { fill: colorOf(c), rx: 2 });
      o += S.text(bx + cbw / 2, boxTop + 13, S.fit(c, cbw - 14, 12, 600), { size: 12, weight: 600, fill: c === NO_CLASS ? pal.muted : pal.ink, anchor: 'middle', italic: c === NO_CLASS });
      o += S.text(bx + cbw / 2, boxTop + 29, S.fit(plural(info.rows.length, 'objective') + (info.must ? ', ' + info.must + ' Must' : ''), cbw - 12, 11), { size: 11, fill: pal.ink2, anchor: 'middle' });
      if (conf) {
        o += S.circle(bx + cbw - 2, boxTop + 2, 8, { fill: pal.crit });
        o += S.text(bx + cbw - 2, boxTop + 2, '!', { size: 11, weight: 700, fill: pal.bg, anchor: 'middle', v: 'middle' });
      }
    });
    const l2Bottom = boxTop + cbh;
    y += cbh + 20 + 28;
    // level 3: objectives with target values
    const inner = AW - 20;
    const colW = (inner - (n - 1) * 12) / n;
    const colTop = y + 10;
    const midY2 = l2Bottom + (colTop - l2Bottom) / 2;
    let colMax = 0;
    let cards = '';
    order.forEach((c, i) => {
      const cx0 = x0 + 10 + i * (colW + 12);
      const list = map[c].rows;
      o += S.path('M' + S.round(classX[c] + cbw / 2) + ',' + S.round(l2Bottom) + ' V' + S.round(midY2) + ' H' + S.round(cx0 + colW / 2) + ' V' + S.round(colTop), { stroke: pal.axis, sw: 1.2 });
      const sc = Math.max(1, Math.min(list.length, Math.floor((colW + 10) / 210)));
      const cw = (colW - (sc - 1) * 10) / sc;
      let cy = colTop;
      for (let k = 0; k < list.length; k += sc) {
        const rowItems = list.slice(k, k + sc).map((r) => {
          const ov = val(q, r, 'objective', 'Objective, worded as a future state');
          const tb = S.textBlock(0, 0, ov.t, { maxW: cw - 22, size: 12, maxLines: 3 });
          return { r, ov, th: tb.h };
        });
        const rh = Math.max(...rowItems.map((it) => it.th)) + 10 + 6 + 3 * 15 + 4;
        rowItems.forEach((it, j) => {
          const x = cx0 + j * (cw + 10);
          const r = it.r;
          cards += S.rect(x, cy, cw, rh, { fill: pal.bg, stroke: pal.boxLine, rx: 6 });
          cards += S.rect(x + 3, cy + 6, 3, rh - 12, { fill: colorOf(c), rx: 1.5 });
          cards += S.textBlock(x + 12, cy + 9, it.ov.t, sty(it.ov, { maxW: cw - 22, size: 12, maxLines: 3, fill: pal.ink }, pal)).svg;
          let my = cy + 9 + it.th + 7;
          const tv = val(q, r, 'target', 'target value');
          cards += S.text(x + 12, my, S.fit('Target: ' + tv.t, cw - 20, 11.5, 600), sty(tv, { size: 11.5, weight: 600, fill: pal.ink }, pal));
          my += 15;
          const iv = val(q, r, 'indicator', 'how it is measured');
          cards += S.text(x + 12, my, S.fit('Indicator: ' + iv.t, cw - 20, 11), sty(iv, { size: 11, fill: pal.ink2 }, pal));
          my += 15;
          const pr = r.prio || 'Priority not set';
          const sub = r.sub ? ' · ' + r.sub : '';
          cards += S.text(x + 12, my, S.fit(pr + sub, cw - 20, 11, r.prio === 'Must' ? 600 : 400), { size: 11, weight: r.prio === 'Must' ? 600 : 400, fill: r.prio ? pal.ink2 : pal.muted, italic: !r.prio });
        });
        cy += rh + 8;
      }
      colMax = Math.max(colMax, cy - 8 - colTop);
    });
    bands += S.rect(x0, y, AW, colMax + 20, { fill: pal.box, rx: 8 });
    rail(y + 10, 'Objectives', 'with indicator, target value and priority');
    o += cards;
    y += colMax + 20 + 16;
    // conflicts
    if (conflicts.length) {
      conflicts.forEach(([a, b]) => {
        o += S.circle(PAD + 8, y + 7, 8, { fill: pal.crit });
        o += S.text(PAD + 8, y + 7, '!', { size: 11, weight: 700, fill: pal.bg, anchor: 'middle', v: 'middle' });
        o += S.text(PAD + 24, y + 1, S.fit(a + ' and ' + b + ' both have Must objectives. Agree with the PO which one gives way if they collide.', W - PAD * 2 - 24, 12), { size: 12, fill: pal.ink });
        y += 22;
      });
    } else {
      o += S.text(PAD, y + 1, 'No pair of schedule, budget and scope classes is both Must, so the targets leave room to balance.', { size: 12, fill: pal.muted });
      y += 22;
    }
    return S.svg(W, y + PAD - 6, bands + o, { pal, label: 'Objective pyramid: top objective, objective classes and objectives with target values' });
  }

  // =====================================================================================
  // Graphic: context of the project
  // =====================================================================================

  function contextGraphic(q, pal) {
    const W = 1000;
    const PAD = 16;
    const CW = 330;
    const R = 62;
    const CHH = 52;
    const rows = q.rows('boundContext');
    const groups = CTX_TYPES.concat([NO_TYPE])
      .map((t) => ({ type: t, rows: rows.filter((r) => (CTX_TYPES.includes(r.type) ? r.type : NO_TYPE) === t) }))
      .filter((g) => g.rows.length);
    const total = rows.length;
    const left = [];
    const right = [];
    let lc = 0;
    groups.forEach((g) => {
      if (!left.length || lc + g.rows.length / 2 <= total / 2) {
        left.push(g);
        lc += g.rows.length;
      } else right.push(g);
    });
    const colH = (gs) => gs.reduce((s, g) => s + 20 + g.rows.length * (CHH + 8) - 8 + 14, 0) - (gs.length ? 14 : 0);
    const top = PAD;
    const H = Math.max(colH(left), colH(right), 2 * R + 20);
    const cx = W / 2;
    const cy = top + H / 2;
    let edges = '';
    let body = '';
    const place = (gs, side) => {
      let y = top + (H - colH(gs)) / 2;
      const x = side < 0 ? PAD : W - PAD - CW;
      gs.forEach((g) => {
        body += S.text(x, y, S.fit(g.type + ' (' + g.rows.length + ')', CW, 11.5, 600), { size: 11.5, weight: 600, fill: g.type === NO_TYPE ? pal.muted : pal.ink2, italic: g.type === NO_TYPE });
        y += 20;
        g.rows.forEach((r) => {
          const v = val(q, r, 'factor', 'Factor');
          const st = effStyle(r.effect, pal);
          const px = side < 0 ? x + CW : x;
          const py = y + CHH / 2;
          const a = Math.atan2(py - cy, px - cx);
          edges += S.line(px, py, cx + R * Math.cos(a), cy + R * Math.sin(a), st.edge);
          body += S.rect(x, y, CW, CHH, { fill: v.ph ? pal.bg : st.fill, stroke: v.ph ? pal.boxLine : st.stroke, dash: v.ph ? '3 2' : null, rx: 6 });
          const eff = r.effect || 'Effect?';
          const ew = S.measure(eff, 11) + 4;
          body += S.text(x + CW - 10, y + 8, eff, { size: 11, fill: r.effect ? pal.ink2 : pal.muted, italic: !r.effect, anchor: 'end' });
          body += S.text(x + 10, y + 7, S.fit(v.t, CW - 24 - ew, 12, 600), sty(v, { size: 12, weight: 600, fill: pal.ink }, pal));
          const flow = val(q, r, 'flow', 'How information and coordination flow');
          body += S.text(x + 10, y + 23, S.fit(flow.t, CW - 20, 11), sty(flow, { size: 11, fill: pal.ink2 }, pal));
          if (!U.isEmpty(r.contact)) body += S.text(x + 10, y + 37, S.fit('Contact: ' + r.contact, CW - 20, 11), { size: 11, fill: pal.muted });
          y += CHH + 8;
        });
        y += 14 - 8;
      });
    };
    place(left, -1);
    place(right, 1);
    let o = edges + body;
    o += S.circle(cx, cy, R, { fill: pal.accent });
    const name = q.f('meta.name') || 'Project';
    const lines = S.wrap(name, 2 * R - 22, 12.5, 600).slice(0, 3);
    lines.forEach((ln, i) => {
      o += S.text(cx, cy + (i - (lines.length - 1) / 2) * 15, S.fit(ln, 2 * R - 18, 12.5, 600), { size: 12.5, weight: 600, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
    });
    const lg = S.legend(effLegend(pal, ['Supports the project', 'Conflicts with it', 'Neutral']), PAD, top + H + 16, pal, { maxW: W - 2 * PAD });
    o += lg.svg;
    return S.svg(W, top + H + 16 + lg.h + PAD, o, { pal, label: 'Context of the project: related strategy, projects, tasks and outside factors' });
  }

  // =====================================================================================
  // Graphic: project organisation (boundary)
  // =====================================================================================

  function orgGraphic(q, pal) {
    const W = 800;
    const cx = W / 2;
    const PAD = 16;
    const pos = q.withRole('Project owner');
    const pms = q.withRole('Project manager');
    const tms = q.withRole('PMTM');
    const BW = 180;
    const BH = 44;
    let ring = tms.map((p) => ({ v: personVal(q, p._id, 'Core team member'), sub: 'PMTM' + (p.subteam ? ' · ' + p.subteam : ''), kind: 'tm' }));
    pms.slice(1).forEach((p) => ring.unshift({ v: personVal(q, p._id, 'Project manager'), sub: 'Second PM', kind: 'pm2' }));
    if (ring.length > 10) ring = ring.slice(0, 9).concat([{ v: { t: '+ ' + (ring.length - 9) + ' more', ph: true }, sub: '', kind: 'more' }]);
    if (!ring.length) ring = [{ v: { t: 'Core team members', ph: true }, sub: 'role PMTM', kind: 'ph' }];
    const n = ring.length;
    const [rx, ry] = n <= 4 ? [200, 80] : n <= 6 ? [230, 100] : [260, 130];
    const PW = 150;
    const PH = 40;
    const erx = rx + PW / 2 + 22;
    const ery = ry + PH / 2 + 26;
    const ey = PAD + BH + 22 + ery;
    let o = '';
    o += S.line(cx, PAD + BH, cx, ey - BH / 2, { stroke: pal.ink2, sw: 1.5 });
    o += S.ellipse(cx, ey, erx, ery, { stroke: pal.ink2, sw: 1.2, dash: '6 4' });
    const poV = pos[0] ? personVal(q, pos[0]._id, 'Project owner') : { t: 'Project owner', ph: true };
    o += S.box(cx - BW / 2, PAD, BW, BH, poV.t, {
      fill: poV.ph ? pal.bg : pal.strong, stroke: poV.ph ? pal.boxLine : null, dash: poV.ph ? '4 3' : null,
      color: poV.ph ? pal.muted : pal.strongInk, italic: poV.ph, sub: 'Project owner (PO)' + (pos.length > 1 ? ', +' + (pos.length - 1) : ''), size: 12.5, maxLines: 1,
    });
    const pmV = pms[0] ? personVal(q, pms[0]._id, 'Project manager') : { t: 'Project manager', ph: true };
    o += S.box(cx - BW / 2, ey - BH / 2, BW, BH, pmV.t, {
      fill: pmV.ph ? pal.bg : pal.accent, stroke: pmV.ph ? pal.boxLine : null, dash: pmV.ph ? '4 3' : null,
      color: pmV.ph ? pal.muted : pal.accentInk, italic: pmV.ph, sub: 'Project manager (PM)', size: 12.5, maxLines: 1,
    });
    ring.forEach((m, i) => {
      const a = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / n;
      const px = cx + rx * Math.cos(a);
      const py = ey + ry * Math.sin(a);
      const st = m.kind === 'pm2' ? { fill: pal.critSoft, stroke: pal.crit, sw: 1.5 } : m.v.ph ? { fill: pal.bg, stroke: pal.boxLine, dash: '3 2' } : { fill: pal.accentSoft, stroke: pal.accent };
      o += S.box(px - PW / 2, py - PH / 2, PW, PH, m.v.t, Object.assign({}, st, { color: m.v.ph ? pal.muted : pal.ink, italic: m.v.ph, sub: m.sub ? S.fit(m.sub, PW - 16, 10.5) : null, subColor: pal.ink2, size: 12, maxLines: 1, subMaxLines: 1, rx: 10 }));
    });
    let y = ey + ery + 10;
    o += S.text(cx, y, 'Dashed line: the project management team (PM and PMTMs)', { size: 11, fill: pal.muted, anchor: 'middle' });
    y += 22;
    if (pms.length > 1) {
      o += S.text(cx, y, pms.length + ' people have the role Project manager. A project has only one PM.', { size: 12, weight: 600, fill: pal.crit, anchor: 'middle' });
      y += 20;
    }
    const others = ['Team member', 'Project assistant', 'Project coach', 'PSC member', 'PMO', 'Expert', 'External partner']
      .map((role) => [role, q.withRole(role).map((p) => personVal(q, p._id, '').t).filter(Boolean)])
      .filter(([, names]) => names.length)
      .map(([role, names]) => (names.length > 1 ? role + 's' : role) + ': ' + names.join(', '));
    if (others.length) {
      const tb = S.textBlock(cx, y, 'Also in the project. ' + others.join('. ') + '.', { maxW: W - 2 * PAD, size: 11.5, maxLines: 3, fill: pal.ink2, anchor: 'middle' });
      o += tb.svg;
      y += tb.h + 6;
    }
    return S.svg(W, y + PAD - 6, o, { pal, label: 'Project organisation: project owner, project manager and core team' });
  }

  // =====================================================================================
  // Graphic: Project Charter on one page (A4)
  // =====================================================================================

  function charterSheet(q, pal) {
    const W = 794;
    const H = 1123;
    const M = 48;
    const CW = W - 2 * M;
    const GAP = 24;
    const HW = (CW - GAP) / 2;
    const X2 = M + HW + GAP;
    const ink = { size: 12, fill: pal.ink };
    let o = S.rect(0.5, 0.5, W - 1, H - 1, { fill: pal.bg, stroke: pal.boxLine });
    const lab = (x, y, t) => S.text(x, y, t.toUpperCase(), { size: 11, weight: 700, fill: pal.muted, spacing: 0.6 });
    const hair = (y) => S.line(M, y, M + CW, y, { stroke: pal.line });
    /** Bullet list; items [{t, ph, r}] (r = right-aligned note). Shows at most max lines. */
    const list = (x, y0, items, max, w, dot, emptyText) => {
      let s = '';
      if (!items.length) return S.text(x, y0, emptyText, { size: 12, fill: pal.muted, italic: true });
      const shown = items.length > max ? items.slice(0, max - 1) : items;
      shown.forEach((v, i) => {
        const y = y0 + i * 17;
        const rw = v.r ? S.measure(v.r, 11) + 10 : 0;
        s += S.circle(x + 3, y + 7, 2.5, { fill: dot });
        s += S.text(x + 12, y, S.fit(v.t, w - 12 - rw, 12), sty(v, ink, pal));
        if (v.r) s += S.text(x + w, y + 1, v.r, { size: 11, fill: pal.muted, anchor: 'end' });
      });
      if (items.length > max) s += S.text(x + 12, y0 + shown.length * 17, '+ ' + (items.length - shown.length) + ' more', { size: 11, fill: pal.muted, italic: true });
      return s;
    };
    // header
    o += S.text(M, 40, 'Project Charter', { size: 20, weight: 700, fill: pal.ink });
    const status = q.f('charter.status') || 'Draft';
    const stW = S.measure(status, 11, 600) + 22;
    const stStyle = status === 'Released (final)' ? { fill: pal.accentSoft, stroke: pal.accent } : status === 'Preliminarily released' ? { fill: pal.warnSoft, stroke: pal.warn } : { fill: pal.box, stroke: pal.boxLine, dash: '3 2' };
    o += S.rect(M + CW - stW, 40, stW, 22, Object.assign({ rx: 11 }, stStyle));
    o += S.text(M + CW - stW / 2, 51, status, { size: 11, weight: 600, fill: pal.ink, anchor: 'middle', v: 'middle' });
    const nm = fieldVal(q, 'meta.name', 'Project name');
    o += S.text(M, 72, S.fit(nm.t, CW - 230, 14, 600), sty(nm, { size: 14, weight: 600, fill: pal.ink2 }, pal));
    const ver = [q.f('charter.version') ? 'Version ' + q.f('charter.version') : '', U.isDate(q.f('charter.date')) ? U.fmtDate(q.f('charter.date')) : ''].filter(Boolean).join(' · ');
    o += S.text(M + CW, 74, ver || 'Version and date not set', { size: 11, fill: ver ? pal.ink2 : pal.muted, italic: !ver, anchor: 'end' });
    o += S.line(M, 96, M + CW, 96, { stroke: pal.accent, sw: 2 });
    // time
    [['Start', 'time.startEvent', 'time.startDate', M], ['End', 'time.endEvent', 'time.endDate', X2]].forEach(([l, ek, dk, x]) => {
      o += lab(x, 110, l);
      const e = q.f(ek);
      o += S.textBlock(x, 128, e || l + ' event', { maxW: HW, size: 12, maxLines: 2, fill: e ? pal.ink : pal.muted, italic: !e }).svg;
      const d = q.f(dk);
      o += S.text(x, 162, U.isDate(d) ? U.fmtDate(d) : l + ' date', { size: 12.5, weight: 600, fill: d ? pal.ink : pal.muted, italic: !d });
    });
    const dur = durText(q);
    if (dur) o += S.text(M + CW, 163, S.fit(dur, 200, 11), { size: 11, fill: pal.ink2, anchor: 'end' });
    o += hair(186);
    // business need
    o += lab(M, 196, 'Business need');
    const need = fieldVal(q, 'charter.businessNeeds', 'Why the organisation needs this project');
    o += S.textBlock(M, 214, need.t, sty(need, { maxW: CW, size: 12, maxLines: 3, fill: pal.ink }, pal)).svg;
    o += hair(262);
    // objectives and non-objectives
    o += lab(M, 272, 'Objectives') + lab(X2, 272, 'Non-objectives');
    const objs = q.rows('boundObjectives').map((r) => val(q, r, 'objective', 'Objective'));
    const nons = q.rows('boundNonObjectives').map((r) => val(q, r, 'exclusion', 'Non-objective'));
    o += list(M, 290, objs, 6, HW, pal.accent, 'No objectives yet');
    o += list(X2, 290, nons, 6, HW, pal.muted, 'No non-objectives yet');
    o += hair(398);
    // deliverables
    o += lab(M, 408, 'Main deliverables') + lab(X2, 408, 'Non-deliverables');
    const dels = q.rows('charterDeliverables').map((r) => Object.assign(val(q, r, 'deliverable', 'Deliverable'), { r: U.isDate(r.due) ? U.fmtDateShort(r.due) : '' }));
    const ndels = q.rows('charterNonDeliverables').map((r) => val(q, r, 'item', 'Non-deliverable'));
    o += list(M, 426, dels, 5, HW, pal.accent, 'No deliverables yet');
    o += list(X2, 426, ndels, 5, HW, pal.muted, 'No non-deliverables yet');
    o += hair(518);
    // phases
    o += lab(M, 528, 'Project phases');
    const ph = phaseList(q);
    if (!ph.length) o += S.text(M, 548, 'Add phases to the WBS', { size: 12, fill: pal.muted, italic: true });
    else {
      const shown = ph.slice(0, 8);
      const cw = CW / shown.length;
      const tip = 10;
      shown.forEach((r, i) => {
        const x = M + i * cw;
        const v = val(q, r, 'name', 'Phase');
        o += S.chevron(x, 546, cw - 3, 30, { first: i === 0, fill: pal.accentSoft, stroke: pal.accent, tip });
        o += S.text(x + (cw - 3) / 2 + (i ? tip / 4 : -tip / 4), 561, S.fit(v.t, cw - 2 * tip - 8, 11.5, 600), sty(v, { size: 11.5, weight: 600, fill: pal.ink, anchor: 'middle', v: 'middle' }, pal));
        const d = q.dates(r._id);
        const a = r.roughStart || d.start;
        const b = r.roughEnd || d.end;
        const dt = U.isDate(a) && U.isDate(b) ? U.fmtDateShort(a) + ' – ' + U.fmtDateShort(b) : '';
        if (dt) o += S.text(x + cw / 2, 582, S.fit(dt, cw - 6, 11), { size: 11, fill: pal.muted, anchor: 'middle' });
      });
      if (ph.length > 8) o += S.text(M + CW, 528, '+ ' + (ph.length - 8) + ' more', { size: 11, fill: pal.muted, anchor: 'end' });
    }
    o += hair(602);
    // resources and costs
    o += lab(M, 612, 'Resources and costs');
    const hy = 632;
    const cQty = M + 380;
    const cRate = M + 540;
    const cCost = M + CW;
    o += S.text(M, hy, 'Type', { size: 11, weight: 600, fill: pal.ink2 });
    o += S.text(cQty, hy, 'Quantity', { size: 11, weight: 600, fill: pal.ink2, anchor: 'end' });
    o += S.text(cRate, hy, 'Cost per unit', { size: 11, weight: 600, fill: pal.ink2, anchor: 'end' });
    o += S.text(cCost, hy, 'Cost', { size: 11, weight: 600, fill: pal.ink2, anchor: 'end' });
    o += S.line(M, hy + 16, M + CW, hy + 16, { stroke: pal.line });
    let res = q.rows('charterResources');
    const resTotal = U.sum(res, (r) => U.num(r.cost) || 0);
    let restRow = null;
    if (res.length > 5) {
      const rest = res.slice(4);
      restRow = { label: 'Other lines (' + rest.length + ')', cost: U.sum(rest, (r) => U.num(r.cost) || 0) };
      res = res.slice(0, 4);
    }
    let ry = hy + 22;
    if (!res.length) {
      o += S.text(M, ry, 'No resources listed yet', { size: 12, fill: pal.muted, italic: true });
      ry += 17;
    }
    res.forEach((r) => {
      const tv = val(q, r, 'type', 'Resource');
      const label = tv.t + (r.desc ? ': ' + r.desc : '');
      o += S.text(M, ry, S.fit(label, cQty - M - 90, 12), sty(tv, ink, pal));
      const qty = U.num(r.qty);
      o += S.text(cQty, ry, qty != null ? q.num(qty) + (r.unit ? ' ' + r.unit : '') : '', { size: 12, fill: pal.ink, anchor: 'end' });
      const rate = U.num(r.rate);
      o += S.text(cRate, ry, rate != null ? q.money(rate) : '', { size: 12, fill: pal.ink, anchor: 'end' });
      const cost = U.num(r.cost);
      o += S.text(cCost, ry, cost != null ? q.money(cost) : '', { size: 12, fill: pal.ink, anchor: 'end' });
      ry += 17;
    });
    if (restRow) {
      o += S.text(M, ry, restRow.label, { size: 12, fill: pal.ink2, italic: true });
      o += S.text(cCost, ry, q.money(restRow.cost), { size: 12, fill: pal.ink, anchor: 'end' });
      ry += 17;
    }
    o += S.line(M, ry + 1, M + CW, ry + 1, { stroke: pal.ink2, sw: 1 });
    o += S.text(M, ry + 7, 'Total', { size: 12.5, weight: 700, fill: pal.ink });
    o += S.text(cCost, ry + 7, q.money(resTotal || 0), { size: 12.5, weight: 700, fill: pal.ink, anchor: 'end' });
    const bud = U.num(q.f('content.budget'));
    if (bud) o += S.text(cRate, ry + 8, 'Rough budget ' + q.money(bud), { size: 11, fill: pal.muted, anchor: 'end' });
    o += hair(770);
    // roles
    o += lab(M, 780, 'Project sponsor') + lab(X2, 780, 'Project manager');
    const pv = personVal(q, poId(q), 'Project owner (sponsor)');
    const mv = personVal(q, pmId(q), 'Project manager');
    o += S.text(M, 798, S.fit(pv.t, HW, 12.5, 600), sty(pv, { size: 12.5, weight: 600, fill: pal.ink }, pal));
    o += S.text(X2, 798, S.fit(mv.t, HW, 12.5, 600), sty(mv, { size: 12.5, weight: 600, fill: pal.ink }, pal));
    o += lab(M, 822, 'Core team') + lab(X2, 822, 'Team members');
    const names = (ids, fb) => {
      const vs = ids.map((id) => personVal(q, id, ''));
      const real = vs.filter((v) => !v.ph && v.t);
      if (real.length) return { t: real.map((v) => v.t).join(', '), ph: false };
      const phs = vs.filter((v) => v.t);
      return { t: phs.length ? phs.map((v) => v.t).join(', ') : fb, ph: true };
    };
    const ct = names(coreIds(q), 'Core team members');
    const tm = names(teamIds(q), 'Team members');
    o += S.textBlock(M, 840, ct.t, sty(ct, { maxW: HW, size: 12, maxLines: 2, fill: pal.ink }, pal)).svg;
    o += S.textBlock(X2, 840, tm.t, sty(tm, { maxW: HW, size: 12, maxLines: 2, fill: pal.ink }, pal)).svg;
    o += hair(880);
    // signatures
    o += lab(M, 890, 'Signatures');
    const sigs = q.rows('charterSignatures');
    sigs.slice(0, 2).forEach((r, i) => {
      const x = i ? X2 : M;
      o += S.text(x, 910, r.role || '', { size: 11.5, weight: 600, fill: pal.ink2 });
      const lineY = 958;
      if (r.signed) {
        o += S.polyline([[x + 6, lineY - 14], [x + 12, lineY - 8], [x + 24, lineY - 22]], { stroke: pal.accent, sw: 2.5 });
        o += S.text(x + 32, lineY - 18, 'Signed', { size: 12, fill: pal.ink2, italic: true });
      }
      o += S.line(x, lineY, x + HW - 30, lineY, { stroke: pal.ink2, sw: 1 });
      const fb = i ? personVal(q, pmId(q), 'Name') : personVal(q, poId(q), 'Name');
      const nv = r.name ? personVal(q, r.name, 'Name') : { t: fb.t, ph: true };
      o += S.text(x, lineY + 6, S.fit(nv.t, HW - 30, 12, 600), sty(nv, { size: 12, weight: 600, fill: pal.ink }, pal));
      const pd = [r.place, U.isDate(r.date) ? U.fmtDate(r.date) : ''].filter(Boolean).join(', ');
      o += S.text(x, lineY + 24, S.fit('Place, date: ' + (pd || '…'), HW - 30, 11), { size: 11, fill: pd ? pal.ink2 : pal.muted, italic: !pd });
    });
    o += hair(1004);
    // distribution
    o += lab(M, 1014, 'Distributed to');
    const dist = q.rows('charterDistribution');
    const distReal = filled(dist, 'who');
    const dt = distReal.length
      ? distReal.map((r) => r.who + (U.isDate(r.date) ? ' (' + U.fmtDateShort(r.date) + ')' : '')).join('; ')
      : 'Project organisation and selected stakeholders';
    o += S.textBlock(M, 1032, dt, { maxW: CW, size: 11.5, maxLines: 2, fill: distReal.length ? pal.ink : pal.muted, italic: !distReal.length }).svg;
    // footer
    o += S.line(M, 1076, M + CW, 1076, { stroke: pal.line });
    o += S.text(M, 1084, 'The signed charter is part of the PM plan.', { size: 11, fill: pal.muted });
    o += S.text(M + CW, 1084, S.fit(nm.ph ? 'Project Charter' : nm.t + ' · Project Charter', CW - 300, 11), { size: 11, fill: pal.muted, anchor: 'end' });
    return S.svg(W, H, o, { pal, label: 'Project Charter on one page' });
  }

  // =====================================================================================
  // Section 3.3: the six fields
  // =====================================================================================

  PM.section({
    id: 'boundaries',
    part: 'initiation',
    order: 33,
    num: '3.3',
    step: 'I3',
    slides: '22–37',
    title: 'Boundaries and context: the six fields',
    navTitle: 'Six fields',
    intro: 'Mark out what belongs to the project and look at what surrounds it, for time, content and people. The result is the first draft of the Project Charter.',
    blocks: [
      { type: 'step', step: 'I3' },
      {
        type: 'guide',
        title: 'Why boundaries and context',
        items: [
          'Only what is clearly defined can be planned, controlled and measured.',
          'Boundaries are the inside view: what belongs to the project and what does not. They become the Project Charter.',
          'Context is the outside view: what came before, what comes after, what runs alongside and who is affected. Knowing it is the basis for acceptance.',
          'Look at both for time, content and people. That gives six fields, the foundation for high-level and detailed planning.',
          'PO and PM fill them in together, in variants if the scope is still open. The same step covers the stakeholder analysis (3.4) and a first risk assessment (5).',
        ],
      },
      {
        type: 'graphic',
        title: 'The six fields',
        caption: 'A one-page summary of this section. The top row is the boundary of the project, the bottom row its context. Edges in the context fields show whether a factor or a stakeholder group supports the project or conflicts with it.',
        render: sixFields,
      },

      { type: 'h', text: 'Time', sub: 'Fix start and end as an event and as a date. The event stays when the date moves.' },
      {
        type: 'fields',
        title: 'Time boundaries',
        hint: 'Choose events you can recognise, such as "feasibility study presented and authorised" or "product accepted by the client".',
        cols: 2,
        fields: [{ key: 'time.startEvent' }, { key: 'time.endEvent' }, { key: 'time.startDate' }, { key: 'time.endDate' }, { key: 'time.duration' }],
      },
      {
        type: 'group',
        cols: 2,
        blocks: [
          {
            type: 'fields',
            title: 'Pre-project phase: the history',
            cols: 1,
            fields: [
              { key: 'pre.history', label: 'What happened before the start', kind: 'textarea', placeholder: 'Events, problems and ideas that led to the project' },
              { key: 'pre.decisions', label: 'Decisions already taken', kind: 'textarea', placeholder: 'e.g. budget frame approved by the board' },
              { key: 'pre.documents', label: 'Documents that exist', kind: 'textarea', placeholder: 'Studies, offers, minutes, business case' },
              { key: 'pre.supporters', label: 'Who supported the project', kind: 'text', placeholder: 'People or units that pushed it' },
              { key: 'pre.opponents', label: 'Who held it back', kind: 'text', placeholder: 'People or units that slowed it down' },
            ],
          },
          {
            type: 'fields',
            title: 'Post-project phase: the consequences',
            cols: 1,
            fields: [
              { key: 'post.results', label: 'What happens with the results', kind: 'textarea', placeholder: 'Who uses them, who maintains them' },
              { key: 'post.followUp', label: 'Decisions and follow-up projects', kind: 'textarea', placeholder: 'What is decided or started after the end' },
              { key: 'post.benefits', label: 'Further benefits', kind: 'textarea', placeholder: 'What else the project brings' },
              { key: 'post.prepare', label: 'What we organise during the project for this phase', kind: 'textarea', placeholder: 'e.g. handover, training, documentation' },
            ],
          },
        ],
      },
      {
        type: 'graphic',
        title: 'Pre-project phase, project, post-project phase',
        caption: 'The start and end events (amber) mark the time boundary. Left: what led to the project. Right: what follows from it. The middle card lists what the project prepares now for the time after.',
        render: prePost,
      },

      { type: 'h', text: 'Content', sub: 'Objectives, non-objectives, phases and a rough budget, and the factors around the project.' },
      {
        type: 'fields',
        title: 'Top objective and rough budget',
        cols: 3,
        fields: [
          { key: 'content.topObjective', label: 'Top objective', kind: 'textarea', wide: true, placeholder: 'Why the project exists, in one sentence, as a future state' },
          { key: 'content.budget', label: 'Rough budget', kind: 'money', placeholder: 'e.g. 45000' },
          { key: 'content.budgetNote', label: 'What the budget covers', kind: 'text', wide: true, placeholder: 'e.g. external costs only; staff time tracked separately' },
        ],
      },
      {
        type: 'table',
        key: 'boundObjectives',
        title: 'Objectives',
        hint: 'Word each objective as a state at the end of the project ("400 guests have attended"), not as a task ("organise the festival"). Make it precise, realistic and measurable.',
        numbered: true,
        addLabel: 'Add objective',
        columns: [
          { key: 'objective', label: 'Objective', kind: 'textarea', w: 30, sub: 'future state', placeholder: 'e.g. 400 guests have attended the festival' },
          { key: 'cls', label: 'Class', kind: 'select', options: CLASSES, w: 14 },
          { key: 'sub', label: 'Sub-class', kind: 'text', w: 12, placeholder: 'e.g. Participation' },
          { key: 'indicator', label: 'Indicator', kind: 'text', w: 16, placeholder: 'How you measure it' },
          { key: 'target', label: 'Target value', kind: 'text', w: 11, placeholder: 'e.g. ≥ 400' },
          { key: 'prio', label: 'Priority', kind: 'select', options: PRIOS, w: 10 },
        ],
        defaults: [
          { cls: 'Scope or functional', _ph: { objective: 'Main result is in use (a future state)', target: 'e.g. 400 guests' } },
          { cls: 'Schedule', _ph: { objective: 'Result is available on the agreed date', target: 'date' } },
          { cls: 'Budget', _ph: { objective: 'Costs stay within the budget', target: 'amount' } },
        ],
      },
      {
        type: 'graphic',
        title: 'Objective pyramid',
        caption: 'From the top objective through the objective classes to the measurable objectives. A red outline and "!" mark classes that pull against each other: when schedule, budget or scope both carry a Must objective, decide early which one gives way.',
        empty: (q) => (q.rows('boundObjectives').length || q.f('content.topObjective') ? null : 'Add a top objective or objectives to see the pyramid.'),
        render: pyramid,
      },
      {
        type: 'table',
        key: 'boundNonObjectives',
        title: 'Non-objectives',
        hint: 'What the project deliberately does not aim for. Exclusions make the objectives clearer.',
        numbered: true,
        addLabel: 'Add non-objective',
        columns: [
          { key: 'exclusion', label: 'Non-objective', kind: 'text', w: 30, placeholder: 'e.g. No public event' },
          { key: 'why', label: 'Why it is out', kind: 'text', w: 34, placeholder: 'Reason or where it is handled instead' },
        ],
        defaults: [{ _ph: { exclusion: 'What is out of scope' } }, { _ph: { exclusion: 'What is out of scope' } }],
      },
      {
        type: 'table',
        key: 'boundPhases',
        title: 'Phases',
        hint: 'The 4 to 5 main steps towards the objectives, worded as activities. They are the level-2 lines of the WBS (1.2, 1.3 …); rename them here or add them in 3.5.',
        from: 'wbs',
        filter: (r) => r.level === 2,
        sort: 'code',
        emptyText: 'Add phases (codes 1.2, 1.3 …) to the work breakdown structure to list them here.',
        columns: [
          { key: 'code', label: 'WBS', from: true, family: 'mono', w: 6 },
          { key: 'name', label: 'Phase', from: true, editSource: true, w: 24 },
          { key: 'phaseResult', label: 'Main result of the phase', kind: 'textarea', w: 28, placeholder: 'What exists when the phase is done' },
          { key: 'roughStart', label: 'Rough start', kind: 'date' },
          { key: 'roughEnd', label: 'Rough end', kind: 'date' },
        ],
      },
      {
        type: 'guide',
        title: 'Typical phase models',
        text: 'Phases can be standardised per type of project. Use these as a starting point and keep 4 to 5 phases.',
        collapsed: true,
        items: [
          'Construction or investment: engineering → approval by the authorities → procurement → construction and assembly → start-up → training → handover.',
          'Organisational development: analysis → target concept → pilot phase → roll-out of the full concept → training → introduction.',
          'Product development: market and internal analysis → feasibility study → development → testing and approval → pilot run → market launch.',
          'Software development: pre-study → functional concept → IT concept → build → test → training → introduction.',
        ],
      },
      {
        type: 'table',
        key: 'boundContext',
        title: 'Context: strategy, other projects and outside factors',
        hint: 'Factors outside the project that affect it. Note how information and coordination flow, and who holds roles in several projects.',
        numbered: true,
        addLabel: 'Add factor',
        columns: [
          { key: 'factor', label: 'Factor', kind: 'text', w: 20, placeholder: 'e.g. ERP rollout' },
          { key: 'type', label: 'Type', kind: 'select', options: CTX_TYPES, w: 16 },
          { key: 'effect', label: 'Effect', kind: 'select', options: EFFECTS, w: 10 },
          { key: 'flow', label: 'Information and coordination', kind: 'textarea', w: 26, placeholder: 'How and how often you align' },
          { key: 'contact', label: 'Contact or shared role', kind: 'text', w: 16, placeholder: 'Who links the two' },
        ],
        defaults: [
          { type: 'Company strategy', _ph: { factor: 'Strategy the project serves' } },
          { type: 'Similar or parallel project', _ph: { factor: 'Project that needs the same people' } },
          { type: 'Legal', _ph: { factor: 'Law, permit or regulation' } },
          { type: 'Assumption or critical parameter', _ph: { factor: 'What must stay true' } },
        ],
      },
      {
        type: 'graphic',
        title: 'Context of the project',
        caption: 'The project in the centre and the factors around it, grouped by type. Green solid edges support the project, red dashed edges conflict with it, grey dotted edges are neutral.',
        empty: (q) => (q.rows('boundContext').length ? null : 'Add factors to the context table to see the diagram.'),
        render: contextGraphic,
      },

      { type: 'h', text: 'People', sub: 'Who is inside the project: the project organisation.' },
      {
        type: 'table',
        key: 'people',
        title: 'Project organisation',
        hint: 'One project owner (strategic responsibility), one project manager (full operative responsibility) and the core team members (PMTM), each responsible for one area.',
      },
      {
        type: 'graphic',
        title: 'Project organisation (boundary)',
        caption: 'The project owner on top, the project manager below, and the core team (PMTM) around the PM. The dashed line is the boundary of the project management team.',
        render: orgGraphic,
      },
      { type: 'note', text: 'The people context, everyone outside the project who is affected by it and may try to influence it, is the stakeholder analysis in 3.4.' },
      {
        type: 'callout',
        kind: 'warn',
        title: 'Common failure: boundaries too narrow or too vague.',
        text: 'A project that is defined too narrowly misses what it depends on, and vague boundaries invite scope creep. Agree a joint big project picture with the PO and the core team.',
      },
    ],
  });

  // =====================================================================================
  // Section 3.3: Project Charter
  // =====================================================================================

  PM.section({
    id: 'charter',
    part: 'initiation',
    order: 33.5,
    num: '3.3',
    slides: '24, 26, 79',
    title: 'Project Charter',
    navTitle: 'Project Charter',
    intro: 'The formal assignment of the project: what it must achieve, by when, with which resources and with whom. PO and PM sign it.',
    blocks: [
      {
        type: 'callout',
        kind: 'rule',
        title: 'No project without a clear Project Charter.',
        text: 'PO, PM and the core team develop it together. It goes to the whole project organisation and to selected stakeholders. The signed version is part of the PM plan.',
      },
      {
        type: 'fields',
        title: 'Charter',
        cols: 3,
        fields: [
          { key: 'charter.status', label: 'Status', kind: 'select', options: ['Draft', 'Preliminarily released', 'Released (final)'] },
          { key: 'charter.version', label: 'Version', kind: 'text', placeholder: 'e.g. 1.0' },
          { key: 'charter.date', label: 'Date', kind: 'date' },
          { key: 'time.startEvent' },
          { key: 'time.startDate' },
          { key: 'time.duration' },
          { key: 'time.endEvent' },
          { key: 'time.endDate' },
          { key: 'charter.businessNeeds', label: 'Business need', kind: 'textarea', wide: true, placeholder: 'Why the organisation needs this project now' },
        ],
      },
      {
        type: 'fields',
        title: 'Roles',
        hint: 'Left empty, the charter takes the people with these roles from the people list.',
        cols: 2,
        fields: [
          { key: 'charter.po', label: 'Project sponsor (PO)', kind: 'person' },
          { key: 'charter.pm', label: 'Project manager', kind: 'person' },
          { key: 'charter.coreTeam', label: 'Project core team', kind: 'people' },
          { key: 'charter.team', label: 'Project team members', kind: 'people' },
        ],
      },
      { type: 'table', key: 'boundObjectives', title: 'Objectives', hint: 'The same objectives as in the six fields.' },
      { type: 'table', key: 'boundNonObjectives', title: 'Non-objectives' },
      { type: 'table', key: 'charterDeliverables', title: 'Main deliverables', hint: 'The main results the project hands over.', numbered: true, addLabel: 'Add deliverable',
        columns: [
          { key: 'deliverable', label: 'Main deliverable', kind: 'text', w: 24, placeholder: 'e.g. Festival concept' },
          { key: 'desc', label: 'Description', kind: 'textarea', w: 32, placeholder: 'What exactly is delivered' },
          { key: 'due', label: 'Due', kind: 'date' },
        ],
        defaults: [{ _ph: { deliverable: 'Main deliverable' } }, { _ph: { deliverable: 'Main deliverable' } }, { _ph: { deliverable: 'Main deliverable' } }],
      },
      { type: 'table', key: 'charterNonDeliverables', title: 'Non-deliverables', hint: 'What people might expect but the project does not deliver.', numbered: true, addLabel: 'Add non-deliverable',
        columns: [
          { key: 'item', label: 'Non-deliverable', kind: 'text', w: 24, placeholder: 'e.g. Guest transport' },
          { key: 'note', label: 'Note', kind: 'text', w: 36, placeholder: 'Why, or who handles it' },
        ],
        defaults: [{ _ph: { item: 'Not delivered' } }, { _ph: { item: 'Not delivered' } }],
      },
      { type: 'table', key: 'boundPhases', title: 'Project phases' },
      {
        type: 'table',
        key: 'charterResources',
        title: 'Resources and costs',
        hint: 'Rough figures: staff in person-days, external services, material. Detailed costs follow in 3.5.',
        numbered: true,
        addLabel: 'Add resource',
        columns: [
          { key: 'type', label: 'Type', kind: 'select', options: RES_TYPES, w: 16 },
          { key: 'desc', label: 'What', kind: 'text', w: 20, placeholder: 'e.g. project team' },
          { key: 'qty', label: 'Quantity', kind: 'number', w: 7 },
          { key: 'unit', label: 'Unit', kind: 'text', w: 7, placeholder: 'PD' },
          { key: 'rate', label: 'Cost per unit', kind: 'money', w: 10 },
          { key: 'cost', label: 'Cost', kind: 'money', w: 11, total: true, compute: (r) => { const a = U.num(r.qty); const b = U.num(r.rate); return a != null && b != null ? a * b : null; } },
        ],
        defaults: [{ type: 'Staff (internal)', unit: 'PD' }, { type: 'External labour' }, { type: 'Material or investment' }],
      },
      {
        type: 'table',
        key: 'charterSignatures',
        title: 'Signatures',
        fixed: [
          { _id: 'po', role: 'Project owner (sponsor)' },
          { _id: 'pm', role: 'Project manager' },
        ],
        columns: [
          { key: 'role', label: 'Role', from: true, w: 18 },
          { key: 'name', label: 'Name', kind: 'person', w: 16 },
          { key: 'place', label: 'Place', kind: 'text', w: 12 },
          { key: 'date', label: 'Date', kind: 'date' },
          { key: 'signed', label: 'Signed', kind: 'check', w: 6 },
        ],
      },
      {
        type: 'table',
        key: 'charterDistribution',
        title: 'Distribution',
        hint: 'Who received the charter: the whole project organisation and selected stakeholders.',
        numbered: true,
        addLabel: 'Add recipient',
        columns: [
          { key: 'who', label: 'Received by', kind: 'text', w: 28, placeholder: 'Name or group' },
          { key: 'role', label: 'Role', kind: 'select', options: ['Project organisation', 'Stakeholder'], w: 16 },
          { key: 'date', label: 'Date', kind: 'date' },
        ],
        defaults: [{ role: 'Project organisation', _ph: { who: 'Core team' } }, { role: 'Stakeholder', _ph: { who: 'Selected stakeholder' } }],
      },
      {
        type: 'graphic',
        title: 'Project Charter on one page',
        caption: 'An A4 page in the classic charter layout, ready to print and sign. Long lists are cut with a "+ n more" note; the full lists are in the tables above. Phases leave out project management (1.1).',
        render: charterSheet,
      },
      {
        type: 'checks',
        title: 'Charter checks',
        run(q) {
          const out = [];
          [['Start', 'time.startEvent', 'time.startDate'], ['End', 'time.endEvent', 'time.endDate']].forEach(([l, ek, dk]) => {
            const ok = !U.isEmpty(q.f(ek)) && U.isDate(q.f(dk));
            out.push({ ok, text: ok ? l + ' has an event and a date.' : 'Give the ' + l.toLowerCase() + ' both an event and a date.' });
          });
          const sd = q.f('time.startDate');
          const ed = q.f('time.endDate');
          if (U.isDate(sd) && U.isDate(ed) && ed < sd) out.push({ ok: false, text: 'The end date is before the start date.' });
          const objs = filled(q.rows('boundObjectives'), 'objective');
          out.push({ ok: objs.length > 0, text: objs.length ? plural(objs.length, 'objective') + ' listed.' : 'List at least one objective.' });
          const nons = filled(q.rows('boundNonObjectives'), 'exclusion');
          out.push({ ok: nons.length > 0, text: nons.length ? plural(nons.length, 'non-objective') + ' listed.' : 'List at least one non-objective: it makes the objectives clearer.' });
          if (objs.length) {
            const tasks = objs.filter((r) => VERB_RE.test(String(r.objective).trim()));
            out.push({
              ok: !tasks.length,
              text: tasks.length
                ? 'Reword as a future state, not as a task: ' + tasks.map((r) => '"' + String(r.objective).trim().slice(0, 60) + '"').join(', ') + '.'
                : 'Objectives are worded as future states.',
            });
          }
          const po = personVal(q, poId(q), '');
          out.push({ ok: !po.ph, text: po.ph ? 'Name the project owner (sponsor).' : 'Project owner: ' + po.t + '.' });
          const pm = personVal(q, pmId(q), '');
          out.push({ ok: !pm.ph, text: pm.ph ? 'Name the project manager.' : 'Project manager: ' + pm.t + '.' });
          const pms = q.withRole('Project manager').filter((p) => p.name);
          if (pms.length > 1) out.push({ ok: false, text: pms.length + ' people have the role Project manager (' + pms.map((p) => p.name).join(', ') + '). A project has only one PM.' });
          else out.push({ ok: pms.length === 1 ? true : null, text: pms.length === 1 ? 'Only one project manager.' : 'No one has the role Project manager in the people list yet.' });
          const missing = q.rows('charterSignatures').filter((r) => !r.name || !U.isDate(r.date) || !r.signed);
          out.push({ ok: !missing.length, text: missing.length ? 'Signature not complete (name, date, signed): ' + missing.map((r) => r.role).join(', ') + '.' : 'Both signatures are complete.' });
          const total = U.sum(q.rows('charterResources'), (r) => U.num(r.cost) || 0);
          const bud = U.num(q.f('content.budget'));
          if (total || bud) out.push({ ok: null, text: 'Resources and costs total ' + q.money(total || 0) + (bud ? '; rough budget in 3.3: ' + q.money(bud) + '.' : '.') });
          return out;
        },
      },
    ],
  });

  // =====================================================================================
  // Metrics
  // =====================================================================================

  PM.metric('objectives', { label: 'Objectives', kind: 'number', section: 'boundaries', fn: (q) => filled(q.rows('boundObjectives'), 'objective').length || null });
  PM.metric('roughBudget', { label: 'Rough budget', kind: 'money', section: 'boundaries', fn: (q) => U.num(q.f('content.budget')) || null });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================

  PM.example({
    f: {
      'pre.history': 'After the reorganisation in autumn 2025 the engagement survey dropped by 12 points. HR proposed a festival for employees and their families in December 2025.',
      'pre.decisions': 'Management board approved the idea and a budget frame of €45,000 on 15 Jan 2026; the date is the last Saturday in June.',
      'pre.documents': 'Engagement survey 2025; idea paper and business case; venue offer with an option on 27 June.',
      'pre.supporters': 'Head of HR, works council, Corporate Communications',
      'pre.opponents': 'IT management, because the ERP rollout needs the same staff in spring',
      'post.results': 'Photos and film go to the careers site; the feedback flows into the 2027 engagement survey.',
      'post.followUp': 'The board decides in September 2026 whether the festival becomes a yearly event.',
      'post.benefits': 'Stronger employer brand, a reusable event concept and a tested supplier list.',
      'post.prepare': 'Collect photos with consent, keep supplier contacts and a lessons-learned list, draft the proposal for 2027.',
      'content.topObjective': 'Employees and their families have spent a day together that strengthens their bond with the company and with each other.',
      'content.budget': 45000,
      'content.budgetNote': 'External services and material (41,000 + 4,000). Staff time (140 person-days) is tracked separately.',
      'charter.status': 'Released (final)',
      'charter.version': '1.0',
      'charter.date': '2026-02-02',
      'charter.businessNeeds': 'After the 2025 reorganisation, employee engagement dropped. A shared summer festival for employees and their families brings people together across the new divisions and strengthens the employer brand for recruiting.',
      'charter.po': 'p1',
      'charter.pm': 'p2',
      'charter.coreTeam': ['p3', 'p4', 'p5', 'p6'],
      'charter.team': ['p7', 'p8', 'p9'],
    },
    t: {
      boundObjectives: [
        { _id: 'bo1', objective: '400 employees and family members have attended the festival', cls: 'Scope or functional', sub: 'Participation', indicator: 'Guests counted at the entrance', target: '≥ 400 guests', prio: 'Should' },
        { _id: 'bo2', objective: 'Average guest rating is at least 4 of 5', cls: 'Scope or functional', sub: 'Guest satisfaction', indicator: 'Feedback survey', target: '≥ 4.0 of 5', prio: 'Should' },
        { _id: 'bo3', objective: 'External costs have stayed within €45,000', cls: 'Budget', sub: 'External costs', indicator: 'Final cost statement', target: '≤ €45,000', prio: 'Must' },
        { _id: 'bo4', objective: 'Staff time has stayed within 140 person-days', cls: 'Budget', sub: 'Internal effort', indicator: 'Logged person-days', target: '≤ 140 PD', prio: 'Should' },
        { _id: 'bo5', objective: 'The festival has been held on 27 June 2026', cls: 'Schedule', sub: 'Event date', indicator: 'Festival date', target: '27 Jun 2026', prio: 'Must' },
        { _id: 'bo6', objective: 'The festival has passed without safety incidents', cls: 'Procedural', sub: 'Safety', indicator: 'Incidents reported', target: '0 incidents', prio: 'Must' },
        { _id: 'bo7', objective: 'The festival is visible in the employer-branding channels', cls: 'Other', sub: 'Employer brand', indicator: 'Posts on the careers channels', target: '≥ 5 posts', prio: 'Nice to have' },
      ],
      boundNonObjectives: [
        { _id: 'bn1', exclusion: 'No public event', why: 'Only employees and their families are invited' },
        { _id: 'bn2', exclusion: 'No overnight programme', why: 'Day event; music ends at 22:00 because of the noise rules' },
        { _id: 'bn3', exclusion: 'No festivals at the other sites', why: 'Other sites get their own budget' },
      ],
      boundContext: [
        { _id: 'bc1', factor: 'Employer-branding strategy 2026', type: 'Company strategy', effect: 'Supports', flow: 'Festival photos feed the careers campaign; monthly sync with Marketing', contact: 'Sara Kovac (also in the branding team)' },
        { _id: 'bc2', factor: 'ERP rollout (IT project)', type: 'Similar or parallel project', effect: 'Conflicts', flow: 'Same key users in Finance and Facility; PMs align plans every two weeks', contact: 'Jonas Weber (ERP key user)' },
        { _id: 'bc3', factor: 'Daily facility operations', type: 'Line task', effect: 'Neutral', flow: 'Shift plan for the set-up week agreed with the facility manager', contact: 'Mia Fischer' },
        { _id: 'bc4', factor: 'City noise regulations', type: 'Legal', effect: 'Conflicts', flow: 'Music ends at 22:00; event permit from the city by 5 June', contact: 'Tom Schmid with the city authority' },
        { _id: 'bc5', factor: 'Works council agreement on family events', type: 'Legal', effect: 'Supports', flow: 'Covers insurance and working time of helpers; works council informed monthly', contact: 'Anna Berger' },
        { _id: 'bc6', factor: 'Tight cost targets 2026', type: 'Economic', effect: 'Conflicts', flow: 'Monthly cost report to Finance', contact: 'Jonas Weber' },
        { _id: 'bc7', factor: 'Waste-free event guideline', type: 'Ecological', effect: 'Supports', flow: 'Reusable dishes and a waste concept with the caterer', contact: 'Tom Schmid' },
        { _id: 'bc8', factor: 'Good weather on 27 June', type: 'Assumption or critical parameter', effect: 'Neutral', flow: 'Tent option held until 13 June; weather check from 20 June', contact: 'Tom Schmid' },
      ],
      charterDeliverables: [
        { _id: 'cd1', deliverable: 'Approved festival concept', desc: 'Programme, catering, venue and safety concept, approved by the PO', due: '2026-03-27' },
        { _id: 'cd2', deliverable: 'Invitations and final guest list', desc: 'Invitation campaign, registrations and the final guest list', due: '2026-06-19' },
        { _id: 'cd3', deliverable: 'Festival day for about 400 guests', desc: 'Held at the venue with programme, catering and a children\'s area', due: '2026-06-27' },
        { _id: 'cd4', deliverable: 'Evaluation report', desc: 'Guest survey, final cost statement and lessons learned', due: '2026-07-17' },
      ],
      charterNonDeliverables: [
        { _id: 'cn1', item: 'Public marketing campaign', note: 'Internal communication only; Marketing may reuse photos later' },
        { _id: 'cn2', item: 'Transport for guests', note: 'Guests travel on their own; parking is provided' },
        { _id: 'cn3', item: 'Overnight accommodation', note: 'Day event only' },
      ],
      charterResources: [
        { _id: 'cr1', type: 'Staff (internal)', desc: 'Project team', qty: 140, unit: 'PD', rate: 400 },
        { _id: 'cr2', type: 'External labour', desc: 'Venue, catering, artists, technology', qty: 1, unit: 'lump sum', rate: 41000 },
        { _id: 'cr3', type: 'Material or investment', desc: 'Decoration and give-aways', qty: 1, unit: 'lump sum', rate: 4000 },
      ],
      charterDistribution: [
        { _id: 'dl1', who: 'Core team (Lea Novak, Tom Schmid, Sara Kovac, Jonas Weber)', role: 'Project organisation', date: '2026-02-02' },
        { _id: 'dl2', who: 'Paul Gruber, management board', role: 'Stakeholder', date: '2026-02-03' },
        { _id: 'dl3', who: 'Team members and project assistant', role: 'Project organisation', date: '2026-02-04' },
        { _id: 'dl4', who: 'Works council', role: 'Stakeholder', date: '2026-02-05' },
        { _id: 'dl5', who: 'Head of IT (ERP rollout)', role: 'Stakeholder', date: '2026-02-05' },
      ],
    },
    x: {
      boundPhases: {
        w11: { phaseResult: 'Charter, PM plan, progress reports, closure report', roughStart: '2026-02-02', roughEnd: '2026-07-31' },
        w12: { phaseResult: 'Approved festival concept', roughStart: '2026-02-16', roughEnd: '2026-03-27' },
        w13: { phaseResult: 'All contracts signed, safety concept approved', roughStart: '2026-03-30', roughEnd: '2026-06-05' },
        w14: { phaseResult: 'Final guest list', roughStart: '2026-04-13', roughEnd: '2026-06-19' },
        w15: { phaseResult: 'Festival held, venue handed back', roughStart: '2026-06-22', roughEnd: '2026-06-30' },
        w16: { phaseResult: 'Evaluation report and final cost statement', roughStart: '2026-06-29', roughEnd: '2026-07-17' },
      },
      charterSignatures: {
        po: { name: 'p1', place: 'Graz', date: '2026-02-02', signed: true },
        pm: { name: 'p2', place: 'Graz', date: '2026-02-02', signed: true },
      },
    },
  });
})();
