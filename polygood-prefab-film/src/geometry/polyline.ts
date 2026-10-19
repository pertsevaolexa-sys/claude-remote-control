// Small polyline toolkit. All drawn geometry is polylines, so partial reveals,
// tool-head positions and morphs are computed here rather than measured from
// the DOM, which keeps every frame deterministic.

export type Pt = readonly [number, number];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export const lerpPt = (a: Pt, b: Pt, t: number): Pt => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
];

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export const cumulative = (pts: readonly Pt[]): number[] => {
  const out = [0];
  for (let i = 1; i < pts.length; i++)
    out.push(out[i - 1] + dist(pts[i - 1], pts[i]));
  return out;
};

export const length = (pts: readonly Pt[]) => {
  const c = cumulative(pts);
  return c[c.length - 1];
};

// Point and heading at fraction t of the length.
export const pointAt = (
  pts: readonly Pt[],
  t: number,
): { p: Pt; angle: number } => {
  const c = cumulative(pts);
  const target = clamp01(t) * c[c.length - 1];
  for (let i = 1; i < pts.length; i++) {
    if (c[i] >= target) {
      const seg = c[i] - c[i - 1] || 1;
      const u = (target - c[i - 1]) / seg;
      const a = pts[i - 1];
      const b = pts[i];
      return {
        p: lerpPt(a, b, u),
        angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
      };
    }
  }
  const a = pts[pts.length - 2] ?? pts[0];
  const b = pts[pts.length - 1];
  return { p: b, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
};

// The first fraction t of the polyline, by length.
export const partial = (pts: readonly Pt[], t: number): Pt[] => {
  if (t <= 0) return [];
  if (t >= 1) return [...pts];
  const c = cumulative(pts);
  const target = t * c[c.length - 1];
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (c[i] >= target) {
      const seg = c[i] - c[i - 1] || 1;
      out.push(lerpPt(pts[i - 1], pts[i], (target - c[i - 1]) / seg));
      return out;
    }
    out.push(pts[i]);
  }
  return out;
};

// n points evenly spaced by length, so two shapes can be morphed pointwise.
export const resample = (pts: readonly Pt[], n: number): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) out.push(pointAt(pts, i / (n - 1)).p);
  return out;
};

export const arc = (
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  n = 24,
): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
};

// Closed rounded rectangle, clockwise from the top-left straight.
export const roundedRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  n = 8,
): Pt[] => {
  if (r <= 0) {
    return [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
      [x, y],
    ];
  }
  const q = Math.PI / 2;
  return [
    [x + r, y],
    [x + w - r, y],
    ...arc(x + w - r, y + r, r, -q, 0, n).slice(1),
    [x + w, y + h - r],
    ...arc(x + w - r, y + h - r, r, 0, q, n).slice(1),
    [x + r, y + h],
    ...arc(x + r, y + h - r, r, q, 2 * q, n).slice(1),
    [x, y + r],
    ...arc(x + r, y + r, r, 2 * q, 3 * q, n).slice(1),
  ];
};

// Vertical stadium (capsule), closed, starting at the top of the right side.
export const capsule = (
  cx: number,
  cy: number,
  w: number,
  h: number,
  n = 12,
): Pt[] => {
  const r = w / 2;
  const top = cy - h / 2 + r;
  const bottom = cy + h / 2 - r;
  return [
    [cx + r, top],
    [cx + r, bottom],
    ...arc(cx, bottom, r, 0, Math.PI, n).slice(1),
    [cx - r, top],
    ...arc(cx, top, r, Math.PI, 2 * Math.PI, n).slice(1),
  ];
};

export const toPath = (pts: readonly Pt[], close = false) => {
  if (pts.length === 0) return "";
  const body = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`,
    )
    .join(" ");
  return close ? `${body} Z` : body;
};

export const transformPts = (
  pts: readonly Pt[],
  dx: number,
  dy: number,
  s = 1,
): Pt[] => pts.map(([x, y]) => [dx + x * s, dy + y * s] as const);
