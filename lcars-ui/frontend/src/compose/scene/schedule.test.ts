import { describe, expect, it } from "vitest";
import { decideCommit, isStructuralChange } from "./schedule";
import type { ResolvedScene } from "./types";

const scene: ResolvedScene = {
  family: "wrap",
  orientation: "landscape",
  placements: [
    { regionId: "one", visibility: "full", rect: { x: 0, y: 0, w: 100, h: 100 }, scroll: false },
  ],
  paths: [],
  terminals: [],
  revision: 1,
  modeId: "one",
  field: { w: 100, h: 100 },
  order: [],
  explanation: "",
};
const structural: ResolvedScene = { ...scene, family: "fork", placements: [] };
const base = {
  current: scene,
  next: structural,
  reason: "server" as const,
  lockedRegionIds: new Set<string>(),
  stableLayout: false,
  now: 10000,
  lastActivityAt: 0,
  lastStructuralCommitAt: 0,
  quietWindowMs: 750,
  minBackgroundIntervalMs: 5000,
};
describe("scene commit rules", () => {
  it("rule 1 commits the first scene", () =>
    expect(decideCommit({ ...base, current: null }).action).toBe("commit"));
  it("rule 2 commits geometric changes", () =>
    expect(decideCommit({ ...base, next: { ...scene, revision: 2 } }).action).toBe("commit"));
  it("rule 3 commits user changes", () =>
    expect(decideCommit({ ...base, reason: "user" }).action).toBe("commit"));
  it("rule 4 defers changes affecting a lock", () =>
    expect(decideCommit({ ...base, lockedRegionIds: new Set(["one"]) })).toMatchObject({
      action: "defer",
      retryAt: null,
    }));
  it("rule 5 defers stable background changes", () =>
    expect(decideCommit({ ...base, stableLayout: true })).toMatchObject({
      action: "defer",
      retryAt: null,
    }));
  it("rule 6 commits after both intervals", () => expect(decideCommit(base).action).toBe("commit"));
  it("commits geometric change with a locked region", () =>
    expect(
      decideCommit({
        ...base,
        next: {
          ...scene,
          placements: [{ ...scene.placements[0], rect: { x: 5, y: 0, w: 100, h: 100 } }],
        },
        lockedRegionIds: new Set(["one"]),
      }).action,
    ).toBe("commit"));
  it("commits user reason with a locked region", () =>
    expect(
      decideCommit({ ...base, reason: "user", lockedRegionIds: new Set(["one"]) }).action,
    ).toBe("commit"));
  it("retries at the later interval end", () =>
    expect(
      decideCommit({ ...base, now: 100, lastActivityAt: 4000, lastStructuralCommitAt: 1000 }),
    ).toMatchObject({ action: "defer", retryAt: 6000 }));
  it("detects changes in folded region sets", () =>
    expect(
      isStructuralChange(scene, {
        ...scene,
        terminals: [
          {
            id: "fold",
            kind: "folded-region",
            label: "fold",
            regionId: "two",
            rect: { x: 0, y: 0, w: 1, h: 1 },
          },
        ],
      }),
    ).toBe(true));
});
