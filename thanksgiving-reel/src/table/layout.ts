import { Easing, interpolate } from "remotion";
import type { PatternSlug } from "../patterns";

// The table is one top-down "world" (1 unit = 1px at zoom 1, roughly 1 mm),
// about 1040 x 1750. BLENDER.md reuses these coordinates.

// Where the food sits inside its dish, relative to the dish centre. The
// cooking animations end on exactly this shape, so the dish components and
// the cooking overlay both read it from here.
export type FoodShape = {
  dx: number;
  dy: number;
  w: number;
  h: number;
  // Corner radius in world units, or "ellipse" for round dishes
  radius: number | "ellipse";
  // Texture framing, as used by <Texture zoom position>
  zoom: number;
  position: string;
};

// How the pattern becomes the dish:
// pour  - it melts into a stream and fills the dish from the middle
// chop  - it is cut on the spot and the pieces drop into the dish
// roast - it is shaped into the bird and roasted in oven light
export type Cook = "pour" | "chop" | "roast";

type CourseSpec = {
  key: string;
  dish: string;
  pattern: PatternSlug;
  // Second pattern used for a topping, shown on the label
  also?: PatternSlug;
  kicker: string;
  x: number;
  y: number;
  zoom: number;
  // Screen y of the dish centre in the dish shot
  ay: number;
  food: FoodShape;
  cook: Cook;
  // Pieces across and down when the panel is chopped
  grid?: [number, number];
  // Steam rises from the finished dish
  hot?: boolean;
  // Frames: product page, cooking, finished dish (the lift sits between
  // the page and the cooking)
  page: number;
  cookLen: number;
  dishLen: number;
  // Tilt of the panel while it is in the air
  rot: number;
};

export type Course = CourseSpec & {
  index: number;
  start: number;
  // product page shown until here, then the panel lifts off
  pageEnd: number;
  liftEnd: number;
  // dish finished
  cookEnd: number;
  end: number;
};

export const LIFT = 10;
const DISH_AY = 860;
const round = (d: number, zoom: number, position = "50% 50%"): FoodShape => ({
  dx: 0,
  dy: 0,
  w: d,
  h: d,
  radius: "ellipse",
  zoom,
  position,
});

// Course 1 opens on a homepage-style hero before its product page.
export const HERO_END = 36;
export const PAGE_IN = 8; // frames for a product page to slide in

// Only the brightest, most appetising dishes, turkey last.
const SPECS: CourseSpec[] = [
  {
    key: "cranberry", dish: "Cranberry sauce", pattern: "translucent-burgundy", kicker: "Polygood pattern",
    x: 395, y: 360, zoom: 2.9, ay: DISH_AY, food: round(164, 1.25, "45% 40%"),
    cook: "pour", page: HERO_END + 30, cookLen: 22, dishLen: 26, rot: -14,
  },
  {
    key: "mash", dish: "Mashed potatoes", pattern: "marbellous", kicker: "Polygood pattern",
    x: 618, y: 470, zoom: 2.2, ay: DISH_AY, food: round(210, 1.05),
    cook: "chop", grid: [4, 4], hot: true, page: 20, cookLen: 24, dishLen: 22, rot: 6,
  },
  {
    key: "cornbread", dish: "Cornbread", pattern: "translucent-glitter-gold", kicker: "Polygood pattern",
    x: 500, y: 725, zoom: 2.6, ay: DISH_AY,
    food: { dx: 0, dy: 0, w: 176, h: 176, radius: 12, zoom: 1.2, position: "50% 50%" },
    cook: "pour", hot: true, page: 20, cookLen: 22, dishLen: 24, rot: 14,
  },
  {
    key: "pie", dish: "Pumpkin pie", pattern: "translucent-orange", also: "milky-way", kicker: "Polygood pattern",
    x: 500, y: 1500, zoom: 2.2, ay: DISH_AY, food: round(202, 1.1),
    cook: "pour", page: 20, cookLen: 22, dishLen: 24, rot: -14,
  },
  {
    // The breast of the bird; wings, thighs and drumsticks follow it in.
    key: "turkey", dish: "Roast turkey", pattern: "translucent-bronze", kicker: "The main course",
    x: 500, y: 1105, zoom: 1.3, ay: 730,
    food: { dx: 0, dy: -38.72, w: 204.16, h: 260.48, radius: "ellipse", zoom: 1.25, position: "50% 45%" },
    cook: "roast", hot: true, page: 20, cookLen: 36, dishLen: 34, rot: 4,
  },
];

export const COURSES: Course[] = (() => {
  let t = 0;
  return SPECS.map((s, index) => {
    const start = t;
    const pageEnd = start + s.page;
    const liftEnd = pageEnd + LIFT;
    const cookEnd = liftEnd + s.cookLen;
    const end = cookEnd + s.dishLen;
    t = end;
    return { ...s, index, start, pageEnd, liftEnd, cookEnd, end };
  });
})();

export const courseByKey = (key: string) => {
  const c = COURSES.find((x) => x.key === key);
  if (!c) throw new Error(`No course ${key}`);
  return c;
};

export const MAIN = COURSES[COURSES.length - 1];

export const CENTERPIECE = { x: 500, y: 140 };
export const CANDLES = [
  { x: 350, y: 112 },
  { x: 652, y: 172 },
];
export const SALT = { x: 690, y: 1290 };

export type Seat = { x: number; y: number; side: -1 | 1; role: string };
const SEAT_Y = [330, 760, 1190, 1620];
const LEFT_ROLES = ["Architects", "Interior designers", "Specifiers", "Fabricators"];
const RIGHT_ROLES = ["Brands", "Artists & makers", "Distributors", "You"];
export const SEATS: Seat[] = [
  ...SEAT_Y.map((y, i) => ({ x: 95, y, side: -1 as const, role: LEFT_ROLES[i] })),
  ...SEAT_Y.map((y, i) => ({ x: 905, y, side: 1 as const, role: RIGHT_ROLES[i] })),
];

// Everything else on the table, as listed on the card in the wide shot.
export const TABLE_SETTING: { item: string; pattern: PatternSlug }[] = [
  { item: "Tabletop", pattern: "frost" },
  { item: "Table runner", pattern: "gossamer" },
  { item: "Plates", pattern: "timeless-duo" },
  { item: "Napkins", pattern: "salt-dune" },
  { item: "Glasses", pattern: "translucent-clear" },
  { item: "Serveware & candles", pattern: "vintage-pearl" },
  { item: "Centrepiece", pattern: "potpourri" },
  { item: "Platter", pattern: "terrazzo-nuovo" },
  { item: "Place cards", pattern: "white-lollipop" },
  { item: "Salt", pattern: "fleur-de-sel" },
];

// ---- Timing (30 fps) -------------------------------------------------------

export const WIDE_START = MAIN.end; // 452
export const CARD_IN = WIDE_START + 30;
export const TABLE_SCENE_LENGTH = WIDE_START + 96; // 548

export const courseAt = (frame: number) =>
  COURSES.find((c) => frame >= c.start && frame < c.end) ?? null;

// ---- Camera ----------------------------------------------------------------

type Key = { f: number; x: number; y: number; z: number; ay: number };

const keys: Key[] = (() => {
  const k: Key[] = [];
  const first = COURSES[0];
  k.push({ f: 0, x: first.x, y: first.y, z: first.zoom, ay: first.ay });
  for (let i = 1; i < COURSES.length; i++) {
    const prev = COURSES[i - 1];
    const c = COURSES[i];
    // Slow push-in on the finished dish, then a move to the next one
    // while the next product page covers the frame.
    k.push({ f: c.start + 8, x: prev.x, y: prev.y, z: prev.zoom * 1.035, ay: prev.ay });
    k.push({ f: c.start + 18, x: c.x, y: c.y, z: c.zoom, ay: c.ay });
  }
  k.push({ f: WIDE_START, x: MAIN.x, y: MAIN.y, z: MAIN.zoom * 1.03, ay: MAIN.ay });
  k.push({ f: WIDE_START + 26, x: 500, y: 900, z: 0.95, ay: 960 });
  k.push({ f: CARD_IN, x: 500, y: 900, z: 0.94, ay: 960 });
  k.push({ f: CARD_IN + 22, x: 500, y: 1080, z: 0.86, ay: 560 });
  k.push({ f: TABLE_SCENE_LENGTH, x: 500, y: 1090, z: 0.82, ay: 560 });
  return k;
})();

const frames = keys.map((k) => k.f);
const opts = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: Easing.bezier(0.65, 0, 0.35, 1),
};

export const cameraAt = (frame: number) => {
  const x = interpolate(frame, frames, keys.map((k) => k.x), opts);
  const y = interpolate(frame, frames, keys.map((k) => k.y), opts);
  // Zoom is interpolated in log space so zooming feels even.
  const z = Math.exp(interpolate(frame, frames, keys.map((k) => Math.log(k.z)), opts));
  const ay = interpolate(frame, frames, keys.map((k) => k.ay), opts);
  // A little hand-held drift keeps the overhead shot alive.
  const dx = Math.sin(frame / 37) * 4 + Math.sin(frame / 13) * 0.8;
  const dy = Math.cos(frame / 45) * 3;
  return { x, y, z, ay, dx, dy };
};

// Screen rectangle of a course's food at a given frame.
export const foodOnScreen = (c: Course, frame: number) => {
  const cam = cameraAt(frame);
  return {
    cx: 540 + cam.dx + (c.x + c.food.dx - cam.x) * cam.z,
    cy: cam.ay + cam.dy + (c.y + c.food.dy - cam.y) * cam.z,
    w: c.food.w * cam.z,
    h: c.food.h * cam.z,
    z: cam.z,
  };
};
