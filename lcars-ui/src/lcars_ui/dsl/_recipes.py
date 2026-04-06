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
        strict_role="primary",
        reverse=False,
        width_sidebar=220,
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
        strict_role="primary",
        reverse=False,
        width_sidebar=160,
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
        strict_role="primary",
        width_left=160,
        width_right=160,
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
        strict_role="primary",
        width_left=140,
        width_right=120,
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
        strict_role="secondary",
        width_left=120,
        width_right=180,
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
