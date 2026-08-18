"""Tests for lcars.surface().polar()/.track() - polar track angle/bounding-box math."""

from __future__ import annotations

import pytest

import lcars_ui as lcars
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx


def _build(build_fn) -> Manifest:
    ctx = _LCARSContext(mode=Mode.BUILD, session_id="polar-test", builder=_ManifestBuilder())
    set_ctx(ctx)
    lcars.config("Polar Test", settings_page=False)
    build_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _surface_children(manifest: Manifest, page_id: str) -> list[Widget]:
    page = manifest.pages[page_id]
    top = [w for row in page.rows for column in row.columns for w in column.widgets]
    assert [w.type for w in top] == ["surface"]
    return top[0].children


def test_full_circle_tracks_divide_evenly_with_gaps() -> None:
    def build() -> None:
        with lcars.page("Polar", id="polar", layout="authored", chrome="none"):
            with lcars.surface(design_size=(1000, 1000)) as s:
                p = s.polar(
                    center_x=500, center_y=500, inner_radius=100, outer_radius=300,
                    start_angle=0, end_angle=360, tracks=4, gap_deg=10,
                )
                for i in range(4):
                    with p.track(i):
                        lcars.text(f"track-{i}", id=f"track-text-{i}")

    manifest = _build(build)
    regions = [c for c in _surface_children(manifest, "polar") if c.type == "surface_region"]
    assert [r.id for r in regions] == [
        "polar-track-0", "polar-track-1", "polar-track-2", "polar-track-3",
    ]
    # track 0 spans angle [0, 82.5] at radius [100,300] - hand-computed bounding box.
    assert (regions[0].x, regions[0].y, regions[0].w, regions[0].h) == (513, 500, 287, 297)
    for r in regions:
        assert len(r.children) == 1
        assert r.children[0].type == "text"


def test_span_merges_contiguous_tracks_including_internal_gap() -> None:
    def build() -> None:
        with lcars.page("Polar", id="polar", layout="authored", chrome="none"):
            with lcars.surface(design_size=(1000, 1000)) as s:
                p = s.polar(
                    center_x=500, center_y=500, inner_radius=100, outer_radius=300,
                    start_angle=0, end_angle=360, tracks=4, gap_deg=10,
                )
                with p.track(0, span=2, id="merged"):
                    lcars.text("wide", id="wide-text")

    manifest = _build(build)
    regions = [c for c in _surface_children(manifest, "polar") if c.type == "surface_region"]
    assert len(regions) == 1
    assert regions[0].id == "merged"


def test_concentric_polar_rings_never_false_positive_overlap() -> None:
    # Different radius bands must not spuriously collide even though their loose
    # axis-aligned bounding boxes can overlap - the whole point of concentric rings.
    def build() -> None:
        with lcars.page("Polar", id="polar", layout="authored", chrome="none"):
            with lcars.surface(design_size=(1000, 1000)) as s:
                inner = s.polar(
                    center_x=500, center_y=500, inner_radius=100, outer_radius=300,
                    start_angle=0, end_angle=360, tracks=4, gap_deg=10, id="inner",
                )
                outer = s.polar(
                    center_x=500, center_y=500, inner_radius=350, outer_radius=400,
                    start_angle=0, end_angle=180, tracks=4, gap_deg=5, id="outer",
                )
                for i in range(4):
                    with inner.track(i):
                        lcars.text(f"inner-{i}", id=f"inner-text-{i}")
                with outer.track(0, span=2, id="outer-wide"):
                    lcars.text("outer", id="outer-text")

    manifest = _build(build)  # must not raise
    regions = [c for c in _surface_children(manifest, "polar") if c.type == "surface_region"]
    assert len(regions) == 5


def test_out_of_bounds_track_index_or_span_raises() -> None:
    def build_span_overflow() -> None:
        with lcars.page("Polar", id="polar", layout="authored", chrome="none"):
            with lcars.surface(design_size=(1000, 1000)) as s:
                p = s.polar(
                    center_x=500, center_y=500, inner_radius=100, outer_radius=300,
                    start_angle=0, end_angle=360, tracks=4,
                )
                with p.track(3, span=2):
                    pass

    with pytest.raises(ValueError, match="exceeds the declared"):
        _build(build_span_overflow)


def test_negative_track_index_raises() -> None:
    def build_negative() -> None:
        with lcars.page("Polar", id="polar", layout="authored", chrome="none"):
            with lcars.surface(design_size=(1000, 1000)) as s:
                p = s.polar(
                    center_x=500, center_y=500, inner_radius=100, outer_radius=300,
                    start_angle=0, end_angle=360, tracks=4,
                )
                with p.track(-1):
                    pass

    with pytest.raises(ValueError, match="exceeds the declared"):
        _build(build_negative)


def test_zero_tracks_rejected_at_declaration() -> None:
    def build_zero_tracks() -> None:
        with lcars.page("Polar", id="polar", layout="authored", chrome="none"):
            with lcars.surface(design_size=(1000, 1000)) as s:
                s.polar(
                    center_x=500, center_y=500, inner_radius=100, outer_radius=300,
                    start_angle=0, end_angle=360, tracks=0,
                )

    with pytest.raises(ValueError, match="tracks >= 1"):
        _build(build_zero_tracks)


def test_polar_is_a_noop_outside_build_mode() -> None:
    ctx = _LCARSContext(mode=Mode.HANDLE, session_id="polar-handle", builder=None)
    set_ctx(ctx)
    with lcars.surface(design_size=(1000, 1000)) as s:
        p = s.polar(
            center_x=500, center_y=500, inner_radius=100, outer_radius=300,
            start_angle=0, end_angle=360, tracks=4,
        )
        with p.track(0):
            pass
        with p.track(99, span=99):  # would be out-of-bounds in BUILD mode - must not raise here
            pass
