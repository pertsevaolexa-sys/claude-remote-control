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
var thetaB = thetaA + ((mm(I.gapBetweenUnits) + halfA + halfB) / rFront) / D2R;

var halfC = mm(I.translucentUnit.width) / 2;
var thetaC = thetaB + ((mm(I.gapBetweenUnits) + halfB + halfC) / rFront) / D2R;

var UNITS = {
  main:        { theta: thetaA, w: mm(I.wall.width),            d: mm(I.activeDepth) },
  palette:     { theta: thetaB, w: mm(I.palette.width),         d: mm(I.palette.depth) },
  translucent: { theta: thetaC, w: mm(I.translucentUnit.width), d: mm(I.translucentUnit.depth) }
};

function unitGroup(theta) {
  var g = new THREE.Group();
  var p = place(theta, 0, 0);
  g.position.set(p.x, V.CT.h, p.y);
  g.rotation.y = -theta * D2R + I.extraRotation * D2R;
  scene.add(g);
  return g;
}
var gMain  = unitGroup(UNITS.main.theta);
var gPal   = unitGroup(UNITS.palette.theta);
var gTrans = unitGroup(UNITS.translucent.theta);

/* ── surfaces ─────────────────────────────────────────────────────────────
   Wall Tiles carry the four core colours; Growth is its own range. The two
   lists are separate because the two products are specified separately.     */
var TILE = CFG.surfaceTileSize;
var ALL_SURFACES = CFG.wallColours.concat(CFG.growthSurfaces);
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
var matCoupon = surfaceMaterial(I.coupon.width, I.coupon.height, 37);
// one material per engraved Growth sample. They all carry the SELECTED Growth
// surface, so the row compares engravings rather than colours.
var sampleMats = CFG.engravings.map(function (e, i) {
  return surfaceMaterial(I.palette.sampleSize, I.palette.sampleSize, 51 + i * 13);
});

var matTray   = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.44, metalness: 0.62, envMapIntensity: 0.5 });
var matRail   = new THREE.MeshStandardMaterial({ color: 0x1d1f21, roughness: 0.5,  metalness: 0.55, envMapIntensity: 0.45 });
var matPad    = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95, envMapIntensity: 0.2 });
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

/* ═══════════════ UNIT A — the main fragment ═══════════════ */
var A = { d: mm(I.activeDepth), w: mm(I.wall.width) };
var trayT = mm(6), padT = mm(I.base.padThickness);

[[-0.30, -0.06], [0.30, -0.06], [-0.30, -0.34], [0.30, -0.34]].forEach(function (p) {
  var pad = new THREE.Mesh(new THREE.BoxGeometry(0.07, padT, 0.07), matPad);
  pad.position.set(p[0], padT / 2, p[1]); gMain.add(pad);
});

var tray = new THREE.Mesh(new THREE.BoxGeometry(A.w, trayT, A.d), matTray);
tray.position.set(0, padT + trayT / 2, -A.d / 2);
tray.castShadow = true; tray.receiveShadow = true;
gMain.add(tray);
var trayTop = padT + trayT;

var wallZ = -A.d + mm(50);
var wallPanel = engravedPanel(I.wall.width, I.wall.height, I.wall.thickness, matWall, [I.wall.engraving]);
showEngraving(wallPanel, I.wall.engraving.id);
wallPanel.position.set(0, trayTop + mm(I.wall.height) / 2, wallZ - mm(I.wall.thickness) / 2);
gMain.add(wallPanel);

[-1, 1].forEach(function (s) {
  var fin = new THREE.Mesh(new THREE.BoxGeometry(A.w, mm(26), mm(8)), matRail);
  fin.position.set(0, trayTop + mm(13), wallZ - mm(I.wall.thickness) - mm(4) + (s > 0 ? mm(I.wall.thickness) + mm(8) : 0));
  fin.castShadow = true; gMain.add(fin);
});
[-1, 1].forEach(function (s) {
  var shp = new THREE.Shape();
  shp.moveTo(0, 0); shp.lineTo(mm(150), 0); shp.lineTo(0, mm(210)); shp.closePath();
  var gus = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: mm(6), bevelEnabled: false }), matRail);
  gus.position.set(s * (A.w / 2 - mm(20)), trayTop, wallZ - mm(I.wall.thickness));
  gus.rotation.y = -Math.PI / 2;
  gus.castShadow = true; gMain.add(gus);
});

var railH = mm(I.horizontal.topAboveCounter - I.horizontal.thickness) - trayTop;
[-1, 1].forEach(function (s) {
  var rail = new THREE.Mesh(new THREE.BoxGeometry(mm(40), railH, mm(290)), matRail);
  rail.position.set(s * mm(260), trayTop + railH / 2, wallZ + mm(20) + mm(290) / 2);
  rail.castShadow = true; rail.receiveShadow = true;
  gMain.add(rail);
});

var horiz = new THREE.Mesh(new THREE.BoxGeometry(mm(I.horizontal.width), mm(I.horizontal.thickness), mm(I.horizontal.depth)), matHoriz);
PG.planarUV(horiz.geometry, mm(I.horizontal.width) / 2, mm(I.horizontal.depth) / 2, mm(TILE), 'xz');
horiz.position.set(0, mm(I.horizontal.topAboveCounter) - mm(I.horizontal.thickness) / 2, wallZ + mm(I.horizontal.depth) / 2);
horiz.castShadow = true; horiz.receiveShadow = true;
gMain.add(horiz);
var horizTopY = mm(I.horizontal.topAboveCounter);
var horizFrontZ = wallZ + mm(I.horizontal.depth);

/* ── the handled coupon, in its cradle ──────────────────────────────────── */
var coupon = engravedPanel(I.coupon.width, I.coupon.height, I.wall.thickness, matCoupon, [I.wall.engraving]);
showEngraving(coupon, I.wall.engraving.id);
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
var palTray = new THREE.Mesh(new THREE.BoxGeometry(B.w, trayT, B.d), matTray);
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

/* the engraved Growth collection: one 150 mm sample per supplied engraving,
   lying flat so the machined pattern reads under the daylight. All four carry
   the selected Growth surface, so the row compares ENGRAVINGS; the colour
   choice is made on the swatches and applies to all of them.
   NOTE: this replaces the brief's three plain colour positions with four
   engraved ones, at the client's direction. */
var sampleW = mm(I.palette.sampleSize), sampleZ = -mm(200);
var samplePitch = sampleW + mm(I.palette.sampleGap);
var samples = [];
CFG.engravings.forEach(function (e, i) {
  var sx = (i - (CFG.engravings.length - 1) / 2) * samplePitch;
  var panel = engravedPanel(I.palette.sampleSize, I.palette.sampleSize,
                            I.horizontal.thickness, sampleMats[i], [e]);
  showEngraving(panel, e.id);
  panel.rotation.x = -Math.PI / 2;          // lay it flat, engraving upward
  panel.position.set(sx, trayTop + mm(I.horizontal.thickness) / 2, sampleZ);
  gPal.add(panel);
  samples.push({ panel: panel, x: sx, engraving: e.id });
});
// the marker shows which engraving the visitor chose
var marker = new THREE.Mesh(new THREE.CylinderGeometry(mm(7), mm(7), mm(16), 18), matMarker);
marker.castShadow = true;
marker.position.set(0, trayTop + mm(8), sampleZ + sampleW / 2 + mm(20));
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
var boxZ = -mm(330);
var boxes = [
  sampleBox(I.sampleBoxes[0], -mm(120), boxZ, true),
  sampleBox(I.sampleBoxes[1],  mm(120), boxZ, true)
];

/* ── the Translucent Collection box ───────────────────────────────────────
   From the supplied photograph: a deep presentation box of upright
   translucent blocks, lid hinged at the back and standing open with the
   collection printed inside it. Proportions are read off the photograph.
   The blocks are rendered as high-opacity glossy resin rather than true
   transmission — an approximation, so eleven overlapping panes cannot
   mis-sort, and cheap enough to stay smooth on a laptop. */
/* ── UNIT C — the Translucent Collection box, to the right ────────────────
   Its own tray, beside the Growth palette rather than behind it. This is
   what spends the envelope: see the fit check. */
var TU = I.translucentUnit, TB = I.translucentBox;
var transTrayTop = padT + trayT;
[[-0.13, -0.04], [0.13, -0.04], [-0.13, -0.14], [0.13, -0.14]].forEach(function (p) {
  var pad = new THREE.Mesh(new THREE.BoxGeometry(0.055, padT, 0.055), matPad);
  pad.position.set(p[0], padT / 2, p[1]); gTrans.add(pad);
});
var transTray = new THREE.Mesh(new THREE.BoxGeometry(mm(TU.width), trayT, mm(TU.depth)), matTray);
transTray.position.set(0, padT + trayT / 2, -mm(TU.depth) / 2);
transTray.castShadow = true; transTray.receiveShadow = true;
gTrans.add(transTray);

var transBox = (function () {
  var g = new THREE.Group();
  g.position.set(0, transTrayTop, -mm(90));
  gTrans.add(g);
  var shell = new THREE.MeshStandardMaterial({ color: srgb(TB.shell), roughness: 0.9, envMapIntensity: 0.18 });
  var W = mm(TB.width), D = mm(TB.depth), H = mm(TB.height);

  // the box, and the pale insert the blocks stand on
  var faceC = PG.cardCanvas(TB.width, TB.height, function (x, w, h, ppm) {
    x.fillStyle = TB.shell; x.fillRect(0, 0, w, h);
    PG.text(x, TB.mark, 17 * ppm, h * 0.62, { x: 20 * ppm, weight: 700, colour: '#ffffff' });
    x.textAlign = 'right';
    PG.text(x, TB.title, 5.2 * ppm, h * 0.60, { x: w - 20 * ppm, align: 'right', weight: 500,
      colour: 'rgba(255,255,255,0.72)', spacing: 0.8 * ppm });
    x.textAlign = 'left';
  });
  var faceM = new THREE.MeshStandardMaterial({ map: PG.cardTexture(THREE, faceC), roughness: 0.9, envMapIntensity: 0.18 });
  var body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [shell, shell, shell, shell, faceM, shell]);
  body.position.y = H / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  var insert = new THREE.Mesh(new THREE.BoxGeometry(W - mm(20), mm(4), D - mm(20)),
    new THREE.MeshStandardMaterial({ color: srgb(TB.insert), roughness: 0.95, envMapIntensity: 0.2 }));
  insert.position.y = H - mm(2); g.add(insert);

  // eleven translucent blocks, fanned as they are in the photograph
  var bk = TB.block, ang = bk.angle * D2R;
  TB.blocks.forEach(function (col, i) {
    var c = srgb(col);
    var m = new THREE.MeshStandardMaterial({
      color: c, roughness: 0.10, metalness: 0.0,
      transparent: true, opacity: 0.93, envMapIntensity: 1.1,
      emissive: c.clone().multiplyScalar(0.14)
    });
    var b2 = new THREE.Mesh(new THREE.BoxGeometry(mm(bk.width), mm(bk.height), mm(bk.depth)), m);
    b2.position.set((i - (bk.count - 1) / 2) * mm(bk.pitch), H - mm(4) + mm(bk.height) / 2 - mm(28), 0);
    b2.rotation.y = ang;
    b2.castShadow = true;
    g.add(b2);
  });

  // the lid, hinged at the back and standing open
  var lidC = PG.cardCanvas(TB.width, TB.lidHeight, function (x, w, h, ppm) {
    x.fillStyle = TB.insert; x.fillRect(0, 0, w, h);
    x.textAlign = 'center';
    PG.text(x, TB.brandLine, 5.2 * ppm, h * 0.15, { x: w / 2, align: 'center', weight: 500,
      colour: '#4a4a48', spacing: 1.1 * ppm });
    PG.text(x, 'TRANSLUCENT', 14 * ppm, h * 0.31, { x: w / 2, align: 'center', weight: 400, colour: '#26262a' });
    PG.text(x, 'COLLECTION', 14 * ppm, h * 0.45, { x: w / 2, align: 'center', weight: 400, colour: '#26262a' });
    x.textAlign = 'left';
  });
  var lidM = new THREE.MeshStandardMaterial({ map: PG.cardTexture(THREE, lidC), roughness: 0.92, envMapIntensity: 0.18 });
  var lean = TB.lidLean * D2R, LH = mm(TB.lidHeight);
  var lid = new THREE.Mesh(new THREE.BoxGeometry(W, LH, mm(TB.lidThickness)),
    [shell, shell, shell, shell, lidM, shell]);
  lid.position.set(0, H + LH / 2 * Math.cos(lean), -D / 2 - LH / 2 * Math.sin(lean));
  lid.rotation.x = -lean;
  lid.castShadow = true; g.add(lid);
  return g;
})();

/* ── selection ────────────────────────────────────────────────────────────
   Wall colour, wall engraving and Growth surface are three INDEPENDENT
   choices. There is deliberately no "match the wall" control: same-pattern
   availability is not confirmed.                                            */
var state = {
  wall: CFG.wallColours[0].id,
  engraving: CFG.engravings[0].id,
  growth: CFG.growthSurfaces[0].id,
  question: CFG.questions[0].id
};

function setWall(id) {
  state.wall = id;
  applySurface(matWall, id);
  applySurface(matCoupon, id);
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
  applySurface(matHoriz, id);
  // every engraved sample is Growth material: this IS the Growth collection
  // carrying the four supplied engravings
  sampleMats.forEach(function (m) { applySurface(m, id); });
  ctx.invalidate();
}
function setQuestion(id) {
  state.question = id;
  setQuestionMarker(CFG.questions.findIndex(function (q) { return q.id === id; }));
  ctx.invalidate();
}
setWall(state.wall); setGrowth(state.growth); setEngraving(state.engraving); setQuestionMarker(0);

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

return {
  groups: { main: gMain, palette: gPal, translucent: gTrans },
  units: UNITS, place: place, rFront: rFront, thetaA: thetaA, thetaB: thetaB, thetaC: thetaC,
  anchors: {
    wallZ: wallZ, trayTop: trayTop, horizTopY: horizTopY, horizFrontZ: horizFrontZ,
    wallTopY: trayTop + mm(I.wall.height), couponPivot: couponPivot,
    samplesZ: sampleZ, boxZ: boxZ
  },
  state: state,
  setWall: setWall, setEngraving: setEngraving, setGrowth: setGrowth, setQuestion: setQuestion,
  setInspect: setInspect, getInspect: function () { return inspectT; },
  checkFootprint: checkFootprint,
  surfaceCanvas: surfaceCanvas,
  samples: samples, boxes: boxes
};
};
