import { describe, expect, it } from "vitest";
import { rowTemplate, solveRows, type RowDemand } from "./rows";

const SEAM = 4;
const MIN = 44;

const total = (heights: number[]) =>
  heights.reduce((a, b) => a + b, 0) + SEAM * Math.max(0, heights.length - 1);

describe("solveRows", () => {
  it("gives a content-sized cell exactly the height it asked for", () => {
    const cells: RowDemand[] = [
      { row: 0, rowSpan: 1, demand: 400, grow: 3 },
      { row: 1, rowSpan: 1, demand: 120, grow: 0 },
    ];
    const { heights } = solveRows(cells, 2, 800, SEAM, MIN);
    expect(heights[1]).toBe(120);
  });

  it("hands the field's slack to whatever can use it", () => {
    // The regression this guards: every row shared the surplus equally, so a
    // panel holding two buttons was inflated to the size of a chart.
    const cells: RowDemand[] = [
      { row: 0, rowSpan: 1, demand: 200, grow: 3 },
      { row: 1, rowSpan: 1, demand: 100, grow: 0 },
    ];
    const { heights } = solveRows(cells, 2, 900, SEAM, MIN);
    expect(heights[1]).toBe(100);
    expect(heights[0]).toBeGreaterThan(600);
  });

  it("fills the field exactly, so a deck that fits never shows a scrollbar", () => {
    const cells: RowDemand[] = [
      { row: 0, rowSpan: 2, demand: 300, grow: 3 },
      { row: 2, rowSpan: 1, demand: 111, grow: 0 },
    ];
    const solved = solveRows(cells, 3, 777, SEAM, MIN);
    expect(total(solved.heights)).toBeLessThanOrEqual(777);
    expect(solved.overflows).toBe(false);
  });

  it("stretches a short page rather than leaving a void beneath it", () => {
    const cells: RowDemand[] = [{ row: 0, rowSpan: 1, demand: 100, grow: 0 }];
    const { heights } = solveRows(cells, 1, 600, SEAM, MIN);
    expect(heights[0]).toBe(600);
  });

  it("spreads a spanning cell's demand across the rows it covers", () => {
    const cells: RowDemand[] = [{ row: 0, rowSpan: 2, demand: 300, grow: 0 }];
    const { heights } = solveRows(cells, 2, 304, SEAM, MIN);
    expect(heights[0] + heights[1] + SEAM).toBeGreaterThanOrEqual(300);
  });

  it("compresses toward the floor before it admits defeat", () => {
    const cells: RowDemand[] = [
      { row: 0, rowSpan: 1, demand: 400, grow: 0 },
      { row: 1, rowSpan: 1, demand: 400, grow: 0 },
    ];
    const solved = solveRows(cells, 2, 500, SEAM, MIN);
    expect(total(solved.heights)).toBeLessThanOrEqual(500);
    expect(solved.heights.every((h) => h >= MIN)).toBe(true);
  });

  it("reports overflow rather than clipping when even the floor will not fit", () => {
    const cells: RowDemand[] = Array.from({ length: 10 }, (_, row) => ({
      row,
      rowSpan: 1,
      demand: 200,
      grow: 0,
    }));
    const solved = solveRows(cells, 10, 300, SEAM, MIN);
    expect(solved.overflows).toBe(true);
    expect(solved.heights.every((h) => h === MIN)).toBe(true);
  });

  it("never returns a track below the legibility floor", () => {
    const cells: RowDemand[] = [{ row: 0, rowSpan: 1, demand: 10, grow: 0 }];
    expect(solveRows(cells, 4, 100, SEAM, MIN).heights.every((h) => h >= MIN)).toBe(true);
  });

  it("handles an empty deck", () => {
    expect(solveRows([], 0, 800, SEAM, MIN)).toEqual({ heights: [], overflows: false });
  });
});

describe("rowTemplate", () => {
  it("writes a grid-template-rows value", () => {
    expect(rowTemplate([100, 40])).toBe("100px 40px");
  });
});
