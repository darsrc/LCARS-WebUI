import { render, screen } from "@testing-library/react";

import { LcarsBoxControl } from "./LcarsBoxControl";
import type { Widget } from "../../types/contract";

const mockWidget = (id: string, type: Widget["type"]): Widget => {
  return { id, type } as Widget;
};

describe("LcarsBoxControl", () => {
  test("renders explicit main and side regions without type-based repartitioning", () => {
    const renderWidget = (widget: Widget) => <span data-testid={`widget-${widget.id}`}>{widget.id}</span>;

    const { container } = render(
      <LcarsBoxControl
        renderWidget={renderWidget}
        widget={{
          id: "box-ops",
          type: "lcars_box",
          label: "Ops",
          title: "Ops",
          subtitle: null,
          corners: [1, 2, 3, 4],
          sides: [1, 2, 3, 4],
          color: "orange",
          corner_colors: null,
          side_colors: null,
          title_color: null,
          subtitle_color: null,
          width_left: 96,
          width_right: 128,
          left_inputs: [mockWidget("left-1", "button")],
          right_inputs: [mockWidget("right-1", "toggle")],
          main_children: [
            mockWidget("telemetry-1", "line_chart"),
            mockWidget("control-1", "button"),
          ],
          side_children: [
            mockWidget("readout-1", "status_tile"),
          ],
          children: [],
        }}
      />,
    );

    expect(container.querySelectorAll(".lcars-box-content-main .lcars-box-child")).toHaveLength(2);
    expect(container.querySelectorAll(".lcars-box-content-side .lcars-box-child")).toHaveLength(1);
    expect(screen.getByTestId("widget-telemetry-1")).toBeInTheDocument();
    expect(screen.getByTestId("widget-readout-1")).toBeInTheDocument();
    expect(screen.getByTestId("widget-control-1")).toBeInTheDocument();
    expect(screen.getByTestId("widget-left-1")).toBeInTheDocument();
    expect(screen.getByTestId("widget-right-1")).toBeInTheDocument();
  });
});
