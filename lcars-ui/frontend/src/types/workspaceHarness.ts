import type { GraphWorkspaceDocument } from "./workspace";

export type WorkspaceInteractionObservation = {
  kind:
    | "command"
    | "field_edit"
    | "group_edit"
    | "keystroke"
    | "pointer_move"
    | "implementation_event"
    | "passive_preview";
  scope: "proposal" | "reader";
  committed: boolean;
  /** Informational: suggested semantic choices still count when committed. */
  semantic_decision?: boolean;
  /** Informational: a batch or compound command still contributes one unit. */
  affected_records?: number;
};

/** Apply the workspace contract's fixed B1-style counting convention. */
export const interactionUnits = (observation: WorkspaceInteractionObservation): 0 | 1 => {
  if (observation.scope !== "proposal" || !observation.committed) return 0;
  return observation.kind === "command" ||
    observation.kind === "field_edit" ||
    observation.kind === "group_edit"
    ? 1
    : 0;
};

/** Increment a proposal's counter at one measured interaction boundary. */
export const recordProposalInteraction = (
  workspace: GraphWorkspaceDocument,
  observation: WorkspaceInteractionObservation,
): GraphWorkspaceDocument => {
  const units = interactionUnits(observation);
  if (units === 0) return workspace;
  if (!workspace.proposal) throw new Error("Proposal interactions require a proposal.");
  return {
    ...workspace,
    proposal: {
      ...workspace.proposal,
      interaction_count: (workspace.proposal.interaction_count ?? 0) + units,
    },
  };
};

export type WorkspaceInteractionCheckpoint = {
  label: string;
  total: number;
  committed: number;
};

export type WorkspaceInteractionReport = {
  workspace_id: string;
  proposal_id: string;
  starting_total: number;
  ending_total: number;
  committed_interactions: number;
  maximum_interactions: number;
  within_budget: boolean;
  checkpoints: WorkspaceInteractionCheckpoint[];
};

const proposalIdentity = (workspace: GraphWorkspaceDocument) => {
  if (!workspace.proposal) throw new Error("Interaction measurement requires a proposal.");
  return {
    workspaceId: workspace.workspace_id,
    proposalId: workspace.proposal.proposal_id,
    total: workspace.proposal.interaction_count ?? 0,
  };
};

/** Read the server-owned count of committed proposal interactions. */
export const proposalInteractionCount = (workspace: GraphWorkspaceDocument): number =>
  proposalIdentity(workspace).total;

/**
 * Generic acceptance harness for a caller-defined authoring walkthrough.
 *
 * Reader-only operations leave the proposal counter unchanged. Transactional
 * authoring code increments it, and this harness measures the resulting delta
 * without knowing anything about caller record kinds or validation semantics.
 */
export class WorkspaceInteractionHarness {
  readonly #workspaceId: string;
  readonly #proposalId: string;
  readonly #startingTotal: number;
  readonly #checkpoints: WorkspaceInteractionCheckpoint[];
  #endingTotal: number;

  constructor(initial: GraphWorkspaceDocument, label = "start") {
    const identity = proposalIdentity(initial);
    this.#workspaceId = identity.workspaceId;
    this.#proposalId = identity.proposalId;
    this.#startingTotal = identity.total;
    this.#endingTotal = identity.total;
    this.#checkpoints = [{ label, total: identity.total, committed: 0 }];
  }

  checkpoint(label: string, workspace: GraphWorkspaceDocument): this {
    const identity = proposalIdentity(workspace);
    if (identity.workspaceId !== this.#workspaceId || identity.proposalId !== this.#proposalId) {
      throw new Error("Interaction checkpoints must belong to the measured workspace proposal.");
    }
    if (identity.total < this.#endingTotal) {
      throw new Error("Proposal interaction_count cannot decrease during a measurement.");
    }
    this.#endingTotal = identity.total;
    this.#checkpoints.push({
      label,
      total: identity.total,
      committed: identity.total - this.#startingTotal,
    });
    return this;
  }

  report(maximumInteractions: number): WorkspaceInteractionReport {
    if (!Number.isSafeInteger(maximumInteractions) || maximumInteractions < 0) {
      throw new Error("maximumInteractions must be a non-negative safe integer.");
    }
    const committed = this.#endingTotal - this.#startingTotal;
    return {
      workspace_id: this.#workspaceId,
      proposal_id: this.#proposalId,
      starting_total: this.#startingTotal,
      ending_total: this.#endingTotal,
      committed_interactions: committed,
      maximum_interactions: maximumInteractions,
      within_budget: committed <= maximumInteractions,
      checkpoints: this.#checkpoints.map((checkpoint) => ({ ...checkpoint })),
    };
  }

  assertWithin(maximumInteractions: number): WorkspaceInteractionReport {
    const report = this.report(maximumInteractions);
    if (!report.within_budget) {
      throw new Error(
        `Proposal committed ${report.committed_interactions} interactions; budget is ${maximumInteractions}.`,
      );
    }
    return report;
  }
}
