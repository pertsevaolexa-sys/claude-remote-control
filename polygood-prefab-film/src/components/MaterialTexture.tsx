import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Img,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import { ASSETS, MATERIAL_LEVELS } from "../config/assets";
import { SHEET } from "../geometry/sheet";

// SVG <image> that holds the render until the bitmap has loaded, so no frame
// is captured with an empty texture.
export const SvgImage: React.FC<
  React.SVGProps<SVGImageElement> & { href: string }
> = ({ href, ...rest }) => {
  const [handle] = useState(() =>
    delayRender(`Loading ${href}`, { timeoutInMilliseconds: 60000 }),
  );
  const done = useRef(false);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    continueRender(handle);
  }, [handle]);
  // Release the hold if the element unmounts before loading.
  useEffect(() => finish, [finish]);
  return (
    <image
      href={href}
      preserveAspectRatio="none"
      onLoad={finish}
      onError={() => cancelRender(new Error(`Could not load ${href}`))}
      {...rest}
    />
  );
};

// The full sheet image in world (mm) coordinates: covers 0..2800 x 0..1400.
export const SheetImage: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <SvgImage
    href={staticFile(ASSETS.material.sheet)}
    x={0}
    y={0}
    width={SHEET.w}
    height={SHEET.h}
    opacity={opacity}
  />
);

// The sheet plus its higher-resolution crops, each feathered into the level
// below. A level is hidden once the camera is zoomed out past the point where
// the level beneath it is already sharp. Use inside WorldSvg.
export const MaterialPyramid: React.FC<{ k: number; idPrefix: string }> = ({
  k,
  idPrefix,
}) => (
  <g>
    <SheetImage />
    {MATERIAL_LEVELS.map((level, i) => {
      const below = i === 0 ? SHEET_PX_PER_MM : MATERIAL_LEVELS[i - 1].pxPerMm;
      if (k < below * 0.8) return null;
      const { x, y, w, h } = level.region;
      const f = level.feather;
      const id = `${idPrefix}-level-${i}`;
      return (
        <g key={level.src}>
          <defs>
            <filter
              id={`${id}-blur`}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation={f / 3} />
            </filter>
            <mask
              id={`${id}-mask`}
              maskUnits="userSpaceOnUse"
              x={x}
              y={y}
              width={w}
              height={h}
            >
              <rect
                x={x + f}
                y={y + f}
                width={w - 2 * f}
                height={h - 2 * f}
                fill="white"
                filter={`url(#${id}-blur)`}
              />
            </mask>
          </defs>
          <g mask={`url(#${id}-mask)`}>
            <SvgImage
              href={staticFile(level.src)}
              x={x}
              y={y}
              width={w}
              height={h}
            />
          </g>
        </g>
      );
    })}
  </g>
);

const SHEET_PX_PER_MM = 4096 / SHEET.w;

// A screen rectangle that looks onto the sheet at a fixed scale, centred on
// one point of the sheet. Growing the rectangle reveals more material rather
// than stretching it (used for the recycled strip and the end-card band).
export const TEXTURE_WINDOW = { center: { x: 1400, y: 700 }, pxPerMm: 0.8 };

export const TextureWindow: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, style }) => {
  const k = TEXTURE_WINDOW.pxPerMm;
  const region = {
    x: TEXTURE_WINDOW.center.x - w / (2 * k),
    y: TEXTURE_WINDOW.center.y - h / (2 * k),
    w: w / k,
    h: h / k,
  };
  return (
    <SheetRegion
      region={region}
      width={w}
      height={h}
      style={{ left: x, top: y, ...style }}
    />
  );
};

// HTML version for CSS 3D faces: shows sheet region (mm) inside a box of the
// given pixel size. `rotate` turns the source 90° for lengthwise panels.
export const SheetRegion: React.FC<{
  region: { x: number; y: number; w: number; h: number };
  width: number;
  height: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ region, width, height, style, children }) => {
  const sx = width / region.w;
  const sy = height / region.h;
  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        overflow: "hidden",
        ...style,
      }}
    >
      <Img
        src={staticFile(ASSETS.material.sheet)}
        style={{
          position: "absolute",
          left: -region.x * sx,
          top: -region.y * sy,
          width: SHEET.w * sx,
          height: SHEET.h * sy,
          maxWidth: "none",
        }}
      />
      {children}
    </div>
  );
};
