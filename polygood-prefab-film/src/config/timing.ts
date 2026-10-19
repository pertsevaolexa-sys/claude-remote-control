// All timing lives here. Scene-local beats are frames from the start of that
// scene; the absolute frames used by persistent overlays and audio are derived
// from them, so moving a beat keeps sound and checklist in sync.

export const FPS = 30;
export const DURATION_IN_FRAMES = 450; // exactly 15 s

export const SCENES = {
  drawing: { from: 0, durationInFrames: 60 }, // 00:00–00:02
  cutting: { from: 60, durationInFrames: 75 }, // 00:02–00:04.5
  edges: { from: 135, durationInFrames: 75 }, // 00:04.5–00:07
  cnc: { from: 210, durationInFrames: 90 }, // 00:07–00:10
  benefits: { from: 300, durationInFrames: 75 }, // 00:10–00:12.5
  endCard: { from: 375, durationInFrames: 75 }, // 00:12.5–00:15
} as const;

// Scene 01: material macro → sheet → plotted drawing
export const S1 = {
  sweep: [2, 30], // light sweep across the macro
  pushInEnd: 24, // slow push-in until 0.8 s
  pullBackEnd: 48, // pull back to the full sheet
  outline: [36, 50], // sheet outline + registration marks
  headlineIn: 8, // on light labels over the macro
  headlineOut: 48, // exit completes by the last frame of the scene
  plot: [29, 56], // drawing plotted stroke by stroke
  dims: [44, 58], // dimension lines and ticks
} as const;

// Scene 02: drawing → nested parts → toolpaths → lifted parts
export const S2 = {
  headlineIn: 3,
  drawingFade: [0, 10], // non-part drawing lines fade
  separate: [2, 28], // parts slide from drawing to nested layout
  toolpath: [26, 53],
  toolpathFade: [52, 58],
  cutDone: 55, // "Cut" checks here
  lift: [54, 64],
  isolate: [60, 74], // other parts leave, tabletop moves to centre
  headlineOut: 64,
} as const;

// Scene 03: tabletop rotates to its end view, then three edge profiles
export const S3 = {
  headlineIn: 3,
  rotate: [0, 16],
  handover: [15, 18], // 3D slab → 2D section
  zoom: [17, 32],
  morphs: [
    [26, 34], // square → bullnose
    [40, 48], // bullnose → chamfer
    [54, 62], // chamfer → bevelled
  ],
  thickness: [30, 40],
  edgedCheck: 64,
  headlineOut: 62,
  sweep: [63, 75], // toolpath travels across the frame
} as const;

// Scene 04: CNC toolpath → cut-outs → bend
export const S4 = {
  gantry: [0, 14], // gantry returns, revealing the panel
  headlineIn: 4,
  toolpath: [14, 42],
  machinedCheck: 40,
  removal: [40, 54], // cut-out plugs drop away
  bend: [52, 80],
  curvedCheck: 78,
  headlineOut: 78,
  exit: [80, 90], // curved panel moves out
} as const;

// Scene 05: delivery stacks, offcuts recycled
export const S5 = {
  enter: [0, 14], // stacks slide in from the right
  headlineIn: 3,
  sheets: [0, 18], // full sheets stack up
  parts: [5, 26], // parts drop onto the delivery stack
  settle: 26, // dry tap
  offcutsIn: [26, 34],
  offcutsAway: [34, 44],
  granules: [42, 64],
  newPanel: [54, 66],
  labelsOut: [64, 72],
  headlineOut: 64,
} as const;

// Scene 06: end card, static from frame 420 (final second)
export const S6 = {
  band: [0, 18],
  finishTag: [12, 20],
  logo: [12, 26],
  cta: [18, 32],
  url: [24, 38],
  support: [28, 42],
  staticFrom: 45,
} as const;

const abs = (scene: keyof typeof SCENES, local: number) =>
  SCENES[scene].from + local;

// Persistent overlays
export const FINISH_TAG = {
  from: 0,
  until: SCENES.endCard.from,
  fadeOutFrames: 8,
};

export const CHECKLIST = {
  appear: 60, // exactly 2.0 s
  checks: {
    cut: abs("cutting", S2.cutDone),
    edged: abs("edges", S3.edgedCheck),
    machined: abs("cnc", S4.machinedCheck),
    curved: abs("cnc", S4.curvedCheck),
  },
  disappear: abs("benefits", 4), // end of the manufacturing sequence
} as const;

export const SILENT_FROM = DURATION_IN_FRAMES - FPS / 2; // last 0.5 s silent

export const absFrame = abs;
