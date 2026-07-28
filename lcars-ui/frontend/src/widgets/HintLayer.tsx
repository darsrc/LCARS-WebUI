/**
 * The floating hint surface.
 *
 * Rendered through a portal into `.lcars-root`: the deck clips on every side
 * (`.lcars-mcell` is `overflow: hidden`, `.lcars-immersive` adds
 * `contain: layout paint`, which also breaks `position: fixed` containment for
 * descendants), so a hint nested in the tree would be cut off. Portalling into
 * `.lcars-root` keeps theme custom properties inheriting while `position: fixed`
 * escapes every clipping ancestor.
 *
 * Lazy-loaded — see HintAnchor.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";

import { solveAnchor } from "../lcars/anchor";
import type { AnchorSolution } from "../lcars/anchor";
import type { Hint, Widget } from "../types/contract";
import type { HintController } from "./useHint";
import { WidgetRenderer, accentVar } from "./WidgetRenderer";
import type { WidgetHandlers } from "./WidgetRenderer";

/** Off-screen first paint so the surface can be measured before it is placed. */
const UNPLACED: AnchorSolution = { left: -9999, top: -9999, side: "top" };

export default function HintLayer({
  widget,
  hint,
  depth,
  anchorRef,
  controller,
  exiting,
  handlers,
}: {
  widget: Widget;
  hint: Hint;
  depth: number;
  anchorRef: RefObject<HTMLDivElement | null>;
  controller: HintController;
  exiting: boolean;
  handlers: WidgetHandlers;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<AnchorSolution>(UNPLACED);

  const reposition = useCallback(() => {
    // The wrapper is `display: contents` and has no box of its own, so measure
    // the widget element it wraps.
    const anchorEl = anchorRef.current?.firstElementChild ?? anchorRef.current;
    const surface = surfaceRef.current;
    if (!anchorEl || !surface) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    setPosition(
      solveAnchor(
        {
          top: anchorRect.top,
          left: anchorRect.left,
          width: anchorRect.width,
          height: anchorRect.height,
        },
        { width: surfaceRect.width, height: surfaceRect.height },
        hint.placement ?? "auto",
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [anchorRef, hint.placement]);

  useLayoutEffect(reposition, [reposition]);

  // Cells move when the mosaic re-solves on resize, and zones scroll internally.
  useEffect(() => {
    const onChange = () => reposition();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [reposition]);

  // A pinned hint is dismissed by clicking away from both widget and hint.
  useEffect(() => {
    if (!controller.pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (surfaceRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      controller.close();
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [controller, anchorRef]);

  const children = hint.children ?? [];
  const interactive = children.length > 0;
  const accent = accentVar(widget.color ?? undefined);

  const surface = (
    <div
      aria-label={hint.title ?? undefined}
      className="lcars-hint"
      data-exit={exiting || undefined}
      data-side={position.side}
      ref={surfaceRef}
      role={interactive ? "dialog" : "tooltip"}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        ...(hint.max_width ? { maxWidth: `${hint.max_width}px` } : {}),
        ...(accent ? { "--accent": accent } : {}),
      }}
      {...controller.surfaceProps}
    >
      {hint.title ? <div className="lcars-hint-head">{hint.title}</div> : null}
      {hint.text ? <p className="lcars-hint-text">{hint.text}</p> : null}
      {children.length > 0 ? (
        <div className="lcars-hint-body">
          {children.map((child) => (
            <WidgetRenderer depth={depth + 1} key={child.id} widget={child} {...handlers} />
          ))}
        </div>
      ) : null}
      {controller.pinned && hint.dismissible !== false ? (
        <button
          aria-label="Close hint"
          className="lcars-hint-close"
          onClick={controller.close}
          type="button"
        >
          ×
        </button>
      ) : null}
    </div>
  );

  const host = document.querySelector(".lcars-root") ?? document.body;
  return createPortal(surface, host);
}
