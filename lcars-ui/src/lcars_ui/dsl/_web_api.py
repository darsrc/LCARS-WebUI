"""Knowledge-graph semantic widgets DSL implementation."""

from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from typing import Any, Literal

from lcars_ui.core.widget_base import Hint
from lcars_ui.dsl._api_helpers import (
    LayoutSizing,
    PanelAspect,
    ZoneHint,
    _coerce_hint,
    _get_or_init_ctx,
    _require_builder,
    _resolve_id,
)
from lcars_ui.widgets.web import SupportData, SupportPanel, TriState, TriStateData


def _apply_web_layout_hints(
    widget: Any,
    *,
    hint: str | Hint | None,
    zone: ZoneHint | None,
    span: tuple[int, int] | None,
    weight: int | None,
    aspect: PanelAspect | None,
    group: str | None,
    sizing: LayoutSizing | None,
) -> None:
    widget.hint = _coerce_hint(hint)
    widget.zone = zone
    widget.span = span
    widget.weight = weight
    widget.aspect = aspect
    widget.group = group
    widget.sizing = sizing


@contextmanager
def support_panel(
    title: str,
    *,
    node: str,
    data: SupportData | dict[str, Any] | None = None,
    show_environments: bool = True,
    show_legend: bool = False,
    id: str | None = None,
    color: str | None = "orange",
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[SupportPanel, None, None]:
    """Compose alternative support environments for ``node``.

    ``data`` carries the alternative environments up front; ``show_environments``
    and ``show_legend`` are display toggles, not separate calls, so a panel is
    fully declared in one statement.
    """
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title, id)
    builder = _require_builder(ctx)
    if data is None:
        parsed = SupportData(node=node)
    else:
        parsed = data if isinstance(data, SupportData) else SupportData.model_validate(data)
    if parsed.node != node:
        raise ValueError(
            f"support environment node {parsed.node!r} does not match panel node {node!r}"
        )
    widget = SupportPanel(
        id=widget_id,
        label=title,
        title=title,
        data=parsed,
        show_environments=show_environments,
        show_legend=show_legend,
        color=color,
        disabled=disabled,
        visible=visible,
    )
    _apply_web_layout_hints(
        widget,
        hint=hint,
        zone=zone,
        span=span,
        weight=weight,
        aspect=aspect,
        group=group,
        sizing=sizing,
    )
    builder.add_widget(widget)
    with builder.container_context(widget, target="children"):
        yield widget


def tri_state(
    data: TriStateData | dict[str, Any],
    *,
    on_escalate: Literal["EXACT"] | None = None,
    id: str | None = None,
    color: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> TriState:
    """Declare a YES/NO/UNKNOWN state widget."""
    parsed = data if isinstance(data, TriStateData) else TriStateData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(f"{parsed.query}-{parsed.target}", id)
    widget = TriState(
        id=widget_id,
        label=parsed.query,
        data=parsed,
        on_escalate=on_escalate,
        color=color,
        disabled=disabled,
        visible=visible,
    )
    _apply_web_layout_hints(
        widget,
        hint=hint,
        zone=zone,
        span=span,
        weight=weight,
        aspect=aspect,
        group=group,
        sizing=sizing,
    )
    _require_builder(ctx).add_widget(widget)
    return widget
