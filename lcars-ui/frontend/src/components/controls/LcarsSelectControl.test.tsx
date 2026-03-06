import { fireEvent, render, screen } from "@testing-library/react";

import { LcarsSelectControl } from "./LcarsSelectControl";

describe("LcarsSelectControl", () => {
  test("selects stacked option in <=4 mode", () => {
    const onSelect = vi.fn();
    render(
      <LcarsSelectControl
        onSelect={onSelect}
        widget={{
          id: "mode",
          type: "select",
          label: "Mode",
          options: [
            { label: "Passive", value: "Passive" },
            { label: "Active", value: "Active" },
          ],
          value: "Passive",
          action_id: "mode",
          color: "orange",
          visible: true,
          disabled: false,
        }}
      />,
    );

    fireEvent.click(screen.getAllByText("Active").at(-1) as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith("Active");
  });
});
