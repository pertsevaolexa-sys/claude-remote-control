/* ═══════════════════════════════════════════════════════════════════════════
   THE INSTALLATION — Polygood Wall Tiles + Growth, on the existing counter

   Three readable parts:
     A  a vertical Wall Tiles fragment with a machined groove and a real edge
     A  a horizontal Growth fragment meeting it at an inspectable junction
     B  a palette area: three Growth choices, references, a question card

   CONSTRUCTION NOTE, which is the whole point of the piece:
   a GROOVE is machined into ONE continuous panel. A JOINT is the line between
   two panels. They are different conditions. Nothing here is modelled as
   loose square tiles with grout, and no panel-to-panel joint is shown,
   because no manufacturer detail has been supplied.

   Everything here is concept geometry. No dimension is a site measurement, no
   texture is colour-accurate, no support is engineered, and the host
   counter's load capacity is unknown.
   ═══════════════════════════════════════════════════════════════════════════ */

window.PG_INSTALL = function (ctx) {
"use strict";

var THREE = ctx.THREE, scene = ctx.scene, CFG = ctx.CFG, V = ctx.venue;
var mm = PG.mm, D2R = Math.PI / 180;
var I = CFG.install;

/* ── set-out on the curved counter ────────────────────────────────────────
   Each unit is a rigid rectangle. The counter is an arc. A single rigid
   1240 mm object across a 2.28 m radius arc would swing roughly 78 mm off the
   counter, so the composition is set out as TWO rigid sub-assemblies, each
   tangent to the counter at its own centre — which is how a fabricator would
   actually set this out. The gap between them is measured at the front edge,
   the edge a visitor reads.                                                 */
var rFront = mm(CFG.counter.outerRadius - CFG.counter.depthAtActiveZone + I.frontEdgeInset);
var cz = mm(CFG.room.bay.centreZ);

function radial(aDeg) { var a = aDeg * D2R; return new THREE.Vector2(Math.sin(a), -Math.cos(a)); }
function tangent(aDeg) { var a = aDeg * D2R; return new THREE.Vector2(Math.cos(a), Math.sin(a)); }

// world XZ of a point in a unit's local frame (x across, z toward the room)
function place(aDeg, lx, lz) {
  var n = radial(aDeg), t = tangent(aDeg);
  return new THREE.Vector2(
    n.x * rFront + t.x * lx - n.x * lz,
    cz + n.y * rFront + t.y * lx - n.y * lz
  );
}

var thetaA = I.setOutAngle;
var halfA = mm(I.wall.width) / 2, halfB = mm(I.palette.width) / 2;

// solve for unit B's angle so the front-edge gap is exactly the configured one
var thetaB = (function () {
  var want = mm(I.gapBetweenUnits);
  function gapAt(tb) {
    var pa = place(thetaA, halfA, 0), pb = place(tb, -halfB, 0);
    return pa.distanceTo(pb);
  }
  var lo = thetaA + 0.1, hi = thetaA + 70;
  for (var i = 0; i < 60; i++) {
    var mid = (lo + hi) / 2;
    if (gapAt(mid) < want) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
})();

var UNITS = {
  main:    { theta: thetaA, w: mm(I.wall.width),    d: mm(I.activeDepth) },
  palette: { theta: thetaB, w: mm(I.palette.width), d: mm(I.palette.depth) }
};

/* a group whose local frame is: +X across the unit, +Y up, +Z toward the room,
   origin at the middle of the unit's front edge on the counter top */
function unitGroup(theta) {
  var g = new THREE.Group();
  var p = place(theta, 0, 0);
  g.position.set(p.x, V.CT.h, p.y);
  g.rotation.y = -theta * D2R + I.extraRotation * D2R;
  scene.add(g);
  return g;
}

var gMain = unitGroup(UNITS.main.theta);
var gPal  = unitGroup(UNITS.palette.theta);

/* ── surfaces ─────────────────────────────────────────────────────────────
   Deterministic placeholders. Each piece samples a different patch of a
   1 m tile at true physical scale, so nothing repeats visibly and a 150 mm
   sample shows the same grain size as a 700 mm panel.                       */
var TILE = CFG.surfaceTileSize;
var surfaceCanvas = {};
CFG.surfaces.forEach(function (s) { surfaceCanvas[s.id] = PG.surfaceCanvas(s, TILE, 1024); });

var textured = [];   // { mesh, wMm, hMm, seed, role }
function surfaceMaterial(role, wMm, hMm, seed) {
  var m = new THREE.MeshStandardMaterial({
    color: 0xffffff,          // legacy colour mode: 0xffffff is neutral
    roughness: 0.74,          // matte. Deliberately not a polished stone shader.
    metalness: 0.0,
    envMapIntensity: 0.30
  });
  m.userData = { role: role, wMm: wMm, hMm: hMm, seed: seed };
  return m;
}
function applySurface(mat, surfaceId) {
  var u = mat.userData;
  var t = PG.surfaceTexture(THREE, surfaceCanvas[surfaceId], TILE, u.wMm, u.hMm, u.seed);
  if (mat.map) mat.map.dispose();
  mat.map = t; mat.needsUpdate = true;
  if (u.floor) { u.floor.map = t; u.floor.needsUpdate = true; }
}

var matWall  = surfaceMaterial('wall',   I.wall.width, I.wall.height, 11);
var matHoriz = surfaceMaterial('growth', I.horizontal.width, I.horizontal.depth, 23);
var matCoupon= surfaceMaterial('wall',   I.coupon.width, I.coupon.height, 37);
var sampleMats = [0, 1, 2].map(function (i) {
  return surfaceMaterial('growth', I.palette.sampleSize, I.palette.sampleSize, 51 + i * 13);
});

/* support and hardware — restrained, obviously fabricated, obviously concept */
var matTray   = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.44, metalness: 0.62, envMapIntensity: 0.5 });
var matRail   = new THREE.MeshStandardMaterial({ color: 0x1d1f21, roughness: 0.5,  metalness: 0.55, envMapIntensity: 0.45 });
var matPad    = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95, envMapIntensity: 0.2 });
var matMarker = new THREE.MeshStandardMaterial({ color: 0x8a6a2e, roughness: 0.35, metalness: 0.8, envMapIntensity: 0.6 });

/* ── a Wall Tiles panel ───────────────────────────────────────────────────
   Backing slab at (thickness − grooveDepth) runs the full panel: that is the
   continuous body, and it is what the exposed edge shows. Raised fields sit
   on it, separated by the machined grooves. Every piece is UV-mapped from its
   position IN THE PANEL, so the material runs unbroken through the grooves.  */
/* ease the top edge of every raised field. The bright line this puts along
   each groove is the single strongest cue that the groove was cut into the
   surface rather than filled between two tiles. */
function chamferTop(geo, w, h, d, inset) {
  var pos = geo.attributes.position;
  var sx = (w - 2 * inset) / w, sy = (h - 2 * inset) / h;
  for (var i = 0; i < pos.count; i++) {
    if (pos.getZ(i) > d / 2 - 1e-6) { pos.setX(i, pos.getX(i) * sx); pos.setY(i, pos.getY(i) * sy); }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function grooveLines(extentMm, spacingMm) {
  var out = [], p = spacingMm / 2;
  while (p < extentMm) { out.push(p); p += spacingMm; }
  return out;
}

function groovedPanel(opts) {
  // opts: wMm, hMm, tMm, groove{spacing,width,depth}, material, plane 'xy'|'xz'
  var g = new THREE.Group();
  var W = mm(opts.wMm), H = mm(opts.hMm), T = mm(opts.tMm);
  var gw = mm(opts.groove.width), gd = mm(opts.groove.depth);
  var back = T - gd;
  var tile = mm(TILE);

  var slab = new THREE.BoxGeometry(W, H, back);
  PG.planarUV(slab, W / 2, H / 2, tile);
  // rendering approximation only: same material, darkened to stand in for the
  // occlusion inside a 4 mm groove, which no shadow map at this scale resolves
  if (!opts.material.userData.floor) {
    var f = opts.material.clone();
    f.color = new THREE.Color(0.93, 0.93, 0.93);
    f.envMapIntensity = 0.16;
    opts.material.userData.floor = f;
  }
  var backing = new THREE.Mesh(slab, opts.material.userData.floor);
  backing.position.z = -gd / 2;
  backing.castShadow = true; backing.receiveShadow = true;
  g.add(backing);

  // field edges between grooves, in panel coordinates
  function bands(extentMm, lines) {
    var edges = [0], b = [];
    lines.forEach(function (l) { edges.push(l - opts.groove.width / 2, l + opts.groove.width / 2); });
    edges.push(extentMm);
    for (var i = 0; i < edges.length; i += 2) b.push([edges[i], edges[i + 1]]);
    return b;
  }
  var cols = bands(opts.wMm, grooveLines(opts.wMm, opts.groove.spacing));
  var rows = bands(opts.hMm, grooveLines(opts.hMm, opts.groove.spacing));

  cols.forEach(function (c) {
    rows.forEach(function (r) {
      var fw = mm(c[1] - c[0]), fh = mm(r[1] - r[0]);
      if (fw <= 0.0005 || fh <= 0.0005) return;
      var cxm = mm((c[0] + c[1]) / 2) - W / 2, cym = mm((r[0] + r[1]) / 2) - H / 2;
      var fg = new THREE.BoxGeometry(fw, fh, gd);
      chamferTop(fg, fw, fh, gd, mm(1.2));
      fg.translate(cxm, cym, 0);
      PG.planarUV(fg, W / 2, H / 2, tile);
      var f = new THREE.Mesh(fg, opts.material);
      f.position.z = back / 2 - gd / 2 + gd / 2;   // sits proud of the backing
      f.castShadow = true; f.receiveShadow = true;
      g.add(f);
    });
  });
  g.userData.grooveCount = { x: grooveLines(opts.wMm, opts.groove.spacing).length,
                             y: grooveLines(opts.hMm, opts.groove.spacing).length };
  return g;
}

/* ═══════════════ UNIT A — the main fragment ═══════════════ */
var A = { d: mm(I.activeDepth), w: mm(I.wall.width) };
var trayT = mm(6), padT = mm(I.base.padThickness);

// protective contact pads: nothing here is fixed to the building
[[-0.30, -0.06], [0.30, -0.06], [-0.30, -0.34], [0.30, -0.34]].forEach(function (p) {
  var pad = new THREE.Mesh(new THREE.BoxGeometry(0.07, padT, 0.07), matPad);
  pad.position.set(p[0], padT / 2, p[1]);
  gMain.add(pad);
});

// folded tray — CONCEPT SUPPORT, fabricator review required
var tray = new THREE.Mesh(new THREE.BoxGeometry(A.w, trayT, A.d), matTray);
tray.position.set(0, padT + trayT / 2, -A.d / 2);
tray.castShadow = true; tray.receiveShadow = true;
gMain.add(tray);
var trayTop = padT + trayT;

// the vertical Wall Tiles fragment, standing in a slot at the back of the tray
var wallPanel = groovedPanel({
  wMm: I.wall.width, hMm: I.wall.height, tMm: I.wall.thickness,
  groove: I.wall.groove, material: matWall
});
var wallZ = -A.d + mm(50);                      // panel face sits 50 mm in from the tray back
wallPanel.position.set(0, trayTop + mm(I.wall.height) / 2, wallZ - mm(I.wall.thickness) / 2);
gMain.add(wallPanel);

// slot fins and end gussets that actually hold it up
[-1, 1].forEach(function (s) {
  var fin = new THREE.Mesh(new THREE.BoxGeometry(A.w, mm(26), mm(8)), matRail);
  fin.position.set(0, trayTop + mm(13), wallZ - mm(I.wall.thickness) - mm(4) + (s > 0 ? mm(I.wall.thickness) + mm(8) : 0));
  fin.castShadow = true; gMain.add(fin);
});
[-1, 1].forEach(function (s) {
  var shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(mm(150), 0); shape.lineTo(0, mm(210)); shape.closePath();
  var gus = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: mm(6), bevelEnabled: false }), matRail);
  gus.rotation.y = Math.PI / 2;
  gus.position.set(s * (A.w / 2 - mm(20)), trayTop, wallZ - mm(I.wall.thickness));
  gus.rotation.y = -Math.PI / 2;
  gus.castShadow = true; gMain.add(gus);
});

// two rails carrying the horizontal fragment — no cantilever, no hidden fixing
var railH = mm(I.horizontal.topAboveCounter - I.horizontal.thickness) - trayTop;
[-1, 1].forEach(function (s) {
  var rail = new THREE.Mesh(new THREE.BoxGeometry(mm(40), railH, mm(290)), matRail);
  rail.position.set(s * mm(260), trayTop + railH / 2, wallZ + mm(20) + mm(290) / 2);
  rail.castShadow = true; rail.receiveShadow = true;
  gMain.add(rail);
});

// the horizontal Growth fragment
var horiz = new THREE.Mesh(new THREE.BoxGeometry(mm(I.horizontal.width), mm(I.horizontal.thickness), mm(I.horizontal.depth)), matHoriz);
PG.planarUV(horiz.geometry, mm(I.horizontal.width) / 2, mm(I.horizontal.depth) / 2, mm(TILE), 'xz');
horiz.position.set(0, mm(I.horizontal.topAboveCounter) - mm(I.horizontal.thickness) / 2, wallZ + mm(I.horizontal.depth) / 2);
horiz.castShadow = true; horiz.receiveShadow = true;
gMain.add(horiz);
var horizTopY = mm(I.horizontal.topAboveCounter);
var horizFrontZ = wallZ + mm(I.horizontal.depth);

/* ── the handled coupon, in its cradle on the Growth surface ─────────────── */
var coupon = groovedPanel({
  wMm: I.coupon.width, hMm: I.coupon.height, tMm: I.wall.thickness,
  groove: I.wall.groove, material: matCoupon
});
var couponHome = new THREE.Object3D();
couponHome.position.set(mm(215), horizTopY + mm(I.coupon.height) / 2 + mm(14), wallZ + mm(210));
couponHome.rotation.x = -0.20;
var couponPivot = new THREE.Group();
couponPivot.position.copy(couponHome.position);
couponPivot.rotation.copy(couponHome.rotation);
couponPivot.add(coupon);
gMain.add(couponPivot);

var cradle = new THREE.Mesh(new THREE.BoxGeometry(mm(178), mm(26), mm(44)), matRail);
cradle.position.set(mm(215), horizTopY + mm(13), wallZ + mm(210));
cradle.castShadow = true; gMain.add(cradle);

/* ── printed cards ────────────────────────────────────────────────────────
   No recycling statistics, no certification badges, no prices, no awards,
   no city silhouette, and no scannable QR — the destination has not been
   supplied, so the placeholder is plainly a placeholder.                    */
function cardMesh(wMm, hMm, draw) {
  var c = PG.cardCanvas(wMm, hMm, draw);
  var m = new THREE.MeshStandardMaterial({
    map: PG.cardTexture(THREE, c), roughness: 0.86, envMapIntensity: 0.25
  });
  var edge = new THREE.MeshStandardMaterial({ color: 0xd8d5cd, roughness: 0.9, envMapIntensity: 0.2 });
  var geo = new THREE.BoxGeometry(mm(wMm), mm(hMm), mm(2.5));
  var mats = [edge, edge, edge, edge, m, edge];
  return new THREE.Mesh(geo, mats);
}

// heading card: the one clear heading, on the left of the Growth surface
var heading = cardMesh(240, 92, function (x, w, h, ppm) {
  PG.text(x, CFG.copy.campaign, 21 * ppm, 34 * ppm, { x: 14 * ppm, weight: 700, spacing: 0.6 * ppm });
  x.strokeStyle = '#b03a2e'; x.lineWidth = 1.6 * ppm;
  x.beginPath(); x.moveTo(14 * ppm, 43 * ppm); x.lineTo(w - 14 * ppm, 43 * ppm); x.stroke();
  PG.text(x, CFG.copy.invitation, 11 * ppm, 60 * ppm, { x: 14 * ppm, weight: 500, colour: '#3a3a3e' });
  PG.text(x, CFG.copy.brand, 7.5 * ppm, 79 * ppm, { x: 14 * ppm, weight: 500, colour: '#6c6a66' });
});
heading.position.set(-mm(215), horizTopY + mm(46), wallZ + mm(150));
heading.rotation.x = -0.30;
gMain.add(heading);
var headingProp = new THREE.Mesh(new THREE.BoxGeometry(mm(120), mm(8), mm(52)), matRail);
headingProp.position.set(-mm(215), horizTopY + mm(4), wallZ + mm(150)); gMain.add(headingProp);

// detail prompt, at the coupon
var promptCard = cardMesh(190, 42, function (x, w, h, ppm) {
  PG.text(x, CFG.copy.detailPrompt, 11.5 * ppm, 18 * ppm, { x: 10 * ppm, weight: 700 });
  PG.text(x, 'Lift the coupon. The groove is machined into one panel.', 6.6 * ppm, 32 * ppm,
    { x: 10 * ppm, weight: 500, colour: '#5c5a56' });
});
promptCard.position.set(mm(215), horizTopY + mm(3), wallZ + mm(285));
promptCard.rotation.x = -Math.PI / 2 + 0.12;
gMain.add(promptCard);

/* ═══════════════ UNIT B — the palette area ═══════════════ */
var B = { w: mm(I.palette.width), d: mm(I.palette.depth) };
[[-0.19, -0.06], [0.19, -0.06], [-0.19, -0.24], [0.19, -0.24]].forEach(function (p) {
  var pad = new THREE.Mesh(new THREE.BoxGeometry(0.06, padT, 0.06), matPad);
  pad.position.set(p[0], padT / 2, p[1]); gPal.add(pad);
});
var palTray = new THREE.Mesh(new THREE.BoxGeometry(B.w, trayT, B.d), matTray);
palTray.position.set(0, padT + trayT / 2, -B.d / 2);
palTray.castShadow = true; palTray.receiveShadow = true;
gPal.add(palTray);

// three Growth samples
var sampleW = mm(I.palette.sampleSize);
var sampleGap = mm(14);
var samples = [], sampleZ = -mm(150);
for (var i = 0; i < I.palette.sampleCount; i++) {
  var sx = (i - 1) * (sampleW + sampleGap);
  var sm = new THREE.Mesh(new THREE.BoxGeometry(sampleW, mm(I.horizontal.thickness), sampleW), sampleMats[i]);
  PG.planarUV(sm.geometry, sampleW / 2, sampleW / 2, mm(TILE), 'xz');
  sm.position.set(sx, trayTop + mm(I.horizontal.thickness) / 2, sampleZ);
  sm.castShadow = true; sm.receiveShadow = true;
  gPal.add(sm);
  samples.push({ mesh: sm, x: sx });
}

// which Growth surface is currently paired with the counter fragment
var marker = new THREE.Mesh(new THREE.CylinderGeometry(mm(7), mm(7), mm(16), 18), matMarker);
marker.castShadow = true;
marker.position.set(0, trayTop + mm(8), sampleZ + sampleW / 2 + mm(22));
gPal.add(marker);

// Growth identity card — proposed credit, attributed to Growth only
var idCard = cardMesh(I.palette.width - 20, 74, function (x, w, h, ppm) {
  PG.text(x, 'Growth', 15 * ppm, 24 * ppm, { x: 12 * ppm, weight: 700 });
  PG.text(x, CFG.copy.growthCredit, 7.4 * ppm, 41 * ppm, { x: 12 * ppm, weight: 500, colour: '#3d3c39' });
  PG.text(x, 'Wall Tiles and Growth are specified separately.', 6.4 * ppm, 56 * ppm,
    { x: 12 * ppm, weight: 500, colour: '#6c6a66' });
  // review placeholder only — not a scannable code, destination not supplied
  x.strokeStyle = '#9a9793'; x.lineWidth = 1 * ppm;
  x.setLineDash([3 * ppm, 3 * ppm]);
  x.strokeRect(w - 60 * ppm, 16 * ppm, 44 * ppm, 44 * ppm);
  x.setLineDash([]);
  x.textAlign = 'center';
  PG.text(x, 'QR', 8 * ppm, 36 * ppm, { x: w - 38 * ppm, align: 'center', weight: 600, colour: '#9a9793' });
  PG.text(x, 'placeholder', 5.2 * ppm, 46 * ppm, { x: w - 38 * ppm, align: 'center', weight: 500, colour: '#9a9793' });
  x.textAlign = 'left';
});
idCard.position.set(0, trayTop + mm(30), -B.d + mm(34));
idCard.rotation.x = -1.10;
gPal.add(idCard);
var idProp = new THREE.Mesh(new THREE.BoxGeometry(B.w - mm(60), mm(8), mm(46)), matRail);
idProp.position.set(0, trayTop + mm(4), -B.d + mm(52)); gPal.add(idProp);

// question card, flat at the front
var qCard = cardMesh(340, 62, function (x, w, h, ppm) {
  PG.text(x, CFG.copy.action, 9.5 * ppm, 15 * ppm, { x: 10 * ppm, weight: 700 });
  var yy = 30 * ppm;
  CFG.questions.forEach(function (q) {
    PG.text(x, '·  ' + q.label, 9 * ppm, yy, { x: 12 * ppm, weight: 600, colour: '#26251f' });
    yy += 13 * ppm;
  });
});
qCard.position.set(0, trayTop + mm(2), -mm(34));
qCard.rotation.x = -Math.PI / 2;
gPal.add(qCard);

// the visitor's chosen question, marked physically
var qMarker = new THREE.Mesh(new THREE.SphereGeometry(mm(7), 18, 12), matMarker);
qMarker.castShadow = true;
gPal.add(qMarker);
function questionY(idx) { return -mm(34) + mm(62) / 2 - mm(24) - idx * mm(12); }
function setQuestionMarker(idx) {
  qMarker.position.set(-mm(186), trayTop + mm(9), questionY(idx));
}
setQuestionMarker(0);

// neutral wood and metal references — separate choices, not product partners
var refs = [];
CFG.references.forEach(function (r, k) {
  var rm = new THREE.MeshStandardMaterial({ color: new THREE.Color(r.colour).convertSRGBToLinear(),
    roughness: r.rough, metalness: r.metal || 0, envMapIntensity: 0.4 });
  var chip = new THREE.Mesh(new THREE.BoxGeometry(mm(60), mm(12), mm(60)), rm);
  chip.position.set((k ? 1 : -1) * mm(212), trayTop + mm(6), -mm(38));
  chip.castShadow = true; gPal.add(chip);
  refs.push(chip);
});

/* ── surface selection ────────────────────────────────────────────────────
   Wall product and Growth surface are INDEPENDENT. There is deliberately no
   "match the wall" control: same-pattern availability is not confirmed.     */
var state = { wall: 'medium', growth: 'light', question: CFG.questions[0].id };

function setWall(id) {
  state.wall = id;
  applySurface(matWall, id);
  applySurface(matCoupon, id);
  ctx.invalidate();
}
function setGrowth(id) {
  state.growth = id;
  applySurface(matHoriz, id);
  var idx = CFG.surfaces.findIndex(function (s) { return s.id === id; });
  marker.position.x = samples[idx].x;
  ctx.invalidate();
}
function setQuestion(id) {
  state.question = id;
  var idx = CFG.questions.findIndex(function (q) { return q.id === id; });
  setQuestionMarker(idx);
  ctx.invalidate();
}
CFG.surfaces.forEach(function (s, i) { applySurface(sampleMats[i], s.id); });
setWall(state.wall); setGrowth(state.growth);

/* ── inspect: only the coupon moves ───────────────────────────────────────
   Nothing load-bearing is removed, and the main wall panel never leaves the
   composition.                                                              */
var inspectT = 0;
function setInspect(t) {
  inspectT = PG.clamp(t, 0, 1);
  var e = inspectT * inspectT * (3 - 2 * inspectT);
  couponPivot.position.set(
    couponHome.position.x - mm(55) * e,
    couponHome.position.y + mm(I.coupon.liftHeight) * e,
    couponHome.position.z + mm(155) * e
  );
  couponPivot.rotation.set(couponHome.rotation.x - 0.34 * e, -0.95 * e, 0.13 * e);
  ctx.invalidate();
}

/* ── footprint check ──────────────────────────────────────────────────────
   Overhang and intersection are reported, never absorbed by quietly making
   the counter deeper.                                                       */
function unitCorners(u) {
  var c = [];
  [[-1, 0], [1, 0], [1, 1], [-1, 1]].forEach(function (s) {
    c.push(place(u.theta + I.extraRotation * 0, s[0] * u.w / 2, -s[1] * u.d));
  });
  return c;
}
function checkFootprint() {
  var out = [], rIn = mm(CFG.counter.outerRadius - CFG.counter.depthAtActiveZone), rOut = mm(CFG.counter.outerRadius);
  var worstOut = 0, worstIn = 0, minA = 999, maxA = -999;
  [UNITS.main, UNITS.palette].forEach(function (u) {
    unitCorners(u).forEach(function (p) {
      var dx = p.x, dz = p.y - cz;
      var r = Math.sqrt(dx * dx + dz * dz);
      var a = Math.atan2(dx, -dz) / D2R;
      minA = Math.min(minA, a); maxA = Math.max(maxA, a);
      if (r > rOut) worstOut = Math.max(worstOut, r - rOut);
      if (r < rIn)  worstIn  = Math.max(worstIn,  rIn - r);
    });
  });
  if (worstOut > 0.0005) out.push({ level: 'fail', text: 'Overhangs the glazing side of the counter by ' + Math.round(worstOut * 1000) + ' mm' });
  if (worstIn > 0.0005)  out.push({ level: 'fail', text: 'Overhangs the room side of the counter by ' + Math.round(worstIn * 1000) + ' mm' });
  if (worstOut <= 0.0005 && worstIn <= 0.0005) out.push({ level: 'ok', text: 'Footprint sits within the ' + CFG.counter.depthAtActiveZone + ' mm counter depth' });

  if (minA < CFG.counter.startAngle || maxA > CFG.counter.endAngle)
    out.push({ level: 'fail', text: 'Extends past the end of the counter run' });

  // envelope, measured along the counter front edge
  var arc = (maxA - minA) * D2R * rFront * 1000;
  var fits = arc <= I.allocatedLength;
  out.push({ level: fits ? 'ok' : 'fail',
    text: 'Envelope ' + Math.round(arc) + ' mm along the counter ' + (fits ? '(allocated ' : 'EXCEEDS allocated ') +
          I.allocatedLength + ' mm' + (fits ? ')' : '') });

  var depthOK = I.activeDepth <= CFG.counter.depthAtActiveZone;
  out.push({ level: depthOK ? 'ok' : 'fail',
    text: 'Active depth ' + I.activeDepth + ' mm ' + (depthOK ? 'within' : 'EXCEEDS') +
          ' counter depth ' + CFG.counter.depthAtActiveZone + ' mm' });

  // the credenza occupies the right-hand end of the counter
  if (maxA > 52) out.push({ level: 'fail', text: 'Runs into the existing credenza at the counter end' });

  return out;
}

return {
  groups: { main: gMain, palette: gPal },
  units: UNITS, place: place, rFront: rFront, thetaA: thetaA, thetaB: thetaB,
  anchors: {
    wallZ: wallZ, trayTop: trayTop, horizTopY: horizTopY, horizFrontZ: horizFrontZ,
    wallTopY: trayTop + mm(I.wall.height), couponPivot: couponPivot
  },
  grooveCount: wallPanel.userData.grooveCount,
  state: state, setWall: setWall, setGrowth: setGrowth, setQuestion: setQuestion,
  setInspect: setInspect, getInspect: function () { return inspectT; },
  checkFootprint: checkFootprint,
  surfaceCanvas: surfaceCanvas
};
};
