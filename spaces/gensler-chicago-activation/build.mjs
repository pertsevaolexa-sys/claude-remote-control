// ---------------------------------------------------------------------------
// Build = vendor the three.js ES modules the page imports, so the prototype
// runs from any static server with no bundler and no network at run time.
//   node build.mjs           vendor only
//   node build.mjs --serve   vendor, then serve on http://localhost:5173
// ---------------------------------------------------------------------------

import { mkdir, copyFile, readdir, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { dirname, join, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const threeDir = join(root, 'node_modules', 'three');

const ADDONS = [
  'controls/OrbitControls.js',
  'lights/RectAreaLightUniformsLib.js',
];

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function vendor() {
  if (!await exists(threeDir)) {
    console.error('three is not installed. Run: npm install');
    process.exit(1);
  }
  const out = join(root, 'vendor');
  await mkdir(join(out, 'addons'), { recursive: true });

  for (const f of ['three.module.js', 'three.core.js']) {
    await copyFile(join(threeDir, 'build', f), join(out, f));
  }

  const queue = [...ADDONS];
  const done = new Set();
  while (queue.length) {
    const rel = queue.shift();
    if (done.has(rel)) continue;
    done.add(rel);
    const src = join(threeDir, 'examples', 'jsm', rel);
    const dst = join(out, 'addons', rel);
    await mkdir(dirname(dst), { recursive: true });
    await copyFile(src, dst);
    // follow relative imports between addons so nothing 404s at run time
    const code = await readFile(src, 'utf8');
    for (const m of code.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)) {
      const target = resolve(dirname(src), m[1]);
      if (target.startsWith(join(threeDir, 'examples', 'jsm'))) {
        queue.push(relative(join(threeDir, 'examples', 'jsm'), target));
      }
    }
  }

  const files = await readdir(out, { recursive: true });
  console.log(`vendored ${files.filter((f) => f.endsWith('.js')).length} module files into vendor/`);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function serve(port = 5173) {
  createServer(async (req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = join(root, url === '/' ? 'index.html' : url);
    if (!file.startsWith(root)) { res.writeHead(403).end('forbidden'); return; }
    if (!await exists(file)) { res.writeHead(404).end('not found'); return; }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(res);
  }).listen(port, () => {
    console.log(`\n  Polygood LOOK CLOSER prototype → http://localhost:${port}\n`);
  });
}

await vendor();
if (process.argv.includes('--serve')) serve(Number(process.env.PORT) || 5173);
