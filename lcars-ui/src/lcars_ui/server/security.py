"""Security controls for Phase 8 hardening."""

from __future__ import annotations

import hashlib
import json
import os
import threading
from collections import defaultdict, deque
from dataclasses import dataclass
from time import monotonic

from fastapi import HTTPException, Request, WebSocket
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from starlette.types import ASGIApp

SCOPE_READ = "lcars.read"
SCOPE_WRITE = "lcars.write"
SCOPE_STREAM = "lcars.stream"

_DEFAULT_SCOPES = frozenset({SCOPE_READ, SCOPE_WRITE, SCOPE_STREAM})


@dataclass(frozen=True, slots=True)
class AuthPrincipal:
    """Identity + scope context extracted from request or websocket metadata."""

    subject: str
    scopes: frozenset[str]
    token_fingerprint: str | None = None


@dataclass(frozen=True, slots=True)
class SecuritySettings:
    """Runtime security settings resolved from environment."""

    auth_required: bool
    token_scopes: dict[str, frozenset[str]]
    max_json_body_bytes: int
    max_audio_upload_bytes: int
    max_ws_message_bytes: int
    rate_limit_window_seconds: float
    rate_limit_max_requests: int
    secure_headers_enabled: bool


def _parse_bool(raw: str | None, *, default: bool) -> bool:
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def _parse_positive_int(raw: str | None, *, default: int) -> int:
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


def _parse_positive_float(raw: str | None, *, default: float) -> float:
    if raw is None or raw.strip() == "":
        return default
    try:
        value = float(raw)
    except ValueError:
        return default
    return value if value > 0 else default


def _parse_token_scopes(raw: str | None) -> dict[str, frozenset[str]]:
    """Parse LCARS_AUTH_TOKENS from JSON or CSV syntax.

    Supported formats:
    - JSON object:
      {"token-a": ["lcars.read"], "token-b": ["lcars.read", "lcars.write"]}
    - CSV pairs:
      token-a:lcars.read|lcars.stream,token-b:lcars.read|lcars.write
    """
    if raw is None or raw.strip() == "":
        return {}

    payload = raw.strip()
    if payload.startswith("{"):
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise RuntimeError("LCARS_AUTH_TOKENS JSON payload is invalid.") from exc
        if not isinstance(parsed, dict):
            raise RuntimeError("LCARS_AUTH_TOKENS must be a JSON object when JSON format is used.")
        normalized: dict[str, frozenset[str]] = {}
        for token, scopes_raw in parsed.items():
            if not isinstance(token, str) or token.strip() == "":
                raise RuntimeError("LCARS_AUTH_TOKENS contains an invalid token key.")
            if isinstance(scopes_raw, str):
                scopes = [part.strip() for part in scopes_raw.split("|") if part.strip()]
            elif isinstance(scopes_raw, list):
                scopes = [
                    part.strip()
                    for part in scopes_raw
                    if isinstance(part, str) and part.strip()
                ]
            else:
                raise RuntimeError(
                    "LCARS_AUTH_TOKENS scope values must be strings or string arrays."
                )
            if not scopes:
                raise RuntimeError(f"LCARS_AUTH_TOKENS token '{token}' has no scopes.")
            normalized[token] = frozenset(scopes)
        return normalized

    parsed_tokens: dict[str, frozenset[str]] = {}
    entries = [entry.strip() for entry in payload.split(",") if entry.strip()]
    for entry in entries:
        if ":" not in entry:
            raise RuntimeError(
                "LCARS_AUTH_TOKENS CSV entries must follow token:scope1|scope2 format."
            )
        token, scopes_raw = entry.split(":", 1)
        token = token.strip()
        if token == "":
            raise RuntimeError("LCARS_AUTH_TOKENS contains an empty token.")
        scopes = [part.strip() for part in scopes_raw.split("|") if part.strip()]
        if not scopes:
            raise RuntimeError(f"LCARS_AUTH_TOKENS token '{token}' has no scopes.")
        parsed_tokens[token] = frozenset(scopes)
    return parsed_tokens


def resolve_security_settings(*, cors_origins: list[str]) -> SecuritySettings:
    auth_required = _parse_bool(os.getenv("LCARS_AUTH_REQUIRED"), default=False)
    token_scopes = _parse_token_scopes(os.getenv("LCARS_AUTH_TOKENS"))
    max_json_body_bytes = _parse_positive_int(
        os.getenv("LCARS_MAX_JSON_BODY_BYTES"), default=64_000
    )
    max_audio_upload_bytes = _parse_positive_int(
        os.getenv("LCARS_MAX_AUDIO_UPLOAD_BYTES"), default=5_000_000
    )
    max_ws_message_bytes = _parse_positive_int(
        os.getenv("LCARS_MAX_WS_MESSAGE_BYTES"), default=64_000
    )
    rate_limit_window_seconds = _parse_positive_float(
        os.getenv("LCARS_RATE_LIMIT_WINDOW_SECONDS"), default=10.0
    )
    rate_limit_max_requests = _parse_positive_int(
        os.getenv("LCARS_RATE_LIMIT_MAX_REQUESTS"), default=30
    )
    secure_headers_enabled = _parse_bool(os.getenv("LCARS_SECURE_HEADERS_ENABLED"), default=True)

    if auth_required and not token_scopes:
        raise RuntimeError(
            "LCARS_AUTH_REQUIRED=true but LCARS_AUTH_TOKENS is empty. "
            "Configure token scopes before enabling strict auth."
        )
    if auth_required and "*" in cors_origins:
        raise RuntimeError(
            "LCARS_AUTH_REQUIRED=true does not allow wildcard CORS. "
            "Set LCARS_CORS_ORIGINS to explicit frontend origins."
        )

    return SecuritySettings(
        auth_required=auth_required,
        token_scopes=token_scopes,
        max_json_body_bytes=max_json_body_bytes,
        max_audio_upload_bytes=max_audio_upload_bytes,
        max_ws_message_bytes=max_ws_message_bytes,
        rate_limit_window_seconds=rate_limit_window_seconds,
        rate_limit_max_requests=rate_limit_max_requests,
        secure_headers_enabled=secure_headers_enabled,
    )


def _token_fingerprint(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:12]


def _extract_bearer_token(authorization_header: str | None) -> str | None:
    if authorization_header is None:
        return None
    scheme, _, value = authorization_header.partition(" ")
    if scheme.lower() != "bearer":
        return None
    token = value.strip()
    return token or None


def _anonymous_principal() -> AuthPrincipal:
    return AuthPrincipal(subject="anonymous", scopes=_DEFAULT_SCOPES, token_fingerprint=None)


def _resolve_principal_from_token(
    token: str | None,
    settings: SecuritySettings,
) -> AuthPrincipal | None:
    if token is None:
        return None if settings.auth_required else _anonymous_principal()
    scopes = settings.token_scopes.get(token)
    if scopes is None:
        return None if settings.auth_required else _anonymous_principal()
    fingerprint = _token_fingerprint(token)
    return AuthPrincipal(
        subject=f"token:{fingerprint}",
        scopes=scopes,
        token_fingerprint=fingerprint,
    )


def resolve_http_principal(request: Request, settings: SecuritySettings) -> AuthPrincipal | None:
    token = _extract_bearer_token(request.headers.get("authorization"))
    if token is None:
        query_token = request.query_params.get("token")
        token = query_token if query_token and query_token.strip() else None
    return _resolve_principal_from_token(token, settings)


def resolve_websocket_principal(
    websocket: WebSocket,
    settings: SecuritySettings,
) -> AuthPrincipal | None:
    token = _extract_bearer_token(websocket.headers.get("authorization"))
    if token is None:
        query_token = websocket.query_params.get("token")
        token = query_token if query_token and query_token.strip() else None
    return _resolve_principal_from_token(token, settings)


def ensure_scope(principal: AuthPrincipal, scope: str) -> bool:
    return scope in principal.scopes


def auth_required_error() -> HTTPException:
    return HTTPException(status_code=401, detail={"error": "auth_required"})


def forbidden_error(scope: str) -> HTTPException:
    return HTTPException(status_code=403, detail={"error": "forbidden", "required_scope": scope})


def size_limit_error(*, limit: int, observed: int) -> HTTPException:
    return HTTPException(
        status_code=413,
        detail={
            "error": "payload_too_large",
            "limit_bytes": limit,
            "observed_bytes": observed,
        },
    )


def rate_limit_error(*, window_seconds: float, max_requests: int) -> HTTPException:
    return HTTPException(
        status_code=429,
        detail={
            "error": "rate_limited",
            "window_seconds": window_seconds,
            "max_requests": max_requests,
        },
    )


def enforce_content_length(request: Request, *, max_bytes: int) -> None:
    header = request.headers.get("content-length")
    if header is None:
        return
    try:
        content_length = int(header)
    except ValueError:
        return
    if content_length > max_bytes:
        raise size_limit_error(limit=max_bytes, observed=content_length)


def principal_identity(principal: AuthPrincipal | None, *, fallback: str) -> str:
    if principal is None:
        return fallback
    return principal.subject


class SlidingWindowRateLimiter:
    """In-memory rate limiter keyed by identity/channel."""

    def __init__(self, *, window_seconds: float, max_requests: int) -> None:
        self._window_seconds = window_seconds
        self._max_requests = max_requests
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    @property
    def window_seconds(self) -> float:
        return self._window_seconds

    @property
    def max_requests(self) -> int:
        return self._max_requests

    def allow(self, key: str) -> bool:
        now = monotonic()
        with self._lock:
            bucket = self._buckets[key]
            boundary = now - self._window_seconds
            while bucket and bucket[0] < boundary:
                bucket.popleft()
            if len(bucket) >= self._max_requests:
                return False
            bucket.append(now)
        return True


SECURE_RESPONSE_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Content-Security-Policy": (
        # https: in connect-src lets HLS players (hls.js) fetch remote manifests and
        # segments over XHR; ws:/wss: carry the live protocol.
        "default-src 'self'; connect-src 'self' https: ws: wss:; "
        # blob: is required for MSE-based playback (hls.js attaches the media stream
        # to the <video> element as a blob: URL); https: allows remote HLS sources.
        "img-src 'self' data:; media-src 'self' https: blob:;"
    ),
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach secure default headers to all HTTP responses."""

    def __init__(self, app: ASGIApp, *, enabled: bool = True) -> None:
        super().__init__(app)
        self._enabled = enabled

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        response = await call_next(request)
        if self._enabled:
            for header, value in SECURE_RESPONSE_HEADERS.items():
                response.headers.setdefault(header, value)
        return response


__all__ = [
    "SCOPE_READ",
    "SCOPE_WRITE",
    "SCOPE_STREAM",
    "AuthPrincipal",
    "SecuritySettings",
    "SlidingWindowRateLimiter",
    "SECURE_RESPONSE_HEADERS",
    "SecurityHeadersMiddleware",
    "resolve_security_settings",
    "resolve_http_principal",
    "resolve_websocket_principal",
    "ensure_scope",
    "auth_required_error",
    "forbidden_error",
    "size_limit_error",
    "rate_limit_error",
    "enforce_content_length",
    "principal_identity",
]
