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
import { FLAKES, INK, PAPER } from "../logo/palette";
import { DESCRIPTOR, LETTERS, MARK, MARK_BOX } from "../logo/paths";
import { LOGO_CENTER, Stage } from "../logo/Stage";

// Version 3: the mark spins in at the centre of the frame like a recycling
// loop, sends out three coloured rings, then slides left while the letters
// pop up one after another.
export const LoopSpinComposition: React.FC = () => {
  return (
    <Composition
      id="LoopSpin"
      component={LoopSpin}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

const MARK_CENTER = {
  x: MARK_BOX.x + MARK_BOX.width / 2,
  y: MARK_BOX.y + MARK_BOX.height / 2,
};

export const LoopSpin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Stage>
        {/* Moves the mark from the frame centre to its place in the lockup. */}
        <g
          transform={`translate(${interpolate(
            frame,
            [1.1 * fps, 1.8 * fps],
            [LOGO_CENTER.x - MARK_CENTER.x, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.65, 0, 0.35, 1),
            },
          )} ${interpolate(
            frame,
            [1.1 * fps, 1.8 * fps],
            [LOGO_CENTER.y - MARK_CENTER.y, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.65, 0, 0.35, 1),
            },
          )})`}
        >
          {FLAKES.slice(0, 3).map((color, i) => {
            const start = 0.45 * fps + i * 4;
            return (
              <circle
                key={color}
                cx={MARK_CENTER.x}
                cy={MARK_CENTER.y}
                fill="none"
                stroke={color}
                r={interpolate(frame, [start, start + 0.8 * fps], [40, 190], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                })}
                strokeWidth={interpolate(
                  frame,
                  [start, start + 0.8 * fps],
                  [7, 0],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.33, 1, 0.68, 1),
                  },
                )}
                opacity={frame < start ? 0 : 1}
              />
            );
          })}
          <Interactive.Path
            name="Mark"
            d={MARK}
            fill={INK}
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              scale: interpolate(frame, [0, 0.8 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 12 }),
                output: "perceptual-scale",
              }),
              rotate: interpolate(frame, [0, 1 * fps], ["-300deg", "0deg"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          />
        </g>
        {LETTERS.map((letter, i) => {
          const start = 1.45 * fps + i * 3;
          return (
            <path
              key={i}
              d={letter.d}
              fill={INK}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center bottom",
                opacity: interpolate(frame, [start, start + 4], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                scale: interpolate(frame, [start, start + 0.7 * fps], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.spring({ damping: 9 }),
                  output: "perceptual-scale",
                }),
                translate: interpolate(
                  frame,
                  [start, start + 0.7 * fps],
                  ["0px 24px", "0px 0px"],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.spring({ damping: 9 }),
                  },
                ),
              }}
            />
          );
        })}
        <Interactive.G
          name="Descriptor"
          style={{
            opacity: interpolate(frame, [2.6 * fps, 3.3 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [2.6 * fps, 3.3 * fps],
              ["0px 12px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              },
            ),
          }}
        >
          <path d={DESCRIPTOR} fill={INK} fillRule="evenodd" />
        </Interactive.G>
      </Stage>
    </AbsoluteFill>
  );
};
