// ---------------------------------------------------------------------------
// The visitor journey, as seven stops on the model.
// ---------------------------------------------------------------------------
// Each stop knows which scene objects it is about, so talking through the
// script and pointing at the thing are the same action: selecting a stop
// frames it, rings it on the counter and lights its numbered marker.
//
// Camera framings are DERIVED from the counter geometry, not hard-coded, so
// they follow the layout if a group moves.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';
import { mm } from './units.js';
import { pointAtMm, phiAtS } from './layout.js';

const L = CONFIG.layout;

/**
 * A camera framing for a point on the counter.
 *   standMm - how far into the room the camera sits
 *   camY    - camera height above the floor
 *   aimY    - what height it looks at
 */
function viewAt(sMm, { standMm, camY, aimY, fov }) {
  const p = pointAtMm(sMm, 0);
  const phi = phiAtS(sMm);
  const nx = -Math.sin(phi);   // unit vector from the counter toward the room
  const nz = Math.cos(phi);
  return {
    pos: [mm(p.x + nx * standMm), mm(camY), mm(p.z + nz * standMm)],
    target: [mm(p.x), mm(aimY), mm(p.z)],
    fov,
  };
}

const bannerS = -(CONFIG.banner.clearanceFromCounterEndMm + CONFIG.banner.artworkWidthMm / 2);
const stoolsS = CONFIG.stools.positionsSMm[1];

export const STOPS = [
  {
    n: 1,
    id: 'banner',
    title: 'The banner',
    subtitle: 'understanding the brand',
    targets: ['roll-up-banner'],
    view: viewAt(bannerS, { standMm: 2500, camY: 1300, aimY: 1050, fov: 46 }),
    body: [
      'The roll-up introduces The Good Plastic Company and its material, Polygood. It establishes the brand through recycled origins, distinctive patterns, fabrication possibilities and recyclability at the end of the material’s useful life.',
      'Its QR code connects visitors to the Polygood website, where they can explore material composition, material health, technical information, certifications, declarations and test reports — the documentation behind the presentation.',
      'It stands on the floor to the LEFT of the counter, outside its footprint.',
    ],
    script: null,
    dims: [['Roll-up graphic', '457.2 × 1122.68 mm', '18 × 44.2 in']],
    links: ['Polygood material information', 'Technical resources'],
    flags: [
      'The QR code is a labelled placeholder — the real artwork never reached this model, and a QR code is not something to invent.',
      'Overall stand height is modelled at 1800 mm from the reference render; the brief states the 1122.68 mm graphic. Confirm which.',
    ],
  },
  {
    n: 2,
    id: 'brochures',
    title: 'Three brochures',
    subtitle: 'making the introduction tangible',
    targets: ['brochures'],
    view: viewAt(L.brochuresSMm, { standMm: 720, camY: 1380, aimY: 1035, fov: 38 }),
    body: [
      'Three general Polygood brochures sit at the beginning of the counter. The representative invites the visitor to pick one up and get acquainted with the wider material range — a reference during the conversation and something to take away.',
      'This is the natural moment to open the conversation.',
    ],
    script: 'What kind of project are you working on?',
    dims: [['Brochures, each — 3', '200 × 200 mm', '7.87 × 7.87 in']],
    links: [],
    flags: ['Cover artwork is a placeholder; paper thickness and the fan offsets are visual assumptions.'],
  },
  {
    n: 3,
    id: 'growth',
    title: 'Growth Collection',
    subtitle: 'connecting design context with physical samples',
    targets: ['growth-a4', 'growth-box'],
    view: viewAt(L.growthSMm, { standMm: 880, camY: 1400, aimY: 1080, fov: 40 }),
    body: [
      'The first landscape A4 introduces the Growth Collection, created with Gensler serving as product design consultant. Its nature-inspired patterns give the design context for the materials on display, and the application renders help visitors picture the material in a designed setting.',
      'An open Growth Collection sample box sits immediately in front of it. The eight samples, in two rows of four, connect those renders with actual colour, texture and surface finish.',
    ],
    script: null,
    dims: [
      ['A4 sheet', '297 × 210 mm', '11.69 × 8.27 in'],
      ['A4 backing plate', '337 × 250 × 19 mm', '13.27 × 9.84 × 0.75 in'],
      ['Triangular rear support', '90 × 70 × 19 mm', '3.54 × 2.76 × 0.75 in'],
      ['Growth box (as modelled)', '320 × 240 × 26 mm', '12.60 × 9.45 × 1.02 in'],
    ],
    links: ['Growth Collection'],
    flags: [
      'The Gensler credit belongs to the Growth Collection — not to every Polygood product, and not to the installation as a whole.',
      'The box size is unconfirmed. This model uses 320 × 240 × 26 mm from the supplied photograph; the reps’ sheet carries an earlier 330 × 310 × 20 estimate. Measure the real box.',
    ],
  },
  {
    n: 4,
    id: 'look-closer',
    title: 'LOOK CLOSER',
    subtitle: 'the main tile demonstration',
    targets: ['look-closer-installation'],
    view: viewAt(L.installationSMm, { standMm: 900, camY: 1430, aimY: 1190, fov: 40 }),
    body: [
      'The central installation presents a vertical 450 × 450 mm Oyster panel. Oyster belongs to the Growth Collection, so visitors now see a different application of a material they have just met.',
      'A four-by-four grid is engraved into it. These divisions are grooves within ONE continuous sheet — not separate tiles with grout. The display shows how a material pattern and a machined surface work together.',
      'The LOOK CLOSER sign sits at the front-left of the base, putting the invitation beside the handling sample. At the front-right is the removable, plain, unengraved Oyster sample, in portrait.',
      'The large-panel approach reduces the number of separate pieces to install and avoids grout within the machined pattern. The 450 mm piece is a demonstration: the published Oyster production panel is 2800 × 1400 mm.',
    ],
    script: 'Pick up the sample and feel the material. Now look at how the same material changes when a pattern is machined into its surface.',
    dims: [
      ['Oyster panel', '450 × 450 × 12 mm', '17.72 × 17.72 × 0.47 in'],
      ['Installation base', '450 × 420 × 19 mm', '17.72 × 16.54 × 0.75 in'],
      ['Plain portrait sample', '120 × 180 × 12 mm', '4.72 × 7.09 × 0.47 in'],
      ['Engraved groove', '4 × 3 mm', '0.16 × 0.12 in'],
      ['Height above counter', '464 mm', '18.27 in'],
      ['Production panel (context)', '2800 × 1400 mm', '110.24 × 55.12 in'],
    ],
    links: ['Oyster', 'Polygood Wall Tiles', 'Oyster specifications'],
    dont: 'Do not promise that Polygood outlasts ceramic — there is no comparative evidence here. The supported story is the large-format machined panel and reduced grout-related upkeep.',
    flags: [
      'Panel thickness: the drawing and its 12.1 mm slot say 12 mm, the cut list says 19 mm. Modelled at 12 mm; a 19 mm panel cannot enter that slot.',
      'The mini-sample slot was drawn for a LANDSCAPE 180 × 120 sample. The portrait sample is centred in it, 35 mm open at each end. Review before fabrication.',
      'The 450 × 420 base cannot hold a 20 mm margin on the provisional 450 mm counter — 13 mm is the best available. Measure the counter.',
    ],
  },
  {
    n: 5,
    id: 'engraved-samples',
    title: 'Six engraved samples',
    subtitle: 'expanding the possibilities',
    targets: ['engraved-samples', 'general-sample-boxes'],
    view: viewAt(L.tilesSMm, { standMm: 820, camY: 1460, aimY: 1045, fov: 42 }),
    body: [
      'Six engraved samples continue the tile story beyond the Oyster installation, in two rows of three so visitors can compare materials and engraved details without crowding the counter.',
      'The representative explains how a different material pattern or engraving changes the result, then relates those options to the visitor’s project.',
      'The black and grey general sample boxes stand behind them, broadening the conversation to the wider Polygood palette.',
    ],
    script: null,
    dims: [
      ['Engraved samples, each — 6', '180 × 120 × 12 mm', '7.09 × 4.72 × 0.47 in'],
      ['Group footprint', '580 × 260 mm', '22.83 × 10.24 in'],
      ['Gap between samples', '20 mm', '0.79 in'],
    ],
    links: [],
    flags: [
      'The six finishes are a provisional assortment — the real six were never identified.',
      'General sample box dimensions still need confirmation; their construction follows the supplied product photographs.',
    ],
  },
  {
    n: 6,
    id: 'translucent',
    title: 'Translucent Collection',
    subtitle: 'finishing with light and colour',
    targets: ['translucent-block', 'translucent-a4'],
    view: viewAt(L.translucentBlockSMm, { standMm: 700, camY: 1330, aimY: 1090, fov: 38 }),
    body: [
      'The final material stop introduces translucency. Ten samples stand in a purpose-made, unbranded black block, with the second landscape A4 behind them.',
      'The collection uses recycled CD cases for its clear base, with colour and inclusions creating different effects. Light reveals depth and small internal bubbles; backlighting makes those qualities more pronounced — the windows right behind the block do exactly that.',
      'This closes the journey with one more possibility: after colour, texture and engraving, what the material does with light.',
    ],
    script: null,
    dims: [
      ['Block', '300 × 80 × 80 mm', '11.81 × 3.15 × 3.15 in'],
      ['Samples, each — 10', '60 × 120 × 12 mm', '2.36 × 4.72 × 0.47 in'],
      ['Visible above block', '90 mm', '3.54 in'],
      ['Overall display height', '170 mm', '6.69 in'],
    ],
    links: ['Translucent Collection'],
    flags: [
      'The block carries no branding, as specified.',
      'The 20° slot rotation has no stated datum. Measured from the block width the slots would overlap and could not be cut; the buildable reading is modelled. Confirm against the drawing.',
      'An 80 mm block is not one part from 19 mm sheet — a laminated or constructed body still has to be resolved.',
    ],
  },
  {
    n: 7,
    id: 'representatives',
    title: 'Representatives',
    subtitle: 'turning discovery into a conversation',
    targets: ['stools'],
    view: viewAt(stoolsS, { standMm: 2300, camY: 1560, aimY: 820, fov: 48 }),
    body: [
      'Three tall black stools are grouped at the right end, on the room side of the counter. They give the representatives somewhere to sit while staying available to visitors and close enough to stand and demonstrate the samples.',
      'Their placement keeps the central installation accessible. The existing narrow curved counter and right-hand bookcase keep the character of the actual office.',
    ],
    script: 'Which material or application would you like to explore further?',
    dims: [],
    links: [],
    flags: [
      'Stool spacing is a layout assumption, not a statutory clearance.',
      'The counter is about 3.3 m. The display run needs about 3.1 m and three stools about 1.3 m of frontage, so they cannot both have their own stretch — lengthen the counter, drop to two stools, or accept the photograph’s arrangement.',
    ],
  },
];

export const JOURNEY_INTRO = 'This installation guides visitors from discovering Polygood to understanding how they could use it in a project. Tiles are the central focus; the Growth Collection introduces Gensler’s contribution as product design consultant; the Oyster installation connects the two by showing how a collection material becomes an engraved architectural surface.';
