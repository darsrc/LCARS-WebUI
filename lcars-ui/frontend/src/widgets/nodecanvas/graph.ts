/*
 * The node canvas's domain logic, kept clear of React so it can be reasoned
 * about and tested on its own.
 *
 * The hard problem here is ownership. Every other widget in the console
 * reconciles a scalar: Python sends a number, the renderer shows it. This one
 * holds a document that *both* sides edit — Python may rebuild the graph on any
 * rerender, and the user is dragging nodes around in the meantime. Blindly
 * taking the incoming document discards the user's work on every unrelated
 * update; blindly keeping the local one means Python can never change the graph
 * again.
 *
 * The way out is to compare each incoming document against the last incoming
 * one rather than against local state. If Python is sending what it sent
 * before, the rerender carries no intent and local edits stand. If it is
 * sending something different, that is a deliberate change and it wins. Local
 * state is never part of that comparison, so a user edit can never be mistaken
 * for a Python one.
 */
import type {
  GraphDocument,
  GraphEdge,
  GraphNode,
  GraphPort,
  NodeTemplate,
} from "../../types/contract";

/** A port type that connects to anything. */
export const ANY_PORT_TYPE = "any";

export const emptyDocument = (): GraphDocument => ({
  format: "lcars-node-graph",
  version: 1,
  layers: [],
  templates: [],
  nodes: [],
  edges: [],
  reroutes: [],
  groups: [],
  comments: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

/* ------------------------------------------------------------------ *
 * Signatures and reconciliation
 * ------------------------------------------------------------------ */

/**
 * Stable JSON, with object keys sorted at every depth.
 *
 * `JSON.stringify` preserves insertion order, which is not guaranteed to match
 * between two documents that are semantically identical — so comparing raw
 * stringify output would report a change where there is none, and throw away
 * the user's edits for it.
 */
export const canonical = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
};

/** Identity of a document as Python sent it. */
export const documentSignature = (document: GraphDocument): string => canonical(document);

export type Reconciliation = {
  /** The document the editor should now show. */
  document: GraphDocument;
  /** Signature to remember as the last thing Python said. */
  signature: string;
  /** True when local edits (and history) were discarded by an intentional change. */
  replacedLocal: boolean;
};

/**
 * Decide whether an incoming document supersedes the working copy.
 *
 * `lastSignature` is the signature of the previous *incoming* document, not of
 * the local one — see the note at the top of this file.
 */
export const reconcile = (
  incoming: GraphDocument,
  local: GraphDocument | null,
  lastSignature: string | null,
): Reconciliation => {
  const signature = documentSignature(incoming);
  if (local === null || lastSignature === null) {
    return { document: incoming, signature, replacedLocal: true };
  }
  if (signature === lastSignature) {
    // Python is repeating itself: a rerender, or an execution-status update
    // that left the document alone. The user's edits are the newer truth.
    return { document: local, signature, replacedLocal: false };
  }
  return { document: incoming, signature, replacedLocal: true };
};

/* ------------------------------------------------------------------ *
 * Connection rules
 * ------------------------------------------------------------------ */

export const portsCompatible = (source: GraphPort, target: GraphPort): boolean =>
  source.type === target.type ||
  source.type === ANY_PORT_TYPE ||
  target.type === ANY_PORT_TYPE;

const templateOf = (document: GraphDocument, node: GraphNode | undefined) =>
  node ? document.templates.find((item) => item.id === node.template) : undefined;

export type Connection = {
  source: string;
  source_port: string;
  target: string;
  target_port: string;
};

/**
 * Why a connection is not allowed, or null when it is.
 *
 * Returning the reason rather than a boolean lets the editor say what went
 * wrong in the panel instead of silently refusing the drag.
 */
export const connectionError = (document: GraphDocument, connection: Connection): string | null => {
  if (connection.source === connection.target) return "A node cannot connect to itself.";

  const sourceNode = document.nodes.find((node) => node.id === connection.source);
  const targetNode = document.nodes.find((node) => node.id === connection.target);
  if (!sourceNode || !targetNode) return "Connection references a node that no longer exists.";

  const sourcePort = templateOf(document, sourceNode)?.outputs.find(
    (port) => port.id === connection.source_port,
  );
  const targetPort = templateOf(document, targetNode)?.inputs.find(
    (port) => port.id === connection.target_port,
  );
  if (!sourcePort) return `Unknown output port "${connection.source_port}".`;
  if (!targetPort) return `Unknown input port "${connection.target_port}".`;

  if (!portsCompatible(sourcePort, targetPort)) {
    return `Cannot connect ${sourcePort.type} to ${targetPort.type}.`;
  }

  const duplicate = document.edges.some(
    (edge) =>
      edge.source === connection.source &&
      edge.source_port === connection.source_port &&
      edge.target === connection.target &&
      edge.target_port === connection.target_port,
  );
  if (duplicate) return "Those ports are already connected.";

  // An unset input capacity means one; an unset output capacity means unlimited.
  const inputLimit = targetPort.capacity ?? 1;
  const inputCount = document.edges.filter(
    (edge) => edge.target === connection.target && edge.target_port === connection.target_port,
  ).length;
  if (inputCount >= inputLimit) {
    return inputLimit === 1
      ? `Input "${targetPort.label ?? targetPort.id}" already has a connection.`
      : `Input "${targetPort.label ?? targetPort.id}" accepts ${inputLimit} connections.`;
  }

  if (sourcePort.capacity != null) {
    const outputCount = document.edges.filter(
      (edge) => edge.source === connection.source && edge.source_port === connection.source_port,
    ).length;
    if (outputCount >= sourcePort.capacity) {
      return `Output "${sourcePort.label ?? sourcePort.id}" accepts ${sourcePort.capacity} connections.`;
    }
  }
  return null;
};

export const canConnect = (document: GraphDocument, connection: Connection): boolean =>
  connectionError(document, connection) === null;

/* ------------------------------------------------------------------ *
 * Editing commands
 *
 * Each returns a new document; none mutate. That is what makes undo a matter
 * of keeping previous references rather than of computing inverses.
 * ------------------------------------------------------------------ */

const uniqueId = (prefix: string, taken: Set<string>): string => {
  let index = 1;
  let candidate = `${prefix}_${index}`;
  while (taken.has(candidate)) {
    index += 1;
    candidate = `${prefix}_${index}`;
  }
  return candidate;
};

/** Default values for a template's fields, so a new node is never half-built. */
export const defaultValues = (template: NodeTemplate): GraphNode["values"] =>
  Object.fromEntries(template.fields.map((field) => [field.id, field.default ?? null]));

export const addNode = (
  document: GraphDocument,
  templateId: string,
  position: [number, number],
): GraphDocument => {
  const template = document.templates.find((item) => item.id === templateId);
  if (!template) return document;
  const taken = new Set(document.nodes.map((node) => node.id));
  return {
    ...document,
    nodes: [
      ...document.nodes,
      {
        id: uniqueId(templateId, taken),
        template: templateId,
        position,
        values: defaultValues(template),
        label: null,
        group: null,
      },
    ],
  };
};

/** Remove nodes and every edge that touched them, so no edge is left dangling. */
export const removeNodes = (document: GraphDocument, nodeIds: string[]): GraphDocument => {
  const removing = new Set(nodeIds);
  if (removing.size === 0) return document;
  const edges = document.edges.filter(
    (edge) => !removing.has(edge.source) && !removing.has(edge.target),
  );
  const survivingEdges = new Set(edges.map((edge) => edge.id));
  return {
    ...document,
    nodes: document.nodes.filter((node) => !removing.has(node.id)),
    edges,
    reroutes: document.reroutes.filter((reroute) => survivingEdges.has(reroute.edge)),
  };
};

export const moveNodes = (
  document: GraphDocument,
  positions: Record<string, [number, number]>,
): GraphDocument => ({
  ...document,
  nodes: document.nodes.map((node) =>
    positions[node.id] ? { ...node, position: positions[node.id] } : node,
  ),
});

export const connect = (document: GraphDocument, connection: Connection): GraphDocument => {
  if (!canConnect(document, connection)) return document;
  const taken = new Set(document.edges.map((edge) => edge.id));
  const edge: GraphEdge = { id: uniqueId("edge", taken), ...connection };
  return { ...document, edges: [...document.edges, edge] };
};

export const disconnect = (document: GraphDocument, edgeIds: string[]): GraphDocument => {
  const removing = new Set(edgeIds);
  if (removing.size === 0) return document;
  return {
    ...document,
    edges: document.edges.filter((edge) => !removing.has(edge.id)),
    reroutes: document.reroutes.filter((reroute) => !removing.has(reroute.edge)),
  };
};

export const setFieldValue = (
  document: GraphDocument,
  nodeId: string,
  fieldId: string,
  value: string | number | boolean | null,
): GraphDocument => ({
  ...document,
  nodes: document.nodes.map((node) =>
    node.id === nodeId ? { ...node, values: { ...node.values, [fieldId]: value } } : node,
  ),
});

export const setViewport = (
  document: GraphDocument,
  viewport: GraphDocument["viewport"],
): GraphDocument => ({ ...document, viewport });

/* ------------------------------------------------------------------ *
 * Copy, paste and duplicate
 * ------------------------------------------------------------------ */

export type Subgraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/**
 * Lift a selection out of the document.
 *
 * Only edges with *both* ends inside the selection come along. A half-copied
 * edge would have nothing to attach to when pasted, and dropping it here is
 * simpler than trying to repair it later.
 */
export const extractSubgraph = (document: GraphDocument, nodeIds: string[]): Subgraph => {
  const selected = new Set(nodeIds);
  return {
    nodes: document.nodes.filter((node) => selected.has(node.id)),
    edges: document.edges.filter(
      (edge) => selected.has(edge.source) && selected.has(edge.target),
    ),
  };
};

/**
 * Paste a fragment, offset, with fresh ids.
 *
 * Ids are remapped rather than reused so a paste can sit alongside its source;
 * the edge list is rewritten through the same map so the copy is wired like the
 * original instead of back into it.
 */
export const insertSubgraph = (
  document: GraphDocument,
  fragment: Subgraph,
  offset: [number, number] = [24, 24],
): { document: GraphDocument; nodeIds: string[] } => {
  if (fragment.nodes.length === 0) return { document, nodeIds: [] };

  const takenNodes = new Set(document.nodes.map((node) => node.id));
  const takenEdges = new Set(document.edges.map((edge) => edge.id));
  const remap = new Map<string, string>();

  const nodes = fragment.nodes.map((node) => {
    const id = uniqueId(node.template, takenNodes);
    takenNodes.add(id);
    remap.set(node.id, id);
    return {
      ...node,
      id,
      // A pasted node keeps its values but loses its group: the group it
      // belonged to was not necessarily part of the copy.
      group: null,
      position: [node.position[0] + offset[0], node.position[1] + offset[1]] as [number, number],
    };
  });

  const edges = fragment.edges.map((edge) => {
    const id = uniqueId("edge", takenEdges);
    takenEdges.add(id);
    return {
      ...edge,
      id,
      source: remap.get(edge.source) ?? edge.source,
      target: remap.get(edge.target) ?? edge.target,
    };
  });

  return {
    document: { ...document, nodes: [...document.nodes, ...nodes], edges: [...document.edges, ...edges] },
    nodeIds: nodes.map((node) => node.id),
  };
};

export const duplicateNodes = (
  document: GraphDocument,
  nodeIds: string[],
): { document: GraphDocument; nodeIds: string[] } =>
  insertSubgraph(document, extractSubgraph(document, nodeIds));

/* ------------------------------------------------------------------ *
 * Align and distribute
 * ------------------------------------------------------------------ */

export type NodeSize = { width: number; height: number };
export type AlignEdge = "left" | "right" | "top" | "bottom" | "center-x" | "center-y";

const sizeOf = (sizes: Record<string, NodeSize>, id: string): NodeSize =>
  sizes[id] ?? { width: 0, height: 0 };

/**
 * Line selected nodes up.
 *
 * Sizes come from the renderer because the document stores only positions —
 * a node's height depends on how many ports and fields its template declares,
 * which is a rendering fact. Without them the size-dependent edges degrade to
 * aligning top-left corners, which is wrong but not broken.
 */
export const alignNodes = (
  document: GraphDocument,
  nodeIds: string[],
  edge: AlignEdge,
  sizes: Record<string, NodeSize> = {},
): GraphDocument => {
  const selected = document.nodes.filter((node) => nodeIds.includes(node.id));
  if (selected.length < 2) return document;

  const lefts = selected.map((node) => node.position[0]);
  const tops = selected.map((node) => node.position[1]);
  const rights = selected.map((node) => node.position[0] + sizeOf(sizes, node.id).width);
  const bottoms = selected.map((node) => node.position[1] + sizeOf(sizes, node.id).height);

  const target = {
    left: Math.min(...lefts),
    right: Math.max(...rights),
    top: Math.min(...tops),
    bottom: Math.max(...bottoms),
    "center-x": (Math.min(...lefts) + Math.max(...rights)) / 2,
    "center-y": (Math.min(...tops) + Math.max(...bottoms)) / 2,
  }[edge];

  const positions: Record<string, [number, number]> = {};
  for (const node of selected) {
    const size = sizeOf(sizes, node.id);
    const [x, y] = node.position;
    switch (edge) {
      case "left":
        positions[node.id] = [target, y];
        break;
      case "right":
        positions[node.id] = [target - size.width, y];
        break;
      case "top":
        positions[node.id] = [x, target];
        break;
      case "bottom":
        positions[node.id] = [x, target - size.height];
        break;
      case "center-x":
        positions[node.id] = [target - size.width / 2, y];
        break;
      case "center-y":
        positions[node.id] = [x, target - size.height / 2];
        break;
    }
  }
  return moveNodes(document, positions);
};

/** Even the gaps between selected nodes along one axis, leaving the ends put. */
export const distributeNodes = (
  document: GraphDocument,
  nodeIds: string[],
  axis: "x" | "y",
): GraphDocument => {
  const index = axis === "x" ? 0 : 1;
  const selected = document.nodes
    .filter((node) => nodeIds.includes(node.id))
    .sort((a, b) => a.position[index] - b.position[index]);
  // Two nodes are already evenly spaced; there is nothing between them to move.
  if (selected.length < 3) return document;

  const first = selected[0].position[index];
  const last = selected[selected.length - 1].position[index];
  const step = (last - first) / (selected.length - 1);

  const positions: Record<string, [number, number]> = {};
  selected.forEach((node, order) => {
    const next: [number, number] = [...node.position] as [number, number];
    next[index] = first + step * order;
    positions[node.id] = next;
  });
  return moveNodes(document, positions);
};

/* ------------------------------------------------------------------ *
 * Groups, comments and reroutes
 * ------------------------------------------------------------------ */

/** Frame a selection, sized to enclose it with a margin. */
export const groupSelection = (
  document: GraphDocument,
  nodeIds: string[],
  sizes: Record<string, NodeSize> = {},
  label = "GROUP",
): GraphDocument => {
  const selected = document.nodes.filter((node) => nodeIds.includes(node.id));
  if (selected.length === 0) return document;

  const margin = 24;
  const headroom = 32; // room for the group's own title band
  const left = Math.min(...selected.map((node) => node.position[0])) - margin;
  const top = Math.min(...selected.map((node) => node.position[1])) - margin - headroom;
  const right = Math.max(
    ...selected.map((node) => node.position[0] + (sizeOf(sizes, node.id).width || 180)),
  );
  const bottom = Math.max(
    ...selected.map((node) => node.position[1] + (sizeOf(sizes, node.id).height || 80)),
  );

  const id = uniqueId("group", new Set(document.groups.map((item) => item.id)));
  const members = new Set(nodeIds);
  return {
    ...document,
    groups: [
      ...document.groups,
      {
        id,
        label,
        position: [left, top],
        size: [right - left + margin, bottom - top + margin],
        color: null,
      },
    ],
    nodes: document.nodes.map((node) => (members.has(node.id) ? { ...node, group: id } : node)),
  };
};

/** Drop the frame, keep the nodes. */
export const ungroup = (document: GraphDocument, groupId: string): GraphDocument => ({
  ...document,
  groups: document.groups.filter((group) => group.id !== groupId),
  nodes: document.nodes.map((node) => (node.group === groupId ? { ...node, group: null } : node)),
});

export const addComment = (
  document: GraphDocument,
  position: [number, number],
  text = "",
): GraphDocument => ({
  ...document,
  comments: [
    ...document.comments,
    {
      id: uniqueId("comment", new Set(document.comments.map((item) => item.id))),
      text,
      position,
      size: [240, 120],
    },
  ],
});

export const setCommentText = (
  document: GraphDocument,
  commentId: string,
  text: string,
): GraphDocument => ({
  ...document,
  comments: document.comments.map((comment) =>
    comment.id === commentId ? { ...comment, text } : comment,
  ),
});

export const removeComments = (document: GraphDocument, ids: string[]): GraphDocument => ({
  ...document,
  comments: document.comments.filter((comment) => !ids.includes(comment.id)),
});

export const moveGroup = (
  document: GraphDocument,
  groupId: string,
  position: [number, number],
): GraphDocument => {
  const group = document.groups.find((item) => item.id === groupId);
  if (!group) return document;

  const delta: [number, number] = [
    position[0] - group.position[0],
    position[1] - group.position[1],
  ];
  if (delta[0] === 0 && delta[1] === 0) return document;

  const memberIds = new Set(
    document.nodes.filter((node) => node.group === groupId).map((node) => node.id),
  );
  // A waypoint belongs to the moving enclosure only when both ends of its edge
  // do. A wire crossing the group boundary stays anchored in world space.
  const internalEdges = new Set(
    document.edges
      .filter((edge) => memberIds.has(edge.source) && memberIds.has(edge.target))
      .map((edge) => edge.id),
  );
  const translate = ([x, y]: [number, number]): [number, number] => [
    x + delta[0],
    y + delta[1],
  ];

  return {
    ...document,
    groups: document.groups.map((item) =>
      item.id === groupId ? { ...item, position } : item,
    ),
    nodes: document.nodes.map((node) =>
      memberIds.has(node.id) ? { ...node, position: translate(node.position) } : node,
    ),
    reroutes: document.reroutes.map((reroute) =>
      internalEdges.has(reroute.edge)
        ? { ...reroute, position: translate(reroute.position) }
        : reroute,
    ),
  };
};

export const moveComment = (
  document: GraphDocument,
  commentId: string,
  position: [number, number],
): GraphDocument => ({
  ...document,
  comments: document.comments.map((comment) =>
    comment.id === commentId ? { ...comment, position } : comment,
  ),
});

/** Put a waypoint on an edge. Ignores an edge that is not there. */
export const addReroute = (
  document: GraphDocument,
  edgeId: string,
  position: [number, number],
): GraphDocument => {
  if (!document.edges.some((edge) => edge.id === edgeId)) return document;
  return {
    ...document,
    reroutes: [
      ...document.reroutes,
      {
        id: uniqueId("reroute", new Set(document.reroutes.map((item) => item.id))),
        edge: edgeId,
        position,
      },
    ],
  };
};

export const removeReroutes = (document: GraphDocument, ids: string[]): GraphDocument => ({
  ...document,
  reroutes: document.reroutes.filter((reroute) => !ids.includes(reroute.id)),
});

/* ------------------------------------------------------------------ *
 * Import validation
 * ------------------------------------------------------------------ */

export type ValidationResult =
  | { ok: true; document: GraphDocument }
  | { ok: false; error: string };

/**
 * Check an untrusted document (a pasted or uploaded file) before it replaces
 * the working graph.
 *
 * Mirrors the server-side rules in widgets/graph.py. A failure must leave the
 * current graph untouched, so this returns a result rather than throwing or
 * partially applying.
 */
export const validateDocument = (raw: unknown): ValidationResult => {
  if (!raw || typeof raw !== "object") return { ok: false, error: "File is not a JSON object." };
  const candidate = raw as Partial<GraphDocument>;

  if (candidate.format !== "lcars-node-graph") {
    return { ok: false, error: "Not an LCARS node graph (wrong 'format')." };
  }
  if (candidate.version !== 1 && candidate.version !== 2) {
    return { ok: false, error: `Unsupported graph version ${String(candidate.version)}.` };
  }
  for (const key of ["templates", "nodes", "edges"] as const) {
    if (!Array.isArray(candidate[key])) return { ok: false, error: `Missing '${key}' list.` };
  }

  const document: GraphDocument = {
    ...emptyDocument(),
    ...candidate,
    layers: candidate.layers ?? [],
    reroutes: candidate.reroutes ?? [],
    groups: candidate.groups ?? [],
    comments: candidate.comments ?? [],
    viewport: candidate.viewport ?? { x: 0, y: 0, zoom: 1 },
  } as GraphDocument;

  const duplicate = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) return `Duplicate ${kind} id "${id}".`;
      seen.add(id);
    }
    return null;
  };

  const templateIds = document.templates.map((item) => item.id);
  const nodeIds = document.nodes.map((item) => item.id);
  for (const [kind, ids] of [
    ["template", templateIds],
    ["node", nodeIds],
    ["edge", document.edges.map((item) => item.id)],
    ["layer", document.layers.map((item) => item.id)],
  ] as const) {
    const error = duplicate(kind, ids);
    if (error) return { ok: false, error };
  }

  const templates = new Map(document.templates.map((item) => [item.id, item]));
  const layerIds = new Set(document.layers.map((item) => item.id));
  for (const node of document.nodes) {
    if (!templates.has(node.template)) {
      return { ok: false, error: `Node "${node.id}" uses unknown template "${node.template}".` };
    }
    if (
      !Array.isArray(node.position) ||
      node.position.length !== 2 ||
      !node.position.every((value) => Number.isFinite(value))
    ) {
      return { ok: false, error: `Node "${node.id}" has an invalid position.` };
    }
  }

  // Edges are checked against a document built up one edge at a time, so
  // capacity and duplicate rules see the edges already accepted.
  let accumulated: GraphDocument = { ...document, edges: [] };
  for (const edge of document.edges) {
    if (edge.layer != null && !layerIds.has(edge.layer)) {
      return { ok: false, error: `Edge "${edge.id}" uses unknown layer "${edge.layer}".` };
    }
    if (document.version === 2 && edge.layer == null) {
      return { ok: false, error: `Version 2 edge "${edge.id}" must declare a layer.` };
    }
    const error = connectionError(accumulated, edge);
    if (error) return { ok: false, error: `Edge "${edge.id}": ${error}` };
    accumulated = { ...accumulated, edges: [...accumulated.edges, edge] };
  }

  return { ok: true, document };
};
