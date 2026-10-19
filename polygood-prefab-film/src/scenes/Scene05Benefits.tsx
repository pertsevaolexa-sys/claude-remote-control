import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { bezier, ramp } from "../anim";
import { HEADLINES, LINKEDIN_SPECS, STACK_LABELS } from "../config/copy";
import { S5 } from "../config/timing";
import { COLORS, EASE } from "../config/theme";
import { TYPE, fontStack } from "../config/typography";
import { Headline } from "../components/Headline";
import { useLayout } from "../components/LayoutContext";
import { SheetImage, TextureWindow } from "../components/MaterialTexture";
import { Iso, isoPoint, isoTopMatrix } from "../geometry/camera";
import { Pt, lerp, toPath, transformPts } from "../geometry/polyline";
import { OFFCUTS, PartId, SHEET, partById } from "../geometry/sheet";

const THICK = 19; // mm
const Z_SCALE = 5.5; // slab thickness is exaggerated so the stacks read at this size
const SIDE = "#16295E"; // material edge in shade
const SIDE_LIGHT = "#2B4597";
const SHEET_COUNT = 5;

type Slab = {
  key: string;
  outline: Pt[]; // plan polygon (mm), closed
  z: number; // base height (mm)
  textureOffset: Pt; // shifts the sheet image so the right region shows
  enter: [number, number];
};

const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];

// Plan positions (mm) are solved so that, in the isometric view, the parts
// stack sits just right of the sheet stack (x - y fixes screen x) and a little
// in front of it (x + y fixes screen depth), with the offcuts below it.
const COS30 = Math.cos(Math.PI / 6);
const planFor = (screenX: number, screenY: number, s: number): Pt => {
  const d = screenX / (COS30 * s); // x - y
  const sum = screenY / (0.5 * s); // x + y
  return [(d + sum) / 2, (sum - d) / 2];
};
const ISO_S = 0.15; // reference scale used to solve the layout
const sheetRight = SHEET.w * COS30 * ISO_S; // screen x of the sheet stack's right corner
const partsLeft = planFor(
  sheetRight + 24,
  (SHEET.w + SHEET.h + 700) * 0.5 * ISO_S,
  ISO_S,
);
// Parts origin: its left corner (x, y + 800) lands at partsLeft.
const PARTS_ORIGIN: Pt = [partsLeft[0], partsLeft[1] - 800];

const partSlab = (
  id: PartId,
  at: Pt,
  level: number,
  enter: [number, number],
  rotate = false,
): Slab => {
  const part = partById(id);
  const outline = rotate
    ? part.outline.map(([x, y]) => [part.h - y, x] as const)
    : part.outline;
  return {
    key: id,
    outline: transformPts(
      outline,
      PARTS_ORIGIN[0] + at[0],
      PARTS_ORIGIN[1] + at[1],
    ),
    z: level * THICK,
    textureOffset: [
      PARTS_ORIGIN[0] + at[0] - part.nest.x,
      PARTS_ORIGIN[1] + at[1] - part.nest.y,
    ],
    enter,
  };
};

const SHEETS: Slab[] = Array.from({ length: SHEET_COUNT }, (_, i) => ({
  key: `sheet-${i}`,
  outline: rect(0, 0, SHEET.w, SHEET.h),
  z: i * THICK,
  textureOffset: [0, 0],
  // The first sheet is already landing on frame 0, so the cut never shows an empty frame.
  enter: [S5.sheets[0] + i * 3 - 6, S5.sheets[0] + i * 3 + 4] as [
    number,
    number,
  ],
}));

const PARTS_STACK: Slab[] = [
  partSlab("tabletop", [0, 0], 0, [S5.parts[0], S5.parts[0] + 10]),
  partSlab("tableLegA", [0, 50], 1, [S5.parts[0] + 4, S5.parts[0] + 14]),
  partSlab("tableLegB", [560, 50], 1, [S5.parts[0] + 6, S5.parts[0] + 16]),
  partSlab(
    "benchLegA",
    [1140, 40],
    1,
    [S5.parts[0] + 8, S5.parts[0] + 18],
    true,
  ),
  partSlab(
    "benchLegB",
    [1140, 420],
    1,
    [S5.parts[0] + 10, S5.parts[0] + 20],
    true,
  ),
  partSlab("benchSeat", [0, 220], 2, [S5.parts[1] - 10, S5.parts[1]]),
];

// Offcuts laid out in front of the parts stack before they move away.
const partsFrontScreen =
  (PARTS_ORIGIN[0] + 1600 + PARTS_ORIGIN[1] + 800) * 0.5 * ISO_S;
const partsMidX =
  (PARTS_ORIGIN[0] + 800 - PARTS_ORIGIN[1] - 400) * COS30 * ISO_S;
const offcutCentre = planFor(partsMidX + 10, partsFrontScreen + 235, ISO_S);
const OFFCUT_ORIGIN: Pt = [offcutCentre[0] - 700, offcutCentre[1] - 450];
const OFFCUT_LAYOUT: Record<string, Pt> = {
  strip: [0, 0],
  bar: [0, 260],
  block: [1000, 520],
  archA: [0, 560],
  archB: [380, 560],
  archC: [0, 800],
  archD: [240, 800],
};
const OFFCUT_SLABS: Slab[] = OFFCUTS.map((o) => {
  const at = OFFCUT_LAYOUT[o.id];
  const dx = OFFCUT_ORIGIN[0] + at[0] - o.bounds.x;
  const dy = OFFCUT_ORIGIN[1] + at[1] - o.bounds.y;
  return {
    key: o.id,
    outline: transformPts(o.outline, dx, dy),
    z: 0,
    textureOffset: [dx, dy],
    enter: S5.offcutsIn as unknown as [number, number],
  };
});

const SlabShape: React.FC<{
  slab: Slab;
  iso: Iso;
  dz: number;
  opacity: number;
  shift?: Pt;
}> = ({ slab, iso, dz, opacity, shift = [0, 0] }) => {
  if (opacity <= 0) return null;
  const outline = transformPts(slab.outline, shift[0], shift[1]);
  const z0 = slab.z + dz;
  const z1 = z0 + THICK;
  const layers = 7;
  const clipId = `s5-clip-${slab.key}`;
  return (
    <g opacity={opacity}>
      {/* Extruded sides: the outline repeated up the thickness */}
      {Array.from({ length: layers }, (_, i) => (
        <path
          key={i}
          transform={isoTopMatrix(iso, lerp(z0, z1, i / layers))}
          d={toPath(outline, true)}
          fill={i === layers - 1 ? SIDE_LIGHT : SIDE}
        />
      ))}
      <g transform={isoTopMatrix(iso, z1)}>
        <defs>
          <clipPath id={clipId}>
            <path d={toPath(outline, true)} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <g
            transform={`translate(${slab.textureOffset[0] + shift[0]} ${slab.textureOffset[1] + shift[1]})`}
          >
            <SheetImage />
          </g>
        </g>
      </g>
    </g>
  );
};

const CHIP_COLORS = [
  "#F2EFE8",
  "#A9C0EC",
  "#3D63C9",
  "#142554",
  "#101012",
  "#8ED3C0",
  "#E4C9A0",
  "#23408E",
];
const GRANULES = 170;

export const Scene05Benefits: React.FC = () => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const { stacks, strip } = layout;

  // Fit both stacks around the stage centre.
  const s = stacks.mmToPx;
  const base: Iso = { ox: 0, oy: 0, s, zScale: Z_SCALE };
  const corners: Pt[] = [
    isoPoint(base, 0, SHEET.h, 0),
    isoPoint(base, SHEET.w, 0, SHEET_COUNT * THICK),
    isoPoint(base, PARTS_ORIGIN[0] + 1600, PARTS_ORIGIN[1], 0),
    isoPoint(base, 0, 0, SHEET_COUNT * THICK),
    isoPoint(base, SHEET.w, SHEET.h, 0),
  ];
  const minX = Math.min(...corners.map((c) => c[0]));
  const maxX = Math.max(...corners.map((c) => c[0]));
  const minY = Math.min(...corners.map((c) => c[1]));
  const maxY = Math.max(...corners.map((c) => c[1]));
  const enter = ramp(frame, S5.enter, EASE.out);
  const iso: Iso = {
    ...base,
    ox: stacks.cx - (minX + maxX) / 2 + (1 - enter) * layout.width * 0.45,
    oy: stacks.cy - (minY + maxY) / 2,
  };

  const stacksOut = ramp(
    frame,
    [S5.labelsOut[0] - 4, S5.labelsOut[1]],
    EASE.in,
  );
  const labelsOut = ramp(frame, S5.labelsOut, EASE.in);
  const drop = (slab: Slab) => {
    const t = ramp(frame, slab.enter, EASE.out);
    // A short drop keeps falling slabs clear of the headline.
    return { dz: (1 - t) * 260, opacity: Math.min(1, t * 4) };
  };

  // Offcuts appear beside the parts, then slide away towards the strip.
  const offIn = ramp(frame, S5.offcutsIn, EASE.out);
  const away = ramp(frame, S5.offcutsAway, EASE.inOut);
  const offShift: Pt = [-300 * away, 1300 * away];
  const offFade = 1 - ramp(frame, [S5.granules[0], S5.granules[0] + 8]);

  // Screen bounds of the offcuts once they have moved away: where chips start.
  const offPts = OFFCUT_SLABS.flatMap((o) =>
    transformPts(o.outline, -300, 1300).map(([x, y]) => isoPoint(iso, x, y, 0)),
  );
  const ox0 = Math.min(...offPts.map((p) => p[0]));
  const ox1 = Math.max(...offPts.map((p) => p[0]));
  const oy0 = Math.min(...offPts.map((p) => p[1]));
  const oy1 = Math.max(...offPts.map((p) => p[1]));

  const panelIn = ramp(frame, S5.newPanel, EASE.inOut);
  const stripLabel =
    ramp(frame, [S5.granules[0] + 4, S5.granules[0] + 16]) * (1 - labelsOut);

  const label = (
    text: string,
    x: number,
    y: number,
    o: number,
    align: "center" | "left" = "center",
  ) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        translate: align === "center" ? "-50% 0" : undefined,
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
  );

  const sheetLabelPos = isoPoint(iso, SHEET.w, SHEET.h, 0);
  const sheetCenter = isoPoint(iso, SHEET.w / 2, SHEET.h / 2, 0);
  const partsFront = isoPoint(
    iso,
    PARTS_ORIGIN[0] + 1600,
    PARTS_ORIGIN[1] + 800,
    0,
  );
  const partsCenter = isoPoint(
    iso,
    PARTS_ORIGIN[0] + 800,
    PARTS_ORIGIN[1] + 400,
    0,
  );
  const sheetsLabel =
    ramp(frame, [S5.sheets[1] - 4, S5.sheets[1] + 6]) * (1 - labelsOut);
  const partsLabel =
    ramp(frame, [S5.settle - 2, S5.settle + 8]) * (1 - labelsOut);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg
        width={layout.width}
        height={layout.height}
        style={{ position: "absolute", inset: 0, opacity: 1 - stacksOut }}
      >
        {SHEETS.map((slab) => {
          const d = drop(slab);
          return (
            <SlabShape
              key={slab.key}
              slab={slab}
              iso={iso}
              dz={d.dz}
              opacity={d.opacity}
            />
          );
        })}
        {PARTS_STACK.map((slab) => {
          const d = drop(slab);
          return (
            <SlabShape
              key={slab.key}
              slab={slab}
              iso={iso}
              dz={d.dz}
              opacity={d.opacity}
            />
          );
        })}
        {OFFCUT_SLABS.map((slab) => (
          <SlabShape
            key={slab.key}
            slab={slab}
            iso={iso}
            dz={(1 - offIn) * 60}
            opacity={offIn * offFade}
            shift={offShift}
          />
        ))}
      </svg>

      {label(
        STACK_LABELS.sheets,
        sheetCenter[0],
        sheetLabelPos[1] + 26,
        sheetsLabel,
      )}
      {label(
        STACK_LABELS.parts,
        partsCenter[0],
        partsFront[1] + 26,
        partsLabel,
      )}

      {/* New panel material forming where the chips land */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${(1 - panelIn) * (layout.width - strip.x)}px 0 0)`,
          opacity: panelIn > 0 ? 1 : 0,
        }}
      >
        <TextureWindow x={strip.x} y={strip.y} w={strip.w} h={strip.h} />
      </div>
      {label(
        STACK_LABELS.offcuts,
        strip.x,
        strip.y - stacks.labelSize * 1.7,
        stripLabel,
        "left",
      )}

      {/* Offcuts break down into chips that travel to the strip */}
      <svg
        width={layout.width}
        height={layout.height}
        style={{ position: "absolute", inset: 0 }}
      >
        {Array.from({ length: GRANULES }, (_, i) => {
          const r = (n: number) => random(`granule-${i}-${n}`);
          // Every chip has landed before the scene ends.
          const start = S5.granules[0] + r(1) * 8;
          const dur = 12 + r(2) * 6;
          const t = interpolate(frame, [start, start + dur], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: bezier(EASE.inOut),
          });
          if (t <= 0 || t >= 1) return null;
          const p0: Pt = [lerp(ox0, ox1, r(3)), lerp(oy0, oy1, r(4))];
          const p2: Pt = [strip.x + r(5) * strip.w, strip.y + r(6) * strip.h];
          const c: Pt = [
            (p0[0] + p2[0]) / 2 + (r(7) - 0.5) * 360,
            (p0[1] + p2[1]) / 2 - 80 - r(8) * 120,
          ];
          const u = 1 - t;
          const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0];
          const y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1];
          const size = 4 + r(9) * 9;
          const sides = 5;
          const pts = Array.from({ length: sides }, (_, j) => {
            const a =
              (j / sides) * Math.PI * 2 + r(10) * 6 + t * (r(11) - 0.5) * 8;
            const rad = size * (0.6 + 0.4 * random(`granule-${i}-v${j}`));
            return `${(x + Math.cos(a) * rad).toFixed(1)},${(y + Math.sin(a) * rad).toFixed(1)}`;
          }).join(" ");
          const fade = Math.min(1, t * 6) * (1 - ramp(t, [0.8, 1]));
          return (
            <polygon
              key={i}
              points={pts}
              fill={CHIP_COLORS[Math.floor(r(12) * CHIP_COLORS.length)]}
              opacity={fade}
            />
          );
        })}
      </svg>

      <Headline
        lines={HEADLINES.benefits}
        inFrame={S5.headlineIn}
        outFrame={S5.headlineOut}
        spec={LINKEDIN_SPECS.benefits}
      />
    </AbsoluteFill>
  );
};
