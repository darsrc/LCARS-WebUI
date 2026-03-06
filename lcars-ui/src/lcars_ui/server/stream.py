"""Streaming connection management for LCARS realtime protocol."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any
from uuid import uuid4

from fastapi import WebSocket

from lcars_ui.server.events import Envelope, ManifestUpdatePayload, make_envelope


class ConnectionManager:
    """Tracks active websocket connections and supports broadcast messaging."""

    def __init__(self) -> None:
        self._connections: dict[WebSocket, str] = {}
        self._lock: asyncio.Lock | None = None

    def _ensure_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    @property
    def active_count(self) -> int:
        return len(self._connections)

    async def connect(
        self,
        websocket: WebSocket,
        *,
        full_manifest: dict[str, Any] | None = None,
    ) -> str:
        await websocket.accept()
        session_id = str(uuid4())
        async with self._ensure_lock():
            self._connections[websocket] = session_id

        if full_manifest is not None:
            envelope = make_envelope(
                "manifest_update",
                ManifestUpdatePayload(path="", value=full_manifest),
            )
            await websocket.send_json(envelope.model_dump(mode="json"))

        return session_id

    async def disconnect(self, websocket: WebSocket) -> str | None:
        async with self._ensure_lock():
            return self._connections.pop(websocket, None)

    async def send_to(self, websocket: WebSocket, envelope: Envelope) -> None:
        await websocket.send_json(envelope.model_dump(mode="json"))

    async def broadcast(self, envelope: Envelope) -> None:
        dead: list[WebSocket] = []
        payload = envelope.model_dump(mode="json")
        async with self._ensure_lock():
            connections = list(self._connections.keys())

        for websocket in connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                dead.append(websocket)

        if dead:
            async with self._ensure_lock():
                for websocket in dead:
                    self._connections.pop(websocket, None)


class EventBus:
    """Simple async pub/sub for downstream envelopes."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[Envelope]] = set()
        self._lock: asyncio.Lock | None = None

    def _ensure_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def publish(self, envelope: Envelope) -> None:
        async with self._ensure_lock():
            subscribers = list(self._subscribers)
        for queue in subscribers:
            await queue.put(envelope)

    @asynccontextmanager
    async def subscribe(self) -> AsyncIterator[asyncio.Queue[Envelope]]:
        queue: asyncio.Queue[Envelope] = asyncio.Queue()
        async with self._ensure_lock():
            self._subscribers.add(queue)
        try:
            yield queue
        finally:
            async with self._ensure_lock():
                self._subscribers.discard(queue)
