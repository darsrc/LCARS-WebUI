"""Public in-process test harness for declarative LCARS applications."""

from __future__ import annotations

import asyncio
import threading
from collections.abc import Coroutine
from concurrent.futures import Future
from queue import Queue
from types import TracebackType
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast
from uuid import uuid4

from pydantic import BaseModel

from lcars_ui.core.models import Manifest
from lcars_ui.core.widget_base import BaseWidget
from lcars_ui.server.events import (
    ActionPayload,
    DownstreamType,
    Envelope,
    FormSubmitPayload,
    ManifestUpdatePayload,
    WidgetUpdatePayload,
)

if TYPE_CHECKING:
    from lcars_ui.application import App

T = TypeVar("T")


class _AsyncRunner:
    """Run all harness coroutines on one private event loop."""

    def __init__(self) -> None:
        self._loop = asyncio.new_event_loop()
        self._queue: Queue[tuple[Coroutine[Any, Any, Any], Future[Any]] | None] = Queue()
        self._ready = threading.Event()
        self._closed = False
        self._thread = threading.Thread(
            target=self._run_loop,
            name="lcars-test-client",
            daemon=True,
        )
        self._thread.start()
        self._ready.wait()

    def _run_loop(self) -> None:
        asyncio.set_event_loop(self._loop)
        self._ready.set()
        while True:
            item = self._queue.get()
            if item is None:
                break
            coroutine, future = item
            try:
                future.set_result(self._loop.run_until_complete(coroutine))
            except BaseException as exc:  # propagate the original handler error
                future.set_exception(exc)
        self._loop.close()

    def run(self, coroutine: Coroutine[Any, Any, T]) -> T:
        if self._closed:
            coroutine.close()
            raise RuntimeError("TestClient is closed")
        future: Future[T] = Future()
        self._queue.put((coroutine, future))
        return future.result()

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._queue.put(None)
        self._thread.join()


class TestClient:
    """Synchronous, in-process harness returned by :meth:`App.test_client`.

    Create independent sessions with :meth:`session`. The client is also a
    context manager; using it that way closes application-scoped and
    session-scoped services at the end of a test.
    """

    __test__ = False

    def __init__(self, app: App) -> None:
        self._app = app
        self._built_manifest = app.build_manifest()
        self._sessions: dict[str, Session] = {}
        self._runner = _AsyncRunner()
        self._closed = False

    def session(self, *, session_id: str | None = None) -> Session:
        """Create an independent application session.

        ``session_id`` is optional and is mainly useful when a test needs a
        stable value to assert against. Reusing an active id is rejected.
        """
        if self._closed:
            raise RuntimeError("TestClient is closed")
        resolved_id = session_id or str(uuid4())
        if resolved_id in self._sessions:
            raise ValueError(f"Test session id is already in use: {resolved_id!r}")

        session = Session(self, resolved_id, self._built_manifest.model_copy(deep=True))
        self._sessions[resolved_id] = session
        effects = self._runner.run(self._capture_session_start(resolved_id))
        self._record_effects(session, effects)
        return session

    async def _capture_session_start(self, session_id: str) -> list[Envelope]:
        async with self._app.event_bus.subscribe() as queue:
            await self._app.run_session_start(session_id)
            return _drain_downstream(queue)

    def _dispatch(
        self,
        session: Session,
        *,
        event_type: Literal["action", "form_submit"],
        payload: ActionPayload | FormSubmitPayload,
    ) -> list[Envelope]:
        effects = self._runner.run(
            self._capture_dispatch(
                session_id=session.session_id,
                event_type=event_type,
                payload=payload,
            )
        )
        self._record_effects(session, effects)
        return effects

    async def _capture_dispatch(
        self,
        *,
        session_id: str,
        event_type: Literal["action", "form_submit"],
        payload: ActionPayload | FormSubmitPayload,
    ) -> list[Envelope]:
        # Import lazily to avoid coupling application construction to the
        # FastAPI module. This is the exact dispatcher used by WebSocket and
        # HTTP actions, including registry matching and action_ack publication.
        from lcars_ui.app import _handle_upstream_event  # noqa: PLC0415

        async with self._app.event_bus.subscribe() as queue:
            await _handle_upstream_event(
                event_bus=self._app.event_bus,
                action_handlers=self._app.action_handlers,
                event_type=event_type,
                payload=payload,
                session_id=session_id,
            )
            return _drain_downstream(queue)

    def _record_effects(self, source: Session, effects: list[Envelope]) -> None:
        # The runtime currently broadcasts downstream effects. Preserve that
        # observable behavior in capture while keeping each harness session's
        # rendered manifest independent. Wave 1d will add routed audiences.
        for session in self._sessions.values():
            session._effects.extend(effects)
        for effect in effects:
            source._apply_effect(effect)

    def close(self) -> None:
        """Close resolved services and stop the harness event loop."""
        if self._closed:
            return
        try:
            self._runner.run(self._shutdown())
        finally:
            self._closed = True
            self._runner.close()

    async def _shutdown(self) -> None:
        for session_id in tuple(self._sessions):
            await self._app.clear_session_state(session_id)
        await self._app.shutdown()

    def __enter__(self) -> TestClient:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()


class Session:
    """One isolated rendered application state within a :class:`TestClient`."""

    def __init__(self, client: TestClient, session_id: str, manifest: Manifest) -> None:
        self._client = client
        self.session_id = session_id
        self._manifest = manifest
        self._effects: list[Envelope] = []
        self._logs: dict[str, list[str]] = {}

    @property
    def manifest(self) -> Manifest:
        """Return this session's current typed manifest."""
        return self._manifest

    @property
    def pages(self) -> list[str]:
        """Return page ids in declaration order without exposing serialization shape."""
        return list(self._manifest.pages)

    @property
    def effects(self) -> list[Envelope]:
        """Return a snapshot of all downstream envelopes captured by this session."""
        return list(self._effects)

    def effects_since(
        self,
        index: int = 0,
        *,
        type: DownstreamType | None = None,
    ) -> list[Envelope]:
        """Return captured effects at or after ``index``, optionally filtered by type.

        Use ``mark = len(session.effects)`` before an operation and pass ``mark``
        afterward. Omitting ``index`` makes ``type=`` a query over all effects.
        """
        if index < 0 or index > len(self._effects):
            raise IndexError(f"Effect index out of range: {index}")
        effects = self._effects[index:]
        if type is not None:
            effects = [effect for effect in effects if effect.type == type]
        return list(effects)

    def widget(self, widget_id: str) -> BaseWidget:
        """Return a widget's current rendered state, including applied effects."""
        widget = _find_widget(self._manifest.pages, widget_id)
        if widget is None:
            raise KeyError(f"Unknown widget id: {widget_id!r}")
        return widget

    def action(self, widget_id: str, value: Any = None) -> list[Envelope]:
        """Dispatch a real action and return its downstream effects.

        Sync and async ``@app.action`` handlers are both supported. Handler
        exceptions are re-raised to the test at this call site.
        """
        return self._client._dispatch(
            self,
            event_type="action",
            payload=ActionPayload(id=widget_id, value=value),
        )

    def submit(self, form_id: str, payload: dict[str, Any]) -> list[Envelope]:
        """Submit a declared form through the real form dispatch path."""
        form = self.widget(form_id)
        if form.type != "form":
            raise ValueError(f"Widget {form_id!r} is not a form")
        action_id = getattr(form, "action_id", None)
        if not isinstance(action_id, str):
            raise ValueError(f"Form {form_id!r} does not declare an action id")
        return self._client._dispatch(
            self,
            event_type="form_submit",
            payload=FormSubmitPayload(id=action_id, data=payload),
        )

    def logs(self, stream_id: str) -> list[str]:
        """Return retained log lines for ``stream_id`` in arrival order."""
        return list(self._logs.get(stream_id, []))

    def _apply_effect(self, envelope: Envelope) -> None:
        if envelope.type == "widget_update":
            payload = cast(WidgetUpdatePayload, envelope.payload)
            manifest_data = self._manifest.model_dump(mode="python")
            if _patch_widget(manifest_data["pages"], payload.id, payload.data):
                self._manifest = Manifest.model_validate(manifest_data)
            return
        if envelope.type == "manifest_update":
            self._apply_manifest_update(cast(ManifestUpdatePayload, envelope.payload))
            return
        if envelope.type == "log_chunk":
            stream_id = envelope.payload.stream_id
            self._logs.setdefault(stream_id, []).extend(envelope.payload.lines)

    def _apply_manifest_update(self, payload: ManifestUpdatePayload) -> None:
        if payload.path == "":
            self._manifest = Manifest.model_validate(payload.value)
            return
        manifest_data = self._manifest.model_dump(mode="python")
        if _set_dotted_path(manifest_data, payload.path, payload.value):
            self._manifest = Manifest.model_validate(manifest_data)


def _drain_downstream(queue: asyncio.Queue[Envelope]) -> list[Envelope]:
    effects: list[Envelope] = []
    while not queue.empty():
        envelope = queue.get_nowait()
        if envelope.type in {
            "manifest_update",
            "widget_update",
            "log_chunk",
            "notification",
            "action_ack",
        }:
            effects.append(envelope)
    return effects


def _find_widget(value: Any, widget_id: str) -> BaseWidget | None:
    if isinstance(value, BaseWidget) and value.id == widget_id:
        return value
    values: Any
    if isinstance(value, BaseModel):
        values = value.__dict__.values()
    elif isinstance(value, dict):
        values = value.values()
    elif isinstance(value, (list, tuple)):
        values = value
    else:
        return None
    for child in values:
        found = _find_widget(child, widget_id)
        if found is not None:
            return found
    return None


def _patch_widget(value: Any, widget_id: str, data: dict[str, Any]) -> bool:
    if isinstance(value, dict):
        if value.get("id") == widget_id and "type" in value:
            value.update(data)
            return True
        return any(_patch_widget(child, widget_id, data) for child in value.values())
    if isinstance(value, list):
        return any(_patch_widget(child, widget_id, data) for child in value)
    return False


def _set_dotted_path(target: dict[str, Any], path: str, value: Any) -> bool:
    parts = path.split(".")
    node: Any = target
    for part in parts[:-1]:
        if not isinstance(node, dict) or part not in node:
            return False
        node = node[part]
    if not isinstance(node, dict):
        return False
    node[parts[-1]] = value
    return True


__all__ = ["Session", "TestClient"]
