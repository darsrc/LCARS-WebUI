import { render, screen } from "@testing-library/react";

import { LcarsProgressControl } from "./LcarsProgressControl";

describe("LcarsProgressControl", () => {
  test("renders percentage label", () => {
    render(
      <LcarsProgressControl
        widget={{
          id: "progress",
          type: "progress_bar",
          label: "Repair",
          value: 42,
          show_label: true,
          color: "orange",
          visible: true,
          disabled: false,
        }}
      />,
    );

    expect(screen.getByText("42%")).toBeInTheDocument();
  });
});
