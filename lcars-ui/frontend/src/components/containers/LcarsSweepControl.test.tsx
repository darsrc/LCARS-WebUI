import { render, screen } from "@testing-library/react";

import {
  isOverviewParitySweepId,
  LcarsSweepControl,
  OVERVIEW_PARITY_RENDERER_VERSION,
  OVERVIEW_PARITY_SWEEP_IDS,
} from "./LcarsSweepControl";
import type { Widget } from "../../types/contract";

const mockWidget = (id: string, type: Widget["type"]): Widget => {
  return { id, type } as Widget;
};

describe("LcarsSweepControl", () => {
  test("renders generic sweep regions for non-overview widgets", () => {
    const renderWidget = (widget: Widget) => <span data-testid={`widget-${widget.id}`}>{widget.id}</span>;

    const { container } = render(
      <LcarsSweepControl
        renderWidget={renderWidget}
        widget={{
          id: "sweep-ops",
          type: "lcars_sweep",
          label: "Bridge",
          title: "Bridge",
          subtitle: "Ops",
          color: "orange",
          reverse: false,
          width_sidebar: 128,
          left_width: 0.6,
          header_children: [mockWidget("header-a", "lcars_header")],
          rail_children: [mockWidget("rail-a", "button")],
          left_children: [mockWidget("left-a", "status_tile")],
          right_children: [mockWidget("right-a", "status_tile")],
          children: [],
        }}
      />,
    );

    expect(container.querySelector(".lcars-sweep-control")).not.toBeNull();
    expect(container.querySelector(".lcars-overview-parity-sweep")).toBeNull();
    expect(container.querySelector(".lcars-sweep-rail-controls .lcars-sweep-rail-child")).not.toBeNull();
    expect(container.querySelector(".lcars-sweep-content-left .lcars-sweep-child")).not.toBeNull();
    expect(container.querySelector(".lcars-sweep-content-right .lcars-sweep-content-terminal-child")).not.toBeNull();
    expect(screen.getByTestId("widget-header-a")).toBeInTheDocument();
    expect(screen.getByTestId("widget-rail-a")).toBeInTheDocument();
    expect(screen.getByTestId("widget-left-a")).toBeInTheDocument();
    expect(screen.getByTestId("widget-right-a")).toBeInTheDocument();
  });

  test("routes overview sweeps through the code-rendered parity renderer", () => {
    const renderWidget = (widget: Widget) => <span data-testid={`widget-${widget.id}`}>{widget.id}</span>;

    const { container } = render(
      <LcarsSweepControl
        renderWidget={renderWidget}
        widget={{
          id: "overview_sweep_top",
          type: "lcars_sweep",
          title: "TITLE",
          subtitle: "SUBTITLE",
          color: "pale-canary",
          reverse: false,
          width_sidebar: 150,
          left_width: 0.3,
          rail_children: [mockWidget("rail-a", "button"), mockWidget("rail-b", "button")],
          left_children: [mockWidget("left-a", "markdown")],
          right_children: [mockWidget("right-a", "line_chart")],
          children: [],
        }}
      />,
    );

    const parityRoot = container.querySelector(".lcars-overview-parity-sweep");
    expect(parityRoot).not.toBeNull();
    expect(parityRoot).toHaveAttribute("data-lcars-code-rendered", "true");
    expect(parityRoot).toHaveAttribute("data-lcars-parity-scope", "overview");
    expect(parityRoot).toHaveAttribute("data-lcars-renderer", OVERVIEW_PARITY_RENDERER_VERSION);
    expect(container.querySelector(".lcars-sweep-control")).toBeNull();
    expect(container.querySelectorAll(".lcars-overview-parity-mass-svg path").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("img, image, canvas")).toHaveLength(0);
  });

  test("keeps overview parity routing IDs explicit", () => {
    expect(OVERVIEW_PARITY_SWEEP_IDS).toEqual(["overview_sweep_top", "overview_sweep_bottom"]);
    expect(isOverviewParitySweepId("overview_sweep_top")).toBe(true);
    expect(isOverviewParitySweepId("overview_sweep_bottom")).toBe(true);
    expect(isOverviewParitySweepId("sweep-ops")).toBe(false);
  });
});
