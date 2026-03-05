"""Phase 8 integration tests for auth, scope boundaries, and abuse controls."""

from __future__ import annotations

import hashlib
import json

from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from lcars_ui.app import create_app
from lcars_ui.server.security import SlidingWindowRateLimiter


def _enable_security_env(
    monkeypatch,
    *,
    max_requests: int = 30,
    max_json_bytes: int = 64_000,
    max_ws_bytes: int = 64_000,
) -> None:
    tokens = {
        "reader-token": ["lcars.read", "lcars.stream"],
        "writer-token": ["lcars.read", "lcars.stream", "lcars.write"],
    }
    monkeypatch.setenv("LCARS_AUTH_REQUIRED", "true")
    monkeypatch.setenv("LCARS_CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("LCARS_AUTH_TOKENS", json.dumps(tokens))
    monkeypatch.setenv("LCARS_RATE_LIMIT_WINDOW_SECONDS", "60")
    monkeypatch.setenv("LCARS_RATE_LIMIT_MAX_REQUESTS", str(max_requests))
    monkeypatch.setenv("LCARS_MAX_JSON_BODY_BYTES", str(max_json_bytes))
    monkeypatch.setenv("LCARS_MAX_WS_MESSAGE_BYTES", str(max_ws_bytes))
    monkeypatch.setenv("LCARS_MAX_AUDIO_UPLOAD_BYTES", "100000")


def _auth(token: str) -> dict[str, str]:
    return {"authorization": f"Bearer {token}"}


def test_create_app_rejects_auth_required_without_tokens(monkeypatch) -> None:
    monkeypatch.setenv("LCARS_AUTH_REQUIRED", "true")
    monkeypatch.delenv("LCARS_AUTH_TOKENS", raising=False)
    monkeypatch.setenv("LCARS_CORS_ORIGINS", "http://localhost:5173")

    try:
        create_app()
    except RuntimeError as exc:
        assert "LCARS_AUTH_REQUIRED=true but LCARS_AUTH_TOKENS is empty" in str(exc)
    else:
        raise AssertionError("Expected startup config error for missing token configuration")


def test_create_app_rejects_wildcard_cors_in_auth_mode(monkeypatch) -> None:
    monkeypatch.setenv("LCARS_AUTH_REQUIRED", "true")
    monkeypatch.setenv("LCARS_CORS_ORIGINS", "*")
    monkeypatch.setenv(
        "LCARS_AUTH_TOKENS",
        json.dumps({"writer-token": ["lcars.read", "lcars.write"]}),
    )

    try:
        create_app()
    except RuntimeError as exc:
        assert "does not allow wildcard CORS" in str(exc)
    else:
        raise AssertionError("Expected startup config error for wildcard CORS in auth mode")


def test_manifest_requires_auth_when_enabled(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        response = client.get("/lcars/manifest")

    assert response.status_code == 401
    assert response.json()["detail"]["error"] == "auth_required"


def test_manifest_allows_reader_scope(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        response = client.get("/lcars/manifest", headers=_auth("reader-token"))

    assert response.status_code == 200
    assert response.json()["meta"]["version"] == "1.0.0"


def test_action_forbidden_for_reader_without_write_scope(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        response = client.post(
            "/lcars/action/btn_1",
            headers=_auth("reader-token"),
            json={"value": None},
        )

    assert response.status_code == 403
    assert response.json()["detail"]["error"] == "forbidden"
    assert response.json()["detail"]["required_scope"] == "lcars.write"


def test_action_accepts_writer_scope(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        response = client.post(
            "/lcars/action/btn_1",
            headers=_auth("writer-token"),
            json={"value": "go"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["type"] == "action_ack"
    assert payload["payload"] == {"action_id": "btn_1", "status": "ok"}


def test_action_rejects_oversized_payload(monkeypatch) -> None:
    _enable_security_env(monkeypatch, max_json_bytes=12)

    with TestClient(create_app()) as client:
        response = client.post(
            "/lcars/action/btn_1",
            headers={**_auth("writer-token"), "content-type": "application/json"},
            content='{"value":"01234567890123456789"}',
        )

    assert response.status_code == 413
    detail = response.json()["detail"]
    assert detail["error"] == "payload_too_large"
    assert detail["limit_bytes"] == 12


def test_sse_requires_auth_when_enabled(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        response = client.get("/lcars/events")

    assert response.status_code == 401
    assert response.json()["detail"]["error"] == "auth_required"


def test_sse_rate_limit_key_uses_token_identity(monkeypatch) -> None:
    """Verify that the SSE endpoint uses per-principal rate-limit keys.

    The SSE generator never terminates, so we cannot open a real connection in
    a synchronous test.  Instead we exhaust the rate-limiter bucket for the
    SSE channel directly and confirm the endpoint then returns 429 without
    attempting to stream.
    """
    _enable_security_env(monkeypatch, max_requests=1)

    app = create_app()
    limiter: SlidingWindowRateLimiter = app.state.rate_limiter

    # Exhaust the reader-token's SSE bucket manually.
    reader_fingerprint = hashlib.sha256(b"reader-token").hexdigest()[:12]
    sse_key = f"http_sse:token:{reader_fingerprint}"
    assert limiter.allow(sse_key)  # first call succeeds (bucket now full)

    with TestClient(app) as client:
        response = client.get("/lcars/events", headers=_auth("reader-token"))

    assert response.status_code == 429
    assert response.json()["detail"]["error"] == "rate_limited"


def test_action_rate_limit_enforced(monkeypatch) -> None:
    _enable_security_env(monkeypatch, max_requests=1)

    with TestClient(create_app()) as client:
        first = client.post(
            "/lcars/action/btn_1",
            headers=_auth("writer-token"),
            json={"value": None},
        )
        second = client.post(
            "/lcars/action/btn_1",
            headers=_auth("writer-token"),
            json={"value": None},
        )

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["detail"]["error"] == "rate_limited"


def test_audio_upload_rejects_non_audio_content_type(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        response = client.post(
            "/lcars/upload/audio",
            headers=_auth("writer-token"),
            files={"file": ("note.txt", b"hello", "text/plain")},
        )

    assert response.status_code == 415
    assert response.json()["detail"]["error"] == "unsupported_media_type"


def test_secure_headers_are_attached_to_http_responses(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        response = client.get("/lcars/schema", headers=_auth("reader-token"))

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["cache-control"] == "no-store"


def test_websocket_requires_auth(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws") as websocket:
            try:
                websocket.receive_json()
            except WebSocketDisconnect as exc:
                assert exc.code == 4401
            else:
                raise AssertionError("Expected websocket auth failure")


def test_websocket_blocks_reader_upstream_without_write_scope(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws", headers=_auth("reader-token")) as websocket:
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
                assert exc.code == 1008
            else:
                raise AssertionError("Expected websocket close for missing write scope")


def test_websocket_accepts_writer_scope(monkeypatch) -> None:
    _enable_security_env(monkeypatch)

    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws", headers=_auth("writer-token")) as websocket:
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
    assert ack["type"] == "action_ack"
    assert ack["payload"] == {"action_id": "btn_1", "status": "ok"}


def test_websocket_rate_limit_enforced(monkeypatch) -> None:
    _enable_security_env(monkeypatch, max_requests=1)

    with TestClient(create_app()) as client:
        with client.websocket_connect("/lcars/ws", headers=_auth("writer-token")) as websocket:
            websocket.send_json(
                {
                    "v": "1.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "first", "value": None},
                }
            )
            websocket.receive_json()
            websocket.receive_json()

            websocket.send_json(
                {
                    "v": "1.0",
                    "ts": 1715432000.123,
                    "type": "action",
                    "payload": {"id": "second", "value": None},
                }
            )

            try:
                websocket.receive_json()
            except WebSocketDisconnect as exc:
                assert exc.code == 1013
            else:
                raise AssertionError("Expected websocket close for rate limiting")
