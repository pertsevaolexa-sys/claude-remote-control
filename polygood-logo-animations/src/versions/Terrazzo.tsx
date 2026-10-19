import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Interactive,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FLAKES, INK, PAPER } from "../logo/palette";
import { DESCRIPTOR, LETTERS, LOGO_BOX, MARK } from "../logo/paths";
import { samplePointsInside } from "../logo/sample-points";
import { LOGO_CENTER, Stage } from "../logo/Stage";

// Version 2: loose flakes of coloured plastic drift across the frame, get
// pulled into the shape of the logo and press together into a black
// terrazzo sheet. The flakes then sink in and leave the plain logo.
export const TerrazzoComposition: React.FC = () => {
  return (
    <Composition
      id="Terrazzo"
      component={Terrazzo}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

const CHIP_COUNT = 400;
const CHIP_COLORS = [...FLAKES, "#FFFFFF"];

type Chip = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  curve: number;
  phase: number;
  size: number;
  rotateFrom: number;
  rotateTo: number;
  delay: number;
  sinkDelay: number;
  color: string;
  points: string;
};

const makeChips = (): Chip[] => {
  const targets = samplePointsInside({
    d: [MARK, ...LETTERS.map((letter) => letter.d)].join(" "),
    box: { x: LOGO_BOX.x, y: LOGO_BOX.y, width: LOGO_BOX.width, height: 120 },
    count: CHIP_COUNT,
    inset: 3.4,
    seed: "terrazzo",
  });

  return targets.map((to, i) => {
    const r = (key: string) => random(`chip-${i}-${key}`);
    const sides = 5 + Math.floor(r("sides") * 3);
    const points = new Array(sides)
      .fill(0)
      .map((_, k) => {
        const angle = ((k + r(`a${k}`) * 0.6) / sides) * Math.PI * 2;
        const radius = 0.65 + r(`r${k}`) * 0.35;
        return `${(Math.cos(angle) * radius).toFixed(3)},${(Math.sin(angle) * radius).toFixed(3)}`;
      })
      .join(" ");
    const rotateFrom = r("rot") * 360;

    return {
      // Spread over the whole frame (about 830 x 470 units) and a bit beyond.
      from: {
        x: LOGO_CENTER.x + (r("fx") - 0.5) * 900,
        y: LOGO_CENTER.y + (r("fy") - 0.5) * 520,
      },
      to,
      curve: (r("curve") - 0.5) * 160,
      phase: r("phase") * Math.PI * 2,
      size: 1.8 + r("size") * 1.6,
      rotateFrom,
      rotateTo: rotateFrom + (r("spin") - 0.5) * 360,
      // Flakes on the left leave a little earlier, so the logo fills in
      // left to right.
      delay: 8 + r("delay") * 16 + ((to.x - LOGO_BOX.x) / LOGO_BOX.width) * 14,
      sinkDelay: r("sink") * 16,
      color: CHIP_COLORS[Math.floor(r("color") * CHIP_COLORS.length)],
      points,
    };
  });
};

export const Terrazzo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chips = useMemo(makeChips, []);

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Stage>
        <Interactive.G
          name="Logo fill"
          style={{
            opacity: interpolate(frame, [1.9 * fps, 2.6 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.33, 1, 0.68, 1),
            }),
          }}
        >
          <path d={MARK} fill={INK} />
          {LETTERS.map((letter, i) => (
            <path key={i} d={letter.d} fill={INK} />
          ))}
        </Interactive.G>
        <g>
          {chips.map((chip, i) => {
            const travel = interpolate(
              frame,
              [chip.delay, chip.delay + 34],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.5, 0, 0.1, 1),
              },
            );
            const sink = interpolate(
              frame,
              [3.7 * fps + chip.sinkDelay, 4.4 * fps + chip.sinkDelay],
              [1, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.55, 0, 0.45, 1),
              },
            );
            if (sink === 0) {
              return null;
            }
            // Idle float before take-off, fading out as the flake travels.
            const drift = (1 - travel) * 8;
            const dx = chip.to.x - chip.from.x;
            const dy = chip.to.y - chip.from.y;
            const length = Math.hypot(dx, dy) || 1;
            const arc = Math.sin(travel * Math.PI) * chip.curve;
            const x =
              chip.from.x +
              dx * travel +
              (-dy / length) * arc +
              Math.sin(frame / 18 + chip.phase) * drift;
            const y =
              chip.from.y +
              dy * travel +
              (dx / length) * arc +
              Math.cos(frame / 22 + chip.phase) * drift;
            const rotate =
              chip.rotateFrom + (chip.rotateTo - chip.rotateFrom) * travel;
            const scale = chip.size * (2.4 - 1.4 * travel) * sink;

            return (
              <polygon
                key={i}
                points={chip.points}
                fill={chip.color}
                transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}
              />
            );
          })}
        </g>
        <Interactive.G
          name="Descriptor"
          style={{
            opacity: interpolate(frame, [3.9 * fps, 4.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [3.9 * fps, 4.8 * fps],
              ["0px 10px", "0px 0px"],
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
