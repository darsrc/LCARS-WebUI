"""Manifest strict-mode normalization helpers."""

from __future__ import annotations

from collections import deque
from typing import cast

from lcars_ui.core.models import Manifest, Widget
from lcars_ui.core.widget_base import LcarsColor
from lcars_ui.widgets.containers import LcarsBracket

_STRUCTURAL_WIDGET_TYPES = {"lcars_box", "lcars_sweep", "lcars_bracket", "lcars_header"}


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


def _wrap_group(
    *,
    page_id: str,
    row_index: int,
    column_index: int,
    group_index: int,
    group: list[Widget],
    used_widget_ids: set[str],
) -> tuple[Widget, int]:
    wrapper_id = _next_wrapper_id(
        f"auto-bracket-{page_id}-{row_index}-{column_index}-{group_index}",
        used_widget_ids,
    )
    wrapper = LcarsBracket(
        id=wrapper_id,
        color=_first_group_color(group),
        orientation="both",
        children=list(group),
    )
    return cast(Widget, wrapper), group_index + 1


def normalize_manifest_for_strict(manifest: Manifest) -> Manifest:
    """Wrap bare widget groups into lcars_bracket containers for strict mode."""

    used_widget_ids: set[str] = set()
    for page in manifest.pages.values():
        for row in page.rows:
            for column in row.columns:
                for widget in _iter_widget_tree(column.widgets):
                    used_widget_ids.add(widget.id)

    for page in manifest.pages.values():
        for row_index, row in enumerate(page.rows, start=1):
            for column_index, column in enumerate(row.columns, start=1):
                normalized: list[Widget] = []
                group: list[Widget] = []
                group_index = 1

                for widget in column.widgets:
                    if _is_structural(widget):
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
