"""Surface composition DSL implementation."""

from __future__ import annotations

import math
from collections.abc import Generator
from contextlib import contextmanager
from typing import Any, Literal

from lcars_ui.core.models import (
    ArcCommand,
    ArcNode,
    CapsuleNode,
    CircleNode,
    CloseCommand,
    ConnectorNode,
    EffectNode,
    ElbowNode,
    EllipseNode,
    LineCommand,
    MirrorSpec,
    MoveCommand,
    PathNode,
    PolygonNode,
    PolygonPoint,
    RectNode,
    RepeatLinearSpec,
    RepeatRadialSpec,
    RingNode,
    RoundedRectNode,
    SurfaceGroup,
    SurfaceRegion,
    TextPathNode,
    WedgeNode,
)
from lcars_ui.core.models import Surface as SurfaceWidget
from lcars_ui.core.widget_base import BaseWidget, Hint, LcarsColor
from lcars_ui.dsl._api_helpers import (
    LayoutSizing,
    PanelAspect,
    ZoneHint,
    _add_text,
    _coerce_hint,
    _get_or_init_ctx,
    _require_builder,
    _resolve_id,
)
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._surface_constraints import (
    EdgeAnchor,
    PendingConstraint,
    resolve_surface_constraints,
)

_PATH_RENDERING_TYPES = frozenset({"arc", "ring", "wedge", "elbow", "polygon", "path", "connector"})


def _find_surface_child_by_id(children: list[Any], target_id: str) -> Any | None:
    """Depth-first search a surface's already-declared children for a matching widget id.

    Surface geometry lives in one shared, absolute design-space coordinate system - unlike a
    DOM-based layout, there is no runtime layout pass to wait for, so a connector's endpoints can
    be resolved right here at BUILD time in Python rather than deferred to the renderer. This only
    finds widgets declared BEFORE the connector call (a forward reference to an id not yet
    declared will not resolve) - callers must declare endpoints before connecting them.
    """
    for child in children:
        if getattr(child, "id", None) == target_id:
            return child
        nested = getattr(child, "children", None)
        if nested:
            found = _find_surface_child_by_id(nested, target_id)
            if found is not None:
                return found
    return None


def _surface_anchor_of(node: Any) -> tuple[float, float]:
    """The (x, y) anchor point a connector should route to/from for a given surface node."""
    if hasattr(node, "center_x") and hasattr(node, "center_y"):
        return (node.center_x, node.center_y)
    if hasattr(node, "cx") and hasattr(node, "cy"):
        return (node.cx, node.cy)
    if hasattr(node, "x") and hasattr(node, "y") and hasattr(node, "w") and hasattr(node, "h"):
        return (node.x + node.w / 2, node.y + node.h / 2)
    points = getattr(node, "points", None)
    if points:
        xs = [p.x for p in points]
        ys = [p.y for p in points]
        return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    return (0.0, 0.0)


def edge_anchor(
    target: str,
    edge: Literal["left", "right", "top", "bottom"],
    *,
    offset: int = 0,
) -> EdgeAnchor:
    """Anchor a surface node's edge to another named surface node's edge.

    ``target`` is another surface node's id, or the string ``"parent"`` for the
    surface itself. Pass a plain int instead of this to any surface anchor_* kwarg
    as a shortcut for ``edge_anchor("parent", <that side>, offset=<the int>)``::

        surface.region("viewport", anchor_left=edge_anchor("rail-left", "right", offset=24), ...)
        surface.region("rail", anchor_left=20, ...)  # 20px in from the surface's own left edge
    """
    return EdgeAnchor(target, edge, offset=offset)


def _normalize_anchor(
    value: EdgeAnchor | int | None,
    edge: Literal["left", "right", "top", "bottom"],
) -> EdgeAnchor | None:
    """A plain int shortcut means "anchor to the surface itself, this many px in"."""
    if value is None or isinstance(value, EdgeAnchor):
        return value
    return EdgeAnchor("parent", edge, offset=value)


class _SurfaceContext:
    def __init__(self, builder: _ManifestBuilder, widget: SurfaceWidget) -> None:
        self._builder = builder
        self._widget = widget
        self._pending_constraints: list[PendingConstraint] = []
        self._overlap_check_regions: list[SurfaceRegion] = []

    def _register_constraints(
        self,
        node_id: str,
        node: Any,
        *,
        x: int | None,
        y: int | None,
        w: int | None,
        h: int | None,
        anchor_left: EdgeAnchor | int | None,
        anchor_right: EdgeAnchor | int | None,
        anchor_top: EdgeAnchor | int | None,
        anchor_bottom: EdgeAnchor | int | None,
        center_x: int | None,
        center_y: int | None,
        match_width_of: str | None,
        match_height_of: str | None,
    ) -> None:
        self._pending_constraints.append(
            PendingConstraint(
                node_id=node_id,
                node=node,
                abs_x=x, abs_y=y, abs_w=w, abs_h=h,
                left=_normalize_anchor(anchor_left, "left"),
                right=_normalize_anchor(anchor_right, "right"),
                top=_normalize_anchor(anchor_top, "top"),
                bottom=_normalize_anchor(anchor_bottom, "bottom"),
                center_x=center_x, center_y=center_y,
                match_width_of=match_width_of, match_height_of=match_height_of,
            )
        )

    def _apply_layout_hints(
        self,
        widget: BaseWidget,
        *,
        hint: str | Hint | None,
        zone: ZoneHint | None,
        span: tuple[int, int] | None,
        weight: int | None,
        aspect: PanelAspect | None,
        group: str | None,
        sizing: LayoutSizing | None,
        color: LcarsColor | None,
    ) -> None:
        widget.hint = _coerce_hint(hint)
        widget.zone = zone
        widget.span = span
        widget.weight = weight
        widget.aspect = aspect
        widget.group = group
        widget.sizing = sizing
        widget.color = color

    def rect(
        self,
        x: int | None = None,
        y: int | None = None,
        w: int | None = None,
        h: int | None = None,
        *,
        anchor_left: EdgeAnchor | int | None = None,
        anchor_right: EdgeAnchor | int | None = None,
        anchor_top: EdgeAnchor | int | None = None,
        anchor_bottom: EdgeAnchor | int | None = None,
        center_x: int | None = None,
        center_y: int | None = None,
        match_width_of: str | None = None,
        match_height_of: str | None = None,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id(f"rect-{x or 0}-{y or 0}", id)
        node = RectNode(
            id=node_id,
            x=x if x is not None else 0,
            y=y if y is not None else 0,
            w=w if w is not None else 1,
            h=h if h is not None else 1,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)
        self._register_constraints(
            node_id, node, x=x, y=y, w=w, h=h,
            anchor_left=anchor_left, anchor_right=anchor_right,
            anchor_top=anchor_top, anchor_bottom=anchor_bottom,
            center_x=center_x, center_y=center_y,
            match_width_of=match_width_of, match_height_of=match_height_of,
        )

    def rounded_rect(
        self,
        x: int | None = None,
        y: int | None = None,
        w: int | None = None,
        h: int | None = None,
        *,
        radius: int = 24,
        anchor_left: EdgeAnchor | int | None = None,
        anchor_right: EdgeAnchor | int | None = None,
        anchor_top: EdgeAnchor | int | None = None,
        anchor_bottom: EdgeAnchor | int | None = None,
        center_x: int | None = None,
        center_y: int | None = None,
        match_width_of: str | None = None,
        match_height_of: str | None = None,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id(f"rounded-rect-{x or 0}-{y or 0}", id)
        node = RoundedRectNode(
            id=node_id,
            x=x if x is not None else 0,
            y=y if y is not None else 0,
            w=w if w is not None else 1,
            h=h if h is not None else 1,
            radius=radius,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)
        self._register_constraints(
            node_id, node, x=x, y=y, w=w, h=h,
            anchor_left=anchor_left, anchor_right=anchor_right,
            anchor_top=anchor_top, anchor_bottom=anchor_bottom,
            center_x=center_x, center_y=center_y,
            match_width_of=match_width_of, match_height_of=match_height_of,
        )

    def capsule(
        self,
        x: int | None = None,
        y: int | None = None,
        w: int | None = None,
        h: int | None = None,
        *,
        anchor_left: EdgeAnchor | int | None = None,
        anchor_right: EdgeAnchor | int | None = None,
        anchor_top: EdgeAnchor | int | None = None,
        anchor_bottom: EdgeAnchor | int | None = None,
        center_x: int | None = None,
        center_y: int | None = None,
        match_width_of: str | None = None,
        match_height_of: str | None = None,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id(f"capsule-{x or 0}-{y or 0}", id)
        node = CapsuleNode(
            id=node_id,
            x=x if x is not None else 0,
            y=y if y is not None else 0,
            w=w if w is not None else 1,
            h=h if h is not None else 1,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)
        self._register_constraints(
            node_id, node, x=x, y=y, w=w, h=h,
            anchor_left=anchor_left, anchor_right=anchor_right,
            anchor_top=anchor_top, anchor_bottom=anchor_bottom,
            center_x=center_x, center_y=center_y,
            match_width_of=match_width_of, match_height_of=match_height_of,
        )

    def circle(
        self,
        cx: int,
        cy: int,
        r: int,
        *,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id(f"circle-{cx}-{cy}", id)
        node = CircleNode(
            id=node_id,
            cx=cx,
            cy=cy,
            r=r,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def ellipse(
        self,
        cx: int,
        cy: int,
        rx: int,
        ry: int,
        *,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id(f"ellipse-{cx}-{cy}", id)
        node = EllipseNode(
            id=node_id,
            cx=cx,
            cy=cy,
            rx=rx,
            ry=ry,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def arc(
        self,
        center_x: int,
        center_y: int,
        radius: int,
        start_angle: float,
        end_angle: float,
        *,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id(f"arc-{center_x}-{center_y}", id)
        node = ArcNode(
            id=node_id,
            center_x=center_x,
            center_y=center_y,
            radius=radius,
            start_angle=start_angle,
            end_angle=end_angle,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def ring(
        self,
        center_x: int,
        center_y: int,
        inner_radius: int,
        outer_radius: int,
        start_angle: float,
        end_angle: float,
        *,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id(f"ring-{center_x}-{center_y}", id)
        node = RingNode(
            id=node_id,
            center_x=center_x,
            center_y=center_y,
            inner_radius=inner_radius,
            outer_radius=outer_radius,
            start_angle=start_angle,
            end_angle=end_angle,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def wedge(
        self,
        center_x: int,
        center_y: int,
        inner_radius: int,
        outer_radius: int,
        start_angle: float,
        end_angle: float,
        *,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id(f"wedge-{center_x}-{center_y}", id)
        node = WedgeNode(
            id=node_id,
            center_x=center_x,
            center_y=center_y,
            inner_radius=inner_radius,
            outer_radius=outer_radius,
            start_angle=start_angle,
            end_angle=end_angle,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def elbow(
        self,
        x: int,
        y: int,
        w: int,
        h: int,
        arm_thickness_x: int,
        arm_thickness_y: int,
        corner: Literal["top-left", "top-right", "bottom-left", "bottom-right"],
        *,
        outer_radius: int = 24,
        inner_radius: int = 16,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id(f"elbow-{x}-{y}", id)
        node = ElbowNode(
            id=node_id,
            x=x,
            y=y,
            w=w,
            h=h,
            arm_thickness_x=arm_thickness_x,
            arm_thickness_y=arm_thickness_y,
            corner=corner,
            outer_radius=outer_radius,
            inner_radius=inner_radius,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def polygon(
        self,
        points: list[tuple[float, float]],
        *,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        first_x, first_y = points[0] if points else (0, 0)
        node_id = _resolve_id(f"polygon-{first_x}-{first_y}", id)
        node = PolygonNode(
            id=node_id,
            points=[PolygonPoint(x=px, y=py) for px, py in points],
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def path(
        self,
        commands: list[dict[str, Any]],
        *,
        filled: bool = True,
        layer: Literal["geometry", "content", "overlay", "effects"] = "geometry",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        node_id = _resolve_id("path", id)
        typed_commands: list[MoveCommand | LineCommand | ArcCommand | CloseCommand] = []
        for command in commands:
            op = command.get("op")
            if op == "move":
                typed_commands.append(MoveCommand(x=command["x"], y=command["y"]))
            elif op == "line":
                typed_commands.append(LineCommand(x=command["x"], y=command["y"]))
            elif op == "arc":
                typed_commands.append(
                    ArcCommand(
                        rx=command["rx"],
                        ry=command["ry"],
                        rotation=command.get("rotation", 0),
                        large_arc=command.get("large_arc", 0),
                        sweep=command.get("sweep", 1),
                        x=command["x"],
                        y=command["y"],
                    )
                )
            elif op == "close":
                typed_commands.append(CloseCommand())
            else:
                raise ValueError(f"Unknown path command op: {op!r}")
        node = PathNode(id=node_id, commands=typed_commands, filled=filled, layer=layer)
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def connector(
        self,
        from_: str,
        to: str,
        *,
        style: Literal["straight", "elbow", "bezier"] = "straight",
        layer: Literal["geometry", "content", "overlay", "effects"] = "overlay",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        from_node = _find_surface_child_by_id(self._widget.children, from_)
        if from_node is None:
            raise ValueError(
                f"lcars.surface().connector(from_={from_!r}, ...) references an unknown node id "
                "- declare it before the connector."
            )
        to_node = _find_surface_child_by_id(self._widget.children, to)
        if to_node is None:
            raise ValueError(
                f"lcars.surface().connector(..., to={to!r}) references an unknown node id "
                "- declare it before the connector."
            )
        from_x, from_y = _surface_anchor_of(from_node)
        to_x, to_y = _surface_anchor_of(to_node)
        node_id = _resolve_id(f"connector-{from_}-{to}", id)
        node = ConnectorNode(
            id=node_id,
            from_x=from_x,
            from_y=from_y,
            to_x=to_x,
            to_y=to_y,
            style=style,
            layer=layer,
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def text_path(
        self,
        path_ref: str,
        text: str,
        *,
        start_offset: float = 0.0,
        layer: Literal["geometry", "content", "overlay", "effects"] = "overlay",
        color: LcarsColor | None = None,
        id: str | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> None:
        path_node = _find_surface_child_by_id(self._widget.children, path_ref)
        if path_node is None:
            raise ValueError(
                f"lcars.surface().text_path(path_ref={path_ref!r}, ...) references an unknown "
                "node id - declare it before the text_path."
            )
        if path_node.type not in _PATH_RENDERING_TYPES:
            raise ValueError(
                f"lcars.surface().text_path(path_ref={path_ref!r}, ...) must reference a "
                f"path-rendering node ({sorted(_PATH_RENDERING_TYPES)}), not {path_node.type!r}."
            )
        node_id = _resolve_id(f"text-path-{path_ref}", id)
        node = TextPathNode(
            id=node_id, path_ref=path_ref, text=text, start_offset=start_offset, layer=layer
        )
        self._apply_layout_hints(
            node, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(node)

    def effect(
        self,
        target: str,
        kind: Literal["sweep", "pulse", "flow"],
        *,
        period_ms: int = 2000,
        direction: Literal["cw", "ccw"] = "cw",
        from_angle: float | None = None,
        to_angle: float | None = None,
        pivot: tuple[float, float] | None = None,
        colors: tuple[LcarsColor, LcarsColor] | None = None,
        id: str | None = None,
    ) -> None:
        """Attach a CSS animation to an already-declared surface node, by id.

        Carries no visual output of its own - the renderer resolves this into inline
        animation/CSS-custom-property styling on the TARGET element (see the
        ``lcars-surface-*`` keyframes in lcars.css). ``kind="sweep"`` rotates the target
        around ``pivot`` (defaulting to the target's own anchor point, the same one
        ``connector()`` resolves to) - continuously if ``from_angle``/``to_angle`` are omitted,
        oscillating between them otherwise. ``kind="pulse"`` pulses opacity, or fill color
        between ``colors`` if given. ``kind="flow"`` animates a dash-offset along a stroked
        path, so it only accepts a path-rendering target (arc/ring/wedge/elbow/polygon/path/
        connector) - the same restriction ``text_path()`` uses.
        """
        target_node = _find_surface_child_by_id(self._widget.children, target)
        if target_node is None:
            raise ValueError(
                f"lcars.surface().effect(target={target!r}, ...) references an unknown node id "
                "- declare it before the effect."
            )
        if kind == "flow" and target_node.type not in _PATH_RENDERING_TYPES:
            raise ValueError(
                f"lcars.surface().effect(target={target!r}, kind='flow') must target a "
                f"path-rendering node ({sorted(_PATH_RENDERING_TYPES)}), not {target_node.type!r}."
            )
        if pivot is not None:
            pivot_x, pivot_y = pivot
        else:
            pivot_x, pivot_y = _surface_anchor_of(target_node)
        node_id = _resolve_id(f"effect-{target}", id)
        node = EffectNode(
            id=node_id,
            target=target,
            kind=kind,
            period_ms=period_ms,
            direction=direction,
            from_angle=from_angle,
            to_angle=to_angle,
            pivot_x=pivot_x,
            pivot_y=pivot_y,
            colors=colors,
        )
        self._builder.add_widget(node)

    def ticks(
        self,
        center_x: float,
        center_y: float,
        radius: float,
        start_angle: float,
        end_angle: float,
        count: int,
        *,
        tick_length: float = 10,
        inward: bool = False,
        labels: list[str] | None = None,
        label_offset: float = 20,
        color: LcarsColor | None = None,
        id: str | None = None,
    ) -> None:
        """Repeat a short radial tick mark `count` times around an arc, with optional labels.

        A compositing helper, not a new geometry primitive - it just calls .path() (for the tick
        marks) and .region()+text() (for labels) in a loop, reusing what already exists rather
        than adding a new contract type for something that is really "call existing primitives
        evenly spaced around an arc."
        """
        if count < 2:
            raise ValueError("lcars.surface().ticks() requires count >= 2 (both endpoints).")
        if labels is not None and len(labels) != count:
            raise ValueError(
                f"lcars.surface().ticks() labels length ({len(labels)}) must equal count ({count})."
            )
        base_id = id or "ticks"
        span = end_angle - start_angle
        for i in range(count):
            angle = start_angle + span * i / (count - 1)
            rad = math.radians(angle)
            cos_a, sin_a = math.cos(rad), math.sin(rad)
            inner_r = radius - tick_length if inward else radius
            outer_r = radius if inward else radius + tick_length
            x1, y1 = center_x + inner_r * cos_a, center_y + inner_r * sin_a
            x2, y2 = center_x + outer_r * cos_a, center_y + outer_r * sin_a
            self.path(
                [
                    {"op": "move", "x": x1, "y": y1},
                    {"op": "line", "x": x2, "y": y2},
                ],
                filled=False,
                color=color,
                id=f"{base_id}-mark-{i}",
            )
            if labels:
                label_r = (
                    radius - tick_length - label_offset
                    if inward
                    else radius + tick_length + label_offset
                )
                lx = center_x + label_r * cos_a
                ly = center_y + label_r * sin_a
                with self.region(
                    f"{base_id}-label-{i}", x=round(lx - 20), y=round(ly - 10), w=40, h=20
                ):
                    _add_text(labels[i], size="micro", align="center")

    @contextmanager
    def region(
        self,
        area_id: str,
        *,
        x: int | None = None,
        y: int | None = None,
        w: int | None = None,
        h: int | None = None,
        anchor_left: EdgeAnchor | int | None = None,
        anchor_right: EdgeAnchor | int | None = None,
        anchor_top: EdgeAnchor | int | None = None,
        anchor_bottom: EdgeAnchor | int | None = None,
        center_x: int | None = None,
        center_y: int | None = None,
        match_width_of: str | None = None,
        match_height_of: str | None = None,
        layer: Literal["geometry", "content", "overlay", "effects"] = "content",
        color: LcarsColor | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> Generator[None, None, None]:
        with self._region(
            area_id, x=x, y=y, w=w, h=h,
            anchor_left=anchor_left, anchor_right=anchor_right,
            anchor_top=anchor_top, anchor_bottom=anchor_bottom,
            center_x=center_x, center_y=center_y,
            match_width_of=match_width_of, match_height_of=match_height_of,
            layer=layer, color=color, zone=zone,
            span=span, weight=weight, aspect=aspect, group=group, sizing=sizing,
            check_overlap=True,
        ):
            yield

    @contextmanager
    def _region(
        self,
        area_id: str,
        *,
        x: int | None = None,
        y: int | None = None,
        w: int | None = None,
        h: int | None = None,
        anchor_left: EdgeAnchor | int | None = None,
        anchor_right: EdgeAnchor | int | None = None,
        anchor_top: EdgeAnchor | int | None = None,
        anchor_bottom: EdgeAnchor | int | None = None,
        center_x: int | None = None,
        center_y: int | None = None,
        match_width_of: str | None = None,
        match_height_of: str | None = None,
        layer: Literal["geometry", "content", "overlay", "effects"] = "content",
        color: LcarsColor | None = None,
        zone: ZoneHint | None = None,
        span: tuple[int, int] | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
        check_overlap: bool = True,
    ) -> Generator[None, None, None]:
        region_id = _resolve_id(area_id, area_id)
        region = SurfaceRegion(
            id=region_id,
            x=x if x is not None else 0,
            y=y if y is not None else 0,
            w=w if w is not None else 1,
            h=h if h is not None else 1,
            layer=layer,
            children=[],
        )
        self._apply_layout_hints(
            region, hint=None, zone=zone, span=span, weight=weight,
            aspect=aspect, group=group, sizing=sizing, color=color,
        )
        self._builder.add_widget(region)
        self._register_constraints(
            region_id, region, x=x, y=y, w=w, h=h,
            anchor_left=anchor_left, anchor_right=anchor_right,
            anchor_top=anchor_top, anchor_bottom=anchor_bottom,
            center_x=center_x, center_y=center_y,
            match_width_of=match_width_of, match_height_of=match_height_of,
        )
        # Bounds may not be final yet if this region uses anchors - the overlap sweep runs
        # once, after every surface node has been resolved, on surface() exit (see below).
        if check_overlap:
            self._overlap_check_regions.append(region)
        with self._builder.container_context(region, target="children"):
            yield

    @contextmanager
    def group(
        self,
        *,
        mirror: Literal["x", "y", "xy"] | None = None,
        mirror_axis: tuple[float, float] | None = None,
        repeat_radial: dict[str, Any] | None = None,
        repeat_linear: dict[str, Any] | None = None,
        rotate: float | None = None,
        rotate_pivot: tuple[float, float] | None = None,
        id: str | None = None,
    ) -> Generator[_SurfaceContext, None, None]:
        """A transform wrapper (mirror/repeat/rotate) around nested surface geometry and regions.

        Transforms are resolved at RENDER time in the frontend, not here - this only validates
        and stores the spec, so the manifest stays compact regardless of repeat count (see
        ``surfaceTransforms.ts``). ``repeat_radial``/``repeat_linear`` take a plain dict
        (``{"count":, "center":(x,y), "start_angle":, "end_angle":}`` /
        ``{"count":, "dx":, "dy":}``) rather than a typed object - Pydantic validates the shape
        when the spec model is constructed below, so a malformed dict still fails loudly.

        Yields ``self`` - inside the block, call the same ``.rect()``/``.region()``/etc. methods
        used at the top level of a surface; they attach to the group instead via the same
        ``container_context`` nesting ``.region()`` already relies on.
        """
        modes_given = [m for m in (mirror, repeat_radial, repeat_linear) if m is not None]
        if len(modes_given) > 1:
            raise ValueError(
                "lcars.surface().group() accepts at most one of mirror/repeat_radial/repeat_linear."
            )

        mirror_spec = None
        if mirror is not None:
            axis_x, axis_y = mirror_axis if mirror_axis is not None else (None, None)
            mirror_spec = MirrorSpec(axis=mirror, axis_x=axis_x, axis_y=axis_y)

        radial_spec = None
        if repeat_radial is not None:
            center = repeat_radial.get("center", (0, 0))
            radial_spec = RepeatRadialSpec(
                count=repeat_radial["count"],
                center_x=center[0],
                center_y=center[1],
                start_angle=repeat_radial["start_angle"],
                end_angle=repeat_radial["end_angle"],
            )

        linear_spec = None
        if repeat_linear is not None:
            linear_spec = RepeatLinearSpec(
                count=repeat_linear["count"], dx=repeat_linear["dx"], dy=repeat_linear["dy"],
            )

        pivot_x, pivot_y = rotate_pivot if rotate_pivot is not None else (None, None)
        node_id = _resolve_id("group", id)
        group_widget = SurfaceGroup(
            id=node_id,
            mirror=mirror_spec,
            repeat_radial=radial_spec,
            repeat_linear=linear_spec,
            rotate=rotate,
            rotate_pivot_x=pivot_x,
            rotate_pivot_y=pivot_y,
            children=[],
        )
        self._builder.add_widget(group_widget)
        with self._builder.container_context(group_widget, target="children"):
            yield self

    def polar(
        self,
        *,
        center_x: int,
        center_y: int,
        inner_radius: int,
        outer_radius: int,
        start_angle: float,
        end_angle: float,
        tracks: int,
        gap_deg: float = 0.0,
        id: str = "polar",
    ) -> _PolarContext:
        """Divide an angular span into `tracks` equal angular slots, gap_deg apart.

        Returns a scope whose `.track(index, span=1)` yields a region-like context
        manager bound to that slot's bounding box - the same widget-hosting mechanism
        as `.region()`, just with the position computed from polar coordinates instead
        of given directly. The bounding box is computed from the track's four corner
        points (start/end angle x inner/outer radius); a track that spans across an
        axis-aligned compass point (0/90/180/270deg) will get a slightly loose
        (larger-than-necessary) bounding box there rather than a tight one - a known,
        acceptable simplification for now.
        """
        if tracks < 1:
            raise ValueError("lcars.surface().polar() requires tracks >= 1.")
        return _PolarContext(
            surface_context=self,
            polar_id=_resolve_id(id, id),
            center_x=center_x,
            center_y=center_y,
            inner_radius=inner_radius,
            outer_radius=outer_radius,
            start_angle=start_angle,
            end_angle=end_angle,
            tracks=tracks,
            gap_deg=gap_deg,
        )


def _polar_span(start_angle: float, end_angle: float) -> float:
    """Angular span swept clockwise from start to end, normalized to (0, 360]."""
    raw = end_angle - start_angle
    if raw == 0:
        return 0.0
    span = raw % 360
    if span <= 0:
        span += 360
    return span


def _polar_bounding_box(
    center_x: int,
    center_y: int,
    inner_radius: int,
    outer_radius: int,
    start_angle: float,
    end_angle: float,
) -> tuple[int, int, int, int]:
    """Axis-aligned bounding box (x, y, w, h) of a wedge, from its four corner points."""

    def point(angle: float, radius: int) -> tuple[float, float]:
        rad = math.radians(angle)
        return (center_x + radius * math.cos(rad), center_y + radius * math.sin(rad))

    corners = [
        point(start_angle, inner_radius),
        point(start_angle, outer_radius),
        point(end_angle, inner_radius),
        point(end_angle, outer_radius),
    ]
    xs = [p[0] for p in corners]
    ys = [p[1] for p in corners]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    return (round(x0), round(y0), max(1, round(x1 - x0)), max(1, round(y1 - y0)))


class _PolarContext:
    def __init__(
        self,
        *,
        surface_context: _SurfaceContext,
        polar_id: str,
        center_x: int,
        center_y: int,
        inner_radius: int,
        outer_radius: int,
        start_angle: float,
        end_angle: float,
        tracks: int,
        gap_deg: float,
    ) -> None:
        self._surface_context = surface_context
        self._polar_id = polar_id
        self._center_x = center_x
        self._center_y = center_y
        self._inner_radius = inner_radius
        self._outer_radius = outer_radius
        self._start_angle = start_angle
        self._tracks = tracks
        self._gap_deg = gap_deg
        self._total_span = _polar_span(start_angle, end_angle)
        self._per_track = (self._total_span - gap_deg * (tracks - 1)) / tracks

    def _track_angles(self, index: int, span: int) -> tuple[float, float]:
        track_start = self._start_angle + index * (self._per_track + self._gap_deg)
        track_end = track_start + self._per_track * span + self._gap_deg * (span - 1)
        return track_start, track_end

    @contextmanager
    def track(
        self,
        index: int,
        *,
        span: int = 1,
        id: str | None = None,
        layer: Literal["geometry", "content", "overlay", "effects"] = "content",
        color: LcarsColor | None = None,
        zone: ZoneHint | None = None,
        weight: int | None = None,
        aspect: PanelAspect | None = None,
        group: str | None = None,
        sizing: LayoutSizing | None = None,
    ) -> Generator[None, None, None]:
        if index < 0 or index + span > self._tracks:
            raise ValueError(
                f"Polar track index={index} span={span} exceeds the declared "
                f"{self._tracks} tracks."
            )
        track_start, track_end = self._track_angles(index, span)
        x, y, w, h = _polar_bounding_box(
            self._center_x, self._center_y, self._inner_radius, self._outer_radius,
            track_start, track_end,
        )
        area_id = id or f"{self._polar_id}-track-{index}"
        # check_overlap=False: track bounding boxes are a loose axis-aligned approximation
        # of the actual wedge shape (see _polar_bounding_box), so two tracks at different
        # radius bands (the common concentric-rings case) can have overlapping bounding
        # boxes without their actual wedges ever touching - a rectangle overlap check here
        # would false-positive on exactly the setups this is meant to support.
        with self._surface_context._region(
            area_id,
            x=x, y=y, w=w, h=h,
            layer=layer, color=color, zone=zone, weight=weight,
            aspect=aspect, group=group, sizing=sizing,
            check_overlap=False,
        ):
            yield


@contextmanager
def surface(
    *,
    design_size: tuple[int, int] = (1920, 1080),
    min_width: int = 960,
    narrow: Literal["scroll", "scale", "fluid"] = "scroll",
    narrow_design_size: tuple[int, int] | None = None,
    id: str = "surface",
) -> Generator[_SurfaceContext, None, None]:
    """Declare a Surface container for arbitrary-topology LCARS screens.

    ``design_size`` is the intended full-resolution viewport in pixels.
    ``min_width`` and ``narrow`` control behavior when the actual width drops below it.
    ``narrow="fluid"`` requires ``narrow_design_size``: every anchored node's bounds are
    resolved a second time against it, so fixed-width rails can stay fixed while an
    anchored center region reflows, instead of the whole surface being uniformly scaled
    down. Nodes positioned with plain absolute x/y/w/h (no anchors) do not reflow.
    """
    ctx = _get_or_init_ctx()
    if narrow == "fluid" and narrow_design_size is None:
        raise ValueError("lcars.surface(narrow='fluid') requires narrow_design_size.")
    width, height = design_size
    narrow_width, narrow_height = (
        narrow_design_size if narrow_design_size is not None else (None, None)
    )
    widget = SurfaceWidget(
        id=_resolve_id(id, id),
        design_width=width,
        design_height=height,
        min_width=min_width,
        narrow=narrow,
        narrow_design_width=narrow_width,
        narrow_design_height=narrow_height,
        children=[],
    )
    builder = _require_builder(ctx)
    builder.add_widget(widget)
    scope = _SurfaceContext(builder, widget)
    with builder.container_context(widget, target="children"):
        yield scope
    resolve_surface_constraints(width, height, scope._pending_constraints)
    if narrow_width is not None and narrow_height is not None:
        resolve_surface_constraints(
            narrow_width, narrow_height, scope._pending_constraints, attr_prefix="narrow_"
        )
    _check_region_overlaps(scope._overlap_check_regions)


def _check_region_overlaps(regions: list[SurfaceRegion]) -> None:
    """Pairwise overlap sweep, run once every region's bounds are fully resolved."""
    for i, a in enumerate(regions):
        for b in regions[i + 1 :]:
            if a.layer != b.layer:
                continue
            x_overlap = a.x < b.x + b.w and b.x < a.x + a.w
            y_overlap = a.y < b.y + b.h and b.y < a.y + a.h
            if x_overlap and y_overlap:
                raise ValueError(
                    f"Surface regions {a.id!r} and {b.id!r} overlap on layer {a.layer!r}."
                )
