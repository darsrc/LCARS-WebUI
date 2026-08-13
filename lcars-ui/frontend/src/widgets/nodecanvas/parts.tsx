/*
 * The non-node furniture of the canvas: group frames, comments, reroute
 * waypoints, the edge that threads through them, and the template palette.
 *
 * These are split out of NodeCanvas.tsx to keep that file about *behaviour* —
 * what a gesture does to the document — while this one is about what things
 * look like. All of it is plain DOM and SVG styled from lcars.css; the palette
 * in particular is deliberately an ordinary child of the canvas rather than a
 * portal, so the panel's clipping contains it like everything else.
 */
import { useMemo, useState, type CSSProperties } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useViewport,
  type EdgeProps,
  type NodeProps,
} from "@xyflow/react";

import type {
  GraphEdge,
  GraphLayer,
  GraphReroute,
  NodeTemplate,
} from "../../types/contract";
import type { EdgeRoute } from "./graph";

export type LayerViewState = Record<string, { visible: boolean; emphasized: boolean }>;

export type LcarsEdgeData = {
  edge: GraphEdge;
  layer: GraphLayer | null;
  reroutes: GraphReroute[];
  color: string;
  muted: boolean;
  route?: EdgeRoute;
};

type EdgeGeometry = { path: string; labelX: number; labelY: number };

/** Code-rendered geometry for lanes and loops that would otherwise overlap. */
export const edgeGeometry = ({
  edge,
  route,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: {
  edge: GraphEdge;
  route?: EdgeRoute;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}): EdgeGeometry | null => {
  if (edge.source === edge.target) {
    const index = route?.selfLoopIndex ?? 0;
    const lift = 68 + index * 34;
    const spread = 52 + index * 18;
    return {
      path: `M ${sourceX},${sourceY} C ${sourceX + spread},${sourceY - lift} ${targetX - spread},${targetY - lift} ${targetX},${targetY}`,
      labelX: (sourceX + targetX) / 2,
      labelY: Math.min(sourceY, targetY) - lift * 0.8,
    };
  }

  const parallelCount = route?.parallelCount ?? 1;
  const sourceFanCount = route?.sourceFanCount ?? 1;
  const targetFanCount = route?.targetFanCount ?? 1;
  if (
    parallelCount === 1 &&
    sourceFanCount === 1 &&
    targetFanCount === 1 &&
    !route?.reciprocal
  ) return null;

  const parallelIndex = route?.parallelIndex ?? 0;
  const centredLane = (parallelIndex - (parallelCount - 1) / 2) * 26;
  const sourceFanLane = ((route?.sourceFanIndex ?? 0) - (sourceFanCount - 1) / 2) * 6;
  const targetFanLane = ((route?.targetFanIndex ?? 0) - (targetFanCount - 1) / 2) * 6;
  const offset = centredLane + sourceFanLane + targetFanLane + (route?.reciprocal ? 22 : 0);
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  const control1X = sourceX + dx / 3 + normalX * offset;
  const control1Y = sourceY + dy / 3 + normalY * offset;
  const control2X = sourceX + (dx * 2) / 3 + normalX * offset;
  const control2Y = sourceY + (dy * 2) / 3 + normalY * offset;
  return {
    path: `M ${sourceX},${sourceY} C ${control1X},${control1Y} ${control2X},${control2Y} ${targetX},${targetY}`,
    labelX: (sourceX + targetX) / 2 + normalX * offset * 0.75,
    labelY: (sourceY + targetY) / 2 + normalY * offset * 0.75,
  };
};

/* ---- Group frame ---- */

export function LcarsGroupNode({ data, selected }: NodeProps) {
  const { label, width, height, color } = data as unknown as {
    label: string;
    width: number;
    height: number;
    color: string | null;
  };
  return (
    <div
      className="lcars-ggroup"
      data-selected={selected || undefined}
      style={{
        width,
        height,
        ...(color ? { "--accent": color } : {}),
      }}
    >
      <div className="lcars-ggroup-head">
        <span className="lcars-ggroup-grip" aria-hidden="true" />
        {label}
      </div>
    </div>
  );
}

/* ---- Comment ---- */

export function LcarsCommentNode({ id, data, selected }: NodeProps) {
  const { text, width, height, editable, onText, onCommit } = data as unknown as {
    text: string;
    width: number;
    height: number;
    editable: boolean;
    onText: (id: string, text: string) => void;
    onCommit: () => void;
  };
  return (
    <div className="lcars-gcomment" data-selected={selected || undefined} style={{ width, height }}>
      <textarea
        className="nodrag"
        disabled={!editable}
        onBlur={onCommit}
        onChange={(event) => onText(id, event.target.value)}
        placeholder="NOTE"
        value={text}
      />
    </div>
  );
}

/* ---- Reroute waypoint ---- */

export function LcarsRerouteNode({ selected }: NodeProps) {
  return <div className="lcars-greroute" data-selected={selected || undefined} />;
}

/* ---- Edge, optionally threaded through reroutes ---- */

export function LcarsEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style: upstreamStyle,
  ...rest
}: EdgeProps) {
  const edgeData = data as LcarsEdgeData | undefined;
  const reroutes = edgeData?.reroutes ?? [];
  const layer = edgeData?.layer ?? null;
  const edge = edgeData?.edge;
  const color = edgeData?.color ?? "var(--role-readout)";
  const muted = edgeData?.muted ?? false;
  const { zoom } = useViewport();

  const [path, labelX, labelY] = useMemo(() => {
    // With no waypoints a bezier reads better; with them the edge has to
    // actually pass through each one, so it becomes a polyline.
    if (reroutes.length === 0) {
      if (edge) {
        const routed = edgeGeometry({
          edge,
          route: edgeData?.route,
          sourceX,
          sourceY,
          targetX,
          targetY,
        });
        if (routed) return [routed.path, routed.labelX, routed.labelY];
      }
      return getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
    }
    const points = reroutes.map((reroute) => `L ${reroute.position[0]},${reroute.position[1]}`);
    const route = [
      [sourceX, sourceY],
      ...reroutes.map((reroute) => reroute.position),
      [targetX, targetY],
    ];
    const middle = route[Math.floor(route.length / 2)];
    return [`M ${sourceX},${sourceY} ${points.join(" ")} L ${targetX},${targetY}`, middle[0], middle[1]];
  }, [edge, edgeData?.route, reroutes, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY]);

  const pattern = layer?.pattern ?? "solid";
  const opacity = muted ? 0.22 : 1;
  const edgeStyle: CSSProperties = {
    ...upstreamStyle,
    stroke: pattern === "double" ? "#000" : color,
    strokeWidth: pattern === "double" ? 2.5 : 3.5,
    strokeDasharray:
      pattern === "dashed" ? "14 8" : pattern === "dotted" ? "2 9" : undefined,
    strokeLinecap: pattern === "dotted" ? "round" : "round",
    opacity,
  };
  const fullLabel = edge?.label ?? edge?.relation ?? layer?.label ?? layer?.id ?? null;
  const displayLabel =
    layer && zoom < layer.label_zoom_threshold ? layer.token ?? layer.id : fullLabel;
  const accessibleName =
    edge?.accessible_label ??
    (edge
      ? `${layer?.label ?? layer?.id ?? "Unlayered"} edge ${edge.relation ?? edge.label ?? edge.id} from ${edge.source}:${edge.source_port} to ${edge.target}:${edge.target_port}`
      : undefined);

  return (
    <>
      <path aria-hidden="true" className="lcars-gedge-track" d={path} />
      {selected ? (
        <path
          aria-hidden="true"
          className="lcars-gedge-selected-trace"
          d={path}
          style={{ stroke: color }}
        />
      ) : null}
      {pattern === "double" ? (
        <path
          aria-hidden="true"
          className="lcars-gedge-double"
          d={path}
          style={{ opacity, stroke: color }}
        />
      ) : null}
      <BaseEdge id={id} path={path} style={edgeStyle} {...rest} />
      {displayLabel ? (
        <EdgeLabelRenderer>
          <span
            aria-label={accessibleName}
            className="lcars-gedge-label nodrag nopan"
            data-layer={layer?.id ?? undefined}
            data-token={displayLabel !== fullLabel || undefined}
            role="note"
            style={{
              "--edge-color": color,
              opacity,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            } as CSSProperties}
            title={accessibleName}
          >
            {displayLabel}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

/* ---- Persistent layer legend and reader-state controls ---- */

export function LayerLegend({
  layers,
  state,
  totals,
  colors,
  onVisibility,
  onEmphasis,
}: {
  layers: GraphLayer[];
  state: LayerViewState;
  totals: Record<string, number>;
  colors: Record<string, string>;
  onVisibility: (layerId: string) => void;
  onEmphasis: (layerId: string) => void;
}) {
  if (layers.length === 0) return null;
  return (
    <section aria-label="Edge layer legend" className="lcars-glayers">
      <h3>EDGE LAYERS</h3>
      <div className="lcars-glayers-list">
        {layers.map((layer) => {
          const current = state[layer.id] ?? { visible: true, emphasized: false };
          const total = totals[layer.id] ?? 0;
          return (
            <div className="lcars-glayer" data-visible={current.visible} key={layer.id}>
              <span
                aria-hidden="true"
                className="lcars-glayer-swatch"
                data-pattern={layer.pattern}
                style={{ "--edge-color": colors[layer.id] ?? "var(--role-readout)" } as CSSProperties}
              />
              <span className="lcars-glayer-name" title={layer.description ?? undefined}>
                <b>{layer.token ?? layer.id}</b>
                <strong>{layer.label ?? layer.id}</strong>
              </span>
              <span aria-label={`${current.visible ? total : 0} visible of ${total} total edges`} className="lcars-glayer-count">
                {current.visible ? total : 0}/{total}
              </span>
              <button
                aria-label={`${current.visible ? "Hide" : "Show"} ${layer.label ?? layer.id} layer`}
                aria-pressed={current.visible}
                onClick={() => onVisibility(layer.id)}
                type="button"
              >
                {current.visible ? "ON" : "OFF"}
              </button>
              <button
                aria-label={`${current.emphasized ? "Remove emphasis from" : "Emphasize"} ${layer.label ?? layer.id} layer`}
                aria-pressed={current.emphasized}
                disabled={!current.visible}
                onClick={() => onEmphasis(layer.id)}
                type="button"
              >
                EMPH
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---- Template palette ---- */

export function Palette({
  templates,
  onPick,
  onClose,
}: {
  templates: NodeTemplate[];
  onPick: (templateId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return templates;
    return templates.filter((template) =>
      [template.id, template.label ?? "", template.category ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, templates]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, NodeTemplate[]>();
    for (const template of matches) {
      const key = template.category ?? "";
      byCategory.set(key, [...(byCategory.get(key) ?? []), template]);
    }
    return [...byCategory.entries()];
  }, [matches]);

  return (
    <div className="lcars-gpalette">
      <div className="lcars-gpalette-bar">
        <input
          aria-label="Search node types"
          autoFocus
          className="lcars-input"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            // Enter with exactly one match is the fast path: type three
            // letters, press Enter, get the node.
            if (event.key === "Enter" && matches.length === 1) onPick(matches[0].id);
          }}
          placeholder="SEARCH NODES"
          value={query}
        />
        <button className="lcars-btn lcars-btn--sm" onClick={onClose} type="button">
          CLOSE
        </button>
      </div>
      <div className="lcars-gpalette-list">
        {grouped.length === 0 ? <p className="lcars-gpalette-empty">NO MATCHES</p> : null}
        {grouped.map(([category, items]) => (
          <div className="lcars-gpalette-group" key={category || "_"}>
            {category ? <div className="lcars-gpalette-cat">{category}</div> : null}
            {items.map((template) => (
              <button
                className="lcars-gpalette-item"
                key={template.id}
                onClick={() => onPick(template.id)}
                style={template.color ? ({ ["--accent"]: template.color } as never) : undefined}
                type="button"
              >
                {template.label ?? template.id}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
