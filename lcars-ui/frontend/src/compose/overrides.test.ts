import { beforeEach, describe, expect, it } from "vitest";
import { applyOverrides, clearOverride, overrideKey, readOverride, writeOverride } from "./overrides";
import { buildFillers } from "./fillers";
import type { PlacedPanel } from "./layout";
import type { Widget } from "../types/contract";

const panel = (id: string): PlacedPanel => ({
  widget: { id, type: "lcars_box" } as unknown as Widget,
  zone: "primary",
  rowIndex: 0,
  colIndex: 0,
  order: 0,
});

const ids = (panels: PlacedPanel[]) => panels.map((p) => p.widget.id);

describe("applyOverrides", () => {
  const panels = [panel("a"), panel("b"), panel("c")];

  it("replays the saved order", () => {
    const result = applyOverrides(panels, { v: 1, order: ["c", "a", "b"], spans: {} });
    expect(ids(result)).toEqual(["c", "a", "b"]);
    expect(result.map((p) => p.order)).toEqual([0, 1, 2]);
  });

  it("drops ids the manifest no longer has and appends ones it gained", () => {
    const result = applyOverrides(panels, { v: 1, order: ["c", "deleted"], spans: {} });
    expect(ids(result)).toEqual(["c", "a", "b"]);
  });

  it("carries a resized span through as the widget's span hint", () => {
    const result = applyOverrides(panels, { v: 1, order: ["a"], spans: { a: [3, 2] } });
    expect((result[0].widget as unknown as { span: [number, number] }).span).toEqual([3, 2]);
    // The stored panel is not mutated — the plan stays reusable.
    expect((panels[0].widget as unknown as { span?: unknown }).span).toBeUndefined();
  });

  it("falls back to the planned layout when there is no override", () => {
    expect(applyOverrides(panels, null)).toBe(panels);
    expect(applyOverrides(panels, { v: 1, order: [], spans: {} })).toBe(panels);
  });
});

describe("override storage", () => {
  const key = overrideKey("TestApp", "ops", "wide");

  beforeEach(() => window.localStorage.clear());

  it("round-trips a written override", () => {
    writeOverride(key, { v: 1, order: ["a", "b"], spans: { a: [2, 1] } });
    expect(readOverride(key)).toEqual({ v: 1, order: ["a", "b"], spans: { a: [2, 1] } });
    clearOverride(key);
    expect(readOverride(key)).toBeNull();
  });

  it("keys arrangements per density so a wide layout is not replayed on a phone", () => {
    expect(overrideKey("A", "p", "wide")).not.toBe(overrideKey("A", "p", "compact"));
  });

  it("rejects corrupt, stale and malformed stores rather than throwing", () => {
    for (const raw of ["not json", "null", '{"v":99,"order":["a"]}', '{"v":1}', '"a string"']) {
      window.localStorage.setItem(key, raw);
      expect(readOverride(key)).toBeNull();
    }
  });

  it("sanitises junk inside an otherwise valid store", () => {
    window.localStorage.setItem(
      key,
      JSON.stringify({ v: 1, order: ["a", 7, null, "b"], spans: { a: [2, 1], bad: ["x", 0] } }),
    );
    expect(readOverride(key)).toEqual({ v: 1, order: ["a", "b"], spans: { a: [2, 1] } });
  });
});

describe("buildFillers", () => {
  const holes = [{ col: 0, row: 0, colSpan: 2, rowSpan: 1 }];

  it("emits identical codes for the same page so decoration never flickers", () => {
    expect(buildFillers(holes, "ops")).toEqual(buildFillers(holes, "ops"));
  });

  it("varies by page", () => {
    expect(buildFillers(holes, "ops")[0].code).not.toBe(buildFillers(holes, "engineering")[0].code);
  });

  it("leaves a single cell bare — too small to read a code", () => {
    expect(buildFillers([{ col: 0, row: 0, colSpan: 1, rowSpan: 1 }], "ops")[0].code).toBeNull();
  });
});
