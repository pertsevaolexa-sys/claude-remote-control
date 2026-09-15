/* ═══════════════════════════════════════════════════════════════════════════
   THE INSTALLATION — Polygood Wall Tiles + Growth, on the existing counter

   Three readable parts:
     A  a vertical Wall Tiles fragment carrying one engraving at full size,
        with a real exposed edge, and the other three engravings leaning
        against it as 130 mm tiles
     A  a horizontal Growth fragment meeting it at an inspectable junction
     B  a palette: three Growth choices, two sample boxes, references, and a
        project-question card

   CONSTRUCTION NOTE, which is the whole point of the piece:
   a GROOVE is machined into ONE continuous panel. A JOINT is the line between
   two panels. They are different conditions. Nothing here is modelled as loose
   square tiles with grout, and no panel-to-panel joint is shown, because no
   manufacturer detail has been supplied.

   Everything here is concept geometry. No dimension is a site measurement, no
   texture is colour-accurate, no support is engineered, and the host counter's
   load capacity is unknown.
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

function radial(a) { var t = a * D2R; return new THREE.Vector2(Math.sin(t), -Math.cos(t)); }
function tangent(a) { var t = a * D2R; return new THREE.Vector2(Math.cos(t), Math.sin(t)); }

function place(aDeg, lx, lz) {
  var n = radial(aDeg), t = tangent(aDeg);
  return new THREE.Vector2(
    n.x * rFront + t.x * lx - n.x * lz,
    cz + n.y * rFront + t.y * lx - n.y * lz
  );
}

var thetaA = I.setOutAngle;
var halfA = mm(I.wall.width) / 2, halfB = mm(I.palette.width) / 2;

/* Set the second unit out ALONG THE ARC — the way it would be measured on a
   curved counter on site. Straight-line distance between the facing corners
   is V-shaped in thetaB (large, zero where they touch, large again), so
   bisecting on it is not just imprecise: past a certain palette width it
   converges on the wrong branch and stacks both units on the same spot. */
/* thetaB is set below, after the Growth stand takes its place between the
   installation and the palette. */

/* Set out as built, from the photograph. Left to right along the counter:
   the Translucent A4, the Translucent bar, Stand 2, the Growth A4 with its
   sample tray, then the flat colour row with the two sample boxes. */
var halfG = mm(I.growthStand.unit.width) / 2;
var halfC = mm(I.translucentUnit.width) / 2;
var thetaC = thetaA - ((mm(I.gapBetweenUnits) + halfA + halfC) / rFront) / D2R;
var thetaG = thetaA + ((mm(I.gapBetweenUnits) + halfA + halfG) / rFront) / D2R;
var thetaB = thetaG + ((mm(I.gapBetweenUnits) + halfG + halfB) / rFront) / D2R;

var halfD = mm(I.introStand.unit.width) / 2;
var thetaD = thetaC - ((mm(I.gapBetweenUnits) + halfC + halfD) / rFront) / D2R;

var UNITS = {
  intro:       { theta: thetaD, w: mm(I.introStand.unit.width),  d: mm(I.introStand.unit.depth) },
  main:        { theta: thetaA, w: mm(I.wall.width),             d: mm(I.activeDepth) },
  growth:      { theta: thetaG, w: mm(I.growthStand.unit.width), d: mm(I.growthStand.unit.depth) },
  palette:     { theta: thetaB, w: mm(I.palette.width),          d: mm(I.palette.depth) },
  translucent: { theta: thetaC, w: mm(I.translucentUnit.width),  d: mm(I.translucentUnit.depth) }
};

function unitGroup(theta) {
  var g = new THREE.Group();
  var p = place(theta, 0, 0);
  g.position.set(p.x, V.CT.h, p.y);
  g.rotation.y = -theta * D2R + I.extraRotation * D2R;
  scene.add(g);
  return g;
}
var gIntro  = unitGroup(UNITS.intro.theta);
var gMain   = unitGroup(UNITS.main.theta);
var gGrowth = unitGroup(UNITS.growth.theta);
var gPal    = unitGroup(UNITS.palette.theta);
var gTrans  = unitGroup(UNITS.translucent.theta);

/* ── surfaces ─────────────────────────────────────────────────────────────
   Wall Tiles carry the four core colours; Growth is its own range. The two
   lists are separate because the two products are specified separately.     */
var TILE = CFG.surfaceTileSize;
var ALL_SURFACES = CFG.wallColours.concat(CFG.growthSurfaces).concat(CFG.standSurfaces || []);
var surfaceCanvas = {};
ALL_SURFACES.forEach(function (s) { surfaceCanvas[s.id] = PG.surfaceCanvas(s, TILE, 1024); });

function surfaceMaterial(wMm, hMm, seed) {
  var m = new THREE.MeshStandardMaterial({
    color: 0xffffff,          // legacy colour mode: 0xffffff is neutral
    roughness: 0.74,          // matte. Deliberately not a polished stone shader.
    metalness: 0.0,
    envMapIntensity: 0.30
  });
  m.userData = { wMm: wMm, hMm: hMm, seed: seed };
  return m;
}
function applySurface(mat, id) {
  var u = mat.userData;
  var t = PG.surfaceTexture(THREE, surfaceCanvas[id], TILE, u.wMm, u.hMm, u.seed);
  if (mat.map) mat.map.dispose();
  mat.map = t; mat.needsUpdate = true;
  if (u.floor) { u.floor.map = t; u.floor.needsUpdate = true; }
}
/* the groove floor sits in its own shadow. Same material, held slightly back,
   standing in for occlusion inside a 4 mm recess that no shadow map at this
   scale resolves. Kept slight: a uniformly dark recess is what grout looks
   like, and that is the one reading this piece exists to avoid. */
function floorMaterial(mat) {
  if (!mat.userData.floor) {
    var f = mat.clone();
    f.color = new THREE.Color(0.93, 0.93, 0.93);
    f.envMapIntensity = 0.16;
    mat.userData.floor = f;
  }
  return mat.userData.floor;
}

var matWall   = surfaceMaterial(I.wall.width, I.wall.height, 11);
var matHoriz  = surfaceMaterial(I.horizontal.width, I.horizontal.depth, 23);
/* applied once, from CFG.finish.underPanel, below the surface tables */
var matCoupon = surfaceMaterial(I.coupon.width, I.coupon.height, 37);
// one material per engraved Growth sample. They all carry the SELECTED Growth
// surface, so the row compares engravings rather than colours.
var bannerTopY = 0, brochureTheta = 0;
var TILECOUNT = I.palette.cols * I.palette.rows;
var sampleMats = [];
for (var ti = 0; ti < TILECOUNT; ti++) {
  sampleMats.push(surfaceMaterial(I.palette.tile.width, I.palette.tile.height, 51 + ti * 13));
}
/* the small collaboration box carries Growth too, so it follows the swatch */
var collabChipMats = [];
var INITIAL_GROWTH = (function () {
  var want = (CFG.defaults || {}).growth;
  var hit = CFG.growthSurfaces.find(function (g) { return g.id === want; });
  return (hit || CFG.growthSurfaces[0]).id;
})();

/* The stands are white; the tile they stand on is black. Both come from
   CFG.finish so the production group can move either without touching code.
   Legacy colour management is on, so every hex here goes through srgb(). */
var FIN = CFG.finish;
var matRail = new THREE.MeshStandardMaterial({
  color: srgb(FIN.stand), roughness: FIN.standRough, metalness: FIN.standMetal, envMapIntensity: 0.42 });
var matPad  = new THREE.MeshStandardMaterial({
  color: srgb(FIN.pad), roughness: 0.95, envMapIntensity: 0.2 });

/* The base is a PANEL, not a painted tray, so it carries the surface rather
   than a flat colour — and it is UV-mapped from its own extents like every
   other panel, or the tile pattern would stretch to each face. */
function trayMesh(wM, dM, seed) {
  var geo = new THREE.BoxGeometry(wM, trayT, dM);
  PG.planarUV(geo, wM / 2, dM / 2, mm(TILE));
  var m = surfaceMaterial(wM * 1000, dM * 1000, seed);
  applySurface(m, FIN.baseTile);
  var mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
var matMarker = new THREE.MeshStandardMaterial({ color: 0x8a6a2e, roughness: 0.35, metalness: 0.8, envMapIntensity: 0.6 });
function srgb(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

/* ── engraved panels ──────────────────────────────────────────────────────
   A full-extent backing slab — the continuous panel body, and what the
   exposed edge shows — with raised fields standing proud of it. The gaps
   between the fields ARE the machined grooves. Every field is eased at its
   top edge: the bright line that puts along each groove is the strongest cue
   that the groove was cut into the surface rather than filled between tiles.

   Fields are UV-mapped from their position IN THE PANEL, so the material runs
   unbroken through every groove.                                            */
var BEV = mm(1.2);

function rectShape(w, h) {
  var s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2);   s.lineTo(-w / 2, h / 2);
  s.closePath(); return s;
}
/* Jade: a fan/fish-scale field — straight sides and top, the bottom bowing
   down to the cell edge. Control point placed so the arc bottoms exactly on
   -h/2 and never runs into the row below. */
function scallopShape(w, h) {
  var s = new THREE.Shape(), lift = h * 0.30;
  s.moveTo(-w / 2, -h / 2 + lift);
  s.quadraticCurveTo(0, -h / 2 - lift, w / 2, -h / 2 + lift);
  s.lineTo(w / 2, h / 2);
  s.lineTo(-w / 2, h / 2);
  s.closePath(); return s;
}

function fieldGeometry(shape, gd, zOff, cx, cy, W, H, tile) {
  var geo = new THREE.ExtrudeGeometry(shape, {
    depth: gd - 2 * BEV, bevelEnabled: true, bevelThickness: BEV,
    bevelSize: BEV, bevelOffset: 0, bevelSegments: 1, curveSegments: 8
  });
  geo.translate(cx, cy, zOff);
  PG.planarUV(geo, W / 2, H / 2, tile);
  return geo;
}

/* builds the raised-field layer for one engraving on one panel */
function engravingLayer(eng, wMm, hMm, tMm) {
  var W = mm(wMm), H = mm(hMm), T = mm(tMm), tile = mm(TILE);
  var gw = mm(CFG.groove.width), gd = mm(CFG.groove.depth);
  var cw = mm(eng.cellW), ch = mm(eng.cellH);
  var fw = cw - gw, fh = ch - gw;
  var nx = Math.ceil(W / cw), ny = Math.ceil(H / ch);
  var x0 = -(nx * cw) / 2, y0 = -(ny * ch) / 2;
  var zOff = T / 2 - gd + BEV;
  var geos = [];

  for (var iy = 0; iy < ny; iy++) {
    for (var ix = 0; ix < nx; ix++) {
      var cx = x0 + (ix + 0.5) * cw, cy = y0 + (iy + 0.5) * ch;
      // clip the field to the panel: this is a cropped fragment, so partial
      // cells at the edges are correct
      var l = Math.max(cx - fw / 2, -W / 2), r = Math.min(cx + fw / 2, W / 2);
      var b = Math.max(cy - fh / 2, -H / 2), t = Math.min(cy + fh / 2, H / 2);
      if (r - l < mm(2) || t - b < mm(2)) continue;
      var clipped = (r - l < fw - 1e-6) || (t - b < fh - 1e-6);
      var shape = (eng.shape === 'scallop' && !clipped)
        ? scallopShape(fw, fh)
        : rectShape(r - l, t - b);
      geos.push(fieldGeometry(shape, gd, zOff, clipped ? (l + r) / 2 : cx,
                              clipped ? (b + t) / 2 : cy, W, H, tile));
    }
  }
  return PG.merge(THREE, geos);
}

/* a panel that can show any of the four engravings — all four are built once
   and switched by visibility, so changing engraving is instant */
function engravedPanel(wMm, hMm, tMm, material, list) {
  var W = mm(wMm), H = mm(hMm), T = mm(tMm), gd = mm(CFG.groove.depth);
  var g = new THREE.Group();

  var slab = new THREE.BoxGeometry(W, H, T - gd);
  PG.planarUV(slab, W / 2, H / 2, mm(TILE));
  var backing = new THREE.Mesh(slab, floorMaterial(material));
  backing.position.z = -gd / 2;
  backing.castShadow = true; backing.receiveShadow = true;
  g.add(backing);

  var layers = {};
  (list || CFG.engravings).forEach(function (e) {
    var m = new THREE.Mesh(engravingLayer(e, wMm, hMm, tMm), material);
    m.castShadow = true; m.receiveShadow = true;
    m.visible = false;
    layers[e.id] = m;
    g.add(m);
  });
  g.userData.layers = layers;
  return g;
}
function showEngraving(panel, id) {
  var L = panel.userData.layers;
  Object.keys(L).forEach(function (k) { L[k].visible = (k === id); });
}

/* ═══════════════ UNIT A — Stand 2, from the gExpo holders spec ═══════════
   Base 450 x 420 x 19, one 450 x 450 x 12 panel standing in a 12.1 slot cut
   5 deep at 274.9 from the front edge, two 90 x 90 gussets in front and two
   120 x 120 behind, and a 180 x 120 x 12 tile leaning back 15 degrees in a
   190 x 15.64 slot, 60 from the front edge and 90 to the right.

   Nothing is glued. Both samples drop in from above and lift out the same
   way, which is what makes the small one a handled piece. */
var S2 = I.stand2;
var A = { w: mm(S2.base.width), d: mm(S2.base.depth) };
var trayT = mm(S2.base.thickness), padT = mm(I.base.padThickness);

[[-0.18, -0.05], [0.18, -0.05], [-0.18, -0.36], [0.18, -0.36]].forEach(function (p) {
  var pad = new THREE.Mesh(new THREE.BoxGeometry(0.06, padT, 0.06), matPad);
  pad.position.set(p[0], padT / 2, p[1]); gMain.add(pad);
});

/* the base is a Polygood part, so it carries the surface like every panel */
var tray = trayMesh(A.w, A.d, 71);
tray.position.set(0, padT + trayT / 2, -A.d / 2);
gMain.add(tray);
var trayTop = padT + trayT;

/* the standing panel, dropped into its slot */
var wallZ = -mm(S2.panelSlot.fromFront);
var panelDrop = mm(S2.panelSlot.depth);
var wallPanel = engravedPanel(I.wall.width, I.wall.height, I.wall.thickness, matWall, [I.wall.engraving]);
showEngraving(wallPanel, I.wall.engraving.id);
wallPanel.position.set(0, trayTop - panelDrop + mm(I.wall.height) / 2, wallZ);
gMain.add(wallPanel);
var wallTop = trayTop - panelDrop + mm(I.wall.height);

/* the slot itself, so the panel reads as sitting IN the base rather than on it */
var slotMat = new THREE.MeshStandardMaterial({ color: srgb('#0d0d0f'), roughness: 0.95 });
var slot = new THREE.Mesh(
  new THREE.BoxGeometry(mm(S2.panelSlot.width), mm(S2.panelSlot.depth), mm(S2.panelSlot.kerf)), slotMat);
slot.position.set(0, trayTop - mm(S2.panelSlot.depth) / 2 + mm(0.4), wallZ);
gMain.add(slot);

/* gussets — flush with the panel edges, front pair small, back pair large */
function gusset(sizeMm, thickMm, xSign, behind) {
  var sz = mm(sizeMm), th = mm(thickMm);
  var shp = new THREE.Shape();
  shp.moveTo(0, 0); shp.lineTo(behind ? -sz : sz, 0); shp.lineTo(0, sz); shp.closePath();
  var g = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: th, bevelEnabled: false }), matWall);
  g.rotation.y = -Math.PI / 2;
  g.position.set(xSign * (mm(I.wall.width) / 2 - th / 2) + th / 2,
                 trayTop,
                 wallZ + (behind ? -mm(I.wall.thickness) / 2 : mm(I.wall.thickness) / 2));
  g.castShadow = true; g.receiveShadow = true;
  gMain.add(g);
}
[-1, 1].forEach(function (sgn) {
  gusset(S2.gussetFront.size, S2.gussetFront.thickness, sgn, false);
  gusset(S2.gussetBack.size,  S2.gussetBack.thickness,  sgn, true);
});

/* ── the 180 x 120 tile, leaning back in its slot ────────────────────────
   This is the handled piece now: it lifts straight out, which is the whole
   demonstration. The slot is cut 15.64 wide for a 12 mm sample so the tile
   wedges at its lean angle — 12 / cos15 + 12 x tan15. */
var TL = S2.tile;
var tileLean = TL.lean * D2R;
var tileX = mm(TL.offsetRight), tileZ = -mm(TL.fromFront);

var tileSlot = new THREE.Mesh(
  new THREE.BoxGeometry(mm(TL.slotLength), mm(TL.slotDepth), mm(TL.slotKerf)), slotMat);
tileSlot.position.set(tileX, trayTop - mm(TL.slotDepth) / 2 + mm(0.4), tileZ);
gMain.add(tileSlot);

var coupon = engravedPanel(TL.width, TL.height, TL.thickness, matCoupon, [I.wall.engraving]);
showEngraving(coupon, I.wall.engraving.id);
var couponHome = new THREE.Object3D();
couponHome.position.set(tileX,
  trayTop - mm(TL.slotDepth) + mm(TL.height) / 2 * Math.cos(tileLean),
  tileZ - mm(TL.height) / 2 * Math.sin(tileLean));
couponHome.rotation.x = -tileLean;
var couponPivot = new THREE.Group();
couponPivot.position.copy(couponHome.position);
couponPivot.rotation.copy(couponHome.rotation);
couponPivot.add(coupon);
gMain.add(couponPivot);

/* kept for the cards and the annotation leaders, which used to hang off the
   horizontal shelf this stand no longer has */
var horizTopY = trayTop + mm(TL.height) * 0.5;
var horizFrontZ = tileZ + mm(60);


/* ── printed cards ────────────────────────────────────────────────────────
   No recycling statistics, no certification badges, no prices, no awards, no
   city silhouette, and no scannable QR — the destination has not been
   supplied, so the placeholder is plainly a placeholder.                    */
function cardMesh(wMm, hMm, draw) {
  var c = PG.cardCanvas(wMm, hMm, draw);
  var face = new THREE.MeshStandardMaterial({ map: PG.cardTexture(THREE, c), roughness: 0.86, envMapIntensity: 0.25 });
  var edge = new THREE.MeshStandardMaterial({ color: 0xd8d5cd, roughness: 0.9, envMapIntensity: 0.2 });
  return new THREE.Mesh(new THREE.BoxGeometry(mm(wMm), mm(hMm), mm(2.5)),
    [edge, edge, edge, edge, face, edge]);
}

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

var promptCard = cardMesh(190, 42, function (x, w, h, ppm) {
  PG.text(x, CFG.copy.detailPrompt, 11.5 * ppm, 18 * ppm, { x: 10 * ppm, weight: 700 });
  PG.text(x, 'Lift the coupon. The groove is machined into one panel.', 6.6 * ppm, 32 * ppm,
    { x: 10 * ppm, weight: 500, colour: '#5c5a56' });
});
promptCard.position.set(mm(215), horizTopY + mm(3), wallZ + mm(285));
promptCard.rotation.x = -Math.PI / 2 + 0.12;
gMain.add(promptCard);

/* ═══════════════ UNIT B — the palette ═══════════════ */
var B = { w: mm(I.palette.width), d: mm(I.palette.depth) };
[[-0.19, -0.06], [0.19, -0.06], [-0.19, -0.32], [0.19, -0.32]].forEach(function (p) {
  var pad = new THREE.Mesh(new THREE.BoxGeometry(0.06, padT, 0.06), matPad);
  pad.position.set(p[0], padT / 2, p[1]); gPal.add(pad);
});
var palTray = trayMesh(B.w, B.d, 73);
palTray.position.set(0, padT + trayT / 2, -B.d / 2);
palTray.castShadow = true; palTray.receiveShadow = true;
gPal.add(palTray);

/* identity and question, two cards on two rows — as they were. The Translucent
   box no longer needs the depth: it has its own unit to the right. */
var FRONT_Z = -mm(30), CARD_W = 480, CARD_D = 54;
var frontCard = cardMesh(CARD_W, CARD_D, function (x, w, h, ppm) {
  PG.text(x, 'Growth', 12 * ppm, 17 * ppm, { x: 11 * ppm, weight: 700 });
  PG.text(x, CFG.copy.growthCredit, 5.6 * ppm, 28 * ppm, { x: 11 * ppm, weight: 500, colour: '#3d3c39' });
  PG.text(x, 'Wall Tiles and Growth are specified separately.', 5.0 * ppm, 38 * ppm,
    { x: 11 * ppm, weight: 500, colour: '#6c6a66' });
  x.strokeStyle = '#9a9793'; x.lineWidth = 1 * ppm; x.setLineDash([3 * ppm, 3 * ppm]);
  x.strokeRect(11 * ppm, 41 * ppm, 22 * ppm, 10 * ppm); x.setLineDash([]);
  PG.text(x, 'QR placeholder', 4.2 * ppm, 48 * ppm, { x: 14 * ppm, weight: 500, colour: '#9a9793' });
  x.strokeStyle = '#c9c5bc'; x.lineWidth = 1 * ppm;
  x.beginPath(); x.moveTo(248 * ppm, 8 * ppm); x.lineTo(248 * ppm, (CARD_D - 8) * ppm); x.stroke();
  PG.text(x, CFG.copy.action, 8 * ppm, 16 * ppm, { x: 262 * ppm, weight: 700 });
  var yy = 28 * ppm;
  CFG.questions.forEach(function (q) {
    PG.text(x, '\u00b7  ' + q.label, 7.4 * ppm, yy, { x: 264 * ppm, weight: 600, colour: '#26251f' });
    yy += 10.5 * ppm;
  });
});
frontCard.position.set(0, trayTop + mm(2), FRONT_Z);
frontCard.rotation.x = -Math.PI / 2;
gPal.add(frontCard);

var qMarker = new THREE.Mesh(new THREE.SphereGeometry(mm(6), 18, 12), matMarker);
qMarker.castShadow = true; gPal.add(qMarker);
function questionY(idx) { return FRONT_Z + mm(CARD_D) / 2 - mm(25) - idx * mm(10.5); }
function setQuestionMarker(idx) { qMarker.position.set(mm(16), trayTop + mm(8), questionY(idx)); }

CFG.references.forEach(function (r, k) {
  var rm = new THREE.MeshStandardMaterial({ color: srgb(r.colour), roughness: r.rough,
    metalness: r.metal || 0, envMapIntensity: 0.4 });
  var chip = new THREE.Mesh(new THREE.BoxGeometry(mm(56), mm(12), mm(56)), rm);
  chip.position.set((k ? 1 : -1) * mm(282), trayTop + mm(6), FRONT_Z);
  chip.castShadow = true; gPal.add(chip);
});

/* The engraved tile grid is gone. What lies on the counter as built is a row
   of PLAIN colour samples — the engraved demonstration is the tile that lifts
   out of Stand 2, not this row. */
var FR = I.palette.flatRow;
var sampleZ = -mm(110), pitchZ = mm(140), gridX = 0, sampleW = mm(FR.width);
var samples = [];
(function () {
  var fw = mm(FR.width), fh = mm(FR.height), ft = mm(FR.thickness);
  var pitch = fw + mm(FR.gap);
  FR.surfaces.forEach(function (id, i) {
    var m = surfaceMaterial(FR.width, FR.height, 201 + i * 9);
    applySurface(m, id);
    var geo = new THREE.BoxGeometry(fw, ft, fh);
    PG.planarUV(geo, fw / 2, fh / 2, mm(TILE));
    var t = new THREE.Mesh(geo, m);
    t.position.set((i - (FR.surfaces.length - 1) / 2) * pitch, trayTop + ft / 2, sampleZ);
    t.castShadow = true; t.receiveShadow = true;
    gPal.add(t);
    samples.push({ panel: t, x: t.position.x, z: sampleZ, engraving: null });
  });
})();
// the marker shows which engraving the visitor chose
var marker = new THREE.Mesh(new THREE.CylinderGeometry(mm(7), mm(7), mm(16), 18), matMarker);
marker.castShadow = true;
marker.position.set(gridX, trayTop + mm(8), sampleZ + pitchZ / 2 + mm(16));
gPal.add(marker);

/* ── the two Polygood sample boxes ────────────────────────────────────────
   Modelled from the supplied product photographs: a shallow tray of upright
   material sticks, with the lid standing behind it. Proportions are read off
   those photographs — this is not a measured product drawing, and the lid
   copy is reproduced from the photograph rather than authored here.         */
var SB = I.sampleBox;
var stickPalette = ['#2f5fa8', '#1d3f7a', '#161616', '#0f0f10', '#e8e6df', '#cfd2d1',
                    '#8e8e8b', '#5f6260', '#186b52', '#0f4a38', '#efeadc', '#dcd8c8'];
function sampleBox(spec, x, z, withLid) {
  var g = new THREE.Group();
  g.position.set(x, trayTop, z);
  gPal.add(g);
  var body = new THREE.MeshStandardMaterial({ color: srgb(spec.base), roughness: 0.92, envMapIntensity: 0.18 });

  var W = mm(SB.width), D = mm(SB.depth), H = mm(SB.height);
  var outer = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), body);
  outer.position.y = H / 2; outer.castShadow = true; outer.receiveShadow = true; g.add(outer);
  // the collar the photographs show sitting proud of the base
  var collar = new THREE.Mesh(new THREE.BoxGeometry(W - mm(6), mm(16), D - mm(6)), body);
  collar.position.y = H + mm(8); collar.castShadow = true; g.add(collar);

  // upright material sticks
  var st = SB.stick, r = PG.rng(spec.id === 'dark' ? 811 : 907);
  var pitch = (W - mm(24)) / st.count;
  for (var i = 0; i < st.count; i++) {
    var col = stickPalette[(r() * stickPalette.length) | 0];
    var sm = new THREE.MeshStandardMaterial({ color: srgb(col), roughness: 0.68, envMapIntensity: 0.3 });
    var s = new THREE.Mesh(new THREE.BoxGeometry(mm(st.width), mm(st.height), mm(st.depth)), sm);
    s.position.set(-W / 2 + mm(12) + (i + 0.5) * pitch, mm(st.height) / 2 + mm(4), 0);
    s.castShadow = true; g.add(s);
  }

  // the lid stands behind the tray as it does in the photograph — omitted
  // where the Translucent box sits directly behind
  if (!withLid) return g;
  var lidC = PG.cardCanvas(SB.width, SB.lidHeight, function (x2, w2, h2, ppm) {
    x2.fillStyle = spec.base; x2.fillRect(0, 0, w2, h2);
    x2.textAlign = 'center';
    if (spec.text) {
      // debossed: barely there, exactly as it photographs
      PG.text(x2, spec.text, 6.4 * ppm, h2 * 0.60, { x: w2 / 2, align: 'center', weight: 600, colour: 'rgba(255,255,255,0.17)' });
    }
    if (spec.mark) {
      PG.text(x2, 'polygood', 13 * ppm, h2 * 0.62, { x: w2 / 2, align: 'center', weight: 700, colour: '#ffffff' });
    }
    x2.textAlign = 'left';
  });
  var lidFace = new THREE.MeshStandardMaterial({ map: PG.cardTexture(THREE, lidC), roughness: 0.92, envMapIntensity: 0.18 });
  var lid = new THREE.Mesh(new THREE.BoxGeometry(mm(SB.width), mm(SB.lidHeight), mm(SB.lidThickness)),
    [body, body, body, body, lidFace, body]);
  lid.position.set(0, mm(SB.lidHeight) / 2, -D / 2 - mm(26));
  lid.rotation.x = -0.10;
  lid.castShadow = true; g.add(lid);
  return g;
}
/* Two general sample boxes — one black, one grey — stacked front-to-back at
   the right of the tile grid rather than behind it, so a visitor can reach a
   box and a tile without leaning across either. */
var boxZ = -mm(120);
var boxX = mm(230);
var boxes = [
  sampleBox(I.sampleBoxes[0], boxX, boxZ, true),
  sampleBox(I.sampleBoxes[1], boxX, boxZ - mm(112), true)
];

/* ── the Translucent Collection box ───────────────────────────────────────
   From the supplied photograph: a deep presentation box of upright
   translucent blocks, lid hinged at the back and standing open with the
   collection printed inside it. Proportions are read off the photograph.
   The blocks are rendered as high-opacity glossy resin rather than true
   transmission — an approximation, so eleven overlapping panes cannot
   mis-sort, and cheap enough to stay smooth on a laptop. */
/* ══════════════ supplied artwork, laid out from the approved copy ═════════
   The client showed us the printed sheets but did not hand over the files, so
   these are LAYOUTS: the wordmark, the headline and the body copy are set
   verbatim from what was supplied, and everything we cannot honestly redraw —
   the photography, the QR destinations, the certification marks, the
   global-warming figure — is reserved at true size and named. Nothing here
   asserts a claim the client has not already put in print, and no third-party
   mark is traced from a photograph.

   Drop a data URI into the matching `artwork` key and the real file replaces
   the layout whole. */

var ART = {
  polygoodGreen: '#7d9761',
  bannerGreen:   '#1d4f4a',
  growthBlue:    '#ccdaea',
  ink:           '#16181a',
  paper:         '#f2f0eb'
};

function artHelpers(x, ppm) {
  var FAM = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  function lines(str, px, maxW, weight) {
    x.font = (weight || 500) + ' ' + px + 'px ' + FAM;
    var words = str.split(' '), out = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (cur && x.measureText(t).width > maxW) { out.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }
  return {
    lines: lines,
    para: function (str, pxMm, X, Y, wMm, o) {
      o = o || {};
      var px = pxMm * ppm, ls = lines(str, px, wMm * ppm, o.weight), lead = px * (o.lead || 1.45);
      for (var i = 0; i < ls.length; i++) {
        PG.text(x, ls[i], px, Y * ppm + i * lead,
          { x: X * ppm, weight: o.weight || 500, colour: o.colour || ART.ink, align: o.align });
      }
      return Y + ls.length * lead / ppm;
    },
    /* a region of the real artwork this model does not reproduce */
    reserved: function (X, Y, wMm, hMm, caption, dark) {
      x.save();
      x.fillStyle = dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.05)';
      x.fillRect(X * ppm, Y * ppm, wMm * ppm, hMm * ppm);
      x.setLineDash([2.4 * ppm, 2 * ppm]);
      x.strokeStyle = dark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.22)';
      x.lineWidth = Math.max(1, 0.5 * ppm);
      x.strokeRect(X * ppm + 0.5, Y * ppm + 0.5, wMm * ppm - 1, hMm * ppm - 1);
      x.restore();
      var px = 3.4 * ppm, ls = lines(caption, px, (wMm - 8) * ppm, 500), lead = px * 1.32;
      var y0 = (Y + hMm / 2) * ppm - (ls.length - 1) * lead / 2 + px * 0.34;
      for (var i = 0; i < ls.length; i++) {
        PG.text(x, ls[i], px, y0 + i * lead,
          { x: (X + wMm / 2) * ppm, align: 'center', weight: 500,
            colour: dark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.45)' });
      }
    },
    /* the Polygood wordmark: the glyph is a simple folded arrow, set as a
       shape rather than traced from the photograph */
    wordmark: function (X, Y, sizeMm, colour) {
      var s = sizeMm * ppm, gx = X * ppm, gy = Y * ppm;
      x.save();
      x.strokeStyle = colour; x.lineWidth = s * 0.13; x.lineJoin = 'round'; x.lineCap = 'round';
      x.beginPath();
      x.moveTo(gx + s * 0.10, gy + s * 0.72);
      x.lineTo(gx + s * 0.50, gy + s * 0.10);
      x.lineTo(gx + s * 0.50, gy + s * 0.78);
      x.lineTo(gx + s * 0.90, gy + s * 0.78);
      x.stroke();
      x.restore();
      PG.text(x, 'polygood', s * 0.82, gy + s * 0.76,
        { x: gx + s * 1.12, weight: 700, colour: colour, family: FAM });
      return X + sizeMm * 1.12;
    },
    tag: function (X, Y, wMm, hMm, label, colour, ground) {
      x.save();
      x.strokeStyle = colour; x.lineWidth = Math.max(1, 0.45 * ppm);
      var r = hMm / 2 * ppm;
      x.beginPath();
      x.moveTo(X * ppm + r, Y * ppm);
      x.arcTo((X + wMm) * ppm, Y * ppm, (X + wMm) * ppm, (Y + hMm) * ppm, r);
      x.arcTo((X + wMm) * ppm, (Y + hMm) * ppm, X * ppm, (Y + hMm) * ppm, r);
      x.arcTo(X * ppm, (Y + hMm) * ppm, X * ppm, Y * ppm, r);
      x.arcTo(X * ppm, Y * ppm, (X + wMm) * ppm, Y * ppm, r);
      x.closePath(); x.stroke();
      x.fillStyle = colour;
      x.beginPath(); x.arc((X + hMm * 0.62) * ppm, (Y + hMm / 2) * ppm, hMm * 0.30 * ppm, 0, 6.3); x.fill();
      PG.text(x, label, 3.6 * ppm, (Y + hMm * 0.63) * ppm,
        { x: (X + hMm * 1.15) * ppm, weight: 500, colour: ground || ART.ink });
      x.restore();
    }
  };
}

/* ── LEFT A4: the Polygood introduction ─────────────────────────────────── */
function sheetIntro(x, W, H, ppm) {
  var h = artHelpers(x, ppm);
  x.fillStyle = ART.polygoodGreen; x.fillRect(0, 0, W, H);
  h.wordmark(96, 52, 15, '#ffffff');
  PG.text(x, 'A design material that’s 100% good', 11.5 * ppm, 96 * ppm,
    { x: W / 2, align: 'center', weight: 700, colour: '#ffffff' });
  h.para('A versatile, high-end surface material made from 100% recycled & recyclable ' +
         'plastic by The Good Plastic Company.',
         5.6, 58, 112, 180, { colour: 'rgba(255,255,255,0.90)', align: 'left' });
  PG.text(x, 'TEMPORARY A4 LAYOUT · set from the supplied catalogue cover', 3.4 * ppm,
    (210 - 12) * ppm, { x: W / 2, align: 'center', weight: 600, colour: 'rgba(255,255,255,0.55)' });
}

/* ── INSTALLATION A4: the Growth Collection ─────────────────────────────── */
function sheetGrowth(x, W, H, ppm) {
  var h = artHelpers(x, ppm);
  x.fillStyle = ART.growthBlue; x.fillRect(0, 0, W, H);
  // the supplied sheet runs photography down the right third
  h.reserved(178, 0, 119, 210, 'Collection photography — supplied artwork, not reproduced in this model');

  h.wordmark(16, 14, 8, ART.ink);
  PG.text(x, 'by the good plastic company', 3.2 * ppm, 30 * ppm,
    { x: 16 * ppm, weight: 500, colour: 'rgba(0,0,0,0.55)' });

  PG.text(x, 'The Growth', 20 * ppm, 66 * ppm, { x: 16 * ppm, weight: 700, colour: ART.ink });
  PG.text(x, 'Collection', 20 * ppm, 88 * ppm, { x: 16 * ppm, weight: 700, colour: ART.ink });
  PG.text(x, 'Inspired by nature. Made for tomorrow.', 6.4 * ppm, 108 * ppm,
    { x: 16 * ppm, weight: 500, colour: ART.ink });

  h.para('Created with Gensler as product design consultant, Growth draws on roots, ' +
         'plant life and natural formations. Recycled appliances and electronics become ' +
         'richly textured surfaces for furniture and interiors, giving discarded plastic ' +
         'a new life.',
         4.8, 16, 124, 146, { colour: 'rgba(0,0,0,0.78)' });

  h.reserved(16, 158, 26, 26, 'QR', false);
  PG.text(x, 'Explore the collection and order samples', 5.2 * ppm, 194 * ppm,
    { x: 16 * ppm, weight: 600, colour: ART.ink });
  PG.text(x, 'polygood.com', 4.2 * ppm, 203 * ppm,
    { x: 16 * ppm, weight: 500, colour: 'rgba(0,0,0,0.55)' });
}

/* ── LEFT A4: the Translucent Collection, as built ──────────────────────── */
function sheetTranslucent(x, W, H, ppm) {
  var h = artHelpers(x, ppm);
  x.fillStyle = '#e3d8c9'; x.fillRect(0, 0, W, H);
  h.reserved(178, 0, 119, 210, 'Collection photography \u2014 supplied artwork, not reproduced in this model');

  h.wordmark(16, 14, 8, ART.ink);
  PG.text(x, 'by the good plastic company', 3.2 * ppm, 30 * ppm,
    { x: 16 * ppm, weight: 500, colour: 'rgba(0,0,0,0.55)' });

  PG.text(x, 'The Translucent', 18 * ppm, 64 * ppm, { x: 16 * ppm, weight: 700, colour: ART.ink });
  PG.text(x, 'Collection', 18 * ppm, 85 * ppm, { x: 16 * ppm, weight: 700, colour: ART.ink });
  PG.text(x, 'Recycled surfaces that play with light.', 6.2 * ppm, 106 * ppm,
    { x: 16 * ppm, weight: 500, colour: ART.ink });

  h.para('Made from recycled CD cases, the Translucent Collection brings colour and ' +
         'depth to architectural surfaces. Its clear base and fine bubbles catch the ' +
         'light, creating a distinctive glow when backlit.',
         4.8, 16, 122, 146, { colour: 'rgba(0,0,0,0.78)' });

  h.reserved(16, 156, 26, 26, 'QR', false);
  PG.text(x, 'Explore the collection and order samples', 5.2 * ppm, 194 * ppm,
    { x: 16 * ppm, weight: 600, colour: ART.ink });
  PG.text(x, 'polygood.com', 4.2 * ppm, 203 * ppm,
    { x: 16 * ppm, weight: 500, colour: 'rgba(0,0,0,0.55)' });
}

/* ── the roll-up banner ─────────────────────────────────────────────────── */
function bannerCanvas(pw, ph) {
  return PG.cardCanvas(pw, ph, function (x, W, H, ppm) {
    var h = artHelpers(x, ppm);
    x.fillStyle = ART.bannerGreen; x.fillRect(0, 0, W, H);
    // the supplied banner carries a full-bleed material photograph at the top
    h.reserved(0, 0, pw, 300, 'Material photography — supplied artwork, not reproduced in this model', true);

    h.wordmark(40, 330, 26, '#ffffff');
    PG.text(x, 'by the good plastic company', 8 * ppm, 392 * ppm,
      { x: 40 * ppm, weight: 500, colour: 'rgba(255,255,255,0.72)' });
    PG.text(x, 'Surface material', 32 * ppm, 448 * ppm, { x: 40 * ppm, weight: 700, colour: '#ffffff' });
    PG.text(x, 'with a second life', 32 * ppm, 488 * ppm, { x: 40 * ppm, weight: 700, colour: '#ffffff' });

    // lower half: white panel, as on the supplied sheet
    x.fillStyle = ART.paper; x.fillRect(0, 560 * ppm, W, H - 560 * ppm);

    h.reserved(40, 590, 74, 74, 'QR', false);
    PG.text(x, 'Polygood®', 20 * ppm, 700 * ppm, { x: 40 * ppm, weight: 700, colour: ART.ink });
    h.para('The Good Plastic Company produces Polygood®, a surface material made from ' +
           'recycled and responsibly sourced plastic, and it is recyclable in turn.',
           7.4, 40, 722, pw - 80, { colour: 'rgba(0,0,0,0.78)' });

    PG.text(x, 'Material origin', 9 * ppm, 790 * ppm, { x: 40 * ppm, weight: 700, colour: ART.ink });
    h.para('Our panels have already lived a previous life. We source polystyrene from ' +
           'refrigerators and freezers, CD cases, disposable cups, toys and games, ' +
           'tableware and cutlery, and kitchen and office components — post-consumer ' +
           'and post-industrial waste streams.',
           5.6, 40, 804, 180, { colour: 'rgba(0,0,0,0.70)' });

    PG.text(x, 'Material health', 9 * ppm, 790 * ppm, { x: 240 * ppm, weight: 700, colour: ART.ink });
    h.para('Polygood® has undergone independent testing for chemical content and ' +
           'indoor-air emissions. We verify our recycled polystyrene suppliers to support ' +
           'traceability across the supply chain.',
           5.6, 240, 804, 180, { colour: 'rgba(0,0,0,0.70)' });

    h.reserved(40, 880, 180, 76,
      'Global warming potential figure and comparative claim — supplied artwork, not reproduced in this model');
    h.reserved(240, 880, 180, 76,
      'Certification and declaration marks — supplied artwork, not reproduced in this model');

    /* product properties: plain descriptive words, so these are set as printed */
    var props = ['High structural integrity', 'Lightweight', 'Recyclable',
                 'Thermoformable', 'Strong and durable', 'Consistent',
                 'Low emissions', 'Waterproof', 'Mouldproof'];
    var tw = 122, th = 20, gx = 12, gy = 9;
    props.forEach(function (p, i) {
      var col = i % 3, row = (i / 3) | 0;
      h.tag(40 + col * (tw + gx), 984 + row * (th + gy), tw, th, p, 'rgba(0,0,0,0.42)', ART.ink);
    });

    x.fillStyle = ART.ink; x.fillRect(0, (ph - 26) * ppm, W, 26 * ppm);
    PG.text(x, 'LAYOUT FROM APPROVED COPY — supply the print file to replace it',
      6 * ppm, (ph - 9) * ppm, { x: 40 * ppm, weight: 700, colour: 'rgba(255,255,255,0.80)' });
  }, 2);
}

/* ── the catalogue cover ────────────────────────────────────────────────── */
function brochureCanvas(size) {
  return PG.cardCanvas(size, size, function (x, W, H, ppm) {
    var h = artHelpers(x, ppm);
    x.fillStyle = ART.polygoodGreen; x.fillRect(0, 0, W, H);
    h.wordmark(58, 76, 15, '#ffffff');
    PG.text(x, 'A design material that’s 100% good', 9.2 * ppm, 114 * ppm,
      { x: W / 2, align: 'center', weight: 700, colour: '#ffffff' });
    h.para('A versatile, high-end surface material made from 100% recycled & recyclable ' +
           'plastic by The Good Plastic Company.',
           5.0, 38, 128, 124, { colour: 'rgba(255,255,255,0.88)' });
  }, 3);
}


/* ══════════════ the two A4 displays, and the collaboration box ════════════
   One holder design, used twice: a flat foot, a single triangular fin behind,
   and a low front lip. The fin is sized to carry the sheet at its lean and no
   more — a holder that reads as a fixture competes with what it is holding.

   The sheets themselves are laid out from the APPROVED COPY the client
   supplied. The artwork files were shown to us as images but not handed over,
   so photography, QR codes and certification marks are reserved and named
   rather than redrawn. Set `artwork` on either stand to a data URI and the
   real print file replaces the layout whole. */
var A4 = I.a4, PL = A4.plate, GU = A4.gusset;

function a4Stand(group, unitW, unitD, drawSheet, artwork, seed) {
  var lean = A4.lean * D2R;
  var padXs = [-unitW / 2 + mm(60), unitW / 2 - mm(60)];
  var padZs = [-mm(50), -unitD + mm(50)];
  padXs.forEach(function (px) {
    padZs.forEach(function (pz) {
      var pad = new THREE.Mesh(new THREE.BoxGeometry(0.05, padT, 0.05), matPad);
      pad.position.set(px, padT / 2, pz); group.add(pad);
    });
  });

  var tray = trayMesh(unitW, unitD, seed);
  tray.position.set(0, padT + trayT / 2, -unitD / 2);
  group.add(tray);
  var top = padT + trayT;

  /* A4_PLATE_19_337x250, standing 15 degrees off vertical, with one
     A4_GUSSET_19_90x70 centred behind it. The plate IS the holder — there is
     no separate foot or lip on the spec. */
  var pw = mm(PL.width), ph = mm(PL.height), pt = mm(PL.thickness);
  var plateMat = surfaceMaterial(PL.width, PL.height, seed + 4);
  applySurface(plateMat, A4.material);

  var plate = new THREE.Group();
  var baseZ = -unitD / 2 + mm(GU.width) / 2;
  plate.position.set(0, top + ph / 2 * Math.cos(lean), baseZ - ph / 2 * Math.sin(lean));
  plate.rotation.x = -lean;
  group.add(plate);

  var plateGeo = new THREE.BoxGeometry(pw, ph, pt);
  PG.planarUV(plateGeo, pw / 2, ph / 2, mm(TILE));
  var plateMesh = new THREE.Mesh(plateGeo, plateMat);
  plateMesh.castShadow = true; plateMesh.receiveShadow = true;
  plate.add(plateMesh);
  var footTop = top;

  /* the gusset: 90 deep, 70 high, one piece, centred at the back */
  var shp = new THREE.Shape();
  shp.moveTo(0, 0); shp.lineTo(-mm(GU.width), 0); shp.lineTo(0, mm(GU.height)); shp.closePath();
  var fin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shp, { depth: mm(GU.thickness), bevelEnabled: false }), plateMat);
  fin.rotation.y = -Math.PI / 2;
  fin.position.set(mm(GU.thickness) / 2, top, baseZ - pt / 2);
  fin.castShadow = true; group.add(fin);

  // the sheet sits on the plate face with a 20 mm border all round
  var sw = mm(A4.sheet.width), sh = mm(A4.sheet.height), st = mm(A4.sheet.thickness);
  var sheet = new THREE.Group();
  sheet.position.set(0, 0, pt / 2 + st / 2);
  plate.add(sheet);

  var board = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, st),
    new THREE.MeshStandardMaterial({ color: srgb('#f2f0eb'), roughness: 0.9, envMapIntensity: 0.18 }));
  board.castShadow = true; board.receiveShadow = true; sheet.add(board);

  var printMat;
  if (artwork) {
    var tex = new THREE.TextureLoader().load(artwork);
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    printMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, envMapIntensity: 0.2 });
  } else {
    printMat = new THREE.MeshStandardMaterial({
      map: PG.cardTexture(THREE, PG.cardCanvas(A4.sheet.width, A4.sheet.height, drawSheet)),
      roughness: 0.88, envMapIntensity: 0.2 });
  }
  var print = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), printMat);
  print.position.z = st / 2 + mm(0.5);
  sheet.add(print);

  return { top: footTop, sheet: sheet, trayTop: top };
}

/* ── LEFT display: the introduction ─────────────────────────────────────── */
(function () {
  var U = UNITS.intro;
  a4Stand(gIntro, U.w, U.d, function (x, w, h, ppm) {
    sheetTranslucent(x, w, h, ppm);
  }, I.introStand.artwork, 91);
})();

/* ── INSTALLATION display: the Growth Collection, with the small
      collaboration box in front of it ───────────────────────────────────── */
(function () {
  var U = UNITS.growth;
  var st = a4Stand(gGrowth, U.w, U.d, function (x, w, h, ppm) {
    sheetGrowth(x, w, h, ppm);
  }, I.growthStand.artwork, 97);

  /* the small Growth/Gensler collaboration box, open, lid laid back flat.
     Kept low and forward so it never stands in front of the sheet above it. */
  var CB = I.collabBox;
  var shellMat = new THREE.MeshStandardMaterial({ color: srgb(CB.shell), roughness: 0.62, envMapIntensity: 0.3 });
  var feltMat  = new THREE.MeshStandardMaterial({ color: srgb(CB.felt), roughness: 0.95, envMapIntensity: 0.15 });
  var bw = mm(CB.width), bd = mm(CB.depth), bh = mm(CB.height), lt = mm(CB.lidThickness);
  var boxZ = -mm(72);

  var tray = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), shellMat);
  tray.position.set(0, st.trayTop + bh / 2, boxZ);
  tray.castShadow = true; tray.receiveShadow = true; gGrowth.add(tray);

  var felt = new THREE.Mesh(new THREE.BoxGeometry(bw - mm(6), mm(1.5), bd - mm(6)), feltMat);
  felt.position.set(0, st.trayTop + bh - mm(0.5), boxZ); gGrowth.add(felt);

  // the lid, laid flat behind the tray so the samples stay visible
  var lid = new THREE.Mesh(new THREE.BoxGeometry(bw, lt, bd), shellMat);
  lid.position.set(0, st.trayTop + lt / 2, boxZ - bd - mm(4));
  lid.castShadow = true; gGrowth.add(lid);

  // Growth chips in the tray, carrying the selected Growth surface
  var C = CB.chip, cs = mm(C.size), cg = mm(C.gap);
  collabChipMats = [];
  for (var r = 0; r < C.rows; r++) {
    for (var c = 0; c < C.cols; c++) {
      var m = surfaceMaterial(C.size, C.size, 131 + r * 7 + c);
      applySurface(m, INITIAL_GROWTH);
      collabChipMats.push(m);
      var chip = new THREE.Mesh(new THREE.BoxGeometry(cs, mm(8), cs), m);
      chip.position.set((c - (C.cols - 1) / 2) * (cs + cg),
                        st.trayTop + bh + mm(4),
                        boxZ + (r - (C.rows - 1) / 2) * (cs + cg));
      chip.castShadow = true; gGrowth.add(chip);
    }
  }
})();


/* ── UNIT C — the Translucent block, from the gExpo spec ──────────────────
   A solid 300 x 80 x 80 bar with ten slots cut 15 x 65, 30 deep, at 25 pitch
   and turned 20 degrees clockwise in plan. The samples are 60 x 120 x 12 and
   stand 90 proud of the bar.

   The bar's fabrication is NOT settled on the spec — an 80 x 80 section does
   not come out of one 19 mm sheet — so it is drawn as a solid and labelled
   as such. No DXF was supplied for it. */
var TU = I.translucentUnit, TB = I.translucentBox;
var transTrayTop = padT + trayT;
[[-0.13, -0.04], [0.13, -0.04], [-0.13, -0.14], [0.13, -0.14]].forEach(function (p) {
  var pad = new THREE.Mesh(new THREE.BoxGeometry(0.055, padT, 0.055), matPad);
  pad.position.set(p[0], padT / 2, p[1]); gTrans.add(pad);
});
var transTray = trayMesh(mm(TU.width), mm(TU.depth), 83);
transTray.position.set(0, padT + trayT / 2, -mm(TU.depth) / 2);
gTrans.add(transTray);

(function () {
  var bw = mm(TB.barWidth), bd = mm(TB.barDepth), bh = mm(TB.barHeight);
  var barZ = -mm(TU.depth) / 2;
  var shellMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.74, metalness: 0, envMapIntensity: 0.3 });
  shellMat.userData = { wMm: TB.barWidth, hMm: TB.barHeight, seed: 61 };
  applySurface(shellMat, 'nightfleck');

  var barGeo = new THREE.BoxGeometry(bw, bh, bd);
  PG.planarUV(barGeo, bw / 2, bh / 2, mm(TILE));
  var bar = new THREE.Mesh(barGeo, shellMat);
  bar.position.set(0, transTrayTop + bh / 2, barZ);
  bar.castShadow = true; bar.receiveShadow = true;
  gTrans.add(bar);

  var SL = TB.slot, SM = TB.sample;
  var slotMat2 = new THREE.MeshStandardMaterial({ color: srgb('#0b0b0d'), roughness: 0.95 });
  var sw = mm(SM.width), sh = mm(SM.height), st = mm(SM.thickness);
  var seated = mm(SL.depth);                     // how far each sample sits in
  var ang = SL.angle * D2R;

  for (var i = 0; i < SL.count; i++) {
    var x = (i - (SL.count - 1) / 2) * mm(SL.pitch);

    // the slot mouth, turned 20 degrees in plan
    var mouth = new THREE.Mesh(
      new THREE.BoxGeometry(mm(SL.length), mm(2), mm(SL.width)), slotMat2);
    mouth.position.set(x, transTrayTop + bh - mm(1), barZ);
    mouth.rotation.y = -ang;
    gTrans.add(mouth);

    /* translucent stock: a thin slab that lets the daylight through rather
       than a painted block. Colours are ILLUSTRATIVE — the real range is not
       in front of us. */
    var col = TB.blocks[i % TB.blocks.length];
    var m = new THREE.MeshStandardMaterial({
      color: srgb(col), roughness: 0.32, metalness: 0.0,
      transparent: true, opacity: 0.74, envMapIntensity: 0.7 });
    var s = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, st), m);
    s.position.set(x, transTrayTop + bh - seated + sh / 2, barZ);
    s.rotation.y = -ang;
    s.castShadow = true;
    gTrans.add(s);
  }
})();


/* ── selection ────────────────────────────────────────────────────────────
   Wall colour, wall engraving and Growth surface are three INDEPENDENT
   choices. There is deliberately no "match the wall" control: same-pattern
   availability is not confirmed.                                            */
var DEF = CFG.defaults || {};
/* the opening selection only — every entry in every list stays selectable */
function startId(list, wanted) {
  var hit = list.find(function (x) { return x.id === wanted; });
  return (hit || list[0]).id;
}
var state = {
  wall: startId(CFG.wallColours, DEF.wall),
  engraving: startId(CFG.engravings, DEF.engraving),
  growth: startId(CFG.growthSurfaces, DEF.growth),
  question: startId(CFG.questions, DEF.question)
};

function setWall(id) {
  state.wall = id;
  applySurface(matWall, id);
  /* matCoupon is NOT driven by the wall swatch: the 180 x 120 tile is
     Midnight while the panel above it is Oyster. */
  ctx.invalidate();
}
function setEngraving(id) {
  state.engraving = id;
  var s = samples.find(function (x) { return x.engraving === id; });
  if (s) marker.position.x = s.x;
  ctx.invalidate();
}
function setGrowth(id) {
  state.growth = id;
  // matHoriz is NOT driven by the swatch any more — see finish.underPanel
  // every engraved sample is Growth material: this IS the Growth collection
  // carrying the four supplied engravings
  sampleMats.forEach(function (m) { applySurface(m, id); });
  collabChipMats.forEach(function (m) { applySurface(m, id); });
  ctx.invalidate();
}
function setQuestion(id) {
  state.question = id;
  setQuestionMarker(CFG.questions.findIndex(function (q) { return q.id === id; }));
  ctx.invalidate();
}
/* the marker followed index 0 rather than the state, which only matched
   while the opening question was the first one */
/* the panel beneath is fixed from CFG.finish.underPanel; the swatch drives
   the tiles and the collaboration chips only */
applySurface(matHoriz, (CFG.finish && CFG.finish.underPanel) || state.growth);
applySurface(matCoupon, I.stand2.tileSurface);
setWall(state.wall); setGrowth(state.growth); setEngraving(state.engraving); setQuestion(state.question);

/* ── inspect: only the coupon moves ───────────────────────────────────── */
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
    c.push(place(u.theta, s[0] * u.w / 2, -s[1] * u.d));
  });
  return c;
}
function checkFootprint() {
  var out = [], rIn = mm(CFG.counter.outerRadius - CFG.counter.depthAtActiveZone), rOut = mm(CFG.counter.outerRadius);
  var worstOut = 0, worstIn = 0, minA = 999, maxA = -999;
  Object.keys(UNITS).map(function (k) { return UNITS[k]; }).forEach(function (u) {
    unitCorners(u).forEach(function (p) {
      var dx = p.x, dz = p.y - cz, r = Math.sqrt(dx * dx + dz * dz);
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

  var arc = (maxA - minA) * D2R * rFront * 1000;
  var fits = arc <= I.allocatedLength;
  out.push({ level: fits ? 'ok' : 'fail',
    text: 'Envelope ' + Math.round(arc) + ' mm along the counter ' + (fits ? '(allocated ' : 'EXCEEDS allocated ') +
          I.allocatedLength + ' mm' + (fits ? ')' : '') });

  var depths = Math.max(I.activeDepth, I.palette.depth);
  var depthOK = depths <= CFG.counter.depthAtActiveZone;
  out.push({ level: depthOK ? 'ok' : 'fail',
    text: 'Deepest unit ' + depths + ' mm ' + (depthOK ? 'within' : 'EXCEEDS') +
          ' counter depth ' + CFG.counter.depthAtActiveZone + ' mm' });

  if (maxA > 52) out.push({ level: 'fail', text: 'Runs into the existing credenza at the counter end' });
  return out;
}


/* ══════════════ booth pieces that stand on the floor ══════════════════════
   The roll-up and the catalogues are not part of the counter installation, so
   they live in their own group. They are still shown when the room is hidden:
   they are the display, not the venue. */
var gBooth = new THREE.Group();
scene.add(gBooth);

(function () {
  var BN = I.banner;
  var gw = mm(BN.graphicWidth), gh = mm(BN.graphicHeight);
  var cassH = mm(BN.cassetteHeight), cassD = mm(BN.cassetteDepth);

  /* In the credenza's own frame: along its length, then out toward the room,
     and turned to face the way the credenza faces. */
  var CR = BN.credenza;
  var o = V.bayPt(CR.angle, mm(CR.radius), 0);
  var th = -CR.angle * D2R;
  var along = mm(BN.alongCredenza), out = mm(BN.outFromCredenza);
  var g = new THREE.Group();
  g.position.set(o.x + along * Math.cos(th) + out * Math.sin(th), 0,
                 o.z - along * Math.sin(th) + out * Math.cos(th));
  g.rotation.y = th;
  gBooth.add(g);

  var metal = new THREE.MeshStandardMaterial({
    color: srgb('#d9dadb'), roughness: 0.38, metalness: 0.72, envMapIntensity: 0.5 });
  var dark = new THREE.MeshStandardMaterial({
    color: srgb('#4a4d50'), roughness: 0.55, metalness: 0.4, envMapIntensity: 0.4 });

  // cassette
  var cass = new THREE.Mesh(new THREE.BoxGeometry(gw + mm(40), cassH, cassD), metal);
  cass.position.set(0, cassH / 2, 0);
  cass.castShadow = true; cass.receiveShadow = true; g.add(cass);

  // two flip-out feet, so it is not standing on nothing
  [-1, 1].forEach(function (sgn) {
    var foot = new THREE.Mesh(new THREE.BoxGeometry(mm(26), mm(14), mm(BN.footSpread)), dark);
    foot.position.set(sgn * (gw / 2 + mm(6)), mm(7), 0);
    foot.castShadow = true; g.add(foot);
  });

  // the support pole, behind the graphic
  var pole = new THREE.Mesh(
    new THREE.CylinderGeometry(mm(BN.poleDiameter) / 2, mm(BN.poleDiameter) / 2, gh, 14), metal);
  pole.position.set(0, cassH + gh / 2, -cassD / 2 + mm(26));
  pole.castShadow = true; g.add(pole);

  // the graphic itself
  var artMat;
  if (BN.artwork) {
    var tex = new THREE.TextureLoader().load(BN.artwork);
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    artMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, envMapIntensity: 0.16 });
  } else {
    artMat = new THREE.MeshStandardMaterial({
      map: PG.cardTexture(THREE, bannerCanvas(BN.graphicWidth, BN.graphicHeight)),
      roughness: 0.9, envMapIntensity: 0.16 });
  }
  var back = new THREE.MeshStandardMaterial({ color: srgb('#cfd0cd'), roughness: 0.95 });
  var panel = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, mm(3)), [back, back, back, back, artMat, back]);
  panel.position.set(0, cassH + gh / 2, mm(1));
  panel.castShadow = true; panel.receiveShadow = true; g.add(panel);

  bannerTopY = cassH + gh;
})();

/* three catalogues, within reach at the banner end of the counter */
(function () {
  var BR = I.brochure, sz = mm(BR.size), th = mm(BR.thickness);
  var coverMat = new THREE.MeshStandardMaterial({
    map: PG.cardTexture(THREE, brochureCanvas(BR.size)), roughness: 0.86, envMapIntensity: 0.2 });
  var edge = new THREE.MeshStandardMaterial({ color: srgb('#e8e6df'), roughness: 0.95 });

  /* set out on the counter beyond the last unit, on the credenza side, so a
     visitor can pick one up on the way past without reaching over a sample */
  var theta = BR.angleAtBay;   // fixed, at the banner end of the counter
  var p = place(theta, 0, 0);
  var g = new THREE.Group();
  g.position.set(p.x, V.CT.h, p.y);
  g.rotation.y = -theta * D2R;
  gBooth.add(g);
  brochureTheta = theta;

  for (var i = 0; i < BR.count; i++) {
    var b = new THREE.Mesh(new THREE.BoxGeometry(sz, th, sz),
      [edge, edge, coverMat, edge, edge, edge]);
    b.position.set(i * mm(BR.step) * 0.34, th / 2 + i * th, -sz / 2 - mm(40) + i * mm(BR.step) * 0.5);
    b.rotation.y = (i - 1) * 0.045;
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }
})();

return {
  groups: { intro: gIntro, main: gMain, growth: gGrowth, palette: gPal,
            translucent: gTrans, booth: gBooth },
  units: UNITS, place: place, rFront: rFront,
  thetaA: thetaA, thetaB: thetaB, thetaC: thetaC, thetaD: thetaD, thetaG: thetaG,
  bannerTopY: function () { return bannerTopY; },
  brochureTheta: function () { return brochureTheta; },
  anchors: {
    wallZ: wallZ, trayTop: trayTop, horizTopY: horizTopY, horizFrontZ: horizFrontZ,
    wallTopY: wallTop, couponPivot: couponPivot,
    samplesZ: sampleZ, boxZ: boxZ, boxX: boxX
  },
  state: state,
  setWall: setWall, setEngraving: setEngraving, setGrowth: setGrowth, setQuestion: setQuestion,
  setInspect: setInspect, getInspect: function () { return inspectT; },
  checkFootprint: checkFootprint,
  surfaceCanvas: surfaceCanvas,
  samples: samples, boxes: boxes
};
};
