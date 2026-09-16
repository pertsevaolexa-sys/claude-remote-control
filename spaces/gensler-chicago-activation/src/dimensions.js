// ---------------------------------------------------------------------------
// The representatives' dimensions reference.
// ---------------------------------------------------------------------------
// Source of truth is MILLIMETRES, as the brief instructs. Centimetres and
// inches are computed here (1 in = 25.4 mm exactly) so the three columns can
// never drift apart, and so a change to a millimetre value updates all three.
//
// `status` says how far to trust a row:
//   'specified'   - stated in the brief or the holder PDF
//   'provisional' - estimate, placeholder or modelling assumption
//   'conflict'    - sources disagree; see the note
//   'context'     - published product figure, shown for scale only
// ---------------------------------------------------------------------------

export const MM_PER_INCH = 25.4;

const cm = (v) => Math.round((v / 10) * 1000) / 1000;
const inch = (v) => Math.round((v / MM_PER_INCH) * 100) / 100;

const fmt = (values, convert) => values.map(convert).join(' × ');

/** One row: label, the millimetre values, how many there are, status, note. */
function row(label, mmValues, { count, status = 'specified', note = '' } = {}) {
  const v = Array.isArray(mmValues) ? mmValues : [mmValues];
  return {
    label,
    count,
    status,
    note,
    mm: v,
    mmText: v.join(' × '),
    cmText: fmt(v, cm),
    inText: fmt(v, inch),
  };
}

export const DIMENSION_TABLES = [
  {
    id: 'display',
    title: 'Display items',
    caption: 'W = width, H = height, D = depth, T = thickness. Model from the millimetre values.',
    rows: [
      row('Roll-up graphic, W × H', [457.2, 1122.68], { status: 'specified' }),
      row('Roll-up overall height as modelled', [1800], { status: 'conflict', note: 'The reference render scales to about 1770 mm tall; the brief states the 1122.68 mm graphic. The graphic is never rescaled — it is printed across the top of a taller panel. Confirm which height is right.' }),
      row('Brochures, each', [200, 200], { count: 3 }),
      row('Landscape A4 sheets', [297, 210], { count: 2 }),
      row('A4 backing plates, W × H × T', [337, 250, 19], { count: 2 }),
      row('Main Oyster panel, W × H × T', [450, 450, 12], { status: 'conflict', note: 'The assembly drawing and the 12.1 mm slot indicate 12 mm; the cut list says 19 mm. A 19 mm panel cannot enter that slot. Modelled at 12 mm.' }),
      row('Installation base, W × D × T', [450, 420, 19]),
      row('Plain portrait sample, W × H × T', [120, 180, 12]),
      row('Engraved samples, each', [180, 120, 12], { count: 6, status: 'conflict', note: '180 × 120 face is specified; the 12 mm thickness is provisional.' }),
      row('Six-sample arrangement, W × D', [580, 260]),
      row('Gap between samples', [20]),
      row('Translucent block, W × D × H', [300, 80, 80]),
      row('Translucent samples, each', [60, 120, 12], { count: 10 }),
      row('Sample height above block', [90]),
      row('Overall Translucent display height', [170]),
      row('Oyster production panel', [2800, 1400], { status: 'context', note: 'Published panel size, for scale only. The 450 mm display piece is a demonstration.' }),
    ],
  },
  {
    id: 'holders',
    title: 'Holder and installation details',
    caption: 'For triangular supports the first two figures describe the triangle; the third is thickness.',
    rows: [
      row('A4 triangular supports', [90, 70, 19], { count: 2 }),
      row('A4 border, each side', [20]),
      row('Front installation braces', [90, 90, 19], { count: 2 }),
      row('Rear installation braces', [120, 120, 19], { count: 2 }),
      row('Main engraving, width × depth', [4, 3]),
      row('Main panel slot, L × W × D', [450, 12.1, 5]),
      row('Main slot position from front', [274.9], { note: 'Follow the drawing arrows to confirm whether this is an edge or a centreline.' }),
      row('Original mini-sample slot, L × W × D', [190, 15.64, 12], { status: 'conflict', note: 'Drawn for a LANDSCAPE 180 × 120 sample. The revised portrait 120 × 180 sample is centred in it, leaving 35 mm open at each end. Needs review before fabrication.' }),
      row('Mini-slot position from front', [60]),
      row('Mini-slot offset right', [90]),
      row('Translucent slots, W × L × D', [15, 65, 30], { count: 10 }),
      row('Translucent slot pitch', [25]),
      row('Installation height above counter', [464], { note: 'Assumes 5 mm insertion into the base: 19 + 450 − 5.' }),
    ],
  },
  {
    id: 'provisional',
    title: 'Provisional — not confirmed measurements',
    caption: 'Nobody has supplied a measurement for any of these. They are modelling estimates.',
    rows: [
      row('Growth box, as modelled', [320, 240, 26], { status: 'conflict', note: 'The reps\' reference sheet carries an earlier 330 × 310 × 20 closed envelope. This model uses 320 × 240 × 26, proportioned from the supplied photograph of the box open on the counter. Both are estimates — measure the real box.' }),
      row('Growth box, reference sheet figure', [330, 310, 20], { status: 'provisional', note: 'The earlier closed-envelope estimate, kept here so the two are not confused.' }),
      row('LOOK CLOSER sign', [210, 148], { status: 'provisional' }),
      row('Counter height', [1000], { status: 'provisional', note: 'Legacy model estimate.' }),
      row('Counter depth', [450], { status: 'provisional', note: 'Legacy model estimate. The 450 × 420 installation cannot achieve a 20 mm margin on it — see the fit report.' }),
      row('Counter length', [3300], { status: 'provisional', note: 'Derived by scaling known objects in the venue photograph — the 337 mm A4 plate and the 450 mm panel both land near 3.0–3.3 m.' }),
    ],
  },
];

export const STILL_TO_MEASURE = [
  'The two general sample boxes',
  'The eight individual Growth samples',
  'The three stools and the bookcase',
  'Counter length and curvature',
  'Banner hardware, including overall stand height',
  'The Growth box, and a footprint check on how its cover opens',
];

export const ANGLE_NOTES = [
  'Both A4 holders and the plain mini sample lean 15° backward.',
  'Translucent slots rotate 20° clockwise in plan.',
];
