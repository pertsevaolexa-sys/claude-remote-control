// Render selected frames as JPEGs for visual review, bundling once.
//
//   node scripts/stills.mjs <compositionId> <outDir> <frame> [frame...]
//   node scripts/stills.mjs PolygoodPrefab-Reels out/stills 0 30 59
//
// Use `--contact` to also write a contact sheet (needs ffmpeg).

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const contact = args.includes("--contact");
const [id, outDir, ...frames] = args.filter((a) => a !== "--contact");
if (!id || !outDir || frames.length === 0) {
  console.error(
    "usage: node scripts/stills.mjs <compositionId> <outDir> <frame...> [--contact]",
  );
  process.exit(1);
}

// Use a local Chromium when one is configured (e.g. in sandboxes without
// access to Remotion's browser download).
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id,
  browserExecutable,
});
const files = [];
for (const f of frames.map(Number)) {
  const output = path.join(outDir, `${id}-${String(f).padStart(3, "0")}.jpg`);
  await renderStill({
    serveUrl,
    composition,
    frame: f,
    output,
    imageFormat: "jpeg",
    jpegQuality: 88,
    browserExecutable,
  });
  files.push(output);
  console.log(output);
}

if (contact) {
  const cols = Math.min(6, files.length);
  const rows = Math.ceil(files.length / cols);
  const sheet = path.join(outDir, `${id}-contact.jpg`);
  const w = 270;
  const h = Math.round((w * composition.height) / composition.width);
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    ...files.flatMap((f) => ["-i", f]),
    "-filter_complex",
    files.map((_, i) => `[${i}:v]scale=${w}:${h}[v${i}]`).join(";") +
      ";" +
      files.map((_, i) => `[v${i}]`).join("") +
      `xstack=inputs=${files.length}:layout=` +
      files
        .map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`)
        .join("|") +
      `:fill=white`,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    sheet,
  ]);
  console.log(sheet, `${cols}x${rows}`);
}
