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
from lcars_ui.core.widget_base import LcarsColor, StrictWidgetRole
from lcars_ui.dsl._strict_contract import (
    default_strict_role_for_widget,
    default_strict_surface_variant_for_widget,
    default_strict_title_for_widget,
    is_legacy_input_widget,
)
from lcars_ui.widgets.containers import LcarsBox, LcarsBracket, LcarsSweep
from lcars_ui.widgets.inputs import InputWidget

_STRUCTURAL_WIDGET_TYPES = {"lcars_box", "lcars_sweep", "lcars_bracket", "lcars_header"}
_SWEEP_HEADER_WIDGET_TYPES = {"lcars_header"}
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
_NORMALIZE_MODE = Literal["explicit", "compatibility"]
_VALID_STRICT_ROLES = {"primary", "secondary", "terminal"}


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
        main_children = getattr(widget, "main_children", None)
        if isinstance(main_children, list):
            queue.extendleft(reversed(main_children))
        side_children = getattr(widget, "side_children", None)
        if isinstance(side_children, list):
            queue.extendleft(reversed(side_children))
        header_children = getattr(widget, "header_children", None)
        if isinstance(header_children, list):
            queue.extendleft(reversed(header_children))
        column_inputs = getattr(widget, "column_inputs", None)
        if isinstance(column_inputs, list):
            queue.extendleft(reversed(column_inputs))
        left_children = getattr(widget, "left_children", None)
        if isinstance(left_children, list):
            queue.extendleft(reversed(left_children))
        right_children = getattr(widget, "right_children", None)
        if isinstance(right_children, list):
            queue.extendleft(reversed(right_children))
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


def _is_legacy_input_widget(widget: Widget) -> bool:
    return is_legacy_input_widget(widget)


def _is_legacy_data_widget(widget: Widget) -> bool:
    return widget.type in _DATA_WIDGET_TYPES


def _ensure_widget_strict_role(
    widget: Widget,
    *,
    scope: _SEQUENCE_SCOPE,
) -> Widget:
    if getattr(widget, "strict_role", None) is None:
        widget.strict_role = default_strict_role_for_widget(widget, scope=scope)
    return widget


def _ensure_widget_strict_title(widget: Widget) -> Widget:
    if getattr(widget, "strict_title", None) is None:
        widget.strict_title = default_strict_title_for_widget(widget)
    return widget


def _ensure_widget_strict_surface_variant(widget: Widget) -> Widget:
    if getattr(widget, "strict_surface_variant", None) is None:
        widget.strict_surface_variant = default_strict_surface_variant_for_widget(widget)
    return widget


def _strict_role_for_widget(
    widget: Widget,
    *,
    scope: _SEQUENCE_SCOPE,
) -> StrictWidgetRole:
    authored_role = getattr(widget, "strict_role", None)
    if authored_role in {"primary", "secondary", "terminal"}:
        return cast(StrictWidgetRole, authored_role)
    return default_strict_role_for_widget(widget, scope=scope)


def _has_authored_strict_role(widget: Widget) -> bool:
    authored_role = getattr(widget, "strict_role", None)
    return authored_role in _VALID_STRICT_ROLES


def _has_explicit_region_payload(*regions: list[Widget] | None) -> bool:
    return any(len(region or []) > 0 for region in regions)


def _should_route_authored_terminal_to_input(
    widget: Widget,
    *,
    scope: Literal["box_content", "sweep_content"],
    explicit_regions_authored: bool,
) -> bool:
    if explicit_regions_authored:
        return False
    if not _has_authored_strict_role(widget):
        return False
    return _strict_role_for_widget(widget, scope=scope) == "terminal"


def _should_apply_legacy_input_fallback(
    widget: Widget,
    *,
    raw_ids: set[str],
    explicit_regions_authored: bool,
) -> bool:
    if explicit_regions_authored:
        return False
    if _is_raw_widget(widget, raw_ids):
        return False
    if _has_authored_strict_role(widget):
        return False
    return _is_legacy_input_widget(widget)


def _partition_content_by_role(
    widgets: list[Widget],
    *,
    scope: Literal["box_content", "sweep_content"],
) -> tuple[list[Widget], list[Widget]]:
    primary_widgets: list[Widget] = []
    secondary_widgets: list[Widget] = []
    for widget in widgets:
        if _strict_role_for_widget(widget, scope=scope) == "secondary":
            secondary_widgets.append(widget)
            continue
        primary_widgets.append(widget)

    if not primary_widgets and secondary_widgets:
        primary_widgets.append(secondary_widgets.pop(0))

    return primary_widgets, secondary_widgets


def _normalize_mode_for_manifest(manifest: Manifest) -> _NORMALIZE_MODE:
    if getattr(manifest.meta, "strict_contract_level", None) == "explicit":
        return "explicit"
    return "compatibility"


def _format_widget_debug_label(widget: Widget) -> str:
    return f"{widget.id}:{widget.type}"


def _raise_explicit_contract_error(
    *,
    page_id: str,
    row_id: str,
    row_index: int,
    column_id: str,
    column_index: int,
    widgets: list[Widget],
) -> None:
    widget_debug = ", ".join(_format_widget_debug_label(widget) for widget in widgets)
    raise ValueError(
        "Strict explicit manifest normalization requires authored strict_role on every existing "
        f"widget before normalization (page={page_id}, row={row_id}@{row_index}, "
        f"column={column_id}@{column_index}, widgets=[{widget_debug}])"
    )


def _validate_explicit_widget_roles(
    *,
    page_id: str,
    row: Row,
    row_index: int,
    column: Column,
    column_index: int,
) -> None:
    invalid_widgets = [
        widget
        for widget in _iter_widget_tree(column.widgets)
        if getattr(widget, "strict_role", None) not in _VALID_STRICT_ROLES
    ]
    if invalid_widgets:
        _raise_explicit_contract_error(
            page_id=page_id,
            row_id=row.id,
            row_index=row_index,
            column_id=column.id,
            column_index=column_index,
            widgets=invalid_widgets,
        )


def _classify_group(
    group: list[Widget],
    *,
    normalize_mode: _NORMALIZE_MODE,
    page_id: str,
    row_index: int,
    column_index: int,
) -> Literal["input", "data", "mixed"]:
    if not group:
        return "mixed"

    role_classification = _classify_group_by_strict_role(group)
    if role_classification is not None:
        return role_classification

    if normalize_mode == "explicit":
        _raise_explicit_contract_error(
            page_id=page_id,
            row_id=f"row-{row_index}",
            row_index=row_index,
            column_id=f"column-{column_index}",
            column_index=column_index,
            widgets=group,
        )

    # Compatibility fallback for non-normalized legacy groups.
    return _classify_group_by_legacy_types(group)


def _classify_group_by_strict_role(
    group: list[Widget],
) -> Literal["input", "data", "mixed"] | None:
    resolved_roles: list[StrictWidgetRole] = []
    for widget in group:
        strict_role = getattr(widget, "strict_role", None)
        if strict_role not in {"primary", "secondary", "terminal"}:
            return None
        resolved_roles.append(cast(StrictWidgetRole, strict_role))

    if all(role == "terminal" for role in resolved_roles):
        return "input"
    if any(role == "terminal" for role in resolved_roles):
        return "mixed"
    return "data"


def _classify_group_by_legacy_types(group: list[Widget]) -> Literal["input", "data", "mixed"]:
    if all(_is_legacy_input_widget(widget) for widget in group):
        return "input"
    if all(_is_legacy_data_widget(widget) for widget in group):
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


def _row_has_page_title_sweep(row: Row, page_title: str) -> bool:
    for column in row.columns:
        for widget in column.widgets:
            if widget.type != "lcars_sweep":
                continue
            title = getattr(widget, "title", None)
            if isinstance(title, str) and title == page_title:
                return True
    return False


def _partition_top_level_lane_widgets(
    widgets: list[Widget],
) -> tuple[list[Widget], list[Widget]]:
    primary_widgets: list[Widget] = []
    support_widgets: list[Widget] = []

    for widget in widgets:
        strict_role = _strict_role_for_widget(widget, scope="page")
        if strict_role in {"terminal", "secondary"}:
            support_widgets.append(widget)
            continue
        primary_widgets.append(widget)

    if not primary_widgets and support_widgets:
        primary_widgets.append(support_widgets.pop(0))

    return primary_widgets, support_widgets


def _row_should_split_single_column(
    row: Row,
    *,
    normalize_mode: _NORMALIZE_MODE,
) -> bool:
    if len(row.columns) != 1:
        return False

    widgets = row.columns[0].widgets
    if len(widgets) < 2:
        return False

    if normalize_mode == "compatibility" and not any(_has_authored_strict_role(widget) for widget in widgets):
        return False

    primary_widgets, support_widgets = _partition_top_level_lane_widgets(widgets)
    return bool(primary_widgets and support_widgets)


def _annotate_page_row_scaffolds(
    page_rows: list[Row],
    page_title: str,
    *,
    normalize_mode: _NORMALIZE_MODE,
) -> None:
    for row in page_rows:
        is_page_title_band = _row_has_page_title_sweep(row, page_title)
        derived_band_role = "page_title" if is_page_title_band else "content"
        derived_lane_mode = "follow_columns"
        if not is_page_title_band and _row_should_split_single_column(
            row,
            normalize_mode=normalize_mode,
        ):
            derived_lane_mode = "split_single_column"

        if row.strict_band_role is None:
            row.strict_band_role = cast(Literal["page_title", "content"], derived_band_role)
        if row.strict_lane_mode is None:
            row.strict_lane_mode = cast(
                Literal["follow_columns", "split_single_column"],
                derived_lane_mode,
            )

        for column in row.columns:
            derived_lane_role = "title" if is_page_title_band else "content"
            if column.strict_lane_role is None:
                column.strict_lane_role = cast(
                    Literal["title", "content", "core", "support"],
                    derived_lane_role,
                )


def _wrap_group(
    *,
    page_id: str,
    row_index: int,
    column_index: int,
    group_index: int,
    group: list[Widget],
    used_widget_ids: set[str],
    normalize_mode: _NORMALIZE_MODE,
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
        return _ensure_widget_strict_title(
            _ensure_widget_strict_role(cast(Widget, wrapper), scope=scope)
        ), group_index + 1

    classification = _classify_group(
        group,
        normalize_mode=normalize_mode,
        page_id=page_id,
        row_index=row_index,
        column_index=column_index,
    )
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
            return _ensure_widget_strict_title(
                _ensure_widget_strict_role(cast(Widget, wrapper), scope=scope)
            ), group_index + 1

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
        return _ensure_widget_strict_title(
            _ensure_widget_strict_role(cast(Widget, input_wrapper), scope=scope)
        ), group_index + 1

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
            return _ensure_widget_strict_title(
                _ensure_widget_strict_role(cast(Widget, wrapper), scope=scope)
            ), group_index + 1

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
        return _ensure_widget_strict_title(
            _ensure_widget_strict_role(cast(Widget, data_wrapper), scope=scope)
        ), group_index + 1

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
    return _ensure_widget_strict_title(
        _ensure_widget_strict_role(cast(Widget, wrapper), scope=scope)
    ), group_index + 1


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
        left_width=0.62,
        children=[],
        header_children=[],
        column_inputs=[],
        left_children=[],
        right_children=[],
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


def _split_for_sweep_regions(content: list[Widget], left_width: float) -> tuple[list[Widget], list[Widget]]:
    if not content:
        return [], []
    if len(content) == 1:
        return list(content), []
    split_at = round(len(content) * left_width)
    split_at = max(1, min(len(content) - 1, split_at))
    return list(content[:split_at]), list(content[split_at:])


def _normalize_sweep_regions(
    sweep: LcarsSweep,
    *,
    raw_ids: set[str],
    normalize_mode: _NORMALIZE_MODE,
) -> None:
    # Compatibility fallback contract:
    # 1) explicit region payload and authored strict roles always win;
    # 2) raw widgets are never reassigned by compatibility routing;
    # 3) legacy input-type reassignment only runs for implicit manifests.
    # Keep explicit region payloads if already populated, and classify only the
    # remaining legacy ``children`` set into strict sweep regions.
    header = list(sweep.header_children or [])
    column_inputs = list(sweep.column_inputs or sweep.rail_children or [])
    left_content = list(sweep.left_children or [])
    right_content = list(sweep.right_children or [])
    content = list(sweep.content_children or [])
    explicit_regions_authored = _has_explicit_region_payload(
        sweep.header_children,
        sweep.column_inputs,
        sweep.left_children,
        sweep.right_children,
        sweep.content_children,
        sweep.rail_children,
    )

    consumed = {widget.id for widget in [*header, *column_inputs, *left_content, *right_content, *content]}
    for child in sweep.children:
        if child.id in consumed:
            continue
        if _is_raw_widget(child, raw_ids):
            content.append(child)
            continue
        if child.type in _SWEEP_HEADER_WIDGET_TYPES:
            header.append(child)
            continue
        if _should_route_authored_terminal_to_input(
            child,
            scope="sweep_content",
            explicit_regions_authored=explicit_regions_authored,
        ):
            column_inputs.append(child)
            continue
        if normalize_mode == "compatibility" and _should_apply_legacy_input_fallback(
            child,
            raw_ids=raw_ids,
            explicit_regions_authored=explicit_regions_authored,
        ):
            column_inputs.append(child)
            continue
        if _has_authored_strict_role(child):
            content.append(child)
            continue
        content.append(child)

    if not left_content and not right_content and content:
        left_content, right_content = _partition_content_by_role(content, scope="sweep_content")
        if not right_content:
            left_content, right_content = _split_for_sweep_regions(content, sweep.left_width)
    elif content:
        left_content.extend(content)

    # Inputs authored into left/right content should be owned by the column.
    retained_left: list[Widget] = []
    retained_right: list[Widget] = []
    for child in left_content:
        if _is_raw_widget(child, raw_ids):
            retained_left.append(child)
            continue
        if _should_route_authored_terminal_to_input(
            child,
            scope="sweep_content",
            explicit_regions_authored=explicit_regions_authored,
        ):
            column_inputs.append(child)
            continue
        if normalize_mode == "compatibility" and _should_apply_legacy_input_fallback(
            child,
            raw_ids=raw_ids,
            explicit_regions_authored=explicit_regions_authored,
        ):
            column_inputs.append(child)
            continue
        retained_left.append(child)
    for child in right_content:
        if _is_raw_widget(child, raw_ids):
            retained_right.append(child)
            continue
        if _should_route_authored_terminal_to_input(
            child,
            scope="sweep_content",
            explicit_regions_authored=explicit_regions_authored,
        ):
            column_inputs.append(child)
            continue
        if normalize_mode == "compatibility" and _should_apply_legacy_input_fallback(
            child,
            raw_ids=raw_ids,
            explicit_regions_authored=explicit_regions_authored,
        ):
            column_inputs.append(child)
            continue
        retained_right.append(child)

    if not retained_left and retained_right:
        retained_left.append(retained_right.pop(0))

    sweep.header_children = _dedupe_widgets_by_id(header)
    sweep.column_inputs = _dedupe_widgets_by_id(column_inputs)
    sweep.left_children = _dedupe_widgets_by_id(retained_left)
    sweep.right_children = _dedupe_widgets_by_id(retained_right)
    # Maintain legacy aliases for older strict render paths.
    sweep.rail_children = list(sweep.column_inputs)
    sweep.content_children = [*sweep.left_children, *sweep.right_children]
    # Keep legacy ``children`` as the effective content region for old clients.
    sweep.children = list(sweep.content_children)


def _normalize_box_regions(
    box: LcarsBox,
    *,
    raw_ids: set[str],
    normalize_mode: _NORMALIZE_MODE,
) -> None:
    left_inputs = list(box.left_inputs or [])
    right_inputs = list(box.right_inputs or [])
    main_content = list(box.main_children or [])
    side_content = list(box.side_children or [])
    legacy_content = list(box.children)
    explicit_regions_authored = _has_explicit_region_payload(
        box.left_inputs,
        box.right_inputs,
        box.main_children,
        box.side_children,
    )

    if not main_content and legacy_content:
        if not side_content:
            main_content, side_content = _partition_content_by_role(
                legacy_content,
                scope="box_content",
            )
        else:
            main_content = list(legacy_content)

    # For strict mode, inputs authored into body content should be owned by the
    # side-input rails first, then content retains non-input surfaces.
    retained_main: list[Widget] = []
    retained_side: list[Widget] = []
    for child in main_content:
        if _should_route_authored_terminal_to_input(
            child,
            scope="box_content",
            explicit_regions_authored=explicit_regions_authored,
        ):
            right_inputs.append(child)
            continue
        if normalize_mode == "compatibility" and _should_apply_legacy_input_fallback(
            child,
            raw_ids=raw_ids,
            explicit_regions_authored=explicit_regions_authored,
        ):
            right_inputs.append(child)
            continue
        retained_main.append(child)
    for child in side_content:
        if _should_route_authored_terminal_to_input(
            child,
            scope="box_content",
            explicit_regions_authored=explicit_regions_authored,
        ):
            right_inputs.append(child)
            continue
        if normalize_mode == "compatibility" and _should_apply_legacy_input_fallback(
            child,
            raw_ids=raw_ids,
            explicit_regions_authored=explicit_regions_authored,
        ):
            right_inputs.append(child)
            continue
        retained_side.append(child)

    if not retained_main and retained_side:
        retained_main.append(retained_side.pop(0))

    box.left_inputs = _dedupe_widgets_by_id(left_inputs)
    box.right_inputs = _dedupe_widgets_by_id(right_inputs)
    box.main_children = _dedupe_widgets_by_id(retained_main)
    box.side_children = _dedupe_widgets_by_id(retained_side)
    # Keep legacy ``children`` flattened for compatibility.
    box.children = [*box.main_children, *box.side_children]


def _normalize_widget(
    widget: Widget,
    *,
    page_id: str,
    row_index: int,
    column_index: int,
    used_widget_ids: set[str],
    raw_ids: set[str],
    scope: _SEQUENCE_SCOPE,
    normalize_mode: _NORMALIZE_MODE,
) -> Widget:
    if _is_raw_widget(widget, raw_ids):
        return _ensure_widget_strict_surface_variant(
            _ensure_widget_strict_title(_ensure_widget_strict_role(widget, scope=scope))
        )

    if widget.type == "lcars_sweep":
        sweep = widget
        _normalize_sweep_regions(sweep, raw_ids=raw_ids, normalize_mode=normalize_mode)
        sweep.header_children = _normalize_widget_sequence(
            list(sweep.header_children or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="header",
            normalize_mode=normalize_mode,
        )
        sweep.column_inputs = _normalize_widget_sequence(
            list(sweep.column_inputs or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="rail",
            normalize_mode=normalize_mode,
        )
        sweep.left_children = _normalize_widget_sequence(
            list(sweep.left_children or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="sweep_content",
            normalize_mode=normalize_mode,
        )
        sweep.right_children = _normalize_widget_sequence(
            list(sweep.right_children or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="sweep_content",
            normalize_mode=normalize_mode,
        )
        sweep.rail_children = list(sweep.column_inputs)
        sweep.content_children = [*sweep.left_children, *sweep.right_children]
        sweep.children = list(sweep.content_children)
        return _ensure_widget_strict_surface_variant(
            _ensure_widget_strict_title(_ensure_widget_strict_role(sweep, scope=scope))
        )

    if widget.type == "lcars_box":
        box = widget
        _normalize_box_regions(box, raw_ids=raw_ids, normalize_mode=normalize_mode)
        box.left_inputs = _normalize_widget_sequence(
            list(box.left_inputs or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="rail",
            normalize_mode=normalize_mode,
        )
        box.right_inputs = _normalize_widget_sequence(
            list(box.right_inputs or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="rail",
            normalize_mode=normalize_mode,
        )
        box.main_children = _normalize_widget_sequence(
            list(box.main_children or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="box_content",
            normalize_mode=normalize_mode,
        )
        box.side_children = _normalize_widget_sequence(
            list(box.side_children or []),
            page_id=page_id,
            row_index=row_index,
            column_index=column_index,
            used_widget_ids=used_widget_ids,
            raw_ids=raw_ids,
            scope="box_content",
            normalize_mode=normalize_mode,
        )
        box.children = [*box.main_children, *box.side_children]
        return _ensure_widget_strict_surface_variant(
            _ensure_widget_strict_title(_ensure_widget_strict_role(box, scope=scope))
        )

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
            normalize_mode=normalize_mode,
        )
        return _ensure_widget_strict_surface_variant(
            _ensure_widget_strict_title(_ensure_widget_strict_role(bracket, scope=scope))
        )

    if widget.type == "form":
        form = widget
        form.children = cast(
            list[InputWidget],
            _normalize_widget_sequence(
                cast(list[Widget], list(form.children)),
                page_id=page_id,
                row_index=row_index,
                column_index=column_index,
                used_widget_ids=used_widget_ids,
                raw_ids=raw_ids,
                scope="rail",
                normalize_mode=normalize_mode,
            ),
        )
        return _ensure_widget_strict_surface_variant(
            _ensure_widget_strict_title(_ensure_widget_strict_role(form, scope=scope))
        )

    return _ensure_widget_strict_surface_variant(
        _ensure_widget_strict_title(_ensure_widget_strict_role(widget, scope=scope))
    )


def _normalize_widget_sequence(
    widgets: list[Widget],
    *,
    page_id: str,
    row_index: int,
    column_index: int,
    used_widget_ids: set[str],
    raw_ids: set[str],
    scope: _SEQUENCE_SCOPE,
    normalize_mode: _NORMALIZE_MODE,
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
                scope=scope,
                normalize_mode=normalize_mode,
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
            scope=scope,
            normalize_mode=normalize_mode,
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
                    normalize_mode=normalize_mode,
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
            normalize_mode=normalize_mode,
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

    normalize_mode = _normalize_mode_for_manifest(manifest)
    used_widget_ids: set[str] = set()
    raw_ids = raw_widget_ids or set()
    for page in manifest.pages.values():
        for row in page.rows:
            for column in row.columns:
                for widget in _iter_widget_tree(column.widgets):
                    used_widget_ids.add(widget.id)

    for page in manifest.pages.values():
        if normalize_mode == "explicit":
            for row_index, row in enumerate(page.rows, start=1):
                for column_index, column in enumerate(row.columns, start=1):
                    _validate_explicit_widget_roles(
                        page_id=page.id,
                        row=row,
                        row_index=row_index,
                        column=column,
                        column_index=column_index,
                    )

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
                    normalize_mode=normalize_mode,
                )

        _annotate_page_row_scaffolds(
            page.rows,
            page.title,
            normalize_mode=normalize_mode,
        )

    return manifest


__all__ = ["normalize_manifest_for_strict"]
