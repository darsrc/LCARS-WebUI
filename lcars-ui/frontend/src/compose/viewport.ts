/*
 * The viewport profile.
 *
 * A real LCARS console is cut to fit the surface it lives on — a wall panel, a
 * wide bridge station, a handheld PADD — so the mosaic needs to know the shape
 * of the field before it can pack anything. This module quantises the raw pixel
 * size into a small set of buckets: the packer only ever re-runs when the bucket
 * changes, never per pixel, so dragging a window edge doesn't thrash the layout.
 */
import { useEffect, useState, type RefObject } from "react";

export type Density = "compact" | "standard" | "wide" | "ultrawide";

export interface ViewportProfile {
  /** Column count of the mosaic grid. */
  cols: number;
  /** Height of one grid row, in px. */
  rowUnit: number;
  /** How many whole rows fit in the field. */
  rows: number;
  /** Usable height of the field in px, quantised so a resize does not thrash.
   * Always rounded *down*, so a solved layout can never overshoot the field. */
  fieldHeight: number;
  density: Density;
  portrait: boolean;
}

/** Gap between mosaic cells, in px. Mirrors `--seam` in lcars.css. */
export const SEAM = 4;

/** Quantisation step for the field height, in px. */
const FIELD_STEP = 8;

const COLS_BY_DENSITY: Record<Density, number> = {
  compact: 2,
  standard: 4,
  wide: 6,
  ultrawide: 8,
};

/* Buckets are calibrated against the *deck* width, not the window: the elbow and
 * the nav rail take a fixed ~400px off the shell before the field begins. */
const densityFor = (width: number): Density => {
  if (width < 560) return "compact";
  if (width < 1000) return "standard";
  if (width < 1600) return "wide";
  return "ultrawide";
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Derive a layout profile from a field size. Pure — the packer's only input
 * about the physical screen. */
export const profileFor = (width: number, height: number): ViewportProfile => {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const portrait = h > w;
  const density = densityFor(w);
  // A portrait field gets one column fewer: tall narrow screens read better as
  // a stack of wide bands than as a fine-grained mosaic. Never below two, though
  // — a single column is a list, not a mosaic.
  const cols = Math.max(2, COLS_BY_DENSITY[density] - (portrait ? 1 : 0));
  const rowUnit = Math.round(clamp(h / 14, 56, 96));
  const rows = Math.max(1, Math.floor(h / (rowUnit + SEAM)));
  // Quantised to FIELD_STEP so dragging a window edge re-solves in steps rather
  // than on every pixel, and floored so the solution always fits.
  const fieldHeight = Math.max(FIELD_STEP, Math.floor(h / FIELD_STEP) * FIELD_STEP);
  return { cols, rowUnit, rows, fieldHeight, density, portrait };
};

const sameProfile = (a: ViewportProfile, b: ViewportProfile): boolean =>
  a.cols === b.cols &&
  a.rowUnit === b.rowUnit &&
  a.rows === b.rows &&
  a.fieldHeight === b.fieldHeight &&
  a.density === b.density &&
  a.portrait === b.portrait;

const DEFAULT_PROFILE = profileFor(1440, 900);

/** Observe an element and report its layout profile, re-rendering only when the
 * quantised profile actually changes. */
export const useViewportProfile = (ref: RefObject<HTMLElement | null>): ViewportProfile => {
  const [profile, setProfile] = useState<ViewportProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const next = profileFor(rect.width, rect.height);
      setProfile((current) => (sameProfile(current, next) ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return profile;
};
