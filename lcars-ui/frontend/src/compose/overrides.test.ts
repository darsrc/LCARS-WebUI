import { beforeEach, describe, expect, it } from "vitest";
import {
  applyOverrides,
  clearOverride,
  overrideKey,
  panelsOf,
  readMarker,
  readOverride,
  ROW_BREAK,
  sectionEntry,
  slotEntry,
  writeOverride,
  type FlowEntry,
} from "./overrides";
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

const ids = (entries: FlowEntry[]) => panelsOf(entries).map((p) => p.widget.id);

describe("applyOverrides", () => {
  const panels = [panel("a"), panel("b"), panel("c")];

  it("replays the saved order", () => {
    const result = applyOverrides(panels, { v: 2, order: ["c", "a", "b"], spans: {} });
    expect(ids(result)).toEqual(["c", "a", "b"]);
    expect(panelsOf(result).map((p) => p.order)).toEqual([0, 1, 2]);
  });

  it("drops ids the manifest no longer has and appends ones it gained", () => {
    const result = applyOverrides(panels, { v: 2, order: ["c", "deleted"], spans: {} });
    expect(ids(result)).toEqual(["c", "a", "b"]);
  });

  it("carries a resized span through as the widget's span hint", () => {
    const result = applyOverrides(panels, { v: 2, order: ["a"], spans: { a: [3, 2] } });
    const first = panelsOf(result)[0];
    expect((first.widget as unknown as { span: [number, number] }).span).toEqual([3, 2]);
    // The stored panel is not mutated — the plan stays reusable.
    expect((panels[0].widget as unknown as { span?: unknown }).span).toBeUndefined();
  });

  it("falls back to the planned layout when there is no override", () => {
    expect(ids(applyOverrides(panels, null))).toEqual(["a", "b", "c"]);
    expect(ids(applyOverrides(panels, { v: 2, order: [], spans: {} }))).toEqual(["a", "b", "c"]);
  });

  it("carries structural markers through in place", () => {
    const result = applyOverrides(panels, {
      v: 2,
      order: ["a", ROW_BREAK, "b", sectionEntry("Ops"), "c"],
      spans: {},
    });
    expect(result.map((e) => (e.type === "panel" ? e.panel.widget.id : e.marker.kind))).toEqual([
      "a",
      "row",
      "b",
      "section",
      "c",
    ]);
  });

  it("drops breaks that would open a band with nothing in it", () => {
    // Leading, doubled and trailing breaks all describe empty bands — replaying
    // them would put unexplained strips of dead screen in the deck.
    const result = applyOverrides(panels, {
      v: 2,
      order: [ROW_BREAK, "a", ROW_BREAK, ROW_BREAK, "b", "c", ROW_BREAK],
      spans: {},
    });
    expect(result.map((e) => (e.type === "panel" ? e.panel.widget.id : e.marker.kind))).toEqual([
      "a",
      "row",
      "b",
      "c",
    ]);
  });

  it("keeps a band alive around an empty slot the user opened", () => {
    const result = applyOverrides(panels, {
      v: 2,
      order: ["a", ROW_BREAK, slotEntry("s1")],
      spans: {},
    });
    // b and c are not named by the arrangement, so they keep their planned order
    // and are appended after everything the user placed.
    expect(result.map((e) => (e.type === "panel" ? e.panel.widget.id : e.marker.kind))).toEqual([
      "a",
      "row",
      "slot",
      "b",
      "c",
    ]);
  });
});

describe("markers", () => {
  it("reads each marker back", () => {
    expect(readMarker(ROW_BREAK)).toEqual({ kind: "row" });
    expect(readMarker("@col")).toEqual({ kind: "col" });
    expect(readMarker(sectionEntry("Warp Core"))).toEqual({ kind: "section", label: "Warp Core" });
    expect(readMarker(slotEntry("s1"))).toEqual({ kind: "slot", id: "s1" });
  });

  it("treats a widget id as a widget id", () => {
    expect(readMarker("repo-browser")).toBeNull();
  });

  it("degrades an unknown marker to a plain break rather than a phantom widget", () => {
    expect(readMarker("@fromTheFuture")).toEqual({ kind: "row" });
  });
});

describe("override storage", () => {
  const key = overrideKey("TestApp", "ops", "wide");

  beforeEach(() => window.localStorage.clear());

  it("round-trips a written override", () => {
    writeOverride(key, { v: 2, order: ["a", ROW_BREAK, "b"], spans: { a: [2, 1] } });
    expect(readOverride(key)).toEqual({ v: 2, order: ["a", ROW_BREAK, "b"], spans: { a: [2, 1] } });
    clearOverride(key);
    expect(readOverride(key)).toBeNull();
  });

  it("upgrades a v1 arrangement instead of discarding it", () => {
    // A v1 order is a v2 order that happens to have no markers in it, so an
    // arrangement made before sections existed must survive the upgrade.
    window.localStorage.setItem(key, JSON.stringify({ v: 1, order: ["b", "a"], spans: {} }));
    expect(readOverride(key)).toEqual({ v: 2, order: ["b", "a"], spans: {} });
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
    expect(readOverride(key)).toEqual({ v: 2, order: ["a", "b"], spans: { a: [2, 1] } });
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
