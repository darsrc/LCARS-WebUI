import { render, screen } from "@testing-library/react";

import { LcarsSweepControl } from "./LcarsSweepControl";
import type { Widget } from "../../types/contract";

const mockWidget = (id: string, type: Widget["type"]): Widget => {
  return { id, type } as Widget;
};

describe("LcarsSweepControl", () => {
  test("renders strict header, rail, and content regions", () => {
    const renderWidget = (widget: Widget) => <span data-testid={`widget-${widget.id}`}>{widget.id}</span>;

    const { container } = render(
      <LcarsSweepControl
        renderWidget={renderWidget}
        widget={{
          id: "sweep-ops",
          type: "lcars_sweep",
          label: "Bridge",
          title: "Bridge",
          color: "orange",
          reverse: false,
          width_sidebar: 128,
          header_children: [mockWidget("header-a", "lcars_header")],
          rail_children: [mockWidget("rail-a", "button")],
          content_children: [mockWidget("content-a", "status_tile")],
          children: [],
        }}
      />,
    );

    expect(container.querySelector(".lcars-sweep-header-stack .lcars-sweep-header-child")).not.toBeNull();
    expect(container.querySelector(".lcars-sweep-rail-controls .lcars-sweep-rail-child")).not.toBeNull();
    expect(container.querySelector(".lcars-sweep-content .lcars-sweep-child")).not.toBeNull();
    expect(screen.getByTestId("widget-header-a")).toBeInTheDocument();
    expect(screen.getByTestId("widget-rail-a")).toBeInTheDocument();
    expect(screen.getByTestId("widget-content-a")).toBeInTheDocument();
  });
});
