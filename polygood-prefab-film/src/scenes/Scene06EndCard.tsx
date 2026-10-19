import { Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { ASSETS } from "../config/assets";
import { useLayout } from "../components/LayoutContext";

const CLIP = ASSETS.endCardVideo;

// The supplied logo animation, played as is. It is scaled so the lockup spans
// lockupWidthPx and centred; the clip's plain margins are feathered into the
// identical background so its edges never show.
export const Scene06EndCard: React.FC = () => {
  const { width, height, endCard } = useLayout();
  const scale = endCard.lockupWidthPx / CLIP.contentBox.w;
  const w = CLIP.width * scale;
  const h = CLIP.height * scale;
  // Centre the lockup itself, not the clip frame.
  const cx = (CLIP.contentBox.x + CLIP.contentBox.w / 2) * scale;
  const cy = (CLIP.contentBox.y + CLIP.contentBox.h / 2) * scale;
  const feather =
    "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)";

  return (
    <AbsoluteFill style={{ backgroundColor: CLIP.background }}>
      <div
        style={{
          position: "absolute",
          left: width / 2 - cx,
          top: height / 2 - cy,
          width: w,
          height: h,
          maskImage: feather,
          WebkitMaskImage: feather,
        }}
      >
        <Video
          src={staticFile(CLIP.src)}
          muted
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </AbsoluteFill>
  );
};
