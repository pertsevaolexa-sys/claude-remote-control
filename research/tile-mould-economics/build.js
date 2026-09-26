#!/usr/bin/env node
// Inlines model.js into template.html.
//   node build.js                -> index.html (standalone page you can open in a browser)
//   node build.js <fragment.html> -> also writes the page body without <html>/<head>/<body>,
//                                    the form an artifact host wraps itself.
'use strict';

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const template = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
const model = fs.readFileSync(path.join(dir, 'model.js'), 'utf8');
if (!template.includes('/*__MODEL__*/')) throw new Error('template.html is missing the /*__MODEL__*/ placeholder');
const fragment = template.replace('/*__MODEL__*/', () => model.trim());

// Head material is everything up to the end of the first <style> block.
const cut = fragment.indexOf('</style>') + '</style>'.length;
const standalone = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  fragment.slice(0, cut),
  '</head>',
  '<body>',
  fragment.slice(cut).trim(),
  '</body>',
  '</html>',
  '',
].join('\n');

fs.writeFileSync(path.join(dir, 'index.html'), standalone);
console.log('wrote index.html', standalone.length, 'bytes');

const out = process.argv[2];
if (out) {
  fs.writeFileSync(out, fragment);
  console.log('wrote', out, fragment.length, 'bytes');
}
