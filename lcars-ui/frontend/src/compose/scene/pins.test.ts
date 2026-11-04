import { describe, expect, it } from "vitest";
import example from "../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../types/contract";
import { applyPins } from "./pins";
const scene = example.widgets[0] as unknown as SceneWidget;
describe("applyPins", () => {
  it("promotes optional pins without changing focal regions or the input", () => {
    const result = applyPins(scene, new Set(["notes-a"]));
    expect(result.modes[0].required).toContain("notes-a");
    expect(result.modes[0].optional).not.toContain("notes-a");
    expect(result.modes[0].focal).toEqual(scene.modes[0].focal);
    expect(scene.modes[0].optional).toContain("notes-a");
    expect(result.modes[1]).toBe(scene.modes[1]);
  });
  it("returns the original scene when no optional pin matches", () => {
    expect(applyPins(scene, new Set(["sample-a", "missing"]))).toBe(scene);
  });
});
