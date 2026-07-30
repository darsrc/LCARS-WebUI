/*
 * User layout overrides (beta).
 *
 * When someone rearranges the deck by hand we store what they built — the order
 * of the panels and the structure they put them in — client-side, and replay it
 * over the planner's output. Nothing here is allowed to break the render: every
 * read is validated, every failure falls back to the computed plan, and ids that
 * no longer exist in the manifest are dropped rather than left dangling. A stale
 * or corrupt store must degrade to "the layout the planner would have produced
 * anyway", never to a blank deck.
 *
 * Structure lives in the same list as the panels, as marker entries between
 * them. That is what lets an arrangement say more than "this panel comes before
 * that one": `@row` ends a band, `@col` starts a column beside the last, and
 * `@section:Label` opens a named band. Reading the list top to bottom rebuilds
 * the deck exactly, which is why a single ordered array is the whole format.
 *
 * Storage is local to the browser: no protocol surface, no server round-trip.
 */
import type { PlacedPanel } from "./layout";
import type { Density } from "./viewport";

/** A structural entry in the order list. Ids never begin with "@". */
export type Marker =
  | { kind: "row" }
  | { kind: "col" }
  | { kind: "section"; label: string }
  /** An empty landing area the user added and has not filled yet. */
  | { kind: "slot"; id: string };

export interface LayoutOverride {
  v: 3;
  /** Widget ids and `@`-prefixed markers, in the order they are laid out. */
  order: string[];
  /** Widget id → [colSpan, rowSpan]. */
  spans: Record<string, [number, number]>;
  /** Spacer id → [colSpan, rowSpan]. Spacers are intentional, persistent trim. */
  spacers: Record<string, [number, number]>;
}

const VERSION = 3;

/* Keyed by density bucket as well as page: an arrangement made on an ultrawide
 * display has no business being replayed on a phone. */
export const overrideKey = (appName: string, pageId: string, density: Density): string =>
  `lcars.layout.${appName}.${pageId}.${density}`;

/* ------------------------------------------------------------------ */
/* Markers                                                             */
/* ------------------------------------------------------------------ */

export const ROW_BREAK = "@row";
export const COL_BREAK = "@col";
export const sectionEntry = (label: string): string => `@section:${label}`;
export const slotEntry = (id: string): string => `@slot:${id}`;

export const isMarker = (entry: string): boolean => entry.startsWith("@");

/** Parse an order entry into a marker, or null when it names a widget. */
export const readMarker = (entry: string): Marker | null => {
  if (!isMarker(entry)) return null;
  if (entry === ROW_BREAK) return { kind: "row" };
  if (entry === COL_BREAK) return { kind: "col" };
  if (entry.startsWith("@section:")) return { kind: "section", label: entry.slice(9) };
  if (entry.startsWith("@slot:")) return { kind: "slot", id: entry.slice(6) };
  // Unknown marker from a newer build: treat it as nothing rather than as a
  // widget id, which would make the packer look for a panel that cannot exist.
  return { kind: "row" };
};

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

const isSpan = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 1);

/** Validate an unknown parsed blob into an override, or null. */
const parseOverride = (raw: unknown): LayoutOverride | null => {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LayoutOverride> & { v?: number };
  // v1 knew only order/spans; v2 added structural markers and temporary slots.
  // Both upgrade losslessly: a surviving slot becomes persistent LCARS trim.
  if (candidate.v !== VERSION && candidate.v !== 2 && candidate.v !== 1) return null;
  if (!Array.isArray(candidate.order)) return null;
  const order = candidate.order.filter((id): id is string => typeof id === "string" && id !== "");
  const spans: Record<string, [number, number]> = {};
  if (candidate.spans && typeof candidate.spans === "object") {
    for (const [id, span] of Object.entries(candidate.spans)) {
      if (isSpan(span)) spans[id] = [Math.round(span[0]), Math.round(span[1])];
    }
  }
  const spacers: Record<string, [number, number]> = {};
  if (candidate.spacers && typeof candidate.spacers === "object") {
    for (const [id, span] of Object.entries(candidate.spacers)) {
      if (isSpan(span)) spacers[id] = [Math.round(span[0]), Math.round(span[1])];
    }
  }
  for (const entry of order) {
    const marker = readMarker(entry);
    if (marker?.kind === "slot" && !spacers[marker.id]) spacers[marker.id] = [2, 1];
  }
  return { v: VERSION, order, spans, spacers };
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

/* ------------------------------------------------------------------ */
/* Replay                                                              */
/* ------------------------------------------------------------------ */

/** One entry of a replayed arrangement: a real panel or a structural marker. */
export type FlowEntry =
  | { type: "panel"; panel: PlacedPanel }
  | { type: "marker"; marker: Marker; key: string };

/**
 * Replay a user arrangement over a planned page.
 *
 * Panels named in `order` come first in that order; anything the override does
 * not know about — a widget added since the arrangement was saved — keeps its
 * planned order and is appended. Spans ride along as the `span` contract hint,
 * so the measurer honours them through the same path as an authored `span=`.
 *
 * Markers are carried through in place. Trailing and doubled breaks are dropped:
 * they would open bands with nothing in them, and an empty band is a strip of
 * dead screen rather than a structure the user asked for.
 */
export const applyOverrides = (panels: PlacedPanel[], override: LayoutOverride | null): FlowEntry[] => {
  const asEntries = (list: PlacedPanel[]): FlowEntry[] =>
    list.map((panel) => ({ type: "panel" as const, panel }));

  if (!override || override.order.length === 0) return asEntries(panels);

  try {
    const byId = new Map(panels.map((panel) => [panel.widget.id, panel]));
    const seen = new Set<string>();
    const entries: FlowEntry[] = [];
    let markerCount = 0;

    for (const entry of override.order) {
      const marker = readMarker(entry);
      if (marker) {
        markerCount += 1;
        entries.push({ type: "marker", marker, key: `${entry}#${markerCount}` });
        continue;
      }
      const panel = byId.get(entry);
      if (!panel || seen.has(entry)) continue;
      seen.add(entry);
      entries.push({ type: "panel", panel });
    }
    for (const panel of panels) {
      if (!seen.has(panel.widget.id)) entries.push({ type: "panel", panel });
    }

    let order = 0;
    const replayed = entries.map((entry) => {
      if (entry.type !== "panel") return entry;
      const span = override.spans[entry.panel.widget.id];
      const panel = {
        ...entry.panel,
        order: order++,
        widget: span ? { ...entry.panel.widget, span } : entry.panel.widget,
      };
      return { type: "panel" as const, panel };
    });

    return prune(replayed);
  } catch {
    return asEntries(panels);
  }
};

/** Drop breaks that would open a band or column with nothing in it. */
const prune = (entries: FlowEntry[]): FlowEntry[] => {
  const out: FlowEntry[] = [];
  let sinceBreak = 0;
  for (const entry of entries) {
    if (entry.type === "panel") {
      sinceBreak += 1;
      out.push(entry);
      continue;
    }
    // A slot is content as far as structure goes: it is a landing area the user
    // deliberately opened, so the band around it must survive.
    if (entry.marker.kind === "slot") {
      sinceBreak += 1;
      out.push(entry);
      continue;
    }
    if (sinceBreak === 0) continue;
    sinceBreak = 0;
    out.push(entry);
  }
  // A break with nothing after it opens a band no panel ever lands in.
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (last.type === "marker" && last.marker.kind !== "slot") out.pop();
    else break;
  }
  return out;
};

/** The panels of a replayed arrangement, in order. */
export const panelsOf = (entries: FlowEntry[]): PlacedPanel[] =>
  entries.flatMap((entry) => (entry.type === "panel" ? [entry.panel] : []));
