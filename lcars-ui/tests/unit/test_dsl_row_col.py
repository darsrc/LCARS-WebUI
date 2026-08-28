"""Unit tests for ui.row()/ui.col() layout helpers."""

from __future__ import annotations

from lcars_ui import ui
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx


def _build_manifest_from(ui_fn):
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)
    ui_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def test_row_and_col_emit_expected_widths() -> None:
    def build_page() -> None:
        with ui.row():
            with ui.col("2fr"):
                ui.metric("Left", "A", id="left")
            with ui.col("1fr"):
                ui.metric("Right", "B", id="right")

    manifest = _build_manifest_from(build_page)
    row = manifest.pages["main"].rows[-1]

    assert len(row.columns) == 2
    assert row.columns[0].width == "2fr"
    assert row.columns[1].width == "1fr"
    assert row.columns[0].widgets[0].type == "lcars_bracket"
    assert row.columns[0].widgets[0].children[0].id == "left"
    assert row.columns[1].widgets[0].type == "lcars_bracket"
    assert row.columns[1].widgets[0].children[0].id == "right"
