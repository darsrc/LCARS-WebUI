/*
 * The node canvas.
 *
 * React Flow supplies the mechanics that are tedious and easy to get wrong —
 * viewport transforms, hit testing, drag, selection, edge routing — and nothing
 * else. Every node, port and edge here is our own DOM, so `styles/lcars.css`
 * reaches all of it and the graph reads as part of the console rather than as
 * a component embedded in one. Only React Flow's `base.css` is imported: the
 * functional positioning rules, none of the default theme.
 *
 * The document is the single source of truth. Pointer-level changes are applied
 * to it immediately as local state, but a *transaction* — a drag ending, a
 * connection completing, a field committing — is what pushes history and emits
 * to Python. That is what keeps one gesture from becoming fifty websocket
 * messages.
 */
import { useCallback, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type Connection as FlowConnection,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";

import type {
  GraphDocument,
  GraphExecutionState,
  GraphField,
  GraphNodeExecution,
  NodeCanvasOptions,
  NodeTemplate,
  Widget,
} from "../../types/contract";
import type { WidgetHandlers } from "../WidgetRenderer";
import {
  addComment,
  addNode,
  addReroute,
  alignNodes,
  connect as connectPorts,
  connectionError,
  disconnect,
  distributeNodes,
  duplicateNodes,
  emptyDocument,
  extractSubgraph,
  groupSelection,
  insertSubgraph,
  moveComment,
  moveGroup,
  moveNodes,
  reconcile,
  removeComments,
  removeNodes,
  removeReroutes,
  setCommentText,
  setFieldValue,
  setViewport,
  ungroup,
  validateDocument,
  type AlignEdge,
  type NodeSize,
  type Subgraph,
} from "./graph";
import { LcarsCommentNode, LcarsEdge, LcarsGroupNode, LcarsRerouteNode, Palette } from "./parts";

type NodeCanvasWidget = Extract<Widget, { type: "node_canvas" }>;

const DEFAULTS = {
  editable: true,
  min_zoom: 0.25,
  max_zoom: 2.5,
  snap_to_grid: false,
  grid_size: 16,
  minimap: true,
  history_limit: 50,
  show_palette: true,
} as const;

/* ------------------------------------------------------------------ *
 * The node body
 * ------------------------------------------------------------------ */

type LcarsNodeData = {
  template: NodeTemplate;
  label: string;
  values: Record<string, string | number | boolean | null>;
  execution: GraphNodeExecution | undefined;
  editable: boolean;
  onValue: (nodeId: string, fieldId: string, value: string | number | boolean | null) => void;
  onCommit: () => void;
};

function NodeField({
  field,
  value,
  editable,
  onChange,
  onCommit,
}: {
  field: GraphField;
  value: string | number | boolean | null;
  editable: boolean;
  onChange: (value: string | number | boolean | null) => void;
  onCommit: () => void;
}) {
  const label = field.label ?? field.id;

  // Boolean and select have no meaningful intermediate state, so a change is
  // already a commit. Text and number commit on blur or Enter, so that typing
  // does not emit a message per keystroke.
  if (field.kind === "boolean") {
    return (
      <label className="lcars-gnode-field nodrag">
        <span>{label}</span>
        <input
          checked={Boolean(value)}
          disabled={!editable}
          onChange={(event) => {
            onChange(event.target.checked);
            onCommit();
          }}
          type="checkbox"
        />
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="lcars-gnode-field nodrag">
        <span>{label}</span>
        <select
          className="lcars-select nodrag"
          disabled={!editable}
          onChange={(event) => {
            onChange(event.target.value);
            onCommit();
          }}
          value={String(value ?? "")}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label ?? option.value}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="lcars-gnode-field nodrag">
      <span>{label}</span>
      <input
        className="lcars-input nodrag"
        disabled={!editable}
        max={field.max ?? undefined}
        min={field.min ?? undefined}
        onBlur={onCommit}
        onChange={(event) =>
          onChange(
            field.kind === "number"
              ? event.target.value === ""
                ? null
                : Number(event.target.value)
              : event.target.value,
          )
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        }}
        placeholder={field.placeholder ?? undefined}
        step={field.step ?? undefined}
        type={field.kind === "number" ? "number" : "text"}
        value={String(value ?? "")}
      />
    </label>
  );
}

function LcarsNode({ id, data, selected }: NodeProps) {
  const { template, label, values, execution, editable, onValue, onCommit } =
    data as unknown as LcarsNodeData;
  const status = execution?.status ?? "idle";

  return (
    <div
      className="lcars-gnode"
      data-selected={selected || undefined}
      data-status={status === "idle" ? undefined : status}
      style={template.color ? ({ ["--accent"]: template.color } as never) : undefined}
    >
      <div className="lcars-gnode-head">
        <span className="lcars-gnode-title">{label}</span>
        {status !== "idle" ? <span className="lcars-gnode-status">{status}</span> : null}
      </div>

      {execution?.progress != null ? (
        <div className="lcars-gnode-progress">
          <span style={{ width: `${Math.round(execution.progress * 100)}%` }} />
        </div>
      ) : null}

      <div className="lcars-gnode-ports">
        <div className="lcars-gnode-col">
          {template.inputs.map((port, index) => (
            <div className="lcars-gnode-port" key={port.id}>
              <Handle
                className="lcars-gport"
                data-type={port.type}
                id={port.id}
                position={Position.Left}
                style={{ top: `${index * 22 + 11}px` }}
                type="target"
              />
              <span>{port.label ?? port.id}</span>
            </div>
          ))}
        </div>
        <div className="lcars-gnode-col lcars-gnode-col--out">
          {template.outputs.map((port, index) => (
            <div className="lcars-gnode-port" key={port.id}>
              <span>{port.label ?? port.id}</span>
              <Handle
                className="lcars-gport"
                data-type={port.type}
                id={port.id}
                position={Position.Right}
                style={{ top: `${index * 22 + 11}px` }}
                type="source"
              />
            </div>
          ))}
        </div>
      </div>

      {template.fields.length > 0 ? (
        <div className="lcars-gnode-fields">
          {template.fields.map((field) => (
            <NodeField
              editable={editable}
              field={field}
              key={field.id}
              onChange={(value) => onValue(id, field.id, value)}
              onCommit={onCommit}
              value={values[field.id] ?? null}
            />
          ))}
        </div>
      ) : null}

      {execution?.message ? (
        <div className="lcars-gnode-message">{execution.message}</div>
      ) : null}
    </div>
  );
}

const nodeTypes = {
  lcars: LcarsNode,
  lcarsGroup: LcarsGroupNode,
  lcarsComment: LcarsCommentNode,
  lcarsReroute: LcarsRerouteNode,
};
const edgeTypes = { lcars: LcarsEdge };

/**
 * Read a picked file as text.
 *
 * `Blob.text()` would be shorter, but FileReader is the one every environment
 * that can render this component actually implements.
 */
const readTextFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File could not be read"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(file);
  });

/* ------------------------------------------------------------------ *
 * The canvas
 * ------------------------------------------------------------------ */

function NodeCanvasInner({
  widget,
  label,
  handlers,
}: {
  widget: NodeCanvasWidget;
  label: string;
  handlers: WidgetHandlers;
}) {
  const options: Partial<NodeCanvasOptions> = widget.options ?? {};
  const editable = options.editable ?? DEFAULTS.editable;
  const historyLimit = options.history_limit ?? DEFAULTS.history_limit;

  const [local, setLocal] = useState<GraphDocument | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const signatureRef = useRef<string | null>(null);
  const history = useRef<GraphDocument[]>([]);
  const future = useRef<GraphDocument[]>([]);
  // Deliberately per-canvas rather than the system clipboard: a graph fragment
  // is not text, and reading the real clipboard needs a permission prompt that
  // has no place mid-edit.
  const clipboard = useRef<Subgraph | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  // Reconcile the incoming document against the working copy. This runs during
  // render rather than in an effect so the very first paint already shows the
  // right graph — an effect would flash the previous one.
  const incoming = widget.document ?? emptyDocument();
  const settled = reconcile(incoming, local, signatureRef.current);
  if (settled.signature !== signatureRef.current) {
    signatureRef.current = settled.signature;
    if (settled.replacedLocal) {
      // Python deliberately changed the graph, so history describing the old
      // one no longer applies to anything the user can see.
      history.current = [];
      future.current = [];
    }
  }
  const document = settled.document;

  const emit = useCallback(
    (kind: string, next: GraphDocument, nextSelection: string[] = selection) => {
      const state = { document: next, selection: nextSelection, last_event: kind };
      handlers.onUiStateChange?.(widget.id, state);
      if (options.interaction?.mode === "server") {
        handlers.onAction(options.interaction.action_id ?? widget.id, { kind, state }, widget.id);
      }
    },
    [handlers, options.interaction, selection, widget.id],
  );

  // The ref tracks the working document synchronously. A field that has no
  // intermediate state — a checkbox, a select — writes its value and commits in
  // the same handler, and React has not re-rendered in between, so a commit
  // reading `document` from the closure would send the value from *before* the
  // change. Writing the ref as the change is applied is what makes that commit
  // see it.
  const documentRef = useRef(document);
  documentRef.current = document;

  /** Apply a change without treating it as a transaction: no history, no emit. */
  const apply = useCallback((next: GraphDocument) => {
    documentRef.current = next;
    setLocal(next);
  }, []);

  /** Apply a change as a transaction: push history and tell Python. */
  const commit = useCallback(
    (kind: string, next: GraphDocument, nextSelection?: string[]) => {
      if (historyLimit > 0) {
        history.current = [...history.current, documentRef.current].slice(-historyLimit);
        future.current = [];
      }
      documentRef.current = next;
      setLocal(next);
      emit(kind, next, nextSelection);
    },
    [emit, historyLimit],
  );

  // `commit` is rebuilt every render; the ref lets a node's callback reach the
  // current one without re-rendering every node whenever anything changes.
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const execution: GraphExecutionState | null = widget.execution ?? null;

  const flowNodes = useMemo<Node[]>(() => {
    const templates = new Map(document.templates.map((item) => [item.id, item]));
    return document.nodes.flatMap((node) => {
      const template = templates.get(node.template);
      if (!template) return [];
      const data: LcarsNodeData = {
        template,
        label: node.label ?? template.label ?? template.id,
        values: node.values,
        execution: execution?.nodes?.[node.id],
        editable,
        onValue: (nodeId, fieldId, value) =>
          apply(setFieldValue(documentRef.current, nodeId, fieldId, value)),
        // Reads the document through a ref rather than closing over it: by the
        // time a field blurs, the value it just wrote has already replaced the
        // document this callback was built with.
        onCommit: () => commitRef.current("field", documentRef.current),
      };
      return [
        {
          id: node.id,
          type: "lcars",
          position: { x: node.position[0], y: node.position[1] },
          data: data as unknown as Record<string, unknown>,
          selected: selection.includes(node.id),
          draggable: editable,
          zIndex: 2,
        },
      ];
    });
  }, [apply, document, editable, execution, selection]);

  // Frames and notes are React Flow nodes too — that is what gets them dragging,
  // selecting and transforming with the viewport for free — but they sit on
  // lower z layers so a frame never swallows a click meant for a node inside it.
  const furnitureNodes = useMemo<Node[]>(
    () => [
      ...document.groups.map((group) => ({
        id: group.id,
        type: "lcarsGroup",
        position: { x: group.position[0], y: group.position[1] },
        data: { label: group.label ?? "GROUP", width: group.size[0], height: group.size[1] },
        draggable: editable,
        selectable: editable,
        zIndex: 0,
      })),
      ...document.comments.map((comment) => ({
        id: comment.id,
        type: "lcarsComment",
        position: { x: comment.position[0], y: comment.position[1] },
        data: {
          text: comment.text,
          width: comment.size[0],
          height: comment.size[1],
          editable,
          onText: (id: string, text: string) =>
            apply(setCommentText(documentRef.current, id, text)),
          onCommit: () => commitRef.current("comment", documentRef.current),
        },
        draggable: editable,
        zIndex: 1,
      })),
      ...document.reroutes.map((reroute) => ({
        id: reroute.id,
        type: "lcarsReroute",
        position: { x: reroute.position[0], y: reroute.position[1] },
        data: {},
        draggable: editable,
        zIndex: 3,
      })),
    ],
    [apply, document.comments, document.groups, document.reroutes, editable],
  );

  const allNodes = useMemo(
    () => [...furnitureNodes, ...flowNodes],
    [flowNodes, furnitureNodes],
  );

  /** Which document collection an id belongs to, for routing a drag. */
  const kindOf = useCallback(
    (id: string): "node" | "group" | "comment" | "reroute" | null => {
      if (document.nodes.some((item) => item.id === id)) return "node";
      if (document.groups.some((item) => item.id === id)) return "group";
      if (document.comments.some((item) => item.id === id)) return "comment";
      if (document.reroutes.some((item) => item.id === id)) return "reroute";
      return null;
    },
    [document],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      document.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.source_port,
        target: edge.target,
        targetHandle: edge.target_port,
        type: "lcars",
        className: "lcars-gedge",
        // The edge draws itself through its own waypoints, so it needs them.
        data: { reroutes: document.reroutes.filter((reroute) => reroute.edge === edge.id) },
      })),
    [document.edges, document.reroutes],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      let next = document;
      const moved: Record<string, [number, number]> = {};
      let dragEnded = false;
      const removed: string[] = [];
      let nextSelection = selection;

      for (const change of changes) {
        if (change.type === "position" && change.position) {
          const position: [number, number] = [change.position.x, change.position.y];
          // Groups, comments and reroutes live in their own collections, so a
          // drag has to be routed by what was dragged rather than assumed to be
          // a node.
          switch (kindOf(change.id)) {
            case "group":
              next = moveGroup(next, change.id, position);
              break;
            case "comment":
              next = moveComment(next, change.id, position);
              break;
            case "reroute":
              next = {
                ...next,
                reroutes: next.reroutes.map((reroute) =>
                  reroute.id === change.id ? { ...reroute, position } : reroute,
                ),
              };
              break;
            default:
              moved[change.id] = position;
          }
          if (change.dragging === false) dragEnded = true;
        } else if (change.type === "remove" && editable) {
          removed.push(change.id);
        } else if (change.type === "select") {
          nextSelection = change.selected
            ? [...nextSelection.filter((id) => id !== change.id), change.id]
            : nextSelection.filter((id) => id !== change.id);
        }
      }

      if (Object.keys(moved).length > 0) next = moveNodes(next, moved);
      if (removed.length > 0) {
        next = removeNodes(next, removed.filter((id) => kindOf(id) === "node"));
        next = removeComments(next, removed.filter((id) => kindOf(id) === "comment"));
        next = removeReroutes(next, removed.filter((id) => kindOf(id) === "reroute"));
        for (const id of removed.filter((item) => kindOf(item) === "group")) {
          next = ungroup(next, id);
        }
      }
      if (nextSelection !== selection) setSelection(nextSelection);

      if (next === document) return;
      // A drag emits once, when the pointer is released — not per frame.
      if (removed.length > 0) commit("delete", next, nextSelection);
      else if (dragEnded) commit("move", next, nextSelection);
      else apply(next);
    },
    [apply, commit, document, editable, kindOf, selection],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!editable) return;
      const removed = changes.filter((change) => change.type === "remove").map((change) => change.id);
      if (removed.length === 0) return;
      commit("disconnect", disconnect(document, removed));
    },
    [commit, document, editable],
  );

  const onConnect = useCallback(
    (connection: FlowConnection) => {
      if (!editable) return;
      const candidate = {
        source: connection.source,
        source_port: connection.sourceHandle ?? "",
        target: connection.target,
        target_port: connection.targetHandle ?? "",
      };
      const error = connectionError(document, candidate);
      if (error) {
        // Said in the panel rather than swallowed: a drag that snaps back with
        // no explanation reads as a broken editor.
        setNotice(error);
        return;
      }
      setNotice(null);
      commit("connect", connectPorts(document, candidate));
    },
    [commit, document, editable],
  );

  const isValidConnection = useCallback(
    (connection: FlowConnection | Edge) =>
      connectionError(document, {
        source: connection.source,
        source_port: ("sourceHandle" in connection ? connection.sourceHandle : null) ?? "",
        target: connection.target,
        target_port: ("targetHandle" in connection ? connection.targetHandle : null) ?? "",
      }) === null,
    [document],
  );

  /** Selected ids that are actual graph nodes, which is what most commands act on. */
  const selectedNodes = useMemo(
    () => selection.filter((id) => document.nodes.some((node) => node.id === id)),
    [document.nodes, selection],
  );

  /**
   * Rendered node sizes, read off React Flow's measurements.
   *
   * The document stores only positions; how tall a node is depends on how many
   * ports and fields its template declares, which is a rendering fact. Align
   * and group need it, and degrade sensibly when it is not there yet.
   */
  const nodeSizes = useMemo(() => {
    const sizes: Record<string, NodeSize> = {};
    for (const node of allNodes) {
      const measured = (node as { measured?: { width?: number; height?: number } }).measured;
      if (measured?.width && measured?.height) {
        sizes[node.id] = { width: measured.width, height: measured.height };
      }
    }
    return sizes;
  }, [allNodes]);

  const copy = useCallback(() => {
    if (selectedNodes.length === 0) return;
    clipboard.current = extractSubgraph(document, selectedNodes);
  }, [document, selectedNodes]);

  const paste = useCallback(() => {
    if (!editable || !clipboard.current) return;
    const { document: next, nodeIds } = insertSubgraph(document, clipboard.current);
    if (next === document) return;
    setSelection(nodeIds);
    commit("paste", next, nodeIds);
  }, [commit, document, editable]);

  const duplicate = useCallback(() => {
    if (!editable || selectedNodes.length === 0) return;
    const { document: next, nodeIds } = duplicateNodes(document, selectedNodes);
    setSelection(nodeIds);
    commit("duplicate", next, nodeIds);
  }, [commit, document, editable, selectedNodes]);

  const align = useCallback(
    (edge: AlignEdge) => {
      if (!editable) return;
      const next = alignNodes(document, selectedNodes, edge, nodeSizes);
      if (next !== document) commit("align", next);
    },
    [commit, document, editable, nodeSizes, selectedNodes],
  );

  const distribute = useCallback(
    (axis: "x" | "y") => {
      if (!editable) return;
      const next = distributeNodes(document, selectedNodes, axis);
      if (next !== document) commit("distribute", next);
    },
    [commit, document, editable, selectedNodes],
  );

  const group = useCallback(() => {
    if (!editable || selectedNodes.length === 0) return;
    commit("group", groupSelection(document, selectedNodes, nodeSizes));
  }, [commit, document, editable, nodeSizes, selectedNodes]);

  const comment = useCallback(() => {
    if (!editable) return;
    commit("comment", addComment(document, [document.viewport.x + 40, document.viewport.y + 40]));
  }, [commit, document, editable]);

  const addFromPalette = useCallback(
    (templateId: string) => {
      if (!editable) return;
      // Placed near the middle of what is currently on screen rather than at
      // the world origin, which may be nowhere near the user.
      const position: [number, number] = [
        -document.viewport.x / document.viewport.zoom + 80,
        -document.viewport.y / document.viewport.zoom + 80,
      ];
      setPaletteOpen(false);
      commit("add", addNode(document, templateId, position));
    },
    [commit, document, editable],
  );

  const exportGraph = useCallback(() => {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${widget.id}.lcars-graph.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [document, widget.id]);

  const importGraph = useCallback(
    async (file: File) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readTextFile(file));
      } catch {
        setNotice("That file is not valid JSON.");
        return;
      }
      const result = validateDocument(parsed);
      if (!result.ok) {
        // An invalid import must leave the working graph exactly as it was.
        setNotice(result.error);
        return;
      }
      setNotice(null);
      setSelection([]);
      commit("import", result.document, []);
    },
    [commit],
  );

  const undo = useCallback(() => {
    const previous = history.current[history.current.length - 1];
    if (!previous) return;
    history.current = history.current.slice(0, -1);
    future.current = [...future.current, document];
    setLocal(previous);
    emit("undo", previous);
  }, [document, emit]);

  const redo = useCallback(() => {
    const next = future.current[future.current.length - 1];
    if (!next) return;
    future.current = future.current.slice(0, -1);
    history.current = [...history.current, document];
    setLocal(next);
    emit("redo", next);
  }, [document, emit]);

  const run = useCallback((kind: "run" | "queue" | "cancel") => emit(kind, document), [document, emit]);

  /**
   * Keyboard shortcuts, scoped to the canvas.
   *
   * Bound on the surface rather than on the document: a console can show more
   * than one graph, and a global listener would have every one of them react to
   * a keystroke meant for whichever has focus. Deletion is left to React Flow,
   * which already routes it through onNodesChange.
   */
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      // Never steal a keystroke from a field being typed into.
      if (target.closest("input, textarea, select")) return;
      const accel = event.ctrlKey || event.metaKey;
      if (!accel) return;

      const key = event.key.toLowerCase();
      const actions: Record<string, () => void> = {
        c: copy,
        v: paste,
        d: duplicate,
        g: group,
        z: event.shiftKey ? redo : undo,
        y: redo,
      };
      const action = actions[key];
      if (!action) return;
      event.preventDefault();
      action();
    },
    [copy, duplicate, group, paste, redo, undo],
  );

  const status = execution?.status ?? "idle";
  const canArrange = editable && selectedNodes.length >= 2;

  return (
    <div className="lcars-gcanvas lcars-immersive">
      <div className="lcars-gcanvas-bar">
        <span className="lcars-gcanvas-title">{label || "GRAPH"}</span>
        {status !== "idle" ? (
          <span className="lcars-gcanvas-status" data-status={status}>
            {status}
          </span>
        ) : null}
        {editable && (options.show_palette ?? DEFAULTS.show_palette) ? (
          <button
            className="lcars-btn lcars-btn--sm"
            onClick={() => setPaletteOpen((open) => !open)}
            type="button"
          >
            ADD
          </button>
        ) : null}
        {canArrange ? (
          <>
            <button className="lcars-btn lcars-btn--sm" onClick={() => align("left")} type="button">
              ALIGN L
            </button>
            <button className="lcars-btn lcars-btn--sm" onClick={() => align("top")} type="button">
              ALIGN T
            </button>
            <button
              className="lcars-btn lcars-btn--sm"
              onClick={() => distribute("x")}
              type="button"
            >
              DIST X
            </button>
            <button className="lcars-btn lcars-btn--sm" onClick={group} type="button">
              GROUP
            </button>
          </>
        ) : null}
        {editable ? (
          <button className="lcars-btn lcars-btn--sm" onClick={comment} type="button">
            NOTE
          </button>
        ) : null}
        <span className="lcars-gcanvas-spacer" />
        {(options.allow_import_export ?? true) ? (
          <>
            <button className="lcars-btn lcars-btn--sm" onClick={exportGraph} type="button">
              EXPORT
            </button>
            {editable ? (
              <button
                className="lcars-btn lcars-btn--sm"
                onClick={() => fileInput.current?.click()}
                type="button"
              >
                IMPORT
              </button>
            ) : null}
          </>
        ) : null}
        {editable && historyLimit > 0 ? (
          <>
            <button className="lcars-btn lcars-btn--sm" onClick={undo} type="button">
              UNDO
            </button>
            <button className="lcars-btn lcars-btn--sm" onClick={redo} type="button">
              REDO
            </button>
          </>
        ) : null}
        {options.show_run ? (
          <button className="lcars-btn lcars-btn--sm" onClick={() => run("run")} type="button">
            RUN
          </button>
        ) : null}
        {options.show_queue ? (
          <button className="lcars-btn lcars-btn--sm" onClick={() => run("queue")} type="button">
            QUEUE
          </button>
        ) : null}
        {options.show_cancel ? (
          <button className="lcars-btn lcars-btn--sm" onClick={() => run("cancel")} type="button">
            CANCEL
          </button>
        ) : null}
      </div>

      {/* Focusable so the shortcuts below are scoped to this canvas. */}
      <div className="lcars-gcanvas-field" onKeyDown={onKeyDown} role="presentation" tabIndex={-1}>
        <ReactFlow
          edgeTypes={edgeTypes}
          edges={flowEdges}
          elementsSelectable
          isValidConnection={isValidConnection}
          maxZoom={options.max_zoom ?? DEFAULTS.max_zoom}
          minZoom={options.min_zoom ?? DEFAULTS.min_zoom}
          nodeTypes={nodeTypes}
          nodes={allNodes}
          nodesConnectable={editable}
          nodesDraggable={editable}
          onConnect={onConnect}
          onEdgeDoubleClick={(event, edge) => {
            if (!editable) return;
            // A double-click on a wire drops a waypoint where it was clicked.
            const bounds = (event.currentTarget as Element)
              .closest(".react-flow")
              ?.getBoundingClientRect();
            if (!bounds) return;
            const zoom = document.viewport.zoom || 1;
            const position: [number, number] = [
              (event.clientX - bounds.left - document.viewport.x) / zoom,
              (event.clientY - bounds.top - document.viewport.y) / zoom,
            ];
            commit("reroute", addReroute(document, edge.id, position));
          }}
          onEdgesChange={onEdgesChange}
          onMoveEnd={(_, viewport) => apply(setViewport(document, viewport))}
          onNodesChange={onNodesChange}
          proOptions={{ hideAttribution: true }}
          snapGrid={[options.grid_size ?? DEFAULTS.grid_size, options.grid_size ?? DEFAULTS.grid_size]}
          snapToGrid={options.snap_to_grid ?? DEFAULTS.snap_to_grid}
        >
          <Background color="var(--role-rail-b)" gap={24} variant={BackgroundVariant.Dots} />
          {(options.minimap ?? DEFAULTS.minimap) ? (
            <MiniMap className="lcars-gminimap" pannable zoomable />
          ) : null}
        </ReactFlow>

        {/* An ordinary child of the canvas, not a portal: the panel's clipping
            has to contain it like everything else on this surface. */}
        {paletteOpen && editable ? (
          <Palette
            onClose={() => setPaletteOpen(false)}
            onPick={addFromPalette}
            templates={document.templates}
          />
        ) : null}
      </div>

      <input
        accept="application/json,.json"
        className="lcars-visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same file twice in a row still fires.
          event.target.value = "";
          if (file) void importGraph(file);
        }}
        ref={fileInput}
        type="file"
      />

      {notice ? (
        <div className="lcars-gcanvas-notice" role="status">
          {notice}
          <button
            aria-label="Dismiss"
            className="lcars-gcanvas-notice-x"
            onClick={() => setNotice(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function NodeCanvas(props: {
  widget: NodeCanvasWidget;
  label: string;
  handlers: WidgetHandlers;
}) {
  return (
    <ReactFlowProvider>
      <NodeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default NodeCanvas;
