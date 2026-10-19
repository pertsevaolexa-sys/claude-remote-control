import React from "react";
import { Composition, Folder } from "remotion";
import { InstagramReel } from "./compositions/InstagramReel";
import { LinkedInVideo } from "./compositions/LinkedInVideo";
import { SCENE_LIST } from "./compositions/PolygoodFilm";
import { LayoutProvider } from "./components/LayoutContext";
import { LINKEDIN, REELS } from "./config/layout";
import { DURATION_IN_FRAMES, FPS, SCENES } from "./config/timing";
import { RealisticFilm } from "./realistic/RealisticFilm";
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
    {/* Photoreal versions: Blender renders under the same overlays. Need
        the frame sequences from blender/render.py in public/renders3d/. */}
    <Folder name="Realistic">
      {[REELS, LINKEDIN].map((layout) => (
        <Composition
          key={layout.variant}
          id={`PolygoodRealistic-${layout.variant === "reels" ? "Reels" : "LinkedIn"}`}
          component={() => <RealisticFilm variant={layout.variant} />}
          durationInFrames={DURATION_IN_FRAMES}
          fps={FPS}
          width={layout.width}
          height={layout.height}
        />
      ))}
    </Folder>
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
