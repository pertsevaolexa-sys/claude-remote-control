import { loadFont } from "@remotion/fonts";
import { getStaticFiles, staticFile } from "remotion";
import { ASSETS } from "./assets";

export const FONT_FAMILY = "PP Neue Montreal";

// Used if the Neue Montreal files are missing from public/fonts.
const FALLBACK_STACK =
  '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';

export const fontStack = `"${FONT_FAMILY}", ${FALLBACK_STACK}`;

export const WEIGHTS = {
  book: 400,
  bold: 700,
} as const;

// Shared typographic settings. Sizes live per variant in layout.ts.
export const TYPE = {
  headline: { weight: WEIGHTS.book, tracking: "-0.025em", lineHeight: 1.0 },
  label: { weight: WEIGHTS.book, tracking: "-0.005em", lineHeight: 1.15 },
  code: { weight: WEIGHTS.bold, tracking: "0.01em" },
} as const;

let loaded = false;

export const loadFonts = () => {
  if (loaded) return;
  loaded = true;
  const available = new Set(getStaticFiles().map((f) => f.name));
  const faces = [
    { url: ASSETS.fonts.book, weight: String(WEIGHTS.book) },
    { url: ASSETS.fonts.bold, weight: String(WEIGHTS.bold) },
  ];
  for (const face of faces) {
    if (!available.has(face.url)) {
      console.warn(
        `Font ${face.url} not found in public/, falling back to ${FALLBACK_STACK}`,
      );
      continue;
    }
    loadFont({
      family: FONT_FAMILY,
      url: staticFile(face.url),
      weight: face.weight,
    });
  }
};
