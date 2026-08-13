import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { GraphWorkspaceDocument } from "../../types/workspace";
import { GraphWorkspace } from "./GraphWorkspace";
import type { GraphWorkspaceWidget } from "./types";

vi.mock("../nodecanvas/NodeCanvas", () => ({
  default: ({ widget }: { widget: { id: string; options: { editable: boolean }; document: { nodes?: unknown[] } } }) => (
    <div data-editable={String(widget.options.editable)} data-node-count={widget.document.nodes?.length ?? 0} data-testid={widget.id} />
  ),
}));

const document = (interactionCount = 7): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace",
  version: 1,
  workspace_id: "workspace-1",
  record_schemas: [
    {
      kind: "generic",
      label: "Generic record",
      appearance: { shape: "card", token: "REC" },
      fields: [{ id: "name", label: "Name", value_kind: "text" }],
      search_fields: [{ id: "name-search", label: "Caller name", path: "fields.name", match: "text" }],
    },
  ],
  canonical: {
    graph: { graph_id: "graph", revision: "r4" },
    records: [{ id: "canonical-1", kind: "generic", fields: { name: "Alpha" } }],
    projection: {
      document: {
        format: "lcars-node-graph", version: 2,
        templates: [{ id: "generic" }],
        nodes: [{ id: "canonical-node", template: "generic", group: "step-one" }],
        groups: [{ id: "step-one", label: "Step one", position: [0, 0], size: [300, 200] }],
      },
      bindings: [{ element_kind: "node", element_id: "canonical-node", record_id: "canonical-1", plane: "canonical" }],
    },
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

test("creates, edits inline, and deletes records only in the proposal", () => {
  const onUiStateChange = vi.fn();
  render(
    <GraphWorkspace
      handlers={{ onAction: vi.fn(), onUiStateChange }}
      label="Authoring workspace"
      widget={widget()}
    />,
  );

  fireEvent.change(screen.getByLabelText("DRAFT ID"), { target: { value: "draft-2" } });
  fireEvent.click(screen.getByRole("button", { name: "CREATE DRAFT" }));
  expect(screen.getByText("draft-2")).toBeInTheDocument();

  fireEvent.change(screen.getAllByLabelText("Name").at(-1)!, { target: { value: "Edited" } });
  fireEvent.blur(screen.getAllByLabelText("Name").at(-1)!);
  const latest = onUiStateChange.mock.calls.at(-1)?.[1] as { workspace: GraphWorkspaceDocument };
  expect(latest.workspace.proposal?.changes?.at(-1)?.record?.fields?.name).toBe("Edited");

  fireEvent.click(screen.getAllByRole("button", { name: "DELETE DRAFT" }).at(-1)!);
  expect(screen.queryByText("draft-2")).not.toBeInTheDocument();
  expect(document().canonical.records?.[0].id).toBe("canonical-1");

  fireEvent.click(screen.getByRole("button", { name: "UNDO PROPOSAL" }));
  expect(screen.getByText("draft-2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "REDO PROPOSAL" }));
  expect(screen.queryByText("draft-2")).not.toBeInTheDocument();
});

test("search reports matched fields and collapse restores projected content as reader state", () => {
  render(<GraphWorkspace handlers={{ onAction: vi.fn() }} label="Authoring workspace" widget={widget()} />);

  fireEvent.change(screen.getByLabelText("SEARCH"), { target: { value: "alpha" } });
  fireEvent.click(screen.getByRole("button", { name: "APPLY SEARCH" }));
  expect(screen.getByRole("list", { name: "Search matches" })).toHaveTextContent("Caller name");
  expect(screen.getByTestId("workspace-widget-canonical")).toHaveAttribute("data-node-count", "1");

  fireEvent.click(screen.getByRole("button", { name: "COLLAPSE Step one" }));
  expect(screen.getByTestId("workspace-widget-canonical")).toHaveAttribute("data-node-count", "0");
  fireEvent.click(screen.getByRole("button", { name: "EXPAND Step one" }));
  expect(screen.getByTestId("workspace-widget-canonical")).toHaveAttribute("data-node-count", "1");
});
