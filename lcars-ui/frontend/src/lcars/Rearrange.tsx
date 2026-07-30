/*
 * Hand-arrangement of the deck (beta).
 *
 * This module is loaded lazily and only mounted while arrange mode is on. It
 * renders transparent grab targets on the same grid as the live widgets, so a
 * drag never remounts a widget or interrupts a streaming surface underneath.
 *
 * A drop is insertion-first:
 *
 *   left / right   insert beside the target in the current band
 *   top / bottom   insert with a row break so the panels stack
 *   centre         insert immediately after the target
 *
 * Swapping two populated panels is still available, but only through the
 * explicit one-shot "Swap next" control. Empty spaces are persistent layout
 * objects: they can be dragged, resized, removed, and exchanged with a panel.
 */
import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { MosaicCell, MosaicSection, MosaicSlot } from "../compose/mosaic";
import { COL_BREAK, isMarker, ROW_BREAK, sectionEntry, slotEntry } from "../compose/overrides";

export type Side = "left" | "right" | "top" | "bottom";
type SpanMap = Record<string, [number, number]>;
type Selection = { kind: "panel" | "spacer"; id: string };

export interface RearrangeLayerProps {
  cells: MosaicCell[];
  sections: MosaicSection[];
  slots: MosaicSlot[];
  columns: number;
  /** The order currently in force, markers included. */
  order: string[];
  spans: SpanMap;
  spacers: SpanMap;
  /** Commit a new order and/or footprint map. */
  onArrange: (order: string[], spans?: SpanMap, spacers?: SpanMap) => void;
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

interface Hit {
  token: string;
  slot: boolean;
  side: Side | null;
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
 * a tall narrow panel as on a wide short one. The neutral middle means "insert
 * after"; swapping is deliberately armed from the toolbar.
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

const isBreak = (entry: string): boolean =>
  entry === ROW_BREAK || entry === COL_BREAK || entry.startsWith("@section:");

/**
 * Remove structural breaks left with no content on one side after a move.
 * Persistent empty space is represented by a spacer, never by an orphan break.
 */
export const normalizeOrder = (order: string[]): string[] => {
  const normalized: string[] = [];
  for (const entry of order) {
    if (!isBreak(entry)) {
      normalized.push(entry);
      continue;
    }
    if (normalized.length === 0) continue;
    if (isBreak(normalized[normalized.length - 1])) {
      normalized[normalized.length - 1] = entry;
    } else {
      normalized.push(entry);
    }
  }
  while (normalized.length > 0 && isBreak(normalized[normalized.length - 1])) normalized.pop();
  return normalized;
};

/**
 * Move `dragToken` next to `targetToken` on the given side.
 *
 * A neutral/centre drop inserts after the target. This makes placement stable:
 * releasing over a populated panel can no longer unexpectedly exchange their
 * positions.
 */
export const arrangeOrder = (
  order: string[],
  dragToken: string,
  targetToken: string,
  side: Side | null,
): string[] => {
  if (dragToken === targetToken) return order;
  if (!order.includes(dragToken) || !order.includes(targetToken)) return order;

  const without = order.filter((entry) => entry !== dragToken);
  const at = without.indexOf(targetToken);
  if (at === -1) return order;

  const insert = (index: number, entries: string[]): string[] =>
    normalizeOrder([...without.slice(0, index), ...entries, ...without.slice(index)]);

  switch (side) {
    case "left":
      return insert(at, [dragToken]);
    case "right":
    case null:
      return insert(at + 1, [dragToken]);
    case "top":
      return insert(at, [dragToken, ROW_BREAK]);
    case "bottom":
      return insert(at + 1, [ROW_BREAK, dragToken]);
  }
};

/** Explicitly exchange two populated positions. Never used as the default drop. */
export const swapOrder = (order: string[], first: string, second: string): string[] => {
  if (first === second) return order;
  const from = order.indexOf(first);
  const to = order.indexOf(second);
  if (from === -1 || to === -1) return order;
  const next = [...order];
  next[from] = second;
  next[to] = first;
  return next;
};

/**
 * Put a panel into a spacer and move that spacer to the panel's old position.
 * The user sees the panel occupy the space they chose without losing the useful
 * gap it vacated.
 */
export const placeInSpacer = (
  order: string[],
  dragToken: string,
  spacerToken: string,
): string[] => {
  if (!spacerToken.startsWith("@slot:")) return order;
  return swapOrder(order, dragToken, spacerToken);
};

let slotSeed = 0;
const nextSlotId = (): string => {
  slotSeed += 1;
  return `s${Date.now().toString(36)}${slotSeed}`;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const resizedSpan = (
  span: readonly [number, number],
  colDelta: number,
  rowDelta: number,
  columns: number,
): [number, number] => [
  clamp(span[0] + colDelta, 1, columns),
  clamp(span[1] + rowDelta, 1, 12),
];

export default function RearrangeLayer({
  cells,
  sections,
  slots,
  columns,
  order,
  spans,
  spacers,
  onArrange,
  onReset,
  arranged,
}: RearrangeLayerProps) {
  const [dragToken, setDragToken] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);
  const [over, setOver] = useState<Hit | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [swapNext, setSwapNext] = useState(false);
  const [resizePreview, setResizePreview] = useState<[number, number] | null>(null);
  const resizeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    colUnit: number;
    rowUnit: number;
    startSpan: [number, number];
    nextSpan: [number, number];
  } | null>(null);

  // Target rects are snapshotted once per drag: the deck does not reflow while a
  // drag is in flight, so re-measuring on every pointermove would be waste.
  const rects = useRef<{ token: string; slot: boolean; rect: DOMRect }[]>([]);

  const snapshot = useCallback((node: HTMLElement) => {
    const parent = node.parentElement;
    if (!parent) return;
    rects.current = [...parent.querySelectorAll<HTMLElement>("[data-arrange-id]")].map((el) => ({
      token: el.dataset.arrangeId ?? "",
      slot: el.dataset.arrangeSlot === "true",
      rect: el.getBoundingClientRect(),
    }));
  }, []);

  const hitTest = (x: number, y: number): Hit | null => {
    for (const entry of rects.current) {
      const { rect } = entry;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
      return {
        token: entry.token,
        slot: entry.slot,
        side: sideOf(rect, x, y),
      };
    }
    return null;
  };

  const handleDown =
    (token: string, selection: Selection) => (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      snapshot(event.currentTarget);
      dragRef.current = token;
      setDragToken(token);
      setSelected(selection);
      setOver({ token, slot: selection.kind === "spacer", side: null });
    };

  const handleMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    setOver(hitTest(event.clientX, event.clientY));
  };

  const commit = (event: PointerEvent<HTMLButtonElement>) => {
    const dragging = dragRef.current;
    if (!dragging) return;
    // Clear the ref first: pointerup releases capture and may immediately emit
    // lostpointercapture, which must not commit the same move twice.
    dragRef.current = null;
    const hit = hitTest(event.clientX, event.clientY);

    if (hit && hit.token !== dragging) {
      const draggingSpacer = dragging.startsWith("@slot:");
      let next: string[];
      if (hit.slot && !draggingSpacer) {
        next = placeInSpacer(order, dragging, hit.token);
      } else if (swapNext) {
        next = swapOrder(order, dragging, hit.token);
      } else {
        next = arrangeOrder(order, dragging, hit.token, hit.side);
      }
      if (next !== order) onArrange(next, spans, spacers);
    }

    setSwapNext(false);
    setDragToken(null);
    setOver(null);
    rects.current = [];
  };

  const addSpacer = (prefix: string[], suffix: string[] = []) => {
    const id = nextSlotId();
    const token = slotEntry(id);
    onArrange(
      [...order, ...prefix, token, ...suffix],
      spans,
      { ...spacers, [id]: [Math.min(2, columns), 1] },
    );
    setSelected({ kind: "spacer", id });
  };

  const sectionCount = order.filter((entry) => entry.startsWith("@section:")).length;

  const renameSection = (key: string, label: string) => {
    // Section keys carry the entry they were built from, so the label can be
    // rewritten in place without disturbing anything around it.
    const entry = key.split("#")[0];
    const at = order.indexOf(entry);
    if (at === -1) return;
    const next = [...order];
    next[at] = sectionEntry(label);
    onArrange(next, spans, spacers);
  };

  const selectedRect = selected
    ? selected.kind === "panel"
      ? cells.find((cell) => cell.widget.id === selected.id)
      : slots.find((slot) => slot.id === selected.id)
    : undefined;
  const selectedSpan = selected
    ? selected.kind === "panel"
      ? (spans[selected.id] ?? (selectedRect && [selectedRect.colSpan, selectedRect.rowSpan]))
      : (spacers[selected.id] ?? (selectedRect && [selectedRect.colSpan, selectedRect.rowSpan]))
    : undefined;

  const resizeSelected = (colDelta: number, rowDelta: number) => {
    if (!selected || !selectedSpan) return;
    const next = resizedSpan(selectedSpan, colDelta, rowDelta, columns);
    if (next[0] === selectedSpan[0] && next[1] === selectedSpan[1]) return;
    if (selected.kind === "panel") {
      onArrange(order, { ...spans, [selected.id]: next }, spacers);
    } else {
      onArrange(order, spans, { ...spacers, [selected.id]: next });
    }
  };

  const beginResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (!selected || !selectedSpan) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const parent = event.currentTarget.parentElement;
    const token = selected.kind === "panel" ? selected.id : slotEntry(selected.id);
    const target = parent
      ? [...parent.querySelectorAll<HTMLElement>("[data-arrange-id]")].find(
          (node) => node.dataset.arrangeId === token,
        )
      : undefined;
    const targetRect = target?.getBoundingClientRect();
    const computedRowUnit = parent
      ? Number.parseFloat(getComputedStyle(parent).getPropertyValue("--row-unit"))
      : Number.NaN;
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      colUnit: Math.max(24, (targetRect?.width ?? parent?.clientWidth ?? columns) / selectedSpan[0]),
      rowUnit: Math.max(
        24,
        (targetRect?.height ?? (Number.isFinite(computedRowUnit) ? computedRowUnit : 72)) /
          selectedSpan[1],
      ),
      startSpan: selectedSpan,
      nextSpan: selectedSpan,
    };
    setResizePreview(selectedSpan);
  };

  const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
    const active = resizeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const next = resizedSpan(
      active.startSpan,
      Math.round((event.clientX - active.startX) / active.colUnit),
      Math.round((event.clientY - active.startY) / active.rowUnit),
      columns,
    );
    active.nextSpan = next;
    setResizePreview(next);
  };

  const finishResize = (event: PointerEvent<HTMLButtonElement>) => {
    const active = resizeRef.current;
    if (!active || active.pointerId !== event.pointerId || !selected) return;
    resizeRef.current = null;
    setResizePreview(null);
    const next = active.nextSpan;
    if (next[0] === active.startSpan[0] && next[1] === active.startSpan[1]) return;
    if (selected.kind === "panel") {
      onArrange(order, { ...spans, [selected.id]: next }, spacers);
    } else {
      onArrange(order, spans, { ...spacers, [selected.id]: next });
    }
  };

  const resetSelectedSize = () => {
    if (!selected) return;
    if (selected.kind === "panel") {
      const next = { ...spans };
      delete next[selected.id];
      onArrange(order, next, spacers);
    } else {
      onArrange(order, spans, {
        ...spacers,
        [selected.id]: [Math.min(2, columns), 1],
      });
    }
  };

  const removeSelectedSpacer = () => {
    if (selected?.kind !== "spacer") return;
    const nextSpacers = { ...spacers };
    delete nextSpacers[selected.id];
    onArrange(
      normalizeOrder(order.filter((entry) => entry !== slotEntry(selected.id))),
      spans,
      nextSpacers,
    );
    setSelected(null);
  };

  return (
    <>
      {cells.map((cell) => {
        const id = cell.widget.id;
        const active = over?.token === id && dragToken !== null && dragToken !== id;
        const feedback = active ? (swapNext ? "swap" : (over?.side ?? "insert")) : undefined;
        return (
          <button
            aria-label={`Move ${labelOf(cell)}`}
            className="lcars-arrange-target"
            data-arrange-id={id}
            data-dragging={id === dragToken || undefined}
            data-over={feedback}
            data-selected={selected?.kind === "panel" && selected.id === id ? "" : undefined}
            key={id}
            onLostPointerCapture={commit}
            onPointerCancel={commit}
            onPointerDown={handleDown(id, { kind: "panel", id })}
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

      {slots.map((slot) => {
        const token = slotEntry(slot.id);
        const active = over?.token === token && dragToken !== null && dragToken !== token;
        return (
          <button
            aria-label={`Move empty space ${slot.colSpan} by ${slot.rowSpan}`}
            className="lcars-arrange-slot"
            data-arrange-id={token}
            data-arrange-slot="true"
            data-dragging={token === dragToken || undefined}
            data-over={active ? "" : undefined}
            data-selected={
              selected?.kind === "spacer" && selected.id === slot.id ? "" : undefined
            }
            key={slot.id}
            onLostPointerCapture={commit}
            onPointerCancel={commit}
            onPointerDown={handleDown(token, { kind: "spacer", id: slot.id })}
            onPointerMove={handleMove}
            onPointerUp={commit}
            style={areaStyle(slot)}
            type="button"
          >
            <span className="lcars-arrange-grip" aria-hidden="true">
              ⠿
            </span>
            <span className="lcars-arrange-name">
              Space {slot.colSpan}×{slot.rowSpan}
            </span>
          </button>
        );
      })}

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

      {selected && selectedRect && selectedSpan ? (
        <button
          aria-label={`Resize ${
            selected.kind === "panel" ? selected.id : "empty space"
          }, ${(resizePreview ?? selectedSpan)[0]} columns by ${
            (resizePreview ?? selectedSpan)[1]
          } rows`}
          className="lcars-arrange-resize"
          onKeyDown={(event) => {
            const colDelta =
              event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
            const rowDelta =
              event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
            if (colDelta === 0 && rowDelta === 0) return;
            event.preventDefault();
            resizeSelected(colDelta, rowDelta);
          }}
          onLostPointerCapture={finishResize}
          onPointerCancel={finishResize}
          onPointerDown={beginResize}
          onPointerMove={moveResize}
          onPointerUp={finishResize}
          style={areaStyle({
            ...selectedRect,
            colSpan: (resizePreview ?? selectedSpan)[0],
            rowSpan: (resizePreview ?? selectedSpan)[1],
          })}
          type="button"
        >
          <span aria-hidden="true">↘</span>
        </button>
      ) : null}

      <div className="lcars-arrange-bar">
        {selected && selectedSpan ? (
          <span className="lcars-arrange-selection">
            {selected.kind === "panel" ? selected.id : "Space"} · {selectedSpan[0]}×
            {selectedSpan[1]}
          </span>
        ) : null}
        {selected ? (
          <span className="lcars-arrange-size" role="group" aria-label="Selected item size">
            <button aria-label="Decrease width" onClick={() => resizeSelected(-1, 0)} type="button">
              W−
            </button>
            <button aria-label="Increase width" onClick={() => resizeSelected(1, 0)} type="button">
              W+
            </button>
            <button aria-label="Decrease height" onClick={() => resizeSelected(0, -1)} type="button">
              H−
            </button>
            <button aria-label="Increase height" onClick={() => resizeSelected(0, 1)} type="button">
              H+
            </button>
            <button onClick={resetSelectedSize} type="button">
              Auto size
            </button>
            {selected.kind === "spacer" ? (
              <button data-remove="" onClick={removeSelectedSpacer} type="button">
                Remove space
              </button>
            ) : null}
          </span>
        ) : null}
        <span className="lcars-arrange-create" role="group" aria-label="Add layout structure">
          <button onClick={() => addSpacer([ROW_BREAK])} type="button">
            + Row
          </button>
          <button onClick={() => addSpacer([COL_BREAK])} type="button">
            + Column
          </button>
          <button
            onClick={() => addSpacer([sectionEntry(`Section ${sectionCount + 1}`)])}
            type="button"
          >
            + Section
          </button>
        </span>
        <button
          aria-pressed={swapNext}
          data-active={swapNext || undefined}
          onClick={() => setSwapNext((active) => !active)}
          type="button"
        >
          Swap next
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
