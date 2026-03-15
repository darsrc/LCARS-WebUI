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
import { LcarsFramedSurface } from "../primitives/lcarsChartFramePrimitives";

interface LineChartWidgetProps {
  widget: LineChartWidgetType;
  frameTitle?: string | null;
}

/*
 * These IDs are parity-family hooks used by overview/systems sweeps.
 * Generic line charts should not depend on them and continue through the
 * default branch below.
 */
const PARITY_HISTOGRAM_TITLES: Record<string, string> = {
  overview_chart_alpha: "Plot 1",
  overview_chart_beta: "Plot 2",
  systems_chart_alpha: "Plot 3",
  systems_chart_beta: "Plot 4",
};

const OVERVIEW_X_DOMAIN: readonly [number, number] = [-4, 3];
const OVERVIEW_Y_DOMAIN: readonly [number, number] = [0, 75];
const OVERVIEW_X_MAJOR_TICKS = [-4, -2, 0, 2];
const OVERVIEW_X_MINOR_TICKS = [-3, -1, 1];
const OVERVIEW_Y_MAJOR_TICKS = [0, 20, 40, 60];
const OVERVIEW_Y_MINOR_TICKS = [10, 30, 50, 70];
const OVERVIEW_TICK_FONT = '"Oswald", "Arial Narrow", sans-serif';

const mapXValuesToCoordinates = (
  values: number[],
  offset: { left: number; width: number },
): number[] => {
  const [minX, maxX] = OVERVIEW_X_DOMAIN;
  const span = maxX - minX;
  if (span <= 0 || offset.width <= 0) {
    return [];
  }
  return values
    .filter((value) => value >= minX && value <= maxX)
    .map((value) => offset.left + ((value - minX) / span) * offset.width)
    .sort((a, b) => a - b);
};

const mapYValuesToCoordinates = (
  values: number[],
  offset: { top: number; height: number },
): number[] => {
  const [minY, maxY] = OVERVIEW_Y_DOMAIN;
  const span = maxY - minY;
  if (span <= 0 || offset.height <= 0) {
    return [];
  }
  return values
    .filter((value) => value >= minY && value <= maxY)
    .map((value) => offset.top + offset.height - ((value - minY) / span) * offset.height)
    .sort((a, b) => a - b);
};

const makeParityGridRows =
  (values: number[]) =>
  ({ offset }: { offset: { top: number; height: number } }): number[] =>
    mapYValuesToCoordinates(values, offset);

const makeParityGridCols =
  (values: number[]) =>
  ({ offset }: { offset: { left: number; width: number } }): number[] =>
    mapXValuesToCoordinates(values, offset);

const OVERVIEW_AXIS_TEXT_STYLE = {
  fill: "#FFFFCC",
  fontFamily: OVERVIEW_TICK_FONT,
  fontSize: 11,
  fontWeight: 700,
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

export const LineChartWidget = ({ widget, frameTitle = null }: LineChartWidgetProps) => {
  const histogramTitle = PARITY_HISTOGRAM_TITLES[widget.id];
  const resolvedFrameTitle = histogramTitle ?? frameTitle;
  if (histogramTitle) {
    const histogramSeries = widget.series[0];
    const data = makeHistogramData(histogramSeries?.data ?? []);

    if (data.length === 0) {
      return <p className="chart-empty">No data</p>;
    }

    return (
      <LcarsFramedSurface
        bodyClassName="lcars-chart-frame-body lcars-histogram-frame-body"
        className="lcars-chart-frame lcars-histogram-frame lcars-overview-histogram-frame"
        dataTestId="parity-histogram-widget"
        primitive="chart-frame"
        spec={{
          bodyPadding: "0",
          title: resolvedFrameTitle
            ? {
                label: resolvedFrameTitle,
                anchor: "frame-start",
                className: "lcars-histogram-title",
                offsetX: 6,
              }
            : null,
          titleReserve: resolvedFrameTitle ? "1.95rem" : "0px",
        }}
      >
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap="0%"
            barGap={0}
            data={data}
            margin={{ top: 17, right: 10, left: 34, bottom: 15 }}
          >
            <CartesianGrid
              horizontalCoordinatesGenerator={makeParityGridRows(OVERVIEW_Y_MINOR_TICKS)}
              stroke="var(--lcars-grid-line-minor)"
              strokeWidth={0.25}
              verticalCoordinatesGenerator={makeParityGridCols(OVERVIEW_X_MINOR_TICKS)}
            />
            <CartesianGrid
              horizontalCoordinatesGenerator={makeParityGridRows(OVERVIEW_Y_MAJOR_TICKS)}
              stroke="var(--lcars-grid-line-major)"
              strokeWidth={0.5}
              verticalCoordinatesGenerator={makeParityGridCols(OVERVIEW_X_MAJOR_TICKS)}
            />
            <XAxis
              axisLine={false}
              dataKey="x"
              domain={OVERVIEW_X_DOMAIN}
              height={22}
              label={{ value: "x", offset: 3, position: "insideBottom", ...OVERVIEW_AXIS_TEXT_STYLE }}
              tick={OVERVIEW_AXIS_TEXT_STYLE}
              tickCount={4}
              tickFormatter={(value) => `${Math.round(value)}`}
              tickLine={{ stroke: "#FFFFCC", strokeWidth: 1 }}
              ticks={OVERVIEW_X_MAJOR_TICKS}
              type="number"
            />
            <YAxis
              axisLine={false}
              domain={OVERVIEW_Y_DOMAIN}
              label={{ value: "count", angle: -90, offset: 6, position: "insideLeft", ...OVERVIEW_AXIS_TEXT_STYLE }}
              tick={OVERVIEW_AXIS_TEXT_STYLE}
              tickLine={{ stroke: "#FFFFCC", strokeWidth: 1 }}
              ticks={OVERVIEW_Y_MAJOR_TICKS}
              type="number"
            />
            <Bar
              barSize={35}
              dataKey="y"
              fill={resolveColorToken(histogramSeries?.color ?? widget.color)}
              isAnimationActive={false}
              stroke="#000000"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </LcarsFramedSurface>
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
    <LcarsFramedSurface
      bodyClassName="lcars-chart-frame-body"
      className="lcars-chart-frame"
      dataTestId="line-chart-widget"
      primitive="chart-frame"
      spec={{
        bodyPadding: "0",
        title: resolvedFrameTitle
          ? {
              label: resolvedFrameTitle,
              anchor: "frame-start",
              className: "lcars-chart-frame-title",
            }
          : null,
        titleReserve: resolvedFrameTitle ? "1.45rem" : "0px",
      }}
    >
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
    </LcarsFramedSurface>
  );
};
