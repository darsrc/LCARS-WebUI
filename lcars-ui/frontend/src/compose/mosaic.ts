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
import { measurePanel, MIN_PANEL_PX, type PanelMeasure } from "./measure";
import { buildFillers, type FillerCell, type Rect } from "./fillers";
import type { PlacedPanel, Zone } from "./layout";
import { solveRows } from "./rows";
import { packFlow } from "./flow";
import type { FlowEntry } from "./overrides";
import { SEAM, type ViewportProfile } from "./viewport";
import type { LayoutSizing, Widget } from "../types/contract";

export type Cap = "tl" | "tr" | "bl" | "br";

/** Below this a compressed row stops being legible; the deck scrolls instead. */
const MIN_ROW_UNIT = 44;

/* The demand measurement has a small deadband so that noise a pixel or two wide
 * does not re-solve the whole deck on every frame. This is that deadband handed
 * back to the panel as breathing room: without it a content-sized panel can sit
 * a few pixels short of its content forever — and a few pixels short is a
 * scrollbar, which is exactly what the measuring was for. */
const MEASURE_SLACK = 6;

/* Below this the leftover under a panel is a seam, not a block: cutting it out
 * would read as a rendering glitch rather than as deliberate LCARS trim. */
const MIN_TRIM_PX = 32;

/** Height of a section band label, in px. */
const SECTION_PX = 46;

export interface MosaicCell extends Rect {
  widget: Widget;
  zone: Zone;
  measure: PanelMeasure;
  /** Which outer corner of the field this cell occupies, if any. */
  cap?: Cap;
  /** Which edges of the field this cell touches — drives the end-cap radii. */
  edges: string;
  /** Height in px the cell's content requires. */
  demand: number;
  /** Height in px the solved row tracks actually gave it. */
  allocated: number;
  /** Leftover height beneath a content-sized panel, in px — 0 unless the cell
   * was stretched by a taller neighbour sharing its rows. */
  trim: number;
}

/** A named band the user opened while arranging. */
export interface MosaicSection extends Rect {
  label: string;
  key: string;
}

/** An empty landing area the user opened and has not filled yet. */
export interface MosaicSlot extends Rect {
  id: string;
}

export interface Mosaic {
  cols: number;
  rows: number;
  rowUnit: number;
  /** Solved height of each row track, in px. Content-sized, not uniform. */
  rowHeights: number[];
  /** True when the panels could not be fitted into the field and it scrolls. */
  overflows: boolean;
  cells: MosaicCell[];
  fillers: FillerCell[];
  /** Empty only for an automatically-packed deck. */
  sections: MosaicSection[];
  slots: MosaicSlot[];
}

export interface PackOptions {
  /** Seed for filler codes. Pass the page id so decoration is stable per page. */
  seed?: string;
  /** Emit decorative filler blocks in the leftover cells. */
  fillers?: boolean;
  /** "explicit" packs panels in the order given, skipping the grouping and
   * weight sort — what a hand-arranged deck needs so the user's order sticks. */
  order?: "auto" | "explicit";
  /** Widget id → measured natural height in px, from a mounted deck. Overrides
   * the estimate in `measure.ts` for the panels it names. */
  demand?: Readonly<Record<string, number>>;
  /** Page-level sizing inherited by panels that do not override it. */
  defaultSizing?: LayoutSizing;
  /** Widget id → current collapsed state. */
  collapsed?: Readonly<Record<string, boolean>>;
  /** Spacer id → [colSpan, rowSpan] for a hand-arranged deck. */
  spacers?: Readonly<Record<string, [number, number]>>;
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
  /* Searching for a slot probes rows that may not exist yet, and `rowAt` has to
   * materialise them to answer. Those probes must not count towards the field's
   * height — otherwise a failed search leaves phantom rows behind, and once the
   * row tracks are sized in pixels a phantom row is a visible band of dead
   * screen. Only `occupy` moves the real floor. */
  private used = 0;

  constructor(cols: number) {
    this.cols = cols;
  }

  /** Rows that actually hold something. */
  get height(): number {
    return this.used;
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
    this.used = Math.max(this.used, row + rowSpan);
  }

  release(col: number, row: number, colSpan: number, rowSpan: number): void {
    for (let r = row; r < row + rowSpan; r += 1) {
      const cells = this.rows[r];
      if (!cells) continue;
      for (let c = col; c < col + colSpan; c += 1) cells[c] = false;
    }
  }

  /** Recompute the floor from what is actually occupied — after a release the
   * cached one may be counting rows nothing sits on any more. */
  recount(): void {
    let used = 0;
    for (let r = 0; r < this.rows.length; r += 1) {
      if (this.rows[r].some(Boolean)) used = r + 1;
    }
    this.used = used;
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
/* Demand                                                              */
/* ------------------------------------------------------------------ */

/**
 * How much height a cell requires — a floor, not a wish.
 *
 * A growing panel states only its floor and takes the rest as slack, so a table
 * holding a thousand rows does not claim a thousand rows of screen and leave
 * every control on the deck compressed. A content-sized panel states the height
 * of its content, measured off the mounted deck where that is available and
 * estimated from the widget types where it is not.
 */
const demandFor = (cell: MosaicCell, measured: PackOptions["demand"]): number => {
  if (cell.measure.grow > 0) return cell.measure.minPx;
  const real = measured?.[cell.widget.id];
  if (real === undefined || !Number.isFinite(real) || real <= 0) return cell.measure.naturalPx;
  return cell.measure.collapsed
    ? Math.max(cell.measure.minPx, real + 2)
    : Math.max(MIN_PANEL_PX, real + MEASURE_SLACK);
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
    measure: measurePanel(panel.widget, profile, {
      defaultSizing: options.defaultSizing,
      collapsed: options.collapsed?.[panel.widget.id] === true,
    }),
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
      demand: 0,
      allocated: 0,
      trim: 0,
    });
  }

  let rows = Math.max(grid.height, 1);

  /* Content claims the field before decoration does. Panels grow sideways into
   * any free space beside them, then downward into any free space beneath — so
   * what is left for the filler is trim around real instruments rather than a
   * featureless slab occupying half the console.
   *
   * Growing panels go first in both passes. A table or a chart turns extra space
   * into more visible data; a panel holding two buttons turns it into emptiness,
   * so it only takes what is left once the instruments have claimed theirs. */
  const byAppetite = [...cells].sort((a, b) => b.measure.grow - a.measure.grow);

  for (const cell of byAppetite) {
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
  for (const cell of byAppetite) {
    const region = regionFor(cell.zone);
    // A content-sized panel gains nothing from a taller box, so it never takes a
    // row it does not need; only a growing one reaches down into free space.
    const maxRows = cell.measure.grow > 0 ? cell.measure.rows * 2 : cell.measure.rows;
    while (
      cell.rowSpan < maxRows &&
      cell.row + cell.rowSpan < grid.height &&
      grid.fits(cell.col, cell.row + cell.rowSpan, cell.colSpan, 1, region)
    ) {
      grid.occupy(cell.col, cell.row + cell.rowSpan, cell.colSpan, 1);
      cell.rowSpan += 1;
    }
  }

  return size(cells, [], [], grid, rows, profile, options);
};

/**
 * Size the row tracks, trim the cells, cap the perimeter and decorate the holes.
 *
 * Shared by both placers: whether a panel got where it is by the automatic
 * tessellation or because somebody dragged it there, everything from here on is
 * the same question — how tall is each row, and what is left over.
 */
const size = (
  cells: MosaicCell[],
  sections: MosaicSection[],
  slots: MosaicSlot[],
  grid: Grid,
  initialRows: number,
  profile: ViewportProfile,
  options: PackOptions,
): Mosaic => {
  const { cols } = profile;
  let rows = initialRows;

  /* Size the row tracks to what the cells carry. LCARS surfaces are cut to their
   * screen: a short page stretches to fill it rather than leaving a void beneath,
   * and a tall one compresses rather than running off the bottom — where the
   * deck's clipped overflow would simply have hidden those panels. Below
   * MIN_ROW_UNIT compression stops being legible, so the deck scrolls instead. */
  for (const cell of cells) cell.demand = demandFor(cell, options.demand);

  const solveFor = (rowCount: number) =>
    solveRows(
      [
        ...cells.map((cell) => ({
          row: cell.row,
          rowSpan: cell.rowSpan,
          demand: cell.demand,
          grow: cell.measure.grow,
        })),
        // A section header is a band label, not an instrument: it asks for the
        // height of one and never grows.
        ...sections.map((section) => ({
          row: section.row,
          rowSpan: 1,
          demand: SECTION_PX,
          grow: 0,
        })),
        ...slots.map((slot) => ({
          row: slot.row,
          rowSpan: slot.rowSpan,
          demand: MIN_PANEL_PX,
          grow: 0,
        })),
      ],
      rowCount,
      profile.fieldHeight,
      SEAM,
      MIN_ROW_UNIT,
    );

  const heightOf = (cell: Rect, heights: number[]): number => {
    let total = SEAM * (cell.rowSpan - 1);
    for (let r = cell.row; r < cell.row + cell.rowSpan; r += 1) total += heights[r] ?? 0;
    return total;
  };

  /* A row is as tall as the tallest thing on it, so a content-sized panel beside
   * a table inherits the table's height and ends up a mostly-empty box — the
   * "this panel takes twice the room it needs" reading.
   *
   * First give back the rows it does not need: with the tracks sized, a panel
   * spanning three rows for two rows' worth of content can drop the third, and
   * the freed square goes back to the field to be tiled with filler. Whatever
   * is still left over inside the cell afterwards is cut off as a trim block,
   * so the panel is the size of its content either way. */
  let solved = solveFor(rows);
  let released = false;
  for (const cell of cells) {
    if (cell.measure.grow > 0 || cell.measure.pinned) continue;
    while (cell.rowSpan > 1) {
      const shorter = { ...cell, rowSpan: cell.rowSpan - 1 };
      if (heightOf(shorter, solved.heights) < cell.demand) break;
      grid.release(cell.col, cell.row + cell.rowSpan - 1, cell.colSpan, 1);
      cell.rowSpan -= 1;
      released = true;
    }
  }

  if (released) {
    grid.recount();
    // Giving rows back can empty the last row entirely; re-solve so the panels
    // that remain share the field rather than leaving a dead band at the bottom.
    if (grid.height < rows) rows = Math.max(grid.height, 1);
    solved = solveFor(rows);
  }

  const fitRowUnit = solved.heights.length > 0 ? solved.heights[0] : MIN_ROW_UNIT;

  for (const cell of cells) {
    cell.allocated = heightOf(cell, solved.heights);
    const spare = cell.allocated - cell.demand;
    cell.trim =
      cell.measure.grow === 0 && !cell.measure.pinned && spare >= MIN_TRIM_PX
        ? Math.round(spare)
        : 0;
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

  return {
    cols,
    rows,
    rowUnit: fitRowUnit,
    rowHeights: solved.heights,
    overflows: solved.overflows,
    cells,
    fillers,
    sections,
    slots,
  };
};

/* ------------------------------------------------------------------ */
/* Flow pack                                                           */
/* ------------------------------------------------------------------ */

/**
 * Lay a hand-arranged page onto the mosaic grid.
 *
 * Placement comes from compose/flow.ts, which reads the user's order list as
 * bands and columns rather than tessellating — a panel dropped beside another
 * has to stay beside it. Everything after placement is the shared sizing pass,
 * so a hand-arranged deck is still content-sized, still fits the field, and
 * still fills its holes with LCARS trim.
 */
export const packMosaicFlow = (
  entries: FlowEntry[],
  profile: ViewportProfile,
  options: PackOptions = {},
): Mosaic => {
  const { cols } = profile;
  const grid = new Grid(cols);
  const layout = packFlow(entries, profile, {
    defaultSizing: options.defaultSizing,
    collapsed: options.collapsed,
    spacers: options.spacers,
  });

  const cells: MosaicCell[] = [];
  const slots: MosaicSlot[] = [];

  for (const placement of layout.placements) {
    const colSpan = Math.max(1, Math.min(placement.colSpan, cols - placement.col));
    grid.occupy(placement.col, placement.row, colSpan, placement.rowSpan);
    if (placement.panel) {
      cells.push({
        widget: placement.panel.widget,
        zone: placement.panel.zone,
        measure: measurePanel(placement.panel.widget, profile, {
          defaultSizing: options.defaultSizing,
          collapsed: options.collapsed?.[placement.panel.widget.id] === true,
        }),
        col: placement.col,
        row: placement.row,
        colSpan,
        rowSpan: placement.rowSpan,
        edges: "",
        demand: 0,
        allocated: 0,
        trim: 0,
      });
    } else if (placement.slotId) {
      slots.push({
        id: placement.slotId,
        col: placement.col,
        row: placement.row,
        colSpan,
        rowSpan: placement.rowSpan,
      });
    }
  }

  const sections: MosaicSection[] = layout.sections.map((section) => {
    grid.occupy(0, section.row, cols, 1);
    return { ...section, col: 0, colSpan: cols, rowSpan: 1 };
  });

  return size(cells, sections, slots, grid, Math.max(grid.height, 1), profile, options);
};
