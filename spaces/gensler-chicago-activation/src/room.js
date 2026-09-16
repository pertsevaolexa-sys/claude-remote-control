// ---------------------------------------------------------------------------
// The real venue: bay-window room, decorative column, the existing narrow
// curved black counter on its slender supports, the single slatted bookcase
// under its rounded right end, and the three existing tall stools.
//
// Nothing here is distorted to accommodate the display contents.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mm, deg } from './units.js';
import { CONFIG } from './config.js';
import { centreZMm, phiAtS, halfSweep, pointAtMm, yawAtS } from './layout.js';
import { box, curvedSlab, tube, torus, mesh, group } from './geom.js';

const cfg = CONFIG;

function curved(rInnerMm, rOuterMm, phi0, phi1, heightMm, opts) {
  return curvedSlab(mm(rInnerMm), mm(rOuterMm), phi0, phi1, mm(heightMm), opts);
}

/** Place a curved piece: geometry is built about the centre of curvature. */
function placeCurved(m, yMm) {
  m.position.set(0, mm(yMm), mm(centreZMm()));
  return m;
}

/** A strut between two points, for stool legs and chair legs. */
function strut(from, to, radius, material) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const geo = tube(radius, len, 12);
  const m = mesh(geo, material);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return m;
}

// ---------------------------------------------------------------------------
export function buildRoom(M) {
  const g = group('room');
  const Cz = centreZMm();
  const bayInner = cfg.counter.curveRadiusMm + cfg.counter.depthMm + cfg.bay.wallOffsetBehindCounterMm;
  const bayOuter = bayInner + 400;
  const bayHalf = deg(cfg.bay.halfAngleDeg);
  const ceil = cfg.room.ceilingHeightMm;

  // -- floor ----------------------------------------------------------------
  const floorZ0 = -1900; const floorZ1 = 4200;
  const floorX = cfg.room.widthMm / 2 + 100;
  const floor = mesh(
    new THREE.PlaneGeometry(mm(floorX * 2), mm(floorZ1 - floorZ0)),
    M.carpet, { cast: false },
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, mm((floorZ0 + floorZ1) / 2));
  g.add(floor);

  // Patterned mosaic band in front of the bay.
  const bandInner = bayInner - cfg.room.mosaicBandDepthMm;
  const band = mesh(curved(bandInner, bayInner, -bayHalf - 0.30, bayHalf + 0.30, 3), M.mosaic, { cast: false });
  placeCurved(band, 1);
  g.add(band);

  // -- bay wall -------------------------------------------------------------
  const sill = cfg.bay.windowSillHeightMm;
  const head = cfg.bay.windowHeadHeightMm;
  const pierAng = cfg.bay.pierWidthMm / bayInner;
  const n = cfg.bay.windowCount;
  const openAng = (2 * bayHalf - (n + 1) * pierAng) / n;

  // wainscot band below the sill, continuous
  const wainscot = mesh(curved(bayInner, bayOuter, -bayHalf, bayHalf, sill), M.wallTrim);
  placeCurved(wainscot, 0);
  g.add(wainscot);
  // projecting sill
  const sillBand = mesh(curved(bayInner - 40, bayOuter, -bayHalf, bayHalf, 34), M.wallTrim);
  placeCurved(sillBand, sill);
  g.add(sillBand);
  // head band up to the ceiling
  const headBand = mesh(curved(bayInner, bayOuter, -bayHalf, bayHalf, ceil - head), M.wall);
  placeCurved(headBand, head);
  g.add(headBand);

  // piers and glazing
  for (let i = 0; i <= n; i += 1) {
    const p0 = -bayHalf + i * (pierAng + openAng);
    const pier = mesh(curved(bayInner, bayOuter, p0, p0 + pierAng, head - sill), M.wall);
    placeCurved(pier, sill);
    g.add(pier);
  }
  for (let i = 0; i < n; i += 1) {
    const w0 = -bayHalf + pierAng + i * (pierAng + openAng);
    const w1 = w0 + openAng;
    const inset = 60;
    // reveal / frame
    const frameT = cfg.bay.mullionWidthMm;
    const frameAng = frameT / bayInner;
    for (const [a0, a1] of [[w0, w0 + frameAng], [w1 - frameAng, w1]]) {
      const jamb = mesh(curved(bayInner + inset - 30, bayInner + inset + 30, a0, a1, head - sill), M.frame);
      placeCurved(jamb, sill);
      g.add(jamb);
    }
    for (const [y, h] of [[sill, frameT], [head - frameT, frameT], [cfg.bay.transomHeightMm, frameT * 0.8]]) {
      const bar = mesh(curved(bayInner + inset - 30, bayInner + inset + 30, w0, w1, h), M.frame);
      placeCurved(bar, y);
      g.add(bar);
    }
    const glass = mesh(
      curved(bayInner + inset - 4, bayInner + inset + 4, w0, w1, head - sill),
      M.glass, { cast: false, receive: false },
    );
    placeCurved(glass, sill);
    g.add(glass);
  }

  // city backdrop outside the bay
  const backdrop = mesh(
    new THREE.CylinderGeometry(mm(bayOuter + 5200), mm(bayOuter + 5200), mm(9000), 64, 1, true,
      Math.PI - bayHalf - 0.42, 2 * bayHalf + 0.84),
    M.backdrop, { cast: false, receive: false },
  );
  backdrop.material.side = THREE.BackSide;
  backdrop.position.set(0, mm(2200), mm(Cz));
  g.add(backdrop);

  // -- flanking walls, skirting and ceiling ---------------------------------
  const bayEndX = bayInner * Math.sin(bayHalf);
  const bayEndZ = Cz - bayInner * Math.cos(bayHalf);
  const roomHalf = cfg.room.widthMm / 2;
  for (const sign of [-1, 1]) {
    const returnW = roomHalf - bayEndX;
    if (returnW > 0) {
      const ret = mesh(box(mm(returnW), mm(ceil), mm(400)), M.wall);
      ret.position.set(mm(sign * (bayEndX + returnW / 2)), mm(ceil / 2), mm(bayEndZ - 200));
      g.add(ret);
    }
    const side = mesh(box(mm(400), mm(ceil), mm(floorZ1 - bayEndZ)), M.wall);
    side.position.set(mm(sign * (roomHalf + 200)), mm(ceil / 2), mm((bayEndZ + floorZ1) / 2));
    g.add(side);
    const skirt = mesh(box(mm(30), mm(cfg.room.skirtingHeightMm), mm(floorZ1 - bayEndZ)), M.wallTrim);
    skirt.position.set(mm(sign * (roomHalf - 15)), mm(cfg.room.skirtingHeightMm / 2), mm((bayEndZ + floorZ1) / 2));
    g.add(skirt);
  }
  const ceiling = mesh(new THREE.PlaneGeometry(mm(roomHalf * 2), mm(floorZ1 - floorZ0)), M.ceiling, { cast: false });
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, mm(ceil), mm((floorZ0 + floorZ1) / 2));
  g.add(ceiling);

  // -- decorative column at the left of the bay -----------------------------
  const colPhi = -bayHalf - 0.045;
  const colR = bayInner - 130;
  const colX = colR * Math.sin(colPhi);
  const colZ = Cz - colR * Math.cos(colPhi);
  const colD = cfg.bay.columnDiameterMm;
  const capH = cfg.bay.capitalHeightMm;
  const shaftH = ceil - capH;
  const shaft = mesh(tube(mm(colD / 2), mm(shaftH), 28), M.wallTrim);
  shaft.position.set(mm(colX), mm(shaftH / 2), mm(colZ));
  g.add(shaft);
  for (let i = 0; i < cfg.bay.columnFluteCount; i += 1) {
    const a = (i / cfg.bay.columnFluteCount) * Math.PI * 2;
    const flute = mesh(tube(mm(14), mm(shaftH - 260), 8), M.wall, { receive: false });
    flute.position.set(
      mm(colX + Math.cos(a) * colD / 2),
      mm((shaftH - 260) / 2 + 130),
      mm(colZ + Math.sin(a) * colD / 2),
    );
    g.add(flute);
  }
  // capital: stacked scalloped blocks, a simplification of the carved original
  for (let i = 0; i < 3; i += 1) {
    const f = 1 + i * 0.16;
    const blk = mesh(tube(mm((colD / 2) * f + 26), mm(capH / 3), 24), M.wallTrim);
    blk.position.set(mm(colX), mm(shaftH + capH / 6 + i * (capH / 3)), mm(colZ));
    g.add(blk);
  }

  // -- surrounding furniture (far left of the photograph) -------------------
  const sr = cfg.surroundings;
  const tGroup = group('surrounding-furniture');
  const tableTop = mesh(tube(mm(sr.tableDiameterMm / 2), mm(28), 40), M.darkTable);
  tableTop.position.set(mm(sr.tableXMm), mm(sr.tableHeightMm), mm(sr.tableZMm));
  tGroup.add(tableTop);
  const pedestal = mesh(tube(mm(60), mm(sr.tableHeightMm), 18), M.darkTable);
  pedestal.position.set(mm(sr.tableXMm), mm(sr.tableHeightMm / 2), mm(sr.tableZMm));
  tGroup.add(pedestal);
  const footPlate = mesh(tube(mm(260), mm(24), 30), M.darkTable);
  footPlate.position.set(mm(sr.tableXMm), mm(12), mm(sr.tableZMm));
  tGroup.add(footPlate);
  for (let i = 0; i < sr.chairCount; i += 1) {
    const a = Math.PI * (0.18 + i * 0.44);
    const cx = sr.tableXMm + Math.cos(a) * 780;
    const cz = sr.tableZMm + Math.sin(a) * 780;
    const chair = group(`chair-${i}`);
    const seat = mesh(tube(mm(sr.chairWidthMm / 2), mm(150), 24), M.velvet);
    seat.position.set(0, mm(sr.chairSeatHeightMm), 0);
    chair.add(seat);
    const back = mesh(
      new THREE.CylinderGeometry(mm(sr.chairWidthMm / 2), mm(sr.chairWidthMm / 2), mm(sr.chairBackHeightMm), 24, 1, true, Math.PI * 0.15, Math.PI * 1.1),
      M.velvet,
    );
    back.material.side = THREE.DoubleSide;
    back.position.set(0, mm(sr.chairSeatHeightMm + sr.chairBackHeightMm / 2), 0);
    chair.add(back);
    for (let k = 0; k < 4; k += 1) {
      const la = (k / 4) * Math.PI * 2 + Math.PI / 4;
      chair.add(strut(
        new THREE.Vector3(Math.cos(la) * mm(190), mm(sr.chairSeatHeightMm - 80), Math.sin(la) * mm(190)),
        new THREE.Vector3(Math.cos(la) * mm(230), 0, Math.sin(la) * mm(230)),
        mm(14), M.darkTable,
      ));
    }
    chair.position.set(mm(cx), 0, mm(cz));
    chair.rotation.y = -a + Math.PI / 2;
    tGroup.add(chair);
  }
  g.add(tGroup);

  // -- the counter ----------------------------------------------------------
  g.add(buildCounter(M));
  g.add(buildBookcase(M));
  g.add(buildStools(M));

  return g;
}

// ---------------------------------------------------------------------------
function buildCounter(M) {
  const g = group('counter');
  const h = halfSweep();
  const rF = cfg.counter.curveRadiusMm;
  const rB = rF + cfg.counter.depthMm;
  const t = cfg.counter.topThicknessMm;

  const top = mesh(
    curved(rF, rB, -h, h, t, { roundEnd: true }),
    M.counterTop, { name: 'counter-top' },
  );
  placeCurved(top, cfg.counter.heightMm - t);
  g.add(top);

  // Slender square supports. The rounded right end is carried by the bookcase.
  const legH = cfg.counter.heightMm - t;
  for (const s of cfg.counter.legPositionsSMm) {
    for (const v of [cfg.counter.legInsetFrontMm, cfg.counter.depthMm - cfg.counter.legInsetBackMm]) {
      const p = pointAtMm(s, v);
      const leg = mesh(box(mm(cfg.counter.legSectionMm), mm(legH), mm(cfg.counter.legSectionMm)), M.counterLeg);
      leg.position.set(mm(p.x), mm(legH / 2), mm(p.z));
      leg.rotation.y = yawAtS(s);
      g.add(leg);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
function buildBookcase(M) {
  const g = group('bookcase');
  const bc = cfg.bookcase;
  const rIn = cfg.counter.curveRadiusMm + bc.frontInsetMm;
  const rOut = rIn + bc.depthMm;
  const p0 = phiAtS(bc.startSMm);
  const p1 = phiAtS(bc.endSMm);
  const split = p0 + (p1 - p0) * bc.openFraction;

  // Right part: solid slatted volume with the rounded end under the counter.
  const solid = mesh(curved(rIn, rOut, split, p1, bc.heightMm, { roundEnd: true }), M.bookcase);
  placeCurved(solid, 0);
  g.add(solid);

  // Left part: open shelves with books, carcass only.
  const carcassT = 24;
  const base = mesh(curved(rIn, rOut, p0, split, carcassT), M.bookcase);
  placeCurved(base, 0);
  g.add(base);
  const capTop = mesh(curved(rIn, rOut, p0, split, carcassT), M.bookcase);
  placeCurved(capTop, bc.heightMm - carcassT);
  g.add(capTop);
  const back = mesh(curved(rOut - carcassT, rOut, p0, split, bc.heightMm), M.bookcase);
  placeCurved(back, 0);
  g.add(back);
  const endWall = mesh(curved(rIn, rOut, p0, p0 + carcassT / rIn, bc.heightMm), M.bookcase);
  placeCurved(endWall, 0);
  g.add(endWall);

  const shelfGap = (bc.heightMm - 2 * carcassT) / bc.shelfCount;
  for (let i = 0; i < bc.shelfCount; i += 1) {
    const y = carcassT + i * shelfGap;
    if (i > 0) {
      const shelf = mesh(curved(rIn, rOut, p0, split, 18), M.bookcase);
      placeCurved(shelf, y);
      g.add(shelf);
    }
    // Individual spines, so the shelf reads as books rather than a black void.
    const bookR = rOut - carcassT - 90;
    const a0 = p0 + (carcassT + 30) / rIn;
    const a1 = split - 40 / rIn;
    const palette = [0x8d3f35, 0x2f4a5e, 0x6d6551, 0x95867a, 0x3c5a49, 0xb2a389, 0x54424a, 0xc9bda6];
    let phi = a0;
    let k = i * 13;
    while (phi < a1) {
      const wBook = 14 + ((k * 37) % 26);
      const hBook = bc.bookHeightMm * (0.74 + ((k * 17) % 26) / 100);
      const spine = mesh(
        box(mm(wBook), mm(hBook), mm(150)),
        new THREE.MeshStandardMaterial({ color: palette[k % palette.length], roughness: 0.86 }),
      );
      spine.position.set(
        mm(bookR * Math.sin(phi)),
        mm(y + 18 + hBook / 2),
        mm(centreZMm() - bookR * Math.cos(phi)),
      );
      spine.rotation.y = -phi;
      g.add(spine);
      phi += (wBook + 2) / bookR;
      k += 1;
    }
  }

  // Vertical slats across the front face.
  const slatPitch = bc.slatWidthMm + bc.slatGapMm;
  const arcLen = (p1 - split) * rIn;
  const count = Math.floor(arcLen / slatPitch);
  for (let i = 0; i < count; i += 1) {
    const phi = split + ((i + 0.5) * slatPitch) / rIn;
    const x = (rIn + 9) * Math.sin(phi);
    const z = centreZMm() - (rIn + 9) * Math.cos(phi);
    const slat = mesh(box(mm(bc.slatWidthMm), mm(bc.heightMm - 40), mm(26)), M.bookcase);
    slat.position.set(mm(x), mm((bc.heightMm - 40) / 2 + 20), mm(z));
    slat.rotation.y = -phi;
    g.add(slat);
  }
  return g;
}

// ---------------------------------------------------------------------------
function buildStools(M) {
  const g = group('stools');
  const st = cfg.stools;
  for (let i = 0; i < st.count; i += 1) {
    const s = st.positionsSMm[i];
    const p = pointAtMm(s, -st.standoffFromCounterMm);
    const stool = group(`stool-${i}`);

    const seat = mesh(box(mm(st.seatWidthMm), mm(st.seatThicknessMm), mm(st.seatDepthMm)), M.stoolShell);
    seat.position.set(0, mm(st.seatHeightMm), 0);
    stool.add(seat);
    // Softened front lip.
    const lip = mesh(tube(mm(st.seatThicknessMm / 2), mm(st.seatWidthMm), 12), M.stoolShell);
    lip.rotation.z = Math.PI / 2;
    lip.position.set(0, mm(st.seatHeightMm), mm(st.seatDepthMm / 2));
    stool.add(lip);

    // Low back, leaning slightly, at the REAR of the seat so the seat faces
    // the visitor area (the counter is behind the stool).
    const back = mesh(
      new THREE.CylinderGeometry(mm(st.seatWidthMm * 0.60), mm(st.seatWidthMm * 0.60),
        mm(st.backHeightMm), 20, 1, true, Math.PI * 1.20, Math.PI * 0.60),
      M.stoolShell,
    );
    back.material.side = THREE.DoubleSide;
    back.position.set(0, mm(st.seatHeightMm + st.backHeightMm / 2 - 14), mm(-st.seatDepthMm / 2 + 96));
    back.rotation.x = deg(7);
    stool.add(back);

    const half = st.seatWidthMm / 2 - 60;
    const halfD = st.seatDepthMm / 2 - 60;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        stool.add(strut(
          new THREE.Vector3(mm(sx * half * 0.5), mm(st.seatHeightMm - 20), mm(sz * halfD * 0.5)),
          new THREE.Vector3(mm(sx * (half + st.legSplayMm * 0.62)), 0, mm(sz * (halfD + st.legSplayMm * 0.62))),
          mm(st.tubeDiameterMm / 2), M.stoolTube,
        ));
      }
    }
    const ring = mesh(torus(mm(st.footRingRadiusMm), mm(st.tubeDiameterMm / 2.4)), M.stoolTube);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, mm(st.footRingHeightMm), 0);
    stool.add(ring);

    stool.position.set(mm(p.x), 0, mm(p.z));
    // Seat faces the visitor area: rotate 180 deg from the counter-facing yaw.
    stool.rotation.y = yawAtS(s) + Math.PI;
    g.add(stool);
  }
  return g;
}
