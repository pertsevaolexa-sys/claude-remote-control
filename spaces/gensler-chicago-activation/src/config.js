// ---------------------------------------------------------------------------
// Central configuration - Polygood "LOOK CLOSER" / Gensler Chicago activation
// ---------------------------------------------------------------------------
// ALL source dimensions below are in MILLIMETRES. src/units.js converts once.
//
// Every numeric leaf in CONFIG has an entry in PROVENANCE keyed by its dotted
// path. `npm run check` fails if a leaf is missing provenance, so the model can
// never quietly acquire an unattributed dimension.
//
// status values:
//   'specified'   - stated in the brief or the dimensioned holder PDF
//   'provisional' - estimate, placeholder or modelling assumption; adjustable
//   'conflict'    - sources disagree; a decision is recorded but NOT approved
//
// This is a SPATIAL PROTOTYPE. Nothing here is approved for fabrication.
// ---------------------------------------------------------------------------

export const STATUS = {
  SPECIFIED: 'specified',
  PROVISIONAL: 'provisional',
  CONFLICT: 'conflict',
};

export const CONFIG = {
  // -------------------------------------------------------------------------
  // A. Room shell (all provisional - read off IMG_3511(1).jpeg, not surveyed)
  // -------------------------------------------------------------------------
  room: {
    widthMm: 6800,
    depthMm: 6400,
    ceilingHeightMm: 3650,
    skirtingHeightMm: 120,
    wainscotHeightMm: 900,
    mosaicBandDepthMm: 1500,   // patterned floor band in front of the bay
  },

  bay: {
    wallOffsetBehindCounterMm: 150, // inner wall face behind counter back edge
    halfAngleDeg: 24,               // bay wall sweeps wider than the counter
    windowCount: 4,
    windowSillHeightMm: 900,
    windowHeadHeightMm: 3000,
    mullionWidthMm: 70,
    pierWidthMm: 380,               // cream pier between window openings
    transomHeightMm: 1450,          // horizontal bar: upper/lower sash split
    glassThicknessMm: 8,
    columnDiameterMm: 340,          // decorative column, left of the bay
    columnFluteCount: 18,
    capitalHeightMm: 420,
  },

  // -------------------------------------------------------------------------
  // B. The existing curved counter (provisional - photo + legacy estimates)
  // -------------------------------------------------------------------------
  counter: {
    topLengthMm: 3300,       // arc length measured along the FRONT edge
    depthMm: 450,            // usable top depth (legacy estimate)
    heightMm: 1000,          // top surface above floor (legacy estimate)
    topThicknessMm: 20,      // photo reads as a thin top; see CONFLICTS
    curveRadiusMm: 6000,     // radius of the front edge, centre in the room
    middleFrontZMm: -1000,   // world z of the front edge at mid-length
    rightEndRadiusMm: 225,   // rounded right end = depth / 2
    legSectionMm: 25,
    legInsetFrontMm: 60,     // leg centre, measured back from the front edge
    legInsetBackMm: 60,      // leg centre, measured forward from the back edge
    legPositionsSMm: [180, 900, 1620, 2340],
  },

  bookcase: {
    startSMm: 2400,
    endSMm: 3300,
    depthMm: 400,
    heightMm: 880,
    frontInsetMm: 50,        // set back from the counter front edge
    slatWidthMm: 18,
    slatGapMm: 14,
    shelfCount: 2,
    bookHeightMm: 230,
    openFraction: 0.55,     // left part open with books, right part slatted
  },

  // Existing surrounding furniture at the far left of the photograph.
  surroundings: {
    tableDiameterMm: 900,
    tableHeightMm: 740,
    tableXMm: -2500,
    tableZMm: 2100,
    chairCount: 2,
    chairSeatHeightMm: 430,
    chairWidthMm: 620,
    chairDepthMm: 600,
    chairBackHeightMm: 330,
  },

  // -------------------------------------------------------------------------
  // C. Representatives' stools (provisional - matched to the photo)
  // -------------------------------------------------------------------------
  stools: {
    count: 3,
    seatHeightMm: 650,
    seatWidthMm: 400,
    seatDepthMm: 380,
    seatThicknessMm: 26,
    backHeightMm: 190,
    footRingHeightMm: 230,
    footRingRadiusMm: 185,
    legSplayMm: 230,
    tubeDiameterMm: 22,
    standoffFromCounterMm: 480, // seat centre, forward of the counter front edge
    positionsSMm: [2250, 2750, 3250],
  },

  // -------------------------------------------------------------------------
  // D. Roll-up banner - size SPECIFIED by the brief (18 x 44.2 in)
  // -------------------------------------------------------------------------
  banner: {
    artworkWidthMm: 457.2,
    artworkHeightMm: 1122.68,
    baseWidthMm: 480,
    baseDepthMm: 240,
    baseHeightMm: 55,
    poleDiameterMm: 16,
    clearanceFromCounterEndMm: 300, // arc gap beyond the counter's left end
    radialOffsetMm: 0,              // 0 = in line with the counter front edge
  },

  // -------------------------------------------------------------------------
  // E. A4 holder (SPECIFIED - gExpo_holders_spec)
  // -------------------------------------------------------------------------
  a4Holder: {
    artworkWidthMm: 297,
    artworkHeightMm: 210,
    plateWidthMm: 337,
    plateHeightMm: 250,
    plateThicknessMm: 19,
    borderMm: 20,
    leanDeg: 15,
    // One centred triangular gusset, 90 x 70 x 19 mm. Read as: the 90 mm leg
    // lies against the leaning plate's back face, the 70 mm leg on the counter.
    gussetLegPlateMm: 90,
    gussetLegBaseMm: 70,
    gussetThicknessMm: 19,
  },

  // -------------------------------------------------------------------------
  // F. LOOK CLOSER installation (SPECIFIED, with two recorded conflicts)
  // -------------------------------------------------------------------------
  installation: {
    baseWidthMm: 450,
    baseDepthMm: 420,
    baseThicknessMm: 19,

    panelWidthMm: 450,
    panelHeightMm: 450,
    panelThicknessMm: 12,          // CONFLICT: cut list says 19 mm stock
    panelThicknessCutListMm: 19,   // recorded, not used for the assembly

    slotLengthMm: 450,
    slotWidthMm: 12.1,
    slotDepthMm: 5,
    slotFromFrontMm: 274.9,

    frontBraceMm: 90,
    rearBraceMm: 120,
    braceThicknessMm: 19,

    gridDivisions: 4,              // 4 x 4 pads = 3 internal grooves each way
    grooveWidthMm: 4,
    grooveDepthMm: 3,

    miniWidthMm: 120,              // portrait - latest brief overrides the PDF
    miniHeightMm: 180,
    miniThicknessMm: 12,
    miniLeanDeg: 15,

    miniSlotLengthMm: 190,         // drawing value, kept for fabrication review
    miniSlotWidthMm: 15.64,
    miniSlotDepthMm: 12,
    miniSlotFromFrontMm: 60,
    miniSlotOffsetRightMm: 90,

    signWidthMm: 210,              // provisional - sign size unconfirmed
    signHeightMm: 148,
    signThicknessMm: 12,
    signLeanDeg: 15,
    signFromFrontMm: 60,
    signOffsetLeftMm: 105,
    signGussetWidthMm: 40,
    signGussetHeightMm: 30,

    liftHeightMm: 150,             // mini-sample "lift" interaction travel
  },

  // -------------------------------------------------------------------------
  // G. Six loose engraved tile samples
  // -------------------------------------------------------------------------
  tiles: {
    count: 6,
    faceAcrossMm: 180,   // landscape on the counter: 180 across the counter
    faceDepthMm: 120,    // 120 front-to-back
    thicknessMm: 12,     // provisional
    gapMm: 20,
    columns: 3,
    rows: 2,
    engravingDepthMm: 3,
    engravingWidthMm: 4,
    // Provisional assortment - the real six finishes were not identified.
    patterns: ['stripes-x', 'grid', 'concentric', 'stripes-z', 'chevron', 'dots'],
    palettes: ['Oyster', 'Sage', 'Clay', 'Slate', 'Ink', 'Coral'],
  },

  // -------------------------------------------------------------------------
  // H. Growth Collection sample box (external size = explicit ASSUMPTION)
  // -------------------------------------------------------------------------
  growthBox: {
    // Presented as an OPEN TRAY: printed header panel across the back, eight
    // samples in front, sitting on its own lid. This follows the reference
    // photograph supplied for it, and supersedes the earlier propped-cover
    // presentation, which no reference supported and which did not fit.
    widthMm: 320,
    depthMm: 240,
    heightMm: 26,
    wallThicknessMm: 7,
    headerDepthMm: 78,      // printed panel across the back of the tray
    lidThicknessMm: 22,     // the tray stands on its own lid
    lidMarginMm: 5,         // lid is slightly larger, showing a thin border
    sampleCount: 8,
    sampleColumns: 4,
    sampleRows: 2,
    sampleWidthMm: 66,
    sampleDepthMm: 62,
    sampleThicknessMm: 6,
    sampleGapMm: 8,
  },

  // -------------------------------------------------------------------------
  // I. Two general sample boxes (placeholder geometry - sizes unconfirmed)
  // -------------------------------------------------------------------------
  generalBoxes: {
    // Slim box holding a row of upright sample sticks, with its sleeve lid
    // standing at one end - the construction in the two supplied product
    // photographs. One black, one grey.
    count: 2,
    widthMm: 180,
    depthMm: 62,
    heightMm: 48,
    wallThicknessMm: 6,
    gapMm: 30,
    chipCount: 10,
    chipThicknessMm: 14,    // across the box: this is the face you see
    chipFaceMm: 48,         // front to back
    chipHeightMm: 100,
    chipPitchMm: 16,
    chipProtrusionMm: 55,   // stands proud of the box rim
    lidThicknessMm: 8,
    lidHeightMm: 150,
    lidGapMm: 6,
    finishes: ['black', 'grey'],
    chipPalettes: ['Lapis', 'Ink', 'Chalk', 'Slate', 'Ink', 'Oyster', 'Chalk', 'Emerald', 'Ink', 'Clay'],
  },

  // -------------------------------------------------------------------------
  // J. Translucent collection (SPECIFIED, one recorded reading of the drawing)
  // -------------------------------------------------------------------------
  translucent: {
    blockWidthMm: 300,
    blockDepthMm: 80,
    blockHeightMm: 80,
    slotCount: 10,
    slotWidthMm: 15,
    slotLengthMm: 65,
    slotDepthMm: 30,
    slotPitchMm: 25,
    slotPlanAngleDeg: -20,   // negative = clockwise in plan (see ASSUMPTIONS)
    sampleWidthMm: 60,
    sampleHeightMm: 120,
    sampleThicknessMm: 12,
    visibleHeightMm: 90,
    // Provisional assortment, read off the venue photograph.
    colours: ['#1f3f8a', '#3f7fd0', '#39a7c4', '#1f9e86', '#4aa84a',
              '#c8352c', '#e2691f', '#efa219', '#f3cf1e', '#8e4fa8'],
  },

  // -------------------------------------------------------------------------
  // K. Brochures
  // -------------------------------------------------------------------------
  brochures: {
    count: 3,
    widthMm: 200,
    depthMm: 200,
    thicknessMm: 6,
    fanOffsetXMm: 18,
    fanOffsetZMm: 14,
    fanRotationDeg: 3,
  },

  // -------------------------------------------------------------------------
  // L. Placement along the counter.
  //     sMm = distance along the FRONT-edge arc, measured from the left end.
  //     vMm = distance BEHIND the front edge (0 = front edge, 450 = back edge).
  // -------------------------------------------------------------------------
  layout: {
    brochuresSMm: 265,
    brochuresVMm: 250,

    // The Growth A4 and its open box share a position: card at the back, box
    // directly in FRONT of it, as in the supplied reference.
    growthSMm: 780,
    growthCardBackMarginMm: 20,
    growthBoxGapBehindMm: 25,

    installationSMm: 1400,
    installationFrontMarginMm: 13,  // see FIT REPORT - 20 mm is not achievable

    tilesSMm: 2160,
    tilesFrontMarginMm: 20,

    generalBoxesSMm: 2160,
    generalBoxesVFrontMm: 340,

    translucentCardSMm: 2870,
    translucentCardBackMarginMm: 20,

    translucentBlockSMm: 2870,
    translucentBlockVFrontMm: 200,
  },
};

// ---------------------------------------------------------------------------
// Provenance: one entry per numeric leaf in CONFIG.
// ---------------------------------------------------------------------------
const S = STATUS.SPECIFIED;
const P = STATUS.PROVISIONAL;
const C = STATUS.CONFLICT;

const PHOTO = 'IMG_3511(1).jpeg (venue photograph, not a measured survey)';
const BRIEF = 'Project brief, section 3-5';
const PDF = 'gExpo_holders_spec (1).pdf (as quoted in the brief; PDF not supplied to this session)';
const LEGACY = 'Legacy concept model estimate quoted in the brief (source site unreachable)';
const REFPHOTOS = 'Supplied Polygood product photographs (Growth box open on the counter; black and grey sample boxes)';

function fill(prefix, keys, status, source, note) {
  const out = {};
  for (const k of keys) out[`${prefix}.${k}`] = { status, source, note };
  return out;
}

export const PROVENANCE = {
  ...fill('room',
    ['widthMm', 'depthMm', 'ceilingHeightMm', 'skirtingHeightMm', 'wainscotHeightMm', 'mosaicBandDepthMm'],
    P, PHOTO, 'Room shell estimated from the photograph; no survey available.'),

  ...fill('bay',
    ['wallOffsetBehindCounterMm', 'halfAngleDeg', 'windowCount', 'windowSillHeightMm', 'windowHeadHeightMm',
     'mullionWidthMm', 'pierWidthMm', 'transomHeightMm', 'glassThicknessMm', 'columnDiameterMm',
     'columnFluteCount', 'capitalHeightMm'],
    P, PHOTO, 'Bay window proportions read off the photograph.'),

  ...fill('counter',
    ['depthMm', 'curveRadiusMm', 'middleFrontZMm', 'rightEndRadiusMm', 'legSectionMm',
     'legInsetFrontMm', 'legInsetBackMm', 'legPositionsSMm'],
    P, PHOTO, 'Counter plan geometry is NOT confirmed; exposed for adjustment.'),
  'counter.topLengthMm': { status: P, source: PHOTO, note: 'Derived by scaling known object sizes in the venue photograph against the counter: the 337 mm A4 plate and the 450 mm Oyster panel both put it near 3.0-3.3 m. 3300 mm used. This replaces an earlier 4600 mm guess, which made every display look too small for the counter. Still an estimate from a photograph, not a measurement.' },
  'counter.heightMm': { status: P, source: LEGACY, note: '1000 mm is a starting estimate, not a measurement.' },
  'counter.topThicknessMm': { status: C, source: `${PHOTO} vs ${LEGACY}`, note: 'Legacy model says 45 mm; the photograph reads as a visibly thin top. 20 mm used to preserve the real appearance. Needs measuring.' },

  ...fill('bookcase',
    ['startSMm', 'endSMm', 'depthMm', 'heightMm', 'frontInsetMm', 'slatWidthMm', 'slatGapMm', 'shelfCount', 'bookHeightMm', 'openFraction'],
    P, PHOTO, 'Existing slatted bookcase, proportions from the photograph.'),

  ...fill('surroundings',
    ['tableDiameterMm', 'tableHeightMm', 'tableXMm', 'tableZMm', 'chairCount', 'chairSeatHeightMm',
     'chairWidthMm', 'chairDepthMm', 'chairBackHeightMm'],
    P, PHOTO, 'Existing round table and burgundy chairs at the far left of the photograph, kept so the room reads as the real office.'),

  ...fill('stools',
    ['count', 'seatHeightMm', 'seatWidthMm', 'seatDepthMm', 'seatThicknessMm', 'backHeightMm',
     'footRingHeightMm', 'footRingRadiusMm', 'legSplayMm', 'tubeDiameterMm',
     'standoffFromCounterMm', 'positionsSMm'],
    P, PHOTO, 'Existing furniture; count of 3 is specified, geometry and spacing are layout assumptions - not statutory clearances.'),

  'banner.artworkWidthMm': { status: S, source: BRIEF, note: '18 in = 457.2 mm. Supersedes the "33x81" in the artwork filename.' },
  'banner.artworkHeightMm': { status: S, source: BRIEF, note: '44.2 in = 1122.68 mm.' },
  ...fill('banner', ['baseWidthMm', 'baseDepthMm', 'baseHeightMm', 'poleDiameterMm'],
    P, 'Plausible roll-up hardware', 'Cassette/pole are unconfirmed hardware; production hardware may add height.'),
  ...fill('banner', ['clearanceFromCounterEndMm', 'radialOffsetMm'],
    P, BRIEF, 'Brief requires "immediately to the LEFT of the counter, outside its footprint"; exact gap is a layout choice.'),

  ...fill('a4Holder',
    ['artworkWidthMm', 'artworkHeightMm', 'plateWidthMm', 'plateHeightMm', 'plateThicknessMm',
     'borderMm', 'leanDeg', 'gussetThicknessMm'],
    S, PDF, 'Holder construction as tabulated in the brief.'),
  ...fill('a4Holder', ['gussetLegPlateMm', 'gussetLegBaseMm'],
    S, PDF, 'Gusset is specified as 90 x 70 mm; which leg is which is an interpretation - 90 against the plate, 70 on the counter.'),

  ...fill('installation',
    ['baseWidthMm', 'baseDepthMm', 'baseThicknessMm', 'panelWidthMm', 'panelHeightMm',
     'slotLengthMm', 'slotWidthMm', 'slotDepthMm', 'slotFromFrontMm',
     'frontBraceMm', 'rearBraceMm', 'braceThicknessMm',
     'gridDivisions', 'grooveWidthMm', 'grooveDepthMm',
     'miniWidthMm', 'miniHeightMm', 'miniThicknessMm', 'miniLeanDeg'],
    S, BRIEF, 'Specified in the brief.'),
  'installation.panelThicknessMm': { status: C, source: PDF, note: 'Assembly drawing + 12.1 mm slot imply 12 mm; the cut list labels the same panel 19 mm. 12 mm used for the visual assembly. A 19 mm panel cannot enter a 12.1 mm slot. Manufacturing files unchanged.' },
  'installation.panelThicknessCutListMm': { status: C, source: PDF, note: 'The conflicting cut-list value, recorded only.' },
  ...fill('installation',
    ['miniSlotLengthMm', 'miniSlotWidthMm', 'miniSlotDepthMm', 'miniSlotFromFrontMm', 'miniSlotOffsetRightMm'],
    C, PDF, 'Slot drawn for a LANDSCAPE 180x120 coupon. The brief now requires a PORTRAIT 120x180 coupon, centred in the existing 190 mm slot. Slot redesign is NOT approved.'),
  ...fill('installation', ['signWidthMm', 'signHeightMm', 'signThicknessMm', 'signLeanDeg', 'signFromFrontMm', 'signOffsetLeftMm', 'signGussetWidthMm', 'signGussetHeightMm'],
    P, BRIEF, 'Brief: "size unconfirmed, use 210 x 148 mm landscape provisionally". Position on the base front-left is a layout choice.'),
  'installation.liftHeightMm': { status: P, source: 'Interaction design', note: 'Review interaction only; not a physical dimension.' },

  ...fill('tiles', ['count', 'faceAcrossMm', 'faceDepthMm', 'gapMm', 'columns', 'rows'],
    S, BRIEF, 'Six samples, 120 x 180 mm face, three across and two rows deep with 20 mm gaps.'),
  ...fill('tiles', ['thicknessMm', 'engravingDepthMm', 'engravingWidthMm'],
    P, BRIEF, 'Thickness provisional at 12 mm; engraving section reused from the main panel groove.'),
  ...fill('tiles', ['patterns', 'palettes'],
    P, 'Provisional assortment', 'The six real finishes/patterns were not identified. The selection is exposed here so it can be swapped without touching geometry.'),

  ...fill('growthBox', ['widthMm', 'depthMm', 'heightMm'],
    P, REFPHOTOS, 'Still an ASSUMPTION - nobody has supplied a measurement - but now proportioned from the supplied photograph of the open box rather than from the unclear "33 x 31" / "3 x 3" notes, which are still not treated as sizes. The earlier 330 x 310 x 20 guess was deeper than the reference shows.'),
  ...fill('growthBox', ['wallThicknessMm', 'headerDepthMm', 'lidThicknessMm', 'lidMarginMm',
                        'sampleWidthMm', 'sampleDepthMm', 'sampleThicknessMm', 'sampleGapMm'],
    P, REFPHOTOS, 'Construction proportions read off the supplied photograph of the open box.'),
  ...fill('growthBox', ['sampleCount', 'sampleColumns', 'sampleRows'],
    S, BRIEF, 'Eight rectangular samples in two rows of four.'),

  'generalBoxes.count': { status: S, source: BRIEF, note: 'Exactly two: one black, one grey.' },
  ...fill('generalBoxes', ['finishes'], S, BRIEF, 'One black and one grey.'),
  ...fill('generalBoxes',
    ['widthMm', 'depthMm', 'heightMm', 'wallThicknessMm', 'gapMm', 'chipCount', 'chipThicknessMm',
     'chipFaceMm', 'chipHeightMm', 'chipPitchMm', 'chipProtrusionMm', 'lidThicknessMm',
     'lidHeightMm', 'lidGapMm'],
    P, REFPHOTOS, 'Rebuilt to the construction in the supplied product photographs - a slim box of upright sample sticks with a sleeve lid standing at one end. Sizes are still PLACEHOLDERS scaled from those photographs and the venue photograph; no production size has been invented.'),
  ...fill('generalBoxes', ['chipPalettes'], P, REFPHOTOS, 'Ten finishes matched by eye to the supplied photographs. Provisional assortment.'),

  ...fill('translucent',
    ['blockWidthMm', 'blockDepthMm', 'blockHeightMm', 'slotCount', 'slotWidthMm', 'slotLengthMm',
     'slotDepthMm', 'slotPitchMm', 'sampleWidthMm', 'sampleHeightMm', 'sampleThicknessMm', 'visibleHeightMm'],
    S, BRIEF, 'Specified in the brief.'),
  'translucent.colours': { status: P, source: PHOTO, note: 'Provisional colour assortment read off the venue photograph; not a Polygood colour specification.' },
  'translucent.slotPlanAngleDeg': { status: C, source: PDF, note: '20 deg clockwise is specified, but the datum is not. Measured from the block WIDTH axis the slots would overlap by 6.45 mm at 25 mm pitch and could not be cut. Measured from the block DEPTH axis they clear by 23.5 mm. The buildable reading is used; the PDF was not available to confirm it.' },

  'brochures.count': { status: S, source: BRIEF, note: 'Exactly three physical copies.' },
  ...fill('brochures', ['widthMm', 'depthMm'], S, BRIEF, '200 x 200 mm.'),
  ...fill('brochures', ['thicknessMm', 'fanOffsetXMm', 'fanOffsetZMm', 'fanRotationDeg'],
    P, 'Visual assumption', 'Paper thickness and fan offsets are visual assumptions.'),

  ...fill('layout',
    ['brochuresSMm', 'brochuresVMm', 'growthSMm', 'growthCardBackMarginMm',
     'growthBoxGapBehindMm', 'installationSMm', 'tilesSMm', 'tilesFrontMarginMm',
     'generalBoxesSMm', 'generalBoxesVFrontMm', 'translucentCardSMm', 'translucentCardBackMarginMm',
     'translucentBlockSMm', 'translucentBlockVFrontMm'],
    P, BRIEF, 'Left-to-right ORDER is specified; spacing along the counter is a layout choice, respaced so the displays read at the density the venue photograph shows.'),
  'layout.installationFrontMarginMm': { status: C, source: 'Fit check against the provisional counter', note: 'The brief asks for a modest edge margin (20 mm would need 490 x 460 mm of flat top). The provisional 450 mm deep curved top cannot provide it; 13 mm is the best balanced margin. See the fit report.' },
};

// ---------------------------------------------------------------------------
// Human-readable registers, surfaced in the UI and the README.
// ---------------------------------------------------------------------------

export const CONFLICTS = [
  {
    id: 'panel-thickness',
    title: 'Main Oyster panel thickness: 12 mm vs 19 mm',
    detail: 'The assembly drawing and the 12.1 mm base slot indicate a 12 mm panel. The cut list labels the same 450 x 450 panel as 19 mm material. A 19 mm panel cannot enter a 12.1 mm slot. The model uses 12 mm for the visual assembly. No manufacturing file has been changed.',
    decision: 'Modelled at 12 mm; referred for fabrication review.',
  },
  {
    id: 'mini-sample-orientation',
    title: 'Removable coupon: drawn landscape 180 x 120, required portrait 120 x 180',
    detail: 'The PDF slot is 190 x 15.64 x 12 mm, 60 mm from the front and offset 90 mm right, sized for a landscape coupon. The latest brief requires a portrait 120 x 180 coupon. The portrait coupon is centred in the existing 190 mm slot, leaving 35 mm of open slot at each end.',
    decision: 'Portrait coupon centred in the drawn slot; slot redesign referred for fabrication review, NOT approved here.',
  },
  {
    id: 'counter-fit',
    title: 'Installation footprint vs the provisional counter depth',
    detail: 'The installation base is 450 x 420 mm. A 20 mm margin all round needs 490 x 460 mm of flat top. The provisional counter is 450 mm deep and curved, which leaves about 26 mm of total front-to-back slack once the curve is accounted for. The object has NOT been scaled down and the counter has NOT been widened.',
    decision: 'Placed with about 13 mm margin front and back. Counter depth must be measured.',
  },
  {
    id: 'conversation-area-frontage',
    title: 'The counter is not long enough for both the full display run and a separate conversation area',
    detail: 'Five display groups need about 3.1 m of the counter once sensible gaps are allowed. Three stools at the right need roughly another 1.3 m of frontage. The counter measures about 3.3 m, so the two cannot both have their own stretch. In the venue photograph the stools in fact sit IN FRONT of the display zone rather than beyond it.',
    decision: 'Stools kept grouped at the right as the brief requires, which puts the outer one just past the rounded end and the inner one in front of the Translucent group. Either lengthen the counter, drop to two stools, or accept the photograph\'s arrangement - that is a decision for the team, not a modelling choice.',
  },
  {
    id: 'translucent-slot-datum',
    title: 'Translucent slot rotation datum is ambiguous',
    detail: 'The 20 deg clockwise plan rotation is specified without a datum. Measured from the block width axis, ten 15 mm slots at 25 mm pitch would overlap by 6.45 mm and merge into one channel. Measured from the block depth axis they clear by 23.5 mm.',
    decision: 'The buildable reading (angle from the depth axis) is modelled. Confirm against the drawing.',
  },
  {
    id: 'counter-top-thickness',
    title: 'Counter top thickness: 45 mm legacy value vs a visibly thin top',
    detail: 'The legacy model carries a 45 mm top. The venue photograph shows a markedly thinner top. 20 mm is used to preserve the real appearance.',
    decision: 'Modelled at 20 mm, provisional. Needs measuring.',
  },
  {
    id: 'translucent-block-fabrication',
    title: 'An 80 mm high block cannot be one part from 19 mm sheet',
    detail: 'The translucent block is specified as 300 x 80 x 80 mm with 30 mm deep slots. It is represented visually as specified, but a laminated or constructed body has to be resolved before it can be made.',
    decision: 'Modelled as a single visual volume. Fabrication method unresolved; it does not hold up the visual model.',
  },
];

export const ASSUMPTIONS = [
  'Sources not available to this session: the legacy concept model at polygood-1.vercel.app (blocked by this environment\'s egress policy), gExpo_holders_spec (1).pdf, the A5 exhibition cards PDF, and every supplied photograph except the venue room photograph. Dimensions quoted from those sources come from the brief text; their artwork is represented by clearly-labelled procedural placeholders. See assets/README.md.',
  'Room, counter, bookcase and stool dimensions are read off the venue photograph. A photograph is not a survey; every one of these is exposed in CONFIG for correction.',
  'Growth box external size (320 x 240 x 26 mm) is still an explicit modelling assumption proportioned from a photograph, not a measurement supplied by anyone.',
'The Growth box is presented as an open tray - printed header panel across the back, eight samples in front, standing on its own full-size lid - following the supplied reference photograph. This supersedes the earlier propped-cover model, which no reference supported. Its box sits directly IN FRONT of its A4, not offset sideways, because nothing now stands tall enough to hide the card.',
  'General sample box sizes remain placeholders, but their construction is no longer invented: they are slim boxes of upright sample sticks with a sleeve lid at one end, as in the supplied product photographs.',
  'Counter length is now 4200 mm rather than 4600 mm, re-estimated from the venue photograph so the displays sit at the density the real presentation shows. Still not a measurement.',
  'General sample box geometry is a placeholder scaled from the venue photograph, because the legacy project geometry the brief points to could not be reached.',
  'Artwork placeholders deliberately use grey text bars instead of invented body copy, and a labelled grey block instead of a QR code. No technical approval, performance, price or sustainability claim is stated anywhere in the model.',
  'Stool spacing is a layout assumption. It is not a claim about statutory clearances.',
  'The six engraving patterns on the loose samples are a provisional assortment. The real six finishes were not identified; the selection is exposed in CONFIG.',
  'Translucent sample colours are a provisional assortment read off the venue photograph.',
];

export default CONFIG;
