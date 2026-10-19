import { Folder } from "remotion";
import { LineDrawComposition } from "./versions/LineDraw";
import { LoopSpinComposition } from "./versions/LoopSpin";
import { PullBackComposition } from "./versions/PullBack";
import { SheetWipeComposition } from "./versions/SheetWipe";
import { TerrazzoComposition } from "./versions/Terrazzo";

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Polygood-logo">
      <LineDrawComposition />
      <TerrazzoComposition />
      <LoopSpinComposition />
      <SheetWipeComposition />
      <PullBackComposition />
    </Folder>
  );
};
