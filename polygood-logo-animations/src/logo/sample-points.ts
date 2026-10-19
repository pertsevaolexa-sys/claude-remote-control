import { random } from "remotion";

type Box = { x: number; y: number; width: number; height: number };

// Picks `count` seeded points that lie inside the filled area of an SVG path,
// at least `inset` units away from its edge (checked at 8 points around the
// candidate). Uses Path2D, which accepts SVG path strings as is.
export const samplePointsInside = ({
  d,
  box,
  count,
  inset,
  seed,
}: {
  d: string;
  box: Box;
  count: number;
  inset: number;
  seed: string;
}): { x: number; y: number }[] => {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas is not available");
  }
  const path = new Path2D(d);
  const inside = (x: number, y: number) => ctx.isPointInPath(path, x, y);

  const points: { x: number; y: number }[] = [];
  for (
    let attempt = 0;
    points.length < count && attempt < count * 200;
    attempt++
  ) {
    const x = box.x + random(`${seed}-x-${attempt}`) * box.width;
    const y = box.y + random(`${seed}-y-${attempt}`) * box.height;
    let fits = inside(x, y);
    for (let k = 0; fits && k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      fits = inside(x + Math.cos(angle) * inset, y + Math.sin(angle) * inset);
    }
    if (fits) {
      points.push({ x, y });
    }
  }
  return points;
};
