import { describe, expect, it } from "vitest";
import { bridge, elbow, hBand, junction, scenePath, stepPath, vBand } from "./geometry";

describe("geometry", () => {
  it("returns deterministic straight bands with bounds", () => {
    expect(hBand(10, 20, 100, 24).d).toContain("110 44");
    expect(hBand(10, 20, 100, 24).bbox).toEqual({ x: 10, y: 20, w: 100, h: 24 });
    expect(vBand(10, 20, 100, 24, "both").d).toContain("10 108");
    expect(vBand(10, 20, 100, 24).bbox).toEqual({ x: 10, y: 20, w: 24, h: 100 });
    expect(hBand(10, 20, 100, 24, "both").d).toBe(hBand(10, 20, 100, 24, "both").d);
    expect(scenePath("b", "band", "d", "frame", { x: 10, y: 20, w: 100, h: 24 }).bbox).toEqual({
      x: 10,
      y: 20,
      w: 100,
      h: 24,
    });
  });

  it("returns elbow bounds and respects outer minus band radii", () => {
    const result = elbow({ x: 0, y: 0, w: 200, h: 200 }, "top-left", 48, 48, 48, 24);
    expect(result.bbox).toEqual({ x: 0, y: 0, w: 200, h: 200 });
    expect(result.d).toContain("A 48 48");
    expect(result.d).toContain("A 24 24");
  });

  it("returns junction, bridge, and stepped path bounds", () => {
    const junctionResult = junction(20, 20, 10, ["up", "left", "right"]);
    expect(junctionResult.bbox).toEqual({ x: 10, y: 10, w: 30, h: 20 });
    expect(junctionResult.d).not.toMatch(/NaN/);

    const stepResult = stepPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      10,
      4,
    );
    expect(stepResult.bbox).toEqual({ x: 0, y: -5, w: 105, h: 105 });
    expect(stepResult.d).not.toMatch(/NaN/);

    const bridgeResult = bridge({ x: 0, y: 0, w: 50, h: 100 }, { x: 70, y: 0, w: 50, h: 100 }, 10);
    expect(bridgeResult.bbox).toEqual({ x: 50, y: 45, w: 20, h: 10 });
    expect(bridgeResult.d).toContain("70 55");
  });

  it("rejects non-orthogonal and reversing step input", () => {
    expect(() =>
      stepPath(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        4,
        2,
      ),
    ).toThrow(/orthogonal/);
    expect(() =>
      stepPath(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 0, y: 0 },
        ],
        4,
        2,
      ),
    ).toThrow(/reverse/);
  });
});
