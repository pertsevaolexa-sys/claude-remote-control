import React, { createContext, useContext } from "react";
import { useVideoConfig } from "remotion";
import { Camera, viewBox } from "../geometry/camera";

type World = { k: number; px: (screenPx: number) => number };

const WorldContext = createContext<World>({ k: 1, px: (n) => n });

export const useWorld = () => useContext(WorldContext);

// Full-frame SVG looking at world space through the camera. Children draw in
// millimetres; use px() from useWorld() for screen-constant stroke widths.
export const WorldSvg: React.FC<{
  camera: Camera;
  anchor: { cx: number; cy: number };
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ camera, anchor, children, style }) => {
  const { width, height } = useVideoConfig();
  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox(camera, width, height, anchor.cx, anchor.cy)}
      style={{ position: "absolute", left: 0, top: 0, ...style }}
    >
      <WorldContext.Provider value={{ k: camera.k, px: (n) => n / camera.k }}>
        {children}
      </WorldContext.Provider>
    </svg>
  );
};
