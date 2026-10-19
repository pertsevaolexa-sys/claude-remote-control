import { Easing, interpolate } from "remotion";
import { EASE } from "./config/theme";

type Bezier = readonly [number, number, number, number];

export const bezier = (b: Bezier) => Easing.bezier(b[0], b[1], b[2], b[3]);

// 0 → 1 between two frames, clamped, eased.
export const ramp = (
  frame: number,
  range: readonly [number, number],
  ease: Bezier = EASE.out,
) =>
  interpolate(frame, [range[0], range[1]], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: bezier(ease),
  });

// 0 → 1 → 0 window with eased in and out edges.
export const windowed = (
  frame: number,
  inRange: readonly [number, number],
  outRange: readonly [number, number],
) => ramp(frame, inRange) * (1 - ramp(frame, outRange, EASE.in));
