import React from "react";
import { COLORS, STROKES } from "../config/theme";
import { Pt } from "../geometry/polyline";
import {
  DETAIL_STROKES,
  DIMENSION_STROKES,
  DRAWN_PARTS,
  Stroke,
  drawingPartOutline,
  partById,
} from "../geometry/sheet";
import { TechnicalLine, plotProgress } from "./TechnicalLine";
import { useWorld } from "./WorldSvg";

const STYLE: Record<
  Stroke["kind"],
  { width: number; opacity: number; dash?: number[] }
> = {
  part: { width: STROKES.drawing, opacity: 1 },
  line: { width: STROKES.drawing * 0.8, opacity: 0.95 },
  center: { width: STROKES.centerline, opacity: 0.7, dash: [16, 5, 3, 5] },
  dim: { width: STROKES.dimension, opacity: 0.85 },
  tick: { width: STROKES.dimension * 0.8, opacity: 0.75 },
};

// Start the tabletop plan at its top-right corner, where the opening macro
// looks, so the first line the plotter draws is in frame.
const startNear = (pts: Pt[], target: Pt): Pt[] => {
  const open = pts.slice(0, -1);
  let best = 0;
  open.forEach((p, i) => {
    if (
      Math.hypot(p[0] - target[0], p[1] - target[1]) <
      Math.hypot(open[best][0] - target[0], open[best][1] - target[1])
    ) {
      best = i;
    }
  });
  return [...open.slice(best), ...open.slice(0, best), open[best]];
};

const tabletop = partById("tabletop");
export const PLOT_STROKES: Stroke[] = [
  ...DRAWN_PARTS.map((id) => {
    const outline = drawingPartOutline(partById(id));
    const pts =
      id === "tabletop"
        ? startNear(outline, [tabletop.drawing.x + 1280, tabletop.drawing.y])
        : outline;
    return { kind: "part" as const, pts };
  }),
  ...DETAIL_STROKES,
];

const StrokeSet: React.FC<{
  strokes: Stroke[];
  progress: number[];
  opacity: number;
  color: string;
}> = ({ strokes, progress, opacity, color }) => (
  <g opacity={opacity}>
    {strokes.map((s, i) => (
      <TechnicalLine
        key={i}
        pts={s.pts}
        progress={progress[i]}
        color={color}
        width={STYLE[s.kind].width}
        opacity={STYLE[s.kind].opacity}
        dash={STYLE[s.kind].dash}
        cap={s.kind === "center" ? "butt" : "round"}
      />
    ))}
  </g>
);

// The technical drawing plotted onto the sheet: parts and details by `plot`,
// dimension lines by `dims`. `partsOpacity` lets scene 02 take the part
// outlines over while the rest fades.
export const SheetDrawing: React.FC<{
  plot: number;
  dims: number;
  detailOpacity?: number;
  showParts?: boolean;
  showPen?: boolean;
  color?: string;
}> = ({
  plot,
  dims,
  detailOpacity = 1,
  showParts = true,
  showPen = false,
  color = COLORS.drawingOnMaterial,
}) => {
  const { px } = useWorld();
  const plotted = plotProgress(
    PLOT_STROKES.map((s) => s.pts),
    plot,
  );
  const dimmed = plotProgress(
    DIMENSION_STROKES.map((s) => s.pts),
    dims,
  );
  const partCount = DRAWN_PARTS.length;
  return (
    <g>
      {showParts ? (
        <StrokeSet
          strokes={PLOT_STROKES.slice(0, partCount)}
          progress={plotted.progress.slice(0, partCount)}
          opacity={1}
          color={color}
        />
      ) : null}
      <StrokeSet
        strokes={PLOT_STROKES.slice(partCount)}
        progress={plotted.progress.slice(partCount)}
        opacity={detailOpacity}
        color={color}
      />
      <StrokeSet
        strokes={DIMENSION_STROKES}
        progress={dimmed.progress}
        opacity={detailOpacity}
        color={color}
      />
      {showPen && plotted.pen ? (
        <g>
          <circle
            cx={plotted.pen[0]}
            cy={plotted.pen[1]}
            r={px(10)}
            fill="none"
            stroke={color}
            strokeWidth={px(1.2)}
          />
          <circle
            cx={plotted.pen[0]}
            cy={plotted.pen[1]}
            r={px(3.5)}
            fill={color}
          />
        </g>
      ) : null}
    </g>
  );
};
