import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { ramp } from "../anim";
import { Soundtrack } from "../audio/Soundtrack";
import { FinishTag } from "../components/FinishTag";
import { LayoutProvider, useLayout } from "../components/LayoutContext";
import { ProcessChecklist } from "../components/ProcessChecklist";
import { LAYOUTS, Variant } from "../config/layout";
import { COLORS, EASE } from "../config/theme";
import { FINISH_TAG, SCENES } from "../config/timing";
import { loadFonts } from "../config/typography";
import { Scene01Drawing } from "../scenes/Scene01Drawing";
import { Scene02CustomCutting } from "../scenes/Scene02CustomCutting";
import { Scene03EdgeFinishing } from "../scenes/Scene03EdgeFinishing";
import { Scene04CNCAndCurving } from "../scenes/Scene04CNCAndCurving";
import { Scene05Benefits } from "../scenes/Scene05Benefits";
import { Scene06EndCard } from "../scenes/Scene06EndCard";

loadFonts();

const FinishTagOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { finishTag } = useLayout();
  // Fully visible until 12.5 s; it then hands over to the end-card band.
  const out = ramp(
    frame,
    [FINISH_TAG.until, FINISH_TAG.until + FINISH_TAG.fadeOutFrames],
    EASE.in,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: finishTag.left,
        top: finishTag.bottom,
        translate: "0 -100%",
        opacity: 1 - out,
      }}
    >
      <FinishTag size={finishTag.size} />
    </div>
  );
};

export const SCENE_LIST = [
  {
    key: "drawing",
    name: "01 Start with your drawing",
    Component: Scene01Drawing,
  },
  {
    key: "cutting",
    name: "02 Prefabricated in-house",
    Component: Scene02CustomCutting,
  },
  {
    key: "edges",
    name: "03 Your edge, your profile",
    Component: Scene03EdgeFinishing,
  },
  {
    key: "cnc",
    name: "04 Curved without thermoforming",
    Component: Scene04CNCAndCurving,
  },
  {
    key: "benefits",
    name: "05 Lighter to ship, less waste",
    Component: Scene05Benefits,
  },
  { key: "endCard", name: "06 End card", Component: Scene06EndCard },
] as const;

// The whole film for one format. Scenes sit on the timeline at the frames in
// config/timing.ts; the finish tag, checklist and sound run across them.
export const PolygoodFilm: React.FC<{ variant: Variant }> = ({ variant }) => (
  <LayoutProvider layout={LAYOUTS[variant]}>
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      {SCENE_LIST.map(({ key, name, Component }) => (
        <Sequence
          key={key}
          name={name}
          from={SCENES[key].from}
          durationInFrames={SCENES[key].durationInFrames}
        >
          <Component />
        </Sequence>
      ))}
      <Sequence
        name="Finish identifier"
        from={FINISH_TAG.from}
        durationInFrames={FINISH_TAG.until + FINISH_TAG.fadeOutFrames}
      >
        <FinishTagOverlay />
      </Sequence>
      <ProcessChecklist />
      <Soundtrack />
    </AbsoluteFill>
  </LayoutProvider>
);
