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
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from lcars_ui.core.models import Manifest
from lcars_ui.dsl._state import clear_session_state
from lcars_ui.plugins.loader import ActionHandler, PluginLoader, dispatch_plugin_action
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
from lcars_ui.server.stream import ConnectionManager, EventBus
from lcars_ui.server.stt import MockSTTAdapter, STTAdapter

LOGGER = logging.getLogger(__name__)

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


class AudioUploadAccepted(BaseModel):
    """Asynchronous upload acknowledgement payload."""

    status: str = "accepted"
    detail: str = "audio processing queued"


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


def _serialize_sse_event(envelope: Envelope) -> str:
    payload = envelope.model_dump(mode="json")
    return f"event: {envelope.type}\ndata: {json.dumps(payload)}\n\n"


async def _handle_upstream_event(
    *,
    event_bus: EventBus,
    action_handlers: dict[str, Any],
    event_type: UpstreamType,
    payload: ActionPayload | InputPayload | FormSubmitPayload,
    session_id: str,
) -> Envelope:
    """Publish upstream intent and emit deterministic action acknowledgement."""

    upstream = make_envelope(event_type, payload)
    await event_bus.publish(upstream)

    await dispatch_plugin_action(
        handlers=action_handlers,
        action_id=_extract_action_id(payload),
        value=_extract_action_value(payload),
        session_id=session_id,
    )

    ack = make_envelope(
        "action_ack",
        ActionAckPayload(action_id=_extract_action_id(payload), status="ok"),
    )
    await event_bus.publish(ack)
    return ack


async def _process_audio_upload(
    *,
    event_bus: EventBus,
    stt_adapter: STTAdapter,
    audio_bytes: bytes,
) -> None:
    try:
        transcript = stt_adapter.transcribe(audio_bytes)
    except Exception:
        LOGGER.exception("audio_transcription_failed")
        await event_bus.publish(
            make_envelope(
                "notification",
                payload=NotificationPayload(message="Audio processing failed", level="error"),
            )
        )
        return

    await event_bus.publish(
        make_envelope(
            "notification",
            payload=NotificationPayload(
                message=f"Transcribed command: {transcript}",
                level="info",
            ),
        )
    )

    await event_bus.publish(
        make_envelope(
            "log_chunk",
            payload=LogChunkPayload(stream_id="audio", lines=[f"transcript={transcript}"]),
        )
    )


async def _run_audio_processing_task(
    *,
    event_bus: EventBus,
    stt_adapter: STTAdapter,
    audio_bytes: bytes,
) -> None:
    await _process_audio_upload(
        event_bus=event_bus,
        stt_adapter=stt_adapter,
        audio_bytes=audio_bytes,
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


def create_app(*, manifest: Manifest | None = None) -> FastAPI:
    """Create and configure the LCARS FastAPI app.

    Parameters
    ----------
    manifest:
        When provided (DSL mode), use this manifest directly without loading
        fixture files.  All 57 legacy tests remain green because the default
        is ``None`` which preserves the original fixture-loading behaviour.
    """
    dsl_mode = manifest is not None
    fixtures_dir = _resolve_fixtures_dir()
    cors_origins = _parse_cors_origins(os.getenv("LCARS_CORS_ORIGINS"))
    security_settings = resolve_security_settings(cors_origins=cors_origins)
    connection_manager = ConnectionManager()
    event_bus = EventBus()
    rate_limiter = SlidingWindowRateLimiter(
        window_seconds=security_settings.rate_limit_window_seconds,
        max_requests=security_settings.rate_limit_max_requests,
    )
    plugin_loader = PluginLoader()
    default_stt_adapter: STTAdapter = MockSTTAdapter()
    action_handlers: dict[str, ActionHandler] = {}

    if dsl_mode:
        merged_manifest: Manifest | None = manifest
    else:
        merged_manifest = None
        loaded_plugins = plugin_loader.discover()
        action_handlers = plugin_loader.collect_action_handlers(loaded_plugins)

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
            async with event_bus.subscribe() as queue:
                while True:
                    envelope = await queue.get()
                    await connection_manager.broadcast(envelope)

        task = asyncio.create_task(bus_forwarder())

        # Optional live-polling loop injected by the DSL (avoids deprecated on_event).
        live_task: asyncio.Task[None] | None = None
        live_factory = getattr(app.state, "_live_coro_factory", None)
        if live_factory is not None:
            live_task = asyncio.create_task(live_factory())

        yield

        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        if live_task is not None:
            live_task.cancel()
            with suppress(asyncio.CancelledError):
                await live_task

    app = FastAPI(title="lcars-ui", version="1.0.0b1", lifespan=lifespan)

    app.add_middleware(
        SecurityHeadersMiddleware,
        enabled=security_settings.secure_headers_enabled,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.state.connection_manager = connection_manager
    app.state.event_bus = event_bus
    app.state.stt_adapter = default_stt_adapter
    app.state.manifest = merged_manifest
    app.state.plugin_action_handlers = action_handlers
    app.state.security_settings = security_settings
    app.state.rate_limiter = rate_limiter

    if _STATIC_AVAILABLE and (_STATIC_DIR / "assets").is_dir():
        from fastapi.staticfiles import StaticFiles  # noqa: PLC0415

        app.mount("/assets", StaticFiles(directory=_STATIC_DIR / "assets"), name="assets")

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

    def _current_manifest_payload() -> dict[str, Any]:
        current_manifest = cast(Manifest | None, app.state.manifest)
        if current_manifest is not None:
            return current_manifest.model_dump(mode="json")
        return _load_artifact("manifest", fixtures_dir)

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def root() -> str:
        if _STATIC_AVAILABLE:
            return (_STATIC_DIR / "index.html").read_text(encoding="utf-8")
        _manifest = cast(Manifest | None, app.state.manifest)
        app_name = _manifest.meta.app_name if _manifest is not None else "LCARS UI"
        return _status_page_html(app_name)

    @app.get("/lcars/manifest", response_model=Manifest)
    def get_manifest(request: Request) -> dict[str, Any]:
        _authorize_http(request, required_scope=SCOPE_READ)
        manifest = cast(Manifest | None, app.state.manifest)
        if manifest is None:
            path = fixtures_dir / FIXTURE_FILES["manifest"]
            try:
                return _load_artifact("manifest", fixtures_dir)
            except ArtifactError as exc:
                raise _artifact_error_response(exc, path) from exc
        return manifest.model_dump(mode="json")

    @app.get("/lcars/schema", response_model=SchemaDocument, response_model_exclude_none=True)
    def get_schema(request: Request) -> dict[str, Any]:
        _authorize_http(request, required_scope=SCOPE_READ)
        if dsl_mode:
            return Manifest.model_json_schema()
        path = fixtures_dir / FIXTURE_FILES["schema"]
        try:
            return _load_artifact("schema", fixtures_dir)
        except ArtifactError as exc:
            raise _artifact_error_response(exc, path) from exc

    @app.websocket("/lcars/ws")
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
            full_manifest = _current_manifest_payload()
        except ArtifactError:
            await websocket.accept()
            await websocket.close(code=1011, reason="manifest_unavailable")
            return

        session_id = await connection_manager.connect(websocket, full_manifest=full_manifest)
        _audit("security_ws_connected", channel="ws", identity=identity)
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
                    action_handlers=app.state.plugin_action_handlers,
                    event_type=event_type,
                    payload=payload,
                    session_id=session_id,
                )
        except WebSocketDisconnect:
            pass
        finally:
            disconnected_session_id = await connection_manager.disconnect(websocket)
            if disconnected_session_id is not None:
                clear_session_state(disconnected_session_id)
            _audit("security_ws_disconnected", channel="ws", identity=identity)

    @app.post("/lcars/action/{widget_id}")
    async def post_action(
        widget_id: str,
        request: Request,
    ) -> dict[str, Any]:
        principal = _authorize_http(request, required_scope=SCOPE_WRITE)
        identity = _identity_for_request(request, principal)
        _enforce_rate_limit(identity=identity, channel="http_action")
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
            action_handlers=app.state.plugin_action_handlers,
            event_type="action",
            payload=ActionPayload(id=widget_id, value=parsed.value),
            session_id="http_fallback",
        )
        _audit(
            "security_action_accepted",
            channel="http_action",
            identity=identity,
            widget_id=widget_id,
        )
        return ack.model_dump(mode="json")

    @app.get("/lcars/events")
    async def lcars_sse_events(request: Request) -> StreamingResponse:
        principal = _authorize_http(request, required_scope=SCOPE_READ)
        identity = _identity_for_request(request, principal)
        _enforce_rate_limit(identity=identity, channel="http_sse")

        async def event_stream() -> AsyncIterator[str]:
            async with event_bus.subscribe() as queue:
                while True:
                    envelope = await queue.get()
                    yield _serialize_sse_event(envelope)

        _audit("security_sse_connected", channel="http_sse", identity=identity)
        return StreamingResponse(event_stream(), media_type="text/event-stream")

    @app.post("/lcars/upload/audio", status_code=202, response_model=AudioUploadAccepted)
    async def upload_audio(
        request: Request,
        background_tasks: BackgroundTasks,
        file: Annotated[UploadFile, File(...)],
    ) -> AudioUploadAccepted:
        principal = _authorize_http(request, required_scope=SCOPE_WRITE)
        identity = _identity_for_request(request, principal)
        _enforce_rate_limit(identity=identity, channel="http_upload")
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
            stt_adapter=app.state.stt_adapter,
            audio_bytes=audio_bytes,
        )
        _audit(
            "security_audio_accepted",
            channel="http_upload",
            identity=identity,
            bytes=len(audio_bytes),
        )
        return AudioUploadAccepted()

    # SPA catch-all must be registered last so /lcars/* routes take priority
    @app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
    def spa_fallback(full_path: str) -> str:
        if _STATIC_AVAILABLE:
            return (_STATIC_DIR / "index.html").read_text(encoding="utf-8")
        raise HTTPException(status_code=404, detail="Not Found")

    return app
