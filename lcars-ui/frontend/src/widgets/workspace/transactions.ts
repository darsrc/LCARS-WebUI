import type { GraphWorkspaceDocument } from "../../types/workspace";
import { recordProposalInteraction } from "../../types/workspaceHarness";

type Proposal = NonNullable<GraphWorkspaceDocument["proposal"]>;
type ProposalContent = Omit<Proposal, "revision" | "interaction_count">;

const content = (proposal: Proposal): ProposalContent => {
  const { revision: _revision, interaction_count: _count, ...rest } = proposal;
  return structuredClone(rest);
};

const applyContent = (
  workspace: GraphWorkspaceDocument,
  proposalContent: ProposalContent,
): GraphWorkspaceDocument => {
  if (!workspace.proposal) throw new Error("Proposal history requires a proposal.");
  const next: GraphWorkspaceDocument = {
    ...workspace,
    proposal: {
      ...structuredClone(proposalContent),
      revision: (workspace.proposal.revision ?? 0) + 1,
      interaction_count: workspace.proposal.interaction_count ?? 0,
    },
  };
  return recordProposalInteraction(next, { kind: "command", scope: "proposal", committed: true });
};

export class WorkspaceProposalHistory {
  readonly #limit: number;
  #past: ProposalContent[] = [];
  #future: ProposalContent[] = [];

  constructor(limit = 50) {
    if (!Number.isSafeInteger(limit) || limit < 0) throw new Error("History limit must be non-negative.");
    this.#limit = limit;
  }

  record(before: GraphWorkspaceDocument): void {
    if (!before.proposal || this.#limit === 0) return;
    this.#past = [...this.#past, content(before.proposal)].slice(-this.#limit);
    this.#future = [];
  }

  undo(current: GraphWorkspaceDocument): GraphWorkspaceDocument | null {
    if (!current.proposal) return null;
    const previous = this.#past[this.#past.length - 1];
    if (!previous) return null;
    this.#past = this.#past.slice(0, -1);
    this.#future = [...this.#future, content(current.proposal)].slice(-this.#limit);
    return applyContent(current, previous);
  }

  redo(current: GraphWorkspaceDocument): GraphWorkspaceDocument | null {
    if (!current.proposal) return null;
    const next = this.#future[this.#future.length - 1];
    if (!next) return null;
    this.#future = this.#future.slice(0, -1);
    this.#past = [...this.#past, content(current.proposal)].slice(-this.#limit);
    return applyContent(current, next);
  }

  get canUndo(): boolean { return this.#past.length > 0; }
  get canRedo(): boolean { return this.#future.length > 0; }
  clear(): void { this.#past = []; this.#future = []; }
}

export type WorkspaceAutosaveEnvelope = {
  format: "lcars-workspace-autosave";
  version: 1;
  workspace_id: string;
  base: { graph_id: string; revision: string };
  proposal: Proposal;
};

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const saveProposalCheckpoint = (
  storage: KeyValueStorage,
  key: string,
  workspace: GraphWorkspaceDocument,
): WorkspaceAutosaveEnvelope => {
  if (!workspace.proposal) throw new Error("Autosave requires a proposal.");
  const envelope: WorkspaceAutosaveEnvelope = {
    format: "lcars-workspace-autosave",
    version: 1,
    workspace_id: workspace.workspace_id,
    base: structuredClone(workspace.proposal.base),
    proposal: structuredClone(workspace.proposal),
  };
  storage.setItem(key, JSON.stringify(envelope));
  return envelope;
};

export const restoreProposalCheckpoint = (
  storage: KeyValueStorage,
  key: string,
  workspace: GraphWorkspaceDocument,
): GraphWorkspaceDocument | null => {
  const raw = storage.getItem(key);
  if (!raw) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  const envelope = parsed as Partial<WorkspaceAutosaveEnvelope>;
  if (
    envelope.format !== "lcars-workspace-autosave" ||
    envelope.version !== 1 ||
    envelope.workspace_id !== workspace.workspace_id ||
    !envelope.proposal ||
    envelope.base?.graph_id !== workspace.canonical.graph.graph_id ||
    envelope.base?.revision !== workspace.canonical.graph.revision ||
    envelope.proposal.base.graph_id !== workspace.canonical.graph.graph_id ||
    envelope.proposal.base.revision !== workspace.canonical.graph.revision
  ) return null;
  return { ...workspace, proposal: structuredClone(envelope.proposal) };
};

export const clearProposalCheckpoint = (storage: KeyValueStorage, key: string): void =>
  storage.removeItem(key);
