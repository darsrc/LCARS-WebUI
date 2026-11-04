import { describe, expect, it } from "vitest";
import example from "../../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../../types/contract";
import { deriveSlots } from "../slots";
import { assertCandidateValid, fakeMeasurer } from "../testing";
import { DEFAULT_SCENE_TOKENS, type FamilyInput } from "../types";
import { branch } from "./branch";

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

describe("branch", () => {
  it("connects the landscape branch and keeps commands on the spine", () => {
    const parameters = input(fields[0], "fault");
    const result = branch(parameters);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const paths = result.candidate.paths;
    expect(paths.filter((path) => path.kind === "junction")).toHaveLength(1);
    expect(paths.some((path) => path.kind === "elbow" && path.bbox)).toBe(true);
    const alert = result.candidate.placements.find((placement) => placement.regionId === "fault")!;
    const spineSubject = result.candidate.placements.find(
      (placement) => placement.regionId === "sample-a",
    )!;
    expect(alert.rect.x).toBeGreaterThan(spineSubject.rect.x + spineSubject.rect.w);
    for (const command of result.candidate.placements.filter((placement) =>
      parameters.slots.commands.includes(placement.regionId),
    )) {
      expect(command.rect.x + command.rect.w).toBeLessThanOrEqual(alert.rect.x);
    }
    const relation = parameters.slots.relations.find((item) => item.kind === "recovers")!;
    expect(
      paths.some(
        (path) =>
          path.kind === "connector" &&
          path.tone === "alert" &&
          path.relationId === relation.id &&
          path.bbox,
      ),
    ).toBe(true);
  });

  it("uses a horizontal spine in portrait", () => {
    const result = branch(input(fields[2], "fault"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const spine = result.candidate.paths.find((path) => path.id === "frame-spine")!.bbox!;
    expect(spine.w).toBeGreaterThan(spine.h);
  });

  it.each(["fault", "inspect"])("handles %s across fields", (mode) => {
    let feasible = 0;
    for (const field of fields) {
      const parameters = input(field, mode);
      const result = branch(parameters);
      if (!result.ok) {
        expect(result.reason.length).toBeGreaterThan(0);
        continue;
      }
      feasible += 1;
      assertCandidateValid(result.candidate, parameters.slots, parameters.tokens, field);
      expect(result.candidate.paths.some((path) => path.kind === "junction" && path.bbox)).toBe(
        true,
      );
      const focal = result.candidate.placements.find(
        (placement) =>
          placement.regionId === (mode === "fault" ? "sample-a" : parameters.slots.focal[0]),
      )!;
      const other = result.candidate.placements.find(
        (placement) => placement.regionId === (mode === "fault" ? "fault" : "notes-a"),
      );
      expect(other).toBeDefined();
      if (field.w >= field.h) {
        const ratio = focal.rect.w / (focal.rect.w + other!.rect.w);
        expect(ratio).toBeGreaterThanOrEqual(0.55 - 0.001);
        expect(ratio).toBeLessThanOrEqual(0.7 + 0.001);
      }
      if (field.w >= field.h) expect(other!.rect.x).toBeGreaterThan(focal.rect.x + focal.rect.w);
      else expect(other!.rect.y).toBeGreaterThan(focal.rect.y + focal.rect.h);
    }
    expect(feasible).toBeGreaterThan(0);
  });
});
