import {
  AbsoluteFill,
  Composition,
  Easing,
  Interactive,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { LOGO_PATH, LOGO_VIEWBOX } from "./logoPath";

// Inter (SIL Open Font License), bundled locally in public/
const fontFamily = "Inter";
loadFont({ family: fontFamily, url: staticFile("inter-latin-300-normal.woff2"), weight: "300" });
loadFont({ family: fontFamily, url: staticFile("inter-latin-800-normal.woff2"), weight: "800" });

export const MyComposition = () => {
  return (
    <Composition
      id="Followers30K"
      component={Followers30K}
      durationInFrames={240}
      fps={30}
      width={1080}
      height={1350}
    />
  );
};

// ---------------------------------------------------------------------------
// Background: drifting blue / lavender blobs + film grain
// ---------------------------------------------------------------------------

type BlobProps = {
  color: string;
  w: number;
  h: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle?: number;
};

const Blob: React.FC<BlobProps> = ({ color, w, h, x, y, dx, dy, angle = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [-0.5, 0.5], {
    easing: Easing.inOut(Easing.sin),
  });
  return (
    <div
      style={{
        position: "absolute",
        width: w,
        height: h,
        left: x - w / 2 + dx * t,
        top: y - h / 2 + dy * t,
        rotate: `${angle}deg`,
        borderRadius: "50%",
        background: `radial-gradient(closest-side, ${color} 0%, ${color} 35%, transparent 100%)`,
      }}
    />
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
        opacity: 0.17,
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
    <AbsoluteFill style={{ backgroundColor: "#5567a6", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          filter: "blur(70px)",
          scale: interpolate(frame, [0, 75], [1.18, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {/* deep blue areas */}
        <Blob color="#27417f" w={820} h={1200} x={980} y={260} dx={-50} dy={50} angle={35} />
        <Blob color="#29437f" w={640} h={1000} x={60} y={700} dx={60} dy={-40} angle={70} />
        <Blob color="#2c4685" w={520} h={1100} x={420} y={1000} dx={50} dy={-50} angle={-55} />
        <Blob color="#3d5596" w={460} h={700} x={1000} y={760} dx={-40} dy={40} angle={10} />
        {/* light lavender areas */}
        <Blob color="#c9cbe5" w={1000} h={760} x={220} y={160} dx={70} dy={40} angle={-20} />
        <Blob color="#c6c8e3" w={1100} h={700} x={920} y={1260} dx={-60} dy={-30} angle={-25} />
        <Blob color="#bfc2df" w={520} h={460} x={30} y={1320} dx={50} dy={-20} />
        <Blob color="#9ea6d2" w={420} h={300} x={40} y={960} dx={30} dy={20} angle={-30} />
      </AbsoluteFill>
      {/* intro dim */}
      <AbsoluteFill
        style={{
          backgroundColor: "#16275e",
          opacity: interpolate(frame, [0, 40], [0.85, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.33, 1, 0.68, 1),
          }),
        }}
      />
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
        fontWeight: 800,
        fontSize: 124,
        letterSpacing: "-0.01em",
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

// Small sparkles bursting out of the number
const Sparkles: React.FC = () => {
  const frame = useCurrentFrame();
  const start = 108;
  const t = frame - start;
  if (t < 0) return null;
  const count = 26;
  return (
    <AbsoluteFill>
      {Array.from({ length: count }, (_, i) => {
        const angle = random(`a${i}`) * Math.PI * 2;
        const dist = 220 + random(`d${i}`) * 330;
        const delay = random(`t${i}`) * 6;
        const life = 50 + random(`l${i}`) * 30;
        const p = interpolate(t - delay, [0, life], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        const opacity = interpolate(
          t - delay,
          [0, 4, life * 0.55, life],
          [0, 1, 0.8, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const size = 4 + random(`s${i}`) * 8;
        const cx = 540 + Math.cos(angle) * dist * p * 1.15;
        const cy = 740 + Math.sin(angle) * dist * p * 0.75;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx - size / 2,
              top: cy - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 0 12px 3px rgba(255,255,255,0.7)",
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
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

export const Followers30K: React.FC = () => {
  return (
    <AbsoluteFill name="Scene">
      <Background />
      <Glow />
      <Logo />
      <Sparkles />
      <Count />
      <FollowersWord />
    </AbsoluteFill>
  );
};
