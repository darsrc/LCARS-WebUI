"""Tests for lcars.surface().text_path()/.ticks()."""

from __future__ import annotations

import pytest

import lcars_ui as lcars
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx


def _build(build_fn) -> Manifest:
    ctx = _LCARSContext(mode=Mode.BUILD, session_id="tp-test", builder=_ManifestBuilder())
    set_ctx(ctx)
    lcars.config("TextPath/Ticks Test", settings_page=False)
    build_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _surface_children(manifest: Manifest, page_id: str) -> list[Widget]:
    page = manifest.pages[page_id]
    top = [w for row in page.rows for column in row.columns for w in column.widgets]
    assert [w.type for w in top] == ["surface"]
    return top[0].children


def test_text_path_references_a_declared_path_rendering_node() -> None:
    def build() -> None:
        with lcars.page("TP", id="tp", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.arc(400, 300, 200, 0, 180, id="rim")
                s.text_path("rim", "HELLO", start_offset=10, color="white")

    manifest = _build(build)
    node = [c for c in _surface_children(manifest, "tp") if c.type == "text_path"][0]
    assert node.path_ref == "rim"
    assert node.text == "HELLO"
    assert node.start_offset == 10


@pytest.mark.parametrize("bad_type_fn", ["rect", "circle"])
def test_text_path_rejects_a_non_path_rendering_node(bad_type_fn: str) -> None:
    def build() -> None:
        with lcars.page("TP", id="tp", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                if bad_type_fn == "rect":
                    s.rect(0, 0, 10, 10, id="shape")
                else:
                    s.circle(5, 5, 5, id="shape")
                s.text_path("shape", "nope")

    with pytest.raises(ValueError, match="path-rendering node"):
        _build(build)


def test_text_path_rejects_an_unknown_id() -> None:
    def build() -> None:
        with lcars.page("TP", id="tp", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.text_path("nope", "text")

    with pytest.raises(ValueError, match="unknown node id"):
        _build(build)


def test_ticks_emits_one_stroked_path_per_tick_and_no_labels_by_default() -> None:
    def build() -> None:
        with lcars.page("TP", id="tp", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.ticks(400, 300, 250, 0, 180, 5)

    manifest = _build(build)
    children = _surface_children(manifest, "tp")
    paths = [c for c in children if c.type == "path"]
    assert len(paths) == 5
    for p in paths:
        assert p.filled is False
        assert len(p.commands) == 2
        assert p.commands[0].op == "move"
        assert p.commands[1].op == "line"
    assert not any(c.type == "surface_region" for c in children)


def test_ticks_with_labels_also_emits_one_region_per_tick() -> None:
    def build() -> None:
        with lcars.page("TP", id="tp", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.ticks(400, 300, 250, 0, 180, 5, labels=["0", "45", "90", "135", "180"])

    manifest = _build(build)
    children = _surface_children(manifest, "tp")
    assert len([c for c in children if c.type == "path"]) == 5
    assert len([c for c in children if c.type == "surface_region"]) == 5


def test_ticks_rejects_mismatched_label_count() -> None:
    def build() -> None:
        with lcars.page("TP", id="tp", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.ticks(400, 300, 250, 0, 180, 5, labels=["only", "two"])

    with pytest.raises(ValueError, match="labels length"):
        _build(build)


def test_ticks_rejects_count_below_two() -> None:
    def build() -> None:
        with lcars.page("TP", id="tp", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.ticks(400, 300, 250, 0, 180, 1)

    with pytest.raises(ValueError, match="count >= 2"):
        _build(build)


def test_text_path_and_ticks_are_noops_outside_build_mode() -> None:
    ctx = _LCARSContext(mode=Mode.HANDLE, session_id="tp-handle", builder=None)
    set_ctx(ctx)
    with lcars.surface(design_size=(800, 600)) as s:
        s.arc(1, 1, 1, 0, 90, id="r")
        s.text_path("does-not-exist", "x")
        s.ticks(1, 1, 1, 0, 90, 3, labels=["a", "b", "c"])
