/*
 * The flow packer — placement for a hand-arranged deck.
 *
 * The automatic packer (compose/mosaic.ts) tessellates: it sorts by weight and
 * backfills every hole, which is what makes an unattended page look composed.
 * That is exactly the wrong behaviour once somebody has arranged the deck by
 * hand — a panel dropped to the right of another must stay to the right of it,
 * not get pulled two rows up into a gap the packer happened to find.
 *
 * So a hand-arranged deck flows instead. The order list reads top to bottom as
 * a structure:
 *
 *   band      a horizontal stripe of the deck, ended by `@row` or `@section`
 *   column    a vertical division of a band, opened by `@col`
 *   panel     laid into the current column, or flowed across the band when the
 *             band has no explicit columns
 *
 * Bands stack down the field, columns divide a band across it, and panels stack
 * down a column — so where a panel ends up is a direct reading of the list, and
 * dropping one beside another does what it looks like it does.
 *
 * Pure and deterministic: no DOM, no React.
 */
import { measurePanel } from "./measure";
import type { FlowEntry } from "./overrides";
import type { ViewportProfile } from "./viewport";
import type { PlacedPanel } from "./layout";

/** A panel or a user-made empty landing area, placed on the grid. */
export interface FlowPlacement {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  panel?: PlacedPanel;
  /** Set when this is an empty slot rather than a panel. */
  slotId?: string;
}

export interface FlowSection {
  row: number;
  label: string;
  key: string;
}

export interface FlowLayout {
  placements: FlowPlacement[];
  sections: FlowSection[];
  rows: number;
}

/** Height a section header occupies, in grid rows. */
const SECTION_ROWS = 1;
/** An empty landing area is one grid square until something is dropped in it. */
const SLOT_ROWS = 1;
const SLOT_COLS = 2;

interface Item {
  panel?: PlacedPanel;
  slotId?: string;
  cols: number;
  rows: number;
  /** Appetite for width, from compose/measure.ts. */
  grow: number;
}

interface Band {
  /** Explicit columns, in order. A band with one column and no `@col` marker
   * flows its items across the whole width instead of stacking them. */
  columns: Item[][];
  explicitColumns: boolean;
  section: { label: string; key: string } | null;
}

const newBand = (section: Band["section"] = null): Band => ({
  columns: [[]],
  explicitColumns: false,
  section,
});

const isEmpty = (band: Band): boolean => band.columns.every((column) => column.length === 0);

/** Split the order list into the bands and columns it describes. */
const readBands = (entries: FlowEntry[], profile: ViewportProfile): Band[] => {
  const bands: Band[] = [];
  let band = newBand();
  let sectionCount = 0;

  const flush = (next: Band) => {
    if (!isEmpty(band)) bands.push(band);
    band = next;
  };

  for (const entry of entries) {
    if (entry.type === "panel") {
      const measure = measurePanel(entry.panel.widget, profile);
      band.columns[band.columns.length - 1].push({
        panel: entry.panel,
        cols: measure.cols,
        rows: measure.rows,
        grow: measure.grow,
      });
      continue;
    }
    const { marker } = entry;
    if (marker.kind === "row") {
      flush(newBand());
    } else if (marker.kind === "section") {
      sectionCount += 1;
      flush(newBand({ label: marker.label, key: `${entry.key}#${sectionCount}` }));
    } else if (marker.kind === "col") {
      band.columns.push([]);
      band.explicitColumns = true;
    } else {
      band.columns[band.columns.length - 1].push({
        slotId: marker.id,
        cols: SLOT_COLS,
        rows: SLOT_ROWS,
        grow: 0,
      });
    }
  }
  if (!isEmpty(band)) bands.push(band);
  return bands;
};

/**
 * Divide a band's width between its columns.
 *
 * Each column asks for as much as its widest panel and gets a share of what is
 * left over in proportion to that — so a column holding a chart is wider than
 * one holding a row of buttons, and every column gets at least one square.
 */
const shareWidth = (columns: Item[][], total: number): number[] => {
  const count = columns.length;
  if (count === 1) return [total];

  const wants = columns.map((column) =>
    Math.max(1, ...column.map((item) => item.cols), ...(column.length === 0 ? [1] : [])),
  );
  const widths = wants.map(() => 1);
  let free = total - count;
  if (free <= 0) return widths;

  const appetite = wants.reduce((a, b) => a + b, 0);
  for (let i = 0; i < count && free > 0; i += 1) {
    const extra = i === count - 1 ? free : Math.min(free, Math.round((free * wants[i]) / appetite));
    widths[i] += extra;
    free -= extra;
  }
  return widths;
};

/**
 * Spread a line's leftover width across the panels on it.
 *
 * A band that stops short of the edge leaves a strip of filler, and filler is
 * trim — it should not be occupying width a real instrument could use. The extra
 * squares go to the growing panels first, because that is where width turns into
 * more visible data; with nothing hungry on the line the last panel takes it, so
 * the band still reaches the edge of the field.
 */
const widen = (line: { item: Item; span: number }[], spare: number, cols: number): void => {
  if (spare <= 0 || line.length === 0) return;

  /* A growing panel will take the whole band if that is what is going; a
   * content-sized one is capped, because a single status tile stretched across
   * six columns reads as a mistake rather than as a design. What neither of them
   * claims stays a filler block, which is what LCARS does with spare width. */
  const ceiling = (entry: { item: Item; span: number }) =>
    entry.item.grow > 0 ? cols : Math.min(cols, entry.item.cols * 2);

  let left = spare;
  // Growing panels first, then everything else, so appetite is served before
  // padding is.
  for (const pass of [1, 0]) {
    const targets = line.filter((entry) => (entry.item.grow > 0 ? 1 : 0) === pass);
    const appetite = targets.reduce((total, entry) => total + Math.max(1, entry.item.grow), 0);
    if (targets.length === 0 || left <= 0) continue;
    for (const entry of targets) {
      if (left <= 0) break;
      const room = Math.max(0, ceiling(entry) - entry.span);
      const share = Math.min(
        left,
        room,
        Math.max(1, Math.round((spare * Math.max(1, entry.item.grow)) / appetite)),
      );
      entry.span += share;
      left -= share;
    }
  }
  // A rounding remainder would leave a one-square gap in the middle of a band.
  for (const entry of line) {
    if (left <= 0) break;
    const room = Math.max(0, ceiling(entry) - entry.span);
    const share = Math.min(left, room);
    entry.span += share;
    left -= share;
  }
};

/** Lay a hand-arranged order list onto the grid. */
export const packFlow = (entries: FlowEntry[], profile: ViewportProfile): FlowLayout => {
  const { cols } = profile;
  const bands = readBands(entries, profile);
  const placements: FlowPlacement[] = [];
  const sections: FlowSection[] = [];
  let row = 0;

  for (const band of bands) {
    if (band.section) {
      sections.push({ row, label: band.section.label, key: band.section.key });
      row += SECTION_ROWS;
    }

    const items = band.columns.flat();
    if (items.length === 0) continue;

    if (!band.explicitColumns) {
      // No columns declared: flow the items across the band, wrapping when the
      // next one will not fit — so a band reads left to right like a sentence.
      let line: { item: Item; span: number }[] = [];
      let cursor = 0;
      let top = row;

      const emit = () => {
        if (line.length === 0) return;
        widen(line, cols - cursor, cols);
        let left = 0;
        let lineHeight = 0;
        for (const { item, span } of line) {
          placements.push({
            col: left,
            row: top,
            colSpan: span,
            rowSpan: item.rows,
            panel: item.panel,
            slotId: item.slotId,
          });
          left += span;
          lineHeight = Math.max(lineHeight, item.rows);
        }
        top += Math.max(1, lineHeight);
        line = [];
        cursor = 0;
      };

      for (const item of items) {
        const span = Math.max(1, Math.min(item.cols, cols));
        if (cursor + span > cols && cursor > 0) emit();
        line.push({ item, span });
        cursor += span;
      }
      emit();
      row = Math.max(top, row + 1);
      continue;
    }

    const widths = shareWidth(band.columns, cols);
    let left = 0;
    let bottom = row;
    band.columns.forEach((column, index) => {
      let top = row;
      for (const item of column) {
        placements.push({
          col: left,
          row: top,
          colSpan: widths[index],
          rowSpan: item.rows,
          panel: item.panel,
          slotId: item.slotId,
        });
        top += item.rows;
      }
      bottom = Math.max(bottom, top);
      left += widths[index];
    });
    row = Math.max(bottom, row + 1);
  }

  /* Stretch the last band to the foot of the field. A hand-arranged deck is
   * still a fixed-fill LCARS surface: leaving the bottom short would read as the
   * layout having run out rather than as having been composed. */
  return { placements, sections, rows: Math.max(row, 1) };
};
