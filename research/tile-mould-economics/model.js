/*
 * Lifecycle cost model for the steamy "wet zone" of a bathroom (the shower or
 * tub-surround walls): tiles with grout versus grout-free alternatives.
 *
 * Money is in the region's currency at today's prices. The same file runs in
 * the research page (window.TileMouldModel) and in Node (run-scenarios.mjs).
 * Every number that is an assumption rather than a sourced price is marked
 * "assumption" so it can be challenged in the page's advanced settings.
 */
(function (root) {
  'use strict';

  // Tile formats: a × b in metres, joint width w in metres.
  const FORMATS = {
    mosaic:  { label: 'Mosaic 5×5 cm',    a: 0.05,  b: 0.05, w: 0.002 },
    metro:   { label: 'Metro 7.5×15 cm',  a: 0.075, b: 0.15, w: 0.002 },
    classic: { label: 'Classic 20×25 cm', a: 0.20,  b: 0.25, w: 0.002 },
    medium:  { label: '30×60 cm',         a: 0.30,  b: 0.60, w: 0.003 },
    large:   { label: '60×120 cm',        a: 0.60,  b: 1.20, w: 0.002 },
    slab:    { label: 'Slab 120×260 cm',  a: 1.20,  b: 2.60, w: 0.002 },
  };

  // Metres of grout joint per m² of wall, and the share of the wall that is grout.
  function jointLengthPerM2(f) { return 1 / (f.a + f.w) + 1 / (f.b + f.w); }
  function groutAreaShare(f) { return 1 - (f.a * f.b) / ((f.a + f.w) * (f.b + f.w)); }
  const CLASSIC_JOINTS = jointLengthPerM2(FORMATS.classic);

  // Ventilation sets how often mould returns and how long joints last (assumption,
  // anchored to trade guidance: grout 8–15 years, silicone 1–2 years when badly
  // ventilated and 5–10 years when not, grout sealer renewed every 1–2 years).
  const VENTILATION = {
    poor:    { label: 'Poor: no fan, or fan never used',             treatmentsPerYear: 26, siliconeLifeYears: 2, groutLifeYears: 8,  sealEveryYears: 1 },
    average: { label: 'Average: fan or window, used some of the time', treatmentsPerYear: 12, siliconeLifeYears: 5, groutLifeYears: 12, sealEveryYears: 1 },
    good:    { label: 'Good: fan runs 20+ min after every shower, walls squeegeed', treatmentsPerYear: 4, siliconeLifeYears: 8, groutLifeYears: 16, sealEveryYears: 2 },
  };

  // Prices gathered September 2026 (see the Sources section of the page).
  const REGIONS = {
    eu: {
      label: 'Germany / EU', symbol: '€',
      // Installed price per m² of shower wall, incl. waterproofing membrane.
      installPerM2: { mosaic: 212, metro: 167, classic: 142, medium: 150, large: 185, slab: 300 },
      epoxyExtraPerM2: 15,     // epoxy vs cement joints, for a classic joint density
      panelPerM2: 110,         // laminate / acrylic wall panels, fitted
      pvcPerM2: 50,            // budget PVC cladding, fitted
      panelLifeYears: 25,
      sprayPricePerL: 8,       // chlorine mould spray, €4–24 per litre on shelf
      sealerPerSession: 10,    // grout impregnation, 250 ml bottle
      siliconePerM: 12, siliconeMinJob: 150, siliconeDiyMaterials: 20,
      regroutPerM2: 22, regroutMinJob: 300,
      timeRate: 17,            // hourly pay of a cleaner
      fanUpgrade: 300, fanRunningPerYear: 12,
    },
    uk: {
      label: 'United Kingdom', symbol: '£',
      installPerM2: { mosaic: 170, metro: 135, classic: 112, medium: 118, large: 150, slab: 250 },
      epoxyExtraPerM2: 15,
      panelPerM2: 80,
      pvcPerM2: 40,
      panelLifeYears: 25,
      sprayPricePerL: 6,
      sealerPerSession: 10,
      siliconePerM: 12, siliconeMinJob: 150, siliconeDiyMaterials: 15,
      regroutPerM2: 25, regroutMinJob: 250,
      timeRate: 18,
      fanUpgrade: 250, fanRunningPerYear: 10,
    },
    us: {
      label: 'United States', symbol: '$',
      // $25/sq ft for a classic tiled shower wall = $269/m².
      installPerM2: { mosaic: 377, metro: 301, classic: 269, medium: 280, large: 344, slab: 807 },
      epoxyExtraPerM2: 54,
      panelPerM2: 194,         // acrylic / composite surround, ~$18/sq ft
      pvcPerM2: 86,
      panelLifeYears: 20,
      sprayPricePerL: 5.8,     // Tilex 32 oz at $5.48
      sealerPerSession: 15,
      siliconePerM: 20, siliconeMinJob: 150, siliconeDiyMaterials: 20,
      regroutPerM2: 183, regroutMinJob: 600,
      timeRate: 35,
      fanUpgrade: 400, fanRunningPerYear: 10,
    },
  };

  const OPTIONS = [
    { id: 'tile_cement',  label: 'Your tiles, cement grout',   kind: 'tile', grout: 'cement' },
    { id: 'tile_epoxy',   label: 'Your tiles, epoxy grout',    kind: 'tile', grout: 'epoxy' },
    { id: 'large_cement', label: '60×120 tiles, cement grout', kind: 'tile', grout: 'cement', format: 'large' },
    { id: 'panels',       label: 'Waterproof wall panels',     kind: 'panel' },
    { id: 'pvc',          label: 'Budget PVC panels',          kind: 'pvc' },
  ];

  const DEFAULTS = {
    region: 'eu',
    format: 'classic',
    ventilation: 'average',
    wetZoneM2: 6,              // 90×90 shower, 3 walls to 2.2 m, or a 5 ft tub surround
    horizonYears: 20,          // bathrooms are renovated roughly every 16–20 years
    discountRate: 0,
    countTime: true,
    diySilicone: false,
    // Chemistry (assumptions anchored to product labels: 30–200 ml/m²).
    sprayDoseMlPerM2: 40,
    sprayBandM: 0.10,          // a spray pass along a joint wets a ~10 cm band
    hypochloritePct: 2.5,      // SDS range 1–5 %, Cillit Bang ~2.2–2.6 %
    sprayDensity: 1.05,        // kg per litre
    bottleMl: 750,
    // Joints and labour (assumptions).
    siliconeLenTileM: 9,       // corners, tray edge and screen edges
    siliconeLenPanelM: 11,     // same plus panel-to-panel seams
    siliconeDiyHoursPerM: 0.3,
    scrubMetresPerMin: 3,
    setupMinPerTreatment: 5,
    // Silicone seams are treated at every session whatever the wall is made of.
    // Epoxy joints are non-porous, so mould stays on the surface: they need the
    // spray half as often and scrub twice as fast (assumption).
    epoxyGroutFactor: 0.5,
    epoxyScrubSpeedFactor: 2,
    tileLifeYears: 50,
    pvcLifeYears: 10,
  };

  function periodicEvents(interval, horizon) {
    const out = [];
    if (!(interval > 0)) return out;
    for (let t = interval; t < horizon - 1e-9; t += interval) out.push(t);
    return out;
  }

  // Region prices and ventilation settings, with any user overrides applied.
  function resolveInputs(p) {
    const base = REGIONS[p.region];
    const over = p.regionOverrides || {};
    const r = Object.assign({}, base, over);
    r.installPerM2 = Object.assign({}, base.installPerM2, over.installPerM2 || {});
    const v = Object.assign({}, VENTILATION[p.ventilation], p.ventilationOverrides || {});
    return { r, v };
  }

  function computeOption(opt, p) {
    const { r, v } = resolveInputs(p);
    const area = p.wetZoneM2;
    const years = p.horizonYears;
    const disc = (t) => Math.pow(1 + p.discountRate, -t);

    const isTile = opt.kind === 'tile';
    const epoxy = opt.grout === 'epoxy';
    const formatKey = opt.format || p.format;
    const f = FORMATS[formatKey];
    const joints = isTile ? jointLengthPerM2(f) : 0;
    const groutMetres = joints * area;
    const siliconeMetres = isTile ? p.siliconeLenTileM : p.siliconeLenPanelM;
    const densityRatio = joints / CLASSIC_JOINTS;

    // Up-front price and replacements inside the horizon.
    let install;
    let life;
    if (isTile) {
      install = r.installPerM2[formatKey] * area;
      if (epoxy) install += r.epoxyExtraPerM2 * area * Math.max(0.3, densityRatio);
      life = p.tileLifeYears;
    } else if (opt.kind === 'panel') {
      install = r.panelPerM2 * area;
      life = r.panelLifeYears;
    } else {
      install = r.pvcPerM2 * area;
      life = p.pvcLifeYears;
    }
    const replacementYears = periodicEvents(life, years);

    // Mould treatments: how many, how much spray, how long. Every session covers
    // the silicone seams; tiles add their grout joints on top.
    const treatmentsPerYear = v.treatmentsPerYear;
    const groutFactor = isTile ? (epoxy ? p.epoxyGroutFactor : 1) : 0;
    const gridShare = isTile ? Math.min(1, joints * p.sprayBandM) : 0;
    const treatedM2 = area * gridShare * groutFactor + siliconeMetres * p.sprayBandM;
    const sprayLPerYear = (treatmentsPerYear * treatedM2 * p.sprayDoseMlPerM2) / 1000;
    const hypochloriteGPerYear = sprayLPerYear * p.sprayDensity * 1000 * (p.hypochloritePct / 100);
    const bottlesPerYear = (sprayLPerYear * 1000) / p.bottleMl;
    const groutScrubSpeed = p.scrubMetresPerMin * (epoxy ? p.epoxyScrubSpeedFactor : 1);
    const minutesPerTreatment = p.setupMinPerTreatment
      + (groutMetres * groutFactor) / groutScrubSpeed
      + siliconeMetres / p.scrubMetresPerMin;
    const treatmentHoursPerYear = (treatmentsPerYear * minutesPerTreatment) / 60;

    // Grout sealing: cement grout only.
    const sealYears = isTile && !epoxy ? periodicEvents(v.sealEveryYears, years) : [];
    const sealCost = r.sealerPerSession * Math.max(0.3, densityRatio);
    const sealHours = (10 + groutMetres / 6) / 60;

    // Silicone renewal: every option has silicone seams.
    const siliconeYears = periodicEvents(v.siliconeLifeYears, years);
    const siliconeCost = p.diySilicone
      ? r.siliconeDiyMaterials
      : Math.max(r.siliconeMinJob, r.siliconePerM * siliconeMetres);
    const siliconeHours = p.diySilicone ? siliconeMetres * p.siliconeDiyHoursPerM : 0;

    // Regrouting: cement grout only (epoxy outlives a 20–30 year horizon).
    const regroutYears = isTile && !epoxy ? periodicEvents(v.groutLifeYears, years) : [];
    const regroutCost = Math.max(r.regroutMinJob, r.regroutPerM2 * area * (0.4 + 0.6 * densityRatio));

    const timeRate = p.countTime ? r.timeRate : 0;
    const costs = { install, replacement: 0, chemicals: 0, sealing: 0, silicone: 0, regrouting: 0, time: 0 };
    const hours = { treatments: 0, sealing: 0, silicone: 0 };
    const yearly = new Array(years + 1).fill(0);
    yearly[0] = install;

    for (let t = 1; t <= years; t++) {
      const d = disc(t);
      const chem = sprayLPerYear * r.sprayPricePerL * d;
      const scrub = treatmentHoursPerYear * timeRate * d;
      costs.chemicals += chem;
      costs.time += scrub;
      hours.treatments += treatmentHoursPerYear;
      yearly[t] += chem + scrub;
    }
    const addEvent = (t, key, cash, eventHours, hoursKey) => {
      const d = disc(t);
      const timeCost = eventHours * timeRate * d;
      costs[key] += cash * d;
      costs.time += timeCost;
      if (hoursKey) hours[hoursKey] += eventHours;
      yearly[Math.ceil(t)] += cash * d + timeCost;
    };
    replacementYears.forEach((t) => addEvent(t, 'replacement', install, 0));
    sealYears.forEach((t) => addEvent(t, 'sealing', sealCost, sealHours, 'sealing'));
    siliconeYears.forEach((t) => addEvent(t, 'silicone', siliconeCost, siliconeHours, 'silicone'));
    regroutYears.forEach((t) => addEvent(t, 'regrouting', regroutCost, 0));

    const cumulative = [];
    yearly.reduce((sum, x, i) => (cumulative[i] = sum + x), 0);
    const cash = costs.install + costs.replacement + costs.chemicals + costs.sealing + costs.silicone + costs.regrouting;
    const total = cash + costs.time;
    const upkeep = total - costs.install;

    return {
      id: opt.id,
      label: opt.label,
      formatLabel: isTile ? f.label : null,
      costs,
      cash,
      total,
      upkeep,
      upkeepPerYear: upkeep / years,
      perM2PerYear: total / area / years,
      cumulative,
      physical: {
        groutMetres,
        siliconeMetres,
        groutAreaShare: isTile ? groutAreaShare(f) : 0,
        treatmentsPerYear,
        sprayLPerYear,
        sprayLTotal: sprayLPerYear * years,
        bottlesPerYear,
        bottlesTotal: bottlesPerYear * years,
        hypochloriteGPerYear,
        hypochloriteKgTotal: (hypochloriteGPerYear * years) / 1000,
        minutesPerTreatment,
        hoursTotal: hours.treatments + hours.sealing + hours.silicone,
        hoursPerYear: (hours.treatments + hours.sealing + hours.silicone) / years,
      },
      events: {
        replacements: replacementYears.length,
        sealings: sealYears.length,
        siliconeRenewals: siliconeYears.length,
        regroutings: regroutYears.length,
      },
    };
  }

  function compute(input) {
    const p = Object.assign({}, DEFAULTS, input || {});
    const { r, v } = resolveInputs(p);
    return {
      params: p,
      region: r,
      ventilation: v,
      options: OPTIONS.map((opt) => computeOption(opt, p)),
    };
  }

  // What does fixing the ventilation buy, for the tiles-with-cement-grout option?
  function ventilationPayback(input) {
    const base = Object.assign({}, DEFAULTS, input || {});
    const r = REGIONS[base.region];
    const tile = (vent) => compute(Object.assign({}, base, { ventilation: vent })).options[0];
    const poor = tile('poor');
    const good = tile('good');
    const fanCost = r.fanUpgrade + r.fanRunningPerYear * base.horizonYears;
    return {
      poorTotal: poor.total,
      goodTotal: good.total,
      fanCost,
      netSaving: poor.total - good.total - fanCost,
    };
  }

  const api = {
    FORMATS, VENTILATION, REGIONS, OPTIONS, DEFAULTS,
    jointLengthPerM2, groutAreaShare, compute, ventilationPayback,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TileMouldModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
