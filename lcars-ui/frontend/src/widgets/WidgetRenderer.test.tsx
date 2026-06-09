import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FormWidget } from "../types/contract";
import { WidgetRenderer } from "./WidgetRenderer";

describe("WidgetRenderer", () => {
  test("submits current form child values", async () => {
    const user = userEvent.setup();
    const onFormSubmit = vi.fn();
    const widget: FormWidget = {
      id: "test-form",
      type: "form",
      label: "Composite Form",
      submit_label: "Commit",
      action_id: "submit-form",
      children: [
        {
          id: "form-text",
          type: "text_input",
          label: "Form Text",
          value: "alpha",
          password: false,
        },
        {
          id: "form-number",
          type: "number_input",
          label: "Form Number",
          value: 3,
          step: 1,
        },
        {
          id: "form-toggle",
          type: "toggle",
          label: "Form Toggle",
          checked: true,
          action_id: "form-toggle",
        },
        {
          id: "form-select",
          type: "select",
          label: "Form Select",
          value: "One",
          action_id: "form-select",
          options: [
            { label: "One", value: "One" },
            { label: "Two", value: "Two" },
          ],
        },
      ],
    };

    render(
      <WidgetRenderer
        widget={widget}
        logsByStream={{}}
        onAction={vi.fn()}
        onFormSubmit={onFormSubmit}
        onInput={vi.fn()}
      />,
    );

    const textInput = screen.getByDisplayValue("alpha");
    await user.clear(textInput);
    await user.type(textInput, "bravo");

    const numberInput = screen.getByDisplayValue("3");
    await user.clear(numberInput);
    await user.type(numberInput, "7");

    await user.click(screen.getByRole("button", { name: /Form Toggle/i }));
    await user.selectOptions(screen.getByRole("combobox"), "Two");
    await user.click(screen.getByRole("button", { name: "Commit" }));

    expect(onFormSubmit).toHaveBeenCalledWith("submit-form", {
      "form-number": "7",
      "form-select": "Two",
      "form-text": "bravo",
      "form-toggle": false,
    });
  });

  test("updates toggle state immediately and emits widget-scoped action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <WidgetRenderer
        widget={{
          id: "shield-toggle",
          type: "toggle",
          label: "Shields",
          checked: false,
          action_id: "toggle-shields",
        }}
        logsByStream={{}}
        onAction={onAction}
        onFormSubmit={vi.fn()}
        onInput={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("button", { name: /Shields/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("ON");
    expect(onAction).toHaveBeenCalledWith("toggle-shields", true, "shield-toggle");
  });

  test("renders radio toggle as interactive segments", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <WidgetRenderer
        widget={{
          id: "power-mode",
          type: "lcars_radio_toggle",
          label: "Power Mode",
          value: "Cruise",
          action_id: "power-mode",
          options: [
            { label: "Cruise", value: "Cruise" },
            { label: "Alert", value: "Alert" },
          ],
        }}
        logsByStream={{}}
        onAction={onAction}
        onFormSubmit={vi.fn()}
        onInput={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Alert" }));

    expect(screen.getByRole("radio", { name: "Alert" })).toHaveAttribute("aria-checked", "true");
    expect(onAction).toHaveBeenCalledWith("power-mode", "Alert", "power-mode");
  });
});
