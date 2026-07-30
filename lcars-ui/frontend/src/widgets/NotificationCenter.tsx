import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import type { PresenceEntry } from "../lcars/motion";
import {
  clampFloatingRect,
  moveFloatingRect,
  viewportBounds,
  type FloatingRect,
} from "../lcars/floating";

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: number;
  level: NotificationLevel;
  message: string;
  title?: string | null;
  durationMs: number;
  dismissible: boolean;
  movable: boolean;
}

interface NotificationCenterProps {
  entries: PresenceEntry<NotificationItem>[];
  onDismiss: (id: number) => void;
}

const STORAGE_KEY = "lcars.notifications.position.v1";
const WIDTH = 360;
const MIN_HEIGHT = 72;
const LIMITS = { minWidth: 260, minHeight: MIN_HEIGHT, maxWidth: WIDTH, maxHeight: 640 };

const readPosition = (): [number, number] | null => {
  try {
    const encoded = window.localStorage.getItem(STORAGE_KEY);
    if (!encoded) return null;
    const parsed = JSON.parse(encoded) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed.every((value) => typeof value === "number" && Number.isFinite(value))
    ) {
      return [parsed[0], parsed[1]];
    }
  } catch {
    // Storage is optional.
  }
  return null;
};

const defaultRect = (height: number): FloatingRect => {
  const bounds = viewportBounds();
  return clampFloatingRect(
    {
      x: bounds.width - WIDTH - 16,
      y: bounds.height - height - 16,
      width: WIDTH,
      height,
    },
    bounds,
    LIMITS,
  );
};

export function NotificationCenter({ entries, onDismiss }: NotificationCenterProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startRect: FloatingRect;
    nextRect: FloatingRect;
  } | null>(null);
  const initialPosition = useRef(readPosition());
  const [rect, setRect] = useState<FloatingRect>(() => {
    const base = defaultRect(Math.min(640, Math.max(MIN_HEIGHT, entries.length * 74 + 34)));
    const stored = initialPosition.current;
    return stored ? clampFloatingRect({ ...base, x: stored[0], y: stored[1] }, viewportBounds(), LIMITS) : base;
  });
  const movable = entries.some(({ item }) => item.movable);

  const persist = (next: FloatingRect) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([next.x, next.y]));
    } catch {
      // The center remains movable for this session.
    }
  };

  const measureAndClamp = () => {
    const measuredHeight = hostRef.current?.getBoundingClientRect().height ?? rect.height;
    const next = clampFloatingRect(
      { ...rect, height: Math.max(MIN_HEIGHT, measuredHeight) },
      viewportBounds(),
      LIMITS,
    );
    setRect(next);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(measureAndClamp);
    const handleResize = () => {
      setRect((current) => {
        const next = clampFloatingRect(current, viewportBounds(), LIMITS);
        persist(next);
        return next;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
    // Entry count is the only content change that alters the stack geometry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  const begin = (event: PointerEvent<HTMLButtonElement>) => {
    if (!movable) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRect: rect,
      nextRect: rect,
    };
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const next = moveFloatingRect(
      active.startRect,
      event.clientX - active.startX,
      event.clientY - active.startY,
      viewportBounds(),
      LIMITS,
    );
    active.nextRect = next;
    setRect(next);
  };

  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    persist(active.nextRect);
  };

  const nudge = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!movable) return;
    const dx = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    const dy = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (dx === 0 && dy === 0) return;
    event.preventDefault();
    const step = event.shiftKey ? 48 : 12;
    const next = moveFloatingRect(rect, dx * step, dy * step, viewportBounds(), LIMITS);
    setRect(next);
    persist(next);
  };

  const dock = () => {
    const next = defaultRect(rect.height);
    setRect(next);
    persist(next);
  };

  return (
    <section
      aria-label="Notifications"
      className="lcars-notes"
      data-movable={movable || undefined}
      ref={hostRef}
      style={{ left: rect.x, top: rect.y, width: rect.width }}
    >
      <div className="lcars-notes-head">
        <button
          aria-label="Move notification center"
          className="lcars-notes-grip"
          disabled={!movable}
          onKeyDown={nudge}
          onLostPointerCapture={finish}
          onPointerCancel={finish}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={finish}
          type="button"
        >
          Notifications
        </button>
        {movable ? (
          <button className="lcars-notes-dock" onClick={dock} type="button">
            Dock
          </button>
        ) : null}
      </div>
      <div className="lcars-notes-stack">
        {entries.map(({ item: note, exiting }) => (
          <article
            aria-live={note.level === "error" ? "assertive" : "polite"}
            className="lcars-note"
            data-exit={exiting || undefined}
            data-level={note.level}
            key={note.id}
            role={note.level === "error" ? "alert" : "status"}
          >
            <span className="lcars-note-code" aria-hidden="true">
              {note.level.slice(0, 3)}
            </span>
            <span className="lcars-note-copy">
              {note.title ? <strong>{note.title}</strong> : null}
              <span>{note.message}</span>
            </span>
            {note.dismissible ? (
              <button
                aria-label={`Dismiss ${note.title || note.message}`}
                className="lcars-note-close"
                onClick={() => onDismiss(note.id)}
                type="button"
              >
                ×
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
