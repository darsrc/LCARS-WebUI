/**
 * Wraps a widget that carries a hint, wiring up triggers and mounting the
 * floating surface.
 *
 * The wrapper is `display: contents`, so the widget's own box and its position
 * in the mosaic are untouched — see the `.lcars-hint-anchor` pass-through rules
 * in lcars.css that keep the deck's direct-child selectors matching.
 *
 * HintLayer is a lazy chunk mounted only while a hint is open, so pages that
 * never open one never fetch it.
 */

import { Suspense, lazy, useRef } from "react";
import type { ReactNode } from "react";

import { useAnimatedPresence } from "../lcars/motion";
import type { Widget } from "../types/contract";
// The trigger machine decides *whether* to load HintLayer, so it stays in the
// main bundle rather than the lazy chunk.
import { useHint } from "./useHint";
import type { WidgetHandlers } from "./WidgetRenderer";

const HintLayer = lazy(() => import("./HintLayer"));

/** Must match the exit duration of the lcars-hint-out keyframes. */
const EXIT_MS = 200;
const PRESENCE_KEY = "hint";

export function HintAnchor({
  widget,
  depth,
  handlers,
  children,
}: {
  widget: Widget;
  depth: number;
  handlers: WidgetHandlers;
  children: ReactNode;
}) {
  const hint = widget.hint ?? null;
  const anchorRef = useRef<HTMLDivElement>(null);
  const controller = useHint(hint);
  const presence = useAnimatedPresence(
    controller.open ? [PRESENCE_KEY] : [],
    (key) => key,
    EXIT_MS,
  );

  return (
    <div className="lcars-hint-anchor" ref={anchorRef} {...controller.anchorProps}>
      {children}
      {hint && presence.length > 0 ? (
        <Suspense fallback={null}>
          <HintLayer
            anchorRef={anchorRef}
            controller={controller}
            depth={depth}
            exiting={presence[0].exiting}
            handlers={handlers}
            hint={hint}
            widget={widget}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
