// GET /api/health -> whether progress storage and the password are set up.
// Never reveals secrets; safe to call without the password.
import { storageKind } from "../lib/store.js";
import { send, passwordRequired } from "../lib/http.js";

export default function handler(req, res) {
  return send(res, 200, { ok: true, storage: storageKind(), passwordRequired: passwordRequired() });
}
