import React from "react";
import { AbsoluteFill, Interactive } from "remotion";
import { Texture } from "../table/parts";
import { Logo } from "../brand";
import { color, font, tight } from "../theme";

// The turn: the people who did the cooking all year, on place cards cut
// from White Lollipop. The cards are set down one after another.
export const CHEFS = [
  "Architects",
  "Interior designers",
  "Specifiers",
  "Fabricators",
  "Brands",
  "Distributors",
];

const PlaceCard: React.FC<{ label: string; index: number }> = ({ label, index }) => (
  <Interactive.Div
    name={`Place card ${index + 1}`}
    from={20 + index * 5}
    style={{
      position: "relative",
      width: 720,
      height: 104,
      borderRadius: 3,
      overflow: "hidden",
      boxShadow: "0 10px 22px rgba(58,46,34,0.14)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      rotate: `${[-1.6, 1.2, -0.9, 1.5, -1.2, 0.9][index % 6]}deg`,
    }}
  >
    <Texture slug="white-lollipop" zoom={1.6} position={`${index * 17}% ${index * 13}%`} />
    <div style={{ position: "relative", fontFamily: font, fontSize: 58, letterSpacing: "-0.015em", color: color.ink }}>
      {label}
    </div>
  </Interactive.Div>
);

export const ChefsScene: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: color.hero, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 310, background: color.white }} />
    <div style={{ position: "absolute", left: 60, top: 232 }}>
      <Logo height={46} />
    </div>

    <Interactive.Div
      name="Turn"
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 380,
        textAlign: "center",
        fontFamily: font,
        fontSize: 96,
        lineHeight: 1.02,
        letterSpacing: tight,
        color: color.ink,
      }}
    >
      But all year,
      <br />
      you did the cooking.
    </Interactive.Div>

    <div
      style={{
        position: "absolute",
        top: 640,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      {CHEFS.map((c, i) => (
        <PlaceCard key={c} label={c} index={i} />
      ))}
    </div>

    <Interactive.Div
      name="Thank you"
      from={62}
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1400,
        textAlign: "center",
        fontFamily: font,
        fontSize: 72,
        letterSpacing: tight,
        color: color.ink,
      }}
    >
      Thank you for every project.
    </Interactive.Div>
  </AbsoluteFill>
);
