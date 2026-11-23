import React from "react";
import { AbsoluteFill, Img, Interactive } from "remotion";
import { patternSrc, type PatternSlug } from "../patterns";
import { Texture } from "../table/parts";
import { Logo } from "../brand";
import { color, font, tight } from "../theme";

// A slice of every dish on the menu, in a Translucent Glitter Gold crust.
export const PIE_SLICES: PatternSlug[] = [
  "translucent-bronze",
  "translucent-burgundy",
  "marbellous",
  "translucent-glitter-gold",
  "translucent-orange",
];

const wedge = (i: number, n: number) => {
  const step = 360 / n;
  const pts = ["50% 50%"];
  for (let k = 0; k <= 4; k++) {
    const a = ((i * step + (k * step) / 4 - 90) * Math.PI) / 180;
    pts.push(`${50 + Math.cos(a) * 75}% ${50 + Math.sin(a) * 75}%`);
  }
  return `polygon(${pts.join(", ")})`;
};

const PatternPie: React.FC<{ size: number }> = ({ size }) => {
  const n = PIE_SLICES.length;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(58,46,34,0.16)",
      }}
    >
      <Texture slug="translucent-glitter-gold" zoom={1.1} />
      <div style={{ position: "absolute", inset: size * 0.07, borderRadius: "50%", overflow: "hidden" }}>
        {PIE_SLICES.map((slug, i) => (
          <Img
            key={slug}
            src={patternSrc(slug)}
            showInTimeline={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              // a hair smaller than the wedge so the cuts show between slices
              clipPath: wedge(i, n),
              scale: "0.985",
            }}
          />
        ))}
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "inset 0 8px 20px rgba(58,46,34,0.2)" }} />
      </div>
    </div>
  );
};

export const EndCard: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: color.white, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 236, display: "flex", justifyContent: "center" }}>
      <Logo height={58} />
    </div>
    <div style={{ position: "absolute", left: 540 - 250, top: 380 }}>
      <PatternPie size={500} />
    </div>
    <Interactive.Div
      name="Happy Thanksgiving"
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 940,
        textAlign: "center",
        fontFamily: font,
        fontSize: 116,
        lineHeight: 1,
        letterSpacing: "-0.035em",
        color: color.ink,
      }}
    >
      Happy Thanksgiving
    </Interactive.Div>
    <Interactive.Div
      name="Sign-off"
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1080,
        textAlign: "center",
        fontFamily: font,
        fontSize: 46,
        letterSpacing: tight,
        color: color.ink,
      }}
    >
      from all of us at The Good Plastic Company
    </Interactive.Div>
  </AbsoluteFill>
);
