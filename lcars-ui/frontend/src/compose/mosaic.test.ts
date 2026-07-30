import { describe, expect, it } from "vitest";
import { packMosaic } from "./mosaic";
import { measurePanel } from "./measure";
import { planLayout, type PlacedPanel } from "./layout";
import { profileFor } from "./viewport";
import type { Page, Widget } from "../types/contract";

const widget = (id: string, type: string, extra: Record<string, unknown> = {}): Widget =>
  ({ id, type, ...extra }) as unknown as Widget;

/** A panel container carrying one leaf, which is how the DSL emits every panel. */
const panel = (id: string, leafType: string, extra: Record<string, unknown> = {}): Widget =>
  widget(id, "lcars_box", { children: [widget(`${id}-leaf`, leafType)], ...extra });

const placed = (widgets: Widget[], zone: PlacedPanel["zone"] = "primary"): PlacedPanel[] =>
  widgets.map((w, index) => ({ widget: w, zone, rowIndex: 0, colIndex: 0, order: index }));

const page = (widgets: Widget[]): Page => ({
  id: "p",
  title: "P",
  archetype: "auto",
  rows: [{ id: "r", height: "auto", columns: [{ id: "c", width: "1fr", widgets }] }],
});

const WIDE = profileFor(2560, 1080);
const STANDARD = profileFor(1440, 900);
const PORTRAIT = profileFor(768, 1024);

/** Every grid cell a set of rectangles covers, as "col:row" keys. */
const coverage = (rects: { col: number; row: number; colSpan: number; rowSpan: number }[]) => {
  const keys: string[] = [];
  for (const r of rects) {
    for (let c = r.col; c < r.col + r.colSpan; c += 1) {
      for (let row = r.row; row < r.row + r.rowSpan; row += 1) keys.push(`${c}:${row}`);
    }
  }
  return keys;
};

describe("viewport profile", () => {
  it("uses the exact field height so the final row reaches the footer", () => {
    expect(profileFor(1440, 903).fieldHeight).toBe(903);
    expect(profileFor(1440, 907.75).fieldHeight).toBe(907);
  });
});

describe("packMosaic invariants", () => {
  const mixed = [
    panel("chart", "line_chart"),
    panel("table", "table"),
    panel("gauge", "gauge"),
    panel("tile", "status_tile"),
    panel("log", "log_viewer"),
    panel("btn", "button"),
  ];

  it("never overlaps two cells", () => {
    const mosaic = packMosaic(placed(mixed), WIDE);
    const keys = coverage(mosaic.cells);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps every cell inside the column count", () => {
    for (const profile of [WIDE, STANDARD, PORTRAIT]) {
      const mosaic = packMosaic(placed(mixed), profile);
      expect(mosaic.cells).toHaveLength(mixed.length);
      for (const cell of mosaic.cells) {
        expect(cell.col).toBeGreaterThanOrEqual(0);
        expect(cell.col + cell.colSpan).toBeLessThanOrEqual(profile.cols);
        expect(cell.colSpan).toBeGreaterThanOrEqual(1);
        expect(cell.rowSpan).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("is deterministic across repeat calls", () => {
    const a = packMosaic(placed(mixed), WIDE, { seed: "p" });
    const b = packMosaic(placed(mixed), WIDE, { seed: "p" });
    expect(JSON.stringify(b.cells.map(({ measure: _m, widget: _w, ...rest }) => rest))).toBe(
      JSON.stringify(a.cells.map(({ measure: _m, widget: _w, ...rest }) => rest)),
    );
    expect(b.fillers).toEqual(a.fillers);
  });

  it("fillers never collide with panels", () => {
    const mosaic = packMosaic(placed(mixed), WIDE, { seed: "p" });
    const keys = coverage([...mosaic.cells, ...mosaic.fillers]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("leaves no dead space once fillers are laid in", () => {
    const mosaic = packMosaic(placed(mixed), WIDE, { seed: "p" });
    expect(new Set(coverage([...mosaic.cells, ...mosaic.fillers])).size).toBe(
      mosaic.cols * mosaic.rows,
    );
  });

  it("suppresses fillers when the page opts out", () => {
    expect(packMosaic(placed(mixed), WIDE, { fillers: false }).fillers).toEqual([]);
  });

  it("fits the row stack to the field instead of running off the bottom", () => {
    // The regression this guards: rows overflowed the deck, which clips, so the
    // panels past the fold were silently invisible. Row tracks are solved per
    // page now, so the stack is their sum plus the seams between them.
    for (const profile of [WIDE, STANDARD, PORTRAIT]) {
      const mosaic = packMosaic(placed(mixed), profile);
      expect(mosaic.rowHeights).toHaveLength(mosaic.rows);
      const used = mosaic.rowHeights.reduce((a, b) => a + b, 0) + (mosaic.rows - 1) * 4;
      // Either it fits the field, or it hit the legibility floor and will scroll.
      expect(used <= profile.fieldHeight || mosaic.overflows).toBe(true);
    }
  });

  it("reports overflow only when the field genuinely could not hold the page", () => {
    const mosaic = packMosaic(placed(mixed), WIDE);
    expect(mosaic.overflows).toBe(false);
  });

  it("stretches a short page to fill the field rather than leaving a void", () => {
    const mosaic = packMosaic(placed([panel("chart", "line_chart")]), WIDE);
    expect(mosaic.rowUnit).toBeGreaterThan(WIDE.rowUnit);
  });
});

describe("zone regions", () => {
  const panels: PlacedPanel[] = [
    ...placed([panel("chart", "line_chart"), panel("table", "table")], "primary"),
    ...placed([panel("gauge", "gauge"), panel("meter", "progress_bar")], "side"),
    ...placed([panel("controls", "button")], "dock"),
  ];

  it("confines side panels to the right-hand strip on a wide field", () => {
    const mosaic = packMosaic(panels, WIDE);
    const side = mosaic.cells.filter((cell) => cell.zone === "side");
    expect(side.length).toBeGreaterThan(0);
    for (const cell of side) {
      expect(cell.col).toBeGreaterThanOrEqual(WIDE.cols - 2);
      expect(cell.col + cell.colSpan).toBeLessThanOrEqual(WIDE.cols);
    }
    // ...and keeps the main content out of that strip.
    for (const cell of mosaic.cells.filter((c) => c.zone !== "side")) {
      expect(cell.col + cell.colSpan).toBeLessThanOrEqual(WIDE.cols - 2);
    }
  });

  it("places every panel when portrait collapses the regions", () => {
    // The regression this guards: side panels were filtered out of the main
    // flow but never re-added once the strip was gone, so they vanished.
    const mosaic = packMosaic(panels, PORTRAIT);
    expect(mosaic.cells.map((c) => c.widget.id).sort()).toEqual([
      "chart",
      "controls",
      "gauge",
      "meter",
      "table",
    ]);
    expect(mosaic.cols).toBeLessThan(WIDE.cols);
  });

  it("settles the dock under the instruments it drives", () => {
    const mosaic = packMosaic(panels, WIDE);
    const dock = mosaic.cells.find((cell) => cell.zone === "dock");
    const deepestMain = Math.max(
      ...mosaic.cells.filter((c) => c.zone === "primary").map((c) => c.row + c.rowSpan),
    );
    expect(dock?.row).toBeGreaterThanOrEqual(deepestMain);
  });
});

describe("packing behaviour", () => {
  it("marks the perimeter so the field can be cut into elbows", () => {
    const mosaic = packMosaic(placed([panel("chart", "line_chart"), panel("t", "table")]), STANDARD);
    expect(mosaic.cells.some((cell) => cell.cap === "tl")).toBe(true);
    expect(mosaic.cells.every((cell) => typeof cell.edges === "string")).toBe(true);
  });

  it("honours an explicit span hint over the derived footprint", () => {
    const pinned = panel("pinned", "status_tile", { span: [3, 2] });
    const [cell] = packMosaic(placed([pinned]), WIDE).cells;
    expect([cell.colSpan, cell.rowSpan]).toEqual([3, 2]);
  });

  it("packs a group adjacent rather than scattering it", () => {
    const grouped = placed([
      panel("a", "status_tile", { group: "sensors" }),
      panel("far", "line_chart"),
      panel("b", "status_tile", { group: "sensors" }),
    ]);
    const mosaic = packMosaic(grouped, WIDE);
    const a = mosaic.cells.find((c) => c.widget.id === "a");
    const b = mosaic.cells.find((c) => c.widget.id === "b");
    expect(a?.row).toBe(b?.row);
  });

  it("respects the given order when packing explicitly", () => {
    const ordered = placed([
      panel("small", "status_tile"),
      panel("big", "table"),
    ]);
    const mosaic = packMosaic(ordered, WIDE, { order: "explicit" });
    const small = mosaic.cells.find((c) => c.widget.id === "small");
    // Auto packing would float the heavy table first; explicit must not.
    expect(small?.col).toBe(0);
    expect(small?.row).toBe(0);
  });

  it("consumes a full planLayout page end to end", () => {
    const source = page([panel("chart", "line_chart"), panel("btn", "button")]);
    const plan = planLayout(source);
    const mosaic = packMosaic(plan.panels, STANDARD, { seed: source.id });
    expect(mosaic.cells.map((c) => c.widget.id).sort()).toEqual(["btn", "chart"]);
  });
});

describe("measurePanel", () => {
  it("reads a chart as wide, a gauge as tall and a tile as small", () => {
    const chart = measurePanel(panel("c", "line_chart"), WIDE);
    const gauge = measurePanel(panel("g", "gauge"), WIDE);
    const tile = measurePanel(panel("t", "status_tile"), WIDE);
    expect(chart.aspect).toBe("wide");
    expect(chart.cols).toBeGreaterThan(tile.cols);
    expect(gauge.rows).toBeGreaterThan(tile.rows);
    expect(chart.weight).toBeGreaterThan(tile.weight);
  });

  it("scales the footprint with the column count", () => {
    expect(measurePanel(panel("c", "line_chart"), WIDE).cols).toBeGreaterThan(
      measurePanel(panel("c", "line_chart"), PORTRAIT).cols,
    );
  });

  it("never demands more columns than the field has", () => {
    const huge = panel("huge", "table", { span: [99, 1] });
    expect(measurePanel(huge, STANDARD).cols).toBe(STANDARD.cols);
  });

  it("fills by default while preserving an explicit content-sized opt-out", () => {
    const filled = measurePanel(panel("filled", "status_tile"), WIDE);
    const intrinsic = measurePanel(panel("intrinsic", "status_tile", { sizing: "content" }), WIDE);
    expect(filled.sizing).toBe("fill");
    expect(filled.grow).toBeGreaterThan(0);
    expect(filled.maxCols).toBe(WIDE.cols);
    expect(intrinsic.sizing).toBe("content");
    expect(intrinsic.grow).toBe(0);
    expect(intrinsic.maxCols).toBeLessThan(WIDE.cols);
  });

  it("reduces a collapsed panel to its title band even when its span was pinned", () => {
    const collapsed = measurePanel(
      panel("collapsed", "table", { span: [5, 4] }),
      WIDE,
      { collapsed: true },
    );
    expect(collapsed).toMatchObject({
      collapsed: true,
      rows: 1,
      minRows: 1,
      grow: 0,
      pinned: false,
      naturalPx: 44,
      minPx: 44,
    });
  });
});
