import pytest

from lcars_ui import App, ui
from lcars_ui.core.models import SceneWidget


def _simple_scene(id: str = "scene") -> None:
    with ui.scene(initial_mode="inspect", id=id) as scene:
        with scene.region("sample", label="SAMPLE"):
            ui.text("Sample")
        scene.mode("inspect", "INSPECT", focal=["sample"], required=["sample"])


def test_survey_scene() -> None:
    app = App()

    @app.page("Survey", id="survey", layout="scene")
    def survey() -> None:
        with ui.scene(initial_mode="inspect") as scene:
            with scene.region("sample-a", label="SAMPLE A", subject="s-12"):
                ui.chart([1, 2], id="chart-a")
            with scene.region("sample-b", label="SAMPLE B", subject="s-19"):
                ui.chart([2, 3], id="chart-b")
            with scene.region("commands-a", label="SAMPLE COMMANDS", role="commands"):
                ui.button("COMPARE", id="compare")
                ui.button("EDIT", id="edit")
            with scene.region("notes-a", label="FIELD NOTES", role="detail"):
                ui.text_input("Note", id="note")
            with scene.region("fault", label="SENSOR FAULT", role="alert", fold="never"):
                ui.alert("Sensor fault")
                ui.button("RECALIBRATE", id="recal")
            scene.controls("commands-a", "sample-a")
            scene.details("notes-a", "sample-a")
            scene.compares("sample-a", "sample-b")
            scene.recovers("fault", "sample-a")
            scene.mode(
                "inspect",
                "INSPECT",
                focal=["sample-a"],
                required=["sample-a", "commands-a"],
                optional=["notes-a"],
                families=["wrap", "branch", "focus"],
            )
            scene.mode(
                "compare",
                "COMPARE",
                focal=["sample-a", "sample-b"],
                required=["sample-a", "sample-b", "commands-a"],
                families=["fork", "focus"],
                returns_to="inspect",
            )
            scene.mode(
                "edit",
                "EDIT NOTES",
                focal=["notes-a"],
                required=["notes-a", "sample-a"],
                families=["contour", "focus"],
                returns_to="inspect",
            )
            scene.mode(
                "fault",
                "FAULT",
                focal=["fault", "sample-a"],
                required=["fault", "sample-a", "commands-a"],
                families=["branch", "focus"],
                returns_to="inspect",
            )

    page = app.build_manifest().pages["survey"]
    widgets = [w for row in page.rows for col in row.columns for w in col.widgets]
    assert page.archetype == "scene"
    assert page.chrome == "none"
    assert len(widgets) == 1
    widget = widgets[0]
    assert isinstance(widget, SceneWidget)
    assert (len(widget.regions), len(widget.relations), len(widget.modes)) == (5, 4, 4)
    assert all(region.children for region in widget.regions)


def test_scene_requires_scene_page() -> None:
    app = App()
    app.page("Other", id="other")(lambda: _simple_scene())
    with pytest.raises(ValueError, match='other.*layout="scene"'):
        app.build_manifest()


def test_scene_page_requires_one_scene() -> None:
    app = App()

    @app.page("Two", layout="scene")
    def two() -> None:
        _simple_scene("first")
        _simple_scene("second")

    with pytest.raises(ValueError, match="exactly one"):
        app.build_manifest()

    empty = App()
    empty.page("Empty", layout="scene")(lambda: None)
    with pytest.raises(ValueError, match="exactly one"):
        empty.build_manifest()


def test_invalid_topology_surfaces_error() -> None:
    app = App()

    @app.page("Invalid", layout="scene")
    def invalid() -> None:
        with ui.scene(initial_mode="inspect") as scene:
            scene.mode("inspect", "INSPECT", focal=["missing"], required=["missing"])

    with pytest.raises(ValueError, match="unknown region missing"):
        app.build_manifest()


def test_exception_does_not_add_scene() -> None:
    app = App()

    @app.page("Page")
    def page_fn() -> None:
        with pytest.raises(RuntimeError, match="abort"):
            with ui.scene(initial_mode="inspect"):
                raise RuntimeError("abort")
        ui.text("Survived")

    page = app.build_manifest().pages["page"]
    widgets = [w for row in page.rows for col in row.columns for w in col.widgets]
    assert all(w.type != "scene" for w in widgets)
