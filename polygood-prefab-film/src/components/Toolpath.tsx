import React from "react";
import { COLORS, STROKES } from "../config/theme";
import { Pt, cumulative, partial, pointAt, toPath } from "../geometry/polyline";
import { ToolSegment } from "../geometry/sheet";
import { useWorld } from "./WorldSvg";

// Rapids are quick: they take this share of the time their length implies.
const RAPID_TIME = 0.25;

const segLength = (s: ToolSegment) => {
  const c = cumulative(s.pts);
  return c[c.length - 1];
};

// Per-segment progress for an overall toolpath progress t (0..1).
export const toolpathState = (segments: readonly ToolSegment[], t: number) => {
  const cost = segments.map(
    (s) => segLength(s) * (s.type === "rapid" ? RAPID_TIME : 1),
  );
  const total = cost.reduce((a, b) => a + b, 0);
  let budget = Math.max(0, Math.min(1, t)) * total;
  let head: { p: Pt; angle: number } | null = null;
  const progress = cost.map((c, i) => {
    if (budget <= 0) return 0;
    const used = Math.min(c, budget);
    budget -= used;
    const p = c === 0 ? 1 : used / c;
    if (p < 1) head = pointAt(segments[i].pts, p);
    return p;
  });
  return {
    progress,
    head: t > 0 && t < 1 ? (head as { p: Pt; angle: number } | null) : null,
  };
};

// CAM-style toolpath: cutting moves solid in the accent colour, rapid moves
// dashed, and a tool head marker at the current position.
export const Toolpath: React.FC<{
  segments: readonly ToolSegment[];
  progress: number;
  opacity?: number;
  showHead?: boolean;
  cutColor?: string;
}> = ({
  segments,
  progress,
  opacity = 1,
  showHead = true,
  cutColor = COLORS.accent,
}) => {
  const { px } = useWorld();
  const state = toolpathState(segments, progress);
  if (opacity <= 0) return null;
  return (
    <g opacity={opacity}>
      {segments.map((s, i) => {
        const p = state.progress[i];
        if (p <= 0) return null;
        const pts = partial(s.pts, p);
        if (pts.length < 2) return null;
        return s.type === "cut" ? (
          <path
            key={i}
            d={toPath(pts)}
            fill="none"
            stroke={cutColor}
            strokeWidth={px(STROKES.toolpath)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            key={i}
            d={toPath(pts)}
            fill="none"
            stroke={cutColor}
            strokeWidth={px(STROKES.rapid)}
            strokeDasharray={`${px(6)} ${px(6)}`}
            opacity={0.8}
          />
        );
      })}
      {showHead && state.head ? <ToolHead at={state.head.p} /> : null}
    </g>
  );
};

export const ToolHead: React.FC<{ at: Pt; color?: string }> = ({
  at,
  color = COLORS.accent,
}) => {
  const { px } = useWorld();
  return (
    <g>
      <circle
        cx={at[0]}
        cy={at[1]}
        r={px(13)}
        fill="none"
        stroke={color}
        strokeWidth={px(1.5)}
        opacity={0.9}
      />
      <circle cx={at[0]} cy={at[1]} r={px(4.5)} fill={color} />
      <line
        x1={at[0] - px(22)}
        y1={at[1]}
        x2={at[0] - px(16)}
        y2={at[1]}
        stroke={color}
        strokeWidth={px(1.5)}
      />
      <line
        x1={at[0] + px(16)}
        y1={at[1]}
        x2={at[0] + px(22)}
        y2={at[1]}
        stroke={color}
        strokeWidth={px(1.5)}
      />
      <line
        x1={at[0]}
        y1={at[1] - px(22)}
        x2={at[0]}
        y2={at[1] - px(16)}
        stroke={color}
        strokeWidth={px(1.5)}
      />
      <line
        x1={at[0]}
        y1={at[1] + px(16)}
        x2={at[0]}
        y2={at[1] + px(22)}
        stroke={color}
        strokeWidth={px(1.5)}
      />
    </g>
  );
};
