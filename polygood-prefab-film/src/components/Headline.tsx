import React from "react";
import { useCurrentFrame } from "remotion";
import { ramp } from "../anim";
import { COLORS, DURATIONS, EASE } from "../config/theme";
import { TYPE, fontStack } from "../config/typography";
import { useLayout } from "./LayoutContext";

// Headline set line by line behind masks: each line rises into place, then
// leaves upwards. LinkedIn adds the technical spec line beneath.
export const Headline: React.FC<{
  lines: readonly string[];
  inFrame: number;
  outFrame?: number;
  spec?: string;
  size?: number;
  x?: number;
  y?: number;
  maxWidth?: number;
  // Set each line on a paper-coloured label, for text over material. Over
  // paper the labels disappear into the background.
  label?: boolean;
}> = ({
  lines,
  inFrame,
  outFrame,
  spec,
  size,
  x,
  y,
  maxWidth,
  label = false,
}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const fontSize = size ?? layout.headline.size;
  const lineHeight = fontSize * TYPE.headline.lineHeight;
  const pad = fontSize * 0.22; // room for descenders inside the mask
  const labelPadX = label ? fontSize * 0.2 : 0;

  const { lineIn, lineOut, lineStaggerIn, lineStaggerOut } = DURATIONS;
  const lineOffset = (i: number) => {
    const start = inFrame + i * lineStaggerIn;
    const enter = ramp(frame, [start, start + lineIn]);
    const leave = (outFrame ?? 0) + i * lineStaggerOut;
    const exit =
      outFrame === undefined
        ? 0
        : ramp(frame, [leave, leave + lineOut], EASE.in);
    // 130% clears the mask, which is taller than the line by the descender pad.
    return (1 - enter) * 130 - exit * 130;
  };

  const specIn = ramp(frame, [inFrame + 10, inFrame + 30]);
  const specOut =
    outFrame === undefined
      ? 0
      : ramp(frame, [outFrame - 2, outFrame + 10], EASE.in);

  return (
    <div
      style={{
        position: "absolute",
        left: (x ?? layout.headline.x) - labelPadX,
        top: y ?? layout.headline.y,
        maxWidth: maxWidth ?? layout.headline.maxWidth,
        fontFamily: fontStack,
        color: COLORS.ink,
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            overflow: "hidden",
            height: lineHeight + pad,
            marginBottom: -pad,
          }}
        >
          <div
            style={{
              fontSize,
              lineHeight: `${lineHeight}px`,
              fontWeight: TYPE.headline.weight,
              letterSpacing: TYPE.headline.tracking,
              whiteSpace: "nowrap",
              translate: `0 ${lineOffset(i)}%`,
              ...(label
                ? {
                    display: "inline-block",
                    background: COLORS.paper,
                    padding: `0 ${labelPadX}px ${pad}px`,
                  }
                : {}),
            }}
          >
            {line}
          </div>
        </div>
      ))}
      {spec && layout.spec.show ? (
        <div
          style={{
            marginTop: layout.spec.gap + pad,
            marginLeft: labelPadX,
            maxWidth: layout.spec.maxWidth,
            fontSize: layout.spec.size,
            lineHeight: 1.32,
            letterSpacing: TYPE.label.tracking,
            fontWeight: TYPE.label.weight,
            textWrap: "balance",
            opacity: specIn * (1 - specOut),
            translate: `0 ${(1 - specIn) * 14}px`,
          }}
        >
          {spec}
        </div>
      ) : null}
    </div>
  );
};
