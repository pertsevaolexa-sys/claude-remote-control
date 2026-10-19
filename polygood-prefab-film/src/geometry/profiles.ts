// Edge profiles as cross-section contours. Each contour runs from the top
// face, around the edge, to the bottom face, with the edge at x = 0 and the
// slab body at x < 0. All contours are resampled to the same point count so
// one profile can morph into the next.

import { Pt, arc, resample } from "./polyline";

export type ProfileId = "square" | "bullnose" | "chamfer" | "bevelled";

export const PROFILE_POINTS = 240; // dense enough to keep chamfer corners crisp

const runIn = (T: number) => T * 1.3;

const raw = (id: ProfileId, T: number): Pt[] => {
  const R = runIn(T);
  switch (id) {
    case "square":
      return [
        [-R, 0],
        [0, 0],
        [0, T],
        [-R, T],
      ];
    case "bullnose":
      return [
        [-R, 0],
        [-T / 2, 0],
        ...arc(-T / 2, T / 2, T / 2, -Math.PI / 2, Math.PI / 2, 40).slice(1),
        [-R, T],
      ];
    case "chamfer": {
      const c = T * 0.3;
      return [
        [-R, 0],
        [-c, 0],
        [0, c],
        [0, T - c],
        [-c, T],
        [-R, T],
      ];
    }
    case "bevelled":
      return [
        [-R, 0],
        [-T * 0.9, 0],
        [0, T * 0.72],
        [0, T],
        [-R, T],
      ];
  }
};

export const profileContour = (id: ProfileId, T: number): Pt[] =>
  resample(raw(id, T), PROFILE_POINTS);

// Closed cross-section of a slab `width` wide whose right edge (x = 0) carries
// the given contour and whose left edge is its mirror image.
export const sectionPolygon = (contour: readonly Pt[], width: number): Pt[] => {
  const left = [...contour].reverse().map(([x, y]) => [-width - x, y] as const);
  return [...contour, ...left];
};
