"""Unit coverage for application-owned runtime state."""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass
from importlib import import_module

import pytest

from lcars_ui.application import App


def test_removed_run_is_not_importable() -> None:
    module = import_module("lcars_ui")

    with pytest.raises(AttributeError):
        module.__getattribute__("run")


def test_apps_have_independent_session_stores() -> None:
    first = App()
    second = App()

    first.get_session_state("shared-session")["shared-toggle"] = True

    assert first.get_session_state("shared-session")["shared-toggle"] is True
    assert second.get_session_state("shared-session") == {}


def test_app_accepts_multiple_live_jobs() -> None:
    app = App()

    def first_job() -> None:
        pass

    def second_job() -> None:
        pass

    app.register_live(first_job, interval=1.0)
    app.register_live(second_job, interval=2.0, audience="session")

    assert app.live_jobs == [
        (first_job, 1.0, "all"),
        (second_job, 2.0, "session"),
    ]


@pytest.mark.asyncio
async def test_service_scopes_construct_and_reuse_at_the_right_boundaries() -> None:
    @dataclass
    class AppService:
        sequence: int

    @dataclass
    class SessionService:
        sequence: int

    app_creations = 0
    session_creations = 0

    async def make_app_service() -> AppService:
        nonlocal app_creations
        app_creations += 1
        return AppService(app_creations)

    def make_session_service() -> SessionService:
        nonlocal session_creations
        session_creations += 1
        return SessionService(session_creations)

    app = App()
    app.provide(AppService, make_app_service)
    app.provide(SessionService, make_session_service, scope="session")

    app_first = await app.resolve(AppService)
    app_second = await app.resolve(AppService, session_id="session-b")
    session_a_first = await app.resolve(SessionService, session_id="session-a")
    session_a_second = await app.resolve(SessionService, session_id="session-a")
    session_b = await app.resolve(SessionService, session_id="session-b")

    assert app_first is app_second
    assert app_creations == 1
    assert session_a_first is session_a_second
    assert session_a_first is not session_b
    assert session_creations == 2

    await app.shutdown()


@pytest.mark.asyncio
async def test_context_manager_services_close_at_scope_boundaries() -> None:
    class AppResource:
        pass

    class SessionResource:
        pass

    events: list[str] = []

    @asynccontextmanager
    async def app_resource() -> AsyncIterator[AppResource]:
        events.append("app-open")
        try:
            yield AppResource()
        finally:
            events.append("app-close")

    @contextmanager
    def session_resource() -> Iterator[SessionResource]:
        events.append("session-open")
        try:
            yield SessionResource()
        finally:
            events.append("session-close")

    app = App()
    app.provide(AppResource, app_resource)
    app.provide(SessionResource, session_resource, scope="session")

    await app.resolve(AppResource)
    await app.resolve(SessionResource, session_id="session-a")
    await app.clear_session_state("session-a")

    assert events == ["app-open", "session-open", "session-close"]

    await app.shutdown()

    assert events == ["app-open", "session-open", "session-close", "app-close"]


def test_serve_forwards_assets_dir_to_create_app(monkeypatch: pytest.MonkeyPatch) -> None:
    """``App.serve()`` must forward ``assets_dir`` to ``create_app`` rather than
    forcing callers to hand-roll their own ``create_app`` + ``uvicorn.run``
    (e.g. for a ``three_scene`` widget's project asset mount)."""
    import lcars_ui.app as app_module

    app = App()

    @app.page("Home")
    def home() -> None:
        pass

    captured: dict[str, object] = {}

    def fake_create_app(*, manifest: object, app: App, assets_dir: object = None) -> str:
        captured["manifest"] = manifest
        captured["app"] = app
        captured["assets_dir"] = assets_dir
        return "sentinel-asgi-app"

    run_calls: list[dict[str, object]] = []

    def fake_run(server: object, *, host: str, port: int) -> None:
        run_calls.append({"server": server, "host": host, "port": port})

    monkeypatch.setattr(app_module, "create_app", fake_create_app)
    monkeypatch.setattr("uvicorn.run", fake_run)

    app.serve(host="127.0.0.1", port=8078, assets_dir="examples/kitchen_sink/assets")

    assert captured["assets_dir"] == "examples/kitchen_sink/assets"
    assert captured["app"] is app
    assert run_calls == [{"server": "sentinel-asgi-app", "host": "127.0.0.1", "port": 8078}]


def test_serve_assets_dir_defaults_to_none(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apps that do not need project assets should not have to pass anything."""
    import lcars_ui.app as app_module

    app = App()

    @app.page("Home")
    def home() -> None:
        pass

    captured: dict[str, object] = {}

    def fake_create_app(*, manifest: object, app: App, assets_dir: object = None) -> str:
        captured["assets_dir"] = assets_dir
        return "sentinel-asgi-app"

    monkeypatch.setattr(app_module, "create_app", fake_create_app)
    monkeypatch.setattr("uvicorn.run", lambda *args, **kwargs: None)

    app.serve(port=8078)

    assert captured["assets_dir"] is None
