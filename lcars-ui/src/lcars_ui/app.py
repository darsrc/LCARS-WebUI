"""FastAPI app factory for LCARS endpoints and realtime transport."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from typing import Annotated, Any, cast

from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi import (
    Form as FormField,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from lcars_ui.application import App, get_default_app
from lcars_ui.core.models import Manifest
from lcars_ui.plugins.loader import PluginLoader, dispatch_plugin_action
from lcars_ui.server.events import (
    PROTOCOL_VERSION,
    ActionAckPayload,
    ActionPayload,
    Envelope,
    FormSubmitPayload,
    InputPayload,
    LogChunkPayload,
    NotificationPayload,
    UpstreamType,
    make_envelope,
)
from lcars_ui.server.security import (
    SCOPE_READ,
    SCOPE_STREAM,
    SCOPE_WRITE,
    AuthPrincipal,
    SecurityHeadersMiddleware,
    SlidingWindowRateLimiter,
    auth_required_error,
    enforce_content_length,
    ensure_scope,
    forbidden_error,
    principal_identity,
    rate_limit_error,
    resolve_http_principal,
    resolve_security_settings,
    resolve_websocket_principal,
    size_limit_error,
)
from lcars_ui.server.sessions import (
    SESSION_TOKEN_HEADER,
    SESSION_TOKEN_QUERY,
    ResolvedSession,
)
from lcars_ui.server.stream import EventBus
from lcars_ui.server.stt import MockSTTAdapter, STTAdapter

LOGGER = logging.getLogger(__name__)
_UNSET_HANDLER_VALUE = object()

_STATIC_DIR = Path(__file__).parent / "_static"
_STATIC_AVAILABLE = (_STATIC_DIR / "index.html").exists()

FIXTURE_FILES = {
    "manifest": "manifest.v1.json",
    "schema": "schema.v1.json",
}


class ArtifactError(RuntimeError):
    """Raised when fixture artifacts cannot be loaded."""


class SchemaDocument(BaseModel):
    """Typed JSON Schema document envelope with permissive extra fields."""

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    schema_uri: str | None = Field(default=None, alias="$schema")
    title: str | None = None
    type: str | None = None
    properties: dict[str, Any] | None = None


class ActionRequest(BaseModel):
    """HTTP fallback action request payload."""

    value: Any = None


class InputRequest(BaseModel):
    """HTTP fallback input request payload."""

    value: str = ""


class FormRequest(BaseModel):
    """HTTP fallback form submit request payload."""

    data: dict[str, Any] = Field(default_factory=dict)


class AudioUploadAccepted(BaseModel):
    """Asynchronous upload acknowledgement payload."""

    status: str = "accepted"
    detail: str = "audio processing queued"


class FileUploadMetadata(BaseModel):
    """Safe metadata returned to the browser after a generic upload."""

    name: str
    size: int = Field(ge=0)
    content_type: str | None = None


class FileUploadAccepted(BaseModel):
    """Generic multipart upload acknowledgement."""

    status: str = "accepted"
    action_dispatched: bool = True
    files: list[FileUploadMetadata] = Field(default_factory=list)


def _default_fixtures_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "fixtures" / "golden"


def _parse_cors_origins(raw_value: str | None) -> list[str]:
    if raw_value is None or raw_value.strip() == "":
        return ["*"]

    origins = [item.strip() for item in raw_value.split(",") if item.strip()]
    return origins or ["*"]


def _resolve_fixtures_dir() -> Path:
    override = os.getenv("LCARS_FIXTURES_DIR")
    if override:
        return Path(override).expanduser().resolve()
    return _default_fixtures_dir()


def _read_json_artifact(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ArtifactError(f"Artifact file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ArtifactError(f"Artifact JSON is invalid: {path} ({exc})") from exc

    if not isinstance(payload, dict):
        raise ArtifactError(f"Artifact payload must be a JSON object: {path}")
    return payload


def _load_artifact(artifact: str, fixtures_dir: Path) -> dict[str, Any]:
    try:
        filename = FIXTURE_FILES[artifact]
    except KeyError as exc:
        raise ArtifactError(f"Unknown artifact type: {artifact}") from exc

    return _read_json_artifact(fixtures_dir / filename)


def _artifact_error_response(error: ArtifactError, path: Path) -> HTTPException:
    return HTTPException(
        status_code=500,
        detail={
            "error": "artifact_read_failed",
            "detail": str(error),
            "path": str(path),
        },
    )


def _extract_action_id(payload: ActionPayload | InputPayload | FormSubmitPayload) -> str:
    return payload.id


def _extract_action_value(payload: ActionPayload | InputPayload | FormSubmitPayload) -> Any:
    if isinstance(payload, FormSubmitPayload):
        return payload.data
    return payload.value


def _serialize_sse_payload(payload: dict[str, Any]) -> str:
    return f"event: {payload['type']}\ndata: {json.dumps(payload)}\n\n"


def _serialize_sse_event(envelope: Envelope) -> str:
    return _serialize_sse_payload(envelope.model_dump(mode="json"))


def _session_token_from_headers(request: Request) -> str | None:
    """Read the client's session token from the HTTP header (never a query param).

    Regular HTTP requests can set custom headers, so the header is the
    primary carrier here and is never logged.
    """
    token = request.headers.get(SESSION_TOKEN_HEADER)
    return token.strip() if token and token.strip() else None


def _session_token_from_query(source: Request | WebSocket) -> str | None:
    """Read the client's session token from the query string.

    Only used for WebSocket and SSE: the browser's native ``WebSocket`` and
    ``EventSource`` APIs cannot set custom request headers, so the token
    travels as a query parameter for those two transports instead.
    """
    token = source.query_params.get(SESSION_TOKEN_QUERY)
    return token.strip() if token and token.strip() else None


class _QueueSink:
    """Adapt an asyncio queue to the ``send_json`` sink protocol ``ConnectionManager`` expects.

    Lets one SSE connection register with the same ``ConnectionManager`` a
    WebSocket does, so routing (``send_to_session`` / ``broadcast``) is
    identical for both transports. The SSE endpoint's generator pulls
    payloads back off ``queue`` and serializes them as wire events.
    """

    def __init__(self) -> None:
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

    async def send_json(self, payload: dict[str, Any]) -> None:
        await self.queue.put(payload)


async def _handle_upstream_event(
    *,
    event_bus: EventBus,
    action_handlers: dict[str, Any],
    event_type: UpstreamType,
    payload: ActionPayload | InputPayload | FormSubmitPayload,
    session_id: str,
    handler_value: Any = _UNSET_HANDLER_VALUE,
) -> Envelope:
    """Dispatch upstream intent and emit a private action acknowledgement.

    Upstream content (the action/input/form payload itself) is never
    published downstream — only the originating session's own HTTP response
    or WS/SSE connection ever sees what it sent. The ack is always private
    to ``session_id`` too; nothing about one session's interaction is ever
    visible to another.
    """

    await dispatch_plugin_action(
        handlers=action_handlers,
        action_id=_extract_action_id(payload),
        value=(
            _extract_action_value(payload)
            if handler_value is _UNSET_HANDLER_VALUE
            else handler_value
        ),
        session_id=session_id,
    )

    ack = make_envelope(
        "action_ack",
        ActionAckPayload(action_id=_extract_action_id(payload), status="ok"),
    ).route_to_session(session_id)
    await event_bus.publish(ack)
    return ack


async def _process_audio_upload(
    *,
    event_bus: EventBus,
    stt_adapter: STTAdapter,
    audio_bytes: bytes,
    session_id: str,
) -> None:
    """Transcribe and publish results privately to the uploading session only."""

    try:
        transcript = stt_adapter.transcribe(audio_bytes)
    except Exception:
        LOGGER.exception("audio_transcription_failed")
        await event_bus.publish(
            make_envelope(
                "notification",
                payload=NotificationPayload(message="Audio processing failed", level="error"),
            ).route_to_session(session_id)
        )
        return

    await event_bus.publish(
        make_envelope(
            "notification",
            payload=NotificationPayload(
                message=f"Transcribed command: {transcript}",
                level="info",
            ),
        ).route_to_session(session_id)
    )

    await event_bus.publish(
        make_envelope(
            "log_chunk",
            payload=LogChunkPayload(stream_id="audio", lines=[f"transcript={transcript}"]),
        ).route_to_session(session_id)
    )


async def _run_audio_processing_task(
    *,
    event_bus: EventBus,
    stt_adapter: STTAdapter,
    audio_bytes: bytes,
    session_id: str,
) -> None:
    await _process_audio_upload(
        event_bus=event_bus,
        stt_adapter=stt_adapter,
        audio_bytes=audio_bytes,
        session_id=session_id,
    )


def _status_page_html(app_name: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{app_name} — LCARS Backend</title>
  <style>
    body {{font-family:monospace;background:#05090f;color:#f3f5fb;
          display:grid;place-items:center;min-height:100vh;margin:0}}
    .card {{border:1px solid #f09a2f;border-radius:14px;padding:2rem 2.5rem;
            max-width:480px;text-align:center}}
    h1 {{color:#f09a2f;margin:0 0 .5rem}}
    p  {{color:#9da6bf;margin:.25rem 0}}
    a  {{color:#65a9ff;text-decoration:none}}
    a:hover {{text-decoration:underline}}
    ul {{list-style:none;padding:0;margin:1.2rem 0 0}}
    li {{margin:.45rem 0}}
  </style>
</head>
<body>
  <div class="card">
    <h1>{app_name}</h1>
    <p>LCARS backend is running.</p>
    <p>The browser UI is served separately (e.g. <code>npm run dev</code> on port 5173).</p>
    <ul>
      <li><a href="/lcars/manifest">/lcars/manifest</a> &mdash; live manifest JSON</li>
      <li><a href="/lcars/schema">/lcars/schema</a> &mdash; JSON Schema</li>
      <li><a href="/docs">/docs</a> &mdash; interactive API docs</li>
    </ul>
  </div>
</body>
</html>"""


def create_app(
    *,
    manifest: Manifest | None = None,
    assets_dir: str | Path | None = None,
    app: App | None = None,
) -> FastAPI:
    """Create and configure the LCARS FastAPI app.

    Parameters
    ----------
    manifest:
        When provided (DSL mode), use this manifest directly without loading
        fixture files.  All 57 legacy tests remain green because the default
        is ``None`` which preserves the original fixture-loading behaviour.
    assets_dir:
        Optional directory of project assets served read-only at
        ``/lcars/assets/``. Required by ``three_scene`` widgets, whose scene
        modules are resolved relative to it.
    app:
        Runtime state owner. The lazily-created process default preserves the
        existing module-level behaviour when omitted.
    """
    using_default_app = app is None
    lcars_app = app if app is not None else get_default_app()
    dsl_mode = manifest is not None
    fixtures_dir = _resolve_fixtures_dir()
    cors_origins = _parse_cors_origins(os.getenv("LCARS_CORS_ORIGINS"))
    security_settings = resolve_security_settings(cors_origins=cors_origins)
    connection_manager = lcars_app.connection_manager
    event_bus = lcars_app.event_bus
    rate_limiter = SlidingWindowRateLimiter(
        window_seconds=security_settings.rate_limit_window_seconds,
        max_requests=security_settings.rate_limit_max_requests,
    )
    plugin_loader = PluginLoader()
    default_stt_adapter: STTAdapter = MockSTTAdapter()
    action_handlers = lcars_app.plugin_action_handlers
    if using_default_app:
        action_handlers.clear()

    if dsl_mode:
        merged_manifest: Manifest | None = manifest
    else:
        merged_manifest = None
        loaded_plugins = plugin_loader.discover()
        action_handlers.update(plugin_loader.collect_action_handlers(loaded_plugins))

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if not dsl_mode:
            for artifact in ("manifest", "schema"):
                path = fixtures_dir / FIXTURE_FILES[artifact]
                try:
                    payload = _load_artifact(artifact, fixtures_dir)
                    if artifact == "manifest":
                        Manifest.model_validate(payload)
                except ArtifactError as exc:
                    LOGGER.error(
                        "startup_artifact_validation_failed",
                        extra={
                            "artifact": artifact,
                            "path": str(path),
                            "error": str(exc),
                        },
                    )
                    raise
                except ValidationError as exc:
                    LOGGER.error(
                        "startup_manifest_validation_failed",
                        extra={
                            "artifact": artifact,
                            "path": str(path),
                            "error": str(exc),
                        },
                    )
                    raise

        async def bus_forwarder() -> None:
            """Route every published envelope to its resolved audience.

            This is the single place that turns "audience" into an actual
            delivery decision: private ("session") envelopes go only to
            connections bound to their originating session id; broadcast
            ("all") envelopes — an explicit opt-in — go to everyone. Both
            WebSocket and SSE connections are registered with the same
            ``connection_manager``, so this one loop covers both transports.

            Every envelope is folded into the shared projection or its
            originating session's private overlay *before* delivery, so the
            projection a concurrently-hydrating connection reads is always
            at least as current as what just went out — see
            ``App.apply_downstream_envelope_to_projection``.
            """
            async with event_bus.subscribe() as queue:
                while True:
                    envelope = await queue.get()
                    await lcars_app.apply_downstream_envelope_to_projection(envelope)
                    if envelope.audience == "all" or envelope.target_session_id is None:
                        await connection_manager.broadcast(envelope)
                    else:
                        await connection_manager.send_to_session(
                            envelope.target_session_id, envelope
                        )

        task = asyncio.create_task(bus_forwarder())

        # Optional live-polling loop injected by the DSL (avoids deprecated on_event).
        live_task: asyncio.Task[None] | None = None
        live_factory = getattr(fastapi_app.state, "_live_coro_factory", None)
        if live_factory is not None:
            live_task = asyncio.create_task(live_factory())
        else:
            await lcars_app.start_live_jobs()

        yield

        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        if live_task is not None:
            live_task.cancel()
            with suppress(asyncio.CancelledError):
                await live_task
        await lcars_app.shutdown()

    fastapi_app = FastAPI(title="lcars-ui", version="6.1.0", lifespan=lifespan)

    fastapi_app.add_middleware(
        SecurityHeadersMiddleware,
        enabled=security_settings.secure_headers_enabled,
    )
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    fastapi_app.add_middleware(GZipMiddleware, minimum_size=500)
    # Fresh reconnect-hydration state per FastAPI app built, even when reusing
    # the process-default App across calls (as bare create_app() does in many
    # tests) — otherwise a prior call's mutated projection and private
    # overlays would leak into this one. Seeded lazily on first connect/manifest
    # fetch (see _seed_projection_once below), not here, since that requires
    # the fixture/DSL manifest to already be resolved.
    lcars_app.projection.reset()
    fastapi_app.state.connection_manager = connection_manager
    fastapi_app.state.event_bus = event_bus
    fastapi_app.state.lcars_app = lcars_app
    fastapi_app.state.stt_adapter = default_stt_adapter
    fastapi_app.state.manifest = merged_manifest
    fastapi_app.state.plugin_action_handlers = action_handlers
    fastapi_app.state.security_settings = security_settings
    fastapi_app.state.rate_limiter = rate_limiter

    if _STATIC_AVAILABLE and (_STATIC_DIR / "assets").is_dir():
        from fastapi.staticfiles import StaticFiles  # noqa: PLC0415

        fastapi_app.mount(
            "/assets", StaticFiles(directory=_STATIC_DIR / "assets"), name="assets"
        )

    # Project assets (three_scene modules, geometry, anything a scene loads).
    # Mounted here rather than beside the SPA catch-all so /lcars/assets/* wins
    # over it; StaticFiles already refuses to serve outside its root.
    if assets_dir is not None:
        resolved_assets = Path(assets_dir).expanduser().resolve()
        if not resolved_assets.is_dir():
            raise ValueError(f"assets_dir is not a directory: {resolved_assets}")
        # Deliberately not gated on _STATIC_AVAILABLE: that flag means the SPA
        # bundle has been built, which has nothing to do with whether the app
        # may serve a project's own assets. Running from source with an unbuilt
        # frontend still needs scene modules to load.
        from fastapi.staticfiles import StaticFiles  # noqa: PLC0415

        fastapi_app.mount(
            "/lcars/assets",
            StaticFiles(directory=resolved_assets),
            name="lcars-assets",
        )
        fastapi_app.state.assets_dir = resolved_assets

    def _audit(event: str, **fields: object) -> None:
        LOGGER.info(event, extra=fields)

    def _identity_for_request(request: Request, principal: AuthPrincipal | None) -> str:
        client_host = request.client.host if request.client else "unknown"
        return principal_identity(principal, fallback=f"http:{client_host}")

    def _identity_for_websocket(websocket: WebSocket, principal: AuthPrincipal | None) -> str:
        client_host = websocket.client.host if websocket.client else "unknown"
        return principal_identity(principal, fallback=f"ws:{client_host}")

    def _enforce_rate_limit(*, identity: str, channel: str) -> None:
        key = f"{channel}:{identity}"
        if rate_limiter.allow(key):
            return
        _audit(
            "security_rate_limited",
            channel=channel,
            identity=identity,
            window_seconds=rate_limiter.window_seconds,
            max_requests=rate_limiter.max_requests,
        )
        raise rate_limit_error(
            window_seconds=rate_limiter.window_seconds,
            max_requests=rate_limiter.max_requests,
        )

    def _authorize_http(request: Request, *, required_scope: str) -> AuthPrincipal:
        principal = resolve_http_principal(request, security_settings)
        identity = _identity_for_request(request, principal)
        if principal is None:
            _audit(
                "security_auth_failed",
                channel="http",
                path=request.url.path,
                identity=identity,
            )
            raise auth_required_error()
        if not ensure_scope(principal, required_scope):
            _audit(
                "security_auth_forbidden",
                channel="http",
                path=request.url.path,
                identity=identity,
                required_scope=required_scope,
            )
            raise forbidden_error(required_scope)
        _audit(
            "security_auth_granted",
            channel="http",
            path=request.url.path,
            identity=identity,
            required_scope=required_scope,
        )
        return principal

    async def _resolve_client_session(
        *,
        token: str | None,
        principal: AuthPrincipal,
        live: bool,
        response: Response | None = None,
    ) -> ResolvedSession:
        """Resolve one real session for any transport, and hand back a new token if minted.

        Every caller — manifest, action/input/form, upload, SSE, WebSocket —
        routes through this so they all resolve the *same* session for a
        given token, never inventing their own identity (no more literal
        ``"http_fallback"`` bucket). ``response`` is provided by HTTP
        endpoints that can carry the (rotated or freshly minted) token back
        via a response header; WebSocket has none, and simply proceeds under
        whatever session was resolved — see ``sessions.SessionRegistry`` for
        why that is an acceptable, documented limitation of this wave.
        """
        resolved = await lcars_app.resolve_session(
            token=token,
            principal_subject=principal.subject,
            live=live,
        )
        if response is not None and resolved.rotated:
            response.headers[SESSION_TOKEN_HEADER] = resolved.token
        return resolved

    def _current_manifest_payload() -> dict[str, Any]:
        current_manifest = cast(Manifest | None, fastapi_app.state.manifest)
        if current_manifest is not None:
            return current_manifest.model_dump(mode="json", by_alias=True)
        return _load_artifact("manifest", fixtures_dir)

    def _seed_projection_once() -> None:
        """Seed the shared projection's base manifest on first use only.

        Idempotent — a later call is a no-op (see ``SharedProjection.seed``)
        — so every connect/manifest-fetch can call this unconditionally
        without ever clobbering a live ``update()``. Every *read* of current
        state after the first seed goes through
        ``App.session_manifest_snapshot``/``App.hydration_envelopes``
        instead, which reflect every effect applied since boot.
        """
        if lcars_app.projection.shared.seeded:
            return
        lcars_app.seed_projection(_current_manifest_payload())

    @fastapi_app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def root() -> str:
        if _STATIC_AVAILABLE:
            return (_STATIC_DIR / "index.html").read_text(encoding="utf-8")
        _manifest = cast(Manifest | None, fastapi_app.state.manifest)
        app_name = _manifest.meta.app_name if _manifest is not None else "LCARS UI"
        return _status_page_html(app_name)

    @fastapi_app.get("/lcars/manifest", response_model=Manifest)
    async def get_manifest(request: Request, response: Response) -> dict[str, Any]:
        principal = _authorize_http(request, required_scope=SCOPE_READ)
        # The manifest endpoint is the primary token-issuance point: a first
        # load mints a session and hands the token back via a response
        # header (readable by axios, unlike a WS/SSE handshake header); a
        # returning tab's stored token is resolved back to its same session.
        resolved = await _resolve_client_session(
            token=_session_token_from_headers(request),
            principal=principal,
            live=False,
            response=response,
        )
        try:
            _seed_projection_once()
        except ArtifactError as exc:
            path = fixtures_dir / FIXTURE_FILES["manifest"]
            raise _artifact_error_response(exc, path) from exc
        # Current state, not the frozen build-time manifest: every update()
        # applied since boot (plus this session's own private overlay) is
        # folded in here, so a plain page refresh hydrates correctly too —
        # not only a WS/SSE reconnect.
        return await lcars_app.session_manifest_snapshot(resolved.session_id)

    @fastapi_app.get(
        "/lcars/schema", response_model=SchemaDocument, response_model_exclude_none=True
    )
    def get_schema(request: Request) -> dict[str, Any]:
        _authorize_http(request, required_scope=SCOPE_READ)
        if dsl_mode:
            return Manifest.model_json_schema()
        path = fixtures_dir / FIXTURE_FILES["schema"]
        try:
            return _load_artifact("schema", fixtures_dir)
        except ArtifactError as exc:
            raise _artifact_error_response(exc, path) from exc

    @fastapi_app.websocket("/lcars/ws")
    async def lcars_ws(websocket: WebSocket) -> None:
        principal = resolve_websocket_principal(websocket, security_settings)
        identity = _identity_for_websocket(websocket, principal)
        if principal is None:
            _audit("security_auth_failed", channel="ws", identity=identity)
            await websocket.accept()
            await websocket.close(code=4401, reason="auth_required")
            return
        if not ensure_scope(principal, SCOPE_STREAM):
            _audit(
                "security_auth_forbidden",
                channel="ws",
                identity=identity,
                required_scope=SCOPE_STREAM,
            )
            await websocket.accept()
            await websocket.close(code=4403, reason="forbidden_scope")
            return

        try:
            _seed_projection_once()
        except ArtifactError:
            await websocket.accept()
            await websocket.close(code=1011, reason="manifest_unavailable")
            return

        resolved_session = await _resolve_client_session(
            token=_session_token_from_query(websocket),
            principal=principal,
            live=True,
        )
        session_id = resolved_session.session_id
        # hydrate= sends this session's current-state snapshot (manifest +
        # bounded log tails) directly to the connection once it is accepted;
        # anything published for this session in the meantime queues behind
        # it rather than racing ahead — see ConnectionManager.register.
        await connection_manager.connect(
            websocket,
            session_id,
            before_hydration=lcars_app.run_session_start,
            hydrate=lcars_app.hydration_envelopes,
        )
        _audit(
            "security_ws_connected",
            channel="ws",
            identity=identity,
            session_id=session_id,
            rotated=resolved_session.rotated,
        )
        try:
            while True:
                raw = await websocket.receive_json()
                raw_size = len(json.dumps(raw, separators=(",", ":")).encode("utf-8"))
                if raw_size > security_settings.max_ws_message_bytes:
                    _audit(
                        "security_payload_rejected",
                        channel="ws",
                        identity=identity,
                        observed_bytes=raw_size,
                        max_bytes=security_settings.max_ws_message_bytes,
                    )
                    await websocket.close(code=1009, reason="payload_too_large")
                    return
                if not rate_limiter.allow(f"ws:{identity}"):
                    _audit(
                        "security_rate_limited",
                        channel="ws",
                        identity=identity,
                        window_seconds=rate_limiter.window_seconds,
                        max_requests=rate_limiter.max_requests,
                    )
                    await websocket.close(code=1013, reason="rate_limited")
                    return

                if isinstance(raw, dict) and raw.get("v") not in (None, PROTOCOL_VERSION):
                    await websocket.close(code=1002, reason="unsupported_protocol")
                    return

                try:
                    envelope = Envelope.model_validate(raw)
                except ValidationError:
                    await websocket.close(code=1003, reason="invalid_envelope")
                    return

                if envelope.type not in {"action", "input", "form_submit"}:
                    await websocket.close(code=1003, reason="invalid_upstream_type")
                    return

                payload = envelope.payload
                if not isinstance(payload, (ActionPayload, InputPayload, FormSubmitPayload)):
                    await websocket.close(code=1003, reason="invalid_upstream_payload")
                    return
                if not ensure_scope(principal, SCOPE_WRITE):
                    _audit(
                        "security_auth_forbidden",
                        channel="ws_upstream",
                        identity=identity,
                        required_scope=SCOPE_WRITE,
                    )
                    await websocket.close(code=1008, reason="forbidden_upstream")
                    return

                event_type = cast(UpstreamType, envelope.type)
                await _handle_upstream_event(
                    event_bus=event_bus,
                    action_handlers=fastapi_app.state.plugin_action_handlers,
                    event_type=event_type,
                    payload=payload,
                    session_id=session_id,
                )
        except WebSocketDisconnect:
            pass
        finally:
            disconnected_session_id = await connection_manager.disconnect(websocket)
            if disconnected_session_id is not None:
                # Release the live connection only — retain widget state and
                # scoped services for the retention window so a reload or a
                # brief network drop reconnects to the same session. Actual
                # cleanup happens lazily via App.resolve_session's purge.
                lcars_app.release_session_connection(disconnected_session_id)
            _audit("security_ws_disconnected", channel="ws", identity=identity)

    @fastapi_app.post("/lcars/action/{widget_id}")
    async def post_action(
        widget_id: str,
        request: Request,
        response: Response,
    ) -> dict[str, Any]:
        principal = _authorize_http(request, required_scope=SCOPE_WRITE)
        identity = _identity_for_request(request, principal)
        _enforce_rate_limit(identity=identity, channel="http_action")
        resolved_session = await _resolve_client_session(
            token=_session_token_from_headers(request),
            principal=principal,
            live=False,
            response=response,
        )
        enforce_content_length(request, max_bytes=security_settings.max_json_body_bytes)
        raw_body = await request.body()
        if len(raw_body) > security_settings.max_json_body_bytes:
            raise size_limit_error(
                limit=security_settings.max_json_body_bytes,
                observed=len(raw_body),
            )
        if not raw_body:
            parsed = ActionRequest()
        else:
            try:
                payload = json.loads(raw_body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise HTTPException(status_code=400, detail={"error": "invalid_json_body"}) from exc
            try:
                parsed = ActionRequest.model_validate(payload)
            except ValidationError as exc:
                raise HTTPException(
                    status_code=422,
                    detail={"error": "invalid_action_request", "detail": exc.errors()},
                ) from exc

        ack = await _handle_upstream_event(
            event_bus=event_bus,
            action_handlers=fastapi_app.state.plugin_action_handlers,
            event_type="action",
            payload=ActionPayload(id=widget_id, value=parsed.value),
            session_id=resolved_session.session_id,
        )
        _audit(
            "security_action_accepted",
            channel="http_action",
            identity=identity,
            widget_id=widget_id,
            session_id=resolved_session.session_id,
        )
        return ack.model_dump(mode="json")

    @fastapi_app.post("/lcars/input/{widget_id}")
    async def post_input(
        widget_id: str,
        request: Request,
        response: Response,
    ) -> dict[str, Any]:
        principal = _authorize_http(request, required_scope=SCOPE_WRITE)
        identity = _identity_for_request(request, principal)
        _enforce_rate_limit(identity=identity, channel="http_input")
        resolved_session = await _resolve_client_session(
            token=_session_token_from_headers(request),
            principal=principal,
            live=False,
            response=response,
        )
        enforce_content_length(request, max_bytes=security_settings.max_json_body_bytes)
        raw_body = await request.body()
        if len(raw_body) > security_settings.max_json_body_bytes:
            raise size_limit_error(
                limit=security_settings.max_json_body_bytes,
                observed=len(raw_body),
            )
        if not raw_body:
            parsed = InputRequest()
        else:
            try:
                payload = json.loads(raw_body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise HTTPException(status_code=400, detail={"error": "invalid_json_body"}) from exc
            try:
                parsed = InputRequest.model_validate(payload)
            except ValidationError as exc:
                raise HTTPException(
                    status_code=422,
                    detail={"error": "invalid_input_request", "detail": exc.errors()},
                ) from exc

        ack = await _handle_upstream_event(
            event_bus=event_bus,
            action_handlers=fastapi_app.state.plugin_action_handlers,
            event_type="input",
            payload=InputPayload(id=widget_id, value=parsed.value),
            session_id=resolved_session.session_id,
        )
        _audit(
            "security_input_accepted",
            channel="http_input",
            identity=identity,
            widget_id=widget_id,
            session_id=resolved_session.session_id,
        )
        return ack.model_dump(mode="json")

    @fastapi_app.post("/lcars/form/{widget_id}")
    async def post_form(
        widget_id: str,
        request: Request,
        response: Response,
    ) -> dict[str, Any]:
        principal = _authorize_http(request, required_scope=SCOPE_WRITE)
        identity = _identity_for_request(request, principal)
        _enforce_rate_limit(identity=identity, channel="http_form")
        resolved_session = await _resolve_client_session(
            token=_session_token_from_headers(request),
            principal=principal,
            live=False,
            response=response,
        )
        enforce_content_length(request, max_bytes=security_settings.max_json_body_bytes)
        raw_body = await request.body()
        if len(raw_body) > security_settings.max_json_body_bytes:
            raise size_limit_error(
                limit=security_settings.max_json_body_bytes,
                observed=len(raw_body),
            )
        if not raw_body:
            parsed = FormRequest()
        else:
            try:
                payload = json.loads(raw_body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise HTTPException(status_code=400, detail={"error": "invalid_json_body"}) from exc
            try:
                parsed = FormRequest.model_validate(payload)
            except ValidationError as exc:
                raise HTTPException(
                    status_code=422,
                    detail={"error": "invalid_form_request", "detail": exc.errors()},
                ) from exc

        ack = await _handle_upstream_event(
            event_bus=event_bus,
            action_handlers=fastapi_app.state.plugin_action_handlers,
            event_type="form_submit",
            payload=FormSubmitPayload(id=widget_id, data=parsed.data),
            session_id=resolved_session.session_id,
        )
        _audit(
            "security_form_accepted",
            channel="http_form",
            identity=identity,
            widget_id=widget_id,
            session_id=resolved_session.session_id,
        )
        return ack.model_dump(mode="json")

    @fastapi_app.get("/lcars/events")
    async def lcars_sse_events(request: Request) -> StreamingResponse:
        principal = _authorize_http(request, required_scope=SCOPE_READ)
        identity = _identity_for_request(request, principal)
        _enforce_rate_limit(identity=identity, channel="http_sse")

        # SSE is a persistent downstream stream, exactly like WebSocket, so it
        # resolves a real (live=True) session the same way and registers
        # with the same connection_manager — see _QueueSink. The browser's
        # EventSource API cannot set custom headers, so the token travels as
        # a query param here (never a header, and never logged); it also
        # cannot read response headers, so a rotated token has no way back
        # to this particular request either — the client's own manifest
        # fetch is what carries a rotated token back (see get_manifest).
        try:
            _seed_projection_once()
        except ArtifactError as exc:
            path = fixtures_dir / FIXTURE_FILES["manifest"]
            raise _artifact_error_response(exc, path) from exc

        resolved_session = await _resolve_client_session(
            token=_session_token_from_query(request),
            principal=principal,
            live=True,
        )
        session_id = resolved_session.session_id
        sink = _QueueSink()
        await connection_manager.register(
            sink,
            session_id,
            before_hydration=lcars_app.run_session_start,
            hydrate=lcars_app.hydration_envelopes,
        )

        async def event_stream() -> AsyncIterator[str]:
            try:
                while True:
                    payload = await sink.queue.get()
                    yield _serialize_sse_payload(payload)
            finally:
                await connection_manager.disconnect(sink)
                lcars_app.release_session_connection(session_id)

        _audit(
            "security_sse_connected",
            channel="http_sse",
            identity=identity,
            session_id=session_id,
            rotated=resolved_session.rotated,
        )
        return StreamingResponse(event_stream(), media_type="text/event-stream")

    @fastapi_app.post(
        "/lcars/upload/audio", status_code=202, response_model=AudioUploadAccepted
    )
    async def upload_audio(
        request: Request,
        response: Response,
        background_tasks: BackgroundTasks,
        file: Annotated[UploadFile, File(...)],
    ) -> AudioUploadAccepted:
        principal = _authorize_http(request, required_scope=SCOPE_WRITE)
        identity = _identity_for_request(request, principal)
        _enforce_rate_limit(identity=identity, channel="http_upload")
        resolved_session = await _resolve_client_session(
            token=_session_token_from_headers(request),
            principal=principal,
            live=False,
            response=response,
        )
        enforce_content_length(request, max_bytes=security_settings.max_audio_upload_bytes)
        if file.content_type is not None and not file.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=415,
                detail={"error": "unsupported_media_type", "content_type": file.content_type},
            )

        audio_bytes = await file.read()
        if len(audio_bytes) > security_settings.max_audio_upload_bytes:
            raise size_limit_error(
                limit=security_settings.max_audio_upload_bytes,
                observed=len(audio_bytes),
            )
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="empty_audio_payload")

        background_tasks.add_task(
            _run_audio_processing_task,
            event_bus=event_bus,
            stt_adapter=fastapi_app.state.stt_adapter,
            audio_bytes=audio_bytes,
            session_id=resolved_session.session_id,
        )
        _audit(
            "security_audio_accepted",
            channel="http_upload",
            identity=identity,
            bytes=len(audio_bytes),
            session_id=resolved_session.session_id,
        )
        return AudioUploadAccepted()

    @fastapi_app.post(
        "/lcars/upload/files", status_code=202, response_model=FileUploadAccepted
    )
    async def upload_files(
        request: Request,
        response: Response,
        action_id: Annotated[str, FormField(...)],
        files: Annotated[list[UploadFile], File(...)],
    ) -> FileUploadAccepted:
        """Accept bounded multipart files and dispatch them without persisting them."""

        principal = _authorize_http(request, required_scope=SCOPE_WRITE)
        identity = _identity_for_request(request, principal)
        _enforce_rate_limit(identity=identity, channel="http_file_upload")
        resolved_session = await _resolve_client_session(
            token=_session_token_from_headers(request),
            principal=principal,
            live=False,
            response=response,
        )
        # Multipart framing adds a small amount around the payload. The exact
        # byte limit is enforced while reading below; this early guard prevents
        # an obviously oversized request from being spooled first.
        enforce_content_length(
            request,
            max_bytes=security_settings.max_file_upload_bytes + 1_000_000,
        )
        if not action_id.strip() or len(action_id) > 256:
            raise HTTPException(status_code=422, detail={"error": "invalid_action_id"})
        if len(files) > 50:
            raise HTTPException(
                status_code=422,
                detail={"error": "too_many_files", "limit": 50},
            )

        total_bytes = 0
        metadata: list[FileUploadMetadata] = []
        handler_files: list[dict[str, Any]] = []
        for upload in files:
            chunks: list[bytes] = []
            while True:
                chunk = await upload.read(1_048_576)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > security_settings.max_file_upload_bytes:
                    raise size_limit_error(
                        limit=security_settings.max_file_upload_bytes,
                        observed=total_bytes,
                    )
                chunks.append(chunk)

            data = b"".join(chunks)
            raw_name = (upload.filename or "upload.bin").replace("\\", "/")
            name = Path(raw_name).name.replace("\x00", "")
            if name in {"", ".", ".."}:
                name = "upload.bin"
            item = FileUploadMetadata(
                name=name,
                size=len(data),
                content_type=upload.content_type,
            )
            metadata.append(item)
            handler_files.append({**item.model_dump(), "data": data})

        if not metadata:
            raise HTTPException(status_code=400, detail={"error": "empty_file_upload"})

        browser_value = {"files": [item.model_dump(mode="json") for item in metadata]}
        await _handle_upstream_event(
            event_bus=event_bus,
            action_handlers=fastapi_app.state.plugin_action_handlers,
            event_type="action",
            payload=ActionPayload(id=action_id, value=browser_value),
            handler_value={"files": handler_files},
            session_id=resolved_session.session_id,
        )
        _audit(
            "security_file_upload_accepted",
            channel="http_file_upload",
            identity=identity,
            action_id=action_id,
            files=len(metadata),
            bytes=total_bytes,
            session_id=resolved_session.session_id,
        )
        return FileUploadAccepted(files=metadata)

    # SPA catch-all must be registered last so /lcars/* routes take priority
    @fastapi_app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
    def spa_fallback(full_path: str) -> str:
        if _STATIC_AVAILABLE:
            return (_STATIC_DIR / "index.html").read_text(encoding="utf-8")
        raise HTTPException(status_code=404, detail="Not Found")

    return fastapi_app
