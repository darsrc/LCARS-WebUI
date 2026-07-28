import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Hint } from "../types/contract";
import { useHint } from "./useHint";

const hint = (overrides: Partial<Hint> = {}): Hint => ({
  trigger: ["hover", "focus"],
  delay_ms: 250,
  hide_delay_ms: 120,
  ...overrides,
});

const pointer = (x = 0, y = 0) => ({ clientX: x, clientY: y }) as React.PointerEvent;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useHint", () => {
  it("opens on hover only after delay_ms", () => {
    const { result } = renderHook(() => useHint(hint()));
    act(() => result.current.anchorProps.onPointerEnter());
    expect(result.current.open).toBe(false);

    act(() => void vi.advanceTimersByTime(249));
    expect(result.current.open).toBe(false);

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.open).toBe(true);
  });

  it("cancels the pending open if the pointer leaves first", () => {
    const { result } = renderHook(() => useHint(hint()));
    act(() => result.current.anchorProps.onPointerEnter());
    act(() => result.current.anchorProps.onPointerLeave());
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.open).toBe(false);
  });

  it("keeps the hint open when the pointer travels into it", () => {
    const { result } = renderHook(() => useHint(hint()));
    act(() => result.current.anchorProps.onPointerEnter());
    act(() => void vi.advanceTimersByTime(250));
    expect(result.current.open).toBe(true);

    // Pointer leaves the widget, heading for the hint.
    act(() => result.current.anchorProps.onPointerLeave());
    // It arrives within the grace period.
    act(() => void vi.advanceTimersByTime(60));
    act(() => result.current.surfaceProps.onPointerEnter());
    act(() => void vi.advanceTimersByTime(1000));

    expect(result.current.open).toBe(true);
  });

  it("closes once the pointer leaves the hint too", () => {
    const { result } = renderHook(() => useHint(hint()));
    act(() => result.current.anchorProps.onPointerEnter());
    act(() => void vi.advanceTimersByTime(250));
    act(() => result.current.surfaceProps.onPointerEnter());
    act(() => result.current.surfaceProps.onPointerLeave());
    act(() => void vi.advanceTimersByTime(120));
    expect(result.current.open).toBe(false);
  });

  it("opens immediately on focus", () => {
    const { result } = renderHook(() => useHint(hint()));
    act(() => result.current.anchorProps.onFocus());
    expect(result.current.open).toBe(true);
  });

  it("does not open on hover when hover is not a trigger", () => {
    const { result } = renderHook(() => useHint(hint({ trigger: ["click"] })));
    act(() => result.current.anchorProps.onPointerEnter());
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.open).toBe(false);
  });

  it("pins open on click and unpins on a second click", () => {
    const { result } = renderHook(() => useHint(hint({ trigger: ["click"] })));
    act(() => result.current.anchorProps.onClick());
    expect(result.current.open).toBe(true);
    expect(result.current.pinned).toBe(true);

    act(() => result.current.anchorProps.onClick());
    expect(result.current.open).toBe(false);
    expect(result.current.pinned).toBe(false);
  });

  it("ignores pointer-out while pinned", () => {
    const { result } = renderHook(() => useHint(hint({ trigger: ["click", "hover"] })));
    act(() => result.current.anchorProps.onClick());
    act(() => result.current.anchorProps.onPointerLeave());
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.open).toBe(true);
  });

  it("opens on long-press and does not immediately re-close on the click", () => {
    const { result } = renderHook(() => useHint(hint({ trigger: ["press", "click"] })));
    act(() => result.current.anchorProps.onPointerDown(pointer(10, 10)));
    act(() => void vi.advanceTimersByTime(500));
    expect(result.current.open).toBe(true);

    // The browser also fires a click after a long press; it must be swallowed.
    act(() => result.current.anchorProps.onClick());
    expect(result.current.open).toBe(true);
  });

  it("cancels a long-press when the finger moves (a scroll, not a press)", () => {
    const { result } = renderHook(() => useHint(hint({ trigger: ["press"] })));
    act(() => result.current.anchorProps.onPointerDown(pointer(10, 10)));
    act(() => result.current.anchorProps.onPointerMove(pointer(10, 60)));
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.open).toBe(false);
  });

  it("stays open for trigger=always", () => {
    const { result } = renderHook(() => useHint(hint({ trigger: ["always"] })));
    expect(result.current.open).toBe(true);
    act(() => result.current.anchorProps.onPointerLeave());
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.open).toBe(true);
  });

  it("follows server-driven state for trigger=manual", () => {
    const { result, rerender } = renderHook(({ h }) => useHint(h), {
      initialProps: { h: hint({ trigger: ["manual"], open: false }) },
    });
    expect(result.current.open).toBe(false);

    rerender({ h: hint({ trigger: ["manual"], open: true }) });
    expect(result.current.open).toBe(true);
  });

  it("closes on Escape", () => {
    const { result } = renderHook(() => useHint(hint({ trigger: ["click"] })));
    act(() => result.current.anchorProps.onClick());
    expect(result.current.open).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.open).toBe(false);
  });
});
