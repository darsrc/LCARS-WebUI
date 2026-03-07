"""Phase 13 LCARS composition recipe helpers."""

from __future__ import annotations

from lcars_ui.core.widget_base import LcarsColor
from lcars_ui.widgets.containers import LcarsBox, LcarsSweep


def make_console_sweep(
    *,
    widget_id: str,
    title: str,
    color: LcarsColor = "orange",
) -> LcarsSweep:
    return LcarsSweep(
        id=widget_id,
        label=title,
        title=title,
        color=color,
        reverse=False,
        width_sidebar=150,
        left_width=0.62,
        header_children=[],
        column_inputs=[],
        left_children=[],
        right_children=[],
        rail_children=[],
        content_children=[],
        children=[],
    )


def make_padd_sweep(
    *,
    widget_id: str,
    title: str,
    color: LcarsColor = "orange",
) -> LcarsSweep:
    return LcarsSweep(
        id=widget_id,
        label=title,
        title=title,
        color=color,
        reverse=False,
        width_sidebar=96,
        left_width=0.66,
        header_children=[],
        column_inputs=[],
        left_children=[],
        right_children=[],
        rail_children=[],
        content_children=[],
        children=[],
    )


def make_diagnostic_box(
    *,
    widget_id: str,
    title: str,
    color: LcarsColor = "blue",
) -> LcarsBox:
    return LcarsBox(
        id=widget_id,
        label=title,
        title=title,
        color=color,
        width_left=96,
        width_right=96,
        left_inputs=[],
        right_inputs=[],
        children=[],
    )


def make_data_panel_box(
    *,
    widget_id: str,
    title: str,
    color: LcarsColor = "blue",
) -> LcarsBox:
    return LcarsBox(
        id=widget_id,
        label=title,
        title=title,
        color=color,
        width_left=96,
        width_right=72,
        left_inputs=[],
        right_inputs=[],
        children=[],
    )


def make_control_panel_box(
    *,
    widget_id: str,
    title: str,
    color: LcarsColor = "orange",
) -> LcarsBox:
    return LcarsBox(
        id=widget_id,
        label=title,
        title=title,
        color=color,
        width_left=64,
        width_right=130,
        left_inputs=[],
        right_inputs=[],
        children=[],
    )


__all__ = [
    "make_console_sweep",
    "make_padd_sweep",
    "make_diagnostic_box",
    "make_data_panel_box",
    "make_control_panel_box",
]
