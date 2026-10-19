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

// The brief's hard timing rules, checked whenever the project loads, so a
// config edit that breaks one fails in Studio and at render time.
const rules: [string, boolean][] = [
  ["Total duration is exactly 15 s", DURATION_IN_FRAMES === 15 * FPS],
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
  ["Checklist appears at exactly 2.0 s", CHECKLIST.appear === 2 * FPS],
  [
    "Finish identifier stays until 12.5 s",
    FINISH_TAG.from === 0 && FINISH_TAG.until === 12.5 * FPS,
  ],
  [
    "End card occupies the final 2.5 s",
    SCENES.endCard.from === 12.5 * FPS &&
      SCENES.endCard.durationInFrames === 2.5 * FPS,
  ],
  [
    "End card is static for the final second",
    SCENES.endCard.from + S6.staticFrom <= DURATION_IN_FRAMES - FPS,
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
