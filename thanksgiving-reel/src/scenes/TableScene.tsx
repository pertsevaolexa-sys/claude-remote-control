import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  CANDLES,
  CENTERPIECE,
  COURSES,
  HERO_END,
  MAIN,
  PAGE_IN,
  SALT,
  SEATS,
  TABLE_SCENE_LENGTH,
  WIDE_START,
  cameraAt,
  courseByKey,
  type Course,
} from "../table/layout";
import {
  Candle,
  Centerpiece,
  Cornbread,
  CranberrySauce,
  MashedPotatoes,
  PlaceSetting,
  PumpkinPie,
  Runner,
  SaltCellar,
  TableSurface,
} from "../table/parts";
import { Platter, Turkey } from "../table/Turkey";
import { Cooking } from "./Cooking";
import { patternName } from "../patterns";
import { PHOTO_BOX, photoLayout, productFor, productPhoto } from "../products";
import { Logo } from "../brand";
import { Caption } from "../ui";
import { color, font, tight } from "../theme";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const World: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame);
  const dish = (key: string) => {
    const c = courseByKey(key);
    return { course: c, foodAt: c.cookEnd };
  };
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transformOrigin: "0 0",
        transform: `translate(${540 - cam.x * cam.z}px, ${cam.ay - cam.y * cam.z}px) scale(${cam.z})`,
      }}
    >
      <TableSurface />
      <Runner />
      {SEATS.map((s, i) => (
        <PlaceSetting key={s.role} x={s.x} y={s.y} side={s.side} role={s.role} index={i} />
      ))}
      <Centerpiece x={CENTERPIECE.x} y={CENTERPIECE.y} />
      {CANDLES.map((c, i) => (
        <Candle key={i} x={c.x} y={c.y} seed={i * 2.3} />
      ))}
      <Platter x={MAIN.x} y={MAIN.y} />
      <SaltCellar x={SALT.x} y={SALT.y} />
      <CranberrySauce course={courseByKey("cranberry")} />
      <MashedPotatoes {...dish("mash")} />
      <Cornbread {...dish("cornbread")} />
      <PumpkinPie {...dish("pie")} />
      <Turkey course={MAIN} />
    </div>
  );
};

// Course 1 opens like the polygood.com homepage, then scrolls down to the
// first pattern.
const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame > HERO_END + 12) return null;
  const scroll = interpolate(frame, [HERO_END - 2, HERO_END + 10], [0, -1920], { ...clamp, easing: easeInOut });
  return (
    <AbsoluteFill style={{ backgroundColor: color.hero, translate: `0px ${scroll}px` }}>
      <Interactive.Div
        name="Hook"
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 640,
          textAlign: "center",
          fontFamily: font,
          fontSize: 124,
          lineHeight: 1.0,
          letterSpacing: "-0.035em",
          color: color.ink,
        }}
      >
        We cooked something for you.
      </Interactive.Div>
      <Interactive.Div
        name="Hook subheading"
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 940,
          textAlign: "center",
          fontFamily: font,
          fontSize: 48,
          letterSpacing: "-0.01em",
          color: color.ink,
        }}
      >
        A Thanksgiving menu made of Polygood®
      </Interactive.Div>
    </AbsoluteFill>
  );
};

// Each course starts on the pattern as polygood.com shows it: the product
// photo, the name, and what the panel is made from.
const ProductPage: React.FC<{ c: Course }> = ({ c }) => {
  const frame = useCurrentFrame();
  const first = c.index === 0;
  const enter = first ? HERO_END - 2 : c.start;
  if (frame < enter || frame > c.pageEnd + 10) return null;
  const product = productFor(c.pattern);
  const layout = photoLayout(c.pattern);
  // Course 1 scrolls up from the hero; the others come in from the right,
  // like the next product.
  const slideX = first ? 0 : interpolate(frame, [c.start, c.start + PAGE_IN], [1080, 0], { ...clamp, easing: easeOut });
  const slideY = first ? interpolate(frame, [enter, enter + 12], [1920, 0], { ...clamp, easing: easeInOut }) : 0;
  const leave = interpolate(frame, [c.pageEnd + 2, c.pageEnd + 10], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: color.white, translate: `${slideX}px ${slideY}px`, opacity: leave }}>
      <div
        style={{
          position: "absolute",
          left: PHOTO_BOX.x,
          top: PHOTO_BOX.y,
          width: PHOTO_BOX.w,
          height: PHOTO_BOX.h,
          overflow: "hidden",
          background: "#E2E2E2",
        }}
      >
        <Img
          src={productPhoto(c.pattern)}
          showInTimeline={false}
          style={{
            position: "absolute",
            left: layout.img.left - PHOTO_BOX.x,
            top: layout.img.top - PHOTO_BOX.y,
            width: layout.img.width,
            height: layout.img.height,
          }}
        />
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 1150, fontFamily: font, color: color.ink }}>
        <div style={{ fontSize: 76, lineHeight: 1.04, letterSpacing: tight }}>{patternName(c.pattern)}</div>
        <div style={{ fontSize: 40, marginTop: 14, letterSpacing: "-0.01em" }}>Made from {product.origin}</div>
      </div>
    </AbsoluteFill>
  );
};

export const TableScene: React.FC<{ sfx?: boolean }> = ({ sfx = true }) => (
  <AbsoluteFill style={{ backgroundColor: color.hero, overflow: "hidden" }}>
    <World />

    {COURSES.map((c) => (
      <Caption
        key={c.key}
        from={c.cookEnd + 2}
        to={c === MAIN ? WIDE_START : c.end + 2}
        title={c.dish}
        line={patternName(c.pattern) + (c.also ? ` and ${patternName(c.also)}` : "")}
      />
    ))}
    <Caption from={WIDE_START + 24} to={TABLE_SCENE_LENGTH + 20} title="Everything on this table is Polygood®" />

    {COURSES.map((c) => (
      <ProductPage key={c.key} c={c} />
    ))}
    {COURSES.map((c) => (
      <Cooking key={c.key} c={c} />
    ))}
    <Hero />
    {/* the site header */}
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 310, background: color.white }} />
    <div style={{ position: "absolute", left: 60, top: 232 }}>
      <Logo height={46} />
    </div>

    {sfx ? (
      <>
        <Audio src={staticFile("sfx/ding.wav")} volume={0.35} />
        {COURSES.slice(1).map((c) => (
          <Audio key={c.key} src={staticFile("sfx/whoosh.wav")} from={c.start} volume={0.12} />
        ))}
      </>
    ) : null}
  </AbsoluteFill>
);
