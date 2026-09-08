/* ═══════════════════════════════════════════════════════════════════════════
   SCENE CONFIGURATION — Gensler Chicago office activation
   Polygood® by The Good Plastic Company · campaign: LOOK CLOSER.

   THIS IS THE FILE TO EDIT. Everything below is a concept placeholder unless
   marked as supplied. None of it is a site measurement or a product order.

   UNITS: every length here is in MILLIMETRES. The scene works in metres;
   conversion happens once, at the boundary, via PG.mm().
   ═══════════════════════════════════════════════════════════════════════════ */

window.PG_CONFIG = {

  meta: {
    project:      'Gensler Chicago office activation',
    status:       'Concept model — not for fabrication',
    revision:     'rev B · 2026-09-07',
    eventNaming:  'to be confirmed',
    dimensionNote:'Concept dimensions — verify on site'
  },

  /* ── copy hierarchy, exactly as it appears on the physical pieces ──────── */
  copy: {
    brand:        'Polygood® by The Good Plastic Company',
    campaign:     'LOOK CLOSER.',
    invitation:   'Bring your next detail.',
    detailPrompt: 'Find the groove. Find the joint.',
    action:       'Build a palette. Ask a project question.',
    // Proposed credit, SUBJECT TO BRAND APPROVAL. Attributes the Growth
    // collection only — not the Wall Tiles range, and not this installation.
    growthCredit: 'Growth collection, developed with Gensler serving as product design consultant.'
  },

  questions: [
    { id: 'wet',   label: 'Wet-area detail' },
    { id: 'clean', label: 'Cleaning and replacement' },
    { id: 'cost',  label: 'Cost and programme' }
  ],

  /* ── THE ROOM ─────────────────────────────────────────────────────────── */
  room: {
    ceilingHeight: 3550,
    bay: { centreZ: 350, radius: 3000, halfAngle: 52 },
    sillHeight: 950,
    headHeight: 2950,
    wallThickness: 460,
    windows: [ { c: -32, w: 25 }, { c: 0, w: 25 }, { c: 32, w: 25 } ],
    sideWallX: 3950,
    backWallZ: 6300,
    columns: [ { x: -2660, z: -780 }, { x: 2660, z: -780 } ]
  },

  /* ── THE HOST COUNTER ─────────────────────────────────────────────────── */
  counter: {
    height: 1000,
    depthAtActiveZone: 450,
    topThickness: 45,
    outerRadius: 2500,
    startAngle: -53,
    endAngle: 70,
    loadCapacity: null          // UNKNOWN. Nothing here is a load approval.
  },

  /* ── THE INSTALLATION ─────────────────────────────────────────────────── */
  install: {
    allocatedLength: 1400,
    activeDepth:     400,
    gapBetweenUnits: 40,

    setOutAngle:   -18,
    extraRotation: 0,
    frontEdgeInset: 10,

    wall: {
      width: 700, height: 650, thickness: 12, moduleVerified: false,
      // the fragment keeps the coarse illustrative grid it was deployed with.
      // The four supplied engravings are shown on the Growth collection, in
      // the palette, not on this panel.
      engraving: { id: 'wallgrid', name: 'Illustrative grid', shape: 'rect', cellW: 175, cellH: 175 }
    },

    horizontal: {
      width: 700, depth: 350, thickness: 19,
      topAboveCounter: 120,
      exposedEdge: 'front'
    },

    palette: {
      // Deepened from 300 to 400 mm to take the two sample boxes (400 mm is the
      // active-depth cap), and widened to carry FOUR engraved Growth samples
      // rather than three plain ones. The widening spends envelope: watch the
      // fit check.
      width: 650, depth: 400,
      // 150 mm is the floor here, not a preference: the Pearl and Jade cells
      // are 150 mm tall, so a smaller sample cannot show one whole cell.
      sampleSize: 150,
      sampleGap: 8,
      sampleCount: 4
    },

    // The two Polygood sample boxes, from the supplied product photographs.
    // Dimensions are read off those photographs — they are proportions, not a
    // measured product drawing.
    sampleBoxes: [
      { id: 'dark',  base: '#171717', lid: '#171717', text: 'A VISIBLE COMMITMENT TO SUSTAINABILITY', mark: false },
      { id: 'stone', base: '#8b8489', lid: '#8b8489', text: '',                                        mark: true }
    ],
    sampleBox: {
      width: 200, depth: 68, height: 46,   // tray, from the photographs
      lidHeight: 104, lidThickness: 12,
      stick: { width: 14, depth: 58, height: 92, count: 12 }
    },

    /* ── the orientation stand, at the LEFT edge ───────────────────────────
       A Polygood information board in a slotted base, from the supplied
       photograph. The BOARD ARTWORK IS NOT REPRODUCED: the real one carries
       GWP figures, certification marks and third-party client logos, none of
       which this model may assert or redraw from a photograph. What is drawn
       is a layout placeholder at the right size, so scale, placement and
       legibility can still be judged.
       Supply the real print file as a data URI in `artwork` and it is used
       instead, untouched. */
    infoStand: {
      unit:  { width: 500, depth: 200 },
      board: { width: 440, height: 300, thickness: 19, printInset: 20 },
      base:  { width: 480, depth: 140, height: 75, slot: 26, lean: 12, embed: 20 },
      material: 'nightfleck',
      artwork: null
    },

    // Its own sub-assembly, to the right of the Growth palette.
    translucentUnit: { width: 400, depth: 180 },

    // The Translucent Collection presentation box, from the supplied
    // photograph. Proportions are read off that photograph — not a product
    // drawing. It is markedly larger than the two standard sample boxes.
    translucentBox: {
      width: 360, depth: 95, height: 68,
      lidHeight: 150, lidThickness: 16, lidLean: 4,   // lid hinged at the back
      block: { width: 58, depth: 16, height: 95, count: 11, pitch: 30, angle: 30 },
      brandLine: 'THE GOOD PLASTIC COMPANY',
      title: 'TRANSLUCENT COLLECTION',
      mark: 'Polygood\u00ae',
      shell: '#232323', insert: '#d8d8d6',
      // eleven translucent blocks, colours read off the photograph.
      // Illustrative: not colour-accurate and not tied to any SKU.
      blocks: ['#dcdcd8', '#2f9fd8', '#31b9a6', '#a9e02c', '#8f5219', '#ef2a68',
               '#e4c3ba', '#3d8fd2', '#f07a1e', '#2a86d8', '#b9a887']
    },

    coupon: { width: 150, height: 100, liftHeight: 130 },

    base: { plateDepth: 200, plateThickness: 12, blockHeight: null, padThickness: 3 },

    clearFloorBand: 1200,

    freestanding: { x: 1300, z: 3200, rotation: -22, shown: false }
  },

  /* ── ENGRAVINGS ───────────────────────────────────────────────────────────
     SUPPLIED as patterns in the client photograph "Selected Tiles". The four
     names and the four shapes are theirs. What is NOT supplied is any
     dimension: the cell sizes below are derived from the proportions in that
     photograph against an assumed 300 mm reference sheet. Treat every number
     here as illustrative until a profile drawing arrives.

     A groove is machined into ONE continuous panel. These are engravings, not
     an assembly of loose tiles, and not grout.                              */
  /* ── what the model OPENS on ───────────────────────────────────────────
     This sets the STARTING selection only. Every wall tile, every Growth
     surface and every engraving below stays selectable in the panel — the
     three choices remain independent, and nothing here removes a control.
     Set any of these to null to fall back to the first entry in its list. */
  defaults: {
    wall:      'dark',          // wallColours id — the dark tile
    growth:    'growth-pebble', // growthSurfaces id
    engraving: null,            // engravings id
    question:  null,            // questions id
    view:      'approach'       // vantage key: approach | eye | detail | overhead |
                                // palette | translucent | orientation | logistics
  },

  engravingReferenceSheet: 300,   // assumed sheet size the proportions came from
  engravings: [
    { id: 'oyster',     name: 'Oyster',     ref: '01', shape: 'rect',    cellW: 43,   cellH: 43  },
    { id: 'pearl',      name: 'Pearl',      ref: '02', shape: 'rect',    cellW: 50,   cellH: 150 },
    { id: 'jade',       name: 'Jade',       ref: '03', shape: 'scallop', cellW: 50,   cellH: 150 },
    { id: 'terracotta', name: 'Terracotta', ref: '04', shape: 'rect',    cellW: 18.8, cellH: 75  }
  ],
  groove: {
    width: 8, depth: 4,
    profile: 'square-cut, eased lip — approximate; manufacturer profile requested',
    verified: false
  },
  // "Illustrative numbering 01–04; final product codes to be confirmed."
  engravingRefsConfirmed: false,

  /* ── PRODUCT SELECTION ────────────────────────────────────────────────────
     Wall product and horizontal product are INDEPENDENT choices.            */
  product: {
    wallTileSku:       null,
    growthSurfaceSku:  null,
    samePatternAvailabilityConfirmed: false,
    // The four engravings are shown here on Growth material. Whether they can
    // be machined into Growth panels — and in which thicknesses — is NOT
    // established. Nothing in this model should be read as saying they can.
    engravingOnGrowthConfirmed: false,
    panelJointDetailSupplied: false
  },

  /* ── SURFACES ─────────────────────────────────────────────────────────────
     Deterministic placeholders. NOT colour-accurate, NOT tied to a SKU.
     Replace with approved photographs or texture maps, preserving scale.

     Wall Tiles carry the four core colours named alongside the engravings.
     Growth is a separate range — greys and blacks, some fibrous — so the two
     product families stay visibly distinct, as they are in specification.    */
  wallColours: [
    { id: 'light',  name: 'Light — illustrative',  pattern: 'flake', base: '#b9b3a6',
      flake: ['#8f8779', '#d6d1c6', '#6f6a60'], density: 1.0, seed: 1041 },
    { id: 'medium', name: 'Medium — illustrative', pattern: 'flake', base: '#7d766b',
      flake: ['#5b554c', '#a8a196', '#3f3b35'], density: 1.0, seed: 2087 },
    { id: 'dark',   name: 'Dark — illustrative',   pattern: 'flake', base: '#40403e',
      flake: ['#2a2a29', '#6d6b66', '#8c8880'], density: 1.0, seed: 3119 }
  ],
  /* material for the orientation stand — dark with a pale blue fleck, from the
     supplied swatch photograph. Illustrative, like every other surface here. */
  standSurfaces: [
    { id: 'nightfleck', name: 'Dark, blue fleck — illustrative', pattern: 'flake', base: '#0a0a0c',
      flake: ['#d6e6f8', '#eef5fd', '#8fb2d6', '#1c2026'], density: 0.32, seed: 6101 }
  ],
  /* ── the Growth collection ─────────────────────────────────────────────
     Four surfaces, redrawn from the supplied close-up photographs. The
     colours are SAMPLED from those photographs — mean, luminance
     percentiles and the most saturated fraction — not picked by eye. They
     are still ILLUSTRATIVE: a photograph carries its own white balance and
     exposure, so these are not colour accurate, are not tied to a SKU, and
     are not a substitute for an approved texture map or a physical sample.

     Chip SIZE is the softest assumption here. The photographs carry no
     scale bar, so cellMm is read off an ASSUMED crop width — roughly
     200 mm for the three 3000 px images, 150 mm for the smaller one.
     Correct these first when a real sample or a scaled photograph arrives. */
  growthSurfaces: [
    // 1 — dense rounded pebbles, near-white, very low contrast (L 153–208)
    { id: 'growth-pebble', name: 'Pale pebble — illustrative', pattern: 'chips',
      base: '#bdbdb9', flake: ['#d0d1cc', '#cdccca', '#c6c7c2', '#c9c9c5', '#bcbcba', '#b1b1ac'],
      cellMm: 7, round: 1, coverage: 1, alpha: 1,
      outline: 'rgba(128,128,124,0.34)', outlineWidth: 0.8, seed: 5101 },

    // 2 — the softest of the four: broad diffuse blotches, barely any
    //     contrast at all (L 186–215), so it is drawn large and faint
    { id: 'growth-mist', name: 'Soft white — illustrative', pattern: 'chips',
      base: '#cfcfcf', flake: ['#d7d7d7', '#d2d2d2', '#cbcbcb', '#c5c5c5', '#bebebe'],
      cellMm: 6.5, round: 0.9, coverage: 0.92, alpha: 0.5,
      outline: null, seed: 5203 },

    // 3 — PALE chips are the majority here and the dark matrix is only the
    //     web between them, so coverage runs high and the base is the web
    { id: 'growth-slate', name: 'Dark chip — illustrative', pattern: 'chips',
      base: '#5d5e58', flake: ['#c3c2bc', '#b6b4ab', '#a09c91', '#a69d8c', '#cac9c3',
                               '#8f8274', '#736a61'],
      cellMm: 8, round: 0.35, coverage: 0.95, alpha: 0.97,
      outline: 'rgba(52,53,49,0.65)', outlineWidth: 1.0, seed: 5307 },

    // 4 — packed ANGULAR chips, warm and muted. The ochre is deliberately
    //     one entry in twelve: in the photograph it is an accent, not a tone
    { id: 'growth-clay', name: 'Warm chip — illustrative', pattern: 'chips',
      base: '#6b6055', flake: ['#b4b1a5', '#aca496', '#a99e8f', '#a2988a', '#9c9184',
                               '#92897b', '#8a8072', '#847a6c', '#81736a', '#77695f',
                               '#6f6357', '#665d52', '#585047', '#3f3c37', '#2a2723',
                               '#8a6b45'],
      cellMm: 8, round: 0, coverage: 1, alpha: 1,
      outline: 'rgba(38,34,29,0.6)', outlineWidth: 0.9, seed: 5419 }
  ],
  // 500 mm per tile at 1024 px = ~2 px/mm. Every pattern wraps, so the
  // repeat is invisible; this buys chip detail without a bigger canvas.
  surfaceTileSize: 500,
  textureStatus: 'Illustrative placeholder textures — not colour-accurate, no SKU assigned',

  references: [
    { id: 'oak',   name: 'Wood reference',  colour: '#9a7448', rough: 0.78 },
    { id: 'steel', name: 'Metal reference', colour: '#9498a0', rough: 0.32, metal: 0.85 }
  ],

  /* ── DAYLIGHT REVIEW ──────────────────────────────────────────────────── */
  daylight: {
    facadeAzimuth: 248,
    soft:      { hour: 10.4, label: 'Soft daylight' },
    backlight: { hour: 16.9, label: 'Bright backlight' },
    orientationVerified: false
  },

  furnitureReset: {
    stoolAngles:   [-38, -15, 9],
    resetAngles:   [34, 48, 62],
    stoolRadius:   1620
  }
};
