"""The documented authoring path can be tested without runtime internals."""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui import ActionContext, App, ui


def test_two_page_action_end_to_end_through_public_test_client() -> None:
    app = App()

    @app.page("Bridge", path="/", id="bridge")
    def bridge() -> None:
        lcars.config("USS Venture", settings_page=False)
        ui.button("Set Course", id="set-course")

    @app.page("Navigation", path="/navigation", id="navigation")
    def navigation() -> None:
        ui.text("Awaiting orders", id="destination")

    @app.action("set-course")
    def set_course(ctx: ActionContext[str]) -> None:
        ctx.update("destination", content=f"Course laid in for {ctx.value}")

    with app.test_client() as client:
        session = client.session()

        assert session.pages == ["bridge", "navigation"]
        assert session.widget("destination").content == "Awaiting orders"  # type: ignore[attr-defined]

        effects = session.action("set-course", "Risa")

        assert session.widget("destination").content == "Course laid in for Risa"  # type: ignore[attr-defined]
        assert [effect.type for effect in effects] == ["widget_update", "action_ack"]
        assert session.effects_since(type="widget_update") == [effects[0]]
