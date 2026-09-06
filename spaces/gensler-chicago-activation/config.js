/* ═══════════════════════════════════════════════════════════════════════════
   SCENE CONFIGURATION — Gensler Chicago office activation
   Polygood® by The Good Plastic Company · campaign: LOOK CLOSER.

   THIS IS THE FILE TO EDIT. Everything below is a concept placeholder.
   None of it is a site measurement, a product order, or an approved detail.

   UNITS: every length here is in MILLIMETRES. The scene works in metres;
   conversion happens once, at the boundary, via PG.mm().
   ═══════════════════════════════════════════════════════════════════════════ */

window.PG_CONFIG = {

  meta: {
    project:      'Gensler Chicago office activation',
    status:       'Concept model — not for fabrication',
    revision:     'rev A · 2026-09-06',
    // Official event naming and date are not confirmed. Do not print an event
    // name in the scene until the client supplies one.
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

  /* the three prompts on the project-question card */
  questions: [
    { id: 'wet',   label: 'Wet-area detail' },
    { id: 'clean', label: 'Cleaning and replacement' },
    { id: 'cost',  label: 'Cost and programme' }
  ],

  /* ── THE ROOM ───────────────────────────────────────────────────────────
     Derived from the reference photograph IMG_3511.jpeg. This establishes
     appearance and adjacency only. It is not a measured plan, and the
     building is not identified.                                            */
  room: {
    ceilingHeight: 3550,
    // the bay is modelled as a circular arc; the photograph shows a gently
    // faceted or curved perimeter and does not resolve which
    bay: { centreZ: 350, radius: 3000, halfAngle: 52 },   // halfAngle in degrees
    sillHeight: 950,
    headHeight: 2950,
    wallThickness: 460,
    // window sashes: centre angle and angular width on the bay arc, degrees
    windows: [ { c: -32, w: 25 }, { c: 0, w: 25 }, { c: 32, w: 25 } ],
    sideWallX: 3950,
    backWallZ: 6300,
    // decorative columns — position only; the capital is a restrained
    // approximation and carries no survey value
    columns: [ { x: -2660, z: -780 }, { x: 2660, z: -780 } ]
  },

  /* ── THE HOST COUNTER ───────────────────────────────────────────────────
     The existing dark window counter is the primary support. Height and
     depth below are UNMEASURED placeholders from the brief.
     Modelled as an arc concentric with the bay; PG.counterPolyline() samples
     it if you need it as a polyline.                                        */
  counter: {
    height: 1000,          // unmeasured support height; adjustable
    depthAtActiveZone: 450,// MUST be measured before fabrication
    topThickness: 45,
    // arc set-out: outer edge sits nearest the glazing
    outerRadius: 2500,
    startAngle: -53,       // degrees on the bay arc
    endAngle: 70,
    // load capacity is UNKNOWN. Nothing here constitutes a load approval.
    loadCapacity: null
  },

  /* ── THE INSTALLATION ───────────────────────────────────────────────────
     Concept placeholders. Not site measurements, not product orders.        */
  install: {
    allocatedLength: 1400,     // maximum initial concept envelope, along the counter
    activeDepth:     400,      // must sit entirely within the verified support footprint
    gapBetweenUnits: 40,

    // set-out: angular centre of the main unit on the counter arc, degrees.
    // The composition may rotate slightly to improve side lighting; overhang
    // is flagged, never absorbed by quietly deepening the counter.
    setOutAngle:   -18,
    extraRotation: 0,          // degrees, applied to both units about their own centres
    frontEdgeInset: 10,        // front edge held this far back from the counter's room-side edge

    wall: {                    // vertical Wall Tiles fragment
      width: 700, height: 650, thickness: 12,
      // GROOVE = machined into ONE continuous panel. NOT a grout joint and
      // NOT an assembly of loose square tiles.
      // Profile, spacing and depth below are an ILLUSTRATIVE APPROXIMATION
      // pending a manufacturer profile drawing.
      groove: {
        spacing: 175,          // illustrative only — NOT a product module
        width: 8,
        depth: 4,
        profile: 'approximate square-cut — manufacturer profile requested',
        verified: false
      },
      // The published 700 × 700 mm reference is described for residential
      // projects. It is not evidence of the required commercial module.
      moduleVerified: false
    },

    horizontal: {              // Growth counter fragment
      width: 700, depth: 350, thickness: 19,
      topAboveCounter: 120,    // concept support zone, subject to fabricator detail
      exposedEdge: 'front'
    },

    palette: {                 // three Growth choices + identity card
      width: 500, depth: 300,
      sampleSize: 150,
      sampleCount: 3
    },

    coupon: { width: 150, height: 100, liftHeight: 130 },  // handled demonstration piece

    base: {                    // concept support — fabricator review required
      plateDepth: 200, plateThickness: 12,
      blockHeight: null,       // computed from horizontal.topAboveCounter
      padThickness: 3          // protective contact pads onto the host counter
    },

    clearFloorBand: 1200,      // planning overlay only; not a compliance certification

    // separately allocated floor area for the fallback freestanding support
    freestanding: { x: 1300, z: 3200, rotation: -22, shown: false }
  },

  /* ── PRODUCT SELECTION ──────────────────────────────────────────────────
     Wall product and horizontal product are INDEPENDENT choices. Do not
     assume every Growth pattern, thickness and finish can be ordered as
     Wall Tiles.                                                             */
  product: {
    wallTileSku:       null,   // not supplied
    growthSurfaceSku:  null,   // not supplied
    // A same-pattern wall/counter setting is deliberately absent until
    // availability is confirmed by the manufacturer.
    samePatternAvailabilityConfirmed: false,
    // Real panel-to-panel joint sample is NOT shown. Showing one would imply
    // an approved connection that has not been detailed.
    panelJointDetailSupplied: false
  },

  /* ── SURFACES ───────────────────────────────────────────────────────────
     Deterministic, restrained placeholders. NOT colour-accurate. NOT tied to
     any SKU. Replace with approved photographs or texture maps when supplied,
     preserving physical scale.                                              */
  surfaces: [
    { id: 'light',  name: 'Light — illustrative texture',  base: '#b9b3a6', flake: ['#8f8779', '#d6d1c6', '#6f6a60'], seed: 1041 },
    { id: 'medium', name: 'Medium — illustrative texture', base: '#7d766b', flake: ['#5b554c', '#a8a196', '#3f3b35'], seed: 2087 },
    { id: 'dark',   name: 'Dark — illustrative texture',   base: '#40403e', flake: ['#2a2a29', '#6d6b66', '#8c8880'], seed: 3119 }
  ],
  // physical size one texture tile represents, so scale survives on every piece
  surfaceTileSize: 1000,
  textureStatus: 'Illustrative placeholder textures — not colour-accurate, no SKU assigned',

  /* neutral reference chips in the palette area. These are references the
     visitor can hold against a choice — NOT product partners, NOT approvals. */
  references: [
    { id: 'oak',   name: 'Wood reference',  colour: '#9a7448', rough: 0.78 },
    { id: 'steel', name: 'Metal reference', colour: '#9498a0', rough: 0.32, metal: 0.85 }
  ],

  /* ── DAYLIGHT REVIEW ────────────────────────────────────────────────────
     Building orientation is UNKNOWN. These are legibility conditions for
     review, not a sun study.                                                */
  daylight: {
    facadeAzimuth: 248,        // assumed WSW so the review has a defined geometry
    soft:      { hour: 10.4, label: 'Soft daylight' },
    backlight: { hour: 16.9, label: 'Bright backlight' },
    orientationVerified: false
  },

  /* existing furniture inside the allocated zone gets reset, not deleted */
  furnitureReset: {
    stoolAngles:   [-38, -15, 9],   // as photographed
    resetAngles:   [24, 46, 60],    // indicative reset positions, clear of the zone
    stoolRadius:   1620
  }
};
