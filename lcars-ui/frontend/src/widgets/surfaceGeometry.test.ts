import { annulusSegmentPath, arcPath, polarToCartesian, ringPath, wedgePath } from "./surfaceGeometry";

describe("polarToCartesian", () => {
  it("places 0deg at +x (east)", () => {
    const p = polarToCartesian(0, 0, 10, 0);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(0);
  });

  it("places 90deg at +y (south, clockwise from east)", () => {
    const p = polarToCartesian(0, 0, 10, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(10);
  });

  it("places 180deg at -x (west)", () => {
    const p = polarToCartesian(0, 0, 10, 180);
    expect(p.x).toBeCloseTo(-10);
    expect(p.y).toBeCloseTo(0);
  });
});

describe("arcPath", () => {
  it("returns empty string for a zero-span request", () => {
    expect(arcPath(0, 0, 10, 45, 45)).toBe("");
  });

  it("returns empty string for a non-positive radius", () => {
    expect(arcPath(0, 0, 0, 0, 90)).toBe("");
    expect(arcPath(0, 0, -5, 0, 90)).toBe("");
  });

  it("uses large-arc-flag=0 for a span under 180deg", () => {
    const d = arcPath(0, 0, 10, 0, 90);
    expect(d).toMatch(/A 10 10 0 0 1/);
  });

  it("uses large-arc-flag=1 for a span over 180deg", () => {
    const d = arcPath(0, 0, 10, 0, 270);
    expect(d).toMatch(/A 10 10 0 1 1/);
  });

  it("handles a span exactly at 180deg with large-arc-flag=0 (boundary, not >180)", () => {
    const d = arcPath(0, 0, 10, 0, 180);
    expect(d).toMatch(/A 10 10 0 0 1/);
  });

  it("wraps correctly across the 0/360 boundary (e.g. 350deg -> 10deg is a 20deg span)", () => {
    const d = arcPath(0, 0, 10, 350, 10);
    expect(d).toMatch(/A 10 10 0 0 1/); // 20deg span, not the 340deg complement
  });

  it("draws a full circle via two half-arcs when span is exactly 360deg", () => {
    const d = arcPath(0, 0, 10, 0, 360);
    expect(d.match(/A 10 10 0 1 1/g)).toHaveLength(2);
    // starts and ends at the same point (the 0deg point)
    expect(d.startsWith("M 10 0")).toBe(true);
  });

  it("starts the path at the correct point on the circle", () => {
    const d = arcPath(5, 5, 10, 90, 180);
    const start = polarToCartesian(5, 5, 10, 90);
    expect(d.startsWith(`M ${start.x} ${start.y}`)).toBe(true);
  });
});

describe("annulusSegmentPath / ringPath / wedgePath", () => {
  it("returns empty string for a zero-span request", () => {
    expect(annulusSegmentPath(0, 0, 5, 10, 45, 45)).toBe("");
  });

  it("returns empty string for a non-positive outer radius", () => {
    expect(annulusSegmentPath(0, 0, 0, 0, 0, 90)).toBe("");
  });

  it("wedgePath with innerR=0 draws a true pie slice through the center point", () => {
    const d = wedgePath(0, 0, 0, 10, 0, 90);
    expect(d.startsWith("M 0 0")).toBe(true); // starts at center, not the arc
    expect(d).toContain("L 10 0"); // line out to the arc start point
    expect(d.trim().endsWith("Z")).toBe(true);
  });

  it("wedgePath with innerR>0 draws a washer segment (no center point in the path)", () => {
    const d = wedgePath(0, 0, 5, 10, 0, 90);
    expect(d.startsWith("M 0 0")).toBe(false);
    expect(d).toContain("A 10 10"); // outer arc
    expect(d).toContain("A 5 5"); // inner arc
    expect(d.trim().endsWith("Z")).toBe(true);
  });

  it("regression: a small-span washer segment's inner AND outer arcs both use large-arc-flag=0 (not just the outer)", () => {
    // Bug caught by an actual rendered screenshot, not by this test suite as it stood: the inner
    // (reverse-direction) arc used to recompute its own large-arc-flag from swapped start/end
    // angles, which for a short span gives the ~358deg COMPLEMENT span instead of the same 2deg
    // span traversed backward - silently ballooning a thin 2deg wedge into a near-full-circle
    // shape. Both arcs must share one flag computed from the true forward span.
    const d = wedgePath(0, 0, 5, 10, -1, 1); // 2deg span
    const flags = Array.from(d.matchAll(/A \d+ \d+ 0 (\d) \d/g)).map((m) => m[1]);
    expect(flags).toEqual(["0", "0"]); // outer arc, inner arc - both minor
  });

  it("regression: the same check holds for a large-span (>180deg) washer segment", () => {
    const d = wedgePath(0, 0, 5, 10, 0, 270); // 270deg span
    const flags = Array.from(d.matchAll(/A \d+ \d+ 0 (\d) \d/g)).map((m) => m[1]);
    expect(flags).toEqual(["1", "1"]); // outer arc, inner arc - both major
  });

  it("regression: a washer segment steps the pen down to the inner radius before starting the inner arc", () => {
    // Bug caught only by an actual rendered screenshot, not by any of the tests above: after the
    // outer arc the pen sits at radius outerR, angle endAngle. Starting the inner-radius arc
    // command directly from there (skipping a line to the true inner-radius point first) gives
    // SVG two endpoints that can't both lie on a radius-innerR circle - the spec's automatic
    // radius-rescale then silently balloons the inner arc into something much larger than
    // innerR, which is exactly what produced huge "petals" instead of thin wedge slivers.
    const innerR = 75;
    const outerR = 355;
    const endAngle = 1;
    const d = wedgePath(450, 450, innerR, outerR, -1, endAngle);
    const expectedInnerEnd = polarToCartesian(450, 450, innerR, endAngle);
    // The path must contain an explicit line to the inner-radius point at endAngle, positioned
    // between the outer arc and the inner arc (not merely present anywhere in the string).
    const outerArcIndex = d.indexOf(`A ${outerR} ${outerR}`);
    const lineIndex = d.indexOf(`L ${expectedInnerEnd.x} ${expectedInnerEnd.y}`);
    const innerArcIndex = d.indexOf(`A ${innerR} ${innerR}`);
    expect(outerArcIndex).toBeGreaterThan(-1);
    expect(lineIndex).toBeGreaterThan(outerArcIndex);
    expect(innerArcIndex).toBeGreaterThan(lineIndex);
  });

  it("ringPath with a full 360deg span and innerR=0 produces a single filled-disk subpath", () => {
    const d = ringPath(0, 0, 0, 10, 0, 360);
    // one closed loop: exactly two arc commands (the two half-arcs), no second "M"
    expect(d.match(/A 10 10/g)).toHaveLength(2);
    expect(d.match(/M /g)).toHaveLength(1);
  });

  it("ringPath with a full 360deg span and innerR>0 produces two independent closed subpaths", () => {
    const d = ringPath(0, 0, 5, 10, 0, 360);
    expect(d.match(/M /g)).toHaveLength(2); // outer loop + inner loop
    expect(d.match(/A 10 10/g)).toHaveLength(2);
    expect(d.match(/A 5 5/g)).toHaveLength(2);
  });

  it("large-arc-flag reflects the span for a partial ring segment", () => {
    const short = annulusSegmentPath(0, 0, 5, 10, 0, 90);
    expect(short).toMatch(/A 10 10 0 0 1/);
    const long = annulusSegmentPath(0, 0, 5, 10, 0, 270);
    expect(long).toMatch(/A 10 10 0 1 1/);
  });
});
