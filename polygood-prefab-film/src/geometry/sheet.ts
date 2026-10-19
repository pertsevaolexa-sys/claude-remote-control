// The sheet, the tabletop-and-bench parts, the plotted drawing and the CNC
// toolpath, all in millimetres on a 2800 x 1400 mm Polygood sheet.

import { Pt, arc, roundedRect, transformPts } from "./polyline";

export const SHEET = { w: 2800, h: 1400 };

// The drawing is plotted at 0.8 scale; parts grow to full size as they nest.
export const DRAW_SCALE = 0.8;

export type PartId =
  | "tabletop"
  | "benchSeat"
  | "tableLegA"
  | "tableLegB"
  | "benchLegA"
  | "benchLegB";

export type Part = {
  id: PartId;
  w: number;
  h: number;
  outline: Pt[]; // local coordinates, closed (first point repeated last)
  drawing: { x: number; y: number }; // top-left in the drawing (at DRAW_SCALE)
  nest: { x: number; y: number }; // top-left in the nested cutting layout
  stagger: number; // order in which parts slide into the nest
};

const close = (pts: Pt[]): Pt[] => [...pts, pts[0]];

// Slab leg with an arch cut from the bottom edge.
const archedLeg = (w: number, h: number, r: number): Pt[] =>
  close([
    [0, 0],
    [w, 0],
    [w, h],
    [w / 2 + r, h],
    ...arc(w / 2, h, r, 0, -Math.PI, 20).slice(1),
    [0, h],
  ]);

const TABLETOP = { w: 1600, h: 800, r: 40 };
const BENCH_SEAT = { w: 1600, h: 360, r: 30 };
const TABLE_LEG = { w: 520, h: 700, arch: 150 };
const BENCH_LEG = { w: 340, h: 400, arch: 90 };

// Elevations in the drawing (end views of the table and the bench).
const ELEV = {
  ground: 745,
  table: { x: 1640, topY: 170, topW: TABLETOP.h * DRAW_SCALE, thickness: 15 },
  bench: { x: 2360, thickness: 15 },
};
const tableLegDrawX =
  ELEV.table.x + (ELEV.table.topW - TABLE_LEG.w * DRAW_SCALE) / 2;
const benchTopW = BENCH_SEAT.h * DRAW_SCALE;
const benchLegDrawX = ELEV.bench.x + (benchTopW - BENCH_LEG.w * DRAW_SCALE) / 2;
const benchTopY = ELEV.ground - BENCH_LEG.h * DRAW_SCALE - ELEV.bench.thickness;

export const PARTS: Part[] = [
  {
    id: "tabletop",
    w: TABLETOP.w,
    h: TABLETOP.h,
    outline: close(roundedRect(0, 0, TABLETOP.w, TABLETOP.h, TABLETOP.r)),
    drawing: { x: 200, y: 170 },
    nest: { x: 40, y: 40 },
    stagger: 0,
  },
  {
    id: "benchSeat",
    w: BENCH_SEAT.w,
    h: BENCH_SEAT.h,
    outline: close(roundedRect(0, 0, BENCH_SEAT.w, BENCH_SEAT.h, BENCH_SEAT.r)),
    drawing: { x: 200, y: 900 },
    nest: { x: 40, y: 880 },
    stagger: 1,
  },
  {
    id: "tableLegA",
    w: TABLE_LEG.w,
    h: TABLE_LEG.h,
    outline: archedLeg(TABLE_LEG.w, TABLE_LEG.h, TABLE_LEG.arch),
    drawing: { x: tableLegDrawX, y: ELEV.table.topY + ELEV.table.thickness },
    nest: { x: 1680, y: 40 },
    stagger: 2,
  },
  {
    // The elevation shows one leg; its twin slides out of it.
    id: "tableLegB",
    w: TABLE_LEG.w,
    h: TABLE_LEG.h,
    outline: archedLeg(TABLE_LEG.w, TABLE_LEG.h, TABLE_LEG.arch),
    drawing: { x: tableLegDrawX, y: ELEV.table.topY + ELEV.table.thickness },
    nest: { x: 2230, y: 40 },
    stagger: 3,
  },
  {
    id: "benchLegA",
    w: BENCH_LEG.w,
    h: BENCH_LEG.h,
    outline: archedLeg(BENCH_LEG.w, BENCH_LEG.h, BENCH_LEG.arch),
    drawing: { x: benchLegDrawX, y: benchTopY + ELEV.bench.thickness },
    nest: { x: 1680, y: 780 },
    stagger: 3,
  },
  {
    id: "benchLegB",
    w: BENCH_LEG.w,
    h: BENCH_LEG.h,
    outline: archedLeg(BENCH_LEG.w, BENCH_LEG.h, BENCH_LEG.arch),
    drawing: { x: benchLegDrawX, y: benchTopY + ELEV.bench.thickness },
    nest: { x: 2050, y: 780 },
    stagger: 4,
  },
];

export const partById = (id: PartId) => PARTS.find((p) => p.id === id)!;

// ---------------------------------------------------------------------------
// Drawing: strokes plotted in order. Parts are drawn first (they become the
// components in scene 02), then the elevation details and the title block.

export type Stroke = {
  pts: Pt[];
  kind: "part" | "line" | "center" | "dim" | "tick";
};

const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];

const line = (a: Pt, b: Pt): Pt[] => [a, b];

// The parts that appear in the drawing: A legs only (B legs are hidden twins).
export const DRAWN_PARTS: PartId[] = [
  "tabletop",
  "benchSeat",
  "tableLegA",
  "benchLegA",
];

export const drawingPartOutline = (part: Part) =>
  transformPts(part.outline, part.drawing.x, part.drawing.y, DRAW_SCALE);

const tablePlan = partById("tabletop");
const benchPlan = partById("benchSeat");
const tpX = tablePlan.drawing.x;
const tpY = tablePlan.drawing.y;
const tpW = tablePlan.w * DRAW_SCALE;
const tpH = tablePlan.h * DRAW_SCALE;
const bpY = benchPlan.drawing.y;
const bpH = benchPlan.h * DRAW_SCALE;

export const DETAIL_STROKES: Stroke[] = [
  // Elevation tops and ground line
  {
    kind: "line",
    pts: rect(
      ELEV.table.x,
      ELEV.table.topY,
      ELEV.table.topW,
      ELEV.table.thickness,
    ),
  },
  {
    kind: "line",
    pts: rect(ELEV.bench.x, benchTopY, benchTopW, ELEV.bench.thickness),
  },
  { kind: "line", pts: line([1600, ELEV.ground], [2720, ELEV.ground]) },
  // Centre lines through the plans
  {
    kind: "center",
    pts: line([tpX - 50, tpY + tpH / 2], [tpX + tpW + 50, tpY + tpH / 2]),
  },
  {
    kind: "center",
    pts: line([tpX + tpW / 2, tpY - 40], [tpX + tpW / 2, tpY + tpH + 40]),
  },
  {
    kind: "center",
    pts: line([tpX - 50, bpY + bpH / 2], [tpX + tpW + 50, bpY + bpH / 2]),
  },
  // Title block
  { kind: "line", pts: rect(1640, 1010, 1080, 300) },
  { kind: "line", pts: line([2200, 1010], [2200, 1310]) },
  { kind: "line", pts: line([2200, 1110], [2720, 1110]) },
  { kind: "line", pts: line([2200, 1210], [2720, 1210]) },
  { kind: "line", pts: line([1640, 1160], [2200, 1160]) },
  { kind: "line", pts: line([2460, 1110], [2460, 1310]) },
];

// Dimension line between a and b, offset along unit normal n. Returns the
// extension lines, the dimension line, slash terminators and minor ticks.
// No numbers, by design.
const dimension = (
  a: Pt,
  b: Pt,
  n: Pt,
  offset: number,
  minorStep = 0,
): Stroke[] => {
  const gap = 14;
  const over = 18;
  const pa: Pt = [a[0] + n[0] * offset, a[1] + n[1] * offset];
  const pb: Pt = [b[0] + n[0] * offset, b[1] + n[1] * offset];
  const out: Stroke[] = [
    {
      kind: "dim",
      pts: line(
        [a[0] + n[0] * gap, a[1] + n[1] * gap],
        [pa[0] + n[0] * over, pa[1] + n[1] * over],
      ),
    },
    {
      kind: "dim",
      pts: line(
        [b[0] + n[0] * gap, b[1] + n[1] * gap],
        [pb[0] + n[0] * over, pb[1] + n[1] * over],
      ),
    },
    { kind: "dim", pts: line(pa, pb) },
  ];
  const s = 16; // slash half-length
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const u: Pt = [dx / len, dy / len];
  const slash: Pt = [(u[0] + n[0]) * s * 0.7071, (u[1] + n[1]) * s * 0.7071];
  for (const p of [pa, pb]) {
    out.push({
      kind: "dim",
      pts: line(
        [p[0] - slash[0], p[1] - slash[1]],
        [p[0] + slash[0], p[1] + slash[1]],
      ),
    });
  }
  if (minorStep > 0) {
    const count = Math.floor(len / minorStep);
    for (let i = 1; i < count; i++) {
      const t = (i * minorStep) / len;
      const p: Pt = [pa[0] + dx * t, pa[1] + dy * t];
      const h = i % 5 === 0 ? 14 : 7;
      out.push({
        kind: "tick",
        pts: line(
          [p[0] - n[0] * h, p[1] - n[1] * h],
          [p[0] + n[0] * h * 0.2, p[1] + n[1] * h * 0.2],
        ),
      });
    }
  }
  return out;
};

const tableLegDraw = partById("tableLegA");
const benchLegDraw = partById("benchLegA");

export const DIMENSION_STROKES: Stroke[] = [
  ...dimension([tpX, tpY], [tpX + tpW, tpY], [0, -1], 60, 64),
  ...dimension([tpX, tpY], [tpX, tpY + tpH], [-1, 0], 70, 64),
  ...dimension([tpX, bpY], [tpX, bpY + bpH], [-1, 0], 70, 0),
  ...dimension(
    [ELEV.table.x, ELEV.table.topY],
    [ELEV.table.x, ELEV.ground],
    [-1, 0],
    40,
    0,
  ),
  ...dimension(
    [tableLegDraw.drawing.x, ELEV.ground],
    [tableLegDraw.drawing.x + tableLegDraw.w * DRAW_SCALE, ELEV.ground],
    [0, 1],
    60,
    0,
  ),
  ...dimension(
    [benchLegDraw.drawing.x + benchLegDraw.w * DRAW_SCALE, benchTopY],
    [benchLegDraw.drawing.x + benchLegDraw.w * DRAW_SCALE, ELEV.ground],
    [1, 0],
    60,
    0,
  ),
];

// ---------------------------------------------------------------------------
// CNC toolpath for the nested parts: lead-in, contour, lead-out, then a rapid
// move to the next part. Rapids are drawn dashed, as in CAM previews.

export type ToolSegment = { type: "cut" | "rapid"; pts: Pt[] };

export const nestedOutline = (part: Part) =>
  transformPts(part.outline, part.nest.x, part.nest.y);

const CUT_ORDER: PartId[] = [
  "tabletop",
  "tableLegA",
  "tableLegB",
  "benchLegB",
  "benchLegA",
  "benchSeat",
];

const LEAD = 36;

export const SHEET_TOOLPATH: ToolSegment[] = (() => {
  const segs: ToolSegment[] = [];
  let last: Pt | null = null;
  for (const id of CUT_ORDER) {
    const pts = nestedOutline(partById(id));
    const start = pts[0];
    const leadIn: Pt = [start[0] - LEAD * 0.6, start[1] - LEAD];
    if (last) segs.push({ type: "rapid", pts: [last, leadIn] });
    const leadOut: Pt = [start[0] + LEAD * 0.6, start[1] - LEAD];
    segs.push({ type: "cut", pts: [leadIn, ...pts, leadOut] });
    last = leadOut;
  }
  return segs;
})();

// ---------------------------------------------------------------------------
// Offcuts left in the sheet after cutting (sheet coordinates). Used in
// scene 05, where they are recycled into new panel material.

export type Offcut = {
  id: string;
  outline: Pt[];
  bounds: { x: number; y: number; w: number; h: number };
};

const halfDisc = (cx: number, cy: number, r: number): Pt[] =>
  close([...arc(cx, cy, r, 0, -Math.PI, 16)]);

export const OFFCUTS: Offcut[] = [
  {
    id: "strip",
    outline: rect(0, 1256, 1660, 144),
    bounds: { x: 0, y: 1256, w: 1660, h: 144 },
  },
  {
    id: "block",
    outline: rect(2406, 756, 394, 644),
    bounds: { x: 2406, y: 756, w: 394, h: 644 },
  },
  {
    id: "bar",
    outline: rect(1662, 1196, 744, 204),
    bounds: { x: 1662, y: 1196, w: 744, h: 204 },
  },
  {
    id: "archA",
    outline: halfDisc(1940, 740, 150),
    bounds: { x: 1790, y: 590, w: 300, h: 150 },
  },
  {
    id: "archB",
    outline: halfDisc(2490, 740, 150),
    bounds: { x: 2340, y: 590, w: 300, h: 150 },
  },
  {
    id: "archC",
    outline: halfDisc(1850, 1180, 90),
    bounds: { x: 1760, y: 1090, w: 180, h: 90 },
  },
  {
    id: "archD",
    outline: halfDisc(2220, 1180, 90),
    bounds: { x: 2130, y: 1090, w: 180, h: 90 },
  },
];
