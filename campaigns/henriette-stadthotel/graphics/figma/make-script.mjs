#!/usr/bin/env node
// Writes ready-to-run scripts for the Figma use_figma tool from the rendered layer dumps.
//
//   node render.mjs --dump                      first: render and write out/<spec>/layers.json
//   node figma/make-script.mjs setup            → out/figma/00-setup.js   (page, read-me, logo component)
//   node figma/make-script.mjs build <LOGO_ID> [hashes.json]
//                                               → out/figma/NN-build.js   (one script per call)
//   node figma/make-script.mjs photos hashes.json
//                                               → out/figma/photos.js     (fills existing placeholders)
//
// Pass each file's content as the `code` of one use_figma call. hashes.json maps photo ids to
// Figma imageHash values ({"J123": "…"}); without it photos become labelled placeholders.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const graphics = path.resolve(here, "..");
const campaign = path.resolve(graphics, "..");
const outDir = path.join(graphics, "out/figma");

// Section order on the canvas, titles and notes. One use_figma call per group keeps each under 50k chars.
const GROUPS = [
  [
    { spec: "instagram-carousel", title: "Instagram · collab carousel · 1080×1350", note: "Collab post with @hotel.henriette. Starter copy; final text comes from outputs/henriette/04-instagram.md" },
    { spec: "instagram-story", title: "Instagram · Stories · 1080×1920", note: "Frame 1: add the quiz sticker over the empty lower half" },
  ],
  [
    { spec: "linkedin-carousel", title: "LinkedIn · document carousel · 1080×1350", note: "Export as one PDF. Link to the case goes in the first comment" },
    { spec: "newsletter", title: "Newsletter · hero and quote band · 1200×600", note: "Shown at 600 px wide in the email" },
    { spec: "website-og", title: "Website · case link preview · 1200×630", note: "The case page itself uses the photos without text" },
  ],
];

const READ_ME = [
  "Polygood × Henriette Stadthotel Vienna — campaign drafts v1",
  "Status: first drafts with starter copy from campaigns/henriette-stadthotel/03-channel-kit.md. Everything is editable: text, colours, positions.",
  "Photos: frames named photo/<id> hold the real project photos (ids from assets/photos.json). Credits are on every photo slide and must stay.",
  "Before publishing: replace the temporary colours and fonts with the Polygood brandbook; confirm the material source before using \"fridges\" in our own voice; confirm GreenSign Circular status; get Verena Brandtner-Pastuszyn's OK on quotes; get the hotel's OK for the collab post and booking link.",
  "Instagram slide 3 needs an Emerald Ghost close-up (probably J124 or J125).",
];

async function setup() {
  let svg = await readFile(path.join(campaign, "assets/brand/Polygood_horizontal_Black.svg"), "utf8");
  // The Notion file draws the logo inside a clip rect on a large empty canvas; crop to that rect.
  const clip = svg.match(/<rect width="([\d.]+)" height="([\d.]+)"[^>]*translate\(([\d.]+) ([\d.]+)\)/);
  if (clip) {
    const [, w, h, x, y] = clip;
    svg = svg
      .replace(/<svg[^>]*>/, (tag) => tag.replace(/width="[^"]*"/, `width="${w}"`).replace(/height="[^"]*"/, `height="${h}"`).replace(/viewBox="[^"]*"/, `viewBox="${x} ${y} ${w} ${h}"`));
  }
  return `const SVG = ${JSON.stringify(svg)};
const READ_ME = ${JSON.stringify(READ_ME)};
await Promise.all([{ family: "Inter", style: "Regular" }, { family: "Inter", style: "Semi Bold" }].map((f) => figma.loadFontAsync(f)));
figma.currentPage.name = "Drafts v1";

const logoFrame = figma.createNodeFromSvg(SVG);
const logo = figma.createComponentFromNode(logoFrame);
logo.name = "logo/polygood";
logo.x = -800;
logo.y = 0;

const readMe = figma.createAutoLayout("VERTICAL", { name: "Read me", itemSpacing: 16 });
readMe.paddingTop = readMe.paddingBottom = readMe.paddingLeft = readMe.paddingRight = 48;
readMe.fills = [{ type: "SOLID", color: { r: 0.965, g: 0.949, b: 0.925 } }];
readMe.cornerRadius = 24;
readMe.x = 0;
readMe.y = 0;
READ_ME.forEach((line, i) => {
  const t = figma.createText();
  t.fontName = { family: "Inter", style: i === 0 ? "Semi Bold" : "Regular" };
  t.characters = line;
  t.fontSize = i === 0 ? 40 : 24;
  t.lineHeight = { unit: "PERCENT", value: 140 };
  readMe.appendChild(t);
  t.textAutoResize = "HEIGHT";
  t.resize(1400, t.height);
});
const fonts = (await figma.listAvailableFontsAsync()).filter((f) => f.fontName.family === "DM Serif Display").map((f) => f.fontName.style);
return { logoId: logo.id, readMeId: readMe.id, readMeHeight: readMe.height, dmSerifStyles: fonts };
`;
}

// Drops values builder.js assumes by default, so each script stays well under the 50k limit.
function compact(layers) {
  for (const slide of layers.slides) {
    for (const l of slide.layers) {
      if (l.radii && l.radii.every((r) => r === 0)) delete l.radii;
      if (l.ranges && l.ranges.length === 0) delete l.ranges;
      if (!l.shadow) delete l.shadow;
      if (l.opacity === 1) delete l.opacity;
      if (!l.upper) delete l.upper;
      if (!l.letterSpacing) delete l.letterSpacing;
      delete l.align;
      for (const k of ["lineHeight", "letterSpacing", "size", "x", "y", "w", "h"]) if (typeof l[k] === "number") l[k] = +l[k].toFixed(2);
    }
  }
  return layers;
}

async function build(logoId, hashesFile) {
  const builder = await readFile(path.join(here, "builder.js"), "utf8");
  const hashes = hashesFile ? JSON.parse(await readFile(hashesFile, "utf8")) : {};
  const scripts = [];
  let y = 700;
  for (const group of GROUPS) {
    const sections = [];
    for (const item of group) {
      const layers = compact(JSON.parse(await readFile(path.join(graphics, "out", item.spec, "layers.json"), "utf8")));
      sections.push({ title: item.title, note: item.note, y, layers });
      y += 100 * 2 + layers.size[1] + 60 + 200;
    }
    scripts.push(`const DATA = ${JSON.stringify({ sections })};
const LOGO_ID = ${JSON.stringify(logoId || "")};
const PHOTO_HASHES = ${JSON.stringify(hashes)};
${builder}`);
  }
  return scripts;
}

// After the photos are uploaded once (upload_assets without a target), this script puts each
// photo into every "photo/<id>" frame with the crop the renderer used, and removes the labels.
async function photos(hashesFile) {
  const hashes = JSON.parse(await readFile(hashesFile, "utf8"));
  const frames = [];
  for (const item of GROUPS.flat()) {
    const layers = JSON.parse(await readFile(path.join(graphics, "out", item.spec, "layers.json"), "utf8"));
    for (const slide of layers.slides) {
      const shots = slide.layers.filter((l) => l.kind === "photo").map(({ photo, focus, natural, w, h }) => ({ photo, focus, natural, w, h }));
      if (shots.length) frames.push({ frame: `${layers.spec} · ${slide.name}`, shots });
    }
  }
  return `const FRAMES = ${JSON.stringify(frames)};
const HASHES = ${JSON.stringify(hashes)};
const crop = (l, hash) => {
  const s = Math.max(l.w / l.natural.w, l.h / l.natural.h);
  const sw = l.natural.w * s, sh = l.natural.h * s;
  const [fx, fy] = l.focus.split(/\\s+/).map((v) => parseFloat(v) / 100);
  const px = (l.w - sw) * fx, py = (l.h - sh) * fy;
  return { type: "IMAGE", imageHash: hash, scaleMode: "CROP", imageTransform: [[l.w / sw, 0, -px / sw], [0, l.h / sh, -py / sh]] };
};
const updated = [], missing = [];
for (const { frame, shots } of FRAMES) {
  const slide = figma.currentPage.findOne((n) => n.type === "FRAME" && n.name === frame);
  const targets = slide ? slide.children.filter((n) => n.name.startsWith("photo/")) : [];
  shots.forEach((shot, i) => {
    const target = targets[i];
    if (!target || !HASHES[shot.photo] || !shot.natural) return missing.push(frame + " " + shot.photo);
    target.fills = [crop(shot, HASHES[shot.photo])];
    target.children.filter((c) => c.name === "placeholder-label").forEach((c) => c.remove());
    updated.push(target.id);
  });
}
return { mutatedNodeIds: updated, missing };
`;
}

const [mode, ...args] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });
if (mode === "photos") {
  const file = path.join(outDir, "photos.js");
  await writeFile(file, await photos(args[0]));
  console.log(file);
} else if (mode === "setup") {
  const file = path.join(outDir, "00-setup.js");
  await writeFile(file, await setup());
  console.log(file);
} else if (mode === "build") {
  const scripts = await build(args[0], args[1]);
  for (const [i, code] of scripts.entries()) {
    const file = path.join(outDir, `${String(i + 1).padStart(2, "0")}-build.js`);
    await writeFile(file, code);
    console.log(`${file}  (${code.length} chars)`);
  }
} else {
  console.error("usage: make-script.mjs setup | build <LOGO_ID> [hashes.json]");
  process.exit(1);
}
