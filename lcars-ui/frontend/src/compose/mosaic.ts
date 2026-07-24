/*
 * The mosaic packer.
 *
 * The deck used to be three flex columns of equally-weighted panels stacked top
 * to bottom, which is why it read as a dashboard. Real LCARS tessellates: a big
 * instrument anchors a quadrant and smaller elements interlock around it until
 * the field is full. This module lays every panel onto one integer grid.
 *
 * The zone grammar from `planLayout` survives as *region constraints* on that
 * grid — `side` panels are confined to the right-hand columns, `dock` panels
 * settle along the bottom — so an author's zone hint still means what it meant,
 * it just no longer implies a separate scrolling column.
 *
 * Pure and deterministic: identical input always yields an identical mosaic.
 */
import { measurePanel, type PanelMeasure } from "./measure";
import { buildFillers, type FillerCell, type Rect } from "./fillers";
import type { PlacedPanel, Zone } from "./layout";
import { SEAM, type ViewportProfile } from "./viewport";
import type { Widget } from "../types/contract";

export type Cap = "tl" | "tr" | "bl" | "br";

/** Below this a compressed row stops being legible; the deck scrolls instead. */
const MIN_ROW_UNIT = 44;

export interface MosaicCell extends Rect {
  widget: Widget;
  zone: Zone;
  measure: PanelMeasure;
  /** Which outer corner of the field this cell occupies, if any. */
  cap?: Cap;
  /** Which edges of the field this cell touches — drives the end-cap radii. */
  edges: string;
}

export interface Mosaic {
  cols: number;
  rows: number;
  rowUnit: number;
  cells: MosaicCell[];
  fillers: FillerCell[];
}

export interface PackOptions {
  /** Seed for filler codes. Pass the page id so decoration is stable per page. */
  seed?: string;
  /** Emit decorative filler blocks in the leftover cells. */
  fillers?: boolean;
  /** "explicit" packs panels in the order given, skipping the grouping and
   * weight sort — what a hand-arranged deck needs so the user's order sticks. */
  order?: "auto" | "explicit";
}

/** A horizontal slice of columns a panel is allowed to occupy. */
interface Region {
  start: number;
  end: number; // exclusive
}

/* ------------------------------------------------------------------ */
/* Occupancy grid                                                      */
/* ------------------------------------------------------------------ */

class Grid {
  readonly cols: number;
  private rows: boolean[][] = [];

  constructor(cols: number) {
    this.cols = cols;
  }

  get height(): number {
    return this.rows.length;
  }

  private rowAt(row: number): boolean[] {
    while (this.rows.length <= row) this.rows.push(new Array<boolean>(this.cols).fill(false));
    return this.rows[row];
  }

  fits(col: number, row: number, colSpan: number, rowSpan: number, region: Region): boolean {
    if (col < region.start || col + colSpan > region.end) return false;
    for (let r = row; r < row + rowSpan; r += 1) {
      const cells = this.rowAt(r);
      for (let c = col; c < col + colSpan; c += 1) {
        if (cells[c]) return false;
      }
    }
    return true;
  }

  occupy(col: number, row: number, colSpan: number, rowSpan: number): void {
    for (let r = row; r < row + rowSpan; r += 1) {
      const cells = this.rowAt(r);
      for (let c = col; c < col + colSpan; c += 1) cells[c] = true;
    }
  }

  taken(col: number, row: number): boolean {
    return this.rows[row]?.[col] ?? false;
  }

  /** First free slot in reading order — topmost, then leftmost. */
  find(colSpan: number, rowSpan: number, region: Region, fromRow = 0): { col: number; row: number } {
    for (let row = fromRow; ; row += 1) {
      for (let col = region.start; col + colSpan <= region.end; col += 1) {
        if (this.fits(col, row, colSpan, rowSpan, region)) return { col, row };
      }
      // Unreachable in practice: an empty row always fits a region-sized panel.
      if (row > fromRow + 512) return { col: region.start, row };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Ordering                                                            */
/* ------------------------------------------------------------------ */

interface Candidate {
  panel: PlacedPanel;
  measure: PanelMeasure;
}

/* Panels the author declared in the same DSL row belong together, so groups are
 * placed as units and only sorted internally — heaviest first, so the anchor
 * lands and the small elements tessellate into the space it leaves. */
const orderCandidates = (candidates: Candidate[]): Candidate[] => {
  const groups = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const explicit = (candidate.panel.widget as { group?: unknown }).group;
    const key = typeof explicit === "string" && explicit ? `g:${explicit}` : `r:${candidate.panel.rowIndex}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(candidate);
    else groups.set(key, [candidate]);
  }

  const ordered = [...groups.values()].sort(
    (a, b) => Math.min(...a.map((c) => c.panel.order)) - Math.min(...b.map((c) => c.panel.order)),
  );

  return ordered.flatMap((group) =>
    [...group].sort((a, b) => b.measure.weight - a.measure.weight || a.panel.order - b.panel.order),
  );
};

/* ------------------------------------------------------------------ */
/* Holes                                                               */
/* ------------------------------------------------------------------ */

/** Merge the untaken cells of a filled grid into maximal rectangles: first into
 * horizontal runs per row, then downward wherever a run repeats exactly. */
const findHoles = (grid: Grid, cols: number, rows: number): Rect[] => {
  const runs: Rect[] = [];
  for (let row = 0; row < rows; row += 1) {
    let col = 0;
    while (col < cols) {
      if (grid.taken(col, row)) {
        col += 1;
        continue;
      }
      let end = col;
      while (end < cols && !grid.taken(end, row)) end += 1;
      runs.push({ col, row, colSpan: end - col, rowSpan: 1 });
      col = end;
    }
  }

  const merged: Rect[] = [];
  const consumed = new Set<number>();
  runs.forEach((run, index) => {
    if (consumed.has(index)) return;
    let rowSpan = 1;
    for (let next = index + 1; next < runs.length; next += 1) {
      if (consumed.has(next)) continue;
      const candidate = runs[next];
      if (candidate.row !== run.row + rowSpan) continue;
      if (candidate.col !== run.col || candidate.colSpan !== run.colSpan) continue;
      consumed.add(next);
      rowSpan += 1;
    }
    merged.push({ ...run, rowSpan });
  });
  return merged;
};

/* ------------------------------------------------------------------ */
/* Pack                                                                */
/* ------------------------------------------------------------------ */

/** Lay a planned page onto the mosaic grid. */
export const packMosaic = (
  panels: PlacedPanel[],
  profile: ViewportProfile,
  options: PackOptions = {},
): Mosaic => {
  const { cols } = profile;
  const grid = new Grid(cols);

  const candidates: Candidate[] = panels.map((panel) => ({
    panel,
    measure: measurePanel(panel.widget, profile),
  }));

  // A narrow or portrait field has no room for a side strip: the regions
  // collapse and every panel joins one flow.
  const sideCandidates = candidates.filter((c) => c.panel.zone === "side");
  const regionsActive = !profile.portrait && cols >= 4 && sideCandidates.length > 0;
  const sideCols = regionsActive ? (cols >= 6 ? 2 : 1) : 0;

  const mainRegion: Region = { start: 0, end: cols - sideCols };
  const sideRegion: Region = { start: cols - sideCols, end: cols };

  const regionFor = (zone: Zone): Region =>
    regionsActive && zone === "side" ? sideRegion : mainRegion;

  // Main and dock share the primary region; dock goes last so controls settle
  // along the bottom of the field, under the instruments they drive.
  const order = options.order === "explicit" ? (group: Candidate[]) => group : orderCandidates;
  // With the regions collapsed there is no side strip, so those panels rejoin
  // the main flow rather than being dropped on the floor.
  const inMain = (c: Candidate) =>
    c.panel.zone !== "dock" && !(regionsActive && c.panel.zone === "side");
  const main = order(candidates.filter(inMain));
  const dock = order(candidates.filter((c) => c.panel.zone === "dock"));
  const side = order(regionsActive ? sideCandidates : []);
  const sequence = [...main, ...side, ...dock];

  const cells: MosaicCell[] = [];
  // Controls settle *under* the instruments they drive, so the dock may not
  // backfill holes left in the main field — everything else may, and that
  // backfilling is exactly what makes the field tessellate.
  let dockFloor = 0;

  for (const { panel, measure } of sequence) {
    if (panel.zone === "dock" && dockFloor === 0) {
      dockFloor = cells.reduce(
        (deepest, cell) => (cell.zone === "side" ? deepest : Math.max(deepest, cell.row + cell.rowSpan)),
        0,
      );
    }
    const region = regionFor(panel.zone);
    const fromRow = panel.zone === "dock" ? dockFloor : 0;
    const width = Math.max(1, region.end - region.start);
    const desired = Math.min(measure.cols, width);
    const floor = Math.min(measure.minCols, desired);

    // Prefer the shallowest placement; a narrower span that keeps the panel on
    // the current shelf beats a wider one that starts a new row.
    let best: { col: number; row: number; colSpan: number } | null = null;
    for (let span = desired; span >= floor; span -= 1) {
      const slot = grid.find(span, measure.rows, region, fromRow);
      if (!best || slot.row < best.row) best = { ...slot, colSpan: span };
      if (best.row === fromRow && span === desired) break;
    }
    const placement = best ?? { col: region.start, row: grid.height, colSpan: desired };

    grid.occupy(placement.col, placement.row, placement.colSpan, measure.rows);
    cells.push({
      widget: panel.widget,
      zone: panel.zone,
      measure,
      col: placement.col,
      row: placement.row,
      colSpan: placement.colSpan,
      rowSpan: measure.rows,
      edges: "",
    });
  }

  const rows = Math.max(grid.height, 1);

  /* Fit the stack of rows to the field. LCARS surfaces are cut to their screen:
   * a short page stretches to fill it rather than leaving a void beneath, and a
   * tall one compresses rather than running off the bottom — where the deck's
   * clipped overflow would simply have hidden those panels. Below MIN_ROW_UNIT
   * compression stops being legible, so the deck scrolls instead. */
  const fieldHeight = profile.rows * (profile.rowUnit + SEAM);
  const fitRowUnit = Math.max(
    MIN_ROW_UNIT,
    Math.floor((fieldHeight - (rows - 1) * SEAM) / rows),
  );

  /* Content claims the field before decoration does. Panels grow sideways into
   * any free space beside them, then downward into any free space beneath —
   * so what is left for the filler is trim around real instruments rather than
   * a featureless slab occupying half the console. */
  for (const cell of cells) {
    const region = regionFor(cell.zone);
    while (
      cell.col + cell.colSpan < region.end &&
      cell.colSpan < cell.measure.maxCols &&
      grid.fits(cell.col + cell.colSpan, cell.row, 1, cell.rowSpan, region)
    ) {
      grid.occupy(cell.col + cell.colSpan, cell.row, 1, cell.rowSpan);
      cell.colSpan += 1;
    }
  }
  for (const cell of cells) {
    const region = regionFor(cell.zone);
    const maxRows = cell.measure.rows * 2;
    while (
      cell.rowSpan < maxRows &&
      cell.row + cell.rowSpan < grid.height &&
      grid.fits(cell.col, cell.row + cell.rowSpan, cell.colSpan, 1, region)
    ) {
      grid.occupy(cell.col, cell.row + cell.rowSpan, cell.colSpan, 1);
      cell.rowSpan += 1;
    }
  }

  // Perimeter: which cells touch the edge of the field, so the stylesheet can
  // round them into elbows and end-caps instead of leaving a square slab.
  for (const cell of cells) {
    const top = cell.row === 0;
    const left = cell.col === 0;
    const right = cell.col + cell.colSpan === cols;
    const bottom = cell.row + cell.rowSpan === rows;
    cell.edges = [top && "t", right && "r", bottom && "b", left && "l"].filter(Boolean).join("");
    if (top && left) cell.cap = "tl";
    else if (top && right) cell.cap = "tr";
    else if (bottom && left) cell.cap = "bl";
    else if (bottom && right) cell.cap = "br";
  }

  const fillers =
    options.fillers === false ? [] : buildFillers(findHoles(grid, cols, rows), options.seed ?? "lcars");

  return { cols, rows, rowUnit: fitRowUnit, cells, fillers };
};
