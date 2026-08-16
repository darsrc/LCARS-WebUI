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
      show_atom_legend: true,
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
      show_atom_legend: false,
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
      show_atom_legend: false,
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
          show_atom_legend: false,
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
          show_atom_legend: false,
          children: [],
        }}
        {...baseHandlers()}
      />,
    );
    expect(screen.getByText("Support-independent")).toBeInTheDocument();
  });

  test("filters frontier layers and emits the clicked id", async () => {
    const user = userEvent.setup();
    const handlers = renderWidget({
      id: "frontier-n07",
      type: "frontier",
      data: {
        current: { id: "n07", label: "Na+ conductance" },
        path: [{ id: "n01", label: "action potential" }],
        frontier: [
          { id: "n11", label: "channel open probability", edge: "JUSTIFICATION", kind: "assertion", terminal: false },
          { id: "n19", label: "depolarization", edge: "DOMAIN", kind: "assertion", terminal: false },
        ],
      },
      layer_filter: ["JUSTIFICATION"],
    });

    expect(screen.queryByText("depolarization")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /channel open probability/i }));
    expect(handlers.onAction).toHaveBeenCalledWith("frontier-n07", "n11", "frontier-n07");
  });

  test("renders every context role attached to a qualifier", () => {
    renderWidget({
      id: "n07",
      type: "assertion_card",
      data: {
        id: "n07",
        gloss: "Na+ conductance rises with membrane depolarization",
        canonical: false,
        framework: { id: "hh_kinetics", label: "Hodgkin-Huxley kinetics" },
        context: [{ qualifier: "q0433", label: "classical regime", roles: ["SEMANTIC_FRAMEWORK", "APPLICABILITY_DOMAIN"] }],
        status: ["established"],
      },
      show_context: true,
      children: [],
    });

    expect(screen.getByText("SEMANTIC FRAMEWORK")).toBeInTheDocument();
    expect(screen.getByText("APPLICABILITY DOMAIN")).toBeInTheDocument();
  });

  test("renders an evidence anchor and neutral UNKNOWN tri-state", () => {
    const { rerender } = render(
      <WidgetRenderer
        widget={{
          id: "e01",
          type: "anchor_card",
          data: {
            id: "e01",
            type: "empirical",
            label: "Voltage-clamp recordings, squid giant axon",
            polarity: "SUPPORTS",
            source: { id: "s09", citation: "Hodgkin & Huxley, J. Physiol., 1952" },
            sibling_anchors: ["e02", "f07"],
            inspectable: "published measurements",
            status: [],
          },
        }}
        {...baseHandlers()}
      />,
    );
    expect(screen.getByText("SUPPORTS")).toBeInTheDocument();

    rerender(
      <WidgetRenderer
        widget={{
          id: "tri",
          type: "tri_state",
          data: { query: "supported_under", subject: "n07", commitment: "c02", result: "UNKNOWN", mode: "FAST", reason: "label_truncated" },
          on_escalate: "EXACT",
        }}
        {...baseHandlers()}
      />,
    );
    expect(screen.getByLabelText("Result UNKNOWN")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("renders interval constraints and preserves null-position claims", () => {
    renderWidget({
      id: "constraint",
      type: "constraint_band",
      data: {
        quantity: { id: "q_coupling", label: "new force coupling", unit: "1" },
        representation: "INTERVAL",
        excluded: { min: 1e-5, max: null },
        confidence: "95% CL",
        conditions: [{ quantity: "q_range", min: 0.01, max: 1, unit: "m" }],
        source: { id: "s41", citation: "torsion-balance null result" },
        claims: [
          { id: "t03", label: "fifth force (ghost)", position: null },
          { id: "t08", label: "light scalar", position: 3e-6 },
        ],
      },
    });

    expect(screen.getByRole("img", { name: /Excluded interval/ })).toBeInTheDocument();
    expect(screen.getByText(/t03 fifth force/)).toBeInTheDocument();
    expect(screen.getByText("light scalar")).toBeInTheDocument();
  });

  test("renders a complete gap with no contenders", () => {
    renderWidget({
      id: "g01",
      type: "gap_panel",
      data: {
        id: "g01",
        type: "REDUCTION",
        endpoints: [{ id: "n21", label: "HH gating variables" }, { id: "n22", label: "channel conformational states" }],
        known_dependency: "m³h reproduces macroscopic kinetics",
        missing: "one-to-one mapping",
        contenders: [],
        constraints: ["c07"],
      },
      show_contenders: true,
      children: [],
    });
    expect(screen.getByText("No contenders")).toBeInTheDocument();
  });

  test("keeps commitment consequence sets separate and emits selection", async () => {
    const user = userEvent.setup();
    const handlers = renderWidget({
      id: "commitment-selector",
      type: "commitment_selector",
      data: {
        available: [
          { id: "c00", label: "none", assumptions: [] },
          { id: "c02", label: "HH formalism", assumptions: ["a04"] },
        ],
        active: "c02",
        supported_under: ["n07", "n09"],
        empirically_grounded: ["n07"],
        conflict_set: ["n33"],
      },
    });

    expect(screen.getByRole("heading", { name: /Supported under/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Empirically grounded/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Suspend/ })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /c00 none/i }));
    expect(handlers.onAction).toHaveBeenCalledWith("commitment-selector", "c00", "commitment-selector");
  });
});
