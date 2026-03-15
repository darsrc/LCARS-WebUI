import type { Page } from "../../types/contract";
import { JoernWidgetRenderer } from "./joern/JoernWidgetRenderer";

interface JoernStrictPageRendererProps {
  page: Page;
  onAction: (actionId: string, value: unknown) => void;
}

export const JoernStrictPageRenderer = ({ page, onAction }: JoernStrictPageRendererProps) => {
  return (
    <section className="lcars-joern-strict-page" data-lcars-joern-page={page.id}>
      {page.rows.map((row) => (
        <div className="lcars-joern-row" key={row.id}>
          {row.columns.map((column) => (
            <div className="lcars-joern-column" key={column.id}>
              {column.widgets.map((widget) => (
                <JoernWidgetRenderer key={widget.id} onAction={onAction} page={page} widget={widget} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
};
