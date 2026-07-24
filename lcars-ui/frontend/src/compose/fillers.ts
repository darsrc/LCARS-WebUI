/*
 * Filler blocks.
 *
 * LCARS never leaves a hole. Where a real console has no instrument to show it
 * puts a coloured block with an Okudagram reference code on it, and that habit
 * is most of what separates the look from a modern dashboard's flat voids. Once
 * the packer has laid down every panel, whatever grid cells are left over become
 * these.
 *
 * Codes are drawn from a seeded PRNG keyed on the page id and the block's grid
 * position, so they are stable across re-renders — a streaming widget update
 * must never make the decoration flicker.
 */

export interface Rect {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface FillerCell extends Rect {
  key: string;
  /** Palette slot 0..3, consumed by `data-k` in the stylesheet. */
  k: number;
  /** Okudagram code, or null when the block is too small to carry one. */
  code: string | null;
}

/** Small fast deterministic PRNG (Mulberry32). */
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/* Canon-flavoured stems. 47 and 1701 are the two numbers Okuda put everywhere. */
const STEMS = [47, 41, 30, 2, 10, 66, 4, 74] as const;
const TAILS = [1701, 4601, 6702, 7050, 8850, 4077, 1864, 2893, 5309, 1031] as const;

const codeFor = (rand: () => number): string => {
  const stem = STEMS[Math.floor(rand() * STEMS.length)];
  const tail = TAILS[Math.floor(rand() * TAILS.length)];
  return `${String(stem).padStart(2, "0")}-${tail}`;
};

/* A filler block is chrome, never the main event: on a console prop the leftover
 * space is banked as a run of modest coded blocks, not one featureless slab. So
 * a large hole is carved into tiles no bigger than this before decorating. */
const MAX_FILL_COLS = 2;
const MAX_FILL_ROWS = 2;

/** Carve a rectangle into tiles of at most MAX_FILL_COLS × MAX_FILL_ROWS. */
const subdivide = (hole: Rect): Rect[] => {
  const tiles: Rect[] = [];
  for (let row = hole.row; row < hole.row + hole.rowSpan; row += MAX_FILL_ROWS) {
    const rowSpan = Math.min(MAX_FILL_ROWS, hole.row + hole.rowSpan - row);
    for (let col = hole.col; col < hole.col + hole.colSpan; col += MAX_FILL_COLS) {
      const colSpan = Math.min(MAX_FILL_COLS, hole.col + hole.colSpan - col);
      tiles.push({ col, row, colSpan, rowSpan });
    }
  }
  return tiles;
};

/** A stable Okudagram code for an arbitrary key — the trim block below a
 * content-sized panel uses this so it reads as the same family of decoration as
 * the filler cells beside it. */
export const trimCode = (key: string): { k: number; code: string } => {
  const rand = mulberry32(hash(`trim:${key}`));
  return { k: Math.floor(rand() * 4), code: codeFor(rand) };
};

/** Turn leftover grid rectangles into decorated filler cells. */
export const buildFillers = (holes: Rect[], seed: string): FillerCell[] =>
  holes.flatMap(subdivide).map((hole) => {
    const rand = mulberry32(hash(`${seed}:${hole.col}:${hole.row}:${hole.colSpan}x${hole.rowSpan}`));
    // A single cell is too small to read a code at compact density; leave it bare.
    const roomy = hole.colSpan * hole.rowSpan > 1;
    return {
      ...hole,
      key: `fill-${hole.col}-${hole.row}`,
      k: Math.floor(rand() * 4),
      code: roomy ? codeFor(rand) : null,
    };
  });
