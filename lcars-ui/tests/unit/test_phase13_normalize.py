"""Phase 13 strict normalizer coverage."""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui.core.models import Column, Header, Layout, Manifest, Meta, Page, Row, Sidebar
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._normalize import normalize_manifest_for_strict
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx
from lcars_ui.widgets.containers import LcarsBox
from lcars_ui.widgets.primitives import StatusTile


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
    assert [widget.type for widget in (sweep.column_inputs or [])] == ["button"]
    assert [widget.type for widget in (sweep.left_children or [])] == ["status_tile"]
    assert [widget.type for widget in (sweep.right_children or [])] == []
    assert [widget.type for widget in (sweep.rail_children or [])] == ["button"]
    assert [widget.type for widget in (sweep.content_children or [])] == ["status_tile"]
    assert [widget.type for widget in sweep.children] == ["status_tile"]


def test_strict_sweep_context_scopes_route_to_explicit_regions() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Sweep Scoped", id="sweep-scoped"):
            with lcars.sweep("Bridge Sweep") as sweep:
                with sweep.column_inputs():
                    lcars.button("Scan")
                with sweep.left():
                    lcars.metric("Shields", "100%")
                with sweep.right():
                    lcars.metric("Warp", "Ready")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "sweep-scoped")
    sweep = widgets[0]
    assert sweep.type == "lcars_sweep"
    assert [widget.type for widget in (sweep.column_inputs or [])] == ["button"]
    assert [widget.type for widget in (sweep.left_children or [])] == ["status_tile"]
    assert [widget.type for widget in (sweep.right_children or [])] == ["status_tile"]
    assert [widget.type for widget in (sweep.content_children or [])] == ["status_tile", "status_tile"]


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
    assert [widget.type for widget in (box.main_children or [])] == ["status_tile"]
    assert [widget.type for widget in (box.side_children or [])] == []
    assert [widget.type for widget in box.children] == ["status_tile"]


def test_strict_box_routes_secondary_readouts_to_side_region_without_explicit_scope() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Box Roles", id="box-roles"):
            with lcars.box("Systems"):
                lcars.text("Operator Summary")
                lcars.metric("Status", "Online")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "box-roles")
    box = widgets[0]
    assert box.type == "lcars_box"
    assert [widget.type for widget in (box.main_children or [])] == ["text"]
    assert [widget.type for widget in (box.side_children or [])] == ["status_tile"]


def test_strict_box_explicit_main_and_side_regions_are_preserved() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Box Scoped", id="box-scoped"):
            with lcars.box("Systems") as box:
                with box.main():
                    lcars.metric("Primary", "Online")
                with box.side():
                    lcars.metric("Secondary", "Standby")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "box-scoped")
    box = widgets[0]
    assert box.type == "lcars_box"
    assert [widget.type for widget in (box.main_children or [])] == ["status_tile"]
    assert [widget.type for widget in (box.side_children or [])] == ["status_tile"]
    assert [widget.type for widget in box.children] == ["status_tile", "status_tile"]


def test_strict_sweep_routes_secondary_readouts_to_right_region_without_explicit_scope() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Sweep Roles", id="sweep-roles"):
            with lcars.sweep("Telemetry"):
                lcars.metric("Status", "Online")
                lcars.text("Operator Summary")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "sweep-roles")
    sweep = widgets[0]
    assert sweep.type == "lcars_sweep"
    assert [widget.type for widget in (sweep.left_children or [])] == ["text"]
    assert [widget.type for widget in (sweep.right_children or [])] == ["status_tile"]


def test_strict_container_column_widths_are_clamped_to_reference_limits() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Width Clamp", id="width-clamp"):
            with lcars.sweep("Wide Sweep", width_sidebar=400):
                lcars.metric("Status", "Online")
            with lcars.box("Wide Box", width_left=220, width_right=210):
                lcars.metric("Status", "Nominal")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "width-clamp")
    sweep = widgets[0]
    box = widgets[1]
    assert sweep.type == "lcars_sweep"
    assert sweep.width_sidebar == 150
    assert box.type == "lcars_box"
    assert box.width_left == 150
    assert box.width_right == 150


def test_strict_normalization_assigns_manifest_native_widget_roles() -> None:
    def ui() -> None:
        lcars.config("Phase13")
        with lcars.page("Roles", id="roles"):
            lcars.button("Red Alert")
            lcars.toggle("Shields")
            with lcars.box("Telemetry"):
                lcars.metric("Status", "Online")
                lcars.button("Scan")

    manifest = _build_manifest(ui)
    widgets = _content_widgets(manifest, "roles")
    controls = widgets[0]
    telemetry = widgets[1]

    assert controls.type == "lcars_box"
    assert controls.strict_role == "primary"
    assert [widget.strict_role for widget in (controls.right_inputs or [])] == ["terminal", "terminal"]

    assert telemetry.type == "lcars_box"
    assert telemetry.strict_role == "primary"
    assert [widget.strict_role for widget in (telemetry.main_children or [])] == ["secondary"]
    assert [widget.strict_role for widget in (telemetry.right_inputs or [])] == ["terminal"]


def test_strict_normalization_preserves_authored_widget_roles() -> None:
    manifest = Manifest(
        meta=Meta(
            version="1.0.0",
            app_name="Phase13",
            theme="galaxy",
            lang="en-US",
            visual_language="strict",
            strict_renderer="legacy",
        ),
        layout=Layout(
            header=Header(title="Phase13"),
            sidebar=Sidebar(),
        ),
        pages={
            "authored": Page(
                id="authored",
                title="Authored",
                rows=[
                    Row(
                        id="authored-row",
                        columns=[
                            Column(
                                id="authored-col",
                                widgets=[
                                    LcarsBox(
                                        id="authored-box",
                                        title="Authored Box",
                                        children=[
                                            StatusTile(
                                                id="authored-status",
                                                label="Status",
                                                status="ok",
                                                value="ONLINE",
                                                strict_role="primary",
                                            )
                                        ],
                                    )
                                ],
                            )
                        ],
                    )
                ],
            )
        },
    )

    normalized = normalize_manifest_for_strict(manifest)
    widgets = _content_widgets(normalized, "authored")
    box = widgets[0]

    assert box.type == "lcars_box"
    assert box.strict_role == "primary"
    assert [widget.strict_role for widget in (box.main_children or [])] == ["primary"]
