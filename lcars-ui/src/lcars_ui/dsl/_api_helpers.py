"""Shared helpers for public DSL modules."""

from __future__ import annotations

from typing import Literal

from lcars_ui.core.widget_base import Hint
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, auto_id, get_ctx
from lcars_ui.widgets.options import TextOptions
from lcars_ui.widgets.primitives import Text

# Adaptive-layout placement hint (override for the renderer's auto-placement)
ZoneHint = Literal["primary", "side", "readout", "dock", "rail", "full"]
PanelAspect = Literal["wide", "tall", "square", "flex"]
LayoutSizing = Literal["fill", "content"]


def _coerce_hint(value: str | Hint | None) -> Hint | None:
    """Normalize the ``hint=`` kwarg.

    Pydantic only validates at construction, and every widget function assigns
    ``hint`` after the fact, so a bare string has to be lifted into a ``Hint``
    here or it would serialize as a raw string and break the contract.
    """
    if isinstance(value, str):
        return Hint(text=value)
    return value


def _get_or_init_ctx() -> _LCARSContext:
    return get_ctx()


def _require_builder(ctx: _LCARSContext) -> _ManifestBuilder:
    """Return the active declarative builder or raise a clear lifecycle error."""
    if ctx.builder is None:
        raise RuntimeError(
            "lcars widget functions must be called inside a function decorated "
            "with @app.page(...)."
        )
    return ctx.builder


def _resolve_id(label: str, explicit_id: str | None) -> str:
    ctx = _get_or_init_ctx()
    if explicit_id is not None:
        if explicit_id in ctx.registered_ids:
            raise ValueError(
                f"Duplicate widget id {explicit_id!r}. "
                "Each widget must have a unique id within a single ui_fn call."
            )
        ctx.registered_ids.add(explicit_id)
        return explicit_id
    return auto_id(label, ctx.registered_ids)


def _add_text(
    content: str,
    *,
    size: Literal["display", "h1", "h2", "body", "label", "micro", "mono"] = "body",
    align: Literal["start", "center", "end"] = "start",
    color: str | None = None,
    id: str | None = None,
    options: TextOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> Text:
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(content[:30], id)
    builder = _require_builder(ctx)
    widget = Text(
        id=widget_id,
        content=content,
        size=size,
        align=align,
        color=color,
        options=options,
        visible=visible,
    )
    widget.zone = zone
    widget.hint = _coerce_hint(hint)
    widget.span = span
    widget.weight = weight
    widget.aspect = aspect
    widget.group = group
    builder.add_widget(widget)
    return widget
