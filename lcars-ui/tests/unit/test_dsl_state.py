"""Tests for DSL context state and auto_id."""

from __future__ import annotations

import pytest

from lcars_ui import App
from lcars_ui.core.models import Manifest
from lcars_ui.dsl._state import _LCARSContext, auto_id, get_ctx, set_ctx


def test_auto_id_basic() -> None:
    ids: set[str] = set()
    assert auto_id("BTC Price", ids) == "btc-price"
    assert "btc-price" in ids


def test_auto_id_special_chars() -> None:
    ids: set[str] = set()
    assert auto_id("RED ALERT!", ids) == "red-alert"


def test_auto_id_collision_suffix() -> None:
    ids: set[str] = set()
    first = auto_id("hello", ids)
    second = auto_id("hello", ids)
    third = auto_id("hello", ids)
    assert first == "hello"
    assert second == "hello-2"
    assert third == "hello-3"


def test_auto_id_empty_produces_widget() -> None:
    ids: set[str] = set()
    result = auto_id("", ids)
    assert result == "widget"


def test_context_defaults_to_no_declaration_or_effect_sink() -> None:
    ctx = _LCARSContext()
    assert ctx.builder is None
    assert ctx.pending_events is None


def test_set_and_get_ctx() -> None:
    ctx = _LCARSContext(session_id="my-session")
    set_ctx(ctx)
    retrieved = get_ctx()
    assert retrieved is ctx
    assert retrieved.session_id == "my-session"


def test_get_ctx_initialises_if_missing() -> None:
    # Calling get_ctx on a fresh contextvar returns a dormant context.
    from contextvars import ContextVar

    from lcars_ui.dsl import _state as state_mod

    old_var = state_mod._ctx_var
    state_mod._ctx_var = ContextVar("_fresh_test_ctx")
    try:
        ctx = get_ctx()
        assert ctx.builder is None
        assert ctx.pending_events is None
    finally:
        state_mod._ctx_var = old_var


def test_require_builder_raises_outside_app_page() -> None:
    """Calling a widget function without an App page raises a clear RuntimeError."""
    from lcars_ui.dsl._builder import _ManifestBuilder
    from lcars_ui.dsl.api import _require_builder

    ctx_no_builder = _LCARSContext(builder=None)
    with pytest.raises(RuntimeError, match="@app.page"):
        _require_builder(ctx_no_builder)

    ctx_with_builder = _LCARSContext(builder=_ManifestBuilder())
    assert _require_builder(ctx_with_builder) is ctx_with_builder.builder


def test_resolve_id_raises_on_duplicate_explicit_id() -> None:
    """Providing the same explicit id= twice in one ui_fn call raises ValueError."""
    from lcars_ui.dsl._builder import _ManifestBuilder

    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)

    from lcars_ui import ui

    ui.button("A", id="dupe-id")
    with pytest.raises(ValueError, match="Duplicate widget id"):
        ui.button("B", id="dupe-id")


def test_same_label_widget_ids_are_stable_across_manifest_builds() -> None:
    from lcars_ui import ui

    app = App()

    @app.page("Bridge", id="bridge")
    def bridge() -> None:
        ui.text("Status")
        ui.text("Status")

    first = app.build_manifest()
    second = app.build_manifest()

    def ids(manifest: Manifest) -> list[str]:
        found: list[str] = []

        def visit(value: object) -> None:
            if isinstance(value, dict):
                if value.get("type") == "text" and isinstance(value.get("id"), str):
                    found.append(value["id"])
                for child in value.values():
                    visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        visit(manifest.pages["bridge"].model_dump(mode="python"))
        return found

    assert ids(first) == ids(second) == ["status", "status-2"]


def test_live_raises_on_second_decorator() -> None:
    """Applying @lcars.live twice raises RuntimeError."""
    import lcars_ui.dsl.api as api_mod

    old_live_fn = api_mod._live_fn
    try:
        # Simulate first decorator already registered
        api_mod._live_fn = lambda: None
        with pytest.raises(RuntimeError, match="Only one @lcars.live"):
            @api_mod.live(interval=1.0)
            def _second_fn() -> None:
                pass
    finally:
        api_mod._live_fn = old_live_fn


def test_nav_uses_registered_ids_for_collision() -> None:
    """nav() without explicit page= derives target from ctx.registered_ids, not a fresh set."""
    from lcars_ui.dsl._builder import _ManifestBuilder

    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)

    from lcars_ui import advanced, ui

    # Register "home" in the id pool first
    ui.button("Home", id="home")
    # nav without explicit page should derive a unique target, avoiding "home"
    advanced.nav("Home")  # auto_id("home", ctx.registered_ids) → "home-2"
    sidebar = ctx.builder.build(ctx.config).layout.sidebar  # type: ignore[union-attr]
    assert sidebar.items[0].target_page == "home-2"
