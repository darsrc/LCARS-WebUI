import { render, screen } from "@testing-library/react";

import { SparklineWidget } from "./SparklineWidget";
import type { SparklineWidget as SparklineWidgetType } from "../../types/contract";

const baseWidget: SparklineWidgetType = {
  id: "spark_1",
  type: "sparkline",
  label: "CPU",
  color: null,
  disabled: false,
  visible: true,
  x_labels: ["a", "b", "c"],
  series: [{ name: "CPU", data: [0.4, 0.5, 0.6], color: null }],
};

describe("SparklineWidget", () => {
  test("renders with series data", () => {
    render(
      <div style={{ width: 240, height: 80 }}>
        <SparklineWidget widget={baseWidget} />
      </div>,
    );

    expect(screen.getByTestId("sparkline-widget")).toBeInTheDocument();
  });

  test("renders extracted frame title when requested", () => {
    render(
      <div style={{ width: 240, height: 80 }}>
        <SparklineWidget frameTitle="CPU" widget={baseWidget} />
      </div>,
    );

    const frame = screen.getByTestId("sparkline-widget");
    expect(frame).toHaveAttribute("data-lcars-shared-primitive", "chart-frame");
    expect(screen.getByText("CPU")).toBeInTheDocument();
  });

  test("renders empty-state when data is empty", () => {
    render(
      <SparklineWidget
        widget={{
          ...baseWidget,
          series: [{ name: "CPU", data: [], color: null }],
          x_labels: [],
        }}
      />,
    );

    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});
