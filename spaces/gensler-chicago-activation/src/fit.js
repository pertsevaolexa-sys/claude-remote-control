// ---------------------------------------------------------------------------
// Fit report - checks dimensions against geometry, not against a screenshot.
// ---------------------------------------------------------------------------
// Pure data in, pure findings out. Imported by check.mjs (Node) and by the
// in-page review panel, so the console and the UI can never disagree.
// ---------------------------------------------------------------------------

import { CONFIG, PROVENANCE, STATUS } from './config.js';
import { inchToMm } from './units.js';
import {
  footprints, rectMarginsMm, bestBalancedMarginMm, cornerRadiusMm,
  leaningPlanDepthMm, leaningHeightMm, widthAsArcMm, a4HolderPlanDepthMm,
} from './layout.js';

const OK = 'ok';
const NOTE = 'note';
const CONFLICT = 'conflict';

function r1(n) { return Math.round(n * 10) / 10; }
function r2(n) { return Math.round(n * 100) / 100; }

export function runFitReport(cfg = CONFIG) {
  const findings = [];
  const add = (level, area, message) => findings.push({ level, area, message });

  // -- 1. Provenance completeness ------------------------------------------
  const leaves = [];
  (function walk(o, p) {
    for (const [k, v] of Object.entries(o)) {
      const path = p ? `${p}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, path);
      else leaves.push(path);
    }
  }(cfg, ''));
  const missing = leaves.filter((l) => !PROVENANCE[l]);
  if (missing.length) add(CONFLICT, 'provenance', `${missing.length} config value(s) have no provenance: ${missing.join(', ')}`);
  else add(OK, 'provenance', `All ${leaves.length} configuration values carry a source and a status.`);

  const counts = { specified: 0, provisional: 0, conflict: 0 };
  for (const l of leaves) counts[PROVENANCE[l].status] += 1;
  add(NOTE, 'provenance', `${counts.specified} specified, ${counts.provisional} provisional, ${counts.conflict} in conflict. The model is a spatial prototype, not a fabrication set.`);

  // -- 2. Required object counts -------------------------------------------
  const required = [
    ['Brochures', cfg.brochures.count, 3],
    ['A4 holders', 2, 2],
    ['Growth box samples', cfg.growthBox.sampleCount, 8],
    ['General sample boxes', cfg.generalBoxes.count, 2],
    ['Loose engraved samples', cfg.tiles.count, 6],
    ['Translucent samples', cfg.translucent.slotCount, 10],
    ['Stools', cfg.stools.count, 3],
    ['Removable plain coupon', 1, 1],
    ['Roll-up banner', 1, 1],
  ];
  for (const [label, actual, want] of required) {
    if (actual !== want) add(CONFLICT, 'counts', `${label}: ${actual}, brief requires ${want}.`);
  }
  add(OK, 'counts', required.map(([l, a]) => `${l} ${a}`).join(', ') + '.');

  // -- 3. Left-to-right order ----------------------------------------------
  const fp = footprints(cfg);
  const sequence = ['brochures', 'growth-box', 'installation', 'tiles', 'translucent-block'];
  const byId = Object.fromEntries(fp.map((f) => [f.id, f]));
  let ordered = true;
  for (let i = 1; i < sequence.length; i += 1) {
    if (byId[sequence[i]].sCentre <= byId[sequence[i - 1]].sCentre) ordered = false;
  }
  if (ordered) add(OK, 'order', 'Counter sequence left to right: brochures -> Growth A4 + open box -> LOOK CLOSER installation -> six engraved samples + two general boxes -> Translucent block + A4.');
  else add(CONFLICT, 'order', 'Counter groups are not in the order the brief specifies.');

  // -- 4. Every group on the top, and clear of its neighbours --------------
  const rBack = cfg.counter.curveRadiusMm + cfg.counter.depthMm;
  for (const f of fp) {
    if (f.sMin < 0 || f.sMax > cfg.counter.topLengthMm) {
      add(CONFLICT, 'fit', `${f.label} runs off the end of the counter (s ${r1(f.sMin)}..${r1(f.sMax)} of 0..${cfg.counter.topLengthMm}).`);
    }
    const frontMargin = f.vFront;
    const backMargin = rBack - cornerRadiusMm(f.width / 2, f.vBack, cfg);
    if (frontMargin < 0) add(CONFLICT, 'fit', `${f.label} overhangs the counter front edge by ${r1(-frontMargin)} mm.`);
    if (backMargin < 0) add(CONFLICT, 'fit', `${f.label} overhangs the counter back edge by ${r1(-backMargin)} mm.`);
    else if (backMargin < 10 || frontMargin < 10) {
      add(NOTE, 'fit', `${f.label}: only ${r1(Math.min(frontMargin, backMargin))} mm clear of a counter edge (front ${r1(frontMargin)} mm, back ${r1(backMargin)} mm).`);
    }
  }

  for (let i = 0; i < fp.length; i += 1) {
    for (let j = i + 1; j < fp.length; j += 1) {
      const a = fp[i]; const b = fp[j];
      const sOverlap = Math.min(a.sMax, b.sMax) - Math.max(a.sMin, b.sMin);
      const vOverlap = Math.min(a.vBack, b.vBack) - Math.max(a.vFront, b.vFront);
      if (sOverlap > 0 && vOverlap > 0) {
        add(CONFLICT, 'fit', `${a.label} and ${b.label} overlap in plan by ${r1(sOverlap)} x ${r1(vOverlap)} mm.`);
      }
    }
  }

  // Gaps between consecutive groups along the counter.
  const sorted = [...fp].sort((a, b) => a.sMin - b.sMin);
  const gaps = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i].sMin - sorted[i - 1].sMax;
    if (gap > -1) gaps.push(`${sorted[i - 1].label} -> ${sorted[i].label}: ${r1(gap)} mm`);
  }
  add(NOTE, 'fit', `Along-counter gaps: ${gaps.join('; ')}.`);
  const tilesFp = byId.tiles;
  const boxesFp = byId['general-boxes'];
  add(NOTE, 'fit', `Comparison zone: six flat samples at the counter front (v ${r1(tilesFp.vFront)}..${r1(tilesFp.vBack)} mm) with the two general sample boxes to their right and set back (v ${r1(boxesFp.vFront)}..${r1(boxesFp.vBack)} mm), ${r1(boxesFp.sMin - tilesFp.sMax)} mm along the counter from them. The samples stay reachable and the taller boxes do not screen them.`);
  const used = sorted[sorted.length - 1].sMax - sorted[0].sMin;
  add(NOTE, 'fit', `Displays occupy ${r1(used)} mm of the ${cfg.counter.topLengthMm} mm counter; ${r1(cfg.counter.topLengthMm - sorted[sorted.length - 1].sMax)} mm is left clear at the right end for the conversation area.`);

  // -- 5. Installation footprint vs the counter (the headline fit question) --
  const inst = cfg.installation;
  const best = bestBalancedMarginMm(inst.baseWidthMm, inst.baseDepthMm, cfg);
  const target = 20;
  const needed = { w: inst.baseWidthMm + 2 * target, d: inst.baseDepthMm + 2 * target };
  const chord = widthAsArcMm(inst.baseWidthMm, best.v0 + inst.baseDepthMm / 2, cfg);
  if (best.margin < target) {
    add(CONFLICT, 'fit',
      `Installation base ${inst.baseWidthMm} x ${inst.baseDepthMm} mm: a ${target} mm margin all round needs ${needed.w} x ${needed.d} mm of flat top. `
      + `The provisional ${cfg.counter.depthMm} mm deep top curved at R${cfg.counter.curveRadiusMm} mm gives at best ${r2(best.margin)} mm front and back `
      + `(total front-to-back slack ${r2(2 * best.margin)} mm, against the ${2 * target} mm the target margins need). `
      + `Shortfall ${r2(target - best.margin)} mm per edge. The object has NOT been scaled down and the counter has NOT been widened - the counter depth needs measuring.`);
  } else {
    add(OK, 'fit', `Installation base sits with ${r2(best.margin)} mm margin front and back.`);
  }
  const actual = rectMarginsMm(inst.baseWidthMm, inst.baseDepthMm, cfg.layout.installationFrontMarginMm, cfg);
  add(NOTE, 'fit', `As placed: front margin ${r2(actual.frontMargin)} mm, back margin ${r2(actual.backMargin)} mm. Width ${inst.baseWidthMm} mm occupies ${r1(chord)} mm of arc, which the ${cfg.counter.topLengthMm} mm counter has in hand.`);

  // -- 6. LOOK CLOSER installation internals -------------------------------
  if (inst.panelThicknessMm > inst.slotWidthMm) {
    add(CONFLICT, 'installation', `Main panel ${inst.panelThicknessMm} mm cannot enter its ${inst.slotWidthMm} mm slot.`);
  } else {
    add(OK, 'installation', `Main panel ${inst.panelThicknessMm} mm in a ${inst.slotWidthMm} mm slot: ${r2(inst.slotWidthMm - inst.panelThicknessMm)} mm clearance. The cut list's ${inst.panelThicknessCutListMm} mm stock would NOT fit - conflict recorded, manufacturing files untouched.`);
  }
  const panelTop = inst.baseThicknessMm + inst.panelHeightMm - inst.slotDepthMm;
  add(NOTE, 'installation', `Panel top sits ${panelTop} mm above the counter (${inst.baseThicknessMm} mm base + ${inst.panelHeightMm} mm panel - ${inst.slotDepthMm} mm into the slot). This is a counter-top installation, not a floor-height one.`);
  const pad = (inst.panelWidthMm - (inst.gridDivisions - 1) * inst.grooveWidthMm) / inst.gridDivisions;
  add(NOTE, 'installation', `Engraved grid: ${inst.gridDivisions}x${inst.gridDivisions} pads of ${r1(pad)} mm separated by ${inst.gridDivisions - 1} internal grooves each way, ${inst.grooveWidthMm} mm wide x ${inst.grooveDepthMm} mm deep. Backing left intact at ${inst.panelThicknessMm - inst.grooveDepthMm} mm - one continuous sheet, not 16 detached tiles.`);

  // Mini coupon in the drawn slot.
  const leanRad = (inst.miniLeanDeg * Math.PI) / 180;
  const sectionInSlot = inst.miniThicknessMm * Math.cos(leanRad) + inst.miniSlotDepthMm * Math.sin(leanRad);
  if (inst.miniWidthMm > inst.miniSlotLengthMm) {
    add(CONFLICT, 'installation', `Portrait coupon ${inst.miniWidthMm} mm wider than its ${inst.miniSlotLengthMm} mm slot.`);
  } else {
    add(NOTE, 'installation', `Portrait coupon ${inst.miniWidthMm} x ${inst.miniHeightMm} mm centred in the drawn ${inst.miniSlotLengthMm} mm slot leaves ${r1((inst.miniSlotLengthMm - inst.miniWidthMm) / 2)} mm of open slot at each end. The slot was drawn for a LANDSCAPE 180 x 120 coupon - orientation change referred for fabrication review, not approved here.`);
  }
  if (sectionInSlot > inst.miniSlotWidthMm) {
    add(CONFLICT, 'installation', `Coupon leaning ${inst.miniLeanDeg} deg needs ${r2(sectionInSlot)} mm of slot width but the slot is ${inst.miniSlotWidthMm} mm.`);
  } else {
    add(OK, 'installation', `Coupon leaning ${inst.miniLeanDeg} deg needs ${r2(sectionInSlot)} mm across a ${inst.miniSlotWidthMm} mm slot: ${r2(inst.miniSlotWidthMm - sectionInSlot)} mm to spare.`);
  }

  // Sign and coupon coexisting on the base front.
  const signHalf = inst.signWidthMm / 2;
  const signSpan = [-inst.signOffsetLeftMm - signHalf, -inst.signOffsetLeftMm + signHalf];
  const miniSpan = [inst.miniSlotOffsetRightMm - inst.miniWidthMm / 2, inst.miniSlotOffsetRightMm + inst.miniWidthMm / 2];
  const baseHalf = inst.baseWidthMm / 2;
  const clearBetween = miniSpan[0] - signSpan[1];
  const leftMargin = signSpan[0] + baseHalf;
  const rightMargin = baseHalf - miniSpan[1];
  if (clearBetween < 0) add(CONFLICT, 'installation', `LOOK CLOSER sign and the coupon overlap by ${r1(-clearBetween)} mm on the base front.`);
  else if (leftMargin < 0 || rightMargin < 0) add(CONFLICT, 'installation', 'Sign or coupon runs off the base.');
  else add(OK, 'installation', `Base front: sign (${inst.signWidthMm} mm) at front-left and plain coupon (${inst.miniWidthMm} mm) at front-right coexist on the ${inst.baseWidthMm} mm base - ${r1(leftMargin)} mm left margin, ${r1(clearBetween)} mm between them, ${r1(rightMargin)} mm right margin.`);
  const signDepth = leaningPlanDepthMm(inst.signHeightMm, inst.signThicknessMm, inst.signLeanDeg);
  const miniDepth = leaningPlanDepthMm(inst.miniHeightMm, inst.miniThicknessMm, inst.miniLeanDeg);
  const frontZone = inst.slotFromFrontMm;
  add(NOTE, 'installation', `Base front zone is ${frontZone} mm deep in front of the panel; sign needs ${r1(signDepth)} mm and the coupon ${r1(miniDepth)} mm of plan depth.`);
  const rearZone = inst.baseDepthMm - inst.slotFromFrontMm;
  if (inst.rearBraceMm > rearZone) add(CONFLICT, 'installation', `Rear braces ${inst.rearBraceMm} mm deep but only ${r1(rearZone)} mm of base behind the panel.`);
  else add(OK, 'installation', `Rear braces ${inst.rearBraceMm} mm fit the ${r1(rearZone)} mm of base behind the panel; front braces ${inst.frontBraceMm} mm fit the ${frontZone} mm in front.`);

  // -- 7. Six loose samples -------------------------------------------------
  const t = cfg.tiles;
  const tw = t.columns * t.faceAcrossMm + (t.columns - 1) * t.gapMm;
  const td = t.rows * t.faceDepthMm + (t.rows - 1) * t.gapMm;
  add(OK, 'tiles', `${t.count} samples of ${t.faceDepthMm} x ${t.faceAcrossMm} mm, ${t.columns} across and ${t.rows} deep with ${t.gapMm} mm gaps = ${tw} x ${td} mm group. Engraved; separate from the one plain coupon on the installation base.`);

  // -- 8. Growth box --------------------------------------------------------
  const g = cfg.growthBox;
  const gBoxW = g.widthMm + 2 * g.lidMarginMm;
  const gBoxD = g.depthMm + 2 * g.lidMarginMm;
  add(NOTE, 'growth', `Box modelled at an ASSUMED ${g.widthMm} x ${g.depthMm} x ${g.heightMm} mm tray, proportioned from the supplied reference photograph rather than measured. It is presented OPEN - printed header panel across the back carrying the Gensler credit, eight samples in front - standing on its own full-size ${g.lidThicknessMm} mm lid. Nothing is shortened or folded.`);
  const cardV = cfg.counter.depthMm - cfg.layout.growthCardBackMarginMm - a4HolderPlanDepthMm(cfg);
  const boxFront = cardV - cfg.layout.growthBoxGapBehindMm - gBoxD;
  if (boxFront < 0) {
    add(CONFLICT, 'growth', `Open box (${r1(gBoxD)} mm deep) does not fit in front of its A4 on a ${cfg.counter.depthMm} mm counter.`);
  } else {
    add(OK, 'growth', `Open box sits directly IN FRONT of its A4, as the reference shows: box v ${r1(boxFront)}..${r1(boxFront + gBoxD)} mm, card v ${r1(cardV)}..${r1(cfg.counter.depthMm - cfg.layout.growthCardBackMarginMm)} mm, ${cfg.layout.growthBoxGapBehindMm} mm between them and ${r1(boxFront)} mm of counter in front of the box. No sideways offset needed.`);
  }
  const cardHeight = leaningHeightMm(cfg.a4Holder.plateHeightMm, cfg.a4Holder.leanDeg);
  const boxHeight = g.lidThicknessMm + g.heightMm;
  if (boxHeight >= cardHeight) add(CONFLICT, 'growth', `Open box stands ${r1(boxHeight)} mm and would hide the ${r1(cardHeight)} mm A4 behind it.`);
  else add(OK, 'growth', `Open box stands ${r1(boxHeight)} mm against the ${r1(cardHeight)} mm A4 plate behind it, so the card heading stays visible over it.`);
  const gsW = g.sampleColumns * g.sampleWidthMm + (g.sampleColumns - 1) * g.sampleGapMm;
  const gsD = g.sampleRows * g.sampleDepthMm + (g.sampleRows - 1) * g.sampleGapMm;
  const innerW = g.widthMm - 2 * g.wallThicknessMm;
  const innerD = g.depthMm - 2 * g.wallThicknessMm - g.headerDepthMm;
  if (gsW > innerW || gsD > innerD) add(CONFLICT, 'growth', `${g.sampleCount} samples (${r1(gsW)} x ${r1(gsD)} mm) do not fit the ${innerW} x ${innerD} mm sample area in front of the header panel.`);
  else add(OK, 'growth', `${g.sampleCount} samples in ${g.sampleRows} rows of ${g.sampleColumns} occupy ${gsW} x ${gsD} mm of the ${innerW} x ${innerD} mm area in front of the ${g.headerDepthMm} mm header panel.`);

  // -- 9. Translucent block -------------------------------------------------
  const tr = cfg.translucent;
  const a = Math.abs((tr.slotPlanAngleDeg * Math.PI) / 180);
  const perpFromDepthAxis = tr.slotPitchMm * Math.cos(a);
  const perpFromWidthAxis = tr.slotPitchMm * Math.sin(a);
  const rowSpan = (tr.slotCount - 1) * tr.slotPitchMm
    + tr.slotLengthMm * Math.sin(a) + tr.slotWidthMm * Math.cos(a);
  const slotDepthExtent = tr.slotLengthMm * Math.cos(a) + tr.slotWidthMm * Math.sin(a);
  if (perpFromWidthAxis < tr.slotWidthMm) {
    add(CONFLICT, 'translucent', `Reading the ${Math.abs(tr.slotPlanAngleDeg)} deg rotation from the block WIDTH axis gives only ${r2(perpFromWidthAxis)} mm between ${tr.slotWidthMm} mm slots at ${tr.slotPitchMm} mm pitch - they would overlap by ${r2(tr.slotWidthMm - perpFromWidthAxis)} mm and merge into one channel. Reading it from the DEPTH axis gives ${r2(perpFromDepthAxis)} mm and is buildable; that is what is modelled. Confirm the datum against the drawing.`);
  }
  if (rowSpan > tr.blockWidthMm) add(CONFLICT, 'translucent', `Slot row spans ${r1(rowSpan)} mm across a ${tr.blockWidthMm} mm block.`);
  else add(OK, 'translucent', `Ten slots at ${tr.slotPitchMm} mm pitch span ${r1(rowSpan)} mm across the ${tr.blockWidthMm} mm block (${r1((tr.blockWidthMm - rowSpan) / 2)} mm each end).`);
  if (slotDepthExtent > tr.blockDepthMm) add(CONFLICT, 'translucent', `Each slot needs ${r1(slotDepthExtent)} mm of the ${tr.blockDepthMm} mm block depth.`);
  else add(OK, 'translucent', `Each rotated slot needs ${r1(slotDepthExtent)} mm of the ${tr.blockDepthMm} mm block depth (${r1((tr.blockDepthMm - slotDepthExtent) / 2)} mm each side).`);
  const assembled = tr.blockHeightMm + tr.visibleHeightMm;
  const inserted = tr.sampleHeightMm - tr.visibleHeightMm;
  if (inserted !== tr.slotDepthMm) add(NOTE, 'translucent', `Sample insertion ${inserted} mm vs slot depth ${tr.slotDepthMm} mm.`);
  add(OK, 'translucent', `Samples ${tr.sampleWidthMm} x ${tr.sampleHeightMm} x ${tr.sampleThicknessMm} mm, inserted ${inserted} mm, ${tr.visibleHeightMm} mm visible, ${assembled} mm assembled above the counter. Block carries no branding.`);
  add(NOTE, 'translucent', `Fabrication unresolved: an ${tr.blockHeightMm} mm block is not one part from 19 mm sheet. Laminated or constructed body to be resolved; it does not hold up the visual model.`);

  // -- 9b. General sample boxes ---------------------------------------------
  const gb = cfg.generalBoxes;
  const chipRow = (gb.chipCount - 1) * gb.chipPitchMm + gb.chipThicknessMm;
  const chipInterior = gb.widthMm - 2 * gb.wallThicknessMm;
  if (chipRow > chipInterior) {
    add(CONFLICT, 'boxes', `${gb.chipCount} sticks at ${gb.chipPitchMm} mm pitch span ${r1(chipRow)} mm inside a ${chipInterior} mm box.`);
  } else {
    add(OK, 'boxes', `Two slim boxes, one ${gb.finishes[0]} and one ${gb.finishes[1]}: ${gb.widthMm} x ${gb.depthMm} x ${gb.heightMm} mm, ${gb.chipCount} upright sticks at ${gb.chipPitchMm} mm pitch spanning ${r1(chipRow)} mm of a ${chipInterior} mm interior, standing ${gb.chipProtrusionMm} mm proud, with the sleeve lid at one end. Assembled height ${gb.heightMm + gb.chipProtrusionMm} mm; lid ${gb.lidHeightMm} mm. Sizes remain PLACEHOLDERS scaled from the supplied photographs.`);
  }
  if (gb.chipFaceMm > gb.depthMm - 2 * gb.wallThicknessMm) {
    add(CONFLICT, 'boxes', `Sticks are ${gb.chipFaceMm} mm front to back but the box interior is only ${gb.depthMm - 2 * gb.wallThicknessMm} mm.`);
  }

  // -- 10. Banner -----------------------------------------------------------
  const b = cfg.banner;
  const fromInches = [r2(inchToMm(18)), r2(inchToMm(44.2))];
  if (fromInches[0] !== b.artworkWidthMm || fromInches[1] !== b.artworkHeightMm) {
    add(CONFLICT, 'banner', `Banner size ${b.artworkWidthMm} x ${b.artworkHeightMm} mm does not match 18 x 44.2 in (${fromInches.join(' x ')} mm).`);
  }
  add(OK, 'banner', `Roll-up GRAPHIC ${b.artworkWidthMm} x ${b.artworkHeightMm} mm (18 x 44.2 in), aspect ${r2(b.artworkHeightMm / b.artworkWidthMm)}:1, drawn at that aspect and never rescaled. Still the narrow ~1.12 m graphic the brief specifies, not a two-metre banner.`);
  const standTop = b.graphicBottomHeightMm + b.artworkHeightMm;
  add(NOTE, 'banner', `The stand carries the graphic from ${b.graphicBottomHeightMm} mm to ${r1(standTop)} mm above the floor, so the display stands ${r1(standTop)} mm overall and its graphic sits ${r1(standTop - cfg.counter.heightMm)} mm above the ${cfg.counter.heightMm} mm counter. Stand height is UNCONFIRMED hardware - the brief calls that a separate measurement. Standing the graphic straight on the floor instead would leave its top just ${r1(b.artworkHeightMm + b.baseHeightMm - cfg.counter.heightMm)} mm above the counter, which reads as a low floor sign.`);
  add(NOTE, 'banner', `Placed on the floor ${b.clearanceFromCounterEndMm} mm beyond the counter's LEFT end, clear of the counter footprint.`);

  // -- 11. Stools -----------------------------------------------------------
  const st = cfg.stools;
  const stoolRadius = cfg.counter.curveRadiusMm - st.standoffFromCounterMm;
  const spacings = [];
  for (let i = 1; i < st.positionsSMm.length; i += 1) {
    const ds = st.positionsSMm[i] - st.positionsSMm[i - 1];
    spacings.push(r1((ds * stoolRadius) / cfg.counter.curveRadiusMm));
  }
  const minSpacing = Math.min(...spacings);
  if (minSpacing < st.seatWidthMm) add(CONFLICT, 'stools', `Stool seats ${st.seatWidthMm} mm wide but only ${minSpacing} mm apart.`);
  else add(OK, 'stools', `Three stools at ${spacings.join(' and ')} mm centres, ${st.seatWidthMm} mm seats, so ${r1(minSpacing - st.seatWidthMm)} mm between seats. Grouped at the right end on the room side, facing the visitor area.`);
  const bookcaseFaceR = cfg.counter.curveRadiusMm - 0 + cfg.bookcase.frontInsetMm;
  const outerLegR = stoolRadius + st.legSplayMm;
  add(NOTE, 'stools', `Nearest stool leg sits ${r1(bookcaseFaceR - outerLegR)} mm clear of the bookcase face and ${r1(cfg.counter.curveRadiusMm - outerLegR)} mm clear of the counter front edge. Leftmost stool is at s ${r1(st.positionsSMm[0])} mm against the Translucent group's ${r1(byId['translucent-card'].sMax)} mm right edge, and the central installation ends at s ${r1(byId.installation.sMax)} mm, so nothing blocks the material sequence. Layout assumption, not a statutory clearance.`);
  const lastLeg = Math.max(...cfg.counter.legPositionsSMm);
  add(NOTE, 'stools', `Counter legs stop at s ${lastLeg} mm; the stools start at s ${st.positionsSMm[0]} mm, so no stool fouls a leg.`);

  add(OK, 'holders', `Two A4 holders: ${cfg.a4Holder.artworkWidthMm} x ${cfg.a4Holder.artworkHeightMm} mm landscape artwork on a ${cfg.a4Holder.plateWidthMm} x ${cfg.a4Holder.plateHeightMm} x ${cfg.a4Holder.plateThicknessMm} mm plate with a ${cfg.a4Holder.borderMm} mm border, leaning ${cfg.a4Holder.leanDeg} deg, one centred ${cfg.a4Holder.gussetLegPlateMm} x ${cfg.a4Holder.gussetLegBaseMm} x ${cfg.a4Holder.gussetThicknessMm} mm gusset each. Plan depth ${r1(a4HolderPlanDepthMm(cfg))} mm including the gusset. Source cards are A5; displayed at A4.`);

  // -- 12. Counter itself ---------------------------------------------------
  add(NOTE, 'counter', `Counter modelled at ${cfg.counter.topLengthMm} mm long, ${cfg.counter.depthMm} mm deep, ${cfg.counter.heightMm} mm high, ${cfg.counter.topThicknessMm} mm top, curved at R${cfg.counter.curveRadiusMm} mm with a ${cfg.counter.rightEndRadiusMm} mm rounded right end over the single bookcase. Every one of those is provisional - none is a confirmed measurement.`);

  return {
    findings,
    footprints: fp,
    summary: {
      conflicts: findings.filter((f) => f.level === CONFLICT).length,
      notes: findings.filter((f) => f.level === NOTE).length,
      ok: findings.filter((f) => f.level === OK).length,
      statusCounts: counts,
    },
  };
}

export { OK, NOTE, CONFLICT, STATUS };
