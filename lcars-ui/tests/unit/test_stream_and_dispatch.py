"""Unit tests for stream.py and dispatch_plugin_action coverage gaps."""

from __future__ import annotations

import pytest

from lcars_ui.plugins.loader import dispatch_plugin_action
from lcars_ui.server.events import ActionAckPayload, ActionPayload, make_envelope
from lcars_ui.server.stream import ConnectionManager, EventBus

# ---------------------------------------------------------------------------
# dispatch_plugin_action
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_dispatch_plugin_action_returns_false_when_no_handler_matches() -> None:
    """dispatch_plugin_action must return False when no pattern matches."""
    handlers = {"sensors_*": lambda action_id, value: None}
    matched = await dispatch_plugin_action(
        handlers=handlers,
        action_id="navigation_warp",
        value=None,
    )
    assert matched is False


@pytest.mark.asyncio
async def test_dispatch_plugin_action_returns_true_when_handler_matches() -> None:
    """dispatch_plugin_action must return True when a pattern matches."""
    called: list[str] = []

    def _handler(action_id: str, value: object) -> None:
        called.append(action_id)

    handlers = {"bridge_*": _handler}
    matched = await dispatch_plugin_action(
        handlers=handlers,
        action_id="bridge_lights",
        value="dim",
    )
    assert matched is True
    assert called == ["bridge_lights"]


@pytest.mark.asyncio
async def test_dispatch_plugin_action_supports_async_handler() -> None:
    """dispatch_plugin_action must await coroutine handlers."""
    results: list[str] = []

    async def _async_handler(action_id: str, value: object) -> None:
        results.append(f"{action_id}:{value}")

    handlers = {"eng_*": _async_handler}
    matched = await dispatch_plugin_action(
        handlers=handlers,
        action_id="eng_eject",
        value="warp_core",
    )
    assert matched is True
    assert results == ["eng_eject:warp_core"]


# ---------------------------------------------------------------------------
# ConnectionManager.send_to
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_connection_manager_send_to_delivers_to_single_websocket() -> None:
    """send_to must call send_json on exactly the targeted websocket."""
    sent: list[object] = []

    class FakeWebSocket:
        async def accept(self) -> None:
            pass

        async def send_json(self, payload: object) -> None:
            sent.append(payload)

    manager = ConnectionManager()
    ws = FakeWebSocket()
    await manager.connect(ws)  # type: ignore[arg-type]

    envelope = make_envelope("action_ack", ActionAckPayload(action_id="targeted", status="ok"))
    await manager.send_to(ws, envelope)  # type: ignore[arg-type]

    assert len(sent) == 1
    assert sent[0]["payload"]["action_id"] == "targeted"  # type: ignore[index]


# ---------------------------------------------------------------------------
# EventBus — pub/sub delivery (core of SSE and WS fan-out)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_event_bus_delivers_published_envelope_to_subscriber() -> None:
    """An envelope published to the bus must arrive in the subscriber's queue."""
    bus = EventBus()
    envelope = make_envelope("action", ActionPayload(id="bus_test", value=None))

    async with bus.subscribe() as queue:
        await bus.publish(envelope)
        received = queue.get_nowait()

    assert received.type == "action"
    assert received.payload.id == "bus_test"  # type: ignore[union-attr]


@pytest.mark.asyncio
async def test_event_bus_delivers_to_multiple_subscribers() -> None:
    """All active subscribers must receive every published envelope."""
    bus = EventBus()
    envelope = make_envelope("action_ack", ActionAckPayload(action_id="multi", status="ok"))

    async with bus.subscribe() as q1, bus.subscribe() as q2:
        await bus.publish(envelope)
        r1 = q1.get_nowait()
        r2 = q2.get_nowait()

    assert r1.type == r2.type == "action_ack"


@pytest.mark.asyncio
async def test_event_bus_unsubscribes_on_context_exit() -> None:
    """After the subscribe context exits, the queue is no longer in subscribers."""
    bus = EventBus()

    async with bus.subscribe() as queue:
        pass  # context exits immediately

    # Publishing after unsubscribe must not error and must not reach the queue.
    envelope = make_envelope("action", ActionPayload(id="gone", value=None))
    await bus.publish(envelope)  # should not raise
    assert queue.empty()
