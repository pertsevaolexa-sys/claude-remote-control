import React from "react";
import { Composition, Folder, Still } from "remotion";
import { ThanksgivingReel } from "./ThanksgivingReel";
import { TableScene } from "./scenes/TableScene";
import { ChefsScene } from "./scenes/ChefsScene";
import { EndCard } from "./scenes/EndCard";
import { Cover } from "./Cover";

// Instagram Reel: 1080 x 1920, 30 fps.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="ThanksgivingReel"
      component={ThanksgivingReel}
      durationInFrames={726}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ sfx: true }}
    />
    <Still id="ReelCover" component={Cover} width={1080} height={1920} />
    <Folder name="Scenes">
      <Composition
        id="Table"
        component={TableScene}
        durationInFrames={548}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ sfx: true }}
      />
      <Composition id="Chefs" component={ChefsScene} durationInFrames={108} fps={30} width={1080} height={1920} />
      <Composition id="EndCard" component={EndCard} durationInFrames={96} fps={30} width={1080} height={1920} />
    </Folder>
  </>
);
