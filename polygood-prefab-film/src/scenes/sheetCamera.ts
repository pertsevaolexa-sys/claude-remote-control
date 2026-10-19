import { Layout } from "../config/layout";
import { Camera } from "../geometry/camera";
import { SHEET } from "../geometry/sheet";

// Camera that frames the whole sheet on the stage (end of scene 01, all of 02).
export const sheetCamera = (layout: Layout): Camera => ({
  x: SHEET.w / 2,
  y: SHEET.h / 2,
  k: layout.sheetWidthPx / SHEET.w,
});

// Where the tabletop sits, in world coordinates, when it is handed from
// scene 02 to scene 03: centred on the stage at tabletopWidthPx wide.
export const tabletopPresentation = (layout: Layout) => {
  const k = layout.sheetWidthPx / SHEET.w;
  const s = layout.tabletopWidthPx / (1600 * k);
  return { x: SHEET.w / 2 - 800 * s, y: SHEET.h / 2 - 400 * s, s };
};

// Shadow under lifted parts, shared by the SVG (scene 02) and CSS (scene 03).
export const LIFT_SHADOW = { dy: 10, blur: 10, opacity: 0.3 };
