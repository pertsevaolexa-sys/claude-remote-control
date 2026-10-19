import React from "react";
import { interpolateColors, useCurrentFrame } from "remotion";
import { ramp } from "../anim";
import { CHECKLIST_ITEMS } from "../config/copy";
import { CHECKLIST } from "../config/timing";
import { COLORS, EASE } from "../config/theme";
import { TYPE, fontStack } from "../config/typography";
import { useLayout } from "./LayoutContext";

const CHECK_AT = [
  CHECKLIST.checks.cut,
  CHECKLIST.checks.edged,
  CHECKLIST.checks.machined,
  CHECKLIST.checks.curved,
];

// Manufacturing checklist, top right. Items wait in grey; each one fills with
// the accent colour and draws its tick when that process is shown.
export const ProcessChecklist: React.FC = () => {
  const frame = useCurrentFrame();
  const { checklist } = useLayout();
  const box = Math.round(checklist.size * 0.82);
  const out = ramp(
    frame,
    [CHECKLIST.disappear, CHECKLIST.disappear + 14],
    EASE.in,
  );
  if (frame < CHECKLIST.appear || out >= 1) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: checklist.right,
        top: checklist.top,
        fontFamily: fontStack,
        fontSize: checklist.size,
        opacity: 1 - out,
      }}
    >
      {CHECKLIST_ITEMS.map((item, i) => {
        const appear = ramp(frame, [
          CHECKLIST.appear + i * 2,
          CHECKLIST.appear + i * 2 + 14,
        ]);
        const fill = ramp(frame, [CHECK_AT[i], CHECK_AT[i] + 7]);
        const tick = ramp(frame, [CHECK_AT[i] + 2, CHECK_AT[i] + 12]);
        const pulse =
          ramp(frame, [CHECK_AT[i], CHECK_AT[i] + 4]) *
          (1 - ramp(frame, [CHECK_AT[i] + 4, CHECK_AT[i] + 14]));
        return (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: checklist.size * 0.5,
              height: checklist.row,
              opacity: appear,
              translate: `0 ${(1 - appear) * 10}px`,
            }}
          >
            <svg
              width={box}
              height={box}
              viewBox="0 0 20 20"
              style={{ overflow: "visible", scale: 1 + pulse * 0.12 }}
            >
              <rect
                x={0.75}
                y={0.75}
                width={18.5}
                height={18.5}
                fill={COLORS.accent}
                fillOpacity={fill}
                stroke={interpolateColors(
                  fill,
                  [0, 1],
                  [COLORS.pending, COLORS.accent],
                )}
                strokeWidth={1.5}
              />
              <path
                d="M5 10.4 L8.6 14 L15.2 6.6"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={2.2}
                strokeLinecap="square"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - tick}
                opacity={tick > 0 ? 1 : 0}
              />
            </svg>
            <span
              style={{
                fontWeight: TYPE.label.weight,
                letterSpacing: TYPE.label.tracking,
                lineHeight: 1,
                color: interpolateColors(
                  fill,
                  [0, 1],
                  [COLORS.pending, COLORS.ink],
                ),
              }}
            >
              {item}
            </span>
          </div>
        );
      })}
    </div>
  );
};
