import type { ResolvedScene } from "./types";

export type CommitReason = "user" | "server" | "field" | "content";

function sameSet(first: Set<string>, second: Set<string>): boolean {
  return first.size === second.size && [...first].every((value) => second.has(value));
}

/** Return whether a scene changes its structural layout. */
export function isStructuralChange(current: ResolvedScene, next: ResolvedScene): boolean {
  const fullRegions = (scene: ResolvedScene) =>
    new Set(
      scene.placements
        .filter((placement) => placement.visibility === "full")
        .map((placement) => placement.regionId),
    );
  const foldedRegions = (scene: ResolvedScene) =>
    new Set(
      scene.terminals
        .filter((terminal) => terminal.kind === "folded-region" && terminal.regionId)
        .map((terminal) => terminal.regionId!),
    );
  return (
    current.family !== next.family ||
    current.orientation !== next.orientation ||
    !sameSet(fullRegions(current), fullRegions(next)) ||
    !sameSet(foldedRegions(current), foldedRegions(next))
  );
}

/** Decide whether a proposed scene can replace the committed scene now. */
export function decideCommit(input: {
  current: ResolvedScene | null;
  next: ResolvedScene;
  reason: CommitReason;
  lockedRegionIds: ReadonlySet<string>;
  stableLayout: boolean;
  now: number;
  lastActivityAt: number;
  lastStructuralCommitAt: number;
  quietWindowMs: number;
  minBackgroundIntervalMs: number;
}): { action: "commit" } | { action: "defer"; retryAt: number | null; why: string } {
  const { current, next } = input;
  if (!current || !isStructuralChange(current, next) || input.reason === "user")
    return { action: "commit" };
  for (const regionId of input.lockedRegionIds) {
    const previous = current.placements.find(
      (placement) => placement.regionId === regionId && placement.visibility === "full",
    );
    if (!previous) continue;
    const proposed = next.placements.find(
      (placement) => placement.regionId === regionId && placement.visibility === "full",
    );
    if (
      !proposed ||
      previous.rect.x !== proposed.rect.x ||
      previous.rect.y !== proposed.rect.y ||
      previous.rect.w !== proposed.rect.w ||
      previous.rect.h !== proposed.rect.h
    ) {
      return { action: "defer", retryAt: null, why: "A region is in use" };
    }
  }
  if (input.stableLayout && (input.reason === "server" || input.reason === "content")) {
    return { action: "defer", retryAt: null, why: "Stable layout is enabled" };
  }
  const retryAt = Math.max(
    input.lastActivityAt + input.quietWindowMs,
    input.lastStructuralCommitAt + input.minBackgroundIntervalMs,
  );
  if (input.now < retryAt) return { action: "defer", retryAt, why: "Waiting for a quiet interval" };
  return { action: "commit" };
}
