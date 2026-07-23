import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useAnimatedPresence, useReducedMotion, useValueFlicker } from "./motion";

/** A controllable matchMedia stand-in — jsdom ships none. */
function installMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => listeners.delete(cb),
    addListener: (cb: (event: MediaQueryListEvent) => void) => listeners.add(cb),
    removeListener: (cb: (event: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatchEvent: () => true,
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    set(value: boolean) {
      matches = value;
      listeners.forEach((cb) => cb({ matches: value } as MediaQueryListEvent));
    },
  };
}

describe("useReducedMotion", () => {
  test("tracks the media query and live-updates on change", () => {
    const mq = installMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => mq.set(true));
    expect(result.current).toBe(true);
  });
});

describe("useAnimatedPresence", () => {
  beforeEach(() => {
    installMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const key = (item: { id: string }) => item.id;

  test("retains a removed item as exiting, then drops it after exitMs", () => {
    const { result, rerender } = renderHook(({ items }) => useAnimatedPresence(items, key, 300), {
      initialProps: { items: [{ id: "a" }, { id: "b" }] },
    });
    expect(result.current.map((e) => e.key)).toEqual(["a", "b"]);
    expect(result.current.every((e) => !e.exiting)).toBe(true);

    act(() => {
      rerender({ items: [{ id: "a" }] });
    });
    // b lingers, now flagged exiting so its exit sweep can play.
    expect(result.current.map((e) => e.key)).toEqual(["a", "b"]);
    expect(result.current.find((e) => e.key === "b")?.exiting).toBe(true);
    expect(result.current.find((e) => e.key === "a")?.exiting).toBe(false);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.map((e) => e.key)).toEqual(["a"]);
  });

  test("hands present keys their latest item with no frame of lag", () => {
    const { result, rerender } = renderHook(({ items }) => useAnimatedPresence(items, key, 300), {
      initialProps: { items: [{ id: "a", v: 1 }] },
    });
    act(() => {
      rerender({ items: [{ id: "a", v: 2 }] });
    });
    expect(result.current[0].item).toMatchObject({ id: "a", v: 2 });
  });

  test("a key that returns before its timer fires is revived, not dropped", () => {
    const { result, rerender } = renderHook(({ items }) => useAnimatedPresence(items, key, 300), {
      initialProps: { items: [{ id: "a" }, { id: "b" }] },
    });
    act(() => rerender({ items: [{ id: "a" }] }));
    expect(result.current.find((e) => e.key === "b")?.exiting).toBe(true);
    act(() => rerender({ items: [{ id: "a" }, { id: "b" }] }));
    expect(result.current.find((e) => e.key === "b")?.exiting).toBe(false);
    act(() => vi.advanceTimersByTime(300));
    // timer was cancelled — b survives.
    expect(result.current.map((e) => e.key)).toEqual(["a", "b"]);
  });
});

describe("useValueFlicker", () => {
  beforeEach(() => {
    installMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("blips on value change, self-clears, and never fires on mount", () => {
    const { result, rerender } = renderHook(({ v }) => useValueFlicker(v, 200), {
      initialProps: { v: 1 as number },
    });
    expect(result.current).toBe(false);

    act(() => rerender({ v: 2 }));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(false);
  });

  test("does not fire when the value is unchanged (e.g. a whole-manifest clone)", () => {
    const { result, rerender } = renderHook(({ v }) => useValueFlicker(v, 200), {
      initialProps: { v: 42 as number },
    });
    act(() => rerender({ v: 42 }));
    expect(result.current).toBe(false);
  });

  test("stays inert under reduced motion", () => {
    installMatchMedia(true);
    const { result, rerender } = renderHook(({ v }) => useValueFlicker(v, 200), {
      initialProps: { v: 1 as number },
    });
    act(() => rerender({ v: 2 }));
    expect(result.current).toBe(false);
  });
});
