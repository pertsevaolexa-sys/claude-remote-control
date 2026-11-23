import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Food, Texture } from "./parts";
import type { Course } from "./layout";

// Roast turkey seen from above, built from Translucent Bronze, on a Terrazzo Nuovo
// platter with Translucent Glitter Green sage and Translucent Burgundy
// cranberries. Drawn in a 300 x 400 box centred on (x, y), scaled by 0.88.
// The breast is the course's Food (the panel morphs into it); the rest of
// the bird joins it straight after.

const part = (
  left: number,
  top: number,
  w: number,
  h: number,
  rotate = 0,
  radius: string | number = "50%",
): React.CSSProperties => ({
  position: "absolute",
  left,
  top,
  width: w,
  height: h,
  rotate: `${rotate}deg`,
  borderRadius: radius,
  overflow: "hidden",
});

const roastShade = (strength: number) =>
  `radial-gradient(ellipse at 50% 50%, rgba(64, 22, 8, 0) 52%, rgba(64, 22, 8, ${0.55 * strength}) 100%)`;

// The edges brown as it roasts: `roast` goes from 0 (just shaped) to 1.
const RoastContext = React.createContext(1);
const Shade: React.FC<{ strength?: number }> = ({ strength = 1 }) => {
  const roast = React.useContext(RoastContext);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background: roastShade(strength * (0.35 + 0.65 * roast)),
      }}
    />
  );
};

const Drumstick: React.FC<{ side: -1 | 1 }> = ({ side }) => (
  <>
    <div
      style={{
        ...part(side === -1 ? 62 : 186, 262, 54, 124, side * 14, "45% 45% 40% 40% / 30% 30% 70% 70%"),
        boxShadow: "0 10px 16px rgba(58,46,34,0.275)",
      }}
    >
      <Texture slug="translucent-bronze" zoom={3} position={side === -1 ? "20% 70%" : "80% 30%"} />
      <Shade strength={1.2} />
    </div>
    {/* paper frill on the bone */}
    <div
      style={{
        ...part(side === -1 ? 58 : 214, 372, 30, 26, side * 14, 8),
        boxShadow: "0 4px 8px rgba(58,46,34,0.193)",
      }}
    >
      <Texture slug="milky-way" zoom={8} />
    </div>
  </>
);

const Garnish: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Tucked between the bird and the rim of the platter.
  const ring = (deg: number, k = 1) => {
    const t = (deg * Math.PI) / 180;
    return { x: Math.cos(t) * 150 * k, y: Math.sin(t) * 205 * k };
  };
  const items: { x: number; y: number; kind: "leaf" | "berry"; a: number }[] = [
    ...[-120, -60, 0, 60, 120, 180].map((deg) => ({ ...ring(deg), kind: "leaf" as const, a: deg + 90 })),
    ...[-150, -90, -30, 30, 90, 150].map((deg) => ({ ...ring(deg, 0.97), kind: "berry" as const, a: 0 })),
    ...[-105, -15, 75, 165].map((deg) => ({ ...ring(deg, 1.02), kind: "berry" as const, a: 0 })),
  ];
  return (
    <>
      {items.map((it, i) => {
        const start = at + i * 2;
        if (frame < start) return null;
        const s = spring({ frame: frame - start, fps, config: { damping: 12, stiffness: 200 } });
        const size = it.kind === "leaf" ? [62, 26] : [24, 24];
        return (
          <div
            key={i}
            style={{
              ...part(it.x - size[0] / 2, it.y - size[1] / 2, size[0], size[1], it.a, it.kind === "leaf" ? "50% 50% 50% 50% / 60% 60% 40% 40%" : "50%"),
              scale: String(interpolate(s, [0, 1], [0.2, 1])),
              boxShadow: "0 3px 6px rgba(58,46,34,0.22)",
            }}
          >
            <Texture
              slug={it.kind === "leaf" ? "translucent-glitter-green" : "translucent-burgundy"}
              zoom={it.kind === "leaf" ? 4 : 9}
              position={`${(i * 23) % 100}% ${(i * 37) % 100}%`}
            />
            {it.kind === "berry" ? null : (
              <div style={{ position: "absolute", left: "8%", right: "8%", top: "48%", height: 1.5, background: "rgba(40,70,40,0.35)" }} />
            )}
          </div>
        );
      })}
    </>
  );
};

export const Platter: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const w = 380;
  const h = 500;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: "0 22px 40px rgba(58,46,34,0.33)",
      }}
    >
      <Texture slug="terrazzo-nuovo" zoom={1.15} />
      <div style={{ position: "absolute", inset: 22, borderRadius: "50%", boxShadow: "inset 0 6px 14px rgba(58,46,34,0.088), 0 1px 0 rgba(255,255,255,0.5)" }} />
    </div>
  );
};

// Wings, thighs and drumsticks grow out from under the breast.
const Joins: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const s = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 190 } });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: "150px 170px",
        scale: String(interpolate(s, [0, 1], [0.55, 1])),
        opacity: interpolate(frame - at, [0, 3], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      {children}
    </div>
  );
};

export const Turkey: React.FC<{ course: Course }> = ({ course }) => {
  const frame = useCurrentFrame();
  const { x, y } = course;
  const roast = interpolate(frame, [course.liftEnd, course.cookEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <RoastContext.Provider value={roast}>
      <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0 }}>
        <Garnish at={course.cookEnd + 2} />
        <div style={{ position: "absolute", left: -150, top: -212, width: 300, height: 400, scale: "0.88", transformOrigin: "150px 212px" }}>
          <Joins at={course.liftEnd + 1}>
            <Drumstick side={-1} />
            <Drumstick side={1} />
            {/* thighs */}
            <div style={{ ...part(20, 170, 118, 150, -12), boxShadow: "0 12px 20px rgba(58,46,34,0.248)" }}>
              <Texture slug="translucent-bronze" zoom={2.2} position="30% 60%" />
              <Shade strength={1.1} />
            </div>
            <div style={{ ...part(162, 170, 118, 150, 12), boxShadow: "0 12px 20px rgba(58,46,34,0.248)" }}>
              <Texture slug="translucent-bronze" zoom={2.2} position="70% 40%" />
              <Shade strength={1.1} />
            </div>
            {/* wings */}
            <div style={{ ...part(6, 66, 70, 140, 10), boxShadow: "0 10px 16px rgba(58,46,34,0.248)" }}>
              <Texture slug="translucent-bronze" zoom={3} position="10% 20%" />
              <Shade strength={1.25} />
            </div>
            <div style={{ ...part(224, 66, 70, 140, -10), boxShadow: "0 10px 16px rgba(58,46,34,0.248)" }}>
              <Texture slug="translucent-bronze" zoom={3} position="90% 80%" />
              <Shade strength={1.25} />
            </div>
          </Joins>
        </div>
      </div>
      {/* breast */}
      <div style={{ filter: "drop-shadow(0 14px 18px rgba(58,46,34,0.248))" }}>
        <Food course={course}>
          <Shade />
        </Food>
      </div>
    </RoastContext.Provider>
  );
};
