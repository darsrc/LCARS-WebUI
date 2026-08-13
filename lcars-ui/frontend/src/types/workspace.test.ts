import type { GraphWorkspaceDocument, WorkspaceResponse } from "./workspace";
import {
  applyWorkspaceResponse,
  createWorkspaceCommand,
  isWorkspaceCommand,
  isWorkspaceDocument,
  isWorkspaceResponse,
} from "./workspace";

const workspace = (): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace",
  version: 1,
  workspace_id: "workspace-1",
  canonical: {
    graph: { graph_id: "graph", revision: "r1" },
    completeness: { state: "complete", loaded_records: 0, known_records: 0 },
  },
  proposal: {
    proposal_id: "proposal-1",
    title: "Draft",
    base: { graph_id: "graph", revision: "r1" },
    status: "draft",
    revision: 2,
    interaction_count: 4,
  },
  reader: { revision: 3 },
  actions: [
    {
      id: "navigate",
      label: "Navigate",
      scope: "reader",
      transport: "server",
      command: "caller.navigate",
    },
    {
      id: "validate",
      label: "Validate proposal",
      scope: "proposal",
      transport: "server",
      command: "caller.validate",
    },
  ],
});

test("runtime validation discriminates every versioned workspace wire message", () => {
  const document = workspace();
  const command = createWorkspaceCommand(document, "validate", "command-1");
  const response: WorkspaceResponse = {
    format: "lcars-graph-workspace-response",
    version: 1,
    command_id: "command-1",
    workspace_id: "workspace-1",
    status: "ok",
    workspace: document,
  };

  expect(isWorkspaceDocument(document)).toBe(true);
  expect(isWorkspaceCommand(command)).toBe(true);
  expect(isWorkspaceResponse(response)).toBe(true);
  expect(isWorkspaceDocument({ ...document, version: 2 })).toBe(false);
});

test("runtime validation rejects crossed plane bindings and a stale proposal base", () => {
  const crossed = workspace();
  crossed.canonical.projection = {
    document: {
      templates: [{ id: "record" }],
      nodes: [{ id: "node-1", template: "record", label: "Record" }],
    },
    bindings: [
      { element_kind: "node", element_id: "node-1", record_id: "record-1", plane: "proposal" },
    ],
  };
  expect(isWorkspaceDocument(crossed)).toBe(false);

  const stale = workspace();
  stale.proposal!.base.revision = "r0";
  expect(isWorkspaceDocument(stale)).toBe(false);
});

test("reader commands carry reader revision without leaking proposal identity", () => {
  const command = createWorkspaceCommand(workspace(), "navigate", "command-reader", {
    selection: "record-2",
  });

  expect(command.scope).toBe("reader");
  expect(command.reader_revision).toBe(3);
  expect(command.proposal_id).toBeUndefined();
  expect(command.proposal_revision).toBeUndefined();
});

test("proposal commands carry canonical base and proposal revision", () => {
  const command = createWorkspaceCommand(workspace(), "validate", "command-proposal");

  expect(command.base).toEqual({ graph_id: "graph", revision: "r1" });
  expect(command.proposal_id).toBe("proposal-1");
  expect(command.proposal_revision).toBe(2);
});

test("a mocked server response replaces workspace state only after correlation", () => {
  const current = workspace();
  const command = createWorkspaceCommand(current, "validate", "command-1");
  const updated = workspace();
  updated.proposal!.revision = 3;
  updated.proposal!.interaction_count = 5;
  const response: WorkspaceResponse = {
    format: "lcars-graph-workspace-response",
    version: 1,
    command_id: "command-1",
    workspace_id: "workspace-1",
    status: "ok",
    workspace: updated,
  };

  const result = applyWorkspaceResponse(current, command, response);

  expect(result.applied).toBe(true);
  expect(result.workspace.proposal?.revision).toBe(3);
  expect(result.workspace.proposal?.interaction_count).toBe(5);
});

test("rejected and stale mocked responses preserve the current workspace", () => {
  const current = workspace();
  const command = createWorkspaceCommand(current, "validate", "command-1");
  const rejected: WorkspaceResponse = {
    format: "lcars-graph-workspace-response",
    version: 1,
    command_id: "command-1",
    workspace_id: "workspace-1",
    status: "rejected",
    message: "Caller validation rejected the command.",
  };

  expect(applyWorkspaceResponse(current, command, rejected)).toMatchObject({
    applied: false,
    workspace: current,
    reason: "Caller validation rejected the command.",
  });

  expect(
    applyWorkspaceResponse(current, command, {
      ...rejected,
      command_id: "another-command",
    }),
  ).toMatchObject({ applied: false, workspace: current, reason: "Response command mismatch." });
});

test("a local caller action cannot accidentally enter the server protocol", () => {
  const document = workspace();
  document.actions!.push({
    id: "local",
    label: "Local operation",
    scope: "reader",
    transport: "local",
    command: "caller.local",
  });

  expect(() => createWorkspaceCommand(document, "local", "command-local")).toThrow(
    "is local and cannot be sent",
  );
});
