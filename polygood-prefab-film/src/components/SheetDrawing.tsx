import React from "react";
import { COLORS, STROKES } from "../config/theme";
import { PLOT_STROKES } from "../geometry/drawing";
import { DIMENSION_STROKES, DRAWN_PARTS, Stroke } from "../geometry/sheet";
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
