import type { Candidate, Field, Measurer, Rect, SceneTokens } from "./types";
import { readingOrder, type Slots } from "./slots";

/** Create a deterministic measurer from a table with a fallback height. */
export function fakeMeasurer(table: Record<string, number>, fallback = 80): Measurer {
  return { height: (regionId) => table[regionId] ?? fallback };
}

function overlaps(first: Rect, second: Rect, tolerance = 0): boolean {
  return (
    first.x < second.x + second.w - tolerance &&
    first.x + first.w > second.x + tolerance &&
    first.y < second.y + second.h - tolerance &&
    first.y + first.h > second.y + tolerance
  );
}

function assertFinite(value: unknown): void {
  if (
    (typeof value === "number" && !Number.isFinite(value)) ||
    (typeof value === "string" && /NaN|Infinity/.test(value))
  ) {
    throw new Error("Non-finite value");
  }
  if (value && typeof value === "object") Object.values(value).forEach(assertFinite);
}

/** Throw when a candidate violates the shared scene layout invariants. */
export function assertCandidateValid(
  candidate: Candidate,
  slots: Slots,
  tokens: SceneTokens,
  field: Field,
  allowFoldRequired = false,
): void {
  assertFinite(candidate);
  assertFinite(tokens);
  assertFinite(field);

  const spine: Rect =
    candidate.orientation === "portrait"
      ? { x: 0, y: 0, w: field.w, h: Math.round(tokens.spine * 0.6) }
      : { x: 0, y: 0, w: tokens.spine, h: field.h };
  if (
    !candidate.paths.some(
      (path) => path.kind === "elbow" && path.arms && path.arms.x !== path.arms.y,
    )
  ) {
    throw new Error("Missing asymmetric structural elbow");
  }
  for (const terminal of candidate.terminals) {
    const rect = terminal.rect;
    if (rect.w < tokens.target || rect.h < tokens.target) {
      throw new Error(`Terminal below target size: ${terminal.id}`);
    }
    // A comparison label belongs to its bridge rather than the navigation spine.
    if (
      terminal.kind !== "bridge-label" &&
      (rect.x < spine.x ||
        rect.y < spine.y ||
        rect.x + rect.w > spine.x + spine.w ||
        rect.y + rect.h > spine.y + spine.h)
    ) {
      throw new Error(`Terminal outside spine: ${terminal.id}`);
    }
  }

  for (const regionId of slots.optional) {
    const placement = candidate.placements.find((item) => item.regionId === regionId);
    const foldedTerminal = candidate.terminals.some(
      (terminal) => terminal.kind === "folded-region" && terminal.regionId === regionId,
    );
    if (
      !slots.foldable.has(regionId) &&
      !(allowFoldRequired && regionId !== slots.focal[0]) &&
      (placement?.visibility === "terminal" || foldedTerminal)
    ) {
      throw new Error(`Non-foldable region shown as terminal: ${regionId}`);
    }
  }

  for (const regionId of readingOrder(slots)) {
    const placement = candidate.placements.find((item) => item.regionId === regionId);
    const foldedTerminal = candidate.terminals.some(
      (terminal) => terminal.kind === "folded-region" && terminal.regionId === regionId,
    );
    if (
      placement?.visibility !== "full" &&
      !(
        regionId !== slots.focal[0] &&
        (slots.foldable.has(regionId) || allowFoldRequired) &&
        (placement?.visibility === "terminal" || foldedTerminal)
      )
    ) {
      throw new Error(`Missing required full placement: ${regionId}`);
    }
  }

  const placed = candidate.placements.filter(
    (placement) => placement.visibility === "full" || placement.visibility === "summary",
  );
  for (const [index, placement] of placed.entries()) {
    const rect = placement.rect;
    if (
      rect.w < 0 ||
      rect.h < 0 ||
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.w > field.w ||
      rect.y + rect.h > field.h
    ) {
      throw new Error(`Placement outside field: ${placement.regionId}`);
    }
    if (overlaps(rect, spine)) {
      throw new Error(`Placement overlaps spine: ${placement.regionId}`);
    }
    if (placement.visibility === "full" && rect.w < tokens.regionMinW) {
      throw new Error(`Placement too narrow: ${placement.regionId}`);
    }
    if (placed.slice(index + 1).some((other) => overlaps(rect, other.rect))) {
      throw new Error(`Placement overlap: ${placement.regionId}`);
    }
    for (const path of candidate.paths.filter((item) => item.kind === "band")) {
      if (!path.bbox) throw new Error(`Band missing bounding box: ${path.id}`);
      if (overlaps(rect, path.bbox, 0.5)) throw new Error(`Band overlap: ${placement.regionId}`);
    }
  }
}
