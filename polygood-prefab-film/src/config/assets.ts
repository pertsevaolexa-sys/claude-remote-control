// Every file the film uses, in one place. Swap paths here; no scene needs to
// change. Paths are relative to public/.

export const ASSETS = {
  fonts: {
    book: "fonts/PPNeueMontreal-Book.otf", // supplied
    bold: "fonts/PPNeueMontreal-Bold.otf", // supplied
  },
  logo: {
    // Supplied Polygood_vertical_Black.svg with only its viewBox tightened to
    // the artwork (paths unchanged). Original kept as polygood-vertical-black.svg.
    src: "images/polygood-vertical-black-cropped.svg",
    aspectRatio: 327.981 / 210.113,
  },
  material: {
    // PLACEHOLDER: procedural texture from scripts/generate_placeholder_material.py.
    // Replace with a real scan of the finish named in FINISH below. The sheet
    // image should show a full 2800 x 1400 mm sheet (2:1).
    sheet: "images/placeholder-material-sheet.jpg",
    isPlaceholder: true,
  },
  // Not supplied; the film draws these procedurally instead:
  // reference video, tabletop-and-bench line drawing, component renders,
  // curved-partition render, CNC toolpath artwork.
} as const;

// Higher-resolution crops of the same sheet for the opening pull-back from an
// extreme macro (about 30x). Each is drawn over its region (mm) of the sheet
// with feathered edges. With a real scan, export matching crops at these
// regions, or delete the levels (the macro will then be softer).
// Keep in sync with scripts/generate_placeholder_material.py.
export const MATERIAL_LEVELS = [
  {
    src: "images/placeholder-material-mid.jpg",
    region: { x: 1280, y: 4, w: 400, h: 711 },
    feather: 40,
    pxPerMm: 6,
  },
  {
    src: "images/placeholder-material-macro.jpg",
    region: { x: 1410, y: 46, w: 140, h: 249 },
    feather: 12,
    pxPerMm: 12,
  },
] as const;

// The opening frame looks at the centre of the macro crop.
export const MACRO_CENTER = { x: 1480, y: 170.5 };

// Finish identifier shown bottom-left until 12.5 s and in the end-card band.
// PLACEHOLDER: no finish was specified. Set the real PS code and pattern name
// to match the material image above.
export const FINISH = {
  code: "PS 000",
  pattern: "Placeholder finish",
  isPlaceholder: true,
};

// Claims that must be confirmed before they appear on screen.
export const CLAIMS = {
  // End-card supporting line. Shown only when confirmed for the finish shown.
  material: { text: "100% recycled polystyrene", confirmed: false },
  // Thickness callout in scene 03. The actual tabletop thickness is unknown,
  // so the label states both available thicknesses. Set to "19 mm" or "12 mm"
  // once the real component is known.
  thicknessLabel: "12 or 19 mm",
} as const;
