import { fireEvent, render, screen } from "@testing-library/react";

import { LcarsToggleControl } from "./LcarsToggleControl";

describe("LcarsToggleControl", () => {
  test("toggles checkbox state", () => {
    const onToggle = vi.fn();
    render(
      <LcarsToggleControl
        onToggle={onToggle}
        widget={{
          id: "toggle",
          type: "toggle",
          label: "Shields",
          checked: false,
          action_id: "toggle",
          color: "blue",
          visible: true,
          disabled: false,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Shields" }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
