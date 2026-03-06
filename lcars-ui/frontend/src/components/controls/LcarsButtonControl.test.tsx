import { fireEvent, render, screen } from "@testing-library/react";

import { LcarsButtonControl } from "./LcarsButtonControl";

describe("LcarsButtonControl", () => {
  test("dispatches action on click", () => {
    const onAction = vi.fn();
    render(
      <LcarsButtonControl
        onAction={onAction}
        widget={{
          id: "btn",
          type: "button",
          label: "Engage",
          action_id: "engage",
          color: "orange",
          visible: true,
          disabled: false,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Engage" }));
    expect(onAction).toHaveBeenCalledWith("engage", null);
  });
});
