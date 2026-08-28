"""Unit tests for the three_scene widget, its asset-path rules and its mount."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter, ValidationError

from lcars_ui import advanced
from lcars_ui.app import create_app
from lcars_ui.core.assets import validate_asset_path
from lcars_ui.core.models import Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _Config, _LCARSContext, set_ctx
from lcars_ui.widgets.media import ThreeScene
from lcars_ui.widgets.options import (
    ThreeSceneCamera,
    ThreeSceneControls,
    ThreeSceneOptions,
)

# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------


def test_three_scene_defaults() -> None:
    widget = ThreeScene(id="scene_1", module="scenes/core.js")

    assert widget.type == "three_scene"
    assert widget.module == "scenes/core.js"
    assert widget.props == {}
    assert widget.aspect_ratio is None
    assert widget.options is None


def test_three_scene_normalizes_leading_dot_slash() -> None:
    assert ThreeScene(id="s", module="./scenes/core.mjs").module == "scenes/core.mjs"


def test_three_scene_collapses_redundant_segments() -> None:
    assert ThreeScene(id="s", module="scenes//./core.js").module == "scenes/core.js"


@pytest.mark.parametrize(
    "module",
    [
        "/absolute/core.js",
        "../escape.js",
        "scenes/../../escape.js",
        "https://cdn.example.com/core.js",
        "data:text/javascript,void 0",
        "scenes\\core.js",
        "scenes/core.png",
        "scenes/core",
        "",
        "   ",
    ],
)
def test_three_scene_rejects_bad_module_paths(module: str) -> None:
    with pytest.raises(ValidationError):
        ThreeScene(id="s", module=module)


def test_validate_asset_path_reports_the_specific_problem() -> None:
    with pytest.raises(ValueError, match="traverse above"):
        validate_asset_path("../x.js", extensions=(".js",))
    with pytest.raises(ValueError, match="must be relative, not absolute"):
        validate_asset_path("/x.js", extensions=(".js",))
    with pytest.raises(ValueError, match=r"must end in one of \[\.js\]"):
        validate_asset_path("x.txt", extensions=(".js",))


def test_three_scene_camera_rejects_inverted_clip_planes() -> None:
    with pytest.raises(ValidationError):
        ThreeSceneCamera(near=10.0, far=1.0)


def test_three_scene_controls_reject_inverted_distances() -> None:
    with pytest.raises(ValidationError):
        ThreeSceneControls(min_distance=50.0, max_distance=5.0)


def test_three_scene_options_defaults_are_console_safe() -> None:
    options = ThreeSceneOptions()

    assert options.fps_limit == 60
    assert options.honor_reduced_motion is True
    assert options.max_pixel_ratio == 2.0
    assert options.transparent is True
    assert options.camera.fov == 50.0
    assert options.controls.enabled is True


def test_three_scene_widget_discriminates_in_the_union() -> None:
    widget = TypeAdapter(Widget).validate_python(
        {"id": "s1", "type": "three_scene", "module": "scenes/core.js"}
    )

    assert isinstance(widget, ThreeScene)
    assert widget.module == "scenes/core.js"


def test_union_still_rejects_a_bad_module_through_the_discriminator() -> None:
    with pytest.raises(ValidationError):
        TypeAdapter(Widget).validate_python(
            {"id": "s1", "type": "three_scene", "module": "../escape.js"}
        )


# ---------------------------------------------------------------------------
# DSL
# ---------------------------------------------------------------------------


def _build_ctx() -> _LCARSContext:
    ctx = _LCARSContext(session_id="test", builder=_ManifestBuilder())
    set_ctx(ctx)
    return ctx


def _only_scene(ctx: _LCARSContext) -> ThreeScene:
    assert ctx.builder is not None
    manifest = ctx.builder.build(_Config(name="T"))
    found = [
        child
        for column in manifest.pages["main"].rows[0].columns
        for widget in column.widgets
        for child in getattr(widget, "children", [])
        if isinstance(child, ThreeScene)
    ]
    assert len(found) == 1
    return found[0]


def test_three_scene_dsl_declares_the_widget() -> None:
    ctx = _build_ctx()
    advanced.three_scene("scenes/core.js", title="Warp Core", props={"rpm": 12})

    widget = _only_scene(ctx)
    assert widget.label == "Warp Core"
    assert widget.props == {"rpm": 12}


def test_three_scene_dsl_returns_declared_widget() -> None:
    _build_ctx()
    declared = advanced.three_scene("scenes/core.js")
    assert isinstance(declared, ThreeScene)


def test_three_scene_dsl_rejects_non_serializable_props() -> None:
    _build_ctx()
    with pytest.raises(ValueError, match="JSON-serializable"):
        advanced.three_scene("scenes/core.js", props={"bad": {1, 2, 3}})
# ---------------------------------------------------------------------------
# Asset mount
# ---------------------------------------------------------------------------


@pytest.fixture()
def assets(tmp_path: Path) -> Path:
    scenes = tmp_path / "scenes"
    scenes.mkdir()
    (scenes / "core.js").write_text("export default function setup() {}\n")
    return tmp_path


def test_assets_mount_serves_a_scene_module(assets: Path) -> None:
    with TestClient(create_app(assets_dir=assets)) as client:
        response = client.get("/lcars/assets/scenes/core.js")

    assert response.status_code == 200
    assert "export default" in response.text


def test_assets_mount_404s_for_a_missing_module(assets: Path) -> None:
    with TestClient(create_app(assets_dir=assets)) as client:
        assert client.get("/lcars/assets/scenes/nope.js").status_code == 404


def test_assets_mount_refuses_to_escape_its_root(assets: Path, tmp_path: Path) -> None:
    secret = tmp_path.parent / "secret.js"
    secret.write_text("nope")

    with TestClient(create_app(assets_dir=assets)) as client:
        response = client.get("/lcars/assets/../secret.js")

    # Either the client normalizes the path away or StaticFiles refuses it;
    # what matters is that the file outside the root never comes back.
    assert response.status_code != 200 or "nope" not in response.text


def test_no_module_is_served_when_assets_dir_is_not_configured() -> None:
    # The SPA catch-all answers every unclaimed path, so this is a 200 carrying
    # the app shell rather than a 404. What matters is that no scene module can
    # come back from a server that was never given an assets directory.
    with TestClient(create_app()) as client:
        response = client.get("/lcars/assets/scenes/core.js")

    assert "export default" not in response.text


def test_create_app_rejects_a_missing_assets_dir(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="not a directory"):
        create_app(assets_dir=tmp_path / "does-not-exist")


def test_assets_mount_works_without_a_built_spa_bundle(
    assets: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Whether the frontend bundle has been built says nothing about whether the
    # app may serve a project's own assets. Running from source with an unbuilt
    # frontend still has to load scene modules.
    monkeypatch.setattr("lcars_ui.app._STATIC_AVAILABLE", False)

    with TestClient(create_app(assets_dir=assets)) as client:
        response = client.get("/lcars/assets/scenes/core.js")

    assert response.status_code == 200
    assert "export default" in response.text
