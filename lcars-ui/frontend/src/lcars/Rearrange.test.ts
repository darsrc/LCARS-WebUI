import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  default as RearrangeLayer,
  arrangeOrder,
  normalizeOrder,
  placeInSpacer,
  resizedSpan,
  sideOf,
  swapOrder,
} from "./Rearrange";
import { COL_BREAK, ROW_BREAK, sectionEntry, slotEntry } from "../compose/overrides";

const rect = (width = 100, height = 100): DOMRect =>
  ({ left: 0, top: 0, right: width, bottom: height, width, height }) as DOMRect;

describe("sideOf", () => {
  it("reads the edge the pointer is nearest", () => {
    expect(sideOf(rect(), 5, 50)).toBe("left");
    expect(sideOf(rect(), 95, 50)).toBe("right");
    expect(sideOf(rect(), 50, 5)).toBe("top");
    expect(sideOf(rect(), 50, 95)).toBe("bottom");
  });

  it("leaves the middle neutral so it can mean insert after", () => {
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

  it("inserts after the target when released over the middle", () => {
    expect(arrangeOrder(order, "a", "b", null)).toEqual(["b", "a", "c"]);
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
    expect(arrangeOrder(structured, "a", "c", "right")).toEqual(["b", "c", "a"]);
  });
});

describe("explicit swaps and spaces", () => {
  it("swaps only through the explicit helper and leaves structure in place", () => {
    expect(swapOrder(["a", ROW_BREAK, "b"], "a", "b")).toEqual(["b", ROW_BREAK, "a"]);
  });

  it("places a panel into a spacer and moves the spacer to the vacated position", () => {
    const order = ["a", ROW_BREAK, slotEntry("s1"), "b"];
    expect(placeInSpacer(order, "b", slotEntry("s1"))).toEqual([
      "a",
      ROW_BREAK,
      "b",
      slotEntry("s1"),
    ]);
  });

  it("leaves the order untouched when the spacer has gone", () => {
    const order = ["a", "b"];
    expect(placeInSpacer(order, "a", slotEntry("missing"))).toBe(order);
  });

  it("moves a spacer with the same insertion rules as a panel", () => {
    const spacer = slotEntry("s1");
    expect(arrangeOrder(["a", spacer, "b"], spacer, "b", "right")).toEqual(["a", "b", spacer]);
  });
});

describe("normalizeOrder", () => {
  it("removes orphan and doubled breaks without removing persistent spacers", () => {
    const spacer = slotEntry("s1");
    expect(
      normalizeOrder([
        ROW_BREAK,
        COL_BREAK,
        "a",
        ROW_BREAK,
        COL_BREAK,
        spacer,
        sectionEntry("Empty"),
      ]),
    ).toEqual(["a", COL_BREAK, spacer]);
  });
});

describe("resizedSpan", () => {
  it("changes both dimensions while respecting grid bounds", () => {
    expect(resizedSpan([2, 2], 1, -1, 6)).toEqual([3, 1]);
    expect(resizedSpan([6, 1], 4, -2, 6)).toEqual([6, 1]);
  });
});

describe("RearrangeLayer spaces", () => {
  it("selects a persistent space and resizes it from the toolbar", () => {
    const onArrange = vi.fn();
    render(
      createElement(RearrangeLayer, {
        arranged: true,
        cells: [],
        columns: 6,
        onArrange,
        onReset: vi.fn(),
        order: [slotEntry("s1")],
        sections: [],
        slots: [{ id: "s1", col: 0, row: 0, colSpan: 2, rowSpan: 1 }],
        spacers: { s1: [2, 1] },
        spans: {},
      }),
    );

    const space = screen.getByRole("button", { name: "Move empty space 2 by 1" });
    Object.defineProperty(space, "setPointerCapture", { value: vi.fn() });
    fireEvent.pointerDown(space, { pointerId: 1 });
    fireEvent.pointerUp(space, { pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Increase width" }));

    expect(onArrange).toHaveBeenCalledWith(
      [slotEntry("s1")],
      {},
      { s1: [3, 1] },
    );
  });
});
