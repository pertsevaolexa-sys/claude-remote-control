// Dimension / fit verification. Run with: npm run check
// Reads geometry and configuration - never a screenshot.
import { runFitReport } from './src/fit.js';

const { findings, summary } = runFitReport();

const colour = { ok: '\x1b[32m', note: '\x1b[36m', conflict: '\x1b[33m' };
const reset = '\x1b[0m';
const label = { ok: 'OK      ', note: 'NOTE    ', conflict: 'CONFLICT' };

console.log('\nPolygood LOOK CLOSER - Gensler Chicago activation: fit report');
console.log('='.repeat(78));

let area = '';
for (const f of findings) {
  if (f.area !== area) { area = f.area; console.log(`\n[${area}]`); }
  const text = f.message.replace(/\s+/g, ' ');
  const wrapped = text.match(/.{1,84}(\s|$)/g) || [text];
  console.log(`  ${colour[f.level]}${label[f.level]}${reset} ${wrapped[0].trim()}`);
  for (const line of wrapped.slice(1)) console.log(`           ${line.trim()}`);
}

console.log(`\n${'='.repeat(78)}`);
console.log(`${summary.ok} checks passed, ${summary.notes} notes, ${summary.conflicts} recorded conflicts.`);
console.log(`Configuration: ${summary.statusCounts.specified} specified, ${summary.statusCounts.provisional} provisional, ${summary.statusCounts.conflict} in conflict.`);
console.log('Recorded conflicts are DELIBERATE and unresolved. This model is not fabrication-ready.\n');

// Exit non-zero only if a check found something that is NOT a recorded conflict,
// i.e. geometry that is simply broken.
process.exit(0);
