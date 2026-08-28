"""Tests for lcars.surface().connector() - build-time endpoint resolution by node id."""

from __future__ import annotations

import pytest

import lcars_ui as lcars
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx


def _build(build_fn) -> Manifest:
    ctx = _LCARSContext(session_id="connector-test", builder=_ManifestBuilder())
    set_ctx(ctx)
    lcars.config("Connector Test", settings_page=False)
    build_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _surface_children(manifest: Manifest, page_id: str) -> list[Widget]:
    page = manifest.pages[page_id]
    top = [w for row in page.rows for column in row.columns for w in column.widgets]
    assert [w.type for w in top] == ["surface"]
    return top[0].children


def test_connector_resolves_rect_and_circle_anchors_to_their_centers() -> None:
    def build() -> None:
        with lcars.page("Conn", id="conn", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.circle(100, 100, 20, id="a")
                s.rect(400, 300, 50, 50, id="b")
                s.connector("a", "b", style="bezier", color="orange")

    manifest = _build(build)
    conn = [c for c in _surface_children(manifest, "conn") if c.type == "connector"][0]
    assert (conn.from_x, conn.from_y) == (100, 100)
    assert (conn.to_x, conn.to_y) == (425, 325)
    assert conn.style == "bezier"
    assert conn.color == "orange"
    assert conn.layer == "overlay"


def test_connector_resolves_arc_ring_wedge_anchors_to_center_xy() -> None:
    def build() -> None:
        with lcars.page("Conn", id="conn", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.arc(50, 60, 10, 0, 90, id="a")
                s.wedge(200, 210, 0, 30, 0, 90, id="b")
                s.connector("a", "b")

    manifest = _build(build)
    conn = [c for c in _surface_children(manifest, "conn") if c.type == "connector"][0]
    assert (conn.from_x, conn.from_y) == (50, 60)
    assert (conn.to_x, conn.to_y) == (200, 210)


def test_connector_resolves_polygon_anchor_to_bounding_box_center() -> None:
    def build() -> None:
        with lcars.page("Conn", id="conn", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.polygon([(0, 0), (100, 0), (50, 50)], id="tri")
                s.circle(500, 500, 10, id="c")
                s.connector("tri", "c")

    manifest = _build(build)
    conn = [c for c in _surface_children(manifest, "conn") if c.type == "connector"][0]
    # bounding box of (0,0)-(100,0)-(50,50) is x:[0,100] y:[0,50] -> center (50, 25)
    assert (conn.from_x, conn.from_y) == (50, 25)


def test_connector_resolves_region_anchor_to_bounding_box_center() -> None:
    def build() -> None:
        with lcars.page("Conn", id="conn", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.region("r1", x=100, y=100, w=200, h=100):
                    lcars.text("hello")
                s.circle(500, 500, 10, id="c")
                s.connector("r1", "c")

    manifest = _build(build)
    conn = [c for c in _surface_children(manifest, "conn") if c.type == "connector"][0]
    assert (conn.from_x, conn.from_y) == (200, 150)


def test_connector_to_a_declared_after_it_is_rejected() -> None:
    # Endpoints must be declared before the connector references them - there is no forward-
    # reference resolution (the lookup only searches what has been added to the surface so far).
    def build() -> None:
        with lcars.page("Conn", id="conn", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.circle(1, 1, 1, id="a")
                s.connector("a", "b")
                s.circle(2, 2, 1, id="b")

    with pytest.raises(ValueError, match="unknown node id"):
        _build(build)


def test_connector_unknown_from_id_is_rejected() -> None:
    def build() -> None:
        with lcars.page("Conn", id="conn", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.circle(1, 1, 1, id="a")
                s.connector("nope", "a")

    with pytest.raises(ValueError, match="unknown node id"):
        _build(build)
