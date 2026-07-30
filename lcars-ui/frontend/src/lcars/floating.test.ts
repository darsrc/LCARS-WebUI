import { describe, expect, it } from "vitest";

import {
  clampFloatingRect,
  initialFloatingRect,
  moveFloatingRect,
  resizeFloatingRect,
} from "./floating";

const bounds = { width: 1000, height: 700 };
const limits = { minWidth: 280, minHeight: 180, maxWidth: 800, maxHeight: 600 };

describe("floating window geometry", () => {
  it("centers new windows when no position is supplied", () => {
    expect(initialFloatingRect(400, 200, null, bounds, limits)).toEqual({
      x: 300,
      y: 250,
      width: 400,
      height: 200,
    });
  });

  it("keeps moved windows fully reachable", () => {
    expect(
      moveFloatingRect(
        { x: 100, y: 100, width: 400, height: 300 },
        2000,
        -2000,
        bounds,
        limits,
      ),
    ).toEqual({ x: 592, y: 8, width: 400, height: 300 });
  });

  it("bounds resize gestures by both accessibility minima and the viewport", () => {
    expect(
      resizeFloatingRect(
        { x: 100, y: 100, width: 400, height: 300 },
        -1000,
        1000,
        bounds,
        limits,
      ),
    ).toEqual({ x: 100, y: 92, width: 280, height: 600 });

    expect(
      clampFloatingRect(
        { x: -50, y: -20, width: 2000, height: 2000 },
        bounds,
        limits,
      ),
    ).toEqual({ x: 8, y: 8, width: 800, height: 600 });
  });
});
