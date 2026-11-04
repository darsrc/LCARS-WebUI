import { describe, expect, it } from "vitest";
import { assertCandidateValid, fakeMeasurer } from "./testing";
import { DEFAULT_SCENE_TOKENS, type Candidate } from "./types";
import type { Slots } from "./slots";
import { buildFrame } from "./families/frame";

const slots: Slots = {
  focal: ["a"],
  commands: ["b"],
  details: [],
  alerts: [],
  context: [],
  optional: new Set(),
  foldable: new Set(),
  relations: [],
};

const candidate = (): Candidate => ({
  family: "wrap",
  orientation: "landscape",
  paths: buildFrame({
    field: { w: 700, h: 500 },
    tokens: DEFAULT_SCENE_TOKENS,
    orientation: "landscape",
    terminals: [],
    armRun: { from: 0, to: 692 },
  }).paths,
  terminals: [],
  placements: [
    { regionId: "a", rect: { x: 120, y: 56, w: 200, h: 100 }, visibility: "full", scroll: true },
    { regionId: "b", rect: { x: 330, y: 56, w: 200, h: 100 }, visibility: "full", scroll: false },
  ],
});

const check = (layout: Candidate, regionSlots = slots): void =>
  assertCandidateValid(layout, regionSlots, DEFAULT_SCENE_TOKENS, { w: 700, h: 500 });

describe("validator", () => {
  it("accepts a valid candidate", () => {
    expect(() => check(candidate())).not.toThrow();
    expect(fakeMeasurer({}).height("a", 200)).toBe(80);
  });

  it("rejects overlapping placements", () => {
    const layout = candidate();
    layout.placements[1].rect.x = 100;
    expect(() => check(layout)).toThrow(/overlap/);
  });

  it("rejects placements outside the field", () => {
    const layout = candidate();
    layout.placements[1].rect.x = 650;
    expect(() => check(layout)).toThrow(/outside/);
  });

  it("rejects placements narrower than regionMinW", () => {
    const layout = candidate();
    layout.placements[0].rect.w = 199;
    expect(() => check(layout)).toThrow(/narrow/);
  });

  it("rejects a missing required region", () => {
    const layout = candidate();
    layout.placements.pop();
    expect(() => check(layout)).toThrow(/Missing/);
  });

  it("rejects a non-foldable optional region shown as a terminal", () => {
    const optionalSlots: Slots = { ...slots, optional: new Set(["b"]), foldable: new Set() };
    const layout = candidate();
    layout.placements[1].visibility = "terminal";
    layout.terminals.push({
      id: "b-terminal",
      label: "B",
      rect: { x: 0, y: 0, w: 44, h: 44 },
      kind: "folded-region",
      regionId: "b",
    });
    expect(() => check(layout, optionalSlots)).toThrow(/Non-foldable/);
  });

  it("rejects placements overlapping a band bounding box", () => {
    const layout = candidate();
    layout.paths.push({
      id: "band",
      kind: "band",
      d: "M 0 0",
      tone: "frame",
      bbox: { x: 150, y: 70, w: 48, h: 24 },
    });
    expect(() => check(layout)).toThrow(/Band overlap/);
  });

  it("rejects a NaN in path data", () => {
    const layout = candidate();
    layout.paths.push({ id: "bad", kind: "step", d: "M NaN 0", tone: "frame" });
    expect(() => check(layout)).toThrow(/Non-finite/);
  });
});
