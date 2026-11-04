import { describe, expect, it } from "vitest";
import example from "../../../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../../../types/contract";
import { deriveSlots } from "../slots";
import { assertCandidateValid, fakeMeasurer } from "../testing";
import { DEFAULT_SCENE_TOKENS, type FamilyInput } from "../types";
import { branch } from "./branch";
import { contour } from "./contour";
import { focus } from "./focus";
import { fork } from "./fork";
import { buildFrame } from "./frame";
import { wrap } from "./wrap";

const fields = [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1080, h: 1920 },
  { w: 390, h: 844 },
];
const tokens = DEFAULT_SCENE_TOKENS;
const scene = example.widgets[0] as unknown as SceneWidget;

describe("shared asymmetric frame", () => {
  it.each(fields)("builds the frame at $w x $h", (field) => {
    const portrait = field.w < field.h;
    const frame = buildFrame({
      field,
      tokens,
      orientation: portrait ? "portrait" : "landscape",
      terminals: [
        { id: "return", label: "RETURN", kind: "return" },
        { id: "context", label: "MODE", kind: "context" },
        { id: "notes", label: "NOTES", kind: "folded-region", regionId: "notes" },
      ],
      armRun: { from: 0, to: (portrait ? field.h : field.w) - tokens.gap },
    });
    expect(frame.fits).toBe(true);
    expect(frame.spineRect).toEqual(
      portrait
        ? { x: 0, y: 0, w: field.w, h: frame.spineRect.h }
        : { x: 0, y: 0, w: tokens.spine, h: field.h },
    );
    const structuralElbow = frame.paths.find((path) => path.kind === "elbow")!;
    expect(structuralElbow.arms).toEqual(
      portrait ? { x: tokens.arm, y: frame.spineRect.h } : { x: tokens.spine, y: tokens.arm },
    );
    expect(JSON.stringify(frame)).not.toMatch(/NaN|Infinity/);
    expect(frame.paths.find((path) => path.id === "frame-arm")?.d).toContain("A");
    for (const [index, terminal] of frame.terminals.entries()) {
      const rect = terminal.rect;
      expect(rect.w).toBeGreaterThanOrEqual(44);
      expect(rect.h).toBeGreaterThanOrEqual(44);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.w).toBeLessThanOrEqual(frame.spineRect.w);
      expect(rect.y + rect.h).toBeLessThanOrEqual(frame.spineRect.h);
      expect(portrait ? rect.h : rect.w).toBe(
        portrait ? Math.round(tokens.spine * 0.6) : tokens.spine,
      );
      if (index > 0 && (!portrait || rect.y === frame.terminals[index - 1].rect.y)) {
        const previous = frame.terminals[index - 1].rect;
        expect(portrait ? rect.x - previous.x - previous.w : rect.y - previous.y - previous.h).toBe(
          tokens.gap,
        );
      }
    }
  });

  it.each([390, 320])("packs portrait labels at %i pixels", (width) => {
    const labels = ["RETURN", "INSPECT", "SAMPLE NOTES", "RECENT READINGS · DEMO DATA"];
    const frame = buildFrame({
      field: { w: width, h: 844 },
      tokens,
      orientation: "portrait",
      terminals: labels.map((label, index) => ({
        id: String(index),
        label,
        kind: index < 2 ? (index === 0 ? "return" : "context") : "folded-region",
        ...(index >= 2 ? { regionId: String(index) } : {}),
      })),
      armRun: { from: 0, to: 836 },
    });
    expect(frame.fits).toBe(true);
    for (const [index, terminal] of frame.terminals.entries()) {
      const rect = terminal.rect;
      expect(rect.w).toBeGreaterThanOrEqual(terminal.label.length * 9 + 24);
      expect(rect.x + rect.w).toBeLessThanOrEqual(frame.spineRect.w);
      expect(rect.y + rect.h).toBeLessThanOrEqual(frame.spineRect.h);
      for (const other of frame.terminals.slice(index + 1)) {
        expect(
          rect.x + rect.w <= other.rect.x ||
            other.rect.x + other.rect.w <= rect.x ||
            rect.y + rect.h <= other.rect.y ||
            other.rect.y + other.rect.h <= rect.y,
        ).toBe(true);
      }
    }
  });

  it("rejects a spine with too many terminal blocks", () => {
    const frame = buildFrame({
      field: { w: 390, h: 844 },
      tokens,
      orientation: "portrait",
      terminals: Array.from({ length: 20 }, (_, index) => ({
        id: `terminal-${index}`,
        label: "MODE",
        kind: "context" as const,
      })),
      armRun: { from: 0, to: 836 },
    });
    expect(frame.fits).toBe(false);
  });
});

for (const [family, mode] of [
  [wrap, "inspect"],
  [branch, "fault"],
  [fork, "compare"],
  [contour, "edit"],
  [focus, "inspect"],
] as const) {
  describe(`${family.name} frame integration`, () => {
    it.each(fields)("preserves frame invariants at $w x $h", (field) => {
      const input: FamilyInput = {
        field,
        tokens,
        regions: new Map(scene.regions.map((region) => [region.id, region])),
        slots: deriveSlots(scene, mode),
        modeLabel: mode.toUpperCase(),
        hasReturn: true,
        measurer: fakeMeasurer({}),
      };
      const result = family(input);
      if (!result.ok) {
        expect(result.reason).toBeTruthy();
        expect(field.w).toBe(390);
        return;
      }
      assertCandidateValid(result.candidate, input.slots, tokens, field, family === focus);
      if (field.w < field.h) {
        const placementBottomLimit = field.h - (tokens.terminalH + tokens.gap);
        for (const placement of result.candidate.placements) {
          expect(placement.rect.y + placement.rect.h).toBeLessThanOrEqual(placementBottomLimit);
        }
      }
    });
  });
}
