// ---------------------------------------------------------------------------
// Render the review screenshots and report any console/page errors.
//   npm run shots
// ---------------------------------------------------------------------------

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const PORT = 5199;
const OUT = join(root, 'screenshots');

const SHOTS = [
  { file: '01-room-overview.png', view: 'overview', dims: false, panel: false, hud: false },
  { file: '02-whole-counter.png', view: 'counter', dims: false, panel: false, hud: false },
  { file: '03-installation-detail.png', view: 'installation', dims: false, panel: false, hud: false },
  { file: '04-top-layout.png', view: 'top', dims: false, panel: false, hud: false },
  { file: '05-conversation-area.png', view: 'seating', dims: false, panel: false, hud: false },
  { file: '06-dimensions-overlay.png', view: 'counter', dims: true, panel: false, hud: false },
  { file: '07-review-interface.png', view: 'overview', dims: false, panel: true, hud: true },
];

await mkdir(OUT, { recursive: true });
const server = spawn(process.execPath, [join(root, 'build.mjs'), '--serve'], {
  env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 900));

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

const problems = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.PG && window.PG.ready, null, { timeout: 90000 });
await page.waitForTimeout(6000);

for (const s of SHOTS) {
  await page.evaluate(({ view, dims, panel, hud }) => {
    window.PG.setHud(hud);
    window.PG.applyView(view);
    window.PG.setDimensions(dims);
    window.PG.setPanel(panel);
  }, s);
  await page.evaluate(() => window.PG.render(3));
  await page.waitForTimeout(6000);
  await page.screenshot({ path: join(OUT, s.file), timeout: 180000 });
  console.log('captured', s.file);
}

// Dimension verification straight out of the live scene graph.
const measured = await page.evaluate(() => {
  const { THREE, scene, CONFIG } = window.PG;
  const b = new THREE.Box3();
  const size = (name) => {
    const o = scene.getObjectByName(name);
    if (!o) return null;
    b.setFromObject(o);
    const v = new THREE.Vector3();
    b.getSize(v);
    return [v.x * 1000, v.y * 1000, v.z * 1000].map((n) => Math.round(n * 10) / 10);
  };
  const count = (name) => {
    const o = scene.getObjectByName(name);
    return o ? o.children.length : 0;
  };
  return {
    counterTop: size('counter-top'),
    installation: size('look-closer-installation'),
    mainPanel: size('main-panel'),
    coupon: size('plain-oyster-coupon'),
    translucentBlock: size('translucent-block'),
    bannerPanel: size('banner-panel'),
    engravedSamples: count('engraved-samples'),
    padCount: count('panel-pads'),
    stools: count('stools'),
    generalBoxes: count('general-sample-boxes'),
    brochures: count('brochures'),
    configPanelTop: CONFIG.installation.baseThicknessMm + CONFIG.installation.panelHeightMm - CONFIG.installation.slotDepthMm,
  };
});

console.log('\nMeasured from the live scene graph (mm):');
for (const [k, v] of Object.entries(measured)) console.log(' ', k.padEnd(20), JSON.stringify(v));

console.log(problems.length ? `\n${problems.length} console/page problem(s):` : '\nNo console errors, page errors or failed requests.');
for (const p of [...new Set(problems)]) console.log('  -', p);

await browser.close();
server.kill();
process.exit(0);
