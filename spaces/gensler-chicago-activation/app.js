/* ═══════════════════════════════════════════════════════════════════════════
   APPLICATION — review controls for the concept model

   The visitor at the event is not expected to touch a screen. Everything in
   this panel exists so the design team can review appearance, scale,
   placement, material combinations and the visitor sequence.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
"use strict";

var CFG = window.PG_CONFIG;
var $ = function (id) { return document.getElementById(id); };

if (!PG.hasWebGL()) {
  $('fallback').hidden = false;
  $('panel').hidden = true;
  return;
}

/* ── renderer ─────────────────────────────────────────────────────────────
   preserveDrawingBuffer keeps the PNG export honest: the pixels written are
   the pixels saved. Every texture is a same-origin canvas, so the export is
   never tainted and always succeeds.                                        */
var stage = $('stage');
var renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
} catch (e) {
  $('fallback').hidden = false; $('panel').hidden = true; return;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(48, stage.clientWidth / stage.clientHeight, 0.12, 900);

var dirty = 2;
function invalidate() { dirty = 2; }

var sunState = null;
var ctx = {
  THREE: THREE, scene: scene, renderer: renderer, camera: camera, CFG: CFG, PG: PG,
  invalidate: invalidate,
  onSun: function (s) {
    sunState = s;
    $('sunread').textContent = (s.hh < 10 ? '0' : '') + s.hh + ':' + (s.mins < 10 ? '0' : '') + s.mins +
      ' · ' + Math.round(s.azimuth) + '° az · ' + Math.round(s.altitude) + '° alt';
  }
};

/* ── build ────────────────────────────────────────────────────────────── */
var V   = window.PG_VENUE(ctx);   ctx.venue = V;
var INS = window.PG_INSTALL(ctx); ctx.install = INS;

var mm = PG.mm, D2R = Math.PI / 180;

/* ── the fallback freestanding support, in its own floor area ─────────────
   A reusable plinth carrying the same composition. This is a fallback that
   needs site confirmation, not the default, so it is off unless asked for
   and it never stands in front of the existing counter.                     */
var freeGroup = new THREE.Group(); freeGroup.visible = false; scene.add(freeGroup);
(function () {
  var f = CFG.install.freestanding;
  var plinthH = mm(CFG.counter.height);
  var body = new THREE.Mesh(new THREE.BoxGeometry(mm(820), plinthH, mm(460)),
    new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.6, metalness: 0.25, envMapIntensity: 0.35 }));
  body.position.set(0, plinthH / 2, -mm(230) + mm(200));
  body.castShadow = true; body.receiveShadow = true;
  freeGroup.add(body);
  var clone = INS.groups.main.clone(true);   // shares materials, so palette changes carry
  clone.position.set(0, plinthH, 0);
  clone.rotation.set(0, 0, 0);
  freeGroup.add(clone);
  freeGroup.position.set(mm(f.x), 0, mm(f.z));
  freeGroup.rotation.y = f.rotation * D2R;
  V.contact(mm(f.x), mm(f.z) - 0.05, 0.60, 0.42, 0.72, f.rotation * D2R);
})();

/* ── packed component view ────────────────────────────────────────────────
   The same parts laid flat inside a case footprint, to check that this
   travels as flat pieces and one handled coupon.                            */
var packGroup = new THREE.Group(); packGroup.visible = false; scene.add(packGroup);
(function () {
  var ox = -1.15, oz = 3.55;
  var caseW = mm(900), caseD = mm(560);
  var pts = [[-caseW / 2, -caseD / 2], [caseW / 2, -caseD / 2], [caseW / 2, caseD / 2], [-caseW / 2, caseD / 2], [-caseW / 2, -caseD / 2]]
    .map(function (p) { return new THREE.Vector3(p[0], 0.004, p[1]); });
  var outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x1b3a5c }));
  packGroup.add(outline);
  var flat = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.7, envMapIntensity: 0.3 });
  var parts = [
    { w: 700, d: 650, t: 12, x: 0,    z: -120, n: 'wall fragment' },
    { w: 700, d: 350, t: 19, x: 0,    z: 300,  n: 'Growth surface' },
    { w: 500, d: 300, t: 6,  x: -180, z: 470,  n: 'palette tray' },
    { w: 150, d: 100, t: 12, x: 250,  z: 470,  n: 'coupon' }
  ];
  var y = 0.01;
  parts.forEach(function (p) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(mm(p.w), mm(p.t), mm(p.d)), flat);
    m.position.set(mm(p.x), y + mm(p.t) / 2, mm(p.z));
    m.castShadow = true; m.receiveShadow = true;
    packGroup.add(m);
    y += mm(p.t) + 0.002;
  });
  packGroup.position.set(ox, 0, oz);
  packGroup.rotation.y = -0.5;
})();

var ANNO = window.PG_ANNO(ctx);

/* anything that never received an explicit reflectance budget gets a modest
   one, so the indoor probe does not light the street (see venue.js note) */
scene.traverse(function (o) {
  if (!o.isMesh) return;
  var mats = Array.isArray(o.material) ? o.material : [o.material];
  mats.forEach(function (m) { if (m && m.envMapIntensity === 1) m.envMapIntensity = 0.36; });
});

/* ── existing / proposed furniture ────────────────────────────────────────
   Furniture inside the allocated zone is RESET, not deleted, and the rest of
   the room is left exactly as photographed.                                 */
var zone = (function () {
  var a = [], u = Object.keys(INS.units).map(function (k) { return INS.units[k]; });
  u.forEach(function (uu) {
    [-1, 1].forEach(function (s) {
      var p = INS.place(uu.theta, s * uu.w / 2, 0);
      a.push(Math.atan2(p.x, V.BAY.cz - p.y) / D2R);
    });
  });
  return { min: Math.min.apply(null, a), max: Math.max.apply(null, a) };
})();

function stoolAngle(entry) {
  var p = entry.group.position;
  return Math.atan2(p.x, V.BAY.cz - p.z) / D2R;
}
function placeStool(entry, angleDeg) {
  var p = V.bayPt(angleDeg, entry.radius, 0);
  entry.group.position.copy(p);
  entry.group.rotation.y = -angleDeg * D2R;
  entry.shadow.position.set(p.x, entry.shadow.position.y, p.z);
  entry.shadow.rotation.z = -angleDeg * D2R;
}

var stoolPlan = V.stools.map(function (s) {
  var a = stoolAngle(s);
  return { entry: s, original: a, inZone: a > zone.min - 8 && a < zone.max + 8 };
});
var resetQueue = CFG.furnitureReset.resetAngles.slice();
stoolPlan.forEach(function (p) { if (p.inZone) p.reset = resetQueue.shift(); });

var ornPlan = V.ornaments.map(function (o) {
  return { obj: o.obj, angle: o.angle, inZone: o.angle > zone.min - 3 && o.angle < zone.max + 3 };
});

var showProposed = true;
function applyFurniture() {
  stoolPlan.forEach(function (p) {
    placeStool(p.entry, showProposed && p.reset !== undefined ? p.reset : p.original);
  });
  ornPlan.forEach(function (p) { p.obj.visible = !(showProposed && p.inZone); });
  INS.groups.main.visible = showProposed;
  INS.groups.palette.visible = showProposed;
  if (!showProposed) { freeGroup.visible = false; $('opt-free').checked = false; }
  invalidate();
}

/* ── cameras ──────────────────────────────────────────────────────────────
   Derived from where the installation actually is, so they follow the
   configuration instead of being typed in twice.                            */
INS.groups.main.updateMatrixWorld(); INS.groups.palette.updateMatrixWorld();
function mainWorld(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(INS.groups.main.matrixWorld); }
function palWorld(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(INS.groups.palette.matrixWorld); }
INS.groups.translucent.updateMatrixWorld();
function transWorld(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(INS.groups.translucent.matrixWorld); }
INS.groups.info.updateMatrixWorld();
function infoWorld(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(INS.groups.info.matrixWorld); }

var A = INS.units.main;
var junction = mainWorld(0, mm(CFG.install.horizontal.topAboveCounter), INS.anchors.wallZ);
var compCentre = mainWorld(0, mm(340), -A.d / 2).lerp(palWorld(0, mm(340), -0.15), 0.42);

/* every vantage is expressed in the installation's own frame, so moving the
   composition in config.js moves the cameras with it */
var VIEWS = [
  { key: 'approach', name: 'Room approach',
    p: mainWorld(1.30, mm(720), 2.90), t: compCentre.clone().setY(mm(1150)), fov: 54 },
  { key: 'eye', name: 'Eye-level interaction',
    p: mainWorld(0.16, mm(580), 1.38), t: mainWorld(0.02, mm(300), INS.anchors.wallZ + 0.16), fov: 44 },
  { key: 'detail', name: 'Groove / edge close-up',
    p: mainWorld(1.24, mm(490), 0.90), t: mainWorld(0.22, mm(300), INS.anchors.wallZ + 0.18), fov: 38 },
  { key: 'overhead', name: 'Overhead layout',
    p: compCentre.clone().add(new THREE.Vector3(0.02, 2.52, 0.06)), t: compCentre.clone().setY(V.CT.h), fov: 44 },
  { key: 'palette', name: 'Palette interaction',
    p: palWorld(0.10, mm(470), 0.74), t: palWorld(0, mm(50), -0.16), fov: 42 },
  { key: 'translucent', name: 'Translucent Collection',
    p: transWorld(0.06, mm(400), 0.66), t: transWorld(0, mm(120), -0.10), fov: 42 },
  { key: 'orientation', name: 'Orientation stand',
    p: infoWorld(0.24, mm(520), 1.18), t: infoWorld(0, mm(250), -0.10), fov: 40 },
  { key: 'logistics', name: 'Packed + fallback support',
    p: new THREE.Vector3(0.15, 2.05, 5.75), t: new THREE.Vector3(0.05, 0.35, 3.30), fov: 56 }
];

var target = new THREE.Vector3();
var sph = new THREE.Spherical();
var anim = null;
var activeView = 0;

function applyCam(p, t, fov) {
  camera.position.copy(p);
  target.copy(t);
  camera.fov = fov; camera.updateProjectionMatrix();
  camera.lookAt(target);
  sph.setFromVector3(camera.position.clone().sub(target));
  invalidate();
}
function goView(i, instant) {
  var v = VIEWS[i];
  activeView = i;
  Array.prototype.forEach.call($('views').children, function (b, k) {
    b.setAttribute('aria-pressed', k === i ? 'true' : 'false');
  });
  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyCam(v.p, v.t, v.fov);
  } else {
    anim = { t0: performance.now(), dur: 900, p0: camera.position.clone(), tt0: target.clone(),
             f0: camera.fov, p1: v.p.clone(), t1: v.t.clone(), f1: v.fov };
    invalidate();
  }
}

/* ── orbit / pan / dolly (carried over from the venue model) ───────────── */
var el = renderer.domElement, drag = null;
el.style.touchAction = 'none';
el.addEventListener('pointerdown', function (e) {
  el.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 || e.button === 1 };
  anim = null;
});
el.addEventListener('pointermove', function (e) {
  if (!drag) return;
  var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY;
  if (drag.pan) {
    var right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
    var up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
    var k = sph.radius * 0.0016;
    target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
    target.x = PG.clamp(target.x, -3.6, 3.6);
    target.y = PG.clamp(target.y, 0.05, 3.4);
    target.z = PG.clamp(target.z, -2.6, 5.6);
  } else {
    sph.theta -= dx * 0.0042;
    sph.phi = PG.clamp(sph.phi - dy * 0.0042, 0.06, Math.PI - 0.14);
  }
  syncCam();
});
function endDrag(e) { if (drag) { try { el.releasePointerCapture(e.pointerId); } catch (x) {} } drag = null; }
el.addEventListener('pointerup', endDrag);
el.addEventListener('pointercancel', endDrag);
el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
el.addEventListener('wheel', function (e) {
  e.preventDefault();
  sph.radius = PG.clamp(sph.radius * Math.pow(1.0016, e.deltaY), 0.28, 15);
  anim = null; syncCam();
}, { passive: false });

function syncCam() {
  var p = new THREE.Vector3().setFromSpherical(sph).add(target);
  p.x = PG.clamp(p.x, V.ROOM.left + 0.30, V.ROOM.right - 0.30);
  p.y = PG.clamp(p.y, 0.25, V.ROOM.h + 1.4);
  p.z = PG.clamp(p.z, V.ROOM.wallZ + 0.42, V.ROOM.back - 0.35);
  camera.position.copy(p);
  camera.lookAt(target);
  invalidate();
}

/* ── control panel ────────────────────────────────────────────────────── */
VIEWS.forEach(function (v, i) {
  var b = document.createElement('button');
  b.type = 'button'; b.textContent = v.name;
  b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
  b.addEventListener('click', function () { goView(i); });
  $('views').appendChild(b);
});

function swatchRow(hostId, list, onPick, initial) {
  list.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch';
    b.setAttribute('aria-pressed', s.id === initial ? 'true' : 'false');
    b.title = s.name;
    var chip = document.createElement('canvas');
    chip.width = 46; chip.height = 46;
    chip.getContext('2d').drawImage(INS.surfaceCanvas[s.id], 0, 0, 300, 300, 0, 0, 46, 46);
    b.appendChild(chip);
    var lab = document.createElement('span');
    lab.textContent = s.name.split(' — ')[0];
    b.appendChild(lab);
    b.addEventListener('click', function () {
      Array.prototype.forEach.call($(hostId).children, function (o) { o.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      onPick(s.id);
      refreshRecordLine();
    });
    $(hostId).appendChild(b);
  });
}
swatchRow('wallSwatches', CFG.wallColours, INS.setWall, INS.state.wall);
swatchRow('growthSwatches', CFG.growthSurfaces, INS.setGrowth, INS.state.growth);

/* the four engravings, supplied in the client sheet. Engraving and colour are
   separate choices — the sheet pairs them, the product does not require it. */
CFG.engravings.forEach(function (e) {
  var b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = '<b>' + e.ref + '</b> ' + e.name + '<em>' + e.cellW + ' \u00d7 ' + e.cellH + ' mm cell</em>';
  b.setAttribute('aria-pressed', e.id === INS.state.engraving ? 'true' : 'false');
  b.addEventListener('click', function () {
    Array.prototype.forEach.call($('engravings').children, function (o) { o.setAttribute('aria-pressed', 'false'); });
    b.setAttribute('aria-pressed', 'true');
    INS.setEngraving(e.id);
    refreshRecordLine();
  });
  $('engravings').appendChild(b);
});

CFG.questions.forEach(function (q) {
  var b = document.createElement('button');
  b.type = 'button';
  b.textContent = q.label;
  b.setAttribute('aria-pressed', q.id === INS.state.question ? 'true' : 'false');
  b.addEventListener('click', function () {
    Array.prototype.forEach.call($('questions').children, function (o) { o.setAttribute('aria-pressed', 'false'); });
    b.setAttribute('aria-pressed', 'true');
    INS.setQuestion(q.id);
    refreshRecordLine();
  });
  $('questions').appendChild(b);
});

/* inspect: a reversible transition on the coupon alone */
var inspectAnim = null;
$('opt-inspect').addEventListener('change', function () {
  inspectAnim = { from: INS.getInspect(), to: this.checked ? 1 : 0, t0: performance.now(), dur: 620 };
  invalidate();
});
$('opt-furniture').addEventListener('change', function () { showProposed = this.checked; applyFurniture(); });
$('opt-dims-plan').addEventListener('change', function () { ANNO.setPlanDims(this.checked); });
$('opt-dims-height').addEventListener('change', function () { ANNO.setHeightDims(this.checked); });
$('opt-notes').addEventListener('change', function () { ANNO.setNotes(this.checked); });
$('opt-band').addEventListener('change', function () { ANNO.setBand(this.checked); });
$('opt-free').addEventListener('change', function () { freeGroup.visible = this.checked; invalidate(); });
$('opt-pack').addEventListener('change', function () { packGroup.visible = this.checked; invalidate(); });

var light = CFG.daylight;
$('lightSoft').addEventListener('click', function () { setLight('soft'); });
$('lightBack').addEventListener('click', function () { setLight('backlight'); });
function setLight(which) {
  V.setSun(light[which].hour);
  $('lightSoft').setAttribute('aria-pressed', String(which === 'soft'));
  $('lightBack').setAttribute('aria-pressed', String(which === 'backlight'));
}

$('reset').addEventListener('click', function () { goView(activeView, true); });

document.addEventListener('keydown', function (e) {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  var i = '12345678'.indexOf(e.key);
  if (i >= 0 && i < VIEWS.length) { goView(i); e.preventDefault(); }
  if (e.key === '0') { goView(activeView, true); }
});

/* ── status: what the model is flagging ───────────────────────────────── */
function refreshStatus() {
  var rows = INS.checkFootprint();
  var host = $('status');
  host.innerHTML = '';
  rows.forEach(function (r) {
    var li = document.createElement('li');
    li.className = r.level;
    li.textContent = r.text;
    host.appendChild(li);
  });
  var bad = rows.filter(function (r) { return r.level === 'fail'; }).length;
  $('statusHead').textContent = bad ? bad + ' issue' + (bad > 1 ? 's' : '') + ' to resolve' : 'Fits as configured';
  $('statusHead').className = bad ? 'bad' : 'good';
}

function refreshRecordLine() {
  var s = INS.state;
  var q = CFG.questions.find(function (x) { return x.id === s.question; });
  $('recordLine').textContent = 'wall ' + s.wall + ' / ' + engravingOf(s.engraving).name +
    ' · Growth ' + s.growth + ' · ' + q.label;
}

/* ── PNG export ───────────────────────────────────────────────────────────
   The footer travels with the image so a still can never circulate without
   its concept and texture status.                                           */
function composeExport() {
  /* A still must never be captured mid-transition. composeExport renders
     directly rather than through the animation loop, so on a slow frame a
     Save PNG taken just after a vantage click could show the PREVIOUS
     vantage while the footer named the new one. Finish the move first. */
  if (anim) { applyCam(anim.p1, anim.t1, anim.f1); anim = null; }
  renderer.render(scene, camera);
  var src = renderer.domElement;
  var scale = src.width / src.clientWidth;
  var footH = Math.round(74 * scale);
  var out = PG.canvas(src.width, src.height + footH);
  var x = out.getContext('2d');
  x.drawImage(src, 0, 0);
  x.fillStyle = '#101114';
  x.fillRect(0, src.height, out.width, footH);
  x.fillStyle = '#c4576b';
  x.fillRect(0, src.height, Math.round(4 * scale), footH);
  var s = INS.state;
  var q = CFG.questions.find(function (i) { return i.id === s.question; });
  var f = Math.round(13 * scale);
  x.fillStyle = '#f2efe9';
  x.font = '600 ' + f + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
  x.fillText(CFG.meta.project + ' — ' + CFG.meta.status, 20 * scale, src.height + 24 * scale);
  x.fillStyle = '#a8a49c';
  x.font = '500 ' + Math.round(10.5 * scale) + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
  x.fillText(CFG.textureStatus + ' · ' + CFG.meta.dimensionNote, 20 * scale, src.height + 43 * scale);
  x.fillText(VIEWS[activeView].name + ' · wall ' + s.wall + ' / engraving ' + engravingOf(s.engraving).name +
    ' · Growth ' + s.growth + ' · ' + q.label + ' · ' + CFG.meta.revision, 20 * scale, src.height + 60 * scale);

  return out;
}
function exportPNG() {
  var a = document.createElement('a');
  a.download = 'polygood-' + VIEWS[activeView].key + '-' + CFG.meta.revision.replace(/[^\w]+/g, '-') + '.png';
  a.href = composeExport().toDataURL('image/png');
  a.click();
}
$('savePng').addEventListener('click', exportPNG);
// the still-capture script writes the same composed image, footer included,
// so an exported still can never circulate without its status line
window.__exportPNGDataURL = function () { return composeExport().toDataURL('image/png'); };

/* ── palette record ───────────────────────────────────────────────────────
   A concept-review record. It is not an order, a quotation or a lead form,
   and nothing here requires a login or a backend.                           */
var RECORD_KEY = 'polygood-concept-records';
function saveRecord() {
  var s = INS.state;
  var id = 'PR-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();
  var rec = {
    kind: 'concept-review record — not an order or a specification',
    id: id,
    saved: new Date().toISOString(),
    project: CFG.meta.project,
    revision: CFG.meta.revision,
    wallChoice: { surface: s.wall, name: nameOf(s.wall), sku: CFG.product.wallTileSku },
    engraving: { id: s.engraving, name: engravingOf(s.engraving).name,
                 reference: engravingOf(s.engraving).ref,
                 referenceConfirmed: CFG.engravingRefsConfirmed },
    growthChoice: { surface: s.growth, name: nameOf(s.growth), sku: CFG.product.growthSurfaceSku },
    projectQuestion: CFG.questions.find(function (q) { return q.id === s.question; }).label,
    textureStatus: CFG.textureStatus,
    dimensionStatus: CFG.meta.dimensionNote
  };
  var all = [];
  try { all = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]'); } catch (e) { all = []; }
  all.push(rec);
  try { localStorage.setItem(RECORD_KEY, JSON.stringify(all)); } catch (e) {}
  $('recordId').textContent = id + ' saved (' + all.length + ' held locally)';
  var blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.download = id + '.json';
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
}
function nameOf(id) {
  var all = CFG.wallColours.concat(CFG.growthSurfaces);
  var f = all.find(function (s) { return s.id === id; });
  return f ? f.name : id;
}
function engravingOf(id) { return CFG.engravings.find(function (e) { return e.id === id; }); }
$('saveRecord').addEventListener('click', saveRecord);

/* ── metadata into the panel ──────────────────────────────────────────── */
$('metaProject').textContent = CFG.meta.project;
$('metaRev').textContent = CFG.meta.status + ' · ' + CFG.meta.revision;
$('grooveNote').textContent = 'Four engravings supplied (' +
  CFG.engravings.map(function (e) { return e.ref + ' ' + e.name; }).join(', ') +
  '). Cell sizes derived from the supplied sheet against an assumed ' +
  CFG.engravingReferenceSheet + ' mm reference sheet — illustrative. Groove ' +
  CFG.groove.width + ' \u00d7 ' + CFG.groove.depth + ' mm, ' + CFG.groove.profile + '.' +
  (CFG.engravingRefsConfirmed ? '' : ' Reference numbers not confirmed.');
$('jointNote').textContent = CFG.product.panelJointDetailSupplied
  ? 'Panel joint detail supplied.'
  : 'No panel-joint sample is shown: manufacturer detail requested.';
$('sameNote').textContent = CFG.product.samePatternAvailabilityConfirmed
  ? 'Same-pattern wall/counter option available.'
  : 'Same-pattern wall/counter option withheld — availability not confirmed.';
$('textureNote').textContent = CFG.textureStatus;
$('growthEngravingNote').textContent = CFG.product.engravingOnGrowthConfirmed
  ? 'The four engravings are confirmed available on Growth.'
  : 'The four engravings are shown here on Growth material. They were supplied ' +
    'for Wall Tiles \u2014 whether they can be machined into Growth, and in which ' +
    'thicknesses, is not established.';

/* ── run ──────────────────────────────────────────────────────────────── */
function fitStage() {
  var w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  invalidate();
}
addEventListener('resize', fitStage);
fitStage();

applyFurniture();
setLight('soft');
goView(0, true);
refreshStatus();
refreshRecordLine();

var loader = $('loader');
var frames = 0;
function tick(now) {
  requestAnimationFrame(tick);
  if (anim) {
    var u = PG.clamp((now - anim.t0) / anim.dur, 0, 1);
    var e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    camera.position.lerpVectors(anim.p0, anim.p1, e);
    target.lerpVectors(anim.tt0, anim.t1, e);
    camera.fov = anim.f0 + (anim.f1 - anim.f0) * e;
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    if (u >= 1) { sph.setFromVector3(camera.position.clone().sub(target)); anim = null; }
    dirty = 2;
  }
  if (inspectAnim) {
    var iu = PG.clamp((now - inspectAnim.t0) / inspectAnim.dur, 0, 1);
    INS.setInspect(inspectAnim.from + (inspectAnim.to - inspectAnim.from) * iu);
    if (iu >= 1) inspectAnim = null;
    dirty = 2;
  }
  if (dirty > 0) { dirty--; renderer.render(scene, camera); frames++; }
  if (frames === 2 && loader && !loader.classList.contains('done')) {
    loader.classList.add('done');
    setTimeout(function () { loader.style.display = 'none'; }, 600);
  }
}
requestAnimationFrame(tick);
window.__ready = true;
})();
