// Unit handling for the Gensler Chicago activation model.
//
// Every source dimension in config.js is stored in millimetres, exactly as it
// appears in the brief, the holder PDF or the venue photograph. This module is
// the ONLY place millimetres are converted into scene units.
//
// Scene convention: one world unit = one metre (three.js).

export const MM_PER_M = 1000;

/** Convert a millimetre source dimension into scene units (metres). */
export function mm(value) {
  return value / MM_PER_M;
}

/** Degrees to radians, for lean/rotation parameters quoted in degrees. */
export function deg(value) {
  return (value * Math.PI) / 180;
}

/** Inches to millimetres, used only to show the banner derivation. */
export function inchToMm(value) {
  return value * 25.4;
}
