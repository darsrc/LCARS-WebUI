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
    Body,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from lcars_ui.core.models import Manifest
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
from lcars_ui.server.stream import ConnectionManager, EventBus
from lcars_ui.server.stt import MockSTTAdapter, STTAdapter

LOGGER = logging.getLogger(__name__)

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


def _serialize_sse_event(envelope: Envelope) -> str:
    payload = envelope.model_dump(mode="json")
    return f"event: {envelope.type}\ndata: {json.dumps(payload)}\n\n"


async def _handle_upstream_event(
    *,
    event_bus: EventBus,
    event_type: UpstreamType,
    payload: ActionPayload | InputPayload | FormSubmitPayload,
) -> Envelope:
    """Publish upstream intent and emit deterministic action acknowledgement."""

    upstream = make_envelope(event_type, payload)
    await event_bus.publish(upstream)

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


def create_app() -> FastAPI:
    """Create and configure the LCARS FastAPI app."""
    fixtures_dir = _resolve_fixtures_dir()
    cors_origins = _parse_cors_origins(os.getenv("LCARS_CORS_ORIGINS"))
    connection_manager = ConnectionManager()
    event_bus = EventBus()
    default_stt_adapter: STTAdapter = MockSTTAdapter()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        for artifact in ("manifest", "schema"):
            path = fixtures_dir / FIXTURE_FILES[artifact]
            try:
                _load_artifact(artifact, fixtures_dir)
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

        async def bus_forwarder() -> None:
            async with event_bus.subscribe() as queue:
                while True:
                    envelope = await queue.get()
                    await connection_manager.broadcast(envelope)

        task = asyncio.create_task(bus_forwarder())
        yield
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

    app = FastAPI(title="lcars-ui", version="0.1.0", lifespan=lifespan)

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

    @app.get("/lcars/manifest", response_model=Manifest)
    def get_manifest() -> dict[str, Any]:
        path = fixtures_dir / FIXTURE_FILES["manifest"]
        try:
            return _load_artifact("manifest", fixtures_dir)
        except ArtifactError as exc:
            raise _artifact_error_response(exc, path) from exc

    @app.get("/lcars/schema", response_model=SchemaDocument, response_model_exclude_none=True)
    def get_schema() -> dict[str, Any]:
        path = fixtures_dir / FIXTURE_FILES["schema"]
        try:
            return _load_artifact("schema", fixtures_dir)
        except ArtifactError as exc:
            raise _artifact_error_response(exc, path) from exc

    @app.websocket("/lcars/ws")
    async def lcars_ws(websocket: WebSocket) -> None:
        await connection_manager.connect(websocket)
        try:
            while True:
                raw = await websocket.receive_json()
                try:
                    envelope = Envelope.model_validate(raw)
                except ValidationError:
                    await websocket.close(code=1003, reason="invalid_envelope")
                    return

                if envelope.v != PROTOCOL_VERSION:
                    await websocket.close(code=1002, reason="unsupported_protocol")
                    return

                if envelope.type not in {"action", "input", "form_submit"}:
                    await websocket.close(code=1003, reason="invalid_upstream_type")
                    return

                payload = envelope.payload
                if not isinstance(payload, (ActionPayload, InputPayload, FormSubmitPayload)):
                    await websocket.close(code=1003, reason="invalid_upstream_payload")
                    return

                event_type = cast(UpstreamType, envelope.type)
                await _handle_upstream_event(
                    event_bus=event_bus,
                    event_type=event_type,
                    payload=payload,
                )
        except WebSocketDisconnect:
            pass
        finally:
            await connection_manager.disconnect(websocket)

    @app.post("/lcars/action/{widget_id}")
    async def post_action(
        widget_id: str,
        request: Annotated[ActionRequest, Body(default_factory=ActionRequest)],
    ) -> dict[str, Any]:
        ack = await _handle_upstream_event(
            event_bus=event_bus,
            event_type="action",
            payload=ActionPayload(id=widget_id, value=request.value),
        )
        return ack.model_dump(mode="json")

    @app.get("/lcars/events")
    async def lcars_sse_events() -> StreamingResponse:
        async def event_stream() -> AsyncIterator[str]:
            async with event_bus.subscribe() as queue:
                while True:
                    envelope = await queue.get()
                    yield _serialize_sse_event(envelope)

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    @app.post("/lcars/upload/audio", status_code=202, response_model=AudioUploadAccepted)
    async def upload_audio(
        background_tasks: BackgroundTasks,
        file: Annotated[UploadFile, File(...)],
    ) -> AudioUploadAccepted:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="empty_audio_payload")

        background_tasks.add_task(
            _run_audio_processing_task,
            event_bus=event_bus,
            stt_adapter=app.state.stt_adapter,
            audio_bytes=audio_bytes,
        )
        return AudioUploadAccepted()

    return app
