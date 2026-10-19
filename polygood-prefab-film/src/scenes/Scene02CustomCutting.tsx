import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ramp } from "../anim";
import { HEADLINES, LINKEDIN_SPECS } from "../config/copy";
import { S2 } from "../config/timing";
import { COLORS, EASE, STROKES } from "../config/theme";
import { Headline } from "../components/Headline";
import { useLayout } from "../components/LayoutContext";
import { SheetImage } from "../components/MaterialTexture";
import { SheetDrawing } from "../components/SheetDrawing";
import { SheetFrame, SheetShadow } from "../components/SheetFrame";
import { TechnicalLine } from "../components/TechnicalLine";
import { Toolpath, toolpathState } from "../components/Toolpath";
import { WorldSvg } from "../components/WorldSvg";
import { lerp, toPath } from "../geometry/polyline";
import {
  DRAW_SCALE,
  PARTS,
  Part,
  SHEET,
  SHEET_TOOLPATH,
  nestedOutline,
} from "../geometry/sheet";
import { LIFT_SHADOW, sheetCamera, tabletopPresentation } from "./sheetCamera";

// Index of each part's cutting segment in the toolpath.
const cutSegmentIndex = (part: Part) => {
  const start = nestedOutline(part)[0];
  return SHEET_TOOLPATH.findIndex(
    (s) =>
      s.type === "cut" && s.pts[1][0] === start[0] && s.pts[1][1] === start[1],
  );
};

const TexturedPart: React.FC<{
  part: Part;
  x: number;
  y: number;
  s: number;
}> = ({ part, x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <defs>
      <clipPath id={`s2-clip-${part.id}`}>
        <path d={toPath(part.outline, true)} />
      </clipPath>
    </defs>
    <g clipPath={`url(#s2-clip-${part.id})`}>
      <g transform={`translate(${-part.nest.x} ${-part.nest.y})`}>
        <SheetImage />
      </g>
    </g>
  </g>
);

export const Scene02CustomCutting: React.FC = () => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const camera = sheetCamera(layout);
  const px = (n: number) => n / camera.k;

  const details = 1 - ramp(frame, S2.drawingFade, EASE.standard);
  const toolpath = ramp(frame, S2.toolpath, EASE.standard);
  const tool = toolpathState(SHEET_TOOLPATH, toolpath);
  const toolFade = 1 - ramp(frame, S2.toolpathFade, EASE.standard);
  const lift = ramp(frame, S2.lift);
  const isolate = ramp(frame, S2.isolate, EASE.inOut);
  const othersOut = ramp(frame, S2.othersOut, EASE.standard);
  const sheetOut = ramp(frame, S2.sheetOut, EASE.standard);
  const present = tabletopPresentation(layout);
  const liftOffset = px(8) * lift;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <WorldSvg camera={camera} anchor={layout.stage}>
        <defs>
          <filter id="s2-lift" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow
              dx={0}
              dy={px(LIFT_SHADOW.dy) * lift}
              stdDeviation={px(LIFT_SHADOW.blur)}
              floodColor={COLORS.kerf}
              floodOpacity={LIFT_SHADOW.opacity * lift}
            />
          </filter>
        </defs>

        {/* The sheet, its drawing and the cut lines */}
        <g opacity={1 - sheetOut}>
          <SheetShadow opacity={1} id="s2-sheet-shadow" />
          <SheetImage />
          <SheetDrawing
            plot={1}
            dims={1}
            detailOpacity={details}
            showParts={false}
          />
          {PARTS.map((part) => {
            const done = tool.progress[cutSegmentIndex(part)] >= 1;
            return done ? (
              <TechnicalLine
                key={part.id}
                pts={nestedOutline(part)}
                color={COLORS.kerf}
                width={STROKES.kerf}
              />
            ) : null;
          })}
          {/* What stays behind once the parts lift: the skeleton, dimmed */}
          <rect
            x={0}
            y={0}
            width={SHEET.w}
            height={SHEET.h}
            fill={COLORS.paper}
            opacity={lift * 0.62}
          />
          <SheetFrame outline={1} marks={details} />
        </g>

        {/* Part outlines slide from the drawing into the nested layout */}
        {PARTS.map((part) => {
          const start = S2.separate[0] + part.stagger * S2.separateStagger;
          const t = ramp(frame, [start, start + S2.separateEach], EASE.inOut);
          const s = lerp(DRAW_SCALE, 1, t);
          const cut = ramp(frame, [S2.toolpath[0], S2.toolpath[1] + 2]);
          const done = tool.progress[cutSegmentIndex(part)] >= 1;
          return (
            <g
              key={part.id}
              transform={`translate(${lerp(part.drawing.x, part.nest.x, t)} ${lerp(part.drawing.y, part.nest.y, t)}) scale(${s})`}
              opacity={done ? 0 : 1 - cut * 0.35}
            >
              <path
                d={toPath(part.outline)}
                fill="none"
                stroke={COLORS.drawingOnMaterial}
                strokeWidth={px(STROKES.drawing) / s}
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        <Toolpath
          segments={SHEET_TOOLPATH}
          progress={toolpath}
          opacity={toolFade}
        />

        {/* Cut parts lift off the sheet; the tabletop then moves to centre */}
        {lift > 0 ? (
          <g filter="url(#s2-lift)">
            {PARTS.map((part) => {
              if (part.id === "tabletop") return null;
              return (
                <g key={part.id} opacity={1 - othersOut}>
                  <TexturedPart
                    part={part}
                    x={part.nest.x}
                    y={part.nest.y - liftOffset}
                    s={1}
                  />
                </g>
              );
            })}
            {(() => {
              const top = PARTS[0];
              return (
                <TexturedPart
                  part={top}
                  x={lerp(top.nest.x, present.x, isolate)}
                  y={lerp(top.nest.y - liftOffset, present.y, isolate)}
                  s={lerp(1, present.s, isolate)}
                />
              );
            })()}
          </g>
        ) : null}
      </WorldSvg>

      <Headline
        lines={HEADLINES.cutting}
        inFrame={S2.headlineIn}
        outFrame={S2.headlineOut}
        spec={LINKEDIN_SPECS.cutting}
      />
    </AbsoluteFill>
  );
};
