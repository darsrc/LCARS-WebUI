import { render, screen } from "@testing-library/react";

import { LcarsMetricControl } from "./LcarsMetricControl";

describe("LcarsMetricControl", () => {
  test("renders metric value and status", () => {
    render(
      <LcarsMetricControl
        widget={{
          id: "metric",
          type: "status_tile",
          label: "Shields",
          value: "100%",
          status: "ok",
          color: "blue",
          visible: true,
          disabled: false,
        }}
      />,
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
