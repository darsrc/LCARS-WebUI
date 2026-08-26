import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FormWidget } from "../types/contract";
import { WidgetRenderer } from "./WidgetRenderer";

describe("WidgetRenderer", () => {
  test("renders an authored grid and a procedural data tile without image content", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { container } = render(
      <WidgetRenderer
        widget={{
          id: "periodic-grid",
          type: "authored_composition",
          columns: ["1fr", "2fr"],
          rows: ["1fr"],
          column_gap: "4px",
          row_gap: "0px",
          design_width: 1476,
          design_height: 1080,
          min_width: 960,
          narrow: "scroll",
          children: [{
            id: "hydrogen-area",
            type: "composition_area",
            row: 1,
            column: 2,
            row_span: 1,
            column_span: 1,
            align: "stretch",
            justify: "stretch",
            layer: 0,
            decorative: false,
            children: [{
              id: "hydrogen",
              type: "button",
              action_id: "hydrogen",
              label: "Hydrogen",
              presentation: "data_tile",
              symbol: "H",
              detail: "ATM WT 01",
              terminal: "both",
              density: "micro",
              glyph: { rings: 1, electrons: 1, spokes: 0, rotation: 0 },
            }],
          }],
        }}
        logsByStream={{}}
        onAction={onAction}
        onFormSubmit={vi.fn()}
        onInput={vi.fn()}
      />,
    );

    const area = container.querySelector('[data-area="hydrogen-area"]');
    expect(area).toHaveStyle({ gridColumn: "2 / span 1", gridRow: "1 / span 1" });
    expect(container.querySelector("svg.lcars-atom-glyph")).toBeInTheDocument();
    expect(container.querySelectorAll("img, image, canvas")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /Hydrogen/i }));
    expect(onAction).toHaveBeenCalledWith("hydrogen", null, "hydrogen");
  });

  test("repacks authored content through the adaptive mosaic below its minimum width", async () => {
    const { container } = render(
      <WidgetRenderer
        widget={{
          id: "adaptive-grid",
          type: "authored_composition",
          columns: ["1fr"],
          rows: ["1fr", "1fr"],
          column_gap: "0px",
          row_gap: "0px",
          design_width: 1200,
          design_height: 800,
          min_width: 960,
          narrow: "adaptive",
          children: [
            {
              id: "content-area",
              type: "composition_area",
              row: 1,
              column: 1,
              row_span: 1,
              column_span: 1,
              align: "stretch",
              justify: "stretch",
              layer: 0,
              decorative: false,
              children: [{ id: "adaptive-text", type: "text", content: "Adaptive", size: "body" }],
            },
            {
              id: "decorative-area",
              type: "composition_area",
              row: 2,
              column: 1,
              row_span: 1,
              column_span: 1,
              align: "stretch",
              justify: "stretch",
              layer: 0,
              decorative: true,
              children: [{
                id: "decorative-bar",
                type: "lcars_bar",
                text: null,
                thickness: 8,
                caps: "none",
                label_mode: "embedded",
                align: "start",
              }],
            },
          ],
        }}
        logsByStream={{}}
        onAction={vi.fn()}
        onFormSubmit={vi.fn()}
        onInput={vi.fn()}
      />,
    );

    await waitFor(() => expect(container.querySelector(".lcars-authored-adaptive.lcars-deck--mosaic")).toBeInTheDocument());
    expect(screen.getByText("Adaptive")).toBeInTheDocument();
    expect(container.querySelector(".lcars-structural-bar")).not.toBeInTheDocument();
  });

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

  test("submits and clears a command composer with Enter", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onFormSubmit = vi.fn();
    const widget: FormWidget = {
      id: "order",
      type: "form",
      submit_label: "Send",
      action_id: "dispatch-order",
      children: [{
        id: "order-value",
        type: "text_input",
        label: "Order",
        placeholder: "Transmit an order…",
        value: "",
        password: false,
        autocomplete: false,
        options: {
          multiline: false,
          rows: 3,
          input_type: "text",
          commit: "enter",
          debounce_ms: 250,
        },
      }],
      options: {
        layout: "row",
        columns: 2,
        actions: [{ label: "New Session", action_id: "new-session" }],
        variant: "composer",
        clear_on_submit: true,
        coerce_values: false,
      },
    };

    const { container } = render(
      <WidgetRenderer
        widget={widget}
        logsByStream={{}}
        onAction={onAction}
        onFormSubmit={onFormSubmit}
        onInput={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Order" });
    await user.type(input, "Set course for Bajor{Enter}");

    expect(onFormSubmit).toHaveBeenCalledTimes(1);
    expect(onFormSubmit).toHaveBeenCalledWith("dispatch-order", {
      "order-value": "Set course for Bajor",
    });
    expect(screen.getByRole("textbox", { name: "Order" })).toHaveValue("");
    expect(container.querySelector(".lcars-command-form")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New Session" }));
    expect(onAction).toHaveBeenCalledWith("new-session", undefined);
  });

  test("commits a standalone text field with Enter by default", async () => {
    const user = userEvent.setup();
    const onInput = vi.fn();
    render(
      <WidgetRenderer
        widget={{
          id: "operator-command",
          type: "text_input",
          label: "Command",
          value: "",
          password: false,
          autocomplete: false,
        }}
        logsByStream={{}}
        onAction={vi.fn()}
        onFormSubmit={vi.fn()}
        onInput={onInput}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Command" }), "Engage{Enter}");
    expect(onInput).toHaveBeenCalledWith("operator-command", "Engage");
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
