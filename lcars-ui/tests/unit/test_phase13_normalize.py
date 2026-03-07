"""Phase 13 strict normalizer coverage."""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx


def _build_manifest(ui_fn):
    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)
    ui_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _content_widgets(manifest, page_id: str) -> list:
    page = manifest.pages[page_id]
    # Row 0 is the injected page-title sweep for titled pages.
    return page.rows[1].columns[0].widgets


def test_strict_injects_page_title_sweep_for_titled_pages() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Main View", id="main"):
            lcars.metric("Shields", "100%")

    manifest = _build_manifest(ui)
    title_widgets = manifest.pages["main"].rows[0].columns[0].widgets
    assert title_widgets[0].type == "lcars_sweep"
    assert title_widgets[0].title == "Main View"


def test_strict_smart_paneling_groups_input_widgets_into_box_inputs() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Controls", id="controls"):
            lcars.button("Red Alert")
            lcars.toggle("Shields")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "controls")
    assert widgets[0].type == "lcars_box"
    assert len(widgets[0].right_inputs or []) == 2
    assert [item.type for item in (widgets[0].right_inputs or [])] == ["button", "toggle"]


def test_strict_smart_paneling_groups_data_widgets_into_box_children() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Data", id="data"):
            lcars.metric("Shields", "100%")
            lcars.metric("Warp", "9.4")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "data")
    assert widgets[0].type == "lcars_box"
    assert [item.type for item in widgets[0].children] == ["status_tile", "status_tile"]


def test_strict_smart_paneling_uses_bracket_for_mixed_groups() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Mixed", id="mixed"):
            lcars.metric("Shields", "100%")
            lcars.button("Red Alert")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "mixed")
    assert widgets[0].type == "lcars_bracket"
    assert widgets[0].orientation == "both"


def test_strict_single_widgets_use_left_bracket() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Single", id="single"):
            lcars.metric("Shields", "100%")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "single")
    assert widgets[0].type == "lcars_bracket"
    assert widgets[0].orientation == "left"


def test_raw_scope_bypasses_auto_paneling() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Raw Layout", id="raw"):
            with lcars.raw(reason="custom operator layout"):
                lcars.metric("Shields", "100%")
                lcars.button("Red Alert")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "raw")
    assert [widget.type for widget in widgets] == ["status_tile", "button"]


def test_strict_sweep_regioning_routes_header_rail_and_content() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Sweep Regions", id="sweep-regions"):
            with lcars.sweep("Bridge Sweep"):
                lcars.header("Telemetry", size="h3")
                lcars.button("Scan")
                lcars.metric("Shields", "100%")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "sweep-regions")
    sweep = widgets[0]
    assert sweep.type == "lcars_sweep"
    assert [widget.type for widget in (sweep.header_children or [])] == ["lcars_header"]
    assert [widget.type for widget in (sweep.rail_children or [])] == ["button"]
    assert [widget.type for widget in (sweep.content_children or [])] == ["status_tile"]
    assert [widget.type for widget in sweep.children] == ["status_tile"]


def test_strict_box_moves_input_widgets_to_side_controls_before_content_wrapping() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Box Regions", id="box-regions"):
            with lcars.box("Systems"):
                lcars.button("Run Scan")
                lcars.metric("Status", "Online")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "box-regions")
    box = widgets[0]
    assert box.type == "lcars_box"
    assert [widget.type for widget in (box.right_inputs or [])] == ["button"]
    assert [widget.type for widget in box.children] == ["status_tile"]
