import React from "react";
import { Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Course } from "./layout";
import { patternSrc, type PatternSlug } from "../patterns";
import { font, color } from "../theme";

// Building blocks for the overhead table. All sizes are in world units.

type TextureProps = {
  slug: PatternSlug;
  // Which part of the panel to show, as CSS object-position
  position?: string;
  // >1 shows a smaller area of the panel (finer grain on screen)
  zoom?: number;
  rotate?: number;
  opacity?: number;
};

export const Texture: React.FC<TextureProps> = ({
  slug,
  position = "50% 50%",
  zoom = 1,
  rotate = 0,
  opacity = 1,
}) => (
  <Img
    src={patternSrc(slug)}
    showInTimeline={false}
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: `${zoom * 100}%`,
      height: `${zoom * 100}%`,
      translate: "-50% -50%",
      rotate: `${rotate}deg`,
      objectFit: "cover",
      objectPosition: position,
      opacity,
    }}
  />
);

export const abs = (x: number, y: number, w: number, h: number): React.CSSProperties => ({
  position: "absolute",
  left: x - w / 2,
  top: y - h / 2,
  width: w,
  height: h,
});

// Soft light from the upper left, used on most surfaces.
export const gloss =
  "radial-gradient(ellipse 38% 26% at 34% 28%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%)";

export const Overlay: React.FC<{ background: string; radius?: string | number; blend?: React.CSSProperties["mixBlendMode"]; inset?: number }> = ({
  background,
  radius = "50%",
  blend,
  inset = 0,
}) => (
  <div
    style={{
      position: "absolute",
      inset,
      borderRadius: radius,
      background,
      mixBlendMode: blend,
      pointerEvents: "none",
    }}
  />
);

export const InnerShadow: React.FC<{ radius?: string | number; strength?: number }> = ({
  radius = "50%",
  strength = 0.5,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: radius,
      boxShadow: `inset 0 ${10 * strength + 4}px ${26 * strength + 8}px rgba(58,46,34,${strength * 0.7})`,
    }}
  />
);

// ---- Landing animation -----------------------------------------------------

// Wraps a dish so it drops onto the table at frame `at`.
export const Served: React.FC<{
  at: number;
  x: number;
  y: number;
  drop?: number;
  children: React.ReactNode;
}> = ({ at, x, y, drop = 1.32, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const s = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 170, mass: 0.9 } });
  const scale = interpolate(s, [0, 1], [drop, 1]);
  const opacity = interpolate(frame - at, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        transformOrigin: `${x}px ${y}px`,
        scale: String(scale),
        opacity,
      }}
    >
      {children}
    </div>
  );
};

// ---- Table -----------------------------------------------------------------

export const TableSurface: React.FC = () => {
  const tileW = 820;
  const tileH = 1124;
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      tiles.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            left: -400 + c * tileW,
            top: -600 + r * tileH,
            width: tileW,
            height: tileH,
            overflow: "hidden",
            scale: `${c % 2 ? -1 : 1} ${r % 2 ? -1 : 1}`,
          }}
        >
          <Texture slug="frost" />
        </div>,
      );
    }
  }
  return (
    <div style={{ position: "absolute", left: -400, top: -600, width: 2460, height: 4496 }}>
      <div style={{ position: "absolute", left: 400, top: 600 }}>{tiles}</div>
      {/* a shade darker than the white serveware */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(110,100,92,0.13)" }} />
    </div>
  );
};

export const Runner: React.FC = () => {
  const w = 340;
  const tileH = Math.round((1124 * w) / 820);
  const pieces: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    pieces.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: 0,
          top: i * tileH,
          width: w,
          height: tileH,
          overflow: "hidden",
          scale: `1 ${i % 2 ? -1 : 1}`,
        }}
      >
        <Texture slug="gossamer" />
      </div>,
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: 500 - w / 2,
        top: -500,
        width: w,
        height: tileH * 8,
        overflow: "hidden",
        boxShadow: "0 2px 14px rgba(58,46,34,0.138)",
      }}
    >
      {pieces}
    </div>
  );
};

// ---- Place settings --------------------------------------------------------

export const PlaceSetting: React.FC<{ x: number; y: number; side: -1 | 1; role: string; index: number }> = ({
  x,
  y,
  side,
  role,
  index,
}) => {
  const d = 230;
  const glass = { x: side === -1 ? 215 : 790, y: y - 122 };
  return (
    <>
      {/* plate */}
      <div style={{ ...abs(x, y, d, d), borderRadius: "50%", overflow: "hidden", boxShadow: "0 14px 30px rgba(58,46,34,0.303)" }}>
        <Texture slug="timeless-duo" position={`${20 + index * 9}% ${30 + index * 6}%`} />
        <div
          style={{
            position: "absolute",
            inset: "17%",
            borderRadius: "50%",
            boxShadow: "inset 0 4px 10px rgba(58,46,34,0.088), 0 1px 0 rgba(255,255,255,0.6)",
          }}
        />
      </div>
      {/* napkin, folded across the plate */}
      <div
        style={{
          ...abs(x + side * 34, y + 8, 78, 236),
          rotate: `${side * -24}deg`,
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 8px 16px rgba(58,46,34,0.193)",
        }}
      >
        <Texture slug="salt-dune" zoom={1.6} position={`${index * 12}% 40%`} rotate={90} />
      </div>
      {/* place card */}
      <div
        style={{
          ...abs(x, y - 84, 150, 50),
          rotate: `${side * 3 - 1}deg`,
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 6px 12px rgba(58,46,34,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Texture slug="white-lollipop" zoom={2} position={`${index * 13}% ${index * 9}%`} />
        <div style={{ position: "relative", fontFamily: font, fontSize: 19, color: color.ink, whiteSpace: "nowrap" }}>
          {role}
        </div>
      </div>
      {/* glass */}
      <Glass x={glass.x} y={glass.y} />
    </>
  );
};

export const Glass: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const d = 76;
  return (
    <div
      style={{
        ...abs(x, y, d, d),
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: "0 8px 16px rgba(58,46,34,0.193), inset 0 0 0 3px rgba(255,255,255,0.55)",
      }}
    >
      <Texture slug="translucent-clear" opacity={0.42} />
      <div style={{ position: "absolute", inset: 9, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.45)" }} />
    </div>
  );
};

// ---- Candles and centrepiece -----------------------------------------------

export const Candle: React.FC<{ x: number; y: number; seed: number }> = ({ x, y, seed }) => {
  const frame = useCurrentFrame();
  const flick = 1 + Math.sin(frame * 0.9 + seed) * 0.08;
  const d = 60;
  return (
    <>
      <div style={{ ...abs(x, y, d, d), borderRadius: "50%", overflow: "hidden", boxShadow: "0 10px 18px rgba(58,46,34,0.275)" }}>
        <Texture slug="vintage-pearl" zoom={3} position={`${seed * 20}% 50%`} />
        <div style={{ position: "absolute", inset: 10, borderRadius: "50%", boxShadow: "inset 0 2px 6px rgba(58,46,34,0.138)" }} />
      </div>
      <div
        style={{
          ...abs(x, y, 34, 34),
          borderRadius: "50%",
          scale: String(flick),
          background: "radial-gradient(circle, #fffdf0 0%, #ffd27a 30%, rgba(255,160,60,0.55) 55%, rgba(255,150,60,0) 72%)",
        }}
      />
    </>
  );
};

export const Leaf: React.FC<{ x: number; y: number; angle: number; size?: number; seed?: number }> = ({
  x,
  y,
  angle,
  size = 1,
  seed = 0,
}) => (
  <div
    style={{
      ...abs(x, y, 54 * size, 24 * size),
      rotate: `${angle}deg`,
      borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
      overflow: "hidden",
      boxShadow: "0 3px 6px rgba(58,46,34,0.193)",
    }}
  >
    <Texture slug="translucent-glitter-green" zoom={4} position={`${seed * 17}% ${seed * 11}%`} />
    <div style={{ position: "absolute", left: "8%", right: "8%", top: "48%", height: 1.5, background: "rgba(40,70,40,0.35)" }} />
  </div>
);

export const Centerpiece: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const d = 214;
  const leaves = [-160, -110, -40, 15, 70, 130, 200];
  return (
    <>
      {leaves.map((a, i) => {
        const r = d / 2 + 6;
        const rad = (a * Math.PI) / 180;
        return <Leaf key={a} x={x + Math.cos(rad) * r} y={y + Math.sin(rad) * r} angle={a} size={1.15} seed={i} />;
      })}
      <div style={{ ...abs(x, y, d, d), borderRadius: "50%", overflow: "hidden", boxShadow: "0 16px 30px rgba(58,46,34,0.303)" }}>
        <Texture slug="vintage-pearl" zoom={1.4} />
        <div style={{ position: "absolute", inset: 14, borderRadius: "50%", overflow: "hidden", boxShadow: "0 0 0 1px rgba(58,46,34,0.055)" }}>
          <Texture slug="potpourri" zoom={1.1} position="40% 55%" />
          <InnerShadow strength={0.45} />
        </div>
      </div>
    </>
  );
};

export const SaltCellar: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div style={{ ...abs(x, y, 58, 58), borderRadius: "50%", overflow: "hidden", boxShadow: "0 8px 14px rgba(58,46,34,0.275)" }}>
    <Texture slug="fleur-de-sel" zoom={3} />
    <div style={{ position: "absolute", inset: 9, borderRadius: "50%", overflow: "hidden", boxShadow: "inset 0 3px 6px rgba(58,46,34,0.165)" }}>
      <Texture slug="fleur-de-sel" zoom={5} position="70% 30%" />
    </div>
  </div>
);

// ---- The menu --------------------------------------------------------------
//
// Every dish is drawn as empty serveware that waits on the table, plus the
// food (see Food below) and any toppings, which land at `foodAt`, the frame
// the cooking finishes (see Cooking.tsx).

// The food: the course's pattern, cut to the shape in layout.ts. Poured
// dishes fill from the middle while the stream runs; chopped ones appear as
// the pieces settle; the roast is there as soon as it has been shaped.
export const Food: React.FC<{ course: Course; children?: React.ReactNode }> = ({ course, children }) => {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  let opacity = 1;
  let clipPath: string | undefined;
  if (course.cook === "pour") {
    const from = course.liftEnd + 3;
    if (frame < from) return null;
    const r = interpolate(frame, [from, course.cookEnd - 2], [0, 75], { ...clamp, easing: Easing.bezier(0.25, 0.8, 0.35, 1) });
    clipPath = `circle(${r}% at 50% 50%)`;
  } else if (course.cook === "chop") {
    opacity = interpolate(frame, [course.cookEnd - 7, course.cookEnd], [0, 1], clamp);
  } else {
    opacity = interpolate(frame, [course.liftEnd - 1, course.liftEnd + 2], [0, 1], clamp);
  }
  if (opacity <= 0) return null;
  const f = course.food;
  return (
    <div
      style={{
        ...abs(course.x + f.dx, course.y + f.dy, f.w, f.h),
        borderRadius: f.radius === "ellipse" ? "50%" : f.radius,
        overflow: "hidden",
        opacity,
        clipPath,
      }}
    >
      <Texture slug={course.pattern} zoom={f.zoom} position={f.position} />
      {children}
    </div>
  );
};

// Toppings drop in a moment after the food.
const Topping: React.FC<{ at: number; x: number; y: number; drop?: number; children: React.ReactNode }> = (props) => (
  <Served {...props} />
);

type DishProps = { course: Course; foodAt: number };

export const CranberrySauce: React.FC<{ course: Course }> = ({ course }) => {
  const { x, y } = course;
  const d = 190;
  return (
    <>
      <div style={{ ...abs(x, y, d, d), borderRadius: "50%", overflow: "hidden", boxShadow: "0 16px 30px rgba(58,46,34,0.303), inset 0 0 0 3px rgba(255,255,255,0.5)" }}>
        <Texture slug="translucent-clear" opacity={0.85} />
        <div style={{ position: "absolute", inset: 13, borderRadius: "50%", boxShadow: "inset 0 6px 14px rgba(58,46,34,0.138)" }} />
      </div>
      <Food course={course}>
        <InnerShadow strength={0.55} />
        <Overlay background={gloss} />
      </Food>
    </>
  );
};

export const MashedPotatoes: React.FC<DishProps> = ({ course, foodAt }) => {
  const { x, y } = course;
  const d = 250;
  return (
    <>
      <div style={{ ...abs(x, y, d, d), borderRadius: "50%", overflow: "hidden", boxShadow: "0 18px 34px rgba(58,46,34,0.303)" }}>
        <Texture slug="vintage-pearl" zoom={1.3} position="30% 50%" />
        <div style={{ position: "absolute", inset: 20, borderRadius: "50%", boxShadow: "inset 0 8px 18px rgba(58,46,34,0.154)" }} />
      </div>
      <Food course={course}>
        <InnerShadow strength={0.4} />
      </Food>
      <Topping at={foodAt + 6} x={x} y={y} drop={1.6}>
        <div style={{ ...abs(x + 4, y - 2, 58, 48), rotate: "14deg", borderRadius: 9, overflow: "hidden", boxShadow: "0 5px 10px rgba(58,46,34,0.165)" }}>
          <Texture slug="translucent-orange" zoom={3.5} position="60% 60%" />
        </div>
      </Topping>
    </>
  );
};

const CUT_LINES =
  "linear-gradient(90deg, transparent calc(33.3% - 2px), rgba(80,50,15,0.45) calc(33.3% - 1px), rgba(80,50,15,0.45) calc(33.3% + 1px), transparent calc(33.3% + 2px), transparent calc(66.6% - 2px), rgba(80,50,15,0.45) calc(66.6% - 1px), rgba(80,50,15,0.45) calc(66.6% + 1px), transparent calc(66.6% + 2px)), linear-gradient(0deg, transparent calc(33.3% - 2px), rgba(80,50,15,0.45) calc(33.3% - 1px), rgba(80,50,15,0.45) calc(33.3% + 1px), transparent calc(33.3% + 2px), transparent calc(66.6% - 2px), rgba(80,50,15,0.45) calc(66.6% - 1px), rgba(80,50,15,0.45) calc(66.6% + 1px), transparent calc(66.6% + 2px))";

export const Cornbread: React.FC<DishProps> = ({ course, foodAt }) => {
  const frame = useCurrentFrame();
  const { x, y } = course;
  const s = 200;
  // Cut into squares once it is out of the oven.
  const cut = interpolate(frame, [foodAt + 10, foodAt + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <div style={{ ...abs(x, y, s, s), borderRadius: 22, background: "#26201c", boxShadow: "0 18px 30px rgba(58,46,34,0.33), inset 0 0 0 2px rgba(255,255,255,0.06)" }} />
      <Food course={course}>
        <div style={{ position: "absolute", inset: 0, background: CUT_LINES, opacity: cut }} />
        <InnerShadow strength={0.35} radius={12} />
      </Food>
    </>
  );
};

export const PumpkinPie: React.FC<DishProps> = ({ course, foodAt }) => {
  const { x, y } = course;
  const d = 250;
  return (
    <>
      {/* the pie shell waits on the table */}
      <div style={{ ...abs(x, y, d, d), borderRadius: "50%", overflow: "hidden", boxShadow: "0 18px 32px rgba(58,46,34,0.303)" }}>
        <Texture slug="translucent-glitter-gold" zoom={1.2} position="30% 30%" />
        <div style={{ position: "absolute", inset: 24, borderRadius: "50%", background: "rgba(120,80,30,0.18)", boxShadow: "inset 0 8px 16px rgba(60,30,0,0.35)" }} />
      </div>
      <Food course={course}>
        <InnerShadow strength={0.4} />
        <Overlay background={gloss} />
      </Food>
      <Topping at={foodAt + 4} x={x} y={y} drop={1.8}>
        <div style={{ ...abs(x, y, 76, 76), borderRadius: "50%", overflow: "hidden", boxShadow: "0 8px 14px rgba(58,46,34,0.193)" }}>
          <Texture slug="milky-way" zoom={3} />
        </div>
      </Topping>
    </>
  );
};
