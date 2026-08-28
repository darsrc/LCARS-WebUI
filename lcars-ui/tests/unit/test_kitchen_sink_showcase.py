"""Coverage for the comprehensive kitchen sink example."""

from __future__ import annotations

import warnings
from collections.abc import Iterable
from pathlib import Path

from examples.kitchen_sink.app import app
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.widgets.graph import GraphDocument

EXPECTED_WIDGET_TYPES = {
    "alert",
    "button",
    "form",
    "file_upload",
    "gauge",
    "lcars_box",
    "lcars_bracket",
    "lcars_checkbox",
    "lcars_header",
    "lcars_radio",
    "lcars_radio_toggle",
    "lcars_sweep",
    "line_chart",
    "log_viewer",
    "markdown",
    "mic_button",
    "node_canvas",
    "number_input",
    "popup",
    "progress_bar",
    "select",
    "shader",
    "sparkline",
    "status_tile",
    "table",
    "text",
    "text_input",
    "three_scene",
    "toggle",
    "video_hls",
    "webui_settings",
}

NESTED_WIDGET_FIELDS = (
    "children",
    "left_inputs",
    "right_inputs",
    "main_children",
    "side_children",
    "header_children",
    "column_inputs",
    "left_children",
    "right_children",
    "rail_children",
    "content_children",
)


def _build_kitchen_sink_manifest() -> Manifest:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        return app.build_manifest()


def _iter_widgets(widgets: Iterable[Widget]) -> Iterable[Widget]:
    for widget in widgets:
        yield widget
        for field in NESTED_WIDGET_FIELDS:
            nested = getattr(widget, field, None)
            if isinstance(nested, list):
                yield from _iter_widgets(nested)


def test_kitchen_sink_manifest_showcases_every_widget_type() -> None:
    manifest = _build_kitchen_sink_manifest()

    widgets = [
        widget
        for page in manifest.pages.values()
        for row in page.rows
        for column in row.columns
        for widget in _iter_widgets(column.widgets)
    ]
    widget_types = {widget.type for widget in widgets}

    assert set(manifest.pages) == {
        "console",
        "telemetry",
        "grid",
        "widgets",
        "scene",
        "graph",
        "lcars-options",
    }
    assert EXPECTED_WIDGET_TYPES <= widget_types


def test_kitchen_sink_uses_local_media_descriptors_only() -> None:
    manifest = _build_kitchen_sink_manifest()
    media_widgets = [
        widget
        for page in manifest.pages.values()
        for row in page.rows
        for column in row.columns
        for widget in _iter_widgets(column.widgets)
        if widget.type == "video_hls"
    ]

    assert media_widgets
    assert all(widget.src.startswith("/media/") for widget in media_widgets)
    assert all("data:" not in widget.src for widget in media_widgets)


def test_kitchen_sink_scene_modules_are_relative_project_assets() -> None:
    # Same guardrail as the media descriptors above: the showcase must not
    # depend on anything fetched from off the machine.
    manifest = _build_kitchen_sink_manifest()
    scenes = [
        widget
        for page in manifest.pages.values()
        for row in page.rows
        for column in row.columns
        for widget in _iter_widgets(column.widgets)
        if widget.type == "three_scene"
    ]

    assert scenes
    for scene in scenes:
        assert not scene.module.startswith("/")
        assert "://" not in scene.module
        assert (Path(__file__).parents[2] / "examples/kitchen_sink/assets" / scene.module).is_file()


def test_kitchen_sink_graph_is_a_valid_document() -> None:
    manifest = _build_kitchen_sink_manifest()
    canvases = [
        widget
        for page in manifest.pages.values()
        for row in page.rows
        for column in row.columns
        for widget in _iter_widgets(column.widgets)
        if widget.type == "node_canvas"
    ]

    assert canvases
    graph = canvases[0].document
    # Round-tripping re-runs every document validator, so this asserts the
    # showcase graph is one the renderer will actually accept.
    assert GraphDocument.model_validate_json(graph.model_dump_json()) == graph
    assert graph.edges
