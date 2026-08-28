"""Wave 1b coverage for declarative App pages and explicit actions."""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient

import lcars_ui as lcars
from lcars_ui import ui
from lcars_ui.app import create_app
from lcars_ui.application import ActionContext, App
from lcars_ui.plugins.loader import dispatch_plugin_action


@dataclass
class _AppService:
    name: str


@dataclass
class _SessionService:
    sequence: int


def test_declarative_pages_build_once_in_order_with_automatic_navigation() -> None:
    app = App()
    declarations: list[str] = []

    @app.page("Bridge", path="/", id="bridge")
    def bridge() -> None:
        declarations.append("bridge")
        lcars.config("Declarative", settings_page=False)
        ui.text("Command ready", id="bridge-status")

    @app.page("Engineering", path="/engineering")
    def engineering() -> None:
        declarations.append("engineering")
        ui.metric("Warp Core", "Online", id="warp-core")

    @app.page("Classified", path="/classified", nav=False)
    def classified() -> None:
        declarations.append("classified")
        ui.text("Restricted", id="classified-copy")

    manifest = app.build_manifest()

    assert declarations == ["bridge", "engineering", "classified"]
    assert list(manifest.pages) == ["bridge", "engineering", "classified"]
    assert [page.title for page in manifest.pages.values()] == [
        "Bridge",
        "Engineering",
        "Classified",
    ]
    assert [
        (item.label, item.target_page) for item in manifest.layout.sidebar.items
    ] == [
        ("Bridge", "bridge"),
        ("Engineering", "engineering"),
    ]


@pytest.mark.asyncio
async def test_explicit_async_action_publishes_its_update_envelope() -> None:
    app = App()

    @app.action("set-reactor")
    async def set_reactor(ctx: ActionContext[str]) -> None:
        await asyncio.sleep(0)
        ctx.update("reactor-status", value=ctx.value)

    async with app.event_bus.subscribe() as queue:
        matched = await dispatch_plugin_action(
            handlers=app.action_handlers,
            action_id="set-reactor",
            value="nominal",
            session_id="session-action",
        )
        envelope = queue.get_nowait()

    assert matched is True
    assert envelope.model_dump(mode="json")["type"] == "widget_update"
    assert envelope.payload.model_dump(mode="json") == {
        "id": "reactor-status",
        "data": {"value": "nominal"},
    }


@pytest.mark.asyncio
async def test_exact_sync_action_precedes_an_already_registered_legacy_wildcard() -> None:
    app = App()
    legacy_calls: list[str] = []

    def legacy_handler(action_id: str, value: object) -> None:
        legacy_calls.append(action_id)

    app.action_handlers["*"] = legacy_handler

    @app.action("x")
    def exact_handler(ctx: ActionContext[None]) -> None:
        ctx.update("exact-result", selected=True)

    assert list(app.action_handlers) == ["x", "*"]
    async with app.event_bus.subscribe() as queue:
        await dispatch_plugin_action(
            handlers=app.action_handlers,
            action_id="x",
            value=None,
            session_id="session-exact",
        )
        envelope = queue.get_nowait()

    assert envelope.payload.model_dump(mode="json") == {
        "id": "exact-result",
        "data": {"selected": True},
    }
    assert legacy_calls == []


@pytest.mark.asyncio
async def test_action_injects_app_and_session_scoped_services() -> None:
    app = App()
    app_service = _AppService("shared")
    session_sequence = 0
    received: list[tuple[str, _AppService, _SessionService]] = []

    def make_session_service() -> _SessionService:
        nonlocal session_sequence
        session_sequence += 1
        return _SessionService(session_sequence)

    app.provide(_AppService, lambda: app_service)
    app.provide(_SessionService, make_session_service, scope="session")

    @app.action("resolve-services")
    async def resolve_services(
        ctx: ActionContext[None],
        shared: _AppService,
        per_session: _SessionService,
    ) -> None:
        received.append((ctx.session_id, shared, per_session))

    for session_id in ("session-a", "session-a", "session-b"):
        await dispatch_plugin_action(
            handlers=app.action_handlers,
            action_id="resolve-services",
            value=None,
            session_id=session_id,
        )

    assert [item[0] for item in received] == ["session-a", "session-a", "session-b"]
    assert all(item[1] is app_service for item in received)
    assert received[0][2] is received[1][2]
    assert received[0][2] is not received[2][2]
    await app.shutdown()


def test_runtime_runs_two_live_jobs_at_their_own_intervals_and_stops_both() -> None:
    app = App()
    counts = {"fast": 0, "slow": 0}

    @app.page("Live", nav=False)
    def live_page() -> None:
        lcars.config("Live jobs", settings_page=False)
        ui.text("Polling", id="polling")

    @app.live(interval=0.01)
    def fast_job() -> None:
        counts["fast"] += 1

    @app.live(interval=0.025, audience="session")
    def slow_job() -> None:
        counts["slow"] += 1

    runtime = create_app(manifest=app.build_manifest(), app=app)
    with TestClient(runtime):
        time.sleep(0.09)
        live_tasks = tuple(app._live_tasks)
        assert len(live_tasks) == 2

    stopped_counts = counts.copy()
    time.sleep(0.04)

    assert counts["fast"] > counts["slow"] >= 2
    assert counts == stopped_counts
    assert all(task.done() for task in live_tasks)


@pytest.mark.asyncio
async def test_session_start_runs_once_per_session_before_hydration_and_emits_effects() -> None:
    app = App()
    calls: list[str] = []
    order: list[str] = []

    @app.session_start
    def initialize(ctx: ActionContext[None]) -> None:
        calls.append(ctx.session_id)
        order.append(f"hook:{ctx.session_id}")
        ctx.notify(f"Session {ctx.session_id} ready")

    class FakeWebSocket:
        async def accept(self) -> None:
            pass

        async def send_json(self, payload: object) -> None:
            order.append("hydrate")

    async with app.event_bus.subscribe() as queue:
        first_session = await app.connection_manager.connect(
            FakeWebSocket(),  # type: ignore[arg-type]
            full_manifest={"meta": {}},
            before_hydration=app.run_session_start,
        )
        first_effect = queue.get_nowait()
        await app.run_session_start(first_session)

        second_session = await app.connection_manager.connect(
            FakeWebSocket(),  # type: ignore[arg-type]
            full_manifest={"meta": {}},
            before_hydration=app.run_session_start,
        )
        second_effect = queue.get_nowait()

    assert calls == [first_session, second_session]
    assert order == [
        f"hook:{first_session}",
        "hydrate",
        f"hook:{second_session}",
        "hydrate",
    ]
    assert first_effect.type == second_effect.type == "notification"
    assert first_effect.payload.message == f"Session {first_session} ready"  # type: ignore[union-attr]
    assert second_effect.payload.message == f"Session {second_session} ready"  # type: ignore[union-attr]
