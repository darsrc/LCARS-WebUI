"""Phase 13 input_column DSL coverage."""

from __future__ import annotations

import pytest

import lcars_ui as lcars
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx


def _build_manifest(ui_fn):
    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)
    ui_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def test_input_column_routes_widgets_to_enclosing_box_side_inputs() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.box("Systems") as box:
            with lcars.input_column(side="left"):
                lcars.button("Scan")
            with lcars.input_column(side="right"):
                lcars.toggle("Auto")
            lcars.metric("Status", "Online")

            # Still compatible with explicit box side scopes.
            with box.right_inputs():
                lcars.checkbox("Lock")

    manifest = _build_manifest(ui)
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
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.input_column(side="left"):
            lcars.button("Scan")

    with pytest.raises(ValueError, match="enclosing lcars\\.box"):
        _build_manifest(ui)
