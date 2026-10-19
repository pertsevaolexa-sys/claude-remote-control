// All timing lives here. Scene-local beats are frames from the start of that
// scene; the absolute frames used by persistent overlays and audio are derived
// from them, so moving a beat keeps sound and checklist in sync.
//
// 30 s cut: each scene holds long enough for its headline and labels to be
// read, and the film ends on the supplied logo animation, played as is.

export const FPS = 30;
export const DURATION_IN_FRAMES = 900; // 30 s

export const SCENES = {
  drawing: { from: 0, durationInFrames: 120 }, // 00:00–00:04
  cutting: { from: 120, durationInFrames: 150 }, // 00:04–00:09
  edges: { from: 270, durationInFrames: 150 }, // 00:09–00:14
  cnc: { from: 420, durationInFrames: 165 }, // 00:14–00:19.5
  benefits: { from: 585, durationInFrames: 165 }, // 00:19.5–00:25
  endCard: { from: 750, durationInFrames: 150 }, // 00:25–00:30, logo clip
} as const;

// Scene 01: material macro → sheet → plotted drawing
export const S1 = {
  sweep: [4, 50], // light sweep across the macro
  pushInEnd: 34, // slow push-in, then the pull-back starts (~1.1 s)
  pullBackEnd: 84, // pull back to the full sheet
  outline: [66, 88], // sheet outline + registration marks
  headlineIn: 12, // on light labels over the macro
  headlineOut: 104, // exit completes by the last frame of the scene
  plot: [44, 96], // drawing plotted stroke by stroke
  dims: [80, 104], // dimension lines and ticks
} as const;

// Scene 02: drawing → nested parts → toolpaths → lifted parts
export const S2 = {
  headlineIn: 4,
  drawingFade: [0, 20], // non-part drawing lines fade
  separate: [6, 56], // parts slide from drawing to nested layout
  separateEach: 30, // frames each part takes to slide into place
  separateStagger: 5, // frames between parts starting to move
  toolpath: [58, 102],
  toolpathFade: [100, 110],
  cutDone: 104, // "Cut" checks here
  lift: [104, 120],
  isolate: [118, 148], // tabletop moves to centre
  othersOut: [118, 136], // other parts leave
  sheetOut: [118, 140], // the skeleton leaves
  headlineOut: 133,
} as const;

// Scene 03: tabletop rotates to its end view, then three edge profiles.
// It ends on the bevelled close-up; scene 04 opens by wiping it away.
export const S3 = {
  headlineIn: 4,
  rotate: [0, 34],
  handover: [32, 40], // 3D slab → 2D section
  zoom: [36, 64],
  morphs: [
    [54, 68], // square → bullnose
    [82, 96], // bullnose → chamfer
    [110, 124], // chamfer → bevelled
  ],
  thickness: [58, 74],
  edgedCheck: 128,
  headlineOut: 133,
} as const;

// Scene 04: CNC toolpath → cut-outs → bend
export const S4 = {
  sweep: [0, 30], // a toolpath crosses the frame, wiping the edge close-up away
  headlineIn: 10,
  toolpath: [28, 76],
  machinedCheck: 74,
  removal: [76, 98], // cut-out plugs drop away
  plugDrop: 14, // frames for each plug to fall
  bend: [100, 136],
  curvedCheck: 134,
  headlineOut: 148,
  exit: [150, 165], // curved panel moves out
} as const;

// Scene 05: delivery stacks, offcuts recycled
export const S5 = {
  enter: [0, 26], // stacks slide in from the right
  headlineIn: 4,
  sheets: [0, 30], // full sheets stack up
  sheetStagger: 5,
  sheetDrop: 14,
  parts: [8, 52], // parts drop onto the delivery stack
  partDrop: 16,
  settle: 52, // dry tap
  offcutsIn: [56, 70],
  offcutsAway: [74, 94],
  granules: [92, 128], // offcuts break into chips that fly to the strip
  newPanel: [110, 130],
  labelsOut: [146, 162],
  stripOut: [148, 164], // the new material clears before the logo
  headlineOut: 147,
} as const;

// Scene 06: the supplied logo animation (public/video), played as is. It
// settles by its frame 120 (after that only a sub-pixel easing tail in the
// source), so the final second reads as static.
export const S6 = {
  staticFrom: 120,
} as const;

const abs = (scene: keyof typeof SCENES, local: number) =>
  SCENES[scene].from + local;

// Persistent overlays
export const FINISH_TAG = {
  from: 0,
  fadeOutFrames: 12,
  // Gone before the logo animation, which plays untouched.
  until: SCENES.endCard.from - 12,
};

export const CHECKLIST = {
  appear: SCENES.cutting.from, // with scene 02, as in the brief's storyboard
  checks: {
    cut: abs("cutting", S2.cutDone),
    edged: abs("edges", S3.edgedCheck),
    machined: abs("cnc", S4.machinedCheck),
    curved: abs("cnc", S4.curvedCheck),
  },
  disappear: abs("benefits", 8), // end of the manufacturing sequence
} as const;

export const SILENT_FROM = DURATION_IN_FRAMES - FPS / 2; // last 0.5 s silent

export const absFrame = abs;
