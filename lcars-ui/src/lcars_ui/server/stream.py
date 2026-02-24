"""Streaming connection management for LCARS realtime protocol."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import WebSocket

from lcars_ui.server.events import Envelope


class ConnectionManager:
    """Tracks active websocket connections and supports broadcast messaging."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    @property
    def active_count(self) -> int:
        return len(self._connections)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def send_to(self, websocket: WebSocket, envelope: Envelope) -> None:
        await websocket.send_json(envelope.model_dump(mode="json"))

    async def broadcast(self, envelope: Envelope) -> None:
        dead: list[WebSocket] = []
        payload = envelope.model_dump(mode="json")
        async with self._lock:
            connections = list(self._connections)

        for websocket in connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                dead.append(websocket)

        if dead:
            async with self._lock:
                for websocket in dead:
                    self._connections.discard(websocket)


class EventBus:
    """Simple async pub/sub for downstream envelopes."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[Envelope]] = set()
        self._lock = asyncio.Lock()

    async def publish(self, envelope: Envelope) -> None:
        async with self._lock:
            subscribers = list(self._subscribers)
        for queue in subscribers:
            await queue.put(envelope)

    @asynccontextmanager
    async def subscribe(self) -> AsyncIterator[asyncio.Queue[Envelope]]:
        queue: asyncio.Queue[Envelope] = asyncio.Queue()
        async with self._lock:
            self._subscribers.add(queue)
        try:
            yield queue
        finally:
            async with self._lock:
                self._subscribers.discard(queue)
