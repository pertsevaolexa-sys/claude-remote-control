// Minimal system: black type on off-white, colour reserved for the material
// and for process graphics. Orange marks anything the machine is doing.

export const COLORS = {
  paper: "#F5F4F0", // page background
  label: "#FBFAF7", // labels over material
  ink: "#0E0E0E", // typography and technical linework on paper
  inkSoft: "rgba(14, 14, 14, 0.55)", // secondary linework
  hairline: "rgba(14, 14, 14, 0.16)",
  pending: "#B4B2AC", // checklist items not done yet, inactive labels
  accent: "#FF5A1F", // toolpaths, active states, checkmarks
  drawingOnMaterial: "#FFFFFF", // plotted drawing over the material
  kerf: "#0A1433", // cut line left in the material
  engraved: "#0B1638", // milled groove on the material
  shadow: "rgba(10, 20, 51, 0.32)",
} as const;

// Stroke widths in screen pixels at 1080 px frame width.
export const STROKES = {
  drawing: 2.2,
  dimension: 1.4,
  centerline: 1.2,
  toolpath: 3.2,
  rapid: 1.6,
  kerf: 2.2,
  sheetOutline: 1.5,
  sectionOutline: 2,
  profileHighlight: 5,
} as const;

// Shared eases. Kept gentle: low peak speed so moves read as calm and
// deliberate rather than snappy.
export const EASE = {
  out: [0.33, 1, 0.68, 1] as const, // arrivals (ease-out cubic)
  inOut: [0.45, 0, 0.55, 1] as const, // camera-like moves
  in: [0.32, 0, 0.67, 0] as const, // exits (ease-in cubic)
  standard: [0.4, 0, 0.2, 1] as const,
};

// Durations shared by reusable animations (frames).
export const DURATIONS = {
  lineIn: 22, // headline line rising into its mask
  lineOut: 13, // and leaving
  lineStaggerIn: 3,
  lineStaggerOut: 2,
};
