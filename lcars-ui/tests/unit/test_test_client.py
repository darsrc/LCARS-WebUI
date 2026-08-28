"""Public App.test_client() behavior."""

from __future__ import annotations

import asyncio

import pytest

import lcars_ui as lcars
from lcars_ui import ActionContext, App, Session, TestClient, ui


def _two_page_app() -> App:
    app = App()

    @app.page("Bridge", id="bridge")
    def bridge() -> None:
        lcars.config("Test Vessel", settings_page=False)
        ui.button("Engage", id="engage")

    @app.page("Engineering", id="engineering")
    def engineering() -> None:
        ui.metric("Warp Core", "Standby", id="warp-core")

    return app


def test_session_exposes_declared_page_order_without_manifest_shape_knowledge() -> None:
    app = _two_page_app()

    with app.test_client() as client:
        session = client.session()

        assert isinstance(client, TestClient)
        assert isinstance(session, Session)
        assert session.pages == ["bridge", "engineering"]


def test_action_dispatches_registered_handler_and_captures_update() -> None:
    app = _two_page_app()

    @app.action("engage")
    def engage(ctx: ActionContext[str]) -> None:
        ctx.update("warp-core", value=ctx.value, status="ok")

    with app.test_client() as client:
        session = client.session()
        returned = session.action("engage", "Online")

        assert session.widget("warp-core").value == "Online"  # type: ignore[attr-defined]
        assert [effect.type for effect in returned] == ["widget_update", "action_ack"]
        assert session.effects_since(type="widget_update") == [returned[0]]


def test_action_mutates_state_without_rerunning_the_page() -> None:
    app = App()
    state = {"engagements": 0}
    page_calls = 0

    @app.page("Bridge", id="bridge")
    def bridge() -> None:
        nonlocal page_calls
        page_calls += 1
        ui.metric("Engagements", str(state["engagements"]), id="engagements")
        ui.button("Engage", id="engage")

    @app.action("engage")
    def engage(ctx: ActionContext[None]) -> None:
        state["engagements"] += 1
        ctx.update("engagements", value=str(state["engagements"]))

    with app.test_client() as client:
        session = client.session()
        assert session.widget("engagements").value == "0"  # type: ignore[attr-defined]

        mark = len(session.effects)
        session.action("engage")

        assert state == {"engagements": 1}
        assert session.widget("engagements").value == "1"  # type: ignore[attr-defined]
        assert page_calls == 1
        assert [effect.type for effect in session.effects_since(mark)] == [
            "widget_update",
            "action_ack",
        ]


def test_two_client_sessions_keep_independent_widget_state() -> None:
    app = _two_page_app()

    @app.action("engage")
    def engage(ctx: ActionContext[None]) -> None:
        ctx.update("warp-core", value="Online")

    with app.test_client() as client:
        first = client.session(session_id="first")
        second = client.session(session_id="second")

        first.action("engage")

        assert first.widget("warp-core").value == "Online"  # type: ignore[attr-defined]
        assert second.widget("warp-core").value == "Standby"  # type: ignore[attr-defined]


def test_async_action_handler_is_awaited() -> None:
    app = _two_page_app()
    completed: list[str] = []

    @app.action("engage")
    async def engage(ctx: ActionContext[None]) -> None:
        await asyncio.sleep(0)
        completed.append("awaited")
        ctx.notify("Warp core online", level="success")

    with app.test_client() as client:
        session = client.session()
        returned = session.action("engage")

        assert completed == ["awaited"]
        assert [effect.type for effect in returned] == ["notification", "action_ack"]


def test_log_effects_are_retained_and_queryable_by_stream() -> None:
    app = _two_page_app()

    @app.action("engage")
    def engage(ctx: ActionContext[None]) -> None:
        ctx.append_log("operations", "course accepted", "warp core online")

    with app.test_client() as client:
        session = client.session()
        session.action("engage")

        assert session.logs("operations") == ["course accepted", "warp core online"]
        assert len(session.effects_since(type="log_chunk")) == 1


def test_action_handler_exception_is_reraised_at_action_call() -> None:
    app = _two_page_app()

    @app.action("engage")
    def engage(_: ActionContext[None]) -> None:
        raise RuntimeError("dilithium matrix failure")

    with app.test_client() as client:
        session = client.session()

        with pytest.raises(RuntimeError, match="dilithium matrix failure"):
            session.action("engage")


def test_form_submit_resolves_form_action_and_passes_payload() -> None:
    app = App()
    received: list[dict[str, object]] = []

    @app.page("Configuration", id="configuration")
    def configuration() -> None:
        lcars.config("Form Test", settings_page=False)
        with ui.form("Core Configuration", action_id="save-core", id="core-form"):
            ui.number_input("Warp Factor", id="warp-factor")

    @app.action("save-core")
    def save_core(ctx: ActionContext[dict[str, object]]) -> None:
        received.append(ctx.value)
        ctx.update("warp-factor", value=ctx.value["warp-factor"])

    with app.test_client() as client:
        session = client.session()
        returned = session.submit("core-form", {"warp-factor": 8.5})

        assert received == [{"warp-factor": 8.5}]
        assert session.widget("warp-factor").value == 8.5  # type: ignore[attr-defined]
        assert [effect.type for effect in returned] == ["widget_update", "action_ack"]


@pytest.mark.xfail(
    reason="Wave 2a will route effects to their originating session instead of broadcasting",
    strict=True,
)
def test_effect_from_one_session_is_not_captured_by_another_session() -> None:
    app = _two_page_app()

    @app.action("engage")
    def engage(ctx: ActionContext[None]) -> None:
        ctx.update("warp-core", value="Online")

    with app.test_client() as client:
        first = client.session(session_id="first")
        second = client.session(session_id="second")
        second_mark = len(second.effects)

        first.action("engage")

        assert second.effects_since(second_mark) == []
