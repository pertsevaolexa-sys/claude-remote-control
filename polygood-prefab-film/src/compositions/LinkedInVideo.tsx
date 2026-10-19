import React from "react";
import { PolygoodFilm } from "./PolygoodFilm";

// LinkedIn feed, 1080 x 1350, 4:5. Reframed through config/layout.ts and with
// the technical spec lines beneath the headlines.
export const LinkedInVideo: React.FC = () => (
  <PolygoodFilm variant="linkedin" />
);
