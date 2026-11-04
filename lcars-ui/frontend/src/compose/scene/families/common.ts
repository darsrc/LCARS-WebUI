import type { SceneRegion } from "../../../types/contract";
import type { Slots } from "../slots";
import type { FamilyResult, Measurer, Placement, Rect, SceneTokens } from "../types";

type Role = SceneRegion["role"];

/** Inset a rectangle equally on all sides. */
export function inset(rect: Rect, gap: number): Rect {
  return { x: rect.x + gap, y: rect.y + gap, w: rect.w - 2 * gap, h: rect.h - 2 * gap };
}

/** Classify a region by its sizing behavior. */
export function regionKind(role: Role): "control" | "growing" {
  return role === "instrument" || role === "data" || role === "viewer" ? "growing" : "control";
}

/** Check the minimum width and content height for a region. */
export function fitRegion(
  id: string,
  rect: Rect,
  measurer: Measurer,
  tokens: SceneTokens,
  role: Role,
): { ok: true } | { ok: false; reason: string } {
  const minHeight =
    regionKind(role) === "growing" ? tokens.regionMinH : measurer.height(id, rect.w);
  if (
    !Number.isFinite(rect.w) ||
    !Number.isFinite(rect.h) ||
    !Number.isFinite(minHeight) ||
    rect.w < tokens.regionMinW ||
    rect.h < minHeight
  ) {
    return { ok: false, reason: `Region ${id} does not fit` };
  }
  return { ok: true };
}

/** Stack controls at measured height and divide remaining space among growing regions. */
export function stackVertically(
  ids: string[],
  rect: Rect,
  measurer: Measurer,
  tokens: SceneTokens,
  roles: Map<string, Role>,
): { ok: true; placements: Placement[] } | { ok: false; reason: string } {
  const heights = ids.map((id) =>
    regionKind(roles.get(id)) === "control" ? measurer.height(id, rect.w) : 0,
  );
  const growingCount = ids.filter((id) => regionKind(roles.get(id)) === "growing").length;
  const available =
    rect.h -
    Math.max(0, ids.length - 1) * tokens.gap -
    heights.reduce((sum, height) => sum + height, 0);
  const growingHeight = growingCount ? available / growingCount : 0;
  if (available < 0 || !Number.isFinite(available))
    return { ok: false, reason: "Stack does not fit" };
  let y = rect.y;
  const placements: Placement[] = [];
  for (const [index, id] of ids.entries()) {
    const growing = regionKind(roles.get(id)) === "growing";
    const height = growing ? growingHeight : heights[index];
    const regionRect = { x: rect.x, y, w: rect.w, h: height };
    const fit = fitRegion(id, regionRect, measurer, tokens, roles.get(id));
    if (!fit.ok) return fit;
    placements.push({ regionId: id, rect: regionRect, visibility: "full", scroll: growing });
    y += height + tokens.gap;
  }
  return { ok: true, placements };
}

/** Retry a failed layout with every foldable optional removed from its slots. */
export function withFoldedOptionals(
  slots: Slots,
  build: (slotsWithFolded: Slots, foldedIds: string[]) => FamilyResult,
): FamilyResult {
  const full = build(slots, []);
  if (full.ok || slots.foldable.size === 0) return full;
  const foldedIds = [...slots.foldable];
  const keep = (ids: string[]) => ids.filter((id) => !slots.foldable.has(id));
  return build(
    {
      ...slots,
      focal: keep(slots.focal),
      commands: keep(slots.commands),
      details: keep(slots.details),
      alerts: keep(slots.alerts),
      context: keep(slots.context),
    },
    foldedIds,
  );
}
