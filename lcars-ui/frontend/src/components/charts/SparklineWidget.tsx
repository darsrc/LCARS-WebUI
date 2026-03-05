import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type { LcarsColor, SparklineWidget as SparklineWidgetType } from "../../types/contract";

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

  const stroke = colorFor(series.color ?? widget.color ?? null);

  return (
    <div className="sparkline-frame" data-testid="sparkline-widget">
      <ResponsiveContainer height={60} width="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
          <Area
            dataKey="value"
            fill={stroke}
            fillOpacity={0.22}
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
