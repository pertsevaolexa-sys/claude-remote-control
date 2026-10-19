// A 2D camera over world space (millimetres). World point (x, y) is shown at
// the screen anchor; k is screen pixels per millimetre. Scenes render world
// geometry in an SVG whose viewBox is derived from the camera, so lines stay
// sharp at any zoom and images are only rasterised where visible.

import { Pt, lerp } from "./polyline";

export type Camera = { x: number; y: number; k: number };

export const viewBox = (
  cam: Camera,
  width: number,
  height: number,
  ax: number,
  ay: number,
) =>
  `${cam.x - ax / cam.k} ${cam.y - ay / cam.k} ${width / cam.k} ${height / cam.k}`;

export const toScreen = (cam: Camera, ax: number, ay: number, p: Pt): Pt => [
  ax + (p[0] - cam.x) * cam.k,
  ay + (p[1] - cam.y) * cam.k,
];

// Interpolate zoom in log space so a 20x pull-back feels even throughout.
export const lerpCamera = (a: Camera, b: Camera, t: number): Camera => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  k: Math.exp(lerp(Math.log(a.k), Math.log(b.k), t)),
});

// Pull back (or push in) between two cameras. The centre moves in proportion
// to the change in view size, so at high zoom it barely drifts and the move
// reads as one continuous pull-back rather than a pan.
export const pullCamera = (a: Camera, b: Camera, t: number): Camera => {
  const k = Math.exp(lerp(Math.log(a.k), Math.log(b.k), t));
  const w = a.k === b.k ? t : (1 / k - 1 / a.k) / (1 / b.k - 1 / a.k);
  return { k, x: lerp(a.x, b.x, w), y: lerp(a.y, b.y, w) };
};

// Zoom so that world point `focus` travels in a straight line on screen from
// where it is under camera a to where it is under camera b. Reads as a single
// deliberate camera move instead of a zoom plus a drift.
export const zoomTowards = (
  a: Camera,
  b: Camera,
  focus: Pt,
  t: number,
  ax: number,
  ay: number,
): Camera => {
  const k = Math.exp(lerp(Math.log(a.k), Math.log(b.k), t));
  const sa = toScreen(a, ax, ay, focus);
  const sb = toScreen(b, ax, ay, focus);
  const s: Pt = [lerp(sa[0], sb[0], t), lerp(sa[1], sb[1], t)];
  return { k, x: focus[0] - (s[0] - ax) / k, y: focus[1] - (s[1] - ay) / k };
};

// Isometric projection used by the delivery stacks (scene 05).
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

export type Iso = { ox: number; oy: number; s: number; zScale: number };

export const isoPoint = (iso: Iso, x: number, y: number, z: number): Pt => [
  iso.ox + (x - y) * COS30 * iso.s,
  iso.oy + (x + y) * SIN30 * iso.s - z * iso.s * iso.zScale,
];

// SVG matrix mapping plan coordinates (x, y) at height z onto the screen.
export const isoTopMatrix = (iso: Iso, z: number) =>
  `matrix(${COS30 * iso.s} ${SIN30 * iso.s} ${-COS30 * iso.s} ${SIN30 * iso.s} ${iso.ox} ${iso.oy - z * iso.s * iso.zScale})`;

// Front face (+y side) at plan depth y0: maps (x, z) onto the screen.
export const isoFrontMatrix = (iso: Iso, y0: number) =>
  `matrix(${COS30 * iso.s} ${SIN30 * iso.s} 0 ${-iso.s * iso.zScale} ${iso.ox - y0 * COS30 * iso.s} ${iso.oy + y0 * SIN30 * iso.s})`;

// Right face (+x side) at plan x0: maps (y, z) onto the screen.
export const isoRightMatrix = (iso: Iso, x0: number) =>
  `matrix(${-COS30 * iso.s} ${SIN30 * iso.s} 0 ${-iso.s * iso.zScale} ${iso.ox + x0 * COS30 * iso.s} ${iso.oy + x0 * SIN30 * iso.s})`;
