import React from "react";
import { Composition, Folder } from "remotion";
import { InstagramReel } from "./compositions/InstagramReel";
import { LinkedInVideo } from "./compositions/LinkedInVideo";
import { SCENE_LIST } from "./compositions/PolygoodFilm";
import { LayoutProvider } from "./components/LayoutContext";
import { LINKEDIN, REELS } from "./config/layout";
import { DURATION_IN_FRAMES, FPS, SCENES } from "./config/timing";
import "./config/validate";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="PolygoodPrefab-Reels"
      component={InstagramReel}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={REELS.width}
      height={REELS.height}
    />
    <Composition
      id="PolygoodPrefab-LinkedIn"
      component={LinkedInVideo}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={LINKEDIN.width}
      height={LINKEDIN.height}
    />
    {/* Each scene on its own timeline, for editing in Studio. Persistent
        overlays (finish tag, checklist, sound) only appear in the full films. */}
    {[REELS, LINKEDIN].map((layout) => (
      <Folder key={layout.variant} name={`Scenes-${layout.variant}`}>
        {SCENE_LIST.map(({ key, Component }, i) => (
          <Composition
            key={key}
            id={`Scene0${i + 1}-${layout.variant}`}
            component={() => (
              <LayoutProvider layout={layout}>
                <Component />
              </LayoutProvider>
            )}
            durationInFrames={SCENES[key].durationInFrames}
            fps={FPS}
            width={layout.width}
            height={layout.height}
          />
        ))}
      </Folder>
    ))}
  </>
);
