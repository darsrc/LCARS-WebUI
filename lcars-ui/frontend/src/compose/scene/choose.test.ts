import { describe, expect, it } from "vitest";
import example from "../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../types/contract";
import { chooseLayout } from "./choose";
import { deriveSlots } from "./slots";
import { assertCandidateValid, fakeMeasurer } from "./testing";
import { DEFAULT_SCENE_TOKENS } from "./types";

const scene = example.widgets[0] as unknown as SceneWidget;
const measurer = fakeMeasurer({});
const largeField = { w: 1920, h: 1080 };
const smallField = { w: 390, h: 844 };

describe("chooseLayout", () => {
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
