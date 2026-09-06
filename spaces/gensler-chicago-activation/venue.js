/* ═══════════════════════════════════════════════════════════════════════════
   THE VENUE — Gensler Chicago office, from reference photograph IMG_3511.jpeg

   Ported from spaces/bow-window-lounge/index.html (rev 6e3c3c7), which remains
   available unchanged. Camera work, bay set-out, window construction, the
   Corinthian order, the host counter, the stools, the credenza and the
   daylight rig are all carried over; the constants they used are now read
   from config.js.

   The photograph establishes appearance and adjacency, NOT a measured plan.
   No entry location, building identity or survey accuracy is implied.

   NOTE ON COLOUR: three r149 leaves ColorManagement in legacy mode, so every
   material.color hex here is consumed as a LINEAR triple, not sRGB. Outdoor
   albedos therefore look implausibly dark as hex values. Textures are
   unaffected — they carry their own encoding.

   Units: metres in the scene. Configuration is millimetres; PG.mm() converts.
   +X right · +Y up · +Z toward the viewer (the bay faces −Z).
   ═══════════════════════════════════════════════════════════════════════════ */

window.PG_VENUE = function (ctx) {
"use strict";
var THREE = ctx.THREE, scene = ctx.scene, renderer = ctx.renderer;
var CFG = ctx.CFG, PG = ctx.PG;


var D2R = Math.PI / 180;
var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
var lerp = function (a, b, t) { return a + (b - a) * t; };
var rnd = (function () { var s = 20250905; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; })();
var rr = function (a, b) { return a + rnd() * (b - a); };

/* ── the bay geometry every element is set out from ─────────────────── */
var RC = CFG.room, mm = PG.mm;
var BAY = { cz: mm(RC.bay.centreZ), R: mm(RC.bay.radius), half: RC.bay.halfAngle };
var ROOM = { h: mm(RC.ceilingHeight), wallZ: BAY.cz - BAY.R * Math.cos(BAY.half * D2R),
             left: -mm(RC.sideWallX), right: mm(RC.sideWallX), back: mm(RC.backWallZ), t: mm(RC.wallThickness) };
var SILL = mm(RC.sillHeight), HEAD = mm(RC.headHeight);
var WIN = RC.windows;                                // sash centres / angular widths

// point on the bay arc at angle a (deg from the centreline) and radius r
function bayPt(a, r, y) { var t = a * D2R; return new THREE.Vector3(r * Math.sin(t), y || 0, BAY.cz - r * Math.cos(t)); }
// chord width spanning `w` degrees at radius r
function chord(w, r) { return 2 * r * Math.sin(w * 0.5 * D2R); }

/* ══════════════ canvas texture helpers ══════════════ */
function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(canvas, rx, ry, srgb) {
  var t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx || 1, ry || 1);
  t.anisotropy = 8;
  if (srgb !== false) t.encoding = THREE.sRGBEncoding;
  return t;
}
// fine grain, used as a roughness/bump breakup on large flat surfaces
function grainCanvas(size, amp, base) {
  var c = cv(size, size), x = c.getContext('2d'), d = x.createImageData(size, size), p = d.data;
  for (var i = 0; i < size * size; i++) {
    var v = base + (rnd() - 0.5) * amp;
    v = clamp(v, 0, 255) | 0;
    p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = v; p[i * 4 + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  // soften so it reads as plaster tooth rather than digital noise
  x.globalAlpha = 0.55; x.filter = 'blur(1px)'; x.drawImage(c, 0, 0); x.filter = 'none'; x.globalAlpha = 1;
  return c;
}

/* soft elliptical contact shadow — cheap ambient occlusion under furniture */
var aoTex = (function () {
  var s = 128, c = cv(s, s), x = c.getContext('2d');
  var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, '#9a9a9d'); g.addColorStop(0.40, '#c4c4c7');
  g.addColorStop(0.76, '#eeeeef'); g.addColorStop(1, '#ffffff');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
})();
function contact(x, z, rx, rz, strength, rot, y) {
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(rx * 2, rz * 2),
    new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, opacity: strength === undefined ? 1 : strength,
      blending: THREE.MultiplyBlending, depthWrite: false, toneMapped: false })
  );
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot || 0;
  m.position.set(x, y || 0.006, z); m.renderOrder = 2;
  scene.add(m); return m;
}

/* ══════════════ materials ══════════════ */
var plasterMap = tex(grainCanvas(256, 26, 236), 7, 4);
var plasterRough = tex(grainCanvas(256, 34, 210), 3, 2, false);

var M = {};
M.wall = new THREE.MeshStandardMaterial({ color: 0xe4ded2, roughness: 0.94, envMapIntensity: 0.30 });
M.wallDeep = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.95, envMapIntensity: 0.26 });
M.ceiling = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.97, envMapIntensity: 0.24 });
M.trim = new THREE.MeshStandardMaterial({ color: 0xefeade, roughness: 0.46, envMapIntensity: 0.40 });      // semi-gloss enamel
M.trimShade = new THREE.MeshStandardMaterial({ color: 0xe2ddd0, roughness: 0.5, envMapIntensity: 0.36 });
M.lacquer = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, roughness: 0.34, metalness: 0.0,
  clearcoat: 0.34, clearcoatRoughness: 0.30, reflectivity: 0.30, envMapIntensity: 0.34 });                // counter top
M.blackSteel = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.44, metalness: 0.55, envMapIntensity: 0.55 });
M.blackMatte = new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.64, metalness: 0.08, envMapIntensity: 0.42 });
M.shell = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.36, metalness: 0.06, side: THREE.DoubleSide, envMapIntensity: 0.5 });
M.burgundy = new THREE.MeshStandardMaterial({ color: 0x3d1f27, roughness: 0.96, envMapIntensity: 0.26 });
M.burgundyDeep = new THREE.MeshStandardMaterial({ color: 0x381a22, roughness: 0.96, envMapIntensity: 0.26 });
M.marble = new THREE.MeshStandardMaterial({ color: 0xe6e2d9, roughness: 0.32, metalness: 0.02, envMapIntensity: 0.5 });
M.steel = new THREE.MeshStandardMaterial({ color: 0x8e9096, roughness: 0.28, metalness: 0.85 });
M.clay = new THREE.MeshStandardMaterial({ color: 0x3b2a24, roughness: 0.55 });
M.glass = new THREE.MeshPhysicalMaterial({ color: 0xe8f2f6, roughness: 0.045, metalness: 0, transparent: true,
  opacity: 0.085, envMapIntensity: 1.15, side: THREE.DoubleSide, depthWrite: false });

/* ── loop-pile carpet: warm sand with a fine fleck ── */
var carpetCanvas = (function () {
  var s = 512, c = cv(s, s), x = c.getContext('2d');
  x.fillStyle = '#cdc4b3'; x.fillRect(0, 0, s, s);
  for (var i = 0; i < 26000; i++) {
    var v = 150 + rnd() * 95;
    x.fillStyle = 'rgba(' + (v | 0) + ',' + ((v - 6) | 0) + ',' + ((v - 20) | 0) + ',' + (0.16 + rnd() * 0.3) + ')';
    x.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2.2, 1 + rnd() * 2.2);
  }
  return c;
})();
M.carpet = new THREE.MeshStandardMaterial({ color: 0xb8ae9c, roughness: 1.0, envMapIntensity: 0.22,
  map: tex(carpetCanvas, 9, 9), roughnessMap: tex(grainCanvas(256, 40, 240), 9, 9, false) });

/* ── geometric mosaic rug set into the bay ── */
var rugTex = (function () {
  var s = 1024, c = cv(s, s), x = c.getContext('2d');
  x.fillStyle = '#ded5c1'; x.fillRect(0, 0, s, s);
  // speckled ground
  for (var i = 0; i < 30000; i++) {
    x.fillStyle = 'rgba(120,110,95,' + (0.03 + rnd() * 0.09) + ')';
    x.fillRect(rnd() * s, rnd() * s, 2, 2);
  }
  var band = 96, ink = '#39332c', warm = '#8d3f37', slate = '#5d6a6b';
  // outer rules
  x.strokeStyle = ink; x.lineWidth = 7;
  x.strokeRect(26, 26, s - 52, s - 52);
  x.lineWidth = 3; x.strokeRect(46, 46, s - 92, s - 92);
  // running diamond border between the rules
  var step = 62, inset = 46 + 20;
  function diamonds(x0, y0, dx, dy, n) {
    for (var k = 0; k < n; k++) {
      var px = x0 + dx * k, py = y0 + dy * k;
      x.fillStyle = k % 3 === 0 ? warm : (k % 3 === 1 ? ink : slate);
      x.beginPath(); x.moveTo(px, py - 17); x.lineTo(px + 17, py); x.lineTo(px, py + 17); x.lineTo(px - 17, py); x.closePath(); x.fill();
    }
  }
  var n = Math.floor((s - inset * 2) / step) + 1;
  diamonds(inset, inset, step, 0, n); diamonds(inset, s - inset, step, 0, n);
  diamonds(inset, inset, 0, step, n); diamonds(s - inset, inset, 0, step, n);
  // sparse field lozenges
  x.globalAlpha = 0.5;
  for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) {
    var cx2 = 190 + gx * 161, cy2 = 190 + gy * 161;
    x.fillStyle = (gx + gy) % 2 ? slate : warm;
    x.beginPath(); x.moveTo(cx2, cy2 - 22); x.lineTo(cx2 + 22, cy2); x.lineTo(cx2, cy2 + 22); x.lineTo(cx2 - 22, cy2); x.closePath(); x.fill();
  }
  x.globalAlpha = 1;
  var t = tex(c, 1, 1); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
})();

/* ══════════════ the city outside ══════════════ */
/* Facade painter — punched-window masonry or curtain wall, drawn once per building. */
function facadeTex(o) {
  var W = o.cols * 64, H = o.rows * 64, c = cv(W, H), x = c.getContext('2d');
  x.fillStyle = o.stone; x.fillRect(0, 0, W, H);
  // horizontal course lines / spandrel banding
  x.strokeStyle = o.mortar; x.lineWidth = 1.4;
  for (var r = 0; r <= o.rows; r++) { x.beginPath(); x.moveTo(0, r * 64); x.lineTo(W, r * 64); x.stroke(); }
  if (o.piers) { for (var q = 0; q <= o.cols; q++) { x.beginPath(); x.moveTo(q * 64, 0); x.lineTo(q * 64, H); x.stroke(); } }
  for (var row = 0; row < o.rows; row++) {
    for (var col = 0; col < o.cols; col++) {
      var px = col * 64 + o.pad, py = row * 64 + o.pad * 0.9;
      var pw = 64 - o.pad * 2, ph = 64 - o.pad * 1.9;
      // reveal / lintel
      x.fillStyle = o.reveal; x.fillRect(px - 3, py - 3, pw + 6, ph + 6);
      // glazing, darker high up, brighter where sky reflects
      var sky = clamp(0.16 + (1 - row / o.rows) * 0.5 + rr(-0.1, 0.1), 0, 1);
      var g = x.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, o.glassTop); g.addColorStop(clamp(sky, 0.05, 0.95), o.glassMid); g.addColorStop(1, o.glassBot);
      x.fillStyle = g; x.fillRect(px, py, pw, ph);
      // a lit or blinded room here and there
      if (rnd() < o.lit) { x.fillStyle = 'rgba(246,236,208,' + rr(0.25, 0.6).toFixed(2) + ')'; x.fillRect(px, py, pw, ph); }
      if (rnd() < o.blind) { x.fillStyle = 'rgba(228,226,218,' + rr(0.4, 0.8).toFixed(2) + ')'; x.fillRect(px, py, pw, ph * rr(0.3, 0.75)); }
      // sash bar + sill
      x.fillStyle = o.reveal;
      x.fillRect(px, py + ph * 0.47, pw, 2.4);
      if (o.mullion) x.fillRect(px + pw / 2 - 1.2, py, 2.4, ph);
      x.fillStyle = o.sill; x.fillRect(px - 5, py + ph + 2, pw + 10, 4);
      // the odd window air-conditioner
      if (o.ac && rnd() < 0.09) { x.fillStyle = '#8e9095'; x.fillRect(px + pw * 0.18, py + ph * 0.62, pw * 0.64, ph * 0.3); }
    }
  }
  return tex(c, 1, 1);
}

function slab(w, h, d, mat, x, y, z, ry) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); if (ry) m.rotation.y = ry;
  return m;
}

var GROUND = -11.4;                    // street level: this is the fourth floor
var city = new THREE.Group(); scene.add(city);

function building(o) {
  var mats = [];
  var side = new THREE.MeshStandardMaterial({ color: o.tint || 0xffffff, roughness: 0.86, map: o.side });
  var face = new THREE.MeshStandardMaterial({ color: o.tint || 0xffffff, roughness: 0.84, map: o.face });
  var plain = new THREE.MeshStandardMaterial({ color: o.plain || 0xb9b3a6, roughness: 0.9 });
  mats = [side, side, plain, plain, face, side];      // +x −x +y −y +z −z
  var m = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, o.d), mats);
  m.position.set(o.x, GROUND + o.h / 2, o.z);
  if (o.ry) m.rotation.y = o.ry;
  city.add(m);
  return m;
}

/* the limestone block straight across the street */
var faceA = facadeTex({ cols: 16, rows: 18, pad: 13, stone: '#c8c6be', mortar: '#aeaca4', reveal: '#dddbd3',
  glassTop: '#333c43', glassMid: '#5b686e', glassBot: '#232a30', sill: '#d4d2ca', lit: 0.05, blind: 0.26, ac: true, mullion: true, piers: true });
var sideA = facadeTex({ cols: 9, rows: 18, pad: 13, stone: '#bebcb4', mortar: '#a3a199', reveal: '#d3d1c9',
  glassTop: '#2e373d', glassMid: '#4d5a60', glassBot: '#1f252a', sill: '#cac4b6', lit: 0.04, blind: 0.16, ac: true, mullion: true, piers: true });
building({ w: 38, h: 33, d: 18, x: -4.5, z: -26, face: faceA, side: sideA, tint: 0xd0cfca, plain: 0x6d6c67 });

/* a red-brick neighbour to the right, set slightly back */
var faceB = facadeTex({ cols: 6, rows: 13, pad: 14, stone: '#8d5a48', mortar: '#7a4c3c', reveal: '#c9b7a6',
  glassTop: '#3e4a52', glassMid: '#6d7e88', glassBot: '#2e373d', sill: '#bdae9d', lit: 0.06, blind: 0.22, ac: true, mullion: true, piers: false });
building({ w: 17, h: 34, d: 15, x: 20, z: -40, face: faceB, side: faceB, tint: 0xbfa896, plain: 0x4a382e });

/* the glass tower behind it */
var faceC = facadeTex({ cols: 8, rows: 20, pad: 5, stone: '#6f8496', mortar: '#5d7183', reveal: '#8fa4b3',
  glassTop: '#5f7c92', glassMid: '#9fc0d4', glassBot: '#496478', sill: '#8095a5', lit: 0.03, blind: 0.05, ac: false, mullion: true, piers: false });
building({ w: 22, h: 62, d: 20, x: 30, z: -62, face: faceC, side: faceC, tint: 0xa8c0d2, plain: 0x44586a });

/* the pale classical cornice that clips the right-hand sash */
var faceD = facadeTex({ cols: 4, rows: 5, pad: 15, stone: '#ddd8cc', mortar: '#c3bdb0', reveal: '#efece3',
  glassTop: '#5a6870', glassMid: '#93a4ab', glassBot: '#3e484e', sill: '#e8e4d9', lit: 0.02, blind: 0.4, ac: false, mullion: false, piers: true });
var bldD = building({ w: 15, h: 15, d: 13, x: 16.5, z: -25, face: faceD, side: faceD, tint: 0xe6e1d5, plain: 0x8f8a80 });
city.add(slab(16.4, 1.1, 14.4, new THREE.MeshStandardMaterial({ color: 0xefeade, roughness: 0.8 }), 16.5, GROUND + 15.1, -25));
city.add(slab(15.6, 0.55, 13.6, new THREE.MeshStandardMaterial({ color: 0xe4dfd2, roughness: 0.82 }), 16.5, GROUND + 14.3, -25));
/* a shallow dome/attic on it, as in the photograph */
var dome = new THREE.Mesh(new THREE.SphereGeometry(3.1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
  new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.72 }));
dome.position.set(16.5, GROUND + 15.6, -25); city.add(dome);

/* far-off haze block so the gap between towers is never empty sky */
city.add(slab(70, 26, 8, new THREE.MeshStandardMaterial({ color: 0xa9b6c0, roughness: 1 }), 4, GROUND + 13, -108));

/* the street below and its plane trees */
var street = new THREE.Mesh(new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 1, envMapIntensity: 0.25 }));
street.rotation.x = -Math.PI / 2; street.position.set(0, GROUND, -30); city.add(street);

// linear-space albedos (see note above): these read as mid-green once lit
var leafMat = new THREE.MeshStandardMaterial({ color: 0x0a1206, roughness: 1, envMapIntensity: 0.3 });
var leafMat2 = new THREE.MeshStandardMaterial({ color: 0x0e1a09, roughness: 1, envMapIntensity: 0.3 });
var leafMat3 = new THREE.MeshStandardMaterial({ color: 0x070d04, roughness: 1, envMapIntensity: 0.3 });
for (var t0 = 0; t0 < 9; t0++) {
  var tx = -17 + t0 * 4.6 + rr(-0.8, 0.8), tz = -11.6 + rr(-0.9, 0.9);
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.32, 9.2, 7),
    new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 1, envMapIntensity: 0.3 }));
  trunk.position.set(tx, GROUND + 4.6, tz); city.add(trunk);
  for (var b = 0; b < 15; b++) {
    var blob = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(0.75, 1.35), 1),
      b % 3 === 0 ? leafMat2 : (b % 3 === 1 ? leafMat : leafMat3));
    blob.position.set(tx + rr(-1.9, 1.9), GROUND + 10.7 + rr(-1.5, 1.2), tz + rr(-1.6, 1.6));
    blob.scale.set(1, 0.78, 1); city.add(blob);
  }
}

/* ══════════════ sky ══════════════ */
var skyTex = (function () {
  var c = cv(8, 256), x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.00, '#5d8fc4'); g.addColorStop(0.42, '#93b7dc');
  g.addColorStop(0.74, '#cddceb'); g.addColorStop(1.00, '#e7e6e0');
  x.fillStyle = g; x.fillRect(0, 0, 8, 256);
  var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
})();
var skyDome = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, toneMapped: false }));
scene.add(skyDome);
scene.fog = new THREE.Fog(0xc3d2e0, 60, 330);

/* ══════════════ light ══════════════
   The bay faces WSW (248° azimuth), so the sun swings into the sashes
   through the afternoon — which is the hour the photograph was taken. */
var FACADE_AZ = CFG.daylight.facadeAzimuth;

var sun = new THREE.DirectionalLight(0xfff4e2, 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -9.5; sun.shadow.camera.right = 9.5;
sun.shadow.camera.top = 8.5; sun.shadow.camera.bottom = -8.5;
sun.shadow.camera.near = 18; sun.shadow.camera.far = 52;
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.022; sun.shadow.radius = 2.6;
sun.target.position.set(0.2, 1.0, 0.4);
scene.add(sun, sun.target);

// daylight arriving off the whole sky dome, straight through the glazing
var skyThrough = new THREE.DirectionalLight(0xd3e3f5, 0.34);
skyThrough.position.set(-1.5, 5.5, -16);
scene.add(skyThrough);

var hemi = new THREE.HemisphereLight(0xcfe0f2, 0x958a79, 0.26);
scene.add(hemi);

// light coming back off the carpet and the far wall
var bounce = new THREE.DirectionalLight(0xffe9cf, 0.14);
bounce.position.set(2.5, -2.0, 4.5);
scene.add(bounce);

/* (the sun now reaches the carpet through the openings for real, so the
   painted-on light pool that stood in for it is gone) */


/* ── environment map: a miniature lit room, so the lacquer and glass
      have something real to reflect ── */
(function () {
  var es = new THREE.Scene();
  function box(w, h, d, x, y, z, col, inten) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color: col, side: THREE.BackSide }));
    m.position.set(x, y, z);
    if (inten !== undefined) { m.material.side = THREE.FrontSide; m.material.color.multiplyScalar(inten); }
    return m;
  }
  es.add(box(16, 9, 16, 0, 0, 0, 0x4e555c));                       // the shell
  var win = new THREE.Mesh(new THREE.PlaneGeometry(11, 6.4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  win.material.color.multiplyScalar(1.9); win.position.set(0, 0.6, -7.6); es.add(win);   // the bay
  var flr = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ color: 0x554d42 }));
  flr.rotation.x = -Math.PI / 2; flr.position.y = -4.4; es.add(flr);
  var ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ color: 0x77746c }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 4.4; es.add(ceil);
  var pm = new THREE.PMREMGenerator(renderer);
  pm.compileEquirectangularShader();
  scene.environment = pm.fromScene(es, 0.03).texture;
  pm.dispose();
})();

/* ══════════════ the room shell ══════════════ */
var floor = new THREE.Mesh(new THREE.PlaneGeometry(11, 13), M.carpet);
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1.6); floor.receiveShadow = true;
scene.add(floor);

var rug = new THREE.Mesh(new THREE.PlaneGeometry(3.60, 2.00),
  new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.97, envMapIntensity: 0.22 }));
rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.004, -1.34); rug.receiveShadow = true;
scene.add(rug);

var ceiling = new THREE.Mesh(new THREE.PlaneGeometry(11, 13), M.ceiling);
ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, ROOM.h, 1.6); ceiling.receiveShadow = true;
scene.add(ceiling);

function addWall(w, h, d, x, y, z, mat, shadow) {
  var m = slab(w, h, d, mat || M.wall, x, y, z);
  m.receiveShadow = shadow !== false; m.castShadow = true;
  scene.add(m); return m;
}
// side and back walls, given real thickness so the returns catch light
addWall(ROOM.t, ROOM.h, 7.9, ROOM.left - ROOM.t / 2, ROOM.h / 2, ROOM.wallZ + 3.95);
addWall(ROOM.t, ROOM.h, 7.9, ROOM.right + ROOM.t / 2, ROOM.h / 2, ROOM.wallZ + 3.95);
addWall(8.4 + ROOM.t * 2, ROOM.h, ROOM.t, 0, ROOM.h / 2, ROOM.back + ROOM.t / 2);
// the flat wall either side of the bay
addWall(ROOM.left * -1 - 2.364, ROOM.h, ROOM.t, (ROOM.left - 2.364) / 2, ROOM.h / 2, ROOM.wallZ - ROOM.t / 2);
addWall(ROOM.right - 2.364, ROOM.h, ROOM.t, (ROOM.right + 2.364) / 2, ROOM.h / 2, ROOM.wallZ - ROOM.t / 2);

/* curved band of bay wall between two angles and two heights */
var skinCache = new Map();
function backSkin(mat) {
  if (!skinCache.has(mat)) {
    var c = mat.clone(); c.side = THREE.BackSide; skinCache.set(mat, c);
  }
  return skinCache.get(mat);
}
function baySkin(a0, a1, y0, y1, r, mat) {
  var segs = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 1.5));
  var skin = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, y1 - y0, segs, 1, true, Math.PI - a1 * D2R, (a1 - a0) * D2R),
    backSkin(mat || M.wall));
  skin.position.set(0, (y0 + y1) / 2, BAY.cz);
  skin.receiveShadow = true; skin.renderOrder = 1;
  scene.add(skin); return skin;
}

function bayBand(a0, a1, y0, y1, rIn, rOut, mat, noSkin) {
  var steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 1.2));
  var g = new THREE.Group();
  for (var i = 0; i < steps; i++) {
    var aa = a0 + (a1 - a0) * (i + 0.5) / steps;
    var span = (a1 - a0) / steps;
    var rCore = rIn + 0.09;
    var w = chord(Math.abs(span), (rCore + rOut) / 2) * 1.004;
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0, rOut - rCore), mat || M.wall);
    var p = bayPt(aa, (rCore + rOut) / 2, (y0 + y1) / 2);
    m.position.copy(p); m.rotation.y = -aa * D2R;
    m.receiveShadow = true; m.castShadow = true;
    g.add(m);
  }
  if (!noSkin) {
    var sk = baySkin(a0, a1, y0, y1, rIn, mat);
    g.add(sk);
  }
  scene.add(g); return g;
}

var R = BAY.R;
var PIERS = [[-BAY.half, -44.5], [-19.5, -12.5], [12.5, 19.5], [44.5, BAY.half]];
// solid piers, full height
PIERS.forEach(function (s) { bayBand(s[0], s[1], 0, ROOM.h, R, R + ROOM.t, null, true); });
// wall over and under each sash
WIN.forEach(function (w) {
  var a0 = w.c - w.w / 2, a1 = w.c + w.w / 2;
  bayBand(a0, a1, 0, SILL, R, R + ROOM.t, null, true);
  bayBand(a0, a1, HEAD, ROOM.h, R, R + ROOM.t, null, true);
});
// the plastered face, in as few continuous pieces as the openings allow:
// unbroken below the sills and above the heads, then pier by pier between
baySkin(-BAY.half, BAY.half, 0, SILL, R);
baySkin(-BAY.half, BAY.half, HEAD, ROOM.h, R);
PIERS.forEach(function (s) { baySkin(s[0], s[1], SILL, HEAD, R); });

/* ── deep reveals, stools and the sashes themselves ── */
var glassPanes = [];
function buildWindow(w) {
  var a0 = w.c - w.w / 2, a1 = w.c + w.w / 2;

  // painted lining to the opening: soffit, jambs, and the sill it sits on
  bayBand(a0, a1, HEAD - 0.014, HEAD, R, R + ROOM.t, M.trim);
  bayBand(a0, a1, SILL - 0.055, SILL + 0.005, R - 0.075, R + ROOM.t, M.trim);   // stool, projecting inward
  [a0, a1].forEach(function (ae) {
    var j = new THREE.Mesh(new THREE.BoxGeometry(0.028, HEAD - SILL, ROOM.t), M.trim);
    j.position.copy(bayPt(ae, R + ROOM.t / 2, (SILL + HEAD) / 2));
    j.rotation.y = -ae * D2R; scene.add(j);
  });
  // apron under the stool
  bayBand(a0 + 1.5, a1 - 1.5, SILL - 0.145, SILL - 0.055, R - 0.022, R - 0.004, M.trimShade);

  var Rw = R + 0.30;                       // frame set back into the reveal
  var cw = chord(w.w, Rw), H = HEAD - SILL;
  var g = new THREE.Group();
  g.position.copy(bayPt(w.c, Rw, 0));
  g.rotation.y = -w.c * D2R;
  scene.add(g);

  function bar(bw, bh, bd, bx, by, bz, mat) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat || M.trim);
    m.position.set(bx, by, bz); m.castShadow = true; g.add(m); return m;
  }
  // outer casing
  bar(0.075, H + 0.09, 0.10, -cw / 2 + 0.037, (SILL + HEAD) / 2, 0);
  bar(0.075, H + 0.09, 0.10, cw / 2 - 0.037, (SILL + HEAD) / 2, 0);
  bar(cw, 0.085, 0.10, 0, HEAD - 0.042, 0);
  bar(cw, 0.075, 0.13, 0, SILL + 0.032, 0.012);

  var mr = SILL + 1.06;                     // meeting rail
  bar(cw - 0.15, 0.095, 0.075, 0, mr, 0.012, M.trimShade);

  // 1-over-1 sashes: stiles and rails only
  [[SILL + 0.075, mr - 0.045, 0.03], [mr + 0.045, HEAD - 0.085, -0.03]].forEach(function (s) {
    var y0 = s[0], y1 = s[1], dz = s[2];
    bar(0.055, y1 - y0, 0.05, -cw / 2 + 0.105, (y0 + y1) / 2, dz);
    bar(0.055, y1 - y0, 0.05, cw / 2 - 0.105, (y0 + y1) / 2, dz);
    bar(cw - 0.15, 0.055, 0.05, 0, y0 + 0.027, dz);
    bar(cw - 0.15, 0.055, 0.05, 0, y1 - 0.027, dz);
    var pane = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.19, y1 - y0 - 0.02), M.glass);
    pane.position.set(0, (y0 + y1) / 2, dz);
    pane.renderOrder = 4; g.add(pane);
    glassPanes.push(pane);
    // a whisper of glare on the inside face
    var glare = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.19, y1 - y0 - 0.02),
      new THREE.MeshBasicMaterial({ color: 0xfff6e6, transparent: true, opacity: 0.017,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glare.position.set(0, (y0 + y1) / 2, dz + 0.035); glare.renderOrder = 5; g.add(glare);
  });

  // raised panel in the wainscot below
  var pg = new THREE.Group();
  pg.position.copy(bayPt(w.c, R - 0.006, 0)); pg.rotation.y = -w.c * D2R; scene.add(pg);
  var pw = chord(w.w, R) - 0.30, ph = 0.50, py = 0.50;
  var field = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.02), M.trimShade);
  field.position.set(0, py, 0.012); pg.add(field);
  [[pw + 0.09, 0.045, 0, py + ph / 2 + 0.022], [pw + 0.09, 0.045, 0, py - ph / 2 - 0.022],
   [0.045, ph + 0.09, -pw / 2 - 0.022, py], [0.045, ph + 0.09, pw / 2 + 0.022, py]].forEach(function (b) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(b[0], b[1], 0.032), M.trim);
    m.position.set(b[2], b[3], 0.017); pg.add(m);
  });
}
WIN.forEach(buildWindow);

/* ── cornice and base, carried around the bay and along the flat walls ── */
bayBand(-BAY.half, BAY.half, ROOM.h - 0.175, ROOM.h - 0.005, R - 0.10, R - 0.004, M.trim);
bayBand(-BAY.half, BAY.half, ROOM.h - 0.235, ROOM.h - 0.175, R - 0.055, R - 0.004, M.trimShade);
bayBand(-BAY.half, BAY.half, 0, 0.185, R - 0.030, R - 0.004, M.trimShade);

function runTrim(w, h, d, x, y, z) { var m = slab(w, h, d, M.trim, x, y, z); scene.add(m); return m; }
function runBase(w, h, d, x, y, z) { var m = slab(w, h, d, M.trimShade, x, y, z); scene.add(m); return m; }
[[-3.16, 1.586], [3.157, 1.586]].forEach(function (s) {          // flat wall either side of the bay
  runTrim(s[1], 0.17, 0.10, s[0], ROOM.h - 0.09, ROOM.wallZ + 0.05);
  runBase(s[1], 0.185, 0.03, s[0], 0.0925, ROOM.wallZ + 0.015);
});
[[ROOM.left + 0.05, 1], [ROOM.right - 0.05, -1]].forEach(function (s) {      // side walls
  runTrim(0.10, 0.17, 7.9, s[0], ROOM.h - 0.09, ROOM.wallZ + 3.95);
  runBase(0.03, 0.185, 7.9, s[0] + s[1] * 0.035, 0.0925, ROOM.wallZ + 3.95);
});

/* ── panelled dado and tall panel on the flat wall flanking the bay ── */
function wallPanel(cx, w, y0, y1) {
  var g = new THREE.Group(); g.position.set(cx, 0, ROOM.wallZ + 0.004); scene.add(g);
  var f = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0, 0.02), M.trimShade);
  f.position.set(0, (y0 + y1) / 2, 0.012); g.add(f);
  [[w + 0.09, 0.045, 0, y1 + 0.022], [w + 0.09, 0.045, 0, y0 - 0.022],
   [0.045, y1 - y0 + 0.09, -w / 2 - 0.022, (y0 + y1) / 2], [0.045, y1 - y0 + 0.09, w / 2 + 0.022, (y0 + y1) / 2]]
  .forEach(function (b) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(b[0], b[1], 0.032), M.trim);
    m.position.set(b[2], b[3], 0.017); g.add(m);
  });
}
[-3.16, 3.16].forEach(function (cx) {
  wallPanel(cx, 1.16, 0.26, 0.80);
  wallPanel(cx, 1.16, 1.04, 2.84);
});

/* ── the shuttered window on the left return, half-seen in the photograph ── */
(function () {
  var x = ROOM.left, z0 = -0.72, h0 = 0.95, h1 = 2.92, wz = 1.15;
  scene.add(slab(0.05, h1 - h0, wz, M.wallDeep, x + 0.025, (h0 + h1) / 2, z0));   // recess
  for (var i = 0; i < 5; i++) {                                                   // closed shutter leaves
    var s = slab(0.045, h1 - h0 - 0.06, wz / 5 - 0.02, M.trimShade, x + 0.062, (h0 + h1) / 2, z0 - wz / 2 + wz / 10 + i * wz / 5);
    scene.add(s);
  }
  scene.add(slab(0.10, 0.075, wz + 0.16, M.trim, x + 0.05, h0 - 0.03, z0));       // stool
  scene.add(slab(0.09, h1 - h0 + 0.16, 0.075, M.trim, x + 0.045, (h0 + h1) / 2, z0 - wz / 2 - 0.037));
  scene.add(slab(0.09, h1 - h0 + 0.16, 0.075, M.trim, x + 0.045, (h0 + h1) / 2, z0 + wz / 2 + 0.037));
  scene.add(slab(0.09, 0.08, wz + 0.16, M.trim, x + 0.045, h1 + 0.04, z0));
})();

/* ══════════════ the Corinthian order ══════════════ */
/* 20 flutes cut into the shaft by displacing the cylinder radially */
function flute(geo, count, depth) {
  var p = geo.attributes.position;
  for (var i = 0; i < p.count; i++) {
    var x = p.getX(i), z = p.getZ(i);
    var r = Math.sqrt(x * x + z * z);
    if (r < 1e-4) continue;
    var s = 1 - depth * (0.5 - 0.5 * Math.cos(count * Math.atan2(z, x)));
    p.setX(i, x * s); p.setZ(i, z * s);
  }
  p.needsUpdate = true; geo.computeVertexNormals(); return geo;
}

function column(cx, cz, opts) {
  opts = opts || {};
  var g = new THREE.Group(); g.position.set(cx, 0, cz); scene.add(g);
  var stone = opts.mat || M.trim, shade = M.trimShade;
  var baseTop = 0.30, capBot = ROOM.h - 0.40;

  // Attic base
  g.add(slab(0.50, 0.085, 0.50, shade, 0, 0.0425, 0));
  var tor1 = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.048, 12, 40), stone);
  tor1.rotation.x = Math.PI / 2; tor1.position.y = 0.13; g.add(tor1);
  var sco = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.205, 0.06, 40), shade);
  sco.position.y = 0.20; g.add(sco);
  var tor2 = new THREE.Mesh(new THREE.TorusGeometry(0.196, 0.036, 12, 40), stone);
  tor2.rotation.x = Math.PI / 2; tor2.position.y = 0.263; g.add(tor2);

  // fluted shaft, with a touch of entasis
  var shaftH = capBot - baseTop;
  var shaft = new THREE.Mesh(flute(new THREE.CylinderGeometry(0.172, 0.198, shaftH, 120, 10), 20, 0.095), stone);
  shaft.position.y = baseTop + shaftH / 2; shaft.castShadow = true; g.add(shaft);

  // astragal and fillet under the capital
  var ast = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.016, 10, 40), stone);
  ast.rotation.x = Math.PI / 2; ast.position.y = capBot - 0.012; g.add(ast);

  /* capital: bell, two ranks of acanthus, corner volutes, abacus */
  var pts = [];
  for (var i = 0; i <= 12; i++) {
    var t = i / 12;
    pts.push(new THREE.Vector2(0.172 + 0.115 * t * t * (1.25 - 0.25 * t), capBot + 0.006 + t * 0.305));
  }
  var bell = new THREE.Mesh(new THREE.LatheGeometry(pts, 44), shade);
  bell.castShadow = true; g.add(bell);

  var leafGeo = new THREE.SphereGeometry(1, 7, 5);
  function rank(y, radius, count, sx, sy, sz, tilt, phase) {
    for (var k = 0; k < count; k++) {
      var a = phase + k / count * Math.PI * 2;
      var leaf = new THREE.Mesh(leafGeo, stone);
      leaf.scale.set(sx, sy, sz);
      leaf.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
      leaf.rotation.y = -a; leaf.rotation.z = tilt;
      leaf.castShadow = true; g.add(leaf);
    }
  }
  rank(capBot + 0.075, 0.185, 8, 0.036, 0.085, 0.055, -0.32, 0);
  rank(capBot + 0.185, 0.222, 8, 0.040, 0.095, 0.060, -0.40, Math.PI / 8);

  // corner volutes (helices) and the small caulicoli between them
  for (var v = 0; v < 4; v++) {
    var a2 = Math.PI / 4 + v * Math.PI / 2;
    var vol = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.018, 8, 22, Math.PI * 1.55), stone);
    vol.position.set(Math.cos(a2) * 0.245, capBot + 0.315, Math.sin(a2) * 0.245);
    vol.rotation.y = -a2 + Math.PI / 2; vol.rotation.z = -0.5;
    vol.castShadow = true; g.add(vol);
  }
  for (var v2 = 0; v2 < 4; v2++) {
    var a3 = v2 * Math.PI / 2;
    var st = new THREE.Mesh(new THREE.TorusGeometry(0.040, 0.013, 8, 18, Math.PI * 1.3), stone);
    st.position.set(Math.cos(a3) * 0.20, capBot + 0.30, Math.sin(a3) * 0.20);
    st.rotation.y = -a3 + Math.PI / 2; st.rotation.z = -0.8; g.add(st);
  }

  // abacus with its little rosettes
  g.add(slab(0.50, 0.028, 0.50, shade, 0, capBot + 0.348, 0));
  var ab = slab(0.565, 0.055, 0.565, stone, 0, capBot + 0.389, 0);
  ab.castShadow = true; g.add(ab);
  for (var f = 0; f < 4; f++) {
    var a4 = f * Math.PI / 2;
    var ros = new THREE.Mesh(new THREE.SphereGeometry(0.033, 12, 8), stone);
    ros.scale.set(1, 0.85, 0.5);
    ros.position.set(Math.cos(a4) * 0.275, capBot + 0.389, Math.sin(a4) * 0.275);
    ros.rotation.y = -a4; g.add(ros);
  }
  return g;
}
RC.columns.forEach(function (c) {
  column(mm(c.x), mm(c.z));
  contact(mm(c.x), mm(c.z), 0.52, 0.52, 0.75);
});

/* ══════════════ the curved bar counter ══════════════ */
var CC = CFG.counter;
var CT = { h: mm(CC.height), th: mm(CC.topThickness),
           rOut: mm(CC.outerRadius), rIn: mm(CC.outerRadius - CC.depthAtActiveZone),
           a0: CC.startAngle, a1: CC.endAngle };

(function () {
  // Shape space maps to the floor plane as (sx, sy) → (x, −z)
  function sp(a, r) { var t = a * D2R; return [r * Math.sin(t), -BAY.cz + r * Math.cos(t)]; }
  var sh = new THREE.Shape(), N = 72, i, p;
  for (i = 0; i <= N; i++) { p = sp(CT.a0 + (CT.a1 - CT.a0) * i / N, CT.rOut); i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]); }
  for (i = N; i >= 0; i--) { p = sp(CT.a0 + (CT.a1 - CT.a0) * i / N, CT.rIn); sh.lineTo(p[0], p[1]); }
  sh.closePath();
  var geo = new THREE.ExtrudeGeometry(sh, { depth: CT.th, bevelEnabled: true, bevelThickness: 0.0035,
    bevelSize: 0.0035, bevelOffset: 0, bevelSegments: 2, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  var top = new THREE.Mesh(geo, M.lacquer);
  top.position.y = CT.h - CT.th;
  top.castShadow = true; top.receiveShadow = true;
  scene.add(top);
})();

function strut(a, b, t, mat, round) {
  var d = new THREE.Vector3().subVectors(b, a), len = d.length();
  var g = round ? new THREE.CylinderGeometry(t / 2, t / 2, len, 12) : new THREE.BoxGeometry(t, len, t);
  var m = new THREE.Mesh(g, mat || M.blackSteel);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true; scene.add(m); return m;
}

// one straight leg at the open end, two raking A-frames along the run
(function () {
  var yTop = CT.h - CT.th - 0.005;
  strut(bayPt(-50, 2.28, yTop), bayPt(-50, 2.30, 0), 0.032);
  contact(bayPt(-50, 2.30).x, bayPt(-50, 2.30).z, 0.20, 0.20, 0.6);
  [[-26, 2.34, 1.94], [10, 2.36, 1.96]].forEach(function (s) {
    var apex = bayPt(s[0], (s[1] + s[2]) / 2, yTop);
    strut(apex, bayPt(s[0], s[1] + 0.10, 0), 0.028);
    strut(apex, bayPt(s[0], s[2] - 0.08, 0), 0.028);
    strut(bayPt(s[0], s[1] + 0.02, 0.30), bayPt(s[0], s[2] - 0.02, 0.30), 0.020);   // stretcher
    contact(bayPt(s[0], (s[1] + s[2]) / 2).x, bayPt(s[0], (s[1] + s[2]) / 2).z, 0.40, 0.26, 0.55, -s[0] * D2R);
  });
})();

/* ══════════════ moulded bar stools ══════════════ */
function stoolShell() {
  // profile through the shell: seat pan sweeping up into a low back
  var spine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.018, -0.215), new THREE.Vector3(0, -0.014, -0.085),
    new THREE.Vector3(0, -0.016, 0.055), new THREE.Vector3(0, 0.022, 0.152),
    new THREE.Vector3(0, 0.135, 0.202), new THREE.Vector3(0, 0.268, 0.216),
    new THREE.Vector3(0, 0.400, 0.246)
  ]);
  var NU = 19, NV = 21, pos = [], idx = [], edge = [];
  function halfWidth(v) {
    if (v < 0.60) return 0.186 + 0.020 * Math.sin(v / 0.60 * Math.PI);
    var k = (v - 0.60) / 0.40;
    return 0.186 - 0.048 * k * k;
  }
  for (var j = 0; j < NV; j++) {
    var v = j / (NV - 1), c = spine.getPoint(v), hw = halfWidth(v);
    for (var i = 0; i < NU; i++) {
      var u = i / (NU - 1) * 2 - 1;
      var dish = v < 0.60 ? -0.030 * u * u : 0;          // the seat dishes
      var wrap = v < 0.60 ? 0 : 0.068 * u * u * ((v - 0.60) / 0.40);   // the back wraps forward
      pos.push(u * hw, c.y + dish + (v < 0.60 ? 0 : 0.014 * u * u), c.z - wrap);
    }
  }
  for (var j2 = 0; j2 < NV - 1; j2++) for (var i2 = 0; i2 < NU - 1; i2++) {
    var a = j2 * NU + i2, b = a + 1, c2 = a + NU, d = c2 + 1;
    idx.push(a, c2, b, b, c2, d);
  }
  var sheet = new THREE.BufferGeometry();
  sheet.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sheet.setIndex(idx); sheet.computeVertexNormals();

  // offset the sheet both ways along its own normals and skirt the boundary,
  // so the moulded shell has a visible edge at the silhouette
  var nrm = sheet.attributes.normal.array, T = 0.0115, count = NU * NV, P2 = [], I2 = [], k;
  for (k = 0; k < count; k++) P2.push(pos[k * 3] + nrm[k * 3] * T, pos[k * 3 + 1] + nrm[k * 3 + 1] * T, pos[k * 3 + 2] + nrm[k * 3 + 2] * T);
  for (k = 0; k < count; k++) P2.push(pos[k * 3] - nrm[k * 3] * T, pos[k * 3 + 1] - nrm[k * 3 + 1] * T, pos[k * 3 + 2] - nrm[k * 3 + 2] * T);
  for (k = 0; k < idx.length; k += 3) {
    I2.push(idx[k], idx[k + 1], idx[k + 2]);
    I2.push(idx[k + 2] + count, idx[k + 1] + count, idx[k] + count);
  }
  for (var i3 = 0; i3 < NU; i3++) edge.push(i3);
  for (var j3 = 1; j3 < NV; j3++) edge.push(j3 * NU + NU - 1);
  for (var i4 = NU - 2; i4 >= 0; i4--) edge.push((NV - 1) * NU + i4);
  for (var j4 = NV - 2; j4 >= 1; j4--) edge.push(j4 * NU);
  var ringBase = count * 2;
  for (var e0 = 0; e0 < edge.length; e0++) {
    var v0 = edge[e0] * 3;
    P2.push(pos[v0] + nrm[v0] * T, pos[v0 + 1] + nrm[v0 + 1] * T, pos[v0 + 2] + nrm[v0 + 2] * T);
    P2.push(pos[v0] - nrm[v0] * T, pos[v0 + 1] - nrm[v0 + 1] * T, pos[v0 + 2] - nrm[v0 + 2] * T);
  }
  for (var e = 0; e < edge.length; e++) {
    var a2 = ringBase + e * 2, b2 = ringBase + ((e + 1) % edge.length) * 2;
    I2.push(a2, b2, b2 + 1, a2, b2 + 1, a2 + 1);
  }
  var solid = new THREE.BufferGeometry();
  solid.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3));
  solid.setIndex(I2); solid.computeVertexNormals();
  return solid;
}
var SHELL = stoolShell();

var STOOLS = [];
function stool(angle, radius) {
  var g = new THREE.Group();
  g.position.copy(bayPt(angle, radius, 0));
  g.rotation.y = -angle * D2R;
  scene.add(g);
  var SH = 0.715;                                   // seat height
  var s = new THREE.Mesh(SHELL, M.shell);
  s.position.y = SH; s.castShadow = true; s.receiveShadow = true; g.add(s);
  // splayed round legs
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
    var a = new THREE.Vector3(q[0] * 0.152, SH - 0.02, q[1] * 0.150);
    var b = new THREE.Vector3(q[0] * 0.236, 0, q[1] * 0.228);
    var d = new THREE.Vector3().subVectors(b, a), len = d.length();
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0125, len, 10), M.blackSteel);
    leg.position.copy(a).add(b).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    leg.castShadow = true; g.add(leg);
  });
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.196, 0.0115, 8, 40), M.blackSteel);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.245; ring.castShadow = true; g.add(ring);
  var plate = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.070, 0.020, 18), M.blackMatte);
  plate.position.y = SH - 0.032; plate.castShadow = true; g.add(plate);
  var p = bayPt(angle, radius);
  var ao = contact(p.x, p.z, 0.40, 0.40, 0.78, -angle * D2R);
  STOOLS.push({ group: g, shadow: ao, radius: radius });
  return g;
}
CFG.furnitureReset.stoolAngles.forEach(function (a) { stool(a, mm(CFG.furnitureReset.stoolRadius)); });

/* ══════════════ slatted credenza, and what sits on it ══════════════ */
var BOOK_COLS = [0x22314a, 0x6b2027, 0xd6cdb8, 0x16171a, 0x47513a, 0xa8754a,
                 0xe3ded2, 0x2b4d51, 0x9d2a26, 0x3a3f4a, 0xc9b184, 0x5b3a5e];
function bookRow(parent, x0, x1, y, z, depth, hMin, hMax) {
  var x = x0;
  while (x < x1 - 0.02) {
    var t = rr(0.018, 0.042), h = rr(hMin, hMax);
    if (x + t > x1) break;
    var m = new THREE.Mesh(new THREE.BoxGeometry(t, h, depth * rr(0.82, 1.0)),
      new THREE.MeshStandardMaterial({ color: BOOK_COLS[(rnd() * BOOK_COLS.length) | 0], roughness: rr(0.55, 0.92) }));
    var lean = rnd() < 0.09 ? rr(-0.16, 0.16) : 0;
    m.position.set(x + t / 2, y + h / 2, z + rr(-0.012, 0.012));
    m.rotation.z = lean; m.castShadow = true;
    parent.add(m);
    x += t + rr(0.001, 0.004);
  }
}

(function () {
  var A = 63;                                     // the credenza runs tangent to the bay here
  var g = new THREE.Group();
  g.position.copy(bayPt(A, 2.10, 0));
  g.rotation.y = -A * D2R;
  scene.add(g);

  var W = 1.78, H = 1.00, D = 0.46;
  var solidW = 0.98, openW = W - solidW;
  var solidX = -W / 2 + solidW / 2, openX = W / 2 - openW / 2;

  // closed, slatted cabinet on the far half
  var body = new THREE.Mesh(new THREE.BoxGeometry(solidW, H, D), M.blackMatte);
  body.position.set(solidX, H / 2, 0); body.castShadow = true; body.receiveShadow = true; g.add(body);
  g.add(slab(W + 0.04, 0.028, D + 0.04, M.blackSteel, 0, H + 0.012, 0));       // continuous top
  g.add(slab(solidW - 0.06, 0.05, D - 0.06, M.blackMatte, solidX, 0.025, 0));  // recessed plinth

  var slatGeo = new THREE.CylinderGeometry(0.019, 0.019, H - 0.10, 10, 1, false, -Math.PI / 2, Math.PI);
  for (var x = -W / 2 + 0.045; x < solidX + solidW / 2 - 0.02; x += 0.0405) {
    var sl = new THREE.Mesh(slatGeo, M.blackMatte);
    sl.position.set(x, H / 2, D / 2); sl.rotation.y = Math.PI / 2; sl.castShadow = true; g.add(sl);
  }

  // open shelving on the near end — carcass sides only, so the spines show
  var carc = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.8, envMapIntensity: 0.3 });
  g.add(slab(0.028, H, D, M.blackMatte, openX - openW / 2, H / 2, 0));
  g.add(slab(0.028, H, D, M.blackMatte, openX + openW / 2, H / 2, 0));
  g.add(slab(openW, H, 0.022, carc, openX, H / 2, -D / 2 + 0.011));
  g.add(slab(openW, 0.05, D - 0.04, M.blackMatte, openX, 0.025, 0));
  var levels = [0.075, 0.385, 0.695];
  levels.forEach(function (sy, i) {
    if (i) g.add(slab(openW - 0.03, 0.020, D - 0.05, M.blackSteel, openX, sy - 0.010, 0.012));
  });
  var bx0 = openX - openW / 2 + 0.03, bx1 = openX + openW / 2 - 0.03;
  bookRow(g, bx0, bx1, levels[0], 0.075, 0.30, 0.20, 0.28);
  bookRow(g, bx0, bx1 - 0.16, levels[1], 0.075, 0.30, 0.19, 0.27);
  bookRow(g, bx0, bx1 - 0.26, levels[2], 0.075, 0.30, 0.17, 0.24);
  for (var k = 0; k < 3; k++) {
    g.add(slab(0.24, 0.032, 0.19, new THREE.MeshStandardMaterial({ color: BOOK_COLS[(rnd() * 12) | 0], roughness: 0.7 }),
      bx1 - 0.15, levels[2] + 0.017 + k * 0.033, 0.075 + rr(-0.02, 0.02), rr(-0.05, 0.05)));
  }
  var p = bayPt(A, 2.10);
  contact(p.x, p.z, 1.12, 0.50, 0.85, -A * D2R);
})();

var ORNAMENTS = [];
/* objects on the counter top */
(function () {
  var T = CT.h;
  // the pierced disc on its stand
  var gs = new THREE.Group(); gs.position.copy(bayPt(58, 2.22, T)); gs.rotation.y = -58 * D2R + 0.25; scene.add(gs); ORNAMENTS.push({ obj: gs, angle: 58 });
  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.094, 0.032, 28), M.marble);
  base.position.y = 0.016; base.castShadow = true; gs.add(base);
  var post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.115, 10), M.steel);
  post.position.y = 0.09; gs.add(post);
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.047, 18, 52), M.blackMatte);
  ring.position.y = 0.148 + 0.132; ring.castShadow = true; gs.add(ring);

  // a stack of books and one standing spine
  var gb = new THREE.Group(); gb.position.copy(bayPt(68, 2.16, T)); gb.rotation.y = -68 * D2R - 0.12; scene.add(gb); ORNAMENTS.push({ obj: gb, angle: 68 });
  var stack = [0x1b1c20, 0xd8d2c2, 0x2a3b52];
  stack.forEach(function (c, i) {
    var b = slab(0.255, 0.034, 0.185, new THREE.MeshStandardMaterial({ color: c, roughness: 0.72 }),
      rr(-0.008, 0.008), 0.017 + i * 0.034, rr(-0.008, 0.008), rr(-0.06, 0.06));
    b.castShadow = true; gb.add(b);
  });
  var red = slab(0.038, 0.225, 0.165, new THREE.MeshStandardMaterial({ color: 0xa3251f, roughness: 0.62 }), 0.185, 0.113, 0.01, 0.08);
  red.castShadow = true; gb.add(red);

  // the little stoneware bottle at the far end
  var prof = [[0.000, 0.000], [0.052, 0.000], [0.058, 0.020], [0.062, 0.070], [0.052, 0.132],
              [0.028, 0.170], [0.021, 0.196], [0.024, 0.232], [0.020, 0.240], [0.000, 0.242]];
  var vase = new THREE.Mesh(new THREE.LatheGeometry(prof.map(function (p2) { return new THREE.Vector2(p2[0], p2[1]); }), 36), M.clay);
  vase.position.copy(bayPt(-45, 2.20, T)); vase.castShadow = true; scene.add(vase); ORNAMENTS.push({ obj: vase, angle: -45 });
  var peb = new THREE.Mesh(new THREE.SphereGeometry(0.048, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0x2b2724, roughness: 0.42 }));
  peb.scale.set(1, 0.72, 1); peb.position.copy(bayPt(-41.5, 2.30, T + 0.034)); peb.castShadow = true; scene.add(peb); ORNAMENTS.push({ obj: peb, angle: -41.5 });
})();

/* ══════════════ the lounge corner ══════════════ */
function tubChair(x, z, ry) {
  var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  var seat = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.30, 0.145, 32), M.burgundy);
  seat.position.y = 0.415; seat.scale.set(1.06, 1, 0.98); seat.castShadow = true; g.add(seat);
  var back = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.40, 32, 1, true, Math.PI * 0.22, Math.PI * 1.56), M.burgundyDeep);
  back.material.side = THREE.DoubleSide;
  back.position.y = 0.665; back.scale.set(1.06, 1, 0.98); back.castShadow = true; g.add(back);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.030, 10, 40, Math.PI * 1.56), M.burgundy);
  rim.rotation.x = -Math.PI / 2; rim.rotation.z = -Math.PI * 0.22 - Math.PI / 2;
  rim.position.y = 0.865; rim.scale.set(1.06, 0.98, 1); rim.castShadow = true; g.add(rim);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.35, 10), M.blackSteel);
    leg.position.set(q[0] * 0.175, 0.175, q[1] * 0.175);
    leg.rotation.set(q[1] * 0.10, 0, -q[0] * 0.10); leg.castShadow = true; g.add(leg);
  });
  contact(x, z, 0.50, 0.50, 0.8, ry);
  return g;
}
tubChair(-2.72, 0.35, 0.58);
tubChair(-3.26, 1.62, 1.50);

(function () {
  var x = -3.40, z = 0.62;
  var top = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.036, 44), M.lacquer);
  top.position.set(x, 0.735, z); top.castShadow = true; top.receiveShadow = true; scene.add(top);
  var col = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, 0.70, 18), M.blackMatte);
  col.position.set(x, 0.37, z); col.castShadow = true; scene.add(col);
  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.028, 32), M.blackSteel);
  base.position.set(x, 0.014, z); base.castShadow = true; scene.add(base);
  contact(x, z, 0.46, 0.46, 0.8);
})();

/* ══════════════ the sun, driven by hour of day ══════════════ */
function smoothstep(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

function setSun(hour) {
  var alt = 60 * Math.sin(Math.PI * (hour - 6.2) / 12.4);
  var az = 100 + (hour - 6) * 15;
  var off = az - FACADE_AZ;                       // degrees off the bay's normal
  var A = alt * D2R, O = off * D2R;
  var dir = new THREE.Vector3(Math.cos(A) * Math.sin(O), Math.sin(A), -Math.cos(A) * Math.cos(O));
  sun.position.copy(dir).multiplyScalar(34).add(new THREE.Vector3(0.2, 0, 0.4));

  var up = clamp(0.40 + 0.62 * Math.sin(Math.max(alt, 0) * D2R), 0, 1) * smoothstep(-1, 6, alt);
  var facing = smoothstep(96, 74, Math.abs(off));            // does it actually reach the glass?
  var direct = up * facing;
  sun.intensity = 2.80 * direct;
  sun.color.setHex(0xffffff).lerpColors(new THREE.Color(0xff9a4e), new THREE.Color(0xfff5e6), clamp(alt / 42, 0, 1));

  var day = clamp(Math.sin((alt + 9) * D2R), 0, 1);
  hemi.intensity = 0.130 + 0.260 * day;
  skyThrough.intensity = 0.160 + 0.400 * day;
  bounce.intensity = 0.090 + 0.340 * direct;
  renderer.toneMappingExposure = lerp(1.10, 0.86, day);

  var warm = 1 - clamp(alt / 40, 0, 1);
  skyDome.material.color.setRGB(1, 1 - warm * 0.10, 1 - warm * 0.22);
  scene.fog.color.setRGB(lerp(0.765, 0.90, warm), lerp(0.824, 0.80, warm), lerp(0.878, 0.76, warm));

  var hh = Math.floor(hour), mins = Math.round((hour - hh) * 60);
  if (mins === 60) { mins = 0; hh += 1; }
  if (ctx.onSun) ctx.onSun({ hour: hour, hh: hh, mins: mins, azimuth: az, altitude: alt, direct: direct });
  ctx.invalidate();
}

/* ── what the rest of the application may use ───────────────────────────── */
return {
  D2R: D2R, clamp: clamp, lerp: lerp, rnd: rnd, rr: rr, smoothstep: smoothstep,
  cv: cv, tex: tex, grainCanvas: grainCanvas, slab: slab, contact: contact, strut: strut,
  M: M, bayPt: bayPt, chord: chord,
  BAY: BAY, ROOM: ROOM, SILL: SILL, HEAD: HEAD, WIN: WIN, CT: CT,
  stools: STOOLS, ornaments: ORNAMENTS, setSun: setSun,
  lights: { sun: sun, hemi: hemi, skyThrough: skyThrough, bounce: bounce }
};
};
