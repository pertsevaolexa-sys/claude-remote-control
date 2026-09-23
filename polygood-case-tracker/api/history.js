// GET /api/history?limit=50 -> the most recent saved changes, newest first.
import { getLog, storageKind } from "../lib/store.js";
import { send, authorized } from "../lib/http.js";

export default async function handler(req, res) {
  if (!authorized(req)) return send(res, 401, { ok: false, error: "password_required" });
  if (storageKind() === "none") return send(res, 503, { ok: false, error: "storage_not_configured" });
  if (req.method !== "GET") return send(res, 405, { ok: false, error: "Method not allowed" });
  try {
    const url = new URL(req.url, "http://localhost");
    const entries = await getLog(url.searchParams.get("limit") || 50);
    return send(res, 200, { ok: true, entries });
  } catch (err) {
    console.error("history error", err);
    return send(res, 500, { ok: false, error: "history_failed", message: String(err.message || err) });
  }
}
