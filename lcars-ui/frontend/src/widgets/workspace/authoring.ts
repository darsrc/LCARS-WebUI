import type {
  GraphWorkspaceDocument,
  ProposalChange,
  WorkspaceRecord,
  WorkspaceRecordSchema,
} from "../../types/workspace";
import { recordProposalInteraction } from "../../types/workspaceHarness";

const requireProposal = (workspace: GraphWorkspaceDocument) => {
  if (!workspace.proposal) throw new Error("Authoring requires a proposal plane.");
  return workspace.proposal;
};

const schemaFor = (workspace: GraphWorkspaceDocument, kind: string): WorkspaceRecordSchema => {
  const schema = (workspace.record_schemas ?? []).find((candidate) => candidate.kind === kind);
  if (!schema) throw new Error(`Unknown caller record kind "${kind}".`);
  return schema;
};

const defaultFieldValue = (valueKind: string): unknown => {
  if (valueKind === "boolean") return false;
  if (valueKind === "list" || valueKind === "reference_list") return [];
  if (valueKind === "object") return {};
  return null;
};

export const proposalRecords = (workspace: GraphWorkspaceDocument): WorkspaceRecord[] =>
  (workspace.proposal?.changes ?? []).flatMap((change) => (change.record ? [change.record] : []));

export const proposalRecordCounts = (workspace: GraphWorkspaceDocument): Record<string, number> =>
  proposalRecords(workspace).reduce<Record<string, number>>((counts, record) => {
    counts[record.kind] = (counts[record.kind] ?? 0) + 1;
    return counts;
  }, {});

export const commitProposal = (
  workspace: GraphWorkspaceDocument,
  mutate: (changes: ProposalChange[]) => ProposalChange[],
): GraphWorkspaceDocument => commitProposalBoundary(workspace, mutate, "command");

const commitProposalBoundary = (
  workspace: GraphWorkspaceDocument,
  mutate: (changes: ProposalChange[]) => ProposalChange[],
  kind: "command" | "group_edit",
): GraphWorkspaceDocument => {
  const proposal = requireProposal(workspace);
  const changed: GraphWorkspaceDocument = {
    ...workspace,
    proposal: {
      ...proposal,
      revision: (proposal.revision ?? 0) + 1,
      changes: mutate(proposal.changes ?? []),
    },
  };
  return recordProposalInteraction(changed, {
    kind,
    scope: "proposal",
    committed: true,
  });
};

/** Commit several locally composed field changes as one proposal group edit. */
export const commitProposalGroupEdit = (
  workspace: GraphWorkspaceDocument,
  mutate: (changes: ProposalChange[]) => ProposalChange[],
): GraphWorkspaceDocument => commitProposalBoundary(workspace, mutate, "group_edit");

export const createDraftRecord = (
  workspace: GraphWorkspaceDocument,
  kind: string,
  id: string,
): GraphWorkspaceDocument => {
  const proposal = requireProposal(workspace);
  const schema = schemaFor(workspace, kind);
  if (!id.trim()) throw new Error("Draft record id is required.");
  const used = new Set([
    ...(workspace.canonical.records ?? []).map((record) => record.id),
    ...(proposal.changes ?? []).map((change) => change.record_id),
  ]);
  if (used.has(id)) throw new Error(`Record id "${id}" already exists.`);
  const record: WorkspaceRecord = {
    id,
    kind,
    label: schema.label,
    fields: Object.fromEntries(
      (schema.fields ?? [])
        .filter((field) => field.value_kind !== "tree")
        .map((field) => [field.id, defaultFieldValue(field.value_kind)]),
    ),
    trees: {},
  };
  return commitProposal(workspace, (changes) => [
    ...changes,
    { id: `change:${id}`, operation: "addition", record_id: id, record },
  ]);
};

export const updateDraftField = (
  workspace: GraphWorkspaceDocument,
  recordId: string,
  fieldId: string,
  value: unknown,
): GraphWorkspaceDocument => {
  const proposal = requireProposal(workspace);
  const change = (proposal.changes ?? []).find((candidate) => candidate.record_id === recordId);
  if (!change?.record) throw new Error(`Unknown proposal record "${recordId}".`);
  const schema = schemaFor(workspace, change.record.kind);
  const field = (schema.fields ?? []).find((candidate) => candidate.id === fieldId);
  if (!field) throw new Error(`Unknown field "${fieldId}" for kind "${schema.kind}".`);
  if (field.value_kind === "tree") throw new Error("Tree fields require the structured value editor.");
  return commitProposal(workspace, (changes) =>
    changes.map((candidate) =>
      candidate.record_id === recordId && candidate.record
        ? {
            ...candidate,
            record: {
              ...candidate.record,
              fields: { ...(candidate.record.fields ?? {}), [fieldId]: value as never },
            },
          }
        : candidate,
    ),
  );
};

export const deleteDraftRecord = (
  workspace: GraphWorkspaceDocument,
  recordId: string,
): GraphWorkspaceDocument => {
  const proposal = requireProposal(workspace);
  if (!(proposal.changes ?? []).some((change) => change.record_id === recordId)) {
    throw new Error(`Unknown proposal record "${recordId}".`);
  }
  return commitProposal(workspace, (changes) =>
    changes.filter((change) => change.record_id !== recordId),
  );
};

export const commitProposalProjection = (
  workspace: GraphWorkspaceDocument,
  document: NonNullable<NonNullable<GraphWorkspaceDocument["proposal"]>["projection"]>["document"],
  event: string,
): GraphWorkspaceDocument => {
  const proposal = requireProposal(workspace);
  const next: GraphWorkspaceDocument = {
    ...workspace,
    proposal: {
      ...proposal,
      revision: (proposal.revision ?? 0) + 1,
      projection: { ...proposal.projection, document },
    },
  };
  return isProposalAuthoringEvent(event)
    ? recordProposalInteraction(next, { kind: "command", scope: "proposal", committed: true })
    : { ...next, proposal: { ...next.proposal!, revision: proposal.revision ?? 0 } };
};

const PROPOSAL_AUTHORING_EVENTS = new Set([
    "add",
    "connect",
    "disconnect",
    "delete",
    "field",
    "move",
    "paste",
    "duplicate",
    "group",
    "align",
    "distribute",
    "reroute",
    "comment",
    "import",
]);

export const isProposalAuthoringEvent = (event: string): boolean =>
  PROPOSAL_AUTHORING_EVENTS.has(event);
