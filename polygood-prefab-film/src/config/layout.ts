// Per-format layout. Both formats share every scene component; only these
// numbers differ, so LinkedIn is reframed rather than cropped.

export type Variant = "reels" | "linkedin";

export type Layout = {
  variant: Variant;
  width: number;
  height: number;
  marginX: number;
  headline: { x: number; y: number; size: number; maxWidth: number };
  spec: { show: boolean; size: number; gap: number; maxWidth: number };
  checklist: { right: number; top: number; size: number; row: number };
  finishTag: { left: number; bottom: number; size: number };
  // Where the sheet and other "stage" objects are centred.
  stage: { cx: number; cy: number };
  sheetWidthPx: number;
  tabletopWidthPx: number; // tabletop size handed from scene 02 to 03
  section: {
    edgeX: number; // screen x of the tabletop edge in the close-up
    cy: number;
    k: number; // px per mm in the close-up
    endFaceWidthPx: number; // end view of the slab before the zoom
    labelsY: number;
    labelSize: number;
    labelRow: number;
  };
  panel: { cx: number; cy: number; heightPx: number };
  stacks: { cx: number; cy: number; mmToPx: number; labelSize: number };
  strip: { x: number; y: number; w: number; h: number };
  endCard: {
    bandHeight: number;
    logoY: number;
    logoWidth: number;
    ctaY: number;
    ctaSize: number;
    urlGap: number;
    urlSize: number;
    urlRow: number;
    supportSize: number;
  };
};

// Instagram Reels, 1080 x 1920. The platform UI covers roughly the top 220 px,
// the bottom 400 px and a column on the lower right, so key content stays
// between y = 250 and y = 1500.
export const REELS: Layout = {
  variant: "reels",
  width: 1080,
  height: 1920,
  marginX: 80,
  headline: { x: 80, y: 250, size: 92, maxWidth: 660 },
  spec: { show: false, size: 0, gap: 0, maxWidth: 0 },
  checklist: { right: 80, top: 262, size: 30, row: 44 },
  finishTag: { left: 80, bottom: 1500, size: 26 },
  stage: { cx: 540, cy: 960 },
  sheetWidthPx: 920,
  tabletopWidthPx: 760,
  section: {
    edgeX: 600,
    cy: 940,
    k: 17,
    endFaceWidthPx: 880,
    labelsY: 1160,
    labelSize: 44,
    labelRow: 58,
  },
  panel: { cx: 540, cy: 1000, heightPx: 820 },
  stacks: { cx: 540, cy: 770, mmToPx: 0.15, labelSize: 28 },
  strip: { x: 80, y: 1250, w: 920, h: 160 },
  endCard: {
    bandHeight: 640,
    logoY: 800,
    logoWidth: 320,
    ctaY: 1190,
    ctaSize: 92,
    urlGap: 34,
    urlSize: 40,
    urlRow: 52,
    supportSize: 30,
  },
};

// LinkedIn feed, 1080 x 1350. Little UI overlay, so tighter margins and room
// for the technical spec lines beneath each headline.
export const LINKEDIN: Layout = {
  variant: "linkedin",
  width: 1080,
  height: 1350,
  marginX: 72,
  headline: { x: 72, y: 76, size: 80, maxWidth: 640 },
  spec: { show: true, size: 28, gap: 22, maxWidth: 860 },
  checklist: { right: 72, top: 86, size: 28, row: 40 },
  finishTag: { left: 72, bottom: 1286, size: 24 },
  stage: { cx: 540, cy: 760 },
  sheetWidthPx: 900,
  tabletopWidthPx: 700,
  section: {
    edgeX: 600,
    cy: 720,
    k: 14,
    endFaceWidthPx: 860,
    labelsY: 920,
    labelSize: 40,
    labelRow: 52,
  },
  panel: { cx: 540, cy: 790, heightPx: 640 },
  stacks: { cx: 540, cy: 610, mmToPx: 0.14, labelSize: 26 },
  strip: { x: 72, y: 1010, w: 936, h: 140 },
  endCard: {
    bandHeight: 450,
    logoY: 560,
    logoWidth: 270,
    ctaY: 900,
    ctaSize: 80,
    urlGap: 28,
    urlSize: 34,
    urlRow: 46,
    supportSize: 26,
  },
};

export const LAYOUTS: Record<Variant, Layout> = {
  reels: REELS,
  linkedin: LINKEDIN,
};
