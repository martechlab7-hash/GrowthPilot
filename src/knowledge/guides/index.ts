import type { FrameworkGuide } from "./types";
import { GUIDES_PART1 } from "./part1";
import { GUIDES_PART2 } from "./part2";
import { GUIDES_PART3 } from "./part3";
import { GUIDES_PART4 } from "./part4";

export type { FrameworkGuide, GuideVisual } from "./types";

export const FRAMEWORK_GUIDES: Record<string, FrameworkGuide> = {
  ...GUIDES_PART1,
  ...GUIDES_PART2,
  ...GUIDES_PART3,
  ...GUIDES_PART4,
};

export function getGuide(id: string): FrameworkGuide | undefined {
  return FRAMEWORK_GUIDES[id];
}
