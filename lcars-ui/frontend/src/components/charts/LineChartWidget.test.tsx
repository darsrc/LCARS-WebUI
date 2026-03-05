import { render, screen } from "@testing-library/react";

import { LineChartWidget } from "./LineChartWidget";
import type { LineChartWidget as LineChartWidgetType } from "../../types/contract";

const baseWidget: LineChartWidgetType = {
  id: "chart_1",
  type: "line_chart",
  label: "Power",
  color: null,
  disabled: false,
  visible: true,
  x_labels: ["t1", "t2", "t3"],
  series: [{ name: "EPS", data: [71, 73, 70], color: "orange" }],
};

describe("LineChartWidget", () => {
  test("renders with single series", () => {
    render(
      <div style={{ width: 600, height: 240 }}>
        <LineChartWidget widget={baseWidget} />
      </div>,
    );

    expect(screen.getByTestId("line-chart-widget")).toBeInTheDocument();
  });

  test("renders with multiple series", () => {
    const widget: LineChartWidgetType = {
      ...baseWidget,
      series: [
        { name: "EPS", data: [71, 73, 70], color: "orange" },
        { name: "Plasma", data: [61, 62, 63], color: "blue" },
      ],
    };

    render(
      <div style={{ width: 600, height: 240 }}>
        <LineChartWidget widget={widget} />
      </div>,
    );

    expect(screen.getByTestId("line-chart-widget")).toBeInTheDocument();
  });

  test("renders empty-state when data is missing", () => {
    render(
      <LineChartWidget
        widget={{
          ...baseWidget,
          series: [],
          x_labels: [],
        }}
      />,
    );

    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});
