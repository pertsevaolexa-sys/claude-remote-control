// ---------------------------------------------------------------------------
// Produce dist/index.html: ONE self-contained file with the whole model in it.
//   node bundle.mjs
//
// Everything is inlined - three.js, all of src/, the stylesheet and the markup -
// so the file can be dropped on Vercel (or any static host, or opened from
// disk) with no build step, no import map and nothing fetched at run time.
// ---------------------------------------------------------------------------

import { build } from 'esbuild';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const OUT = join(root, 'dist');

// three/addons/... is only a bare specifier because of the page's import map;
// point esbuild at the real files instead.
const addonAlias = {
  name: 'three-addons',
  setup(b) {
    b.onResolve({ filter: /^three\/addons\// }, (args) => ({
      path: join(root, 'node_modules', 'three', 'examples', 'jsm',
        args.path.replace('three/addons/', '')),
    }));
  },
};

const result = await build({
  entryPoints: [join(root, 'src', 'main.js')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  plugins: [addonAlias],
  write: false,
});
const code = result.outputFiles[0].text;

let html = await readFile(join(root, 'index.html'), 'utf8');

// Replace the import map + external module script with the inlined bundle.
html = html.replace(
  /<script type="importmap">[\s\S]*?<\/script>\s*<script type="module" src="\.\/src\/main\.js"><\/script>/,
  () => `<script type="module">\n${code}\n</script>`,
);
if (html.includes('importmap')) {
  console.error('bundle: could not find the import map / module script to replace');
  process.exit(1);
}

// A note for anyone who opens the file and wonders what it is.
html = html.replace('<head>', `<head>
<!--
  Polygood - LOOK CLOSER - Gensler Chicago office activation.
  Self-contained spatial prototype: three.js and all model source are inlined.
  Built from spaces/gensler-chicago-activation with \`npm run bundle\`.
  NOT fabrication-ready - see the Review notes panel for open conflicts.
-->`);

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'index.html'), html);

// Vercel serves ./dist as a static site with no framework and no build command.
await writeFile(join(OUT, 'vercel.json'), `${JSON.stringify({
  $schema: 'https://openapi.vercel.sh/vercel.json',
  cleanUrls: true,
}, null, 2)}\n`);

const size = (await stat(join(OUT, 'index.html'))).size;
console.log(`dist/index.html  ${(size / 1024 / 1024).toFixed(2)} MB  (single file, no dependencies)`);
