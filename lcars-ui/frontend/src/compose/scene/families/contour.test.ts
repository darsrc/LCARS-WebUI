import { describe, expect, it } from "vitest";
import example from "../../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../../types/contract";
import { deriveSlots } from "../slots";
import { assertCandidateValid, fakeMeasurer } from "../testing";
import { DEFAULT_SCENE_TOKENS, type FamilyInput, type Rect } from "../types";
import { contour } from "./contour";

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
    slots: deriveSlots(scene, "edit"),
    regions: new Map(scene.regions.map((region) => [region.id, region])),
    field,
    tokens: DEFAULT_SCENE_TOKENS,
    measurer: fakeMeasurer({}),
    modeLabel: "EDIT NOTES",
    hasReturn: true,
  };
}
function overlaps(first: Rect, second: Rect): boolean {
  return (
    first.x < second.x + second.w &&
    first.x + first.w > second.x &&
    first.y < second.y + second.h &&
    first.y + first.h > second.y
  );
}
describe("contour", () => {
  it.each(fields)("handles $w x $h", (field) => {
    const parameters = input(field);
    const result = contour(parameters);
    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0);
      return;
    }
    assertCandidateValid(result.candidate, parameters.slots, parameters.tokens, field);
    const [focal, ...stack] = result.candidate.placements;
    expect(focal.regionId).toBe("notes-a");
    const path = result.candidate.paths.find((item) => item.kind === "step");
    expect(path?.bbox).toBeDefined();
    expect(
      result.candidate.placements.every((placement) => !overlaps(placement.rect, path!.bbox!)),
    ).toBe(true);
    if (field.w >= field.h) {
      expect(focal.rect.w).toBeGreaterThanOrEqual(field.w * 0.55);
      expect(
        stack.every(
          (placement, index) =>
            index === 0 ||
            placement.rect.x - stack[index - 1].rect.x >=
              parameters.tokens.band + parameters.tokens.gap,
        ),
      ).toBe(true);
    } else {
      expect(stack.every((placement) => placement.rect.y >= focal.rect.y + focal.rect.h)).toBe(
        true,
      );
    }
  });
  it.each(fields)("keeps growing stack regions at least 160px tall at $w x $h", (field) => {
    const parameters = input(field);
    parameters.slots.details.push("sample-a");
    const result = contour(parameters);
    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0);
      return;
    }
    assertCandidateValid(result.candidate, parameters.slots, parameters.tokens, field);
    const placement = result.candidate.placements.find((item) => item.regionId === "sample-a");
    expect(placement?.rect.h).toBeGreaterThanOrEqual(160);
  });
  it.each([fields[0], fields[2]])("extends the divider across the field at $w x $h", (field) => {
    const parameters = input(field);
    const result = contour(parameters);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bounds = result.candidate.paths.find((path) => path.id === "contour-step")!.bbox!;
    expect(field.w < field.h ? bounds.w / field.w : bounds.h / field.h).toBeGreaterThan(0.9);
  });
  it("gives growing support the remaining column height", () => {
    const parameters = input(fields[0]);
    parameters.measurer = fakeMeasurer({}, 120);
    const result = contour(parameters);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.candidate.placements.find((placement) => placement.regionId === "sample-a")!.rect.h,
    ).toBeGreaterThan(fields[0].h / 2);
  });
  it("indents successive landscape regions", () => {
    const parameters = input(fields[0]);
    parameters.slots.commands.push("commands-a");
    parameters.slots.details.push("fault");
    const result = contour(parameters);
    expect(result.ok).toBe(true);
    if (result.ok) {
      assertCandidateValid(result.candidate, parameters.slots, parameters.tokens, parameters.field);
      const stack = result.candidate.placements.slice(1);
      for (let index = 1; index < stack.length; index += 1) {
        expect(stack[index].rect.x - stack[index - 1].rect.x).toBe(
          parameters.tokens.band + parameters.tokens.gap,
        );
      }
      const bounds = result.candidate.paths[0].bbox!;
      expect(
        result.candidate.placements.every((placement) => !overlaps(placement.rect, bounds)),
      ).toBe(true);
    }
  });
  it("folds an oversized optional region", () => {
    const parameters = input(fields[0]);
    parameters.slots.optional.add("sample-a");
    parameters.slots.foldable.add("sample-a");
    parameters.measurer = fakeMeasurer({ "sample-a": 5000 });
    parameters.regions.set("sample-a", { ...parameters.regions.get("sample-a")!, role: "detail" });
    const result = contour(parameters);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.terminals.some((terminal) => terminal.regionId === "sample-a")).toBe(
        true,
      );
      assertCandidateValid(result.candidate, parameters.slots, parameters.tokens, parameters.field);
    }
  });
});
