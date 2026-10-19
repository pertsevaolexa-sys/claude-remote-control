import React from "react";
import { COLORS, STROKES } from "../config/theme";
import { Pt } from "../geometry/polyline";
import { SHEET } from "../geometry/sheet";
import { TechnicalLine } from "./TechnicalLine";
import { useWorld } from "./WorldSvg";

const OUTLINE: Pt[] = [
  [0, 0],
  [SHEET.w, 0],
  [SHEET.w, SHEET.h],
  [0, SHEET.h],
  [0, 0],
];

const CORNERS: [number, number, number, number][] = [
  [0, 0, -1, -1],
  [SHEET.w, 0, 1, -1],
  [SHEET.w, SHEET.h, 1, 1],
  [0, SHEET.h, -1, 1],
];

// Hairline sheet outline with crop marks off each corner. Use inside WorldSvg.
export const SheetFrame: React.FC<{
  outline: number;
  marks: number;
  opacity?: number;
}> = ({ outline, marks, opacity = 1 }) => {
  const { px } = useWorld();
  const gap = px(12);
  const len = px(28);
  return (
    <g opacity={opacity}>
      <TechnicalLine
        pts={OUTLINE}
        progress={outline}
        color={COLORS.ink}
        width={STROKES.sheetOutline}
        cap="butt"
      />
      {CORNERS.map(([x, y, sx, sy], i) => (
        <g key={i}>
          <TechnicalLine
            pts={[
              [x + sx * gap, y],
              [x + sx * (gap + len), y],
            ]}
            progress={marks}
            color={COLORS.ink}
            width={1.2}
            cap="butt"
          />
          <TechnicalLine
            pts={[
              [x, y + sy * gap],
              [x, y + sy * (gap + len)],
            ]}
            progress={marks}
            color={COLORS.ink}
            width={1.2}
            cap="butt"
          />
        </g>
      ))}
    </g>
  );
};

// Soft shadow under the sheet. Use inside WorldSvg, before the material.
export const SheetShadow: React.FC<{ opacity: number; id: string }> = ({
  opacity,
  id,
}) => {
  const { px } = useWorld();
  if (opacity <= 0) return null;
  return (
    <g>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur stdDeviation={px(16)} />
        </filter>
      </defs>
      <rect
        x={0}
        y={px(14)}
        width={SHEET.w}
        height={SHEET.h}
        fill={COLORS.shadow}
        opacity={opacity * 0.6}
        filter={`url(#${id})`}
      />
    </g>
  );
};
