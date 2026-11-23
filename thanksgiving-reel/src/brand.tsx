import React from "react";
import { Img, staticFile } from "remotion";

// The Polygood logo, taken from polygood.com's own stylesheet.
export const Logo: React.FC<{ height: number; style?: React.CSSProperties }> = ({ height, style }) => (
  <Img
    src={staticFile("brand/polygood-logo.svg")}
    showInTimeline={false}
    style={{ height, width: (height * 1000) / 220, display: "block", ...style }}
  />
);
