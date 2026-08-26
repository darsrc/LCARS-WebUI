"""Unit tests for lcars_ui.dsl._surface_constraints - the anchor/constraint resolver.

Tests the resolver module in isolation with lightweight stub nodes (plain objects with
x/y/w/h attributes), independent of the DSL wiring covered in test_surface_constraints.py.
"""

from __future__ import annotations

import pytest

from lcars_ui.dsl._surface_constraints import (
    EdgeAnchor,
    PendingConstraint,
    resolve_surface_constraints,
)


class _Node:
    def __init__(self) -> None:
        self.x = 0
        self.y = 0
        self.w = 1
        self.h = 1


def _pending(node_id: str, **kwargs: object) -> PendingConstraint:
    return PendingConstraint(node_id=node_id, node=_Node(), **kwargs)  # type: ignore[arg-type]


def test_empty_pending_is_a_noop() -> None:
    resolve_surface_constraints(800, 600, [])


def test_fully_absolute_node_resolves_to_the_same_values() -> None:
    item = _pending("a", abs_x=10, abs_y=20, abs_w=100, abs_h=50)
    resolve_surface_constraints(800, 600, [item])
    assert (item.node.x, item.node.y, item.node.w, item.node.h) == (10, 20, 100, 50)


def test_left_and_right_anchored_to_parent_fills_the_gap() -> None:
    item = _pending(
        "a",
        left=EdgeAnchor("parent", "left", offset=20),
        right=EdgeAnchor("parent", "right", offset=30),
        top=EdgeAnchor("parent", "top", offset=0),
        bottom=EdgeAnchor("parent", "bottom", offset=0),
    )
    resolve_surface_constraints(800, 600, [item])
    assert (item.node.x, item.node.y, item.node.w, item.node.h) == (20, 0, 750, 600)


def test_left_plus_absolute_width_pins_from_the_left() -> None:
    item = _pending(
        "a",
        left=EdgeAnchor("parent", "left", offset=50),
        abs_w=200,
        top=EdgeAnchor("parent", "top", offset=10),
        abs_h=80,
    )
    resolve_surface_constraints(800, 600, [item])
    assert (item.node.x, item.node.y, item.node.w, item.node.h) == (50, 10, 200, 80)


def test_right_plus_absolute_width_pins_from_the_right() -> None:
    item = _pending(
        "a",
        right=EdgeAnchor("parent", "right", offset=40),
        abs_w=150,
        top=EdgeAnchor("parent", "top", offset=0),
        abs_h=50,
    )
    resolve_surface_constraints(800, 600, [item])
    # design width 800, right edge - offset 40 = 760, minus width 150 = 610
    assert (item.node.x, item.node.w) == (610, 150)


def test_center_x_plus_width_centers_the_node() -> None:
    item = _pending(
        "a",
        center_x=400,
        abs_w=100,
        top=EdgeAnchor("parent", "top", offset=0),
        abs_h=50,
    )
    resolve_surface_constraints(800, 600, [item])
    assert item.node.x == 350


def test_node_anchored_to_another_node_edge() -> None:
    rail = _pending("rail", abs_x=0, abs_y=0, abs_w=100, abs_h=600)
    viewport = _pending(
        "viewport",
        left=EdgeAnchor("rail", "right", offset=24),
        right=EdgeAnchor("parent", "right", offset=0),
        top=EdgeAnchor("parent", "top", offset=0),
        bottom=EdgeAnchor("parent", "bottom", offset=0),
    )
    resolve_surface_constraints(800, 600, [rail, viewport])
    assert (viewport.node.x, viewport.node.w) == (124, 676)


def test_match_width_of_copies_resolved_width() -> None:
    rail = _pending("rail", abs_x=0, abs_y=0, abs_w=120, abs_h=600)
    twin = _pending(
        "twin",
        left=EdgeAnchor("rail", "right", offset=10),
        match_width_of="rail",
        top=EdgeAnchor("parent", "top", offset=0),
        abs_h=50,
    )
    resolve_surface_constraints(800, 600, [rail, twin])
    assert (twin.node.x, twin.node.w) == (130, 120)


def test_dependency_order_is_independent_of_declaration_order() -> None:
    # viewport declared BEFORE the rail it depends on - resolver must still order correctly.
    viewport = _pending(
        "viewport",
        left=EdgeAnchor("rail", "right", offset=0),
        abs_w=200,
        top=EdgeAnchor("parent", "top", offset=0),
        abs_h=50,
    )
    rail = _pending("rail", abs_x=0, abs_y=0, abs_w=100, abs_h=600)
    resolve_surface_constraints(800, 600, [viewport, rail])
    assert viewport.node.x == 100


def test_unknown_anchor_target_raises() -> None:
    item = _pending("a", left=EdgeAnchor("does-not-exist", "right"), abs_w=100, abs_y=0, abs_h=50)
    with pytest.raises(ValueError, match="unknown node id"):
        resolve_surface_constraints(800, 600, [item])


def test_unknown_match_target_raises() -> None:
    item = _pending(
        "a",
        match_width_of="does-not-exist",
        left=EdgeAnchor("parent", "left"),
        abs_y=0,
        abs_h=50,
    )
    with pytest.raises(ValueError, match="unknown match target"):
        resolve_surface_constraints(800, 600, [item])


def test_direct_self_reference_cycle_raises() -> None:
    item = _pending("a", left=EdgeAnchor("a", "right"), abs_w=100, abs_y=0, abs_h=50)
    with pytest.raises(ValueError, match="constraint cycle"):
        resolve_surface_constraints(800, 600, [item])


def test_two_node_mutual_cycle_raises() -> None:
    a = _pending("a", left=EdgeAnchor("b", "right"), abs_w=50, abs_y=0, abs_h=50)
    b = _pending("b", left=EdgeAnchor("a", "right"), abs_w=50, abs_y=0, abs_h=50)
    with pytest.raises(ValueError, match="constraint cycle"):
        resolve_surface_constraints(800, 600, [a, b])


def test_underdetermined_axis_raises() -> None:
    item = _pending("a", abs_y=0, abs_h=50)  # no x, no w, no anchors at all
    with pytest.raises(ValueError, match="underdetermined"):
        resolve_surface_constraints(800, 600, [item])


def test_negative_resolved_size_raises() -> None:
    item = _pending(
        "a",
        left=EdgeAnchor("parent", "left", offset=750),
        right=EdgeAnchor("parent", "right", offset=100),
        top=EdgeAnchor("parent", "top", offset=0),
        abs_h=50,
    )
    with pytest.raises(ValueError, match="non-positive size"):
        resolve_surface_constraints(800, 600, [item])
