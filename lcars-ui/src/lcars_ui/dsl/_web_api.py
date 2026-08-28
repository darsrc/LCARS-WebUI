"""Knowledge-graph semantic widgets DSL implementation."""

from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from typing import Any, Literal, cast

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
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.widgets.web import (
    AnchorCard,
    AnchorData,
    AssertionCard,
    AssertionData,
    CommitmentData,
    CommitmentSelector,
    ConstraintBand,
    ConstraintData,
    Frontier,
    FrontierData,
    FrontierEdge,
    GapData,
    GapPanel,
    SupportData,
    SupportPanel,
    TriState,
    TriStateData,
)


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


def _enclosing_web_panel(builder: _ManifestBuilder, widget_type: str) -> Any:
    for container, _target in reversed(builder._container_stack):
        if getattr(container, "type", None) == widget_type:
            return container
    helper = {
        "support_panel": "lcars.environments()/lcars.atom_legend()",
        "assertion_card": "lcars.context_tags()",
        "gap_panel": "lcars.contender_list()",
    }.get(widget_type, "semantic helper")
    raise ValueError(f"{helper} requires an enclosing lcars.{widget_type}() context.")


@contextmanager
def support_panel(
    title: str,
    *,
    node: str,
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
    """Compose alternative support environments for ``node``."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title, id)
    builder = _require_builder(ctx)
    widget = SupportPanel(
        id=widget_id,
        label=title,
        title=title,
        data=SupportData(node=node),
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


def environments(data: SupportData | dict[str, Any]) -> SupportPanel:
    """Populate the alternative environments of an enclosing support panel."""
    ctx = _get_or_init_ctx()
    builder = _require_builder(ctx)
    panel = _enclosing_web_panel(builder, "support_panel")
    parsed = data if isinstance(data, SupportData) else SupportData.model_validate(data)
    if parsed.node != panel.data.node:
        raise ValueError(
            f"support environment node {parsed.node!r} does not match panel node "
            f"{panel.data.node!r}"
        )
    panel.data = parsed
    return cast(SupportPanel, panel)


def atom_legend() -> SupportPanel:
    """Show the empirical/formal/assumption legend in a support panel."""
    ctx = _get_or_init_ctx()
    panel = _enclosing_web_panel(_require_builder(ctx), "support_panel")
    panel.show_atom_legend = True
    return cast(SupportPanel, panel)


def frontier(
    data: FrontierData | dict[str, Any],
    *,
    layer_filter: list[FrontierEdge] | None = None,
    id: str | None = None,
    color: str | None = "anakiwa",
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = "wide",
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Frontier:
    """Declare a one-hop traversal."""
    parsed = data if isinstance(data, FrontierData) else FrontierData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(f"frontier-{parsed.current.id}", id)
    widget = Frontier(
        id=widget_id,
        label=parsed.current.label,
        data=parsed,
        layer_filter=layer_filter,
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


@contextmanager
def assertion_card(
    data: AssertionData | dict[str, Any],
    *,
    id: str | None = None,
    color: str | None = "golden-tanoi",
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[AssertionCard, None, None]:
    """Compose the primary assertion view."""
    parsed = data if isinstance(data, AssertionData) else AssertionData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(parsed.id, id or parsed.id)
    builder = _require_builder(ctx)
    widget = AssertionCard(
        id=widget_id,
        label=parsed.gloss,
        data=parsed,
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


def context_tags() -> AssertionCard:
    """Render all context roles on the enclosing assertion card."""
    ctx = _get_or_init_ctx()
    card = _enclosing_web_panel(_require_builder(ctx), "assertion_card")
    card.show_context = True
    return cast(AssertionCard, card)


def anchor_card(
    data: AnchorData | dict[str, Any],
    *,
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
) -> AnchorCard:
    """Render an empirical or formal evidence anchor."""
    parsed = data if isinstance(data, AnchorData) else AnchorData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(parsed.id, id or parsed.id)
    widget = AnchorCard(
        id=widget_id,
        label=parsed.label,
        data=parsed,
        color=color or ("anakiwa" if parsed.type == "formal" else "golden-tanoi"),
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
    widget_id = _resolve_id(f"{parsed.query}-{parsed.subject}", id)
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


def constraint_band(
    data: ConstraintData | dict[str, Any],
    *,
    id: str | None = None,
    color: str | None = "hopbush",
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = "wide",
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> ConstraintBand:
    """Render an interval constraint, or an explicit unrendered representation."""
    parsed = data if isinstance(data, ConstraintData) else ConstraintData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(f"constraint-{parsed.quantity.id}", id)
    widget = ConstraintBand(
        id=widget_id,
        label=parsed.quantity.label,
        data=parsed,
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


@contextmanager
def gap_panel(
    data: GapData | dict[str, Any],
    *,
    id: str | None = None,
    color: str | None = "lilac",
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[GapPanel, None, None]:
    """Compose a missing explanatory bridge and its contenders."""
    parsed = data if isinstance(data, GapData) else GapData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(parsed.id, id or parsed.id)
    builder = _require_builder(ctx)
    widget = GapPanel(
        id=widget_id,
        label=f"{parsed.type} gap",
        data=parsed,
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


def contender_list() -> GapPanel:
    """Render contenders, including the valid empty state, on a gap panel."""
    ctx = _get_or_init_ctx()
    panel = _enclosing_web_panel(_require_builder(ctx), "gap_panel")
    panel.show_contenders = True
    return cast(GapPanel, panel)


def commitment_selector(
    data: CommitmentData | dict[str, Any],
    *,
    id: str | None = None,
    color: str | None = "atomic-tangerine",
    hint: str | Hint | None = None,
    zone: ZoneHint | None = "dock",
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> CommitmentSelector:
    """Declare commitment choices."""
    parsed = data if isinstance(data, CommitmentData) else CommitmentData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id("commitment-selector", id)
    widget = CommitmentSelector(
        id=widget_id,
        label="Commitment set",
        data=parsed,
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
