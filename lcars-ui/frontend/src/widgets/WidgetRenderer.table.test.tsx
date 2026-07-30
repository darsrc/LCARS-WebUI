import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { TableCell, TableRow, TableWidget } from "../types/contract";
import { WidgetRenderer, type WidgetHandlers } from "./WidgetRenderer";

const handlers = (overrides: Partial<WidgetHandlers> = {}): WidgetHandlers => ({
  logsByStream: {},
  onAction: vi.fn(),
  onFormSubmit: vi.fn(),
  onInput: vi.fn(),
  ...overrides,
});

const columns = () => [
  {
    key: "name",
    label: "Name",
    value_type: "text" as const,
    sortable: true,
    first_sort_direction: "asc" as const,
    filter: "text" as const,
    align: "start" as const,
  },
  {
    key: "load",
    label: "Load",
    value_type: "number" as const,
    sortable: true,
    first_sort_direction: "desc" as const,
    filter: "none" as const,
    align: "end" as const,
  },
];

const makeWidget = (rows?: TableRow[], options: Partial<TableWidget["options"]> = {}): TableWidget => ({
  id: "results",
  type: "table",
  headers: ["Name", "Load"],
  rows: rows ?? [
    { id: "beta", cells: ["Beta", 10] },
    { id: "alpha", cells: ["Alpha", 2] },
  ],
  options: {
    columns: columns(),
    sort: [],
    filters: [],
    selection: { mode: "multiple", selected_ids: [] },
    expanded_ids: [],
    expandable: true,
    sticky_header: false,
    density: "normal",
    ...options,
  },
});

const mockClipboard = () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
};

const mockReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe("EnhancedTable state reconciliation", () => {
  test("adopts a programmatic selection from a later manifest update", async () => {
    const first = makeWidget();
    const { rerender } = render(<WidgetRenderer widget={first} {...handlers()} />);
    expect(screen.getByRole("checkbox", { name: "Select row alpha" })).not.toBeChecked();

    const next = makeWidget(undefined, { selection: { mode: "multiple", selected_ids: ["alpha"] } });
    rerender(<WidgetRenderer widget={next} {...handlers()} />);

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Select row alpha" })).toBeChecked(),
    );
  });

  test("adopts a programmatic expansion from a later manifest update", async () => {
    const first = makeWidget([{ id: "beta", cells: ["Beta", 10], children: [{ id: "beta-child", cells: ["Emitter", 4] }] }]);
    const { rerender } = render(<WidgetRenderer widget={first} {...handlers()} />);
    expect(screen.queryByText("Emitter")).not.toBeInTheDocument();

    const next = makeWidget(
      [{ id: "beta", cells: ["Beta", 10], children: [{ id: "beta-child", cells: ["Emitter", 4] }] }],
      { expanded_ids: ["beta"] },
    );
    rerender(<WidgetRenderer widget={next} {...handlers()} />);

    await waitFor(() => expect(screen.getByText("Emitter")).toBeInTheDocument());
  });

  test("prunes removed row ids from selection and expansion", async () => {
    const onUiStateChange = vi.fn();
    const rows: TableRow[] = [
      { id: "beta", cells: ["Beta", 10] },
      { id: "alpha", cells: ["Alpha", 2] },
    ];
    const first = makeWidget(rows, {
      selection: { mode: "multiple", selected_ids: ["alpha", "beta"] },
      expanded_ids: ["alpha"],
    });
    const { rerender } = render(
      <WidgetRenderer widget={first} {...handlers({ onUiStateChange })} />,
    );

    // Alpha vanishes from the dataset; options are otherwise unchanged.
    const next = makeWidget([{ id: "beta", cells: ["Beta", 10] }], {
      selection: { mode: "multiple", selected_ids: ["alpha", "beta"] },
      expanded_ids: ["alpha"],
    });
    rerender(<WidgetRenderer widget={next} {...handlers({ onUiStateChange })} />);

    await waitFor(() =>
      expect(onUiStateChange).toHaveBeenCalledWith(
        "results",
        expect.objectContaining({ selected_ids: ["beta"], expanded_ids: [] }),
      ),
    );
  });

  test("keeps a deliberate user selection across a plain data refresh", async () => {
    const user = userEvent.setup();
    const first = makeWidget();
    const { rerender } = render(<WidgetRenderer widget={first} {...handlers()} />);

    await user.click(screen.getByRole("checkbox", { name: "Select row beta" }));
    expect(screen.getByRole("checkbox", { name: "Select row beta" })).toBeChecked();

    // Same options, refreshed values only.
    const refreshed = makeWidget([
      { id: "beta", cells: ["Beta", 99] },
      { id: "alpha", cells: ["Alpha", 3] },
    ]);
    rerender(<WidgetRenderer widget={refreshed} {...handlers()} />);

    expect(screen.getByRole("checkbox", { name: "Select row beta" })).toBeChecked();
  });

  test("allows a later manifest to clear sorting even when header clicks use two states", async () => {
    const first = makeWidget(undefined, {
      data_mode: "server",
      sort_cycle: "two-state",
      sort: [{ key: "name", direction: "asc" }],
    });
    const { rerender } = render(<WidgetRenderer widget={first} {...handlers()} />);
    const header = screen.getByRole("button", { name: /sort by name/i });
    expect(header).toHaveTextContent("↑");

    rerender(
      <WidgetRenderer
        widget={makeWidget(undefined, {
          data_mode: "server",
          sort_cycle: "two-state",
          sort: [],
        })}
        {...handlers()}
      />,
    );

    await waitFor(() => expect(header).not.toHaveTextContent(/[↑↓]/));
  });
});

describe("EnhancedTable data-mode vs event emission", () => {
  test("sorts locally while emitting typed state changes in client+emit mode", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const widget = makeWidget(undefined, {
      data_mode: "client",
      emit_state_changes: true,
      interaction: { mode: "local", action_id: "repos" },
    });
    const { container } = render(<WidgetRenderer widget={widget} {...handlers({ onAction })} />);

    await user.click(screen.getByRole("button", { name: /sort by load/i }));

    // Emitted to the backend...
    expect(onAction).toHaveBeenCalledWith(
      "repos",
      expect.objectContaining({ kind: "sort" }),
      "results",
    );
    // ...and still sorted on the client (Beta load 10 before Alpha load 2, desc).
    const rows = within(container.querySelector("tbody")!).getAllByRole("row");
    expect(rows[0]).toHaveTextContent("Beta");
    expect(rows[1]).toHaveTextContent("Alpha");
  });

  test("pure local mode performs ops without emitting actions", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<WidgetRenderer widget={makeWidget()} {...handlers({ onAction })} />);

    await user.click(screen.getByRole("button", { name: /sort by name/i }));
    expect(onAction).not.toHaveBeenCalled();
  });

  test("server-controlled sorting alternates directions without emitting an empty sort", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const widget = makeWidget(undefined, {
      data_mode: "server",
      interaction: { mode: "server", action_id: "repos" },
    });
    render(<WidgetRenderer widget={widget} {...handlers({ onAction })} />);

    const header = screen.getByRole("button", { name: /sort by name/i });
    await user.click(header);
    await user.click(header);
    await user.click(header);

    const emitted = onAction.mock.calls.map((call) => call[1] as {
      kind: string;
      state: { sort: { key: string; direction: string }[] };
    });
    expect(emitted.map(({ state }) => state.sort)).toEqual([
      [{ key: "name", direction: "asc" }],
      [{ key: "name", direction: "desc" }],
      [{ key: "name", direction: "asc" }],
    ]);
    expect(header).toHaveTextContent("↑");
  });

  test("client tables keep the three-state cycle in automatic mode", async () => {
    const user = userEvent.setup();
    render(<WidgetRenderer widget={makeWidget()} {...handlers()} />);

    const header = screen.getByRole("button", { name: /sort by name/i });
    await user.click(header);
    await user.click(header);
    await user.click(header);

    expect(header).not.toHaveTextContent(/[↑↓]/);
    expect(header.closest("th")).toHaveAttribute("aria-sort", "none");
  });

  test("an explicit two-state policy also works for client tables", async () => {
    const user = userEvent.setup();
    render(
      <WidgetRenderer
        widget={makeWidget(undefined, { sort_cycle: "two-state" })}
        {...handlers()}
      />,
    );

    const header = screen.getByRole("button", { name: /sort by name/i });
    await user.click(header);
    await user.click(header);
    await user.click(header);

    expect(header).toHaveTextContent("↑");
    expect(header.closest("th")).toHaveAttribute("aria-sort", "ascending");
  });

  test("an explicit cycle overrides the data-mode default", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const widget = makeWidget(undefined, {
      data_mode: "server",
      sort_cycle: "three-state",
    });
    render(<WidgetRenderer widget={widget} {...handlers({ onAction })} />);

    const header = screen.getByRole("button", { name: /sort by name/i });
    await user.click(header);
    await user.click(header);
    await user.click(header);

    const last = onAction.mock.calls.at(-1)?.[1] as { state: { sort: unknown[] } };
    expect(last.state.sort).toEqual([]);
  });
});

describe("EnhancedTable expand control", () => {
  test("exposes an accessible, state-labelled chevron toggle", async () => {
    const user = userEvent.setup();
    const rows: TableRow[] = [
      { id: "beta", cells: ["Beta", 10], children: [{ id: "beta-child", cells: ["Emitter", 4] }] },
    ];
    render(<WidgetRenderer widget={makeWidget(rows)} {...handlers()} />);

    const toggle = screen.getByRole("button", { name: "Expand row beta" });
    expect(toggle).not.toHaveAttribute("data-expanded");
    expect(toggle.querySelector("svg")).toBeInTheDocument();

    await user.click(toggle);
    const collapse = screen.getByRole("button", { name: "Collapse row beta" });
    expect(collapse).toHaveAttribute("data-expanded");
  });
});

describe("EnhancedTable copyable cells", () => {
  test("copies the raw value and coexists with a link", async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    const cell: TableCell = {
      value: "acme/widget",
      display: "widget",
      link: { href: "https://example.com/acme/widget", target: "_blank" },
      copyable: true,
      copy_value: "acme/widget",
    };
    const rows: TableRow[] = [{ id: "r1", cells: [cell, 1] }];
    render(<WidgetRenderer widget={makeWidget(rows)} {...handlers()} />);

    // Link and copy button coexist.
    expect(screen.getByRole("link", { name: "widget" })).toHaveAttribute(
      "href",
      "https://example.com/acme/widget",
    );
    const copy = screen.getByRole("button", { name: "Copy acme/widget" });
    await user.click(copy);
    expect(writeText).toHaveBeenCalledWith("acme/widget");
    // Success feedback + aria-live announcement.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied acme/widget" })).toBeInTheDocument(),
    );
  });

  test("copy_on_click turns the cell body into a copy target", async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    const cell: TableCell = { value: "path/to/file", copy_on_click: true };
    render(<WidgetRenderer widget={makeWidget([{ id: "r1", cells: [cell, 1] }])} {...handlers()} />);

    await user.click(screen.getByRole("button", { name: "Copy path/to/file" }));
    expect(writeText).toHaveBeenCalledWith("path/to/file");
  });
});

describe("EnhancedTable row-click selection", () => {
  test("toggles on row click but ignores clicks on interactive descendants", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const cell: TableCell = { value: "Beta", link: { href: "https://example.com" } };
    const widget = makeWidget([{ id: "beta", cells: [cell, 10] }], {
      selection: { mode: "single", selected_ids: [] },
      row_click_select: true,
      emit_state_changes: true,
    });
    render(<WidgetRenderer widget={widget} {...handlers({ onAction })} />);

    // Clicking the link does not select.
    await user.click(screen.getByRole("link"));
    expect(onAction).not.toHaveBeenCalledWith(
      "results",
      expect.objectContaining({ kind: "selection" }),
      "results",
    );

    // Clicking the row body selects.
    await user.click(screen.getByText("10"));
    expect(onAction).toHaveBeenCalledWith(
      "results",
      expect.objectContaining({ kind: "selection", state: expect.objectContaining({ selected_ids: ["beta"] }) }),
      "results",
    );
  });
});

describe("EnhancedTable lazy expansion", () => {
  test("emits on expand and renders loading, error and retry", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const base = makeWidget([{ id: "beta", cells: ["Beta", 10] }], {
      emit_state_changes: true,
      interaction: { mode: "local", action_id: "repos" },
    });
    const { rerender } = render(<WidgetRenderer widget={base} {...handlers({ onAction })} />);

    await user.click(screen.getByRole("button", { name: "Expand row beta" }));
    expect(onAction).toHaveBeenCalledWith(
      "repos",
      expect.objectContaining({ kind: "expansion", state: expect.objectContaining({ expanded_ids: ["beta"] }) }),
      "results",
    );

    // App responds with a loading row, then an error.
    rerender(
      <WidgetRenderer
        widget={makeWidget([{ id: "beta", cells: ["Beta", 10], loading: true }], {
          emit_state_changes: true,
          interaction: { mode: "local", action_id: "repos" },
        })}
        {...handlers({ onAction })}
      />,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/loading/i);

    rerender(
      <WidgetRenderer
        widget={makeWidget([{ id: "beta", cells: ["Beta", 10], error: "Fetch failed" }], {
          emit_state_changes: true,
          interaction: { mode: "local", action_id: "repos" },
        })}
        {...handlers({ onAction })}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Fetch failed");

    onAction.mockClear();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onAction).toHaveBeenCalledWith(
      "repos",
      expect.objectContaining({ kind: "expansion" }),
      "results",
    );
  });
});

describe("EnhancedTable rich expanded content", () => {
  test("renders the restricted detail union full-width and preserves one table", async () => {
    const user = userEvent.setup();
    const rows: TableRow[] = [
      {
        id: "acme/widget",
        cells: ["widget", 3],
        expanded_content: [
          { kind: "text", text: "Compatible with core v3+" },
          { kind: "status", status: "ok", label: "Signed" },
          { kind: "link", href: "https://example.com/changelog", label: "Changelog" },
          { kind: "action", label: "Rebuild", action_id: "rebuild", value: "acme/widget" },
          { kind: "table", headers: ["File", "Size"], rows: [{ id: "f1", cells: ["main.py", "2kb"] }] },
        ],
      },
    ];
    const onAction = vi.fn();
    const { container } = render(<WidgetRenderer widget={makeWidget(rows)} {...handlers({ onAction })} />);

    await user.click(screen.getByRole("button", { name: "Expand row acme/widget" }));

    const detail = container.querySelector(".lcars-table-detail-row")!;
    expect(detail).toBeInTheDocument();
    expect(within(detail as HTMLElement).getByText("Compatible with core v3+")).toBeInTheDocument();
    expect(within(detail as HTMLElement).getByText("Signed")).toBeInTheDocument();
    expect(within(detail as HTMLElement).getByRole("link", { name: "Changelog" })).toBeInTheDocument();
    expect(within(detail as HTMLElement).getByText("main.py")).toBeInTheDocument();

    await user.click(within(detail as HTMLElement).getByRole("button", { name: "Rebuild" }));
    expect(onAction).toHaveBeenCalledWith("rebuild", "acme/widget");
  });
});

describe("EnhancedTable expansion motion", () => {
  test("enters, lingers while exiting, then unmounts", async () => {
    vi.useFakeTimers();
    try {
      mockReducedMotion(false);
      const rows: TableRow[] = [
        { id: "beta", cells: ["Beta", 10], expanded_content: [{ kind: "text", text: "Detail body" }] },
      ];
      const { container } = render(<WidgetRenderer widget={makeWidget(rows)} {...handlers()} />);

      fireEvent.click(screen.getByRole("button", { name: "Expand row beta" }));
      const motion = container.querySelector(".lcars-table-expand-motion");
      expect(motion).toBeInTheDocument();
      expect(motion).not.toHaveAttribute("data-exiting");

      fireEvent.click(screen.getByRole("button", { name: "Collapse row beta" }));
      // Still mounted, now flagged exiting.
      expect(container.querySelector(".lcars-table-expand-motion")).toHaveAttribute("data-exiting");

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(container.querySelector(".lcars-table-expand-motion")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("honors reduced motion by dropping content immediately on collapse", async () => {
    mockReducedMotion(true);
    const rows: TableRow[] = [
      { id: "beta", cells: ["Beta", 10], expanded_content: [{ kind: "text", text: "Detail body" }] },
    ];
    const { container } = render(<WidgetRenderer widget={makeWidget(rows)} {...handlers()} />);

    fireEvent.click(screen.getByRole("button", { name: "Expand row beta" }));
    expect(container.querySelector(".lcars-table-expand-motion")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse row beta" }));
    // exitMs collapses to 0 under reduced motion, so it drops on the next tick.
    await waitFor(() =>
      expect(container.querySelector(".lcars-table-expand-motion")).not.toBeInTheDocument(),
    );
  });
});

describe("EnhancedTable smart sorting", () => {
  const memoryWidget = (columnOverrides: Record<string, unknown> = {}): TableWidget => ({
    id: "procs",
    type: "table",
    headers: ["Process", "RAM"],
    rows: [
      { id: "a", cells: ["uvicorn", "1.6GB"] },
      { id: "b", cells: ["python3", "735.0MB"] },
      { id: "c", cells: ["node", "12.0GB"] },
      { id: "d", cells: ["cron", "512KB"] },
    ],
    options: {
      columns: [
        {
          key: "process",
          label: "Process",
          value_type: "auto" as const,
          sortable: true,
          first_sort_direction: "asc" as const,
          filter: "none" as const,
          align: "start" as const,
        },
        {
          key: "ram",
          label: "RAM",
          value_type: "auto" as const,
          sortable: true,
          first_sort_direction: "asc" as const,
          filter: "none" as const,
          align: "end" as const,
          ...columnOverrides,
        },
      ],
      sort: [],
      filters: [],
      selection: { mode: "none", selected_ids: [] },
      expanded_ids: [],
      expandable: false,
      sticky_header: false,
      density: "normal",
    },
  });

  const ramOrder = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("tbody tr")).map(
      (row) => row.querySelectorAll("td")[1]?.textContent?.trim(),
    );

  test("sorts a mixed-unit size column by magnitude, not alphabetically", async () => {
    const user = userEvent.setup();
    const { container } = render(<WidgetRenderer widget={memoryWidget()} {...handlers()} />);

    await user.click(screen.getByRole("button", { name: /sort by ram/i }));
    expect(ramOrder(container)).toEqual(["512KB", "735.0MB", "1.6GB", "12.0GB"]);

    await user.click(screen.getByRole("button", { name: /sort by ram/i }));
    expect(ramOrder(container)).toEqual(["12.0GB", "1.6GB", "735.0MB", "512KB"]);
  });

  test("an explicit sort_as overrides the sniffed kind", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <WidgetRenderer widget={memoryWidget({ sort_as: "text" })} {...handlers()} />,
    );

    await user.click(screen.getByRole("button", { name: /sort by ram/i }));
    expect(ramOrder(container)).toEqual(["1.6GB", "12.0GB", "512KB", "735.0MB"]);
  });

  test("empty cells stay last in both directions", async () => {
    const user = userEvent.setup();
    const widget = memoryWidget();
    widget.rows = [...widget.rows, { id: "e", cells: ["idle", ""] }];
    const { container } = render(<WidgetRenderer widget={widget} {...handlers()} />);

    await user.click(screen.getByRole("button", { name: /sort by ram/i }));
    expect(ramOrder(container).at(-1)).toBe("");

    await user.click(screen.getByRole("button", { name: /sort by ram/i }));
    expect(ramOrder(container).at(-1)).toBe("");
  });
});

describe("EnhancedTable combined operations", () => {
  test("sort, select and expand cooperate without breaking table semantics", async () => {
    const user = userEvent.setup();
    const rows: TableRow[] = [
      { id: "beta", cells: ["Beta", 10], children: [{ id: "beta-child", cells: ["Emitter", 4] }] },
      { id: "alpha", cells: ["Alpha", 2] },
    ];
    const { container } = render(<WidgetRenderer widget={makeWidget(rows, { density: "compact" })} {...handlers()} />);
    expect(container.querySelector(".lcars-table-wrap")).toHaveAttribute("data-density", "compact");

    await user.click(screen.getByRole("button", { name: /sort by name/i }));
    await user.click(screen.getByRole("checkbox", { name: "Select row beta" }));
    await user.click(screen.getByRole("button", { name: "Expand row beta" }));

    expect(screen.getByText("Emitter")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select row beta" })).toBeChecked();
    // Still exactly one semantic table (no nested table in these rows).
    expect(container.querySelectorAll("table")).toHaveLength(1);
  });
});
