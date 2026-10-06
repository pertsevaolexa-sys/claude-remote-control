#!/usr/bin/env node
/* Bundle the workbook into single files (no build step is needed to *run* it; this only inlines).
 *
 *   node tools/build.mjs
 *
 * dist/pm-steps-workbook.html  complete standalone page: open it from disk or host it anywhere
 * dist/artifact.html           the same content without the html/head/body skeleton, for publishing
 *                              as a claude.ai Artifact (the platform adds the skeleton)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let html = read('index.html').replace(/\n?<!-- [^>]*-->\n?/g, '\n');

html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (m, href) => '<style>\n' + read(href) + '\n</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, src) => {
  const code = read(src).replace(/<\/script/gi, '<\\/script');
  return '<script>\n/* ' + src + ' */\n' + code + '\n</script>';
});

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/pm-steps-workbook.html'), html);

// Artifact page: title first, no doctype/html/head/body, no charset/viewport (the skeleton has them).
let frag = html
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<html[^>]*>\s*/i, '')
  .replace(/<\/html>\s*/i, '')
  .replace(/<head>\s*/i, '')
  .replace(/<\/head>\s*/i, '')
  .replace(/<body>\s*/i, '')
  .replace(/<\/body>\s*/i, '')
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
if (!frag.trimStart().startsWith('<title>')) throw new Error('The artifact page must start with its <title>.');
fs.writeFileSync(path.join(root, 'dist/artifact.html'), frag);

const kb = (p) => Math.round(fs.statSync(path.join(root, p)).size / 1024) + ' KB';
console.log('dist/pm-steps-workbook.html', kb('dist/pm-steps-workbook.html'));
console.log('dist/artifact.html', kb('dist/artifact.html'));
