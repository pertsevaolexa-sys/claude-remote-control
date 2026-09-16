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

    /* ── Stand 2, from the gExpo holders spec of 14.09.2026 ────────────────
       These are SUPPLIED dimensions, not our placeholders — the first in this
       model that are. Every part is Polygood 19 mm unless noted, cutter d4.
       Samples are not glued: they drop into their slots from above and lift
       out the same way. */
    stand2: {
      base:  { width: 450, depth: 420, thickness: 19 },
      panelSlot: { width: 450, kerf: 12.1, depth: 5, fromFront: 274.9 },
      tile: {
        width: 180, height: 120, thickness: 12,
        slotLength: 190, slotKerf: 15.64, slotDepth: 12,
        fromFront: 60, offsetRight: 90, lean: 15   // leans back toward the panel
      },
      gussetFront: { size: 90,  thickness: 19, count: 2 },
      gussetBack:  { size: 120, thickness: 19, count: 2 },
      /* the slot kerf is wider than the sample on purpose: 12 / cos15 +
         12 x tan15 = 15.64, so the tile wedges in it at its lean angle */
      /* PALE in the concept image, against the dark panel above it. This
         reverses what was said on the call ("midnight horizontal"); the image
         is the later source, so it wins — flag if that is backwards. */
      tileSurface: 'growth-mist'
    },

    wall: {
      width: 450, height: 450, thickness: 12, moduleVerified: true,
      // the fragment keeps the coarse illustrative grid it was deployed with.
      // The four supplied engravings are shown on the Growth collection, in
      // the palette, not on this panel.
      /* B_PANEL carries a decorative 4 x 4 grid: six grooves, 4 mm wide and
         3 mm deep. Supplied on the spec sheet, so 112.5 mm cells rather than
         the 175 mm placeholder this panel used to carry. */
      engraving: { id: 'wallgrid', name: 'Decorative 4 x 4 grid', shape: 'rect',
                   cellW: 112.5, cellH: 112.5 }
    },

    horizontal: {
      width: 700, depth: 350, thickness: 19,
      topAboveCounter: 120,
      exposedEdge: 'front'
    },

    palette: {
      // Widened and deepened again to carry SIX engraved tiles in two rows of
      // three, plus the two general sample boxes. This spends envelope: watch
      // the fit check.
      /* 580 for the six tiles + 60 margin. Width has to stay short: at 1060 this
         unit swung 68 mm off a 2.06 m radius and overhung the glazing side by
         16 mm. Rigid things on this counter have to stay short.
         410 DEEP, because the two sample boxes now stand BEHIND the tiles in
         this unit rather than taking a slot of their own on the run — which is
         where the planning photograph puts them, and which moves the catalogues
         510 mm back along the counter, clear of the credenza.
         15 front margin + 260 tile block + 25 gap + 105 box and standing lid.
         The ceiling is NOT the 450 counter depth. At 640 wide the back corners
         swing 25 mm out, so the counter's 2500 outer edge binds first and the
         real limit is 419. At 430 it overhung the glazing side by 10 mm. */
      width: 640, depth: 410,
      /* Six engraved tiles, two rows of three. 120 x 180 as stated; UNITS AND
         THICKNESS UNCONFIRMED — read here as millimetres, the only reading that
         gives a tile a visitor can pick up. Only four engravings have been
         supplied for six positions, so the set cycles through them; that repeat
         is real and visible, not a modelling shortcut. */
      /* 12 mm matches the sample thickness used elsewhere in the spec;
         THICKNESS STILL UNCONFIRMED for these six. */
      tile: { width: 180, height: 120, thickness: 12, unitsConfirmed: false },
      /* SIX LOOSE ENGRAVED TILES, 180 x 120, two rows of three, each turned
         with its 180 side ALONG the counter: 3x180 + 2x20 = 580 wide,
         2x120 + 20 = 260 deep. Turned the other way it would be 400 x 380 and
         eat 120 mm more of a counter depth we have not measured. */
      cols: 3, rows: 2, gapX: 20, gapZ: 20,
      tileAlongCounter: true,
      /* One surface per tile, so the row compares colour AND engraving the way
         the concept image does. Illustrative: not colour accurate, no SKU. */
      tileSurfaces: ['growth-mist', 'growth-slate', 'growth-clay',
                     'growth-pebble', 'growth-midnight', 'growth-mist'],
      gridX: 0             // the boxes are behind the tiles now, not beside them
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

    /* ── the two A4 displays ───────────────────────────────────────────────
       Both are A4 landscape, 297 x 210, in the same minimal holder: a flat
       foot, one triangular fin behind, and a low front lip. The fin is sized
       to hold the sheet at its lean and no more. It should disappear, not
       read as a fixture.

       ARTWORK: the supplied sheets were shown to us as images but not handed
       over as files, so what is drawn is a layout built from the approved copy.
       Photography, QR codes and certification marks are reserved and named.
       Put a data URI in the stand's `artwork` and the real print file replaces it. */
    a4: {
      /* A4_PLATE_19_337x250 with one A4_GUSSET_19_90x70 centred at the back.
         The sheet sits on the plate with a 20 mm border on all four sides;
         337 x 250 is exactly 297 + 40 by 210 + 40. */
      sheet:  { width: 297, height: 210, thickness: 3 },
      plate:  { width: 337, height: 250, thickness: 19, border: 20 },
      gusset: { width: 90, height: 70, thickness: 19 },
      lean:   15,   // degrees from vertical
      material: 'nightfleck'
    },
    /* LEFT display — the first thing a visitor meets, at the left edge. */
    introStand:  { unit: { width: 430, depth: 210 }, artwork: null },
    /* INSTALLATION display — the Growth Collection, set back beside the
       installation, with the collaboration box in front of it. */
    /* 425 deep, not 300. The A4 holder needs 100 at the back (90 gusset +
       plate), the lid rests against the plate face, and the 300 mm tray sits
       in front of the lid's foot: 100 + 23 + 300 = 423, taken to 425. At 300
       the box ran straight through the plate. This is measured, not chosen —
       change the box depth or the lean and it has to be recomputed. It clears
       the 450 mm counter, and the fit check reports the deepest unit. */
    growthStand: { unit: { width: 470, depth: 425 }, artwork: null },

    /* The Growth / Gensler box, open in front of the Growth A4, the lid leaning
       back against the plate face at the plate's own 15 degrees.
       300 x 300 is CONFIRMED by the client. The height, the lid height and the
       chip grid are NOT — they are read off the planning photograph against the
       297 mm A4 behind it.
       lidHeight is 135, not the 190 first assumed. On the photograph the lid's
       top edge sits about halfway up the A4 sheet, leaving the whole "The
       Growth Collection" headline clear above it; at 190 it covered the
       headline, and at 170 it still cut the second line. Leaning at 15 degrees
       a 135 lid stands 130 above the counter, against a sheet whose headline
       starts at about 142. It does not affect the depth arithmetic — the lid is
       coplanar with the plate, so its foot sits in the same place whatever its
       height. */
    collabBox: {
      width: 300, depth: 300, height: 30, lidThickness: 8, lidHeight: 135,
      chip: { width: 66, height: 128, gap: 8, cols: 4, rows: 2 },
      shell: '#5b93a3', felt: '#e9e7e1',
      title: 'GROWTH COLLECTION',
      sub: 'A New Chapter in Sustainable Design',
      eyebrow: 'Product Design Collaboration',
      partner: 'Gensler',
      unitsConfirmed: false
    },

    // Its own sub-assembly, to the right of the Growth palette.
    translucentUnit: { width: 400, depth: 180 },

    // The Translucent Collection presentation box, from the supplied
    // photograph. Proportions are read off that photograph — not a product
    // drawing. It is markedly larger than the two standard sample boxes.
    /* ── the Translucent block, from the gExpo spec sheet 3 ────────────────
       Replaces the lidded presentation box. A solid bar with ten angled slots;
       the samples stand in them and lift straight out.

       The slot is 15 mm for a 12 mm sample ON PURPOSE: translucent stock is
       Polygood group 5, uncalibrated, two-sided tolerance +/-2.0, so a 12 mm
       slot would reject part of the batch.

       FABRICATION IS NOT SETTLED on the spec: an 80 x 80 section cannot be cut
       from one 19 mm sheet. Either laminate 4-5 layers of 19 mm or build it as
       a box from plates. No DXF is supplied for the bar. */
    translucentBox: {
      barWidth: 300, barDepth: 80, barHeight: 80,
      slot: { length: 15, width: 65, depth: 30, count: 10, pitch: 25, angle: 20 },
      sample: { width: 60, height: 120, thickness: 12, protrude: 90 },
      shell: '#232323',
      blocks: ['#d94f3d', '#e8822e', '#edc93f', '#8ec63f', '#3fb59b',
               '#3b8fd4', '#5a5ac4', '#9b52b0', '#d1568f', '#9aa0a6'],
      fabricationSettled: false
    },

    /* Three catalogues, 200 x 200 mm — centimetres confirmed by the client.
       Laid as a stepped stack so the cover reads and the top one lifts off
       without disturbing the others. */
    /* Three catalogues, 200 x 200, in a small overlapping fan. The three
       together want roughly 240-260 mm of counter. */
    /* Their angle is NOT set here: they are set out by arc length past the
       sample boxes, so they stay at the right-hand end of whatever the run
       turns out to be. A typed-in angle was the wrong instrument — the one
       that used to be here put them inside the credenza, which crosses the
       counter's front edge from about 37.5 deg. */
    brochure: { size: 200, thickness: 6, count: 3, step: 28, fanAngle: 7 },

    /* ── roll-up banner, in front of the credenza ──────────────────────────
       Graphic 457 x 1123 mm (18 x 44.2 in) as stated. WHETHER THAT HEIGHT
       INCLUDES THE CASSETTE IS UNCONFIRMED; drawn here as graphic only,
       standing on a cassette, which is the taller of the two readings.

       This does NOT screen the credenza. The credenza is 1780 mm wide; the
       banner is 457. See the README for the arithmetic — the model is drawn
       at the stated size and the shortfall is left visible rather than
       quietly widened. */
    banner: {
      /* HEIGHT CHANGED FROM THE SPEC. The written figure was 1123 mm; the
         photograph of the built stand shows a normal floor roll-up reaching
         roughly 2.1 m — measured against the 1000 mm counter in the same
         frame. 1123 mm would be a tabletop unit, which is what I flagged
         before the photograph arrived. Width is left at the stated 457. */
      /* 840 x 2000 is the concept's assumption for the taller stand, not a
         measured product. The holder PDF said 457 x 1123, which is a tabletop
         unit. CONFIRM THE ACTUAL STAND AND PRINTABLE AREA before production. */
      graphicWidth: 840, graphicHeight: 2000,
      cassetteHeight: 62, cassetteDepth: 180, poleDiameter: 22,
      footSpread: 300, heightIncludesBase: false,
      /* Past the end of the counter run (which stops at 70 deg) and clear of
         the reset stools, so it screens the credenza's open shelving without
         standing in the staff's way or clashing with the counter. */
      /* Positioned off the CREDENZA, not off a bay angle. Past its far end,
         facing into the room the way the credenza does — which is where the
         photograph puts it. An object set out on the bay at 88 degrees faces
         the side wall, not the room.
         credenza values mirror venue.js: bayPt(63, 2.10), 1780 wide. */
      credenza: { angle: 63, radius: 2100, halfWidth: 890, depth: 460, height: 1000 },
      alongCredenza: 1560,      // from its centre, past the far end
      outFromCredenza: 470,     // toward the room, clear of the 460-deep carcass
      artwork: null
    },

    /* The "Look closer / Polygood Tiles" card on the front-left of the base.
       NOT DIMENSIONED in the holder PDF; drawn as landscape A5. */
    lookCloserCard: { width: 210, height: 148, dimensioned: false },

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
    wall:      'dark',          // wallColours id — as built, from the photograph
    growth:    'growth-pebble', // growthSurfaces id — drives the engraved tiles
    engraving: null,            // engravings id
    question:  null,            // questions id
    view:      'approach'       // vantage key: approach | eye | detail | overhead |
                                // palette | translucent | orientation | logistics
  },

  /* ── production finish ─────────────────────────────────────────────────
     The stands are WHITE and the tile they stand on is BLACK. Structure and
     material are deliberately different things here: `stand` is a paint or
     powder-coat finish on the support metalwork, while `baseTile` names a
     real Polygood surface from standSurfaces — the base is a panel, not a
     painted tray, which is why it carries a texture and the stands do not. */
  finish: {
    // The support metalwork. Dark and recessive on purpose: the white/black
    // idea lives in the PANELS, and structure that competes with them would
    // work against it. These are the values the model has always used,
    // expressed in sRGB and converted on load.
    stand:      '#5f6265',    // rails, fins, gussets, cradles
    standRough: 0.50,
    standMetal: 0.55,
    pad:        '#4f535a',    // protective contact pads
    baseTile:   'nightfleck', // standSurfaces id — the base each unit stands on
    /* The horizontal panel under the standing panel. Held SEPARATELY from the
       Growth swatch: the swatch drives the six engraved tiles, whose whole job
       is to be compared, and an engraving machined 4 mm deep is invisible on a
       black panel. Both readings of "black beneath" are kept — the panel is
       Midnight, the tiles are legible. */
    underPanel: 'growth-midnight'
  },

  engravingReferenceSheet: 300,   // assumed sheet size the proportions came from
  engravings: [
    { id: 'oyster',     name: 'Oyster',     ref: '01', shape: 'rect',    cellW: 43,   cellH: 43  },
    { id: 'pearl',      name: 'Pearl',      ref: '02', shape: 'rect',    cellW: 50,   cellH: 150 },
    { id: 'jade',       name: 'Jade',       ref: '03', shape: 'scallop', cellW: 50,   cellH: 150 },
    { id: 'terracotta', name: 'Terracotta', ref: '04', shape: 'rect',    cellW: 18.8, cellH: 75  }
  ],
  /* SUPPLIED on the gExpo holders spec: the decorative grid is cut 4 mm wide
     and 3 mm deep. This is no longer our approximation. */
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
    // the standing panel in the LOOK CLOSER unit. White, so the Oyster
    // engraving reads as shadow rather than as colour.
    { id: 'white',  name: 'White — illustrative',  pattern: 'flake', base: '#e9e9e6',
      flake: ['#f7f7f5', '#d3d3cf', '#bfbfba'],           density: 0.85, seed: 3007 },
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
    // 0 — the panel BENEATH the standing panel. Same dark, pale-flecked
    //     surface as the base ("Midnight"), carried into the Growth range so
    //     the Growth swatch row still drives the horizontal panel.
    { id: 'growth-midnight', name: 'Midnight — illustrative', pattern: 'flake',
      base: '#0a0a0c', flake: ['#d6e6f8', '#eef5fd', '#8fb2d6', '#1c2026'],
      density: 0.32, seed: 5501 },

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
