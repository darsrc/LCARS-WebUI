import { useCallback, useMemo, useState } from "react";

import type { GraphDocument, Widget } from "../../types/contract";
import type { GraphWorkspaceDocument } from "../../types/workspace";
import NodeCanvas from "../nodecanvas/NodeCanvas";
import {
  commitProposalProjection,
  createDraftRecord,
  deleteDraftRecord,
  proposalRecordCounts,
  proposalRecords,
  updateDraftField,
} from "./authoring";
import type { GraphWorkspaceWidget, WorkspaceWidgetHandlers } from "./types";
import "./workspace.css";

type NodeCanvasWidget = Extract<Widget, { type: "node_canvas" }>;

const emptyProjection = (): GraphDocument => ({
  format: "lcars-node-graph",
  version: 2,
  layers: [],
  templates: [],
  nodes: [],
  edges: [],
  reroutes: [],
  groups: [],
  comments: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

const normalizeProjection = (value: unknown): GraphDocument => {
  const candidate = (value ?? {}) as Partial<GraphDocument>;
  const fallback = emptyProjection();
  return {
    ...fallback,
    ...candidate,
    format: "lcars-node-graph",
    version: candidate.version ?? 2,
    layers: candidate.layers ?? [],
    templates: candidate.templates ?? [],
    nodes: candidate.nodes ?? [],
    edges: candidate.edges ?? [],
    reroutes: candidate.reroutes ?? [],
    groups: candidate.groups ?? [],
    comments: candidate.comments ?? [],
    viewport: candidate.viewport ?? fallback.viewport,
  };
};

const canvasWidget = (
  owner: GraphWorkspaceWidget,
  suffix: string,
  document: GraphDocument,
  editable: boolean,
): NodeCanvasWidget =>
  ({
    id: `${owner.id}-${suffix}`,
    type: "node_canvas",
    label: null,
    document,
    color: owner.color ?? null,
    disabled: owner.disabled ?? false,
    visible: true,
    options: {
      editable,
      allow_import_export: false,
      history_limit: 0,
      show_palette: editable,
      minimap: true,
      min_zoom: 0.25,
      max_zoom: 2.5,
      snap_to_grid: false,
      grid_size: 16,
      show_run: false,
      show_queue: false,
      show_cancel: false,
    },
  }) as NodeCanvasWidget;

export function GraphWorkspace({
  widget,
  label,
  handlers,
}: {
  widget: GraphWorkspaceWidget;
  label: string;
  handlers: WorkspaceWidgetHandlers;
}) {
  const [local, setLocal] = useState<GraphWorkspaceDocument>(widget.workspace);
  const [draftKind, setDraftKind] = useState(widget.workspace.record_schemas?.[0]?.kind ?? "");
  const [draftId, setDraftId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const options = widget.options ?? {};
  const canonicalDocument = normalizeProjection(local.canonical.projection?.document);
  const proposalDocument = normalizeProjection(local.proposal?.projection?.document);

  const canonicalWidget = useMemo(
    () => canvasWidget(widget, "canonical", canonicalDocument, false),
    [canonicalDocument, widget],
  );
  const proposalWidget = useMemo(
    () => canvasWidget(widget, "proposal", proposalDocument, !widget.disabled),
    [proposalDocument, widget],
  );

  const updateProposal = useCallback(
    (_id: string, value: unknown) => {
      if (!local.proposal || typeof value !== "object" || value === null) return;
      const state = value as { document?: GraphDocument; last_event?: string };
      if (!state.document) return;
      const next = commitProposalProjection(local, state.document as never, state.last_event ?? "");
      setLocal(next);
      handlers.onUiStateChange?.(widget.id, {
        workspace: next,
        last_event: state.last_event ?? null,
      });
    },
    [handlers, local, widget.id],
  );

  const commitWorkspace = useCallback(
    (next: GraphWorkspaceDocument, event: string) => {
      setLocal(next);
      const state = { workspace: next, last_event: event };
      handlers.onUiStateChange?.(widget.id, state);
      if (options.interaction?.mode === "server") {
        handlers.onAction(options.interaction.action_id ?? widget.id, state, widget.id);
      }
    },
    [handlers, options.interaction, widget.id],
  );

  const author = useCallback(
    (event: string, operation: () => GraphWorkspaceDocument) => {
      try {
        setNotice(null);
        commitWorkspace(operation(), event);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Proposal edit failed.");
      }
    },
    [commitWorkspace],
  );

  const records = proposalRecords(local);
  const counts = proposalRecordCounts(local);

  const canonicalHandlers = useMemo(
    () => ({ ...handlers, onUiStateChange: undefined }),
    [handlers],
  );
  const proposalHandlers = useMemo(
    () => ({ ...handlers, onUiStateChange: updateProposal }),
    [handlers, updateProposal],
  );

  return (
    <section
      aria-label={label || "Graph proposal workspace"}
      className="lcars-workspace lcars-immersive"
      data-workspace-version={local.version}
    >
      <header className="lcars-workspace-head">
        <div>
          <strong>{label || local.proposal?.title || "GRAPH WORKSPACE"}</strong>
          <span>{local.canonical.graph.graph_id} · {local.canonical.graph.revision}</span>
        </div>
        <div className="lcars-workspace-metrics" aria-label="Proposal metrics">
          <span>{local.proposal?.interaction_count ?? 0} INTERACTIONS</span>
          <span>{local.proposal?.changes?.length ?? 0} PROPOSED RECORDS</span>
        </div>
      </header>

      <div className="lcars-workspace-planes">
        <section aria-label="Canonical plane" className="lcars-workspace-plane" data-plane="canonical">
          <div className="lcars-workspace-plane-head">
            <strong>{options.canonical_title ?? "CANONICAL · READ ONLY"}</strong>
            <span>LOCKED</span>
          </div>
          <NodeCanvas handlers={canonicalHandlers as never} label="" widget={canonicalWidget} />
        </section>

        <section aria-label="Proposal plane" className="lcars-workspace-plane" data-plane="proposal">
          <div className="lcars-workspace-plane-head">
            <strong>{options.proposal_title ?? "PROPOSAL · WORKING PLANE"}</strong>
            <span>DRAFT</span>
          </div>
          <NodeCanvas handlers={proposalHandlers as never} label="" widget={proposalWidget} />
        </section>
      </div>

      <aside aria-label="Proposal authoring" className="lcars-workspace-authoring">
        <div className="lcars-workspace-authoring-head">
          <strong>DRAFT RECORDS</strong>
          <span>{Object.entries(counts).map(([kind, count]) => `${kind}: ${count}`).join(" · ") || "EMPTY"}</span>
        </div>
        <form
          className="lcars-workspace-new"
          onSubmit={(event) => {
            event.preventDefault();
            author("create_record", () => createDraftRecord(local, draftKind, draftId));
            setDraftId("");
          }}
        >
          <label>
            KIND
            <select onChange={(event) => setDraftKind(event.target.value)} value={draftKind}>
              {(local.record_schemas ?? []).map((schema) => (
                <option key={schema.kind} value={schema.kind}>{schema.label}</option>
              ))}
            </select>
          </label>
          <label>
            DRAFT ID
            <input onChange={(event) => setDraftId(event.target.value)} value={draftId} />
          </label>
          <button disabled={!draftKind || !draftId.trim()} type="submit">CREATE DRAFT</button>
        </form>
        <div className="lcars-workspace-records">
          {records.map((record) => {
            const schema = (local.record_schemas ?? []).find((item) => item.kind === record.kind);
            return (
              <article data-draft-record={record.id} key={record.id}>
                <header><strong>{record.id}</strong><span>{schema?.appearance.token ?? record.kind}</span></header>
                {(schema?.fields ?? []).filter((field) => field.value_kind !== "tree").map((field) => (
                  <label key={field.id}>
                    {field.label}
                    <input
                      defaultValue={String(record.fields?.[field.id] ?? "")}
                      onBlur={(event) => author("commit_field", () =>
                        updateDraftField(local, record.id, field.id, event.target.value))}
                    />
                  </label>
                ))}
                <button onClick={() => author("delete_record", () => deleteDraftRecord(local, record.id))} type="button">
                  DELETE DRAFT
                </button>
              </article>
            );
          })}
        </div>
        {notice ? <p role="status">{notice}</p> : null}
      </aside>
    </section>
  );
}

export default GraphWorkspace;
