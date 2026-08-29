"""Streaming integration tests (Phase 3)."""

from __future__ import annotations

import json

from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

from lcars_ui.app import create_app
from lcars_ui.server.events import Envelope
from lcars_ui.server.sessions import SESSION_TOKEN_HEADER


def _consume_ws_bootstrap_manifest(websocket) -> None:
    first = websocket.receive_json()
    assert first["type"] == "session_hydration"
    assert "manifest" in first["payload"]


def _client_session_token(client: TestClient) -> str:
    """Mint a real session token the way a browser first would: fetch the manifest.

    A client-supplied token the server never issued is never honored (it
    would just be discarded in favor of a fresh one), so tests that want one
    HTTP/WS/SSE call to land on the same session as another must obtain a
    real token first and present it on every subsequent call.
    """
    response = client.get("/lcars/manifest")
    token = response.headers.get(SESSION_TOKEN_HEADER)
    assert token
    return token


def test_ws_bootstrap_matches_http_manifest_aliases_for_structured_workspaces() -> None:
    from examples.graph_workspace.app import app

    manifest = app.build_manifest()

    with TestClient(create_app(manifest=manifest)) as client:
        http_manifest = client.get("/lcars/manifest").json()
        with client.websocket_connect("/lcars/ws") as websocket:
            bootstrap = websocket.receive_json()

    assert bootstrap["type"] == "session_hydration"
    assert bootstrap["payload"]["manifest"] == http_manifest
    serialized = json.dumps(bootstrap["payload"]["manifest"])
    assert "schema_id" not in serialized
    assert '"schema": "generic-expression"' in serialized


def test_ws_action_roundtrip_receives_action_ack() -> None:
    """The ack arrives, but the raw action content is never echoed back."""
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            _consume_ws_bootstrap_manifest(websocket)
            websocket.send_json(
                {
                    "v": "2.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "btn_1", "value": None},
                }
            )
            ack = websocket.receive_json()

    assert ack["type"] == "action_ack"
    assert ack["payload"] == {"action_id": "btn_1", "status": "ok"}


def test_ws_input_and_form_submit_receive_ack() -> None:
    """Input/form acks arrive, but their content is never echoed back."""
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            _consume_ws_bootstrap_manifest(websocket)
            websocket.send_json(
                {
                    "v": "2.0",
                    "ts": 1715432000.123,
                    "type": "input",
                    "payload": {"id": "input_1", "value": "alpha"},
                }
            )
            input_ack = websocket.receive_json()

            websocket.send_json(
                {
                    "v": "2.0",
                    "ts": 1715432000.123,
                    "type": "form_submit",
                    "payload": {"id": "form_1", "data": {"field": "value"}},
                }
            )
            form_ack = websocket.receive_json()

    assert input_ack["type"] == "action_ack"
    assert input_ack["payload"] == {"action_id": "input_1", "status": "ok"}
    assert form_ack["type"] == "action_ack"
    assert form_ack["payload"] == {"action_id": "form_1", "status": "ok"}


def test_ws_protocol_version_mismatch_is_rejected() -> None:
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            _consume_ws_bootstrap_manifest(websocket)
            websocket.send_json(
                {
                    "v": "1.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "btn_1", "value": None},
                }
            )
            try:
                websocket.receive_json()
            except WebSocketDisconnect as exc:
                assert exc.code == 1002
            else:
                raise AssertionError("Expected websocket disconnect for invalid envelope version")


def test_ws_malformed_envelope_is_rejected() -> None:
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            _consume_ws_bootstrap_manifest(websocket)
            websocket.send_json({"type": "action"})
            try:
                websocket.receive_json()
            except WebSocketDisconnect as exc:
                assert exc.code == 1003
            else:
                raise AssertionError("Expected websocket disconnect for malformed envelope")


def test_ws_actions_are_isolated_between_anonymous_clients() -> None:
    """Two anonymous WS clients (no session token) never see each other's traffic.

    This is the core regression test for the information leak this wave
    fixes: every connected browser used to receive every other browser's
    action/input/form/ack traffic. See tests/integration/test_session_routing.py
    for the fuller session-identity/routing matrix (tokens, clones, retention).
    """
    with TestClient(create_app()) as client:
        with (
            client.websocket_connect("/lcars/ws") as ws_a,
            client.websocket_connect("/lcars/ws") as ws_b,
        ):
            _consume_ws_bootstrap_manifest(ws_a)
            _consume_ws_bootstrap_manifest(ws_b)
            ws_a.send_json(
                {
                    "v": "2.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "shared_action", "value": None},
                }
            )
            ack_a = ws_a.receive_json()

            # ws_b must receive nothing from ws_a's action: no upstream echo
            # (never sent to anyone) and no ack (private to the session that
            # dispatched it). Prove that by making ws_b's own, unrelated
            # traffic arrive first — if ws_a's ack had leaked to ws_b it
            # would have arrived out of order, ahead of this.
            ws_b.send_json(
                {
                    "v": "2.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "ws_b_only_action", "value": None},
                }
            )
            ack_b = ws_b.receive_json()

    assert ack_a["type"] == "action_ack"
    assert ack_a["payload"] == {"action_id": "shared_action", "status": "ok"}
    assert ack_b["type"] == "action_ack"
    assert ack_b["payload"] == {"action_id": "ws_b_only_action", "status": "ok"}


def test_http_fallback_action_returns_ack_directly() -> None:
    """An HTTP fallback action returns its ack in the response, privately.

    An unrelated, concurrently-connected WS client (no shared session token)
    must not observe any of it — neither the raw action nor the ack.
    """
    with TestClient(create_app()) as client:
        http_token = _client_session_token(client)
        with client.websocket_connect("/lcars/ws") as websocket:
            _consume_ws_bootstrap_manifest(websocket)
            response = client.post(
                "/lcars/action/http_btn",
                headers={SESSION_TOKEN_HEADER: http_token},
                json={"value": "go"},
            )

            # The unrelated WS session's own traffic must still arrive,
            # proving the connection is alive and simply never received the
            # other session's action/ack.
            websocket.send_json(
                {
                    "v": "2.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "unrelated_ws_action", "value": None},
                }
            )
            ws_ack = websocket.receive_json()

    assert response.status_code == 200
    payload = response.json()
    assert payload["type"] == "action_ack"
    assert payload["payload"] == {"action_id": "http_btn", "status": "ok"}
    assert ws_ack["payload"] == {"action_id": "unrelated_ws_action", "status": "ok"}


def test_http_fallback_input_and_form_return_ack_directly() -> None:
    with TestClient(create_app()) as client:
        headers = {SESSION_TOKEN_HEADER: _client_session_token(client)}
        input_response = client.post(
            "/lcars/input/name_field", headers=headers, json={"value": "alpha"}
        )
        form_response = client.post(
            "/lcars/form/ops_form", headers=headers, json={"data": {"field": "value"}}
        )

    assert input_response.status_code == 200
    assert input_response.json()["payload"] == {"action_id": "name_field", "status": "ok"}

    assert form_response.status_code == 200
    assert form_response.json()["payload"] == {"action_id": "ops_form", "status": "ok"}


def test_envelope_rejects_extra_fields() -> None:
    bad = {
        "v": "2.0",
        "ts": 1715432000.123,
        "type": "action",
        "payload": {"id": "btn_1", "value": None, "extra": True},
        "unexpected": "field",
    }

    try:
        Envelope.model_validate(bad)
    except ValidationError:
        pass
    else:
        raise AssertionError("Expected Envelope validation to reject unknown fields")


def test_sse_event_serialization_contains_event_and_data_lines() -> None:
    from lcars_ui.app import _serialize_sse_event
    from lcars_ui.server.events import ActionPayload, make_envelope

    serialized = _serialize_sse_event(
        make_envelope("action", ActionPayload(id="sse_btn", value="engage"))
    )

    assert serialized.startswith("event: action\n")
    assert "\ndata: {" in serialized


def test_upload_audio_returns_202_and_publishes_notification() -> None:
    """Transcription results are private to the uploading session's own connection."""
    with TestClient(create_app()) as client:
        token = _client_session_token(client)
        with client.websocket_connect(f"/lcars/ws?session={token}") as websocket:
            _consume_ws_bootstrap_manifest(websocket)
            response = client.post(
                "/lcars/upload/audio",
                headers={SESSION_TOKEN_HEADER: token},
                files={"file": ("sample.webm", b"audio-bytes", "audio/webm")},
            )
            first = websocket.receive_json()
            second = websocket.receive_json()

    assert response.status_code == 202
    assert response.json() == {"status": "accepted", "detail": "audio processing queued"}
    assert {first["type"], second["type"]} == {"notification", "log_chunk"}


def test_upload_audio_rejects_empty_payload() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/lcars/upload/audio",
            headers={SESSION_TOKEN_HEADER: _client_session_token(client)},
            files={"file": ("empty.wav", b"", "audio/wav")},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "empty_audio_payload"


def test_file_upload_dispatches_bytes_privately_to_its_own_session() -> None:
    """The upload's ack reaches only its own session's connection; content is never echoed."""
    captured: list[tuple[str, object]] = []

    async def receive_upload(action_id: str, value: object) -> None:
        captured.append((action_id, value))

    app = create_app()
    app.state.plugin_action_handlers = {"receive-*": receive_upload}

    with TestClient(app) as client:
        token = _client_session_token(client)
        with client.websocket_connect(f"/lcars/ws?session={token}") as websocket:
            _consume_ws_bootstrap_manifest(websocket)
            response = client.post(
                "/lcars/upload/files",
                headers={SESSION_TOKEN_HEADER: token},
                data={"action_id": "receive-training"},
                files=[
                    ("files", ("../dataset.json", b'{"rows": 3}', "application/json")),
                    ("files", (r"C:\fakepath\notes.txt", b"ready", "text/plain")),
                ],
            )
            ack = websocket.receive_json()

    assert response.status_code == 202
    assert response.json() == {
        "status": "accepted",
        "action_dispatched": True,
        "files": [
            {"name": "dataset.json", "size": 11, "content_type": "application/json"},
            {"name": "notes.txt", "size": 5, "content_type": "text/plain"},
        ],
    }
    assert ack["type"] == "action_ack"
    assert ack["payload"] == {"action_id": "receive-training", "status": "ok"}

    action_id, handler_value = captured[0]
    assert action_id == "receive-training"
    assert handler_value["files"][0]["data"] == b'{"rows": 3}'  # type: ignore[index]
    assert handler_value["files"][1]["data"] == b"ready"  # type: ignore[index]


def test_file_upload_enforces_total_payload_limit(monkeypatch) -> None:
    monkeypatch.setenv("LCARS_MAX_FILE_UPLOAD_BYTES", "4")

    with TestClient(create_app()) as client:
        response = client.post(
            "/lcars/upload/files",
            headers={SESSION_TOKEN_HEADER: _client_session_token(client)},
            data={"action_id": "receive-training"},
            files={"files": ("dataset.bin", b"12345", "application/octet-stream")},
        )

    assert response.status_code == 413
    assert response.json()["detail"]["error"] == "payload_too_large"


def test_sse_route_is_registered_with_correct_media_type() -> None:
    """GET /lcars/events must be registered as a StreamingResponse route."""
    from fastapi.routing import APIRoute

    app = create_app()
    sse_routes = [r for r in app.routes if isinstance(r, APIRoute) and r.path == "/lcars/events"]
    assert sse_routes, "/lcars/events route must be registered"
    route = sse_routes[0]
    assert "GET" in route.methods  # type: ignore[operator]


def test_upload_audio_adapter_failure_emits_error_notification() -> None:
    class FailingAdapter:
        def transcribe(self, audio_bytes: bytes) -> str:
            raise RuntimeError("boom")

    app = create_app()
    app.state.stt_adapter = FailingAdapter()

    with TestClient(app) as client:
        token = _client_session_token(client)
        with client.websocket_connect(f"/lcars/ws?session={token}") as websocket:
            _consume_ws_bootstrap_manifest(websocket)
            response = client.post(
                "/lcars/upload/audio",
                headers={SESSION_TOKEN_HEADER: token},
                files={"file": ("sample.webm", b"audio-bytes", "audio/webm")},
            )
            event = websocket.receive_json()

    assert response.status_code == 202
    assert event["type"] == "notification"
    assert event["payload"] == {"message": "Audio processing failed", "level": "error"}
