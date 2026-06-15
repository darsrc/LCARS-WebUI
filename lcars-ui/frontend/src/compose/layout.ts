/*
 * The adaptive layout brain.
 *
 * Real LCARS is not one fixed "top bar + left menu that scrolls" — every console
 * arranges its panels into asymmetric zones sized to fill the screen. This module
 * is the intelligence: given a page's panels it picks an archetype (or honours an
 * explicit one) and assigns each panel a zone. Pure + deterministic so it can be
 * reasoned about and tested without React.
 */
import type { Page, Widget } from "../types/contract";

export type Archetype = "console" | "telemetry" | "grid" | "menu";
export type Zone = "primary" | "side" | "dock" | "full";

const CHILD_KEYS = [
  "children",
  "header_children",
  "column_inputs",
  "left_children",
  "right_children",
  "rail_children",
  "content_children",
  "main_children",
  "side_children",
  "left_inputs",
  "right_inputs",
] as const;

const DATA_TYPES = new Set([
  "line_chart",
  "sparkline",
  "candlestick",
  "renko",
  "shader",
  "table",
  "log_viewer",
  "video_hls",
]);
const CONTROL_TYPES = new Set([
  "button",
  "toggle",
  "select",
  "text_input",
  "number_input",
  "form",
  "mic_button",
  "lcars_checkbox",
  "lcars_radio",
  "lcars_radio_toggle",
]);
const READOUT_TYPES = new Set(["status_tile", "gauge", "progress_bar"]);
const TEXT_TYPES = new Set(["text", "markdown", "alert"]);

type Kind = "data" | "control" | "readout" | "text";

const descendants = (widget: Widget): Widget[] => {
  const out: Widget[] = [];
  const visit = (node: Widget): void => {
    for (const key of CHILD_KEYS) {
      const arr = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(arr)) {
        for (const child of arr as Widget[]) {
          out.push(child);
          visit(child);
        }
      }
    }
  };
  visit(widget);
  return out;
};

/** Classify a panel by the dominant content it carries.
 * data → a main lane; control → the dock; readout → a status rail; text/mixed →
 * a main lane (substantial copy belongs on the primary surface, not the rail). */
export const panelKind = (widget: Widget): Kind => {
  const leaves = descendants(widget);
  let data = 0;
  let control = 0;
  let readout = 0;
  let text = 0;
  for (const leaf of leaves) {
    if (DATA_TYPES.has(leaf.type)) data += 1;
    else if (CONTROL_TYPES.has(leaf.type)) control += 1;
    else if (READOUT_TYPES.has(leaf.type)) readout += 1;
    else if (TEXT_TYPES.has(leaf.type)) text += 1;
  }
  if (data > 0) return "data";
  if (control > 0 && control >= readout + text) return "control";
  if (text > 0) return "text";
  if (readout > 0) return "readout";
  return "text";
};

const isPageTitleSweep = (widget: Widget, pageTitle: string): boolean =>
  widget.type === "lcars_sweep" &&
  typeof (widget as { title?: unknown }).title === "string" &&
  (widget as { title?: string }).title === pageTitle;

/** Flatten a page's top-level panels, dropping the strict page-title band. */
export const collectPanels = (page: Page): Widget[] => {
  const out: Widget[] = [];
  for (const row of page.rows) {
    for (const col of row.columns) {
      for (const widget of col.widgets) {
        if (widget.visible === false) continue;
        if (isPageTitleSweep(widget, page.title)) continue;
        out.push(widget);
      }
    }
  }
  return out;
};

/** Pick an archetype from the panel mix when the page asks for "auto". */
export const detectArchetype = (panels: Widget[]): Archetype => {
  if (panels.length === 0) return "console";
  const kinds = panels.map(panelKind);
  const dataCount = kinds.filter((k) => k === "data").length;
  // A wall of small panels reads as a periodic-table-style cell grid.
  if (panels.length >= 6 && dataCount <= 1) return "grid";
  // One or two panels with a dominant data viz reads as a telemetry scope.
  if (panels.length <= 2 && dataCount >= 1) return "telemetry";
  return "console";
};

const zoneFor = (kind: Kind, archetype: Archetype): Zone => {
  if (archetype === "grid") return "full";
  if (archetype === "menu") return kind === "control" ? "dock" : "primary";
  // console + telemetry share the main/side/dock grammar
  if (kind === "data" || kind === "text") return "primary";
  if (kind === "control") return "dock";
  return "side"; // readout
};

export interface PlacedPanel {
  widget: Widget;
  zone: Zone;
}

export interface ConsoleLayout {
  archetype: Archetype;
  panels: PlacedPanel[];
}

const VALID_ZONES = new Set<Zone>(["primary", "side", "dock", "full"]);

/** Plan a page into an archetype + per-panel zone placement. */
export const planLayout = (page: Page): ConsoleLayout => {
  const panels = collectPanels(page);
  const archetype: Archetype =
    page.archetype && page.archetype !== "auto"
      ? (page.archetype as Archetype)
      : detectArchetype(panels);

  const placed = panels.map((widget) => {
    const hint = (widget as { zone?: unknown }).zone;
    const explicit = typeof hint === "string" && VALID_ZONES.has(hint as Zone) ? (hint as Zone) : null;
    // In a grid every panel is a cell; otherwise honour an explicit hint.
    const zone = archetype === "grid" ? "full" : (explicit ?? zoneFor(panelKind(widget), archetype));
    return { widget, zone };
  });

  // Safety net: a console/telemetry/menu deck should never show an empty primary
  // lane while side/dock carry content — promote the first non-primary panel.
  if (archetype !== "grid" && placed.length > 0 && !placed.some((p) => p.zone === "primary")) {
    const promote = placed.find((p) => p.zone === "side") ?? placed[0];
    promote.zone = "primary";
  }

  return { archetype, panels: placed };
};
