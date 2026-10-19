import { Audio } from "@remotion/media";
import React from "react";
import { Sequence, staticFile } from "remotion";
import { AUDIO_CUES, VOICEOVER } from "../config/audio";
import { SILENT_FROM } from "../config/timing";

// Fail loudly if a cue would sound in the final half second (the loop point).
for (const cue of AUDIO_CUES) {
  if (cue.from + cue.durationInFrames > SILENT_FROM) {
    throw new Error(
      `Audio cue "${cue.id}" runs past frame ${SILENT_FROM}; the last 0.5 s must be silent.`,
    );
  }
}

export const Soundtrack: React.FC = () => (
  <>
    {AUDIO_CUES.map((cue) => (
      <Sequence
        key={cue.id}
        name={`Audio: ${cue.id}`}
        from={cue.from}
        durationInFrames={cue.durationInFrames}
        layout="none"
      >
        <Audio src={staticFile(cue.src)} volume={cue.volume} />
      </Sequence>
    ))}
    {VOICEOVER ? (
      <Sequence
        name="Voice-over"
        from={VOICEOVER.from}
        durationInFrames={SILENT_FROM - VOICEOVER.from}
        layout="none"
      >
        <Audio src={staticFile(VOICEOVER.src)} volume={VOICEOVER.volume} />
      </Sequence>
    ) : null}
  </>
);
