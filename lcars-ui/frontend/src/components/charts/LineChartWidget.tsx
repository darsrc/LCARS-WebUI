import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { LcarsColor, LineChartWidget as LineChartWidgetType } from "../../types/contract";

const PALETTE: Record<LcarsColor, string> = {
  orange: "#f09a2f",
  red: "#dc514c",
  blue: "#65a9ff",
  purple: "#ad8bff",
  white: "#f2f4f8",
  yellow: "#f7d060",
};

const colorFor = (color?: LcarsColor | null): string => {
  if (!color) {
    return PALETTE.orange;
  }
  return PALETTE[color] ?? PALETTE.orange;
};

interface LineChartWidgetProps {
  widget: LineChartWidgetType;
}

export const LineChartWidget = ({ widget }: LineChartWidgetProps) => {
  const maxPoints = Math.max(
    widget.x_labels.length,
    ...widget.series.map((series) => series.data.length),
    0,
  );

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
    <div className="chart-frame" data-testid="line-chart-widget">
      <ResponsiveContainer height={200} width="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <XAxis dataKey="x" tick={{ fill: "#9da6bf", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#9da6bf", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111727",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#f3f5fb" }}
            itemStyle={{ color: "#f3f5fb" }}
          />
          {widget.series.map((series) => (
            <Line
              connectNulls
              dataKey={series.name}
              dot={false}
              isAnimationActive={false}
              key={series.name}
              stroke={colorFor(series.color)}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
