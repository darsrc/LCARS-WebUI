import { render, screen } from "@testing-library/react";

import { LcarsBracketControl } from "./LcarsBracketControl";
import type { Widget } from "../../types/contract";

const mockWidget = (id: string, type: Widget["type"]): Widget => {
  return { id, type } as Widget;
};

describe("LcarsBracketControl", () => {
  test("partitions children into main and stacked zones", () => {
    const renderWidget = (widget: Widget) => <span data-testid={`widget-${widget.id}`}>{widget.id}</span>;

    const { container } = render(
      <LcarsBracketControl
        renderWidget={renderWidget}
        widget={{
          id: "bracket-ops",
          type: "lcars_bracket",
          color: "orange",
          orientation: "both",
          children: [mockWidget("main-1", "table"), mockWidget("stack-1", "status_tile")],
        }}
      />,
    );

    expect(container.querySelector(".lcars-bracket-main .lcars-bracket-child")).not.toBeNull();
    expect(container.querySelector(".lcars-bracket-stack .lcars-bracket-child")).not.toBeNull();
    expect(screen.getByTestId("widget-main-1")).toBeInTheDocument();
    expect(screen.getByTestId("widget-stack-1")).toBeInTheDocument();
  });
});
