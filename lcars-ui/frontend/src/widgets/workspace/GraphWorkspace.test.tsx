import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { GraphWorkspaceDocument } from "../../types/workspace";
import { GraphWorkspace } from "./GraphWorkspace";
import type { GraphWorkspaceWidget } from "./types";

vi.mock("../nodecanvas/NodeCanvas", () => ({
  default: ({ widget }: { widget: { id: string; options: { editable: boolean } } }) => (
    <div data-editable={String(widget.options.editable)} data-testid={widget.id} />
  ),
}));

const document = (interactionCount = 7): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace",
  version: 1,
  workspace_id: "workspace-1",
  canonical: {
    graph: { graph_id: "graph", revision: "r4" },
    projection: { document: { format: "lcars-node-graph", version: 2 } },
  },
  proposal: {
    proposal_id: "proposal-1",
    title: "Draft workspace",
    base: { graph_id: "graph", revision: "r4" },
    interaction_count: interactionCount,
    changes: [
      { id: "change-1", operation: "addition", record_id: "draft-1", record: { id: "draft-1", kind: "generic" } },
    ],
    projection: { document: { format: "lcars-node-graph", version: 2 } },
  },
});

const widget = (): GraphWorkspaceWidget => ({
  id: "workspace-widget",
  type: "graph_workspace",
  label: "Authoring workspace",
  workspace: document(),
});

test("renders canonical and proposal planes simultaneously with non-colour distinction", () => {
  const { container } = render(
    <GraphWorkspace handlers={{ onAction: vi.fn() }} label="Authoring workspace" widget={widget()} />,
  );

  expect(screen.getByRole("region", { name: "Canonical plane" })).toHaveAttribute(
    "data-plane",
    "canonical",
  );
  expect(screen.getByRole("region", { name: "Proposal plane" })).toHaveAttribute(
    "data-plane",
    "proposal",
  );
  expect(container.querySelector('[data-plane="proposal"]')).toHaveClass("lcars-workspace-plane");
  expect(screen.getByText("LOCKED")).toBeInTheDocument();
  expect(screen.getByText("DRAFT")).toBeInTheDocument();
});

test("canonical canvas is structurally read-only while proposal canvas is editable", () => {
  render(
    <GraphWorkspace handlers={{ onAction: vi.fn() }} label="Authoring workspace" widget={widget()} />,
  );

  expect(screen.getByTestId("workspace-widget-canonical")).toHaveAttribute("data-editable", "false");
  expect(screen.getByTestId("workspace-widget-proposal")).toHaveAttribute("data-editable", "true");
});

test("shows the contract-owned interaction and proposal counts", () => {
  render(
    <GraphWorkspace handlers={{ onAction: vi.fn() }} label="Authoring workspace" widget={widget()} />,
  );

  expect(screen.getByText("7 INTERACTIONS")).toBeInTheDocument();
  expect(screen.getByText("1 PROPOSED RECORDS")).toBeInTheDocument();
});
