"""Streaming integration tests (Phase 3)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from lcars_ui.app import create_app


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
            response = websocket.receive_json()

    assert response["type"] == "action_ack"
    assert response["payload"] == {"action_id": "btn_1", "status": "ok"}


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
        with client.websocket_connect("/lcars/ws") as ws_a, client.websocket_connect("/lcars/ws") as ws_b:
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

    assert first["type"] == "action_ack"
    assert second["type"] == "action_ack"
    assert first["payload"]["action_id"] == "shared_action"
    assert second["payload"]["action_id"] == "shared_action"


def test_http_fallback_action_returns_ack() -> None:
    with TestClient(create_app()) as client:
        response = client.post("/lcars/action/http_btn", json={"value": "go"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["type"] == "action_ack"
    assert payload["payload"] == {"action_id": "http_btn", "status": "ok"}
