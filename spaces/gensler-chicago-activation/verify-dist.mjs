// Verify dist/index.html works as a standalone file: served over HTTP (as Vercel
// would) and opened straight from disk. Reports errors and any network request,
// which must be none - a self-contained file fetches nothing.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const PORT = 5211;

const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  createReadStream(join(dist, 'index.html')).pipe(res);
}).listen(PORT);

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

for (const [label, url] of [
  ['http (as Vercel serves it)', `http://localhost:${PORT}/`],
  ['file:// (opened from disk)', `file://${join(dist, 'index.html')}`],
]) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const problems = [];
  const external = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()}`));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('data:') && u !== url) external.push(u);
  });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.PG && window.PG.ready, null, { timeout: 120000 });
  await page.waitForTimeout(4000);

  const counts = await page.evaluate(() => {
    const { scene } = window.PG;
    const n = (name) => (scene.getObjectByName(name)?.children.length ?? 0);
    return {
      pads: n('panel-pads'),
      samples: n('engraved-samples'),
      stools: n('stools'),
      coupon: !!scene.getObjectByName('plain-oyster-coupon'),
      conflicts: window.PG.report.summary.conflicts,
    };
  });

  console.log(`\n${label}`);
  console.log('  loaded OK:', JSON.stringify(counts));
  console.log('  extra network requests:', external.length ? external.join(', ') : 'none');
  console.log('  problems:', problems.length ? problems.join(' | ') : 'none');

  if (label.startsWith('http')) {
    await page.evaluate(() => { window.PG.setHud(false); window.PG.applyView('counter'); window.PG.render(3); });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: join(root, 'screenshots', '08-single-file-build.png'), timeout: 180000 });
    console.log('  screenshot: screenshots/08-single-file-build.png');
  }
  await page.close();
}

await browser.close();
server.close();
process.exit(0);
