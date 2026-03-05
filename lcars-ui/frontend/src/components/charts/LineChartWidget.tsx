import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LineChartWidget as LineChartWidgetType } from "../../types/contract";
import { resolveColorToken } from "../../theme/colorTokens";

interface LineChartWidgetProps {
  widget: LineChartWidgetType;
}

export const LineChartWidget = ({ widget }: LineChartWidgetProps) => {
  const maxPoints = Math.max(widget.x_labels.length, ...widget.series.map((series) => series.data.length), 0);

  const data = Array.from({ length: maxPoints }, (_, index) => {
    const row: Record<string, number | string | null> = {
      x: widget.x_labels[index] ?? `${index + 1}`,
    };
    for (const series of widget.series) {
      row[series.name] = series.data[index] ?? null;
    }
    return row;
  });

  if (data.length === 0 || widget.series.length === 0) {
    return <p className="chart-empty">No data</p>;
  }

  return (
    <div className="lcars-chart-frame" data-testid="line-chart-widget">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ top: 10, right: 14, left: 4, bottom: 6 }}>
          <CartesianGrid stroke="var(--lcars-grid-line)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="x"
            tick={{ fill: "var(--lcars-text-muted)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis axisLine={false} tick={{ fill: "var(--lcars-text-muted)", fontSize: 11 }} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--lcars-surface-2)",
              border: "1px solid var(--lcars-border-muted)",
              borderRadius: 10,
            }}
            itemStyle={{ color: "var(--lcars-text)" }}
            labelStyle={{ color: "var(--lcars-text)" }}
          />
          {widget.series.map((series) => (
            <Line
              connectNulls
              dataKey={series.name}
              dot={false}
              isAnimationActive={false}
              key={series.name}
              stroke={resolveColorToken(series.color ?? widget.color)}
              strokeWidth={2.2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
