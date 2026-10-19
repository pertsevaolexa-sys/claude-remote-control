import React, { createContext, useContext } from "react";
import { Layout, REELS } from "../config/layout";

const LayoutContext = createContext<Layout>(REELS);

export const LayoutProvider: React.FC<{
  layout: Layout;
  children: React.ReactNode;
}> = ({ layout, children }) => (
  <LayoutContext.Provider value={layout}>{children}</LayoutContext.Provider>
);

export const useLayout = () => useContext(LayoutContext);
