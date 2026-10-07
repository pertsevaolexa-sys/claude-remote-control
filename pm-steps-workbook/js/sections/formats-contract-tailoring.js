/* Framework sections 6 (kick-off and start workshop), 7 (contract management) and 8 (tailoring), plus the method pyramid graphic. */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  const W = 1000; // width of every drawing in this file
  const EXT = 'External (customer) project';
  const r1 = (n) => S.round(n);
  const filled = (v) => !U.isEmpty(v) && !(Array.isArray(v) && !v.length);

  // =====================================================================================
  // Shared drawing helpers
  // =====================================================================================

  /** Chevron as a path, so it can also be dashed. first: flat left edge. */
  function chev(x, y, w, h, first, tip, o) {
    const pts = first
      ? [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h]]
      : [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h], [x + tip, y + h / 2]];
    return S.path('M' + pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' L') + ' Z', { fill: o.fill, stroke: o.stroke, sw: o.sw, dash: o.dash, join: 'round' });
  }

  /** Largest font size (from sizes) at which str wraps into maxLines lines no wider than maxW. */
  function fitLines(str, maxW, maxLines, sizes, weight) {
    sizes = sizes || [12, 11.5, 11, 10.5, 10];
    const words = String(str || '').split(/\s+/).filter(Boolean);
    for (const size of sizes) {
      if (words.some((w) => S.measure(w, size, weight) > maxW + 0.5)) continue;
      const lines = S.wrap(str, maxW, size, weight);
      if (lines.length <= maxLines) return { lines, size };
    }
    // fallback: wrap at word breaks only, ellipsis where it does not fit
    const size = sizes[sizes.length - 1];
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (!cur || S.measure(t, size, weight) <= maxW) cur = t;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    const out = lines.slice(0, maxLines);
    if (lines.length > maxLines) out[maxLines - 1] += '…';
    return { lines: out.map((l) => (S.measure(l, size, weight) > maxW ? S.fit(l, maxW, size, weight) : l)), size };
  }

  /** Lines of text, vertically centred on cy. o.anchor decides the horizontal alignment at x. */
  function linesAt(x, cy, fit, o) {
    const size = fit.size;
    const lh = size * 1.18;
    const top = cy - ((fit.lines.length - 1) * lh + size) / 2;
    return fit.lines.map((ln, i) => S.text(x, top + i * lh, ln, Object.assign({ anchor: 'middle' }, o, { size, v: 'top' }))).join('');
  }

  /** Text with a halo in the background colour, so a line passing behind it stays readable. */
  function haloText(x, y, str, o, pal) {
    return S.text(x, y, str, o).replace('<text', '<text stroke="' + pal.bg + '" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"');
  }

  /** Text rotated around (x, y). */
  function rotText(x, y, deg, str, o) {
    return '<g transform="rotate(' + r1(deg) + ' ' + r1(x) + ' ' + r1(y) + ')">' + S.text(x, y, str, o) + '</g>';
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

  /** Fill, outline and text colours for a process status (step status or contract step status). */
  function statusStyle(status, pal) {
    switch (status) {
      case 'Done':
        return { fill: pal.accent, stroke: pal.accent, sw: 1, ink: pal.accentInk };
      case 'In progress':
        return { fill: pal.accentSoft, stroke: pal.accent, sw: 1.5, ink: pal.ink };
      case 'Skipped':
      case 'Not applicable':
        return { fill: pal.bg, stroke: pal.muted, sw: 1.2, dash: '4 3', ink: pal.muted };
      default:
        return { fill: pal.box, stroke: pal.boxLine, sw: 1, ink: pal.ink };
    }
  }
  function statusLegend(pal, labels) {
    return labels.map((st) => {
      const s = statusStyle(st, pal);
      return { label: st, sw: 18, swatch: (x, cy) => chev(x, cy - 6, 18, 12, true, 5, s) };
    });
  }

  // =====================================================================================
  // Section 6: kick-off and start workshop
  // =====================================================================================
  const FORMATS = [
    { _id: 'alone', format: 'Planning alone' },
    { _id: 'one', format: 'One-to-one meetings' },
    { _id: 'kick', format: 'Kick-off meeting' },
    { _id: 'ws', format: 'Project start workshop' },
    { _id: 'fu', format: 'Follow-up workshop' },
  ];
  const COMPARE = [
    { _id: 'purpose', aspect: 'Purpose', kickoff: 'Present results and brief the team with filtered information', ws: 'Work out planning and organisation together' },
    { _id: 'comm', aspect: 'Communication', kickoff: 'One way: talk and presentation', ws: 'Team work; the PM works as part of the project management team' },
    { _id: 'effect', aspect: 'Effect', kickoff: 'Information', ws: 'Acceptance, motivation and commitment' },
    { _id: 'effort', aspect: 'Effort', kickoff: 'Medium', ws: 'High: preparation, follow-up and coordination' },
    { _id: 'quality', aspect: 'Planning quality', kickoff: 'Usually low', ws: 'Usually high' },
    { _id: 'duration', aspect: 'Duration', kickoff: '2 to 4 hours', ws: 'Half a day to 2 days' },
  ];
  const WS_METHODS = ['Presentation', 'Group work', 'Plenary discussion', 'Individual work', 'Break'];
  const WS_MODES = ['Prepared in advance and presented', 'Worked out in the workshop'];

  function formatSteps(q, pal) {
    const used = {};
    q.rows('fmtUsed').forEach((r) => (used[r._id] = r));
    const L = 64;
    const R = 12;
    const top = 14;
    const heights = [88, 126, 164, 202];
    const base = top + heights[3];
    const colW = (W - L - R) / 4;
    const gap = 12;
    const arrow = S.uid('fa');
    let body = '<defs>' + S.arrowDef(arrow, pal.ink2) + '</defs>';
    body += S.line(34, base, 34, top + 2, { stroke: pal.ink2, sw: 1.5, markerEnd: arrow });
    body += rotText(20, (top + base) / 2, -90, 'Effort and planning quality', { size: 11.5, fill: pal.ink2, anchor: 'middle', v: 'middle' });
    body += S.line(L - 10, base, W - R, base, { stroke: pal.axis });
    FORMATS.slice(0, 4).forEach((f, i) => {
      const row = used[f._id] || {};
      const on = !!row.used;
      const x = L + i * colW + gap / 2;
      const w = colW - gap;
      const h = heights[i];
      const y = base - h;
      const ink = on ? pal.accentInk : pal.ink;
      const sub = on ? pal.accentInk : pal.muted;
      body += S.rect(x, y, w, h, { fill: on ? pal.accent : pal.box, stroke: on ? pal.accent : pal.boxLine, rx: 6 });
      const name = S.textBlock(x + 12, y + 12, f.format, { maxW: w - 24, size: 13, weight: 600, fill: ink, maxLines: 2 });
      body += name.svg;
      let ty = y + 12 + name.h + 8;
      const lines = [];
      if (on) {
        lines.push(row.when ? q.date(row.when) : 'Used, no date yet');
        if (row.participants) lines.push(q.num(row.participants) + (Number(row.participants) === 1 ? ' person' : ' people'));
        if (f._id === 'ws' && used.fu && used.fu.used) lines.push('Follow-up workshop' + (used.fu.when ? ': ' + q.date(used.fu.when) : ''));
      } else {
        lines.push('Not used');
      }
      lines.forEach((ln) => {
        const tb = S.textBlock(x + 12, ty, ln, { maxW: w - 24, size: 11.5, fill: sub, italic: !on, maxLines: 2 });
        body += tb.svg;
        ty += tb.h + 5;
      });
    });
    const lg = legendRow(
      [
        { label: 'Used in this project (with date and participants)', swatch: (x, cy) => S.rect(x, cy - 6, 14, 12, { fill: pal.accent, rx: 2 }) },
        { label: 'Not used', swatch: (x, cy) => S.rect(x, cy - 6, 14, 12, { fill: pal.box, stroke: pal.boxLine, rx: 2 }) },
      ],
      L, base + 12, W - L - R, pal
    );
    body += lg.svg;
    return S.svg(W, base + 12 + lg.h + 8, body, { pal, label: 'Communication formats ordered by effort and planning quality' });
  }

  PM.section({
    id: 'formats',
    part: 'formats',
    order: 60,
    num: '6',
    slides: '147–152',
    title: 'Kick-off and start workshop',
    navTitle: 'Kick-off and start workshop',
    intro: 'Choose how the team plans together in the start phase, then prepare the kick-off and the start workshop.',
    blocks: [
      {
        type: 'guide',
        title: 'Four formats you can combine',
        text: 'Effort and planning quality both rise from the first format to the last. Most projects combine several of them.',
        items: [
          'Planning alone: the PM drafts plans at the desk. Quick, but the plan rests on one view.',
          'One-to-one meetings: the PM works through single topics with the people who know them.',
          'Kick-off meeting: the PM presents the results so far and briefs the team. Information flows one way.',
          'Project start workshop: the team works out planning and organisation together. It costs the most effort and gives the best plans and the strongest commitment.',
        ],
      },
      {
        type: 'table',
        key: 'fmtCompare',
        title: 'Kick-off meeting and start workshop compared',
        hint: 'Write in the last column how your project used each format.',
        fixed: COMPARE,
        columns: [
          { key: 'aspect', label: 'Aspect', from: true, w: 12 },
          { key: 'kickoff', label: 'Kick-off meeting', from: true, w: 22 },
          { key: 'ws', label: 'Project start workshop', from: true, w: 24 },
          { key: 'ours', label: 'In our project', kind: 'text', w: 26, placeholder: 'How it was in your project' },
        ],
      },
      {
        type: 'table',
        key: 'fmtUsed',
        title: 'Formats used in this project',
        hint: 'Tick the formats you used and when. The follow-up workshop is a second, shorter workshop to complete the detailed plans.',
        fixed: FORMATS,
        columns: [
          { key: 'format', label: 'Format', from: true, w: 18 },
          { key: 'used', label: 'Used', kind: 'check' },
          { key: 'when', label: 'When', kind: 'date' },
          { key: 'participants', label: 'Participants', kind: 'number', w: 8, sub: 'people' },
          { key: 'note', label: 'Note', kind: 'text', w: 28, placeholder: 'Who took part, what came out of it' },
        ],
      },
      {
        type: 'graphic',
        title: 'Formats: effort and planning quality',
        caption: 'The four formats as steps. Each step up costs more effort and gives better plans. Filled steps are the ones this project used.',
        render: formatSteps,
      },
      { type: 'h', text: 'Kick-off meeting', sub: 'A short meeting to inform everyone: what the project is, what has been decided, who does what.' },
      {
        type: 'fields',
        title: 'Kick-off',
        cols: 3,
        fields: [
          { key: 'fmt.kickoffDate', label: 'Date', kind: 'date' },
          { key: 'fmt.kickoffDuration', label: 'Duration', kind: 'text', placeholder: 'e.g. 2 hours' },
          { key: 'fmt.kickoffPlace', label: 'Place', kind: 'text', placeholder: 'Room or online' },
          { key: 'fmt.kickoffParticipants', label: 'Participants', kind: 'people', wide: true },
        ],
      },
      {
        type: 'table',
        key: 'fmtKickoffAgenda',
        title: 'Kick-off agenda',
        numbered: true,
        addLabel: 'Add agenda item',
        columns: [
          { key: 'time', label: 'Time', kind: 'text', w: 7, placeholder: '14:00' },
          { key: 'topic', label: 'Topic', kind: 'text', w: 30 },
          { key: 'presenter', label: 'Presenter', kind: 'person' },
          { key: 'material', label: 'Material', kind: 'text', w: 18, placeholder: 'Slides, charter, plan' },
        ],
        defaults: [
          { _ph: { time: '0:00', topic: 'Welcome and why the project matters' } },
          { _ph: { time: '0:15', topic: 'Project charter: objectives, scope, dates, budget' } },
          { _ph: { time: '0:45', topic: 'Milestones and high-level plan' } },
          { _ph: { time: '1:15', topic: 'Project organisation and roles' } },
          { _ph: { time: '1:40', topic: 'Next steps and questions' } },
        ],
      },
      { type: 'h', text: 'Project start workshop', sub: 'The PM is responsible. Decide what you prepare and present, and what the team works out on the day.' },
      {
        type: 'fields',
        title: 'Start workshop',
        cols: 3,
        fields: [
          { key: 'fmt.wsDate', label: 'Date', kind: 'date' },
          { key: 'fmt.wsDuration', label: 'Duration', kind: 'select', options: ['Half a day', '1 day', '1.5 days', '2 days'] },
          { key: 'fmt.wsPlace', label: 'Place', kind: 'text', placeholder: 'e.g. seminar hotel' },
          { key: 'fmt.wsExternal', label: 'External location', kind: 'select', options: ['Yes, external location', 'No'] },
          { key: 'fmt.wsModerator', label: 'Moderation', kind: 'text', placeholder: 'PM, PO, assistant, internal or external coach' },
          { key: 'fmt.wsSocial', label: 'Social event', kind: 'text', placeholder: 'e.g. dinner after the workshop' },
          { key: 'fmt.wsParticipants', label: 'Participants', kind: 'people', wide: true },
        ],
      },
      {
        type: 'table',
        key: 'fmtWsAgenda',
        title: 'Start workshop agenda',
        hint: 'Plan content and process. Mark for each item whether it is prepared in advance or worked out together.',
        numbered: true,
        addLabel: 'Add agenda item',
        columns: [
          { key: 'time', label: 'Time', kind: 'text', w: 7, placeholder: '09:00' },
          { key: 'topic', label: 'Topic', kind: 'text', w: 26 },
          { key: 'method', label: 'Method', kind: 'select', options: WS_METHODS, w: 14 },
          { key: 'result', label: 'Result', kind: 'text', w: 18, placeholder: 'What exists afterwards' },
          { key: 'responsible', label: 'Responsible', kind: 'person' },
          { key: 'mode', label: 'Prepared or worked out', kind: 'select', options: WS_MODES, w: 20 },
        ],
        defaults: [
          { _ph: { time: '09:00', topic: 'Welcome, goals and agenda' } },
          { _ph: { time: '09:20', topic: 'Results so far: charter and high-level plan' } },
          { _ph: { time: '10:00', topic: 'Roles and project organisation' } },
          { _ph: { time: '11:15', topic: 'Communication and ground rules' } },
          { _ph: { time: '13:30', topic: 'Work packages and detailed schedule' } },
          { _ph: { time: '15:30', topic: 'Risks and measures' } },
          { _ph: { time: '16:30', topic: 'Open points and next steps' } },
        ],
      },
      {
        type: 'checks',
        title: 'Start workshop checks',
        run: (q) => {
          const ppl = q.f('fmt.wsParticipants');
          const used = q.row('fmtUsed', 'ws') || {};
          const n = (Array.isArray(ppl) && ppl.length) || Number(used.participants) || 0;
          const agenda = q.rows('fmtWsAgenda');
          const prep = agenda.filter((r) => r.mode === WS_MODES[0]).length;
          const work = agenda.filter((r) => r.mode === WS_MODES[1]).length;
          const social = q.f('fmt.wsSocial');
          return [
            { ok: n ? n >= 3 && n <= 15 : false, text: n ? n + ' participants (3 to 15 work well)' : 'Enter the participants (3 to 15 work well)' },
            { ok: q.f('fmt.wsExternal') === 'Yes, external location', text: 'Held at an external location, away from daily business' },
            { ok: prep > 0 && work > 0, text: 'The agenda mixes prepared items (' + prep + ') with items worked out together (' + work + ')' },
            { ok: null, text: social ? 'Social event: ' + social : 'Consider a social event, such as a dinner after the workshop' },
            { ok: null, text: 'The start workshop also counts as a quality measure: the whole team checks the plan.' },
          ];
        },
      },
    ],
  });

  // =====================================================================================
  // Section 7: contract management
  // =====================================================================================
  const CONTRACT_STEPS = [
    { _id: 'acq', step: 'Acquisition', short: 'Acquisition', activities: 'Evaluate customer expectations, check technical and commercial feasibility, plan the offer process', roles: 'Sales', results: 'Rough business case, first risk assessment, customer requirements, plan for the offer' },
    { _id: 'offer', step: 'Preparation of offer', short: 'Offer', activities: 'Plan the offer in detail where needed, prepare its contractual, commercial and content parts, assess risks, get approval', roles: 'Sales, department', results: 'Offer documents, business case and project plans, negotiation strategy' },
    { _id: 'nego', step: 'Contract negotiation', short: 'Negotiation', activities: 'Hand the offer to the customer, take in feedback, appoint the negotiation team, negotiate and sign', roles: 'Sales, department', results: 'Adapted offer, signed contract' },
    { _id: 'handover', step: 'Project handover', short: 'Handover', activities: 'Appoint PM and project team, brief the project organisation, release the offer team', roles: 'Sales, department, PM', results: 'Project organisation in place, project assignment, offer team released' },
    { _id: 'analysis', step: 'Contract analysis and detailed planning', short: 'Contract analysis', activities: 'Analyse the obligations of both parties, find risks and open points, plan the project', roles: 'PM, PMTMs', results: 'Implementation plan, risk analysis, claim and change request strategy' },
  ];
  const CONTRACT_STATUS = ['Not started', 'In progress', 'Done', 'Not applicable'];
  const CR_DECISIONS = ['Open', 'Accepted', 'Rejected'];

  function ownValues(rows, skip) {
    return rows.some((r) => Object.keys(r).some((k) => k[0] !== '_' && !(skip || []).includes(k) && filled(r[k])));
  }
  function contractHasEntries(q) {
    return (
      ownValues(q.rows('contractSteps'), ['step', 'short', 'activities', 'roles', 'results']) ||
      ownValues(q.raw('contractObligations')) ||
      ownValues(q.raw('contractCR')) ||
      filled(q.f('contract.claimStrategy')) ||
      filled(q.f('contract.crStrategy'))
    );
  }
  function kindText(q) {
    const k = q.f('meta.kind');
    if (!k) return 'Set the kind of project on the overview page. For an internal project this page can stay empty.';
    if (k === EXT) return 'This project is set to "' + k + '", so this page applies in full.';
    return 'This project is set to "' + k + '". This page can stay empty; use it only if you want to track contracts with suppliers.';
  }
  function kindNote(el, q) {
    el.innerHTML = '<div class="callout" data-kind="tip"><strong>Only for customer projects.</strong> ' + U.esc(kindText(q)) + '</div>';
  }

  function contractProcess(q, pal) {
    const LBL = 126;
    const x0 = 132;
    const x1 = W - 6;
    const implW = 100;
    const stepW = (x1 - x0 - implW) / 10;
    const sx = (k) => x0 + k * stepW;
    const tip = 9;
    const kind = q.f('meta.kind');
    const ext = kind === EXT;
    const cs = {};
    q.rows('contractSteps').forEach((r) => (cs[r._id] = r));
    const st = {};
    q.rows('steps').forEach((r) => (st[r._id] = r.status));

    const yC = 34;
    const hC = 48;
    const yGap = yC + hC;
    const yP = yGap + 46;
    const hP = 40;
    const yT = yP + hP + 6;
    const yEnd = yT + 40;
    let body = '';

    // header and zone dividers
    [['Initiation', sx(0), sx(5)], ['Start', sx(5), sx(10)], ['Implementation', sx(10), x1]].forEach(([t, a, b]) => {
      body += S.rect(a + 1, 0, b - a - 2, 24, { fill: pal.box, rx: 4 });
      body += S.text((a + b) / 2, 12, t, { size: 13, weight: 600, fill: pal.ink, anchor: 'middle', v: 'middle' });
    });
    [sx(10)].forEach((x) => (body += S.line(x, 26, x, yEnd, { stroke: pal.line, dash: '4 3' })));

    // lane labels
    const lane = (y, h, name, sub) => {
      const nm = fitLines(name, LBL - 8, 2, [12.5, 12], 600);
      const lh = nm.size * 1.18;
      const blockH = (nm.lines.length - 1) * lh + nm.size + (sub ? 15 : 0);
      let out = linesAt(3, y + h / 2 - blockH / 2 + ((nm.lines.length - 1) * lh + nm.size) / 2, nm, { fill: pal.ink, weight: 600, anchor: 'start' });
      if (sub) out += S.text(3, y + h / 2 + blockH / 2 - 11, sub, { size: 11, fill: pal.muted, italic: true });
      return out;
    };
    body += lane(yC, hC, 'Contract process', ext ? 'sales, then PM' : kind ? 'not applicable here' : 'customer projects');
    body += lane(yP, hP, 'Project management', 'process');

    // contract lane
    const spans = [[0, 2], [2, 4], [4, 5], [5, 6], [6, 10]];
    CONTRACT_STEPS.forEach((c, i) => {
      const [a, b] = spans[i];
      const x = sx(a);
      const w = sx(b) - x;
      const s = statusStyle((cs[c._id] || {}).status, pal);
      body += chev(x + 1, yC, w - 3, hC, i === 0, tip, s);
      const fit = fitLines(c.step, w - tip - 8, 2, [11.5, 11, 10.5, 10], 600);
      body += linesAt(x + 1 + (w - 3) / 2 - (i === 0 ? tip / 2 : 0), yC + hC / 2, fit, { fill: s.ink, weight: 600 });
    });

    // project management lane
    PM.PROCESS.forEach((p, i) => {
      const x = sx(i);
      const s = statusStyle(st[p.id], pal);
      body += chev(x + 1, yP, stepW - 3, hP, i === 0, tip, s);
      body += S.text(x + 1 + (stepW - 3) / 2 + (i === 0 ? -tip / 2 : 0), yP + hP / 2, p.id, { size: 12, weight: 700, family: 'mono', fill: s.ink, anchor: 'middle', v: 'middle' });
      const fit = fitLines(p.title, stepW - 6, 3, [10.5, 10], 400);
      body += linesAt(x + stepW / 2, yT + 18, fit, { fill: pal.ink2 });
    });
    const sImpl = statusStyle('', pal);
    body += chev(sx(10) + 1, yP, x1 - sx(10) - 1, hP, false, tip, sImpl);
    body += S.text(sx(10) + (x1 - sx(10)) / 2 + 2, yP + hP / 2, 'Implementation', { size: 11.5, weight: 600, fill: pal.ink, anchor: 'middle', v: 'middle' });

    // synchronisation points
    [[3.5, 1], [5.5, 2], [6.5, 3]].forEach(([k, n]) => {
      const x = sx(k);
      body += S.line(x, yGap + 2, x, yP - 2, { stroke: pal.strong, sw: 1.5, dash: '3 3' });
      body += S.circle(x, (yGap + yP) / 2, 10, { fill: pal.bg, stroke: pal.strong, sw: 1.5 });
      body += S.text(x, (yGap + yP) / 2, String(n), { size: 11.5, weight: 700, fill: pal.ink, anchor: 'middle', v: 'middle' });
    });

    // signature and communication gap
    const xs = sx(5);
    body += S.line(xs, 26, xs, yEnd + 8, { stroke: pal.crit, sw: 2, dash: '6 4' });
    body += S.diamond(xs, yGap + 10, 6, { fill: pal.crit, stroke: pal.bg, sw: 1.5 });
    body += S.text(xs + 8, yEnd + 2, S.fit('Contract signed: communication gap, because the people change here', W - xs - 16, 11.5), { size: 11.5, fill: pal.ink2 });

    const yL = yEnd + 26;
    const key = legendRow(
      [
        { label: 'Offer rests on the high-level plan', sw: 20, swatch: (x, cy) => S.circle(x + 9, cy, 8, { fill: pal.bg, stroke: pal.strong, sw: 1.5 }) + S.text(x + 9, cy, '1', { size: 10, weight: 700, fill: pal.ink, anchor: 'middle', v: 'middle' }) },
        { label: 'Handover is the project start', sw: 20, swatch: (x, cy) => S.circle(x + 9, cy, 8, { fill: pal.bg, stroke: pal.strong, sw: 1.5 }) + S.text(x + 9, cy, '2', { size: 10, weight: 700, fill: pal.ink, anchor: 'middle', v: 'middle' }) },
        { label: 'Contract analysis feeds the detailed planning', sw: 20, swatch: (x, cy) => S.circle(x + 9, cy, 8, { fill: pal.bg, stroke: pal.strong, sw: 1.5 }) + S.text(x + 9, cy, '3', { size: 10, weight: 700, fill: pal.ink, anchor: 'middle', v: 'middle' }) },
      ],
      2, yL, W - 4, pal
    );
    body += key.svg;
    const lg = legendRow(statusLegend(pal, ['Done', 'In progress', 'Not started', 'Not applicable']), 2, yL + key.h + 6, W - 4, pal);
    body += lg.svg;
    return S.svg(W, yL + key.h + 6 + lg.h + 6, body, { pal, label: 'Contract process and project management process with their synchronisation points' });
  }

  PM.section({
    id: 'contract',
    part: 'external',
    order: 70,
    num: '7',
    slides: '153–156',
    title: 'Contract management in customer projects',
    navTitle: 'Contract management',
    intro: 'In a customer project the contract process runs next to the project management process. Keep the two in step.',
    landscape: true,
    exportSkip: (q) => {
      const k = q.f('meta.kind');
      return !!k && k !== EXT && !contractHasEntries(q);
    },
    blocks: [
      { type: 'custom', render: kindNote, update: kindNote, exportBlocks: (q, opts) => (opts && opts.notes ? [{ type: 'p', text: kindText(q), style: 'note' }] : []) },
      {
        type: 'guide',
        title: 'Two processes side by side',
        text: 'Sales runs the contract process, the PM runs the project. Plan the points where they meet. What makes it hard:',
        items: [
          'The project rests on a legal contract that is hard to change.',
          'The people usually change between the offer and the implementation, so information gets lost when the contract is signed.',
          'The interests of the parties can contradict each other.',
          'A valid offer already needs some project planning.',
          'Contract and project documents repeat each other, for example the description of services.',
        ],
      },
      {
        type: 'table',
        key: 'contractSteps',
        title: 'Contract process in this project',
        hint: 'The grey columns describe each step. Note when it happens in your project, who does it and how far it is.',
        fixed: CONTRACT_STEPS,
        columns: [
          { key: 'step', label: 'Step', from: true, w: 14 },
          { key: 'activities', label: 'Activities', from: true, w: 26 },
          { key: 'roles', label: 'Roles', from: true, w: 11 },
          { key: 'results', label: 'Results', from: true, w: 22 },
          { key: 'when', label: 'When', kind: 'text', w: 10, placeholder: 'e.g. March' },
          { key: 'who', label: 'Who in our project', kind: 'text', w: 14 },
          { key: 'status', label: 'Status', kind: 'select', options: CONTRACT_STATUS, w: 12 },
          { key: 'note', label: 'Note', kind: 'text', w: 16 },
        ],
      },
      {
        type: 'graphic',
        title: 'Contract and project process',
        caption: 'The contract process above, the ten steps of the project below. The numbered points are where both must be in step. The red line marks the signature, where the offer team hands over to the project team.',
        render: contractProcess,
      },
      { type: 'h', text: 'Contract analysis', sub: 'After the handover, go through the contract and list what each party has to do, by when, and what is still open.' },
      {
        type: 'table',
        key: 'contractObligations',
        title: 'Obligations from the contract',
        numbered: true,
        addLabel: 'Add obligation',
        columns: [
          { key: 'obligation', label: 'Obligation', kind: 'text', w: 30 },
          { key: 'party', label: 'Party', kind: 'select', options: ['Customer', 'Us', 'Both', 'Supplier'], w: 10 },
          { key: 'clause', label: 'Clause', kind: 'text', w: 8, placeholder: '§ 4.2' },
          { key: 'due', label: 'Due', kind: 'date' },
          { key: 'risk', label: 'Risk or open point', kind: 'text', w: 24 },
          { key: 'wbs', label: 'WBS', kind: 'wbs' },
        ],
        defaults: [{ _ph: { obligation: 'e.g. Customer provides test data by …' } }, { _ph: { obligation: 'e.g. We deliver the concept for approval' } }],
      },
      {
        type: 'fields',
        title: 'Strategies',
        cols: 2,
        fields: [
          { key: 'contract.claimStrategy', label: 'Claim strategy', kind: 'textarea', placeholder: 'How you document deviations and assert claims' },
          { key: 'contract.crStrategy', label: 'Change request strategy', kind: 'textarea', placeholder: 'Who may request a change, who assesses and who decides' },
        ],
      },
      {
        type: 'table',
        key: 'contractCR',
        title: 'Change request log',
        hint: 'Log every change to scope, dates or costs, with its impact and the decision.',
        numbered: true,
        addLabel: 'Add change request',
        columns: [
          { key: 'date', label: 'Date', kind: 'date' },
          { key: 'by', label: 'Requested by', kind: 'text', w: 14 },
          { key: 'desc', label: 'Description', kind: 'textarea', w: 24 },
          { key: 'scope', label: 'Scope impact', kind: 'text', w: 16 },
          { key: 'days', label: 'Schedule impact', kind: 'number', w: 7, sub: 'days' },
          {
            key: 'cost', label: 'Cost impact', kind: 'money', w: 10,
            total: (rows, q) => {
              const all = U.sum(rows, (r) => Number(r.cost) || 0);
              const acc = U.sum(rows.filter((r) => r.decision === 'Accepted'), (r) => Number(r.cost) || 0);
              return q.money(all) + (acc !== all ? ' (accepted ' + q.money(acc) + ')' : '');
            },
          },
          { key: 'decision', label: 'Decision', kind: 'select', options: CR_DECISIONS, w: 10 },
          { key: 'decidedBy', label: 'Decided by', kind: 'person' },
          { key: 'decidedOn', label: 'Date decided', kind: 'date' },
        ],
        defaults: [{ _ph: { desc: 'What should change and why' } }],
      },
    ],
  });

  // =====================================================================================
  // Section 8: tailoring
  // =====================================================================================
  const G = ['Planning situation', 'Project features', 'Project organisation', 'Environment'];
  const EXP = ['good', 'fairly good', 'less experienced', 'inexperienced'];
  const REL = ['good', 'fairly good', 'not very good', 'bad'];
  const CRIT4 = ['non-critical', 'rather non-critical', 'rather critical', 'critical'];
  const SIT = [
    [G[0], 'sClarity', 'Clarity of order or contract', ['clear and good', 'satisfactory', 'unclear', 'critical']],
    [G[0], 'sPlanning', 'General planning situation', ['good', 'sufficient', 'little', 'very little']],
    [G[0], 'sBudget', 'Budget situation', CRIT4],
    [G[0], 'sDeadline', 'Deadline situation', CRIT4],
    [G[1], 'sRoom', 'Room for manoeuvre', ['high flexibility', 'medium flexibility', 'low flexibility', 'no flexibility']],
    [G[1], 'sChanges', 'Probable need for changes', ['small', 'lower', 'higher', 'high']],
    [G[1], 'sInnovation', 'Level of innovation', ['small', 'lower', 'higher', 'high']],
    [G[1], 'sTechnique', 'Technique or content', ['known', 'probably known', 'probably unknown', 'unknown']],
    [G[2], 'sInternal', 'Internal participants', ['0–3', '4–7', '8–12', 'more than 12']],
    [G[2], 'sExternal', 'External participants', ['0', '1–3', '4–6', 'more than 6']],
    [G[2], 'sLocation', 'Location of the team', ['on site', 'same country', 'within the EU', 'rest of the world']],
    [G[2], 'sContentExp', 'Content experience of the team', EXP],
    [G[2], 'sPmExp', 'PM experience of the team', EXP],
    [G[3], 'sStakeholders', 'Relation to stakeholders', REL],
    [G[3], 'sCustomer', 'Relation to the customer', REL],
  ].map(([group, _id, criterion, opts]) => ({ _id, group, criterion, opts }));
  const SIT_HEAD = ['Uncritical', 'Rather uncritical', 'Rather critical', 'Critical'];

  function sitStats(q) {
    const rows = q.rows('tailorSituation');
    const rated = rows.filter((r) => Number(r.rating) >= 1);
    const crit = rated.filter((r) => Number(r.rating) >= 3);
    const avg = rated.length ? U.sum(rated, (r) => Number(r.rating)) / rated.length : null;
    return { rows, rated, crit, avg };
  }
  function profileText(q) {
    const s = sitStats(q);
    if (!s.rated.length) return '';
    let t = s.avg <= 1.75 ? 'Mostly uncritical' : s.avg <= 2.5 ? 'Mixed' : s.avg <= 3.25 ? 'Rather critical' : 'Critical';
    t += ' (average ' + q.num(s.avg, 1) + ' on a scale of 1 to 4)';
    if (s.crit.length) t += '. Watch: ' + s.crit.map((r) => r.criterion.toLowerCase()).join(', ');
    if (s.rated.length < s.rows.length) t += '. ' + (s.rows.length - s.rated.length) + ' of ' + s.rows.length + ' criteria not rated yet';
    return t;
  }

  function situationProfile(q, pal) {
    const rows = q.rows('tailorSituation');
    const GW = 112;
    const CX = 122;
    const CW = 246;
    const AX = CX + CW + 6;
    const AW = (W - 6 - AX) / 4;
    const y0 = 52;
    const rh = 28;
    const grad = S.uid('sg');
    let body = '<defs><linearGradient id="' + grad + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="' + pal.good + '"/><stop offset="0.5" stop-color="' + pal.warn + '"/><stop offset="1" stop-color="' + pal.crit + '"/></linearGradient></defs>';
    // header
    body += S.rect(AX, 4, AW * 4, 32, { fill: 'url(#' + grad + ')', fillOpacity: 0.16, rx: 4 });
    body += S.rect(AX, 38, AW * 4, 5, { fill: 'url(#' + grad + ')', rx: 2.5 });
    SIT_HEAD.forEach((h, j) => (body += S.text(AX + AW * (j + 0.5), 20, h, { size: 12, weight: 600, fill: pal.ink, anchor: 'middle', v: 'middle' })));
    body += S.text(GW / 2, 20, 'Group', { size: 12, weight: 600, fill: pal.ink2, anchor: 'middle', v: 'middle' });
    body += S.text(CX + 4, 20, 'Criterion', { size: 12, weight: 600, fill: pal.ink2, v: 'middle' });
    const yEnd = y0 + rows.length * rh;
    for (let j = 1; j < 4; j++) body += S.line(AX + AW * j, y0, AX + AW * j, yEnd, { stroke: pal.grid });

    // group bands and rows
    let i = 0;
    while (i < rows.length) {
      let k = i;
      while (k < rows.length && rows[k].group === rows[i].group) k++;
      const gy = y0 + i * rh;
      const gh = (k - i) * rh;
      body += S.rect(0, gy + 2, GW, gh - 4, { fill: pal.box, rx: 4 });
      body += linesAt(GW / 2, gy + gh / 2, fitLines(rows[i].group, GW - 12, 3, [12, 11.5, 11], 600), { fill: pal.ink, weight: 600 });
      if (i > 0) body += S.line(CX, gy, W - 6, gy, { stroke: pal.line });
      i = k;
    }
    rows.forEach((r, ri) => {
      const y = y0 + ri * rh;
      if (ri > 0 && rows[ri - 1].group === r.group) body += S.line(CX, y, W - 6, y, { stroke: pal.grid });
      body += linesAt(CX + 4, y + rh / 2, fitLines(r.criterion, CW - 8, 2, [12, 11.5, 11, 10.5], 400), { fill: pal.ink, anchor: 'start' });
    });
    body += S.line(CX, yEnd, W - 6, yEnd, { stroke: pal.line });

    // profile line, broken at unrated rows
    const segs = [];
    let cur = [];
    rows.forEach((r, ri) => {
      const v = Number(r.rating);
      if (v >= 1 && v <= 4) cur.push([AX + AW * (v - 0.5), y0 + ri * rh + rh / 2]);
      else {
        if (cur.length) segs.push(cur);
        cur = [];
      }
    });
    if (cur.length) segs.push(cur);
    segs.filter((sg) => sg.length > 1).forEach((sg) => (body += S.polyline(sg, { stroke: pal.accent, sw: 2 })));

    // answers
    rows.forEach((r, ri) => {
      const cy = y0 + ri * rh + rh / 2;
      const v = Number(r.rating);
      (r.opts || []).forEach((label, j) => {
        const cx = AX + AW * (j + 0.5);
        if (v === j + 1) {
          const tw = Math.min(AW - 8, S.measure(label, 11.5, 600) + 30);
          body += S.rect(cx - tw / 2, cy - 10, tw, 20, { fill: pal.accent, rx: 10 });
          body += S.circle(cx - tw / 2 + 10, cy, 3.5, { fill: pal.accentInk });
          body += S.text(cx + 5, cy, S.fit(label, tw - 26, 11.5, 600), { size: 11.5, weight: 600, fill: pal.accentInk, anchor: 'middle', v: 'middle' });
        } else {
          body += haloText(cx, cy, S.fit(label, AW - 10, 11), { size: 11, fill: pal.muted, anchor: 'middle', v: 'middle' }, pal);
        }
      });
    });

    const s = sitStats(q);
    const foot = s.rated.length
      ? 'Rated: ' + s.rated.length + ' of ' + rows.length + '. Critical answers: ' + s.crit.length + '. ' + profileText(q).split('. ')[0] + '.'
      : 'Rate each criterion in the table above to draw the profile.';
    const fb = S.textBlock(CX, yEnd + 10, foot, { maxW: W - CX - 8, size: 11.5, fill: pal.ink2, maxLines: 2 });
    body += fb.svg;
    return S.svg(W, yEnd + 10 + fb.h + 8, body, { pal, label: 'Situation analysis profile' });
  }

  // ---------- method check and pyramid ----------
  const LEVELS = {
    F: { name: 'Foundation', desc: 'boundaries and context' },
    C: { name: 'Compulsory high-level plan', desc: '"base camp" of every project' },
    O: { name: 'Establishing the organisation', desc: 'roles and how the team works' },
    P: { name: 'Optional detailed planning', desc: 'for complex projects' },
  };
  const METHODS = [
    ['mAssign', 'Project assignment (charter)', 'Project assignment', 'F', 'Foundation', 'Initiation, finalised in the start process', '3.3'],
    ['mStake', 'Stakeholder analysis', 'Stakeholder analysis', 'F', 'Foundation', 'Initiation', '3.4'],
    ['mResults', 'List of deliverables, results plan', 'Results plan', 'C', 'Compulsory (base camp)', 'Initiation', '3.5'],
    ['mWbs', 'Work breakdown structure', 'WBS', 'C', 'Compulsory (base camp)', 'Initiation', '3.5'],
    ['mMiles', 'Milestone plan', 'Milestone plan', 'C', 'Compulsory (base camp)', 'Initiation', '3.5'],
    ['mRes', 'Resource plan', 'Resource plan', 'C', 'Compulsory (base camp)', 'Initiation, detailed in the start process', '3.5, 4.2'],
    ['mCost', 'Cost plan', 'Cost plan', 'C', 'Compulsory (base camp)', 'Initiation, detailed in the start process', '3.5, 4.2'],
    ['mOrg', 'Organisation chart', 'Organisation chart', 'O', 'Organisation', 'Start process', '4.1'],
    ['mRoles', 'Definition of roles', 'Roles', 'O', 'Organisation', 'Start process', '4.1'],
    ['mComm', 'Communication plan', 'Communication plan', 'O', 'Organisation', 'Start process', '4.1'],
    ['mRules', 'Ground rules', 'Ground rules', 'O', 'Organisation', 'Start process', '4.1'],
    ['mRaci', 'RACI chart', 'RACI chart', 'O', 'Organisation', 'Start process', '4.2'],
    ['mWps', 'WP specification', 'WP specification', 'P', 'Optional (detailed)', 'Start process', '4.2'],
    ['mBar', 'Linked bar chart or network plan', 'Bar chart, network plan', 'P', 'Optional (detailed)', 'Start process', '4.2'],
    ['mRisk', 'Risk analysis, qualitative or quantitative', 'Risk management', 'R', 'All levels, grows with complexity', 'First assessment in initiation, full analysis in the start process', '5'],
    ['mContract', 'Contract analysis', 'Contract analysis', 'X', 'External projects', 'After the project handover', '7'],
    ['mCR', 'Change request process', 'Change request process', 'X', 'Additional', 'Start process', '7'],
    ['mMarketing', 'Project marketing', 'Project marketing', 'X', 'Additional', 'Start process', ''],
  ].map(([_id, method, short, lvl, level, timing, section]) => ({ _id, method, short, lvl, level, timing, section }));
  const DECISIONS = ['Already exists', 'Initiation process', 'Start process', 'Not required'];
  const TAGS = { 'Already exists': 'E', 'Initiation process': 'I', 'Start process': 'S' };

  function decisionStyle(dec, pal) {
    if (dec === 'Not required') return { fill: pal.bg, stroke: pal.muted, dash: '3 3', ink: pal.muted, strike: true };
    if (TAGS[dec]) return { fill: pal.accent, stroke: pal.accent, ink: pal.accentInk, tag: TAGS[dec] };
    return { fill: pal.bg, stroke: pal.accent, sw: 1.3, ink: pal.ink };
  }
  const CHIP_H = 22;
  const chipW = (label) => S.measure(label, 11.5, 600) + 34;
  function chip(x, y, label, st) {
    const w = chipW(label);
    let out = S.rect(x, y, w, CHIP_H, { fill: st.fill, stroke: st.stroke, sw: st.sw || 1, dash: st.dash, rx: CHIP_H / 2 });
    const tx = x + 10 + (w - 34) / 2;
    out += S.text(tx, y + CHIP_H / 2, label, { size: 11.5, weight: 600, fill: st.ink, anchor: 'middle', v: 'middle' });
    if (st.strike) out += S.line(x + 8, y + CHIP_H / 2, x + w - 22, y + CHIP_H / 2, { stroke: st.ink, sw: 1.2 });
    if (st.tag) out += S.text(x + w - 13, y + CHIP_H / 2, st.tag, { size: 9.5, weight: 700, family: 'mono', fill: st.ink, anchor: 'middle', v: 'middle' });
    return out;
  }

  function methodPyramid(q, pal) {
    const dec = {};
    q.rows('methodCheck').forEach((r) => (dec[r._id] = r.decision));
    const cx = 380;
    const HT = 84;
    const HB = 330;
    const TOP = 40;
    const bands = [['P', 72], ['O', 100], ['C', 76], ['F', 62]];
    const H = bands.reduce((a, b) => a + b[1], 0);
    const base = TOP + H;
    const hw = (y) => HT + ((HB - HT) * (y - TOP)) / H;
    const inset = 12;
    let body = '';

    // risk band along the left side
    const risk = METHODS.find((m) => m.lvl === 'R');
    const rs = decisionStyle(dec[risk._id], pal);
    const A = [cx - HB, base];
    const B = [cx - HT, TOP];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const n = [-(A[1] - B[1]) / len, -(B[0] - A[0]) / len];
    const off = (p, d) => [p[0] + n[0] * d, p[1] + n[1] * d];
    const g = 8;
    const bw = 24;
    body += S.path('M' + [off(A, g), off(B, g), off(B, g + bw), off(A, g + bw)].map((p) => r1(p[0]) + ',' + r1(p[1])).join(' L') + ' Z', { fill: rs.fill, stroke: rs.stroke, sw: rs.sw || 1, dash: rs.dash, join: 'round' });
    const mid = off([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], g + bw / 2);
    const ang = (Math.atan2(B[1] - A[1], B[0] - A[0]) * 180) / Math.PI;
    const rLabel = 'Risk management grows with complexity' + (rs.tag ? ' · ' + rs.tag : '');
    body += rotText(mid[0], mid[1], ang, rLabel, { size: 11.5, weight: 600, fill: rs.ink, anchor: 'middle', v: 'middle' });
    if (rs.strike) {
      const half = S.measure(rLabel, 11.5, 600) / 2;
      body += '<g transform="rotate(' + r1(ang) + ' ' + r1(mid[0]) + ' ' + r1(mid[1]) + ')">' + S.line(mid[0] - half, mid[1], mid[0] + half, mid[1], { stroke: rs.ink, sw: 1.2 }) + '</g>';
    }

    // summit flag
    body += S.line(cx, TOP, cx, TOP - 30, { stroke: pal.ink2, sw: 1.5 });
    body += S.poly([[cx, TOP - 30], [cx + 20, TOP - 24], [cx, TOP - 18]], { fill: pal.accent });

    // levels
    let y = TOP;
    bands.forEach(([lv, bh]) => {
      const y1 = y + bh;
      body += S.poly([[cx - hw(y), y], [cx + hw(y), y], [cx + hw(y1), y1], [cx - hw(y1), y1]], { fill: pal.box, stroke: pal.boxLine });
      const items = METHODS.filter((m) => m.lvl === lv);
      // lay out chips in rows; the band is narrowest at the top, so each row is checked at its top edge
      const layout = (pad) => {
        const rows = [];
        let ry = y + pad;
        let row = [];
        let rowW = 0;
        items.forEach((m) => {
          const w = chipW(m.short);
          const avail = 2 * (hw(ry) - inset);
          if (row.length && rowW + 8 + w > avail) {
            rows.push({ y: ry, items: row, w: rowW });
            ry += CHIP_H + 6;
            row = [];
            rowW = 0;
          }
          rowW += (row.length ? 8 : 0) + w;
          row.push(m);
        });
        if (row.length) rows.push({ y: ry, items: row, w: rowW });
        return rows;
      };
      let rows = layout(8);
      const blockH = rows.length * CHIP_H + (rows.length - 1) * 6;
      rows = layout(Math.max(6, (bh - blockH) / 2));
      rows.forEach((rw) => {
        let x = cx - rw.w / 2;
        rw.items.forEach((m) => {
          body += chip(x, rw.y, m.short, decisionStyle(dec[m._id], pal));
          x += chipW(m.short) + 8;
        });
      });
      // level label on the right
      const ym = y + bh / 2;
      const used = items.filter((m) => TAGS[dec[m._id]]).length;
      const no = items.filter((m) => dec[m._id] === 'Not required').length;
      const count = used + ' of ' + items.length + ' used' + (no ? ', ' + no + ' not required' : '');
      body += S.line(cx + hw(ym) + 6, ym, 726, ym, { stroke: pal.line, dash: '2 3' });
      body += S.text(734, ym - 19, LEVELS[lv].name, { size: 12.5, weight: 600, fill: pal.ink });
      body += S.text(734, ym - 2, LEVELS[lv].desc, { size: 11, fill: pal.muted });
      body += S.text(734, ym + 13, count, { size: 11, fill: pal.ink2 });
      y = y1;
    });

    // additional methods
    const yA = base + 18;
    body += S.text(50, yA + CHIP_H / 2, 'Additional methods', { size: 12, weight: 600, fill: pal.ink2, v: 'middle' });
    let ax = 50 + S.measure('Additional methods', 12, 600) + 14;
    METHODS.filter((m) => m.lvl === 'X').forEach((m) => {
      body += chip(ax, yA, m.short, decisionStyle(dec[m._id], pal));
      ax += chipW(m.short) + 8;
    });

    const sw = (st) => (x, cy) => S.rect(x, cy - 7, 26, 14, { fill: st.fill, stroke: st.stroke, sw: st.sw || 1, dash: st.dash, rx: 7 }) + (st.strike ? S.line(x + 5, cy, x + 21, cy, { stroke: st.ink, sw: 1.2 }) : '');
    const lg = legendRow(
      [
        { label: 'Used (I initiation, S start, E already exists)', sw: 26, swatch: sw(decisionStyle('Start process', pal)) },
        { label: 'Not decided yet', sw: 26, swatch: sw(decisionStyle('', pal)) },
        { label: 'Not required', sw: 26, swatch: sw(decisionStyle('Not required', pal)) },
      ],
      50, yA + CHIP_H + 14, W - 60, pal
    );
    body += lg.svg;
    return S.svg(W, yA + CHIP_H + 14 + lg.h + 8, body, { pal, label: 'Method pyramid' });
  }
  PM.graphics.methodPyramid = methodPyramid;

  // ---------- planning navigator ----------
  const NAV_ROWS = [
    { _id: 'ini', phase: 'Initiation' },
    { _id: 'start', phase: 'Start' },
  ];
  const NAV_PH = {
    ini: { steps: 'e.g. I1–I3 in one-to-one talks, I4 in a planning workshop, I5 in a PO meeting', content: 'e.g. none, or 1.2 Analysis', deliverables: 'e.g. preliminary charter, milestone plan, rough budget', methods: 'e.g. stakeholder analysis, WBS, milestone plan' },
    start: { steps: 'e.g. kick-off and start workshop (S1–S2), follow-up workshop (S3), PO meeting (S5)', content: 'e.g. 1.2 Concept', deliverables: 'e.g. final charter, PM plan 1.0, project organisation', methods: 'e.g. RACI chart, WP specifications, risk analysis' },
  };

  function phaseZone(q) {
    const nav = {};
    q.rows('tailorNavigator').forEach((r) => (nav[r._id] = String(r.content || '').toLowerCase()));
    const hit = (t, p) => {
      if (!t) return false;
      const code = String(p.code || '').trim();
      const name = String(p.name || '').trim().toLowerCase();
      if (code && new RegExp('(^|[^\\d.])' + code.replace(/\./g, '\\.') + '(?!\\.?\\d)').test(t)) return true;
      return name.length > 2 && t.includes(name);
    };
    return q
      .phases()
      .filter((p) => p.kind !== 'PM phase')
      .map((p) => ({ p, zone: hit(nav.ini, p) ? 'I' : hit(nav.start, p) ? 'S' : 'M' }));
  }

  function navigator(q, pal) {
    const LBL = 148;
    const X0 = 158;
    const X1 = W - 8;
    const Z = { I: [X0, X0 + 250], S: [X0 + 250, X0 + 500], M: [X0 + 500, X1] };
    const tip = 8;
    const kind = q.f('meta.kind');
    const st = {};
    q.rows('steps').forEach((r) => (st[r._id] = r.status));
    const cs = {};
    q.rows('contractSteps').forEach((r) => (cs[r._id] = r.status));
    let body = '';

    [['Initiation', 'I'], ['Start', 'S'], ['Implementation', 'M']].forEach(([t, z]) => {
      body += S.rect(Z[z][0] + 1, 0, Z[z][1] - Z[z][0] - 2, 26, { fill: pal.box, rx: 4 });
      body += S.text((Z[z][0] + Z[z][1]) / 2, 13, t, { size: 13, weight: 600, fill: pal.ink, anchor: 'middle', v: 'middle' });
    });

    const lanes = [
      { key: 'pm', name: 'Project management', sub: 'process', h: 34 },
      { key: 'plan', name: 'Planning process', sub: 'the ten steps', h: 34 },
      { key: 'content', name: 'Content process', sub: 'phases of the project', h: 56 },
      { key: 'contract', name: 'Contract process', sub: 'customer projects', h: 40 },
      { key: 'team', name: 'Team process', sub: 'how the team grows', h: 34 },
    ];
    let y = 38;
    const box = (x, yy, w, h, label, o) => {
      o = o || {};
      const s = o.style || { fill: pal.box, stroke: pal.boxLine, ink: pal.ink };
      let out = chev(x + 1, yy, w - 3, h, !!o.first, tip, s);
      if (label) {
        const fit = fitLines(label, w - tip - 8, o.lines || 2, [11, 10.5, 10], 600);
        out += linesAt(x + 1 + (w - 3) / 2 - (o.first ? tip / 2 : 0), yy + h / 2, fit, { fill: s.ink, weight: 600, italic: o.italic });
      }
      return out;
    };
    const note = (z, yy, h, text) => S.text(Z[z][0] + 10, yy + h / 2, S.fit(text, Z[z][1] - Z[z][0] - 20, 11), { size: 11, fill: pal.muted, italic: true, v: 'middle' });
    const splitZone = (z, parts) => {
      const [a, b] = Z[z];
      const tot = parts.reduce((s, p) => s + p, 0);
      let x = a;
      return parts.map((p) => {
        const w = ((b - a) * p) / tot;
        const out = [x, w];
        x += w;
        return out;
      });
    };

    lanes.forEach((ln, li) => {
      const h = ln.h;
      if (li > 0) body += S.line(0, y - 6, X1, y - 6, { stroke: pal.grid });
      body += S.text(0, y + h / 2 - 7, ln.name, { size: 12, weight: 600, fill: pal.ink, v: 'middle' });
      body += S.text(0, y + h / 2 + 8, ln.sub, { size: 10.5, fill: pal.muted, v: 'middle' });
      if (ln.key === 'pm') {
        const acc = { fill: pal.accent, stroke: pal.accent, ink: pal.accentInk };
        body += box(Z.I[0], y, Z.I[1] - Z.I[0], h, 'Initiation', { first: true, style: acc });
        body += box(Z.S[0], y, Z.S[1] - Z.S[0], h, 'Start', { style: acc });
        body += box(Z.M[0], y, Z.M[1] - Z.M[0], h, 'Implementation and control', { style: acc });
        [Z.S[0], Z.M[0]].forEach((x) => (body += S.diamond(x, y + h / 2, 8, { fill: pal.mile, stroke: pal.bg, sw: 1.5 })));
      } else if (ln.key === 'plan') {
        PM.PROCESS.forEach((p, i) => {
          const z = i < 5 ? 'I' : 'S';
          const w = (Z[z][1] - Z[z][0]) / 5;
          const x = Z[z][0] + (i % 5) * w;
          const s = statusStyle(st[p.id], pal);
          body += chev(x + 1, y, w - 3, h, i === 0, tip, s);
          body += S.text(x + 1 + (w - 3) / 2 - (i === 0 ? tip / 2 : 0), y + h / 2, p.id, { size: 11.5, weight: 700, family: 'mono', fill: s.ink, anchor: 'middle', v: 'middle' });
        });
        body += note('M', y, h, 'Plans kept up to date while controlling');
      } else if (ln.key === 'content') {
        const pz = phaseZone(q);
        ['I', 'S', 'M'].forEach((z) => {
          const list = pz.filter((e) => e.zone === z);
          if (!list.length) {
            body += note(z, y, h, z === 'M' ? 'Add phases to the WBS' : 'No content work yet');
            return;
          }
          const parts = splitZone(z, list.map(() => 1));
          list.forEach((e, k) => {
            const [x, w] = parts[k];
            const ph = q.isPlaceholder(e.p, 'name');
            const nm = q.label(e.p, 'name');
            const s = { fill: pal.box, stroke: pal.boxLine, ink: ph ? pal.muted : pal.ink };
            body += chev(x + 1, y, w - 3, h, false, tip, s);
            const cxm = x + 1 + (w - 3) / 2;
            if (w < 64 || !nm) {
              body += S.text(cxm, y + h / 2, e.p.code, { size: 11, weight: 700, family: 'mono', fill: s.ink, anchor: 'middle', v: 'middle' });
            } else {
              body += S.text(cxm, y + 5, e.p.code, { size: 10.5, weight: 700, family: 'mono', fill: s.ink, anchor: 'middle', v: 'top' });
              const fit = fitLines(nm, w - tip - 6, 3, [10.5, 10, 9.5], 400);
              body += linesAt(cxm, y + 17 + (h - 17) / 2, fit, { fill: s.ink, italic: ph });
            }
          });
        });
      } else if (ln.key === 'contract') {
        if (kind && kind !== EXT) {
          body += S.rect(X0 + 1, y, X1 - X0 - 2, h, { fill: 'none', stroke: pal.boxLine, dash: '4 3', rx: 6 });
          body += S.text((X0 + X1) / 2, y + h / 2, 'Not applicable: ' + kind.toLowerCase() + ', no customer contract', { size: 11.5, fill: pal.muted, italic: true, anchor: 'middle', v: 'middle' });
        } else {
          const ext = kind === EXT;
          const sty = (id) => (ext ? statusStyle(cs[id], pal) : { fill: pal.bg, stroke: pal.boxLine, ink: pal.muted, dash: '4 3' });
          const ip = splitZone('I', [1, 1, 1]);
          const sp = splitZone('S', [1.2, 2.8]);
          [['acq', 'Acquisition'], ['offer', 'Offer'], ['nego', 'Negotiation']].forEach(([id, t], k) => (body += box(ip[k][0], y, ip[k][1], h, t, { first: k === 0, style: sty(id) })));
          [['handover', 'Handover'], ['analysis', 'Contract analysis and detailed planning']].forEach(([id, t], k) => (body += box(sp[k][0], y, sp[k][1], h, t, { style: sty(id) })));
          body += box(Z.M[0], y, Z.M[1] - Z.M[0], h, 'Change requests and claims', { style: ext ? statusStyle('', pal) : sty('') });
        }
      } else if (ln.key === 'team') {
        body += note('I', y, h, 'PO, PM and designated core team');
        const sp = splitZone('S', [1, 1]);
        const mp = splitZone('M', [1, 1, 1]);
        [['Forming', sp[0]], ['Storming', sp[1]], ['Norming', mp[0]], ['Performing', mp[1]], ['Adjourning', mp[2]]].forEach(([t, [x, w]]) => (body += box(x, y, w, h, t)));
      }
      y += h + 12;
    });
    // zone dividers on top of the lanes, between the chevrons
    [Z.S[0], Z.M[0]].forEach((x) => (body += S.line(x, 28, x, 36, { stroke: pal.line })));

    const lg = legendRow(
      statusLegend(pal, ['Done', 'In progress', 'Not started', 'Skipped']).concat([
        { label: 'Approval: charter released, PM plan approved', swatch: (x, cy) => S.diamond(x + 7, cy, 7, { fill: pal.mile }) },
      ]),
      0, y, W, pal
    );
    body += lg.svg;
    return S.svg(W, y + lg.h + 6, body, { pal, label: 'Planning navigator' });
  }

  PM.section({
    id: 'tailoring',
    part: 'tailoring',
    order: 80,
    num: '8',
    slides: '157–169',
    title: 'Tailoring the planning process',
    navTitle: 'Tailoring',
    intro: 'Fit the planning process to the project: analyse the situation, choose the methods and line up the steps.',
    landscape: true,
    blocks: [
      {
        type: 'guide',
        title: 'The planning process is a small project of its own',
        text: 'Delimit it like a project: by its start and end events, its content, the people involved, its context and how it relates to your company standard. The PM is responsible and makes it transparent to everyone:',
        items: [
          'which steps belong to the initiation and which to the project start,',
          'which communication formats are used,',
          'which methods are used, and how deep.',
        ],
      },
      {
        type: 'fields',
        title: 'Boundaries of the planning process',
        cols: 2,
        fields: [
          { key: 'tailor.startEvent', label: 'Start event', kind: 'text', placeholder: 'PM appointed and preliminary charter available' },
          { key: 'tailor.endEvent', label: 'End event', kind: 'text', placeholder: 'Final charter and PM plan approved' },
          { key: 'tailor.participants', label: 'Participants', kind: 'textarea', placeholder: 'Who takes part in which step' },
          { key: 'tailor.context', label: 'Context', kind: 'textarea', placeholder: 'What around the project shapes the planning' },
          { key: 'tailor.standard', label: 'Relation to the company standard', kind: 'textarea', placeholder: 'Which standard applies, and where you deviate from it', wide: true },
        ],
      },
      { type: 'h', text: 'Situation analysis', sub: 'Rate the project on each criterion. The profile shows what the planning process has to cover and who is needed when.' },
      {
        type: 'table',
        key: 'tailorSituation',
        title: 'Situation analysis',
        hint: 'Pick one answer per criterion, from uncritical (left) to critical (right).',
        fixed: SIT,
        columns: [
          { key: 'group', label: 'Group', from: true, w: 12 },
          { key: 'criterion', label: 'Criterion', from: true, w: 20 },
          { key: 'rating', label: 'Rating', kind: 'rating', options: (q, row) => (row && row.opts) || SIT_HEAD, w: 44, sub: 'uncritical → critical' },
          { key: 'note', label: 'Note', kind: 'text', w: 18 },
        ],
      },
      {
        type: 'fields',
        title: 'Result',
        cols: 2,
        fields: [
          { key: 'tailor.criticalCount', label: 'Critical answers', kind: 'number', hint: 'Answers in the two right-hand columns', compute: (q) => (sitStats(q).rated.length ? sitStats(q).crit.length : '') },
          { key: 'tailor.profile', label: 'Overall profile', kind: 'text', compute: profileText },
        ],
      },
      {
        type: 'graphic',
        title: 'Situation analysis profile',
        caption: 'One row per criterion, from uncritical on the left to critical on the right. The chosen answers are joined into a profile line; the further right it runs, the more care the planning needs.',
        render: situationProfile,
      },
      {
        type: 'fields',
        cols: 1,
        fields: [{ key: 'tailor.consequences', label: 'What the profile means for the planning process', kind: 'textarea', placeholder: 'Which steps and formats you need, who is needed when and how much' }],
      },
      { type: 'h', text: 'Method check', sub: 'For every method, decide whether it already exists, is prepared in the initiation or in the start process, or is not needed. The list is also the content of the PM plan.' },
      {
        type: 'table',
        key: 'methodCheck',
        title: 'Method check',
        hint: 'The usual timing follows the standard process; set it again for each project.',
        fixed: METHODS,
        columns: [
          { key: 'method', label: 'Method or document', from: true, w: 20 },
          { key: 'level', label: 'Level', from: true, w: 12 },
          { key: 'timing', label: 'Usual timing', from: true, w: 18 },
          { key: 'section', label: 'Section', from: true, w: 6 },
          { key: 'decision', label: 'Decision', kind: 'select', options: DECISIONS, w: 14 },
          { key: 'depth', label: 'Depth', kind: 'select', options: ['Rough', 'Detailed'], w: 9 },
          { key: 'note', label: 'Note', kind: 'text', w: 20 },
        ],
      },
      {
        type: 'graphic',
        title: 'Method pyramid',
        caption: 'The more complex the project, the further up the pyramid the planning goes. Risk management runs up the side because it grows with complexity. Each method is styled by its decision in the method check.',
        render: methodPyramid,
      },
      {
        type: 'checks',
        title: 'Tailoring checks',
        run: (q) => {
          const s = sitStats(q);
          const mc = q.rows('methodCheck');
          const decided = mc.filter((r) => r.decision).length;
          const skipped = mc.filter((r) => (r.lvl === 'F' || r.lvl === 'C') && r.decision === 'Not required');
          const contract = mc.find((r) => r._id === 'mContract') || {};
          const ext = q.f('meta.kind') === EXT;
          return [
            { ok: !!(q.f('tailor.startEvent') && q.f('tailor.endEvent')), text: 'Start and end event of the planning process defined' },
            { ok: s.rated.length === s.rows.length, text: s.rated.length + ' of ' + s.rows.length + ' situation criteria rated' },
            { ok: decided === mc.length, text: decided + ' of ' + mc.length + ' methods decided' },
            { ok: !skipped.length, text: skipped.length ? 'Foundation and base camp methods marked not required: ' + skipped.map((r) => r.method).join(', ') : 'No foundation or base camp method is skipped' },
            ext
              ? { ok: contract.decision && contract.decision !== 'Not required', text: 'Contract analysis planned (customer project)' }
              : { ok: null, text: 'Contract analysis is only needed for customer projects.' },
          ];
        },
      },
      { type: 'h', text: 'Planning navigator', sub: 'A project runs on five process levels that shift against each other. The navigator lines them up.' },
      {
        type: 'guide',
        title: 'Four steps to your navigator',
        ordered: true,
        items: [
          'Take the generic project management process: initiation, then start.',
          'Define the planning and communication steps and assign them to it.',
          'Define the content phases of the project.',
          'Assign deliverables and project management methods to the steps.',
        ],
      },
      {
        type: 'table',
        key: 'tailorNavigator',
        title: 'Navigator of this project',
        hint: 'Name a phase by its WBS code (e.g. 1.2) under "Content phases covered" to place it in that column of the drawing.',
        fixed: NAV_ROWS,
        columns: [
          { key: 'phase', label: 'Process', from: true, w: 9 },
          { key: 'steps', label: 'Planning and communication steps', kind: 'textarea', w: 24, placeholder: (r) => (NAV_PH[r._id] || {}).steps },
          { key: 'content', label: 'Content phases covered', kind: 'text', w: 16, placeholder: (r) => (NAV_PH[r._id] || {}).content },
          { key: 'deliverables', label: 'Deliverables', kind: 'textarea', w: 22, placeholder: (r) => (NAV_PH[r._id] || {}).deliverables },
          { key: 'methods', label: 'PM methods', kind: 'textarea', w: 22, placeholder: (r) => (NAV_PH[r._id] || {}).methods },
        ],
      },
      {
        type: 'graphic',
        title: 'Planning navigator',
        caption: 'Five process levels under one header. Positions are relative, not dates. The planning steps take their colours from the step records; the content phases come from the WBS and the table above.',
        render: navigator,
      },
      {
        type: 'table',
        key: 'tailorTypes',
        title: 'Large external or small internal project',
        hint: 'A large external project is planned almost completely before approval, because the offer and the contract depend on it. A small internal project is approved on a short assignment and planned in the start process.',
        fixed: [
          { _id: 'tIni', aspect: 'Initiation', large: 'Assess the idea, categorise, boundaries and context, rough and detailed planning, consolidate and compile the PM plan, approval', small: 'Assess the idea or task, boundaries and context' },
          { _id: 'tStart', aspect: 'Start', large: 'Kick-off, establish the organisation', small: 'Establish the organisation, project planning, PM plan, approval of the PM plan' },
          { _id: 'tContent', aspect: 'Content phases', large: 'Rough and detailed concept, implementation, test, training, piloting, launch', small: 'Analysis, rough and detailed concept, implementation, training' },
          { _id: 'tDelIni', aspect: 'Deliverables in initiation', large: 'Contract, project assignment, requirements, functional specification, PM plan, risks', small: 'Preliminary project assignment' },
          { _id: 'tDelStart', aspect: 'Deliverables in start', large: 'Communication structures, ground rules, change request process', small: 'Final project assignment, PM plan, project organisation' },
        ],
        columns: [
          { key: 'aspect', label: 'Aspect', from: true, w: 12 },
          { key: 'large', label: 'Large external project', from: true, w: 26 },
          { key: 'small', label: 'Small internal project', from: true, w: 22 },
          { key: 'ours', label: 'Our project', kind: 'textarea', w: 24 },
        ],
      },
      {
        type: 'fields',
        cols: 2,
        fields: [{ key: 'tailor.closerTo', label: 'Our project is closer to', kind: 'select', options: ['Large external project', 'Small internal project', 'In between'] }],
      },
    ],
  });

  // =====================================================================================
  // Headline numbers
  // =====================================================================================
  PM.metric('fmtFormatsUsed', {
    label: 'Communication formats used',
    kind: 'text',
    section: 'formats',
    fn: (q) => {
      const n = q.rows('fmtUsed').filter((r) => r.used).length;
      return n ? n + ' of ' + FORMATS.length : null;
    },
  });
  PM.metric('contractCRAccepted', {
    label: 'Accepted change requests',
    kind: 'money',
    section: 'contract',
    fn: (q) => {
      const acc = q.rows('contractCR').filter((r) => r.decision === 'Accepted');
      return acc.length ? U.sum(acc, (r) => Number(r.cost) || 0) : null;
    },
  });
  PM.metric('tailorCritical', {
    label: 'Critical situation answers',
    kind: 'text',
    section: 'tailoring',
    fn: (q) => {
      const s = sitStats(q);
      return s.rated.length ? s.crit.length + ' of ' + s.rated.length + ' rated' : null;
    },
  });
  PM.metric('tailorMethods', {
    label: 'Methods used',
    kind: 'text',
    section: 'tailoring',
    fn: (q) => {
      const mc = q.rows('methodCheck');
      const used = mc.filter((r) => TAGS[r.decision]).length;
      return mc.some((r) => r.decision) ? used + ' of ' + mc.length : null;
    },
  });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  const K = (time, topic, presenter, material) => ({ time, topic, presenter, material });
  const A = (time, topic, method, result, responsible, mode) => ({ time, topic, method, result, responsible: responsible || '', mode: mode === 'p' ? WS_MODES[0] : mode === 'w' ? WS_MODES[1] : '' });
  const rate = (rating, note) => (note ? { rating, note } : { rating });
  const mc = (decision, depth, note) => ({ decision, depth: depth || '', note: note || '' });

  PM.example({
    f: {
      'fmt.kickoffDate': '2026-02-04',
      'fmt.kickoffDuration': '2 hours (14:00–16:00)',
      'fmt.kickoffPlace': 'Main building, conference room 3',
      'fmt.kickoffParticipants': ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
      'fmt.wsDate': '2026-02-05',
      'fmt.wsDuration': '1 day',
      'fmt.wsPlace': 'Seehotel Am Wald',
      'fmt.wsExternal': 'Yes, external location',
      'fmt.wsParticipants': ['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
      'fmt.wsModerator': 'Internal coach from Learning and Development',
      'fmt.wsSocial': 'Dinner at the hotel after the workshop',
      'contract.claimStrategy': 'No customer contract. Towards suppliers: report every deviation in writing at once, keep delivery notes and photos, and hold back payment for services not delivered.',
      'contract.crStrategy': 'Every change to scope, date or budget goes to the PM in writing. The PM assesses the impact on schedule and costs within three days. The PO decides changes above €1,000; smaller ones the PM decides within the risk reserve.',
      'tailor.startEvent': 'Marc Huber appointed as PM, preliminary charter available (19 Jan 2026)',
      'tailor.endEvent': 'PM plan 1.0 approved by PO and PSC (27 Feb 2026)',
      'tailor.participants': 'PO and PM in I1–I3 and I5; PM with four designated core team members in the I4 planning workshop; the whole team at the kick-off; core team, team members and assistant in the start and follow-up workshops; PO and PSC in S5.',
      'tailor.context': 'First festival of this size. The date was fixed by the board, the budget sits in the HR budget, and venues and artists book up early in summer.',
      'tailor.standard': 'Company standard for small internal projects, with one deviation: a full-day start workshop because six departments work together.',
      'tailor.consequences': 'The profile is mostly uncritical, so a lean initiation is enough: one-to-one talks and a half-day planning workshop. The tight deadline is the main risk: fix the date and book the venue in the initiation, and plan all bookings in detail at the start workshop. Finance and Facility Management are needed from I4; the internal coach is needed for one day in S1.',
      'tailor.closerTo': 'Small internal project',
    },
    t: {
      fmtKickoffAgenda: [
        { _id: 'ka1', ...K('14:00', 'Welcome: why we hold a summer festival', 'p1', 'Slides') },
        { _id: 'ka2', ...K('14:15', 'Project charter: objectives, scope, date and budget', 'p2', 'Charter, slides') },
        { _id: 'ka3', ...K('14:45', 'Phases, milestones and the high-level plan', 'p2', 'Milestone plan') },
        { _id: 'ka4', ...K('15:15', 'Project organisation, roles and sub-teams', 'p2', 'Organisation chart') },
        { _id: 'ka5', ...K('15:40', 'Start workshop tomorrow, next steps, questions', 'p2', 'Workshop agenda') },
        { _id: 'ka6', ...K('15:55', 'Closing words', 'p1', '') },
      ],
      fmtWsAgenda: [
        { _id: 'wa1', ...A('09:00', 'Welcome, goals and agenda of the day', 'Presentation', 'Shared goals for the day', 'p2', 'p') },
        { _id: 'wa2', ...A('09:20', 'Results so far: charter, six fields, milestone plan', 'Presentation', 'Charter validated, questions answered', 'p2', 'p') },
        { _id: 'wa3', ...A('10:00', 'Roles, sub-teams and ground rules', 'Group work', 'Role descriptions, ground rules', 'p2', 'w') },
        { _id: 'wa4', ...A('11:00', 'Coffee break', 'Break', '', '', '') },
        { _id: 'wa5', ...A('11:15', 'Communication plan and meetings', 'Plenary discussion', 'Communication plan', 'p9', 'w') },
        { _id: 'wa6', ...A('12:30', 'Lunch', 'Break', '', '', '') },
        { _id: 'wa7', ...A('13:30', 'Work packages per sub-team', 'Group work', 'WP list with responsible persons', 'p4', 'w') },
        { _id: 'wa8', ...A('15:00', 'Detailed schedule and dependencies', 'Group work', 'Draft of the linked bar chart', 'p3', 'w') },
        { _id: 'wa9', ...A('16:15', 'Risks and measures', 'Plenary discussion', 'Risk list with owners', 'p6', 'w') },
        { _id: 'wa10', ...A('17:00', 'Open points, next steps, feedback', 'Plenary discussion', 'To-do list until the follow-up workshop', 'p2', 'w') },
      ],
      contractObligations: [
        { _id: 'co1', obligation: 'Venue: pay a 30 % deposit (€2,700) on signature', party: 'Us', clause: '§ 4.1', due: '2026-04-24', risk: '', wbs: 'w131' },
        { _id: 'co2', obligation: 'Venue: provide power (400 V), water and toilets on the grounds', party: 'Supplier', clause: '§ 3.2', due: '2026-06-22', risk: 'Power for the marquee not covered; clarified in May', wbs: 'w151' },
        { _id: 'co3', obligation: 'Venue: get the safety concept approved by the authority before set-up', party: 'Both', clause: '§ 5', due: '2026-06-05', risk: 'Approval came on 9 June, four days late', wbs: 'w134' },
        { _id: 'co4', obligation: 'Venue: hand back the grounds cleaned by 30 June, 18:00', party: 'Us', clause: '§ 7.2', due: '2026-06-30', risk: 'Book the cleaning crew early', wbs: 'w153' },
        { _id: 'co5', obligation: 'Catering: confirm the final number of guests 10 days before the event', party: 'Us', clause: '§ 3', due: '2026-06-17', risk: 'Late registrations; 5 % tolerance agreed', wbs: 'w143' },
        { _id: 'co6', obligation: 'Catering: food and drinks for 400 guests, with vegetarian and children’s menus', party: 'Supplier', clause: '§ 2', due: '2026-06-27', risk: '', wbs: 'w152' },
        { _id: 'co7', obligation: 'Catering: pay the final invoice within 14 days', party: 'Us', clause: '§ 6', due: '2026-07-14', risk: '', wbs: 'w163' },
      ],
      contractCR: [
        { _id: 'cr1', date: '2026-05-20', by: 'Tom Schmid (venue and logistics)', desc: 'Add a marquee (20 × 10 m) as rain cover for the catering area', scope: 'Marquee, set-up and lighting added', days: 1, cost: 2500, decision: 'Accepted', decidedBy: 'p1', decidedOn: '2026-05-22' },
      ],
    },
    x: {
      fmtCompare: {
        purpose: { ours: 'Kick-off to inform all helpers; workshop for the core team to plan together' },
        comm: { ours: 'Kick-off: presentations by PO and PM; workshop: group work with an internal coach' },
        effect: { ours: 'Everyone knew the plan; the core team owned the detailed planning' },
        effort: { ours: 'Kick-off half a day to prepare; workshop three days to prepare and follow up' },
        quality: { ours: 'Workshop produced the WP list, schedule draft and risk list' },
        duration: { ours: 'Kick-off 2 hours, workshop 1 day' },
      },
      fmtUsed: {
        alone: { used: true, when: '2026-01-19', participants: 1, note: 'PM drafted the six fields and a first WBS' },
        one: { used: true, when: '2026-01-21', participants: 6, note: 'Talks with PO, Facility Management, Finance and Marketing' },
        kick: { used: true, when: '2026-02-04', participants: 12, note: 'Whole team, PO for the first hour, three volunteer helpers' },
        ws: { used: true, when: '2026-02-05', participants: 8, note: 'Seehotel Am Wald, moderated by an internal coach' },
        fu: { used: true, when: '2026-02-20', participants: 6, note: 'Completed bar chart, cost plan and risk table' },
      },
      contractSteps: {
        acq: { status: 'Not applicable', note: 'Internal event, no customer' },
        offer: { status: 'Not applicable' },
        nego: { when: 'Mar–Apr 2026', who: 'Tom Schmid, Purchasing', status: 'Done', note: 'Venue and catering contracts, with us as the customer' },
        handover: { status: 'Not applicable' },
        analysis: { when: 'Apr–May 2026', who: 'Tom Schmid, Jonas Weber', status: 'Done', note: 'Key obligations of the supplier contracts listed below' },
      },
      tailorSituation: {
        sClarity: rate(1),
        sPlanning: rate(2),
        sBudget: rate(2, 'Budget approved, but no reserve beyond the risk reserve'),
        sDeadline: rate(3, 'Date fixed by the board; venues book up early'),
        sRoom: rate(2),
        sChanges: rate(2),
        sInnovation: rate(1),
        sTechnique: rate(1),
        sInternal: rate(2, '6 internal team members'),
        sExternal: rate(2, 'Venue, catering and event technology'),
        sLocation: rate(1),
        sContentExp: rate(1),
        sPmExp: rate(2, 'First project for two core team members'),
        sStakeholders: rate(1),
        sCustomer: rate(1, 'Internal customer: HR and the board'),
      },
      methodCheck: {
        mAssign: mc('Initiation process', 'Detailed'),
        mStake: mc('Initiation process', 'Rough'),
        mResults: mc('Initiation process', 'Rough'),
        mWbs: mc('Initiation process', 'Detailed'),
        mMiles: mc('Initiation process', 'Detailed'),
        mRes: mc('Start process', 'Detailed', 'Rough estimate in I4'),
        mCost: mc('Start process', 'Detailed', 'Financing plan kept rough: HR budget plus sponsors'),
        mOrg: mc('Start process', 'Detailed'),
        mRoles: mc('Already exists', 'Detailed', 'Company role descriptions used'),
        mComm: mc('Start process', 'Detailed'),
        mRules: mc('Start process', 'Rough'),
        mRaci: mc('Start process', 'Detailed'),
        mWps: mc('Start process', 'Rough', 'Only for the critical work packages'),
        mBar: mc('Start process', 'Rough', 'Linked bar chart; no full network analysis'),
        mRisk: mc('Start process', 'Rough', 'Qualitative risk table'),
        mContract: mc('Not required', '', 'Internal project; supplier contracts checked by Purchasing'),
        mCR: mc('Start process', 'Rough'),
        mMarketing: mc('Start process', 'Rough', 'Intranet news and posters'),
      },
      tailorNavigator: {
        ini: { steps: 'I1–I3 in one-to-one talks and an initial PO meeting; I4 in a half-day planning workshop; I5 in a PO meeting', content: 'None', deliverables: 'Preliminary charter, six fields, stakeholder list, WBS, milestone plan, rough budget', methods: 'Project assignment, stakeholder analysis, WBS, milestone plan, rough cost plan, first risk list' },
        start: { steps: 'Kick-off and start workshop (S1–S2), one-to-one talks (S2), follow-up workshop (S3), e-mail (S4), PO and PSC meeting (S5)', content: '1.2 Concept (survey of employee wishes)', deliverables: 'Final charter, PM plan 1.0, organisation chart, communication plan, ground rules', methods: 'Organisation chart, RACI chart, WP specifications, linked bar chart, staff and cost plan, risk analysis, change request process' },
      },
      tailorTypes: {
        tIni: { ours: 'As in a small internal project, plus a planning workshop in I4' },
        tStart: { ours: 'Kick-off, start workshop and follow-up workshop' },
        tContent: { ours: 'Concept, organisation and procurement, communication, festival, evaluation' },
        tDelIni: { ours: 'Preliminary charter with milestone plan and rough budget' },
        tDelStart: { ours: 'Final charter, PM plan 1.0, project organisation' },
      },
    },
  });
})();
