"""Phase 13 strict normalizer coverage."""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui.core.models import Column, Header, Layout, Manifest, Meta, Page, Row, Sidebar
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._normalize import normalize_manifest_for_strict
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx
from lcars_ui.widgets.containers import LcarsBox, LcarsSweep
from lcars_ui.widgets.inputs import Button
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
    title_row = manifest.pages["main"].rows[0]
    title_widgets = title_row.columns[0].widgets
    assert title_widgets[0].type == "lcars_sweep"
    assert title_widgets[0].title == "Main View"
    assert title_row.strict_band_role == "page_title"
    assert title_row.strict_lane_mode == "follow_columns"
    assert title_row.columns[0].strict_lane_role == "title"


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
    assert telemetry.strict_title == "Telemetry"
    assert [widget.strict_role for widget in (telemetry.main_children or [])] == ["secondary"]
    assert [widget.strict_title for widget in (telemetry.main_children or [])] == ["Status"]
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
    assert box.strict_title == "Authored Box"
    assert [widget.strict_role for widget in (box.main_children or [])] == ["primary"]


def test_strict_emits_row_scaffold_metadata_for_authored_top_level_lane_roles() -> None:
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
            "lane-meta": Page(
                id="lane-meta",
                title="Lane Meta",
                rows=[
                    Row(
                        id="lane-meta-row",
                        columns=[
                            Column(
                                id="lane-meta-col",
                                widgets=[
                                    LcarsBox(
                                        id="lane-meta-primary",
                                        title="Primary Box",
                                        children=[],
                                        strict_role="primary",
                                    ),
                                    LcarsBox(
                                        id="lane-meta-support",
                                        title="Support Box",
                                        children=[],
                                        strict_role="secondary",
                                    ),
                                ],
                            )
                        ],
                    )
                ],
            )
        },
    )

    normalized = normalize_manifest_for_strict(manifest)
    content_row = normalized.pages["lane-meta"].rows[1]

    assert content_row.strict_band_role == "content"
    assert content_row.strict_lane_mode == "split_single_column"
    assert content_row.columns[0].strict_lane_role == "content"


def test_strict_group_wrapping_prefers_authored_roles_over_legacy_widget_types() -> None:
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
            "role-wrap": Page(
                id="role-wrap",
                title="Role Wrap",
                rows=[
                    Row(
                        id="role-wrap-row",
                        columns=[
                            Column(
                                id="role-wrap-col",
                                widgets=[
                                    Button(
                                        id="role-wrap-button",
                                        action_id="scan",
                                        strict_role="primary",
                                    ),
                                    StatusTile(
                                        id="role-wrap-status",
                                        label="Status",
                                        status="ok",
                                        value="ONLINE",
                                        strict_role="primary",
                                    ),
                                ],
                            )
                        ],
                    )
                ],
            )
        },
    )

    normalized = normalize_manifest_for_strict(manifest)
    widgets = _content_widgets(normalized, "role-wrap")
    wrapper = widgets[0]

    assert wrapper.type == "lcars_box"
    assert [widget.type for widget in (wrapper.right_inputs or [])] == []
    assert [widget.type for widget in wrapper.children] == ["button", "status_tile"]


def test_strict_group_wrapping_honors_authored_terminal_roles_for_data_widgets() -> None:
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
            "terminal-wrap": Page(
                id="terminal-wrap",
                title="Terminal Wrap",
                rows=[
                    Row(
                        id="terminal-wrap-row",
                        columns=[
                            Column(
                                id="terminal-wrap-col",
                                widgets=[
                                    StatusTile(
                                        id="terminal-wrap-status-a",
                                        label="Status A",
                                        status="ok",
                                        value="ONLINE",
                                        strict_role="terminal",
                                    ),
                                    StatusTile(
                                        id="terminal-wrap-status-b",
                                        label="Status B",
                                        status="ok",
                                        value="READY",
                                        strict_role="terminal",
                                    ),
                                ],
                            )
                        ],
                    )
                ],
            )
        },
    )

    normalized = normalize_manifest_for_strict(manifest)
    widgets = _content_widgets(normalized, "terminal-wrap")
    wrapper = widgets[0]

    assert wrapper.type == "lcars_box"
    assert [widget.type for widget in (wrapper.right_inputs or [])] == ["status_tile", "status_tile"]
    assert [widget.type for widget in wrapper.children] == []


def test_strict_box_explicit_regions_preserve_input_typed_children() -> None:
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
            "box-explicit": Page(
                id="box-explicit",
                title="Box Explicit",
                rows=[
                    Row(
                        id="box-explicit-row",
                        columns=[
                            Column(
                                id="box-explicit-col",
                                widgets=[
                                    LcarsBox(
                                        id="box-explicit-widget",
                                        title="Explicit",
                                        left_inputs=[],
                                        right_inputs=[],
                                        main_children=[
                                            Button(
                                                id="box-explicit-button",
                                                action_id="scan",
                                            )
                                        ],
                                        side_children=[
                                            StatusTile(
                                                id="box-explicit-status",
                                                label="Status",
                                                status="ok",
                                                value="ONLINE",
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
    widgets = _content_widgets(normalized, "box-explicit")
    box = widgets[0]

    assert box.type == "lcars_box"
    assert [widget.type for widget in (box.main_children or [])] == ["button"]
    assert [widget.type for widget in (box.side_children or [])] == ["status_tile"]
    assert [widget.type for widget in (box.right_inputs or [])] == []


def test_strict_sweep_explicit_regions_preserve_input_typed_children() -> None:
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
            "sweep-explicit": Page(
                id="sweep-explicit",
                title="Sweep Explicit",
                rows=[
                    Row(
                        id="sweep-explicit-row",
                        columns=[
                            Column(
                                id="sweep-explicit-col",
                                widgets=[
                                    LcarsSweep(
                                        id="sweep-explicit-widget",
                                        title="Explicit",
                                        column_inputs=[],
                                        left_children=[
                                            Button(
                                                id="sweep-explicit-button",
                                                action_id="scan",
                                            )
                                        ],
                                        right_children=[
                                            StatusTile(
                                                id="sweep-explicit-status",
                                                label="Status",
                                                status="ok",
                                                value="ONLINE",
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
    widgets = _content_widgets(normalized, "sweep-explicit")
    sweep = widgets[0]

    assert sweep.type == "lcars_sweep"
    assert [widget.type for widget in (sweep.left_children or [])] == ["button"]
    assert [widget.type for widget in (sweep.right_children or [])] == ["status_tile"]
    assert [widget.type for widget in (sweep.column_inputs or [])] == []


def test_strict_box_implicit_content_honors_authored_primary_role_on_input_widgets() -> None:
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
            "box-authored-role": Page(
                id="box-authored-role",
                title="Box Authored Role",
                rows=[
                    Row(
                        id="box-authored-role-row",
                        columns=[
                            Column(
                                id="box-authored-role-col",
                                widgets=[
                                    LcarsBox(
                                        id="box-authored-role-widget",
                                        title="Authored Roles",
                                        children=[
                                            Button(
                                                id="box-authored-role-button",
                                                action_id="scan",
                                                strict_role="primary",
                                            ),
                                            StatusTile(
                                                id="box-authored-role-status",
                                                label="Status",
                                                status="ok",
                                                value="ONLINE",
                                                strict_role="primary",
                                            ),
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
    widgets = _content_widgets(normalized, "box-authored-role")
    box = widgets[0]

    assert box.type == "lcars_box"
    assert [widget.type for widget in (box.main_children or [])] == ["button", "status_tile"]
    assert [widget.type for widget in (box.right_inputs or [])] == []


def test_strict_box_implicit_content_routes_authored_terminal_role_to_inputs() -> None:
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
            "box-authored-terminal": Page(
                id="box-authored-terminal",
                title="Box Authored Terminal",
                rows=[
                    Row(
                        id="box-authored-terminal-row",
                        columns=[
                            Column(
                                id="box-authored-terminal-col",
                                widgets=[
                                    LcarsBox(
                                        id="box-authored-terminal-widget",
                                        title="Authored Terminal",
                                        children=[
                                            Button(
                                                id="box-authored-terminal-button",
                                                action_id="scan",
                                                strict_role="terminal",
                                            ),
                                            StatusTile(
                                                id="box-authored-terminal-status",
                                                label="Status",
                                                status="ok",
                                                value="ONLINE",
                                                strict_role="primary",
                                            ),
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
    widgets = _content_widgets(normalized, "box-authored-terminal")
    box = widgets[0]

    assert box.type == "lcars_box"
    assert [widget.type for widget in (box.right_inputs or [])] == ["button"]
    assert [widget.type for widget in (box.main_children or [])] == ["status_tile"]


def test_strict_box_explicit_regions_keep_authored_terminal_in_place() -> None:
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
            "box-explicit-terminal": Page(
                id="box-explicit-terminal",
                title="Box Explicit Terminal",
                rows=[
                    Row(
                        id="box-explicit-terminal-row",
                        columns=[
                            Column(
                                id="box-explicit-terminal-col",
                                widgets=[
                                    LcarsBox(
                                        id="box-explicit-terminal-widget",
                                        title="Explicit Terminal",
                                        left_inputs=[],
                                        right_inputs=[],
                                        main_children=[
                                            Button(
                                                id="box-explicit-terminal-button",
                                                action_id="scan",
                                                strict_role="terminal",
                                            )
                                        ],
                                        side_children=[],
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
    widgets = _content_widgets(normalized, "box-explicit-terminal")
    box = widgets[0]

    assert box.type == "lcars_box"
    assert [widget.type for widget in (box.main_children or [])] == ["button"]
    assert [widget.type for widget in (box.right_inputs or [])] == []


def test_strict_sweep_explicit_regions_keep_authored_terminal_in_place() -> None:
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
            "sweep-explicit-terminal": Page(
                id="sweep-explicit-terminal",
                title="Sweep Explicit Terminal",
                rows=[
                    Row(
                        id="sweep-explicit-terminal-row",
                        columns=[
                            Column(
                                id="sweep-explicit-terminal-col",
                                widgets=[
                                    LcarsSweep(
                                        id="sweep-explicit-terminal-widget",
                                        title="Explicit Terminal",
                                        column_inputs=[],
                                        left_children=[
                                            Button(
                                                id="sweep-explicit-terminal-button",
                                                action_id="scan",
                                                strict_role="terminal",
                                            )
                                        ],
                                        right_children=[],
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
    widgets = _content_widgets(normalized, "sweep-explicit-terminal")
    sweep = widgets[0]

    assert sweep.type == "lcars_sweep"
    assert [widget.type for widget in (sweep.left_children or [])] == ["button"]
    assert [widget.type for widget in (sweep.column_inputs or [])] == []
