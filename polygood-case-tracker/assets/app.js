/* Polygood Case Tracker
 *
 * Saving model — nothing you change is lost:
 * 1. Every edit is written to this browser (localStorage) immediately.
 * 2. It is queued and sent to the server (/api/progress). The queue survives reloads,
 *    going offline and closing the tab; it is retried until the server confirms.
 * 3. On load the page shows your local copy at once, then merges the server copy;
 *    anything still waiting in the queue wins over the server and is re-sent.
 */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const LS = { records: "pct:records:v1", queue: "pct:queue:v1", prefs: "pct:prefs:v1", pw: "pct:password", lastSaved: "pct:lastSaved:v1" };
  const WF = { todo: "To do", drafting: "Drafting", ready: "Ready to publish", published: "Published", skip: "Skip" };
  const STATUS_LABEL = { live: "On website", added: "Added by you", missing: "Not on website", restricted: "Needs rights", nda: "Internal only", not_project: "Not a project" };
  const SECTIONS = {
    live: ["On the website — reference cases", "Already published on polygood.com. Oldest first: start here to see how earlier case studies were written."],
    missing: ["Not on the website yet", "In Notion, free of NDA and without recorded restrictions. Oldest first."],
    restricted: ["Needs rights before publishing", "Not on the website; photo licences or permissions must be sorted first."],
    nda: ["Internal only / NDA", "Not for the website."],
  };

  const S = {
    catalog: null, projects: [], byId: {}, cases: [], caseByKey: {},
    records: {}, queue: {}, lastSaved: null,
    sync: "connecting", syncMsg: "", storage: null, passwordRequired: false,
    q: "", status: "public", sort: "site-first", cat: "", country: "", wf: "", starred: false, pro: false, free: false,
    siteSort: "oldest", siteGaps: false, tab: "notion", open: new Set(), history: null,
  };
  // Case study draft fields in outline order, with the same limits as lib/store.js.
  const DRAFT = [["slug", 200], ["title", 200], ["subtitle", 300], ["body", 6000], ["pattern", 500], ["application", 500], ["location", 300], ["credits", 1500], ["images", 3000], ["similar", 500]];
  const DRAFT_MAX = Object.fromEntries(DRAFT);
  const SPEC = [["pattern", "Pattern"], ["application", "Application"], ["location", "Location"], ["credits", "Credits"]];
  // The draft open in the editor. It is saved with the project's record on the first edit.
  const ED = { p: null, key: null, draft: null, fresh: false, dirty: false, timer: null };

  // ---------- small utils ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "case";
  function lsGet(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
  function toast(msg) {
    const t = $("#toast"), host = $("#editor").open ? $("#editor") : document.body; // a modal dialog covers everything outside it
    if (t.parentNode !== host) host.appendChild(t);
    t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3200);
  }
  const words = (s) => (String(s || "").trim().match(/\S+/g) || []).length;
  const paragraphs = (s) => String(s || "").split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  const titleCase = (s) => String(s || "").toLowerCase().replace(/(^|[\s\-/(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  function fmtDate(iso) {
    if (!iso) return "No date";
    if (S.catalog && iso.startsWith(S.catalog.bulkImportDate)) return "Nov 2022 or earlier";
    const d = new Date(iso);
    return isNaN(d) ? "No date" : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  function fmtTime(iso) { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

  // ---------- preferences (per browser) ----------
  const PREF_KEYS = ["status", "sort", "cat", "country", "wf", "starred", "pro", "free", "siteSort", "siteGaps", "tab"];
  Object.assign(S, Object.fromEntries(Object.entries(lsGet(LS.prefs, {})).filter(([k]) => PREF_KEYS.includes(k))));
  const savePrefs = () => lsSet(LS.prefs, Object.fromEntries(PREF_KEYS.map((k) => [k, S[k]])));

  // ---------- records ----------
  const pKey = (p) => "p:" + p.id;
  const cKey = (c) => "s:" + slug(c.title);
  const rec = (key) => S.records[key] || {};
  function eff(p) {
    if (p.status === "live") return "live";
    if ((p.status === "missing" || p.status === "restricted") && rec(pKey(p)).status === "published") return "added";
    return p.status;
  }
  const bucket = (e) => (e === "live" || e === "added" ? "live" : e === "missing" ? "missing" : e === "restricted" ? "restricted" : "nda");
  const wfOf = (p) => rec(pKey(p)).status || "todo";
  const editable = (p) => p.status === "missing" || p.status === "restricted";
  const canWrite = (p) => p.status !== "nda" && p.status !== "not_project";
  const hasDraft = (r) => !!(r && r.draft && Object.values(r.draft).some((v) => String(v || "").trim()));

  // ---------- saving ----------
  let flushing = false, retryTimer = null, retryDelay = 2000;
  function persistLocal() {
    const ok = lsSet(LS.records, S.records) && lsSet(LS.queue, S.queue);
    if (!ok) setSync("error", "This browser refused to store a local copy; keep this tab open until it says Saved.");
  }
  function edit(key, patch) {
    const next = { ...rec(key), ...patch, clientUpdatedAt: new Date().toISOString() };
    S.records[key] = next;
    S.queue[key] = next;
    persistLocal();
    scheduleFlush(250);
    renderSync();
  }
  function scheduleFlush(ms) { clearTimeout(retryTimer); retryTimer = setTimeout(flush, ms); }
  function headers() {
    const h = { "Content-Type": "application/json" };
    const pw = lsGet(LS.pw, "");
    if (pw) h["x-tracker-password"] = pw;
    return h;
  }
  async function api(path, opts = {}) {
    const res = await fetch(path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
    let body = null;
    try { body = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) throw Object.assign(new Error((body && (body.message || body.error)) || `HTTP ${res.status}`), { status: res.status, code: body && body.error });
    return body;
  }
  function handleApiError(err) {
    if (err.status === 401) { setSync("locked", "Enter the tracker password to load and save progress."); renderBanner(); return; }
    if (err.status === 503 && err.code === "storage_not_configured") { setSync("local", "Server storage isn’t connected yet. Changes are kept in this browser only."); renderBanner(); return; }
    if (!navigator.onLine || err instanceof TypeError) { setSync("offline", "Offline. Changes are kept on this device and will sync when you reconnect."); return; }
    setSync("error", `Couldn’t reach the server (${err.message}). Retrying…`);
  }
  async function flush(opts = {}) {
    const keys = Object.keys(S.queue);
    if (!keys.length || flushing) { renderSync(); return; }
    if (S.sync === "locked") return;
    flushing = true;
    setSync("saving");
    // Drafts make records bigger: keep each request well under the Redis request limit.
    const batch = {};
    let size = 0, count = 0;
    for (const k of keys) {
      const n = JSON.stringify(S.queue[k]).length;
      if (count && (count >= 400 || size + n > 250000)) break;
      batch[k] = S.queue[k]; size += n; count++;
    }
    try {
      const out = await api("/api/progress", { method: "PUT", body: JSON.stringify({ records: batch, source: opts.source }), keepalive: !!opts.keepalive });
      for (const [k, saved] of Object.entries(out.saved || {})) {
        if (S.queue[k] === batch[k]) delete S.queue[k]; // not edited again meanwhile
        S.records[k] = { ...S.records[k], updatedAt: saved.updatedAt };
        if (S.queue[k]) S.queue[k] = { ...S.queue[k], updatedAt: saved.updatedAt };
      }
      S.lastSaved = new Date().toISOString();
      lsSet(LS.lastSaved, S.lastSaved);
      persistLocal();
      retryDelay = 2000;
      flushing = false;
      if (Object.keys(S.queue).length) return flush();
      setSync("saved");
      if (S.tab === "history") loadHistory();
      else if (typing()) renderSummary();
      else render();
    } catch (err) {
      flushing = false;
      handleApiError(err);
      if (S.sync === "local") { scheduleFlush(60000); return; }
      if (S.sync === "locked") return;
      retryDelay = Math.min(retryDelay * 2, 60000);
      scheduleFlush(retryDelay);
    }
  }
  function setSync(state, msg) { S.sync = state; S.syncMsg = msg || ""; renderSync(); }
  function renderSync() {
    const pending = Object.keys(S.queue).length;
    const pill = $("#syncPill"), text = $("#syncText"), sub = $("#syncSub");
    let state = S.sync, label;
    if (state === "saved" && pending) state = "saving";
    label = {
      connecting: "Connecting…",
      saving: pending ? `Saving ${pending} change${pending === 1 ? "" : "s"}…` : "Saving…",
      saved: "All changes saved",
      offline: `${pending} change${pending === 1 ? "" : "s"} waiting to sync`,
      local: "Saved in this browser only",
      error: pending ? `${pending} change${pending === 1 ? "" : "s"} not saved yet` : "Server not reachable",
      locked: "Password needed",
    }[state] || "";
    pill.className = "syncpill " + state;
    text.textContent = label;
    sub.textContent = S.syncMsg || (S.lastSaved ? `Last saved to server ${fmtTime(S.lastSaved)}` : "");
    const es = document.getElementById("edSync"); // the same state inside the case study editor
    if (es) { es.className = "syncpill " + (ED.dirty ? "saving" : state); es.innerHTML = `<i></i>${esc(ED.dirty ? "Editing…" : label)}`; }
  }
  window.addEventListener("online", () => scheduleFlush(100));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushNow(); });
  window.addEventListener("pagehide", flushNow);
  window.addEventListener("beforeunload", (e) => { flushNotes(); if (Object.keys(S.queue).length && S.sync !== "local") { e.preventDefault(); e.returnValue = ""; } });
  function flushNow() { flushNotes(); if (Object.keys(S.queue).length) flush({ keepalive: true }); }

  // Notes are written on a short pause in typing, and immediately when leaving the field.
  const noteTimers = {};
  const pendingNotes = {};
  function queueNote(key, field, value) {
    const id = key + "|" + field;
    pendingNotes[id] = { key, field, value };
    clearTimeout(noteTimers[id]);
    noteTimers[id] = setTimeout(() => commitNote(id), 600);
  }
  function commitNote(id) {
    const n = pendingNotes[id];
    clearTimeout(noteTimers[id]); delete noteTimers[id]; delete pendingNotes[id];
    if (n && (rec(n.key)[n.field] || "") !== n.value) edit(n.key, { [n.field]: n.value });
  }
  function flushNotes() { Object.keys(pendingNotes).forEach(commitNote); commitDraft(); }
  const typing = () => { const a = document.activeElement; return !!(a && a.closest && a.closest("[data-note],[data-draft]")); };

  // ---------- banner (password / storage) ----------
  function renderBanner() {
    const el = $("#banner");
    if (S.sync === "locked") {
      el.innerHTML = `<div class="banner warn"><strong>This tracker is password-protected.</strong> Enter the password once; this browser will remember it.
        <form id="pwForm"><input type="password" id="pwInput" autocomplete="current-password" aria-label="Tracker password" placeholder="Password"><button class="btn primary" type="submit">Unlock</button></form></div>`;
      $("#pwForm").onsubmit = (e) => { e.preventDefault(); lsSet(LS.pw, $("#pwInput").value); el.innerHTML = ""; setSync("connecting"); loadServer(); };
      return;
    }
    if (S.sync === "local") {
      el.innerHTML = `<div class="banner info"><strong>Server storage isn’t connected.</strong> Your changes are safe in this browser, but won’t appear on other devices. In Vercel, open this project → Storage → connect <em>Upstash for Redis</em>, then redeploy. Everything saved here will upload automatically.</div>`;
      return;
    }
    el.innerHTML = "";
  }

  // ---------- terrazzo strip ----------
  function drawTerrazzo() {
    const c = $("#terrazzo"), r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(r.width * dpr)); c.height = Math.round(14 * dpr);
    const g = c.getContext("2d"), cs = getComputedStyle(document.documentElement);
    const cols = ["--chip1", "--chip2", "--chip3", "--chip4", "--chip5"].map((v) => cs.getPropertyValue(v).trim());
    g.fillStyle = cs.getPropertyValue("--surface-2").trim(); g.fillRect(0, 0, c.width, c.height);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0, n = Math.round(c.width / 5); i < n; i++) {
      g.fillStyle = cols[Math.floor(rnd() * cols.length)];
      const x = rnd() * c.width, y = rnd() * c.height, w = (1.2 + rnd() * 4.5) * dpr, h = (1 + rnd() * 3) * dpr;
      g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI); g.beginPath();
      g.moveTo(-w / 2, -h / 2); g.lineTo(w / 2, -h / 3); g.lineTo(w / 3, h / 2); g.lineTo(-w / 2, h / 3); g.closePath(); g.fill(); g.restore();
    }
  }
  window.addEventListener("resize", () => { clearTimeout(drawTerrazzo.t); drawTerrazzo.t = setTimeout(drawTerrazzo, 120); });
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", drawTerrazzo); } catch { /* old browsers */ }

  // ---------- summary ----------
  function renderSummary() {
    if (!S.projects.length) return;
    const c = { live: 0, added: 0, missing: 0, restricted: 0, nda: 0 };
    S.projects.forEach((p) => { const e = eff(p); c[e in c ? e : "nda"]++; });
    const open = S.projects.filter(editable);
    const drafting = open.filter((p) => ["drafting", "ready"].includes(wfOf(p))).length;
    const drafts = S.projects.filter((p) => hasDraft(rec(pKey(p)))).length;
    const segs = [["live", "seg-live", c.live + c.added, "On website"], ["missing", "seg-miss", c.missing, "Not on website"], ["restricted", "seg-warn", c.restricted, "Needs rights"], ["nda", "seg-nda", c.nda, "Internal"]];
    const total = S.projects.length;
    $("#bar").innerHTML = segs.filter((s) => s[2] > 0).map((s) => `<button type="button" class="${s[1]}" data-status="${s[0]}" style="flex:${s[2]} 1 0" title="${s[3]}: ${s[2]}" aria-label="${s[3]}: ${s[2]}"><span>${s[2]}</span>${s[2] / total > 0.14 ? `<em class="lbl">${s[3]}</em>` : ""}</button>`).join("");
    $("#legend").innerHTML = [
      `<span><b>${S.projects.length}</b> Notion entries</span>`,
      `<span><b>${S.cases.length}</b> cases on polygood.com</span>`,
      `<span><b>${c.missing + c.restricted}</b> not on the website yet</span>`,
      `<span><b>${c.added}</b> published by you · <b>${drafting}</b> in progress</span>`,
      `<span><b>${drafts}</b> case study draft${drafts === 1 ? "" : "s"}</span>`,
    ].join("");
  }

  // ---------- filters ----------
  function fillControls() {
    const cats = [...new Set(S.projects.map((p) => p.cat))].sort();
    const countries = [...new Set(S.projects.map((p) => p.country).filter(Boolean))].sort();
    $("#cat").innerHTML = `<option value="">All categories</option>` + cats.map((c) => `<option ${c === S.cat ? "selected" : ""}>${esc(c)}</option>`).join("");
    $("#country").innerHTML = `<option value="">All countries</option>` + countries.map((c) => `<option ${c === S.country ? "selected" : ""}>${esc(c)}</option>`).join("");
    $("#sort").value = S.sort; $("#wf").value = S.wf; $("#siteSort").value = S.siteSort;
    $("#starred").checked = S.starred; $("#pro").checked = S.pro; $("#free").checked = S.free; $("#siteGaps").checked = S.siteGaps;
    document.querySelectorAll("#statusSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.status === S.status)));
  }
  const matchesQ = (p) => !S.q || p._hay.includes(S.q);
  function statusOk(p) {
    const b = bucket(eff(p));
    if (S.status === "public") return b !== "nda";
    if (S.status === "missing") return b === "missing" || b === "restricted";
    return b === S.status;
  }
  function visibleProjects() {
    const out = S.projects.filter((p) => {
      if (!statusOk(p)) return false;
      if (S.cat && p.cat !== S.cat) return false;
      if (S.country && p.country !== S.country) return false;
      if (S.pro && !p.pro) return false;
      if (S.free && (p.status !== "missing" || p.social === "no")) return false;
      if (S.starred && !rec(pKey(p)).starred) return false;
      if (S.wf && (!editable(p) || wfOf(p) !== S.wf)) return false;
      return matchesQ(p);
    });
    const byName = (a, b) => a.name.localeCompare(b.name);
    const byDate = (a, b) => (a.added || "").localeCompare(b.added || "") || byName(a, b);
    const order = { live: 0, missing: 1, restricted: 2, nda: 3 };
    if (S.sort === "az") out.sort(byName);
    else if (S.sort === "country") out.sort((a, b) => (a.country || "~").localeCompare(b.country || "~") || byName(a, b));
    else if (S.sort === "newest") out.sort((a, b) => -byDate(a, b));
    else if (S.sort === "oldest") out.sort(byDate);
    else out.sort((a, b) => order[bucket(eff(a))] - order[bucket(eff(b))] || byDate(a, b));
    return out;
  }

  // ---------- answer line ----------
  function renderAnswer(visCount) {
    const el = $("#answer");
    if (S.tab === "history") { el.innerHTML = ""; return; }
    if (!S.q) { el.innerHTML = `<span class="count">${visCount} shown</span>`; return; }
    const all = S.projects.filter(matchesQ);
    const hits = S.cases.filter((c) => c._hay.includes(S.q));
    const orphan = hits.filter((c) => !c.notion.length);
    const n = { live: 0, missing: 0, restricted: 0, nda: 0 };
    all.forEach((p) => n[bucket(eff(p))]++);
    const parts = [];
    if (all.length) {
      const bits = [];
      if (n.missing) bits.push(`<strong>${n.missing} not on the website</strong>`);
      if (n.restricted) bits.push(`<strong>${n.restricted} not on the website, needs rights</strong>`);
      if (n.live) bits.push(`${n.live} already on the website`);
      if (n.nda) bits.push(`${n.nda} internal only`);
      parts.push(`${all.length} ${all.length === 1 ? "match" : "matches"} in Notion: ${bits.join(", ")}.`);
    } else parts.push(`Nothing in Notion matches “${esc(S.q)}”.`);
    if (orphan.length) parts.push(`On the website but not in Notion: ${orphan.map((c) => `<strong>${esc(c.title)}</strong>`).join(", ")}.`);
    else if (!all.length && hits.length) parts.push(`Website case: ${hits.map((c) => esc(c.title)).join(", ")}.`);
    const hidden = S.tab === "notion" ? all.length - visCount : 0;
    if (hidden > 0) parts.push(`<button class="linkbtn" type="button" data-action="showall">Show ${hidden} hidden by filters</button>`);
    el.innerHTML = parts.join(" ");
  }

  // ---------- project rows ----------
  const ICON_STAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>`;
  const ICON_CHEV = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
  function rowHTML(p) {
    const key = pKey(p), r = rec(key), e = eff(p), open = S.open.has(p.id);
    const meta = [p.country, p.cat, (p.types || []).filter((t) => t !== p.cat).slice(0, 2).join(" · ")].filter(Boolean).join(" — ");
    let wf;
    if (editable(p)) {
      wf = `<div class="wf"><select data-wf="${esc(key)}" aria-label="Your progress on ${esc(p.name)}">${Object.entries(WF).map(([k, v]) => `<option value="${k}" ${wfOf(p) === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>`;
    } else if (e === "live") {
      wf = `<div class="wf"><span class="fixed" title="${esc(p.siteCase || "")}">${p.siteUrl ? `<a href="${esc(p.siteUrl)}" target="_blank" rel="noopener">Open case on polygood.com</a>` : `Case: ${esc(p.siteCase || "on polygood.com")}`}</span></div>`;
    } else wf = `<div class="wf"><span class="fixed">—</span></div>`;
    return `<article class="row" id="row-${esc(p.id)}">
      <div class="rowhead">
        <div class="rowmain"><h3 class="name"><a href="${esc(p.notion)}" target="_blank" rel="noopener">${esc(p.name)}</a></h3><div class="meta">${esc(meta)}${hasDraft(r) ? ` · <span class="drafttag">Draft, ${words(r.draft.body)} words</span>` : ""}</div></div>
        <span class="date" title="Added to Notion">${esc(fmtDate(p.added))}</span>
        <span class="pill p-${e}">${STATUS_LABEL[e]}</span>
        ${wf}
        <button class="iconbtn star" type="button" data-star="${esc(key)}" aria-pressed="${!!r.starred}" aria-label="${r.starred ? "Unstar" : "Star"} ${esc(p.name)}" title="Star as a reference or priority">${ICON_STAR}</button>
        <button class="iconbtn toggle" type="button" data-toggle="${esc(p.id)}" aria-expanded="${open}" aria-label="Details for ${esc(p.name)}">${ICON_CHEV}</button>
      </div>${open ? detailHTML(p, r) : ""}</article>`;
  }
  function detailHTML(p, r) {
    const key = pKey(p);
    const tags = (a) => (a && a.length ? `<div class="tags">${a.map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div>` : `<span class="meta">—</span>`);
    const rights = [p.pro ? `<span class="flag good">Professional photos</span>` : `<span class="flag">No professional photos</span>`];
    if (p.social === "no") rights.push(`<span class="flag bad">Social media: No</span>`);
    else if (p.social === "yes") rights.push(`<span class="flag good">Social media: yes, with credits</span>`);
    if (p.agreement) rights.push(`<span class="flag good">Agreement / invoice attached in Notion</span>`);
    if (p.rights) rights.push(`<span>${esc(p.rights)}</span>`);
    const noteVal = draftValue(key, "note", r.note);
    const siteBit = p.siteCase ? `<div><dt>Website case</dt><dd>${p.siteUrl ? `<a href="${esc(p.siteUrl)}" target="_blank" rel="noopener">${esc(p.siteCase)}</a>` : `${esc(p.siteCase)} <span class="meta">(listed in the <a href="${esc(S.catalog.catalogUrl)}" target="_blank" rel="noopener">projects catalog</a>)</span>`}</dd></div>` : "";
    const pubUrl = draftValue(key, "publishedUrl", r.publishedUrl);
    return `<div class="detail">
      <dl>
        ${canWrite(p) ? `<div><dt>Case study</dt><dd><button class="btn primary small" type="button" data-write="${esc(p.id)}">${hasDraft(r) ? `Continue draft (${words(r.draft.body)} words)` : p.status === "live" ? "Rewrite case study" : "Write case study"}</button></dd></div>` : ""}
        <div><dt>Made from Polygood</dt><dd>${tags(p.uses)}</dd></div>
        <div><dt>Pattern</dt><dd>${tags(p.patterns)}</dd></div>
        <div><dt>Credits</dt><dd>${esc(p.credits) || `<span class="meta">Not recorded</span>`}</dd></div>
        ${p.partner ? `<div><dt>Partner</dt><dd>${esc(p.partner)}</dd></div>` : ""}
        <div><dt>Added to Notion</dt><dd>${esc(fmtDate(p.added))}</dd></div>
      </dl>
      <dl>
        <div><dt>Photos &amp; rights</dt><dd style="display:grid;gap:4px">${rights.join("")}</dd></div>
        ${p.note ? `<div><dt>Note</dt><dd>${esc(p.note)}</dd></div>` : ""}
        ${siteBit}
        <div><dt>Links</dt><dd class="links"><a href="${esc(p.notion)}" target="_blank" rel="noopener">Open in Notion</a>${p.ig ? `<span class="meta">Instagram post linked in Notion</span>` : ""}</dd></div>
      </dl>
      <dl>
        <div><dt><label for="note-${esc(p.id)}">Your notes</label></dt><dd><textarea id="note-${esc(p.id)}" data-note="${esc(key)}" data-field="note" placeholder="Angle, missing info, who to ask for rights…">${esc(noteVal)}</textarea></dd></div>
        ${editable(p) && wfOf(p) === "published" ? `<div><dt><label for="pub-${esc(p.id)}">Link to the new case</label></dt><dd><input class="field" id="pub-${esc(p.id)}" data-note="${esc(key)}" data-field="publishedUrl" type="url" placeholder="https://polygood.com/projects/…" value="${esc(pubUrl)}"></dd></div>` : ""}
        ${r.updatedAt ? `<div class="saved-note">Saved to server ${esc(fmtTime(r.updatedAt))}</div>` : r.clientUpdatedAt ? `<div class="saved-note">Saved in this browser ${esc(fmtTime(r.clientUpdatedAt))}</div>` : ""}
      </dl>
    </div>`;
  }
  function draftValue(key, field, saved) { const d = pendingNotes[key + "|" + field]; return d ? d.value : saved || ""; }

  function sectionHTML(b, count) {
    const [t, sub] = SECTIONS[b];
    return `<div class="section"><h2>${esc(t)} <span class="count">${count}</span></h2><p>${esc(sub)}</p></div>`;
  }

  // ---------- website case rows ----------
  function caseDate(c) { return c.date || ""; }
  function visibleCases() {
    let out = S.cases.filter((c) => !S.q || c._hay.includes(S.q));
    if (S.siteGaps) out = out.filter((c) => !c.notion.length || !(c.url || rec(cKey(c)).url));
    if (S.siteSort === "site") out.sort((a, b) => a.siteOrder - b.siteOrder);
    else if (S.siteSort === "newest") out.sort((a, b) => caseDate(b).localeCompare(caseDate(a)) || a.siteOrder - b.siteOrder);
    else out.sort((a, b) => (caseDate(a) || "9").localeCompare(caseDate(b) || "9") || a.siteOrder - b.siteOrder);
    return out;
  }
  function caseHTML(c) {
    const key = cKey(c), r = rec(key);
    const ents = c.notion.map((id) => S.byId[id]).filter(Boolean);
    const url = c.url || r.url;
    const flags = [];
    if (!c.notion.length) flags.push(`<span class="pill p-restricted">No Notion entry</span>`);
    if (!url) flags.push(`<span class="pill p-nda">URL missing</span>`);
    const urlDraft = draftValue(key, "url", r.url);
    return `<article class="row" id="case-${esc(slug(c.title))}">
      <div class="casehead">
        <div>
          <h3 class="casetitle">${esc(c.title)}</h3>
          <div class="caselinks">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\//, ""))}</a>` : `Listed in the <a href="${esc(S.catalog.catalogUrl)}" target="_blank" rel="noopener">projects catalog</a>`}
            · <span class="date">${c.date ? "In Notion since " + esc(fmtDate(c.date)) : "No Notion date"}</span> · <span class="date">#${c.siteOrder} on the website</span></div>
          ${ents.length ? `<div class="meta" style="margin-top:6px">Notion: ${ents.map((p) => `<a href="${esc(p.notion)}" target="_blank" rel="noopener">${esc(p.name)}</a>`).join(" · ")}</div>` : ""}
          ${c.note ? `<div class="meta" style="margin-top:4px;color:var(--ink)">${esc(c.note)}</div>` : ""}
          ${!c.url ? `<div class="urlform"><input class="field" type="url" id="url-${esc(slug(c.title))}" data-note="${esc(key)}" data-field="url" placeholder="Paste this case’s URL" value="${esc(urlDraft)}" aria-label="URL for ${esc(c.title)}"></div>` : ""}
          <div style="margin-top:8px"><textarea id="cnote-${esc(slug(c.title))}" data-note="${esc(key)}" data-field="note" placeholder="Notes on this case: what works, what to reuse…" aria-label="Notes for ${esc(c.title)}" style="min-height:56px">${esc(draftValue(key, "note", r.note))}</textarea></div>
        </div>
        <div class="caseside">${flags.join("")}
          <button class="iconbtn star" type="button" data-star="${esc(key)}" aria-pressed="${!!r.starred}" aria-label="${r.starred ? "Unstar" : "Star"} ${esc(c.title)}" title="Star as a reference">${ICON_STAR}</button>
        </div>
      </div></article>`;
  }

  // ---------- history ----------
  async function loadHistory() {
    if (S.sync === "local" || S.sync === "locked") { S.history = { unavailable: true }; render(); return; }
    try { const out = await api("/api/history?limit=150"); S.history = { entries: out.entries || [] }; }
    catch (err) { S.history = { error: err.message }; }
    render();
  }
  function describeKey(key) {
    if (key.startsWith("p:")) { const p = S.byId[key.slice(2)]; return p ? p.name : key; }
    const c = S.caseByKey[key]; return c ? c.title : key;
  }
  function historyHTML() {
    const h = S.history;
    if (!h) return `<div class="empty">Loading saved changes…</div>`;
    if (h.unavailable) return `<div class="empty">The change history lives on the server. ${S.sync === "locked" ? "Unlock with the password to see it." : "Connect server storage to keep a history."}</div>`;
    if (h.error) return `<div class="empty">Couldn’t load the history: ${esc(h.error)}</div>`;
    if (!h.entries.length) return `<div class="empty">No saved changes yet. Mark a project or write a note and it will appear here.</div>`;
    return `<p class="meta" style="margin:14px 0 4px">The last ${h.entries.length} changes saved on the server, newest first.</p>` + h.entries.map((e) => {
      const r = e.record || {};
      const bits = [];
      if (r.status) bits.push(`progress: <strong>${esc(WF[r.status] || r.status)}</strong>`);
      if (r.starred) bits.push("starred");
      if (r.url) bits.push(`URL: ${esc(r.url)}`);
      if (r.publishedUrl) bits.push(`published at ${esc(r.publishedUrl)}`);
      if (r.note) bits.push(`note: “${esc(r.note.length > 140 ? r.note.slice(0, 140) + "…" : r.note)}”`);
      if (hasDraft(r)) bits.push(`case study draft “${esc(r.draft.title || "untitled")}”, ${words(r.draft.body)} words`);
      return `<div class="hist"><span class="when">${esc(fmtTime(e.at))}</span><div><strong>${esc(describeKey(e.key))}</strong>${e.source === "import" ? ` <span class="meta">(restored from backup)</span>` : ""}<div class="meta">${bits.join(" · ") || "cleared"}</div></div></div>`;
    }).join("");
  }

  // ---------- case study editor ----------
  // One draft per Notion project, laid out like docs/case-study-outline.md. Facts Notion
  // already has are filled in when a draft is first opened; the draft is saved with the
  // project's record (like a note) as soon as you edit it.
  function cleanName(name) {
    const s = String(name || "").replace(/\s*\([^)]*\)/g, "").replace(/_/g, " ").split(/\s+[-–—|]\s+|,\s+/)[0];
    return s.replace(/\s{2,}/g, " ").trim() || String(name || "").trim();
  }
  // Newest website cases from the same category first, short name titles before old headlines.
  function similarFor(p) {
    const headline = (c) => words(c.title) > 5 || c.title.includes(":");
    const rank = (c) => (c.notion.some((id) => S.byId[id] && S.byId[id].cat === p.cat) ? 0 : 2) + (headline(c) ? 1 : 0);
    return S.cases.filter((c) => (c.url || rec(cKey(c)).url) && !c.notion.includes(p.id))
      .sort((a, b) => rank(a) - rank(b) || a.siteOrder - b.siteOrder).slice(0, 3).map((c) => titleCase(c.title));
  }
  function suggestDraft(p) {
    const title = cleanName(p.name);
    const partner = String(p.partner || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    const credits = [p.credits || "", partner && !norm(p.credits).includes(norm(partner)) ? `Partner: ${partner}` : ""].filter(Boolean).join("\n");
    return {
      slug: slug(title), title, subtitle: "", body: "",
      pattern: (p.patterns || []).join(", "),
      application: (p.uses || []).map((u, i) => (i && /^[A-Z][a-z]/.test(u) ? u[0].toLowerCase() + u.slice(1) : u)).join(", "),
      location: p.country && !/^(europe|worldwide|global|international)$/i.test(p.country) ? p.country : "",
      credits: credits.slice(0, DRAFT_MAX.credits),
      images: "",
      similar: similarFor(p).join(" · "),
    };
  }
  const draftTitle = (p, d) => String((d && d.title) || "").trim() || cleanName(p.name);
  const progressLabel = (p) => (editable(p) ? WF[wfOf(p)] : p.status === "live" ? "Rewrite of a live case" : STATUS_LABEL[eff(p)]);

  function draftChecks(p, d) {
    const out = [], add = (ok, text) => out.push({ ok, text });
    const t = String(d.title || "").trim(), sub = String(d.subtitle || "").trim(), body = String(d.body || "");
    if (!t) add(false, "Add a title: the client’s or venue’s name.");
    else if (/^polygood\b/i.test(t) || t.includes(":")) add(false, "Title: use the client’s name and move the description to the subtitle.");
    else if (t.length > 30) add(false, `Title has ${t.length} characters. Aim for under 30: it shows in capitals on the cards.`);
    else add(true, "Title is a short name.");
    if (!sub) add(false, "Add a subtitle: what we made, for whom or where.");
    else if (words(sub) > 10 || /[.!]$/.test(sub)) add(false, "Subtitle: 10 words at most, no full stop at the end.");
    else add(true, "Subtitle fits on one line.");
    const n = words(body), paras = paragraphs(body).length;
    if (!n) add(false, "Write the body in 2 or 3 short paragraphs.");
    else if (n > 150) add(false, `Body has ${n} words. Keep it under 150.`);
    else add(true, `Body: ${n} words in ${paras} paragraph${paras === 1 ? "" : "s"}.`);
    if ((body + sub).includes("!")) add(false, "Remove the exclamation marks.");
    if (/\bunique\b/i.test(`${t} ${sub} ${body}`)) add(false, "Replace “unique” with a fact.");
    const missing = SPEC.slice(0, 3).filter(([f]) => !String(d[f] || "").trim()).map(([, label]) => label);
    if (missing.length) add(false, `Fill in ${missing.join(", ")}.`);
    if (!String(d.credits || "").trim()) add(false, p.credits ? "Add the credits: Notion has them (see From Notion)." : "No credits in Notion. Ask the partner before publishing.");
    const s = String(d.slug || "");
    if (s && (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) || /-\d+$/.test(s))) add(false, "Web address: lowercase words and hyphens only, no “-2”.");
    if (p.status === "restricted") add(false, "Photo rights need sorting before this can go live.");
    else if (!p.pro && p.status !== "live") add(false, "No professional photos recorded in Notion.");
    return out;
  }

  // The same content for the preview, the clipboard and the .docx.
  function caseBlocks(p, d, opts = {}) {
    d = d || {};
    const title = draftTitle(p, d), sub = String(d.subtitle || "").trim();
    const blocks = [{ type: "h1", text: title, pageBreak: !!opts.pageBreak }];
    if (sub) blocks.push({ type: "subtitle", text: sub });
    blocks.push({ type: "meta", runs: [{ text: `polygood.com/projects/${d.slug || slug(title)}/ · ${progressLabel(p)} · ` }, { text: "Notion", link: p.notion }] });
    paragraphs(d.body).forEach((t) => blocks.push({ type: "p", text: t }));
    SPEC.forEach(([f, label]) => { const v = String(d[f] || "").trim(); if (v) blocks.push({ type: "p", runs: [{ text: `${label}: `, bold: true }, { text: v }] }); });
    if (String(d.images || "").trim()) { blocks.push({ type: "h2", text: "Images" }); paragraphs(d.images).forEach((t) => blocks.push({ type: "p", text: t })); }
    if (String(d.similar || "").trim()) blocks.push({ type: "h2", text: "Similar projects" }, { type: "p", text: d.similar.trim() });
    return blocks;
  }
  function blocksToHtml(blocks) {
    return blocks.map((b) => {
      const inner = (b.runs || [{ text: b.text }]).map((r) => {
        let h = esc(r.text).replace(/\n/g, "<br>");
        if (r.link) h = `<a href="${esc(r.link)}">${h}</a>`;
        return r.bold ? `<b>${h}</b>` : h;
      }).join("");
      if (b.type === "title" || b.type === "h1") return `<h1>${inner}</h1>`;
      if (b.type === "h2") return `<h2>${inner}</h2>`;
      if (b.type === "subtitle") return `<p style="font-size:14pt;color:#5b6560">${inner}</p>`;
      if (b.type === "meta") return `<p style="font-size:9pt;color:#5b6560">${inner}</p>`;
      return `<p>${inner}</p>`;
    }).join("\n");
  }
  const blocksToText = (blocks) => blocks.map((b) => (b.runs || [{ text: b.text }]).map((r) => r.text).join("")).join("\n\n");

  // Rich text on the clipboard keeps headings and bold labels when pasted into a doc.
  async function copyRich(html, text) {
    const doc = `<meta charset="utf-8">${html}`;
    try {
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([doc], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
        return true;
      }
    } catch { /* fall back to a copy event below */ }
    let ok = false;
    const onCopy = (e) => { e.clipboardData.setData("text/html", doc); e.clipboardData.setData("text/plain", text); e.preventDefault(); ok = true; };
    document.addEventListener("copy", onCopy);
    try { document.execCommand("copy"); } catch { /* not supported */ }
    document.removeEventListener("copy", onCopy);
    return ok;
  }
  function download(data, name, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type }));
    a.download = name;
    ($("#editor").open ? $("#editor") : document.body).appendChild(a); // outside an open modal, clicks are blocked
    a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function downloadDocx(blocks, title, name) {
    if (!window.PCTDocx) { toast("The Word export didn’t load. Reload the page and try again."); return false; }
    download(window.PCTDocx.build(blocks, { title }), name, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    return true;
  }

  function fieldHTML(f, label, hint, opts = {}) {
    const id = "ed-" + f;
    const attrs = `id="${id}" data-draft="${f}" maxlength="${DRAFT_MAX[f]}"${opts.placeholder ? ` placeholder="${opts.placeholder}"` : ""}`;
    const ctl = opts.area
      ? `<textarea ${attrs} rows="${opts.rows || 3}">${esc(ED.draft[f] || "")}</textarea>`
      : `<input class="field" type="text" autocomplete="off" ${attrs} value="${esc(ED.draft[f] || "")}">`;
    return `<div class="fld"><div class="fld-top"><label for="${id}">${label}</label><span class="cnt" data-cnt="${f}"></span></div>
      ${opts.before ? `<div class="slugrow"><span>${opts.before}</span>${ctl}<span>/</span></div>` : ctl}<p class="hint">${hint}</p></div>`;
  }
  function factsHTML(p) {
    const row = (k, v) => (v ? `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>` : "");
    const rights = [p.pro ? "Professional photos" : "No professional photos", p.social === "no" ? "Social media: No" : p.social === "yes" ? "Social media: yes, with credits" : "", p.agreement ? "Agreement / invoice attached in Notion" : "", p.rights].filter(Boolean).join(" · ");
    return `<dl class="facts-dl">${row("Notion name", p.name)}${row("Country", p.country)}${row("Category", [...new Set([p.cat, ...(p.types || [])].filter(Boolean))].join(" · "))}${row("Made from Polygood", (p.uses || []).join(", "))}${row("Pattern", (p.patterns || []).join(", "))}${row("Credits", p.credits)}${row("Partner", p.partner)}${row("Photos & rights", rights)}${row("Website case", p.siteCase ? [p.siteCase, p.siteUrl].filter(Boolean).join(" · ") : "")}${row("Note", p.note)}</dl>`;
  }
  function previewHTML(p, d) {
    const title = draftTitle(p, d), sub = String(d.subtitle || "").trim(), body = paragraphs(d.body);
    const spec = SPEC.map(([f, label]) => [label, String(d[f] || "").trim()]).filter(([, v]) => v);
    return `<p class="pv-label">Preview</p>
      <div class="pv-crumb">Polygood › Projects › ${esc(title)}</div>
      <h3 class="pv-title">${esc(title)}</h3>
      ${sub ? `<p class="pv-sub">${esc(sub)}</p>` : ""}
      <div class="pv-body">${body.length ? body.map((t) => `<p>${esc(t).replace(/\n/g, "<br>")}</p>`).join("") : `<p class="meta">The body text appears here.</p>`}</div>
      ${spec.length ? `<div class="pv-spec">${spec.map(([k, v]) => `<p><b>${k}:</b> ${esc(v).replace(/\n/g, "<br>")}</p>`).join("")}</div>` : ""}
      <p class="pv-label">On the projects page</p>
      <div class="pv-card">${esc(title)}</div>
      <p class="meta">polygood.com/projects/${esc(d.slug || slug(title))}/</p>`;
  }

  function openEditor(p) {
    if (!p || !canWrite(p)) return;
    const key = pKey(p), r = rec(key);
    Object.assign(ED, { p, key, fresh: !hasDraft(r), dirty: false, draft: { ...suggestDraft(p), ...(r.draft || {}) } });
    renderEditor();
    const dlg = $("#editor");
    if (!dlg.open) dlg.showModal();
    document.body.classList.add("modal-open");
    const first = $(ED.fresh ? "#ed-subtitle" : "#ed-body");
    if (first && matchMedia("(min-width: 861px)").matches) first.focus({ preventScroll: true }); // no keyboard pop-up on phones
  }
  function renderEditor() {
    const p = ED.p;
    // Only #edRoot is redrawn, so the toast (moved into the dialog while it is open) survives.
    $("#edRoot").innerHTML = `
      <header class="ed-head">
        <div class="ed-headtext">
          <p class="ed-kicker">Case study draft${ED.fresh ? " · facts filled in from Notion" : ""}</p>
          <h2 id="edTitle">${esc(p.name)}</h2>
          <div class="meta">${esc([p.country, p.cat].filter(Boolean).join(" · "))} · <a href="${esc(p.notion)}" target="_blank" rel="noopener">Open in Notion</a></div>
        </div>
        <div class="ed-actions">
          ${editable(p) ? `<select data-edwf aria-label="Your progress on ${esc(p.name)}">${Object.entries(WF).map(([k, v]) => `<option value="${k}" ${wfOf(p) === k ? "selected" : ""}>${v}</option>`).join("")}</select>` : ""}
          <span class="syncpill" id="edSync"></span>
          <button class="btn primary" type="button" data-ed="close">Done</button>
        </div>
      </header>
      <div class="ed-body">
        <section class="ed-form" aria-label="Case study">
          ${fieldHTML("title", "Title", "The client’s or venue’s name as they spell it. Add “, City” if they have several projects. No “Polygood for…” and no colon.")}
          ${fieldHTML("subtitle", "Subtitle", "What we made, for whom or where. One line, no full stop.", { placeholder: "Counter and tables in Potpourri for a Denver bar" })}
          ${fieldHTML("body", "Body", "2 or 3 short paragraphs with an empty line between them. When you publish, link the client and the partner once each.", { area: true, rows: 11, placeholder: "Who the client is and what they needed.&#10;&#10;What we made: the pattern, what it’s made from, which pieces, who designed and built them.&#10;&#10;One result: a number, a reuse, a short quote." })}
          <fieldset class="specset"><legend>Details under the text</legend>
            ${fieldHTML("pattern", "Pattern", "No quotes. Add “(bespoke)” if it was made for this client.")}
            ${fieldHTML("application", "Application", "What was made, in plain words.")}
            ${fieldHTML("location", "Location", "City, Country.")}
            ${fieldHTML("credits", "Credits", "Design: … · Fabrication: … · Photography: …, in the order and wording the partner asks for.", { area: true, rows: 3 })}
          </fieldset>
          ${fieldHTML("images", "Images", "Widest shot of the space first, then a close-up of the pattern. Alt text names the object, the pattern and the place.", { area: true, rows: 3, placeholder: "Hero: …&#10;Close-up: …&#10;Alt text: …" })}
          ${fieldHTML("similar", "Similar projects", "3 website cases from the same category, never this one.")}
          ${fieldHTML("slug", "Web address", "The client’s name in lowercase with hyphens. No “-2”.", { before: "polygood.com/projects/" })}
        </section>
        <aside class="ed-side" aria-label="Export, checks and preview">
          <div class="ed-export">
            <button class="btn primary" type="button" data-ed="copy">Copy for Google Docs</button>
            <button class="btn" type="button" data-ed="docx">Download .docx</button>
            <a class="btn" href="https://docs.new" target="_blank" rel="noopener">New Google Doc ↗</a>
          </div>
          <p class="hint">Paste the copy into Google Docs, Word or Notion and the headings and bold labels come with it. The .docx opens in Word, or in Google Docs once uploaded to Drive.</p>
          <ul class="checks" id="edChecks" aria-label="Checks against the outline"></ul>
          <div class="preview" id="edPreview"></div>
          <details class="facts"><summary>From Notion</summary>${factsHTML(p)}<button class="btn small" type="button" data-ed="refill">Fill empty fields from Notion</button></details>
        </aside>
      </div>`;
    updateEditorLive();
    renderSync();
  }
  function updateEditorLive() {
    const root = $("#editor"), d = ED.draft;
    const count = (f, text, over) => { const el = root.querySelector(`[data-cnt="${f}"]`); if (el) { el.textContent = text; el.classList.toggle("over", over); } };
    const tl = String(d.title || "").trim().length, sw = words(d.subtitle), bw = words(d.body);
    count("title", `${tl} / 30 characters`, tl > 30);
    count("subtitle", `${sw} / 10 words`, sw > 10);
    count("body", `${bw} / 150 words`, bw > 150);
    root.querySelector("#edChecks").innerHTML = draftChecks(ED.p, d).map((c) => `<li class="${c.ok ? "ok" : "warn"}">${esc(c.text)}</li>`).join("");
    root.querySelector("#edPreview").innerHTML = previewHTML(ED.p, d);
  }
  // Saved on a pause in typing, when leaving a field and when the editor closes.
  function commitDraft() {
    clearTimeout(ED.timer); ED.timer = null;
    if (!ED.p || !ED.dirty) return;
    ED.dirty = false;
    const patch = { draft: Object.fromEntries(DRAFT.map(([f, max]) => [f, String(ED.draft[f] || "").slice(0, max)])) };
    const start = ED.fresh && editable(ED.p) && wfOf(ED.p) === "todo";
    if (start) patch.status = "drafting";
    ED.fresh = false;
    edit(ED.key, patch);
    if (start) {
      const s = $("#editor [data-edwf]"); if (s) s.value = "drafting";
      toast("Draft saved. Progress set to Drafting.");
    }
  }

  const edDialog = $("#editor");
  edDialog.addEventListener("input", (e) => {
    const t = e.target.closest("[data-draft]"); if (!t || !ED.p) return;
    const f = t.dataset.draft, before = ED.draft[f];
    ED.draft[f] = t.value;
    if (f === "title" && (!ED.draft.slug || ED.draft.slug === slug(before || ""))) { // follow the title until the address is edited by hand
      ED.draft.slug = t.value.trim() ? slug(t.value) : "";
      $("#ed-slug").value = ED.draft.slug;
    }
    ED.dirty = true;
    updateEditorLive();
    renderSync();
    clearTimeout(ED.timer); ED.timer = setTimeout(commitDraft, 1500);
  });
  edDialog.addEventListener("focusout", (e) => { if (e.target.closest("[data-draft]")) commitDraft(); });
  edDialog.addEventListener("change", (e) => {
    const s = e.target.closest("select[data-edwf]"); if (!s || !ED.p) return;
    commitDraft();
    edit(ED.key, { status: s.value });
    toast(s.value === "published" ? "Marked as published. Add the link to the new case in the project’s details." : `Progress set to “${WF[s.value]}”`);
  });
  edDialog.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ed]"); if (!b || !ED.p) return;
    const p = ED.p;
    if (b.dataset.ed === "close") { edDialog.close(); return; }
    if (b.dataset.ed === "copy") {
      commitDraft();
      const blocks = caseBlocks(p, ED.draft);
      copyRich(blocksToHtml(blocks), blocksToText(blocks)).then((ok) => toast(ok ? "Copied. Paste it into Google Docs, Word or Notion." : "This browser blocked copying. Use Download .docx instead."));
      return;
    }
    if (b.dataset.ed === "docx") {
      commitDraft();
      const title = draftTitle(p, ED.draft);
      if (downloadDocx(caseBlocks(p, ED.draft), title, `polygood-case-${ED.draft.slug || slug(title)}.docx`)) toast("Downloaded. Open it in Word, or upload it to Google Drive and open it with Google Docs.");
      return;
    }
    if (b.dataset.ed === "refill") {
      const s = suggestDraft(p); let n = 0;
      for (const [f] of DRAFT) if (!String(ED.draft[f] || "").trim() && s[f]) { ED.draft[f] = s[f]; n++; }
      if (n) { ED.dirty = true; renderEditor(); commitDraft(); }
      toast(n ? `Filled ${n} empty field${n === 1 ? "" : "s"} from Notion` : "Every field Notion covers already has text.");
    }
  });
  edDialog.addEventListener("close", () => {
    commitDraft();
    ED.p = null; ED.key = null;
    document.body.classList.remove("modal-open");
    const t = $("#toast"); if (t.parentNode !== document.body) document.body.appendChild(t);
    render();
  });

  // ---------- render ----------
  function render() {
    renderSummary();
    renderSync();
    document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
    $("#projectFilters").hidden = S.tab !== "notion";
    $("#siteFilters").hidden = S.tab !== "site";
    $(".searchrow").hidden = S.tab === "history";
    if (!S.catalog) return;
    const list = $("#list");
    const a = document.activeElement, aid = a && a.id && a !== $("#q") ? a.id : null;
    const sel = aid && a.selectionStart != null ? [a.selectionStart, a.selectionEnd] : null;
    if (S.tab === "notion") {
      const vis = visibleProjects();
      renderAnswer(vis.length);
      if (!vis.length) list.innerHTML = `<div class="empty">No projects match these filters.</div>`;
      else if (S.sort === "site-first") {
        const html = []; let cur = null;
        const counts = {}; vis.forEach((p) => { const b = bucket(eff(p)); counts[b] = (counts[b] || 0) + 1; });
        vis.forEach((p) => { const b = bucket(eff(p)); if (b !== cur) { html.push(sectionHTML(b, counts[b])); cur = b; } html.push(rowHTML(p)); });
        list.innerHTML = html.join("");
      } else list.innerHTML = vis.map(rowHTML).join("");
    } else if (S.tab === "site") {
      const vis = visibleCases();
      renderAnswer(vis.length);
      list.innerHTML = vis.length ? vis.map(caseHTML).join("") : `<div class="empty">No website case matches.</div>`;
    } else {
      renderAnswer(0);
      list.innerHTML = historyHTML();
    }
    if (aid) { const n = document.getElementById(aid); if (n) { n.focus({ preventScroll: true }); if (sel && n.setSelectionRange) try { n.setSelectionRange(sel[0], sel[1]); } catch { /* not a text field */ } } }
  }

  // ---------- events ----------
  let qt;
  $("#q").addEventListener("input", (e) => { clearTimeout(qt); qt = setTimeout(() => { S.q = norm(e.target.value.trim()); render(); }, 120); });
  $("#statusSeg").addEventListener("click", (e) => { const b = e.target.closest("button[data-status]"); if (!b) return; S.status = b.dataset.status; savePrefs(); fillControls(); render(); });
  $("#bar").addEventListener("click", (e) => { const b = e.target.closest("button[data-status]"); if (!b) return; S.tab = "notion"; S.status = b.dataset.status; savePrefs(); fillControls(); render(); });
  [["#sort", "sort"], ["#cat", "cat"], ["#country", "country"], ["#wf", "wf"], ["#siteSort", "siteSort"]].forEach(([s, k]) => $(s).addEventListener("change", (e) => { S[k] = e.target.value; savePrefs(); render(); }));
  [["#starred", "starred"], ["#pro", "pro"], ["#free", "free"], ["#siteGaps", "siteGaps"]].forEach(([s, k]) => $(s).addEventListener("change", (e) => { S[k] = e.target.checked; savePrefs(); render(); }));
  document.querySelector(".tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]"); if (!b) return;
    S.tab = b.dataset.tab; savePrefs();
    if (S.tab === "history") { S.history = null; loadHistory(); }
    render();
  });
  $("#answer").addEventListener("click", (e) => {
    if (!e.target.closest("[data-action='showall']")) return;
    Object.assign(S, { status: "public", cat: "", country: "", wf: "", starred: false, pro: false, free: false });
    if (S.projects.filter(matchesQ).some((p) => bucket(eff(p)) === "nda")) S.status = "nda";
    savePrefs(); fillControls(); render();
  });
  $("#list").addEventListener("click", (e) => {
    const w = e.target.closest("[data-write]");
    if (w) { openEditor(S.byId[w.dataset.write]); return; }
    const t = e.target.closest("[data-toggle]");
    if (t) { const id = t.dataset.toggle; S.open.has(id) ? S.open.delete(id) : S.open.add(id); render(); return; }
    const s = e.target.closest("[data-star]");
    if (s) { const key = s.dataset.star; edit(key, { starred: !rec(key).starred }); render(); toast(rec(key).starred ? "Starred" : "Star removed"); }
  });
  $("#list").addEventListener("change", (e) => {
    const s = e.target.closest("select[data-wf]"); if (!s) return;
    edit(s.dataset.wf, { status: s.value });
    render();
    toast(s.value === "published" ? "Marked as published — add the link to the new case in its details" : `Progress set to “${WF[s.value]}”`);
  });
  $("#list").addEventListener("input", (e) => { const t = e.target.closest("[data-note]"); if (t) queueNote(t.dataset.note, t.dataset.field, t.value); });
  $("#list").addEventListener("focusout", (e) => { if (e.target.closest("[data-note]")) flushNotes(); });

  $("#copyBtn").addEventListener("click", async () => {
    const rows = S.tab === "site"
      ? visibleCases().map((c) => [c.title, c.url || rec(cKey(c)).url || "URL missing"].join(" — "))
      : visibleProjects().map((p) => [p.name, p.country, fmtDate(p.added), STATUS_LABEL[eff(p)], p.notion].filter(Boolean).join(" — "));
    try { await navigator.clipboard.writeText(rows.join("\n")); toast(`Copied ${rows.length} line${rows.length === 1 ? "" : "s"}`); }
    catch { toast("Copying isn’t allowed here. Select the list and copy it manually."); }
  });

  // Backup: everything you've changed, as a JSON file you can keep or restore.
  $("#exportBtn").addEventListener("click", () => {
    flushNotes();
    const data = { app: "polygood-case-tracker", version: 1, exportedAt: new Date().toISOString(), records: S.records };
    download(JSON.stringify(data, null, 1), `polygood-case-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    toast(`Backup downloaded (${Object.keys(S.records).length} saved items)`);
  });

  // Every case study draft in one .docx, one case per page, ready ones first.
  $("#draftsBtn").addEventListener("click", () => {
    flushNotes();
    const order = { ready: 0, drafting: 1, todo: 2, published: 3, skip: 4 };
    const rank = (p) => (editable(p) ? order[wfOf(p)] : 5);
    const list = S.projects.filter((p) => hasDraft(rec(pKey(p)))).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    if (!list.length) { toast("No case study drafts yet. Open a project and choose Write case study."); return; }
    const day = new Date(), n = `${list.length} draft${list.length === 1 ? "" : "s"}`;
    const blocks = [
      { type: "title", text: "Polygood case study drafts" },
      { type: "meta", text: `Exported from the Polygood Case Tracker on ${day.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · ${n}` },
      ...list.map((p) => ({ type: "p", text: `${draftTitle(p, rec(pKey(p)).draft)} · ${progressLabel(p)}` })),
    ];
    list.forEach((p) => blocks.push(...caseBlocks(p, rec(pKey(p)).draft, { pageBreak: true })));
    if (downloadDocx(blocks, "Polygood case study drafts", `polygood-case-study-drafts-${day.toISOString().slice(0, 10)}.docx`)) toast(`Downloaded ${n} as one Word document`);
  });
  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const records = data && data.records;
      if (!records || typeof records !== "object") throw new Error("This file isn’t a tracker backup.");
      const valid = Object.entries(records).filter(([k, v]) => /^[ps]:[A-Za-z0-9_\-.]{1,120}$/.test(k) && v && typeof v === "object");
      if (!valid.length) throw new Error("The backup has no saved items.");
      const now = new Date().toISOString();
      valid.forEach(([k, v]) => { const next = { ...v, clientUpdatedAt: now }; delete next.updatedAt; S.records[k] = next; S.queue[k] = next; });
      persistLocal(); render();
      await flush({ source: "import" });
      toast(`Restored ${valid.length} saved item${valid.length === 1 ? "" : "s"} from the backup`);
    } catch (err) { toast(err.message || "Couldn’t read that file."); }
  });

  // ---------- loading ----------
  function setCatalog(cat) {
    S.catalog = cat;
    S.projects = cat.projects.map((p) => ({ ...p, _hay: norm([p.name, p.country, p.cat, p.credits, p.partner, (p.patterns || []).join(" "), (p.uses || []).join(" "), (p.types || []).join(" "), p.siteCase, p.note].join(" ")) }));
    S.byId = Object.fromEntries(S.projects.map((p) => [p.id, p]));
    S.cases = cat.siteCases.map((c) => ({ ...c, _hay: norm([c.title, c.note, c.notion.map((id) => (S.byId[id] ? S.byId[id].name : "")).join(" ")].join(" ")) }));
    S.caseByKey = Object.fromEntries(S.cases.map((c) => [cKey(c), c]));
  }
  async function loadServer() {
    try {
      const health = await api("/api/health").catch(() => null);
      if (health) { S.storage = health.storage; S.passwordRequired = health.passwordRequired; }
      const out = await api("/api/progress");
      const merged = { ...(out.records || {}) };
      for (const [k, v] of Object.entries(S.queue)) merged[k] = v; // unsynced local edits win
      S.records = merged;
      persistLocal();
      setSync(Object.keys(S.queue).length ? "saving" : "saved");
      renderBanner();
      render();
      flush();
    } catch (err) {
      handleApiError(err);
      renderBanner();
      if (S.sync === "offline" || S.sync === "error") scheduleFlush(retryDelay);
      render();
    }
  }
  async function start() {
    S.records = lsGet(LS.records, {});
    S.queue = lsGet(LS.queue, {});
    S.lastSaved = lsGet(LS.lastSaved, null);
    drawTerrazzo();
    renderSync();
    try {
      const res = await fetch("/data/catalog.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCatalog(await res.json());
    } catch (err) {
      $("#list").innerHTML = `<div class="empty">The project list couldn’t load (${esc(err.message)}). Reload the page; your saved progress is not affected.</div>`;
      return;
    }
    fillControls();
    render();
    if (S.tab === "history") loadHistory();
    loadServer();
  }
  start();
})();
