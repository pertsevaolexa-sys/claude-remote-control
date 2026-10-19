import React from "react";
import { Pt, cumulative, partial, pointAt, toPath } from "../geometry/polyline";
import { useWorld } from "./WorldSvg";

// A polyline revealed to `progress` (0..1) of its length, stroked at a
// constant screen width. Works inside WorldSvg (mm) or any plain SVG.
export const TechnicalLine: React.FC<{
  pts: readonly Pt[];
  progress?: number;
  color: string;
  width: number; // screen px
  opacity?: number;
  dash?: number[]; // screen px
  cap?: "round" | "butt" | "square";
}> = ({
  pts,
  progress = 1,
  color,
  width,
  opacity = 1,
  dash,
  cap = "round",
}) => {
  const { px } = useWorld();
  if (progress <= 0 || opacity <= 0) return null;
  const visible = partial(pts, progress);
  if (visible.length < 2) return null;
  return (
    <path
      d={toPath(visible)}
      fill="none"
      stroke={color}
      strokeWidth={px(width)}
      strokeLinecap={cap}
      strokeLinejoin="round"
      strokeDasharray={dash?.map(px).join(" ")}
      opacity={opacity}
    />
  );
};

// Spread one progress value over strokes in order, by length, the way a pen
// plotter works through a drawing. Returns per-stroke progress and pen point.
export const plotProgress = (
  strokes: readonly (readonly Pt[])[],
  t: number,
) => {
  const lengths = strokes.map((s) => {
    const c = cumulative(s);
    return c[c.length - 1];
  });
  const total = lengths.reduce((a, b) => a + b, 0);
  let budget = Math.max(0, Math.min(1, t)) * total;
  let pen: Pt | null = null;
  const progress = lengths.map((len, i) => {
    if (budget <= 0) return 0;
    const used = Math.min(len, budget);
    budget -= used;
    const p = len === 0 ? 1 : used / len;
    if (p < 1 || budget <= 0) pen = pointAt(strokes[i], p).p;
    return p;
  });
  return { progress, pen: t > 0 && t < 1 ? (pen as Pt | null) : null };
};
