// ---------------------------------------------------------------------------
// Procedural textures.
// ---------------------------------------------------------------------------
// None of the supplied artwork files reached this session (see assets/README.md),
// so every printed surface here is a PLACEHOLDER generated at the correct
// physical aspect ratio. Placeholders deliberately use grey text bars instead of
// invented body copy, and a labelled block instead of a QR code: no technical
// approval, performance, price or sustainability claim is stated anywhere.
//
// Material appearance (Oyster and the Growth/Translucent palettes) is generated
// rather than photographed, so fragment scale stays correct relative to the
// real part size instead of being stretched from a product photo.
// ---------------------------------------------------------------------------

import * as THREE from 'three';

// -- deterministic pseudo-random, so every reload looks identical -----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d') };
}

function toTexture(c, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ---------------------------------------------------------------------------
// Terrazzo / recycled-fragment generator.
// Closely packed irregular polygonal fragments with fine boundaries - the way
// Polygood recycled sheet actually reads. NOT marble veining, NOT sparse dots.
// Seamless (toroidal), so it can tile across large and small parts alike.
// ---------------------------------------------------------------------------
export function makeFragmentMaps({
  px = 1024,
  cells = 64,
  seed = 1,
  palette,
  boundary = '#bcb7ae',
  boundaryPx = 0.95,
  jitter = 0.42,
}) {
  const rnd = mulberry32(seed);
  const sites = [];
  const colours = [];
  for (let j = 0; j < cells; j += 1) {
    for (let i = 0; i < cells; i += 1) {
      sites.push([
        ((i + 0.5 + (rnd() - 0.5) * 2 * jitter) / cells) * px,
        ((j + 0.5 + (rnd() - 0.5) * 2 * jitter) / cells) * px,
      ]);
      // weighted pick
      let roll = rnd();
      let chosen = palette[palette.length - 1];
      for (const entry of palette) {
        if (roll < entry.w) { chosen = entry; break; }
        roll -= entry.w;
      }
      const shade = 1 + (rnd() - 0.5) * 0.07;
      const [r, g, b] = hexToRgb(chosen.c);
      colours.push([
        Math.min(255, r * shade), Math.min(255, g * shade), Math.min(255, b * shade),
        chosen.rough === undefined ? 0.45 : chosen.rough,
      ]);
    }
  }

  const { c: colourCanvas, g: cg } = canvas2d(px, px);
  const { c: roughCanvas, g: rg } = canvas2d(px, px);
  const colourImg = cg.createImageData(px, px);
  const roughImg = rg.createImageData(px, px);
  const cellPx = px / cells;
  const [br, bg, bb] = hexToRgb(boundary);

  for (let y = 0; y < px; y += 1) {
    const cy = Math.floor(y / cellPx);
    for (let x = 0; x < px; x += 1) {
      const cx = Math.floor(x / cellPx);
      let best = Infinity; let second = Infinity; let bestIdx = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const gx = (cx + dx + cells) % cells;
          const gy = (cy + dy + cells) % cells;
          const idx = gy * cells + gx;
          // toroidal offset so the map tiles seamlessly
          let sx = sites[idx][0] + (cx + dx < 0 ? -px : 0) + (cx + dx >= cells ? px : 0);
          let sy = sites[idx][1] + (cy + dy < 0 ? -px : 0) + (cy + dy >= cells ? px : 0);
          const d = (sx - x) * (sx - x) + (sy - y) * (sy - y);
          if (d < best) { second = best; best = d; bestIdx = idx; }
          else if (d < second) { second = d; }
        }
      }
      const edge = Math.sqrt(second) - Math.sqrt(best);
      const [r, g, b, rough] = colours[bestIdx];
      const o = (y * px + x) * 4;
      if (edge < boundaryPx) {
        const k = 1 - edge / boundaryPx;
        colourImg.data[o] = r + (br - r) * k;
        colourImg.data[o + 1] = g + (bg - g) * k;
        colourImg.data[o + 2] = b + (bb - b) * k;
        const rr = Math.min(1, rough + 0.22 * k) * 255;
        roughImg.data[o] = rr; roughImg.data[o + 1] = rr; roughImg.data[o + 2] = rr;
      } else {
        colourImg.data[o] = r; colourImg.data[o + 1] = g; colourImg.data[o + 2] = b;
        const rr = rough * 255;
        roughImg.data[o] = rr; roughImg.data[o + 1] = rr; roughImg.data[o + 2] = rr;
      }
      colourImg.data[o + 3] = 255;
      roughImg.data[o + 3] = 255;
    }
  }
  cg.putImageData(colourImg, 0, 0);
  rg.putImageData(roughImg, 0, 0);
  return { colourCanvas, roughCanvas };
}

// Oyster, PS2701: closely packed white/ivory fragments, fine grey boundaries,
// occasional darker fragments. Reference: polygood.com/product/oyster/
export const OYSTER_PALETTE = [
  { c: '#f8f6f1', w: 0.28, rough: 0.34 },
  { c: '#f1eee7', w: 0.22, rough: 0.36 },
  { c: '#fdfcf9', w: 0.16, rough: 0.32 },
  { c: '#e9e5dc', w: 0.14, rough: 0.38 },
  { c: '#dcd7cd', w: 0.09, rough: 0.40 },
  { c: '#c2bdb3', w: 0.05, rough: 0.42 },
  { c: '#7a7871', w: 0.04, rough: 0.44 },
  { c: '#474640', w: 0.02, rough: 0.46 },
];

export const GROWTH_PALETTES = [
  { name: 'Oyster', base: OYSTER_PALETTE },
  { name: 'Sage', base: [{ c: '#dfe4d8', w: 0.34, rough: 0.36 }, { c: '#c9d2c0', w: 0.24, rough: 0.38 }, { c: '#eef1e9', w: 0.16, rough: 0.34 }, { c: '#9fae94', w: 0.14, rough: 0.4 }, { c: '#5d6a55', w: 0.12, rough: 0.44 }] },
  { name: 'Clay', base: [{ c: '#e7d8cc', w: 0.32, rough: 0.36 }, { c: '#d6c0af', w: 0.24, rough: 0.38 }, { c: '#f3eae2', w: 0.16, rough: 0.34 }, { c: '#b8907a', w: 0.16, rough: 0.4 }, { c: '#6f4f3e', w: 0.12, rough: 0.44 }] },
  { name: 'Slate', base: [{ c: '#cfd3d6', w: 0.3, rough: 0.36 }, { c: '#aeb5ba', w: 0.24, rough: 0.38 }, { c: '#e8ebed', w: 0.16, rough: 0.34 }, { c: '#7d868d', w: 0.18, rough: 0.4 }, { c: '#3d4449', w: 0.12, rough: 0.44 }] },
  { name: 'Ink', base: [{ c: '#4a4a4c', w: 0.3, rough: 0.38 }, { c: '#2f2f31', w: 0.26, rough: 0.4 }, { c: '#6b6b6e', w: 0.18, rough: 0.38 }, { c: '#9a9a9c', w: 0.14, rough: 0.36 }, { c: '#d8d8da', w: 0.12, rough: 0.34 }] },
  { name: 'Coral', base: [{ c: '#e8b9a8', w: 0.3, rough: 0.36 }, { c: '#d9937c', w: 0.24, rough: 0.38 }, { c: '#f5ded4', w: 0.18, rough: 0.34 }, { c: '#b2624b', w: 0.16, rough: 0.4 }, { c: '#7a3a29', w: 0.12, rough: 0.44 }] },
  { name: 'Moss', base: [{ c: '#c3cbb2', w: 0.3, rough: 0.36 }, { c: '#a3ae8d', w: 0.24, rough: 0.38 }, { c: '#e2e6d9', w: 0.18, rough: 0.34 }, { c: '#6f7d58', w: 0.16, rough: 0.4 }, { c: '#43502f', w: 0.12, rough: 0.44 }] },
  { name: 'Chalk', base: [{ c: '#f4f3f1', w: 0.34, rough: 0.34 }, { c: '#e6e4e0', w: 0.26, rough: 0.36 }, { c: '#cfccc7', w: 0.18, rough: 0.38 }, { c: '#aaa7a1', w: 0.12, rough: 0.4 }, { c: '#7c7a75', w: 0.1, rough: 0.42 }] },
];

const fragmentCache = new Map();

/**
 * One seamless sheet of recycled material, representing a FIXED physical area.
 * Geometry UVs are scaled to this size (see physicalUV in geom.js), so every
 * part - a 450 mm panel, a 120 mm coupon, a 68 mm chip - shows fragments at the
 * same real size, about 6 mm across, matching the Oyster reference. Adjacent
 * pieces of one part therefore read as ONE continuous sheet.
 */
export const FRAGMENT_TILE_MM = 300;
const FRAGMENT_CELLS = 50;   // 300 / 50 = 6 mm fragments

export function fragmentMaterialMaps(paletteName, seed = 3) {
  const key = `${paletteName}|${seed}`;
  if (fragmentCache.has(key)) return fragmentCache.get(key);
  const entry = GROWTH_PALETTES.find((p) => p.name === paletteName) || GROWTH_PALETTES[0];
  const { colourCanvas, roughCanvas } = makeFragmentMaps({
    px: 1024, cells: FRAGMENT_CELLS, seed, palette: entry.base,
  });
  const wrap = { repeat: [1, 1] };
  const maps = {
    map: toTexture(colourCanvas, wrap),
    roughnessMap: toTexture(roughCanvas, { srgb: false, ...wrap }),
    bumpMap: toTexture(roughCanvas, { srgb: false, ...wrap }),
  };
  fragmentCache.set(key, maps);
  return maps;
}

// ---------------------------------------------------------------------------
// Placeholder artwork
// ---------------------------------------------------------------------------
const TEAL = '#0f5c58';
const TEAL_DEEP = '#0a4542';
const INK = '#1c1c1c';

function wordmark(g, x, y, size, colour = INK, withTagline = true) {
  // Simplified Polygood identity block: geometric mark + lowercase wordmark.
  g.save();
  g.translate(x, y);
  g.fillStyle = colour;
  const s = size;
  g.beginPath();
  g.moveTo(s * 0.5, 0);
  g.lineTo(s, s * 0.86);
  g.lineTo(0, s * 0.86);
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.moveTo(s * 0.5, s * 0.3);
  g.lineTo(s * 0.78, s * 0.76);
  g.lineTo(s * 0.22, s * 0.76);
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = colour;
  g.font = `600 ${s * 0.92}px "Helvetica Neue", Arial, sans-serif`;
  g.textBaseline = 'alphabetic';
  g.fillText('polygood', s * 1.32, s * 0.86);
  if (withTagline) {
    g.font = `400 ${s * 0.3}px "Helvetica Neue", Arial, sans-serif`;
    g.globalAlpha = 0.72;
    g.fillText('by the good plastic company', s * 1.34, s * 1.3);
    g.globalAlpha = 1;
  }
  g.restore();
}

function textBars(g, x, y, width, lines, lineH, gap, colour = '#c4c4c4', lastFraction = 0.62) {
  g.fillStyle = colour;
  for (let i = 0; i < lines; i += 1) {
    const w = i === lines - 1 ? width * lastFraction : width * (0.9 + 0.1 * ((i * 7) % 3) / 2);
    g.fillRect(x, y + i * (lineH + gap), w, lineH);
  }
  return y + lines * (lineH + gap) - gap;
}

function placeholderTag(g, x, y, size, label = 'ARTWORK PLACEHOLDER') {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.30)';
  g.font = `600 ${size}px "Helvetica Neue", Arial, sans-serif`;
  g.letterSpacing = `${size * 0.12}px`;
  g.fillText(label, x, y);
  g.restore();
}

/** Landscape A4 collection card, 297 x 210 mm. */
export function makeCollectionCard({ title, swatches, credit, seedBase = 40 }) {
  const W = 1782; const H = 1260; // 6 px/mm
  const { c, g } = canvas2d(W, H);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);

  const m = 96;
  wordmark(g, m, m, 38);

  g.fillStyle = INK;
  g.font = '300 96px "Helvetica Neue", Arial, sans-serif';
  const words = title.split(' ');
  const head = [words.slice(0, words.length - 1).join(' '), words[words.length - 1]];
  g.fillText(head[0], m, m + 230);
  g.fillText(head[1], m, m + 230 + 108);

  textBars(g, m, m + 420, 640, 5, 16, 22);

  // Muted image blocks - stand-ins for the photographs on the real card.
  const bx = W * 0.47;
  const bw = (W - bx - m);
  const bh = (H - 2 * m - 120);
  const cols = 2; const rows = 2; const gp = 24;
  const cw = (bw - (cols - 1) * gp) / cols;
  const ch = (bh - (rows - 1) * gp) / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let cIdx = 0; cIdx < cols; cIdx += 1) {
      const sw = swatches[(r * cols + cIdx) % swatches.length];
      const grad = g.createLinearGradient(bx + cIdx * (cw + gp), m + r * (ch + gp), bx + cIdx * (cw + gp) + cw, m + r * (ch + gp) + ch);
      grad.addColorStop(0, sw[0]);
      grad.addColorStop(1, sw[1]);
      g.fillStyle = grad;
      g.fillRect(bx + cIdx * (cw + gp), m + r * (ch + gp), cw, ch);
    }
  }

  g.fillStyle = '#e2e2e2';
  g.fillRect(m, H - m - 78, W - 2 * m, 2);
  if (credit) {
    g.fillStyle = '#4a4a4a';
    g.font = '400 30px "Helvetica Neue", Arial, sans-serif';
    g.fillText(credit, m, H - m - 28);
  }
  placeholderTag(g, W - m - 330, H - m - 28, 24);
  void seedBase;
  return toTexture(c);
}

/** LOOK CLOSER sign, provisionally 210 x 148 mm landscape. */
export function makeLookCloserSign() {
  const W = 1260; const H = 888; // 6 px/mm
  const { c, g } = canvas2d(W, H);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  const m = 78;
  wordmark(g, m, m, 26, INK, false);

  g.fillStyle = INK;
  g.font = '300 118px "Helvetica Neue", Arial, sans-serif';
  g.fillText('Look closer', m, m + 250);

  g.strokeStyle = TEAL;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(m, m + 300);
  g.lineTo(m + 190, m + 300);
  g.stroke();

  g.fillStyle = '#3a3a3a';
  g.font = '400 46px "Helvetica Neue", Arial, sans-serif';
  g.fillText('Please pick up the sample.', m, m + 402);
  g.font = '400 34px "Helvetica Neue", Arial, sans-serif';
  g.fillStyle = '#6a6a6a';
  g.fillText('Engraved panel and plain material,', m, m + 470);
  g.fillText('same sheet.', m, m + 516);

  placeholderTag(g, m, H - 46, 22);
  return toTexture(c);
}

/** Roll-up banner artwork, 457.2 x 1122.68 mm - drawn at the true aspect. */
export function makeBannerArtwork() {
  const W = 914; const H = 2245; // 2 px/mm, true 1 : 2.455
  const { c, g } = canvas2d(W, H);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);

  // Teal field with a soft wave edge, as in the venue photograph.
  const grad = g.createLinearGradient(0, 0, W, H * 0.55);
  grad.addColorStop(0, TEAL_DEEP);
  grad.addColorStop(1, '#17726c');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(W, 0);
  g.lineTo(W, H * 0.40);
  g.bezierCurveTo(W * 0.66, H * 0.455, W * 0.34, H * 0.395, 0, H * 0.455);
  g.closePath();
  g.fill();

  g.save();
  g.globalAlpha = 0.10;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(0, H * 0.30);
  g.bezierCurveTo(W * 0.4, H * 0.355, W * 0.6, H * 0.255, W, H * 0.315);
  g.lineTo(W, H * 0.40);
  g.bezierCurveTo(W * 0.66, H * 0.455, W * 0.34, H * 0.395, 0, H * 0.455);
  g.closePath();
  g.fill();
  g.restore();

  const m = 74;
  wordmark(g, m, H * 0.10, 40, '#ffffff');

  g.fillStyle = '#ffffff';
  g.font = '300 68px "Helvetica Neue", Arial, sans-serif';
  g.fillText('Surface material', m, H * 0.215);
  g.fillText('with a second life', m, H * 0.215 + 80);

  // QR position marked, NOT fabricated.
  const qr = 210;
  const qx = m; const qy = H * 0.50;
  g.fillStyle = '#eceae6';
  g.fillRect(qx, qy, qr, qr);
  g.strokeStyle = '#c9c6c0';
  g.lineWidth = 3;
  g.strokeRect(qx + 1.5, qy + 1.5, qr - 3, qr - 3);
  g.fillStyle = '#8c8880';
  g.font = '600 20px "Helvetica Neue", Arial, sans-serif';
  g.fillText('QR CODE', qx + 18, qy + qr / 2 - 6);
  g.fillText('NOT SUPPLIED', qx + 18, qy + qr / 2 + 22);

  g.fillStyle = INK;
  g.font = '600 54px "Helvetica Neue", Arial, sans-serif';
  g.fillText('Polygood', m, qy + qr + 96);

  textBars(g, m, qy + qr + 140, W - 2 * m - 120, 7, 13, 20, '#cfcdc9');
  placeholderTag(g, m, H - 64, 22);
  return toTexture(c);
}

/** 200 x 200 mm brochure cover, olive green. */
export function makeBrochureCover() {
  const S = 800;
  const { c, g } = canvas2d(S, S);
  const grad = g.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, '#6f7a4c');
  grad.addColorStop(1, '#5c6640');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  wordmark(g, 64, 64, 30, '#f2f3ec');
  g.fillStyle = 'rgba(255,255,255,0.90)';
  g.font = '300 52px "Helvetica Neue", Arial, sans-serif';
  g.fillText('Polygood', 64, S - 150);
  textBars(g, 64, S - 110, 300, 2, 11, 16, 'rgba(255,255,255,0.45)');
  placeholderTag(g, 64, S - 36, 18);
  return toTexture(c);
}

/** Growth Collection box cover - pale blue, with the supplied Gensler credit. */
export function makeGrowthCover(widthMm, heightMm) {
  const px = 4;
  const W = Math.round(widthMm * px); const H = Math.round(heightMm * px);
  const { c, g } = canvas2d(W, H);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#d5e3e8');
  grad.addColorStop(1, '#c3d6dd');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  const m = W * 0.09;
  wordmark(g, m, m, W * 0.038, '#17323a');

  g.fillStyle = '#122b33';
  g.font = `300 ${W * 0.098}px "Helvetica Neue", Arial, sans-serif`;
  g.fillText('The Growth', m, H * 0.46);
  g.fillText('Collection', m, H * 0.46 + W * 0.112);

  g.strokeStyle = 'rgba(18,43,51,0.35)';
  g.lineWidth = Math.max(1, W * 0.004);
  g.beginPath();
  g.moveTo(m, H * 0.72);
  g.lineTo(W - m, H * 0.72);
  g.stroke();

  g.fillStyle = '#284650';
  g.font = `400 ${W * 0.032}px "Helvetica Neue", Arial, sans-serif`;
  g.fillText('Gensler — Product Design Consultant', m, H * 0.80);
  g.font = `400 ${W * 0.026}px "Helvetica Neue", Arial, sans-serif`;
  g.fillStyle = 'rgba(40,70,80,0.7)';
  g.fillText('for the Growth Collection', m, H * 0.855);
  placeholderTag(g, m, H - m * 0.35, W * 0.018);
  return toTexture(c);
}

/** Subtle internal texture for a translucent sample. */
export function makeTranslucentDetail(seed = 11) {
  const S = 256;
  const { c, g } = canvas2d(S, S);
  const rnd = mulberry32(seed);
  const img = g.createImageData(S, S);
  for (let i = 0; i < S * S; i += 1) {
    const v = 150 + rnd() * 60;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.5;
  g.filter = 'blur(2px)';
  g.drawImage(c, 0, 0);
  return toTexture(c, { srgb: false, repeat: [2, 2] });
}

// ---------------------------------------------------------------------------
// Room surfaces
// ---------------------------------------------------------------------------
export function makeCarpet() {
  const S = 512;
  const { c, g } = canvas2d(S, S);
  const rnd = mulberry32(21);
  g.fillStyle = '#ded8ce';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i += 1) {
    const v = 190 + rnd() * 50;
    g.fillStyle = `rgba(${v},${v - 6},${v - 16},0.30)`;
    g.fillRect(rnd() * S, rnd() * S, 2, 1);
  }
  return toTexture(c, { repeat: [12, 12] });
}

/** Patterned mosaic band in front of the bay, as in the venue photograph. */
export function makeMosaicBand() {
  const S = 512;
  const { c, g } = canvas2d(S, S);
  const rnd = mulberry32(33);
  g.fillStyle = '#ded9cf';
  g.fillRect(0, 0, S, S);
  const tile = S / 16;
  const cols = ['#cfc9bd', '#b9b3a6', '#8f9aa1', '#5d6b74', '#d9d4c8', '#7e8a91'];
  for (let j = 0; j < 16; j += 1) {
    for (let i = 0; i < 16; i += 1) {
      const star = (i + j) % 4 === 0;
      g.fillStyle = star ? cols[3 + Math.floor(rnd() * 3)] : cols[Math.floor(rnd() * 3)];
      g.globalAlpha = star ? 0.9 : 0.55;
      const inset = star ? tile * 0.16 : tile * 0.08;
      g.fillRect(i * tile + inset, j * tile + inset, tile - inset * 2, tile - inset * 2);
    }
  }
  g.globalAlpha = 1;
  return toTexture(c, { repeat: [6, 2] });
}

/** Defocused city facade seen through the bay windows. */
export function makeCityBackdrop() {
  const W = 1024; const H = 1024;
  const { c, g } = canvas2d(W, H);
  const rnd = mulberry32(5);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#a8c1d8');
  sky.addColorStop(1, '#c6d3dc');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const blocks = [
    { x: 0, w: 330, top: 60, c: '#b6bab7' },
    { x: 320, w: 300, top: 20, c: '#aeb2b0' },
    { x: 600, w: 250, top: 120, c: '#9c8c81' },
    { x: 830, w: 220, top: 70, c: '#b3b6b3' },
  ];
  for (const b of blocks) {
    g.fillStyle = b.c;
    g.fillRect(b.x, b.top, b.w, H - b.top);
    const cols = Math.floor(b.w / 34);
    const rows = Math.floor((H - b.top) / 46);
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const v = 110 + rnd() * 90;
        g.fillStyle = `rgba(${v},${v + 8},${v + 16},0.55)`;
        g.fillRect(b.x + 12 + i * 34, b.top + 14 + j * 46, 22, 30);
      }
    }
  }
  // Tree canopy along the bottom, as in the photograph.
  for (let i = 0; i < 260; i += 1) {
    const x = rnd() * W;
    const y = H * 0.88 + rnd() * H * 0.18;
    const r = 22 + rnd() * 44;
    g.fillStyle = `rgba(${70 + rnd() * 40},${110 + rnd() * 50},${52 + rnd() * 34},0.85)`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.filter = 'blur(3px)';
  g.drawImage(c, 0, 0);
  g.filter = 'none';
  return toTexture(c);
}

export { toTexture, mulberry32 };
