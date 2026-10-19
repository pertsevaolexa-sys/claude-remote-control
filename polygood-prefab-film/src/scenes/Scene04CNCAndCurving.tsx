import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { bezier, ramp } from "../anim";
import { HEADLINES, LINKEDIN_SPECS } from "../config/copy";
import { S4, SCENES } from "../config/timing";
import { COLORS, EASE, STROKES } from "../config/theme";
import { Headline } from "../components/Headline";
import { useLayout } from "../components/LayoutContext";
import { SheetImage } from "../components/MaterialTexture";
import { TechnicalLine } from "../components/TechnicalLine";
import { ToolHead, toolpathState } from "../components/Toolpath";
import { WorldSvg } from "../components/WorldSvg";
import { EdgeCloseUp } from "./Scene03EdgeFinishing";
import {
  CUTOUTS,
  PANEL,
  PANEL_SOURCE,
  PANEL_TOOLPATH,
} from "../geometry/partition";
import { partial, toPath } from "../geometry/polyline";

// Sheet texture mapped onto the lengthwise panel (sheet x → panel y).
const TEXTURE_TRANSFORM = `matrix(0 1 1 0 ${-PANEL_SOURCE.y} ${-PANEL_SOURCE.x})`;
const PANEL_PATH = `M0 0 H${PANEL.w} V${PANEL.h} H0 Z`;
const STRIPS = 40;
const SEAM_PX = 1.5; // strips overlap by this much so no background shows between them
const BEND_ANGLE = (140 * Math.PI) / 180;

// Which toolpath segment cuts each cut-out.
const CUT_INDEX = CUTOUTS.map((c) =>
  PANEL_TOOLPATH.findIndex((s) => s.type === "cut" && s.pts === c.outline),
);

const PLUG_DROP = 10; // frames for each cut-out plug to fall away

// Plugs leave one after another and are all gone before the bend starts.
const removalStart = (i: number) =>
  S4.removal[0] +
  (i / CUTOUTS.length) * (S4.removal[1] - S4.removal[0] - PLUG_DROP);

const PanelTexture: React.FC = () => (
  <g transform={TEXTURE_TRANSFORM}>
    <SheetImage />
  </g>
);

// Flat panel in world (mm) space: texture with holes for removed cut-outs,
// engraved lines where the tool has passed, the live toolpath and the plugs.
const FlatPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const t = ramp(frame, S4.toolpath, EASE.standard);
  const state = toolpathState(PANEL_TOOLPATH, t);
  return (
    <g>
      <defs>
        <mask
          id="s4-holes"
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={PANEL.w}
          height={PANEL.h}
        >
          <rect x={0} y={0} width={PANEL.w} height={PANEL.h} fill="white" />
          {CUTOUTS.map((c, i) =>
            frame >= removalStart(i) ? (
              <path key={i} d={toPath(c.outline, true)} fill="black" />
            ) : null,
          )}
        </mask>
        <clipPath id="s4-panel">
          <path d={PANEL_PATH} />
        </clipPath>
      </defs>
      <g mask="url(#s4-holes)" clipPath="url(#s4-panel)">
        <PanelTexture />
      </g>
      {CUTOUTS.map((c, i) =>
        state.progress[CUT_INDEX[i]] >= 1 ? (
          <TechnicalLine
            key={i}
            pts={c.outline}
            color={COLORS.engraved}
            width={STROKES.kerf}
          />
        ) : null,
      )}
      {PANEL_TOOLPATH.map((s, i) => {
        const p = state.progress[i];
        if (p <= 0 || p >= 1) return null;
        const pts = partial(s.pts, p);
        return s.type === "cut" ? (
          <TechnicalLine
            key={i}
            pts={pts}
            color={COLORS.accent}
            width={STROKES.toolpath}
          />
        ) : (
          <TechnicalLine
            key={i}
            pts={pts}
            color={COLORS.accent}
            width={STROKES.rapid}
            dash={[6, 6]}
            opacity={0.8}
          />
        );
      })}
      {state.head ? <ToolHead at={state.head.p} /> : null}
      {/* Cut-out plugs drop away, one after another */}
      {CUTOUTS.map((c, i) => {
        const d = ramp(
          frame,
          [removalStart(i), removalStart(i) + PLUG_DROP],
          EASE.in,
        );
        if (frame < removalStart(i) || d >= 1) return null;
        return (
          <g
            key={i}
            opacity={1 - d}
            transform={`translate(${c.cx} ${c.cy + d * 90}) scale(${1 - d * 0.12}) translate(${-c.cx} ${-c.cy})`}
          >
            <defs>
              <clipPath id={`s4-plug-${i}`}>
                <path d={toPath(c.outline, true)} />
              </clipPath>
            </defs>
            <g clipPath={`url(#s4-plug-${i})`}>
              <PanelTexture />
            </g>
          </g>
        );
      })}
    </g>
  );
};

// One vertical strip of the panel, as an SVG cropped to its slice.
const Strip: React.FC<{
  index: number;
  widthMm: number;
  k: number;
  shade: number;
}> = ({ index, widthMm, k, shade }) => {
  const s0 = index * widthMm;
  const near = CUTOUTS.filter(
    (c) => c.cx + 60 > s0 && c.cx - 60 < s0 + widthMm,
  );
  const id = `s4-strip-${index}`;
  return (
    <svg
      width={widthMm * k + 2 * SEAM_PX}
      height={PANEL.h * k}
      viewBox={`${s0 - SEAM_PX / k} 0 ${widthMm + (2 * SEAM_PX) / k} ${PANEL.h}`}
      preserveAspectRatio="none"
      style={{ display: "block", marginLeft: -SEAM_PX }}
    >
      <defs>
        <mask
          id={id}
          maskUnits="userSpaceOnUse"
          x={s0 - 4}
          y={0}
          width={widthMm + 8}
          height={PANEL.h}
        >
          {/* White only within the panel, so the overlap never widens it */}
          <rect x={0} y={0} width={PANEL.w} height={PANEL.h} fill="white" />
          {near.map((c, i) => (
            <path key={i} d={toPath(c.outline, true)} fill="black" />
          ))}
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <PanelTexture />
        <rect
          x={s0 - 4}
          y={0}
          width={widthMm + 8}
          height={PANEL.h}
          fill="#060C22"
          opacity={shade}
        />
      </g>
      {near.map((c, i) => (
        <path
          key={i}
          d={toPath(c.outline, true)}
          fill="none"
          stroke={COLORS.engraved}
          strokeWidth={STROKES.kerf / k}
        />
      ))}
    </svg>
  );
};

// Soft contact shadow where the panel meets the floor; its width follows the
// chord of the bend.
const ContactShadow: React.FC<{ bend: number; k: number; opacity: number }> = ({
  bend,
  k,
  opacity,
}) => {
  const { panel } = useLayout();
  const theta = BEND_ANGLE * bend;
  const kappa = theta / PANEL.w;
  const chord = kappa < 1e-6 ? PANEL.w : (2 * Math.sin(theta / 2)) / kappa;
  return (
    <div
      style={{
        position: "absolute",
        left: panel.cx - (chord * k) / 2,
        top: panel.cy + (PANEL.h * k) / 2 - 16 + bend * 10,
        width: chord * k,
        height: 32 + bend * 30,
        borderRadius: "50%",
        background: "rgba(10, 20, 51, 0.3)",
        filter: "blur(16px)",
        opacity,
      }}
    />
  );
};

// The panel bent into an arc, built from vertical strips placed in 3D.
const BentPanel: React.FC<{ bend: number; k: number }> = ({ bend, k }) => {
  const layout = useLayout();
  const { panel } = layout;
  const stripMm = PANEL.w / STRIPS;
  const theta = BEND_ANGLE * bend;
  const kappa = theta / PANEL.w;
  const ry = -20 * bend; // turn towards a three-quarter view as it bends
  const rx = -15 * bend; // and look down onto it, so the top edge reads as an arc
  const ryRad = (ry * Math.PI) / 180;
  const light = [-0.55, -0.25, 0.8];
  const ll = Math.hypot(...light);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: 2600,
        perspectiveOrigin: `${panel.cx}px ${panel.cy}px`,
        // Grows a little as it bends, so it keeps its presence while its
        // width shrinks to the chord of the curve.
        scale: 1 + 0.06 * bend,
        transformOrigin: `${panel.cx}px ${panel.cy}px`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: panel.cx,
          top: panel.cy,
          transformStyle: "preserve-3d",
          transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
        }}
      >
        {/* Footprint of the bend on the floor: the clearest cue that it curves */}
        <div
          style={{
            position: "absolute",
            left: -PANEL.w * k,
            top: -PANEL.w * k,
            width: PANEL.w * k * 2,
            height: PANEL.w * k * 2,
            transform: `translate3d(0, ${(PANEL.h * k) / 2}px, 0) rotateX(90deg)`,
            opacity: Math.min(1, bend * 2.5),
          }}
        >
          <svg
            width={PANEL.w * k * 2}
            height={PANEL.w * k * 2}
            viewBox={`${-PANEL.w * k} ${-PANEL.w * k} ${PANEL.w * k * 2} ${PANEL.w * k * 2}`}
            style={{ filter: "blur(9px)", overflow: "visible" }}
          >
            <path
              d={Array.from({ length: 41 }, (_, j) => {
                const sc = (j / 40 - 0.5) * PANEL.w;
                const phi = kappa * sc;
                const x = kappa < 1e-6 ? sc : Math.sin(phi) / kappa;
                const z = kappa < 1e-6 ? 0 : -(1 - Math.cos(phi)) / kappa;
                return `${j === 0 ? "M" : "L"}${(x * k).toFixed(1)} ${(z * k + 14).toFixed(1)}`;
              }).join(" ")}
              fill="none"
              stroke="rgba(10, 20, 51, 0.32)"
              strokeWidth={34}
              strokeLinecap="round"
            />
          </svg>
        </div>
        {Array.from({ length: STRIPS }, (_, i) => {
          const sc = (i + 0.5) * stripMm - PANEL.w / 2;
          const phi = kappa * sc;
          const x = kappa < 1e-6 ? sc : Math.sin(phi) / kappa;
          const z = kappa < 1e-6 ? 0 : -(1 - Math.cos(phi)) / kappa;
          // Normal of this strip after the bend and the view turn.
          const nx = Math.sin(phi + ryRad);
          const nz = Math.cos(phi + ryRad);
          const lit = Math.max(0, (nx * light[0] + nz * light[2]) / ll);
          const shade =
            Math.min(0.62, Math.max(0, (1 - lit) * 0.95)) *
            Math.min(1, bend * 3);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: (-stripMm * k) / 2,
                top: (-PANEL.h * k) / 2,
                transform: `translate3d(${x * k}px, 0, ${z * k}px) rotateY(${phi}rad)`,
              }}
            >
              <Strip index={i} widthMm={stripMm} k={k} shade={shade} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Scene04CNCAndCurving: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const layout = useLayout();
  const { panel, section } = layout;
  const k = panel.heightPx / PANEL.h;
  const camera = { x: PANEL.w / 2, y: PANEL.h / 2, k };

  // One toolpath crosses the frame: behind it the new panel, ahead of it the
  // last frame of scene 03's edge close-up.
  const sweepX = interpolate(frame, S4.sweep, [-60, width + 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: bezier(EASE.inOut),
  });
  const sweeping = frame <= S4.sweep[1];
  const bend = ramp(frame, S4.bend, EASE.inOut);
  const exit = ramp(frame, S4.exit, EASE.in);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <AbsoluteFill
        style={{
          clipPath: sweeping
            ? `inset(0 ${Math.max(0, width - sweepX)}px 0 0)`
            : undefined,
          // Slides out of frame rather than fading, handing the motion to the
          // delivery stacks arriving from the right in scene 05.
          translate: `${-exit * width * 0.62}px 0`,
          scale: 1 - exit * 0.15,
        }}
      >
        <ContactShadow bend={0} k={k} opacity={1 - Math.min(1, bend * 2.5)} />
        {frame < S4.bend[0] ? (
          <WorldSvg camera={camera} anchor={{ cx: panel.cx, cy: panel.cy }}>
            <FlatPanel frame={frame} />
          </WorldSvg>
        ) : (
          <BentPanel bend={bend} k={k} />
        )}
      </AbsoluteFill>

      {sweeping ? (
        <>
          <AbsoluteFill
            style={{ clipPath: `inset(0 0 0 ${Math.max(0, sweepX)}px)` }}
          >
            <EdgeCloseUp frame={SCENES.edges.durationInFrames - 1} />
          </AbsoluteFill>
          <svg
            width={width}
            height={layout.height}
            style={{ position: "absolute", inset: 0 }}
          >
            <line
              x1={sweepX}
              y1={0}
              x2={sweepX}
              y2={layout.height}
              stroke={COLORS.accent}
              strokeWidth={1.5}
              opacity={0.55}
            />
            <line
              x1={sweepX - 140}
              y1={section.cy}
              x2={sweepX}
              y2={section.cy}
              stroke={COLORS.accent}
              strokeWidth={STROKES.toolpath}
            />
            <ToolHead at={[sweepX, section.cy]} />
          </svg>
        </>
      ) : null}

      <Headline
        lines={HEADLINES.cnc}
        inFrame={S4.headlineIn}
        outFrame={S4.headlineOut}
        spec={LINKEDIN_SPECS.cnc}
      />
    </AbsoluteFill>
  );
};
