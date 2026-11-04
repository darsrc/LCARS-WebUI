import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Track interactions that should keep scene regions in place. */
export function useSceneLocks(rootRef: RefObject<HTMLElement | null>) {
  const locks = useRef(new Map<string, Set<string>>());
  const activity = useRef(0);
  const [version, setVersion] = useState(0);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const regionFor = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>("[data-region-id]") : null;
    const setLock = (regionId: string, kind: string, active: boolean) => {
      const kinds = locks.current.get(regionId) ?? new Set<string>();
      const hadLock = kinds.has(kind);
      if (active) kinds.add(kind);
      else kinds.delete(kind);
      if (kinds.size) locks.current.set(regionId, kinds);
      else locks.current.delete(regionId);
      if (hadLock && !active) setVersion((previous) => previous + 1);
    };
    const pointerRegions = new Map<number, string>();
    const handle = (event: Event) => {
      const region = regionFor(event.target);
      const regionId = region?.dataset.regionId;
      if (["pointerdown", "keydown", "input", "wheel"].includes(event.type))
        activity.current = Date.now();
      if (event.type === "pointerup" || event.type === "pointercancel") {
        const pointerId = (event as PointerEvent).pointerId;
        const lockedRegion = pointerRegions.get(pointerId);
        if (lockedRegion) {
          pointerRegions.delete(pointerId);
          if (![...pointerRegions.values()].includes(lockedRegion))
            setLock(lockedRegion, "pointer", false);
        }
      }
      if (!regionId || !region) return;
      if (event.type === "focusin") setLock(regionId, "focus", true);
      if (
        event.type === "focusout" &&
        !region.contains((event as FocusEvent).relatedTarget as Node | null)
      )
        setLock(regionId, "focus", false);
      if (event.type === "pointerdown") {
        pointerRegions.set((event as PointerEvent).pointerId, regionId);
        setLock(regionId, "pointer", true);
      }
      if (event.type === "compositionstart") setLock(regionId, "composition", true);
      if (event.type === "compositionend") setLock(regionId, "composition", false);
      if (event.type === "submit") setLock(regionId, "dirty", false);
      if (event.type === "input") {
        const fields = region.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          'input:not([type="checkbox"]):not([type="radio"]), textarea',
        );
        const dirty = [...fields].some((field) => field.value !== field.defaultValue);
        setLock(regionId, "dirty", fields.length === 0 || dirty);
      }
    };
    const eventTypes = [
      "focusin",
      "focusout",
      "pointerdown",
      "keydown",
      "input",
      "wheel",
      "compositionstart",
      "compositionend",
      "submit",
    ];
    for (const type of eventTypes) root.addEventListener(type, handle);
    window.addEventListener("pointerup", handle);
    window.addEventListener("pointercancel", handle);
    return () => {
      for (const type of eventTypes) root.removeEventListener(type, handle);
      window.removeEventListener("pointerup", handle);
      window.removeEventListener("pointercancel", handle);
    };
  }, [rootRef]);
  return {
    lockedRegionIds: () => new Set(locks.current.keys()),
    lastActivityAt: () => activity.current,
    version,
  };
}
