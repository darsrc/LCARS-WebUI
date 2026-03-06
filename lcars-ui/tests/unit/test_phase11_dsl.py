"""Phase 11 DSL coverage for containers and new input controls."""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, clear_session_state, get_session_state, set_ctx


def _build_manifest(ui_fn):
    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)
    ui_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def test_box_container_dsl_builds_children_and_side_inputs() -> None:
    def ui() -> None:
        lcars.config("Phase11")
        with lcars.box(title="Systems", corners=[1, 4], color="golden-tanoi") as box:
            with box.left_inputs():
                lcars.button("Run Scan", id="run-scan")
            with box.right_inputs():
                lcars.checkbox("Auto", id="auto-checkbox")
            lcars.header("Subsystems", size="h3", color="pale-canary")
            lcars.metric("Warp Core", "Online")

    manifest = _build_manifest(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    container = next(widget for widget in widgets if widget.type == "lcars_box")
    assert container.title == "Systems"
    assert container.color == "golden-tanoi"
    assert len(container.children) == 2
    assert len(container.left_inputs or []) == 1
    assert len(container.right_inputs or []) == 1
    assert container.children[0].type == "lcars_header"


def test_sweep_and_bracket_contexts_build_nested_children() -> None:
    def ui() -> None:
        lcars.config("Phase11")
        with lcars.sweep(title="Ops", color="anakiwa"):
            lcars.text("Sweep body")
        with lcars.bracket(color="lilac", orientation="both"):
            lcars.text("Bracket body")

    manifest = _build_manifest(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    sweep = next(widget for widget in widgets if widget.type == "lcars_sweep")
    bracket = next(widget for widget in widgets if widget.type == "lcars_bracket")
    assert len(sweep.children) == 1
    assert len(bracket.children) == 1


def test_checkbox_radio_and_radio_toggle_persist_session_state() -> None:
    session_id = "phase11-input-state"
    clear_session_state(session_id)

    def ui() -> tuple[bool, str, str]:
        checked = lcars.checkbox("Lock", id="lock")
        radio_val = lcars.radio("Mode", ["alpha", "beta"], id="mode")
        toggle_val = lcars.radio_toggle("Alert", ["green", "yellow", "red"], id="alert-profile")
        return checked, radio_val, toggle_val

    # build defaults
    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder(), session_id=session_id)
    set_ctx(build_ctx)
    defaults = ui()
    assert defaults == (False, "alpha", "green")

    # checkbox toggle
    handle_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id=session_id,
        active_action_id="lock",
        active_action_value=True,
    )
    set_ctx(handle_ctx)
    checked, _, _ = ui()
    assert checked is True

    # radio select
    handle_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id=session_id,
        active_action_id="mode",
        active_action_value="beta",
    )
    set_ctx(handle_ctx)
    _, radio_val, _ = ui()
    assert radio_val == "beta"

    # radio toggle select
    handle_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id=session_id,
        active_action_id="alert-profile",
        active_action_value="red",
    )
    set_ctx(handle_ctx)
    _, _, toggle_val = ui()
    assert toggle_val == "red"
    assert get_session_state(session_id) == {"lock": True, "mode": "beta", "alert-profile": "red"}
