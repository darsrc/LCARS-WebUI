import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useStableById } from "./NodeCanvas";

type Item = { id: string; value: number };

describe("useStableById", () => {
  it("reuses the built object for items whose deps did not change", () => {
    const items: Item[] = [
      { id: "a", value: 1 },
      { id: "b", value: 1 },
    ];
    const build = (item: Item) => ({ id: item.id, value: item.value });

    const { result, rerender } = renderHook(
      ({ items }) => useStableById(items, (item) => item.id, (item) => [item.value], build),
      { initialProps: { items } },
    );

    const first = result.current;

    // Only "a" changes; "b" is a brand new array element with the same id and
    // deps, simulating a document rebuild where one node moved.
    rerender({ items: [{ id: "a", value: 2 }, { id: "b", value: 1 }] });
    const second = result.current;

    expect(second[0]).not.toBe(first[0]); // "a" changed: rebuilt
    expect(second[1]).toBe(first[1]); // "b" unchanged: same object identity
  });

  it("drops cache entries for items no longer present", () => {
    const build = (item: Item) => ({ id: item.id, value: item.value });
    const { result, rerender } = renderHook(
      ({ items }) => useStableById(items, (item) => item.id, (item) => [item.value], build),
      { initialProps: { items: [{ id: "a", value: 1 }, { id: "b", value: 1 }] as Item[] } },
    );
    const first = result.current;

    rerender({ items: [{ id: "a", value: 1 }] });
    const second = result.current;

    expect(second).toHaveLength(1);
    expect(second[0]).toBe(first[0]);

    rerender({ items: [{ id: "a", value: 1 }, { id: "b", value: 1 }] });
    const third = result.current;
    // "b" was evicted, so it comes back as a freshly built object.
    expect(third[1]).not.toBe(first[1]);
  });
});
