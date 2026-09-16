// ---------------------------------------------------------------------------
// Optional dimension overlay. OFF by default.
// Colour tells you how much to trust a number:
//   green  = specified in the brief / holder PDF
//   amber  = provisional estimate, placeholder or modelling assumption
//   red    = conflict to resolve before anything is made
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mm } from './units.js';
import { CONFIG, STATUS } from './config.js';
import { pointAtMm, centreZMm } from './layout.js';

const COLOUR = {
  [STATUS.SPECIFIED]: 0x1f7a3d,
  [STATUS.PROVISIONAL]: 0xd2760a,
  [STATUS.CONFLICT]: 0xc22f2f,
};

export const LEGEND = [
  { status: STATUS.SPECIFIED, label: 'specified', hex: '#1f7a3d' },
  { status: STATUS.PROVISIONAL, label: 'provisional / assumed', hex: '#d2760a' },
  { status: STATUS.CONFLICT, label: 'conflict to resolve', hex: '#c22f2f' },
];

function labelSprite(text, status) {
  const pad = 10;
  const font = '600 30px "Helvetica Neue", Arial, sans-serif';
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + pad * 2;
  const h = 46;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.94)';
  g.strokeStyle = `#${COLOUR[status].toString(16).padStart(6, '0')}`;
  g.lineWidth = 3;
  // Hand-rolled rounded rectangle: ctx.roundRect() is too new to rely on.
  const r = 7; const x0 = 1.5; const y0 = 1.5; const x1 = w - 1.5; const y1 = h - 1.5;
  g.beginPath();
  g.moveTo(x0 + r, y0);
  g.lineTo(x1 - r, y0);
  g.quadraticCurveTo(x1, y0, x1, y0 + r);
  g.lineTo(x1, y1 - r);
  g.quadraticCurveTo(x1, y1, x1 - r, y1);
  g.lineTo(x0 + r, y1);
  g.quadraticCurveTo(x0, y1, x0, y1 - r);
  g.lineTo(x0, y0 + r);
  g.quadraticCurveTo(x0, y0, x0 + r, y0);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#1a1a1a';
  g.font = font;
  g.textBaseline = 'middle';
  g.fillText(text, pad, h / 2 + 1);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, depthTest: false, depthWrite: false, transparent: true,
  }));
  sprite.scale.set((w / h) * 0.052, 0.052, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function dimension(a, b, text, status, offset = new THREE.Vector3()) {
  const g = new THREE.Group();
  const from = a.clone().add(offset);
  const to = b.clone().add(offset);
  const mat = new THREE.LineBasicMaterial({ color: COLOUR[status], depthTest: false, transparent: true, opacity: 0.95 });
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), mat));

  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  const upish = Math.abs(dir.y) > 0.8 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tick = new THREE.Vector3().crossVectors(dir, upish).normalize().multiplyScalar(0.022);
  for (const p of [from, to]) {
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([p.clone().add(tick), p.clone().sub(tick)]), mat,
    ));
  }
  // leader lines back to the measured feature
  const leader = new THREE.LineDashedMaterial({ color: COLOUR[status], dashSize: 0.02, gapSize: 0.016, depthTest: false, transparent: true, opacity: 0.6 });
  for (const [p, q] of [[a, from], [b, to]]) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, q]), leader);
    line.computeLineDistances();
    g.add(line);
  }

  const label = labelSprite(text, status);
  label.position.copy(from).add(to).multiplyScalar(0.5);
  g.add(label);
  g.renderOrder = 998;
  return g;
}

/** A callout with no measured length: used to flag a conflict at a location. */
function annotation(at, text, status, offset) {
  const g = new THREE.Group();
  const to = at.clone().add(offset);
  const mat = new THREE.LineDashedMaterial({
    color: COLOUR[status], dashSize: 0.02, gapSize: 0.016,
    depthTest: false, transparent: true, opacity: 0.75,
  });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([at, to]), mat);
  line.computeLineDistances();
  g.add(line);
  const label = labelSprite(text, status);
  label.position.copy(to);
  g.add(label);
  g.renderOrder = 998;
  return g;
}

export function buildDimensionOverlay() {
  const cfg = CONFIG;
  const root = new THREE.Group();
  root.name = 'dimension-overlay';
  root.visible = false;

  const V = (xMm, yMm, zMm) => new THREE.Vector3(mm(xMm), mm(yMm), mm(zMm));
  const add = (...args) => root.add(dimension(...args));
  const flag = (...args) => root.add(annotation(...args));
  const topY = cfg.counter.heightMm;

  // -- counter (all provisional) -------------------------------------------
  const lEnd = pointAtMm(0, 0);
  const rEnd = pointAtMm(cfg.counter.topLengthMm, 0);
  add(V(lEnd.x, topY, lEnd.z), V(rEnd.x, topY, rEnd.z),
    `counter ${cfg.counter.topLengthMm} mm (estimated)`, STATUS.PROVISIONAL, V(0, 700, 340));
  const midF = pointAtMm(cfg.counter.topLengthMm / 2, 0);
  const midB = pointAtMm(cfg.counter.topLengthMm / 2, cfg.counter.depthMm);
  add(V(midF.x, topY, midF.z), V(midB.x, topY, midB.z),
    `depth ${cfg.counter.depthMm} mm (estimated)`, STATUS.PROVISIONAL, V(-1150, 480, 0));
  add(V(rEnd.x + 340, 0, rEnd.z), V(rEnd.x + 340, topY, rEnd.z),
    `height ${cfg.counter.heightMm} mm (estimated)`, STATUS.PROVISIONAL);
  add(V(rEnd.x + 560, topY - cfg.counter.topThicknessMm, rEnd.z), V(rEnd.x + 560, topY, rEnd.z),
    `top ${cfg.counter.topThicknessMm} mm — legacy says 45`, STATUS.CONFLICT);

  // -- installation ---------------------------------------------------------
  const inst = cfg.installation;
  const iS = cfg.layout.installationSMm;
  const iF = pointAtMm(iS, cfg.layout.installationFrontMarginMm);
  const iB = pointAtMm(iS, cfg.layout.installationFrontMarginMm + inst.baseDepthMm);
  const half = inst.baseWidthMm / 2;
  const iL = pointAtMm(iS - half, cfg.layout.installationFrontMarginMm + inst.baseDepthMm / 2);
  const iR = pointAtMm(iS + half, cfg.layout.installationFrontMarginMm + inst.baseDepthMm / 2);
  add(V(iL.x, topY, iL.z), V(iR.x, topY, iR.z), `base ${inst.baseWidthMm} mm`, STATUS.SPECIFIED, V(0, 18, 300));
  add(V(iF.x, topY, iF.z), V(iB.x, topY, iB.z), `base ${inst.baseDepthMm} mm`, STATUS.SPECIFIED, V(-480, 18, 0));
  add(V(iR.x + 150, topY, iR.z), V(iR.x + 150, topY + inst.baseThicknessMm + inst.panelHeightMm - inst.slotDepthMm, iR.z),
    `panel top ${inst.baseThicknessMm + inst.panelHeightMm - inst.slotDepthMm} mm`, STATUS.SPECIFIED);
  add(V(iL.x - 150, topY + inst.baseThicknessMm, iL.z),
    V(iL.x - 150, topY + inst.baseThicknessMm + inst.panelHeightMm, iL.z),
    `panel ${inst.panelWidthMm} x ${inst.panelHeightMm} mm`, STATUS.SPECIFIED);
  flag(V(iF.x, topY + inst.baseThicknessMm + inst.panelHeightMm / 2, iF.z - inst.baseDepthMm / 2),
    `panel ${inst.panelThicknessMm} mm — cut list says ${inst.panelThicknessCutListMm}`, STATUS.CONFLICT, V(0, 300, 60));
  flag(V(iF.x, topY, iF.z),
    `edge margin ${cfg.layout.installationFrontMarginMm} mm — 20 mm not achievable`, STATUS.CONFLICT, V(0, 150, 560));

  // -- removable coupon -----------------------------------------------------
  const mS = iS + inst.miniSlotOffsetRightMm;
  const mP = pointAtMm(mS, cfg.layout.installationFrontMarginMm + inst.baseDepthMm - inst.miniSlotFromFrontMm);
  add(V(mP.x + 130, topY + inst.baseThicknessMm, mP.z),
    V(mP.x + 130, topY + inst.baseThicknessMm + inst.miniHeightMm, mP.z),
    `plain coupon ${inst.miniWidthMm} x ${inst.miniHeightMm} mm, portrait`, STATUS.SPECIFIED);
  flag(V(mP.x, topY + inst.baseThicknessMm, mP.z),
    'slot drawn for landscape 180 x 120', STATUS.CONFLICT, V(0, -120, 430));

  // -- translucent ----------------------------------------------------------
  const tr = cfg.translucent;
  const tS = cfg.layout.translucentBlockSMm;
  const tP = pointAtMm(tS + tr.blockWidthMm / 2 + 120, cfg.layout.translucentBlockVFrontMm + tr.blockDepthMm / 2);
  add(V(tP.x, topY, tP.z), V(tP.x, topY + tr.blockHeightMm, tP.z), `block ${tr.blockHeightMm} mm`, STATUS.SPECIFIED);
  add(V(tP.x + 140, topY, tP.z), V(tP.x + 140, topY + tr.blockHeightMm + tr.visibleHeightMm, tP.z),
    `assembled ${tr.blockHeightMm + tr.visibleHeightMm} mm`, STATUS.SPECIFIED);
  const tL = pointAtMm(tS - tr.blockWidthMm / 2, cfg.layout.translucentBlockVFrontMm + tr.blockDepthMm / 2);
  const tR = pointAtMm(tS + tr.blockWidthMm / 2, cfg.layout.translucentBlockVFrontMm + tr.blockDepthMm / 2);
  add(V(tL.x, topY, tL.z), V(tR.x, topY, tR.z), `block ${tr.blockWidthMm} mm`, STATUS.SPECIFIED, V(0, 300, 240));
  flag(V(tL.x, topY + cfg.translucent.blockHeightMm, tL.z),
    'slot rotation datum unconfirmed', STATUS.CONFLICT, V(0, 560, 220));

  // -- six samples ----------------------------------------------------------
  const t6 = cfg.tiles;
  const tw = t6.columns * t6.faceAcrossMm + (t6.columns - 1) * t6.gapMm;
  const td = t6.rows * t6.faceDepthMm + (t6.rows - 1) * t6.gapMm;
  const sS = cfg.layout.tilesSMm;
  const s1 = pointAtMm(sS - tw / 2, cfg.layout.tilesFrontMarginMm);
  const s2 = pointAtMm(sS + tw / 2, cfg.layout.tilesFrontMarginMm);
  add(V(s1.x, topY, s1.z), V(s2.x, topY, s2.z), `six samples ${tw} x ${td} mm`, STATUS.SPECIFIED, V(0, 260, 260));

  // -- Growth box -----------------------------------------------------------
  const gb = cfg.growthBox;
  const gS = cfg.layout.growthSMm;
  const g1 = pointAtMm(gS - gb.widthMm / 2, 200);
  const g2 = pointAtMm(gS + gb.widthMm / 2, 200);
  add(V(g1.x, topY, g1.z), V(g2.x, topY, g2.z),
    `Growth box ${gb.widthMm} x ${gb.depthMm} mm — ASSUMED`, STATUS.PROVISIONAL, V(0, 560, 260));

  // -- A4 holder ------------------------------------------------------------
  const h = cfg.a4Holder;
  const aS = cfg.layout.translucentCardSMm;
  const aP = pointAtMm(aS - h.plateWidthMm / 2 - 110, cfg.counter.depthMm - 60);
  add(V(aP.x, topY, aP.z), V(aP.x, topY + h.plateHeightMm * Math.cos(h.leanDeg * Math.PI / 180), aP.z),
    `A4 plate ${h.plateWidthMm} x ${h.plateHeightMm} mm`, STATUS.SPECIFIED);

  // -- banner ---------------------------------------------------------------
  const b = cfg.banner;
  const bPhi = -(cfg.counter.topLengthMm / 2 + b.clearanceFromCounterEndMm + b.artworkWidthMm / 2) / cfg.counter.curveRadiusMm;
  const bx = cfg.counter.curveRadiusMm * Math.sin(bPhi);
  const bz = centreZMm() - cfg.counter.curveRadiusMm * Math.cos(bPhi);
  const gy0 = b.graphicBottomHeightMm;
  const gy1 = gy0 + b.artworkHeightMm;
  add(V(bx - b.artworkWidthMm / 2 - 200, gy0, bz), V(bx - b.artworkWidthMm / 2 - 200, gy1, bz),
    `graphic ${b.artworkHeightMm} mm high`, STATUS.SPECIFIED);
  add(V(bx - b.artworkWidthMm / 2, gy1 + 160, bz), V(bx + b.artworkWidthMm / 2, gy1 + 160, bz),
    `${b.artworkWidthMm} mm wide`, STATUS.SPECIFIED);
  add(V(bx + b.artworkWidthMm / 2 + 220, 0, bz), V(bx + b.artworkWidthMm / 2 + 220, gy0, bz),
    `stand ${gy0} mm — hardware unconfirmed`, STATUS.PROVISIONAL);

  return root;
}
