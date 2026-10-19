import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ramp, windowed } from "../anim";
import { MACRO_CENTER } from "../config/assets";
import { HEADLINES } from "../config/copy";
import { S1 } from "../config/timing";
import { COLORS, EASE } from "../config/theme";
import { Headline } from "../components/Headline";
import { useLayout } from "../components/LayoutContext";
import { MaterialPyramid } from "../components/MaterialTexture";
import { SheetDrawing } from "../components/SheetDrawing";
import { SheetFrame, SheetShadow } from "../components/SheetFrame";
import { WorldSvg } from "../components/WorldSvg";
import { pullCamera } from "../geometry/camera";
import { sheetCamera } from "./sheetCamera";

const MACRO_K = 9.6; // px per mm in the opening macro
const PUSH_K = 10.4;

export const Scene01Drawing: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = useLayout();

  const macro = { x: MACRO_CENTER.x, y: MACRO_CENTER.y, k: MACRO_K };
  const pushed = pullCamera(
    macro,
    { ...macro, k: PUSH_K },
    ramp(frame, [0, S1.pushInEnd], EASE.standard),
  );
  const camera = pullCamera(
    pushed,
    sheetCamera(layout),
    ramp(frame, [S1.pushInEnd, S1.pullBackEnd], EASE.inOut),
  );

  const outline = ramp(frame, S1.outline, EASE.inOut);
  const plot = interpolate(frame, S1.plot, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t ** 1.6, // slow first lines, then the plotter speeds up
  });
  const dims = ramp(frame, S1.dims, EASE.standard);
  const shadow = ramp(frame, [S1.pullBackEnd - 12, S1.pullBackEnd + 4]);

  const sweep = windowed(
    frame,
    [S1.sweep[0], S1.sweep[0] + 8],
    [S1.sweep[1] - 8, S1.sweep[1]],
  );
  const sweepX = interpolate(frame, S1.sweep, [-1.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <WorldSvg camera={camera} anchor={layout.stage}>
        <SheetShadow opacity={shadow} id="s1-sheet-shadow" />
        <MaterialPyramid k={camera.k} idPrefix="s1" />
        <SheetDrawing plot={plot} dims={dims} showPen />
        <SheetFrame outline={outline} marks={outline} />
      </WorldSvg>

      {/* Light sweep across the macro, like a raking light over the surface */}
      <AbsoluteFill
        style={{
          opacity: sweep * 0.55,
          mixBlendMode: "soft-light",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -height * 0.25,
            left: 0,
            width: width,
            height: height * 1.5,
            translate: `${sweepX * width}px 0`,
            rotate: "14deg",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.0) 30%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 70%, rgba(255,255,255,0) 100%)",
          }}
        />
      </AbsoluteFill>

      <Headline
        lines={HEADLINES.drawing}
        inFrame={S1.headlineIn}
        outFrame={S1.headlineOut}
        label
      />
    </AbsoluteFill>
  );
};
