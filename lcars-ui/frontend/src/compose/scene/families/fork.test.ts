import { describe, expect, it } from "vitest";
import example from "../../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../../types/contract";
import { deriveSlots } from "../slots";
import { assertCandidateValid, fakeMeasurer } from "../testing";
import { DEFAULT_SCENE_TOKENS, type FamilyInput } from "../types";
import { fork } from "./fork";

const scene = example.widgets[0] as unknown as SceneWidget;
const fields = [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1080, h: 1920 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
];
function input(field: { w: number; h: number }, mode: string): FamilyInput {
  return {
    slots: deriveSlots(scene, mode),
    regions: new Map(scene.regions.map((region) => [region.id, region])),
    field,
    tokens: DEFAULT_SCENE_TOKENS,
    measurer: fakeMeasurer({}),
    modeLabel: mode.toUpperCase(),
    hasReturn: false,
  };
}

describe("fork", () => {
  it.each(fields)("handles compare at $w x $h", (field) => {
    const parameters = input(field, "compare");
    const result = fork(parameters);
    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0);
      return;
    }
    assertCandidateValid(result.candidate, parameters.slots, parameters.tokens, field);
    expect(
      result.candidate.paths.some(
        (path) => path.kind === "bridge" && path.relationId === "compares-sample-a" && path.bbox,
      ),
    ).toBe(true);
    if (field.w >= field.h)
      expect(
        Math.abs(result.candidate.placements[0].rect.w - result.candidate.placements[1].rect.w),
      ).toBeLessThanOrEqual(1);
  });
  it.each([fields[0], fields[2]])("extends the labelled divider at $w x $h", (field) => {
    const result = fork(input(field, "compare"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bounds = result.candidate.paths.find((path) => path.id === "fork-bridge")!.bbox!;
    const label = result.candidate.terminals.find(
      (terminal) => terminal.kind === "bridge-label",
    )!.rect;
    expect(field.w < field.h ? bounds.w / field.w : bounds.h / field.h).toBeGreaterThanOrEqual(0.9);
    expect(label.x).toBeGreaterThanOrEqual(bounds.x);
    expect(label.y).toBeGreaterThanOrEqual(bounds.y);
    expect(label.x + label.w).toBeLessThanOrEqual(bounds.x + bounds.w);
    expect(label.y + label.h).toBeLessThanOrEqual(bounds.y + bounds.h);
  });
  it("rejects a single focal", () => {
    const result = fork(input(fields[0], "inspect"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(0);
  });
});
