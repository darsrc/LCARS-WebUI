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
import { useMemo, useState } from "react";
import { BaseEdge, getBezierPath, type EdgeProps, type NodeProps } from "@xyflow/react";

import type { GraphReroute, NodeTemplate } from "../../types/contract";

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
  ...rest
}: EdgeProps) {
  const reroutes = ((data as { reroutes?: GraphReroute[] } | undefined)?.reroutes ?? []) as
    GraphReroute[];

  const path = useMemo(() => {
    // With no waypoints a bezier reads better; with them the edge has to
    // actually pass through each one, so it becomes a polyline.
    if (reroutes.length === 0) {
      const [bezier] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
      return bezier;
    }
    const points = reroutes.map((reroute) => `L ${reroute.position[0]},${reroute.position[1]}`);
    return `M ${sourceX},${sourceY} ${points.join(" ")} L ${targetX},${targetY}`;
  }, [reroutes, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY]);

  return (
    <>
      <path aria-hidden="true" className="lcars-gedge-track" d={path} />
      <BaseEdge id={id} path={path} {...rest} />
    </>
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
