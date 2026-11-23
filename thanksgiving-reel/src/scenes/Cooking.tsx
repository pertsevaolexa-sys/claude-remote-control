import React from "react";
import { Easing, Img, interpolate, random, useCurrentFrame } from "remotion";
import { foodOnScreen, type Course } from "../table/layout";
import { Texture } from "../table/parts";
import { patternSrc } from "../patterns";
import { photoLayout } from "../products";

// The cooking, drawn over the table in screen space. Each course lifts its
// sample off the product photo and then cooks it the way the dish is made:
// sauces and batters are poured, vegetables are cut and dropped in, the
// turkey is shaped on the platter. The food layer on the table (Food in
// parts.tsx) takes over at the end.

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
const gravity = Easing.bezier(0.5, 0, 0.9, 0.6);

type Box = { cx: number; cy: number; w: number; h: number; rot: number };

// Where the sample goes once it leaves the photo.
const prepBox = (c: Course, frame: number): Box => {
  const t = foodOnScreen(c, frame);
  if (c.cook === "chop") {
    // held just above the dish, the shape of what goes in it
    return { cx: t.cx, cy: t.cy - t.h * 0.04, w: t.w * 0.9, h: t.h * 0.9, rot: 0 };
  }
  if (c.cook === "pour") {
    // Tipped over the dish with its lowest corner just above the rim, so
    // the stream falls straight down into the middle.
    const w = Math.max(t.w, t.h) * 0.42;
    const h = w * 1.3;
    const rot = -Math.abs(c.rot);
    const rad = (rot * Math.PI) / 180;
    const ax = t.cx;
    const ay = t.cy - t.h * 0.6;
    return {
      cx: ax + (w / 2) * Math.cos(rad) + (h / 2) * Math.sin(rad),
      cy: ay + (w / 2) * Math.sin(rad) - (h / 2) * Math.cos(rad),
      w,
      h,
      rot,
    };
  }
  return { cx: t.cx, cy: t.cy, w: t.w, h: t.h, rot: 0 };
};

// From the product photo to the prep position, lifted in the middle.
const Lift: React.FC<{ c: Course }> = ({ c }) => {
  const frame = useCurrentFrame();
  // the roast holds a moment so the bird can take over under it
  if (frame < c.pageEnd || frame >= c.liftEnd + (c.cook === "roast" ? 3 : 0)) return null;
  const from = photoLayout(c.pattern).panel;
  const to = prepBox(c, c.liftEnd);
  const p = interpolate(frame, [c.pageEnd, c.liftEnd], [0, 1], { ...clamp, easing: easeInOut });
  const up = Math.sin(Math.PI * p);
  const roast = c.cook === "roast";
  const radius = roast ? `${lerp(0, to.w / 2, p)}px / ${lerp(0, to.h / 2, p)}px` : 0;
  const [px, py] = c.food.position.split(" ").map((v) => parseFloat(v));
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(from.cx, to.cx, p) - lerp(from.w, to.w, p) / 2,
        top: lerp(from.cy, to.cy, p) - lerp(from.h, to.h, p) / 2,
        width: lerp(from.w, to.w, p),
        height: lerp(from.h, to.h, p),
        rotate: `${lerp(0, to.rot, p)}deg`,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow: `0 ${26 * up}px ${50 * up}px rgba(58,46,34,${0.3 * up})`,
      }}
    >
      <Texture
        slug={c.pattern}
        zoom={roast ? lerp(1, c.food.zoom, p) : 1}
        position={roast ? `${lerp(50, px, p)}% ${lerp(50, py, p)}%` : "50% 50%"}
      />
    </div>
  );
};

// Cut on the spot into a grid, then the pieces drop into the dish.
const Chop: React.FC<{ c: Course }> = ({ c }) => {
  const frame = useCurrentFrame();
  if (frame < c.liftEnd || frame > c.cookEnd) return null;
  const t = frame - c.liftEnd;
  const [cols, rows] = c.grid ?? [4, 4];
  const box = prepBox(c, frame);
  const food = foodOnScreen(c, frame);
  const left = box.cx - box.w / 2;
  const top = box.cy - box.h / 2;
  const pw = box.w / cols;
  const ph = box.h / rows;
  const lines = cols - 1 + rows - 1;
  const gap = interpolate(t, [7, 10], [0, 5], clamp);
  const pieces: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const seed = `${c.key}-${k}`;
      // land somewhere inside the dish
      const a = random(`${seed}-a`) * Math.PI * 2;
      const r = Math.sqrt(random(`${seed}-r`)) * 0.78;
      const tx = food.cx + Math.cos(a) * r * (food.w / 2);
      const ty = food.cy + Math.sin(a) * r * (food.h / 2);
      const startDrop = 9 + random(`${seed}-d`) * 5;
      const d = interpolate(t, [startDrop, startDrop + 7], [0, 1], { ...clamp, easing: gravity });
      const sx = left + (i + 0.5) * pw;
      const sy = top + (j + 0.5) * ph;
      const spin = (random(`${seed}-s`) - 0.5) * 120 * d;
      const fade = interpolate(t, [18, 24], [1, 0], clamp);
      pieces.push(
        <div
          key={k}
          style={{
            position: "absolute",
            left: lerp(sx, tx, d) - (pw - gap) / 2,
            top: lerp(sy, ty, d) - (ph - gap) / 2,
            width: pw - gap,
            height: ph - gap,
            rotate: `${spin}deg`,
            scale: String(lerp(1, 0.74, d)),
            overflow: "hidden",
            opacity: fade,
            boxShadow: gap > 0 ? "0 3px 6px rgba(58,46,34,0.25)" : "none",
          }}
        >
          <Img
            src={patternSrc(c.pattern)}
            showInTimeline={false}
            style={{
              position: "absolute",
              left: -i * pw - gap / 2,
              top: -j * ph - gap / 2,
              width: box.w,
              height: box.h,
              objectFit: "cover",
            }}
          />
        </div>,
      );
    }
  }
  // Knife cuts, one after another, before the pieces come apart.
  const cuts: React.ReactNode[] = [];
  for (let n = 0; n < lines; n++) {
    const vertical = n < cols - 1;
    const at = (n / Math.max(1, lines)) * 6;
    const draw = interpolate(t, [at, at + 2], [0, 1], clamp);
    const gone = interpolate(t, [7, 9], [1, 0], clamp);
    if (draw <= 0 || gone <= 0) continue;
    cuts.push(
      <div
        key={`cut-${n}`}
        style={
          vertical
            ? { position: "absolute", left: left + (n + 1) * pw - 1, top, width: 2, height: box.h * draw, background: "rgba(40,30,20,0.55)", opacity: gone }
            : { position: "absolute", left, top: top + (n - (cols - 1) + 1) * ph - 1, width: box.w * draw, height: 2, background: "rgba(40,30,20,0.55)", opacity: gone }
        }
      />,
    );
  }
  return (
    <>
      {pieces}
      {cuts}
    </>
  );
};

// Tipped over the dish, the sample runs out in a stream and fills it from
// the middle (the fill itself is the Food layer on the table).
const Pour: React.FC<{ c: Course }> = ({ c }) => {
  const frame = useCurrentFrame();
  if (frame < c.liftEnd || frame > c.cookEnd + 2) return null;
  const t = frame - c.liftEnd;
  const len = c.cookEnd - c.liftEnd;
  const box = prepBox(c, frame);
  const food = foodOnScreen(c, frame);
  // pour from the corner of the slab nearest the dish
  const rad = (box.rot * Math.PI) / 180;
  const corner = (sx: number, sy: number) => ({
    x: box.cx + sx * Math.cos(rad) - sy * Math.sin(rad),
    y: box.cy + sx * Math.sin(rad) + sy * Math.cos(rad),
  });
  // the slab empties into the stream
  const empty = interpolate(t, [2, len - 6], [0, 1], clamp);
  const shrink = lerp(1, 0.2, empty);
  const a = corner((-box.w / 2) * shrink, (box.h / 2) * shrink);
  const b = { x: food.cx, y: food.cy };
  const head = interpolate(t, [0, 4], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.9, 0.6) });
  const tail = interpolate(t, [len - 7, len - 2], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.9, 0.6) });
  const p1 = { x: lerp(a.x, b.x, tail), y: lerp(a.y, b.y, tail) };
  const p2 = { x: lerp(a.x, b.x, head), y: lerp(a.y, b.y, head) };
  const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI - 90;
  const sw = Math.max(14, Math.min(food.w, food.h) * 0.06) * (1 + 0.08 * Math.sin(frame * 1.4));
  const ring = (delay: number) => {
    const q = interpolate(t, [4 + delay, 14 + delay], [0, 1], clamp);
    if (q <= 0 || q >= 1) return null;
    const rw = food.w * 0.5 * q;
    const rh = food.h * 0.5 * q;
    return (
      <div
        key={delay}
        style={{
          position: "absolute",
          left: b.x - rw,
          top: b.y - rh,
          width: rw * 2,
          height: rh * 2,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.7)",
          opacity: 1 - q,
        }}
      />
    );
  };
  return (
    <>
      {empty < 1 ? (
        <div
          style={{
            position: "absolute",
            left: box.cx - box.w / 2,
            top: box.cy - box.h / 2,
            width: box.w,
            height: box.h,
            rotate: `${box.rot}deg`,
            scale: String(shrink),
            opacity: 1 - empty * empty,
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(58,46,34,0.25)",
          }}
        >
          <Texture slug={c.pattern} />
        </div>
      ) : null}
      {segLen > 1 ? (
        <div
          style={{
            position: "absolute",
            left: (p1.x + p2.x) / 2 - sw / 2,
            top: (p1.y + p2.y) / 2 - segLen / 2,
            width: sw,
            height: segLen,
            rotate: `${angle}deg`,
            borderRadius: sw / 2,
            overflow: "hidden",
          }}
        >
          <Texture slug={c.pattern} zoom={3} position={`50% ${(frame * 7) % 100}%`} />
        </div>
      ) : null}
      {ring(0)}
      {ring(6)}
    </>
  );
};

// Steam off the hot dishes.
const Steam: React.FC<{ c: Course }> = ({ c }) => {
  const frame = useCurrentFrame();
  if (!c.hot || frame < c.cookEnd - 4 || frame > c.end + 8) return null;
  const food = foodOnScreen(c, frame);
  return (
    <>
      {[0, 1, 2].map((k) => {
        const t = frame - (c.cookEnd - 4) - k * 5;
        const q = interpolate(t, [0, 26], [0, 1], clamp);
        if (q <= 0 || q >= 1) return null;
        const w = food.w * 0.22;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: food.cx + (k - 1) * food.w * 0.18 + Math.sin(t / 5 + k) * 10 - w / 2,
              top: food.cy - food.h * 0.1 - q * food.h * 0.75 - w * 0.7,
              width: w,
              height: w * 1.4,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.55)",
              filter: `blur(${10 + q * 8}px)`,
              opacity: Math.sin(Math.PI * q),
            }}
          />
        );
      })}
    </>
  );
};

// The cranberry sauce simmers for a moment.
const Simmer: React.FC<{ c: Course }> = ({ c }) => {
  const frame = useCurrentFrame();
  if (c.key !== "cranberry" || frame < c.cookEnd - 2 || frame > c.end) return null;
  const food = foodOnScreen(c, frame);
  return (
    <>
      {[0, 1, 2, 3, 4].map((k) => {
        const start = c.cookEnd - 2 + k * 4;
        const q = interpolate(frame, [start, start + 7], [0, 1], clamp);
        if (q <= 0 || q >= 1) return null;
        const a = random(`bubble-a-${k}`) * Math.PI * 2;
        const r = Math.sqrt(random(`bubble-r-${k}`)) * 0.6;
        const size = food.w * (0.05 + 0.04 * random(`bubble-s-${k}`)) * (0.4 + q);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: food.cx + Math.cos(a) * r * (food.w / 2) - size / 2,
              top: food.cy + Math.sin(a) * r * (food.h / 2) - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              border: "2px solid rgba(255,220,220,0.75)",
              opacity: 1 - q,
            }}
          />
        );
      })}
    </>
  );
};

export const Cooking: React.FC<{ c: Course }> = ({ c }) => (
  <>
    <Lift c={c} />
    {c.cook === "chop" ? <Chop c={c} /> : null}
    {c.cook === "pour" ? <Pour c={c} /> : null}
    <Simmer c={c} />
    <Steam c={c} />
  </>
);
