/*
 * Row-track sizing.
 *
 * The mosaic packer decides *where* every panel sits; this module decides how
 * tall each row of that grid is. Until 4.2 the deck used one uniform row unit,
 * which is why a panel holding two buttons was handed the same slab of screen
 * as a twenty-row table: the grid could only speak in multiples of one height.
 *
 * Here every cell states the height its content actually wants and how much
 * appetite it has for more, and the field's height is divided accordingly —
 * content-sized panels get exactly what they need, and the slack goes to the
 * instruments that can use it.
 *
 * Pure and deterministic: no DOM, no React. The measured demands come in as
 * plain numbers, whether they were estimated (compose/measure.ts) or read off
 * the mounted deck (compose/demand.ts).
 */

export interface RowDemand {
  /** First grid row the cell occupies, 0-based. */
  row: number;
  rowSpan: number;
  /** Height in px the cell's content wants across its whole span. */
  demand: number;
  /** 0 = content-sized, higher = absorbs the field's leftover height. */
  grow: number;
}

export interface RowSolution {
  /** Height of each row track, in px. */
  heights: number[];
  /** True when the demands could not be met inside the field — the deck scrolls. */
  overflows: boolean;
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

/**
 * Divide `fieldHeight` into `rowCount` tracks that satisfy every cell's demand.
 *
 * Three passes:
 *   1. Every row starts at `minRow`, then each cell's deficit is spread evenly
 *      across the rows it spans — narrow spans first, since a one-row cell has
 *      no other row to borrow from and so is the most constrained.
 *   2. Leftover height goes to rows carrying a growing cell, in proportion to
 *      the strongest appetite on that row. With nothing hungry it is shared
 *      evenly, so a short page still fills its screen rather than leaving a void.
 *   3. If the demands overshoot the field the tracks are compressed back toward
 *      `minRow`; if they still do not fit, `overflows` is set and the deck takes
 *      a scrollbar rather than clipping a panel away.
 */
export const solveRows = (
  cells: RowDemand[],
  rowCount: number,
  fieldHeight: number,
  seam: number,
  minRow: number,
): RowSolution => {
  if (rowCount <= 0) return { heights: [], overflows: false };

  const heights = new Array<number>(rowCount).fill(minRow);
  const seams = seam * (rowCount - 1);
  const usable = Math.max(minRow, fieldHeight - seams);

  // Pass 1 — satisfy demand, most-constrained cell first.
  const ordered = [...cells].sort((a, b) => a.rowSpan - b.rowSpan);
  for (const cell of ordered) {
    const start = Math.max(0, Math.min(cell.row, rowCount - 1));
    const span = Math.max(1, Math.min(cell.rowSpan, rowCount - start));
    let have = seam * (span - 1);
    for (let r = start; r < start + span; r += 1) have += heights[r];
    const deficit = cell.demand - have;
    if (deficit <= 0) continue;
    const share = deficit / span;
    for (let r = start; r < start + span; r += 1) heights[r] += share;
  }

  const total = sum(heights);

  if (total < usable) {
    // Pass 2 — hand the slack to whatever can use it.
    const appetite = new Array<number>(rowCount).fill(0);
    for (const cell of cells) {
      if (cell.grow <= 0) continue;
      const start = Math.max(0, Math.min(cell.row, rowCount - 1));
      const span = Math.max(1, Math.min(cell.rowSpan, rowCount - start));
      for (let r = start; r < start + span; r += 1) {
        appetite[r] = Math.max(appetite[r], cell.grow);
      }
    }
    let weight = sum(appetite);
    if (weight === 0) {
      appetite.fill(1);
      weight = rowCount;
    }
    const slack = usable - total;
    for (let r = 0; r < rowCount; r += 1) heights[r] += slack * (appetite[r] / weight);
  } else if (total > usable) {
    // Pass 3 — compress, but never below the legibility floor.
    const headroom = heights.map((value) => Math.max(0, value - minRow));
    const available = sum(headroom);
    const excess = Math.min(total - usable, available);
    if (available > 0) {
      for (let r = 0; r < rowCount; r += 1) heights[r] -= excess * (headroom[r] / available);
    }
  }

  // Round to whole pixels, then give the rounding remainder to the tallest row
  // so the tracks add up to the field exactly — a one-pixel overshoot here is a
  // scrollbar on a deck that had no business scrolling.
  const rounded = heights.map((value) => Math.max(minRow, Math.floor(value)));
  const packed = sum(rounded);
  const overflows = packed + seams > fieldHeight + 1;
  if (!overflows && packed < usable) {
    let tallest = 0;
    for (let r = 1; r < rowCount; r += 1) if (rounded[r] > rounded[tallest]) tallest = r;
    rounded[tallest] += usable - packed;
  }

  return { heights: rounded, overflows };
};

/** Render a solution as a `grid-template-rows` value. */
export const rowTemplate = (heights: number[]): string =>
  heights.map((height) => `${height}px`).join(" ");
