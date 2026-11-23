import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { TableScene } from "./scenes/TableScene";
import { ChefsScene } from "./scenes/ChefsScene";
import { EndCard } from "./scenes/EndCard";

export type ReelProps = { sfx: boolean };

// 548 + 108 + 96 frames, minus two crossfades (14 + 12) = 726 frames, 24.2 s
export const ThanksgivingReel: React.FC<ReelProps> = ({ sfx }) => (
  <TransitionSeries>
    <TransitionSeries.Sequence name="Table" durationInFrames={548}>
      <TableScene sfx={sfx} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />
    <TransitionSeries.Sequence name="Chefs" durationInFrames={108}>
      <ChefsScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 12 })} />
    <TransitionSeries.Sequence name="End card" durationInFrames={96}>
      <EndCard />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
