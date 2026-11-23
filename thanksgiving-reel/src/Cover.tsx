import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { TableScene } from "./scenes/TableScene";
import { WIDE_START } from "./table/layout";
import { Logo } from "./brand";
import { color, font } from "./theme";

// Reel cover in the homepage style: the heading on the hero colour above
// the finished table. Both sit inside the 3:4 area the profile grid shows
// (y 240 to 1680).
export const Cover: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: color.hero }}>
    {/* Shift the table scene so this still shows its wide shot */}
    <Sequence from={-(WIDE_START + 16)} layout="none">
      <TableScene sfx={false} />
    </Sequence>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 840, background: color.hero }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 310, background: color.white }} />
    <div style={{ position: "absolute", left: 60, top: 232 }}>
      <Logo height={46} />
    </div>
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 430,
        textAlign: "center",
        fontFamily: font,
        color: color.ink,
      }}
    >
      <div style={{ fontSize: 150, lineHeight: 0.96, letterSpacing: "-0.04em" }}>Served with thanks</div>
      <div style={{ fontSize: 46, marginTop: 34, letterSpacing: "-0.01em" }}>A Thanksgiving menu made of Polygood®</div>
    </div>
  </AbsoluteFill>
);
