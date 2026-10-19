// Export the film's timing, layout and geometry to blender/scene-data.json,
// so the Blender scene is built from exactly the same numbers as the
// Remotion film (same beats, same parts, same toolpaths).
//
//   node blender/export-scene-data.mjs

import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "src");

const entry = `
import * as timing from "./config/timing";
import { LAYOUTS } from "./config/layout";
import { COLORS } from "./config/theme";
import { ASSETS, MATERIAL_LEVELS, MACRO_CENTER, FINISH } from "./config/assets";
import { SHEET, PARTS, DRAW_SCALE, DIMENSION_STROKES, SHEET_TOOLPATH, OFFCUTS, nestedOutline } from "./geometry/sheet";
import { PLOT_STROKES } from "./geometry/drawing";
import { PANEL, PANEL_SOURCE, CUTOUTS, PANEL_TOOLPATH } from "./geometry/partition";
import { profileContour, PROFILE_POINTS } from "./geometry/profiles";

export const data = {
  timing,
  layouts: LAYOUTS,
  colors: COLORS,
  assets: { ...ASSETS, materialLevels: MATERIAL_LEVELS, macroCenter: MACRO_CENTER, finish: FINISH },
  sheet: SHEET,
  drawScale: DRAW_SCALE,
  parts: PARTS.map((p) => ({ ...p, nestedOutline: nestedOutline(p) })),
  plotStrokes: PLOT_STROKES,
  dimensionStrokes: DIMENSION_STROKES,
  sheetToolpath: SHEET_TOOLPATH,
  offcuts: OFFCUTS,
  panel: PANEL,
  panelSource: PANEL_SOURCE,
  cutouts: CUTOUTS,
  panelToolpath: PANEL_TOOLPATH,
  profiles: {
    points: PROFILE_POINTS,
    thickness: 19,
    contours: Object.fromEntries(
      ["square", "bullnose", "chamfer", "bevelled"].map((id) => [id, profileContour(id as never, 19)]),
    ),
  },
};
`;

const out = path.join(here, ".scene-data.bundle.mjs");
await build({
  stdin: { contents: entry, resolveDir: src, loader: "ts" },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: out,
  logLevel: "error",
});
const { data } = await import(pathToFileURL(out).href);
const target = path.join(here, "scene-data.json");
writeFileSync(target, JSON.stringify(data));
console.log(`wrote ${path.relative(process.cwd(), target)}`);
