#!/usr/bin/env node
/* Render check for the PM Steps Workbook in headless Chromium.
 *
 *   node tools/check.mjs                      every section, empty template, light theme
 *   node tools/check.mjs --example            every section with the example project
 *   node tools/check.mjs --section raci,wpspecs --theme both --shots
 *   node tools/check.mjs --width 390 --shots  phone width
 *   node tools/check.mjs --interact           also type into fields, add and delete rows
 *   node tools/check.mjs --extra path/to/test-section.js
 *
 * Prints one line per section (errors, graphics drawn, overflow) and exits 1 when any
 * section has console errors, page errors, failed graphics or horizontal page overflow.
 * Screenshots go to --out (default: /tmp/pm-check).
 */
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
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
const file = opt('file', path.join(root, 'index.html'));
const out = opt('out', '/tmp/pm-check');
const width = Number(opt('width', 1280));
const themes = opt('theme', 'light') === 'both' ? ['light', 'dark'] : [opt('theme', 'light')];
const only = opt('section', null);
const example = !!opt('example', false);
const shots = !!opt('shots', false);
const interact = !!opt('interact', false);
const extra = opt('extra', null);
const modules = opt('modules', null); // e.g. --modules scope.js,schedule.js : load only these section files
fs.mkdirSync(out, { recursive: true });

let pageFile = file;
let tmpFile = null;
if (modules) {
  const html = fs.readFileSync(file, 'utf8');
  const keep = String(modules).split(',').map((m) => m.trim().replace(/^js\/sections\//, ''));
  const isolated = html.replace(/<script src="js\/sections\/([^"]+)"><\/script>\n?/g, (m, f) => (keep.includes(f) ? m : ''));
  tmpFile = path.join(root, '.check-' + process.pid + '.html');
  fs.writeFileSync(tmpFile, isolated);
  pageFile = tmpFile;
}
process.on('exit', () => {
  if (tmpFile) try { fs.unlinkSync(tmpFile); } catch {}
});
const browser = await playwright.chromium.launch();
let failed = false;
for (const theme of themes) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text());
  });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(pathToFileURL(pageFile).href);
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch (e) {}
  });
  await page.reload();
  await page.waitForFunction(() => window.PMApp && window.PM && window.PM.app, null, { timeout: 10000 });
  await page.waitForTimeout(150);
  if (extra) {
    await page.addScriptTag({ path: path.resolve(extra) });
    await page.evaluate(() => PM.app.renderNav());
  }
  if (example) await page.evaluate(() => PMApp.setExample(true));
  const ids = await page.evaluate(() => PM.sections.map((s) => s.id));
  const list = only ? String(only).split(',').filter((id) => ids.includes(id)) : ids;
  if (only && list.length !== String(only).split(',').length) console.log('Unknown section ids requested. Known:', ids.join(', '));
  for (const id of list) {
    logs.length = 0;
    await page.evaluate((sid) => PMApp.go(sid), id);
    await page.waitForTimeout(450);
    if (interact) {
      await page.evaluate(() => PMApp.setExample(false));
      await page.evaluate((sid) => PMApp.go(sid), id);
      await page.waitForTimeout(150);
      const inputs = await page.$$('#main input.in[type="text"]:not([disabled]), #main textarea.in:not([disabled])');
      for (const el of inputs.slice(0, 3)) {
        await el.click();
        await el.type('Test 12');
      }
      const add = await page.$('#main [data-add]');
      if (add) await add.click();
      await page.waitForTimeout(300);
      const menu = await page.$('#main [data-menu]');
      if (menu) {
        await menu.click();
        const del = await page.$('.menu [data-act="delete"]');
        if (del) await del.click();
      }
      await page.waitForTimeout(400);
      if (example) await page.evaluate(() => PMApp.setExample(true));
      await page.evaluate((sid) => PMApp.go(sid), id);
      await page.waitForTimeout(400);
    }
    const info = await page.evaluate(() => {
      const main = document.getElementById('main');
      const figs = [...main.querySelectorAll('.fig-body')];
      const errs = [...main.querySelectorAll('.render-error')].map((e) => e.textContent.trim());
      const svgOverflow = [];
      figs.forEach((f) => {
        const svg = f.querySelector('svg');
        if (!svg) return;
        const vb = svg.viewBox.baseVal;
        try {
          const bb = svg.getBBox();
          if (bb.x < vb.x - 1 || bb.y < vb.y - 1 || bb.x + bb.width > vb.x + vb.width + 1 || bb.y + bb.height > vb.y + vb.height + 1) {
            const t = f.closest('.fig').querySelector('.blk-t');
            svgOverflow.push((t ? t.textContent : '?') + ' content box ' + Math.round(bb.x) + ',' + Math.round(bb.y) + ' ' + Math.round(bb.width) + 'x' + Math.round(bb.height) + ' outside viewBox ' + vb.width + 'x' + vb.height);
          }
        } catch (e) {}
      });
      return {
        title: (main.querySelector('h1') || {}).textContent,
        blocks: main.querySelectorAll('.blk').length,
        tables: main.querySelectorAll('table.grid').length,
        graphics: figs.length,
        drawn: figs.filter((f) => f.querySelector('svg')).length,
        empty: figs.filter((f) => f.querySelector('svg[aria-label]') && f.querySelector('svg rect[stroke-dasharray]') && f.querySelectorAll('svg *').length < 6).length,
        renderErrors: errs,
        svgOverflow,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 ? document.documentElement.scrollWidth - document.documentElement.clientWidth : 0,
      };
    });
    const bad = logs.length || info.renderErrors.length || info.pageOverflow || info.drawn < info.graphics;
    if (bad) failed = true;
    console.log(
      (bad ? 'FAIL ' : 'ok   ') + theme.padEnd(5) + ' ' + id.padEnd(14) +
        ' blocks ' + String(info.blocks).padStart(2) + ', tables ' + info.tables + ', graphics ' + info.drawn + '/' + info.graphics + (info.empty ? ' (' + info.empty + ' empty)' : '') +
        (info.pageOverflow ? ', PAGE OVERFLOW ' + info.pageOverflow + 'px' : '')
    );
    for (const l of logs) console.log('       ' + l.slice(0, 400));
    for (const e of info.renderErrors) console.log('       render error: ' + e);
    for (const e of info.svgOverflow) console.log('       svg overflow: ' + e);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (shots) await page.screenshot({ path: path.join(out, id + '-' + theme + (example ? '-example' : '') + '-' + width + '.png'), fullPage: true });
  }
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
