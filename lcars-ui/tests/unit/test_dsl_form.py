"""Unit tests for lcars.form() DSL ergonomics."""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, get_session_state, set_ctx


def _iter_widgets(widgets):
    for widget in widgets:
        yield widget
        children = getattr(widget, "children", None)
        if isinstance(children, list):
            yield from _iter_widgets(children)
        left_inputs = getattr(widget, "left_inputs", None)
        if isinstance(left_inputs, list):
            yield from _iter_widgets(left_inputs)
        right_inputs = getattr(widget, "right_inputs", None)
        if isinstance(right_inputs, list):
            yield from _iter_widgets(right_inputs)


def _build_manifest_from(ui_fn):
    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)
    ui_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def test_form_context_collects_input_children_in_build_mode() -> None:
    def ui() -> None:
        with lcars.form("Configure Warp", action_id="warp_submit", id="warp-form"):
            lcars.number_input("Warp Factor", value=5.0, id="warp-factor")
            lcars.toggle("Inertial Dampeners", id="dampeners")

    manifest = _build_manifest_from(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    form_widget = next(widget for widget in _iter_widgets(widgets) if widget.type == "form")

    assert form_widget.id == "warp-form"
    assert form_widget.action_id == "warp_submit"
    assert [child.id for child in form_widget.children] == ["warp-factor", "dampeners"]


def test_form_handle_mode_child_inputs_read_session_state() -> None:
    session_id = "form-session"
    state = get_session_state(session_id)
    state["warp-factor"] = 8.5

    def ui() -> None:
        with lcars.form("Configure Warp", action_id="warp_submit", id="warp-form"):
            value = lcars.number_input("Warp Factor", id="warp-factor")
            assert value == 8.5

    ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id=session_id,
        active_action_id="warp_submit",
        active_action_value={"warp-factor": 8.5},
        builder=_ManifestBuilder(),
    )
    set_ctx(ctx)
    ui()


def test_command_input_builds_a_primary_composer() -> None:
    def ui() -> None:
        result = lcars.command_input(
            "Order",
            id="order",
            action_id="dispatch-order",
            placeholder="Transmit an order…",
            actions=[lcars.ActionSpec(label="New Session", action_id="new-session")],
        )
        assert result is None

    manifest = _build_manifest_from(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    assert widgets[0].type == "form"
    form_widget = next(widget for widget in _iter_widgets(widgets) if widget.id == "order")

    assert form_widget.type == "form"
    assert form_widget.action_id == "dispatch-order"
    assert form_widget.strict_role == "primary"
    assert form_widget.zone == "dock"
    assert form_widget.options is not None
    assert form_widget.options.variant == "composer"
    assert form_widget.options.clear_on_submit is True
    assert form_widget.options.actions[0].action_id == "new-session"
    assert len(form_widget.children) == 1
    assert form_widget.children[0].id == "order-value"
    assert form_widget.children[0].options.commit == "enter"


def test_command_input_returns_text_only_for_its_submit_action() -> None:
    ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id="command-session",
        active_action_id="dispatch-order",
        active_action_value={"order-value": "Set course for Bajor"},
        builder=_ManifestBuilder(),
    )
    set_ctx(ctx)

    assert (
        lcars.command_input("Order", id="order", action_id="dispatch-order")
        == "Set course for Bajor"
    )
