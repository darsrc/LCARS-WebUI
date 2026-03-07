"""Integration tests: DSL → manifest build → FastAPI → WebSocket action rerun."""

from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

import lcars_ui as lcars
from lcars_ui.app import create_app
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import (
    Mode,
    _LCARSContext,
    clear_session_state,
    get_ctx,
    get_session_state,
    set_ctx,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_manifest_from(ui_fn):
    """Call ui_fn in BUILD mode and return the assembled Manifest."""
    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
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


def test_button_returns_false_in_build_mode() -> None:
    results: list[bool] = []

    def ui() -> None:
        results.append(lcars.button("Click Me"))

    _build_manifest_from(ui)
    assert results == [False]


def test_button_returns_true_in_handle_mode() -> None:
    results: list[bool] = []

    def ui() -> None:
        results.append(lcars.button("Go", id="go-btn"))

    # Build first so IDs are registered
    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(build_ctx)
    ui()

    # Now simulate a handle rerun
    handle_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        active_action_id="go-btn",
        active_action_value=None,
        builder=_ManifestBuilder(),
        config=build_ctx.config,
    )
    set_ctx(handle_ctx)
    ui()
    assert results[-1] is True


def test_notify_enqueues_event_in_handle_mode() -> None:
    def ui() -> None:
        if lcars.button("Alert", id="alert-btn"):
            lcars.notify("Red alert!")

    handle_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        active_action_id="alert-btn",
        active_action_value=None,
        builder=_ManifestBuilder(),
    )
    set_ctx(handle_ctx)
    ui()
    assert len(handle_ctx.pending_events) == 1
    assert handle_ctx.pending_events[0].type == "notification"


def test_notify_noop_in_build_mode() -> None:
    def ui() -> None:
        lcars.notify("oops")

    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(build_ctx)
    ui()
    assert build_ctx.pending_events == []


def test_toggle_persists_value() -> None:
    def ui() -> None:
        lcars.toggle("My Toggle", id="my-toggle")

    # Handle rerun — toggle flipped to True
    session_id = "dsl-test-toggle"
    clear_session_state(session_id)
    handle_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id=session_id,
        active_action_id="my-toggle",
        active_action_value=True,
        builder=_ManifestBuilder(),
    )
    set_ctx(handle_ctx)
    ui()
    assert get_session_state(session_id).get("my-toggle") is True


def test_select_persists_value() -> None:
    def ui() -> None:
        lcars.select("My Select", ["A", "B", "C"], id="my-select")

    session_id = "dsl-test-select"
    clear_session_state(session_id)
    handle_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id=session_id,
        active_action_id="my-select",
        active_action_value="B",
        builder=_ManifestBuilder(),
    )
    set_ctx(handle_ctx)
    ui()
    assert get_session_state(session_id).get("my-select") == "B"


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


def test_ws_action_triggers_dsl_rerun_and_publishes_events() -> None:
    """Full WS round-trip: action in → DSL _dsl_action_handler fires → ack + notification out."""
    clicked_in_handle: list[bool] = []

    def ui() -> None:
        lcars.config("WS Test")
        was_clicked = lcars.button("Ping", id="ws-ping-btn")
        clicked_in_handle.append(was_clicked)
        if was_clicked:
            lcars.notify("Pong!")

    manifest = _build_manifest_from(ui)
    clicked_in_handle.clear()  # discard BUILD-mode False

    app = create_app(manifest=manifest)
    event_bus = app.state.event_bus

    async def _dsl_handler(action_id: str, value: Any) -> None:
        handle_ctx = _LCARSContext(
            mode=Mode.HANDLE,
            active_action_id=action_id,
            active_action_value=value,
            builder=_ManifestBuilder(),
        )
        set_ctx(handle_ctx)
        ui()
        for envelope in handle_ctx.pending_events:
            await event_bus.publish(envelope)

    app.state.plugin_action_handlers["*"] = _dsl_handler

    received: list[dict] = []
    with TestClient(app) as client:
        with client.websocket_connect("/lcars/ws") as ws:
            initial = ws.receive_json()
            assert initial["type"] == "manifest_update"
            assert initial["payload"]["path"] == ""
            ws.send_json(
                {
                    "v": "1.0",
                    "ts": 0.0,
                    "type": "action",
                    "payload": {"id": "ws-ping-btn", "value": None},
                }
            )
            # Collect messages until we see the action_ack (it arrives last).
            for _ in range(10):
                msg = ws.receive_json()
                received.append(msg)
                if msg["type"] == "action_ack":
                    break

    types = [m["type"] for m in received]
    assert "action_ack" in types
    assert received[-1]["payload"]["action_id"] == "ws-ping-btn"
    assert "notification" in types
    notif = next(m for m in received if m["type"] == "notification")
    assert notif["payload"]["message"] == "Pong!"
    # DSL handler ran in HANDLE mode — button returned True exactly once
    assert clicked_in_handle.count(True) == 1


def test_config_outside_ui_fn_is_preserved() -> None:
    """lcars.config() called before run() must survive the BUILD-phase context reset."""
    import lcars_ui as lcars_mod

    # Set config on the module-level context (simulates calling lcars.config() at module scope)
    lcars_mod.config("Pre-Run Config", theme="nemesis", subtitle="sub")

    # Simulate what run() does: preserve pre-existing config, then call ui_fn
    pre_config = get_ctx().config
    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder(), config=pre_config)
    set_ctx(build_ctx)

    def ui() -> None:
        pass  # does NOT call lcars.config() again

    ui()
    assert build_ctx.builder is not None
    manifest = build_ctx.builder.build(build_ctx.config)

    assert manifest.meta.app_name == "Pre-Run Config"
    assert manifest.meta.theme == "nemesis"
    assert manifest.layout.header.subtitle == "sub"
    assert manifest.meta.visual_language == "strict"


def test_config_visual_language_is_preserved() -> None:
    """lcars.config(visual_language=...) should flow into manifest metadata."""
    import lcars_ui as lcars_mod

    lcars_mod.config("Visual Language Test", visual_language="classic")

    pre_config = get_ctx().config
    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder(), config=pre_config)
    set_ctx(build_ctx)

    def ui() -> None:
        pass

    ui()
    assert build_ctx.builder is not None
    manifest = build_ctx.builder.build(build_ctx.config)

    assert manifest.meta.visual_language == "classic"


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
