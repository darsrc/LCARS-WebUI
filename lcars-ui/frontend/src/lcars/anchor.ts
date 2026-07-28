/**
 * Anchor solving for floating hints.
 *
 * Pure geometry, no DOM — the deck clips on every side (`.lcars-mcell` is
 * `overflow: hidden`, `.lcars-immersive` adds `contain: layout paint`), so hints
 * render in a portal at fixed coordinates and this module decides where.
 */

import type { HintPlacement } from "../types/contract";

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type AnchorSide = Exclude<HintPlacement, "auto">;

export interface AnchorSolution {
  left: number;
  top: number;
  side: AnchorSide;
}

/** Gap between the widget edge and the hint, in px. Matches the CSS elbow inset. */
export const ANCHOR_GAP = 10;
/** Minimum breathing room between the hint and the viewport edge. */
const EDGE_MARGIN = 8;

const SIDES: AnchorSide[] = ["top", "bottom", "left", "right"];

const clamp = (value: number, min: number, max: number): number =>
  // When the hint is larger than the space available, min wins over max so the
  // top/left edge stays on screen and the overflow falls off the far edge.
  Math.max(min, Math.min(value, max));

/** Free space on each side of the anchor, ignoring the hint's own size. */
function room(anchor: Rect, viewport: Viewport): Record<AnchorSide, number> {
  return {
    top: anchor.top - ANCHOR_GAP,
    bottom: viewport.height - (anchor.top + anchor.height) - ANCHOR_GAP,
    left: anchor.left - ANCHOR_GAP,
    right: viewport.width - (anchor.left + anchor.width) - ANCHOR_GAP,
  };
}

/** True when `size` fits on `side` without crossing a viewport edge. */
function fits(side: AnchorSide, size: Size, available: Record<AnchorSide, number>): boolean {
  const needed = side === "top" || side === "bottom" ? size.height : size.width;
  return available[side] >= needed + EDGE_MARGIN;
}

/** The side opposite the requested one — the first flip candidate. */
const OPPOSITE: Record<AnchorSide, AnchorSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/**
 * Choose a side, then position the hint against it.
 *
 * A requested placement is honored when it fits. Otherwise the hint flips to the
 * opposite side, then to any side that fits, and finally falls back to whichever
 * side has the most room — so a hint always lands on screen even in a cramped
 * viewport.
 */
export function solveAnchor(
  anchor: Rect,
  size: Size,
  placement: HintPlacement = "auto",
  viewport: Viewport,
): AnchorSolution {
  const available = room(anchor, viewport);

  let side: AnchorSide;
  if (placement === "auto") {
    side =
      SIDES.find((candidate) => fits(candidate, size, available)) ??
      SIDES.reduce((best, candidate) =>
        available[candidate] > available[best] ? candidate : best,
      );
  } else if (fits(placement, size, available)) {
    side = placement;
  } else if (fits(OPPOSITE[placement], size, available)) {
    side = OPPOSITE[placement];
  } else {
    side =
      SIDES.find((candidate) => fits(candidate, size, available)) ??
      SIDES.reduce((best, candidate) =>
        available[candidate] > available[best] ? candidate : best,
      );
  }

  // Position against the chosen side, then shift along the cross axis to stay
  // inside the viewport while staying visually tied to the widget.
  let left: number;
  let top: number;
  if (side === "top" || side === "bottom") {
    top = side === "top" ? anchor.top - size.height - ANCHOR_GAP : anchor.top + anchor.height + ANCHOR_GAP;
    left = anchor.left + anchor.width / 2 - size.width / 2;
  } else {
    left = side === "left" ? anchor.left - size.width - ANCHOR_GAP : anchor.left + anchor.width + ANCHOR_GAP;
    top = anchor.top + anchor.height / 2 - size.height / 2;
  }

  return {
    side,
    left: clamp(left, EDGE_MARGIN, viewport.width - size.width - EDGE_MARGIN),
    top: clamp(top, EDGE_MARGIN, viewport.height - size.height - EDGE_MARGIN),
  };
}
