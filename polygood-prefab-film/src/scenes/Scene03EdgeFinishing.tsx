import React from "react";
import { AbsoluteFill, interpolateColors, useCurrentFrame } from "remotion";
import { ramp } from "../anim";
import { CLAIMS } from "../config/assets";
import { EDGE_PROFILES, HEADLINES, LINKEDIN_SPECS } from "../config/copy";
import { S3 } from "../config/timing";
import { COLORS, EASE, STROKES } from "../config/theme";
import { TYPE, fontStack } from "../config/typography";
import { Headline } from "../components/Headline";
import { useLayout } from "../components/LayoutContext";
import { MaterialPyramid, SheetRegion } from "../components/MaterialTexture";
import { TechnicalLine } from "../components/TechnicalLine";
import { WorldSvg } from "../components/WorldSvg";
import { Camera, toScreen, zoomTowards } from "../geometry/camera";
import { Pt, lerp, lerpPt, toPath } from "../geometry/polyline";
import {
  ProfileId,
  profileContour,
  sectionPolygon,
} from "../geometry/profiles";
import { partById } from "../geometry/sheet";
import { LIFT_SHADOW } from "./sheetCamera";

const T = 19; // drawn thickness (mm); the label states the available thicknesses
const SLAB_W = 800; // the end view shows the tabletop's 800 mm depth
const SEQUENCE: ProfileId[] = ["square", "bullnose", "chamfer", "bevelled"];
const CONTOURS = SEQUENCE.map((id) => profileContour(id, T));

const morphedContour = (frame: number): Pt[] => {
  let c: Pt[] = CONTOURS[0];
  S3.morphs.forEach((range, i) => {
    const t = ramp(frame, range, EASE.inOut);
    if (t > 0) c = c.map((p, j) => lerpPt(p, CONTOURS[i + 1][j], t));
  });
  return c;
};

const activeProfile = (frame: number) => {
  const mids = S3.morphs.map(([a, b]) => (a + b) / 2);
  let active = -1;
  mids.forEach((m, i) => {
    if (frame >= m) active = i;
  });
  return active;
};

// Tabletop as a CSS 3D slab. It turns a quarter in plan and tips towards the
// viewer until only its end face is seen, which is the cross-section.
const Slab: React.FC<{ frame: number }> = ({ frame }) => {
  const layout = useLayout();
  const top = partById("tabletop");
  const k0 = layout.tabletopWidthPx / top.w;
  const L = top.w * k0;
  const D = top.h * k0;
  const th = T * k0;
  const rz = ramp(frame, [S3.rotate[0], S3.rotate[1] - 4], EASE.inOut) * 90;
  const rx = ramp(frame, [S3.rotate[0] + 2, S3.rotate[1]], EASE.inOut) * 90;
  const sEnd = layout.section.endFaceWidthPx / D;
  const s = lerp(1, sEnd, ramp(frame, S3.rotate, EASE.inOut));
  const rad = Math.PI / 180;
  // Push back so the end face finishes exactly in the picture plane, where it
  // matches the 2D section pixel for pixel.
  const z = (s * L * Math.sin(rz * rad) * Math.sin(rx * rad)) / 2;
  const shadow = 1 - ramp(frame, [S3.rotate[0], S3.rotate[0] + 18]);

  const face = (
    w: number,
    h: number,
    transform: string,
    region: { x: number; y: number; w: number; h: number },
    shade: number,
    extra?: React.CSSProperties,
  ) => (
    <div
      style={{
        position: "absolute",
        left: -w / 2,
        top: -h / 2,
        width: w,
        height: h,
        transform,
        backfaceVisibility: "hidden",
        ...extra,
      }}
    >
      <SheetRegion
        region={region}
        width={w}
        height={h}
        style={{ borderRadius: extra?.borderRadius }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(6, 12, 34, ${shade})`,
          }}
        />
      </SheetRegion>
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: 2400,
        perspectiveOrigin: `${layout.stage.cx}px ${layout.stage.cy}px`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: layout.stage.cx,
          top: layout.stage.cy,
          transformStyle: "preserve-3d",
          transform: `translate3d(0, 0, ${-z}px) scale3d(${s}, ${s}, ${s}) rotateX(${rx}deg) rotateZ(${rz}deg)`,
        }}
      >
        {face(
          L,
          D,
          `translateZ(${th / 2}px)`,
          { x: top.nest.x, y: top.nest.y, w: top.w, h: top.h },
          0,
          {
            borderRadius: 40 * k0,
            boxShadow: `0 ${LIFT_SHADOW.dy}px ${LIFT_SHADOW.blur * 2}px rgba(10, 20, 51, ${LIFT_SHADOW.opacity * shadow})`,
          },
        )}
        {face(
          L,
          D,
          `rotateX(180deg) translateZ(${th / 2}px)`,
          { x: top.nest.x, y: top.nest.y, w: top.w, h: top.h },
          0.25,
        )}
        {face(
          L,
          th,
          `rotateX(-90deg) translateZ(${D / 2}px)`,
          { x: 200, y: 900, w: top.w, h: T },
          0.18,
        )}
        {face(
          L,
          th,
          `rotateX(90deg) translateZ(${D / 2}px)`,
          { x: 200, y: 950, w: top.w, h: T },
          0.18,
        )}
        {face(
          th,
          D,
          `rotateY(90deg) translateZ(${L / 2}px)`,
          { x: 600, y: 300, w: T, h: top.h },
          0,
        )}
        {face(
          th,
          D,
          `rotateY(-90deg) translateZ(${L / 2}px)`,
          { x: 650, y: 300, w: T, h: top.h },
          0.2,
        )}
      </div>
    </div>
  );
};

export const ProfileLabels: React.FC<{ frame: number }> = ({ frame }) => {
  const layout = useLayout();
  const { section } = layout;
  const active = activeProfile(frame);
  return (
    <div
      style={{
        position: "absolute",
        left: layout.marginX,
        top: section.labelsY,
        fontFamily: fontStack,
      }}
    >
      {EDGE_PROFILES.map((label, i) => {
        const appear = ramp(frame, [
          S3.zoom[0] + i * 2,
          S3.zoom[0] + i * 2 + 14,
        ]);
        const on = i === active ? 1 : 0;
        const mid = (S3.morphs[i][0] + S3.morphs[i][1]) / 2;
        const lit = on * ramp(frame, [mid, mid + 6]);
        return (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: section.labelSize * 0.45,
              height: section.labelRow,
              fontSize: section.labelSize,
              letterSpacing: TYPE.label.tracking,
              color: interpolateColors(
                lit,
                [0, 1],
                [COLORS.pending, COLORS.ink],
              ),
              opacity: appear,
              translate: `0 ${(1 - appear) * 12}px`,
            }}
          >
            <svg
              width={section.labelSize * 0.32}
              height={section.labelSize * 0.32}
              viewBox="0 0 10 10"
            >
              <rect
                x={0.75}
                y={0.75}
                width={8.5}
                height={8.5}
                fill={COLORS.accent}
                fillOpacity={lit}
                stroke={interpolateColors(
                  lit,
                  [0, 1],
                  [COLORS.pending, COLORS.accent],
                )}
                strokeWidth={1.5}
              />
            </svg>
            {label}
          </div>
        );
      })}
    </div>
  );
};

// The 2D close-up of the edge: cross-section, thickness callout and profile
// labels, at a given scene-03 frame. Scene 04 draws its last frame while
// wiping it away.
export const EdgeCloseUp: React.FC<{ frame: number }> = ({ frame }) => {
  const layout = useLayout();
  const { stage, section } = layout;

  const handover = ramp(frame, S3.handover, EASE.standard);
  const kStart = section.endFaceWidthPx / SLAB_W;
  const a: Camera = { x: -SLAB_W / 2, y: T / 2, k: kStart };
  const b: Camera = {
    k: section.k,
    x: -(section.edgeX - stage.cx) / section.k,
    y: T / 2 - (section.cy - stage.cy) / section.k,
  };
  const camera = zoomTowards(
    a,
    b,
    [0, T / 2],
    ramp(frame, S3.zoom, EASE.inOut),
    stage.cx,
    stage.cy,
  );
  const px = (n: number) => n / camera.k;

  const contour = morphedContour(frame);
  const polygon = sectionPolygon(contour, SLAB_W);
  const highlight = ramp(frame, [S3.morphs[0][0], S3.morphs[0][0] + 8]);
  const stock = ramp(frame, [S3.morphs[0][0], S3.morphs[0][1]]);
  const thickness = ramp(frame, S3.thickness);

  const dimX = 7.5;
  const labelPos = toScreen(camera, stage.cx, stage.cy, [dimX + 3.5, T / 2]);

  return (
    <AbsoluteFill>
      {handover > 0 ? (
        <AbsoluteFill style={{ opacity: handover }}>
          <WorldSvg camera={camera} anchor={stage}>
            <defs>
              <clipPath id="s3-section">
                <path d={toPath(polygon, true)} />
              </clipPath>
            </defs>
            <g clipPath="url(#s3-section)">
              {/* Same chips as the sheet; the macro level sits at the edge */}
              <g transform="translate(-1520 -161)">
                <MaterialPyramid k={camera.k} idPrefix="s3" />
              </g>
            </g>
            <path
              d={toPath(polygon, true)}
              fill="none"
              stroke={COLORS.ink}
              strokeWidth={px(STROKES.sectionOutline)}
            />
            {/* The raw sawn edge, for reference */}
            <TechnicalLine
              pts={[
                [-T * 1.3, 0],
                [0, 0],
                [0, T],
                [-T * 1.3, T],
              ]}
              color={COLORS.ink}
              width={1.2}
              dash={[6, 6]}
              opacity={stock * 0.45}
              cap="butt"
            />
            <TechnicalLine
              pts={contour}
              color={COLORS.accent}
              width={STROKES.profileHighlight}
              opacity={highlight}
            />
            {/* Thickness dimension */}
            <g opacity={thickness}>
              <TechnicalLine
                pts={[
                  [1.5, 0],
                  [dimX + 2.5, 0],
                ]}
                color={COLORS.ink}
                width={1.2}
              />
              <TechnicalLine
                pts={[
                  [1.5, T],
                  [dimX + 2.5, T],
                ]}
                color={COLORS.ink}
                width={1.2}
              />
              <TechnicalLine
                pts={[
                  [dimX, 0],
                  [dimX, T],
                ]}
                progress={thickness}
                color={COLORS.ink}
                width={1.4}
              />
              {[0, T].map((y) => (
                <TechnicalLine
                  key={y}
                  pts={[
                    [dimX - px(9), y + px(9)],
                    [dimX + px(9), y - px(9)],
                  ]}
                  color={COLORS.ink}
                  width={1.4}
                />
              ))}
            </g>
          </WorldSvg>
          <div
            style={{
              position: "absolute",
              left: labelPos[0],
              top: labelPos[1],
              translate: "0 -50%",
              fontFamily: fontStack,
              fontSize: section.labelSize * 0.72,
              letterSpacing: TYPE.label.tracking,
              color: COLORS.ink,
              whiteSpace: "nowrap",
              opacity: thickness,
            }}
          >
            {CLAIMS.thicknessLabel}
          </div>
        </AbsoluteFill>
      ) : null}
      <ProfileLabels frame={frame} />
    </AbsoluteFill>
  );
};

export const Scene03EdgeFinishing: React.FC = () => {
  const frame = useCurrentFrame();
  const handover = ramp(frame, S3.handover, EASE.standard);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      {handover < 1 ? (
        <AbsoluteFill style={{ opacity: 1 - handover }}>
          <Slab frame={frame} />
        </AbsoluteFill>
      ) : null}
      <EdgeCloseUp frame={frame} />
      <Headline
        lines={HEADLINES.edges}
        inFrame={S3.headlineIn}
        outFrame={S3.headlineOut}
        spec={LINKEDIN_SPECS.edges}
      />
    </AbsoluteFill>
  );
};
