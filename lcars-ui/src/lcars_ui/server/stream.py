"""Streaming connection management for LCARS realtime protocol."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any, Protocol
from uuid import uuid4

from fastapi import WebSocket

from lcars_ui.server.events import Envelope


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
    """Tracks active downstream connections (WebSocket or SSE) and routes to them.

    Also coordinates *hydration ordering*: while a newly-registered session
    is being sent its reconnect snapshot (see ``App.hydration_envelopes``),
    any envelope concurrently published for that same session is buffered
    in ``_hydrating`` rather than delivered immediately, so it can never
    race ahead of the snapshot. Once the snapshot has been sent, the buffer
    is drained and flushed, in order, directly to that session's
    connection(s). The lock below only ever guards in-memory dict/list
    mutations — it is never held while awaiting a ``send_json`` call, which
    is the actual network I/O.
    """

    def __init__(self) -> None:
        self._connections: dict[Any, str] = {}
        self._hydrating: dict[str, list[Envelope]] = {}
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
        before_hydration: Callable[[str], Awaitable[None]] | None = None,
        hydrate: Callable[[str], Awaitable[list[Envelope]]] | None = None,
    ) -> str:
        """Bind any ``send_json``-capable sink to a resolved session id.

        Used directly by SSE (no handshake to accept); :meth:`connect` is a
        thin WebSocket-specific wrapper around this for the accept step.

        ``before_hydration`` runs first (session-start hooks); ``hydrate``
        then returns the reconnect snapshot envelopes (``session_hydration``
        plus any ``log_snapshot`` messages) to send directly to this
        connection. The session is marked "hydrating" for the whole window
        from registration through the end of ``hydrate``, so anything
        published for it meanwhile queues behind the snapshot instead of
        interleaving with it — see :meth:`_end_hydration`.
        """
        async with self._ensure_lock():
            self._connections[connection] = session_id
            self._hydrating.setdefault(session_id, [])

        try:
            if before_hydration is not None:
                await before_hydration(session_id)

            if hydrate is not None:
                for envelope in await hydrate(session_id):
                    await connection.send_json(envelope.model_dump(mode="json"))
        finally:
            await self._end_hydration(session_id)

        return session_id

    async def connect(
        self,
        websocket: WebSocket,
        session_id: str | None = None,
        *,
        before_hydration: Callable[[str], Awaitable[None]] | None = None,
        hydrate: Callable[[str], Awaitable[list[Envelope]]] | None = None,
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
            before_hydration=before_hydration,
            hydrate=hydrate,
        )

    async def _end_hydration(self, session_id: str) -> None:
        """Drain and flush everything buffered for ``session_id`` during hydration.

        Keeps the session flagged "hydrating" (with an emptied buffer) while
        each flush round is in flight, so anything published *during* the
        flush itself still queues rather than interleaving ahead of older,
        already-buffered envelopes; only once a round finds nothing left to
        flush is the session unflagged. Never holds the lock while awaiting
        ``send_json``.
        """
        while True:
            async with self._ensure_lock():
                pending = self._hydrating.get(session_id, [])
                if not pending:
                    self._hydrating.pop(session_id, None)
                    return
                self._hydrating[session_id] = []
            for envelope in pending:
                await self._direct_send_to_session(session_id, envelope)

    async def _direct_send_to_session(self, session_id: str, envelope: Envelope) -> None:
        """Send straight to whatever connections are bound to ``session_id`` right now.

        Bypasses the hydration buffer entirely — used only to flush
        envelopes that were already captured in it, so re-checking would
        just re-buffer them.
        """
        async with self._ensure_lock():
            targets = [
                connection
                for connection, bound_session_id in self._connections.items()
                if bound_session_id == session_id
            ]
        payload = envelope.model_dump(mode="json")
        dead: list[_JsonSink] = []
        for connection in targets:
            try:
                await connection.send_json(payload)
            except Exception:
                dead.append(connection)
        if dead:
            async with self._ensure_lock():
                for connection in dead:
                    self._connections.pop(connection, None)

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
        """Send ``envelope`` to each connection, buffering instead for a hydrating session.

        A connection whose session is mid-hydration (see :meth:`register`)
        never receives this directly: the envelope is appended to that
        session's buffer under the same lock that resolves it, and gets
        flushed in order once hydration ends. Every other connection is
        delivered to immediately, exactly as before.
        """
        payload = envelope.model_dump(mode="json")
        to_send: list[_JsonSink] = []
        async with self._ensure_lock():
            for connection in connections:
                bound_session_id = self._connections.get(connection)
                buffer = (
                    self._hydrating.get(bound_session_id) if bound_session_id is not None else None
                )
                if buffer is not None:
                    buffer.append(envelope)
                else:
                    to_send.append(connection)

        dead: list[_JsonSink] = []
        for connection in to_send:
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
