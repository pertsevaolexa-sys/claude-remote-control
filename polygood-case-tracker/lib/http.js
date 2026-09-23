// Small helpers shared by the API routes.
import { timingSafeEqual } from "node:crypto";

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

// Vercel parses JSON bodies into req.body; the local dev server does not, so read the
// stream when needed.
export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_000_000) throw Object.assign(new Error("Request too large"), { status: 413 });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

// Optional shared password. When TRACKER_PASSWORD is set, every API call must send it in
// the "x-tracker-password" header.
export function authorized(req) {
  const expected = process.env.TRACKER_PASSWORD || "";
  if (!expected) return true;
  const given = String(req.headers["x-tracker-password"] || "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordRequired() {
  return Boolean(process.env.TRACKER_PASSWORD);
}
