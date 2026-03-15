import { render, screen } from "@testing-library/react";

import { LcarsGaugeControl } from "./LcarsGaugeControl";

describe("LcarsGaugeControl", () => {
  test("renders gauge numeric readout", () => {
    const { container } = render(
      <LcarsGaugeControl
        widget={{
          id: "gauge",
          type: "gauge",
          label: "Core Output",
          value: 75,
          min: 0,
          max: 100,
          unit: "%",
          warn_threshold: 80,
          crit_threshold: 95,
          color: "blue",
          visible: true,
          disabled: false,
        }}
      />,
    );

    expect(screen.getByText("75.0")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(container.querySelector('[data-lcars-shared-primitive="readout-frame"]')).not.toBeNull();
    expect(screen.getByText("Core Output")).toBeInTheDocument();
  });
});
