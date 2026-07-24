/*
 * Hand-arrangement of the deck (beta).
 *
 * This module is loaded lazily and only mounted while arrange mode is on, which
 * is what keeps the feature genuinely non-blocking: with the mode off there is
 * no chunk downloaded, no pointer listener bound, no rect measured, and not one
 * extra render on the streaming path.
 *
 * It renders as a layer of transparent grab targets sharing the deck's grid, so
 * a drag never touches the panels themselves — no widget is remounted, no widget
 * state is lost, and a live-updating chart keeps streaming underneath the drag.
 */
import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { MosaicCell } from "../compose/mosaic";

export interface RearrangeLayerProps {
  cells: MosaicCell[];
  /** Commit a new widget-id order. */
  onReorder: (order: string[]) => void;
}

const areaStyle = (cell: MosaicCell): CSSProperties => ({
  gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
  gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
});

const labelOf = (cell: MosaicCell): string => {
  const widget = cell.widget as { label?: string | null; title?: string | null };
  return widget.label || widget.title || cell.widget.id;
};

export default function RearrangeLayer({ cells, onReorder }: RearrangeLayerProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Target rects are snapshotted once per drag: the deck does not reflow while a
  // drag is in flight, so re-measuring on every pointermove would be waste.
  const rects = useRef<{ id: string; rect: DOMRect }[]>([]);

  const snapshot = useCallback((node: HTMLElement) => {
    const parent = node.parentElement;
    if (!parent) return;
    rects.current = [...parent.querySelectorAll<HTMLElement>("[data-arrange-id]")].map((el) => ({
      id: el.dataset.arrangeId ?? "",
      rect: el.getBoundingClientRect(),
    }));
  }, []);

  const hitTest = (x: number, y: number): string | null => {
    for (const entry of rects.current) {
      const { rect } = entry;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return entry.id;
    }
    return null;
  };

  const handleDown = (id: string) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    snapshot(event.currentTarget);
    setDragId(id);
    setOverId(id);
  };

  const handleMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragId) return;
    setOverId(hitTest(event.clientX, event.clientY));
  };

  const commit = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragId) return;
    const target = hitTest(event.clientX, event.clientY);
    const current = cells.map((cell) => cell.widget.id);

    if (target && target !== dragId) {
      const from = current.indexOf(dragId);
      const to = current.indexOf(target);
      if (from !== -1 && to !== -1) {
        const next = [...current];
        next.splice(from, 1);
        next.splice(to, 0, dragId);
        onReorder(next);
      }
    }
    setDragId(null);
    setOverId(null);
    rects.current = [];
  };

  return (
    <>
      {cells.map((cell) => {
        const id = cell.widget.id;
        return (
          <button
            className="lcars-arrange-target"
            data-arrange-id={id}
            data-dragging={id === dragId || undefined}
            data-over={id === overId && dragId !== null && id !== dragId ? "" : undefined}
            key={id}
            onLostPointerCapture={commit}
            onPointerDown={handleDown(id)}
            onPointerMove={handleMove}
            onPointerUp={commit}
            style={areaStyle(cell)}
            type="button"
          >
            <span className="lcars-arrange-grip" aria-hidden="true">
              ⠿
            </span>
            <span className="lcars-arrange-name">{labelOf(cell)}</span>
          </button>
        );
      })}
    </>
  );
}
