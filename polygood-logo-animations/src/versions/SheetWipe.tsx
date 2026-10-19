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
import { DESCRIPTOR, LETTERS, MARK } from "../logo/paths";
import { Stage } from "../logo/Stage";

// Version 4: four slanted sheets of colour stack up across the frame and
// peel away again, top sheet first. Behind the last one the mark, the
// letters and the descriptor rise out of masks.
export const SheetWipeComposition: React.FC = () => {
  return (
    <Composition
      id="SheetWipe"
      component={SheetWipe}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

export const SheetWipe: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Stage>
        <defs>
          <clipPath id="sheet-wipe-mark">
            <rect x={105} y={258} width={160} height={130} />
          </clipPath>
          <clipPath id="sheet-wipe-letters">
            <rect x={280} y={305} width={340} height={79} />
          </clipPath>
          <clipPath id="sheet-wipe-descriptor">
            <rect x={105} y={410} width={520} height={46} />
          </clipPath>
        </defs>
        <g clipPath="url(#sheet-wipe-mark)">
          <Interactive.Path
            name="Mark"
            d={MARK}
            fill={INK}
            style={{
              translate: interpolate(
                frame,
                [1.45 * fps, 2.15 * fps],
                ["0px 130px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
              ),
            }}
          />
        </g>
        <g clipPath="url(#sheet-wipe-letters)">
          {LETTERS.map((letter, i) => {
            const start = 1.6 * fps + i * 2.5;
            return (
              <path
                key={i}
                d={letter.d}
                fill={INK}
                style={{
                  translate: interpolate(
                    frame,
                    [start, start + 0.65 * fps],
                    ["0px 85px", "0px 0px"],
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
        </g>
        <g clipPath="url(#sheet-wipe-descriptor)">
          <Interactive.Path
            name="Descriptor"
            d={DESCRIPTOR}
            fill={INK}
            fillRule="evenodd"
            style={{
              translate: interpolate(
                frame,
                [2.3 * fps, 3 * fps],
                ["0px 46px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
              ),
            }}
          />
        </g>
      </Stage>
      {/* Sheets are wider than the frame and slanted, so their edges never
          show while they cover it. Each one slides in from the left and
          out to the right. */}
      <Interactive.Div
        name="Sheet blue"
        style={{
          position: "absolute",
          top: 0,
          left: -340,
          width: 2600,
          height: 1080,
          backgroundColor: "#2E86AB",
          transform: "skewX(-14deg)",
          translate: interpolate(
            frame,
            [0, 16, 40, 56],
            ["-2700px 0px", "0px 0px", "0px 0px", "2700px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [
                Easing.bezier(0.7, 0, 0.3, 1),
                Easing.linear,
                Easing.bezier(0.7, 0, 0.3, 1),
              ],
            },
          ),
        }}
      />
      <Interactive.Div
        name="Sheet yellow"
        style={{
          position: "absolute",
          top: 0,
          left: -340,
          width: 2600,
          height: 1080,
          backgroundColor: "#F3A712",
          transform: "skewX(-14deg)",
          translate: interpolate(
            frame,
            [4, 20, 36, 52],
            ["-2700px 0px", "0px 0px", "0px 0px", "2700px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [
                Easing.bezier(0.7, 0, 0.3, 1),
                Easing.linear,
                Easing.bezier(0.7, 0, 0.3, 1),
              ],
            },
          ),
        }}
      />
      <Interactive.Div
        name="Sheet orange"
        style={{
          position: "absolute",
          top: 0,
          left: -340,
          width: 2600,
          height: 1080,
          backgroundColor: "#E4572E",
          transform: "skewX(-14deg)",
          translate: interpolate(
            frame,
            [8, 24, 32, 48],
            ["-2700px 0px", "0px 0px", "0px 0px", "2700px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [
                Easing.bezier(0.7, 0, 0.3, 1),
                Easing.linear,
                Easing.bezier(0.7, 0, 0.3, 1),
              ],
            },
          ),
        }}
      />
      <Interactive.Div
        name="Sheet green"
        style={{
          position: "absolute",
          top: 0,
          left: -340,
          width: 2600,
          height: 1080,
          backgroundColor: "#29A36A",
          transform: "skewX(-14deg)",
          translate: interpolate(
            frame,
            [12, 27, 28, 44],
            ["-2700px 0px", "0px 0px", "0px 0px", "2700px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [
                Easing.bezier(0.7, 0, 0.3, 1),
                Easing.linear,
                Easing.bezier(0.7, 0, 0.3, 1),
              ],
            },
          ),
        }}
      />
    </AbsoluteFill>
  );
};
