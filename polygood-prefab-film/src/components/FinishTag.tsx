import React from "react";
import { FINISH } from "../config/assets";
import { COLORS } from "../config/theme";
import { TYPE, fontStack } from "../config/typography";
import { SheetRegion } from "./MaterialTexture";

// Finish identifier: a small swatch of the material, the PS code and the
// pattern name on a light label, legible over material or paper alike.
export const FinishTag: React.FC<{
  size: number;
  style?: React.CSSProperties;
}> = ({ size, style }) => {
  const swatch = Math.round(size * 0.95);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.55,
        padding: `${size * 0.45}px ${size * 0.7}px ${size * 0.45}px ${size * 0.45}px`,
        background: COLORS.label,
        fontFamily: fontStack,
        fontSize: size,
        lineHeight: 1,
        color: COLORS.ink,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: swatch,
          height: swatch,
          flex: "none",
        }}
      >
        <SheetRegion
          region={{ x: 1300, y: 600, w: 60, h: 60 }}
          width={swatch}
          height={swatch}
        />
      </div>
      <span
        style={{
          fontWeight: TYPE.code.weight,
          letterSpacing: TYPE.code.tracking,
        }}
      >
        {FINISH.code}
      </span>
      <span
        style={{
          fontWeight: TYPE.label.weight,
          letterSpacing: TYPE.label.tracking,
        }}
      >
        {FINISH.pattern}
      </span>
    </div>
  );
};
