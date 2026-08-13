import type { GraphDocument, GraphEdge } from "../../types/contract";

export type FanDirection = "incoming" | "outgoing" | "self";
export type FanGroup = {
  id: string;
  hub: string;
  direction: FanDirection;
  layer: string;
  relation: string;
  edges: GraphEdge[];
};

export const groupEdgeFans = (document: GraphDocument): FanGroup[] => {
  const degree = new Map<string, number>();
  for (const edge of document.edges ?? []) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  const groups = new Map<string, FanGroup>();
  for (const edge of document.edges ?? []) {
    const self = edge.source === edge.target;
    const sourceDegree = degree.get(edge.source) ?? 0;
    const targetDegree = degree.get(edge.target) ?? 0;
    const hub = self || sourceDegree > targetDegree ? edge.source : edge.target;
    const direction: FanDirection = self ? "self" : hub === edge.target ? "incoming" : "outgoing";
    const layer = edge.layer ?? "unlayered";
    const relation = edge.relation ?? "unrelated";
    const id = JSON.stringify([hub, direction, layer, relation]);
    const group = groups.get(id) ?? { id, hub, direction, layer, relation, edges: [] };
    group.edges.push(edge);
    groups.set(id, group);
  }
  return [...groups.values()].filter((group) => group.edges.length > 1);
};

export type FanWindow = {
  visible_edge_ids: string[];
  groups: FanGroup[];
  pages: Record<string, number>;
};

export const windowEdgeFans = (
  document: GraphDocument,
  pageSize = 20,
  requestedPages: Record<string, number> = {},
): FanWindow => {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error("Fan page size must be positive.");
  const groups = groupEdgeFans(document);
  const highFans = groups.filter((group) => group.edges.length > pageSize);
  const hidden = new Set<string>();
  const pages: Record<string, number> = {};
  for (const group of highFans) {
    const pageCount = Math.ceil(group.edges.length / pageSize);
    const page = Math.max(0, Math.min(pageCount - 1, requestedPages[group.id] ?? 0));
    pages[group.id] = page;
    group.edges.forEach((edge, index) => {
      if (index < page * pageSize || index >= (page + 1) * pageSize) hidden.add(edge.id);
    });
  }
  return {
    visible_edge_ids: (document.edges ?? []).filter((edge) => !hidden.has(edge.id)).map((edge) => edge.id),
    groups,
    pages,
  };
};
