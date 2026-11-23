import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Brand typeface, as on polygood.com: PP Neue Montreal (Pangram Pangram).
// Book is mapped to weight 400 and Bold to 700. There is no italic cut, so
// emphasis is done with colour. The files in public/fonts are licensed to
// The Good Plastic Company; keep this repository private.
export const font = "PP Neue Montreal";

loadFont({ family: font, url: staticFile("fonts/PPNeueMontreal-Book.otf"), weight: "400", style: "normal" });
loadFont({ family: font, url: staticFile("fonts/NeueMontreal-Bold.otf"), weight: "700", style: "normal" });

// Display sizes look best slightly tightened.
export const tight = "-0.025em";

// From polygood.com (Firecrawl brand data, checked against screenshots of
// the homepage and a product page). Text is always dark on light.
export const color = {
  ink: "#3A3A3D", // all text
  white: "#FFFFFF", // product pages, captions, end card
  hero: "#F0EDF2", // homepage hero background
};
