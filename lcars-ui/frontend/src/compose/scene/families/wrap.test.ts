import { describe, expect, it } from "vitest";
import example from "../../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../../types/contract";
import { deriveSlots } from "../slots";
import { assertCandidateValid, fakeMeasurer } from "../testing";
import { DEFAULT_SCENE_TOKENS, type FamilyInput } from "../types";
import { wrap } from "./wrap";

const scene = example.widgets[0] as unknown as SceneWidget;
const fields = [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1080, h: 1920 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
];
function input(field: { w: number; h: number }): FamilyInput {
  return {
    slots: deriveSlots(scene, "inspect"),
    regions: new Map(scene.regions.map((region) => [region.id, region])),
    field,
    tokens: DEFAULT_SCENE_TOKENS,
    measurer: fakeMeasurer({}),
    modeLabel: "INSPECT",
    hasReturn: false,
  };
}

describe("wrap", () => {
  it.each(fields)("handles $w x $h", (field) => {
    const parameters = input(field);
    const result = wrap(parameters);
    if (!result.ok) {
      expect(field.w).toBe(390);
      expect(result.reason.length).toBeGreaterThan(0);
      return;
    }
    assertCandidateValid(result.candidate, parameters.slots, parameters.tokens, field);
    const [focal, ...others] = result.candidate.placements;
    expect(
      others.every(
        (placement) => focal.rect.w * focal.rect.h > placement.rect.w * placement.rect.h,
      ),
    ).toBe(true);
  });
  it("folds an oversized optional", () => {
    const parameters = input(fields[0]);
    parameters.measurer = fakeMeasurer({ "notes-a": 2000 });
    const result = wrap(parameters);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.terminals.some((terminal) => terminal.regionId === "notes-a")).toBe(
        true,
      );
      assertCandidateValid(result.candidate, parameters.slots, parameters.tokens, parameters.field);
    }
  });
  it("rejects an oversized non-foldable optional", () => {
    const parameters = input(fields[0]);
    parameters.slots.foldable.delete("notes-a");
    parameters.measurer = fakeMeasurer({ "notes-a": 2000 });
    expect(wrap(parameters).ok).toBe(false);
  });
});
