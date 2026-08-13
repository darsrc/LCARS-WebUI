import type {
  GraphWorkspaceDocument,
  ProposalChange,
  WorkspaceRecord,
} from "../../types/workspace";
import { canonical } from "../nodecanvas/graph";
import { validateTreeShape } from "./tree";

export type StructuralFieldDiff = {
  path: string;
  before: unknown;
  after: unknown;
};

export type StructuralDiffEntry = {
  change_id: string;
  operation: ProposalChange["operation"];
  record_id: string;
  base_record_id?: string | null;
  kind: string;
  group: string;
  dependencies: string[];
  fields: StructuralFieldDiff[];
};

export type StructuralProposalDiff = {
  format: "lcars-structural-proposal-diff";
  version: 1;
  workspace_id: string;
  proposal_id: string;
  base: { graph_id: string; revision: string };
  entries: StructuralDiffEntry[];
  groups: Array<{ id: string; label: string; entry_ids: string[] }>;
};

const recordShape = (record: WorkspaceRecord | null | undefined): unknown =>
  record ? { kind: record.kind, label: record.label, fields: record.fields ?? {}, trees: record.trees ?? {}, structural_key: record.structural_key } : undefined;

const compare = (before: unknown, after: unknown, path = "record"): StructuralFieldDiff[] => {
  if (canonical(before) === canonical(after)) return [];
  if (
    before !== null && after !== null &&
    typeof before === "object" && typeof after === "object" &&
    !Array.isArray(before) && !Array.isArray(after)
  ) {
    const left = before as Record<string, unknown>;
    const right = after as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    return keys.flatMap((key) => compare(left[key], right[key], `${path}.${key}`));
  }
  return [{ path, before, after }];
};

const groupForRecord = (workspace: GraphWorkspaceDocument, recordId: string): string => {
  for (const projection of [workspace.proposal?.projection, workspace.canonical.projection]) {
    const binding = (projection?.bindings ?? []).find(
      (candidate) => candidate.element_kind === "node" && candidate.record_id === recordId,
    );
    const node = projection?.document?.nodes?.find((candidate) => candidate.id === binding?.element_id);
    if (node?.group) return node.group;
  }
  return "ungrouped";
};

const dependencyOrder = (changes: ProposalChange[]): ProposalChange[] => {
  const byRecord = new Map(changes.map((change) => [change.record_id, change]));
  const result: ProposalChange[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (change: ProposalChange) => {
    if (visited.has(change.id)) return;
    if (visiting.has(change.id)) return;
    visiting.add(change.id);
    for (const dependency of change.dependencies ?? []) {
      const linked = byRecord.get(dependency);
      if (linked) visit(linked);
    }
    visiting.delete(change.id);
    visited.add(change.id);
    result.push(change);
  };
  changes.forEach(visit);
  return result;
};

export const structuralProposalDiff = (workspace: GraphWorkspaceDocument): StructuralProposalDiff => {
  const proposal = workspace.proposal;
  if (!proposal) throw new Error("Structural diff requires a proposal.");
  const canonicalRecords = new Map((workspace.canonical.records ?? []).map((record) => [record.id, record]));
  const entries = dependencyOrder(proposal.changes ?? []).map((change): StructuralDiffEntry => {
    const before = change.base_record_id ? canonicalRecords.get(change.base_record_id) : undefined;
    const fields = change.operation === "reference"
      ? []
      : compare(recordShape(before), recordShape(change.record));
    return {
      change_id: change.id,
      operation: change.operation,
      record_id: change.record_id,
      base_record_id: change.base_record_id,
      kind: change.record?.kind ?? before?.kind ?? "unknown",
      group: groupForRecord(workspace, change.record_id),
      dependencies: [...(change.dependencies ?? [])],
      fields,
    };
  });
  const grouped = new Map<string, StructuralDiffEntry[]>();
  for (const entry of entries) {
    const id = `${entry.group}:${entry.kind}`;
    grouped.set(id, [...(grouped.get(id) ?? []), entry]);
  }
  return {
    format: "lcars-structural-proposal-diff",
    version: 1,
    workspace_id: workspace.workspace_id,
    proposal_id: proposal.proposal_id,
    base: structuredClone(proposal.base),
    entries,
    groups: [...grouped].map(([id, values]) => ({
      id,
      label: `${values[0].group} · ${values[0].kind}`,
      entry_ids: values.map((entry) => entry.change_id),
    })),
  };
};

export type PreflightFinding = { id: string; message: string; path?: string; blocking: boolean };
export type ProposalPreflight = {
  ready: boolean;
  findings: PreflightFinding[];
  counts: Record<string, number>;
};

export const proposalPreflight = (workspace: GraphWorkspaceDocument): ProposalPreflight => {
  const findings: PreflightFinding[] = [];
  const proposal = workspace.proposal;
  if (!proposal) return { ready: false, findings: [{ id: "proposal", message: "Proposal is missing", blocking: true }], counts: {} };
  if (workspace.canonical.completeness?.state !== "complete") {
    findings.push({ id: "closure", message: "Complete canonical dependency closure is not loaded", blocking: true });
  }
  findings.push(...(proposal.findings ?? []).map((finding) => ({
    id: finding.id, message: finding.message, path: finding.target.path ?? undefined, blocking: finding.blocking ?? false,
  })));
  const schemas = new Map((workspace.record_schemas ?? []).map((schema) => [schema.kind, schema]));
  const treeSchemas = new Map((workspace.tree_schemas ?? []).map((schema) => [schema.id, schema]));
  const known = new Set([
    ...(workspace.canonical.records ?? []).map((record) => record.id),
    ...(proposal.changes ?? []).map((change) => change.record_id),
  ]);
  const counts: Record<string, number> = {};
  for (const change of proposal.changes ?? []) {
    const record = change.record;
    const kind = record?.kind ?? "reference";
    counts[kind] = (counts[kind] ?? 0) + 1;
    for (const dependency of change.dependencies ?? []) {
      if (!known.has(dependency)) findings.push({
        id: `dependency:${change.id}:${dependency}`,
        message: `Dependency ${dependency} is unavailable`,
        path: `changes.${change.id}.dependencies`,
        blocking: true,
      });
    }
    if (!record) continue;
    const schema = schemas.get(record.kind);
    for (const field of schema?.fields ?? []) {
      if (!field.required) continue;
      if (field.value_kind === "tree") {
        if (!record.trees?.[field.id]) findings.push({ id: `required:${record.id}:${field.id}`, message: `${field.label} is required`, path: `${record.id}.trees.${field.id}`, blocking: true });
      } else if (record.fields?.[field.id] == null || record.fields?.[field.id] === "") {
        findings.push({ id: `required:${record.id}:${field.id}`, message: `${field.label} is required`, path: `${record.id}.fields.${field.id}`, blocking: true });
      }
    }
    for (const [fieldId, tree] of Object.entries(record.trees ?? {})) {
      const schema = treeSchemas.get(tree.schema);
      if (!schema) {
        findings.push({ id: `tree-schema:${record.id}:${fieldId}`, message: `Tree schema ${tree.schema} is unavailable`, blocking: true });
      } else {
        findings.push(...validateTreeShape(tree, schema).map((finding) => ({
          id: `tree:${record.id}:${fieldId}:${finding.path}`,
          message: finding.message,
          path: `${record.id}.trees.${fieldId}.${finding.path}`,
          blocking: true,
        })));
      }
    }
  }
  return { ready: findings.every((finding) => !finding.blocking), findings, counts };
};

export const exportStructuralDiff = (diff: StructuralProposalDiff): string =>
  `${JSON.stringify(diff, null, 2)}\n`;
