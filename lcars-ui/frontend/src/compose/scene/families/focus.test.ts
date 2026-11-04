import { describe, expect, it } from "vitest";
import example from "../../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../../types/contract";
import { deriveSlots } from "../slots";
import { assertCandidateValid, fakeMeasurer } from "../testing";
import { DEFAULT_SCENE_TOKENS } from "../types";
import { focus } from "./focus";

const scene = example.widgets[0] as unknown as SceneWidget;
const fields = [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1080, h: 1920 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
];
describe("focus", () => {
  it.each(fields)("handles $w x $h", (field) => {
    const slots = deriveSlots(scene, "inspect");
    const result = focus({
      slots,
      regions: new Map(scene.regions.map((region) => [region.id, region])),
      field,
      tokens: DEFAULT_SCENE_TOKENS,
      measurer: fakeMeasurer({}),
      modeLabel: "INSPECT",
      hasReturn: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.candidate.terminals
        .filter((terminal) => terminal.kind === "folded-region")
        .map((terminal) => terminal.regionId),
    ).toEqual(field.w === 390 ? ["commands-a", undefined] : ["commands-a", "notes-a"]);
    expect(result.candidate.terminals.some((terminal) => terminal.kind === "return")).toBe(true);
    expect(
      result.candidate.terminals.every(
        (terminal) =>
          terminal.rect.h >= DEFAULT_SCENE_TOKENS.target &&
          terminal.rect.w >= DEFAULT_SCENE_TOKENS.target,
      ),
    ).toBe(true);
    assertCandidateValid(result.candidate, slots, DEFAULT_SCENE_TOKENS, field, true);
  });
});
