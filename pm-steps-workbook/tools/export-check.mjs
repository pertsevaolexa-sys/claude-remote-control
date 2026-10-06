#!/usr/bin/env node
/* Build the Word and Excel exports in headless Chromium and validate them.
 *
 *   node tools/export-check.mjs                    your (empty) file: the fill-in template
 *   node tools/export-check.mjs --example          the example project
 *   node tools/export-check.mjs --no-empty --no-notes --no-graphics
 *   node tools/export-check.mjs --modules scope.js --extra tools/fixtures/core-test-section.js
 *   node tools/export-check.mjs --pages 1-6        also render these PDF pages to PNG (default: 1-4)
 *   node tools/export-check.mjs --name "PM file template"   base name of the output files
 *
 * Writes <out>/<name>.docx, .xlsx and .pdf (LibreOffice) plus page PNGs, checks the ZIP
 * containers, opens the files with python-docx and openpyxl and prints a summary. Exits 1 on failure.
 */
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('/opt/node22/lib/node_modules/playwright');
}

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  if (i < 0) return def;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(opt('out', '/tmp/pm-export'));
const example = !!opt('example', false);
const name = opt('name', example ? 'example' : 'template');
const modules = opt('modules', null);
const extra = opt('extra', null);
const pages = opt('pages', '1-4');
const exportOpts = { empty: !args.includes('--no-empty'), notes: !args.includes('--no-notes'), graphics: !args.includes('--no-graphics') };
fs.mkdirSync(out, { recursive: true });

let pageFile = path.join(root, 'index.html');
let tmpFile = null;
if (modules) {
  const html = fs.readFileSync(pageFile, 'utf8');
  const keep = String(modules).split(',').map((m) => m.trim().replace(/^js\/sections\//, ''));
  tmpFile = path.join(root, '.check-export-' + process.pid + '.html');
  fs.writeFileSync(tmpFile, html.replace(/<script src="js\/sections\/([^"]+)"><\/script>\n?/g, (m, f) => (keep.includes(f) ? m : '')));
  pageFile = tmpFile;
}
process.on('exit', () => {
  if (tmpFile) try { fs.unlinkSync(tmpFile); } catch {}
});

let failed = false;
const fail = (msg) => {
  failed = true;
  console.log('FAIL ' + msg);
};

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on('console', (m) => m.type() === 'error' && logs.push(m.text()));
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto(pathToFileURL(pageFile).href);
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload();
await page.waitForFunction(() => window.PMApp && window.PM && window.PM.app, null, { timeout: 15000 });
if (extra) await page.addScriptTag({ path: path.resolve(extra) });
if (example) await page.evaluate(() => PMApp.setExample(true));
const t0 = Date.now();
const res = await page.evaluate(async (o) => {
  const toB64 = (u8) => {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const docx = await PMApp.exportDocx(o);
  const xlsx = PMApp.exportXlsx();
  const model = await PMApp.exportModel(o);
  const counts = {};
  model.forEach((b) => (counts[b.type] = (counts[b.type] || 0) + 1));
  return { docx: toB64(docx), xlsx: toB64(xlsx), counts, sheets: PMApp.sheets().length };
}, exportOpts);
await browser.close();
const ms = Date.now() - t0;
for (const l of logs) fail('console: ' + l.slice(0, 300));

const docxPath = path.join(out, name + '.docx');
const xlsxPath = path.join(out, name + '.xlsx');
fs.writeFileSync(docxPath, Buffer.from(res.docx, 'base64'));
fs.writeFileSync(xlsxPath, Buffer.from(res.xlsx, 'base64'));
console.log('model blocks', JSON.stringify(res.counts), '| sheets', res.sheets, '| built in', ms, 'ms');
console.log('docx', Math.round(fs.statSync(docxPath).size / 1024) + ' KB', '| xlsx', Math.round(fs.statSync(xlsxPath).size / 1024) + ' KB');

const py = `
import sys, zipfile, re
from xml.dom import minidom
ok = True
for p in sys.argv[1:3]:
    z = zipfile.ZipFile(p)
    bad = z.testzip()
    if bad: print('FAIL zip entry corrupt', p, bad); ok = False
    for n in z.namelist():
        if n.endswith('.xml') or n.endswith('.rels'):
            try: minidom.parseString(z.read(n))
            except Exception as e: print('FAIL xml', p, n, e); ok = False
import docx
d = docx.Document(sys.argv[1])
heads = [p.text for p in d.paragraphs if p.style.name.startswith('Heading')]
print('docx: paragraphs', len(d.paragraphs), '| headings', len(heads), '| tables', len(d.tables), '| images', len(d.inline_shapes), '| sections', len(d.sections))
print('docx: first headings', heads[:6])
import openpyxl
wb = openpyxl.load_workbook(sys.argv[2])
print('xlsx: sheets', len(wb.sheetnames), wb.sheetnames[:6])
types = {}
for ws in wb.worksheets:
    for row in ws.iter_rows(min_row=3):
        for c in row:
            if c.value is not None: types[type(c.value).__name__] = types.get(type(c.value).__name__, 0) + 1
print('xlsx: cell types', types)
sys.exit(0 if ok else 1)
`;
try {
  console.log(execFileSync('python3', ['-c', py, docxPath, xlsxPath], { encoding: 'utf8' }).trim());
} catch (e) {
  fail('python validation\n' + (e.stdout || '') + (e.stderr || ''));
}

try {
  execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', out, docxPath], { stdio: 'pipe', timeout: 180000 });
  const pdf = path.join(out, name + '.pdf');
  const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
  console.log('pdf: ' + (/Pages:\s+(\d+)/.exec(info) || [])[1] + ' pages -> ' + pdf);
  const [a, b] = String(pages).split('-');
  execFileSync('pdftoppm', ['-png', '-r', '50', '-f', a, '-l', b || a, pdf, path.join(out, name + '-page')]);
  console.log('page images: ' + fs.readdirSync(out).filter((f) => f.startsWith(name + '-page')).map((f) => path.join(out, f)).join(' '));
} catch (e) {
  fail('LibreOffice conversion: ' + (e.message || e));
}
process.exit(failed ? 1 : 0);
