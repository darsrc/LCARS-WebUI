"""Streaming integration tests (Phase 3)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

from lcars_ui.app import create_app
from lcars_ui.server.events import Envelope


def test_ws_action_roundtrip_receives_action_ack() -> None:
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            websocket.send_json(
                {
                    "v": "1.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "btn_1", "value": None},
                }
            )
            upstream_seen = websocket.receive_json()
            ack = websocket.receive_json()

    assert upstream_seen["type"] == "action"
    assert upstream_seen["payload"] == {"id": "btn_1", "value": None}
    assert ack["type"] == "action_ack"
    assert ack["payload"] == {"action_id": "btn_1", "status": "ok"}


def test_ws_input_and_form_submit_receive_ack() -> None:
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            websocket.send_json(
                {
                    "v": "1.0",
                    "ts": 1715432000.123,
                    "type": "input",
                    "payload": {"id": "input_1", "value": "alpha"},
                }
            )
            _input_echo = websocket.receive_json()
            input_ack = websocket.receive_json()

            websocket.send_json(
                {
                    "v": "1.0",
                    "ts": 1715432000.123,
                    "type": "form_submit",
                    "payload": {"id": "form_1", "data": {"field": "value"}},
                }
            )
            _form_echo = websocket.receive_json()
            form_ack = websocket.receive_json()

    assert input_ack["type"] == "action_ack"
    assert input_ack["payload"] == {"action_id": "input_1", "status": "ok"}
    assert form_ack["type"] == "action_ack"
    assert form_ack["payload"] == {"action_id": "form_1", "status": "ok"}


def test_ws_protocol_version_mismatch_is_rejected() -> None:
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            websocket.send_json(
                {
                    "v": "2.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "btn_1", "value": None},
                }
            )
            try:
                websocket.receive_json()
            except WebSocketDisconnect as exc:
                assert exc.code == 1003
            else:
                raise AssertionError("Expected websocket disconnect for invalid envelope version")


def test_ws_malformed_envelope_is_rejected() -> None:
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            websocket.send_json({"type": "action"})
            try:
                websocket.receive_json()
            except WebSocketDisconnect as exc:
                assert exc.code == 1003
            else:
                raise AssertionError("Expected websocket disconnect for malformed envelope")


def test_ws_broadcast_reaches_multiple_clients() -> None:
    with TestClient(create_app()) as client:
        with (
            client.websocket_connect("/lcars/ws") as ws_a,
            client.websocket_connect("/lcars/ws") as ws_b,
        ):
            ws_a.send_json(
                {
                    "v": "1.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "shared_action", "value": None},
                }
            )
            first = ws_a.receive_json()
            second = ws_b.receive_json()

    assert first["type"] == "action"
    assert second["type"] == "action"
    assert first["payload"]["id"] == "shared_action"
    assert second["payload"]["id"] == "shared_action"


def test_http_fallback_action_returns_ack_and_notifies_ws() -> None:
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            response = client.post("/lcars/action/http_btn", json={"value": "go"})
            upstream_seen = websocket.receive_json()
            ack = websocket.receive_json()

    assert response.status_code == 200
    payload = response.json()
    assert payload["type"] == "action_ack"
    assert payload["payload"] == {"action_id": "http_btn", "status": "ok"}
    assert upstream_seen["type"] == "action"
    assert upstream_seen["payload"] == {"id": "http_btn", "value": "go"}
    assert ack["type"] == "action_ack"
    assert ack["payload"] == {"action_id": "http_btn", "status": "ok"}


def test_envelope_rejects_extra_fields() -> None:
    bad = {
        "v": "1.0",
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
    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            response = client.post(
                "/lcars/upload/audio",
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
            files={"file": ("empty.wav", b"", "audio/wav")},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "empty_audio_payload"


def test_upload_audio_adapter_failure_emits_error_notification() -> None:
    class FailingAdapter:
        def transcribe(self, audio_bytes: bytes) -> str:
            raise RuntimeError("boom")

    app = create_app()
    app.state.stt_adapter = FailingAdapter()

    with TestClient(app) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            response = client.post(
                "/lcars/upload/audio",
                files={"file": ("sample.webm", b"audio-bytes", "audio/webm")},
            )
            event = websocket.receive_json()

    assert response.status_code == 202
    assert event["type"] == "notification"
    assert event["payload"] == {"message": "Audio processing failed", "level": "error"}
