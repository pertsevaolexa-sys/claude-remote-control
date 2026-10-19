import React from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { INK, PAPER } from "../logo/palette";
import { DESCRIPTOR, LETTERS, LOGO_BOX, MARK } from "../logo/paths";
import { Stage } from "../logo/Stage";

// Version 1: the mark and each letter are traced as outlines, then fill in.
// The descriptor wipes in underneath.
export const LineDrawComposition: React.FC = () => {
  return (
    <Composition
      id="LineDraw"
      component={LineDraw}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

export const LineDraw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Stage>
        <defs>
          <clipPath id="line-draw-descriptor-wipe">
            <rect
              x={LOGO_BOX.x - 2}
              y={410}
              height={48}
              width={interpolate(
                frame,
                [2.6 * fps, 3.4 * fps],
                [0, LOGO_BOX.width + 4],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.65, 0, 0.35, 1),
                },
              )}
            />
          </clipPath>
        </defs>
        <Interactive.G
          name="Logo"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            scale: interpolate(frame, [0, 5 * fps], [0.96, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          <Interactive.Path
            name="Mark"
            d={MARK}
            pathLength={1}
            fill={INK}
            stroke={INK}
            strokeWidth={1.2}
            strokeDasharray="1 1"
            style={{
              strokeDashoffset: interpolate(frame, [0, 1.4 * fps], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              }),
              fillOpacity: interpolate(frame, [1.1 * fps, 1.8 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          />
          {LETTERS.map((letter, i) => {
            const drawStart = 0.6 * fps + i * 4;
            const drawEnd = drawStart + 1.1 * fps;
            return (
              <path
                key={i}
                d={letter.d}
                pathLength={1}
                fill={INK}
                stroke={INK}
                strokeWidth={1}
                strokeDasharray="1 1"
                style={{
                  strokeDashoffset: interpolate(
                    frame,
                    [drawStart, drawEnd],
                    [1, 0],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(0.65, 0, 0.35, 1),
                    },
                  ),
                  fillOpacity: interpolate(
                    frame,
                    [drawEnd - 0.3 * fps, drawEnd + 0.4 * fps],
                    [0, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(0.16, 1, 0.3, 1),
                    },
                  ),
                }}
              />
            );
          })}
          <Interactive.G
            name="Descriptor"
            clipPath="url(#line-draw-descriptor-wipe)"
          >
            <path d={DESCRIPTOR} fill={INK} fillRule="evenodd" />
          </Interactive.G>
        </Interactive.G>
      </Stage>
    </AbsoluteFill>
  );
};
