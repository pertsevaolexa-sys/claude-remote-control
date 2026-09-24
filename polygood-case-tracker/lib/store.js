// Progress storage for the tracker.
//
// Production (Vercel): Upstash Redis over its REST API. Connect "Upstash for Redis"
// from the Vercel Marketplace and the env vars below are added for you.
// Local development: a JSON file under .data/ (enabled by scripts/dev.mjs).
//
// Every record is stored under one key ("p:<notion id>" for a Notion project,
// "s:<case key>" for a website case) inside a single Redis hash, and every write is
// also appended to a capped change log so nothing is silently overwritten.

import { promises as fs } from "node:fs";
import path from "node:path";

const HASH = "pct:progress";
const LOG = "pct:log";
const LOG_MAX = 1000;

// Vercel's Upstash integration names these KV_REST_API_URL / KV_REST_API_TOKEN (or
// UPSTASH_REDIS_REST_URL / _TOKEN), optionally with a custom prefix such as "STORAGE_".
function findRedisEnv() {
  for (const [urlSuffix, tokenSuffix] of [["KV_REST_API_URL", "KV_REST_API_TOKEN"], ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]]) {
    for (const name of Object.keys(process.env)) {
      if (!name.endsWith(urlSuffix) || !process.env[name]) continue;
      const token = process.env[name.slice(0, -urlSuffix.length) + tokenSuffix];
      if (token) return { url: process.env[name], token };
    }
  }
  return { url: "", token: "" };
}
const { url: redisUrl, token: redisToken } = findRedisEnv();
const fileStorePath = process.env.TRACKER_FILE_STORE || "";

export function storageKind() {
  if (redisUrl && redisToken) return "redis";
  if (fileStorePath) return "file";
  return "none";
}

// ---------- Redis (Upstash REST) ----------
async function redis(commands) {
  const res = await fetch(`${redisUrl.replace(/\/$/, "")}/multi-exec`, {
    method: "POST",
    headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands.map((cmd) => cmd.map(String))),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Redis responded ${res.status}: ${text.slice(0, 200)}`);
  }
  const out = await res.json();
  if (!Array.isArray(out)) throw new Error("Unexpected Redis response");
  return out.map((r) => {
    if (r && r.error) throw new Error(`Redis error: ${r.error}`);
    return r ? r.result : null;
  });
}

// ---------- File store (local development only) ----------
async function readFileStore() {
  try {
    return JSON.parse(await fs.readFile(fileStorePath, "utf8"));
  } catch {
    return { records: {}, log: [] };
  }
}
async function writeFileStore(data) {
  await fs.mkdir(path.dirname(fileStorePath), { recursive: true });
  const tmp = `${fileStorePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 1));
  await fs.rename(tmp, fileStorePath);
}

// ---------- Public API ----------
const KEY_RE = /^[ps]:[A-Za-z0-9_\-.]{1,120}$/;
export const isValidKey = (k) => typeof k === "string" && KEY_RE.test(k);

const STATUSES = new Set(["todo", "drafting", "ready", "published", "skip"]);

// Case study drafts written in the tracker, one field per slot of the outline
// (docs/case-study-outline.md). assets/app.js uses the same limits.
export const DRAFT_LIMITS = { slug: 200, title: 200, subtitle: 300, body: 6000, pattern: 500, application: 500, location: 300, credits: 1500, images: 3000, similar: 500 };

// Keep only the fields the app writes, with sane sizes.
export function sanitizeRecord(input) {
  const r = {};
  if (!input || typeof input !== "object") return r;
  if (typeof input.status === "string" && STATUSES.has(input.status)) r.status = input.status;
  if (typeof input.note === "string") r.note = input.note.slice(0, 5000);
  if (typeof input.starred === "boolean") r.starred = input.starred;
  if (typeof input.url === "string") r.url = input.url.trim().slice(0, 500);
  if (typeof input.publishedUrl === "string") r.publishedUrl = input.publishedUrl.trim().slice(0, 500);
  if (input.draft && typeof input.draft === "object") {
    const d = {};
    for (const [field, max] of Object.entries(DRAFT_LIMITS)) {
      if (typeof input.draft[field] === "string") d[field] = input.draft[field].slice(0, max);
    }
    if (Object.keys(d).length) r.draft = d;
  }
  if (typeof input.clientUpdatedAt === "string") r.clientUpdatedAt = input.clientUpdatedAt.slice(0, 40);
  return r;
}

export async function getAll() {
  const kind = storageKind();
  if (kind === "redis") {
    const [flat] = await redis([["HGETALL", HASH]]);
    const records = {};
    // Upstash returns HGETALL as a flat [field, value, field, value, ...] array.
    for (let i = 0; Array.isArray(flat) && i < flat.length; i += 2) {
      try { records[flat[i]] = JSON.parse(flat[i + 1]); } catch { /* skip corrupt entry */ }
    }
    return records;
  }
  if (kind === "file") return (await readFileStore()).records;
  throw Object.assign(new Error("storage_not_configured"), { code: "storage_not_configured" });
}

// Save many records at once. Each record replaces the stored one for its key.
export async function saveMany(entries, meta = {}) {
  const kind = storageKind();
  const now = new Date().toISOString();
  const saved = {};
  const logLines = [];
  for (const [key, rec] of entries) {
    const clean = { ...sanitizeRecord(rec), updatedAt: now };
    saved[key] = clean;
    logLines.push(JSON.stringify({ at: now, key, record: clean, source: meta.source || "app" }));
  }
  if (!entries.length) return saved;

  if (kind === "redis") {
    const hset = ["HSET", HASH];
    for (const [key, rec] of Object.entries(saved)) hset.push(key, JSON.stringify(rec));
    await redis([hset, ["LPUSH", LOG, ...logLines], ["LTRIM", LOG, 0, LOG_MAX - 1]]);
    return saved;
  }
  if (kind === "file") {
    const data = await readFileStore();
    Object.assign(data.records, saved);
    data.log = [...logLines.reverse().map((l) => JSON.parse(l)), ...(data.log || [])].slice(0, LOG_MAX);
    await writeFileStore(data);
    return saved;
  }
  throw Object.assign(new Error("storage_not_configured"), { code: "storage_not_configured" });
}

export async function getLog(limit = 50) {
  const kind = storageKind();
  const n = Math.max(1, Math.min(500, Number(limit) || 50));
  if (kind === "redis") {
    const [lines] = await redis([["LRANGE", LOG, 0, n - 1]]);
    return (lines || []).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  }
  if (kind === "file") return ((await readFileStore()).log || []).slice(0, n);
  throw Object.assign(new Error("storage_not_configured"), { code: "storage_not_configured" });
}
