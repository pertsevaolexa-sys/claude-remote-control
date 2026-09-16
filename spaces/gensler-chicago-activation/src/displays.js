// ---------------------------------------------------------------------------
// The eight display groups.
// ---------------------------------------------------------------------------
// Each builder returns { object, footprint:{ widthMm, depthMm }, ... }.
// The object's origin is the CENTRE of its plan footprint, sitting ON the
// counter (local y = 0), with local +Z toward the visitor. Placement happens
// in main.js, so moving a group can never change its size.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mm, deg } from './units.js';
import { CONFIG } from './config.js';
import { a4HolderPlanDepthMm } from './layout.js';
import { box, slabWithHoles, tube, mesh, group, physicalUV } from './geom.js';
import {
  makeCollectionCard, makeLookCloserSign, makeBannerArtwork,
  makeBrochureCover, makeGrowthCover,
} from './textures.js';

const cfg = CONFIG;

/**
 * Build a box of recycled sheet whose fragments come out at the right physical
 * size, continuous with anything placed next to it.
 *   localMm  - where this piece sits inside its parent part (mm)
 *   sheetMm  - where the parent part samples the sheet (mm), for variety
 */
function sheetBox(wMm, hMm, dMm, tileMm, localMm = [0, 0, 0], sheetMm = [0, 0, 0]) {
  const geo = box(mm(wMm), mm(hMm), mm(dMm));
  geo.translate(mm(localMm[0]), mm(localMm[1]), mm(localMm[2]));
  physicalUV(geo, mm(tileMm), [mm(sheetMm[0]), mm(sheetMm[1]), mm(sheetMm[2])]);
  return geo;
}

/** Extrude a 2-D outline given in the (z, y) plane, thickness along X. */
function prismZY(points, thicknessMm) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: mm(thicknessMm), bevelEnabled: false });
  geo.rotateY(-Math.PI / 2);          // shape x -> world z, extrusion -> world -x
  geo.translate(mm(thicknessMm / 2), 0, 0);
  geo.computeVertexNormals();
  return geo;
}

/** A flat printed plane, used for every piece of artwork. */
function artworkPlane(widthMm, heightMm, texture, M) {
  return mesh(
    new THREE.PlaneGeometry(mm(widthMm), mm(heightMm)),
    M.printed(texture),
    { cast: false },
  );
}

// ---------------------------------------------------------------------------
// 1. Three general brochures
// ---------------------------------------------------------------------------
export function buildBrochures(M) {
  const b = cfg.brochures;
  const g = group('brochures');
  const cover = makeBrochureCover();
  const faces = [
    M.paper, M.paper, M.printed(cover), M.paper, M.paper, M.paper,
  ];
  const widthMm = b.widthMm + b.fanOffsetXMm * (b.count - 1);
  const depthMm = b.depthMm + b.fanOffsetZMm * (b.count - 1);

  for (let i = 0; i < b.count; i += 1) {
    const m = mesh(box(mm(b.widthMm), mm(b.thicknessMm), mm(b.depthMm)), faces);
    m.position.set(
      mm(-widthMm / 2 + b.widthMm / 2 + i * b.fanOffsetXMm),
      mm(b.thicknessMm * (i + 0.5)),
      mm(depthMm / 2 - b.depthMm / 2 - i * b.fanOffsetZMm),
    );
    m.rotation.y = deg(b.fanRotationDeg * (i - 1));
    g.add(m);
  }
  return { object: g, footprint: { widthMm, depthMm } };
}

// ---------------------------------------------------------------------------
// 2a. A4 holder (used twice: Growth and Translucent)
// ---------------------------------------------------------------------------
export function buildA4Holder(M, texture, name) {
  const h = cfg.a4Holder;
  const g = group(name);
  const depthMm = a4HolderPlanDepthMm(cfg);
  const lean = deg(h.leanDeg);
  const zFront = depthMm / 2;

  // Plate, rotated about its bottom front edge.
  const pivot = group(`${name}-plate`);
  pivot.position.set(0, 0, mm(zFront));
  pivot.rotation.x = -lean;
  const plate = mesh(box(mm(h.plateWidthMm), mm(h.plateHeightMm), mm(h.plateThicknessMm)), M.holderBlack);
  plate.position.set(0, mm(h.plateHeightMm / 2), mm(-h.plateThicknessMm / 2));
  pivot.add(plate);

  const art = artworkPlane(h.artworkWidthMm, h.artworkHeightMm, texture, M);
  art.position.set(0, mm(h.plateHeightMm / 2), mm(0.4));
  pivot.add(art);
  g.add(pivot);

  // One centred gusset behind: 90 mm leg up the plate back, 70 mm on the counter.
  const backZ = -h.plateThicknessMm * Math.cos(lean);
  const p1 = [mm(backZ), 0];
  const p2 = [mm(backZ - h.gussetLegBaseMm), 0];
  const p3 = [
    mm(backZ - h.gussetLegPlateMm * Math.sin(lean)),
    mm(h.gussetLegPlateMm * Math.cos(lean) - h.plateThicknessMm * Math.sin(lean)),
  ];
  const gusset = mesh(prismZY([p1, p2, p3], h.gussetThicknessMm), M.holderBlack);
  gusset.position.set(0, 0, mm(zFront));
  g.add(gusset);

  return { object: g, footprint: { widthMm: h.plateWidthMm, depthMm } };
}

export function growthCardTexture() {
  return makeCollectionCard({
    title: 'The Growth Collection',
    swatches: [['#e9e5dc', '#cfc9bd'], ['#d3ddcb', '#a9b89c'], ['#e6d6c8', '#c2a892'], ['#cfd4d8', '#9ea7ad']],
    credit: 'Gensler — Product Design Consultant for the Growth Collection',
  });
}

export function translucentCardTexture() {
  return makeCollectionCard({
    title: 'The Translucent Collection',
    swatches: [['#3f7fd0', '#1f3f8a'], ['#39a7c4', '#1f9e86'], ['#efa219', '#c8352c'], ['#f3cf1e', '#4aa84a']],
    credit: null,
  });
}

// ---------------------------------------------------------------------------
// 2b. Growth Collection sample box - open, cover propped, eight samples
// ---------------------------------------------------------------------------
export function buildGrowthBox(M) {
  const b = cfg.growthBox;
  const g = group('growth-box');
  const coverLean = deg(90 - b.coverOpenAngleDeg);
  const coverProjection = b.depthMm * Math.cos(deg(b.coverOpenAngleDeg));
  const depthMm = b.depthMm + coverProjection;

  // Tray sits forward inside the footprint; the propped cover takes the rest.
  const trayZ = coverProjection / 2;
  const tray = group('growth-tray');
  tray.position.z = mm(trayZ);

  const bottom = mesh(box(mm(b.widthMm), mm(4), mm(b.depthMm)), M.boxGrey);
  bottom.position.y = mm(2);
  tray.add(bottom);

  const innerW = b.widthMm - 2 * b.wallThicknessMm;
  const innerD = b.depthMm - 2 * b.wallThicknessMm;
  const rim = mesh(
    slabWithHoles(mm(b.widthMm), mm(b.depthMm), mm(b.heightMm - 4), [
      { cx: 0, cy: 0, w: mm(innerW), d: mm(innerD) },
    ]),
    M.boxGrey,
  );
  rim.position.y = mm(4);
  tray.add(rim);

  const insert = mesh(box(mm(innerW), mm(2), mm(innerD)), M.boxInsert);
  insert.position.y = mm(5);
  tray.add(insert);

  // Eight rectangular samples, two rows of four.
  const totalW = b.sampleColumns * b.sampleWidthMm + (b.sampleColumns - 1) * b.sampleGapMm;
  const totalD = b.sampleRows * b.sampleDepthMm + (b.sampleRows - 1) * b.sampleGapMm;
  const palettes = ['Oyster', 'Sage', 'Clay', 'Slate', 'Moss', 'Chalk', 'Coral', 'Ink'];
  let k = 0;
  for (let row = 0; row < b.sampleRows; row += 1) {
    for (let col = 0; col < b.sampleColumns; col += 1) {
      const sample = mesh(
        sheetBox(b.sampleWidthMm, b.sampleThicknessMm, b.sampleDepthMm, M.fragmentTileMm,
          [0, 0, 0], [k * 71, 0, k * 37]),
        M.fragment(palettes[k % palettes.length], 60 + k),
      );
      sample.position.set(
        mm(-totalW / 2 + b.sampleWidthMm / 2 + col * (b.sampleWidthMm + b.sampleGapMm)),
        mm(6 + b.sampleThicknessMm / 2),
        mm(totalD / 2 - b.sampleDepthMm / 2 - row * (b.sampleDepthMm + b.sampleGapMm)),
      );
      tray.add(sample);
      k += 1;
    }
  }
  g.add(tray);

  // Cover, full size, hinged at the tray's back top edge and propped upright.
  const hinge = group('growth-cover');
  hinge.position.set(0, mm(b.heightMm), mm(trayZ - b.depthMm / 2));
  hinge.rotation.x = -coverLean;
  const cover = mesh(box(mm(b.widthMm), mm(b.depthMm), mm(b.coverThicknessMm)), M.boxGrey);
  cover.position.set(0, mm(b.depthMm / 2), mm(-b.coverThicknessMm / 2));
  hinge.add(cover);
  const coverArt = artworkPlane(b.widthMm, b.depthMm, makeGrowthCover(b.widthMm, b.depthMm), M);
  coverArt.position.set(0, mm(b.depthMm / 2), mm(0.4));
  hinge.add(coverArt);
  g.add(hinge);

  return { object: g, footprint: { widthMm: b.widthMm, depthMm } };
}

// ---------------------------------------------------------------------------
// 3. LOOK CLOSER installation
// ---------------------------------------------------------------------------
export function buildInstallation(M) {
  const c = cfg.installation;
  const g = group('look-closer-installation');
  const halfD = c.baseDepthMm / 2;

  // -- base: three layers so the two slots are genuine recesses -------------
  const miniHole = {
    cx: mm(c.miniSlotOffsetRightMm),
    cy: mm(halfD - c.miniSlotFromFrontMm),
    w: mm(c.miniSlotLengthMm),
    d: mm(c.miniSlotWidthMm),
  };
  const l1 = mesh(box(mm(c.baseWidthMm), mm(7), mm(c.baseDepthMm)), M.holderBlack);
  l1.position.y = mm(3.5);
  g.add(l1);

  const l2 = mesh(slabWithHoles(mm(c.baseWidthMm), mm(c.baseDepthMm), mm(7), [miniHole]), M.holderBlack);
  l2.position.y = mm(7);
  g.add(l2);

  // Top 5 mm split either side of the full-width main slot.
  const slotHalf = c.slotWidthMm / 2;
  const frontDepth = c.baseDepthMm - c.slotFromFrontMm - slotHalf;
  const backDepth = c.slotFromFrontMm - slotHalf;
  const l3front = mesh(
    slabWithHoles(mm(c.baseWidthMm), mm(frontDepth), mm(c.slotDepthMm), [miniHole]),
    M.holderBlack,
  );
  l3front.position.set(0, mm(14), mm(halfD - frontDepth / 2));
  g.add(l3front);
  const l3back = mesh(box(mm(c.baseWidthMm), mm(c.slotDepthMm), mm(backDepth)), M.holderBlack);
  l3back.position.set(0, mm(16.5), mm(-halfD + backDepth / 2));
  g.add(l3back);

  // -- main panel: one continuous sheet with a recessed 4 x 4 grid ----------
  const panelZ = halfD - c.slotFromFrontMm;
  const panelBottomY = c.baseThicknessMm - c.slotDepthMm;
  const backingT = c.panelThicknessMm - c.grooveDepthMm;
  const oyster = M.fragment('Oyster', 3);

  const panel = group('main-panel');
  panel.position.set(0, mm(panelBottomY), mm(panelZ));

  // Intact backing behind the grooves - Oyster continues through the material.
  const backing = mesh(
    sheetBox(c.panelWidthMm, c.panelHeightMm, backingT, M.fragmentTileMm,
      [0, c.panelHeightMm / 2, -c.panelThicknessMm / 2 + backingT / 2]),
    oyster, { name: 'panel-backing' },
  );
  panel.add(backing);

  // Sixteen raised pads standing 3 mm proud of that backing: the grooves
  // between them show a material floor, not grout and not a printed grid.
  const n = c.gridDivisions;
  const pad = (c.panelWidthMm - (n - 1) * c.grooveWidthMm) / n;
  const padZ = -c.panelThicknessMm / 2 + backingT + c.grooveDepthMm / 2;
  const pads = group('panel-pads');
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      // UVs are baked from the pad's position IN THE PANEL, so the fragment
      // pattern runs straight through the grooves: one sheet, not sixteen tiles.
      const p = mesh(sheetBox(pad, pad, c.grooveDepthMm, M.fragmentTileMm, [
        -c.panelWidthMm / 2 + pad / 2 + col * (pad + c.grooveWidthMm),
        pad / 2 + row * (pad + c.grooveWidthMm),
        padZ,
      ]), oyster);
      pads.add(p);
    }
  }
  panel.add(pads);
  g.add(panel);

  // -- braces ---------------------------------------------------------------
  const braceX = c.baseWidthMm / 2 - 55;
  const addBrace = (size, forward) => {
    const zFace = panelZ + (forward ? 1 : -1) * c.panelThicknessMm / 2;
    const pts = forward
      ? [[mm(zFace), 0], [mm(zFace + size), 0], [mm(zFace), mm(size)]]
      : [[mm(zFace), 0], [mm(zFace - size), 0], [mm(zFace), mm(size)]];
    for (const sx of [-1, 1]) {
      const b = mesh(prismZY(pts, c.braceThicknessMm), M.holderBlack);
      b.position.set(mm(sx * braceX), mm(c.baseThicknessMm), 0);
      g.add(b);
    }
  };
  addBrace(c.frontBraceMm, true);
  addBrace(c.rearBraceMm, false);

  // -- LOOK CLOSER sign, front-left of the same base -----------------------
  const sign = group('look-closer-sign');
  sign.position.set(mm(-c.signOffsetLeftMm), mm(c.baseThicknessMm), mm(halfD - c.signFromFrontMm));
  sign.rotation.x = -deg(c.signLeanDeg);
  const signPlate = mesh(box(mm(c.signWidthMm), mm(c.signHeightMm), mm(c.signThicknessMm)), M.holderBlack);
  signPlate.position.set(0, mm(c.signHeightMm / 2), mm(-c.signThicknessMm / 2));
  sign.add(signPlate);
  const signArt = artworkPlane(c.signWidthMm - 8, c.signHeightMm - 8, makeLookCloserSign(), M);
  signArt.position.set(0, mm(c.signHeightMm / 2), mm(0.4));
  sign.add(signArt);
  g.add(sign);
  const signGusset = mesh(
    prismZY([
      [mm(-c.signThicknessMm), 0],
      [mm(-c.signThicknessMm - c.signGussetWidthMm), 0],
      [mm(-c.signThicknessMm - c.signGussetHeightMm * Math.sin(deg(c.signLeanDeg))),
        mm(c.signGussetHeightMm * Math.cos(deg(c.signLeanDeg)))],
    ], c.signThicknessMm),
    M.holderBlack,
  );
  signGusset.position.set(mm(-c.signOffsetLeftMm), mm(c.baseThicknessMm), mm(halfD - c.signFromFrontMm));
  g.add(signGusset);

  // -- removable plain Oyster coupon, front-right, NO engraving -------------
  const mini = group('mini-sample');
  mini.position.set(
    mm(c.miniSlotOffsetRightMm),
    mm(c.baseThicknessMm - c.miniSlotDepthMm),
    mm(halfD - c.miniSlotFromFrontMm),
  );
  mini.rotation.x = -deg(c.miniLeanDeg);
  // Same sheet as the panel, sampled elsewhere on it. No engraving.
  const coupon = mesh(
    sheetBox(c.miniWidthMm, c.miniHeightMm, c.miniThicknessMm, M.fragmentTileMm,
      [0, c.miniHeightMm / 2, 0], [640, 210, 0]),
    M.fragment('Oyster', 3),
    { name: 'plain-oyster-coupon' },
  );
  mini.add(coupon);
  g.add(mini);

  return {
    object: g,
    footprint: { widthMm: c.baseWidthMm, depthMm: c.baseDepthMm },
    mini,
    miniRestY: mini.position.y,
  };
}

// ---------------------------------------------------------------------------
// 4a. Six loose engraved samples
// ---------------------------------------------------------------------------
function engravingPads(pattern, wMm, dMm, grooveMm) {
  const pads = [];
  const push = (x, z, w, d, rot = 0) => pads.push({ x, z, w, d, rot });
  const inset = 8;
  const iw = wMm - inset * 2;
  const id = dMm - inset * 2;

  if (pattern === 'stripes-x' || pattern === 'stripes-z') {
    const along = pattern === 'stripes-x';
    const span = along ? id : iw;
    const n = 7;
    const barSpan = (span - (n - 1) * grooveMm) / n;
    for (let i = 0; i < n; i += 1) {
      const off = -span / 2 + barSpan / 2 + i * (barSpan + grooveMm);
      if (along) push(0, off, iw, barSpan);
      else push(off, 0, barSpan, id);
    }
  } else if (pattern === 'grid') {
    const nx = 5; const nz = 3;
    const pw = (iw - (nx - 1) * grooveMm) / nx;
    const pd = (id - (nz - 1) * grooveMm) / nz;
    for (let j = 0; j < nz; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        push(-iw / 2 + pw / 2 + i * (pw + grooveMm), -id / 2 + pd / 2 + j * (pd + grooveMm), pw, pd);
      }
    }
  } else if (pattern === 'concentric') {
    const rings = 4;
    const step = grooveMm * 2 + 6;
    for (let r = 0; r < rings; r += 1) {
      const w = iw - r * 2 * step;
      const d = id - r * 2 * step;
      if (w <= 0 || d <= 0) break;
      const t = 6;
      push(0, d / 2 - t / 2, w, t);
      push(0, -d / 2 + t / 2, w, t);
      push(-w / 2 + t / 2, 0, t, d - 2 * t);
      push(w / 2 - t / 2, 0, t, d - 2 * t);
    }
  } else if (pattern === 'chevron') {
    const n = 6;
    const barW = 9;
    for (let i = 0; i < n; i += 1) {
      const x = -iw / 2 + (i + 0.5) * (iw / n);
      push(x, id / 4, barW, id / 2 - 4, deg(30));
      push(x, -id / 4, barW, id / 2 - 4, -deg(30));
    }
  } else { // dots
    const nx = 9; const nz = 6;
    const s = 8;
    for (let j = 0; j < nz; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        push(-iw / 2 + (i + 0.5) * (iw / nx), -id / 2 + (j + 0.5) * (id / nz), s, s);
      }
    }
  }
  return pads;
}

export function buildTiles(M) {
  const t = cfg.tiles;
  const g = group('engraved-samples');
  const widthMm = t.columns * t.faceAcrossMm + (t.columns - 1) * t.gapMm;
  const depthMm = t.rows * t.faceDepthMm + (t.rows - 1) * t.gapMm;
  const backingT = t.thicknessMm - t.engravingDepthMm;

  for (let i = 0; i < t.count; i += 1) {
    const col = i % t.columns;
    const row = Math.floor(i / t.columns);
    const material = M.fragment(t.palettes[i % t.palettes.length], 90 + i);
    const tile = group(`engraved-sample-${i + 1}`);
    const sheetAt = [i * 137, 0, i * 91];

    const backing = mesh(
      sheetBox(t.faceAcrossMm, backingT, t.faceDepthMm, M.fragmentTileMm, [0, backingT / 2, 0], sheetAt),
      material,
    );
    tile.add(backing);

    for (const p of engravingPads(t.patterns[i % t.patterns.length], t.faceAcrossMm, t.faceDepthMm, t.engravingWidthMm)) {
      const geo = box(mm(p.w), mm(t.engravingDepthMm), mm(p.d));
      if (p.rot) geo.rotateY(p.rot);
      geo.translate(mm(p.x), mm(backingT + t.engravingDepthMm / 2), mm(p.z));
      physicalUV(geo, mm(M.fragmentTileMm), [mm(sheetAt[0]), mm(sheetAt[1]), mm(sheetAt[2])]);
      tile.add(mesh(geo, material));
    }

    tile.position.set(
      mm(-widthMm / 2 + t.faceAcrossMm / 2 + col * (t.faceAcrossMm + t.gapMm)),
      0,
      mm(depthMm / 2 - t.faceDepthMm / 2 - row * (t.faceDepthMm + t.gapMm)),
    );
    g.add(tile);
  }
  return { object: g, footprint: { widthMm, depthMm } };
}

// ---------------------------------------------------------------------------
// 4b. Two general sample boxes - one black, one grey
// ---------------------------------------------------------------------------
export function buildGeneralBoxes(M) {
  const b = cfg.generalBoxes;
  const g = group('general-sample-boxes');
  const widthMm = b.count * b.widthMm + (b.count - 1) * b.gapMm;

  for (let i = 0; i < b.count; i += 1) {
    const shell = b.finishes[i] === 'grey' ? M.boxGrey : M.boxBlack;
    const one = group(`general-box-${b.finishes[i]}`);
    const innerW = b.widthMm - 2 * b.wallThicknessMm;
    const innerD = b.depthMm - 2 * b.wallThicknessMm;

    const base = mesh(box(mm(b.widthMm), mm(6), mm(b.depthMm)), shell);
    base.position.y = mm(3);
    one.add(base);
    const rim = mesh(
      slabWithHoles(mm(b.widthMm), mm(b.depthMm), mm(b.heightMm - 6), [
        { cx: 0, cy: 0, w: mm(innerW), d: mm(innerD) },
      ]),
      shell,
    );
    rim.position.y = mm(6);
    one.add(rim);

    // Sample chips standing at a slight angle inside, as in the photograph.
    for (let k = 0; k < b.chipCount; k += 1) {
      const chip = mesh(
        sheetBox(b.chipWidthMm, b.chipHeightMm, b.chipThicknessMm, M.fragmentTileMm,
          [0, 0, 0], [k * 53 + i * 29, k * 41, 0]),
        M.fragment(b.chipPalettes[k % b.chipPalettes.length], 120 + i * 7 + k),
      );
      chip.position.set(
        0,
        mm(b.heightMm - 4),
        mm(innerD / 2 - 10 - k * ((innerD - 20) / b.chipCount)),
      );
      chip.rotation.x = deg(-16);
      one.add(chip);
    }

    one.position.x = mm(-widthMm / 2 + b.widthMm / 2 + i * (b.widthMm + b.gapMm));
    g.add(one);
  }
  return { object: g, footprint: { widthMm, depthMm: b.depthMm } };
}

// ---------------------------------------------------------------------------
// 5. Translucent collection block - no branding
// ---------------------------------------------------------------------------
export function buildTranslucentBlock(M) {
  const t = cfg.translucent;
  const g = group('translucent-block');
  const solidH = t.blockHeightMm - t.slotDepthMm;
  const rot = deg(t.slotPlanAngleDeg);

  const base = mesh(box(mm(t.blockWidthMm), mm(solidH), mm(t.blockDepthMm)), M.boxBlack);
  base.position.y = mm(solidH / 2);
  g.add(base);

  // Ten genuine slots through the top 30 mm, at 25 mm pitch and rotated in
  // plan. The slot long axis runs across the block depth (see the conflict
  // register: the alternative datum cannot be cut).
  const holes = [];
  for (let i = 0; i < t.slotCount; i += 1) {
    const x = (i - (t.slotCount - 1) / 2) * t.slotPitchMm;
    holes.push({ cx: mm(x), cy: 0, w: mm(t.slotWidthMm), d: mm(t.slotLengthMm), rot });
  }
  const top = mesh(
    slabWithHoles(mm(t.blockWidthMm), mm(t.blockDepthMm), mm(t.slotDepthMm), holes),
    M.boxBlack,
  );
  top.position.y = mm(solidH);
  g.add(top);

  for (let i = 0; i < t.slotCount; i += 1) {
    const x = (i - (t.slotCount - 1) / 2) * t.slotPitchMm;
    const sample = mesh(
      box(mm(t.sampleThicknessMm), mm(t.sampleHeightMm), mm(t.sampleWidthMm)),
      M.translucent(t.colours[i % t.colours.length]),
      { receive: false },
    );
    sample.position.set(mm(x), mm(solidH + t.sampleHeightMm / 2), 0);
    sample.rotation.y = rot;
    g.add(sample);
  }

  return { object: g, footprint: { widthMm: t.blockWidthMm, depthMm: t.blockDepthMm } };
}

// ---------------------------------------------------------------------------
// 6. Floor-standing roll-up banner, to the LEFT of the counter
// ---------------------------------------------------------------------------
export function buildBanner(M) {
  const b = cfg.banner;
  const g = group('roll-up-banner');

  const cassette = mesh(box(mm(b.baseWidthMm), mm(b.baseHeightMm), mm(b.baseDepthMm)), M.bannerBase);
  cassette.position.y = mm(b.baseHeightMm / 2);
  g.add(cassette);
  const foot = mesh(box(mm(b.baseWidthMm * 0.5), mm(10), mm(b.baseDepthMm * 1.35)), M.bannerBase);
  foot.position.y = mm(5);
  g.add(foot);

  const pole = mesh(tube(mm(b.poleDiameterMm / 2), mm(b.artworkHeightMm + 30), 12), M.pole);
  pole.position.set(0, mm(b.baseHeightMm + (b.artworkHeightMm + 30) / 2), mm(-b.baseDepthMm / 2 + 24));
  g.add(pole);

  const panel = mesh(
    box(mm(b.artworkWidthMm), mm(b.artworkHeightMm), mm(1.2)),
    M.paper, { name: 'banner-panel' },
  );
  panel.position.set(0, mm(b.baseHeightMm + b.artworkHeightMm / 2), 0);
  g.add(panel);
  const art = mesh(
    new THREE.PlaneGeometry(mm(b.artworkWidthMm), mm(b.artworkHeightMm)),
    M.printed(makeBannerArtwork()),
    { cast: false },
  );
  art.position.set(0, mm(b.baseHeightMm + b.artworkHeightMm / 2), mm(0.9));
  g.add(art);
  const topRail = mesh(box(mm(b.artworkWidthMm + 18), mm(14), mm(16)), M.pole);
  topRail.position.y = mm(b.baseHeightMm + b.artworkHeightMm + 6);
  g.add(topRail);

  return { object: g, footprint: { widthMm: b.baseWidthMm, depthMm: b.baseDepthMm * 1.35 } };
}
