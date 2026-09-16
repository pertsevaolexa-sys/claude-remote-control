// ---------------------------------------------------------------------------
// Write JOURNEY.md from the same data the model uses.
//   npm run docs
// The representatives' sheet and the 3-D model cannot drift apart, because
// there is only one copy of the journey text and one copy of the dimensions.
// ---------------------------------------------------------------------------

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STOPS, JOURNEY_INTRO } from './src/journey.js';
import { DIMENSION_TABLES, STILL_TO_MEASURE, ANGLE_NOTES } from './src/dimensions.js';
import { CONFLICTS } from './src/config.js';

const root = dirname(fileURLToPath(import.meta.url));
const out = [];
const w = (...lines) => out.push(...lines);

w('# Polygood — LOOK CLOSER: A Material Journey', '');
w('The representatives\' sheet. Every stop below is a numbered marker in the 3-D',
  'model: open the model, press **▶** or click the marker, and the camera frames',
  'exactly what this section describes.', '');
w('> Generated from the model by `npm run docs`. Edit `src/journey.js` and',
  '> `src/dimensions.js`, never this file — that is what keeps the sheet and the',
  '> model saying the same thing.', '');
w(JOURNEY_INTRO, '');
w('The journey moves left to right: the banner, brochures, Growth Collection,',
  'LOOK CLOSER installation, engraved samples, the Translucent Collection, and',
  'finally the conversation area.', '');
w('---', '');

for (const stop of STOPS) {
  w(`## ${stop.n}. ${stop.title} — ${stop.subtitle}`, '');
  w(`*Model marker **${stop.n}**. Points at: ${stop.targets.map((t) => `\`${t}\``).join(', ')}.*`, '');
  for (const p of stop.body) w(p, '');
  if (stop.script) w(`**The representative says:** “${stop.script}”`, '');
  if (stop.dont) w(`**Careful:** ${stop.dont}`, '');
  if (stop.dims.length) {
    w('| | Millimetres | Inches |', '|---|---|---|');
    for (const [label, mm, inch] of stop.dims) w(`| ${label} | ${mm} | ${inch} |`);
    w('');
  }
  if (stop.links.length) {
    w(`**Reference pages:** ${stop.links.join(' · ')} — *URLs to be supplied.*`, '');
  }
  if (stop.flags.length) {
    w('**Still open:**', '');
    for (const f of stop.flags) w(`- ${f}`);
    w('');
  }
  w('---', '');
}

w('# Dimensions reference', '');
w('Millimetres are the source of truth, as the brief instructs. Centimetres and',
  'inches are computed from them at 1 in = 25.4 mm exactly, so the three columns',
  'cannot disagree. **Model from the millimetre values.**', '');

for (const table of DIMENSION_TABLES) {
  w(`## ${table.title}`, '', `*${table.caption}*`, '');
  w('| Item | Millimetres | Centimetres | Inches |', '|---|---|---|---|');
  for (const r of table.rows) {
    const mark = { conflict: ' ⚠', provisional: ' ~', context: ' ·' }[r.status] || '';
    const label = (r.count ? `${r.label} — ${r.count}` : r.label) + mark;
    w(`| ${label} | ${r.mmText} | ${r.cmText} | ${r.inText} |`);
  }
  w('');
  const notes = table.rows.filter((r) => r.note);
  if (notes.length) {
    for (const r of notes) w(`- **${r.label}.** ${r.note}`);
    w('');
  }
}

w('⚠ sources disagree · ~ provisional estimate · · published figure, context only', '');
w('## Angles', '');
for (const a of ANGLE_NOTES) w(`- ${a}`);
w('');
w('## Still to measure', '');
for (const m of STILL_TO_MEASURE) w(`- ${m}`);
w('');
w('## Conflicts to resolve before anything is made', '');
for (const c of CONFLICTS) {
  w(`### ${c.title}`, '', c.detail, '', `**Decision in the model:** ${c.decision}`, '');
}
w('---', '');
w('**This is a spatial prototype, not a fabrication set.** Run `npm run check`',
  'for the full fit report against the geometry.', '');

await writeFile(join(root, 'JOURNEY.md'), `${out.join('\n')}\n`);
console.log(`JOURNEY.md written — ${STOPS.length} stops, ${DIMENSION_TABLES.reduce((n, t) => n + t.rows.length, 0)} dimension rows`);
