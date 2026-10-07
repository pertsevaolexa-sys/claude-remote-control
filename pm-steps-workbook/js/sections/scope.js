/* Framework 3.5 (scope, step I4): the three scope levels, the results plan and the work breakdown structure. */
(function () {
  'use strict';
  const S = PM.svg;
  const U = PM.util;

  // =====================================================================================
  // Helpers
  // =====================================================================================
  const r1 = (n) => S.round(n);
  const pl = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  const str = (v) => String(v == null ? '' : v).trim();
  const CODE_RE = /^\d+(\.\d+)*$/;

  /** Short list of names: "a, b, c and 2 more". */
  function list(arr, max) {
    max = max || 6;
    const head = arr.slice(0, max).join(', ');
    return arr.length > max ? head + ' and ' + (arr.length - max) + ' more' : head;
  }

  /** Label of a row's name column, with a fallback; ph is true when it is a template hint or missing. */
  function nameOf(q, r, fallback) {
    const own = str(r && r.name);
    if (own) return { t: own, ph: false };
    const lab = r ? str(q.label(r, 'name')) : '';
    return { t: lab || fallback || '(no name yet)', ph: true };
  }

  /** Chevron as a path, so it can be dashed. first: flat left edge. */
  function chev(x, y, w, h, first, tip, o) {
    const pts = first
      ? [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h]]
      : [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h], [x + tip, y + h / 2]];
    return S.path('M' + pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' L') + ' Z', { fill: o.fill, stroke: o.stroke, sw: o.sw, dash: o.dash, join: 'round' });
  }

  /** Legend row with custom swatches. items: [{label, sw, swatch(x, cy) => svg}]. Returns {svg, h}. */
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

  /** Small rounded tag with initials; xr is its right edge. */
  function tag(xr, y, txt, o) {
    const w = Math.max(18, S.measure(txt, 9.5, 600) + 9);
    return (
      S.rect(xr - w, y, w, 14, { fill: o.fill, stroke: o.stroke, sw: 1, rx: 3, dash: o.dash }) +
      S.text(xr - w / 2, y + 7, txt, { size: 9.5, weight: 600, anchor: 'middle', v: 'middle', fill: o.ink })
    );
  }

  // =====================================================================================
  // Results plan: tree of results
  // =====================================================================================
  /** Parent links of the results plan with cycles broken: {rows, roots, kids}. */
  function resultTree(q) {
    const rows = q.rows('scopeResults');
    const byId = new Map(rows.map((r) => [r._id, r]));
    const up = (r) => {
      const p = r.parent ? byId.get(String(r.parent)) : null;
      return p && p !== r ? p : null;
    };
    const kids = new Map(rows.map((r) => [r._id, []]));
    const roots = [];
    rows.forEach((r) => {
      let cur = up(r);
      const seen = new Set();
      let cyc = false;
      while (cur) {
        if (cur === r) {
          cyc = true;
          break;
        }
        if (seen.has(cur)) break;
        seen.add(cur);
        cur = up(cur);
      }
      const p = cyc ? null : up(r);
      if (p) kids.get(p._id).push(r);
      else roots.push(r);
    });
    return { rows, roots, kids };
  }

  /** Options for "Part of": every other result except the row's own sub-results. */
  function parentOptions(q, row) {
    const T = resultTree(q);
    const banned = new Set();
    if (row && row._id) {
      const walk = (id) => {
        banned.add(id);
        (T.kids.get(id) || []).forEach((k) => walk(k._id));
      };
      walk(row._id);
    }
    return T.rows.filter((r) => !banned.has(r._id)).map((r) => ({ value: r._id, label: nameOf(q, r, '(unnamed result)').t }));
  }

  // =====================================================================================
  // Graphic: results plan as a mind map
  // =====================================================================================
  function resultsMap(q, pal) {
    const T = resultTree(q);
    const W = 1000;
    const cx = W / 2;
    const rC = 64;
    const boxW = 152;
    const gapC = 46;
    const top = 16;
    const GAP = 16;
    const LH = 15;

    let centreRow = null;
    let mains;
    if (T.roots.length === 1) {
      centreRow = T.roots[0];
      mains = T.kids.get(centreRow._id);
    } else mains = T.roots;
    const metaName = str(q.f('meta.name'));
    const centre = centreRow ? nameOf(q, centreRow, 'Overall result') : { t: metaName || 'Overall result', ph: !metaName };

    let anyUnset = false;
    const look = (r) => {
      const ph = nameOf(q, r).ph;
      if (r.type === 'Tangible') return { fill: pal.accent, stroke: pal.accent, text: ph ? pal.accentInk : pal.accentInk, dotFill: pal.accent, dotStroke: pal.accent, ph };
      if (r.type === 'Intangible') return { fill: pal.bg, stroke: pal.accent, text: ph ? pal.muted : pal.ink, dotFill: pal.bg, dotStroke: pal.accent, ph };
      anyUnset = true;
      return { fill: pal.box, stroke: pal.boxLine, text: ph ? pal.muted : pal.ink, dotFill: pal.bg, dotStroke: pal.muted, ph };
    };

    const subsOf = (main) => {
      const out = [];
      const walk = (r, d) => (T.kids.get(r._id) || []).forEach((k) => {
        out.push({ r: k, d });
        walk(k, d + 1);
      });
      walk(main, 1);
      return out;
    };
    const indent = (d) => Math.min(d - 1, 4) * 14;

    const blocks = mains.map((m) => {
      const lab = nameOf(q, m).t;
      const bl = S.wrap(lab, boxW - 16, 12, 600).slice(0, 3);
      const boxH = Math.max(36, bl.length * 14.4 + 14);
      const its = subsOf(m).map((it) => {
        const maxW = 186 - indent(it.d);
        const t = nameOf(q, it.r).t;
        const all = S.wrap(t, maxW, 12, 400);
        const lines = all.slice(0, 2);
        if (all.length > 2) lines[1] = S.fit(lines[1] + '…', maxW, 12);
        return Object.assign(it, { lines, h: lines.length * LH + 5 });
      });
      const listH = its.reduce((s, it) => s + it.h, 0);
      return { m, lab, boxH, its, listH, h: Math.max(boxH, listH) };
    });

    // Split the main results into a right and a left side of about equal height.
    const sideH = (arr) => (arr.length ? arr.reduce((s, b) => s + b.h, 0) + GAP * (arr.length - 1) : 0);
    let k = 0;
    let best = Infinity;
    for (let i = 1; i <= blocks.length; i++) {
      const d = Math.abs(sideH(blocks.slice(0, i)) - sideH(blocks.slice(i)));
      if (d <= best) {
        best = d;
        k = i;
      }
    }
    const right = blocks.slice(0, k);
    const left = blocks.slice(k).reverse(); // clockwise: the left side reads bottom to top
    const HR = sideH(right);
    const HL = sideH(left);
    const bodyH = Math.max(HR, HL, 2 * rC + 24);
    const cy = top + bodyH / 2;

    let links = '';
    let nodes = '';
    const side = (arr, H, dir) => {
      let y = cy - H / 2;
      arr.forEach((b) => {
        const bx = dir > 0 ? cx + rC + gapC : cx - rC - gapC - boxW;
        const by = y + (b.h - b.boxH) / 2;
        const bmid = by + b.boxH / 2;
        const inX = dir > 0 ? bx : bx + boxW;
        const outX = dir > 0 ? bx + boxW : bx;
        const ang = Math.atan2(bmid - cy, inX - cx);
        const sx = cx + rC * Math.cos(ang);
        const sy = cy + rC * Math.sin(ang);
        const mx = (sx + inX) / 2;
        const lk = look(b.m);
        links += S.path('M' + r1(sx) + ',' + r1(sy) + ' C' + r1(mx) + ',' + r1(sy) + ' ' + r1(mx) + ',' + r1(bmid) + ' ' + r1(inX) + ',' + r1(bmid), { stroke: pal.accent, sw: 2, dash: lk.ph ? '5 4' : null });
        nodes += S.box(bx, by, boxW, b.boxH, b.lab, { fill: lk.fill, stroke: lk.stroke, sw: 1.5, dash: lk.ph ? '4 3' : null, color: lk.text, italic: lk.ph, size: 12, weight: 600, maxLines: 3 });

        let iy = y + (b.h - b.listH) / 2;
        const lastAt = [];
        b.its.forEach((it) => {
          const mX = outX + dir * (30 + indent(it.d));
          const ty = iy + 3;
          const my = ty + 6;
          const li = look(it.r);
          if (it.d === 1) {
            links += S.path('M' + r1(outX) + ',' + r1(bmid) + ' C' + r1(outX + dir * 16) + ',' + r1(bmid) + ' ' + r1(mX - dir * 18) + ',' + r1(my) + ' ' + r1(mX - dir * 6) + ',' + r1(my), { stroke: pal.muted, sw: 1.2 });
          } else if (lastAt[it.d - 1]) {
            const p = lastAt[it.d - 1];
            links += S.path('M' + r1(p.x) + ',' + r1(p.y + 5) + ' V' + r1(my) + ' H' + r1(mX - dir * 6), { stroke: pal.muted, sw: 1 });
          }
          lastAt[it.d] = { x: mX, y: my };
          lastAt.length = it.d + 1;
          nodes += S.circle(mX, my, 4.5, { fill: li.dotFill, stroke: li.dotStroke, sw: 1.5 });
          const tx = mX + dir * 10;
          it.lines.forEach((ln, n) => {
            nodes += S.text(tx, ty + n * LH, ln, { size: 12, fill: li.ph ? pal.muted : pal.ink, italic: li.ph, anchor: dir > 0 ? 'start' : 'end' });
          });
          iy += it.h;
        });
        y += b.h + GAP;
      });
    };
    side(right, HR, 1);
    side(left, HL, -1);

    // Centre: the overall result.
    const cl = S.wrap(centre.t, 104, 13, 600);
    const shown = cl.slice(0, 3);
    if (cl.length > 3) shown[2] = S.fit(shown[2] + '…', 104, 13, 600);
    nodes += S.circle(cx, cy, rC, centre.ph ? { fill: pal.bg, stroke: pal.strong, sw: 1.5, dash: '5 4' } : { fill: pal.strong });
    const ty0 = cy - (shown.length * 16) / 2;
    shown.forEach((ln, i) => {
      nodes += S.text(cx, ty0 + i * 16 + 1.5, ln, { size: 13, weight: 600, anchor: 'middle', fill: centre.ph ? pal.muted : pal.strongInk, italic: centre.ph });
    });

    const items = [
      { label: 'Overall result', sw: 12, swatch: (x, y) => S.circle(x + 6, y, 6, { fill: pal.strong }) },
      { label: 'Tangible result', sw: 28, swatch: (x, y) => S.rect(x, y - 5, 14, 10, { fill: pal.accent, stroke: pal.accent, rx: 2 }) + S.circle(x + 23, y, 4, { fill: pal.accent, stroke: pal.accent, sw: 1.5 }) },
      { label: 'Intangible result', sw: 28, swatch: (x, y) => S.rect(x, y - 5, 14, 10, { fill: pal.bg, stroke: pal.accent, sw: 1.5, rx: 2 }) + S.circle(x + 23, y, 4, { fill: pal.bg, stroke: pal.accent, sw: 1.5 }) },
    ];
    if (anyUnset) items.push({ label: 'Type not set yet', sw: 28, swatch: (x, y) => S.rect(x, y - 5, 14, 10, { fill: pal.box, stroke: pal.boxLine, rx: 2 }) + S.circle(x + 23, y, 4, { fill: pal.bg, stroke: pal.muted, sw: 1.5 }) });
    const lg = legendRow(items, 16, top + bodyH + 22, W - 32, pal);
    const H = top + bodyH + 22 + lg.h + 10;
    return S.svg(W, H, links + nodes + lg.svg, { pal, label: 'Results plan as a mind map' });
  }

  // =====================================================================================
  // Graphic: work breakdown structure chart
  // =====================================================================================
  function wbsChart(q, pal) {
    const all = q.wbs().filter((r) => CODE_RE.test(str(r.code)));
    const project = all.find((r) => r.level === 1) || null;
    const cols = [];
    const byCode = new Map();
    all.filter((r) => r.level === 2).forEach((p) => {
      const c = { phase: p, code: str(p.code), items: [] };
      cols.push(c);
      if (!byCode.has(c.code)) byCode.set(c.code, c);
    });
    all.filter((r) => r.level >= 3).forEach((r) => {
      const pc = str(r.code).split('.').slice(0, 2).join('.');
      let c = byCode.get(pc);
      if (!c) {
        c = { phase: null, code: pc, items: [] };
        cols.push(c);
        byCode.set(pc, c);
      }
      c.items.push(r);
    });
    cols.sort((a, b) => U.codeCmp(a.code, b.code));

    const colW = 164;
    const gapX = 14;
    const pad = 24;
    const trunkX = 10;
    const phaseH = 58;
    const n = cols.length;
    const nRows = Math.max(1, Math.ceil(n / 6));
    const per = Math.max(1, Math.ceil(n / nRows));
    const rowW = per * colW + (per - 1) * gapX;
    const W = Math.max(rowW + 2 * pad, 640);
    const wp0 = colW - 14;

    cols.forEach((c) => {
      c.list = c.items.map((r) => {
        const d = Math.max(0, Math.min(r.level - 3, 3));
        const w = wp0 - d * 12;
        const group = r.kind === 'Group';
        const nm = nameOf(q, r, 'Work package');
        const all2 = S.wrap(nm.t, w - 12, 11.5, group ? 600 : 400);
        const lines = all2.slice(0, 3);
        if (all2.length > 3) lines[2] = S.fit(lines[2] + '…', w - 12, 11.5, group ? 600 : 400);
        return { r, d, w, group, nm, lines, h: 22 + lines.length * 13.8 + 4 };
      });
      c.listH = c.list.reduce((s, it) => s + it.h, 0) + Math.max(0, c.list.length - 1) * 6;
    });

    const projW = Math.min(340, W - 2 * pad);
    const projH = 50;
    const projY = 12;
    const rows = [];
    for (let i = 0; i < n; i += per) rows.push({ cols: cols.slice(i, i + per) });
    let y = projY + projH + 36;
    rows.forEach((row) => {
      row.top = y;
      const maxList = Math.max(0, ...row.cols.map((c) => c.listH));
      row.h = phaseH + (maxList ? 10 + maxList : 0);
      const cw = row.cols.length * colW + (row.cols.length - 1) * gapX;
      let x = (W - cw) / 2;
      row.cols.forEach((c) => {
        c.x = x;
        x += colW + gapX;
      });
      y += row.h + 44;
    });
    const bodyBottom = rows.length ? y - 44 : projY + projH;

    let lines = '';
    let boxes = '';
    const ln = (x1, y1, x2, y2) => S.line(x1, y1, x2, y2, { stroke: pal.muted, sw: 1.2 });

    // Project box.
    const pcx = W / 2;
    const pNm = project ? nameOf(q, project, 'Project name') : { t: 'Project (code 1)', ph: true };
    const pResp = project && project.responsible ? q.name(project.responsible) : '';
    const pSub = (project ? str(project.code) : '1') + (pResp ? ' · ' + pResp : '');
    boxes += S.box(pcx - projW / 2, projY, projW, projH, pNm.t, pNm.ph
      ? { fill: pal.bg, stroke: pal.strong, sw: 1.5, dash: '5 4', color: pal.muted, italic: true, size: 13, maxLines: 1, sub: pSub, subColor: pal.muted }
      : { fill: pal.strong, color: pal.strongInk, size: 13, maxLines: 1, sub: pSub, subColor: pal.strongInk });

    // Connectors from the project to the phases.
    rows.forEach((row, ri) => {
      const busY = row.top - 18;
      const xs = row.cols.map((c) => c.x + colW / 2);
      let x1 = Math.min(...xs);
      let x2 = Math.max(...xs);
      if (ri === 0) {
        x1 = Math.min(x1, pcx);
        x2 = Math.max(x2, pcx);
        lines += ln(pcx, projY + projH, pcx, busY);
      }
      if (rows.length > 1) x1 = Math.min(x1, trunkX);
      lines += ln(x1, busY, x2, busY);
      xs.forEach((x) => (lines += ln(x, busY, x, row.top)));
    });
    if (rows.length > 1) lines += ln(trunkX, rows[0].top - 18, trunkX, rows[rows.length - 1].top - 18);

    // Phases and their work packages.
    rows.forEach((row) => {
      row.cols.forEach((c) => {
        const x = c.x;
        const t = row.top;
        const p = c.phase;
        const nm = p ? nameOf(q, p, 'Phase') : { t: 'No phase line ' + c.code, ph: true };
        let st;
        if (!p) st = { fill: pal.bg, stroke: pal.crit, dash: '4 3', ink: pal.muted, sub: pal.muted };
        else if (nm.ph) st = { fill: pal.bg, stroke: pal.accent, dash: '4 3', ink: pal.muted, sub: pal.muted };
        else if (p.kind === 'PM phase') st = { fill: pal.accentSoft, stroke: pal.accent, ink: pal.ink, sub: pal.ink2 };
        else st = { fill: pal.accent, stroke: pal.accent, ink: pal.accentInk, sub: pal.accentInk };
        boxes += S.rect(x, t, colW, phaseH, { fill: st.fill, stroke: st.stroke, sw: 1.5, rx: 6, dash: st.dash });
        boxes += S.text(x + 8, t + 7, c.code, { size: 10.5, family: 'mono', fill: st.sub });
        if (p && p.responsible && q.person(p.responsible)) boxes += tag(x + colW - 6, t + 5, q.initials(p.responsible), { fill: pal.bg, stroke: pal.bg, ink: pal.ink });
        boxes += S.textBlock(x + 8, t + 23, nm.t, { maxW: colW - 16, size: 12, weight: 600, maxLines: 2, fill: st.ink, italic: nm.ph }).svg;

        let iy = t + phaseH + 10;
        const lastAt = [];
        c.list.forEach((it) => {
          const bx = x + 14 + it.d * 12;
          const lx = x + 7 + it.d * 12;
          const from = it.d === 0 || !lastAt[it.d - 1] ? t + phaseH : lastAt[it.d - 1];
          lines += S.path('M' + r1(lx) + ',' + r1(from) + ' V' + r1(iy + 11) + ' H' + r1(bx), { stroke: pal.muted, sw: 1 });
          const ph = it.nm.ph;
          const fill = ph ? pal.bg : pal.box;
          const stroke = ph ? pal.boxLine : it.group ? pal.accent : pal.boxLine;
          boxes += S.rect(bx, iy, it.w, it.h, { fill, stroke, sw: it.group ? 1.5 : 1, rx: 5, dash: ph ? '4 3' : null });
          boxes += S.text(bx + 6, iy + 6, str(it.r.code), { size: 10.5, family: 'mono', fill: ph ? pal.muted : pal.ink2 });
          const who = it.r.responsible && q.person(it.r.responsible) ? q.initials(it.r.responsible) : '';
          if (who) boxes += tag(bx + it.w - 5, iy + 5, who, { fill: pal.accentSoft, stroke: pal.accentSoft, ink: pal.ink });
          else if (!it.group) boxes += tag(bx + it.w - 5, iy + 5, '?', { fill: pal.bg, stroke: pal.muted, dash: '2 2', ink: pal.muted });
          it.lines.forEach((tl, k) => {
            boxes += S.text(bx + 6, iy + 21 + k * 13.8, tl, { size: 11.5, weight: it.group ? 600 : 400, fill: ph ? pal.muted : pal.ink, italic: ph });
          });
          lastAt[it.d] = iy + it.h;
          lastAt.length = it.d + 1;
          iy += it.h + 6;
        });
      });
    });

    const items = [
      { label: 'Project', swatch: (x, y) => S.rect(x, y - 5, 14, 10, { fill: pal.strong, rx: 2 }) },
      { label: 'Project management phase', swatch: (x, y) => S.rect(x, y - 5, 14, 10, { fill: pal.accentSoft, stroke: pal.accent, sw: 1.5, rx: 2 }) },
      { label: 'Content phase', swatch: (x, y) => S.rect(x, y - 5, 14, 10, { fill: pal.accent, rx: 2 }) },
      { label: 'Work package', swatch: (x, y) => S.rect(x, y - 5, 14, 10, { fill: pal.box, stroke: pal.boxLine, rx: 2 }) },
    ];
    if (all.some((r) => r.kind === 'Group')) items.push({ label: 'Group of work packages', swatch: (x, y) => S.rect(x, y - 5, 14, 10, { fill: pal.box, stroke: pal.accent, sw: 1.5, rx: 2 }) });
    items.push({ label: 'Responsible person (initials); ? = nobody yet', sw: 18, swatch: (x, y) => S.rect(x, y - 6, 18, 12, { fill: pal.accentSoft, rx: 3 }) });
    const lg = legendRow(items, pad, bodyBottom + 20, W - 2 * pad, pal);
    return S.svg(W, bodyBottom + 20 + lg.h + 10, lines + boxes + lg.svg, { pal, label: 'Work breakdown structure' });
  }

  // =====================================================================================
  // Graphic: WBS as a process (chevron strip)
  // =====================================================================================
  function wbsProcess(q, pal) {
    const phases = q.phases();
    const content = phases.filter((p) => p.kind === 'Phase');
    const pm = phases.find((p) => p.kind === 'PM phase') || null;
    const wps = q.wps();
    const under = (p) => wps.filter((w) => str(w.code).startsWith(str(p.code) + '.'));
    const n = content.length;
    const pad = 16;
    const gap = 4;
    const tip = 16;
    const chH = 70;
    let chW = (1000 - 2 * pad - (n - 1) * gap) / n;
    chW = Math.max(120, Math.min(230, chW));
    const stripW = n * chW + (n - 1) * gap;
    const W = Math.max(1000, stripW + 2 * pad);
    const x0 = (W - stripW) / 2;
    const top = 14;

    let out = '';
    let below = top + chH;
    content.forEach((p, i) => {
      const x = x0 + i * (chW + gap);
      const first = i === 0;
      const nm = nameOf(q, p, 'Phase');
      const st = nm.ph ? { fill: pal.bg, stroke: pal.accent, sw: 1.5, dash: '4 3' } : { fill: pal.accent };
      out += chev(x, top, chW, chH, first, tip, st);
      const tcx = first ? x + (chW - tip / 2) / 2 : x + chW / 2 + tip / 4;
      const maxW = chW - 2 * tip - 6;
      const nl = S.wrap(nm.t, maxW, 12, 600);
      const shown = nl.slice(0, 3);
      if (nl.length > 3) shown[2] = S.fit(shown[2] + '…', maxW, 12, 600);
      const blockH = 14 + shown.length * 14.5;
      let ty = top + (chH - blockH) / 2;
      out += S.text(tcx, ty, str(p.code), { size: 10.5, family: 'mono', anchor: 'middle', fill: nm.ph ? pal.muted : pal.accentInk });
      ty += 14;
      shown.forEach((tl) => {
        out += S.text(tcx, ty, tl, { size: 12, weight: 600, anchor: 'middle', fill: nm.ph ? pal.muted : pal.accentInk, italic: nm.ph });
        ty += 14.5;
      });

      // One square per work package, then the count and the dates.
      const bodyX = x + (first ? 0 : tip);
      const bodyW = chW - (first ? tip : 2 * tip) + (first ? 0 : 0);
      const ws = under(p);
      const perRow = Math.max(1, Math.floor((bodyW + 3) / 9));
      let y = top + chH + 12;
      ws.forEach((w, k) => {
        const rowN = Math.floor(k / perRow);
        const inRow = Math.min(perRow, ws.length - rowN * perRow);
        const rx0 = bodyX + (bodyW - (inRow * 9 - 3)) / 2;
        const ph = nameOf(q, w).ph;
        out += S.rect(rx0 + (k % perRow) * 9, y + rowN * 9, 6, 6, ph ? { fill: pal.bg, stroke: pal.muted, sw: 1, rx: 1 } : { fill: pal.accent, rx: 1 });
      });
      if (ws.length) y += Math.ceil(ws.length / perRow) * 9 + 4;
      let label = ws.length ? pl(ws.length, 'work package') : 'No work packages';
      if (S.measure(label, 11) > chW - 8) label = ws.length ? pl(ws.length, 'WP') : 'No WPs';
      out += S.text(bodyX + bodyW / 2, y, label, { size: 11, anchor: 'middle', fill: ws.length ? pal.ink2 : pal.muted });
      y += 15;
      const d = q.dates(p._id);
      if (d.start && d.end) {
        const dt = S.fit(U.fmtDateShort(d.start) + ' – ' + U.fmtDateShort(d.end), chW - 8, 11);
        out += S.text(bodyX + bodyW / 2, y, dt, { size: 11, anchor: 'middle', fill: pal.muted });
        y += 15;
      }
      below = Math.max(below, y);
    });

    // Project management runs alongside every content phase.
    const by = below + 10;
    if (pm) {
      const pmN = under(pm).length;
      const nm = nameOf(q, pm, 'Project management');
      out += S.rect(x0, by, stripW, 28, { fill: pal.accentSoft, stroke: pal.accent, sw: 1.2, rx: 4 });
      const t = str(pm.code) + ' ' + nm.t + ' · ' + pl(pmN, 'work package') + ' · runs alongside every phase';
      out += S.text(x0 + stripW / 2, by + 14, S.fit(t, stripW - 16, 12, 600), { size: 12, weight: 600, anchor: 'middle', v: 'middle', fill: pal.ink });
    } else {
      out += S.rect(x0, by, stripW, 28, { fill: pal.bg, stroke: pal.muted, sw: 1.2, rx: 4, dash: '4 3' });
      out += S.text(x0 + stripW / 2, by + 14, S.fit('No project management phase (1.1) yet', stripW - 16, 12), { size: 12, anchor: 'middle', v: 'middle', fill: pal.muted, italic: true });
    }
    return S.svg(W, by + 28 + 12, out, { pal, label: 'Work breakdown structure as a process' });
  }

  // =====================================================================================
  // WBS rules
  // =====================================================================================
  function wbsChecks(q) {
    const out = [];
    const raw = q.rows('wbs');
    const all = q.wbs();
    const phases = q.phases();
    const content = phases.filter((p) => p.kind === 'Phase');
    const pm = phases.find((p) => p.kind === 'PM phase') || null;
    const wps = q.wps();
    const under = (p) => wps.filter((w) => str(w.code).startsWith(str(p.code) + '.'));

    // 1. Number of phases.
    out.push({
      ok: content.length >= 4 && !!pm,
      text: 'At least 4 content phases plus the project management phase 1.1. Now: ' + pl(content.length, 'content phase') + ', project management phase ' + (pm ? 'present' : 'missing') + '.',
    });

    // 2. Work packages per phase.
    const thin = phases.filter((p) => under(p).length < 3).map((p) => str(p.code) + ' (' + under(p).length + ')');
    out.push({
      ok: phases.length > 0 && !thin.length,
      text: !phases.length ? 'Add phases with at least 3 work packages each.' : thin.length ? 'One or two work packages do not make a phase. Too few in: ' + list(thin) + '.' : 'Every phase has at least 3 work packages.',
    });

    // 3. One responsible person per work package.
    const noOwner = wps.filter((w) => !w.responsible || !q.person(w.responsible)).map((w) => str(w.code));
    out.push({
      ok: wps.length > 0 && !noOwner.length,
      text: !wps.length ? 'Add work packages, each with one responsible person.' : noOwner.length ? 'Every work package needs exactly one responsible person. Missing for: ' + list(noOwner) + '.' : 'Every work package has exactly one responsible person.',
    });

    // 4. Codes.
    const codes = raw.map((r) => str(r.code)).filter(Boolean);
    const set = new Set(codes);
    const bad = codes.filter((c) => !CODE_RE.test(c));
    const dup = [...new Set(codes.filter((c, i) => codes.indexOf(c) !== i))];
    const orphan = codes.filter((c) => CODE_RE.test(c) && c.includes('.') && !set.has(U.parentCode(c)));
    const tops = codes.filter((c) => /^\d+$/.test(c));
    const noCode = raw.length - codes.length;
    const probs = [];
    if (tops.length !== 1) probs.push(tops.length ? 'more than one top line (' + list(tops) + ')' : 'no top line with code 1');
    if (dup.length) probs.push('duplicate codes ' + list(dup));
    if (orphan.length) probs.push('no parent line for ' + list(orphan));
    if (bad.length) probs.push('codes not in the form 1.2.3: ' + list(bad.map((c) => '"' + c + '"')));
    if (noCode) probs.push(pl(noCode, 'line') + ' without a code');
    out.push({ ok: codes.length > 0 && !probs.length, text: probs.length ? 'Codes must be unique and every code needs its parent line. Found: ' + probs.join('; ') + '.' : 'All codes are unique and every code has its parent line.' });

    // 5. Consistent depth within each phase.
    const mixed = phases
      .map((p) => ({ p, lv: [...new Set(under(p).map((w) => w.level))].sort() }))
      .filter((x) => x.lv.length > 1)
      .map((x) => str(x.p.code) + ' (levels ' + x.lv.join(' and ') + ')');
    out.push({
      ok: wps.length > 0 && !mixed.length,
      text: mixed.length ? 'Break each phase down to one depth. Mixed levels in: ' + list(mixed) + '.' : 'Within each phase, all work packages sit on the same level.',
    });

    // 6. Names with a noun and a verb.
    const lines3 = all.filter((r) => r.level >= 3);
    const unnamed = lines3.filter((r) => !str(r.name));
    const oneWord = lines3.filter((r) => str(r.name) && str(r.name).split(/\s+/).length < 2).map((r) => str(r.code) + ' ' + str(r.name));
    const nameProbs = [];
    if (oneWord.length) nameProbs.push('one word only: ' + list(oneWord, 4));
    if (unnamed.length) nameProbs.push(pl(unnamed.length, 'line') + ' without a name yet');
    out.push({
      ok: lines3.length > 0 && !nameProbs.length,
      text: nameProbs.length ? 'Name work packages with a noun and a verb, like "building the hull". Found ' + nameProbs.join('; ') + '.' : 'Every work package name has at least two words (noun and verb).',
    });

    // 7. Consistent wording (information).
    const named = lines3.map((r) => str(r.name)).filter(Boolean);
    if (named.length) {
      const asTask = named.filter((t) => /\b[a-z]+ing\b/i.test(t)).length;
      const asResult = named.filter((t) => !/\b[a-z]+ing\b/i.test(t) && /(ed|en|built|held|done|sent|set|made)$/i.test(t)).length;
      const chosen = str(q.f('scope.wording'));
      out.push({
        ok: null,
        text: 'Wording: ' + asTask + ' of ' + named.length + ' names read as tasks ("building …"), ' + asResult + ' as results ("… built").' + (chosen ? ' Chosen style: ' + chosen.toLowerCase() + '.' : ' Pick one style and keep it.'),
      });
    }

    // 8. Results plan against the WBS (information).
    const res = q.rows('scopeResults').filter((r) => str(r.name));
    const unlinked = res.filter((r) => !r.wbs || !q.wbsRow(r.wbs)).map((r) => str(r.name));
    out.push({
      ok: null,
      text: !res.length
        ? 'No results named yet. Fill in the results plan to check the WBS for completeness.'
        : unlinked.length
          ? res.length - unlinked.length + ' of ' + res.length + ' results are linked to a work package. Not linked yet: ' + list(unlinked, 4) + '.'
          : 'All ' + res.length + ' results in the results plan are linked to a work package.',
    });
    const linked = new Set(res.map((r) => r.wbs).filter(Boolean));
    const noOutput = wps.filter((w) => !str(w.result) && !linked.has(w._id)).map((w) => str(w.code));
    if (wps.length) {
      out.push({
        ok: null,
        text: noOutput.length ? 'Work packages without a result: ' + list(noOutput) + '. Add one in the WBS or link one from the results plan.' : 'Every work package produces a result.',
      });
    }

    // 9. Content of the project management phase (information).
    if (pm) {
      const names = all.filter((r) => r.level >= 3 && str(r.code).startsWith(str(pm.code) + '.')).map((r) => q.label(r, 'name') || '').join(' | ');
      const need = [['start', /start|initiat|kick/i], ['coordination', /coordinat/i], ['controlling', /control|monitor/i], ['closing', /clos|wrap/i]];
      const miss = need.filter((x) => !x[1].test(names)).map((x) => x[0]);
      out.push({
        ok: null,
        text: miss.length ? 'Project management phase ' + str(pm.code) + ' should cover start, coordination, controlling and closing. Not found: ' + miss.join(', ') + '.' : 'Project management phase ' + str(pm.code) + ' covers start, coordination, controlling and closing.',
      });
    }
    return out;
  }

  // =====================================================================================
  // Section
  // =====================================================================================
  PM.section({
    id: 'scope',
    part: 'initiation',
    order: 35.1,
    num: '3.5',
    step: 'I4',
    slides: '48–57',
    title: 'Scope: results plan and work breakdown structure',
    navTitle: 'Scope and WBS',
    intro: 'Scope planning works on three levels: why the project exists, what it delivers and what has to be done. List the results first, then build the work breakdown structure from them.',
    blocks: [
      { type: 'step', step: 'I4' },
      {
        type: 'guide',
        title: 'Scope planning in five steps',
        text: 'Steps 1 to 3 happen in the planning workshop. Steps 4 and 5 follow in detailed planning.',
        ordered: true,
        items: [
          'List the results. Ask what has to exist at the end of the project, tangible or intangible, and break the overall result into partial results.',
          'Check the phases against the content boundaries from 3.3 (objectives, exclusions, phases) and put them in process order.',
          'Define the work packages within each phase, so that every result comes out of a work package.',
          'Give every work package one responsible person.',
          'Write a specification for each work package (see 4.2).',
        ],
      },
      { type: 'h', text: 'Three levels of scope', sub: 'Each level answers its own question and ends up in its own document.' },
      {
        type: 'table',
        key: 'scopeLevels',
        title: 'Scope levels',
        hint: 'The first three columns describe the level. Write how your project covers it.',
        fixed: [
          { _id: 'L1', level: '1 Objective', question: 'Why, and what has to be made possible for whom?', doc: 'Project Charter, scope statement' },
          { _id: 'L2', level: '2 Deliverables (interim and final results)', question: 'What is supplied? What do we have to think of?', doc: 'Results plan' },
          { _id: 'L3', level: '3 Process (tasks)', question: 'What has to be done?', doc: 'Work breakdown structure, WP specifications' },
        ],
        columns: [
          { key: 'level', label: 'Level', from: true, w: 14 },
          { key: 'question', label: 'Guiding question', from: true, w: 22 },
          { key: 'doc', label: 'Document', from: true, w: 16 },
          {
            key: 'ours', label: 'In our project', kind: 'textarea', w: 32,
            placeholder: (r) => ({ L1: 'e.g. the top objective and where the scope statement is', L2: 'e.g. the main results you deliver', L3: 'e.g. number of phases and work packages' })[r && r._id] || '',
          },
        ],
      },
      {
        type: 'fields',
        title: 'Scope statement and approach',
        cols: 3,
        fields: [
          { key: 'scope.statement', label: 'Scope statement', kind: 'textarea', wide: true, placeholder: 'What the project delivers, for whom, and what is left out' },
          { key: 'scope.approach', label: 'Planning approach', kind: 'select', options: ['Top-down', 'Bottom-up', 'Both'], hint: 'Top-down: from phases to work packages. Bottom-up: collect tasks, then group them.' },
          { key: 'scope.wording', label: 'Wording of work packages', kind: 'select', options: ['As tasks', 'As results'], hint: '"Building the hull" or "Hull built". Keep one style.' },
          { key: 'scope.template', label: 'Template WBS used', kind: 'text', placeholder: 'e.g. standard event WBS, or none' },
        ],
      },
      { type: 'h', text: 'Results plan', sub: 'What has to exist at the end of the project, broken down from the overall result.' },
      {
        type: 'callout',
        kind: 'tip',
        title: 'Optional, but useful.',
        text: 'The results plan is the best completeness check for the WBS: every result needs a work package that produces it.',
      },
      {
        type: 'table',
        key: 'scopeResults',
        title: 'Results plan',
        hint: 'One line per result. Leave "Part of" empty for the overall result; main results are part of it, sub-results part of a main result.',
        numbered: true,
        addLabel: 'Add result',
        columns: [
          { key: 'name', label: 'Result', kind: 'text', w: 22, placeholder: 'e.g. Venue contract' },
          { key: 'parent', label: 'Part of', sub: 'parent result', kind: 'select', w: 18, options: parentOptions },
          { key: 'type', label: 'Type', kind: 'select', options: ['Tangible', 'Intangible'], w: 11 },
          { key: 'desc', label: 'Description', kind: 'textarea', w: 26, placeholder: 'What exactly exists when it is done' },
          { key: 'wbs', label: 'Produced by', sub: 'work package', kind: 'wbs', w: 18 },
        ],
        defaults: [
          { _id: 'sr0', _ph: { name: 'Overall result', desc: 'e.g. Festival held for 400 guests' } },
          { _id: 'sr1', parent: 'sr0', _ph: { name: 'Main result 1' } },
          { _id: 'sr2', parent: 'sr0', _ph: { name: 'Main result 2' } },
          { _id: 'sr3', parent: 'sr0', _ph: { name: 'Main result 3' } },
          { _id: 'sr4', parent: 'sr1', _ph: { name: 'Sub-result' } },
          { _id: 'sr5', parent: 'sr1', _ph: { name: 'Sub-result' } },
        ],
      },
      {
        type: 'graphic',
        title: 'Results plan',
        caption: 'The overall result sits in the centre, main results around it, sub-results branch off them. Filled boxes and dots are tangible results (documents, objects); outlined ones are intangible (services, decisions, knowledge). Set the parent in the "Part of" column.',
        empty: (q) => (q.rows('scopeResults').length ? null : 'Add results to the results plan to see the mind map.'),
        render: resultsMap,
      },
      { type: 'h', text: 'Work breakdown structure', sub: 'All the work of the project, by phase. Code 1 is the project, 1.1 is project management, 1.2 onwards are the content phases.' },
      { type: 'table', key: 'wbs', title: 'Work breakdown structure' },
      {
        type: 'graphic',
        title: 'Work breakdown structure',
        caption: 'The project on top, the phases in one row with project management first, the work packages below each phase. Tags show who is responsible; a "?" means nobody is assigned yet. More than six phases wrap into a second row.',
        empty: (q) => (q.wbs().length ? null : 'Add lines with codes to the work breakdown structure to see the chart.'),
        render: wbsChart,
      },
      {
        type: 'graphic',
        title: 'Work breakdown structure as a process',
        caption: 'The content phases in process order, with one square per work package. Project management runs alongside every phase.',
        empty: (q) => (q.phases().some((p) => p.kind === 'Phase') ? null : 'Add content phases (codes 1.2, 1.3, …) to the work breakdown structure to see the process view.'),
        render: wbsProcess,
      },
      { type: 'checks', title: 'WBS rules', hint: 'Checked automatically from the WBS and the results plan.', run: wbsChecks },
    ],
  });

  PM.metric('workPackages', { label: 'Work packages', kind: 'number', section: 'scope', fn: (q) => q.wps().length || null });
  PM.metric('phases', { label: 'Content phases', kind: 'number', section: 'scope', fn: (q) => q.phases().filter((p) => p.kind === 'Phase').length || null });

  // =====================================================================================
  // Example: Summer Festival 2026
  // =====================================================================================
  const R = (id, name, parent, type, desc, wbs) => ({ _id: id, name, parent, type, desc, wbs });
  PM.example({
    f: {
      'scope.statement': 'The project plans, runs and evaluates a one-day summer festival for about 400 employees and their families on 27 June 2026 at a rented park venue near the head office. It covers the concept, venue, catering, programme, invitations, safety, the festival day and the evaluation. Not included: travel to the venue, overnight stays and a second festival date.',
      'scope.approach': 'Both',
      'scope.wording': 'As tasks',
      'scope.template': 'Event WBS from the 2024 company anniversary',
    },
    t: {
      scopeResults: [
        R('r1', 'Festival held', '', 'Intangible', 'A one-day festival for about 400 employees and their families on 27 June 2026', 'w152'),
        R('r2', 'Concept', 'r1', 'Tangible', 'Agreed picture of what the festival offers and how it runs', 'w12'),
        R('r3', 'Survey results', 'r2', 'Tangible', 'What employees want from the festival, from an online survey', 'w121'),
        R('r4', 'Festival concept', 'r2', 'Tangible', 'Theme, programme outline and budget frame, approved by the sponsor', 'w122'),
        R('r5', 'Venue and logistics', 'r1', 'Tangible', 'Everything needed on site', 'w13'),
        R('r6', 'Venue contract', 'r5', 'Tangible', 'Signed rental contract for the park venue', 'w131'),
        R('r7', 'Catering', 'r5', 'Tangible', 'Catering contract and menu for 400 guests', 'w132'),
        R('r8', 'Technology and safety concept', 'r5', 'Tangible', 'Stage, sound and power, plus the safety concept approved by the authority', 'w134'),
        R('r9', 'Programme', 'r1', 'Intangible', 'What the guests experience on the day', 'w133'),
        R('r10', 'Artists', 'r9', 'Intangible', 'Band, DJ and host booked with contracts', 'w133'),
        R('r11', "Kids' programme", 'r9', 'Intangible', 'Play area, workshops and supervision for children', 'w133'),
        R('r12', 'Communication', 'r1', 'Intangible', 'Employees know about the festival and register', 'w14'),
        R('r13', 'Invitation', 'r12', 'Tangible', 'Invitation, festival logo and reminders', 'w141'),
        R('r14', 'Guest list', 'r12', 'Tangible', 'Final list of registered guests with dietary needs', 'w143'),
        R('r15', 'Evaluation', 'r1', 'Tangible', 'What we learned and what it cost', 'w16'),
        R('r16', 'Participant feedback', 'r15', 'Intangible', 'Feedback from guests and helpers', 'w161'),
        R('r17', 'Evaluation report', 'r15', 'Tangible', 'Report for the sponsor with lessons learned', 'w162'),
        R('r18', 'Final cost statement', 'r15', 'Tangible', 'All invoices settled, costs compared with the budget', 'w163'),
      ],
    },
    x: {
      scopeLevels: {
        L1: { ours: 'Top objective: employees and their families spend a day together that strengthens their bond with the company. The scope statement is part of the charter.' },
        L2: { ours: 'Results plan with 18 results, from the survey results to the final cost statement.' },
        L3: { ours: 'WBS with 5 content phases, the project management phase and 21 work packages.' },
      },
    },
  });
})();
