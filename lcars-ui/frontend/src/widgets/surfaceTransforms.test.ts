import { describe, expect, it } from "vitest";

import {
  composeMatrix,
  groupCopyTransforms,
  IDENTITY,
  matrixToCss,
  mirrorMatrix,
  rotationMatrix,
  transformPoint,
  translationMatrix,
} from "./surfaceTransforms";

describe("transformPoint", () => {
  it("identity leaves a point unchanged", () => {
    expect(transformPoint(IDENTITY, 12, 34)).toEqual({ x: 12, y: 34 });
  });
});

describe("mirrorMatrix", () => {
  it("x mirrors across a vertical line, leaving y unchanged", () => {
    const m = mirrorMatrix("x", 100, 0);
    expect(transformPoint(m, 20, 50)).toEqual({ x: 180, y: 50 });
    expect(transformPoint(m, 100, 50)).toEqual({ x: 100, y: 50 }); // point ON the axis is fixed
  });

  it("y mirrors across a horizontal line, leaving x unchanged", () => {
    const m = mirrorMatrix("y", 0, 200);
    expect(transformPoint(m, 40, 30)).toEqual({ x: 40, y: 370 });
  });

  it("xy is a point reflection through (axisX, axisY)", () => {
    const m = mirrorMatrix("xy", 100, 100);
    expect(transformPoint(m, 20, 30)).toEqual({ x: 180, y: 170 });
  });

  it("preserves a rectangle's width/height when mirroring its center (M4-style repositioning)", () => {
    // A region at x=20,y=0,w=60,h=40 (center 50,20) mirrored across x=100.
    const m = mirrorMatrix("x", 100, 0);
    const center = transformPoint(m, 50, 20);
    expect(center).toEqual({ x: 150, y: 20 });
    // Reconstructed box (center - w/2, center - h/2) should be the exact mirror of the original.
    const mirroredLeft = center.x - 30;
    // Original box spans x:[20,80]; its mirror across x=100 should span x:[120,180].
    expect(mirroredLeft).toBe(120);
  });
});

describe("rotationMatrix", () => {
  it("rotates 90deg around the origin: (1,0) -> (0,1)", () => {
    const m = rotationMatrix(90, 0, 0);
    const p = transformPoint(m, 1, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });

  it("a point at the pivot is unaffected by rotation", () => {
    const m = rotationMatrix(37, 50, 60);
    const p = transformPoint(m, 50, 60);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(60);
  });

  it("rotates 180deg around a pivot: reflects through that point", () => {
    const m = rotationMatrix(180, 100, 100);
    const p = transformPoint(m, 120, 100);
    expect(p.x).toBeCloseTo(80);
    expect(p.y).toBeCloseTo(100);
  });
});

describe("translationMatrix", () => {
  it("offsets a point by dx/dy", () => {
    const m = translationMatrix(10, -5);
    expect(transformPoint(m, 1, 1)).toEqual({ x: 11, y: -4 });
  });
});

describe("composeMatrix", () => {
  it("applies m1 then m2 (translate then rotate 90deg around origin)", () => {
    const translate = translationMatrix(1, 0);
    const rotate = rotationMatrix(90, 0, 0);
    const combined = composeMatrix(rotate, translate);
    // (0,0) -> translate -> (1,0) -> rotate 90 around origin -> (0,1)
    const p = transformPoint(combined, 0, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
});

describe("matrixToCss", () => {
  it("formats as an SVG matrix() function string", () => {
    expect(matrixToCss({ a: 1, b: 0, c: 0, d: 1, e: 5, f: 6 })).toBe("matrix(1,0,0,1,5,6)");
  });
});

describe("groupCopyTransforms", () => {
  it("no spec at all yields exactly one identity copy", () => {
    const copies = groupCopyTransforms({}, 800, 600);
    expect(copies).toEqual([IDENTITY]);
  });

  it("mirror='x' with an explicit axis yields exactly 2 copies: identity + reflection", () => {
    const copies = groupCopyTransforms({ mirror: { axis: "x", axis_x: 400 } }, 800, 600);
    expect(copies).toHaveLength(2);
    expect(copies[0]).toEqual(IDENTITY);
    expect(transformPoint(copies[1], 100, 50)).toEqual({ x: 700, y: 50 });
  });

  it("mirror with no explicit axis defaults to the surface's own center", () => {
    const copies = groupCopyTransforms({ mirror: { axis: "x" } }, 800, 600);
    expect(transformPoint(copies[1], 0, 0)).toEqual({ x: 800, y: 0 });
  });

  it("repeat_radial fans `count` copies from start_angle to end_angle INCLUSIVE (matches ticks())", () => {
    const copies = groupCopyTransforms(
      { repeat_radial: { count: 3, center_x: 0, center_y: 0, start_angle: 0, end_angle: 180 } },
      800,
      600,
    );
    expect(copies).toHaveLength(3);
    // copy 0: angle 0 -> (10,0) unchanged
    expect(transformPoint(copies[0], 10, 0).x).toBeCloseTo(10);
    // copy 1: angle 90 -> (10,0) -> (0,10)
    const mid = transformPoint(copies[1], 10, 0);
    expect(mid.x).toBeCloseTo(0);
    expect(mid.y).toBeCloseTo(10);
    // copy 2: angle 180 -> (10,0) -> (-10,0)
    const last = transformPoint(copies[2], 10, 0);
    expect(last.x).toBeCloseTo(-10);
    expect(last.y).toBeCloseTo(0);
  });

  it("repeat_radial with count=1 places the single copy at start_angle without dividing by zero", () => {
    const copies = groupCopyTransforms(
      { repeat_radial: { count: 1, center_x: 0, center_y: 0, start_angle: 45, end_angle: 45 } },
      800,
      600,
    );
    expect(copies).toHaveLength(1);
  });

  it("repeat_linear offsets `count` copies by increasing multiples of dx/dy", () => {
    const copies = groupCopyTransforms({ repeat_linear: { count: 3, dx: 10, dy: 5 } }, 800, 600);
    expect(copies).toHaveLength(3);
    expect(transformPoint(copies[0], 0, 0)).toEqual({ x: 0, y: 0 });
    expect(transformPoint(copies[1], 0, 0)).toEqual({ x: 10, y: 5 });
    expect(transformPoint(copies[2], 0, 0)).toEqual({ x: 20, y: 10 });
  });

  it("rotate composes onto every copy rather than replacing them", () => {
    const copies = groupCopyTransforms(
      { repeat_linear: { count: 2, dx: 10, dy: 0 }, rotate: 90, rotate_pivot_x: 0, rotate_pivot_y: 0 },
      800,
      600,
    );
    expect(copies).toHaveLength(2);
    // copy 0: translate by (0,0) then rotate 90 around origin -> (0,0)
    expect(transformPoint(copies[0], 0, 0).x).toBeCloseTo(0);
    // copy 1: translate (1,0)->(11,0), then rotate 90 around origin -> (0,11)
    const p = transformPoint(copies[1], 1, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(11);
  });

  it("rotate alone (no mirror/repeat) yields exactly one rotated copy", () => {
    const copies = groupCopyTransforms({ rotate: 90, rotate_pivot_x: 0, rotate_pivot_y: 0 }, 800, 600);
    expect(copies).toHaveLength(1);
    const p = transformPoint(copies[0], 1, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
});
