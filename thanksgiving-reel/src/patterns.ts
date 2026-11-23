import { staticFile } from "remotion";

// Every texture in the video is a real Polygood® pattern, cropped from the
// product photos on polygood.com/all-patterns (see tools/prepare_textures.py).
export const PATTERNS = {
  // On the menu
  "translucent-burgundy": "Translucent Burgundy",
  marbellous: "Marbellous",
  "translucent-glitter-gold": "Translucent Glitter Gold",
  "translucent-orange": "Translucent Orange",
  "translucent-bronze": "Translucent Bronze",
  "milky-way": "Milky Way",
  "translucent-glitter-green": "Translucent Glitter Green",
  // On the table
  gossamer: "Gossamer",
  "timeless-duo": "Timeless Duo",
  "translucent-clear": "Translucent Clear",
  "salt-dune": "Salt Dune",
  "vintage-pearl": "Vintage Pearl",
  potpourri: "Potpourri",
  "white-lollipop": "White Lollipop",
  "terrazzo-nuovo": "Terrazzo Nuovo",
  "fleur-de-sel": "Fleur de Sel",
  frost: "Frost",
} as const;

export type PatternSlug = keyof typeof PATTERNS;

export const patternSrc = (slug: PatternSlug) =>
  staticFile(`patterns/${slug}.jpg`);

export const patternName = (slug: PatternSlug) => PATTERNS[slug];
