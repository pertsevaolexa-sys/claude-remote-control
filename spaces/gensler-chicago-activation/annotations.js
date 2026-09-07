/* ═══════════════════════════════════════════════════════════════════════════
   DIMENSIONS AND ANNOTATIONS

   Every number drawn here is read live from config.js. Nothing is typed twice.
   All of it is concept information: no dimension is a site measurement and no
   note is an approval.
   ═══════════════════════════════════════════════════════════════════════════ */

window.PG_ANNO = function (ctx) {
"use strict";

var THREE = ctx.THREE, scene = ctx.scene, CFG = ctx.CFG, V = ctx.venue, INS = ctx.install;
var mm = PG.mm, D2R = Math.PI / 180;
var I = CFG.install;

var dimsPlan = new THREE.Group();   dimsPlan.visible = false;   scene.add(dimsPlan);
var dimsHeight = new THREE.Group(); dimsHeight.visible = false; scene.add(dimsHeight);
var dimNote = new THREE.Group();    dimNote.visible = false;    scene.add(dimNote);
var dims = dimsPlan;
var notes = new THREE.Group(); notes.visible = false; scene.add(notes);
var band  = new THREE.Group(); band.visible = false;  scene.add(band);

var lineMat = new THREE.LineBasicMaterial({ color: 0x1b3a5c, depthTest: false, transparent: true, opacity: 0.95 });
var leadMat = new THREE.LineBasicMaterial({ color: 0x7a2a3c, depthTest: false, transparent: true, opacity: 0.95 });

function label(text, sub, tone) {
  var pad = 16, ppm = 3;
  var probe = PG.canvas(8, 8).getContext('2d');
  probe.font = '600 ' + 13 * ppm + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
  var w1 = probe.measureText(text).width;
  probe.font = '500 ' + 9.5 * ppm + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
  var w2 = sub ? probe.measureText(sub).width : 0;
  var w = Math.max(w1, w2) + pad * 2 * ppm;
  var h = (sub ? 46 : 30) * ppm;
  var c = PG.canvas(Math.ceil(w), Math.ceil(h)), x = c.getContext('2d');
  x.fillStyle = tone === 'note' ? 'rgba(20,17,18,0.90)' : 'rgba(12,18,26,0.90)';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = tone === 'note' ? '#c4576b' : '#5b9ad6';
  x.fillRect(0, 0, 3 * ppm, c.height);
  x.fillStyle = '#f2efe9';
  x.font = '600 ' + 13 * ppm + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
  x.fillText(text, pad * ppm, (sub ? 20 : 20) * ppm);
  if (sub) {
    x.fillStyle = '#a8a49c';
    x.font = '500 ' + 9.5 * ppm + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
    x.fillText(sub, pad * ppm, 37 * ppm);
  }
  var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false }));
  var scale = 0.00072;
  sp.scale.set(c.width * scale, c.height * scale, 1);
  sp.renderOrder = 950;
  return sp;
}

function polyline(pts, mat, parent) {
  var g = new THREE.BufferGeometry().setFromPoints(pts);
  var l = new THREE.Line(g, mat || lineMat);
  l.renderOrder = 940;
  (parent || dims).add(l);
  return l;
}

/* a dimension between two world points, offset perpendicular, with ticks */
function dimension(a, b, off, text, parent) {
  var A = a.clone().add(off), B = b.clone().add(off);
  polyline([a, A], lineMat, parent);
  polyline([b, B], lineMat, parent);
  polyline([A, B], lineMat, parent);
  var dir = B.clone().sub(A).normalize().multiplyScalar(0.035);
  var perp = off.clone().normalize().multiplyScalar(0.022);
  polyline([A.clone().sub(dir).sub(perp), A.clone().add(dir).add(perp)], lineMat, parent);
  polyline([B.clone().sub(dir).sub(perp), B.clone().add(dir).add(perp)], lineMat, parent);
  var sp = label(text);
  sp.position.copy(A).add(B).multiplyScalar(0.5).add(off.clone().normalize().multiplyScalar(0.075));
  (parent || dims).add(sp);
  return sp;
}

function leader(from, to, text, sub) {
  polyline([from, to], leadMat, notes);
  var dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x7a2a3c, depthTest: false, toneMapped: false }));
  dot.position.copy(from); dot.renderOrder = 945; notes.add(dot);
  var sp = label(text, sub, 'note');
  sp.position.copy(to);
  notes.add(sp);
  return sp;
}

/* world helper: a point in the main unit's local frame */
function mainPt(lx, ly, lz) {
  var v = new THREE.Vector3(lx, ly, lz);
  INS.groups.main.updateMatrixWorld();
  return v.applyMatrix4(INS.groups.main.matrixWorld);
}
function palPt(lx, ly, lz) {
  var v = new THREE.Vector3(lx, ly, lz);
  INS.groups.palette.updateMatrixWorld();
  return v.applyMatrix4(INS.groups.palette.matrixWorld);
}

/* ── plan dimensions ──────────────────────────────────────────────────── */
var yPlan = V.CT.h + mm(I.wall.height) + 0.16;
var A = INS.units.main, B = INS.units.palette;

function frontCorner(u, side) {
  var p = INS.place(u.theta, side * u.w / 2, 0);
  return new THREE.Vector3(p.x, V.CT.h + 0.02, p.y);
}
var aL = frontCorner(A, -1), aR = frontCorner(A, 1);
var bL = frontCorner(B, -1), bR = frontCorner(B, 1);
var outward = new THREE.Vector3(0, 0, 0.30);

dimension(aL, aR, new THREE.Vector3(0, 0, 0.30), I.wall.width + ' mm  main fragment', dimsPlan);
dimension(aR, bL, new THREE.Vector3(0, 0, 0.13), I.gapBetweenUnits + ' mm', dimsPlan);
dimension(bL, bR, new THREE.Vector3(0, 0, 0.30), I.palette.width + ' mm  palette', dimsPlan);
dimension(aL, bR, new THREE.Vector3(0, 0, 0.50),
  'envelope within ' + I.allocatedLength + ' mm allocated', dimsPlan);

// depth of the active zone, and of the host counter, at the main unit
var dFront = mainPt(-A.w / 2 - 0.10, 0.02, 0);
var dBack  = mainPt(-A.w / 2 - 0.10, 0.02, -A.d);
dimension(dFront, dBack, new THREE.Vector3(-0.13, 0, 0), I.activeDepth + ' mm active depth', dimsPlan);

var cIn = INS.place(A.theta, A.w / 2 + 0.30, -I.frontEdgeInset / 1000);
var cOut = INS.place(A.theta, A.w / 2 + 0.30, -(CFG.counter.depthAtActiveZone) / 1000 - I.frontEdgeInset / 1000);
dimension(new THREE.Vector3(cIn.x, V.CT.h + 0.02, cIn.y), new THREE.Vector3(cOut.x, V.CT.h + 0.02, cOut.y),
  new THREE.Vector3(0.16, 0, 0), CFG.counter.depthAtActiveZone + ' mm counter depth', dimsPlan);

/* ── elevation dimensions ─────────────────────────────────────────────── */
var eX = A.w / 2 + 0.16;
dimension(mainPt(eX, 0, -A.d + 0.02), mainPt(eX, mm(I.wall.height), -A.d + 0.02),
  new THREE.Vector3(0, 0, 0.05), I.wall.height + ' mm', dimsHeight);
dimension(mainPt(eX + 0.22, -V.CT.h, 0), mainPt(eX + 0.22, 0, 0),
  new THREE.Vector3(0, 0, 0.05), CFG.counter.height + ' mm counter height', dimsHeight);
dimension(mainPt(-eX, 0, INS.anchors.horizFrontZ), mainPt(-eX, mm(I.horizontal.topAboveCounter), INS.anchors.horizFrontZ),
  new THREE.Vector3(0, 0, 0.05), I.horizontal.topAboveCounter + ' mm above counter', dimsHeight);
dimension(mainPt(-A.w / 2, mm(I.wall.height) + 0.10, -A.d + 0.02), mainPt(A.w / 2, mm(I.wall.height) + 0.10, -A.d + 0.02),
  new THREE.Vector3(0, 0.10, 0), I.wall.width + ' mm', dimsHeight);

// palette plan depth
dimension(palPt(-B.w / 2 - 0.08, 0.02, 0), palPt(-B.w / 2 - 0.08, 0.02, -B.d),
  new THREE.Vector3(-0.11, 0, 0), I.palette.depth + ' mm palette depth', dimsPlan);
dimension(palPt(-(CFG.engravings.length * mm(I.palette.sampleSize + I.palette.sampleGap)) / 2,
                0.03, INS.anchors.samplesZ),
          palPt((CFG.engravings.length * mm(I.palette.sampleSize + I.palette.sampleGap)) / 2,
                0.03, INS.anchors.samplesZ),
          new THREE.Vector3(0, 0, -0.14),
          I.palette.sampleSize + ' mm engraved Growth \u00d7 ' + CFG.engravings.length, dimsPlan);

// panel and surface thicknesses, read at the close-up camera
dimension(mainPt(A.w / 2 + 0.03, mm(I.wall.height) - 0.06, -A.d + mm(50) - mm(I.wall.thickness)),
          mainPt(A.w / 2 + 0.03, mm(I.wall.height) - 0.06, -A.d + mm(50)),
          new THREE.Vector3(0, 0.09, 0), I.wall.thickness + ' mm wall panel', dimsHeight);
dimension(mainPt(A.w / 2 + 0.03, mm(I.horizontal.topAboveCounter) - mm(I.horizontal.thickness), INS.anchors.horizFrontZ),
          mainPt(A.w / 2 + 0.03, mm(I.horizontal.topAboveCounter), INS.anchors.horizFrontZ),
          new THREE.Vector3(0.12, 0, 0), I.horizontal.thickness + ' mm Growth surface', dimsHeight);

/* the required review label */
var vs = label(CFG.meta.dimensionNote, CFG.meta.project + ' · ' + CFG.meta.revision);
vs.position.copy(mainPt(0.20, mm(I.wall.height) + 0.20, 0.46));
vs.scale.multiplyScalar(1.12);
dimNote.add(vs);

/* ── annotations ──────────────────────────────────────────────────────── */
var g = CFG.groove;
var engNames = CFG.engravings.map(function (e) { return e.ref + ' ' + e.name; }).join(' · ');
leader(mainPt(-0.12, mm(I.wall.height) * 0.62, -A.d + mm(50)),
       mainPt(-0.92, mm(I.wall.height) * 0.92, -A.d + 0.18),
       'Machined groove — one continuous panel',
       'Illustrative ' + I.wall.engraving.cellW + ' mm grid \u00b7 groove ' +
       g.width + ' \u00d7 ' + g.depth + ' mm \u00b7 ' + g.profile);

/* the four supplied engravings, on the Growth collection in the palette */
leader(palPt(0, 0.05, INS.anchors.samplesZ),
       palPt(0.30, 0.52, 0.44),
       'Growth, engraved: ' + engNames,
       CFG.product.engravingOnGrowthConfirmed
         ? 'Availability in Growth confirmed'
         : 'Engravings supplied for Wall Tiles \u2014 availability in Growth NOT confirmed');

leader(mainPt(A.w / 2, mm(I.wall.height) * 0.45, -A.d + mm(50) - mm(I.wall.thickness) / 2),
       mainPt(A.w / 2 + 0.62, mm(I.wall.height) * 0.30, -A.d + 0.34),
       'Exposed panel edge — continuous ' + I.wall.thickness + ' mm section',
       'This is why it is not a wall of loose tiles');

leader(mainPt(0.05, mm(I.horizontal.topAboveCounter) - 0.02, -A.d + mm(52)),
       mainPt(0.30, mm(I.wall.height) * 0.72, 0.42),
       'Real panel joint would occur here',
       CFG.product.panelJointDetailSupplied ? 'Detail supplied' : 'Detail requested — not shown, not approved');

leader(mainPt(-0.18, 0.01, -A.d + 0.10),
       mainPt(-0.86, -0.30, 0.30),
       'Concept support — fabricator review required',
       'Folded tray, slot and gussets are concept geometry only');

leader(mainPt(0.30, 0.002, -0.06),
       mainPt(0.98, -0.34, 0.26),
       'Protective contact pads',
       'Nothing fixed to counter, glazing, trim or column');

leader(new THREE.Vector3(INS.place(A.theta, -1.30, 0).x, V.CT.h - 0.30, INS.place(A.theta, -1.30, 0).y),
       new THREE.Vector3(INS.place(A.theta, -1.36, 0.10).x, V.CT.h - 0.58, INS.place(A.theta, -1.36, 0.10).y + 0.26),
       'Existing counter — load capacity unknown',
       'Mass figures are not a load approval. Venue permission required.');

leader(mainPt(0.22, mm(I.horizontal.topAboveCounter) + 0.01, INS.anchors.horizFrontZ - 0.10),
       mainPt(1.05, mm(I.wall.height) * 0.30, 0.50),
       'Growth surface — specified separately',
       'wallTileSku and growthSurfaceSku are independent');

leader(new THREE.Vector3(palPt(0.20, 0.06, -0.21).x, palPt(0.20, 0.06, -0.21).y, palPt(0.20, 0.06, -0.21).z),
       new THREE.Vector3(palPt(0.70, 0.34, 0.54).x, palPt(0.70, 0.34, 0.54).y, palPt(0.70, 0.34, 0.54).z),
       'Three Growth choices + neutral references',
       'References are comparison aids, not product partners or approvals');

/* the two sample boxes */
leader(palPt(0.12, 0.10, INS.anchors.boxZ),
       palPt(0.78, 0.44, -0.02),
       'Polygood sample boxes \u2014 the full range',
       'Modelled from the supplied photographs; lid copy reproduced, not authored');

/* seated and portable interaction — the high counter is not on its own an
   accessibility answer */
leader(new THREE.Vector3(-3.34, 0.76, 1.02),
       new THREE.Vector3(-3.10, 1.44, 1.90),
       'Seated / portable interaction',
       'Coupon and samples carried here — confirm circulation with the host');

/* stool reset */
leader(new THREE.Vector3(INS.place(A.theta, 0, 0.62).x, 0.75, INS.place(A.theta, 0, 0.62).y),
       new THREE.Vector3(INS.place(A.theta, -1.02, 0.86).x, 1.36, INS.place(A.theta, -1.02, 0.86).y),
       'Two stools reset within the allocated zone',
       'Indicative positions — the rest of the room is unchanged');

/* ── clear-floor review band: a planning overlay, nothing more ─────────── */
(function () {
  var rIn = mm(CFG.counter.outerRadius - CFG.counter.depthAtActiveZone);
  var rBand = rIn - mm(I.clearFloorBand);
  var a0 = Math.min(A.theta, B.theta) - 14, a1 = Math.max(A.theta, B.theta) + 14;
  var pts = [], n = 26, i;
  for (i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * D2R; pts.push(new THREE.Vector3(rIn * Math.sin(a), 0.006, V.BAY.cz - rIn * Math.cos(a))); }
  for (i = n; i >= 0; i--) { var b2 = (a0 + (a1 - a0) * i / n) * D2R; pts.push(new THREE.Vector3(rBand * Math.sin(b2), 0.006, V.BAY.cz - rBand * Math.cos(b2))); }
  pts.push(pts[0].clone());
  var mat = new THREE.LineBasicMaterial({ color: 0x1b3a5c, transparent: true, opacity: 0.8 });
  var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  band.add(l);
  var sp = label(I.clearFloorBand + ' mm clear-floor review band',
    'Planning overlay only — not a compliance certification');
  var am = (a0 + a1) / 2 * D2R, rm = (rIn + rBand) / 2;
  sp.position.set(rm * Math.sin(am) - 0.42, 0.30, V.BAY.cz - rm * Math.cos(am) + 0.22);
  band.add(sp);
})();

function syncNote() { dimNote.visible = dimsPlan.visible || dimsHeight.visible; }
return {
  notes: notes, band: band,
  setPlanDims:   function (v) { dimsPlan.visible = v;   syncNote(); ctx.invalidate(); },
  setHeightDims: function (v) { dimsHeight.visible = v; syncNote(); ctx.invalidate(); },
  setNotes: function (v) { notes.visible = v; ctx.invalidate(); },
  setBand: function (v) { band.visible = v; ctx.invalidate(); }
};
};
