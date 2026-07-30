import { describe, expect, it } from "vitest";
import { packFlow } from "./flow";
import { COL_BREAK, ROW_BREAK, sectionEntry, slotEntry, type FlowEntry } from "./overrides";
import { readMarker } from "./overrides";
import { profileFor } from "./viewport";
import type { PlacedPanel } from "./layout";
import type { Widget } from "../types/contract";

const WIDE = profileFor(1400, 900);

const panelEntry = (id: string, type = "status_tile"): FlowEntry => ({
  type: "panel",
  panel: {
    widget: { id, type: "lcars_box", children: [{ id: `${id}-leaf`, type }] } as unknown as Widget,
    zone: "primary",
    rowIndex: 0,
    colIndex: 0,
    order: 0,
  } as PlacedPanel,
});

const marker = (entry: string): FlowEntry => ({
  type: "marker",
  marker: readMarker(entry)!,
  key: entry,
});

const find = (layout: ReturnType<typeof packFlow>, id: string) =>
  layout.placements.find((p) => p.panel?.widget.id === id)!;

describe("packFlow", () => {
  it("flows a band left to right", () => {
    const layout = packFlow([panelEntry("a"), panelEntry("b")], WIDE);
    expect(find(layout, "a").row).toBe(find(layout, "b").row);
    expect(find(layout, "b").col).toBeGreaterThan(find(layout, "a").col);
  });

  it("stacks across a row break", () => {
    const layout = packFlow([panelEntry("a"), marker(ROW_BREAK), panelEntry("b")], WIDE);
    expect(find(layout, "b").row).toBeGreaterThan(find(layout, "a").row);
    expect(find(layout, "b").col).toBe(0);
  });

  it("puts a column break's panels side by side, each stacking downward", () => {
    const layout = packFlow(
      [panelEntry("a"), panelEntry("b"), marker(COL_BREAK), panelEntry("c")],
      WIDE,
    );
    // a and b share the first column, so b sits under a; c opens the second.
    expect(find(layout, "b").col).toBe(find(layout, "a").col);
    expect(find(layout, "b").row).toBeGreaterThan(find(layout, "a").row);
    expect(find(layout, "c").col).toBeGreaterThan(find(layout, "a").col);
    expect(find(layout, "c").row).toBe(find(layout, "a").row);
  });

  it("opens a named band and pushes its content below the label", () => {
    const layout = packFlow(
      [panelEntry("a"), marker(sectionEntry("Ops")), panelEntry("b")],
      WIDE,
    );
    expect(layout.sections).toHaveLength(1);
    expect(layout.sections[0].label).toBe("Ops");
    expect(find(layout, "b").row).toBeGreaterThan(layout.sections[0].row);
  });

  it("keeps an empty landing area on the grid so it can be dropped into", () => {
    const layout = packFlow([panelEntry("a"), marker(ROW_BREAK), marker(slotEntry("s1"))], WIDE);
    const slot = layout.placements.find((p) => p.slotId === "s1");
    expect(slot).toBeDefined();
    expect(slot!.row).toBeGreaterThan(find(layout, "a").row);
  });

  it("honours a persistent spacer's assigned footprint", () => {
    const layout = packFlow(
      [panelEntry("a"), marker(ROW_BREAK), marker(slotEntry("s1"))],
      WIDE,
      { spacers: { s1: [4, 3] } },
    );
    const slot = layout.placements.find((p) => p.slotId === "s1");
    expect(slot).toMatchObject({ colSpan: 4, rowSpan: 3 });
  });

  it("never lets a placement run off the side of the field", () => {
    const many = Array.from({ length: 12 }, (_, i) => panelEntry(`p${i}`, "line_chart"));
    const layout = packFlow(many, WIDE);
    for (const placement of layout.placements) {
      expect(placement.col).toBeGreaterThanOrEqual(0);
      expect(placement.col + placement.colSpan).toBeLessThanOrEqual(WIDE.cols);
    }
  });

  it("wraps a band once the line is full rather than overflowing it", () => {
    const many = Array.from({ length: 5 }, (_, i) => panelEntry(`p${i}`, "line_chart"));
    const layout = packFlow(many, WIDE);
    expect(new Set(layout.placements.map((p) => p.row)).size).toBeGreaterThan(1);
  });

  it("gives every column at least one square, however many are opened", () => {
    const entries: FlowEntry[] = [];
    for (let i = 0; i < WIDE.cols + 3; i += 1) {
      if (i > 0) entries.push(marker(COL_BREAK));
      entries.push(panelEntry(`p${i}`));
    }
    const layout = packFlow(entries, WIDE);
    expect(layout.placements.every((p) => p.colSpan >= 1)).toBe(true);
  });

  it("handles an empty arrangement", () => {
    expect(packFlow([], WIDE)).toEqual({ placements: [], sections: [], rows: 1 });
  });
});

describe("band widening", () => {
  it("spreads a band's leftover width onto the panels rather than into filler", () => {
    // The regression this guards: a hand-arranged band stopped at its panels'
    // natural width and the rest of the row became decoration.
    const layout = packFlow([panelEntry("a"), panelEntry("b")], WIDE);
    const covered = layout.placements.reduce((total, p) => total + p.colSpan, 0);
    expect(covered).toBe(WIDE.cols);
  });

  it("gives the extra width to the panel that can use it", () => {
    const layout = packFlow([panelEntry("tile"), panelEntry("chart", "line_chart")], WIDE);
    expect(find(layout, "chart").colSpan).toBeGreaterThan(find(layout, "tile").colSpan);
  });
});
