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
  if (candidate.version !== 1) {
    return { ok: false, error: `Unsupported graph version ${String(candidate.version)}.` };
  }
  for (const key of ["templates", "nodes", "edges"] as const) {
    if (!Array.isArray(candidate[key])) return { ok: false, error: `Missing '${key}' list.` };
  }

  const document: GraphDocument = {
    ...emptyDocument(),
    ...candidate,
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
  ] as const) {
    const error = duplicate(kind, ids);
    if (error) return { ok: false, error };
  }

  const templates = new Map(document.templates.map((item) => [item.id, item]));
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
    const error = connectionError(accumulated, edge);
    if (error) return { ok: false, error: `Edge "${edge.id}": ${error}` };
    accumulated = { ...accumulated, edges: [...accumulated.edges, edge] };
  }

  return { ok: true, document };
};
