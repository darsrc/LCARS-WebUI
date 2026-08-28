"""Tests for lcars.surface().effect() - CSS animation pointer node DSL (Milestone 6).

The effect() method attaches an animation spec to another already-declared surface node by id.
It does NOT render its own visual output - purely a pointer node that the frontend resolves into
inline animation/CSS-custom-property styling on the TARGET element. See SurfaceControl.tsx and
the ``lcars-surface-*`` keyframes in lcars.css.
"""

from __future__ import annotations

import pytest

import lcars_ui as lcars
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx


def _build(build_fn) -> Manifest:
    ctx = _LCARSContext(session_id="effect-test", builder=_ManifestBuilder())
    set_ctx(ctx)
    lcars.config("Effect Test", settings_page=False)
    build_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _surface_children(manifest: Manifest, page_id: str) -> list[Widget]:
    page = manifest.pages[page_id]
    top = [w for row in page.rows for column in row.columns for w in column.widgets]
    assert [w.type for w in top] == ["surface"]
    return top[0].children


def test_effect_sweep_on_circle_builds_correct_node() -> None:
    (
        "A basic sweep effect on a declared circle node builds an EffectNode with kind='sweep' "
        "and the given period_ms/direction."
    )
    def build() -> None:
        with lcars.page("E", id="e", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.circle(400, 300, 50, id="dial")
                s.effect("dial", "sweep", period_ms=1500, direction="ccw")

    manifest = _build(build)
    effect_nodes = [c for c in _surface_children(manifest, "e") if c.type == "effect"]
    assert len(effect_nodes) == 1
    e = effect_nodes[0]
    assert e.target == "dial"
    assert e.kind == "sweep"
    assert e.period_ms == 1500
    assert e.direction == "ccw"
    # pivot defaults to target's anchor (cx/cy), but we don't check it here since it depends
    # on the target shape


def test_effect_sweep_default_pivot_is_target_anchor_point() -> None:
    (
        "When pivot is not given, the effect's pivot_x/pivot_y default to the target node's own "
        "anchor point. For a circle, that's its cx/cy."
    )
    def build() -> None:
        with lcars.page("E", id="e", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.circle(400, 300, 50, id="dial")
                s.effect("dial", "sweep")

    manifest = _build(build)
    effect_nodes = [c for c in _surface_children(manifest, "e") if c.type == "effect"]
    e = effect_nodes[0]
    # Circle uses center_x/center_y as its anchor per _surface_anchor_of
    assert e.pivot_x == 400
    assert e.pivot_y == 300


def test_effect_sweep_explicit_pivot_overrides_default() -> None:
    """When pivot IS given explicitly, it overrides the default."""
    def build() -> None:
        with lcars.page("E", id="e", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.rect(100, 100, 200, 200, id="box")
                # Rect's default anchor is its center (x+w/2, y+h/2) = (200, 200)
                # But we override with explicit pivot
                s.effect("box", "sweep", pivot=(50, 50))

    manifest = _build(build)
    effect_nodes = [c for c in _surface_children(manifest, "e") if c.type == "effect"]
    e = effect_nodes[0]
    assert e.pivot_x == 50
    assert e.pivot_y == 50


def test_effect_pulse_with_colors_stores_both_colors() -> None:
    """A pulse effect with colors=("orange","lilac") stores both colors on the node."""
    def build() -> None:
        with lcars.page("E", id="e", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.arc(400, 300, 100, 0, 90, id="rim")
                s.effect("rim", "pulse", colors=("orange", "lilac"))

    manifest = _build(build)
    effect_nodes = [c for c in _surface_children(manifest, "e") if c.type == "effect"]
    e = effect_nodes[0]
    assert e.colors == ("orange", "lilac")


def test_effect_pulse_no_colors_has_none() -> None:
    """A pulse effect with no colors given has colors=None on the node (plain opacity pulse)."""
    def build() -> None:
        with lcars.page("E", id="e", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.arc(400, 300, 100, 0, 90, id="rim")
                s.effect("rim", "pulse")

    manifest = _build(build)
    effect_nodes = [c for c in _surface_children(manifest, "e") if c.type == "effect"]
    e = effect_nodes[0]
    assert e.colors is None


def test_effect_flow_on_valid_path_target_succeeds() -> None:
    """kind='flow' on a valid path-rendering target (e.g. an arc node) succeeds."""
    def build() -> None:
        with lcars.page("E", id="e", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.arc(400, 300, 150, 0, 180, id="rim")
                s.effect("rim", "flow", period_ms=2500, direction="ccw")

    manifest = _build(build)
    effect_nodes = [c for c in _surface_children(manifest, "e") if c.type == "effect"]
    assert len(effect_nodes) == 1
    e = effect_nodes[0]
    assert e.kind == "flow"
    # flow effects don't have from_angle/to_angle/pivot/ colors - just kind and period/direction


def test_effect_flow_on_non_path_target_raises_value_error() -> None:
    """kind='flow' on a NON-path-rendering target (e.g. a circle or rect) raises ValueError."""
    def build_circle() -> None:
        with lcars.page("E", id="e", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.circle(400, 300, 50, id="dial")
                s.effect("dial", "flow")

    def build_rect() -> None:
        with lcars.page("E", id="e", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                s.rect(200, 200, 100, 100, id="box")
                s.effect("box", "flow")

    for _name, fn in [("circle", build_circle), ("rect", build_rect)]:
        with pytest.raises(ValueError, match="path-rendering node"):
            _build(fn)


def test_effect_unknown_target_id_raises_value_error() -> None:
    """Referencing an unknown/undeclared target id raises ValueError."""
    def build() -> None:
        with lcars.page("E", id="e", layout="authored", chrome="none"):
            with lcars.surface(design_size=(800, 600)) as s:
                # No nodes declared - effect references a non-existent one
                s.effect("does-not-exist", "sweep")

    with pytest.raises(ValueError, match="unknown node id"):
        _build(build)
