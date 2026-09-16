// ---------------------------------------------------------------------------
// End-to-end check that the page actually opens, in every way it gets opened.
//   node verify.mjs
//
// A) dist/index.html over HTTP   - how Vercel serves it
// B) dist/index.html over file:// - double-clicked from disk
// C) index.html over HTTP         - the dev page, from a clean checkout
// D) index.html with vendor/ missing - must EXPLAIN itself, never blank
// ---------------------------------------------------------------------------

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };

function serve(base, port, { hideVendor = false } = {}) {
  return createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (hideVendor && url.startsWith('/vendor/')) { res.writeHead(404).end('not found'); return; }
    const file = join(base, url === '/' ? 'index.html' : url);
    if (!file.startsWith(base) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  }).listen(port);
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

let failures = 0;
async function check(label, url, expect) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('data:') && u !== url) external.push(u);
  });

  await page.goto(url, { waitUntil: 'load' });
  try {
    await page.waitForFunction(
      (wantReady) => (wantReady
        ? (window.PG && window.PG.ready)
        : document.getElementById('boot')?.classList.contains('failed')),
      expect.ready, { timeout: 120000 },
    );
  } catch {
    // fall through to the report below
  }

  const state = await page.evaluate(() => ({
    ready: !!(window.PG && window.PG.ready),
    bootGone: !document.getElementById('boot'),
    bootFailed: !!document.getElementById('boot')?.classList.contains('failed'),
    bootTitle: document.getElementById('boot-title')?.textContent || '',
    bootText: document.getElementById('boot-text')?.textContent || '',
    pads: window.PG?.scene.getObjectByName('panel-pads')?.children.length ?? 0,
    stools: window.PG?.scene.getObjectByName('stools')?.children.length ?? 0,
  }));

  const problems = [];
  if (expect.ready) {
    if (!state.ready) problems.push('scene never reported ready');
    if (!state.bootGone) problems.push('loading overlay was left on screen');
    if (state.pads !== 16 || state.stools !== 3) problems.push(`scene incomplete (${state.pads} pads, ${state.stools} stools)`);
    if (errors.length) problems.push(`errors: ${errors.join(' | ')}`);
  } else {
    if (!state.bootFailed) problems.push('failed silently instead of explaining itself');
    if (expect.mentions && !(`${state.bootTitle} ${state.bootText}`).includes(expect.mentions)) {
      problems.push(`message did not mention "${expect.mentions}"`);
    }
  }
  if (expect.noNetwork && external.length) problems.push(`fetched ${external.length} external file(s)`);

  const ok = problems.length === 0;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (expect.ready) console.log(`        ready, overlay cleared, ${state.pads} pads, ${state.stools} stools, ${external.length} external requests`);
  else console.log(`        shows: "${state.bootTitle}" — ${state.bootText.slice(0, 96)}`);
  for (const p of problems) console.log(`        ! ${p}`);
  await page.close();
}

const a = serve(join(root, 'dist'), 5221);
const b = serve(root, 5222);
const c = serve(root, 5223, { hideVendor: true });

await check('A  dist/index.html over HTTP (how Vercel serves it)',
  'http://localhost:5221/', { ready: true, noNetwork: true });
await check('B  dist/index.html over file:// (opened from disk)',
  `file://${join(root, 'dist', 'index.html')}`, { ready: true, noNetwork: true });
await check('C  index.html over HTTP (dev page, clean checkout)',
  'http://localhost:5222/', { ready: true });
await check('D  index.html with vendor/ missing (must explain itself)',
  'http://localhost:5223/', { ready: false, mentions: 'three.js' });

for (const s of [a, b, c]) s.close();
await browser.close();
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
