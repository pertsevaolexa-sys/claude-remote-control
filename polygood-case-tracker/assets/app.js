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

  // ---------- small utils ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "case";
  function lsGet(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3200); }
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
    const batch = {};
    keys.slice(0, 400).forEach((k) => (batch[k] = S.queue[k]));
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
  function flushNotes() { Object.keys(pendingNotes).forEach(commitNote); }
  const typing = () => { const a = document.activeElement; return !!(a && a.closest && a.closest("[data-note]")); };

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
    const segs = [["live", "seg-live", c.live + c.added, "On website"], ["missing", "seg-miss", c.missing, "Not on website"], ["restricted", "seg-warn", c.restricted, "Needs rights"], ["nda", "seg-nda", c.nda, "Internal"]];
    const total = S.projects.length;
    $("#bar").innerHTML = segs.filter((s) => s[2] > 0).map((s) => `<button type="button" class="${s[1]}" data-status="${s[0]}" style="flex:${s[2]} 1 0" title="${s[3]}: ${s[2]}" aria-label="${s[3]}: ${s[2]}"><span>${s[2]}</span>${s[2] / total > 0.14 ? `<em class="lbl">${s[3]}</em>` : ""}</button>`).join("");
    $("#legend").innerHTML = [
      `<span><b>${S.projects.length}</b> Notion entries</span>`,
      `<span><b>${S.cases.length}</b> cases on polygood.com</span>`,
      `<span><b>${c.missing + c.restricted}</b> not on the website yet</span>`,
      `<span><b>${c.added}</b> published by you · <b>${drafting}</b> in progress</span>`,
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
        <div class="rowmain"><h3 class="name"><a href="${esc(p.notion)}" target="_blank" rel="noopener">${esc(p.name)}</a></h3><div class="meta">${esc(meta)}</div></div>
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
      return `<div class="hist"><span class="when">${esc(fmtTime(e.at))}</span><div><strong>${esc(describeKey(e.key))}</strong>${e.source === "import" ? ` <span class="meta">(restored from backup)</span>` : ""}<div class="meta">${bits.join(" · ") || "cleared"}</div></div></div>`;
    }).join("");
  }

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
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `polygood-case-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Backup downloaded (${Object.keys(S.records).length} saved items)`);
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
