// Exercises the API routes against a temporary file store: node scripts/test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = await mkdtemp(path.join(tmpdir(), "pct-"));
process.env.TRACKER_FILE_STORE = path.join(dir, "progress.json");
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL;

const progress = (await import("../api/progress.js")).default;
const history = (await import("../api/history.js")).default;
const health = (await import("../api/health.js")).default;

function call(handler, { method = "GET", url = "/", body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(data) { try { resolve({ status: this.statusCode, body: JSON.parse(data) }); } catch (e) { reject(e); } },
    };
    Promise.resolve(handler({ method, url, headers, body }, res)).catch(reject);
  });
}

let r = await call(health);
assert.equal(r.body.storage, "file");
assert.equal(r.body.passwordRequired, false);

r = await call(progress);
assert.equal(r.status, 200);
assert.deepEqual(r.body.records, {});

r = await call(progress, { method: "PUT", body: { records: {
  "p:abc123": { status: "drafting", note: "Angle: circular retail", starred: true, junk: "dropped" },
  "s:the-score-academy-miami": { url: "https://polygood.com/projects/score/", note: "Reference" },
  "bad key!": { status: "todo" },
} } });
assert.equal(r.status, 200);
assert.deepEqual(Object.keys(r.body.saved).sort(), ["p:abc123", "s:the-score-academy-miami"]);
assert.equal(r.body.saved["p:abc123"].junk, undefined);
assert.ok(r.body.saved["p:abc123"].updatedAt);

r = await call(progress, { method: "PUT", body: { records: { "p:abc123": { status: "not-a-status", note: "Second pass" } } } });
assert.equal(r.body.saved["p:abc123"].status, undefined, "invalid status is dropped");

r = await call(progress);
assert.equal(r.body.records["p:abc123"].note, "Second pass");
assert.equal(r.body.records["s:the-score-academy-miami"].url, "https://polygood.com/projects/score/");

r = await call(history, { url: "/api/history?limit=10" });
assert.equal(r.body.entries.length, 3);
assert.equal(r.body.entries[0].key, "p:abc123", "newest first");

r = await call(progress, { method: "PUT", body: { nothing: true } });
assert.equal(r.status, 400);

process.env.TRACKER_PASSWORD = "terrazzo";
r = await call(progress);
assert.equal(r.status, 401);
r = await call(progress, { headers: { "x-tracker-password": "wrong" } });
assert.equal(r.status, 401);
r = await call(progress, { headers: { "x-tracker-password": "terrazzo" } });
assert.equal(r.status, 200);
r = await call(health);
assert.equal(r.body.passwordRequired, true);
delete process.env.TRACKER_PASSWORD;

const onDisk = JSON.parse(await readFile(process.env.TRACKER_FILE_STORE, "utf8"));
assert.equal(Object.keys(onDisk.records).length, 2);

// With no storage configured the API must refuse clearly instead of pretending to save.
const out = execFileSync(process.execPath, ["--input-type=module", "-e", `
  const h = (await import(${JSON.stringify(path.join(root, "api", "progress.js"))})).default;
  const res = { statusCode: 200, setHeader() {}, end(d) { console.log(JSON.stringify({ s: this.statusCode, b: JSON.parse(d) })); } };
  await h({ method: "PUT", url: "/", headers: {}, body: { records: { "p:x": { status: "todo" } } } }, res);
`], { env: { PATH: process.env.PATH } }).toString();
const none = JSON.parse(out.trim());
assert.equal(none.s, 503);
assert.equal(none.b.error, "storage_not_configured");

// Catalog sanity
const catalog = JSON.parse(await readFile(path.join(root, "data", "catalog.json"), "utf8"));
assert.equal(catalog.projects.length, 219);
assert.equal(catalog.siteCases.length, 48);
const ids = new Set(catalog.projects.map((p) => p.id));
for (const c of catalog.siteCases) for (const id of c.notion) assert.ok(ids.has(id), `site case ${c.title} points at a known project`);

console.log("All API and catalog checks passed.");
