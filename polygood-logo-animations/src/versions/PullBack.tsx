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
import { NIGHT, PAPER } from "../logo/palette";
import { DESCRIPTOR, LETTERS, LOGO_BOX, MARK, MARK_BOX } from "../logo/paths";
import { LOGO_CENTER, Stage } from "../logo/Stage";

// Version 5, on a dark background: the camera starts close in on the
// arrowhead of the mark and pulls back, then pans so the letters can drift
// in out of focus. A band of colour glints across the finished logo.
export const PullBackComposition: React.FC = () => {
  return (
    <Composition
      id="PullBack"
      component={PullBack}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

// Where the camera starts: the arrowhead of the mark.
const FOCUS = { x: 214, y: 341 };
const MARK_CENTER = {
  x: MARK_BOX.x + MARK_BOX.width / 2,
  y: MARK_BOX.y + MARK_BOX.height / 2,
};

export const PullBack: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The logo point that sits at the centre of the frame: the arrowhead,
  // then the middle of the mark, then the middle of the lockup.
  const lookAt = (from: number, via: number, to: number) =>
    interpolate(
      frame,
      [0, 2.4 * fps, 2.5 * fps, 3.3 * fps],
      [from, via, via, to],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: [
          Easing.bezier(0.76, 0, 0.24, 1),
          Easing.linear,
          Easing.bezier(0.65, 0, 0.35, 1),
        ],
      },
    );
  const zoom = interpolate(frame, [0, 2.4 * fps], [7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
    output: "perceptual-scale",
  });
  const tilt = interpolate(frame, [0, 2.4 * fps], [-18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.76, 0, 0.24, 1),
  });
  const camera = `translate(${LOGO_CENTER.x} ${LOGO_CENTER.y}) rotate(${tilt}) scale(${zoom}) translate(${-lookAt(FOCUS.x, MARK_CENTER.x, LOGO_CENTER.x)} ${-lookAt(FOCUS.y, MARK_CENTER.y, LOGO_CENTER.y)})`;

  const sheenX = interpolate(
    frame,
    [4.3 * fps, 5.5 * fps],
    // The band is slanted, so it needs room past both ends of the logo.
    [LOGO_BOX.x - 40, LOGO_BOX.x + LOGO_BOX.width + 190],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.45, 0, 0.55, 1),
    },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT }}>
      <Stage>
        <defs>
          <clipPath id="pull-back-logo">
            <path d={MARK} />
            {LETTERS.map((letter, i) => (
              <path key={i} d={letter.d} />
            ))}
            <path d={DESCRIPTOR} clipRule="evenodd" />
          </clipPath>
          <linearGradient id="pull-back-sheen" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#F3A712" stopOpacity={0} />
            <stop offset="0.3" stopColor="#F3A712" />
            <stop offset="0.5" stopColor="#E4572E" />
            <stop offset="0.7" stopColor="#2E86AB" />
            <stop offset="1" stopColor="#2E86AB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <g transform={camera}>
          <path d={MARK} fill={PAPER} />
          {LETTERS.map((letter, i) => {
            const start = 2.6 * fps + i * 3;
            return (
              <path
                key={i}
                d={letter.d}
                fill={PAPER}
                style={{
                  opacity: interpolate(
                    frame,
                    [start, start + 0.6 * fps],
                    [0, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(0.33, 1, 0.68, 1),
                    },
                  ),
                  filter: `blur(${interpolate(
                    frame,
                    [start, start + 0.6 * fps],
                    [10, 0],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(0.33, 1, 0.68, 1),
                    },
                  )}px)`,
                  translate: interpolate(
                    frame,
                    [start, start + 0.6 * fps],
                    ["16px 0px", "0px 0px"],
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
          <Interactive.Path
            name="Descriptor"
            d={DESCRIPTOR}
            fill={PAPER}
            fillRule="evenodd"
            style={{
              opacity: interpolate(frame, [3.4 * fps, 4.2 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.33, 1, 0.68, 1),
              }),
              translate: interpolate(
                frame,
                [3.4 * fps, 4.2 * fps],
                ["0px 8px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
              ),
            }}
          />
          <g clipPath="url(#pull-back-logo)">
            <rect
              x={0}
              y={250}
              width={110}
              height={220}
              fill="url(#pull-back-sheen)"
              transform={`translate(${sheenX} 0) skewX(-20)`}
              opacity={0.95}
            />
          </g>
        </g>
      </Stage>
    </AbsoluteFill>
  );
};
