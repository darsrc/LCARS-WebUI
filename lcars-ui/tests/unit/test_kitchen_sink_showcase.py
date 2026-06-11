"""Coverage for the comprehensive kitchen sink example."""

from __future__ import annotations

import warnings
from collections.abc import Iterable

from examples.kitchen_sink.app import ui
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx

EXPECTED_WIDGET_TYPES = {
    "alert",
    "button",
    "form",
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
    "number_input",
    "progress_bar",
    "select",
    "sparkline",
    "status_tile",
    "table",
    "text",
    "text_input",
    "toggle",
    "video_hls",
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
    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        ui()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


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

    assert set(manifest.pages) == {"console", "telemetry", "grid", "widgets"}
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
