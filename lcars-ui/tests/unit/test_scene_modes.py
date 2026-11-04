import asyncio

import pytest

from lcars_ui import ActionContext, App, ui
from lcars_ui.core.models import SceneWidget


def make_app() -> App:
    app = App()

    @app.page("Scene", layout="scene")
    def page() -> None:
        with ui.scene(initial_mode="inspect") as scene:
            with scene.region("sample", label="Sample"):
                ui.button("Compare", id="compare")
            scene.mode("inspect", "Inspect", focal=["sample"], required=["sample"])
            scene.mode(
                "compare", "Compare", focal=["sample"], required=["sample"], returns_to="inspect"
            )
            scene.transition(on="compare", to="compare")

    @app.action("end")
    def end(ctx: ActionContext[None]) -> None:
        ctx.end_mode()

    @app.action("unknown")
    def unknown(ctx: ActionContext[None]) -> None:
        ctx.set_mode("missing")

    return app


def test_mode_sessions_and_hydration() -> None:
    app = make_app()
    with app.test_client() as client:
        first = client.session(session_id="first")
        second = client.session(session_id="second")
        app.seed_projection(first.manifest.model_dump(mode="json"))
        effects = first.action("compare")
        assert isinstance(first.widget("scene"), SceneWidget)
        assert first.widget("scene").mode == "compare"
        assert second.widget("scene").mode is None
        for effect in effects:
            asyncio.run(app.apply_downstream_envelope_to_projection(effect))
        hydration = asyncio.run(app.hydration_envelopes("first"))
        manifest = hydration[0].payload.manifest
        scene = manifest["pages"]["scene"]["rows"][0]["columns"][0]["widgets"][0]
        assert scene["mode"] == "compare"
        first.action("end")
        assert first.widget("scene").mode == "inspect"
        with pytest.raises(ValueError, match="no returns_to"):
            first.action("end")
        with pytest.raises(ValueError, match="unknown scene mode"):
            first.action("unknown")


def test_transition_conflicts_and_invalid_target() -> None:
    app = make_app()
    app.action("compare")(lambda ctx: None)
    with pytest.raises(ValueError, match="compare"):
        app.build_manifest()
    app = make_app()
    app.build_manifest()
    with pytest.raises(ValueError, match="compare"):
        app.action("compare")(lambda ctx: None)

    app = App()

    @app.page("Scene", layout="scene")
    def page() -> None:
        with ui.scene(initial_mode="inspect") as scene:
            with scene.region("sample", label="Sample"):
                ui.text("Sample")
            scene.mode("inspect", "Inspect", focal=["sample"], required=["sample"])
            scene.transition(on="go", to="missing")

    with pytest.raises(ValueError, match="missing"):
        app.build_manifest()


def test_return_action_registration_and_invocation() -> None:
    app = make_app()
    app.build_manifest()
    assert "scene.return" in app.action_handlers
    assert "scene.return" in app._transition_ids
    app.build_manifest()
    with app.test_client() as client:
        session = client.session()
        session.action("compare")
        session.action("scene.return")
        assert session.widget("scene").mode == "inspect"


def test_return_action_absent_without_return_mode() -> None:
    app = App()

    @app.page("Scene", layout="scene")
    def page() -> None:
        with ui.scene(initial_mode="inspect") as scene:
            with scene.region("sample", label="Sample"):
                ui.text("Sample")
            scene.mode("inspect", "Inspect", focal=["sample"], required=["sample"])

    app.build_manifest()
    assert "scene.return" not in app.action_handlers


def test_return_action_conflicts_with_explicit_action() -> None:
    app = make_app()
    app.action("scene.return")(lambda ctx: None)
    with pytest.raises(ValueError, match="scene.return"):
        app.build_manifest()

    app = make_app()
    app.build_manifest()
    with pytest.raises(ValueError, match="scene.return"):
        app.action("scene.return")(lambda ctx: None)
