"""Tests for nesting compositions and surfaces inside lcars.surface() regions (Milestone 7)."""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx


def _build(build_fn) -> Manifest:
    ctx = _LCARSContext(
        session_id="nested-composition-test",
        builder=_ManifestBuilder(),
    )
    set_ctx(ctx)
    lcars.config("Surface Nested Composition Test", settings_page=False)
    build_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _surface_children(manifest: Manifest, page_id: str) -> list[Widget]:
    page = manifest.pages[page_id]
    top = [w for row in page.rows for column in row.columns for w in column.widgets]
    assert [w.type for w in top] == ["surface"]
    return top[0].children


def test_composition_nests_inside_a_surface_region() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.region("panel", x=50, y=50, w=700, h=500):
                    with lcars.composition(columns=["1fr", "1fr"], rows=["1fr"]) as grid:
                        with grid.area("a1", row=1, column=1):
                            lcars.text("hello")

    manifest = _build(build)
    region = _surface_children(manifest, "t")[0]
    assert region.type == "surface_region"
    assert [child.type for child in region.children] == ["authored_composition"]


def test_surface_nests_inside_a_surface_region() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.region("panel", x=50, y=50, w=700, h=500):
                    with lcars.surface(design_size=(400, 300), id="inner") as inner:
                        inner.circle(200, 150, 50, id="inner-dial")

    manifest = _build(build)
    region = _surface_children(manifest, "t")[0]
    assert region.type == "surface_region"
    assert [child.type for child in region.children] == ["surface"]
    inner = region.children[0]
    assert [(child.type, child.id) for child in inner.children] == [("circle", "inner-dial")]
