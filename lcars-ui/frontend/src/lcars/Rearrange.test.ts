import { describe, expect, it } from "vitest";
import { arrangeOrder, dropEmptySlots, fillSlot, sideOf } from "./Rearrange";
import { ROW_BREAK, slotEntry } from "../compose/overrides";

const rect = (width = 100, height = 100): DOMRect =>
  ({ left: 0, top: 0, right: width, bottom: height, width, height }) as DOMRect;

describe("sideOf", () => {
  it("reads the edge the pointer is nearest", () => {
    expect(sideOf(rect(), 5, 50)).toBe("left");
    expect(sideOf(rect(), 95, 50)).toBe("right");
    expect(sideOf(rect(), 50, 5)).toBe("top");
    expect(sideOf(rect(), 50, 95)).toBe("bottom");
  });

  it("leaves the middle neutral so a swap stays reachable without aiming", () => {
    expect(sideOf(rect(), 50, 50)).toBeNull();
  });

  it("reads the same on a panel of any shape", () => {
    // Proportional bands, not fixed pixels: a tall narrow panel and a wide short
    // one have to answer the gesture the same way.
    expect(sideOf(rect(600, 60), 590, 30)).toBe("right");
    expect(sideOf(rect(60, 600), 30, 590)).toBe("bottom");
  });
});

describe("arrangeOrder", () => {
  const order = ["a", "b", "c"];

  it("puts a panel beside its target with no break between them", () => {
    expect(arrangeOrder(order, "c", "a", "right")).toEqual(["a", "c", "b"]);
    expect(arrangeOrder(order, "c", "a", "left")).toEqual(["c", "a", "b"]);
  });

  it("puts a panel above or below its target with a break between them", () => {
    // Without the break the two would simply continue along the same band, and
    // "under this one" would render as "next to this one".
    expect(arrangeOrder(order, "c", "a", "bottom")).toEqual(["a", ROW_BREAK, "c", "b"]);
    expect(arrangeOrder(order, "c", "a", "top")).toEqual(["c", ROW_BREAK, "a", "b"]);
  });

  it("swaps two panels when released over the middle, leaving structure alone", () => {
    expect(arrangeOrder(["a", ROW_BREAK, "b"], "a", "b", null)).toEqual(["b", ROW_BREAK, "a"]);
  });

  it("is a no-op when the panel is dropped on itself", () => {
    expect(arrangeOrder(order, "a", "a", "left")).toBe(order);
  });

  it("leaves the order untouched when the target has gone", () => {
    expect(arrangeOrder(order, "a", "vanished", "left")).toBe(order);
    expect(arrangeOrder(order, "a", "vanished", null)).toBe(order);
  });

  it("moves a panel that already sits inside a structure", () => {
    const structured = ["a", ROW_BREAK, "b", "c"];
    expect(arrangeOrder(structured, "a", "c", "right")).toEqual([ROW_BREAK, "b", "c", "a"]);
  });
});

describe("fillSlot", () => {
  it("consumes the slot the panel was dropped into", () => {
    const order = ["a", ROW_BREAK, slotEntry("s1"), "b"];
    expect(fillSlot(order, "b", "s1")).toEqual(["a", ROW_BREAK, "b"]);
  });

  it("leaves the order untouched when the slot has gone", () => {
    const order = ["a", "b"];
    expect(fillSlot(order, "a", "missing")).toBe(order);
  });
});

describe("dropEmptySlots", () => {
  it("clears landing areas that were never filled", () => {
    expect(dropEmptySlots(["a", ROW_BREAK, slotEntry("s1"), "b"])).toEqual(["a", ROW_BREAK, "b"]);
  });
});
