"""Tests for lcars.surface().group() - mirror/repeat/rotate transform wrapper (Milestone 5).

Transform math itself (affine matrices) lives entirely in the frontend (surfaceTransforms.ts /
surfaceTransforms.test.ts) and is resolved at render time, not here - these tests cover only the
Python-side spec construction/validation and DSL nesting (does .rect()/.region() called inside a
.group() block attach to the group, not the surface).
"""

from __future__ import annotations

import pytest

import lcars_ui as lcars
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx


def _build(build_fn) -> Manifest:
    ctx = _LCARSContext(session_id="group-test", builder=_ManifestBuilder())
    set_ctx(ctx)
    lcars.config("Surface Group Test", settings_page=False)
    build_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _surface_children(manifest: Manifest, page_id: str) -> list[Widget]:
    page = manifest.pages[page_id]
    top = [w for row in page.rows for column in row.columns for w in column.widgets]
    assert [w.type for w in top] == ["surface"]
    return top[0].children


def test_group_with_mirror_wraps_its_children() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.group(mirror="x", id="lobe") as g:
                    g.circle(100, 100, 20, id="dial")
                    with g.region("readout", x=50, y=150, w=100, h=40):
                        lcars.text("HELLO", id="readout-text")

    manifest = _build(build)
    children = _surface_children(manifest, "t")
    assert [c.type for c in children] == ["surface_group"]
    group = children[0]
    assert group.mirror.axis == "x"
    assert group.mirror.axis_x is None  # defaults to surface center, resolved client-side
    assert [c.type for c in group.children] == ["circle", "surface_region"]
    assert group.children[0].id == "dial"
    region = group.children[1]
    assert region.id == "readout"
    assert region.children[0].type == "text"


def test_group_mirror_axis_override() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.group(mirror="xy", mirror_axis=(300, 200)) as g:
                    g.rect(0, 0, 10, 10, id="r")

    manifest = _build(build)
    group = _surface_children(manifest, "t")[0]
    assert (group.mirror.axis_x, group.mirror.axis_y) == (300, 200)


def test_group_repeat_radial() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.group(
                    repeat_radial={
                        "count": 6,
                        "center": (400, 300),
                        "start_angle": 0,
                        "end_angle": 300,
                    },
                ) as g:
                    g.path(
                        [
                            {"op": "move", "x": 400, "y": 200},
                            {"op": "line", "x": 400, "y": 150},
                        ],
                        filled=False,
                    )

    manifest = _build(build)
    group = _surface_children(manifest, "t")[0]
    spec = group.repeat_radial
    assert (spec.count, spec.center_x, spec.center_y, spec.start_angle, spec.end_angle) == (
        6,
        400,
        300,
        0,
        300,
    )


def test_group_repeat_linear() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.group(repeat_linear={"count": 4, "dx": 60, "dy": 0}) as g:
                    g.capsule(0, 0, 40, 20, id="tab")

    manifest = _build(build)
    spec = _surface_children(manifest, "t")[0].repeat_linear
    assert (spec.count, spec.dx, spec.dy) == (4, 60, 0)


def test_group_rotate_alone() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.group(rotate=45, rotate_pivot=(10, 20)) as g:
                    g.rect(0, 0, 10, 10, id="r")

    manifest = _build(build)
    group = _surface_children(manifest, "t")[0]
    assert group.rotate == 45
    assert (group.rotate_pivot_x, group.rotate_pivot_y) == (10, 20)


def test_group_rejects_multiple_transform_modes() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.group(mirror="x", repeat_linear={"count": 2, "dx": 10, "dy": 0}) as g:
                    g.rect(0, 0, 10, 10, id="r")

    with pytest.raises(ValueError, match="at most one of"):
        _build(build)


def test_group_rejects_malformed_repeat_spec() -> None:
    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.group(repeat_radial={"count": 3}) as g:  # missing start_angle/end_angle
                    g.rect(0, 0, 10, 10, id="r")

    with pytest.raises(KeyError):
        _build(build)


def test_group_children_still_get_anchor_resolution() -> None:
    """Regions declared inside a group still go through the M4 constraint resolver."""

    def build() -> None:
        with lcars.page("T", id="t", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                with s.group(mirror="x") as g:
                    with g.region("r", anchor_left=20, anchor_right=20, anchor_top=0, h=40):
                        lcars.text("x")

    manifest = _build(build)
    region = _surface_children(manifest, "t")[0].children[0]
    assert (region.x, region.w) == (20, 760)
