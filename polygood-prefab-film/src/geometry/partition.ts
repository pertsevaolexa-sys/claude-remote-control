// The second panel (scene 04): a partition with a staggered pattern of
// through-cut capsules. Removing material across the width is what lets the
// panel flex into a curve without heat. Millimetres, panel top-left at 0,0.

import { Pt, capsule } from "./polyline";
import { ToolSegment } from "./sheet";

export const PANEL = { w: 1200, h: 2100 };

// The panel is cut lengthwise from a sheet; this is the sheet region (mm) its
// texture comes from, rotated 90°.
export const PANEL_SOURCE = { x: 350, y: 100, w: PANEL.h, h: PANEL.w };

const CAPSULE = { w: 84, h: 330 };
const ROWS = [270, 570, 870, 1170, 1470, 1770];

export type Cutout = { cx: number; cy: number; outline: Pt[]; row: number };

export const CUTOUTS: Cutout[] = ROWS.flatMap((cy, row) => {
  const even = row % 2 === 0;
  const xs = even ? [200, 400, 600, 800, 1000] : [300, 500, 700, 900];
  return xs.map((cx) => ({ cx, cy, row, outline: capsuleClosed(cx, cy) }));
}).filter((c) => c.cy + CAPSULE.h / 2 < PANEL.h - 120);

function capsuleClosed(cx: number, cy: number): Pt[] {
  const pts = capsule(cx, cy, CAPSULE.w, CAPSULE.h);
  return [...pts, pts[0]];
}

// Boustrophedon toolpath through the cut-outs, row by row.
export const PANEL_TOOLPATH: ToolSegment[] = (() => {
  const segs: ToolSegment[] = [];
  const rows = new Map<number, Cutout[]>();
  for (const c of CUTOUTS) rows.set(c.row, [...(rows.get(c.row) ?? []), c]);
  let last: Pt | null = null;
  [...rows.keys()]
    .sort((a, b) => a - b)
    .forEach((row, i) => {
      const cells = [...rows.get(row)!].sort((a, b) =>
        i % 2 === 0 ? a.cx - b.cx : b.cx - a.cx,
      );
      for (const c of cells) {
        const start = c.outline[0];
        if (last) segs.push({ type: "rapid", pts: [last, start] });
        segs.push({ type: "cut", pts: c.outline });
        last = c.outline[c.outline.length - 1];
      }
    });
  return segs;
})();
