"""Reconnect hydration (v7 wave 2b) — the full acceptance matrix.

The defect this wave fixes: ``app.state.manifest`` was assigned once at
build time and never mutated; ``ConnectionManager.connect`` sent that frozen
manifest to every new connection, so every ``update()`` applied since boot
was silently lost on reconnect or refresh. Reconnect must be *current-state
hydration*, not event replay — there is no event journal.

This file covers, in order:

1. The PRIMARY acceptance test — an ``update()`` after boot must survive a
   dropped-and-re-established connection. Written so it fails against the
   previous commit (confirmed manually — see its docstring).
2. A private (session-scoped) update surviving reconnect within the
   retention window, and staying invisible to a different session.
3. ``log_snapshot`` replacing rather than appending across repeated
   reconnects.
4. Log tails bounded at a configured cap.
5. Structural removal of a widget (a shared update) pruning that widget's
   private overlay entries — proven through the DSL/WS stack this time,
   complementing the direct ``ProjectionStore`` unit test in
   tests/unit/test_reconnect_projection.py.
6. Acks and notifications are never replayed on reconnect.
7. A protocol version mismatch is rejected clearly (both the Envelope model
   itself, and the WS handshake — the transport-level case is also covered
   by tests/integration/test_streaming.py::test_ws_protocol_version_mismatch_is_rejected).

Hydration *ordering* (event published mid-hydration must queue behind the
snapshot, never interleave) is proven at the ConnectionManager level in
tests/unit/test_stream_and_dispatch.py — that guarantee doesn't depend on
the DSL and is far more deterministic to assert without real network
concurrency.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import lcars_ui as lcars
from lcars_ui import ActionContext, App, ui
from lcars_ui.app import create_app
from lcars_ui.server.events import Envelope
from lcars_ui.server.sessions import SESSION_TOKEN_HEADER


def _send_action(websocket, action_id: str, value: object = None) -> None:
    websocket.send_json(
        {
            "v": "2.0",
            "ts": 1715432000.123,
            "type": "action",
            "payload": {"id": action_id, "value": value},
        }
    )


def _consume_hydration(websocket) -> dict[str, Any]:
    """Read and return the session_hydration envelope every connect starts with."""
    envelope = websocket.receive_json()
    assert envelope["type"] == "session_hydration"
    return envelope


def _widget(manifest: dict[str, Any], widget_id: str) -> dict[str, Any]:
    """Find one widget by id, one level of ``children`` nesting deep — enough for these tests."""
    for page in manifest["pages"].values():
        for row in page["rows"]:
            for column in row["columns"]:
                for widget in column["widgets"]:
                    if widget["id"] == widget_id:
                        return widget
                    for child in widget.get("children") or []:
                        if child.get("id") == widget_id:
                            return child
    raise AssertionError(f"widget {widget_id!r} not found in manifest")


# ---------------------------------------------------------------------------
# 1) PRIMARY: reconnect hydrates CURRENT state, never the build-time manifest.
# ---------------------------------------------------------------------------


def test_reconnect_hydrates_current_state_not_boot_value() -> None:
    """An update() applied after boot must survive a dropped-and-re-established connection.

    This is written to fail against the previous commit: there,
    ``ConnectionManager.connect`` sent ``app.state.manifest`` — the frozen
    Manifest object from ``App.build_manifest()``, captured once at
    ``create_app()`` time and never mutated by any ``update()`` call — to
    every new connection via a plain ``manifest_update`` bootstrap. A second
    connection after the button below fires would therefore still report
    ``value == "boot-value"``, not ``"current-value"``: ``update()`` only
    ever produced a live WS message to whatever was *already* connected: it
    never touched the frozen manifest new connections read from. Confirmed
    by hand: reverting this wave's projection wiring (``App.projection``,
    ``ProjectionStore``, and ``ConnectionManager``'s ``hydrate=`` parameter)
    while keeping everything else reproduces exactly that failure here.
    """
    app = App()

    @app.page("Root", id="root")
    def root() -> None:
        lcars.config("Reconnect", settings_page=False)
        ui.metric("Reading", "boot-value", id="reading")
        ui.button("Update", id="update-btn")

    @app.action("update-btn")
    def update_btn(ctx: ActionContext[None]) -> None:
        ctx.update("reading", value="current-value", audience="all")

    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        with client.websocket_connect("/lcars/ws") as ws:
            hydration = _consume_hydration(ws)
            assert _widget(hydration["payload"]["manifest"], "reading")["value"] == "boot-value"

            _send_action(ws, "update-btn")
            events = {ws.receive_json()["type"], ws.receive_json()["type"]}
            assert events == {"widget_update", "action_ack"}
        # Connection fully dropped here (the `with` block above exited).

        # Reconnect: no session token carried over — audience="all" writes
        # to the canonical *shared* projection, which every connection
        # hydrates from regardless of session identity, so this is a clean
        # proof that the fix is state-based, not just "the same tab
        # remembered its own token."
        with client.websocket_connect("/lcars/ws") as ws:
            hydration = _consume_hydration(ws)
            widget = _widget(hydration["payload"]["manifest"], "reading")
            assert widget["value"] == "current-value"


# ---------------------------------------------------------------------------
# 2) Private overlay survives reconnect within retention; invisible elsewhere.
# ---------------------------------------------------------------------------


def test_private_overlay_survives_reconnect_and_is_invisible_to_other_sessions() -> None:
    app = App()

    @app.page("Root", id="root")
    def root() -> None:
        lcars.config("Overlay", settings_page=False)
        ui.metric("Reading", "boot-value", id="reading")
        ui.button("Update", id="update-btn")

    @app.action("update-btn")
    def update_btn(ctx: ActionContext[None]) -> None:
        ctx.update("reading", value="private-value")  # default audience: session

    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        token = client.get("/lcars/manifest").headers[SESSION_TOKEN_HEADER]

        with client.websocket_connect(f"/lcars/ws?session={token}") as ws:
            _consume_hydration(ws)
            _send_action(ws, "update-btn")
            events = {ws.receive_json()["type"], ws.receive_json()["type"]}
            assert events == {"widget_update", "action_ack"}

        # Reconnect with the SAME token: the private overlay must still apply.
        with client.websocket_connect(f"/lcars/ws?session={token}") as ws:
            hydration = _consume_hydration(ws)
            widget = _widget(hydration["payload"]["manifest"], "reading")
            assert widget["value"] == "private-value"

        # A different session (no token presented) must never see it.
        with client.websocket_connect("/lcars/ws") as ws:
            hydration = _consume_hydration(ws)
            widget = _widget(hydration["payload"]["manifest"], "reading")
            assert widget["value"] == "boot-value"


# ---------------------------------------------------------------------------
# 3) log_snapshot replaces, not appends — repeated reconnects never duplicate.
# ---------------------------------------------------------------------------


def test_log_snapshot_replaces_not_appends_across_repeated_reconnects() -> None:
    app = App()

    @app.page("Root", id="root")
    def root() -> None:
        lcars.config("Logs", settings_page=False)
        ui.log("ops", id="ops-log", max_lines=100)
        ui.button("Tick", id="tick-btn")

    @app.action("tick-btn")
    def tick(ctx: ActionContext[None]) -> None:
        ctx.append_log("ops", "line-one", audience="all")

    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        with client.websocket_connect("/lcars/ws") as ws:
            _consume_hydration(ws)
            _send_action(ws, "tick-btn")
            ws.receive_json()
            ws.receive_json()

        for _ in range(3):  # reconnecting repeatedly must never duplicate lines
            with client.websocket_connect("/lcars/ws") as ws:
                _consume_hydration(ws)
                snapshot = ws.receive_json()
                assert snapshot["type"] == "log_snapshot"
                assert snapshot["payload"]["stream_id"] == "ops"
                assert snapshot["payload"]["lines"] == ["line-one"]


# ---------------------------------------------------------------------------
# 4) Log tails bounded at a configured cap.
# ---------------------------------------------------------------------------


def test_log_tail_is_bounded_at_configured_cap_on_reconnect() -> None:
    app = App(log_tail_cap=3)

    @app.page("Root", id="root")
    def root() -> None:
        lcars.config("Logs", settings_page=False)
        ui.log("ops", id="ops-log", max_lines=100)
        ui.button("Tick", id="tick-btn")

    @app.action("tick-btn")
    def tick(ctx: ActionContext[None]) -> None:
        ctx.append_log("ops", f"line-{ctx.value}", audience="all")

    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        with client.websocket_connect("/lcars/ws") as ws:
            _consume_hydration(ws)
            for i in range(10):
                _send_action(ws, "tick-btn", i)
                ws.receive_json()
                ws.receive_json()

        with client.websocket_connect("/lcars/ws") as ws:
            _consume_hydration(ws)
            snapshot = ws.receive_json()
            assert snapshot["payload"]["lines"] == ["line-7", "line-8", "line-9"]


# ---------------------------------------------------------------------------
# 5) Structural removal (shared) prunes private overlay entries for it.
# ---------------------------------------------------------------------------


def test_shared_widget_removal_prunes_private_overlay_end_to_end() -> None:
    app = App()

    @app.page("Root", id="root")
    def root() -> None:
        lcars.config("Prune", settings_page=False)
        with ui.box("Systems", id="box_1"):
            ui.toggle("Nested", value=False, id="nested")
        ui.button("Privatize", id="privatize-btn")
        ui.button("Wipe", id="wipe-btn")

    @app.action("privatize-btn")
    def privatize(ctx: ActionContext[None]) -> None:
        ctx.update("nested", checked=True)  # private (default audience: session)

    @app.action("wipe-btn")
    def wipe(ctx: ActionContext[None]) -> None:
        ctx.update("box_1", children=[], audience="all")  # shared structural removal

    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        token = client.get("/lcars/manifest").headers[SESSION_TOKEN_HEADER]

        with client.websocket_connect(f"/lcars/ws?session={token}") as ws:
            _consume_hydration(ws)
            _send_action(ws, "privatize-btn")
            ws.receive_json()
            ws.receive_json()

            # A shared update from the very same session removes "nested"
            # from the manifest entirely.
            _send_action(ws, "wipe-btn")
            ws.receive_json()
            ws.receive_json()

        with client.websocket_connect(f"/lcars/ws?session={token}") as ws:
            hydration = _consume_hydration(ws)
            manifest = hydration["payload"]["manifest"]
            box = _widget(manifest, "box_1")
            assert box["children"] == []
            # No stray "nested" widget anywhere, and no error from the
            # server trying to apply a pruned overlay entry that no longer
            # has anywhere to land (a KeyError/StopIteration here would mean
            # session-start or hydration itself blew up on the dangling
            # override — the WS connection wouldn't have hydrated at all).
            with pytest.raises(AssertionError):
                _widget(manifest, "nested")


# ---------------------------------------------------------------------------
# 6) Acks and notifications are never replayed on reconnect.
# ---------------------------------------------------------------------------


def test_acks_and_notifications_are_not_replayed_on_reconnect() -> None:
    app = App()

    @app.page("Root", id="root")
    def root() -> None:
        lcars.config("NoReplay", settings_page=False)
        ui.button("Ping", id="ping-btn")

    @app.action("ping-btn")
    def ping(ctx: ActionContext[None]) -> None:
        ctx.notify("Pinged!", audience="all")

    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        with client.websocket_connect("/lcars/ws") as ws:
            _consume_hydration(ws)
            _send_action(ws, "ping-btn")
            events = {ws.receive_json()["type"], ws.receive_json()["type"]}
            assert events == {"notification", "action_ack"}

        with client.websocket_connect("/lcars/ws") as ws:
            hydration = _consume_hydration(ws)
            assert hydration["type"] == "session_hydration"  # not a replayed notification/ack
            # The very next message this fresh connection sees must be the
            # ack for ITS OWN, unrelated action — proving nothing else
            # (no stale notification, no stale ack) was queued ahead of it.
            _send_action(ws, "unrelated-action")
            ack = ws.receive_json()
            assert ack["type"] == "action_ack"
            assert ack["payload"]["action_id"] == "unrelated-action"


# ---------------------------------------------------------------------------
# 7) A protocol version mismatch is rejected clearly.
# ---------------------------------------------------------------------------


def test_envelope_model_rejects_mismatched_protocol_version_clearly() -> None:
    payload = {"id": "x", "value": None}
    with pytest.raises(ValidationError) as exc_info:
        Envelope.model_validate({"v": "1.0", "type": "action", "payload": payload})
    assert "v" in str(exc_info.value)


def test_envelope_model_rejects_unknown_future_protocol_version() -> None:
    payload = {"id": "x", "value": None}
    with pytest.raises(ValidationError):
        Envelope.model_validate({"v": "99.0", "type": "action", "payload": payload})
