"""Unit tests for Phase 8 security configuration and helpers."""

from __future__ import annotations

import json

import pytest
from fastapi import Request

from lcars_ui.server.security import (
    SCOPE_READ,
    SCOPE_STREAM,
    SCOPE_WRITE,
    SecuritySettings,
    SlidingWindowRateLimiter,
    resolve_http_principal,
    resolve_security_settings,
)


def _request_with_headers(headers: dict[str, str]) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/lcars/manifest",
        "headers": [(k.encode("utf-8"), v.encode("utf-8")) for k, v in headers.items()],
        "query_string": b"",
    }
    return Request(scope)


def test_resolve_security_settings_defaults_when_env_missing(monkeypatch) -> None:
    monkeypatch.delenv("LCARS_AUTH_REQUIRED", raising=False)
    monkeypatch.delenv("LCARS_AUTH_TOKENS", raising=False)

    settings = resolve_security_settings(cors_origins=["*"])

    assert settings.auth_required is False
    assert settings.token_scopes == {}
    assert settings.max_json_body_bytes > 0
    assert settings.max_audio_upload_bytes > 0
    assert settings.max_ws_message_bytes > 0
    assert settings.rate_limit_window_seconds > 0
    assert settings.rate_limit_max_requests > 0


def test_auth_required_rejects_missing_tokens(monkeypatch) -> None:
    monkeypatch.setenv("LCARS_AUTH_REQUIRED", "true")
    monkeypatch.delenv("LCARS_AUTH_TOKENS", raising=False)

    with pytest.raises(
        RuntimeError,
        match="LCARS_AUTH_REQUIRED=true but LCARS_AUTH_TOKENS is empty",
    ):
        resolve_security_settings(cors_origins=["http://localhost:5173"])


def test_auth_required_rejects_wildcard_cors(monkeypatch) -> None:
    monkeypatch.setenv("LCARS_AUTH_REQUIRED", "true")
    monkeypatch.setenv("LCARS_AUTH_TOKENS", json.dumps({"writer-token": [SCOPE_READ, SCOPE_WRITE]}))

    with pytest.raises(RuntimeError, match="does not allow wildcard CORS"):
        resolve_security_settings(cors_origins=["*"])


def test_http_principal_resolves_bearer_token(monkeypatch) -> None:
    monkeypatch.setenv(
        "LCARS_AUTH_TOKENS",
        json.dumps({"reader-token": [SCOPE_READ, SCOPE_STREAM]}),
    )
    settings = resolve_security_settings(cors_origins=["*"])
    request = _request_with_headers({"authorization": "Bearer reader-token"})

    principal = resolve_http_principal(request, settings)
    assert principal is not None
    assert principal.subject.startswith("token:")
    assert SCOPE_READ in principal.scopes
    assert SCOPE_STREAM in principal.scopes


def test_http_principal_returns_none_when_auth_required_and_token_unknown() -> None:
    settings = SecuritySettings(
        auth_required=True,
        token_scopes={"writer-token": frozenset({SCOPE_READ, SCOPE_WRITE})},
        max_json_body_bytes=64_000,
        max_audio_upload_bytes=5_000_000,
        max_ws_message_bytes=64_000,
        rate_limit_window_seconds=10.0,
        rate_limit_max_requests=30,
        secure_headers_enabled=True,
    )
    request = _request_with_headers({"authorization": "Bearer unknown-token"})

    principal = resolve_http_principal(request, settings)
    assert principal is None


def test_rate_limiter_enforces_threshold() -> None:
    limiter = SlidingWindowRateLimiter(window_seconds=10.0, max_requests=2)

    assert limiter.allow("key") is True
    assert limiter.allow("key") is True
    assert limiter.allow("key") is False
