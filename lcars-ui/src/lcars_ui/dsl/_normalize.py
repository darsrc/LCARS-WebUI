"""Manifest strict-mode normalization helpers."""

from __future__ import annotations

from collections import deque
from typing import Literal, cast

from lcars_ui.core.models import Column, Manifest, Row, Widget
from lcars_ui.core.widget_base import LcarsColor
from lcars_ui.widgets.containers import LcarsBox, LcarsBracket, LcarsSweep

_STRUCTURAL_WIDGET_TYPES = {"lcars_box", "lcars_sweep", "lcars_bracket", "lcars_header"}
_INPUT_WIDGET_TYPES = {
    "button",
    "toggle",
    "lcars_checkbox",
    "select",
    "lcars_radio",
    "lcars_radio_toggle",
    "text_input",
    "number_input",
    "form",
}
_DATA_WIDGET_TYPES = {
    "status_tile",
    "table",
    "line_chart",
    "sparkline",
    "gauge",
    "progress_bar",
    "markdown",
    "text",
    "log_viewer",
    "video_hls",
    "mic_button",
    "alert",
}


def _iter_widget_tree(widgets: list[Widget]) -> list[Widget]:
    queue = deque(widgets)
    flattened: list[Widget] = []
    while queue:
        widget = queue.popleft()
        flattened.append(widget)
        children = getattr(widget, "children", None)
        if isinstance(children, list):
            queue.extendleft(reversed(children))
        left_inputs = getattr(widget, "left_inputs", None)
        if isinstance(left_inputs, list):
            queue.extendleft(reversed(left_inputs))
        right_inputs = getattr(widget, "right_inputs", None)
        if isinstance(right_inputs, list):
            queue.extendleft(reversed(right_inputs))
    return flattened


def _first_group_color(widgets: list[Widget]) -> LcarsColor:
    for widget in widgets:
        color = getattr(widget, "color", None)
        if isinstance(color, str):
            return color
    return "orange"


def _next_wrapper_id(base: str, used_ids: set[str]) -> str:
    candidate = base
    suffix = 2
    while candidate in used_ids:
        candidate = f"{base}-{suffix}"
        suffix += 1
    used_ids.add(candidate)
    return candidate


def _is_structural(widget: Widget) -> bool:
    return widget.type in _STRUCTURAL_WIDGET_TYPES


def _is_input_widget(widget: Widget) -> bool:
    return widget.type in _INPUT_WIDGET_TYPES


def _is_data_widget(widget: Widget) -> bool:
    return widget.type in _DATA_WIDGET_TYPES


def _classify_group(group: list[Widget]) -> Literal["input", "data", "mixed"]:
    if group and all(_is_input_widget(widget) for widget in group):
        return "input"
    if group and all(_is_data_widget(widget) for widget in group):
        return "data"
    return "mixed"


def _first_group_title(group: list[Widget], *, fallback: str) -> str:
    for widget in group:
        label = getattr(widget, "label", None)
        if isinstance(label, str) and label.strip():
            return label.strip()
    return fallback


def _is_raw_widget(widget: Widget, raw_widget_ids: set[str]) -> bool:
    return widget.id in raw_widget_ids


def _first_page_color(page_rows: list[Row]) -> LcarsColor:
    for row in page_rows:
        for column in row.columns:
            for widget in _iter_widget_tree(column.widgets):
                color = getattr(widget, "color", None)
                if isinstance(color, str):
                    return color
    return "orange"


def _page_has_title_sweep(page_rows: list[Row], page_title: str) -> bool:
    for row in page_rows:
        for column in row.columns:
            for widget in column.widgets:
                if widget.type != "lcars_sweep":
                    continue
                title = getattr(widget, "title", None)
                if isinstance(title, str) and title == page_title:
                    return True
    return False


def _wrap_group(
    *,
    page_id: str,
    row_index: int,
    column_index: int,
    group_index: int,
    group: list[Widget],
    used_widget_ids: set[str],
) -> tuple[Widget, int]:
    if len(group) == 1:
        wrapper_id = _next_wrapper_id(
            f"auto-bracket-{page_id}-{row_index}-{column_index}-{group_index}",
            used_widget_ids,
        )
        wrapper = LcarsBracket(
            id=wrapper_id,
            color=_first_group_color(group),
            orientation="left",
            children=list(group),
        )
        return cast(Widget, wrapper), group_index + 1

    classification = _classify_group(group)
    color = _first_group_color(group)
    if classification == "input":
        wrapper_id = _next_wrapper_id(
            f"auto-box-input-{page_id}-{row_index}-{column_index}-{group_index}",
            used_widget_ids,
        )
        title = _first_group_title(group, fallback="Controls")
        input_wrapper = LcarsBox(
            id=wrapper_id,
            label=title,
            title=title,
            color=color,
            width_left=72,
            width_right=130,
            left_inputs=[],
            right_inputs=list(group),
            children=[],
        )
        return cast(Widget, input_wrapper), group_index + 1

    if classification == "data":
        wrapper_id = _next_wrapper_id(
            f"auto-box-data-{page_id}-{row_index}-{column_index}-{group_index}",
            used_widget_ids,
        )
        title = _first_group_title(group, fallback="Data")
        data_wrapper = LcarsBox(
            id=wrapper_id,
            label=title,
            title=title,
            color=color,
            width_left=96,
            width_right=96,
            left_inputs=[],
            right_inputs=[],
            children=list(group),
        )
        return cast(Widget, data_wrapper), group_index + 1

    wrapper_id = _next_wrapper_id(
        f"auto-bracket-{page_id}-{row_index}-{column_index}-{group_index}",
        used_widget_ids,
    )
    wrapper = LcarsBracket(
        id=wrapper_id,
        color=color,
        orientation="both",
        children=list(group),
    )
    return cast(Widget, wrapper), group_index + 1


def _inject_page_title_sweep(
    *,
    page_id: str,
    page_title: str,
    page_rows: list[Row],
    used_widget_ids: set[str],
) -> None:
    if not page_title.strip():
        return
    if _page_has_title_sweep(page_rows, page_title):
        return

    row_ids = {row.id for row in page_rows}
    col_ids = {column.id for row in page_rows for column in row.columns}
    title_row_id = _next_wrapper_id(f"phase13-title-row-{page_id}", row_ids)
    title_col_id = _next_wrapper_id(f"phase13-title-col-{page_id}", col_ids)
    title_sweep_id = _next_wrapper_id(f"phase13-title-sweep-{page_id}", used_widget_ids)
    title_sweep = LcarsSweep(
        id=title_sweep_id,
        label=page_title,
        title=page_title,
        color=_first_page_color(page_rows),
        reverse=False,
        width_sidebar=150,
        children=[],
    )
    page_rows.insert(
        0,
        Row(
            id=title_row_id,
            height="auto",
            columns=[Column(id=title_col_id, width="1fr", widgets=[cast(Widget, title_sweep)])],
        ),
    )


def normalize_manifest_for_strict(
    manifest: Manifest,
    *,
    raw_widget_ids: set[str] | None = None,
) -> Manifest:
    """Compile strict-mode manifests into LCARS-native structural layout."""

    used_widget_ids: set[str] = set()
    raw_ids = raw_widget_ids or set()
    for page in manifest.pages.values():
        for row in page.rows:
            for column in row.columns:
                for widget in _iter_widget_tree(column.widgets):
                    used_widget_ids.add(widget.id)

    for page in manifest.pages.values():
        _inject_page_title_sweep(
            page_id=page.id,
            page_title=page.title,
            page_rows=page.rows,
            used_widget_ids=used_widget_ids,
        )

        for row_index, row in enumerate(page.rows, start=1):
            for column_index, column in enumerate(row.columns, start=1):
                normalized: list[Widget] = []
                group: list[Widget] = []
                group_index = 1

                for widget in column.widgets:
                    if _is_structural(widget) or _is_raw_widget(widget, raw_ids):
                        if group:
                            wrapper, group_index = _wrap_group(
                                page_id=page.id,
                                row_index=row_index,
                                column_index=column_index,
                                group_index=group_index,
                                group=group,
                                used_widget_ids=used_widget_ids,
                            )
                            normalized.append(wrapper)
                            group = []
                        normalized.append(widget)
                        continue
                    group.append(widget)

                if group:
                    wrapper, _ = _wrap_group(
                        page_id=page.id,
                        row_index=row_index,
                        column_index=column_index,
                        group_index=group_index,
                        group=group,
                        used_widget_ids=used_widget_ids,
                    )
                    normalized.append(wrapper)
                column.widgets = normalized

    return manifest


__all__ = ["normalize_manifest_for_strict"]
