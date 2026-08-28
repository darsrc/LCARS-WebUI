"""Phase 13 input_column DSL coverage."""

from __future__ import annotations

import pytest

import lcars_ui as lcars
from lcars_ui import advanced, ui
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx


def _build_manifest(ui_fn):
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)
    ui_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def test_input_column_routes_widgets_to_enclosing_box_side_inputs() -> None:
    def build_page() -> None:
        lcars.config("Phase13")
        with ui.box("Systems") as box:
            with advanced.input_column(side="left"):
                ui.button("Scan")
            with advanced.input_column(side="right"):
                ui.toggle("Auto")
            ui.metric("Status", "Online")

            # Still compatible with explicit box side scopes.
            with box.right_inputs():
                ui.checkbox("Lock")

    manifest = _build_manifest(build_page)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    container = widgets[0]
    assert container.type == "lcars_box"
    assert [widget.type for widget in (container.left_inputs or [])] == ["button"]
    assert [widget.type for widget in (container.right_inputs or [])] == [
        "toggle",
        "lcars_checkbox",
    ]
    assert [widget.type for widget in container.children] == ["status_tile"]


def test_input_column_without_enclosing_box_raises_value_error() -> None:
    def build_page() -> None:
        lcars.config("Phase13")
        with advanced.input_column(side="left"):
            ui.button("Scan")

    with pytest.raises(ValueError, match="enclosing lcars\\.box"):
        _build_manifest(build_page)
