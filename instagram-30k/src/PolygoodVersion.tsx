// Work in progress: The Good Plastic Company / Polygood terrazzo restyle.
import {
  AbsoluteFill,
  Composition,
  Easing,
  Interactive,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { LOGO_PATH, LOGO_VIEWBOX } from "./logoPath";

// The Good Plastic Company sets type in PP Neue Montreal (commercial licence).
// Inter (SIL Open Font License) stands in for it, bundled locally in public/.
const fontFamily = "Inter";
loadFont({ family: fontFamily, url: staticFile("inter-latin-300-normal.woff2"), weight: "300" });
loadFont({ family: fontFamily, url: staticFile("inter-latin-400-normal.woff2"), weight: "400" });
loadFont({ family: fontFamily, url: staticFile("inter-latin-700-normal.woff2"), weight: "700" });

// The Good Plastic Company palette (from thegoodplasticcompany.com)
const GPC_BLUE = "#00258C";

export const PolygoodComposition = () => {
  return (
    <Composition
      id="Followers30K-Polygood"
      component={Followers30KPolygood}
      durationInFrames={240}
      fps={30}
      width={1080}
      height={1350}
    />
  );
};

// ---------------------------------------------------------------------------
// Background: a Polygood-style recycled-plastic surface. Flakes of plastic fly
// in, settle and get pressed into a deep-blue terrazzo panel.
// ---------------------------------------------------------------------------

const FLAKE_COLORS: [string, number][] = [
  ["#0a2785", 16],
  ["#12319c", 20],
  ["#1c3dae", 20],
  ["#2a4cc0", 16],
  ["#3b5fd0", 11],
  ["#5677dc", 7],
  ["#8299e3", 4],
  ["#c3cef0", 1.6],
  ["#ffffff", 0.6],
  ["#e92215", 0.4],
];

type Flake = {
  x: number;
  y: number;
  points: string;
  color: string;
  delay: number;
  fromX: number;
  fromY: number;
  fromRot: number;
};

const pickColor = (r: number) => {
  const total = FLAKE_COLORS.reduce((a, [, w]) => a + w, 0);
  let acc = 0;
  for (const [c, w] of FLAKE_COLORS) {
    acc += w / total;
    if (r <= acc) return c;
  }
  return FLAKE_COLORS[0][0];
};

const makeFlakes = (): Flake[] => {
  const flakes: Flake[] = [];
  const cell = 44;
  let i = 0;
  for (let gy = -80; gy < 1430; gy += cell) {
    for (let gx = -80; gx < 1160; gx += cell) {
      i++;
      const x = gx + random(`fx${i}`) * cell;
      const y = gy + random(`fy${i}`) * cell;
      const big = random(`big${i}`) < 0.04;
      const r = big ? 40 + random(`r${i}`) * 30 : 7 + Math.pow(random(`r${i}`), 1.6) * 30;
      const n = 5 + Math.floor(random(`n${i}`) * 3);
      const rot0 = random(`a${i}`) * Math.PI * 2;
      const pts: string[] = [];
      for (let k = 0; k < n; k++) {
        const ang = rot0 + (k / n) * Math.PI * 2 + (random(`j${i}-${k}`) - 0.5) * 0.9;
        const rad = r * (0.5 + random(`m${i}-${k}`) * 0.5);
        pts.push(`${(Math.cos(ang) * rad).toFixed(1)},${(Math.sin(ang) * rad * 0.8).toFixed(1)}`);
      }
      const away = Math.atan2(y - 675, x - 540) + (random(`d${i}`) - 0.5) * 1.2;
      const dist = 250 + random(`ds${i}`) * 650;
      flakes.push({
        x,
        y,
        points: pts.join(" "),
        color: pickColor(random(`c${i}`)),
        delay: random(`t${i}`) * 26,
        fromX: Math.cos(away) * dist,
        fromY: Math.sin(away) * dist,
        fromRot: (random(`rot${i}`) - 0.5) * 360,
      });
    }
  }
  return flakes;
};

const FLAKES = makeFlakes();

const Terrazzo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={1080} height={1350} style={{ position: "absolute", inset: 0 }}>
      {FLAKES.map((f, i) => {
        const p = interpolate(frame, [f.delay, f.delay + 34], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        const x = f.x + f.fromX * (1 - p);
        const y = f.y + f.fromY * (1 - p);
        const rot = f.fromRot * (1 - p);
        const sc = 1.6 - 0.6 * p;
        return (
          <g
            key={i}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sc.toFixed(3)})`}
            opacity={Math.min(1, p * 3)}
          >
            <polygon points={f.points} fill={f.color} />
          </g>
        );
      })}
    </svg>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg
      width="100%"
      height="100%"
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "normal",
        opacity: 0.1,
      }}
    >
      <filter id="grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.8"
          numOctaves="2"
          seed={Math.floor(frame / 2)}
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope="3" intercept="-1" />
          <feFuncG type="linear" slope="3" intercept="-1" />
          <feFuncB type="linear" slope="3" intercept="-1" />
        </feComponentTransfer>
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: GPC_BLUE, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          scale: interpolate(frame, [0, 50, 240], [1.12, 1, 1.05], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.inOut(Easing.sin)],
          }),
        }}
      >
        <Terrazzo />
      </AbsoluteFill>
      {/* soft deep-blue pool behind the type, for legibility */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 62% 42% at 52% 52%, rgba(0, 28, 110, 0.82) 0%, rgba(0, 28, 110, 0.55) 45%, rgba(0, 28, 110, 0) 100%)",
          opacity: interpolate(frame, [20, 60], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      {/* darker floor so the sign-off reads cleanly */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0, 28, 110, 0) 70%, rgba(0, 28, 110, 0.55) 100%)",
        }}
      />
      {/* glossy sheen sweeping over the freshly pressed panel */}
      <AbsoluteFill style={{ overflow: "hidden", mixBlendMode: "screen" }}>
        <div
          style={{
            position: "absolute",
            top: -400,
            width: 420,
            height: 2200,
            rotate: "24deg",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(210,220,255,0.22) 50%, rgba(255,255,255,0) 100%)",
            left: interpolate(frame, [38, 92], [-700, 1300], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.45, 0, 0.55, 1),
            }),
          }}
        />
      </AbsoluteFill>
      <Grain />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Logo: outline draws itself, then fills in
// ---------------------------------------------------------------------------

const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Logo"
      style={{
        position: "absolute",
        left: 451,
        top: 395,
        width: 216,
        height: 184,
        opacity: interpolate(frame, [8, 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(frame, [8, 60], [0.82, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.spring({ damping: 12 }),
          output: "perceptual-scale",
        }),
      }}
    >
      <svg viewBox={LOGO_VIEWBOX} width="100%" height="100%">
        <path
          d={LOGO_PATH}
          fillRule="evenodd"
          pathLength={1}
          fill="#ffffff"
          fillOpacity={interpolate(frame, [32, 50], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.33, 1, 0.68, 1),
          })}
          stroke="#ffffff"
          strokeWidth={14}
          strokeLinejoin="round"
          strokeDasharray={1}
          strokeDashoffset={interpolate(frame, [8, 46], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.65, 0, 0.35, 1),
          })}
        />
      </svg>
    </Interactive.Div>
  );
};

// ---------------------------------------------------------------------------
// Number: odometer-style rolling digits landing on "30 000"
// ---------------------------------------------------------------------------

const FONT_SIZE = 124;
const CELL = FONT_SIZE * 1.4;
const ROLL_START = 42;
const LAND = 108; // frame when the last digit lands

const DigitRoller: React.FC<{ digit: number; index: number }> = ({
  digit,
  index,
}) => {
  const frame = useCurrentFrame();
  const spins = 2 + index; // later digits spin more, so they land later
  const target = spins * 10 + digit;
  const end = LAND - (4 - index) * 7;
  const pos = interpolate(frame, [ROLL_START, end], [0, target], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 0.61, 0.2, 1),
  });
  const speed =
    pos -
    interpolate(frame - 1, [ROLL_START, end], [0, target], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.22, 0.61, 0.2, 1),
    });
  const strip = Array.from({ length: target + 1 }, (_, i) => i % 10);

  return (
    <div
      style={{
        position: "relative",
        height: CELL,
        overflow: "hidden",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 24%, black 76%, transparent 100%)",
      }}
    >
      {/* invisible final digit sets the column width, so "30 000" keeps its natural spacing */}
      <div style={{ visibility: "hidden", lineHeight: `${CELL}px` }}>{digit}</div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: -20,
          right: -20,
          textAlign: "center",
          translate: `0px ${-pos * CELL}px`,
          filter: `blur(${Math.min(speed * 5, 6)}px)`,
        }}
      >
        {strip.map((d, i) => (
          <div key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>
            {d}
          </div>
        ))}
      </div>
    </div>
  );
};

const Count: React.FC = () => {
  const frame = useCurrentFrame();
  const digits = [3, 0, 0, 0, 0];
  return (
    <Interactive.Div
      name="30 000"
      style={{
        position: "absolute",
        left: 16,
        right: 0,
        top: 650,
        display: "flex",
        justifyContent: "center",
        fontFamily,
        fontWeight: 700,
        fontSize: 128,
        letterSpacing: "-0.02em",
        color: "#ffffff",
        opacity: interpolate(frame, [36, 50], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(frame, [36, 66], ["0px 40px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        scale: interpolate(frame, [108, 116, 134], [1, 1.07, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: [Easing.bezier(0.33, 1, 0.68, 1), Easing.spring({ damping: 10 })],
          output: "perceptual-scale",
        }),
      }}
    >
      {digits.map((d, i) => (
        <div key={i} style={{ display: "flex" }}>
          <DigitRoller digit={d} index={i} />
          {i === 1 ? <div style={{ width: FONT_SIZE * 0.2 }} /> : null}
        </div>
      ))}
    </Interactive.Div>
  );
};

// Soft glow that blooms behind the number on landing
const Glow: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Glow"
      style={{
        position: "absolute",
        left: 140,
        top: 520,
        width: 800,
        height: 480,
        borderRadius: "50%",
        background:
          "radial-gradient(ellipse, rgba(225,228,255,0.55) 0%, rgba(225,228,255,0) 65%)",
        opacity: interpolate(frame, [104, 116, 170], [0, 1, 0.25], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: [Easing.bezier(0.33, 1, 0.68, 1), Easing.bezier(0.45, 0, 0.55, 1)],
        }),
        scale: interpolate(frame, [104, 170], [0.7, 1.15], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          output: "perceptual-scale",
        }),
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Instagram moments: double-tap heart, Live-style floating hearts,
// follower notification bubble
// ---------------------------------------------------------------------------

const BRAND_BLUE = GPC_BLUE;
const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
const PERSON_PATH =
  "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z";

const Heart: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
    <path d={HEART_PATH} fill={color} />
  </svg>
);

// The big heart that pops when you double-tap a post
const DoubleTapHeart: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Double-tap heart"
      style={{
        position: "absolute",
        left: 390,
        top: 560,
        width: 300,
        height: 300,
        filter: "drop-shadow(0 10px 30px rgba(20, 30, 80, 0.35))",
        opacity: interpolate(frame, [108, 110, 134, 142], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(frame, [108, 118, 126, 142], [0.2, 1.15, 1, 0.6], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: [
            Easing.bezier(0.34, 1.56, 0.64, 1),
            Easing.bezier(0.33, 1, 0.68, 1),
            Easing.bezier(0.55, 0, 1, 0.45),
          ],
          output: "perceptual-scale",
        }),
      }}
    >
      <Heart color="#ffffff" size={300} />
    </Interactive.Div>
  );
};

// Hearts floating up from the corners, like reactions on Instagram Live
const FloatingHearts: React.FC = () => {
  const frame = useCurrentFrame();
  const count = 30;
  return (
    <AbsoluteFill>
      {Array.from({ length: count }, (_, i) => {
        const start = 120 + i * 3.6 + random(`st${i}`) * 4;
        const t = frame - start;
        const life = 70 + random(`l${i}`) * 25;
        if (t < 0 || t > life) return null;
        const right = random(`side${i}`) < 0.65;
        const baseX = right ? 935 + random(`x${i}`) * 50 : 95 + random(`x${i}`) * 50;
        const p = t / life;
        const sway = Math.sin(t / 9 + random(`ph${i}`) * 6) * (18 + random(`sw${i}`) * 22);
        const x = baseX + sway;
        const y = 1330 - p * (560 + random(`h${i}`) * 160);
        const size = 44 + random(`s${i}`) * 34;
        const pop = interpolate(t, [0, 10], [0.3, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        });
        const opacity = interpolate(p, [0, 0.08, 0.6, 1], [0, 1, 0.9, 0]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              opacity,
              scale: pop,
              rotate: `${sway * 0.3}deg`,
              filter: "drop-shadow(0 4px 10px rgba(20, 30, 80, 0.25))",
            }}
          >
            <Heart color="#ffffff" size={size} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Instagram-style activity bubble: new followers
const NotificationBubble: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Notification bubble"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 205,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transformOrigin: "50% 100%",
        opacity: interpolate(frame, [112, 116], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(frame, [112, 132], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.spring({ damping: 9 }),
          output: "perceptual-scale",
        }),
        translate: interpolate(frame, [132, 240], ["0px 0px", "0px -8px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.sin),
        }),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "18px 34px 18px 28px",
          borderRadius: 26,
          backgroundColor: "#ffffff",
          color: BRAND_BLUE,
          fontFamily,
          fontWeight: 700,
          fontSize: 54,
          letterSpacing: "-0.01em",
          boxShadow: "0 14px 40px rgba(20, 30, 80, 0.25)",
        }}
      >
        <svg viewBox="0 0 24 24" width={58} height={58}>
          <path d={PERSON_PATH} fill={BRAND_BLUE} />
        </svg>
        <span>30K</span>
      </div>
      {/* tail */}
      <div
        style={{
          width: 0,
          height: 0,
          marginTop: -1,
          borderLeft: "16px solid transparent",
          borderRight: "16px solid transparent",
          borderTop: "16px solid #ffffff",
        }}
      />
    </Interactive.Div>
  );
};

// ---------------------------------------------------------------------------
// "followers" word: letters rise in one by one
// ---------------------------------------------------------------------------

const Letter: React.FC<{ char: string; index: number }> = ({ char, index }) => {
  const frame = useCurrentFrame();
  const start = 70 + index * 3;
  return (
    <span
      style={{
        display: "inline-block",
        opacity: interpolate(frame, [start, start + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: `0px ${interpolate(frame, [start, start + 22], [36, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}px`,
        filter: `blur(${interpolate(frame, [start, start + 14], [8, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}px)`,
      }}
    >
      {char}
    </span>
  );
};

const FollowersWord: React.FC = () => {
  return (
    <Interactive.Div
      name="followers"
      style={{
        position: "absolute",
        left: 20,
        right: 0,
        top: 787,
        textAlign: "center",
        fontFamily,
        fontWeight: 300,
        fontSize: 124,
        letterSpacing: "-0.035em",
        lineHeight: "140px",
        color: "#ffffff",
      }}
    >
      {"followers".split("").map((c, i) => (
        <Letter key={i} char={c} index={i} />
      ))}
    </Interactive.Div>
  );
};

// Sign-off echoing the brand line "Helping companies do good"
const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Tagline"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1110,
        textAlign: "center",
        fontFamily,
        fontWeight: 400,
        fontSize: 46,
        lineHeight: "58px",
        letterSpacing: "-0.01em",
        color: "#ffffff",
        opacity: interpolate(frame, [140, 160], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(frame, [140, 170], ["0px 24px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      Thank you for helping
      <br />
      us do good
    </Interactive.Div>
  );
};

export const Followers30KPolygood: React.FC = () => {
  return (
    <AbsoluteFill name="Scene">
      <Background />
      <Glow />
      <Logo />
      <Count />
      <FollowersWord />
      <Tagline />
      <FloatingHearts />
      <NotificationBubble />
      <DoubleTapHeart />
    </AbsoluteFill>
  );
};
