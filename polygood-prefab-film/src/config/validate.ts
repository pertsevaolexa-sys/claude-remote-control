import { ASSETS } from "./assets";
import { AUDIO_CUES } from "./audio";
import { LINKEDIN, REELS } from "./layout";
import {
  CHECKLIST,
  DURATION_IN_FRAMES,
  FINISH_TAG,
  FPS,
  S6,
  SCENES,
  SILENT_FROM,
} from "./timing";

// The film's hard timing rules, checked whenever the project loads, so a
// config edit that breaks one fails in Studio and at render time.
const rules: [string, boolean][] = [
  ["Total duration is at most 30 s", DURATION_IN_FRAMES <= 30 * FPS],
  [
    "Scenes are contiguous and fill the timeline",
    Object.values(SCENES).every((s, i, all) =>
      i === 0
        ? s.from === 0
        : s.from === all[i - 1].from + all[i - 1].durationInFrames,
    ) &&
      SCENES.endCard.from + SCENES.endCard.durationInFrames ===
        DURATION_IN_FRAMES,
  ],
  ["Checklist appears with scene 02", CHECKLIST.appear === SCENES.cutting.from],
  [
    "Finish identifier is gone before the logo animation",
    FINISH_TAG.until + FINISH_TAG.fadeOutFrames <= SCENES.endCard.from,
  ],
  [
    "End card plays the whole logo animation",
    SCENES.endCard.durationInFrames === ASSETS.endCardVideo.durationInFrames,
  ],
  [
    "Final second is static",
    S6.staticFrom <= SCENES.endCard.durationInFrames - FPS,
  ],
  [
    "Final 0.5 s is silent",
    SILENT_FROM === DURATION_IN_FRAMES - FPS / 2 &&
      AUDIO_CUES.every((c) => c.from + c.durationInFrames <= SILENT_FROM),
  ],
  ["Reels is 1080 x 1920", REELS.width === 1080 && REELS.height === 1920],
  [
    "LinkedIn is 1080 x 1350",
    LINKEDIN.width === 1080 && LINKEDIN.height === 1350,
  ],
];

const failed = rules.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length > 0) {
  throw new Error(`Timing/format rules broken:\n- ${failed.join("\n- ")}`);
}
