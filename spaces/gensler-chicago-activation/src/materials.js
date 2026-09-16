// ---------------------------------------------------------------------------
// Shared materials. Satin response throughout, restrained reflections, so the
// black counter, the black holders and the boxes stay legible as DIFFERENT
// surfaces rather than merging into one silhouette.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import {
  fragmentMaterialMaps, FRAGMENT_TILE_MM, makeCarpet, makeMosaicBand,
  makeCityBackdrop, makeTranslucentDetail,
} from './textures.js';

export function buildMaterials() {
  const carpet = makeCarpet();
  const mosaic = makeMosaicBand();
  const city = makeCityBackdrop();
  const translucentDetail = makeTranslucentDetail();

  const M = {
    // -- room ---------------------------------------------------------------
    wall: new THREE.MeshStandardMaterial({ color: 0xece4d5, roughness: 0.95, metalness: 0 }),
    wallTrim: new THREE.MeshStandardMaterial({ color: 0xf2ecdf, roughness: 0.8, metalness: 0 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: 0.96, metalness: 0 }),
    carpet: new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.99, metalness: 0 }),
    mosaic: new THREE.MeshStandardMaterial({ map: mosaic, roughness: 0.55, metalness: 0 }),
    // Window glazing is a cheap transparent surface on purpose: real
    // transmission here costs an extra full scene pass every frame and looks
    // no different at this scale. The translucent SAMPLES keep real
    // transmission, because that is the thing being reviewed.
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xeaf3fb, roughness: 0.08, metalness: 0, transparent: true,
      opacity: 0.22, reflectivity: 0.4, side: THREE.DoubleSide,
    }),
    frame: new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.6, metalness: 0 }),
    backdrop: new THREE.MeshBasicMaterial({ map: city, color: 0xc4ccd2, toneMapped: true }),

    // -- existing furniture -------------------------------------------------
    counterTop: new THREE.MeshStandardMaterial({ color: 0x1f2022, roughness: 0.52, metalness: 0.04 }),
    counterLeg: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.42, metalness: 0.18 }),
    bookcase: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.52, metalness: 0.03 }),
    stoolShell: new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.46, metalness: 0.05 }),
    stoolTube: new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.38, metalness: 0.35 }),
    velvet: new THREE.MeshStandardMaterial({ color: 0x6d2233, roughness: 0.95, metalness: 0 }),
    darkTable: new THREE.MeshStandardMaterial({ color: 0x25262a, roughness: 0.36, metalness: 0.08 }),

    // -- display hardware ---------------------------------------------------
    // The Polygood holder/base black: slightly softer than the counter so the
    // two read as different objects under the same daylight.
    holderBlack: new THREE.MeshStandardMaterial({ color: 0x1e1f21, roughness: 0.48, metalness: 0.02 }),
    boxBlack: new THREE.MeshStandardMaterial({ color: 0x191a1c, roughness: 0.62, metalness: 0 }),
    boxGrey: new THREE.MeshStandardMaterial({ color: 0x8e9095, roughness: 0.68, metalness: 0 }),
    boxInsert: new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.9, metalness: 0 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.86, metalness: 0 }),
    bannerBase: new THREE.MeshStandardMaterial({ color: 0x242528, roughness: 0.4, metalness: 0.4 }),
    pole: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.3, metalness: 0.75 }),
  };

  /** Printed artwork face: a map on a matte paper-like surface. */
  M.printed = (texture) => new THREE.MeshStandardMaterial({
    map: texture, roughness: 0.82, metalness: 0,
  });

  /**
   * Recycled-sheet material. One material per palette; parts get the right
   * fragment size from their own UVs (see physicalUV / FRAGMENT_TILE_MM), not
   * from a per-part texture, so adjacent pads read as one continuous sheet.
   */
  const fragmentMaterials = new Map();
  M.fragmentTileMm = FRAGMENT_TILE_MM;
  M.fragment = (paletteName, seed = 3) => {
    const key = `${paletteName}|${seed}`;
    if (fragmentMaterials.has(key)) return fragmentMaterials.get(key);
    const maps = fragmentMaterialMaps(paletteName, seed);
    const mat = new THREE.MeshStandardMaterial({
      map: maps.map,
      roughnessMap: maps.roughnessMap,
      bumpMap: maps.bumpMap,
      bumpScale: 0.07,
      roughness: 1.0,
      metalness: 0,
    });
    fragmentMaterials.set(key, mat);
    return mat;
  };

  /** Translucent coloured sheet: colour and internal texture kept, never glass-clear. */
  M.translucent = (colour) => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colour),
    roughness: 0.28,
    roughnessMap: translucentDetail,
    metalness: 0,
    transmission: 0.82,
    thickness: 0.012,
    ior: 1.52,
    attenuationColor: new THREE.Color(colour),
    attenuationDistance: 0.05,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
    transparent: true,
    side: THREE.DoubleSide,
  });

  return M;
}
