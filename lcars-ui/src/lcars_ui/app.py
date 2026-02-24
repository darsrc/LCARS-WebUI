"""FastAPI app factory for LCARS endpoints and realtime transport."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from typing import Any

from fastapi import Body, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from lcars_ui.core.models import Manifest
from lcars_ui.server.events import (
    PROTOCOL_VERSION,
    ActionAckPayload,
    ActionPayload,
    Envelope,
    FormSubmitPayload,
    InputPayload,
    UpstreamType,
    make_envelope,
)
from lcars_ui.server.stream import ConnectionManager, EventBus

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




class ActionRequest(BaseModel):
    """HTTP fallback action request payload."""

    value: Any = None


def _extract_action_id(payload: ActionPayload | InputPayload | FormSubmitPayload) -> str:
    return payload.id


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

def create_app() -> FastAPI:
    """Create and configure the LCARS FastAPI app."""
    fixtures_dir = _resolve_fixtures_dir()
    cors_origins = _parse_cors_origins(os.getenv("LCARS_CORS_ORIGINS"))
    connection_manager = ConnectionManager()
    event_bus = EventBus()

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

                await _handle_upstream_event(
                    event_bus=event_bus,
                    event_type=envelope.type,
                    payload=payload,
                )
        except WebSocketDisconnect:
            pass
        finally:
            await connection_manager.disconnect(websocket)

    @app.post("/lcars/action/{widget_id}")
    async def post_action(widget_id: str, request: ActionRequest = Body(default_factory=ActionRequest)) -> dict[str, Any]:
        ack = await _handle_upstream_event(
            event_bus=event_bus,
            event_type="action",
            payload=ActionPayload(id=widget_id, value=request.value),
        )
        return ack.model_dump(mode="json")

    return app
