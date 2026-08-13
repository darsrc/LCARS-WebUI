import type {
  GeneratedWorkspaceWireMessage,
  GraphWorkspaceDocument,
  WorkspaceAction,
  WorkspaceCommand,
  WorkspaceResponse,
} from "./workspace.generated";
import validateWorkspaceWire from "./workspaceValidator.generated";

export type {
  GeneratedWorkspaceWireMessage,
  GraphWorkspaceDocument,
  WorkspaceAction,
  WorkspaceCommand,
  ProposalChange,
  WorkspaceRecord,
  WorkspaceRecordSchema,
  WorkspaceSelection,
  WorkspaceTreeNode,
  WorkspaceTreeSchema,
  WorkspaceTreeValue,
  WorkspaceResponse,
} from "./workspace.generated";

const hasFormat = <T extends string>(value: unknown, format: T): value is { format: T } =>
  typeof value === "object" && value !== null && (value as { format?: unknown }).format === format;

export const isWorkspaceWireMessage = (value: unknown): value is GeneratedWorkspaceWireMessage =>
  Boolean(validateWorkspaceWire(value));

export const isWorkspaceDocument = (value: unknown): value is GraphWorkspaceDocument => {
  if (!hasFormat(value, "lcars-graph-workspace") || !isWorkspaceWireMessage(value)) return false;
  const workspace = value as GraphWorkspaceDocument;
  const canonicalBindings = workspace.canonical.projection?.bindings ?? [];
  const proposalBindings = workspace.proposal?.projection?.bindings ?? [];
  if (canonicalBindings.some((binding) => binding.plane !== "canonical")) return false;
  if (proposalBindings.some((binding) => binding.plane !== "proposal")) return false;
  if (
    workspace.proposal &&
    (workspace.proposal.base.graph_id !== workspace.canonical.graph.graph_id ||
      workspace.proposal.base.revision !== workspace.canonical.graph.revision)
  ) {
    return false;
  }
  return true;
};

export const isWorkspaceCommand = (value: unknown): value is WorkspaceCommand => {
  if (!hasFormat(value, "lcars-graph-workspace-command") || !isWorkspaceWireMessage(value)) {
    return false;
  }
  const command = value as WorkspaceCommand;
  if (command.scope === "reader") {
    return command.proposal_id == null && command.proposal_revision == null;
  }
  return command.proposal_id != null && command.proposal_revision != null;
};

export const isWorkspaceResponse = (value: unknown): value is WorkspaceResponse => {
  if (!hasFormat(value, "lcars-graph-workspace-response") || !isWorkspaceWireMessage(value)) {
    return false;
  }
  const response = value as WorkspaceResponse;
  if (response.status === "ok") {
    return response.workspace != null && response.workspace.workspace_id === response.workspace_id;
  }
  return Boolean(response.message);
};

export const workspaceAction = (
  workspace: GraphWorkspaceDocument,
  actionId: string,
): WorkspaceAction => {
  const action = (workspace.actions ?? []).find((candidate) => candidate.id === actionId);
  if (!action) throw new Error(`Unknown workspace action "${actionId}".`);
  return action;
};

export const createWorkspaceCommand = (
  workspace: GraphWorkspaceDocument,
  actionId: string,
  commandId: string,
  payload: Record<string, unknown> = {},
): WorkspaceCommand => {
  const action = workspaceAction(workspace, actionId);
  if ((action.transport ?? "server") !== "server") {
    throw new Error(`Workspace action "${actionId}" is local and cannot be sent.`);
  }
  const command: WorkspaceCommand = {
    format: "lcars-graph-workspace-command",
    version: 1,
    command_id: commandId,
    workspace_id: workspace.workspace_id,
    action_id: action.id,
    scope: action.scope,
    base: workspace.canonical.graph,
    reader_revision: workspace.reader?.revision ?? 0,
    payload,
  };
  if (action.scope !== "reader") {
    if (!workspace.proposal) {
      throw new Error(`Workspace action "${actionId}" requires a proposal.`);
    }
    command.proposal_id = workspace.proposal.proposal_id;
    command.proposal_revision = workspace.proposal.revision ?? 0;
  }
  return command;
};

export type AppliedWorkspaceResponse =
  | { applied: true; workspace: GraphWorkspaceDocument; findings: WorkspaceResponse["findings"] }
  | {
      applied: false;
      workspace: GraphWorkspaceDocument;
      findings: WorkspaceResponse["findings"];
      reason: string;
    };

export const applyWorkspaceResponse = (
  current: GraphWorkspaceDocument,
  command: WorkspaceCommand,
  response: WorkspaceResponse,
): AppliedWorkspaceResponse => {
  const findings = response.findings ?? [];
  if (response.command_id !== command.command_id) {
    return { applied: false, workspace: current, findings, reason: "Response command mismatch." };
  }
  if (response.workspace_id !== current.workspace_id || response.workspace_id !== command.workspace_id) {
    return { applied: false, workspace: current, findings, reason: "Response workspace mismatch." };
  }
  if (response.status !== "ok" || !response.workspace) {
    return {
      applied: false,
      workspace: current,
      findings,
      reason: response.message ?? `Workspace command ${response.status}.`,
    };
  }
  if (!isWorkspaceDocument(response.workspace)) {
    return {
      applied: false,
      workspace: current,
      findings,
      reason: "Response contained an invalid workspace document.",
    };
  }
  return { applied: true, workspace: response.workspace, findings };
};
