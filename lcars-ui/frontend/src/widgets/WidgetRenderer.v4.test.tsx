import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { TableWidget } from "../types/contract";
import { WidgetRenderer, type WidgetHandlers } from "./WidgetRenderer";

const handlers = (onAction = vi.fn()): WidgetHandlers => ({
  logsByStream: {},
  onAction,
  onFormSubmit: vi.fn(),
  onInput: vi.fn(),
});

const tableWidget = (mode: "local" | "server" = "local"): TableWidget => ({
  id: "results",
  type: "table",
  headers: ["Name", "Load"],
  rows: [
    {
      id: "beta",
      cells: ["Beta", 10],
      children: [{ id: "beta-child", cells: ["Emitter", 4] }],
    },
    { id: "alpha", cells: ["Alpha", 2] },
  ],
  options: {
    columns: [
      {
        key: "name",
        label: "Name",
        value_type: "text",
        sortable: true,
        first_sort_direction: "asc",
        filter: "text",
        align: "start",
      },
      {
        key: "load",
        label: "Load",
        value_type: "number",
        sortable: true,
        first_sort_direction: "desc",
        filter: "none",
        align: "end",
      },
    ],
    sort: [],
    filters: [],
    selection: { mode: "multiple", selected_ids: [] },
    expanded_ids: [],
    expandable: true,
    sticky_header: true,
    density: "compact",
    interaction: { mode },
  },
});

describe("WidgetRenderer v4 capabilities", () => {
  test("sorts typed values and expands child rows inside one semantic table", async () => {
    const user = userEvent.setup();
    const widget = tableWidget();
    const { container } = render(<WidgetRenderer widget={widget} {...handlers()} />);

    await user.click(screen.getByRole("button", { name: /sort by load/i }));
    const bodyRows = within(container.querySelector("tbody")!).getAllByRole("row");
    expect(bodyRows[0]).toHaveTextContent("Beta");
    expect(bodyRows[1]).toHaveTextContent("Alpha");
    expect(screen.getByRole("columnheader", { name: /load/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    await user.click(screen.getByRole("button", { name: /expand row beta/i }));
    expect(screen.getByText("Emitter")).toBeInTheDocument();
    expect(container.querySelectorAll("table")).toHaveLength(1);
  });

  test("emits typed server table state and supports row selection", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<WidgetRenderer widget={tableWidget("server")} {...handlers(onAction)} />);

    await user.click(screen.getByRole("button", { name: /sort by name/i }));
    expect(onAction).toHaveBeenCalledWith(
      "results",
      expect.objectContaining({
        kind: "sort",
        state: expect.objectContaining({
          sort: [{ key: "name", direction: "asc" }],
          last_event: "sort",
        }),
      }),
      "results",
    );

    await user.click(screen.getByRole("checkbox", { name: "Select row beta" }));
    expect(onAction).toHaveBeenLastCalledWith(
      "results",
      expect.objectContaining({
        kind: "selection",
        state: expect.objectContaining({ selected_ids: ["beta"] }),
      }),
      "results",
    );
  });

  test("dismisses enhanced alerts locally and reports server state", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <WidgetRenderer
        widget={{
          id: "notice",
          type: "alert",
          severity: "success",
          message: "Complete",
          blink: false,
          options: {
            dismissible: true,
            live: "polite",
            interaction: { mode: "server" },
          },
        }}
        {...handlers(onAction)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Dismiss alert" }));
    expect(screen.queryByText("Complete")).not.toBeInTheDocument();
    expect(onAction).toHaveBeenCalledWith(
      "notice",
      { kind: "dismiss", state: { dismissed: true } },
      "notice",
    );
  });
});
