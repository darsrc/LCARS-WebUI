/*
 * User layout overrides (beta).
 *
 * When someone rearranges the deck by hand we store their order — and any spans
 * they resized — client-side, and replay it over the planner's output. Nothing
 * here is allowed to break the render: every read is validated, every failure
 * falls back to the computed plan, and ids that no longer exist in the manifest
 * are dropped rather than left dangling. A stale or corrupt store must degrade
 * to "the layout the planner would have produced anyway", never to a blank deck.
 *
 * Storage is local to the browser: no protocol surface, no server round-trip.
 */
import type { PlacedPanel } from "./layout";
import type { Density } from "./viewport";

export interface LayoutOverride {
  v: 1;
  /** Widget ids in user order. Ids absent from the manifest are ignored. */
  order: string[];
  /** Widget id → [colSpan, rowSpan]. */
  spans: Record<string, [number, number]>;
}

const VERSION = 1;

/* Keyed by density bucket as well as page: an arrangement made on an ultrawide
 * display has no business being replayed on a phone. */
export const overrideKey = (appName: string, pageId: string, density: Density): string =>
  `lcars.layout.${appName}.${pageId}.${density}`;

const isSpan = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 1);

/** Validate an unknown parsed blob into an override, or null. */
const parseOverride = (raw: unknown): LayoutOverride | null => {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LayoutOverride>;
  if (candidate.v !== VERSION) return null;
  if (!Array.isArray(candidate.order)) return null;
  const order = candidate.order.filter((id): id is string => typeof id === "string");
  const spans: Record<string, [number, number]> = {};
  if (candidate.spans && typeof candidate.spans === "object") {
    for (const [id, span] of Object.entries(candidate.spans)) {
      if (isSpan(span)) spans[id] = [Math.round(span[0]), Math.round(span[1])];
    }
  }
  return { v: VERSION, order, spans };
};

export const readOverride = (key: string): LayoutOverride | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? parseOverride(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export const writeOverride = (key: string, override: LayoutOverride): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(override));
  } catch {
    /* Private mode, quota, disabled storage — the arrangement just won't persist. */
  }
};

export const clearOverride = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* Nothing to do — the caller re-plans either way. */
  }
};

/**
 * Replay a user arrangement over a planned page.
 *
 * Panels named in `order` come first in that order; anything the override does
 * not know about — a widget added since the arrangement was saved — keeps its
 * planned order and is appended. Spans ride along as the `span` contract hint,
 * so the measurer honours them through the same path as an authored `span=`.
 */
export const applyOverrides = (
  panels: PlacedPanel[],
  override: LayoutOverride | null,
): PlacedPanel[] => {
  if (!override || override.order.length === 0) return panels;
  try {
    const byId = new Map(panels.map((panel) => [panel.widget.id, panel]));
    const seen = new Set<string>();
    const ordered: PlacedPanel[] = [];

    for (const id of override.order) {
      const panel = byId.get(id);
      if (!panel || seen.has(id)) continue;
      seen.add(id);
      ordered.push(panel);
    }
    for (const panel of panels) {
      if (!seen.has(panel.widget.id)) ordered.push(panel);
    }

    return ordered.map((panel, index) => {
      const span = override.spans[panel.widget.id];
      return {
        ...panel,
        order: index,
        widget: span ? { ...panel.widget, span } : panel.widget,
      };
    });
  } catch {
    return panels;
  }
};
