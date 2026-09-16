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

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance',
  preserveDrawingBuffer: true,   // so offline screenshot capture is reliable
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    label: 'Room overview',
    pos: [-1.86, 1.58, 2.52], target: [-0.02, 1.26, -1.00], fov: 56,
    note: 'Matched to the venue photograph: banner left, counter across the bay, stools right.',
  },
  counter: {
    label: 'Whole counter',
    pos: [0.00, 1.62, 1.72], target: [0.00, 1.08, -1.00], fov: 50,
    note: 'All five counter groups in one frame, left to right.',
  },
  installation: {
    label: 'Installation detail',
    pos: [-0.20, 1.40, -0.14], target: [-0.25, 1.19, -0.99], fov: 38,
    note: 'Engraved Oyster panel, LOOK CLOSER sign front-left, plain coupon front-right.',
  },
  top: {
    label: 'Top layout',
    pos: [0.0, 6.1, 0.42], target: [0.0, 1.0, -0.98], fov: 30,
    note: 'Plan check: order, footprints and access.',
  },
  seating: {
    label: 'Conversation area',
    pos: [-0.05, 1.64, 1.95], target: [1.12, 0.94, -0.52], fov: 46,
    note: 'Three representatives at the right end, on the room side, facing visitors.',
  },
};

let currentView = 'overview';
function applyView(key, instant = true) {
  const v = VIEWS[key];
  currentView = key;
  camera.fov = v.fov;
  camera.position.set(...v.pos);
  controls.target.set(...v.target);
  camera.updateProjectionMatrix();
  controls.update();
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === key);
  });
  document.getElementById('view-note').textContent = v.note;
  requestRender(3);
  void instant;
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
  const hits = raycaster.intersectObject(installation.mini, true);
  if (hits.length) setLift(!lifted);
});

// ---------------------------------------------------------------------------
// Review panel
// ---------------------------------------------------------------------------
const report = runFitReport();

function buildPanel() {
  const views = document.getElementById('views');
  for (const [key, v] of Object.entries(VIEWS)) {
    const b = document.createElement('button');
    b.dataset.view = key;
    b.textContent = v.label;
    b.addEventListener('click', () => applyView(key));
    views.appendChild(b);
  }

  const legend = document.getElementById('legend');
  for (const item of LEGEND) {
    const span = document.createElement('span');
    span.innerHTML = `<i style="background:${item.hex}"></i>${item.label}`;
    legend.appendChild(span);
  }

  const dimToggle = document.getElementById('dims');
  dimToggle.addEventListener('change', () => { overlay.visible = dimToggle.checked; requestRender(2); });

  document.getElementById('reset-lift').addEventListener('click', () => setLift(false));
  document.getElementById('reset-view').addEventListener('click', () => applyView(currentView));

  // Sequence readout, straight from the placement data.
  const seq = document.getElementById('sequence');
  const order = footprints();
  order.sort((a, b) => a.sCentre - b.sCentre).forEach((f) => {
    const li = document.createElement('li');
    li.textContent = `${f.label} — ${Math.round(f.sCentre)} mm along the counter`;
    seq.appendChild(li);
  });

  // Conflicts and assumptions.
  const cl = document.getElementById('conflicts');
  for (const c of CONFLICTS) {
    const li = document.createElement('li');
    li.innerHTML = `<b>${c.title}</b><br><span>${c.decision}</span>`;
    cl.appendChild(li);
  }
  const al = document.getElementById('assumptions');
  for (const a of ASSUMPTIONS) {
    const li = document.createElement('li');
    li.textContent = a;
    al.appendChild(li);
  }

  const counts = report.summary.statusCounts;
  document.getElementById('status-counts').textContent =
    `${counts.specified} specified · ${counts.provisional} provisional · ${counts.conflict} conflict`;

  const fitList = document.getElementById('fit');
  for (const f of report.findings.filter((x) => x.level === 'conflict')) {
    const li = document.createElement('li');
    li.textContent = f.message;
    fitList.appendChild(li);
  }

  const toggle = document.getElementById('panel-toggle');
  const panel = document.getElementById('panel');
  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    toggle.textContent = panel.classList.contains('collapsed') ? 'Review notes ▸' : 'Review notes ▾';
  });
}
buildPanel();
setLift(false);
applyView('overview');

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

function tick() {
  if (resize()) settleFrames = Math.max(settleFrames, 2);
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
  report, footprints: footprints(), applyView, setLift,
  setDimensions: (on) => {
    overlay.visible = on;
    document.getElementById('dims').checked = on;
    requestRender(3);
  },
  render: (frames = 3) => requestRender(frames),
  setPanel: (on) => {
    document.getElementById('panel').classList.toggle('collapsed', !on);
  },
  setHud: (on) => {
    document.getElementById('hud').style.display = on ? 'flex' : 'none';
    document.getElementById('panel').style.display = on ? '' : 'none';
  },
  ready: true,
};

const boot = document.getElementById('boot');
if (boot) boot.remove();
