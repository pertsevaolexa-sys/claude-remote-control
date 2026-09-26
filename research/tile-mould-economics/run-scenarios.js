#!/usr/bin/env node
// Prints the scenario tables quoted in the research page.
// Usage: node run-scenarios.js [--json]
'use strict';

const M = require('./model.js');

const round = (x, d = 0) => Number(x.toFixed(d));
const money = (sym, x) => `${sym}${Math.round(x).toLocaleString('en-US')}`;

function geometry() {
  return Object.entries(M.FORMATS).map(([key, f]) => ({
    key,
    format: f.label,
    jointMetresPerM2: round(M.jointLengthPerM2(f), 1),
    groutSharePct: round(M.groutAreaShare(f) * 100, 1),
    groutMetresIn6m2: round(M.jointLengthPerM2(f) * 6, 0),
  }));
}

function chemistry() {
  const rows = [];
  for (const vent of Object.keys(M.VENTILATION)) {
    for (const format of ['mosaic', 'metro', 'classic', 'medium', 'large']) {
      const res = M.compute({ ventilation: vent, format });
      const tile = res.options[0];
      rows.push({
        ventilation: vent,
        format: tile.formatLabel,
        treatmentsPerYear: tile.physical.treatmentsPerYear,
        sprayLPerYear: round(tile.physical.sprayLPerYear, 1),
        bottlesPerYear: round(tile.physical.bottlesPerYear, 1),
        hypochloriteGPerYear: round(tile.physical.hypochloriteGPerYear, 0),
        minutesPerTreatment: round(tile.physical.minutesPerTreatment, 0),
        hoursPerYear: round(tile.physical.hoursPerYear, 1),
      });
    }
  }
  return rows;
}

function totals(region, ventilation, extra = {}) {
  const res = M.compute(Object.assign({ region, ventilation }, extra));
  const sym = res.region.symbol;
  return res.options.map((o) => ({
    region,
    ventilation,
    option: o.label,
    install: money(sym, o.costs.install),
    chemicals: money(sym, o.costs.chemicals),
    sealing: money(sym, o.costs.sealing),
    silicone: money(sym, o.costs.silicone),
    regrouting: money(sym, o.costs.regrouting),
    replacement: money(sym, o.costs.replacement),
    time: money(sym, o.costs.time),
    cash: money(sym, o.cash),
    total: money(sym, o.total),
    upkeepPerYear: money(sym, o.upkeepPerYear),
    hoursTotal: round(o.physical.hoursTotal, 0),
    sprayL: round(o.physical.sprayLTotal, 1),
    raw: { cash: o.cash, total: o.total, install: o.install },
  }));
}

function breakEven(region, ventilation, a = 'tile_cement', b = 'panels', key = 'cumulative') {
  const res = M.compute({ region, ventilation });
  const A = res.options.find((o) => o.id === a)[key];
  const B = res.options.find((o) => o.id === b)[key];
  // First year in which the cheaper-to-install option stops being the cheaper one overall.
  for (let t = 0; t < A.length; t++) if (Math.sign(A[t] - B[t]) !== Math.sign(A[0] - B[0])) return t;
  return null;
}

function toMarkdown(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]).filter((c) => c !== 'raw');
  const head = `| ${cols.join(' | ')} |\n| ${cols.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${cols.map((c) => r[c]).join(' | ')} |`).join('\n');
  return `${head}\n${body}`;
}

const out = {
  geometry: geometry(),
  chemistry: chemistry(),
  totals: {},
  ventilationPayback: {},
  breakEvenPanelsVsTiles: {},
};
for (const region of Object.keys(M.REGIONS)) {
  out.totals[region] = {};
  for (const vent of Object.keys(M.VENTILATION)) out.totals[region][vent] = totals(region, vent);
  out.ventilationPayback[region] = M.ventilationPayback({ region });
  out.breakEvenPanelsVsTiles[region] = Object.fromEntries(
    Object.keys(M.VENTILATION).map((v) => [v, breakEven(region, v)]),
  );
}
// Highest installed panel price per m² at which panels still beat tiles + cement grout on cash.
function panelPriceCeiling(region, ventilation) {
  const res = M.compute({ region, ventilation, countTime: false });
  const tile = res.options.find((o) => o.id === 'tile_cement');
  const panel = res.options.find((o) => o.id === 'panels');
  const upkeepGap = (tile.cash - tile.costs.install) - (panel.cash - panel.costs.install - panel.costs.replacement);
  return round((tile.costs.install + upkeepGap) / res.params.wetZoneM2, 0);
}

// Year in which epoxy's higher price is recovered (cumulative cost incl. time).
function epoxyPayback(region, ventilation, countTime = true) {
  const res = M.compute({ region, ventilation, countTime });
  const cement = res.options.find((o) => o.id === 'tile_cement').cumulative;
  const epoxy = res.options.find((o) => o.id === 'tile_epoxy').cumulative;
  for (let t = 0; t < cement.length; t++) if (epoxy[t] <= cement[t]) return t;
  return null;
}

out.robustness = {};
for (const region of Object.keys(M.REGIONS)) {
  out.robustness[region] = {
    panelPriceCeilingPerM2: Object.fromEntries(Object.keys(M.VENTILATION).map((v) => [v, panelPriceCeiling(region, v)])),
    epoxyPaybackYearWithTime: Object.fromEntries(Object.keys(M.VENTILATION).map((v) => [v, epoxyPayback(region, v)])),
    epoxyPaybackYearCashOnly: Object.fromEntries(Object.keys(M.VENTILATION).map((v) => [v, epoxyPayback(region, v, false)])),
    horizon30: totals(region, 'average', { horizonYears: 30 }).map((r) => ({ option: r.option, cash: r.cash, total: r.total })),
  };
}

out.cashOnly = Object.fromEntries(
  Object.keys(M.REGIONS).map((region) => [region, totals(region, 'average', { countTime: false })]),
);
out.diy = Object.fromEntries(
  Object.keys(M.REGIONS).map((region) => [region, totals(region, 'average', { diySilicone: true })]),
);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log('## Grout geometry\n');
  console.log(toMarkdown(out.geometry));
  console.log('\n## Mould spray and scrubbing, 6 m² wet zone\n');
  console.log(toMarkdown(out.chemistry));
  for (const region of Object.keys(M.REGIONS)) {
    for (const vent of Object.keys(M.VENTILATION)) {
      console.log(`\n## 20-year cost, ${region}, ${vent} ventilation\n`);
      console.log(toMarkdown(out.totals[region][vent]));
    }
    console.log(`\n## ${region}: cash only (time not counted), average ventilation\n`);
    console.log(toMarkdown(out.cashOnly[region]));
    console.log(`\n## ${region}: DIY silicone, average ventilation\n`);
    console.log(toMarkdown(out.diy[region]));
  }
  console.log('\n## Ventilation payback (tiles + cement grout, poor -> good)\n');
  console.log(JSON.stringify(out.ventilationPayback, null, 2));
  console.log('\n## Break-even year, panels vs tiles (cumulative incl. time)\n');
  console.log(JSON.stringify(out.breakEvenPanelsVsTiles, null, 2));
  console.log('\n## Robustness\n');
  console.log(JSON.stringify(out.robustness, null, 2));
}
