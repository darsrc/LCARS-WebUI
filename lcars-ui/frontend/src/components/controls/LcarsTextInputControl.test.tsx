import { fireEvent, render, screen } from "@testing-library/react";

import { LcarsTextInputControl } from "./LcarsTextInputControl";

describe("LcarsTextInputControl", () => {
  test("commits text value on blur", () => {
    const onCommit = vi.fn();
    render(
      <LcarsTextInputControl
        onCommit={onCommit}
        widget={{
          id: "captain",
          type: "text_input",
          label: "Captain",
          value: "Picard",
          placeholder: null,
          password: false,
          regex: null,
          color: "white",
          visible: true,
          disabled: false,
        }}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Captain" });
    fireEvent.change(input, { target: { value: "Janeway" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith("Janeway");
  });
});
