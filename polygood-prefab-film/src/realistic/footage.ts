import { staticFile } from "remotion";
import linkedin from "../../public/renders3d/linkedin/anchors.json";
import reels from "../../public/renders3d/reels/anchors.json";
import { Variant } from "../config/layout";
import { Pt } from "../geometry/polyline";

// Screen positions (px) of 3D points, projected through the Blender camera
// by blender/build.py. Scene 03 frames carry the edge cross-section and the
// thickness callout; scene 05 frames carry the stack label anchors.
export type Anchors = Partial<{
  contour: Pt[];
  extTopA: Pt;
  extTopB: Pt;
  extBotA: Pt;
  extBotB: Pt;
  dimTop: Pt;
  dimBot: Pt;
  label: Pt;
  sheets: Pt;
  parts: Pt;
  strip: Pt;
  stripEnd: Pt;
}>;

type AnchorFile = {
  width: number;
  height: number;
  frames: Record<string, Anchors>;
};

const ANCHORS = { reels, linkedin } as unknown as Record<Variant, AnchorFile>;

// Film frame f shows Blender frame f. Holds rendered once are copied to
// every frame by blender/render.py, so each frame has its own file.
export const footageSrc = (variant: Variant, frame: number) =>
  staticFile(
    `renders3d/${variant}/frame_${String(frame).padStart(4, "0")}.png`,
  );

export const anchorsAt = (variant: Variant, frame: number): Anchors =>
  ANCHORS[variant].frames[String(frame)] ?? {};
