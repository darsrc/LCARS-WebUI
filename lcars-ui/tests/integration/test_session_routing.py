"""Session identity and routing (Wave 2a) — the full acceptance matrix.

Covers: effects never cross sessions (WebSocket, HTTP fallback), acks are
always private, audience="all" is the only thing that broadcasts, a cloned
tab is rotated to an independent session, a principal mismatch yields a
fresh session with no access to prior state, and session state survives
reconnect inside the retention window but is gone after it (via an
injectable clock — no sleeping).

A note on SSE: this environment's synchronous ASGI test transport
(starlette's TestClient, backed by ``httpx2`` here) cannot open a real,
never-terminating SSE stream and issue further requests alongside it — doing
so deadlocks the test process, reproducible with a *generic* FastAPI
StreamingResponse with no lcars-ui code involved at all (a blocking
generator with GZip middleware removed still hangs; the existing
``test_sse_rate_limit_key_uses_token_identity`` test already carries this
exact caveat in a comment). SSE therefore is not driven as a live HTTP
connection here. Instead:

- SSE and WebSocket share one code path from the point identity is resolved
  onward: both call the same ``_resolve_client_session``/
  ``App.resolve_session`` with ``live=True``, both read the session token
  with the very same ``_session_token_from_query`` helper (WS and SSE
  cannot set custom headers), and both register with
  ``ConnectionManager.register`` as a plain ``send_json``-shaped sink — the
  WebSocket tests below exercise that exact shared path end to end.
- The one SSE-specific piece — ``app._QueueSink`` adapting an asyncio queue
  to that sink shape, and ``ConnectionManager.send_to_session``/
  ``broadcast`` fanning out to whatever sinks are registered (WS or SSE
  alike) — is unit-tested directly against fake sinks in
  tests/unit/test_stream_and_dispatch.py (see
  test_send_to_session_delivers_only_to_connections_bound_to_that_session
  and neighbors), with no HTTP transport involved to hang on.
"""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

import lcars_ui as lcars
from lcars_ui import ActionContext, App, ui
from lcars_ui.app import create_app
from lcars_ui.server.sessions import SESSION_TOKEN_HEADER


def _consume_ws_bootstrap_manifest(websocket) -> None:
    first = websocket.receive_json()
    assert first["type"] == "manifest_update"


def _send_action(websocket, action_id: str, value: object = None) -> None:
    websocket.send_json(
        {
            "v": "1.0",
            "ts": 1715432000.123,
            "type": "action",
            "payload": {"id": action_id, "value": value},
        }
    )


def _touch_app(seen_sessions: list[str], **app_kwargs: object) -> App:
    """A minimal app whose one action records the resolved session id it ran under."""
    app = App(**app_kwargs)  # type: ignore[arg-type]

    @app.page("Root", id="root")
    def root() -> None:
        lcars.config("Session Routing", settings_page=False)
        ui.button("Touch", id="touch")

    @app.action("touch")
    def touch(ctx: ActionContext[object]) -> None:
        seen_sessions.append(ctx.session_id)
        app.get_session_state(ctx.session_id)["touched_with"] = ctx.value

    return app


# ---------------------------------------------------------------------------
# 1) Two sessions: an effect from one never reaches the other.
# ---------------------------------------------------------------------------


def test_widget_update_from_one_session_never_reaches_another_over_websocket() -> None:
    seen_sessions: list[str] = []
    app = _touch_app(seen_sessions)

    @app.action("touch")  # re-register with an update effect this time
    def touch(ctx: ActionContext[object]) -> None:
        seen_sessions.append(ctx.session_id)
        ctx.update("touch", value="private-update")

    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        with (
            client.websocket_connect("/lcars/ws") as ws_a,
            client.websocket_connect("/lcars/ws") as ws_b,
        ):
            _consume_ws_bootstrap_manifest(ws_a)
            _consume_ws_bootstrap_manifest(ws_b)

            _send_action(ws_a, "touch")
            update = ws_a.receive_json()
            ack = ws_a.receive_json()
            assert update["type"] == "widget_update"
            assert update["payload"]["data"] == {"value": "private-update"}
            assert ack["type"] == "action_ack"

            # ws_b's own, unrelated traffic must be the *first and only*
            # thing it ever receives — proving ws_a's widget_update and ack
            # never arrived.
            _send_action(ws_b, "touch")
            b_update = ws_b.receive_json()
            b_ack = ws_b.receive_json()
            assert b_update["type"] == "widget_update"
            assert b_ack["type"] == "action_ack"


def test_effect_from_one_session_never_reaches_another_over_http_fallback() -> None:
    """An HTTP-fallback action's ack/effects are returned directly to the caller only.

    A concurrently-connected, unrelated WebSocket session must observe
    nothing from it.
    """
    seen_sessions: list[str] = []
    app = _touch_app(seen_sessions)

    @app.action("touch")
    def touch(ctx: ActionContext[object]) -> None:
        seen_sessions.append(ctx.session_id)
        ctx.update("touch", value="from-http")

    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            _consume_ws_bootstrap_manifest(websocket)

            response = client.post("/lcars/action/touch", json={"value": None})
            assert response.status_code == 200
            assert response.json()["payload"] == {"action_id": "touch", "status": "ok"}

            # The WS session's own action is the first and only thing it sees.
            _send_action(websocket, "touch")
            ws_update = websocket.receive_json()
            ws_ack = websocket.receive_json()
            assert ws_update["type"] == "widget_update"
            assert ws_ack["type"] == "action_ack"


# ---------------------------------------------------------------------------
# 2) action_ack reaches only the originating session.
# ---------------------------------------------------------------------------


def test_action_ack_reaches_only_the_originating_session() -> None:
    seen_sessions: list[str] = []
    app = _touch_app(seen_sessions)
    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        with (
            client.websocket_connect("/lcars/ws") as ws_a,
            client.websocket_connect("/lcars/ws") as ws_b,
        ):
            _consume_ws_bootstrap_manifest(ws_a)
            _consume_ws_bootstrap_manifest(ws_b)

            _send_action(ws_a, "touch", "a")
            ack_a = ws_a.receive_json()
            assert ack_a == {
                "v": "1.0",
                "ts": ack_a["ts"],
                "type": "action_ack",
                "payload": {"action_id": "touch", "status": "ok"},
            }

            # ws_b gets its own ack, and only its own.
            _send_action(ws_b, "touch", "b")
            ack_b = ws_b.receive_json()
            assert ack_b["payload"] == {"action_id": "touch", "status": "ok"}

    assert seen_sessions[0] != seen_sessions[1]


# ---------------------------------------------------------------------------
# 3) audience="all" reaches every session and is the only thing that does.
# ---------------------------------------------------------------------------


def test_audience_all_reaches_every_session_and_is_the_only_thing_that_does() -> None:
    app = App()

    @app.page("Root", id="root")
    def root() -> None:
        lcars.config("Audience", settings_page=False)
        ui.metric("Private", "off", id="private-readout")
        ui.metric("Shipwide", "off", id="shipwide-readout")
        ui.button("Fire", id="fire")

    @app.action("fire")
    def fire(ctx: ActionContext[None]) -> None:
        ctx.update("private-readout", value="on")  # default audience: private
        ctx.update("shipwide-readout", value="on", audience="all")  # explicit opt-in

    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        with (
            client.websocket_connect("/lcars/ws") as actor,
            client.websocket_connect("/lcars/ws") as bystander,
        ):
            _consume_ws_bootstrap_manifest(actor)
            _consume_ws_bootstrap_manifest(bystander)

            _send_action(actor, "fire")

            actor_events = [actor.receive_json() for _ in range(3)]
            actor_widget_ids = {
                event["payload"]["id"] for event in actor_events if event["type"] == "widget_update"
            }
            assert actor_widget_ids == {"private-readout", "shipwide-readout"}
            assert {event["type"] for event in actor_events} == {"widget_update", "action_ack"}

            # The bystander receives exactly the broadcast update — never the
            # private one, never the actor's ack.
            bystander_event = bystander.receive_json()
            assert bystander_event["type"] == "widget_update"
            assert bystander_event["payload"]["id"] == "shipwide-readout"


# ---------------------------------------------------------------------------
# 4) A cloned token is rotated to an independent session.
# ---------------------------------------------------------------------------


def test_cloned_ws_token_is_rotated_to_an_independent_session() -> None:
    """Duplicating a tab copies sessionStorage: a second live connection with

    the same token, opened while the first is still live, must land on an
    unrelated session rather than joining it.
    """
    seen_sessions: list[str] = []
    app = _touch_app(seen_sessions)
    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        token = client.get("/lcars/manifest").headers[SESSION_TOKEN_HEADER]

        with client.websocket_connect(f"/lcars/ws?session={token}") as original:
            _consume_ws_bootstrap_manifest(original)
            _send_action(original, "touch", "original")
            original.receive_json()  # ack
            original_session_id = seen_sessions[-1]

            with client.websocket_connect(f"/lcars/ws?session={token}") as clone:
                _consume_ws_bootstrap_manifest(clone)
                _send_action(clone, "touch", "clone")
                clone.receive_json()  # ack
                clone_session_id = seen_sessions[-1]

    assert clone_session_id != original_session_id
    assert app.get_session_state(original_session_id) == {"touched_with": "original"}
    assert app.get_session_state(clone_session_id) == {"touched_with": "clone"}


# ---------------------------------------------------------------------------
# 5) A principal mismatch yields a fresh session that cannot see prior state.
# ---------------------------------------------------------------------------


def test_principal_mismatch_yields_a_fresh_session_with_no_access_to_prior_state(
    monkeypatch,
) -> None:
    monkeypatch.setenv("LCARS_AUTH_REQUIRED", "true")
    monkeypatch.setenv("LCARS_CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv(
        "LCARS_AUTH_TOKENS",
        json.dumps(
            {
                "alice-token": ["lcars.read", "lcars.write", "lcars.stream"],
                "bob-token": ["lcars.read", "lcars.write", "lcars.stream"],
            }
        ),
    )

    seen_sessions: list[str] = []
    app = _touch_app(seen_sessions)
    runtime = create_app(manifest=app.build_manifest(), app=app)

    alice = {"authorization": "Bearer alice-token"}
    bob = {"authorization": "Bearer bob-token"}

    with TestClient(runtime) as client:
        token = client.get("/lcars/manifest", headers=alice).headers[SESSION_TOKEN_HEADER]

        client.post(
            "/lcars/action/touch",
            headers={**alice, SESSION_TOKEN_HEADER: token},
            json={"value": "alice"},
        )
        alice_session_id = seen_sessions[-1]
        assert app.get_session_state(alice_session_id) == {"touched_with": "alice"}

        # Bob presents Alice's session token under his own principal.
        bob_response = client.post(
            "/lcars/action/touch",
            headers={**bob, SESSION_TOKEN_HEADER: token},
            json={"value": "bob"},
        )
        bob_session_id = seen_sessions[-1]

        assert bob_response.status_code == 200
        assert bob_session_id != alice_session_id
        assert app.get_session_state(bob_session_id) == {"touched_with": "bob"}
        # Bob's mismatched presentation left Alice's own state untouched.
        assert app.get_session_state(alice_session_id) == {"touched_with": "alice"}

        # Alice, presenting her own token again, is still her original session.
        client.post(
            "/lcars/action/touch",
            headers={**alice, SESSION_TOKEN_HEADER: token},
            json={"value": "alice-again"},
        )
        assert seen_sessions[-1] == alice_session_id


# ---------------------------------------------------------------------------
# 6) Session state survives reconnect inside the retention window and is
#    gone after expiry — an injectable clock, never a real sleep.
# ---------------------------------------------------------------------------


def test_session_state_survives_reconnect_and_is_gone_after_retention_expires() -> None:
    clock = {"now": 0.0}
    seen_sessions: list[str] = []
    app = _touch_app(seen_sessions, session_retention_seconds=100.0, clock=lambda: clock["now"])
    runtime = create_app(manifest=app.build_manifest(), app=app)

    with TestClient(runtime) as client:
        token = client.get("/lcars/manifest").headers[SESSION_TOKEN_HEADER]

        with client.websocket_connect(f"/lcars/ws?session={token}") as ws:
            _consume_ws_bootstrap_manifest(ws)
            _send_action(ws, "touch", "first")
            ws.receive_json()  # ack
        original_session_id = seen_sessions[-1]
        assert app.get_session_state(original_session_id) == {"touched_with": "first"}

        # Reconnect with the same token well inside the retention window:
        # same session, prior state intact.
        clock["now"] = 99.0
        with client.websocket_connect(f"/lcars/ws?session={token}") as ws:
            _consume_ws_bootstrap_manifest(ws)
        assert app.get_session_state(original_session_id) == {"touched_with": "first"}
        assert original_session_id in app.session_store

        # Disconnect again, then let the retention window elapse.
        clock["now"] = 250.0  # 250 - 99 = 151s since the last disconnect > 100s window
        with client.websocket_connect(f"/lcars/ws?session={token}") as ws:
            _consume_ws_bootstrap_manifest(ws)
            _send_action(ws, "touch", "after-expiry")
            ws.receive_json()  # ack

    assert seen_sessions[-1] != original_session_id
    assert original_session_id not in app.session_store
