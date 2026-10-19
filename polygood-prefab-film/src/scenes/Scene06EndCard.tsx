import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { ramp } from "../anim";
import { ASSETS, CLAIMS } from "../config/assets";
import { END_CARD, HEADLINES } from "../config/copy";
import { S6 } from "../config/timing";
import { COLORS, EASE } from "../config/theme";
import { TYPE, fontStack } from "../config/typography";
import { FinishTag } from "../components/FinishTag";
import { Headline } from "../components/Headline";
import { useLayout } from "../components/LayoutContext";
import { TextureWindow } from "../components/MaterialTexture";
import { lerp } from "../geometry/polyline";

// The recycled strip from scene 05 rises into the top band; logo, call to
// action and URL follow, and the card holds still for the final second.
export const Scene06EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const { endCard, strip, marginX, finishTag } = layout;

  const band = ramp(frame, S6.band, EASE.inOut);
  const bandRect = {
    x: lerp(strip.x, 0, band),
    y: lerp(strip.y, 0, band),
    w: lerp(strip.w, layout.width, band),
    h: lerp(strip.h, endCard.bandHeight, band),
  };

  const rise = (range: readonly [number, number]) => {
    const t = ramp(frame, range);
    return { opacity: t, translate: `0 ${(1 - t) * 18}px` };
  };

  const urls = END_CARD[layout.variant].urls;
  const urlTop = endCard.ctaY + endCard.ctaSize + endCard.urlGap;
  const logoHeight = endCard.logoWidth / ASSETS.logo.aspectRatio;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <TextureWindow
        x={bandRect.x}
        y={bandRect.y}
        w={bandRect.w}
        h={bandRect.h}
      />

      <div
        style={{
          position: "absolute",
          left: marginX,
          top: endCard.bandHeight - marginX * 0.6,
          translate: "0 -100%",
        }}
      >
        <div style={rise(S6.finishTag)}>
          <FinishTag size={finishTag.size} />
        </div>
      </div>

      <Img
        src={staticFile(ASSETS.logo.src)}
        style={{
          position: "absolute",
          left: marginX,
          top: endCard.logoY,
          width: endCard.logoWidth,
          height: logoHeight,
          ...rise(S6.logo),
        }}
      />

      <Headline
        lines={HEADLINES.endCard}
        inFrame={S6.cta[0]}
        x={marginX}
        y={endCard.ctaY}
        size={endCard.ctaSize}
        maxWidth={layout.width - 2 * marginX}
      />

      <div
        style={{
          position: "absolute",
          left: marginX,
          top: urlTop,
          fontFamily: fontStack,
          color: COLORS.ink,
        }}
      >
        {urls.map((url, i) => (
          <div
            key={url}
            style={{
              fontSize: endCard.urlSize,
              lineHeight: `${endCard.urlRow}px`,
              letterSpacing: TYPE.label.tracking,
              ...rise([S6.url[0] + i * 3, S6.url[1] + i * 3]),
            }}
          >
            {url}
          </div>
        ))}
        {CLAIMS.material.confirmed ? (
          <div
            style={{
              marginTop: endCard.urlGap * 0.6,
              fontSize: endCard.supportSize,
              letterSpacing: TYPE.label.tracking,
              ...rise(S6.support),
            }}
          >
            {CLAIMS.material.text}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
