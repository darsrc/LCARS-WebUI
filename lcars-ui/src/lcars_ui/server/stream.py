"""Streaming connection management for LCARS realtime protocol."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any, Protocol
from uuid import uuid4

from fastapi import WebSocket

from lcars_ui.server.events import Envelope, ManifestUpdatePayload, make_envelope


class _JsonSink(Protocol):
    """Anything a downstream envelope can be delivered to.

    A real :class:`~fastapi.WebSocket` satisfies this already. SSE
    connections register a lightweight sink (see ``app.py``) that puts the
    payload on a per-request queue instead of pushing it over a socket, so
    both transports share the exact same registration/routing/broadcast
    code below.
    """

    async def send_json(self, payload: dict[str, Any]) -> None: ...


class ConnectionManager:
    """Tracks active downstream connections (WebSocket or SSE) and routes to them."""

    def __init__(self) -> None:
        self._connections: dict[Any, str] = {}
        self._lock: asyncio.Lock | None = None

    def _ensure_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    @property
    def active_count(self) -> int:
        return len(self._connections)

    async def register(
        self,
        connection: _JsonSink,
        session_id: str,
        *,
        full_manifest: dict[str, Any] | None = None,
        before_hydration: Callable[[str], Awaitable[None]] | None = None,
    ) -> str:
        """Bind any ``send_json``-capable sink to a resolved session id.

        Used directly by SSE (no handshake to accept); :meth:`connect` is a
        thin WebSocket-specific wrapper around this for the accept step.
        """
        async with self._ensure_lock():
            self._connections[connection] = session_id

        if before_hydration is not None:
            await before_hydration(session_id)

        if full_manifest is not None:
            envelope = make_envelope(
                "manifest_update",
                ManifestUpdatePayload(path="", value=full_manifest),
            )
            await connection.send_json(envelope.model_dump(mode="json"))

        return session_id

    async def connect(
        self,
        websocket: WebSocket,
        session_id: str | None = None,
        *,
        full_manifest: dict[str, Any] | None = None,
        before_hydration: Callable[[str], Awaitable[None]] | None = None,
    ) -> str:
        """Accept a websocket and register it under a resolved session id.

        ``session_id`` is normally resolved up front from the client's
        session token (see ``App.resolve_session``); it is optional here
        only so low-level tests that do not care about real session
        identity can keep omitting it, exactly as before.
        """
        await websocket.accept()
        resolved_id = session_id or str(uuid4())
        return await self.register(
            websocket,
            resolved_id,
            full_manifest=full_manifest,
            before_hydration=before_hydration,
        )

    async def disconnect(self, connection: _JsonSink) -> str | None:
        async with self._ensure_lock():
            return self._connections.pop(connection, None)

    async def send_to(self, websocket: _JsonSink, envelope: Envelope) -> None:
        """Deliver one envelope to exactly one already-known connection."""
        await websocket.send_json(envelope.model_dump(mode="json"))

    async def send_to_session(self, session_id: str, envelope: Envelope) -> None:
        """Deliver one envelope to every live connection bound to one session.

        A session may briefly hold more than one connection (e.g. a WS
        reconnect overlapping the old socket's teardown), so this fans out
        to all of them rather than assuming exactly one.
        """
        async with self._ensure_lock():
            targets = [
                connection
                for connection, bound_session_id in self._connections.items()
                if bound_session_id == session_id
            ]
        await self._deliver(targets, envelope)

    async def broadcast(self, envelope: Envelope) -> None:
        async with self._ensure_lock():
            connections = list(self._connections.keys())
        await self._deliver(connections, envelope)

    async def _deliver(self, connections: list[_JsonSink], envelope: Envelope) -> None:
        dead: list[_JsonSink] = []
        payload = envelope.model_dump(mode="json")

        for connection in connections:
            try:
                await connection.send_json(payload)
            except Exception:
                dead.append(connection)

        if dead:
            async with self._ensure_lock():
                for connection in dead:
                    self._connections.pop(connection, None)


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
