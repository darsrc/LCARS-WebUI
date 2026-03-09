import {
  Bar,
  BarChart,
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

const OVERVIEW_HISTOGRAM_TITLES: Record<string, string> = {
  overview_chart_alpha: "Plot 1",
  overview_chart_beta: "Plot 2",
};

const makeParityGridRows = ({ offset }: { offset: { top: number; height: number } }): number[] => {
  const bandCount = 9;
  const step = offset.height / bandCount;
  return Array.from({ length: bandCount + 1 }, (_, index) => offset.top + step * index);
};

const makeParityGridCols = ({ offset }: { offset: { left: number; width: number } }): number[] => {
  const bandCount = 9;
  const step = offset.width / bandCount;
  return Array.from({ length: bandCount + 1 }, (_, index) => offset.left + step * index);
};

const makeHistogramData = (values: number[]): Array<{ x: number; y: number }> => {
  if (values.length === 0) {
    return [];
  }
  const minX = -4;
  const maxX = 3;
  const step = (maxX - minX) / values.length;
  return values.map((value, index) => ({
    x: minX + (index + 0.5) * step,
    y: value,
  }));
};

export const LineChartWidget = ({ widget }: LineChartWidgetProps) => {
  const histogramTitle = OVERVIEW_HISTOGRAM_TITLES[widget.id];
  if (histogramTitle) {
    const histogramSeries = widget.series[0];
    const data = makeHistogramData(histogramSeries?.data ?? []);

    if (data.length === 0) {
      return <p className="chart-empty">No data</p>;
    }

    return (
      <div className="lcars-chart-frame lcars-histogram-frame lcars-overview-histogram-frame" data-testid="overview-histogram-widget">
        <div className="lcars-histogram-title">{histogramTitle}</div>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap="2%"
            barGap={0}
            data={data}
            margin={{ top: 17, right: 10, left: 34, bottom: 15 }}
          >
            <CartesianGrid
              horizontalCoordinatesGenerator={makeParityGridRows}
              stroke="var(--lcars-grid-line)"
              verticalCoordinatesGenerator={makeParityGridCols}
            />
            <XAxis
              axisLine={false}
              dataKey="x"
              domain={[-4, 3]}
              height={22}
              label={{ value: "x", offset: 3, position: "insideBottom" }}
              tick={{ fill: "var(--lcars-text)", fontSize: 11 }}
              tickCount={4}
              tickFormatter={(value) => `${Math.round(value)}`}
              tickLine={false}
              ticks={[-4, -2, 0, 2]}
              type="number"
            />
            <YAxis
              axisLine={false}
              domain={[0, 75]}
              label={{ value: "count", angle: -90, offset: 6, position: "insideLeft" }}
              tick={{ fill: "var(--lcars-text)", fontSize: 11 }}
              tickLine={false}
              ticks={[0, 20, 40, 60]}
              type="number"
            />
            <Bar
              barSize={24}
              dataKey="y"
              fill={resolveColorToken(histogramSeries?.color ?? widget.color)}
              isAnimationActive={false}
              stroke="#000000"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

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
