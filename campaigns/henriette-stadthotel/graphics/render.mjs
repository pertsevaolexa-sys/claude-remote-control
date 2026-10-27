#!/usr/bin/env node
// Renders the campaign graphics from JSON specs and the real project photos.
//
//   node render.mjs                      render every spec in specs/
//   node render.mjs specs/linkedin.json  render one spec
//   --photos <dir>  --brand <dir>  --out <dir>  override asset and output folders
//
// Output: out/<spec>/NN-<layout>.png plus out/<spec>/_contact.png for a quick review.
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// require() also finds a globally installed Playwright through NODE_PATH.
const { chromium } = createRequire(import.meta.url)("playwright");

const here = path.dirname(fileURLToPath(import.meta.url));
const campaign = path.resolve(here, "..");

const DARK_BACKGROUNDS = new Set(["ink", "sapphire", "emerald", "terracotta"]);

function parseArgs(argv) {
  const opts = {
    specs: [],
    photos: path.join(campaign, "assets/photos"),
    brand: path.join(campaign, "assets/brand"),
    out: path.join(here, "out"),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--photos") opts.photos = path.resolve(argv[++i]);
    else if (arg === "--brand") opts.brand = path.resolve(argv[++i]);
    else if (arg === "--out") opts.out = path.resolve(argv[++i]);
    else opts.specs.push(path.resolve(arg));
  }
  return opts;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

// Escapes text and turns **word** into a highlighted span.
function text(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>')
    .replace(/\n/g, "<br>");
}

async function loadAssets(opts) {
  const manifest = JSON.parse(await readFile(path.join(campaign, "assets/photos.json"), "utf8"));
  const photos = new Map();
  for (const photo of manifest.photos) {
    const file = path.join(opts.photos, photo.file);
    photos.set(photo.id, {
      ...photo,
      url: (await exists(file)) ? pathToFileURL(file).href : null,
      credit: manifest.credits[photo.set],
    });
  }
  // Logos are inlined so the page can crop the empty canvas around them (see trimLogos).
  const logos = {};
  for (const [tone, name] of [["light", "Polygood_horizontal_white.svg"], ["dark", "Polygood_horizontal_Black.svg"]]) {
    const file = path.join(opts.brand, name);
    logos[tone] = (await exists(file)) ? (await readFile(file, "utf8")).replace(/<\?xml[^>]*>/, "") : null;
  }
  // On dark frames layouts.css recolours black fills, so the black file can stand in for the white one.
  logos.light ??= logos.dark;
  return { photos, logos };
}

function slideHtml(spec, slide, index, assets, warnings) {
  const photo = (id, focus = "50% 50%", extraClass = "photo") => {
    const item = assets.photos.get(id);
    if (!item) {
      warnings.push(`slide ${index + 1}: unknown photo id "${id}"`);
      return `<div class="${extraClass} missing">unknown photo ${text(id)}</div>`;
    }
    if (!item.url) {
      warnings.push(`slide ${index + 1}: photo ${id} not found in assets/photos/ (${item.file})`);
      return `<div class="${extraClass} missing">missing photo ${text(id)}</div>`;
    }
    return `<div class="${extraClass}" style="background-image:url('${item.url}');background-position:${focus}"></div>`;
  };
  const creditsFor = (ids) =>
    [...new Set(ids.map((id) => assets.photos.get(id)?.credit).filter(Boolean))].join("  ·  ");
  const logo = (tone) =>
    assets.logos[tone]
      ? `<span class="logo">${assets.logos[tone]}</span>`
      : `<span class="logo wordmark">polygood<sup>®</sup></span>`;
  const counter = spec.counter ? `<div class="counter">${index + 1}/${spec.slides.length}</div>` : "";
  const textBlock = (s, cls = "") => `
    <div class="block ${cls}">
      ${s.eyebrow ? `<div class="eyebrow">${text(s.eyebrow)}</div>` : ""}
      ${s.headline ? `<h1 class="headline">${text(s.headline)}</h1>` : ""}
      ${s.body ? `<p class="body">${text(s.body)}</p>` : ""}
    </div>`;

  const bg = slide.bg || "paper";
  const tone = DARK_BACKGROUNDS.has(bg) ? "light" : "dark";

  switch (slide.layout) {
    case "photo-hook":
      return `
        <div class="frame light">
          ${photo(slide.photo, slide.focus)}
          <div class="shade"></div>
          <div class="top-left">${logo("light")}</div>
          ${counter}
          ${textBlock(slide, "hook")}
          <div class="credit">${text(creditsFor([slide.photo]))}</div>
        </div>`;

    case "photo-split":
      return `
        <div class="frame split bg-${bg} ${tone}">
          <div class="split-photo">
            ${photo(slide.photo, slide.focus)}
            <div class="credit on-photo">${text(creditsFor([slide.photo]))}</div>
            ${slide.tag ? `<div class="tag">${text(slide.tag)}</div>` : ""}
          </div>
          ${counter}
          ${textBlock(slide, "panel")}
          <div class="bottom-right">${logo(tone)}</div>
        </div>`;

    case "triptych": {
      const items = slide.items || [];
      return `
        <div class="frame bg-${bg} ${tone}">
          ${counter}
          ${textBlock(slide, "top")}
          <div class="tiles">
            ${items
              .map(
                (item) => `
              <figure class="tile">
                ${photo(item.photo, item.focus, "tile-photo")}
                <figcaption><strong>${text(item.label)}</strong>${item.sub ? `<span>${text(item.sub)}</span>` : ""}</figcaption>
              </figure>`,
              )
              .join("")}
          </div>
          <div class="credit">${text(creditsFor(items.map((item) => item.photo)))}</div>
          <div class="bottom-right">${logo(tone)}</div>
        </div>`;
    }

    case "quote":
      return `
        <div class="frame bg-${bg} ${tone}">
          ${counter}
          <div class="block quote">
            ${slide.eyebrow ? `<div class="eyebrow">${text(slide.eyebrow)}</div>` : ""}
            <div class="mark">“</div>
            <blockquote>${text(slide.quote)}</blockquote>
            <div class="attribution"><strong>${text(slide.name)}</strong>${slide.role ? `<span>${text(slide.role)}</span>` : ""}</div>
          </div>
          <div class="bottom-right">${logo(tone)}</div>
        </div>`;

    case "statement":
      return `
        <div class="frame bg-${bg} ${tone}">
          ${counter}
          <div class="block statement">
            ${slide.eyebrow ? `<div class="eyebrow">${text(slide.eyebrow)}</div>` : ""}
            <div class="big">${text(slide.big)}</div>
            ${slide.body ? `<p class="body">${text(slide.body)}</p>` : ""}
            ${slide.note ? `<p class="note">${text(slide.note)}</p>` : ""}
          </div>
          <div class="bottom-right">${logo(tone)}</div>
        </div>`;

    case "cta":
      return `
        <div class="frame bg-${slide.bg || "ink"} light">
          ${counter}
          <div class="block cta">
            ${slide.eyebrow ? `<div class="eyebrow">${text(slide.eyebrow)}</div>` : ""}
            <h1 class="headline">${text(slide.headline)}</h1>
            <ul class="actions">${(slide.actions || []).map((a) => `<li>${text(a)}</li>`).join("")}</ul>
            ${slide.footer ? `<div class="footer">${text(slide.footer)}</div>` : ""}
          </div>
          <div class="bottom-right">${logo("light")}</div>
        </div>`;

    case "story":
      return `
        <div class="frame light">
          ${photo(slide.photo, slide.focus)}
          <div class="shade soft"></div>
          <div class="story-card ${slide.position === "bottom" ? "at-bottom" : "at-top"}">
            ${textBlock(slide, "card")}
          </div>
          <div class="credit">${text(creditsFor([slide.photo]))}</div>
          <div class="top-left">${slide.position === "bottom" ? logo("light") : ""}</div>
        </div>`;

    case "banner":
      return `
        <div class="frame banner bg-${bg} ${tone}">
          <div class="banner-photo">
            ${photo(slide.photo, slide.focus)}
            <div class="credit on-photo">${text(creditsFor([slide.photo]))}</div>
          </div>
          ${textBlock(slide, "banner-text")}
          <div class="banner-logo">${logo(tone)}</div>
        </div>`;

    default:
      warnings.push(`slide ${index + 1}: unknown layout "${slide.layout}"`);
      return `<div class="frame missing">unknown layout ${text(slide.layout)}</div>`;
  }
}

function pageHtml(spec, body, tokensCss, layoutCss) {
  const [width] = spec.size;
  const rem = (width / 108) * (spec.scale || 1);
  return `<!doctype html><html><head><meta charset="utf-8">
    <style>${tokensCss}</style>
    <style>html{font-size:${rem}px}${layoutCss}</style>
  </head><body>${body}</body></html>`;
}

// The Notion logo files place the mark on a large empty canvas; crop each to its drawing.
async function trimLogos(page) {
  await page.evaluate(() => {
    document.querySelectorAll(".logo svg").forEach((svg) => {
      const box = (svg.querySelector("g") || svg).getBBox();
      svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
    });
  });
}

// Shrinks headline and body text until each block fits its box.
async function fitText(page) {
  return page.evaluate(() => {
    const unresolved = [];
    document.querySelectorAll(".block").forEach((block, i) => {
      const targets = block.querySelectorAll(".headline, .body, blockquote, .big, .actions");
      for (let step = 0; step < 14 && block.scrollHeight > block.clientHeight + 1; step++) {
        targets.forEach((el) => {
          const size = parseFloat(getComputedStyle(el).fontSize);
          el.style.fontSize = `${size * 0.94}px`;
        });
      }
      if (block.scrollHeight > block.clientHeight + 1) unresolved.push(i);
    });
    return unresolved;
  });
}

async function contactSheet(browser, dir, files, size) {
  const [w, h] = size;
  const thumbW = 360;
  const thumbH = Math.round((thumbW * h) / w);
  const cols = Math.min(files.length, 4);
  const html = `<!doctype html><html><body style="margin:0;padding:16px;background:#ddd;font:14px sans-serif;
      display:grid;grid-template-columns:repeat(${cols},${thumbW}px);gap:16px">
    ${files
      .map(
        (f) => `<figure style="margin:0"><img src="${pathToFileURL(path.join(dir, f)).href}"
        style="width:${thumbW}px;height:${thumbH}px;display:block"><figcaption>${f}</figcaption></figure>`,
      )
      .join("")}</body></html>`;
  const htmlFile = path.join(dir, "_contact.html");
  await writeFile(htmlFile, html);
  const page = await browser.newPage({ viewport: { width: cols * (thumbW + 16) + 16, height: 400 } });
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
  await page.screenshot({ path: path.join(dir, "_contact.png"), fullPage: true });
  await page.close();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.specs.length === 0) {
    const dir = path.join(here, "specs");
    opts.specs = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort().map((f) => path.join(dir, f));
  }
  const tokensCss = await readFile(path.join(here, "brand/tokens.css"), "utf8");
  const layoutCss = await readFile(path.join(here, "layouts.css"), "utf8");
  const assets = await loadAssets(opts);
  const browser = await chromium.launch();
  let problems = 0;

  for (const specFile of opts.specs) {
    const spec = JSON.parse(await readFile(specFile, "utf8"));
    const name = path.basename(specFile, ".json");
    const dir = path.join(opts.out, name);
    await mkdir(dir, { recursive: true });
    const [width, height] = spec.size;
    const page = await browser.newPage({ viewport: { width, height } });
    const files = [];

    for (const [i, slide] of spec.slides.entries()) {
      const warnings = [];
      // Loaded from a file so the page may read the local photos and logos.
      const htmlFile = path.join(dir, "_slide.html");
      await writeFile(htmlFile, pageHtml(spec, slideHtml(spec, slide, i, assets, warnings), tokensCss, layoutCss));
      await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      await trimLogos(page);
      const unresolved = await fitText(page);
      if (unresolved.length) warnings.push(`slide ${i + 1}: text still too long for its box, shorten it`);
      const file = `${String(i + 1).padStart(2, "0")}-${slide.layout}.png`;
      await page.screenshot({ path: path.join(dir, file) });
      files.push(file);
      for (const w of warnings) console.warn(`  ! ${name}: ${w}`);
      problems += warnings.length;
    }
    await page.close();
    await contactSheet(browser, dir, files, spec.size);
    await writeFile(path.join(dir, "_spec.json"), JSON.stringify(spec, null, 2));
    console.log(`${name}: ${files.length} images → ${dir}`);
  }

  await browser.close();
  if (problems) {
    console.warn(`\n${problems} warning(s). Fix them before using the images.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
