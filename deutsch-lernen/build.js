/* Build a single self-contained HTML file by inlining CSS + JS.
   Run:  node build.js   (from the deutsch-lernen/ folder)
   Output: deutsch-a2-bootcamp.html  — open it anywhere, no other files needed. */
const fs = require('fs');
const path = require('path');
const dir = __dirname;

let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'css/styles.css'), 'utf8');
const data = fs.readFileSync(path.join(dir, 'js/data.js'), 'utf8');
const appjs = fs.readFileSync(path.join(dir, 'js/app.js'), 'utf8');

// Safety: inlined content must not contain closing tags that break the wrapper.
for (const [name, c] of [['styles.css', css]]) {
  if (/<\/style>/i.test(c)) throw new Error(`${name} contains </style>`);
}
for (const [name, c] of [['data.js', data], ['app.js', appjs]]) {
  if (/<\/script>/i.test(c)) throw new Error(`${name} contains </script>`);
}

// IMPORTANT: use FUNCTION replacements. A string replacement would interpret
// special patterns like $$, $&, $1 inside the JS/CSS (e.g. app.js's `const $$`),
// silently corrupting the code. A function's return value is inserted verbatim.
html = html.replace('<link rel="stylesheet" href="css/styles.css" />', () => `<style>\n${css}\n</style>`);
html = html.replace('<script src="js/data.js"></script>', () => `<script>\n${data}\n</script>`);
html = html.replace('<script src="js/app.js"></script>', () => `<script>\n${appjs}\n</script>`);

if (html.includes('href="css/') || html.includes('src="js/')) {
  throw new Error('Inlining failed — external references still present.');
}

const out = path.join(dir, 'deutsch-a2-bootcamp.html');
fs.writeFileSync(out, html);
console.log(`✅ Built ${path.basename(out)} (${(html.length / 1024).toFixed(0)} KB, fully self-contained)`);
