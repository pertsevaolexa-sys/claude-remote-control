// ---------------------------------------------------------------------------
// Scene assembly, daylight, review cameras, controls and the review panel.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

import { mm, deg } from './units.js';
import { CONFIG, CONFLICTS, ASSUMPTIONS, PROVENANCE } from './config.js';
import { pointAtMm, yawAtS, centreZMm, footprints, a4HolderPlanDepthMm } from './layout.js';
import { runFitReport } from './fit.js';
import { buildMaterials } from './materials.js';
import { buildRoom } from './room.js';
import { buildDimensionOverlay, LEGEND } from './overlay.js';
import { STOPS, JOURNEY_INTRO } from './journey.js';
import { Guide } from './guide.js';
import { DIMENSION_TABLES, STILL_TO_MEASURE, ANGLE_NOTES } from './dimensions.js';
import {
  buildBrochures, buildA4Holder, buildGrowthBox, buildInstallation,
  buildTiles, buildGeneralBoxes, buildTranslucentBlock, buildBanner,
  growthCardTexture, translucentCardTexture,
} from './displays.js';

const cfg = CONFIG;
const canvas = document.getElementById('scene');

// Anything thrown while building the scene surfaces in the boot panel rather
// than leaving an empty canvas behind.
window.addEventListener('error', (e) => {
  if (window.__pgFail) window.__pgFail('The model did not start', String(e.message || ''));
});

// A lost context is the failure a tablet actually hits. Say so plainly instead
// of letting three.js throw on the next createShader().
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  if (window.__pgFail) {
    window.__pgFail('The browser dropped the 3-D context',
      'This usually means the device ran out of graphics memory. Close other tabs and reload. '
      + 'If it keeps happening, tell us which device and browser.');
  }
});

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance',
  preserveDrawingBuffer: true,   // so offline screenshot capture is reliable
});
// Capped at 1.5: a tablet at device ratio 2 pairs a large drawing buffer with
// the transmission pass and MSAA, and the context is the thing that gives way.
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// The scene is static, so the shadow map is built once instead of every frame.
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd7dde2);

const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.05, 90);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 0.25;
controls.maxDistance = 22;
controls.maxPolarAngle = Math.PI * 0.497;

// Render on demand. Software rendering (and any modest GPU) is far happier
// drawing only when something actually changed.
let settleFrames = 3;
function requestRender(frames = 1) { settleFrames = Math.max(settleFrames, frames); }
controls.addEventListener('change', () => requestRender(2));
window.addEventListener('resize', () => requestRender(2));

// ---------------------------------------------------------------------------
// Daylight from the real window positions
// ---------------------------------------------------------------------------
const Cz = centreZMm();
scene.add(new THREE.HemisphereLight(0xdfe8f2, 0xc0b49f, 0.70));
scene.add(new THREE.AmbientLight(0xfff6ea, 0.22));

const sun = new THREE.DirectionalLight(0xfff3e2, 2.5);
sun.position.set(mm(-3800), mm(6200), mm(Cz - 12000));
sun.target.position.set(mm(200), mm(900), mm(-1100));
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 32;
sun.shadow.camera.left = -8.5;
sun.shadow.camera.right = 8.5;
sun.shadow.camera.top = 8.5;
sun.shadow.camera.bottom = -8.5;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 0.012;
scene.add(sun);
scene.add(sun.target);

// Soft window fill at the real opening positions, so the counter is lit from
// the bay rather than from a studio light.
const bayR = cfg.counter.curveRadiusMm + cfg.counter.depthMm + cfg.bay.wallOffsetBehindCounterMm;
const bayHalf = deg(cfg.bay.halfAngleDeg);
for (const f of [-0.55, 0.55]) {
  const phi = f * bayHalf;
  const area = new THREE.RectAreaLight(0xeaf2ff, 1.9, mm(1300), mm(1900));
  area.position.set(
    mm(bayR * Math.sin(phi)),
    mm((cfg.bay.windowSillHeightMm + cfg.bay.windowHeadHeightMm) / 2),
    mm(Cz - bayR * Math.cos(phi)),
  );
  area.lookAt(mm(-bayR * 0.2 * Math.sin(phi)), mm(900), mm(Cz - bayR * 0.2));
  scene.add(area);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const M = buildMaterials();
scene.add(buildRoom(M));

const displayRoot = new THREE.Group();
displayRoot.name = 'displays';
scene.add(displayRoot);

const topY = cfg.counter.heightMm;
const L = cfg.layout;

/** Place a built group at counter coordinate (s, vFront of its footprint). */
function placeOnCounter(built, sMm, vFrontMm, name) {
  const v = vFrontMm + built.footprint.depthMm / 2;
  const p = pointAtMm(sMm, v);
  built.object.position.set(mm(p.x), mm(topY), mm(p.z));
  built.object.rotation.y = yawAtS(sMm);
  built.object.userData.placement = { name, sMm, vFrontMm, footprint: built.footprint };
  displayRoot.add(built.object);
  return built;
}

const depth = cfg.counter.depthMm;
const holderDepth = a4HolderPlanDepthMm(cfg);

// 1. brochures
const brochures = buildBrochures(M);
placeOnCounter(brochures, L.brochuresSMm, L.brochuresVMm - brochures.footprint.depthMm / 2, 'Brochures');

// 2. Growth A4 at the back, open Growth box directly IN FRONT of it
const growthCardV = depth - L.growthCardBackMarginMm - holderDepth;
const growthCard = buildA4Holder(M, growthCardTexture(), 'growth-a4');
placeOnCounter(growthCard, L.growthSMm, growthCardV, 'Growth A4');
const growthBox = buildGrowthBox(M);
placeOnCounter(growthBox, L.growthSMm,
  growthCardV - L.growthBoxGapBehindMm - growthBox.footprint.depthMm, 'Growth sample box');

// 3. LOOK CLOSER installation
const installation = buildInstallation(M);
placeOnCounter(installation, L.installationSMm, L.installationFrontMarginMm, 'LOOK CLOSER installation');

// 4. six engraved samples + two general boxes
const tiles = buildTiles(M);
placeOnCounter(tiles, L.tilesSMm, L.tilesFrontMarginMm, 'Six engraved samples');
const generalBoxes = buildGeneralBoxes(M);
placeOnCounter(generalBoxes, L.generalBoxesSMm, L.generalBoxesVFrontMm, 'General sample boxes');

// 5. translucent block + A4
const translucentCard = buildA4Holder(M, translucentCardTexture(), 'translucent-a4');
placeOnCounter(translucentCard, L.translucentCardSMm, depth - L.translucentCardBackMarginMm - holderDepth, 'Translucent A4');
const translucent = buildTranslucentBlock(M);
placeOnCounter(translucent, L.translucentBlockSMm, L.translucentBlockVFrontMm, 'Translucent block');

// 6. roll-up on the floor, immediately LEFT of the counter, outside its footprint
const banner = buildBanner(M);
{
  const b = cfg.banner;
  const sBanner = -(b.clearanceFromCounterEndMm + b.artworkWidthMm / 2);
  const p = pointAtMm(sBanner, b.radialOffsetMm);
  banner.object.position.set(mm(p.x), 0, mm(p.z));
  banner.object.rotation.y = yawAtS(sBanner);
  displayRoot.add(banner.object);
}

// dimension overlay, off by default
const overlay = buildDimensionOverlay();
scene.add(overlay);

// ---------------------------------------------------------------------------
// Review cameras
// ---------------------------------------------------------------------------
const VIEWS = {
  overview: {
    label: 'Room',
    pos: [-1.86, 1.58, 2.52], target: [-0.02, 1.26, -1.00], fov: 56,
    note: 'The venue: banner left, counter across the bay, conversation area right.',
  },
  counter: {
    label: 'Whole counter',
    pos: [0.00, 1.62, 1.72], target: [0.00, 1.08, -1.00], fov: 50,
    note: 'All five counter groups in one frame, left to right.',
  },
  top: {
    label: 'Top layout',
    pos: [0.0, 6.1, 0.42], target: [0.0, 1.0, -0.98], fov: 30,
    note: 'Plan check: order, footprints and access.',
  },
};

let currentView = 'overview';
let currentStop = -1;

// Camera moves are eased rather than cut, so a viewer keeps their bearings
// when the guide jumps from one part of the counter to another.
const tween = { active: false, t: 0, dur: 0.85, from: null, to: null };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

function goTo(view, { instant = false } = {}) {
  const to = {
    pos: new THREE.Vector3(...view.pos),
    target: new THREE.Vector3(...view.target),
    fov: view.fov,
  };
  if (instant) {
    camera.position.copy(to.pos);
    controls.target.copy(to.target);
    camera.fov = to.fov;
    camera.updateProjectionMatrix();
    controls.update();
    requestRender(2);
    return;
  }
  tween.from = {
    pos: camera.position.clone(),
    target: controls.target.clone(),
    fov: camera.fov,
  };
  tween.to = to;
  tween.t = 0;
  tween.active = true;
  requestRender(2);
}

function stepTween(dt) {
  if (!tween.active) return false;
  tween.t = Math.min(1, tween.t + dt / tween.dur);
  const k = easeInOut(tween.t);
  camera.position.lerpVectors(tween.from.pos, tween.to.pos, k);
  controls.target.lerpVectors(tween.from.target, tween.to.target, k);
  camera.fov = tween.from.fov + (tween.to.fov - tween.from.fov) * k;
  camera.updateProjectionMatrix();
  if (tween.t >= 1) tween.active = false;
  return true;
}

function applyView(key, instant = false) {
  const v = VIEWS[key];
  currentView = key;
  currentStop = -1;
  guide.setActive(-1);
  goTo(v, { instant });
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === key);
  });
  document.querySelectorAll('[data-stop]').forEach((el) => el.classList.remove('active'));
  document.getElementById('stop-position').textContent = `\u2014 / ${STOPS.length}`;
  document.getElementById('view-note').textContent = v.note;
  renderStopCard(null);
}

// ---------------------------------------------------------------------------
// The guided journey
// ---------------------------------------------------------------------------
const guide = new Guide(scene, STOPS);

function renderStopCard(stop) {
  const card = document.getElementById('stop-card');
  if (!stop) {
    card.innerHTML = `<p class="intro">${JOURNEY_INTRO}</p>`
      + '<p class="hint">Start the journey, or click a numbered marker on the model.</p>';
    return;
  }
  const part = (title, html) => (html ? `<h3>${title}</h3>${html}` : '');
  const list = (items, cls = '') => (items && items.length
    ? `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');
  const dims = stop.dims.length
    ? `<table class="dims">${stop.dims.map(([l, m, i]) => `<tr><th>${l}</th><td>${m}</td><td>${i}</td></tr>`).join('')}</table>`
    : '';
  card.innerHTML = `
    <div class="stop-head"><span class="num">${stop.n}</span>
      <div><h2>${stop.title}</h2><p class="sub">${stop.subtitle}</p></div></div>
    ${stop.body.map((b) => `<p>${b}</p>`).join('')}
    ${stop.script ? `<blockquote>\u201c${stop.script}\u201d</blockquote>` : ''}
    ${stop.dont ? `<p class="dont"><b>Careful:</b> ${stop.dont}</p>` : ''}
    ${part('Dimensions', dims)}
    ${part('Reference pages', list(stop.links.map((l) => `${l} <span class="muted">— URL to be supplied</span>`), 'links'))}
    ${part('Still open', list(stop.flags, 'flags'))}`;
}

function setStop(index, { instant = false } = {}) {
  if (index < 0 || index >= STOPS.length) return;
  currentStop = index;
  currentView = null;
  const stop = STOPS[index];
  guide.setActive(index);
  goTo(stop.view, { instant });
  document.querySelectorAll('[data-view]').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('[data-stop]').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.stop) === index);
  });
  document.getElementById('view-note').textContent = `Stop ${stop.n} of ${STOPS.length} — ${stop.title}`;
  document.getElementById('stop-position').textContent = `${stop.n} / ${STOPS.length}`;
  renderStopCard(stop);
  requestRender(2);
}

// ---------------------------------------------------------------------------
// Sample-lift interaction, updated for the plain portrait Oyster coupon
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let lifted = false;
const miniRestY = installation.mini.position.y;

function setLift(state) {
  lifted = state;
  installation.mini.position.y = miniRestY + (state ? mm(cfg.installation.liftHeightMm) : 0);
  installation.mini.rotation.x = state ? -deg(cfg.installation.miniLeanDeg) - deg(12) : -deg(cfg.installation.miniLeanDeg);
  document.getElementById('lift-state').textContent = state
    ? 'Coupon lifted off the base — it is removable, not glued.'
    : 'Click the plain Oyster coupon on the base to lift it.';
  document.getElementById('reset-lift').disabled = !state;
  requestRender(2);
}

let downPos = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downPos = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
  downPos = null;
  if (moved > 5) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const marker = guide.pick(raycaster);
  if (marker >= 0) { setStop(marker); return; }
  const hits = raycaster.intersectObject(installation.mini, true);
  if (hits.length) setLift(!lifted);
});

// ---------------------------------------------------------------------------
// Review panel
// ---------------------------------------------------------------------------
const report = runFitReport();

function buildPanel() {
  // -- free views ----------------------------------------------------------
  const views = document.getElementById('views');
  for (const [key, v] of Object.entries(VIEWS)) {
    const b = document.createElement('button');
    b.dataset.view = key;
    b.textContent = v.label;
    b.addEventListener('click', () => applyView(key));
    views.appendChild(b);
  }

  // -- journey navigation --------------------------------------------------
  const chips = document.getElementById('stop-chips');
  STOPS.forEach((stop, i) => {
    const b = document.createElement('button');
    b.textContent = stop.n;
    b.title = `${stop.title} — ${stop.subtitle}`;
    b.dataset.stop = i;
    b.addEventListener('click', () => setStop(i));
    chips.appendChild(b);
  });
  const step = (d) => setStop(currentStop < 0 ? (d > 0 ? 0 : STOPS.length - 1)
    : (currentStop + d + STOPS.length) % STOPS.length);
  document.getElementById('stop-prev').addEventListener('click', () => step(-1));
  document.getElementById('stop-next').addEventListener('click', () => step(1));
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  // -- legend, overlay, resets --------------------------------------------
  const legend = document.getElementById('legend');
  for (const item of LEGEND) {
    const span = document.createElement('span');
    span.innerHTML = `<i style="background:${item.hex}"></i>${item.label}`;
    legend.appendChild(span);
  }
  const dimToggle = document.getElementById('dims');
  dimToggle.addEventListener('change', () => { overlay.visible = dimToggle.checked; requestRender(2); });
  document.getElementById('reset-lift').addEventListener('click', () => setLift(false));
  document.getElementById('reset-view').addEventListener('click', () => {
    if (currentStop >= 0) setStop(currentStop);
    else applyView(currentView || 'overview');
  });

  // -- reference drawer ----------------------------------------------------
  const ref = document.getElementById('reference');
  const refToggle = document.getElementById('ref-toggle');
  const setRef = (on) => {
    ref.classList.toggle('open', on);
    refToggle.textContent = on ? 'Reference \u25c2' : 'Reference \u25b8';
    refToggle.classList.toggle('active', on);
  };
  refToggle.addEventListener('click', () => setRef(!ref.classList.contains('open')));
  document.getElementById('ref-close').addEventListener('click', () => setRef(false));

  const tables = document.getElementById('ref-tables');
  for (const t of DIMENSION_TABLES) {
    const h = document.createElement('h4');
    h.textContent = t.title;
    tables.appendChild(h);
    const cap = document.createElement('p');
    cap.className = 'cap';
    cap.textContent = t.caption;
    tables.appendChild(cap);
    const list = document.createElement('div');
    list.innerHTML = t.rows.map((r) => {
      const label = r.count ? `${r.label} <span class="muted">\u2014 ${r.count}</span>` : r.label;
      const note = r.note ? `<div class="ref-note">${r.note}</div>` : '';
      return `<div class="ref-row s-${r.status}"><div class="ref-label">${label}</div>`
        + `<div class="ref-vals"><span class="mmv">${r.mmText} mm</span>`
        + `<span class="inv">${r.inText} in</span></div>${note}</div>`;
    }).join('');
    tables.appendChild(list);
  }
  const fill = (id, items) => {
    const el = document.getElementById(id);
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      el.appendChild(li);
    }
  };
  fill('ref-angles', ANGLE_NOTES);
  fill('ref-tomeasure', STILL_TO_MEASURE);
  fill('assumptions', ASSUMPTIONS);
  const cl = document.getElementById('conflicts');
  for (const c of CONFLICTS) {
    const li = document.createElement('li');
    li.innerHTML = `<b>${c.title}</b><span class="muted">${c.decision}</span>`;
    cl.appendChild(li);
  }
  const fitList = document.getElementById('fit');
  for (const f of report.findings.filter((x) => x.level === 'conflict')) {
    const li = document.createElement('li');
    li.textContent = f.message;
    fitList.appendChild(li);
  }

  const counts = report.summary.statusCounts;
  document.getElementById('status-counts').textContent =
    `${counts.specified} specified \u00b7 ${counts.provisional} provisional \u00b7 ${counts.conflict} conflict`;
}
buildPanel();
setLift(false);
applyView('overview', true);

// ---------------------------------------------------------------------------
function resize() {
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  if (renderer.domElement.width !== w || renderer.domElement.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return true;
  }
  return false;
}

const clock = new THREE.Clock();
function tick() {
  const dt = clock.getDelta();
  if (resize()) settleFrames = Math.max(settleFrames, 2);
  if (stepTween(dt)) settleFrames = Math.max(settleFrames, 2);
  if (guide.update(clock.elapsedTime)) settleFrames = Math.max(settleFrames, 2);
  if (settleFrames > 0) {
    controls.update();
    renderer.render(scene, camera);
    settleFrames -= 1;
  }
  requestAnimationFrame(tick);
}
tick();

// Exposed for review, screenshots and console inspection of real dimensions.
window.PG = {
  THREE, scene, camera, controls, renderer, CONFIG: cfg, PROVENANCE,
  report, footprints: footprints(), applyView, setLift, setStop, STOPS,
  setDimensions: (on) => {
    overlay.visible = on;
    document.getElementById('dims').checked = on;
    requestRender(3);
  },
  render: (frames = 3) => requestRender(frames),
  setReference: (on) => {
    const ref = document.getElementById('reference');
    if (ref) ref.classList.toggle('open', !!on);
  },
  setHud: (on) => {
    const hud = document.getElementById('hud');
    const ref = document.getElementById('reference');
    if (hud) hud.style.display = on ? 'flex' : 'none';
    if (ref) ref.style.display = on ? '' : 'none';
  },
  ready: true,
};

const boot = document.getElementById('boot');
if (boot) boot.remove();
