// ---------------------------------------------------------------------------
// Placement geometry for the curved counter.
// ---------------------------------------------------------------------------
// Dimensions live in config.js; PLACEMENT lives here. Moving a group must never
// change its size, so nothing in this file scales anything.
//
// World axes (visitor standing in the room, looking at the counter/windows):
//   +X  to the visitor's right
//   +Y  up
//   +Z  toward the visitor (the room).  The windows are at -Z.
//
// Counter coordinates:
//   s  = distance along the FRONT-edge arc, measured from the LEFT end (mm)
//   v  = distance BEHIND the front edge (0 = front edge, depthMm = back edge)
//
// The bay bows away from the room, so the counter is CONCAVE toward the room:
// its centre of curvature sits in the room, in front of the counter.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';

/** World z of the centre of curvature (in the room, in front of the counter). */
export function centreZMm(cfg = CONFIG) {
  return cfg.counter.curveRadiusMm + cfg.counter.middleFrontZMm;
}

/** Polar angle (radians) of a point at arc position s. 0 = counter mid-length. */
export function phiAtS(s, cfg = CONFIG) {
  return (s - cfg.counter.topLengthMm / 2) / cfg.counter.curveRadiusMm;
}

/** Half the counter's angular sweep, in radians. */
export function halfSweep(cfg = CONFIG) {
  return cfg.counter.topLengthMm / (2 * cfg.counter.curveRadiusMm);
}

/** World position (mm) of counter coordinate (s, v). */
export function pointAtMm(s, v, cfg = CONFIG) {
  const phi = phiAtS(s, cfg);
  const r = cfg.counter.curveRadiusMm + v;
  return { x: r * Math.sin(phi), z: centreZMm(cfg) - r * Math.cos(phi) };
}

/**
 * Yaw (radians) for an object at arc position s, so that the object's local +Z
 * points at the visitor, square to the counter's local tangent. Signs and
 * labels therefore stay readable from the room.
 */
export function yawAtS(s, cfg = CONFIG) {
  return -phiAtS(s, cfg);
}

/** World y (mm) of the counter top surface. */
export function counterTopYMm(cfg = CONFIG) {
  return cfg.counter.heightMm;
}

/**
 * Radius of a rectangle corner placed tangentially on the counter.
 * u = half-width across the counter, v = depth behind the front edge.
 * Used by every fit check: the curve pushes wide objects' corners outward.
 */
export function cornerRadiusMm(u, v, cfg = CONFIG) {
  const r = cfg.counter.curveRadiusMm + v;
  return Math.hypot(r, u);
}

/**
 * Front/back margins actually available to a rectangle of the given width and
 * depth, placed with its front edge v0 behind the counter's front edge.
 * Returns the WORST-CASE (smallest) margin on each edge, which is what matters.
 */
export function rectMarginsMm(widthMm, depthMm, v0, cfg = CONFIG) {
  const u = widthMm / 2;
  const rFront = cfg.counter.curveRadiusMm;
  const rBack = rFront + cfg.counter.depthMm;
  // Front edge: nearest point to the centre of curvature is at u = 0.
  const frontMargin = v0;
  // Back edge: furthest point from the centre of curvature is at u = +/- width/2.
  const backMargin = rBack - cornerRadiusMm(u, v0 + depthMm, cfg);
  return { frontMargin, backMargin, min: Math.min(frontMargin, backMargin) };
}

/**
 * The largest margin that can be achieved front AND back for a given rectangle,
 * and the v0 that achieves it. If `best` is below the target margin the object
 * does not comfortably fit - that is reported, never hidden.
 */
export function bestBalancedMarginMm(widthMm, depthMm, cfg = CONFIG) {
  // Binary search on v0 for the point where front and back margins are equal.
  let lo = 0;
  let hi = cfg.counter.depthMm - depthMm;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    const m = rectMarginsMm(widthMm, depthMm, mid, cfg);
    if (m.frontMargin < m.backMargin) lo = mid;
    else hi = mid;
  }
  const v0 = (lo + hi) / 2;
  const m = rectMarginsMm(widthMm, depthMm, v0, cfg);
  return { v0, margin: m.min, front: m.frontMargin, back: m.backMargin };
}

/** Arc length (mm) that a chord of the given width subtends at depth v. */
export function widthAsArcMm(widthMm, v, cfg = CONFIG) {
  const r = cfg.counter.curveRadiusMm + v;
  return 2 * r * Math.asin(Math.min(1, widthMm / (2 * r)));
}

// ---------------------------------------------------------------------------
// Derived footprints for every counter group, in counter coordinates.
// One function, so the scene and the fit report can never disagree.
// ---------------------------------------------------------------------------

/** Plan depth of a leaning plate: the depth its footprint actually occupies. */
export function leaningPlanDepthMm(plateHeightMm, thicknessMm, leanDeg) {
  const a = (leanDeg * Math.PI) / 180;
  return plateHeightMm * Math.sin(a) + thicknessMm * Math.cos(a);
}

/** Vertical height of a leaning plate above its resting surface. */
export function leaningHeightMm(plateHeightMm, leanDeg) {
  return plateHeightMm * Math.cos((leanDeg * Math.PI) / 180);
}

/**
 * Plan depth of a complete A4 holder: whichever reaches further back, the
 * leaning plate itself or the gusset standing behind it.
 */
export function a4HolderPlanDepthMm(cfg = CONFIG) {
  const h = cfg.a4Holder;
  const plate = leaningPlanDepthMm(h.plateHeightMm, h.plateThicknessMm, h.leanDeg);
  const gusset = h.plateThicknessMm * Math.cos((h.leanDeg * Math.PI) / 180) + h.gussetLegBaseMm;
  return Math.max(plate, gusset);
}

export function footprints(cfg = CONFIG) {
  const L = cfg.layout;
  const depth = cfg.counter.depthMm;
  const holderDepth = a4HolderPlanDepthMm(cfg);
  const coverProjection =
    cfg.growthBox.depthMm * Math.cos((cfg.growthBox.coverOpenAngleDeg * Math.PI) / 180);

  const list = [];
  const add = (id, label, sCentre, width, vFront, vDepth, note) => {
    list.push({
      id,
      label,
      sCentre,
      width,
      sMin: sCentre - widthAsArcMm(width, vFront + vDepth / 2, cfg) / 2,
      sMax: sCentre + widthAsArcMm(width, vFront + vDepth / 2, cfg) / 2,
      vFront,
      vBack: vFront + vDepth,
      depth: vDepth,
      note: note || '',
    });
  };

  // 1. Brochures
  const brochureWidth =
    cfg.brochures.widthMm + cfg.brochures.fanOffsetXMm * (cfg.brochures.count - 1);
  const brochureDepth =
    cfg.brochures.depthMm + cfg.brochures.fanOffsetZMm * (cfg.brochures.count - 1);
  add('brochures', 'Three brochures', L.brochuresSMm, brochureWidth,
    L.brochuresVMm - brochureDepth / 2, brochureDepth);

  // 2. Growth A4 + open Growth box
  add('growth-card', 'Growth Collection A4', L.growthCardSMm, cfg.a4Holder.plateWidthMm,
    depth - L.growthCardBackMarginMm - holderDepth, holderDepth);
  add('growth-box', 'Growth sample box (open)', L.growthBoxSMm, cfg.growthBox.widthMm,
    depth - L.growthBoxBackMarginMm - coverProjection - cfg.growthBox.depthMm,
    coverProjection + cfg.growthBox.depthMm,
    `includes ${coverProjection.toFixed(1)} mm of propped cover behind the tray`);

  // 3. LOOK CLOSER installation
  add('installation', 'LOOK CLOSER installation', L.installationSMm, cfg.installation.baseWidthMm,
    L.installationFrontMarginMm, cfg.installation.baseDepthMm);

  // 4. Six engraved tiles + two general boxes
  const tileWidth =
    cfg.tiles.columns * cfg.tiles.faceAcrossMm + (cfg.tiles.columns - 1) * cfg.tiles.gapMm;
  const tileDepth =
    cfg.tiles.rows * cfg.tiles.faceDepthMm + (cfg.tiles.rows - 1) * cfg.tiles.gapMm;
  add('tiles', 'Six engraved samples', L.tilesSMm, tileWidth, L.tilesFrontMarginMm, tileDepth);
  const boxesWidth =
    cfg.generalBoxes.count * cfg.generalBoxes.widthMm
    + (cfg.generalBoxes.count - 1) * cfg.generalBoxes.gapMm;
  add('general-boxes', 'Two general sample boxes', L.generalBoxesSMm, boxesWidth,
    L.generalBoxesVFrontMm, cfg.generalBoxes.depthMm);

  // 5. Translucent block + A4
  add('translucent-card', 'Translucent Collection A4', L.translucentCardSMm, cfg.a4Holder.plateWidthMm,
    depth - L.translucentCardBackMarginMm - holderDepth, holderDepth);
  add('translucent-block', 'Translucent block', L.translucentBlockSMm, cfg.translucent.blockWidthMm,
    L.translucentBlockVFrontMm, cfg.translucent.blockDepthMm);

  return list;
}
