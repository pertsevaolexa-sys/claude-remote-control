import React from "react";
import { useVideoConfig } from "remotion";
import { LOGO_BOX } from "./paths";

// How wide the full lockup appears on screen, in pixels.
export const LOGO_WIDTH_PX = 1150;

// The center of the lockup in logo units. Children of <Stage> that sit
// here appear in the middle of the frame.
export const LOGO_CENTER = {
  x: LOGO_BOX.x + LOGO_BOX.width / 2,
  y: LOGO_BOX.y + LOGO_BOX.height / 2,
};

// A full-frame SVG whose coordinate system is the source logo's, scaled so
// the lockup is LOGO_WIDTH_PX wide and centered. Logo paths can be dropped
// in unchanged, and anything outside the lockup still renders.
export const Stage: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { width, height } = useVideoConfig();
  const unitsPerPx = LOGO_BOX.width / LOGO_WIDTH_PX;
  const viewWidth = width * unitsPerPx;
  const viewHeight = height * unitsPerPx;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${LOGO_CENTER.x - viewWidth / 2} ${LOGO_CENTER.y - viewHeight / 2} ${viewWidth} ${viewHeight}`}
      style={{ position: "absolute", inset: 0 }}
    >
      {children}
    </svg>
  );
};
