/*
 * Motion — the library's own, so the app author never touches it.
 *
 * LCARS motion is crisp and mechanical: panels sweep in along their pill axis,
 * gauges slew to their new value, readouts blip on refresh. None of that is a
 * spring; it is all CSS keyframes + transitions declared in lcars.css. This
 * module only supplies the three lifecycle signals CSS cannot see on its own:
 *   - useReducedMotion   — honour the OS "reduce motion" setting, automatically.
 *   - useAnimatedPresence — keep a removed item mounted long enough to play its
 *                           exit sweep, then drop it (enter is pure mount CSS).
 *   - useValueFlicker    — a one-shot "this value just changed" flag for the
 *                           data-refresh blip, gated on the value itself.
 *
 * Nothing here reads the contract; there is no per-widget animation API. Motion
 * is a property of the renderer, not something a page declares.
 */
import { useEffect, useReducer, useRef, useState } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCE_QUERY).matches
  );
}

/** True when the viewer has asked the OS to reduce motion; live-updates on change. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(prefersReduced);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(REDUCE_QUERY);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    // addEventListener is the modern surface; guard for older/mocked MQL objects.
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return reduced;
}

export type PresenceEntry<T> = { key: string; item: T; exiting: boolean };

/**
 * Track a keyed list so removed entries linger (flagged `exiting`) for `exitMs`
 * before they unmount — long enough for their CSS exit animation to play. Enter
 * needs no help: a freshly mounted node runs its own keyframe. Under reduced
 * motion the lingering collapses to a microtask so nothing visibly hangs.
 *
 * Removal is driven by a timer (not `animationend`) so it is deterministic under
 * fake timers and in jsdom, which never fires animation events.
 */
export function useAnimatedPresence<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  exitMs = 320,
): PresenceEntry<T>[] {
  const reduced = useReducedMotion();
  const effectiveExit = reduced ? 0 : exitMs;
  const [, bump] = useReducer((n: number) => (n + 1) % 0xffffff, 0);

  // A live cache, not React state: `items` for present keys is written every
  // render so a widget_update reaches the DOM with no frame of lag; `order` and
  // `exiting` retain vanished keys so their exit sweep can play before unmount.
  const store = useRef<{ order: string[]; items: Map<string, T>; exiting: Set<string> }>({
    order: [],
    items: new Map(),
    exiting: new Set(),
  });
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const s = store.current;
  const incoming = new Set(items.map(getKey));

  // Render phase (idempotent): refresh present items, append arrivals in order,
  // revive anything that came back before its exit timer fired.
  for (const item of items) {
    const key = getKey(item);
    s.items.set(key, item);
    if (!s.order.includes(key)) s.order.push(key);
    s.exiting.delete(key);
  }

  // Effect: schedule the exit for keys that vanished; cancel timers for revivals.
  // No dep array — membership is re-checked each render (items is a fresh array
  // every parent render anyway), and the `changed` guard keeps it from looping.
  useEffect(() => {
    for (const key of incoming) {
      const handle = timers.current.get(key);
      if (handle) {
        clearTimeout(handle);
        timers.current.delete(key);
      }
    }
    let changed = false;
    for (const key of s.order) {
      if (!incoming.has(key) && !timers.current.has(key)) {
        s.exiting.add(key);
        changed = true;
        const handle = setTimeout(() => {
          s.exiting.delete(key);
          s.items.delete(key);
          s.order = s.order.filter((k) => k !== key);
          timers.current.delete(key);
          bump();
        }, effectiveExit);
        timers.current.set(key, handle);
      }
    }
    if (changed) bump();
  });

  // Clear pending timers on unmount.
  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const handle of active.values()) clearTimeout(handle);
      active.clear();
    };
  }, []);

  return s.order.map((key) => ({ key, item: s.items.get(key) as T, exiting: s.exiting.has(key) }));
}

/**
 * Return true for `flickerMs` after `value` changes, then false — the "live data
 * refresh" blip. Compared by value (Object.is), never object identity, so a
 * whole-manifest clone that leaves a readout unchanged does not false-trigger.
 * Never fires on first mount. No-op under reduced motion.
 */
export function useValueFlicker(value: unknown, flickerMs = 260): boolean {
  const reduced = useReducedMotion();
  const previous = useRef(value);
  const [flick, setFlick] = useState(false);

  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    if (reduced) return;
    setFlick(true);
    const handle = setTimeout(() => setFlick(false), flickerMs);
    return () => clearTimeout(handle);
  }, [value, reduced, flickerMs]);

  return flick;
}
