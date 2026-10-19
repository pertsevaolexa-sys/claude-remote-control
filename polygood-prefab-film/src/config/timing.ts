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
  pushInEnd: 20, // slow push-in, then the pull-back starts (~0.7 s)
  pullBackEnd: 54, // pull back to the full sheet
  outline: [42, 58], // sheet outline + registration marks
  headlineIn: 8, // on light labels over the macro
  headlineOut: 44, // exit completes by the last frame of the scene
  plot: [28, 57], // drawing plotted stroke by stroke
  dims: [46, 59], // dimension lines and ticks
} as const;

// Scene 02: drawing → nested parts → toolpaths → lifted parts
export const S2 = {
  headlineIn: 3,
  drawingFade: [0, 14], // non-part drawing lines fade
  separate: [2, 34], // parts slide from drawing to nested layout
  separateEach: 20, // frames each part takes to slide into place
  toolpath: [32, 56],
  toolpathFade: [55, 61],
  cutDone: 57, // "Cut" checks here
  lift: [56, 66],
  isolate: [58, 74], // other parts leave, tabletop moves to centre
  headlineOut: 59,
} as const;

// Scene 03: tabletop rotates to its end view, then three edge profiles.
// It ends on the bevelled close-up; scene 04 opens by wiping it away.
export const S3 = {
  headlineIn: 3,
  rotate: [0, 22],
  handover: [20, 25], // 3D slab → 2D section
  zoom: [22, 42],
  morphs: [
    [34, 44], // square → bullnose
    [47, 56], // bullnose → chamfer
    [59, 68], // chamfer → bevelled
  ],
  thickness: [36, 48],
  edgedCheck: 70,
  headlineOut: 59,
} as const;

// Scene 04: CNC toolpath → cut-outs → bend
export const S4 = {
  sweep: [0, 22], // a toolpath crosses the frame, wiping the edge close-up away
  headlineIn: 8,
  toolpath: [18, 42],
  machinedCheck: 41,
  removal: [40, 54], // cut-out plugs drop away
  bend: [55, 82],
  curvedCheck: 80,
  headlineOut: 74,
  exit: [78, 90], // curved panel moves out
} as const;

// Scene 05: delivery stacks, offcuts recycled
export const S5 = {
  enter: [0, 18], // stacks slide in from the right
  headlineIn: 3,
  sheets: [0, 18], // full sheets stack up
  parts: [5, 28], // parts drop onto the delivery stack
  settle: 28, // dry tap
  offcutsIn: [28, 36],
  offcutsAway: [36, 48],
  granules: [46, 66],
  newPanel: [56, 68],
  labelsOut: [64, 74],
  headlineOut: 59,
} as const;

// Scene 06: end card, static from frame 420 (final second)
export const S6 = {
  band: [0, 24],
  finishTag: [16, 26],
  logo: [16, 32],
  cta: [22, 44],
  url: [28, 42],
  support: [32, 45],
  staticFrom: 45,
} as const;

const abs = (scene: keyof typeof SCENES, local: number) =>
  SCENES[scene].from + local;

// Persistent overlays
export const FINISH_TAG = {
  from: 0,
  until: SCENES.endCard.from,
  fadeOutFrames: 12,
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
