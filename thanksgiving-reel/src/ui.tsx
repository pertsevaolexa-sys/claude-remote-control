import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { color, font, tight } from "./theme";

// A flat white band across the bottom of the frame: the dish, then the
// pattern it is made of. Fades in and out over a few frames.
export const Caption: React.FC<{ from: number; to: number; title: string; line?: string }> = ({
  from,
  to,
  title,
  line,
}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const opacity = interpolate(frame, [from, from + 3, to - 3, to], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1236,
        opacity,
        background: color.white,
        padding: "34px 60px 36px",
        color: color.ink,
        fontFamily: font,
      }}
    >
      <div style={{ fontSize: 80, lineHeight: 1.04, letterSpacing: tight }}>{title}</div>
      {line ? <div style={{ fontSize: 40, marginTop: 10, letterSpacing: "-0.01em" }}>{line}</div> : null}
    </div>
  );
};
