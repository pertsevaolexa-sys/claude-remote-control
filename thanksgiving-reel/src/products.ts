import { staticFile } from "remotion";
import type { PatternSlug } from "./patterns";

// Product-page details for the five menu patterns, as listed on
// polygood.com/product/<slug>/ (November 2026).
export type Product = {
  id: string;
  collection: string;
  // "Origin" on the product page, phrased to follow "Made from"
  origin: string;
  finish: string;
  // Full-size product photo (px) and the panel crop used as the texture.
  // Mirrors CROPS in tools/prepare_textures.py.
  photo: { w: number; h: number };
  crop: [number, number, number, number];
};

const CROP: Product["crop"] = [812, 196, 1632, 1320];

export const PRODUCTS: Partial<Record<PatternSlug, Product>> = {
  "translucent-burgundy": {
    id: "#PS1310", collection: "Translucent Collection", origin: "recycled CD cases", finish: "Gloss",
    photo: { w: 2456, h: 1637 }, crop: CROP,
  },
  marbellous: {
    id: "#PS2001", collection: "Colourful Splash Collection", origin: "recycled refrigerators", finish: "Satin",
    photo: { w: 2456, h: 1637 }, crop: CROP,
  },
  "translucent-glitter-gold": {
    id: "#PS2118", collection: "Translucent Collection", origin: "recycled CD cases", finish: "Gloss",
    photo: { w: 2456, h: 1639 }, crop: [800, 190, 1640, 1320],
  },
  "translucent-orange": {
    id: "#PS1311", collection: "Translucent Collection", origin: "recycled CD cases", finish: "Gloss",
    photo: { w: 2456, h: 1639 }, crop: [790, 180, 1650, 1320],
  },
  "translucent-bronze": {
    id: "#PS1302", collection: "Translucent Collection", origin: "recycled CD cases", finish: "Gloss",
    photo: { w: 2456, h: 1709 }, crop: [800, 200, 1650, 1380],
  },
};

export const productFor = (slug: PatternSlug) => {
  const p = PRODUCTS[slug];
  if (!p) throw new Error(`No product page data for ${slug}`);
  return p;
};

export const productPhoto = (slug: PatternSlug) => staticFile(`products/${slug}.jpg`);

// The product photo sits in a box on the page, like the image on the
// product page. Returns where the photo is drawn and where the panel crop
// (the dish texture) lands on screen, so the morph can start exactly on it.
export const PHOTO_BOX = { x: 60, y: 356, w: 960, h: 744 };

export const photoLayout = (slug: PatternSlug) => {
  const p = productFor(slug);
  const regionW = p.photo.h * (PHOTO_BOX.w / PHOTO_BOX.h);
  const x0 = (p.photo.w - regionW) / 2;
  const s = PHOTO_BOX.w / regionW;
  const [l, t, r, b] = p.crop;
  return {
    img: { left: PHOTO_BOX.x - x0 * s, top: PHOTO_BOX.y, width: p.photo.w * s, height: p.photo.h * s },
    panel: {
      cx: PHOTO_BOX.x + ((l + r) / 2 - x0) * s,
      cy: PHOTO_BOX.y + ((t + b) / 2) * s,
      w: (r - l) * s,
      h: (b - t) * s,
    },
  };
};
