"""Integration tests: DSL → manifest build → FastAPI → WebSocket action rerun."""

from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

import lcars_ui as lcars
from lcars_ui import App
from lcars_ui.app import create_app
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx
from lcars_ui.widgets.inputs import Button

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_manifest_from(ui_fn):
    """Call ui_fn in a declaration context and return the assembled Manifest."""
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)
    ui_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _iter_widgets(widgets: list[Any]):
    for widget in widgets:
        yield widget
        children = getattr(widget, "children", None)
        if isinstance(children, list):
            yield from _iter_widgets(children)
        left_inputs = getattr(widget, "left_inputs", None)
        if isinstance(left_inputs, list):
            yield from _iter_widgets(left_inputs)
        right_inputs = getattr(widget, "right_inputs", None)
        if isinstance(right_inputs, list):
            yield from _iter_widgets(right_inputs)
        header_children = getattr(widget, "header_children", None)
        if isinstance(header_children, list):
            yield from _iter_widgets(header_children)
        rail_children = getattr(widget, "rail_children", None)
        if isinstance(rail_children, list):
            yield from _iter_widgets(rail_children)
        content_children = getattr(widget, "content_children", None)
        if isinstance(content_children, list):
            yield from _iter_widgets(content_children)


# ---------------------------------------------------------------------------
# DSL public API smoke tests (no HTTP)
# ---------------------------------------------------------------------------


def test_build_metric_appears_in_manifest() -> None:
    def ui() -> None:
        lcars.config("Test")
        lcars.metric("BTC Price", "$50,000", status="ok")

    manifest = _build_manifest_from(ui)
    page = manifest.pages["main"]
    widgets = page.rows[0].columns[0].widgets
    assert any(w.id == "btc-price" for w in _iter_widgets(widgets))


def test_build_button_appears_in_manifest() -> None:
    def ui() -> None:
        lcars.config("Test")
        lcars.button("Refresh")

    manifest = _build_manifest_from(ui)
    page = manifest.pages["main"]
    widgets = page.rows[0].columns[0].widgets
    assert any(w.id == "refresh" for w in _iter_widgets(widgets))


def test_phase13_recipes_and_raw_roundtrip_manifest_structure() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Bridge", id="bridge"):
            with lcars.console("Bridge Console"):
                with lcars.data_panel("Telemetry"):
                    lcars.metric("Shields", "100%", status="ok")
                with lcars.control_panel("Actions"):
                    lcars.button("Red Alert")
            with lcars.raw(reason="operator-defined region"):
                lcars.text("Raw Operator Notes")

    manifest = _build_manifest_from(ui)
    page = manifest.pages["bridge"]

    title_row_widgets = page.rows[0].columns[0].widgets
    assert title_row_widgets[0].type == "lcars_sweep"
    assert title_row_widgets[0].title == "Bridge"

    body_widgets = page.rows[1].columns[0].widgets
    assert body_widgets[0].type == "lcars_sweep"
    assert body_widgets[0].title == "Bridge Console"
    assert body_widgets[1].type == "text"


def test_button_returns_declared_widget() -> None:
    results: list[Button] = []

    def ui() -> None:
        results.append(lcars.button("Click Me"))

    _build_manifest_from(ui)
    assert len(results) == 1
    assert isinstance(results[0], Button)


def test_notify_enqueues_event_in_effect_context() -> None:
    effect_ctx = _LCARSContext(pending_events=[])
    set_ctx(effect_ctx)

    lcars.notify("Red alert!")

    assert effect_ctx.pending_events is not None
    assert len(effect_ctx.pending_events) == 1
    assert effect_ctx.pending_events[0].type == "notification"


def test_notify_noop_in_build_mode() -> None:
    def ui() -> None:
        lcars.notify("oops")

    build_ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(build_ctx)
    ui()
    assert build_ctx.pending_events is None


def test_set_alert_condition_noop_in_build_mode() -> None:
    build_ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(build_ctx)

    lcars.set_alert_condition("red")

    assert build_ctx.pending_events is None


def test_set_alert_condition_enqueues_manifest_update_in_effect_context() -> None:
    effect_ctx = _LCARSContext(pending_events=[])
    set_ctx(effect_ctx)

    lcars.set_alert_condition("yellow")

    assert effect_ctx.pending_events is not None
    assert len(effect_ctx.pending_events) == 1
    envelope = effect_ctx.pending_events[0]
    assert envelope.type == "manifest_update"
    assert envelope.payload.model_dump(mode="json") == {
        "path": "meta.alert_condition",
        "value": "yellow",
    }


def test_set_theme_noop_in_build_mode() -> None:
    build_ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(build_ctx)

    lcars.set_theme("tng")

    assert build_ctx.pending_events is None


def test_set_theme_enqueues_manifest_update_in_effect_context() -> None:
    effect_ctx = _LCARSContext(pending_events=[])
    set_ctx(effect_ctx)

    lcars.set_theme("romulan")

    assert effect_ctx.pending_events is not None
    assert len(effect_ctx.pending_events) == 1
    envelope = effect_ctx.pending_events[0]
    assert envelope.type == "manifest_update"
    assert envelope.payload.model_dump(mode="json") == {
        "path": "meta.theme",
        "value": "romulan",
    }
# ---------------------------------------------------------------------------
# HTTP-level: create_app(manifest=...) serves it at /lcars/manifest
# ---------------------------------------------------------------------------


def test_create_app_dsl_mode_serves_manifest() -> None:
    def ui() -> None:
        lcars.config("HTTP Test")
        lcars.metric("Uptime", "99.9%", status="ok")

    manifest = _build_manifest_from(ui)
    app = create_app(manifest=manifest)

    with TestClient(app) as client:
        resp = client.get("/lcars/manifest")
        assert resp.status_code == 200
        data = resp.json()
        assert data["meta"]["app_name"] == "HTTP Test"


def test_create_app_dsl_mode_serves_schema() -> None:
    def ui() -> None:
        lcars.config("Schema Test")

    manifest = _build_manifest_from(ui)
    app = create_app(manifest=manifest)

    with TestClient(app) as client:
        resp = client.get("/lcars/schema")
        assert resp.status_code == 200
        schema = resp.json()
        assert "properties" in schema or "title" in schema


def test_config_outside_ui_fn_is_preserved() -> None:
    """App configuration set outside a page is preserved during construction."""
    app = App()
    app.config("Pre-Run Config", theme="nemesis", subtitle="sub")

    @app.page("Home")
    def home() -> None:
        pass

    manifest = app.build_manifest()

    assert manifest.meta.app_name == "Pre-Run Config"
    assert manifest.meta.theme == "nemesis"
    assert manifest.layout.header.subtitle == "sub"
    assert manifest.meta.visual_language == "strict"
    assert manifest.meta.strict_renderer == "legacy"


def test_config_visual_language_is_preserved() -> None:
    """lcars.config(visual_language=...) should flow into manifest metadata."""
    app = App()
    app.config("Visual Language Test", visual_language="strict")

    @app.page("Home")
    def home() -> None:
        pass

    manifest = app.build_manifest()

    assert manifest.meta.visual_language == "strict"
    assert manifest.meta.strict_renderer == "legacy"


def test_config_strict_renderer_is_preserved() -> None:
    """lcars.config(strict_renderer=...) should flow into manifest metadata."""
    app = App()
    app.config("Strict Renderer Test", strict_renderer="legacy")

    @app.page("Home")
    def home() -> None:
        pass

    manifest = app.build_manifest()

    assert manifest.meta.strict_renderer == "legacy"


def test_create_app_legacy_mode_unchanged() -> None:
    """Legacy create_app() still works when the default fixtures dir exists."""
    # Call without manifest arg — original code path
    app = create_app()
    # The app object is created (though startup may or may not find fixtures).
    # Verify no DSL manifest is injected — it reads from fixtures or None.
    assert app is not None
    # Manifest in state should be whatever the fixture loader found (possibly None)
    # — we just assert the attribute exists.
    assert hasattr(app.state, "manifest")
