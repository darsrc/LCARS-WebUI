import { useMemo, useState, type ReactNode } from "react";

export function VirtualList<T>({
  items,
  height,
  rowHeight,
  label,
  renderRow,
  overscan = 3,
}: {
  items: T[];
  height: number;
  rowHeight: number;
  label: string;
  renderRow: (item: T, index: number) => ReactNode;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const range = useMemo(() => {
    const visible = Math.ceil(height / rowHeight);
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(items.length, start + visible + overscan * 2);
    return { start, end };
  }, [height, items.length, overscan, rowHeight, scrollTop]);
  return (
    <div
      aria-label={label}
      aria-rowcount={items.length}
      className="lcars-virtual-list"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      role="table"
      style={{ height, overflowY: "auto" }}
    >
      <div style={{ height: items.length * rowHeight, position: "relative" }}>
        {items.slice(range.start, range.end).map((item, offset) => {
          const index = range.start + offset;
          return (
            <div
              aria-rowindex={index + 1}
              className="lcars-virtual-row"
              key={index}
              role="row"
              style={{ height: rowHeight, position: "absolute", top: index * rowHeight, width: "100%" }}
            >
              {renderRow(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
