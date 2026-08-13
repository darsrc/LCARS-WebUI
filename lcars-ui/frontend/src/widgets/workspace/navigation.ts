import type { GraphDocument } from "../../types/contract";
import type {
  GraphWorkspaceDocument,
  WorkspaceRecord,
  WorkspaceSelection,
} from "../../types/workspace";

export type PlaneRecord = { plane: "canonical" | "proposal"; record: WorkspaceRecord };
export type WorkspaceSearchResult = PlaneRecord & { matched_fields: string[] };

export const workspaceRecords = (workspace: GraphWorkspaceDocument): PlaneRecord[] => [
  ...(workspace.canonical.records ?? []).map((record) => ({ plane: "canonical" as const, record })),
  ...(workspace.proposal?.changes ?? []).flatMap((change) =>
    change.record ? [{ plane: "proposal" as const, record: change.record }] : [],
  ),
];

const pathValue = (record: WorkspaceRecord, path: string): unknown => {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = record;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const searchableText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

export const searchWorkspace = (
  workspace: GraphWorkspaceDocument,
  query: string,
): WorkspaceSearchResult[] => {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const schemas = new Map((workspace.record_schemas ?? []).map((schema) => [schema.kind, schema]));
  return workspaceRecords(workspace).flatMap((item) => {
    const schema = schemas.get(item.record.kind);
    const fields = [
      { label: "Stable ID", path: "id" },
      { label: "Display label", path: "label" },
      ...(schema?.search_fields ?? []).map((field) => ({ label: field.label, path: field.path })),
    ];
    const matched = fields
      .filter((field) => searchableText(pathValue(item.record, field.path)).toLocaleLowerCase().includes(needle))
      .map((field) => field.label);
    return matched.length > 0 ? [{ ...item, matched_fields: matched }] : [];
  });
};

const projectionPairs = (workspace: GraphWorkspaceDocument) => {
  const planes = [workspace.canonical.projection, workspace.proposal?.projection].filter(Boolean);
  const nodeToRecord = new Map<string, string>();
  const edges: Array<[string, string]> = [];
  for (const projection of planes) {
    for (const binding of projection?.bindings ?? []) {
      if (binding.element_kind === "node") nodeToRecord.set(binding.element_id, binding.record_id);
    }
    for (const edge of projection?.document?.edges ?? []) {
      const source = nodeToRecord.get(edge.source);
      const target = nodeToRecord.get(edge.target);
      if (source && target) edges.push([source, target]);
    }
  }
  return edges;
};

export const focusRecordIds = (
  workspace: GraphWorkspaceDocument,
  recordId: string,
  radius: number,
  direction: "incoming" | "outgoing" | "both" = "both",
): Set<string> => {
  const edges = projectionPairs(workspace);
  const found = new Set([recordId]);
  let frontier = new Set([recordId]);
  for (let hop = 0; hop < radius; hop += 1) {
    const next = new Set<string>();
    for (const [source, target] of edges) {
      if ((direction === "outgoing" || direction === "both") && frontier.has(source)) next.add(target);
      if ((direction === "incoming" || direction === "both") && frontier.has(target)) next.add(source);
    }
    for (const id of next) found.add(id);
    frontier = next;
    if (frontier.size === 0) break;
  }
  return found;
};

export const visibleRecordIds = (workspace: GraphWorkspaceDocument): Set<string> => {
  let visible = new Set(workspaceRecords(workspace).map((item) => item.record.id));
  for (const filter of workspace.reader?.filters ?? []) {
    visible = new Set(workspaceRecords(workspace).filter(({ record }) => {
      const value = filter.facet === "kind" ? record.kind : pathValue(record, filter.facet);
      return (filter.values ?? []).includes(String(value));
    }).map(({ record }) => record.id).filter((id) => visible.has(id)));
  }
  const query = workspace.reader?.search ?? "";
  if (query.trim()) {
    const matches = new Set(searchWorkspace(workspace, query).map((item) => item.record.id));
    visible = new Set([...visible].filter((id) => matches.has(id)));
  }
  if (workspace.reader?.focus) {
    const focus = focusRecordIds(
      workspace,
      workspace.reader.focus.record_id,
      workspace.reader.focus.radius,
      workspace.reader.focus.direction,
    );
    visible = new Set([...visible].filter((id) => focus.has(id)));
  }
  return visible;
};

export const projectVisibleDocument = (
  document: GraphDocument,
  bindings: Array<{ element_kind: string; element_id: string; record_id: string }>,
  visibleRecords: Set<string>,
  collapsedGroups: Set<string>,
): GraphDocument => {
  const nodeRecords = new Map(
    bindings.filter((binding) => binding.element_kind === "node").map((binding) => [binding.element_id, binding.record_id]),
  );
  const nodes = (document.nodes ?? []).filter((node) => {
    if (node.group && collapsedGroups.has(node.group)) return false;
    const record = nodeRecords.get(node.id);
    return record == null || visibleRecords.has(record);
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = (document.edges ?? []).filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  const edgeIds = new Set(edges.map((edge) => edge.id));
  return {
    ...document,
    nodes,
    edges,
    reroutes: (document.reroutes ?? []).filter((reroute) => edgeIds.has(reroute.edge)),
  };
};

export const updateReader = (
  workspace: GraphWorkspaceDocument,
  patch: Partial<NonNullable<GraphWorkspaceDocument["reader"]>>,
  label: string,
): GraphWorkspaceDocument => {
  const reader = workspace.reader ?? { revision: 0 };
  const history = (reader.history ?? []).slice(0, (reader.history_index ?? -1) + 1);
  const entry = { id: `reader-${(reader.revision ?? 0) + 1}`, label, step: patch.current_step ?? reader.current_step };
  return {
    ...workspace,
    reader: {
      ...reader,
      ...patch,
      revision: (reader.revision ?? 0) + 1,
      history: [...history, entry],
      history_index: history.length,
      breadcrumb: [...(reader.breadcrumb ?? []), entry].slice(-8),
    },
  };
};

export const traverseReaderHistory = (
  workspace: GraphWorkspaceDocument,
  delta: -1 | 1,
): GraphWorkspaceDocument => {
  const reader = workspace.reader ?? { revision: 0 };
  const index = Math.max(0, Math.min((reader.history?.length ?? 1) - 1, (reader.history_index ?? -1) + delta));
  const entry = reader.history?.[index];
  if (!entry) return workspace;
  return {
    ...workspace,
    reader: {
      ...reader,
      revision: (reader.revision ?? 0) + 1,
      history_index: index,
      current_step: entry.step ?? reader.current_step,
      selection: entry.selection ? [entry.selection] : reader.selection,
    },
  };
};

export const selectStep = (
  workspace: GraphWorkspaceDocument,
  step: string,
): GraphWorkspaceDocument => {
  const previousStep = workspace.reader?.current_step;
  const previousSelection = workspace.reader?.selection?.[0];
  const stored = { ...(workspace.reader?.step_selections ?? {}) };
  if (previousStep && previousSelection) stored[previousStep] = previousSelection;
  const restored = stored[step];
  return updateReader(
    workspace,
    { current_step: step, step_selections: stored, selection: restored ? [restored] : [] },
    `Step ${step}`,
  );
};

export const collapseGroup = (
  workspace: GraphWorkspaceDocument,
  groupId: string,
  collapsed: boolean,
): GraphWorkspaceDocument => {
  const current = new Set(workspace.reader?.collapsed ?? []);
  if (collapsed) current.add(groupId); else current.delete(groupId);
  return updateReader(workspace, { collapsed: [...current] }, `${collapsed ? "Collapse" : "Expand"} ${groupId}`);
};

export const selectionForRecord = (plane: "canonical" | "proposal", recordId: string): WorkspaceSelection => ({
  plane,
  element_kind: "record",
  element_id: recordId,
});
