"""Constraint & anchor resolver for lcars.surface() (Milestone 4, Phase 4.1).

A small dependency-graph resolver: nodes declare their bounds either as absolute
x/y/w/h (Milestone 1 behavior, unchanged) or as edge anchors relative to the
surface itself ("parent") or to another named surface node, optionally matching
another node's width/height, or centered at an absolute point.

Resolution runs ONCE per surface at Python manifest-build time - never
re-solved client-side. Resolved x/y/w/h are written back onto the actual
contract node objects in place, so the frontend keeps consuming plain
absolute bounds exactly as it has since Milestone 1.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

Edge = Literal["left", "right", "top", "bottom"]


@dataclass(frozen=True)
class EdgeAnchor:
    """Anchor one edge of a node to an edge of another node, or of the surface ("parent")."""

    target: str
    edge: Edge
    offset: int = 0


@dataclass
class PendingConstraint:
    """One surface node awaiting bounds resolution.

    Every positionable surface node (rect/rounded_rect/capsule/region) is added
    here unconditionally, whether or not it uses anchors - a node with all four
    absolute values already given simply resolves to those same values.
    """

    node_id: str
    node: Any
    abs_x: int | None = None
    abs_y: int | None = None
    abs_w: int | None = None
    abs_h: int | None = None
    left: EdgeAnchor | None = None
    right: EdgeAnchor | None = None
    top: EdgeAnchor | None = None
    bottom: EdgeAnchor | None = None
    center_x: int | None = None
    center_y: int | None = None
    match_width_of: str | None = None
    match_height_of: str | None = None


def _resolved_edge(
    anchor: EdgeAnchor,
    role: Literal["near", "far"],
    parent_w: int,
    parent_h: int,
    resolved: dict[str, tuple[int, int, int, int]],
) -> int:
    bx, by, bw, bh = (
        (0, 0, parent_w, parent_h)
        if anchor.target == "parent"
        else resolved[anchor.target]
    )
    edge_value = {"left": bx, "right": bx + bw, "top": by, "bottom": by + bh}[anchor.edge]
    # The offset direction depends on which side of the RESOLVING node this anchor defines, not
    # which edge of the target it points at: a `left`/`top` (near) anchor pushes inward as offset
    # grows; a `right`/`bottom` (far) anchor pushes inward the opposite way.
    return edge_value + anchor.offset if role == "near" else edge_value - anchor.offset


def _resolve_axis(
    item: PendingConstraint,
    axis: Literal["x", "y"],
    parent_w: int,
    parent_h: int,
    resolved: dict[str, tuple[int, int, int, int]],
) -> tuple[int, int]:
    if axis == "x":
        abs_pos, abs_size = item.abs_x, item.abs_w
        near, far, center, match_of = item.left, item.right, item.center_x, item.match_width_of
    else:
        abs_pos, abs_size = item.abs_y, item.abs_h
        near, far, center, match_of = item.top, item.bottom, item.center_y, item.match_height_of

    if abs_pos is not None and abs_size is not None:
        return abs_pos, abs_size

    size = abs_size
    if size is None and match_of is not None:
        size = resolved[match_of][2] if axis == "x" else resolved[match_of][3]

    if near is not None and far is not None and size is None:
        start = _resolved_edge(near, "near", parent_w, parent_h, resolved)
        end = _resolved_edge(far, "far", parent_w, parent_h, resolved)
        pos, size = start, end - start
    elif near is not None and size is not None:
        pos = _resolved_edge(near, "near", parent_w, parent_h, resolved)
    elif far is not None and size is not None:
        pos = _resolved_edge(far, "far", parent_w, parent_h, resolved) - size
    elif center is not None and size is not None:
        pos = center - size // 2
    else:
        raise ValueError(
            f"Surface node {item.node_id!r} has an underdetermined {axis}-axis: "
            f"needs absolute x/y+w/h, or two of (near-edge, far-edge, size, center), "
            f"or match_{'width' if axis == 'x' else 'height'}_of plus one edge/center."
        )

    return pos, size


def resolve_surface_constraints(
    design_width: int,
    design_height: int,
    pending: list[PendingConstraint],
    *,
    attr_prefix: str = "",
) -> None:
    """Resolve every pending node's x/y/w/h in dependency order, mutating nodes in place.

    ``attr_prefix`` lets the same constraint specs be resolved a second time against a
    different design size (the "fluid" narrow policy, Phase 4.3), writing to
    ``narrow_x/narrow_y/narrow_w/narrow_h`` instead of ``x/y/w/h`` without disturbing the
    first pass's result - each call builds its own local dependency resolution from scratch.
    """
    if not pending:
        return

    by_id = {item.node_id: item for item in pending}

    for item in pending:
        for anchor in (item.left, item.right, item.top, item.bottom):
            if anchor is not None and anchor.target != "parent" and anchor.target not in by_id:
                raise ValueError(
                    f"Surface node {item.node_id!r} anchors to unknown node id {anchor.target!r}."
                )
        for match_of in (item.match_width_of, item.match_height_of):
            if match_of is not None and match_of not in by_id:
                raise ValueError(
                    f"Surface node {item.node_id!r} references unknown match target {match_of!r}."
                )

    deps: dict[str, set[str]] = {}
    for item in pending:
        d = {
            a.target
            for a in (item.left, item.right, item.top, item.bottom)
            if a is not None and a.target != "parent"
        }
        if item.match_width_of:
            d.add(item.match_width_of)
        if item.match_height_of:
            d.add(item.match_height_of)
        deps[item.node_id] = d

    resolved: dict[str, tuple[int, int, int, int]] = {}
    remaining = set(by_id)
    while remaining:
        ready = sorted(nid for nid in remaining if deps[nid] <= resolved.keys())
        if not ready:
            raise ValueError(f"Surface constraint cycle detected among nodes: {sorted(remaining)}")
        for nid in ready:
            item = by_id[nid]
            x, w = _resolve_axis(item, "x", design_width, design_height, resolved)
            y, h = _resolve_axis(item, "y", design_width, design_height, resolved)
            if w < 1 or h < 1:
                raise ValueError(
                    f"Surface node {nid!r} resolved to a non-positive size ({w}x{h}px) - "
                    "check its anchors."
                )
            resolved[nid] = (x, y, w, h)
            setattr(item.node, f"{attr_prefix}x", x)
            setattr(item.node, f"{attr_prefix}y", y)
            setattr(item.node, f"{attr_prefix}w", w)
            setattr(item.node, f"{attr_prefix}h", h)
        remaining -= set(ready)
