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
import { useCallback, useMemo, useRef, useState } from "react";
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
  connect as connectPorts,
  connectionError,
  disconnect,
  emptyDocument,
  moveNodes,
  reconcile,
  removeNodes,
  setFieldValue,
  setViewport,
} from "./graph";

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

const nodeTypes = { lcars: LcarsNode };

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
  const signatureRef = useRef<string | null>(null);
  const history = useRef<GraphDocument[]>([]);
  const future = useRef<GraphDocument[]>([]);

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
        },
      ];
    });
  }, [apply, document, editable, execution, selection]);

  const flowEdges = useMemo<Edge[]>(
    () =>
      document.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.source_port,
        target: edge.target,
        targetHandle: edge.target_port,
        className: "lcars-gedge",
      })),
    [document.edges],
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
          moved[change.id] = [change.position.x, change.position.y];
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
      if (removed.length > 0) next = removeNodes(next, removed);
      if (nextSelection !== selection) setSelection(nextSelection);

      if (next === document) return;
      // A drag emits once, when the pointer is released — not per frame.
      if (removed.length > 0) commit("delete", next, nextSelection);
      else if (dragEnded) commit("move", next, nextSelection);
      else apply(next);
    },
    [apply, commit, document, editable, selection],
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

  const status = execution?.status ?? "idle";

  return (
    <div className="lcars-gcanvas lcars-immersive">
      <div className="lcars-gcanvas-bar">
        <span className="lcars-gcanvas-title">{label || "GRAPH"}</span>
        {status !== "idle" ? (
          <span className="lcars-gcanvas-status" data-status={status}>
            {status}
          </span>
        ) : null}
        <span className="lcars-gcanvas-spacer" />
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

      <div className="lcars-gcanvas-field">
        <ReactFlow
          edges={flowEdges}
          elementsSelectable
          isValidConnection={isValidConnection}
          maxZoom={options.max_zoom ?? DEFAULTS.max_zoom}
          minZoom={options.min_zoom ?? DEFAULTS.min_zoom}
          nodeTypes={nodeTypes}
          nodes={flowNodes}
          nodesConnectable={editable}
          nodesDraggable={editable}
          onConnect={onConnect}
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
      </div>

      {notice ? (
        <div className="lcars-gcanvas-notice" onAnimationEnd={() => setNotice(null)} role="status">
          {notice}
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
