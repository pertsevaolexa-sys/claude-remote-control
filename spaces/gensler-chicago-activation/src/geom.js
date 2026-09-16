// ---------------------------------------------------------------------------
// Geometry helpers. Everything here takes SCENE UNITS (metres) - callers
// convert from the millimetre config with mm() exactly once.
// ---------------------------------------------------------------------------
// Local object convention, used by every display group:
//   local +X  across the counter, to the visitor's right
//   local +Y  up
//   local +Z  toward the visitor (so the FRONT of an object faces +Z)
// ---------------------------------------------------------------------------

import * as THREE from 'three';

export function box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

/**
 * A flat slab in the XZ plane with optional rectangular holes cut right
 * through it. Used for genuine slots and recesses - the translucent block's
 * ten angled slots, the installation base's two slots, the Growth tray rim.
 *
 * Shape coordinates: x across, y toward the BACK. Holes take {cx, cy, w, d, rot}
 * with cy measured toward the back and rot in radians (plan rotation).
 */
export function slabWithHoles(w, d, thickness, holes = []) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -d / 2);
  shape.lineTo(w / 2, -d / 2);
  shape.lineTo(w / 2, d / 2);
  shape.lineTo(-w / 2, d / 2);
  shape.closePath();

  for (const h of holes) {
    const path = new THREE.Path();
    const hw = h.w / 2; const hd = h.d / 2;
    const rot = h.rot || 0;
    const cos = Math.cos(rot); const sin = Math.sin(rot);
    const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => [
      h.cx + x * cos - y * sin,
      h.cy + x * sin + y * cos,
    ]);
    path.moveTo(corners[0][0], corners[0][1]);
    for (let i = 1; i < corners.length; i += 1) path.lineTo(corners[i][0], corners[i][1]);
    path.closePath();
    shape.holes.push(path);
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);        // shape y -> world -z, extrude -> world +y
  geo.translate(0, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Right-angled triangular gusset/brace: legs w (along X) and h (along Y), thickness t along Z. */
export function prism(w, h, t) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(w, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  geo.translate(0, 0, -t / 2);
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Curved (counter / bay) geometry.
// Built in a polar frame whose origin is the centre of curvature, then laid
// flat. Shape coordinates (r sin phi, r cos phi) so that after rotateX(-90):
//     world x = shape x,  world z = -shape y,  world y = extrusion.
// Callers translate by +centreZ to put the centre of curvature in the room.
// ---------------------------------------------------------------------------

function polarShapePath(shape, rInner, rOuter, phiStart, phiEnd, roundEnd, endRadius) {
  const t = (phi) => Math.PI / 2 - phi; // shape-space angle
  const p = (r, phi) => [r * Math.sin(phi), r * Math.cos(phi)];

  const [sx, sy] = p(rInner, phiStart);
  shape.moveTo(sx, sy);
  // inner (front) edge, phiStart -> phiEnd
  shape.absarc(0, 0, rInner, t(phiStart), t(phiEnd), true);

  if (roundEnd) {
    const rc = (rInner + rOuter) / 2;
    const [cx, cy] = p(rc, phiEnd);
    const a0 = Math.atan2(-Math.cos(phiEnd), -Math.sin(phiEnd));
    const a1 = Math.atan2(Math.cos(phiEnd), Math.sin(phiEnd));
    shape.absarc(cx, cy, endRadius, a0, a1, false);
  } else {
    const [ex, ey] = p(rOuter, phiEnd);
    shape.lineTo(ex, ey);
  }

  // outer (back) edge, phiEnd -> phiStart
  shape.absarc(0, 0, rOuter, t(phiEnd), t(phiStart), false);
  shape.closePath();
}

/**
 * A curved slab: annulus sector between rInner and rOuter, swept from phiStart
 * to phiEnd, extruded `height` upward. Optionally rounds the phiEnd end with a
 * semicircular cap (the counter's rounded right end over the bookcase).
 */
export function curvedSlab(rInner, rOuter, phiStart, phiEnd, height, { roundEnd = false } = {}) {
  const shape = new THREE.Shape();
  polarShapePath(shape, rInner, rOuter, phiStart, phiEnd, roundEnd, (rOuter - rInner) / 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height, bevelEnabled: false, curveSegments: 96,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Cylinder helper for tubes, poles and footrings. */
export function tube(radius, height, segments = 20) {
  return new THREE.CylinderGeometry(radius, radius, height, segments);
}

export function torus(radius, thickness, arc = Math.PI * 2) {
  return new THREE.TorusGeometry(radius, thickness, 10, 48, arc);
}

/**
 * Re-map a geometry's UVs so the material covers a FIXED PHYSICAL SIZE rather
 * than one texture per face. This is what keeps the recycled-sheet fragments
 * the same real size on a 450 mm panel, a 120 mm coupon and a 68 mm chip, and
 * what makes the engraved panel read as ONE continuous sheet across all
 * sixteen pads instead of sixteen repeats of the same tile.
 *
 * `originUnits` shifts the sample window, so identical parts can show
 * different areas of the same sheet.
 */
export function physicalUV(geometry, tileUnits, originUnits = [0, 0, 0]) {
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) + originUnits[0];
    const y = pos.getY(i) + originUnits[1];
    const z = pos.getZ(i) + originUnits[2];
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u; let v;
    if (ny >= nx && ny >= nz) { u = x; v = z; }        // face up/down
    else if (nx >= nz) { u = z; v = y; }               // face left/right
    else { u = x; v = y; }                             // face front/back
    uv[i * 2] = u / tileUnits;
    uv[i * 2 + 1] = v / tileUnits;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** A mesh with sensible defaults for this scene. */
export function mesh(geometry, material, { cast = true, receive = true, name = '' } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (name) m.name = name;
  return m;
}

/** Convenience: a named group. */
export function group(name) {
  const g = new THREE.Group();
  g.name = name;
  return g;
}
