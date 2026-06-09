/*
 * Composition — map a manifest page (rows -> columns -> widgets) onto a balanced
 * grid inside the content field. Column widths come straight from the contract;
 * loose widgets sit on black with their own accent edges rather than in cards.
 */
import type { Page } from "../types/contract";
import { WidgetRenderer, type WidgetHandlers } from "../widgets/WidgetRenderer";

const normWidth = (width: string | undefined): string => {
  if (!width || width === "auto") return "1fr";
  return width;
};

export function PageView({ page, ...handlers }: { page: Page } & WidgetHandlers) {
  return (
    <div className="lcars-page">
      <div className="lcars-page-head">
        <span>{page.title}</span>
        <span className="lcars-tag">{page.id}</span>
      </div>

      {page.rows.map((row) => (
        <div
          className="lcars-row"
          key={row.id}
          style={{ gridTemplateColumns: row.columns.map((col) => normWidth(col.width)).join(" ") }}
        >
          {row.columns.map((col) => (
            <div className="lcars-col" key={col.id}>
              {col.widgets
                .filter((widget) => widget.visible !== false)
                .map((widget) => (
                  <WidgetRenderer key={widget.id} widget={widget} {...handlers} />
                ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
