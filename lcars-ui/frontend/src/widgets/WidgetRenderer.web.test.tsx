import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Widget } from "../types/contract";
import { WidgetRenderer } from "./WidgetRenderer";

const baseHandlers = () => ({
  logsByStream: {},
  onAction: vi.fn(),
  onFormSubmit: vi.fn(),
  onInput: vi.fn(),
});

const renderWidget = (widget: Widget) => {
  const handlers = baseHandlers();
  render(<WidgetRenderer widget={widget} {...handlers} />);
  return handlers;
};

describe("knowledge-graph widget family", () => {
  test("keeps alternative support environments separate and renders the atom legend", () => {
    renderWidget({
      id: "support",
      type: "support_panel",
      title: "Support",
      data: {
        node: "n07",
        truncated: false,
        environments: [
          { atoms: [{ id: "e01", type: "empirical", label: "HH 1952 voltage clamp" }] },
          { atoms: [{ id: "f02", type: "formal", label: "GHK derivation" }] },
        ],
      },
      show_environments: true,
      show_legend: true,
      children: [],
    });

    expect(screen.getByText("Alternative 01")).toBeInTheDocument();
    expect(screen.getByText("Alternative 02")).toBeInTheDocument();
    expect(screen.getByLabelText("Support atom legend")).toHaveTextContent("empiricalformalassumption");
  });

  test("renders structured completeness detail instead of a bare truncated flag", () => {
    renderWidget({
      id: "support-partial",
      type: "support_panel",
      title: "Support",
      data: {
        node: "n07",
        truncated: true,
        completeness: { state: "partial", returned: 5, total: 12, reason: "rate_limited" },
        environments: [],
      },
      show_environments: true,
      show_legend: false,
      children: [],
    });

    expect(screen.getByText("Partial · 5/12")).toBeInTheDocument();
  });

  test("falls back to a bare Truncated flag when only the legacy boolean is present", () => {
    renderWidget({
      id: "support-legacy",
      type: "support_panel",
      title: "Support",
      data: { node: "n07", truncated: true, environments: [] },
      show_environments: true,
      show_legend: false,
      children: [],
    });

    expect(screen.getByText("Truncated")).toBeInTheDocument();
  });

  test("distinguishes unsupported from support-independent", () => {
    const { rerender } = render(
      <WidgetRenderer
        widget={{
          id: "unsupported",
          type: "support_panel",
          title: "Support",
          data: { node: "n", truncated: false, environments: [] },
          show_environments: true,
          show_legend: false,
          children: [],
        }}
        {...baseHandlers()}
      />,
    );
    expect(screen.getByText("Unsupported")).toBeInTheDocument();

    rerender(
      <WidgetRenderer
        widget={{
          id: "independent",
          type: "support_panel",
          title: "Support",
          data: { node: "n", truncated: false, environments: [{ atoms: [] }] },
          show_environments: true,
          show_legend: false,
          children: [],
        }}
        {...baseHandlers()}
      />,
    );
    expect(screen.getByText("Support-independent")).toBeInTheDocument();
  });

  test("suppresses the environments block entirely when show_environments is false", () => {
    renderWidget({
      id: "support-hidden",
      type: "support_panel",
      title: "Support",
      data: { node: "n07", truncated: false, environments: [] },
      show_environments: false,
      show_legend: true,
      children: [],
    });

    expect(screen.queryByText("Unsupported")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Support atom legend")).toBeInTheDocument();
  });

  test("renders a neutral UNKNOWN tri-state and offers exact escalation", async () => {
    const user = userEvent.setup();
    const handlers = renderWidget({
      id: "tri",
      type: "tri_state",
      data: { query: "supported_under", target: "n07", scope: "c02", result: "UNKNOWN", mode: "FAST", reason: "label_truncated" },
      on_escalate: "EXACT",
    });

    expect(screen.getByLabelText("Result UNKNOWN")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /evaluate exact/i }));
    expect(handlers.onAction).toHaveBeenCalledWith("tri", "EXACT", "tri");
  });
});
