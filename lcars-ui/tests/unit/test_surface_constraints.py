"""DSL-level tests for anchor/constraint kwargs on lcars.surface() (Milestone 4, Phase 4.1/4.2).

Complements test_surface_constraint_resolver.py, which tests the resolver module in
isolation - this file exercises the full lcars.surface()->contract pipeline.
"""

from __future__ import annotations

import pytest

import lcars_ui as lcars
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx


def _build(build_fn) -> Manifest:
    ctx = _LCARSContext(mode=Mode.BUILD, session_id="constraints-test", builder=_ManifestBuilder())
    set_ctx(ctx)
    lcars.config("Surface Constraints Test", settings_page=False)
    build_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _surface_children(manifest: Manifest, page_id: str) -> list[Widget]:
    page = manifest.pages[page_id]
    top = [w for row in page.rows for column in row.columns for w in column.widgets]
    assert [w.type for w in top] == ["surface"]
    return top[0].children


def _by_id(children: list[Widget], node_id: str) -> Widget:
    return next(c for c in children if c.id == node_id)


def test_absolute_rect_is_unaffected_by_the_new_kwargs() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.rect(10, 20, 100, 50, id="a")

    manifest = _build(build)
    node = _by_id(_surface_children(manifest, "t"), "a")
    assert (node.x, node.y, node.w, node.h) == (10, 20, 100, 50)


def test_rect_anchored_to_parent_edges_via_plain_int_shortcut() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.rect(anchor_left=20, anchor_right=30, anchor_top=0, anchor_bottom=0, id="a")

    manifest = _build(build)
    node = _by_id(_surface_children(manifest, "t"), "a")
    assert (node.x, node.y, node.w, node.h) == (20, 0, 750, 600)


def test_region_anchored_to_another_region_edge_via_edge_anchor() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.region("rail", x=0, y=0, w=120, h=600):
                    pass
                with s.region(
                    "viewport",
                    anchor_left=lcars.edge_anchor("rail", "right", offset=24),
                    anchor_right=0,
                    anchor_top=0,
                    anchor_bottom=0,
                ):
                    lcars.text("hello")

    manifest = _build(build)
    children = _surface_children(manifest, "t")
    viewport = _by_id(children, "viewport")
    assert (viewport.x, viewport.w) == (144, 656)
    assert [w.type for w in viewport.children] == ["text"]


def test_region_declared_before_its_anchor_target_still_resolves() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.region("viewport", anchor_left=lcars.edge_anchor("rail", "right"), anchor_right=0, anchor_top=0, anchor_bottom=0):
                    pass
                with s.region("rail", x=0, y=0, w=100, h=600):
                    pass

    manifest = _build(build)
    viewport = _by_id(_surface_children(manifest, "t"), "viewport")
    assert viewport.x == 100


def test_overlap_check_still_fires_for_anchored_regions() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.region("a", x=0, y=0, w=400, h=300):
                    pass
                with s.region("b", anchor_left=100, anchor_right=100, anchor_top=0, anchor_bottom=300):
                    pass

    with pytest.raises(ValueError, match="overlap"):
        _build(build)


def test_unknown_anchor_target_raises_a_clear_error() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.rect(anchor_left=lcars.edge_anchor("nope", "right"), w=10, anchor_top=0, h=10)

    with pytest.raises(ValueError, match="unknown node id"):
        _build(build)


def test_match_width_of_via_the_dsl() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.rect(0, 0, 150, 40, id="ref")
                s.rect(
                    anchor_left=lcars.edge_anchor("ref", "left"),
                    anchor_top=60, id="twin",
                    match_width_of="ref", h=40,
                )

    manifest = _build(build)
    twin = _by_id(_surface_children(manifest, "t"), "twin")
    assert twin.w == 150


def test_anchor_kwargs_are_noops_outside_build_mode() -> None:
    ctx = _LCARSContext(mode=Mode.HANDLE, session_id="constraints-handle", builder=None)
    set_ctx(ctx)
    with lcars.surface(design_size=(800, 600)) as s:
        s.rect(anchor_left=10, w=10, anchor_top=10, h=10)
        with s.region("r", anchor_left=0, anchor_right=0, anchor_top=0, anchor_bottom=0):
            pass


def test_fluid_narrow_without_narrow_design_size_raises() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(1600, 900), narrow="fluid"):
                pass

    with pytest.raises(ValueError, match="narrow_design_size"):
        _build(build)


def test_fluid_narrow_resolves_a_second_bounds_pass_for_anchored_nodes() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(
                design_size=(1600, 900), narrow="fluid", narrow_design_size=(800, 900)
            ) as s:
                with s.region("rail", x=0, y=0, w=200, h=900):
                    pass
                with s.region(
                    "viewport",
                    anchor_left=lcars.edge_anchor("rail", "right"),
                    anchor_right=0, anchor_top=0, anchor_bottom=0,
                ):
                    pass

    manifest = _build(build)
    page = manifest.pages["t"]
    top = [w for row in page.rows for column in row.columns for w in column.widgets][0]
    assert (top.narrow_design_width, top.narrow_design_height) == (800, 900)
    viewport = _by_id(top.children, "viewport")
    rail = _by_id(top.children, "rail")
    # wide pass: viewport fills 1600 - 200 = 1400; narrow pass: 800 - 200 = 600.
    assert viewport.w == 1400
    assert viewport.narrow_w == 600
    # the rail itself is plain-absolute (no anchors) - same bounds in both passes.
    assert (rail.narrow_x, rail.narrow_y, rail.narrow_w, rail.narrow_h) == (rail.x, rail.y, rail.w, rail.h)
