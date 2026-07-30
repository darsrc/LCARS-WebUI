import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import type { PopupWidget } from "../types/contract";
import {
  clampFloatingRect,
  initialFloatingRect,
  moveFloatingRect,
  resizeFloatingRect,
  viewportBounds,
  type FloatingRect,
} from "../lcars/floating";

interface PopupUIState {
  dismissed?: boolean;
  rect?: FloatingRect;
}

interface PopupWindowProps {
  accent: CSSProperties;
  children: ReactNode;
  onAction: (actionId: string, value: unknown, widgetId?: string) => void;
  onUiStateChange?: (widgetId: string, value: unknown) => void;
  storedState?: unknown;
  widget: PopupWidget;
}

const LIMITS = { minWidth: 280, minHeight: 180 };
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Gesture = {
  kind: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  startRect: FloatingRect;
  nextRect: FloatingRect;
};

const validStoredRect = (value: unknown): value is FloatingRect => {
  if (!value || typeof value !== "object") return false;
  const rect = value as Record<string, unknown>;
  return ["x", "y", "width", "height"].every(
    (key) => typeof rect[key] === "number" && Number.isFinite(rect[key]),
  );
};

export function PopupWindow({
  accent,
  children,
  onAction,
  onUiStateChange,
  storedState,
  widget,
}: PopupWindowProps) {
  const stored = (storedState ?? {}) as PopupUIState;
  const limits = {
    ...LIMITS,
    maxWidth: Math.max(LIMITS.minWidth, widget.width * 2),
    maxHeight: Math.max(LIMITS.minHeight, widget.height * 2),
  };
  const [rect, setRect] = useState<FloatingRect>(() =>
    validStoredRect(stored.rect)
      ? clampFloatingRect(stored.rect, viewportBounds(), limits)
      : initialFloatingRect(widget.width, widget.height, widget.position, viewportBounds(), limits),
  );
  const [dismissed, setDismissed] = useState(stored.dismissed === true);
  const previousOpen = useRef(widget.open);
  const gesture = useRef<Gesture | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const persist = (nextRect = rect, nextDismissed = dismissed) => {
    onUiStateChange?.(widget.id, { rect: nextRect, dismissed: nextDismissed });
  };

  useEffect(() => {
    const wasOpen = previousOpen.current;
    previousOpen.current = widget.open;
    if (!wasOpen && widget.open) {
      setDismissed(false);
      onUiStateChange?.(widget.id, { rect, dismissed: false });
    }
  }, [widget.open, widget.id, onUiStateChange, rect]);

  useEffect(() => {
    if (!widget.open || dismissed) return;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => surfaceRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      returnFocusRef.current?.focus();
    };
  }, [widget.open, dismissed]);

  useEffect(() => {
    const clampToViewport = () => {
      setRect((current) => {
        const next = clampFloatingRect(current, viewportBounds(), limits);
        onUiStateChange?.(widget.id, { rect: next, dismissed });
        return next;
      });
    };
    window.addEventListener("resize", clampToViewport);
    return () => window.removeEventListener("resize", clampToViewport);
  }, [dismissed, limits.maxHeight, limits.maxWidth, onUiStateChange, widget.id]);

  const dismiss = () => {
    if (!widget.dismissible || widget.disabled) return;
    setDismissed(true);
    persist(rect, true);
    if (widget.close_action_id) {
      onAction(widget.close_action_id, { kind: "close" }, widget.id);
    }
  };

  const beginGesture =
    (kind: Gesture["kind"]) => (event: PointerEvent<HTMLElement>) => {
      const enabled = kind === "move" ? widget.draggable : widget.resizable;
      if (!enabled || widget.disabled) return;
      if (kind === "move" && event.target instanceof Element && event.target.closest("button")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = {
        kind,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startRect: rect,
        nextRect: rect,
      };
    };

  const updateGesture = (event: PointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - active.startX;
    const deltaY = event.clientY - active.startY;
    const next =
      active.kind === "move"
        ? moveFloatingRect(active.startRect, deltaX, deltaY, viewportBounds(), limits)
        : resizeFloatingRect(active.startRect, deltaX, deltaY, viewportBounds(), limits);
    active.nextRect = next;
    setRect(next);
  };

  const finishGesture = (event: PointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    persist(active.nextRect, dismissed);
  };

  const nudge = (kind: Gesture["kind"], event: KeyboardEvent<HTMLElement>) => {
    const horizontal = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    const vertical = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (horizontal === 0 && vertical === 0) return;
    const enabled = kind === "move" ? widget.draggable : widget.resizable;
    if (!enabled || widget.disabled) return;
    event.preventDefault();
    const step = event.shiftKey ? 48 : 12;
    const next =
      kind === "move"
        ? moveFloatingRect(rect, horizontal * step, vertical * step, viewportBounds(), limits)
        : resizeFloatingRect(rect, horizontal * step, vertical * step, viewportBounds(), limits);
    setRect(next);
    persist(next, dismissed);
  };

  const handleDialogKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && widget.dismissible) {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key !== "Tab" || !widget.modal) return;
    const focusable = [...(surfaceRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (focusable.length === 0) {
      event.preventDefault();
      surfaceRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!widget.open || dismissed || widget.visible === false) return null;
  const host = document.querySelector(".lcars-root") ?? document.body;
  const titleId = `${widget.id}-popup-title`;

  return createPortal(
    <div
      className="lcars-popup-layer"
      data-modal={widget.modal || undefined}
      data-popup-id={widget.id}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && widget.modal) dismiss();
      }}
    >
      <div
        aria-labelledby={titleId}
        aria-modal={widget.modal || undefined}
        className="lcars-popup"
        data-disabled={widget.disabled || undefined}
        onKeyDown={handleDialogKeys}
        ref={surfaceRef}
        role="dialog"
        style={{
          ...accent,
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
        tabIndex={-1}
      >
        <div
          aria-label={`Move ${widget.title}`}
          className="lcars-popup-head"
          data-draggable={widget.draggable && !widget.disabled ? "" : undefined}
          onKeyDown={(event) => nudge("move", event)}
          onLostPointerCapture={finishGesture}
          onPointerCancel={finishGesture}
          onPointerDown={beginGesture("move")}
          onPointerMove={updateGesture}
          onPointerUp={finishGesture}
          role={widget.draggable ? "button" : undefined}
          tabIndex={widget.draggable ? 0 : undefined}
        >
          <span aria-hidden="true" className="lcars-popup-grip" />
          <span id={titleId}>{widget.title}</span>
          {widget.dismissible ? (
            <button
              aria-label={`Close ${widget.title}`}
              className="lcars-popup-close"
              disabled={widget.disabled}
              onClick={dismiss}
              type="button"
            >
              Close
            </button>
          ) : null}
        </div>
        <div className="lcars-popup-body">{children}</div>
        {widget.resizable ? (
          <span
            aria-label={`Resize ${widget.title}, ${Math.round(rect.width)} by ${Math.round(
              rect.height,
            )} pixels`}
            className="lcars-popup-resize"
            onKeyDown={(event) => nudge("resize", event)}
            onLostPointerCapture={finishGesture}
            onPointerCancel={finishGesture}
            onPointerDown={beginGesture("resize")}
            onPointerMove={updateGesture}
            onPointerUp={finishGesture}
            role="button"
            tabIndex={widget.disabled ? -1 : 0}
          />
        ) : null}
      </div>
    </div>,
    host,
  );
}
