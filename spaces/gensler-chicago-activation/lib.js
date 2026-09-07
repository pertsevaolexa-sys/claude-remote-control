/* ═══════════════════════════════════════════════════════════════════════════
   SHARED HELPERS
   Units: configuration is millimetres, the scene is metres. PG.mm() is the
   only place that conversion happens.
   ═══════════════════════════════════════════════════════════════════════════ */

window.PG = (function () {
"use strict";

var PG = {};

PG.mm = function (v) { return v / 1000; };
PG.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

/* deterministic PRNG — every texture and scatter in this model is repeatable,
   so two reviewers looking at the same revision see the same thing */
PG.rng = function (seed) {
  var s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
};

PG.canvas = function (w, h) {
  var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};

/* ── recycled-sheet placeholder ───────────────────────────────────────────
   Dispersed angular flakes in a matte matrix. ILLUSTRATIVE ONLY: not colour
   accurate, not tied to a SKU, and not a substitute for an approved texture
   map. One tile represents `tileMm` millimetres, so physical scale survives
   onto every piece regardless of its size.                                  */
PG.surfaceCanvas = function (def, tileMm, px) {
  px = px || 1024;
  var c = PG.canvas(px, px), x = c.getContext('2d');
  var perMm = px / tileMm;
  var r = PG.rng(def.seed);

  x.fillStyle = def.base; x.fillRect(0, 0, px, px);

  // broad mottle, so a large panel does not read as flat vinyl
  for (var m = 0; m < 90; m++) {
    var g = x.createRadialGradient(r() * px, r() * px, 0, r() * px, r() * px, (40 + r() * 130) * perMm);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.012 + r() * 0.022).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, px, px);
  }

  // the Growth range includes fibrous surfaces as well as flaked ones
  if (def.pattern === 'fibre') {
    var strands = Math.round(tileMm * tileMm / 260 * (def.density || 1));
    x.lineCap = 'round';
    for (var f = 0; f < strands; f++) {
      var sx = r() * px, sy = r() * px;
      var ang = r() * Math.PI * 2, len = (18 + r() * 90) * perMm;
      x.strokeStyle = def.flake[(r() * def.flake.length) | 0];
      x.globalAlpha = 0.10 + r() * 0.30;
      x.lineWidth = (0.5 + r() * 1.4) * perMm;
      x.beginPath();
      x.moveTo(sx, sy);
      x.quadraticCurveTo(
        sx + Math.cos(ang) * len * 0.5 + (r() - 0.5) * len * 0.7,
        sy + Math.sin(ang) * len * 0.5 + (r() - 0.5) * len * 0.7,
        sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      x.stroke();
    }
    x.globalAlpha = 1;
    return c;
  }

  // the flakes themselves: 3–18 mm, angular, in three tones
  var count = Math.round(tileMm * tileMm / 420 * (def.density || 1));
  for (var i = 0; i < count; i++) {
    var cx = r() * px, cy = r() * px;
    var len = (3 + r() * 15) * perMm, wid = len * (0.34 + r() * 0.46);
    var rot = r() * Math.PI;
    x.save(); x.translate(cx, cy); x.rotate(rot);
    x.fillStyle = def.flake[(r() * def.flake.length) | 0];
    x.globalAlpha = 0.20 + r() * 0.38;
    x.beginPath();
    var sides = 4 + ((r() * 3) | 0);
    for (var s = 0; s < sides; s++) {
      var a = (s / sides) * Math.PI * 2;
      var rr = (s % 2 ? 0.62 : 1) * (0.5 + r() * 0.22);
      x.lineTo(Math.cos(a) * len * rr, Math.sin(a) * wid * rr);
    }
    x.closePath(); x.fill();
    x.restore();
  }
  x.globalAlpha = 1;
  return c;
};

/* wrap a canvas as a texture whose repeat is set from real dimensions, and
   offset per piece so no two pieces show the same patch of the tile */
PG.surfaceTexture = function (THREE, canvas, tileMm, widthMm, heightMm, offsetSeed) {
  var t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  // repeat stays 1: PG.planarUV already lays UVs out in tile units, so the
  // physical scale is carried by the geometry, not by the texture transform.
  // Only the offset changes, so no two pieces show the same patch of tile.
  var r = PG.rng(offsetSeed || 7);
  t.offset.set(r(), r());
  return t;
};

/* ── printed cards ────────────────────────────────────────────────────────
   Rendered at 4 px/mm so copy stays legible in the close-up cameras.        */
PG.cardCanvas = function (wMm, hMm, draw, ppm) {
  ppm = ppm || 4;
  var c = PG.canvas(Math.round(wMm * ppm), Math.round(hMm * ppm)), x = c.getContext('2d');
  x.fillStyle = '#f4f2ed'; x.fillRect(0, 0, c.width, c.height);
  draw(x, c.width, c.height, ppm);
  return c;
};

PG.cardTexture = function (THREE, canvas) {
  var t = new THREE.CanvasTexture(canvas);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
};

/* text helper for card drawing: returns the y after the block */
PG.text = function (x, str, px, y, opts) {
  opts = opts || {};
  x.fillStyle = opts.colour || '#1b1b1e';
  x.font = (opts.weight || 600) + ' ' + px + 'px ' + (opts.family ||
    '"Helvetica Neue", Helvetica, Arial, sans-serif');
  x.textBaseline = 'alphabetic';
  if (opts.spacing) {
    var cx = opts.x || 0;
    for (var i = 0; i < str.length; i++) { x.fillText(str[i], cx, y); cx += x.measureText(str[i]).width + opts.spacing; }
  } else {
    x.textAlign = opts.align || 'left';
    x.fillText(str, opts.x || 0, y);
    x.textAlign = 'left';
  }
  return y + px * (opts.lead || 1.35);
};

/* ── planar UV mapping ────────────────────────────────────────────────────
   A Wall Tiles panel is ONE panel with grooves machined into it. If each
   raised field carried its own 0–1 UVs, the material would restart at every
   groove and the panel would read as an assembly of loose tiles — precisely
   the misrepresentation this model exists to avoid. So every piece of a panel
   is mapped from its position in the panel, not from its own extents.       */
PG.planarUV = function (geo, ox, oy, tileM, plane) {
  var pos = geo.attributes.position, uv = geo.attributes.uv, nor = geo.attributes.normal;
  var oz = 0;
  for (var i = 0; i < pos.count; i++) {
    var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    var a, b;
    if (nor) {
      var nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
      if (nx >= ny && nx >= nz)      { a = z + oz; b = y + oy; }   // side edge
      else if (ny >= nx && ny >= nz) { a = x + ox; b = z + oz; }   // top / bottom edge
      else                           { a = x + ox; b = y + oy; }   // face
    } else if (plane === 'xz') { a = x + ox; b = z + oy; }
    else { a = x + ox; b = y + oy; }
    uv.setXY(i, a / tileM, b / tileM);
  }
  uv.needsUpdate = true;
  return geo;
};

/* ── the host counter as a polyline ───────────────────────────────────────
   The photographed counter is modelled as an arc concentric with the bay.
   Sample it when you need vertices rather than an arc.                      */
PG.counterPolyline = function (CFG, samples) {
  var c = CFG.counter, b = CFG.room.bay, out = [];
  var n = samples || 24, D2R = Math.PI / 180;
  for (var i = 0; i <= n; i++) {
    var a = (c.startAngle + (c.endAngle - c.startAngle) * i / n) * D2R;
    out.push({
      outer: [PG.mm(c.outerRadius) * Math.sin(a), PG.mm(b.centreZ) - PG.mm(c.outerRadius) * Math.cos(a)],
      inner: [PG.mm(c.outerRadius - c.depthAtActiveZone) * Math.sin(a),
              PG.mm(b.centreZ) - PG.mm(c.outerRadius - c.depthAtActiveZone) * Math.cos(a)]
    });
  }
  return out;
};

/* ── merge geometries ─────────────────────────────────────────────────────
   An engraving can run to several hundred raised fields. Merging them keeps a
   whole panel at two draw calls instead of one per cell. three's UMD build
   does not ship BufferGeometryUtils, so this is the small part of it we need. */
PG.merge = function (THREE, geos) {
  var pos = [], nor = [], uv = [], idx = [], off = 0;
  geos.forEach(function (g) {
    var p = g.attributes.position, nm = g.attributes.normal, u = g.attributes.uv, i;
    for (i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(nm.getX(i), nm.getY(i), nm.getZ(i));
      uv.push(u.getX(i), u.getY(i));
    }
    if (g.index) { for (i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); }
    else         { for (i = 0; i < p.count; i++)       idx.push(i + off); }
    off += p.count;
    g.dispose();
  });
  var out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv',       new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
};

PG.hasWebGL = function () {
  try {
    var c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
};

return PG;
})();
