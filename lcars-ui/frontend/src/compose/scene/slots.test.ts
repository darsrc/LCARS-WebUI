import { describe, expect, it } from "vitest";
import example from "../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../types/contract";
import { deriveSlots, readingOrder } from "./slots";

const scene = example.widgets[0] as unknown as SceneWidget;

describe("slots", () => {
  it("derives each relation kind and reading order", () => {
    const customScene: SceneWidget = {
      ...scene,
      modes: [
        {
          id: "all",
          label: "ALL",
          focal: ["sample-a"],
          required: ["sample-a", "commands-a", "fault", "feeds-a", "part-a"],
          optional: ["notes-a", "sample-b"],
        },
      ],
      relations: [
        { id: "controls", kind: "controls", source: "commands-a", target: "sample-a" },
        { id: "details", kind: "details", source: "notes-a", target: "sample-a" },
        { id: "recovers", kind: "recovers", source: "fault", target: "sample-a" },
        { id: "compares", kind: "compares", source: "sample-a", target: "sample-b" },
        { id: "feeds", kind: "feeds", source: "feeds-a", target: "sample-a" },
        { id: "part-of", kind: "part_of", source: "part-a", target: "sample-a" },
        { id: "outside", kind: "controls", source: "outside", target: "sample-a" },
      ],
    };
    const slots = deriveSlots(customScene, "all");

    expect(slots.commands).toContain("commands-a");
    expect(slots.details).toContain("notes-a");
    expect(slots.alerts).toContain("fault");
    expect(slots.context).toContain("feeds-a");
    expect(slots.context).toContain("part-a");
    expect(slots.context).toContain("sample-b");
    expect(slots.relations.map((relation) => relation.kind)).toEqual([
      "controls",
      "details",
      "recovers",
      "compares",
      "feeds",
      "part_of",
    ]);
    expect(readingOrder(slots)).toEqual([
      "sample-a",
      "fault",
      "commands-a",
      "notes-a",
      "feeds-a",
      "part-a",
      "sample-b",
    ]);
    expect([...slots.optional]).toEqual(["notes-a", "sample-b"]);
    expect([...slots.foldable]).toEqual(["notes-a", "sample-b"]);
  });

  it("honors explicit slots and never-fold regions", () => {
    const customScene: SceneWidget = {
      ...scene,
      regions: scene.regions.map((region) =>
        region.id === "notes-a" ? { ...region, slot: "context", fold: "never" } : region,
      ),
    };
    const slots = deriveSlots(customScene, "inspect");
    expect(slots.context).toContain("notes-a");
    expect(slots.foldable.size).toBe(0);
  });

  it("rejects unknown modes", () => {
    expect(() => deriveSlots(scene, "missing")).toThrow();
  });
});
