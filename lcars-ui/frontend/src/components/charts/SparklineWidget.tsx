import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type { SparklineWidget as SparklineWidgetType } from "../../types/contract";
import { resolveColorToken } from "../../theme/colorTokens";
import { LcarsFramedSurface } from "../primitives/lcarsChartFramePrimitives";

interface SparklineWidgetProps {
  widget: SparklineWidgetType;
  frameTitle?: string | null;
}

export const SparklineWidget = ({ widget, frameTitle = null }: SparklineWidgetProps) => {
  const series = widget.series[0];
  const data = (series?.data ?? []).map((value, index) => ({
    x: widget.x_labels[index] ?? `${index + 1}`,
    value,
  }));

  if (data.length === 0 || !series) {
    return <p className="chart-empty">No data</p>;
  }

  const stroke = resolveColorToken(series.color ?? widget.color);

  return (
    <LcarsFramedSurface
      bodyClassName="lcars-chart-frame-body lcars-sparkline-frame-body"
      className="lcars-chart-frame lcars-sparkline-frame"
      dataTestId="sparkline-widget"
      primitive="chart-frame"
      spec={{
        bodyPadding: "0",
        title: frameTitle
          ? {
              label: frameTitle,
              anchor: "frame-start",
              className: "lcars-chart-frame-title",
            }
          : null,
        titleReserve: frameTitle ? "1.45rem" : "0px",
      }}
    >
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ top: 6, right: 2, left: 2, bottom: 2 }}>
          <Area
            dataKey="value"
            fill={stroke}
            fillOpacity={0.26}
            isAnimationActive={false}
            stroke={stroke}
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </LcarsFramedSurface>
  );
};
