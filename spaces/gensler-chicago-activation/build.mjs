/* ═══════════════════════════════════════════════════════════════════════════
   BUILD — inline the whole model into one self-contained HTML file.

   Run after editing config.js (or anything else):

       node build.mjs

   Output: dist/index.html — zero runtime dependencies, nothing fetched, so it
   deploys as a static file anywhere and still works if someone saves it to
   their desktop.
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(here, f), 'utf8');

const ORDER = ['vendor/three.min.js', 'config.js', 'lib.js', 'venue.js',
               'installation.js', 'annotations.js', 'app.js'];

let html = read('index.html');

for (const file of ORDER) {
  const tag = `<script src="${file}"></script>`;
  if (!html.includes(tag)) throw new Error(`index.html has no <script src="${file}">`);
  let js = read(file);
  // a literal </script inside the JS would close the tag early; harmless to
  // escape because \/ is just / in a JS string, and it cannot appear elsewhere
  js = js.split('</script').join('<\\/script');
  html = html.replace(tag, `<script>\n/* ─── ${file} ─── */\n${js}\n</script>`);
}

/* additions that only matter once this is served over the web */
const head = `
<meta name="description" content="Concept model — Polygood installation for the Gensler Chicago office activation. Not for fabrication.">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f4f2ed'/%3E%3Cg fill='none' stroke='%237a2a3c' stroke-width='2'%3E%3Cpath d='M6 6h20v20H6z'/%3E%3Cpath d='M6 16h20M16 6v20'/%3E%3C/g%3E%3C/svg%3E">
`;
html = html.replace('</head>', head + '</head>');

const banner = `<!--
  Gensler Chicago office activation — Polygood concept model
  CONCEPT MODEL — NOT FOR FABRICATION.
  No dimension here is a site measurement. No texture is colour-accurate or
  tied to a SKU. The Growth credit line is proposed and subject to brand
  approval. Built from spaces/gensler-chicago-activation/ — edit config.js
  there and re-run: node build.mjs
-->
`;
html = banner + html;

fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
fs.writeFileSync(path.join(here, 'dist/index.html'), html);
console.log('dist/index.html  ' + (html.length / 1024).toFixed(0) + ' KB (single file, no dependencies)');
