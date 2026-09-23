// Local server: serves the page and runs the /api routes like Vercel does.
// Progress is saved to .data/progress.json unless Redis env vars are set.
//   node scripts/dev.mjs            -> http://localhost:3000
//   PORT=4000 node scripts/dev.mjs
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.TRACKER_FILE_STORE ||= path.join(root, ".data", "progress.json");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
const routes = {};
async function route(name) {
  if (!routes[name]) routes[name] = (await import(pathToFileURL(path.join(root, "api", `${name}.js`)).href)).default;
  return routes[name];
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    const api = url.pathname.match(/^\/api\/([a-z-]+)\/?$/);
    if (api) {
      const handler = await route(api[1]).catch(() => null);
      if (!handler) { res.statusCode = 404; return res.end("Not found"); }
      return await handler(req, res);
    }
    let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root) || /[\\/](\.data|scripts|lib|api)([\\/]|$)/.test(file.slice(root.length))) { res.statusCode = 404; return res.end("Not found"); }
    const stat = await fs.stat(file).catch(() => null);
    if (stat && stat.isDirectory()) file = path.join(file, "index.html");
    const body = await fs.readFile(file).catch(() => null);
    if (!body) { res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.end(body);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end("Server error");
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Polygood Case Tracker running at http://localhost:${port}`);
  console.log(`Progress file: ${process.env.TRACKER_FILE_STORE}`);
});
