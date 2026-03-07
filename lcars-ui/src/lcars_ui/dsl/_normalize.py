"""Manifest strict-mode normalization helpers.

Strict lowering contract (Phase 13):
1. Classic manifests pass through unchanged; strict mode performs deterministic
   composition lowering.
2. Bare widget runs are grouped into LCARS structural containers before frontend
   render (`lcars_box`, `lcars_bracket`).
3. `lcars_sweep` and `lcars_box` are treated as composition primitives with
   explicit interior regions (header/rail/content or side-input/content rails).
4. Raw widgets (`lcars.raw()`) bypass strict auto-grouping and keep authored
   structure intact.

Rows/columns remain in the manifest for backward compatibility transport, but
strict-mode composition truth is container-first.
"""

from __future__ import annotations

from collections import deque
from typing import Literal, cast

from lcars_ui.core.models import Column, Manifest, Row, Widget
from lcars_ui.core.widget_base import LcarsColor
from lcars_ui.widgets.containers import LcarsBox, LcarsBracket, LcarsSweep

_STRUCTURAL_WIDGET_TYPES = {"lcars_box", "lcars_sweep", "lcars_bracket", "lcars_header"}
_SWEEP_HEADER_WIDGET_TYPES = {"lcars_header"}
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
_WRAP_SCOPE = Literal["page", "box_content", "bracket_content", "sweep_content"]
_SEQUENCE_SCOPE = Literal[
    "page",
    "box_content",
    "bracket_content",
    "sweep_content",
    "rail",
    "header",
]


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
        header_children = getattr(widget, "header_children", None)
        if isinstance(header_children, list):
            queue.extendleft(reversed(header_children))
        rail_children = getattr(widget, "rail_children", None)
        if isinstance(rail_children, list):
            queue.extendleft(reversed(rail_children))
        content_children = getattr(widget, "content_children", None)
        if isinstance(content_children, list):
            queue.extendleft(reversed(content_children))
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
    scope: _WRAP_SCOPE = "page",
) -> tuple[Widget, int]:
    color = _first_group_color(group)
    if len(group) == 1:
        wrapper_id = _next_wrapper_id(
            f"auto-bracket-{scope}-{page_id}-{row_index}-{column_index}-{group_index}",
            used_widget_ids,
        )
        wrapper = LcarsBracket(
            id=wrapper_id,
            color=color,
            orientation="left",
            children=list(group),
        )
        return cast(Widget, wrapper), group_index + 1

    classification = _classify_group(group)
    if classification == "input":
        if scope in {"box_content", "sweep_content"}:
            wrapper_id = _next_wrapper_id(
                f"auto-bracket-input-{scope}-{page_id}-{row_index}-{column_index}-{group_index}",
                used_widget_ids,
            )
            wrapper = LcarsBracket(
                id=wrapper_id,
                color=color,
                orientation="right",
                children=list(group),
            )
            return cast(Widget, wrapper), group_index + 1

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
        if scope in {"box_content", "sweep_content"}:
            wrapper_id = _next_wrapper_id(
                f"auto-bracket-data-{scope}-{page_id}-{row_index}-{column_index}-{group_index}",
                used_widget_ids,
            )
            wrapper = LcarsBracket(
                id=wrapper_id,
                color=color,
                orientation="left",
                children=list(group),
            )
            return cast(Widget, wrapper), group_index + 1

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
        f"auto-bracket-{scope}-{page_id}-{row_index}-{column_index}-{group_index}",
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
        header_children=[],
        rail_children=[],
        content_children=[],
    )
    page_rows.insert(
        0,
        Row(
            id=title_row_id,
            height="auto",
            columns=[Column(id=title_col_id, width="1fr", widgets=[cast(Widget, title_sweep)])],
        ),
    )


def _dedupe_widgets_by_id(widgets: list[Widget]) -> list[Widget]:
    seen: set[str] = set()
    deduped: list[Widget] = []
    for widget in widgets:
        if widget.id in seen:
            continue
        seen.add(widget.id)
        deduped.append(widget)
    return deduped


def _normalize_sweep_regions(
    sweep: LcarsSweep,
    *,
    raw_ids: set[str],
) -> None:
    # Keep explicit region payloads if already populated, and classify only the
    # remaining legacy ``children`` set into strict sweep regions.
    header = list(sweep.header_children or [])
    rail = list(sweep.rail_children or [])
    content = list(sweep.content_children or [])

    consumed = {widget.id for widget in [*header, *rail, *content]}
    for child in sweep.children:
        if child.id in consumed:
            continue
        if _is_raw_widget(child, raw_ids):
            content.append(child)
            continue
        if child.type in _SWEEP_HEADER_WIDGET_TYPES:
            header.append(child)
            continue
        if _is_input_widget(child):
            rail.append(child)
            continue
        content.append(child)

    sweep.header_children = _dedupe_widgets_by_id(header)
    sweep.rail_children = _dedupe_widgets_by_id(rail)
    sweep.content_children = _dedupe_widgets_by_id(content)
    # Keep legacy ``children`` as the effective content region for old clients.
    sweep.children = list(sweep.content_children)


def _normalize_box_regions(box: LcarsBox) -> None:
    left_inputs = list(box.left_inputs or [])
    right_inputs = list(box.right_inputs or [])
    content = list(box.children)

    # For strict mode, inputs authored into body content should be owned by the
    # side-input rails first, then content retains non-input surfaces.
    retained_content: list[Widget] = []
    for child in content:
        if _is_input_widget(child):
            right_inputs.append(child)
            continue
        retained_content.append(child)

    box.left_inputs = _dedupe_widgets_by_id(left_inputs)
    box.right_inputs = _dedupe_widgets_by_id(right_inputs)
    box.children = retained_content


def _normalize_widget(
    widget: Widget,
    *,
    page_id: str,
    row_index: int,
    column_index: int,
    used_widget_ids: set[str],
    raw_ids: set[str],
) -> Widget:
    if _is_raw_widget(widget, raw_ids):
        return widget

    if widget.type == "lcars_sweep":
        sweep = widget
        _normalize_sweep_regions(sweep, raw_ids=raw_ids)
        sweep.header_children = _normalize_widget_sequence(
            list(sweep.header_children or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="header",
        )
        sweep.rail_children = _normalize_widget_sequence(
            list(sweep.rail_children or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="rail",
        )
        sweep.content_children = _normalize_widget_sequence(
            list(sweep.content_children or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="sweep_content",
        )
        sweep.children = list(sweep.content_children)
        return sweep

    if widget.type == "lcars_box":
        box = widget
        _normalize_box_regions(box)
        box.left_inputs = _normalize_widget_sequence(
            list(box.left_inputs or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="rail",
        )
        box.right_inputs = _normalize_widget_sequence(
            list(box.right_inputs or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="rail",
        )
        box.children = _normalize_widget_sequence(
            list(box.children),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="box_content",
        )
        return box

    if widget.type == "lcars_bracket":
        bracket = widget
        bracket.children = _normalize_widget_sequence(
            list(bracket.children),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="bracket_content",
        )
        return bracket

    return widget


def _normalize_widget_sequence(
    widgets: list[Widget],
    *,
    page_id: str,
    row_index: int,
    column_index: int,
    used_widget_ids: set[str],
    raw_ids: set[str],
    scope: _SEQUENCE_SCOPE,
) -> list[Widget]:
    if scope in {"rail", "header", "box_content", "sweep_content"}:
        return [
            _normalize_widget(
                widget,
                page_id=page_id,
                row_index=row_index,
                column_index=column_index,
                used_widget_ids=used_widget_ids,
                raw_ids=raw_ids,
            )
            for widget in widgets
        ]

    normalized: list[Widget] = []
    group: list[Widget] = []
    group_index = 1
    wrap_scope: _WRAP_SCOPE = cast(_WRAP_SCOPE, scope)

    for widget in widgets:
        normalized_widget = _normalize_widget(
            widget,
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
        )
        if _is_structural(normalized_widget) or _is_raw_widget(normalized_widget, raw_ids):
            if group:
                wrapper, group_index = _wrap_group(
                    page_id=page_id,
                    row_index=row_index,
                    column_index=column_index,
                    group_index=group_index,
                    group=group,
                    used_widget_ids=used_widget_ids,
                    scope=wrap_scope,
                )
                normalized.append(wrapper)
                group = []
            normalized.append(normalized_widget)
            continue
        group.append(normalized_widget)

    if group:
        wrapper, _ = _wrap_group(
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            group_index=group_index,
            group=group,
            used_widget_ids=used_widget_ids,
            scope=wrap_scope,
        )
        normalized.append(wrapper)

    return normalized


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
                column.widgets = _normalize_widget_sequence(
                    list(column.widgets),
                    page_id=page.id,
                    row_index=row_index,
                    column_index=column_index,
                    used_widget_ids=used_widget_ids,
                    raw_ids=raw_ids,
                    scope="page",
                )

    return manifest


__all__ = ["normalize_manifest_for_strict"]
