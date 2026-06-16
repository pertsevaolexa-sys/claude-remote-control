/* ============================================================
   Deutsch A2 Bootcamp — App-Logik
   Vanilla JS, kein Build nötig. Läuft direkt im Browser.
   ============================================================ */

'use strict';

/* ---------- kleine Helfer ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
function el(tag, props = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'data') for (const [dk, dv] of Object.entries(v)) n.dataset[dk] = dv;
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  (Array.isArray(kids) ? kids : [kids]).forEach(c => {
    if (c == null) return;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return n;
}
const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const norm = s => s.trim().toLowerCase().replace(/\s+/g, ' ');
const todayStr = () => new Date().toISOString().slice(0, 10);

/* ---------- State (localStorage) ---------- */
const SKEY = 'deutschA2_state_v1';
const defaultState = {
  xp: 0,
  streak: 0,
  lastActive: null,
  solved: {},      // ctxKey -> [exIndex] (richtig gelöst, für XP)
  resolved: {},    // ctxKey -> [exIndex] (gelöst ODER Lösung gezeigt)
  doneLessons: [], // lessonIds
  crashDone: [],   // crash step indices
  vocabKnown: {},  // theme -> count
  theme: 'light',
  calm: false,
};
// strukturiertes Klonen mit Fallback (alte Browser / JSON-sichere Daten)
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

// Sicherer Speicher: fällt auf In-Memory zurück, wenn localStorage blockiert ist
// (z.B. file://, privater Modus). So bricht die App NIE wegen Storage.
const mem = {};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return k in mem ? mem[k] : null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { mem[k] = v; } },
};

let state = load();

function load() {
  try {
    const s = JSON.parse(store.get(SKEY));
    return s ? { ...clone(defaultState), ...s } : clone(defaultState);
  } catch { return clone(defaultState); }
}
function save() { store.set(SKEY, JSON.stringify(state)); }

/* streak: bei erster Aktivität an einem neuen Tag */
function touchStreak() {
  const t = todayStr();
  if (state.lastActive === t) return;
  if (state.lastActive) {
    const diff = Math.round((new Date(t) - new Date(state.lastActive)) / 86400000);
    state.streak = diff === 1 ? state.streak + 1 : 1;
  } else state.streak = 1;
  state.lastActive = t;
  save(); renderStats();
}

/* ---------- XP / Level ---------- */
const XP_PER_LEVEL = 100;
function level() { return Math.floor(state.xp / XP_PER_LEVEL) + 1; }
function addXP(n, silent) {
  const before = level();
  state.xp += n; save(); renderStats();
  if (!silent) toast(`+${n} XP ⚡`);
  if (level() > before) { toast(`🏅 Level ${level()}! Weiter so!`); confettiBurst(); }
}
function renderStats() {
  $('#xpVal').textContent = state.xp;
  $('#lvlVal').textContent = level();
  $('#streakVal').textContent = state.streak;
  $('#levelFill').style.width = (state.xp % XP_PER_LEVEL) + '%';
}

/* ---------- Toast ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden'); t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.add('hidden'), 300); }, 1800);
}

/* ---------- Text-to-Speech (Deutsch) ---------- */
let deVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  deVoice = voices.find(v => /de(-|_)/i.test(v.lang)) || voices.find(v => /german|deutsch/i.test(v.name)) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(text) {
  if (!('speechSynthesis' in window)) { toast('🔇 Sprachausgabe nicht verfügbar'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE'; u.rate = 0.92;
  if (deVoice) u.voice = deVoice;
  speechSynthesis.speak(u);
}
function speakBtn(text) {
  return el('button', { class: 'speak', title: 'Vorlesen', 'aria-label': 'Vorlesen', onclick: (e) => { e.stopPropagation(); speak(text); } }, '🔊');
}

/* ---------- Confetti ---------- */
const cvs = $('#confetti'); const ctx2d = cvs.getContext('2d');
let parts = [], confAnim = null;
function sizeCanvas() { cvs.width = innerWidth; cvs.height = innerHeight; }
addEventListener('resize', sizeCanvas); sizeCanvas();
function confettiBurst(n = 90) {
  if (state.calm) return;
  const colors = ['#6c5ce7', '#00b894', '#00cec9', '#fdcb6e', '#ff6b6b', '#8e7bff'];
  for (let i = 0; i < n; i++) {
    parts.push({
      x: innerWidth / 2, y: innerHeight / 3,
      vx: (Math.random() - 0.5) * 12, vy: Math.random() * -12 - 4,
      g: 0.3 + Math.random() * 0.2, s: 5 + Math.random() * 7,
      c: colors[(Math.random() * colors.length) | 0], rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, life: 90,
    });
  }
  if (!confAnim) confAnim = requestAnimationFrame(stepConfetti);
}
function stepConfetti() {
  ctx2d.clearRect(0, 0, cvs.width, cvs.height);
  parts.forEach(p => {
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
    ctx2d.save(); ctx2d.translate(p.x, p.y); ctx2d.rotate(p.rot);
    ctx2d.fillStyle = p.c; ctx2d.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx2d.restore();
  });
  parts = parts.filter(p => p.life > 0 && p.y < cvs.height + 30);
  if (parts.length) confAnim = requestAnimationFrame(stepConfetti);
  else { confAnim = null; ctx2d.clearRect(0, 0, cvs.width, cvs.height); }
}

/* ============================================================
   ÜBUNGS-ENGINE
   ============================================================ */
function ctxKey(ctx) { return ctx; }
function isSolved(ctx, i) { return (state.solved[ctx] || []).includes(i); }
function isResolved(ctx, i) { return (state.resolved[ctx] || []).includes(i); }
function markSolved(ctx, i, xp) {
  if (!isSolved(ctx, i)) {
    (state.solved[ctx] ||= []).push(i);
    addXP(xp);
  }
  markResolved(ctx, i);
}
function markResolved(ctx, i) {
  if (!isResolved(ctx, i)) { (state.resolved[ctx] ||= []).push(i); save(); }
  maybeCompleteLesson(ctx);
}
function maybeCompleteLesson(ctx) {
  const L = COURSE.lessons[ctx];
  if (!L) return;
  const total = L.exercises.length;
  if ((state.resolved[ctx] || []).length >= total && !state.doneLessons.includes(ctx)) {
    state.doneLessons.push(ctx); addXP(50, true); save();
    confettiBurst(120);
    const banner = $('#completeBanner');
    if (banner) banner.classList.remove('hidden');
    toast('🎉 Lektion geschafft! +50 XP');
  }
}

/* Baut EIN Übungselement */
function buildExercise(ex, idx, ctx, xpVal) {
  const wrap = el('div', { class: 'exercise' });
  wrap.appendChild(el('div', { class: 'ex-num', text: `ÜBUNG ${idx + 1}` }));

  const fb = el('div', { class: 'feedback' });
  const showFb = (ok, sol) => {
    fb.className = 'feedback show ' + (ok ? 'ok' : 'no');
    fb.innerHTML = ok ? '✅ Richtig! ' : '❌ Nicht ganz. ';
    if (ex.ex) fb.innerHTML += `<span class="sol">${ex.ex}</span>`;
    if (!ok && sol) fb.innerHTML += `<br><span class="sol">Lösung: ${sol}</span>`;
  };

  /* ---- Multiple Choice ---- */
  if (ex.t === 'mc') {
    wrap.appendChild(el('div', { class: 'ex-q', html: ex.q }));
    const opts = el('div', { class: 'options' });
    const buttons = ex.options.map((o, i) => el('button', {
      class: 'option', type: 'button',
      onclick: () => {
        buttons.forEach(b => b.disabled = true);
        buttons[ex.answer].classList.add('correct');
        if (i === ex.answer) { markSolved(ctx, idx, xpVal); }
        else { buttons[i].classList.add('wrong'); markResolved(ctx, idx); }
        showFb(i === ex.answer);
      }
    }, o));
    buttons.forEach(b => opts.appendChild(b));
    wrap.appendChild(opts);
  }

  /* ---- Fill in the blank ---- */
  else if (ex.t === 'fill') {
    const parts = ex.q.split('___');
    const qEl = el('div', { class: 'ex-q' });
    const inputs = [];
    parts.forEach((p, i) => {
      qEl.appendChild(document.createTextNode(p));
      if (i < parts.length - 1) {
        const inp = el('input', { class: 'fill-input', type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: '…' });
        inputs.push(inp); qEl.appendChild(inp);
      }
    });
    wrap.appendChild(qEl);
    if (ex.hint) wrap.appendChild(el('div', { class: 'muted', html: '💡 ' + ex.hint, style: 'font-size:13px;margin-bottom:6px' }));
    const check = el('button', { class: 'btn primary', type: 'button' }, 'Prüfen');
    const reveal = el('button', { class: 'btn ghost', type: 'button' }, 'Lösung zeigen');
    const sol = ex.answers.map(a => a[0]).join(' / ');
    check.onclick = () => {
      let allOk = true;
      inputs.forEach((inp, i) => {
        const accepted = ex.answers[i].map(norm);
        const ok = accepted.includes(norm(inp.value));
        inp.classList.toggle('correct', ok); inp.classList.toggle('wrong', !ok);
        if (!ok) allOk = false;
      });
      if (allOk) { markSolved(ctx, idx, xpVal); inputs.forEach(i => i.disabled = true); }
      showFb(allOk, allOk ? null : sol);
    };
    reveal.onclick = () => {
      inputs.forEach((inp, i) => { inp.value = ex.answers[i][0]; inp.classList.add('correct'); inp.disabled = true; });
      markResolved(ctx, idx); showFb(false, sol);
      fb.className = 'feedback show ok'; fb.innerHTML = '👀 Lösung: <span class="sol">' + sol + '</span>' + (ex.ex ? '<br><span class="sol">' + ex.ex + '</span>' : '');
    };
    wrap.appendChild(el('div', { class: 'ex-actions' }, [check, reveal]));
  }

  /* ---- Word order (chips) ---- */
  else if (ex.t === 'order') {
    wrap.appendChild(el('div', { class: 'ex-q', html: '🧩 ' + ex.q }));
    const build = el('div', { class: 'chips-build', 'aria-label': 'Dein Satz' });
    const pool = el('div', { class: 'chips-pool' });
    const placeholder = el('span', { class: 'muted', text: 'Klick die Wörter in der richtigen Reihenfolge…' });
    build.appendChild(placeholder);
    const refresh = () => { placeholder.style.display = build.querySelectorAll('.chip').length ? 'none' : ''; };
    shuffle(ex.words.map((w, i) => ({ w, i }))).forEach(({ w }) => {
      const chip = el('button', { class: 'chip', type: 'button' }, w);
      chip.onclick = () => {
        if (chip.parentElement === pool) build.appendChild(chip);
        else pool.appendChild(chip);
        refresh();
      };
      pool.appendChild(chip);
    });
    const check = el('button', { class: 'btn primary', type: 'button' }, 'Prüfen');
    const reset = el('button', { class: 'btn ghost', type: 'button' }, 'Reset');
    check.onclick = () => {
      const built = [...build.querySelectorAll('.chip')].map(c => c.textContent).join(' ');
      const ok = norm(built) === norm(ex.answer);
      if (ok) { markSolved(ctx, idx, xpVal); build.querySelectorAll('.chip').forEach(c => c.disabled = true); }
      else markResolved(ctx, idx);
      showFb(ok, ok ? null : ex.answer);
    };
    reset.onclick = () => { [...build.querySelectorAll('.chip')].forEach(c => pool.appendChild(c)); refresh(); fb.className = 'feedback'; };
    wrap.appendChild(build); wrap.appendChild(pool);
    wrap.appendChild(el('div', { class: 'ex-actions' }, [check, reset]));
  }

  /* ---- Matching ---- */
  else if (ex.t === 'match') {
    wrap.appendChild(el('div', { class: 'ex-q', html: '🔗 ' + ex.q }));
    const grid = el('div', { class: 'match-grid' });
    const leftCol = el('div', { class: 'match-col' });
    const rightCol = el('div', { class: 'match-col' });
    let sel = null, matched = 0;
    const total = ex.pairs.length;
    ex.pairs.forEach((p, i) => {
      leftCol.appendChild(el('button', { class: 'match-item', type: 'button', data: { row: i, side: 'L' } }, p[0]));
    });
    shuffle(ex.pairs.map((p, i) => ({ p, i }))).forEach(({ p, i }) => {
      rightCol.appendChild(el('button', { class: 'match-item', type: 'button', data: { row: i, side: 'R' } }, p[1]));
    });
    const onClick = (e) => {
      const b = e.currentTarget;
      if (b.classList.contains('matched')) return;
      if (!sel) { sel = b; b.classList.add('selected'); return; }
      if (sel === b) { sel.classList.remove('selected'); sel = null; return; }
      if (sel.dataset.side === b.dataset.side) { sel.classList.remove('selected'); sel = b; b.classList.add('selected'); return; }
      // verschiedene Seiten -> prüfen
      if (sel.dataset.row === b.dataset.row) {
        sel.classList.remove('selected'); sel.classList.add('matched'); b.classList.add('matched');
        matched++; sel = null;
        if (matched === total) { markSolved(ctx, idx, xpVal); showFb(true); }
      } else {
        const a = sel; b.classList.add('shake'); a.classList.add('shake');
        setTimeout(() => { a.classList.remove('shake', 'selected'); b.classList.remove('shake'); }, 350);
        sel = null;
      }
    };
    [...leftCol.children, ...rightCol.children].forEach(b => b.addEventListener('click', onClick));
    grid.appendChild(leftCol); grid.appendChild(rightCol);
    wrap.appendChild(grid);
  }

  wrap.appendChild(fb);
  // bereits gelöst -> Hinweis
  if (isSolved(ctx, idx)) { fb.className = 'feedback show ok'; fb.innerHTML = '✅ Schon gelöst. Mach es ruhig nochmal zum Üben!'; }
  return wrap;
}

/* ============================================================
   VIEWS / ROUTER
   ============================================================ */
const app = $('#app');
function setView(view, arg) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  app.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  ({ home: viewHome, crash: viewCrash, modules: viewModules, lesson: viewLesson, grammar: viewGrammar, vocab: viewVocab, exam: viewExam, plan: viewPlan }[view] || viewHome)(arg);
}

/* ----- HOME ----- */
function viewHome() {
  const total = LESSON_ORDER.length;
  const done = state.doneLessons.filter(l => LESSON_ORDER.includes(l)).length;
  const pct = Math.round(done / total * 100);
  const next = LESSON_ORDER.find(l => !state.doneLessons.includes(l)) || LESSON_ORDER[0];
  const L = COURSE.lessons[next];

  app.appendChild(el('div', { class: 'card hero stack' }, [
    el('h1', { html: 'Servus! 👋 Dein Deutsch-A2-Bootcamp' }),
    el('p', { html: 'Prüfung morgen? Wenig Zeit? Kein Problem. Klein anfangen, dranbleiben, durchkommen. Du schaffst das! 💪' }),
    el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn big', style: 'background:#fff;color:#6c5ce7', onclick: () => setView('crash') }, '⚡ Schnellkurs (2 Std.)'),
      el('button', { class: 'btn big ghost', style: 'color:#fff;border-color:#fff', onclick: () => setView('lesson', next) }, `▶️ Weiter: ${L.title}`),
    ]),
  ]));

  app.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'ring-wrap' }, [
      el('div', { class: 'ring', style: `--p:${pct}`, }, el('span', { text: pct + '%' })),
      el('div', {}, [
        el('h3', { text: `${done} von ${total} Lektionen geschafft` }),
        el('p', { class: 'muted', html: `⚡ ${state.xp} XP · 🏅 Level ${level()} · 🔥 ${state.streak} Tage Streak` }),
        el('div', { class: 'btn-row' }, [
          el('button', { class: 'btn', onclick: () => setView('modules') }, '📚 Alle Module'),
          el('button', { class: 'btn', onclick: () => setView('exam') }, '🎯 Prüfung testen'),
        ]),
      ]),
    ]),
  ]));

  // Schnellzugriff Lektionen
  const quick = el('div', { class: 'grid cols-3' });
  LESSON_ORDER.forEach(id => quick.appendChild(lessonCard(id)));
  app.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'section-tag', text: '⭐ Alle Lektionen' }), quick
  ]));

  app.appendChild(el('div', { class: 'card tight' }, [
    el('p', { class: 'muted', html: '💡 <b>ADHS-Tipp:</b> Nutze den 🍅-Timer oben. Ein Sprint = eine Lektion. Nach jedem Sprint kurz aufstehen. Fortschritt wird automatisch gespeichert.' })
  ]));
}

function lessonCard(id) {
  const L = COURSE.lessons[id];
  const total = L.exercises.length;
  const res = (state.resolved[id] || []).length;
  const isDone = state.doneLessons.includes(id);
  const card = el('div', { class: 'card lesson-card' + (isDone ? ' done' : ''), onclick: () => setView('lesson', id) }, [
    el('div', { class: 'done-flag', text: '✅' }),
    el('div', { class: 'emoji', text: L.emoji }),
    el('h3', { html: `Lektion ${L.number}: ${L.title}` }),
    el('div', { class: 'theme', text: L.theme }),
    el('span', { class: 'gram', text: '📝 ' + L.grammarTitle }),
    el('div', { class: 'mini-progress' }, el('span', { style: `width:${total ? res / total * 100 : 0}%` })),
  ]);
  return card;
}

/* ----- MODULES ----- */
function viewModules() {
  app.appendChild(el('div', { class: 'card hero' }, [
    el('h1', { text: '📚 Module & Lektionen' }),
    el('p', { text: 'Dein kompletter Prüfungsstoff in 3 Modulen + Bonus. Tippe eine Lektion an.' }),
  ]));
  COURSE.modules.forEach(m => {
    const block = el('div', { class: 'module-block' });
    block.appendChild(el('div', { class: 'module-title' }, [
      el('span', { class: 'badge', text: m.title }),
      el('h2', { html: `${m.emoji} ${m.subtitle}` }),
    ]));
    const grid = el('div', { class: 'grid cols-3' });
    m.lessons.forEach(id => grid.appendChild(lessonCard(id)));
    block.appendChild(grid);
    app.appendChild(block);
  });
}

/* ----- LESSON DETAIL ----- */
function viewLesson(id) {
  touchStreak();
  const L = COURSE.lessons[id];
  if (!L) return setView('modules');
  const mod = COURSE.modules.find(m => m.id === L.module);

  app.appendChild(el('div', { class: 'breadcrumb' }, [
    el('span', { class: 'pill', text: '‹ zurück', role: 'button', onclick: () => setView('modules'), style: 'cursor:pointer' }),
    document.createTextNode(`  ${mod.title} · Lektion ${L.number}`),
  ]));

  app.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'lesson-head' }, [
      el('span', { class: 'big-emoji', text: L.emoji }),
      el('div', {}, [
        el('h1', { text: `Lektion ${L.number}: ${L.title}` }),
        el('p', { class: 'muted', html: `🎯 Thema: <b>${L.theme}</b><br>📝 Grammatik: <b>${L.grammarTitle}</b>` }),
      ]),
    ]),
  ]));

  // GRAMMATIK
  const gram = el('div', { class: 'card' });
  gram.appendChild(el('div', { class: 'section-tag', text: '📝 Grammatik verstehen' }));
  L.grammar.forEach(b => gram.appendChild(renderGrammarBlock(b)));
  app.appendChild(gram);

  // VOKABELN (kompakt, mit Vorlesen)
  const vc = el('div', { class: 'card' });
  vc.appendChild(el('div', { class: 'section-tag', text: '🗂️ Wichtige Vokabeln' }));
  const vlist = el('div', { class: 'vocab-list' });
  L.vocab.forEach(v => {
    vlist.appendChild(el('div', { class: 'vocab-row' }, [
      speakBtn(v.de),
      el('div', { class: 'txt' }, [
        el('div', { class: 'de', text: v.de }),
        el('div', { class: 'en', text: v.en }),
      ]),
    ]));
  });
  vc.appendChild(vlist);
  vc.appendChild(el('div', { class: 'btn-row' }, [
    el('button', { class: 'btn', onclick: () => startFlashcards(L.vocab, L.theme) }, '🃏 Als Karteikarten üben'),
  ]));
  app.appendChild(vc);

  // ÜBUNGEN
  const exC = el('div', { class: 'card' });
  exC.appendChild(el('div', { class: 'section-tag', text: '✍️ Übungen — hier passiert das Lernen!' }));
  L.exercises.forEach((ex, i) => exC.appendChild(buildExercise(ex, i, id, 10)));
  app.appendChild(exC);

  // COMPLETE BANNER
  const banner = el('div', { id: 'completeBanner', class: 'complete-banner' + (state.doneLessons.includes(id) ? '' : ' hidden') }, [
    el('h2', { text: '🎉 Lektion geschafft!' }),
    el('p', { text: 'Stark! Weiter zur nächsten Lektion?' }),
    el('div', { class: 'btn-row', style: 'justify-content:center' }, [
      el('button', { class: 'btn', style: 'background:#fff;color:#00b894', onclick: () => { const n = nextLesson(id); n ? setView('lesson', n) : setView('exam'); } }, '▶️ Weiter'),
      el('button', { class: 'btn ghost', style: 'color:#fff;border-color:#fff', onclick: () => setView('modules') }, '📚 Module'),
    ]),
  ]);
  app.appendChild(banner);
}
function nextLesson(id) { const i = LESSON_ORDER.indexOf(id); return LESSON_ORDER[i + 1] || null; }

function renderGrammarBlock(b) {
  if (b.t === 'intro') return el('p', { class: 'gram-intro', html: b.html });
  if (b.t === 'rule') return el('div', { class: 'rulebox' }, [el('h4', { text: b.title }), el('div', { html: b.html })]);
  if (b.t === 'tip') return el('div', { class: 'tipbox', html: b.html });
  if (b.t === 'examples') {
    const box = el('div', { class: 'examples' });
    b.items.forEach(it => box.appendChild(el('div', { class: 'example' }, [
      speakBtn(it.de),
      el('div', { class: 'txt' }, [el('div', { class: 'de', text: it.de }), el('div', { class: 'en', text: it.en })]),
    ])));
    return box;
  }
  if (b.t === 'table') {
    const wrap = el('div', { class: 'table-wrap' });
    const t = el('table', { class: 'gram-table' });
    const thead = el('thead'); const htr = el('tr');
    b.head.forEach(h => htr.appendChild(el('th', { html: h }))); thead.appendChild(htr); t.appendChild(thead);
    const tb = el('tbody');
    b.rows.forEach(r => { const tr = el('tr'); r.forEach(c => tr.appendChild(el('td', { html: c }))); tb.appendChild(tr); });
    t.appendChild(tb); wrap.appendChild(t); return wrap;
  }
  return el('div');
}

/* ----- GRAMMAR REFERENCE ----- */
function viewGrammar() {
  app.appendChild(el('div', { class: 'card hero' }, [
    el('h1', { text: '📝 Grammatik-Spickzettel' }),
    el('p', { text: 'Alle Regeln auf einen Blick — perfekt zum schnellen Wiederholen vor der Prüfung.' }),
  ]));
  LESSON_ORDER.forEach(id => {
    const L = COURSE.lessons[id];
    const c = el('div', { class: 'card' });
    c.appendChild(el('div', { class: 'section-tag', html: `${L.emoji} L${L.number}: ${L.grammarTitle}` }));
    L.grammar.forEach(b => { if (b.t !== 'intro' || true) c.appendChild(renderGrammarBlock(b)); });
    c.appendChild(el('div', { class: 'btn-row' }, [el('button', { class: 'btn', onclick: () => setView('lesson', id) }, '✍️ Übungen zu dieser Lektion')]));
    app.appendChild(c);
  });
}

/* ----- VOCAB ----- */
function viewVocab() {
  app.appendChild(el('div', { class: 'card hero' }, [
    el('h1', { text: '🗂️ Vokabeln & Karteikarten' }),
    el('p', { text: 'Wähle ein Thema. Karte antippen zum Umdrehen, 🔊 zum Hören.' }),
  ]));
  const grid = el('div', { class: 'vocab-themes' });
  LESSON_ORDER.forEach(id => {
    const L = COURSE.lessons[id];
    grid.appendChild(el('div', { class: 'card vocab-theme-card', onclick: () => startFlashcards(L.vocab, L.theme) }, [
      el('div', { class: 'emoji', style: 'font-size:28px', text: L.emoji }),
      el('h3', { text: L.theme }),
      el('p', { class: 'muted', text: `${L.vocab.length} Vokabeln · Lektion ${L.number}` }),
      el('span', { class: 'pill', text: '🃏 Üben' }),
    ]));
  });
  // Alle gemischt
  grid.appendChild(el('div', { class: 'card vocab-theme-card', style: 'border-left-color:#fdcb6e', onclick: () => { const all = LESSON_ORDER.flatMap(id => COURSE.lessons[id].vocab); startFlashcards(shuffle(all), 'Alle Vokabeln (Mix)'); } }, [
    el('div', { class: 'emoji', style: 'font-size:28px', text: '🎲' }),
    el('h3', { text: 'Alle Vokabeln gemischt' }),
    el('p', { class: 'muted', text: 'Großes Training für die Prüfung' }),
    el('span', { class: 'pill', text: '🔀 Mix starten' }),
  ]));
  app.appendChild(grid);
}

function startFlashcards(cards, theme) {
  app.innerHTML = '';
  let i = 0, known = 0;
  const total = cards.length;
  const wrap = el('div', { class: 'card flashcard-wrap' });
  wrap.appendChild(el('button', { class: 'pill', style: 'cursor:pointer;align-self:flex-start', onclick: () => setView('vocab') }, '‹ zurück zu Themen'));
  wrap.appendChild(el('h2', { text: theme, style: 'text-align:center' }));
  const counter = el('div', { class: 'flashcard-counter' });
  wrap.appendChild(counter);

  const card = el('div', { class: 'flashcard' });
  const inner = el('div', { class: 'flashcard-inner' });
  const front = el('div', { class: 'flashcard-face flashcard-front' });
  const back = el('div', { class: 'flashcard-face flashcard-back' });
  inner.appendChild(front); inner.appendChild(back); card.appendChild(inner);
  card.onclick = (e) => { if (e.target.closest('.speak')) return; card.classList.toggle('flipped'); };
  wrap.appendChild(card);

  const controls = el('div', { class: 'flash-controls' });
  const btnHear = el('button', { class: 'btn', onclick: (e) => { e.stopPropagation(); speak(cards[i].de); } }, '🔊 Hören');
  const btnAgain = el('button', { class: 'btn ghost', onclick: () => next(false) }, '🔁 Nochmal');
  const btnKnown = el('button', { class: 'btn accent', onclick: () => next(true) }, '✅ Gewusst');
  controls.append(btnHear, btnAgain, btnKnown);
  wrap.appendChild(controls);
  app.appendChild(wrap);

  function render() {
    counter.textContent = `Karte ${i + 1} / ${total}  ·  ✅ ${known}`;
    card.classList.remove('flipped');
    front.innerHTML = '';
    front.append(el('div', { class: 'flashcard-word', text: cards[i].de }), speakBtn(cards[i].de), el('div', { class: 'flashcard-hint', text: '(antippen zum Umdrehen)' }));
    back.innerHTML = '';
    back.append(el('div', { class: 'flashcard-word', text: cards[i].en }), el('div', { class: 'flashcard-ex', text: cards[i].ex || '' }));
  }
  function next(wasKnown) {
    if (wasKnown) known++;
    if (i < total - 1) { i++; render(); }
    else {
      addXP(Math.min(known * 2, 40));
      confettiBurst();
      app.innerHTML = '';
      app.appendChild(el('div', { class: 'card complete-banner' }, [
        el('h2', { text: '🃏 Durch!' }),
        el('p', { html: `Du hast <b>${known}/${total}</b> gewusst. ${known === total ? 'Perfekt! 🌟' : 'Wiederholung macht den Meister!'}` }),
        el('div', { class: 'btn-row', style: 'justify-content:center' }, [
          el('button', { class: 'btn', style: 'background:#fff;color:#00b894', onclick: () => startFlashcards(cards, theme) }, '🔁 Nochmal'),
          el('button', { class: 'btn ghost', style: 'color:#fff;border-color:#fff', onclick: () => setView('vocab') }, '🗂️ Themen'),
        ]),
      ]));
    }
  }
  render();
}

/* ----- CRASH COURSE ----- */
function viewCrash() {
  app.appendChild(el('div', { class: 'card hero' }, [
    el('h1', { text: COURSE.crash.title }),
    el('p', { text: COURSE.crash.intro }),
    el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn big', style: 'background:#fff;color:#6c5ce7', onclick: openTimer }, '🍅 Timer öffnen'),
    ]),
  ]));
  const list = el('div', { class: 'card checklist' });
  COURSE.crash.steps.forEach((s, i) => {
    const done = state.crashDone.includes(i);
    const item = el('div', { class: 'check-item' + (done ? ' done' : '') }, [
      el('div', { class: 'check-box', text: done ? '✓' : '' }),
      el('div', { class: 'check-main' }, [
        el('div', { class: 'ttl', text: s.title }),
        el('div', { class: 'meta', text: s.do }),
        s.lessons.length ? el('div', { class: 'btn-row', style: 'margin-top:8px' },
          s.lessons.map(lid => el('button', { class: 'chip', onclick: (e) => { e.stopPropagation(); setView('lesson', lid); } }, `→ Lektion ${COURSE.lessons[lid].number}`))) : null,
      ]),
      el('span', { class: 'check-time', text: s.time }),
    ]);
    item.addEventListener('click', () => {
      const idx = state.crashDone.indexOf(i);
      if (idx >= 0) state.crashDone.splice(idx, 1);
      else { state.crashDone.push(i); confettiBurst(40); }
      save(); viewCrash();
    });
    list.appendChild(item);
  });
  app.appendChild(list);
  const prog = Math.round(state.crashDone.length / COURSE.crash.steps.length * 100);
  app.appendChild(el('div', { class: 'card tight center' }, [
    el('div', { class: 'levelbar', style: 'position:static;border-radius:999px;height:10px' }, el('div', { class: 'levelbar-fill', style: `width:${prog}%` })),
    el('p', { class: 'muted', style: 'margin-top:8px', html: `Schnellkurs: <b>${prog}%</b> · Danach: <button class="pill" style="cursor:pointer" onclick="document.querySelector('[data-view=exam]').click()">🎯 Prüfungssimulation</button>` }),
  ]));
}

/* ----- EXAM ----- */
function viewExam(arg) {
  if (arg !== 'run') {
    app.appendChild(el('div', { class: 'card hero' }, [
      el('h1', { text: '🎯 Prüfungssimulation' }),
      el('p', { html: `${COURSE.exam.length} gemischte Aufgaben aus allen Lektionen. Genau wie in der Prüfung. Nimm dir Zeit, antworte ehrlich — am Ende siehst du dein Ergebnis.` }),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn big', style: 'background:#fff;color:#6c5ce7', onclick: () => setView('exam', 'run') }, '🚀 Test starten'),
      ]),
    ]));
    app.appendChild(el('div', { class: 'card tight' }, [el('p', { class: 'muted', html: '💡 Tipp: Mach den Test einmal jetzt und einmal kurz vor der Prüfung. Falsche Antworten zeigen dir genau, was du noch üben musst.' })]));
    return;
  }
  // RUN
  state.solved['exam'] = []; state.resolved['exam'] = []; save();
  app.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'section-tag', text: '🎯 Prüfungssimulation läuft' }),
    el('p', { class: 'muted', text: 'Beantworte alle Aufgaben. Klick danach auf „Ergebnis zeigen“.' }),
  ]));
  const exC = el('div', { class: 'card' });
  COURSE.exam.forEach((ex, i) => exC.appendChild(buildExercise(ex, i, 'exam', 15)));
  app.appendChild(exC);
  app.appendChild(el('div', { class: 'card center' }, [
    el('button', { class: 'btn big primary', onclick: showExamResult }, '🏁 Ergebnis zeigen'),
  ]));
}
function showExamResult() {
  const correct = (state.solved['exam'] || []).length;
  const total = COURSE.exam.length;
  const pct = Math.round(correct / total * 100);
  let msg, emoji;
  if (pct >= 85) { msg = 'Hervorragend! Du bist bereit. 🌟'; emoji = '🏆'; confettiBurst(150); }
  else if (pct >= 60) { msg = 'Gut! Schau dir die Fehler nochmal an, dann passt das.'; emoji = '👍'; confettiBurst(80); }
  else { msg = 'Noch ein bisschen üben — geh die schwachen Themen nochmal durch. Du schaffst das!'; emoji = '💪'; }
  window.scrollTo({ top: 0 });
  const banner = el('div', { class: 'card complete-banner' }, [
    el('h2', { html: `${emoji} ${correct} / ${total} richtig (${pct}%)` }),
    el('p', { text: msg }),
    el('div', { class: 'btn-row', style: 'justify-content:center' }, [
      el('button', { class: 'btn', style: 'background:#fff;color:#00b894', onclick: () => setView('exam', 'run') }, '🔁 Nochmal'),
      el('button', { class: 'btn ghost', style: 'color:#fff;border-color:#fff', onclick: () => setView('grammar') }, '📝 Grammatik wiederholen'),
    ]),
  ]);
  app.insertBefore(banner, app.firstChild);
}

/* ----- PLAN ----- */
function viewPlan() {
  app.appendChild(el('div', { class: 'card hero' }, [
    el('h1', { text: '📅 Dein 2-Wochen-Plan' }),
    el('p', { text: 'Entspannter Weg zur Prüfung: kleine Häppchen, jeden Tag ein bisschen. Wochenenden = Wiederholung. Konsistenz schlägt Kraft.' }),
  ]));
  const grid = el('div', { class: 'grid cols-2' });
  COURSE.plan.forEach(d => {
    grid.appendChild(el('div', { class: 'card day-card' + (d.weekend ? ' weekend' : '') }, [
      el('div', { class: 'day-no', text: `TAG ${d.day}${d.weekend ? ' · Wochenende' : ''}` }),
      el('h3', { text: d.title }),
      el('ul', {}, d.tasks.map(t => el('li', { text: t }))),
    ]));
  });
  app.appendChild(grid);
  app.appendChild(el('div', { class: 'card tight center' }, [
    el('p', { class: 'muted', html: '💡 <b>ADHS-Tipp:</b> Trag dir feste 25-Minuten-Slots in den Kalender ein. Lieber täglich 25 Minuten als einmal 3 Stunden.' }),
    el('button', { class: 'btn primary', onclick: () => setView('modules') }, '📚 Los geht\'s mit Modul 1'),
  ]));
}

/* ============================================================
   FOKUS-TIMER (Pomodoro)
   ============================================================ */
const timer = { total: 25 * 60, left: 25 * 60, running: false, id: null, mode: 'Fokus-Sprint', isBreak: false };
function fmt(s) { const m = (s / 60 | 0).toString().padStart(2, '0'); const ss = (s % 60).toString().padStart(2, '0'); return `${m}:${ss}`; }
function renderTimer() {
  $('#timerClock').textContent = fmt(timer.left);
  $('#timerMini').textContent = fmt(timer.left);
  $('#timerMode').textContent = timer.mode;
  $('#timerClock').classList.toggle('break', timer.isBreak);
}
function tick() {
  if (timer.left > 0) { timer.left--; renderTimer(); }
  else {
    clearInterval(timer.id); timer.running = false;
    beep(); confettiBurst();
    toast(timer.isBreak ? '⏰ Pause vorbei — weiter geht\'s!' : '🎉 Sprint geschafft! Mach 5 Min Pause.');
  }
}
function startTimer() { if (timer.running) return; timer.running = true; timer.id = setInterval(tick, 1000); }
function pauseTimer() { timer.running = false; clearInterval(timer.id); }
function resetTimer() { pauseTimer(); timer.left = timer.total; renderTimer(); }
function setTimerMin(min, isBreak) {
  pauseTimer(); timer.total = min * 60; timer.left = timer.total;
  timer.isBreak = !!isBreak; timer.mode = isBreak ? '☕ Pause' : `🍅 ${min}-Min-Sprint`;
  renderTimer();
}
function openTimer() { $('#timerPanel').classList.remove('hidden'); }
function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.connect(g); g.connect(ac.destination); o.type = 'sine'; o.frequency.value = 660;
    g.gain.setValueAtTime(0.001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
    o.start(); o.stop(ac.currentTime + 0.62);
  } catch { /* ignore */ }
}

/* ============================================================
   INIT / EVENTS
   ============================================================ */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  $('#themeBtn').textContent = state.theme === 'dark' ? '☀️' : '🌙';
  document.body.classList.toggle('calm', state.calm);
  $('#calmBtn').style.opacity = state.calm ? '1' : '.7';
}

function init() {
  renderStats(); applyTheme(); renderTimer();
  touchStreak();

  // Tabs
  $$('.tab').forEach(t => t.addEventListener('click', () => setView(t.dataset.view)));
  $('#homeLink').addEventListener('click', () => setView('home'));
  $('#homeLink').addEventListener('keydown', e => { if (e.key === 'Enter') setView('home'); });

  // Theme + calm
  $('#themeBtn').addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); });
  $('#calmBtn').addEventListener('click', () => { state.calm = !state.calm; save(); applyTheme(); toast(state.calm ? '🧘 Ruhe-Modus an' : '✨ Animationen an'); });

  // Timer panel
  $('#timerBtn').addEventListener('click', () => $('#timerPanel').classList.toggle('hidden'));
  $('#timerClose').addEventListener('click', () => $('#timerPanel').classList.add('hidden'));
  $('#timerStart').addEventListener('click', startTimer);
  $('#timerPause').addEventListener('click', pauseTimer);
  $('#timerReset').addEventListener('click', resetTimer);
  $$('.timer-presets .chip').forEach(c => c.addEventListener('click', () => setTimerMin(+c.dataset.min, +c.dataset.min === 5)));

  setView('home');
}

document.addEventListener('DOMContentLoaded', init);
