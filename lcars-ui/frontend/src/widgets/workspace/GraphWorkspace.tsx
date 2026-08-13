import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GraphDocument, Widget } from "../../types/contract";
import type { GraphWorkspaceDocument } from "../../types/workspace";
import NodeCanvas from "../nodecanvas/NodeCanvas";
import {
  commitProposalProjection,
  createDraftRecord,
  deleteDraftRecord,
  isProposalAuthoringEvent,
  proposalRecordCounts,
  proposalRecords,
  updateDraftField,
} from "./authoring";
import type { GraphWorkspaceWidget, WorkspaceWidgetHandlers } from "./types";
import { StructuredValueEditor } from "./StructuredValueEditor";
import {
  restoreProposalCheckpoint,
  saveProposalCheckpoint,
  WorkspaceProposalHistory,
} from "./transactions";
import {
  collapseGroup,
  projectVisibleDocument,
  searchWorkspace,
  selectStep,
  traverseReaderHistory,
  updateReader,
  visibleRecordIds,
} from "./navigation";
import { windowEdgeFans } from "./fan";
import { VirtualList } from "./VirtualList";
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
  visibleEdgeIds?: string[],
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
      visible_edge_ids: visibleEdgeIds ?? null,
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
  const options = widget.options ?? {};
  const [local, setLocal] = useState<GraphWorkspaceDocument>(() => {
    const key = options.autosave_key;
    if (!key || typeof window === "undefined") return widget.workspace;
    return restoreProposalCheckpoint(window.localStorage, key, widget.workspace) ?? widget.workspace;
  });
  const [draftKind, setDraftKind] = useState(widget.workspace.record_schemas?.[0]?.kind ?? "");
  const [draftId, setDraftId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(widget.workspace.reader?.search ?? "");
  const [focusDraft, setFocusDraft] = useState(widget.workspace.reader?.focus?.record_id ?? "");
  const [fanPages, setFanPages] = useState<Record<string, number>>({});
  const [selectedFan, setSelectedFan] = useState<string | null>(null);
  const history = useRef(new WorkspaceProposalHistory());
  const visibleRecords = visibleRecordIds(local);
  const collapsedGroups = new Set(local.reader?.collapsed ?? []);
  const canonicalDocument = projectVisibleDocument(
    normalizeProjection(local.canonical.projection?.document),
    local.canonical.projection?.bindings ?? [],
    visibleRecords,
    collapsedGroups,
  );
  const proposalDocument = projectVisibleDocument(
    normalizeProjection(local.proposal?.projection?.document),
    local.proposal?.projection?.bindings ?? [],
    visibleRecords,
    collapsedGroups,
  );
  const fanPageSize = options.fan_page_size ?? 20;
  const canonicalFans = windowEdgeFans(canonicalDocument, fanPageSize, fanPages);
  const proposalFans = windowEdgeFans(proposalDocument, fanPageSize, fanPages);

  const canonicalWidget = useMemo(
    () => canvasWidget(widget, "canonical", canonicalDocument, false, canonicalFans.visible_edge_ids),
    [canonicalDocument, canonicalFans.visible_edge_ids, widget],
  );
  const proposalWidget = useMemo(
    () => canvasWidget(widget, "proposal", proposalDocument, !widget.disabled, proposalFans.visible_edge_ids),
    [proposalDocument, proposalFans.visible_edge_ids, widget],
  );

  const updateProposal = useCallback(
    (_id: string, value: unknown) => {
      if (!local.proposal || typeof value !== "object" || value === null) return;
      const state = value as { document?: GraphDocument; last_event?: string };
      if (!state.document) return;
      if (isProposalAuthoringEvent(state.last_event ?? "")) history.current.record(local);
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
    (next: GraphWorkspaceDocument, event: string, recordHistory = false) => {
      if (recordHistory) history.current.record(local);
      setLocal(next);
      const state = { workspace: next, last_event: event };
      handlers.onUiStateChange?.(widget.id, state);
      if (options.interaction?.mode === "server") {
        handlers.onAction(options.interaction.action_id ?? widget.id, state, widget.id);
      }
    },
    [handlers, local, options.interaction, widget.id],
  );

  const author = useCallback(
    (event: string, operation: () => GraphWorkspaceDocument) => {
      try {
        setNotice(null);
        commitWorkspace(operation(), event, true);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Proposal edit failed.");
      }
    },
    [commitWorkspace],
  );

  const records = proposalRecords(local);
  const counts = proposalRecordCounts(local);
  const searchResults = searchDraft.trim() ? searchWorkspace(local, searchDraft) : [];
  const groups = [
    ...(local.canonical.projection?.document?.groups ?? []),
    ...(local.proposal?.projection?.document?.groups ?? []),
  ].filter((group, index, all) => all.findIndex((candidate) => candidate.id === group.id) === index);
  const allFans = [
    ...canonicalFans.groups.map((fan) => ({ ...fan, plane: "canonical" as const, selectionId: `canonical:${fan.id}` })),
    ...proposalFans.groups.map((fan) => ({ ...fan, plane: "proposal" as const, selectionId: `proposal:${fan.id}` })),
  ];
  const activeFan = allFans.find((fan) => fan.selectionId === selectedFan) ?? allFans.find((fan) => fan.edges.length > fanPageSize);
  const activeFanPage = activeFan ? (fanPages[activeFan.id] ?? 0) : 0;

  const commitReader = useCallback(
    (next: GraphWorkspaceDocument, event: string) => {
      setLocal(next);
      handlers.onUiStateChange?.(widget.id, { workspace: next, last_event: event });
    },
    [handlers, widget.id],
  );

  useEffect(() => {
    const key = options.autosave_key;
    if (!key || typeof window === "undefined" || !local.proposal) return;
    const timer = window.setTimeout(
      () => saveProposalCheckpoint(window.localStorage, key, local),
      options.autosave_delay_ms ?? 500,
    );
    return () => window.clearTimeout(timer);
  }, [local.proposal, local.workspace_id, options.autosave_delay_ms, options.autosave_key]);

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

      <nav aria-label="Workspace location and density controls" className="lcars-workspace-location">
        <div className="lcars-workspace-location-strip">
          <span>{local.canonical.graph.graph_id} / {local.canonical.graph.revision}</span>
          <span>{local.canonical.completeness?.loaded_records ?? 0}/{local.canonical.completeness?.known_records ?? "?"} LOADED</span>
          <span>STEP {local.reader?.current_step ?? "ALL"}</span>
          <span>FOCUS {local.reader?.focus ? `${local.reader.focus.record_id} · ${local.reader.focus.radius}H` : "OFF"}</span>
          <span>{local.reader?.filters?.length ?? 0} FILTERS</span>
          <span>{Object.values(local.reader?.layer_state ?? {}).filter((layer) => !layer.visible).length} HIDDEN LAYERS</span>
        </div>
        <div className="lcars-workspace-nav-controls">
          <button onClick={() => commitReader(traverseReaderHistory(local, -1), "reader_back")} type="button">BACK</button>
          <button onClick={() => commitReader(traverseReaderHistory(local, 1), "reader_forward")} type="button">FORWARD</button>
          {groups.map((group) => {
            const collapsed = collapsedGroups.has(group.id);
            return (
              <button
                aria-pressed={collapsed}
                key={group.id}
                onClick={() => commitReader(collapseGroup(local, group.id, !collapsed), collapsed ? "expand" : "collapse")}
                type="button"
              >{collapsed ? "EXPAND" : "COLLAPSE"} {group.label ?? group.id}</button>
            );
          })}
        </div>
        <form
          className="lcars-workspace-search"
          onSubmit={(event) => {
            event.preventDefault();
            commitReader(updateReader(local, { search: searchDraft }, `Search ${searchDraft || "cleared"}`), "search");
          }}
        >
          <label>SEARCH<input onChange={(event) => setSearchDraft(event.target.value)} value={searchDraft} /></label>
          <button type="submit">APPLY SEARCH</button>
          <label>KIND FILTER
            <select
              onChange={(event) => commitReader(updateReader(
                local,
                { filters: event.target.value ? [{ facet: "kind", values: [event.target.value] }] : [] },
                `Filter ${event.target.value || "cleared"}`,
              ), "filter")}
              value={local.reader?.filters?.find((filter) => filter.facet === "kind")?.values?.[0] ?? ""}
            >
              <option value="">ALL</option>
              {(local.record_schemas ?? []).map((schema) => <option key={schema.kind} value={schema.kind}>{schema.label}</option>)}
            </select>
          </label>
          <label>FOCUS RECORD<input onChange={(event) => setFocusDraft(event.target.value)} value={focusDraft} /></label>
          <button
            onClick={() => commitReader(updateReader(local, {
              focus: focusDraft ? { record_id: focusDraft, radius: local.reader?.focus?.radius ?? 1, direction: "both" } : null,
            }, focusDraft ? `Focus ${focusDraft}` : "Clear focus"), "focus")}
            type="button"
          >{focusDraft ? "FOCUS 1-HOP" : "CLEAR FOCUS"}</button>
        </form>
        {(local.reader?.breadcrumb ?? []).length > 0 ? (
          <ol aria-label="Breadcrumb" className="lcars-workspace-breadcrumb">
            {local.reader!.breadcrumb!.map((entry) => <li key={entry.id}>{entry.label}</li>)}
          </ol>
        ) : null}
        {searchDraft.trim() ? (
          <ul aria-label="Search matches" className="lcars-workspace-search-results">
            {searchResults.map((result) => (
              <li key={`${result.plane}:${result.record.id}`}>
                <button
                  onClick={() => commitReader(updateReader(local, {
                    selection: [{ plane: result.plane, element_kind: "record", element_id: result.record.id }],
                  }, `Select ${result.record.id}`), "selection")}
                  type="button"
                >{result.record.id}</button>
                <span>{result.matched_fields.join(" · ")}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {groups.length > 0 ? (
          <div className="lcars-workspace-steps" aria-label="Step navigation">
            {groups.map((group) => (
              <button key={group.id} onClick={() => commitReader(selectStep(local, group.id), "step")} type="button">
                {group.label ?? group.id}
              </button>
            ))}
          </div>
        ) : null}
      </nav>

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

      {allFans.length > 0 ? (
        <section aria-label="Edge fan inspector" className="lcars-workspace-fans">
          <header>
            <strong>EDGE FANS · EXACT GROUPING</strong>
            <span>{allFans.reduce((total, fan) => total + fan.edges.length, 0)} EDGES INDEXED</span>
          </header>
          <div className="lcars-workspace-fan-groups">
            {allFans.map((fan) => (
              <button
                aria-pressed={activeFan?.selectionId === fan.selectionId}
                key={fan.selectionId}
                onClick={() => setSelectedFan(fan.selectionId)}
                type="button"
              >{fan.plane} · {fan.hub} · {fan.direction} · {fan.layer} · {fan.relation} · {fan.edges.length}</button>
            ))}
          </div>
          {activeFan ? (
            <>
              <div className="lcars-workspace-fan-pages">
                <span>LANES {activeFanPage * fanPageSize + 1}–{Math.min((activeFanPage + 1) * fanPageSize, activeFan.edges.length)} / {activeFan.edges.length}</span>
                <button
                  disabled={activeFanPage === 0}
                  onClick={() => setFanPages((pages) => ({ ...pages, [activeFan.id]: activeFanPage - 1 }))}
                  type="button"
                >PREVIOUS LANES</button>
                <button
                  disabled={(activeFanPage + 1) * fanPageSize >= activeFan.edges.length}
                  onClick={() => setFanPages((pages) => ({ ...pages, [activeFan.id]: activeFanPage + 1 }))}
                  type="button"
                >NEXT LANES</button>
              </div>
              <VirtualList
                height={Math.min(320, Math.max(120, fanPageSize * (options.virtual_row_height ?? 40)))}
                items={activeFan.edges}
                label={`Complete ${activeFan.hub} fan`}
                renderRow={(edge) => (
                  <div className="lcars-workspace-fan-row">
                    <span>{edge.id}</span><span>{edge.source}:{edge.source_port}</span>
                    <span>→</span><span>{edge.target}:{edge.target_port}</span>
                    <span>{edge.layer ?? "UNLAYERED"}</span><span>{edge.relation ?? "UNRELATED"}</span>
                  </div>
                )}
                rowHeight={options.virtual_row_height ?? 40}
              />
            </>
          ) : null}
        </section>
      ) : null}

      <aside aria-label="Proposal authoring" className="lcars-workspace-authoring">
        <div className="lcars-workspace-authoring-head">
          <strong>DRAFT RECORDS</strong>
          <span>{Object.entries(counts).map(([kind, count]) => `${kind}: ${count}`).join(" · ") || "EMPTY"}</span>
          <div>
            <button
              disabled={!history.current.canUndo}
              onClick={() => {
                const next = history.current.undo(local);
                if (next) commitWorkspace(next, "undo");
              }}
              type="button"
            >UNDO PROPOSAL</button>
            <button
              disabled={!history.current.canRedo}
              onClick={() => {
                const next = history.current.redo(local);
                if (next) commitWorkspace(next, "redo");
              }}
              type="button"
            >REDO PROPOSAL</button>
          </div>
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
                {(schema?.fields ?? []).filter((field) => field.value_kind === "tree").map((field) => (
                  <StructuredValueEditor
                    fieldId={field.id}
                    key={field.id}
                    onCommit={(next, event) => commitWorkspace(next, event, true)}
                    recordId={record.id}
                    schemaId={field.tree_schema!}
                    tree={record.trees?.[field.id]}
                    workspace={local}
                  />
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
