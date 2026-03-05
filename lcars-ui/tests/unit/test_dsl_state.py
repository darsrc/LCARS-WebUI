"""Tests for DSL context state and auto_id."""

from __future__ import annotations

import pytest

from lcars_ui.dsl._state import Mode, _LCARSContext, auto_id, get_ctx, set_ctx


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


def test_context_default_mode() -> None:
    ctx = _LCARSContext()
    assert ctx.mode == Mode.BUILD
    assert ctx.active_action_id is None


def test_set_and_get_ctx() -> None:
    ctx = _LCARSContext(mode=Mode.HANDLE, active_action_id="my-btn")
    set_ctx(ctx)
    retrieved = get_ctx()
    assert retrieved.mode == Mode.HANDLE
    assert retrieved.active_action_id == "my-btn"


def test_get_ctx_initialises_if_missing() -> None:
    # Calling get_ctx on a fresh contextvar returns a default BUILD context.
    from contextvars import ContextVar

    from lcars_ui.dsl import _state as state_mod

    old_var = state_mod._ctx_var
    state_mod._ctx_var = ContextVar("_fresh_test_ctx")
    try:
        ctx = get_ctx()
        assert ctx.mode == Mode.BUILD
    finally:
        state_mod._ctx_var = old_var


def test_require_builder_raises_outside_run() -> None:
    """Calling a widget function without run() raises a clear RuntimeError."""
    from lcars_ui.dsl._builder import _ManifestBuilder
    from lcars_ui.dsl.api import _require_builder

    ctx_no_builder = _LCARSContext(mode=Mode.BUILD, builder=None)
    with pytest.raises(RuntimeError, match="lcars.run"):
        _require_builder(ctx_no_builder)

    ctx_with_builder = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    assert _require_builder(ctx_with_builder) is ctx_with_builder.builder


def test_resolve_id_raises_on_duplicate_explicit_id() -> None:
    """Providing the same explicit id= twice in one ui_fn call raises ValueError."""
    from lcars_ui.dsl._builder import _ManifestBuilder

    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)

    import lcars_ui as lcars

    lcars.button("A", id="dupe-id")
    with pytest.raises(ValueError, match="Duplicate widget id"):
        lcars.button("B", id="dupe-id")


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

    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)

    import lcars_ui as lcars

    # Register "home" in the id pool first
    lcars.button("Home", id="home")
    # nav without explicit page should derive a unique target, avoiding "home"
    lcars.nav("Home")  # auto_id("home", ctx.registered_ids) → "home-2"
    sidebar = ctx.builder.build(ctx.config).layout.sidebar  # type: ignore[union-attr]
    assert sidebar.items[0].target_page == "home-2"
