import clsx from "clsx";

import type { LineChartWidget } from "../../../types/contract";
import { joernBgClass, joernColorClass, joernInlineBackground } from "./joernColors";

interface JoernLineChartWidgetProps {
  widget: LineChartWidget;
}

export const JoernLineChartWidget = ({ widget }: JoernLineChartWidgetProps) => {
  const values = widget.series[0]?.data ?? [];
  const max = Math.max(1, ...values);
  const title = widget.label ?? widget.id;
  const barColor = widget.series[0]?.color ?? widget.color;

  if (values.length === 0) {
    return <p className="lcars-joern-empty">No data</p>;
  }

  return (
    <article className="lcars-joern-chart" data-widget-id={widget.id}>
      <header className="lcars-joern-chart-header">
        <div className={clsx("joern-lcars-text-box", "right", joernColorClass(widget.color))}>{title}</div>
      </header>
      <div className="lcars-joern-chart-grid">
        {values.map((value, index) => (
          <div
            className={clsx("lcars-joern-chart-bar", joernBgClass(barColor))}
            key={`${widget.id}-bar-${index}`}
            style={{
              ...joernInlineBackground(barColor),
              height: `${Math.max(2, Math.round((value / max) * 100))}%`,
            }}
            title={`${value}`}
          />
        ))}
      </div>
      <footer className={clsx("joern-lcars-text-box", "bottom-right", joernColorClass(widget.color))}>
        {values.length} samples
      </footer>
    </article>
  );
};
