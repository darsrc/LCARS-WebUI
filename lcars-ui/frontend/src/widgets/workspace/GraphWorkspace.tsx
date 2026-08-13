import { useCallback, useMemo, useState } from "react";

import type { GraphDocument, Widget } from "../../types/contract";
import type { GraphWorkspaceDocument } from "../../types/workspace";
import NodeCanvas from "../nodecanvas/NodeCanvas";
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
      const next: GraphWorkspaceDocument = {
        ...local,
        proposal: {
          ...local.proposal,
          projection: { ...local.proposal.projection, document: state.document },
        },
      };
      setLocal(next);
      handlers.onUiStateChange?.(widget.id, {
        workspace: next,
        last_event: state.last_event ?? null,
      });
    },
    [handlers, local, widget.id],
  );

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
    </section>
  );
}

export default GraphWorkspace;
