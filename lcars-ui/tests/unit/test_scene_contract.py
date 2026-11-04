import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from lcars_ui import App, ui
from lcars_ui.core.models import SceneWidget


@pytest.fixture
def scene_data():
    example = Path(__file__).resolve().parents[2] / "docs/v8/scene-example.json"
    return json.loads(example.read_text())["widgets"][0]


def test_scene_round_trip(scene_data):
    scene = SceneWidget.model_validate(scene_data)
    assert SceneWidget.model_validate(scene.model_dump()) == scene


@pytest.mark.parametrize(
    ("mutate", "offending"),
    [
        (lambda s: s["regions"].append(s["regions"][0]), "sample-a"),
        (lambda s: s["relations"][0].update(target="missing"), "missing"),
        (lambda s: s["relations"][0].update(source="sample-a"), "sample-a"),
        (lambda s: s["modes"][0].update(focal=["notes-a"]), "notes-a"),
        (lambda s: s.update(initial_mode="missing"), "missing"),
        (lambda s: s["regions"].append({"id": "orphan", "label": "Orphan"}), "orphan"),
        (lambda s: s["modes"][1].update(focal=["sample-a"]), "compares-sample-a"),
    ],
)
def test_invalid_scene_rules(scene_data, mutate, offending):
    mutate(scene_data)
    with pytest.raises(ValidationError, match=offending):
        SceneWidget.model_validate(scene_data)


def test_scene_page_chrome():
    app = App()

    @app.page("Scene", layout="scene")
    def scene_page():
        with ui.scene(initial_mode="inspect") as scene:
            with scene.region("sample", label="Sample"):
                ui.text("Sample")
            scene.mode("inspect", "Inspect", focal=["sample"], required=["sample"])

    assert app.build_manifest().pages[next(iter(app.build_manifest().pages))].chrome == "none"
    with pytest.raises(ValueError, match="chrome"):
        app.page("Invalid", layout="scene", chrome="console")
