import { describe, expect, it } from "vitest";
import example from "../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../types/contract";
import { chooseLayout, resolveOrientation } from "./choose";
import { deriveSlots } from "./slots";
import { assertCandidateValid, fakeMeasurer } from "./testing";
import { DEFAULT_SCENE_TOKENS } from "./types";

const scene = example.widgets[0] as unknown as SceneWidget;
const measurer = fakeMeasurer({});
const largeField = { w: 1920, h: 1080 };
const smallField = { w: 390, h: 844 };

describe("resolveOrientation", () => {
  it.each([
    [1.0, "landscape", "landscape"],
    [0.95, "landscape", "landscape"],
    [0.85, "landscape", "portrait"],
    [1.05, "portrait", "portrait"],
    [1.15, "portrait", "landscape"],
    [0.99, undefined, "portrait"],
    [0.9, "landscape", "landscape"],
    [1.1, "portrait", "portrait"],
  ] as const)("resolves ratio %s from %s to %s", (ratio, previous, expected) => {
    expect(resolveOrientation({ w: ratio * 100, h: 100 }, previous)).toBe(expected);
  });
});

describe("chooseLayout", () => {
  it("keeps the previous orientation for a near-square field across modes", () => {
    const previous = chooseLayout(scene, "inspect", largeField, measurer)!;
    const result = chooseLayout(scene, "edit", { w: 950, h: 1000 }, measurer, undefined, previous);
    expect(result?.orientation).toBe("landscape");
  });

  it.each(["inspect", "compare", "edit", "fault"])(
    "chooses the first preference for %s",
    (modeId) => {
      const result = chooseLayout(scene, modeId, largeField, measurer);
      const mode = scene.modes.find((item) => item.id === modeId)!;
      expect(result?.family).toBe(mode.families![0]);
      assertCandidateValid(result!, deriveSlots(scene, modeId), DEFAULT_SCENE_TOKENS, largeField);
    },
  );

  it.each(["inspect", "compare", "edit", "fault"])(
    "chooses a valid small layout for %s",
    (modeId) => {
      const result = chooseLayout(scene, modeId, smallField, measurer);
      expect(result).not.toBeNull();
      const mode = scene.modes.find((item) => item.id === modeId)!;
      expect([...mode.families!, "focus"]).toContain(result!.family);
      const slots = deriveSlots(scene, modeId);
      assertCandidateValid(
        result!,
        slots,
        DEFAULT_SCENE_TOKENS,
        smallField,
        result!.family === "focus",
      );
    },
  );

  it("keeps a feasible previous family and ignores it after a mode change", () => {
    const customScene: SceneWidget = {
      ...scene,
      modes: scene.modes.map((mode) =>
        mode.id === "inspect" ? { ...mode, families: ["branch", "wrap"] } : mode,
      ),
    };
    const previous = chooseLayout(customScene, "inspect", largeField, measurer)!;
    expect(previous.family).toBe("branch");
    const reorderedScene: SceneWidget = {
      ...customScene,
      modes: customScene.modes.map((mode) =>
        mode.id === "inspect" ? { ...mode, families: ["wrap", "branch"] } : mode,
      ),
    };
    expect(
      chooseLayout(reorderedScene, "inspect", largeField, measurer, undefined, previous)?.family,
    ).toBe("branch");
    expect(chooseLayout(reorderedScene, "inspect", largeField, measurer)?.family).toBe("wrap");
    const changed = chooseLayout(
      reorderedScene,
      "edit",
      largeField,
      measurer,
      undefined,
      previous,
    )!;
    expect(changed.family).toBe("contour");
    expect(changed.revision).toBe(previous.revision + 1);
  });

  it("returns null when no family fits", () => {
    expect(chooseLayout(scene, "inspect", { w: 100, h: 100 }, measurer)).toBeNull();
  });

  it("explains rejected families and is deterministic", () => {
    const customScene: SceneWidget = {
      ...scene,
      modes: scene.modes.map((mode) =>
        mode.id === "inspect" ? { ...mode, families: ["fork", "wrap"] } : mode,
      ),
    };
    const first = chooseLayout(customScene, "inspect", largeField, measurer)!;
    expect(first.explanation).toContain("rejected fork:");
    expect(first.explanation).toContain("mode INSPECT");
    expect(chooseLayout(customScene, "inspect", largeField, measurer)).toEqual(first);
  });
});
