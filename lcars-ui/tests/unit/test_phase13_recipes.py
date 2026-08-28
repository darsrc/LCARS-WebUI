"""Phase 13 DSL recipe coverage."""

from __future__ import annotations

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


def test_console_recipe_builds_sweep_with_data_and_control_panels() -> None:
    def build_page() -> None:
        lcars.config("Phase13")
        with advanced.console("Bridge Operations", color="orange"):
            with ui.data_panel("Systems", color="blue"):
                ui.metric("Shields", "100%", status="ok")
            with ui.control_panel("Actions", color="red"):
                ui.button("Red Alert")

    manifest = _build_manifest(build_page)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    sweep = widgets[0]
    assert sweep.type == "lcars_sweep"
    assert sweep.title == "Bridge Operations"
    assert sweep.left_width == 0.62
    assert len(sweep.children) == 2

    data_panel = sweep.children[0]
    control_panel = sweep.children[1]
    assert data_panel.type == "lcars_box"
    assert data_panel.strict_role == "primary"
    assert data_panel.children[0].type == "status_tile"
    assert control_panel.type == "lcars_box"
    assert control_panel.strict_role == "secondary"
    assert len(control_panel.right_inputs or []) == 1
    assert (control_panel.right_inputs or [])[0].type == "button"


def test_padd_recipe_builds_narrow_sweep() -> None:
    def build_page() -> None:
        lcars.config("Phase13")
        with advanced.padd("Crew Manifest"):
            ui.table([{"Name": "Picard"}], title="Roster")

    manifest = _build_manifest(build_page)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    sweep = widgets[0]
    assert sweep.type == "lcars_sweep"
    assert sweep.title == "Crew Manifest"
    assert sweep.strict_role == "primary"
    assert sweep.width_sidebar == 150
    assert sweep.left_width == 0.66


def test_diagnostic_recipe_builds_full_frame_box() -> None:
    def build_page() -> None:
        lcars.config("Phase13")
        with advanced.diagnostic("Warp Core Analysis", color="blue"):
            ui.gauge("Output", 87.2, unit="%")

    manifest = _build_manifest(build_page)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    box = widgets[0]
    assert box.type == "lcars_box"
    assert box.title == "Warp Core Analysis"
    assert box.strict_role == "primary"
    assert box.width_left == 150
    assert box.width_right == 150
