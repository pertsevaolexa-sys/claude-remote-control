// Exercises the API routes against a temporary file store: node scripts/test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import zlib from "node:zlib";
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

// Case study drafts: only the outline's fields are kept, each within its limit.
r = await call(progress, { method: "PUT", body: { records: { "p:draft1": { status: "drafting", draft: {
  title: "Jimmy Fairly", body: "x".repeat(7000), pattern: "Mix (bespoke)", credits: 42, extra: "dropped",
} } } } });
assert.equal(r.status, 200);
const savedDraft = r.body.saved["p:draft1"].draft;
assert.equal(savedDraft.title, "Jimmy Fairly");
assert.equal(savedDraft.body.length, 6000, "body is capped");
assert.equal(savedDraft.pattern, "Mix (bespoke)");
assert.equal(savedDraft.credits, undefined, "non-text field is dropped");
assert.equal(savedDraft.extra, undefined, "unknown field is dropped");
r = await call(progress);
assert.equal(r.body.records["p:draft1"].draft.title, "Jimmy Fairly");
assert.equal(r.body.records["p:draft1"].status, "drafting");

// With no storage configured the API must refuse clearly instead of pretending to save.
const out = execFileSync(process.execPath, ["--input-type=module", "-e", `
  const h = (await import(${JSON.stringify(path.join(root, "api", "progress.js"))})).default;
  const res = { statusCode: 200, setHeader() {}, end(d) { console.log(JSON.stringify({ s: this.statusCode, b: JSON.parse(d) })); } };
  await h({ method: "PUT", url: "/", headers: {}, body: { records: { "p:x": { status: "todo" } } } }, res);
`], { env: { PATH: process.env.PATH } }).toString();
const none = JSON.parse(out.trim());
assert.equal(none.s, 503);
assert.equal(none.b.error, "storage_not_configured");

// Word export: a valid zip whose parts match their checksums and hold the escaped text.
await import("../assets/docx.js");
const docx = Buffer.from(globalThis.PCTDocx.build([
  { type: "h1", text: "Jimmy Fairly" },
  { type: "p", runs: [{ text: "Pattern: ", bold: true }, { text: "Mix & <bespoke>" }] },
  { type: "meta", runs: [{ text: "Notion", link: "https://app.notion.com/p/abc?x=1&y=2" }] },
  { type: "h1", text: "Second case", pageBreak: true },
], { title: "Test" }));
const eocd = docx.length - 22;
assert.equal(docx.readUInt32LE(eocd), 0x06054b50, "zip ends with its central directory");
const parts = {};
for (let i = 0, at = docx.readUInt32LE(eocd + 16); i < docx.readUInt16LE(eocd + 10); i++) {
  assert.equal(docx.readUInt32LE(at), 0x02014b50);
  const crc = docx.readUInt32LE(at + 16), size = docx.readUInt32LE(at + 20), nameLen = docx.readUInt16LE(at + 28), local = docx.readUInt32LE(at + 42);
  const name = docx.toString("utf8", at + 46, at + 46 + nameLen);
  const start = local + 30 + docx.readUInt16LE(local + 26) + docx.readUInt16LE(local + 28);
  const data = docx.subarray(start, start + size);
  if (typeof zlib.crc32 === "function") assert.equal(zlib.crc32(data), crc, `${name} checksum`);
  parts[name] = data.toString("utf8");
  at += 46 + nameLen;
}
assert.deepEqual(Object.keys(parts).sort(), ["[Content_Types].xml", "_rels/.rels", "docProps/core.xml", "word/_rels/document.xml.rels", "word/document.xml", "word/styles.xml"]);
assert.ok(parts["word/document.xml"].includes("Mix &amp; &lt;bespoke&gt;"), "text is escaped");
assert.ok(parts["word/document.xml"].includes("<w:pageBreakBefore/>"), "page break kept");
assert.ok(parts["word/_rels/document.xml.rels"].includes('Target="https://app.notion.com/p/abc?x=1&amp;y=2"'), "link kept");

// Catalog sanity
const catalog = JSON.parse(await readFile(path.join(root, "data", "catalog.json"), "utf8"));
assert.equal(catalog.projects.length, 219);
assert.equal(catalog.siteCases.length, 48);
const ids = new Set(catalog.projects.map((p) => p.id));
for (const c of catalog.siteCases) for (const id of c.notion) assert.ok(ids.has(id), `site case ${c.title} points at a known project`);

console.log("All API and catalog checks passed.");
