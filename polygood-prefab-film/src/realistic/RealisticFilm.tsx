import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { bezier, ramp } from "../anim";
import { Soundtrack } from "../audio/Soundtrack";
import { LayoutProvider, useLayout } from "../components/LayoutContext";
import { Headline } from "../components/Headline";
import { ProcessChecklist } from "../components/ProcessChecklist";
import { TechnicalLine } from "../components/TechnicalLine";
import { ToolHead } from "../components/Toolpath";
import { CLAIMS } from "../config/assets";
import { REALISTIC_CUES } from "../config/audio";
import { HEADLINES, LINKEDIN_SPECS, STACK_LABELS } from "../config/copy";
import { LAYOUTS, Variant } from "../config/layout";
import { COLORS, EASE, STROKES } from "../config/theme";
import { S1, S2, S3, S4, S5, SCENES } from "../config/timing";
import { TYPE, fontStack, loadFonts } from "../config/typography";
import { Pt } from "../geometry/polyline";
import { ProfileLabels } from "../scenes/Scene03EdgeFinishing";
import { Scene06EndCard } from "../scenes/Scene06EndCard";
import { anchorsAt, footageSrc } from "./footage";

loadFonts();

const LAST_EDGE_FRAME = SCENES.cnc.from - 1;

const Footage: React.FC<{ variant: Variant; frame: number; clip?: string }> = ({
  variant,
  frame,
  clip,
}) => (
  <Img
    src={footageSrc(variant, frame)}
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      clipPath: clip,
    }}
  />
);

// Scene 03 callouts drawn over the rendered edge: the profile contour, the
// thickness dimension and the profile list. `frame` is the scene-03 frame.
const EdgeCallouts: React.FC<{ variant: Variant; frame: number }> = ({
  variant,
  frame,
}) => {
  const layout = useLayout();
  const a = anchorsAt(variant, SCENES.edges.from + frame);
  const highlight = ramp(frame, [S3.morphs[0][0], S3.morphs[0][0] + 8]);
  const thickness = ramp(frame, S3.thickness);
  const tick = (p: Pt): Pt[] => [
    [p[0] - 9, p[1] + 9],
    [p[0] + 9, p[1] - 9],
  ];
  return (
    <AbsoluteFill>
      <svg
        width={layout.width}
        height={layout.height}
        style={{ position: "absolute", inset: 0 }}
      >
        {a.contour ? (
          <TechnicalLine
            pts={a.contour}
            color={COLORS.accent}
            width={STROKES.profileHighlight}
            opacity={highlight}
          />
        ) : null}
        {a.extTopA &&
        a.extTopB &&
        a.extBotA &&
        a.extBotB &&
        a.dimTop &&
        a.dimBot ? (
          <g opacity={thickness}>
            <TechnicalLine
              pts={[a.extTopA, a.extTopB]}
              color={COLORS.ink}
              width={1.2}
            />
            <TechnicalLine
              pts={[a.extBotA, a.extBotB]}
              color={COLORS.ink}
              width={1.2}
            />
            <TechnicalLine
              pts={[a.dimTop, a.dimBot]}
              progress={thickness}
              color={COLORS.ink}
              width={1.4}
            />
            <TechnicalLine
              pts={tick(a.dimTop)}
              color={COLORS.ink}
              width={1.4}
            />
            <TechnicalLine
              pts={tick(a.dimBot)}
              color={COLORS.ink}
              width={1.4}
            />
          </g>
        ) : null}
      </svg>
      {a.label ? (
        <div
          style={{
            position: "absolute",
            left: a.label[0],
            top: a.label[1],
            translate: "0 -50%",
            fontFamily: fontStack,
            fontSize: layout.section.labelSize * 0.72,
            letterSpacing: TYPE.label.tracking,
            color: COLORS.ink,
            whiteSpace: "nowrap",
            opacity: thickness,
          }}
        >
          {CLAIMS.thicknessLabel}
        </div>
      ) : null}
      <ProfileLabels frame={frame} />
    </AbsoluteFill>
  );
};

// The rendered 3D layer. At the start of scene 04 one toolpath crosses the
// frame: behind it the new scene, ahead of it scene 03's last frame.
const Footage3D: React.FC<{ variant: Variant }> = ({ variant }) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const { width, height } = layout;
  if (frame >= SCENES.endCard.from) return null;

  // Scene 05 clears to paper by holding its last frame before the 3D fade
  // and dissolving it here: part-transparent slabs in Cycles show their
  // insides, which reads as a glitch.
  const l5 = frame - SCENES.benefits.from;
  const clearFrom = S5.labelsOut[0] - 4;
  if (l5 >= clearFrom) {
    const out = ramp(l5, [clearFrom, S5.stripOut[1]], EASE.in);
    return (
      <AbsoluteFill style={{ opacity: 1 - out }}>
        <Footage
          variant={variant}
          frame={SCENES.benefits.from + clearFrom - 1}
        />
      </AbsoluteFill>
    );
  }

  const l4 = frame - SCENES.cnc.from;
  if (l4 < 0 || l4 > S4.sweep[1])
    return <Footage variant={variant} frame={frame} />;

  const sweepX = interpolate(l4, S4.sweep, [-60, width + 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: bezier(EASE.inOut),
  });
  const cy = layout.section.cy;
  return (
    <AbsoluteFill>
      <Footage
        variant={variant}
        frame={frame}
        clip={`inset(0 ${Math.max(0, width - sweepX)}px 0 0)`}
      />
      <AbsoluteFill
        style={{ clipPath: `inset(0 0 0 ${Math.max(0, sweepX)}px)` }}
      >
        <Footage variant={variant} frame={LAST_EDGE_FRAME} />
        <EdgeCallouts
          variant={variant}
          frame={SCENES.edges.durationInFrames - 1}
        />
      </AbsoluteFill>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0 }}
      >
        <line
          x1={sweepX}
          y1={0}
          x2={sweepX}
          y2={height}
          stroke={COLORS.accent}
          strokeWidth={1.5}
          opacity={0.55}
        />
        <line
          x1={sweepX - 140}
          y1={cy}
          x2={sweepX}
          y2={cy}
          stroke={COLORS.accent}
          strokeWidth={STROKES.toolpath}
        />
        <ToolHead at={[sweepX, cy]} />
      </svg>
    </AbsoluteFill>
  );
};

const StackLabels: React.FC<{ variant: Variant }> = ({ variant }) => {
  const frame = useCurrentFrame();
  const { stacks } = useLayout();
  const a = anchorsAt(variant, SCENES.benefits.from + frame);
  const out = 1 - ramp(frame, S5.labelsOut, EASE.in);
  const label = (
    text: string,
    at: Pt | undefined,
    o: number,
    dy: number,
    align: "center" | "right" = "center",
  ) =>
    at && o > 0 ? (
      <div
        style={{
          position: "absolute",
          left: at[0],
          top: at[1] + dy,
          translate: align === "center" ? "-50% 0" : "-100% 0",
          fontFamily: fontStack,
          fontSize: stacks.labelSize,
          letterSpacing: TYPE.label.tracking,
          color: COLORS.ink,
          whiteSpace: "nowrap",
          opacity: o,
        }}
      >
        {text}
      </div>
    ) : null;
  return (
    <AbsoluteFill>
      {label(
        STACK_LABELS.sheets,
        a.sheets,
        ramp(frame, [S5.sheets[1] - 4, S5.sheets[1] + 10]) * out,
        stacks.labelSize * 0.6,
      )}
      {label(
        STACK_LABELS.parts,
        a.parts,
        ramp(frame, [S5.settle - 2, S5.settle + 12]) * out,
        stacks.labelSize * 0.6,
      )}
      {label(
        STACK_LABELS.offcuts,
        a.stripEnd,
        ramp(frame, [S5.granules[0] + 6, S5.granules[0] + 22]) * out,
        stacks.labelSize * 0.6,
        "right",
      )}
    </AbsoluteFill>
  );
};

const EdgeOverlay: React.FC<{ variant: Variant }> = ({ variant }) => {
  const frame = useCurrentFrame();
  return <EdgeCallouts variant={variant} frame={frame} />;
};

const scene = (key: keyof typeof SCENES) => ({
  from: SCENES[key].from,
  durationInFrames: SCENES[key].durationInFrames,
});

// The photoreal cut: Blender renders (blender/) for scenes 01–05 under the
// same headlines, checklist and sound as the motion-graphics film, ending
// on the supplied logo animation. No finish tag.
export const RealisticFilm: React.FC<{ variant: Variant }> = ({ variant }) => (
  <LayoutProvider layout={LAYOUTS[variant]}>
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <Footage3D variant={variant} />

      <Sequence name="01 Start with your drawing" {...scene("drawing")}>
        <Headline
          lines={HEADLINES.drawing}
          inFrame={S1.headlineIn}
          outFrame={S1.headlineOut}
          label
        />
      </Sequence>
      <Sequence name="02 Prefabricated in-house" {...scene("cutting")}>
        <Headline
          lines={HEADLINES.cutting}
          inFrame={S2.headlineIn}
          outFrame={S2.headlineOut}
          spec={LINKEDIN_SPECS.cutting}
        />
      </Sequence>
      <Sequence name="03 Your edge, your profile" {...scene("edges")}>
        <EdgeOverlay variant={variant} />
        <Headline
          lines={HEADLINES.edges}
          inFrame={S3.headlineIn}
          outFrame={S3.headlineOut}
          spec={LINKEDIN_SPECS.edges}
        />
      </Sequence>
      <Sequence name="04 Curved without thermoforming" {...scene("cnc")}>
        <Headline
          lines={HEADLINES.cnc}
          inFrame={S4.headlineIn}
          outFrame={S4.headlineOut}
          spec={LINKEDIN_SPECS.cnc}
          label
        />
      </Sequence>
      <Sequence name="05 Lighter to ship, less waste" {...scene("benefits")}>
        <StackLabels variant={variant} />
        <Headline
          lines={HEADLINES.benefits}
          inFrame={S5.headlineIn}
          outFrame={S5.headlineOut}
          spec={LINKEDIN_SPECS.benefits}
        />
      </Sequence>
      <Sequence name="06 End card" {...scene("endCard")}>
        <Scene06EndCard />
      </Sequence>

      <ProcessChecklist />
      <Soundtrack cues={REALISTIC_CUES} />
    </AbsoluteFill>
  </LayoutProvider>
);
