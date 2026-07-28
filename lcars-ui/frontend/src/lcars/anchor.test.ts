import { describe, expect, it } from "vitest";

import { ANCHOR_GAP, solveAnchor } from "./anchor";

const VIEWPORT = { width: 1000, height: 800 };
const SIZE = { width: 200, height: 100 };

/** A widget comfortably in the middle of the viewport. */
const centered = { top: 350, left: 400, width: 200, height: 100 };

describe("solveAnchor", () => {
  it("honors an explicit placement when it fits", () => {
    const solution = solveAnchor(centered, SIZE, "right", VIEWPORT);
    expect(solution.side).toBe("right");
    expect(solution.left).toBe(centered.left + centered.width + ANCHOR_GAP);
  });

  it("centers on the cross axis", () => {
    const solution = solveAnchor(centered, SIZE, "top", VIEWPORT);
    expect(solution.side).toBe("top");
    // Widget centre is 500; a 200-wide hint centred on it starts at 400.
    expect(solution.left).toBe(400);
    expect(solution.top).toBe(centered.top - SIZE.height - ANCHOR_GAP);
  });

  it("flips to the opposite side when the requested one is off screen", () => {
    // Widget hugging the bottom edge: a hint below it would not fit.
    const bottom = { top: 760, left: 400, width: 200, height: 40 };
    expect(solveAnchor(bottom, SIZE, "bottom", VIEWPORT).side).toBe("top");
  });

  it("flips a left placement to the right when there is no room", () => {
    const leftEdge = { top: 350, left: 4, width: 120, height: 60 };
    expect(solveAnchor(leftEdge, SIZE, "left", VIEWPORT).side).toBe("right");
  });

  it("shifts along the cross axis to stay on screen", () => {
    // Widget at the left edge: a centred hint would start at a negative x.
    const leftEdge = { top: 350, left: 0, width: 60, height: 60 };
    const solution = solveAnchor(leftEdge, SIZE, "top", VIEWPORT);
    expect(solution.left).toBeGreaterThanOrEqual(0);
    expect(solution.left + SIZE.width).toBeLessThanOrEqual(VIEWPORT.width);
  });

  it("keeps the hint inside the right edge", () => {
    const rightEdge = { top: 350, left: 960, width: 40, height: 60 };
    const solution = solveAnchor(rightEdge, SIZE, "top", VIEWPORT);
    expect(solution.left + SIZE.width).toBeLessThanOrEqual(VIEWPORT.width);
  });

  it("auto picks a side that fits", () => {
    const topEdge = { top: 0, left: 400, width: 200, height: 40 };
    // No room above, so auto must not choose "top".
    expect(solveAnchor(topEdge, SIZE, "auto", VIEWPORT).side).not.toBe("top");
  });

  it("still lands on screen when nothing fits", () => {
    const tiny = { width: 120, height: 90 };
    const huge = { width: 300, height: 300 };
    const solution = solveAnchor(
      { top: 40, left: 40, width: 40, height: 40 },
      huge,
      "auto",
      tiny,
    );
    // Larger than the viewport: the top/left edge must stay visible.
    expect(solution.left).toBeGreaterThanOrEqual(0);
    expect(solution.top).toBeGreaterThanOrEqual(0);
  });
});
