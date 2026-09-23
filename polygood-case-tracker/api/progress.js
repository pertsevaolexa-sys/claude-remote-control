// GET  /api/progress        -> every saved record { records: { key: record } }
// PUT  /api/progress        -> save records. Body: { records: { key: record, ... }, source? }
import { getAll, saveMany, isValidKey, storageKind } from "../lib/store.js";
import { send, readJson, authorized } from "../lib/http.js";

export default async function handler(req, res) {
  if (!authorized(req)) return send(res, 401, { ok: false, error: "password_required" });
  if (storageKind() === "none") {
    return send(res, 503, {
      ok: false,
      error: "storage_not_configured",
      message: "Connect Upstash for Redis to this Vercel project (Storage tab), then redeploy.",
    });
  }
  try {
    if (req.method === "GET") {
      const records = await getAll();
      return send(res, 200, { ok: true, storage: storageKind(), records, serverTime: new Date().toISOString() });
    }
    if (req.method === "PUT" || req.method === "POST") {
      const body = await readJson(req);
      const input = body && typeof body.records === "object" && body.records ? body.records : null;
      if (!input) return send(res, 400, { ok: false, error: "Send { records: { key: record } }" });
      const entries = Object.entries(input).filter(([k]) => isValidKey(k));
      if (!entries.length) return send(res, 400, { ok: false, error: "No valid record keys" });
      if (entries.length > 500) return send(res, 413, { ok: false, error: "Save at most 500 records per request" });
      const saved = await saveMany(entries, { source: body.source === "import" ? "import" : "app" });
      return send(res, 200, { ok: true, saved });
    }
    res.setHeader("Allow", "GET, PUT, POST");
    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("progress error", err);
    return send(res, err.status || 500, { ok: false, error: "save_failed", message: String(err.message || err) });
  }
}
