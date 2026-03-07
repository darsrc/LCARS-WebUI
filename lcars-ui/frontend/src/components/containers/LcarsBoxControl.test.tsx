import { render, screen } from "@testing-library/react";

import { LcarsBoxControl } from "./LcarsBoxControl";
import type { Widget } from "../../types/contract";

const mockWidget = (id: string, type: Widget["type"]): Widget => {
  return { id, type } as Widget;
};

describe("LcarsBoxControl", () => {
  test("splits interior widgets into main and stack regions", () => {
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
          children: [mockWidget("main-1", "line_chart"), mockWidget("stack-1", "status_tile")],
        }}
      />,
    );

    expect(container.querySelector(".lcars-box-content-main .lcars-box-child")).not.toBeNull();
    expect(container.querySelector(".lcars-box-content-stack .lcars-box-child")).not.toBeNull();
    expect(screen.getByTestId("widget-main-1")).toBeInTheDocument();
    expect(screen.getByTestId("widget-stack-1")).toBeInTheDocument();
    expect(screen.getByTestId("widget-left-1")).toBeInTheDocument();
    expect(screen.getByTestId("widget-right-1")).toBeInTheDocument();
  });
});
