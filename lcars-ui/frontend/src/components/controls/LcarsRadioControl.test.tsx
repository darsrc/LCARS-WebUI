import { fireEvent, render, screen } from "@testing-library/react";

import { LcarsRadioControl } from "./LcarsRadioControl";

describe("LcarsRadioControl", () => {
  test("selects radio option", () => {
    const onSelect = vi.fn();
    render(
      <LcarsRadioControl
        onSelect={onSelect}
        widget={{
          id: "profile",
          type: "lcars_radio",
          label: "Profile",
          options: [
            { label: "Alpha", value: "alpha" },
            { label: "Beta", value: "beta" },
          ],
          value: "alpha",
          action_id: "profile",
          color: "purple",
          visible: true,
          disabled: false,
        }}
      />,
    );

    fireEvent.click(screen.getAllByText("Beta").at(-1) as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith("beta");
  });
});
