/**
 * Trigger state machine for floating hints.
 *
 * Owns open/close across hover, focus, click-to-pin, long-press and
 * server-driven `manual` state. The hover path is deliberately asymmetric: it
 * opens after `delay_ms` but closes after `hide_delay_ms`, and the hint surface
 * itself can hold the timer open. That grace bridge is what lets the pointer
 * travel from the widget into an interactive hint without it vanishing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Hint, HintTrigger } from "../types/contract";

/** How long a touch must be held before a `press` hint opens. */
const LONG_PRESS_MS = 500;
/** Movement past this many px cancels a pending long-press. */
const LONG_PRESS_SLOP = 10;

export interface HintController {
  open: boolean;
  /** True when the hint was opened by click/long-press and ignores pointer-out. */
  pinned: boolean;
  close: () => void;
  /** Props for the element wrapping the widget. */
  anchorProps: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerUp: () => void;
    onClick: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
  /** Props for the floating surface, so hovering it keeps it alive. */
  surfaceProps: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
  };
}

export function useHint(hint: Hint | null | undefined): HintController {
  const triggers = useMemo<HintTrigger[]>(() => hint?.trigger ?? ["hover", "focus"], [hint?.trigger]);
  const has = useCallback((t: HintTrigger) => triggers.includes(t), [triggers]);

  const always = has("always");
  const [open, setOpen] = useState(always);
  const [pinned, setPinned] = useState(false);

  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const pressTimer = useRef<number | undefined>(undefined);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  // Set when a long-press fires so the click it also produces doesn't toggle
  // the hint straight back closed.
  const suppressClick = useRef(false);

  const clearTimers = useCallback(() => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(pressTimer.current);
    openTimer.current = undefined;
    closeTimer.current = undefined;
    pressTimer.current = undefined;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // `always` and server-driven `manual` hints are controlled from the manifest,
  // so re-sync whenever the incoming state changes.
  useEffect(() => {
    if (always) {
      setOpen(true);
      return;
    }
    if (has("manual") && typeof hint?.open === "boolean") {
      setOpen(hint.open);
      setPinned(hint.open);
    }
  }, [always, has, hint?.open]);

  const close = useCallback(() => {
    clearTimers();
    setOpen(false);
    setPinned(false);
  }, [clearTimers]);

  const scheduleOpen = useCallback(
    (delay: number) => {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
      if (openTimer.current !== undefined) return;
      openTimer.current = window.setTimeout(() => {
        openTimer.current = undefined;
        setOpen(true);
      }, delay);
    },
    [],
  );

  const scheduleClose = useCallback(
    (delay: number) => {
      window.clearTimeout(openTimer.current);
      openTimer.current = undefined;
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        closeTimer.current = undefined;
        setOpen(false);
      }, delay);
    },
    [],
  );

  const hoverEnter = useCallback(() => {
    if (always || pinned || !has("hover")) return;
    scheduleOpen(hint?.delay_ms ?? 250);
  }, [always, pinned, has, scheduleOpen, hint?.delay_ms]);

  const hoverLeave = useCallback(() => {
    if (always || pinned || !has("hover")) return;
    scheduleClose(hint?.hide_delay_ms ?? 120);
  }, [always, pinned, has, scheduleClose, hint?.hide_delay_ms]);

  // Esc closes, and click-outside dismisses a pinned hint.
  useEffect(() => {
    if (!open || always) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, always, close]);

  const anchorProps = useMemo(
    () => ({
      onPointerEnter: hoverEnter,
      onPointerLeave: hoverLeave,
      onPointerDown: (event: React.PointerEvent) => {
        if (!has("press") || always) return;
        pressOrigin.current = { x: event.clientX, y: event.clientY };
        pressTimer.current = window.setTimeout(() => {
          pressTimer.current = undefined;
          suppressClick.current = true;
          setOpen(true);
          setPinned(true);
        }, LONG_PRESS_MS);
      },
      onPointerMove: (event: React.PointerEvent) => {
        if (pressTimer.current === undefined || !pressOrigin.current) return;
        const dx = event.clientX - pressOrigin.current.x;
        const dy = event.clientY - pressOrigin.current.y;
        if (Math.hypot(dx, dy) > LONG_PRESS_SLOP) {
          window.clearTimeout(pressTimer.current);
          pressTimer.current = undefined;
        }
      },
      onPointerUp: () => {
        window.clearTimeout(pressTimer.current);
        pressTimer.current = undefined;
        pressOrigin.current = null;
      },
      onClick: () => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        if (!has("click") || always) return;
        clearTimers();
        setOpen((wasOpen) => {
          setPinned(!wasOpen);
          return !wasOpen;
        });
      },
      onFocus: () => {
        if (!has("focus") || always) return;
        clearTimers();
        setOpen(true);
      },
      onBlur: () => {
        if (!has("focus") || always || pinned) return;
        scheduleClose(hint?.hide_delay_ms ?? 120);
      },
    }),
    [hoverEnter, hoverLeave, has, always, pinned, clearTimers, scheduleClose, hint?.hide_delay_ms],
  );

  const surfaceProps = useMemo(
    () => ({
      // Entering the hint cancels the pending close; leaving restarts it.
      onPointerEnter: () => {
        if (always || pinned) return;
        window.clearTimeout(closeTimer.current);
        closeTimer.current = undefined;
      },
      onPointerLeave: hoverLeave,
    }),
    [always, pinned, hoverLeave],
  );

  return { open, pinned, close, anchorProps, surfaceProps };
}
