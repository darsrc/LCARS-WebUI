/*
 * The viewport profile.
 *
 * A real LCARS console is cut to fit the surface it lives on — a wall panel, a
 * wide bridge station, a handheld PADD — so the mosaic needs to know the shape
 * of the field before it can pack anything. Structural choices (density,
 * columns and orientation) are bucketed, while usable height stays exact so the
 * final row meets the footer. Resize bursts are coalesced to one solve per
 * animation frame.
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
  /** Usable height of the field in whole CSS pixels. */
  fieldHeight: number;
  density: Density;
  portrait: boolean;
}

/** Gap between mosaic cells, in px. Mirrors `--seam` in lcars.css. */
export const SEAM = 4;

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
  // Use the real deck height. The previous 8px bucket left a visible strip of
  // unallocated field at the foot of otherwise fitting layouts.
  const fieldHeight = Math.max(1, Math.floor(h));
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

/** Observe an element and report its layout profile, coalescing resize bursts. */
export const useViewportProfile = (ref: RefObject<HTMLElement | null>): ViewportProfile => {
  const [profile, setProfile] = useState<ViewportProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const next = profileFor(rect.width, rect.height);
      setProfile((current) => (sameProfile(current, next) ? current : next));
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [ref]);

  return profile;
};
