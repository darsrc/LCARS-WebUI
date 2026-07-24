/*
 * Panel measurement.
 *
 * The old deck gave every panel the same weight and let flexbox decide its
 * height, which is why the console read as a stack of equal boxes. Real LCARS
 * sizes an element by what it carries: a warp-field plot owns a whole quadrant,
 * a status tile is a chip, a gauge is a tall slot. This module turns a panel's
 * content into a footprint the packer can lay down.
 *
 * Pure and profile-aware — no React, no DOM.
 */
import { descendants, panelKind, type Kind } from "./layout";
import type { ViewportProfile } from "./viewport";
import type { Widget } from "../types/contract";

export type Aspect = "wide" | "tall" | "square" | "flex";

export interface PanelMeasure {
  kind: Kind;
  /** 1..12 importance. Heavier panels anchor the mosaic first. */
  weight: number;
  aspect: Aspect;
  cols: number;
  rows: number;
  minCols: number;
  maxCols: number;
  minRows: number;
}

interface Footprint {
  cols: number;
  rows: number;
  aspect: Aspect;
  weight: number;
}

/* Intrinsic footprint per leaf type, in grid units at the reference 6-column
 * profile. `weight` doubles as the "which leaf dominates this panel" score. */
const FOOTPRINT: Record<string, Footprint> = {
  // Data — these are the anchors.
  video_hls: { cols: 3, rows: 3, aspect: "wide", weight: 11 },
  table: { cols: 3, rows: 3, aspect: "wide", weight: 10 },
  line_chart: { cols: 3, rows: 2, aspect: "wide", weight: 9 },
  candlestick: { cols: 3, rows: 2, aspect: "wide", weight: 9 },
  renko: { cols: 3, rows: 2, aspect: "wide", weight: 9 },
  shader: { cols: 2, rows: 2, aspect: "square", weight: 8 },
  log_viewer: { cols: 2, rows: 3, aspect: "tall", weight: 8 },
  sparkline: { cols: 2, rows: 1, aspect: "wide", weight: 5 },
  // Text.
  markdown: { cols: 2, rows: 2, aspect: "flex", weight: 5 },
  alert: { cols: 2, rows: 1, aspect: "wide", weight: 4 },
  text: { cols: 2, rows: 1, aspect: "flex", weight: 3 },
  // Controls.
  form: { cols: 2, rows: 2, aspect: "flex", weight: 6 },
  mic_button: { cols: 1, rows: 1, aspect: "square", weight: 3 },
  text_input: { cols: 2, rows: 1, aspect: "wide", weight: 3 },
  number_input: { cols: 1, rows: 1, aspect: "wide", weight: 2 },
  select: { cols: 1, rows: 1, aspect: "wide", weight: 2 },
  lcars_radio: { cols: 1, rows: 1, aspect: "wide", weight: 2 },
  lcars_radio_toggle: { cols: 1, rows: 1, aspect: "wide", weight: 2 },
  toggle: { cols: 1, rows: 1, aspect: "square", weight: 2 },
  lcars_checkbox: { cols: 1, rows: 1, aspect: "square", weight: 1 },
  button: { cols: 1, rows: 1, aspect: "square", weight: 1 },
  // Readouts.
  gauge: { cols: 1, rows: 2, aspect: "tall", weight: 4 },
  progress_bar: { cols: 1, rows: 1, aspect: "wide", weight: 3 },
  status_tile: { cols: 1, rows: 1, aspect: "square", weight: 2 },
};

const DEFAULT_FOOTPRINT: Footprint = { cols: 2, rows: 1, aspect: "flex", weight: 2 };

/** The reference profile the FOOTPRINT table is authored against. */
const REFERENCE_COLS = 6;

const VALID_ASPECTS = new Set<Aspect>(["wide", "tall", "square", "flex"]);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Every leaf under a panel, or the panel itself when it carries no children. */
const leavesOf = (widget: Widget): Widget[] => {
  const kids = descendants(widget);
  const leaves = kids.filter((leaf) => FOOTPRINT[leaf.type] !== undefined);
  if (leaves.length > 0) return leaves;
  return kids.length > 0 ? kids : [widget];
};

const readSpan = (widget: Widget): [number, number] | null => {
  const span = (widget as { span?: unknown }).span;
  if (!Array.isArray(span) || span.length !== 2) return null;
  const [cols, rows] = span;
  if (typeof cols !== "number" || typeof rows !== "number") return null;
  if (!Number.isFinite(cols) || !Number.isFinite(rows)) return null;
  return [Math.max(1, Math.round(cols)), Math.max(1, Math.round(rows))];
};

/** Derive the footprint a panel wants, before the packer negotiates it down. */
export const measurePanel = (widget: Widget, profile: ViewportProfile): PanelMeasure => {
  const kind = panelKind(widget);
  const leaves = leavesOf(widget);

  // The heaviest leaf sets the panel's character; the rest add bulk.
  let dominant = DEFAULT_FOOTPRINT;
  for (const leaf of leaves) {
    const fp = FOOTPRINT[leaf.type];
    if (fp && fp.weight > dominant.weight) dominant = fp;
  }

  // Scale the authored footprint from the reference grid to this one, so a
  // chart that owns half a 6-column deck still owns half of a 4-column deck.
  const scale = profile.cols / REFERENCE_COLS;
  let cols = clamp(Math.round(dominant.cols * scale) || 1, 1, profile.cols);
  let rows = Math.max(1, dominant.rows);

  // Bulk: extra leaves need somewhere to go. Small repeated controls tile into
  // rows; a second heavy element widens the panel instead.
  const extra = Math.max(0, leaves.length - 1);
  if (extra > 0) {
    if (kind === "control" || kind === "readout") {
      rows += Math.floor(extra / Math.max(2, cols * 2));
    } else {
      rows += Math.min(2, Math.floor(extra / 3));
    }
  }

  let aspect = dominant.aspect;
  let weight = clamp(dominant.weight + Math.min(3, Math.floor(extra / 2)), 1, 12);

  // Author hints win outright.
  const hintAspect = (widget as { aspect?: unknown }).aspect;
  if (typeof hintAspect === "string" && VALID_ASPECTS.has(hintAspect as Aspect)) {
    aspect = hintAspect as Aspect;
    if (aspect === "wide") cols = clamp(Math.max(cols, 3), 1, profile.cols);
    if (aspect === "tall") {
      cols = Math.max(1, Math.min(cols, Math.ceil(profile.cols / 3)));
      rows = Math.max(rows, 2);
    }
    if (aspect === "square") cols = Math.max(1, Math.min(cols, rows));
  }

  const hintWeight = (widget as { weight?: unknown }).weight;
  if (typeof hintWeight === "number" && Number.isFinite(hintWeight)) {
    weight = clamp(Math.round(hintWeight), 1, 12);
    // Weight biases size as well as packing order — that is the point of it.
    if (weight >= 9) cols = clamp(cols + 1, 1, profile.cols);
    else if (weight <= 2) cols = Math.max(1, cols - 1);
  }

  const explicitSpan = readSpan(widget);
  if (explicitSpan) {
    cols = clamp(explicitSpan[0], 1, profile.cols);
    rows = Math.max(1, explicitSpan[1]);
  }

  // A panel may never demand more rows than the field has.
  rows = clamp(rows, 1, Math.max(1, profile.rows));

  const minCols = explicitSpan ? cols : clamp(aspect === "wide" ? 2 : 1, 1, profile.cols);
  // Content should claim the field before decoration does, so a panel may grow
  // well past its natural width when there is nothing competing for the space.
  const maxCols = explicitSpan ? cols : clamp(cols * 2, cols, profile.cols);

  return { kind, weight, aspect, cols, rows, minCols, maxCols, minRows: rows };
};
