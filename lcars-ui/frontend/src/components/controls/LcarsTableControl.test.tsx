import { render, screen } from "@testing-library/react";

import { LcarsTableControl } from "./LcarsTableControl";

describe("LcarsTableControl", () => {
  test("renders row cells", () => {
    render(
      <LcarsTableControl
        widget={{
          id: "table",
          type: "table",
          label: "Systems",
          headers: ["Name", "Status"],
          rows: [{ id: "row1", cells: ["Warp Core", "Online"] }],
          color: "orange",
          visible: true,
          disabled: false,
        }}
      />,
    );

    expect(screen.getByText("Warp Core")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });
});
