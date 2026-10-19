// The plotted drawing in the order the pen draws it: the parts first (they
// become the components in scene 02), then elevation details and the title
// block. Shared by the Remotion film and the Blender export.

import { Pt } from "./polyline";
import {
  DETAIL_STROKES,
  DRAWN_PARTS,
  Stroke,
  drawingPartOutline,
  partById,
} from "./sheet";

// Start the tabletop plan at its top-right corner, where the opening macro
// looks, so the first line the plotter draws is in frame.
const startNear = (pts: Pt[], target: Pt): Pt[] => {
  const open = pts.slice(0, -1);
  let best = 0;
  open.forEach((p, i) => {
    if (
      Math.hypot(p[0] - target[0], p[1] - target[1]) <
      Math.hypot(open[best][0] - target[0], open[best][1] - target[1])
    ) {
      best = i;
    }
  });
  return [...open.slice(best), ...open.slice(0, best), open[best]];
};

const tabletop = partById("tabletop");

export const PLOT_STROKES: Stroke[] = [
  ...DRAWN_PARTS.map((id) => {
    const outline = drawingPartOutline(partById(id));
    const pts =
      id === "tabletop"
        ? startNear(outline, [tabletop.drawing.x + 1280, tabletop.drawing.y])
        : outline;
    return { kind: "part" as const, pts };
  }),
  ...DETAIL_STROKES,
];
