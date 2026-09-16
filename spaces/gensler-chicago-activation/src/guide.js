// ---------------------------------------------------------------------------
// The pointing layer: numbered markers over each journey stop, and a frame
// drawn round whatever the active stop is about.
// ---------------------------------------------------------------------------
// Both are built from the real bounding boxes of the scene objects a stop
// names, so they follow the model instead of carrying their own coordinates.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mm } from './units.js';

const TEAL = '#0f5c58';
const MUTED = '#5f6b6a';

function markerTexture(n, active) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2);
  g.fillStyle = active ? TEAL : 'rgba(255,255,255,0.92)';
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = active ? '#ffffff' : MUTED;
  g.stroke();
  g.fillStyle = active ? '#ffffff' : MUTED;
  g.font = `600 ${S * 0.52}px "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), S / 2, S / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Union bounding box of the named objects, in world space. */
export function boundsOf(scene, names) {
  const box = new THREE.Box3();
  let found = false;
  for (const name of names) {
    const obj = scene.getObjectByName(name);
    if (!obj) continue;
    const b = new THREE.Box3().setFromObject(obj);
    if (b.isEmpty()) continue;
    if (found) box.union(b); else box.copy(b);
    found = true;
  }
  return found ? box : null;
}

export class Guide {
  constructor(scene, stops) {
    this.scene = scene;
    this.stops = stops;
    this.active = -1;

    this.markers = new THREE.Group();
    this.markers.name = 'journey-markers';
    this.scene.add(this.markers);

    this.frame = new THREE.Group();
    this.frame.name = 'journey-frame';
    this.frame.visible = false;
    this.scene.add(this.frame);

    this.frameMaterial = new THREE.MeshBasicMaterial({
      color: TEAL, transparent: true, opacity: 0.85, depthWrite: false,
    });
    this.bars = [];
    for (let i = 0; i < 4; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.frameMaterial);
      bar.renderOrder = 900;
      this.bars.push(bar);
      this.frame.add(bar);
    }

    this.sprites = stops.map((stop) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: markerTexture(stop.n, false),
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }));
      sprite.scale.set(0.086, 0.086, 1);
      sprite.renderOrder = 950;
      sprite.userData.stopId = stop.id;
      this.markers.add(sprite);
      return sprite;
    });

    this.place();
  }

  /** Put each marker above the thing its stop is about. */
  place() {
    this.bounds = this.stops.map((stop) => boundsOf(this.scene, stop.targets));
    this.bounds.forEach((box, i) => {
      const sprite = this.sprites[i];
      if (!box) { sprite.visible = false; return; }
      const centre = box.getCenter(new THREE.Vector3());
      sprite.position.set(centre.x, box.max.y + mm(130), centre.z);
    });
  }

  setActive(index) {
    this.active = index;
    this.sprites.forEach((sprite, i) => {
      sprite.material.map.dispose();
      sprite.material.map = markerTexture(this.stops[i].n, i === index);
      sprite.material.needsUpdate = true;
      sprite.scale.setScalar(i === index ? 0.108 : 0.086);
      sprite.scale.z = 1;
    });

    const box = index >= 0 ? this.bounds[index] : null;
    if (!box) { this.frame.visible = false; return; }

    // A frame on the surface the group stands on, 40 mm clear of its footprint.
    const pad = mm(40);
    const t = mm(7);
    const y = box.min.y + mm(2);
    const x0 = box.min.x - pad; const x1 = box.max.x + pad;
    const z0 = box.min.z - pad; const z1 = box.max.z + pad;
    const w = x1 - x0; const d = z1 - z0;
    const cx = (x0 + x1) / 2; const cz = (z0 + z1) / 2;
    const set = (bar, sx, sy, sz, px, py, pz) => {
      bar.scale.set(sx, sy, sz);
      bar.position.set(px, py, pz);
    };
    set(this.bars[0], w, t, t, cx, y, z0);
    set(this.bars[1], w, t, t, cx, y, z1);
    set(this.bars[2], t, t, d, x0, y, cz);
    set(this.bars[3], t, t, d, x1, y, cz);
    this.frame.visible = true;
    this.frameBase = { y };
  }

  /** Gentle pulse so the frame reads as "this one" without shouting. */
  update(elapsed) {
    if (!this.frame.visible) return false;
    const k = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 3.1));
    this.frameMaterial.opacity = 0.35 + 0.5 * k;
    return true;
  }

  setVisible(on) {
    this.markers.visible = on;
    this.frame.visible = on && this.active >= 0;
  }

  /** Which stop, if any, a pointer ray hits. */
  pick(raycaster) {
    const hits = raycaster.intersectObjects(this.sprites, false);
    if (!hits.length) return -1;
    return this.sprites.indexOf(hits[0].object);
  }
}
