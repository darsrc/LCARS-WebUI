import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { GraphWorkspaceDocument, WorkspaceCommand } from "../../types/workspace";
import { GraphWorkspace } from "./GraphWorkspace";

vi.mock("../nodecanvas/NodeCanvas", () => ({ default: () => <div /> }));

const workspace = (): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace", version: 1, workspace_id: "workspace",
  record_schemas: [{
    kind: "generic", label: "Generic", appearance: { shape: "card", token: "REC" },
    fields: [{ id: "name", label: "Name", value_kind: "text", required: true }],
  }],
  actions: [{
    id: "handoff", label: "Submit proposed package", scope: "submission", transport: "server", command: "caller.submit",
  }],
  canonical: {
    graph: { graph_id: "graph", revision: "r1" },
    completeness: { state: "complete", loaded_records: 1, known_records: 1 },
  },
  proposal: {
    proposal_id: "proposal", title: "Draft", base: { graph_id: "graph", revision: "r1" }, revision: 2, interaction_count: 6,
    changes: [{ id: "addition", operation: "addition", record_id: "draft", record: { id: "draft", kind: "generic", fields: { name: "Ready" } } }],
  },
  receipt: {
    receipt_id: "receipt", proposal_id: "proposal", outcome: "partial", fresh_canonical_read_required: true,
    objects: [
      { proposal_record_id: "draft", outcome: "accepted", canonical_id: "canonical-returned" },
      { proposal_record_id: "dependent", outcome: "rejected", reason: "Dependency failed", dependencies: ["draft"] },
    ],
  },
});

test("hands off a correlated versioned submission command and counts one committed action", () => {
  const onAction = vi.fn();
  const onUiStateChange = vi.fn();
  render(
    <GraphWorkspace
      handlers={{ onAction, onUiStateChange }}
      label="Submission"
      widget={{ id: "workspace-widget", type: "graph_workspace", workspace: workspace() }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Submit proposed package" }));
  const command = onAction.mock.calls[0][1] as WorkspaceCommand;

  expect(command).toMatchObject({
    format: "lcars-graph-workspace-command",
    version: 1,
    workspace_id: "workspace",
    proposal_id: "proposal",
    proposal_revision: 3,
    scope: "submission",
  });
  expect((command.payload as { diff: { entries: unknown[] } }).diff.entries).toHaveLength(1);
  const emitted = onUiStateChange.mock.calls[0][1] as { workspace: GraphWorkspaceDocument };
  expect(emitted.workspace.proposal?.interaction_count).toBe(7);
});

test("renders partial receipt dependencies without canonical restyling", () => {
  render(
    <GraphWorkspace
      handlers={{ onAction: vi.fn() }}
      label="Submission"
      widget={{ id: "workspace-widget", type: "graph_workspace", workspace: workspace() }}
    />,
  );

  expect(screen.getByRole("region", { name: "Ingestion receipt" })).toHaveTextContent(
    "AWAITING FRESH CANONICAL READ",
  );
  expect(screen.getByRole("region", { name: "Ingestion receipt" })).toHaveTextContent("Dependency failed");
  expect(screen.getByRole("region", { name: "Proposal plane" })).toBeInTheDocument();
});
