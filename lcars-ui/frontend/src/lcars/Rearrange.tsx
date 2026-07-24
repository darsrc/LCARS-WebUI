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
 *
 * Dropping is edge-aware. Where a panel lands depends on which side of the
 * target it was released over, because that is the question the user is actually
 * asking — "put this one next to that one" or "put this one under that one" —
 * and a single insertion index cannot express both. The sides map onto the
 * structure the flow packer reads back (compose/flow.ts):
 *
 *   left / right   insert beside the target, inside the same band
 *   top / bottom   insert with a row break between, so the two stack
 *
 * The toolbar adds the structure that has nowhere to come from otherwise — an
 * empty row, column or named section to drop panels into.
 */
import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { MosaicCell, MosaicSection, MosaicSlot } from "../compose/mosaic";
import { COL_BREAK, isMarker, ROW_BREAK, sectionEntry, slotEntry } from "../compose/overrides";

export type Side = "left" | "right" | "top" | "bottom";

export interface RearrangeLayerProps {
  cells: MosaicCell[];
  sections: MosaicSection[];
  slots: MosaicSlot[];
  /** The order currently in force, markers included. */
  order: string[];
  /** Commit a new order. */
  onArrange: (order: string[]) => void;
  onReset: () => void;
  /** True when the page has a stored arrangement to reset. */
  arranged: boolean;
}

interface Rect {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

const areaStyle = (rect: Rect): CSSProperties => ({
  gridColumn: `${rect.col + 1} / span ${rect.colSpan}`,
  gridRow: `${rect.row + 1} / span ${rect.rowSpan}`,
});

const labelOf = (cell: MosaicCell): string => {
  const widget = cell.widget as { label?: string | null; title?: string | null };
  return widget.label || widget.title || cell.widget.id;
};

/**
 * Which edge of a box a point is nearest, as a fraction of the box.
 *
 * The bands are proportional rather than fixed so the gesture reads the same on
 * a tall narrow panel as on a wide short one, and the middle is left as a
 * neutral zone: releasing over the centre of a panel means "swap with this one",
 * which stays reachable without having to aim.
 */
const EDGE = 0.3;

export const sideOf = (rect: DOMRect, x: number, y: number): Side | null => {
  const fx = (x - rect.left) / Math.max(1, rect.width);
  const fy = (y - rect.top) / Math.max(1, rect.height);
  const dx = Math.min(fx, 1 - fx);
  const dy = Math.min(fy, 1 - fy);
  if (dx > EDGE && dy > EDGE) return null;
  if (dx < dy) return fx < 0.5 ? "left" : "right";
  return fy < 0.5 ? "top" : "bottom";
};

/**
 * Move `dragId` next to `targetId` on the given side.
 *
 * Sideways is a plain reinsertion — the flow packer lays a band out left to
 * right, so being next in the list *is* being beside it. Stacking needs a row
 * break between the two, since without one they would simply continue along the
 * same band. A null side swaps the two panels, leaving the structure untouched.
 */
export const arrangeOrder = (
  order: string[],
  dragId: string,
  targetId: string,
  side: Side | null,
): string[] => {
  if (dragId === targetId) return order;

  if (side === null) {
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return order;
    next[from] = targetId;
    next[to] = dragId;
    return next;
  }

  const without = order.filter((entry) => entry !== dragId);
  const at = without.indexOf(targetId);
  if (at === -1) return order;

  const insert = (index: number, entries: string[]): string[] => [
    ...without.slice(0, index),
    ...entries,
    ...without.slice(index),
  ];

  switch (side) {
    case "left":
      return insert(at, [dragId]);
    case "right":
      return insert(at + 1, [dragId]);
    case "top":
      return insert(at, [dragId, ROW_BREAK]);
    case "bottom":
      return insert(at + 1, [ROW_BREAK, dragId]);
  }
};

/** Drop a panel into an empty slot, consuming the slot. */
export const fillSlot = (order: string[], dragId: string, slotId: string): string[] => {
  const token = slotEntry(slotId);
  const without = order.filter((entry) => entry !== dragId);
  const at = without.indexOf(token);
  if (at === -1) return order;
  return [...without.slice(0, at), dragId, ...without.slice(at + 1)];
};

/** Drop any empty landing areas — they exist only while arranging. */
export const dropEmptySlots = (order: string[]): string[] =>
  order.filter((entry) => !entry.startsWith("@slot:"));

let slotSeed = 0;
const nextSlotId = (): string => {
  slotSeed += 1;
  return `s${Date.now().toString(36)}${slotSeed}`;
};

export default function RearrangeLayer({
  cells,
  sections,
  slots,
  order,
  onArrange,
  onReset,
  arranged,
}: RearrangeLayerProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; side: Side | null } | null>(null);
  // Target rects are snapshotted once per drag: the deck does not reflow while a
  // drag is in flight, so re-measuring on every pointermove would be waste.
  const rects = useRef<{ id: string; slot: boolean; rect: DOMRect }[]>([]);

  const snapshot = useCallback((node: HTMLElement) => {
    const parent = node.parentElement;
    if (!parent) return;
    rects.current = [...parent.querySelectorAll<HTMLElement>("[data-arrange-id]")].map((el) => ({
      id: el.dataset.arrangeId ?? "",
      slot: el.dataset.arrangeSlot === "true",
      rect: el.getBoundingClientRect(),
    }));
  }, []);

  const hitTest = (x: number, y: number) => {
    for (const entry of rects.current) {
      const { rect } = entry;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
      return { id: entry.id, slot: entry.slot, side: sideOf(rect, x, y) };
    }
    return null;
  };

  const handleDown = (id: string) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    snapshot(event.currentTarget);
    setDragId(id);
    setOver({ id, side: null });
  };

  const handleMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragId) return;
    const hit = hitTest(event.clientX, event.clientY);
    setOver(hit ? { id: hit.id, side: hit.side } : null);
  };

  const commit = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragId) return;
    const hit = hitTest(event.clientX, event.clientY);
    if (hit && (hit.slot || hit.id !== dragId)) {
      const next = hit.slot
        ? fillSlot(order, dragId, hit.id)
        : arrangeOrder(order, dragId, hit.id, hit.side);
      if (next !== order) onArrange(next);
    }
    setDragId(null);
    setOver(null);
    rects.current = [];
  };

  const add = (entries: string[]) => onArrange([...order, ...entries]);
  const sectionCount = order.filter((entry) => entry.startsWith("@section:")).length;

  const renameSection = (key: string, label: string) => {
    // Section keys carry the entry they were built from, so the label can be
    // rewritten in place without disturbing anything around it.
    const entry = key.split("#")[0];
    const at = order.indexOf(entry);
    if (at === -1) return;
    const next = [...order];
    next[at] = sectionEntry(label);
    onArrange(next);
  };

  return (
    <>
      {cells.map((cell) => {
        const id = cell.widget.id;
        const active = over?.id === id && dragId !== null && dragId !== id;
        return (
          <button
            className="lcars-arrange-target"
            data-arrange-id={id}
            data-dragging={id === dragId || undefined}
            data-over={active ? (over?.side ?? "swap") : undefined}
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

      {slots.map((slot) => (
        <button
          className="lcars-arrange-slot"
          data-arrange-id={slot.id}
          data-arrange-slot="true"
          data-over={over?.id === slot.id && dragId !== null ? "" : undefined}
          key={slot.id}
          onPointerUp={commit}
          style={areaStyle(slot)}
          type="button"
        >
          <span className="lcars-arrange-name">Drop here</span>
        </button>
      ))}

      {sections.map((section) => (
        <input
          aria-label="Section name"
          className="lcars-arrange-section"
          defaultValue={section.label}
          key={section.key}
          onBlur={(event) => renameSection(section.key, event.currentTarget.value.trim() || "Section")}
          style={areaStyle(section)}
        />
      ))}

      <div className="lcars-arrange-bar">
        <button onClick={() => add([ROW_BREAK, slotEntry(nextSlotId())])} type="button">
          + Row
        </button>
        <button onClick={() => add([COL_BREAK, slotEntry(nextSlotId())])} type="button">
          + Column
        </button>
        <button
          onClick={() => add([sectionEntry(`Section ${sectionCount + 1}`), slotEntry(nextSlotId())])}
          type="button"
        >
          + Section
        </button>
        {arranged ? (
          <button data-reset="" onClick={onReset} type="button">
            Reset
          </button>
        ) : null}
      </div>
    </>
  );
}

/** True when the order carries anything beyond plain widget ids. */
export const hasStructure = (order: string[]): boolean => order.some(isMarker);
