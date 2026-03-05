import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type { SparklineWidget as SparklineWidgetType } from "../../types/contract";
import { resolveColorToken } from "../../theme/colorTokens";

interface SparklineWidgetProps {
  widget: SparklineWidgetType;
}

export const SparklineWidget = ({ widget }: SparklineWidgetProps) => {
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
    <div className="lcars-sparkline-frame" data-testid="sparkline-widget">
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
    </div>
  );
};
