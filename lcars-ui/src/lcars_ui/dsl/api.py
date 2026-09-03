"""Public flat ``lcars.*`` declarations and effect functions."""

from __future__ import annotations

import json
import warnings
from collections.abc import Callable, Generator
from contextlib import AbstractContextManager, contextmanager
from typing import Any, Literal, TypeVar, overload

from pydantic import BaseModel

from lcars_ui.application import _get_context_app, get_default_app
from lcars_ui.core.models import (
    KeyBinding,
    SidebarSegment,
)
from lcars_ui.core.widget_base import Hint, HintPlacement, HintTrigger
from lcars_ui.dsl._adapters import (
    _to_chart_markers,
    _to_ohlc_data,
    _to_renko_bricks,
    _to_series_and_labels,
    _to_table_data,
)
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
from lcars_ui.dsl._model_form import (
    EMPTY_CHOICE_TOKEN,
    ChoicePlan,
    FieldPlan,
    ModelFormBinding,
    ModelFormField,
    choice_token,
    plan_model_form,
)
from lcars_ui.dsl._recipes import (
    make_console_sweep,
    make_control_panel_box,
    make_data_panel_box,
    make_diagnostic_box,
    make_padd_sweep,
)
from lcars_ui.dsl._state import (
    _Config,
    _LCARSContext,
    auto_id,
)
from lcars_ui.dsl._surface_api import edge_anchor as edge_anchor
from lcars_ui.dsl._surface_api import surface as surface
from lcars_ui.dsl._web_api import support_panel as support_panel
from lcars_ui.dsl._web_api import tri_state as tri_state
from lcars_ui.server.events import (
    Audience,
    Envelope,
    LogChunkPayload,
    ManifestUpdatePayload,
    NotificationPayload,
    WidgetUpdatePayload,
    make_envelope,
)
from lcars_ui.widgets.containers import (
    AuthoredComposition,
    CompositionArea,
    LcarsBar,
    LcarsBox,
    LcarsBracket,
    LcarsHeader,
    LcarsSweep,
    Popup,
)
from lcars_ui.widgets.data import Candlestick, Gauge, LineChart, Renko, Shader, Sparkline, Table
from lcars_ui.widgets.graph import (
    GraphDocument,
    GraphExecutionState,
    NodeCanvas,
    NodeCanvasOptions,
    NodeCanvasState,
)
from lcars_ui.widgets.inputs import (
    AtomGlyph,
    Button,
    Checkbox,
    FileUpload,
    Form,
    NumberInput,
    Radio,
    RadioToggle,
    Select,
    SelectOption,
    TextInput,
    Toggle,
)
from lcars_ui.widgets.media import LogViewer, MicButton, ThreeScene, VideoHls
from lcars_ui.widgets.options import (
    ActionSpec,
    AlertOptions,
    AlertState,
    ButtonOptions,
    ChartOptions,
    ChartState,
    ChoiceOptions,
    ContainerOptions,
    ContainerState,
    FinancialChartOptions,
    FormOptions,
    HeaderOptions,
    InteractionOptions,
    LogOptions,
    LogState,
    MarkdownOptions,
    MeterOptions,
    MetricOptions,
    MicOptions,
    NumberInputOptions,
    ShaderOptions,
    SparklineOptions,
    TableOptions,
    TableState,
    TextInputOptions,
    TextOptions,
    ThreeSceneOptions,
    ThreeSceneState,
    ToggleOptions,
    ValidationOptions,
    VideoOptions,
    VideoState,
)
from lcars_ui.widgets.primitives import Alert, Markdown, ProgressBar, StatusTile, Text
from lcars_ui.widgets.workspace import GraphWorkspace, GraphWorkspaceOptions, GraphWorkspaceState
from lcars_ui.workspace import GraphWorkspaceDocument

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Registry for @lcars.live decorated functions
_live_fn: Callable[[], None] | None = None
_live_interval: float = 5.0
_STRICT_COLUMN_MIN_WIDTH = 48
_STRICT_COLUMN_MAX_WIDTH = 150
_StateModel = TypeVar("_StateModel", bound=BaseModel)


def _server_interaction_state(
    *,
    ctx: _LCARSContext,
    widget_id: str,
    interaction: InteractionOptions | None,
    default: _StateModel,
    emit: bool = False,
) -> None:
    """Register per-session state handling for an opt-in server interaction.

    ``emit`` lets a client-side widget (which performs its own data operations)
    still receive typed state-change actions from the renderer, so Python can
    react to selection/expansion without owning sort/filter/pagination. State is
    persisted when the action arrives; no page function is re-executed.
    """
    server = interaction is not None and interaction.mode == "server"
    if not server and not emit:
        return
    action_id = (interaction.action_id if interaction is not None else None) or widget_id
    _get_context_app().register_widget_state(
        action_id=action_id,
        widget_id=widget_id,
        default=default,
    )


def _normalize_choice_options(
    values: list[str | SelectOption | dict[str, Any]],
) -> list[SelectOption]:
    normalized: list[SelectOption] = []
    for value in values:
        if isinstance(value, SelectOption):
            normalized.append(value)
        elif isinstance(value, str):
            normalized.append(SelectOption(label=value, value=value))
        elif isinstance(value, dict):
            normalized.append(SelectOption.model_validate(value))
        else:
            raise TypeError(
                "choice options must be strings, SelectOption instances, or option dictionaries"
            )
    return normalized


def _register_container_interaction_state(
    *,
    ctx: _LCARSContext,
    widget_id: str,
    options: ContainerOptions | None,
) -> None:
    default = ContainerState(collapsed=options.initial_collapsed if options is not None else False)
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=options.interaction if options is not None else None,
        default=default,
    )


def _warn_strict_page_level_layout(
    *,
    ctx: _LCARSContext,
    builder: _ManifestBuilder,
    primitive: str,
) -> None:
    if ctx.config.visual_language != "strict":
        return
    if not builder.is_page_level_grid_scope():
        return
    warnings.warn(
        (
            f"lcars.{primitive}() used at page level in strict mode. "
            "Consider lcars.console(), lcars.box(), or lcars.sweep() for LCARS-native layout."
        ),
        UserWarning,
        stacklevel=3,
    )


def _constrain_strict_column_width(width_px: int, *, field: str) -> int:
    if width_px < _STRICT_COLUMN_MIN_WIDTH:
        warnings.warn(
            (
                f"{field}={width_px} is below strict minimum {_STRICT_COLUMN_MIN_WIDTH}px; "
                f"clamping to {_STRICT_COLUMN_MIN_WIDTH}px."
            ),
            UserWarning,
            stacklevel=3,
        )
        return _STRICT_COLUMN_MIN_WIDTH
    if width_px > _STRICT_COLUMN_MAX_WIDTH:
        warnings.warn(
            (
                f"{field}={width_px} exceeds strict maximum {_STRICT_COLUMN_MAX_WIDTH}px; "
                f"clamping to {_STRICT_COLUMN_MAX_WIDTH}px."
            ),
            UserWarning,
            stacklevel=3,
        )
        return _STRICT_COLUMN_MAX_WIDTH
    return width_px


def _validate_css_track(value: str, *, field: str) -> str:
    """Accept declarative CSS sizing expressions without admitting declarations."""
    if not value.strip() or any(token in value for token in (";", "{", "}", "url(")):
        raise ValueError(f"Invalid authored composition {field}: {value!r}")
    return value.strip()


def px(value: int | float) -> str:
    """Return a validated fixed-size authored-composition track."""
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
        raise ValueError("lcars.px() requires a non-negative number.")
    return f"{value:g}px"


def fr(value: int | float = 1) -> str:
    """Return a validated fractional authored-composition track."""
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
        raise ValueError("lcars.fr() requires a positive number.")
    return f"{value:g}fr"


def auto() -> str:
    """Return an intrinsic authored-composition track."""
    return "auto"


def minmax(minimum: str, maximum: str) -> str:
    """Return a validated ``minmax()`` authored-composition track."""
    low = _validate_css_track(minimum, field="minmax minimum")
    high = _validate_css_track(maximum, field="minmax maximum")
    return f"minmax({low}, {high})"


# ---------------------------------------------------------------------------
# Application configuration
# ---------------------------------------------------------------------------


def config(
    name: str,
    *,
    theme: str = "galaxy",
    subtitle: str | None = None,
    header_color: str = "orange",
    sound_enabled: bool = True,
    lang: str = "en-US",
    force_uppercase: bool = True,
    label_uppercase: bool = True,
    lcars_font_headers: bool = True,
    lcars_font_labels: bool = True,
    lcars_font_text: bool = False,
    key_bindings: list[KeyBinding] | None = None,
    settings_page: bool = True,
    visual_language: Literal["strict"] = "strict",
    strict_renderer: Literal["legacy"] = "legacy",
) -> None:
    """Set one-time app-level configuration (call from inside or outside ui_fn)."""
    ctx = _get_or_init_ctx()
    ctx.config = _Config(
        name=name,
        theme=theme,
        subtitle=subtitle,
        header_color=header_color,
        sound_enabled=sound_enabled,
        lang=lang,
        force_uppercase=force_uppercase,
        label_uppercase=label_uppercase,
        lcars_font_headers=lcars_font_headers,
        lcars_font_labels=lcars_font_labels,
        lcars_font_text=lcars_font_text,
        key_bindings=list(key_bindings or []),
        settings_page=settings_page,
        visual_language=visual_language,
        strict_renderer=strict_renderer,
    )


# ---------------------------------------------------------------------------
# live decorator
# ---------------------------------------------------------------------------


def live(interval: float = 5.0) -> Callable[[Callable[[], None]], Callable[[], None]]:
    """Decorator: call the decorated function every *interval* seconds (live polling).

    Only one ``@lcars.live`` decorator is supported per application. Applying it
    a second time raises ``RuntimeError``.
    """

    def decorator(fn: Callable[[], None]) -> Callable[[], None]:
        global _live_fn, _live_interval  # noqa: PLW0603
        if _live_fn is not None:
            raise RuntimeError(
                "Only one @lcars.live decorator is supported per application. "
                f"Already registered: {_live_fn.__name__!r}."
            )
        _live_fn = fn
        _live_interval = interval
        get_default_app().register_live(fn, interval, "all")
        return fn

    return decorator


# ---------------------------------------------------------------------------
# Navigation / pages / layout
# ---------------------------------------------------------------------------


def nav(
    label: str,
    *,
    page: str | None = None,
    color: str | None = None,
    segments: list[dict[str, str | None]] | None = None,
) -> None:
    """Add a sidebar navigation item."""
    ctx = _get_or_init_ctx()
    builder = _require_builder(ctx)
    target = page or auto_id(label, ctx.registered_ids)
    item_id = f"nav-{target}"
    parsed_segments = None
    if segments is not None:
        parsed_segments = []
        for entry in segments:
            raw_label = entry.get("label")
            raw_color = entry.get("color")
            segment_label = raw_label if isinstance(raw_label, str) else None
            segment_color = raw_color if isinstance(raw_color, str) else "orange"
            parsed_segments.append(
                SidebarSegment(
                    label=segment_label,
                    color=segment_color,
                )
            )
    builder.add_sidebar_item(
        item_id=item_id,
        label=label,
        target_page=target,
        color=color,
        segments=parsed_segments,
    )


@contextmanager
def page(
    title: str,
    *,
    id: str | None = None,
    layout: Literal["auto", "console", "telemetry", "grid", "menu", "authored"] = "auto",
    chrome: Literal["console", "none"] = "console",
    fillers: bool = True,
    sizing: LayoutSizing = "fill",
) -> Generator[None, None, None]:
    """Context manager: declare a named page.

    ``layout`` selects the adaptive LCARS archetype: ``auto`` lets the renderer
    choose by content, or pin ``console`` / ``telemetry`` / ``grid`` / ``menu``.

    ``fillers`` decorates the leftover cells of the adaptive layout with LCARS
    reference blocks. Set it False on dense pages where that competes with data.

    ``sizing`` defaults top-level panels to filling the usable deck. Set
    ``"content"`` for the earlier intrinsic-size treatment.
    """
    ctx = _get_or_init_ctx()
    builder = _require_builder(ctx)
    page_id = id or auto_id(title, ctx.registered_ids)
    with builder.page_context(
        title,
        page_id,
        archetype=layout,
        chrome=chrome,
        fillers=fillers,
        sizing=sizing,
    ):
        yield


def columns(widths: list[str]) -> list[Any]:
    """Declare a multi-column layout row; returns list of context managers."""
    ctx = _get_or_init_ctx()
    return _require_builder(ctx).add_columns(widths)


@contextmanager
def row(*, height: str = "auto") -> Generator[None, None, None]:
    """Context manager: start a row block that contains one or more cols."""
    ctx = _get_or_init_ctx()
    builder = _require_builder(ctx)
    _warn_strict_page_level_layout(ctx=ctx, builder=builder, primitive="row")
    with builder.row_context(height=height):
        yield


@contextmanager
def col(width: str = "1fr") -> Generator[None, None, None]:
    """Context manager: start a column block inside a row."""
    ctx = _get_or_init_ctx()
    builder = _require_builder(ctx)
    _warn_strict_page_level_layout(ctx=ctx, builder=builder, primitive="col")
    with builder.col_context(width=width):
        yield


@contextmanager
def section(label: str, *, color: str | None = None) -> Generator[None, None, None]:
    """Visual grouping helper with a heading and nested body widgets."""
    header(label, size="h2", color=color)
    yield


class _LcarsBoxContext:
    def __init__(
        self,
        builder: _ManifestBuilder,
        widget: LcarsBox,
    ) -> None:
        self._builder = builder
        self.widget = widget

    @contextmanager
    def left_inputs(self) -> Generator[None, None, None]:
        with self._builder.container_context(self.widget, target="left_inputs"):
            yield

    @contextmanager
    def right_inputs(self) -> Generator[None, None, None]:
        with self._builder.container_context(self.widget, target="right_inputs"):
            yield

    @contextmanager
    def main(self) -> Generator[None, None, None]:
        with self._builder.container_context(self.widget, target="main_children"):
            yield

    @contextmanager
    def side(self) -> Generator[None, None, None]:
        with self._builder.container_context(self.widget, target="side_children"):
            yield


class _LcarsSweepContext:
    def __init__(
        self,
        builder: _ManifestBuilder,
        widget: LcarsSweep,
    ) -> None:
        self._builder = builder
        self.widget = widget

    @contextmanager
    def header(self) -> Generator[None, None, None]:
        with self._builder.container_context(self.widget, target="header_children"):
            yield

    @contextmanager
    def column_inputs(self) -> Generator[None, None, None]:
        with self._builder.container_context(self.widget, target="column_inputs"):
            yield

    @contextmanager
    def left(self) -> Generator[None, None, None]:
        with self._builder.container_context(self.widget, target="left_children"):
            yield

    @contextmanager
    def right(self) -> Generator[None, None, None]:
        with self._builder.container_context(self.widget, target="right_children"):
            yield


class _AuthoredCompositionContext:
    def __init__(self, builder: _ManifestBuilder, widget: AuthoredComposition) -> None:
        self._builder = builder
        self._widget = widget

    @contextmanager
    def area(
        self,
        area_id: str,
        *,
        row: int,
        column: int,
        row_span: int = 1,
        column_span: int = 1,
        align: Literal["start", "center", "end", "stretch"] = "stretch",
        justify: Literal["start", "center", "end", "stretch"] = "stretch",
        layer: int = 0,
        decorative: bool = False,
    ) -> Generator[None, None, None]:
        area_widget = CompositionArea(
            id=_resolve_id(area_id, area_id),
            row=row,
            column=column,
            row_span=row_span,
            column_span=column_span,
            align=align,
            justify=justify,
            layer=layer,
            decorative=decorative,
            children=[],
        )
        if row + row_span - 1 > len(self._widget.rows):
            raise ValueError(f"Composition area {area_id!r} exceeds the declared row tracks.")
        if column + column_span - 1 > len(self._widget.columns):
            raise ValueError(f"Composition area {area_id!r} exceeds the declared column tracks.")
        for existing in self._widget.children:
            rows_overlap = row < existing.row + existing.row_span and existing.row < row + row_span
            cols_overlap = (
                column < existing.column + existing.column_span
                and existing.column < column + column_span
            )
            if rows_overlap and cols_overlap and layer == existing.layer:
                raise ValueError(
                    f"Composition areas {existing.id!r} and {area_id!r} overlap on layer {layer}."
                )
        self._widget.children.append(area_widget)
        with self._builder.container_context(area_widget, target="children"):
            yield


@contextmanager
def composition(
    *,
    columns: list[str],
    rows: list[str],
    design_size: tuple[int, int] = (1920, 1080),
    min_width: int = 960,
    narrow: Literal["scroll", "scale", "adaptive"] = "scroll",
    column_gap: str = "0px",
    row_gap: str = "0px",
    id: str = "authored-composition",
) -> Generator[_AuthoredCompositionContext, None, None]:
    """Declare an explicit, topology-preserving CSS Grid composition."""
    ctx = _get_or_init_ctx()
    if not columns or not rows:
        raise ValueError("lcars.composition() requires at least one row and one column track.")
    width, height = design_size
    widget = AuthoredComposition(
        id=_resolve_id(id, id),
        columns=[_validate_css_track(track, field="column track") for track in columns],
        rows=[_validate_css_track(track, field="row track") for track in rows],
        column_gap=_validate_css_track(column_gap, field="column_gap"),
        row_gap=_validate_css_track(row_gap, field="row_gap"),
        design_width=width,
        design_height=height,
        min_width=min_width,
        narrow=narrow,
        children=[],
    )
    builder = _require_builder(ctx)
    builder.add_widget(widget)
    scope = _AuthoredCompositionContext(builder, widget)
    yield scope


@contextmanager
def hint(
    target: str | None = None,
    *,
    text: str | None = None,
    title: str | None = None,
    trigger: HintTrigger | list[HintTrigger] | None = None,
    placement: HintPlacement = "auto",
    delay_ms: int = 250,
    hide_delay_ms: int = 120,
    max_width: int | None = None,
    dismissible: bool = True,
) -> Generator[Hint | None, None, None]:
    """Context manager: attach a floating hint body to an already-declared widget.

    Widgets declared inside the block become the hint's content, so a hint can
    hold anything the page can — text, a chart, a video::

        lcars.button("Engage", id="engage", hint="Initiates warp drive")

        with lcars.hint("engage", trigger="click", placement="right"):
            lcars.text("Warp core status")
            lcars.video_hls(src="/media/core.m3u8")

    ``target`` names the widget to attach to and defaults to the most recently
    declared widget. The block must come *after* its target.
    """
    ctx = _get_or_init_ctx()
    builder = _require_builder(ctx)
    if target is None:
        widget = builder._last_widget
        if widget is None:
            raise ValueError(
                "lcars.hint() with no target must follow a widget declaration. "
                "Declare a widget first, or pass the target widget id."
            )
    else:
        widget = builder.find_widget(target)
        if widget is None:
            raise ValueError(
                f"lcars.hint() target {target!r} has not been declared. "
                "Declare the widget first, then attach its hint."
            )

    # Reuse a hint already supplied via `hint=` so the shorthand text survives.
    existing = widget.hint if isinstance(widget.hint, Hint) else _coerce_hint(widget.hint)
    hint_widget = existing or Hint()
    if text is not None:
        hint_widget.text = text
    if title is not None:
        hint_widget.title = title
    if trigger is not None:
        hint_widget.trigger = [trigger] if isinstance(trigger, str) else list(trigger)
    hint_widget.placement = placement
    hint_widget.delay_ms = delay_ms
    hint_widget.hide_delay_ms = hide_delay_ms
    hint_widget.max_width = max_width
    hint_widget.dismissible = dismissible
    widget.hint = hint_widget

    with builder.container_context(hint_widget, target="children"):
        yield hint_widget


@contextmanager
def box(
    title: str | None = None,
    *,
    subtitle: str | None = None,
    corners: list[int] | None = None,
    sides: list[int] | None = None,
    color: str = "orange",
    corner_colors: list[str] | None = None,
    side_colors: list[str] | None = None,
    title_color: str | None = None,
    subtitle_color: str | None = None,
    width_left: int = 150,
    width_right: int = 150,
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    options: ContainerOptions | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[_LcarsBoxContext, None, None]:
    """Context manager: compose an lcars_box container."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "box", id)
    _register_container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)

    builder = _require_builder(ctx)
    constrained_width_left = _constrain_strict_column_width(width_left, field="width_left")
    constrained_width_right = _constrain_strict_column_width(width_right, field="width_right")
    box_widget = LcarsBox(
        id=widget_id,
        label=title,
        title=title,
        subtitle=subtitle,
        corners=corners if corners is not None else [1, 2, 3, 4],
        sides=sides if sides is not None else [1, 2, 3, 4],
        color=color,
        corner_colors=corner_colors,
        side_colors=side_colors,
        title_color=title_color,
        subtitle_color=subtitle_color,
        width_left=constrained_width_left,
        width_right=constrained_width_right,
        left_inputs=[],
        right_inputs=[],
        main_children=[],
        side_children=[],
        children=[],
        options=options,
        disabled=disabled,
        visible=visible,
    )
    box_widget.zone = zone
    box_widget.hint = _coerce_hint(hint)
    box_widget.span = span
    box_widget.weight = weight
    box_widget.aspect = aspect
    box_widget.group = group
    box_widget.sizing = sizing
    builder.add_widget(box_widget)
    scope = _LcarsBoxContext(builder, box_widget)
    with builder.container_context(box_widget, target="children"):
        yield scope


@contextmanager
def sweep(
    title: str | None = None,
    *,
    subtitle: str | None = None,
    color: str = "orange",
    reverse: bool = False,
    width_sidebar: int = 150,
    left_width: float = 0.62,
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    options: ContainerOptions | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[_LcarsSweepContext, None, None]:
    """Context manager: compose an lcars_sweep container."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "sweep", id)
    _register_container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)

    builder = _require_builder(ctx)
    constrained_sidebar = _constrain_strict_column_width(width_sidebar, field="width_sidebar")
    sweep_widget = LcarsSweep(
        id=widget_id,
        label=title,
        title=title,
        subtitle=subtitle,
        color=color,
        reverse=reverse,
        width_sidebar=constrained_sidebar,
        left_width=left_width,
        header_children=[],
        column_inputs=[],
        left_children=[],
        right_children=[],
        rail_children=[],
        content_children=[],
        children=[],
        options=options,
        disabled=disabled,
        visible=visible,
    )
    sweep_widget.zone = zone
    sweep_widget.hint = _coerce_hint(hint)
    sweep_widget.span = span
    sweep_widget.weight = weight
    sweep_widget.aspect = aspect
    sweep_widget.group = group
    sweep_widget.sizing = sizing
    builder.add_widget(sweep_widget)
    scope = _LcarsSweepContext(builder, sweep_widget)
    with builder.container_context(sweep_widget, target="children"):
        yield scope


@contextmanager
def bracket(
    *,
    color: str = "orange",
    orientation: Literal["left", "right", "both"] = "both",
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    options: ContainerOptions | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[LcarsBracket, None, None]:
    """Context manager: compose an lcars_bracket container."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id("bracket", id)
    _register_container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)

    builder = _require_builder(ctx)
    bracket_widget = LcarsBracket(
        id=widget_id,
        color=color,
        orientation=orientation,
        children=[],
        options=options,
        disabled=disabled,
        visible=visible,
    )
    bracket_widget.zone = zone
    bracket_widget.hint = _coerce_hint(hint)
    bracket_widget.span = span
    bracket_widget.weight = weight
    bracket_widget.aspect = aspect
    bracket_widget.group = group
    bracket_widget.sizing = sizing
    builder.add_widget(bracket_widget)
    with builder.container_context(bracket_widget, target="children"):
        yield bracket_widget


@contextmanager
def popup(
    title: str,
    *,
    open: bool = True,
    modal: bool = True,
    dismissible: bool = True,
    draggable: bool = True,
    resizable: bool = True,
    width: int = 560,
    height: int = 360,
    position: tuple[int, int] | None = None,
    close_action_id: str | None = None,
    color: str = "orange",
    id: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[Popup, None, None]:
    """Context manager: declare a movable window above the page deck.

    Popups are overlay widgets, so they never consume a mosaic cell. Their
    position and size are local UI state; ``lcars.update(id, open=...)`` remains
    the server control for opening or closing them.
    """

    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "popup", id)
    builder = _require_builder(ctx)
    popup_widget = Popup(
        id=widget_id,
        label=title,
        title=title,
        children=[],
        open=open,
        modal=modal,
        dismissible=dismissible,
        draggable=draggable,
        resizable=resizable,
        width=width,
        height=height,
        position=position,
        close_action_id=close_action_id,
        color=color,
        disabled=disabled,
        visible=visible,
    )
    builder.add_widget(popup_widget)
    with builder.container_context(popup_widget, target="children"):
        yield popup_widget


@contextmanager
def console(
    title: str,
    *,
    color: str = "orange",
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    options: ContainerOptions | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[_LcarsSweepContext, None, None]:
    """Phase 13 layout recipe: sweep-led console composition."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "console", id)
    _register_container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)

    builder = _require_builder(ctx)
    sweep_widget = make_console_sweep(widget_id=widget_id, title=title, color=color)
    sweep_widget.zone = zone
    sweep_widget.hint = _coerce_hint(hint)
    sweep_widget.span = span
    sweep_widget.weight = weight
    sweep_widget.aspect = aspect
    sweep_widget.group = group
    sweep_widget.sizing = sizing
    sweep_widget.options = options
    sweep_widget.disabled = disabled
    sweep_widget.visible = visible
    builder.add_widget(sweep_widget)
    scope = _LcarsSweepContext(builder, sweep_widget)
    with builder.container_context(sweep_widget, target="children"):
        yield scope


@contextmanager
def padd(
    title: str,
    *,
    color: str = "orange",
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    options: ContainerOptions | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[_LcarsSweepContext, None, None]:
    """Phase 13 layout recipe: dense single-column PADD sweep."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "padd", id)
    _register_container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)

    builder = _require_builder(ctx)
    sweep_widget = make_padd_sweep(widget_id=widget_id, title=title, color=color)
    sweep_widget.zone = zone
    sweep_widget.hint = _coerce_hint(hint)
    sweep_widget.span = span
    sweep_widget.weight = weight
    sweep_widget.aspect = aspect
    sweep_widget.group = group
    sweep_widget.sizing = sizing
    sweep_widget.options = options
    sweep_widget.disabled = disabled
    sweep_widget.visible = visible
    builder.add_widget(sweep_widget)
    scope = _LcarsSweepContext(builder, sweep_widget)
    with builder.container_context(sweep_widget, target="children"):
        yield scope


@contextmanager
def diagnostic(
    title: str,
    *,
    color: str = "blue",
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    options: ContainerOptions | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[_LcarsBoxContext, None, None]:
    """Phase 13 layout recipe: full-frame diagnostic container."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "diagnostic", id)
    _register_container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)

    builder = _require_builder(ctx)
    box_widget = make_diagnostic_box(widget_id=widget_id, title=title, color=color)
    box_widget.zone = zone
    box_widget.hint = _coerce_hint(hint)
    box_widget.span = span
    box_widget.weight = weight
    box_widget.aspect = aspect
    box_widget.group = group
    box_widget.sizing = sizing
    box_widget.options = options
    box_widget.disabled = disabled
    box_widget.visible = visible
    builder.add_widget(box_widget)
    scope = _LcarsBoxContext(builder, box_widget)
    with builder.container_context(box_widget, target="children"):
        yield scope


@contextmanager
def data_panel(
    title: str = "Data",
    *,
    color: str = "blue",
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    options: ContainerOptions | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[_LcarsBoxContext, None, None]:
    """Phase 13 layout recipe: data-focused LCARS box panel."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "data-panel", id)
    _register_container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)

    builder = _require_builder(ctx)
    box_widget = make_data_panel_box(widget_id=widget_id, title=title, color=color)
    box_widget.zone = zone
    box_widget.hint = _coerce_hint(hint)
    box_widget.span = span
    box_widget.weight = weight
    box_widget.aspect = aspect
    box_widget.group = group
    box_widget.sizing = sizing
    box_widget.options = options
    box_widget.disabled = disabled
    box_widget.visible = visible
    builder.add_widget(box_widget)
    scope = _LcarsBoxContext(builder, box_widget)
    with builder.container_context(box_widget, target="children"):
        yield scope


@contextmanager
def control_panel(
    title: str = "Controls",
    *,
    color: str = "orange",
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    options: ContainerOptions | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Generator[_LcarsBoxContext, None, None]:
    """Phase 13 layout recipe: control-focused panel with right input column default."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "control-panel", id)
    _register_container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)

    builder = _require_builder(ctx)
    box_widget = make_control_panel_box(widget_id=widget_id, title=title, color=color)
    box_widget.zone = zone
    box_widget.hint = _coerce_hint(hint)
    box_widget.span = span
    box_widget.weight = weight
    box_widget.aspect = aspect
    box_widget.group = group
    box_widget.sizing = sizing
    box_widget.options = options
    box_widget.disabled = disabled
    box_widget.visible = visible
    builder.add_widget(box_widget)
    scope = _LcarsBoxContext(builder, box_widget)
    with builder.container_context(box_widget, target="right_inputs"):
        yield scope


@contextmanager
def input_column(
    *,
    side: Literal["left", "right"] = "left",
) -> Generator[None, None, None]:
    """Route nested widgets into the nearest enclosing lcars.box() input column."""
    ctx = _get_or_init_ctx()
    builder = _require_builder(ctx)
    with builder.input_column_context(side=side):
        yield


@contextmanager
def raw(
    *,
    reason: str | None = None,
) -> Generator[None, None, None]:
    """Escape hatch: bypass strict auto-paneling for this local subtree."""
    _ = reason
    ctx = _get_or_init_ctx()
    if ctx.config.visual_language != "strict":
        yield
        return

    builder = _require_builder(ctx)
    with builder.raw_context():
        yield


def _declare_form_widget(
    *,
    label: str,
    action_id: str,
    submit_label: str,
    color: str | None,
    id: str | None,
    options: FormOptions | None,
    hint: str | Hint | None,
    zone: ZoneHint | None,
    span: tuple[int, int] | None,
    weight: int | None,
    aspect: PanelAspect | None,
    group: str | None,
    disabled: bool,
    visible: bool,
) -> Form:
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    form_widget = Form(
        id=widget_id,
        label=label,
        submit_label=submit_label,
        action_id=action_id,
        color=color,
        children=[],
        options=options,
        disabled=disabled,
        visible=visible,
    )
    form_widget.zone = zone
    form_widget.hint = _coerce_hint(hint)
    form_widget.span = span
    form_widget.weight = weight
    form_widget.aspect = aspect
    form_widget.group = group
    builder.add_widget(form_widget)
    return form_widget


@contextmanager
def _form_scope(form_widget: Form) -> Generator[Form, None, None]:
    builder = _require_builder(_get_or_init_ctx())
    with builder.form_context(form_widget):
        yield form_widget


def _declare_model_field(plan: FieldPlan, *, widget_id: str) -> ModelFormField:
    """Render one planned model field through the ordinary widget functions."""
    if plan.kind == "bool":
        toggle_widget = toggle(
            plan.label,
            value=bool(plan.default),
            id=widget_id,
            options=ToggleOptions(description=plan.description),
        )
        assert toggle_widget.options is not None
        return ModelFormField(
            name=plan.name,
            widget_id=widget_id,
            kind=plan.kind,
            nullable=plan.nullable,
            options_key="options",
            base_options=toggle_widget.options.model_dump(mode="json"),
        )

    if plan.kind == "number":
        default = plan.default if isinstance(plan.default, (int, float)) else 0
        number_widget = number_input(
            plan.label,
            value=float(default),
            min=plan.minimum,
            max=plan.maximum,
            step=plan.step if plan.step is not None else 1.0,
            id=widget_id,
            options=NumberInputOptions(
                description=plan.description,
                required=plan.required,
                precision=0 if plan.integer else None,
            ),
        )
        assert number_widget.options is not None
        return ModelFormField(
            name=plan.name,
            widget_id=widget_id,
            kind=plan.kind,
            nullable=plan.nullable,
            options_key="options",
            base_options=number_widget.options.model_dump(mode="json"),
        )

    if plan.kind == "choice":
        # LCARS has no dropdown: `select` renders a segment bank or an option
        # stack (see docs/lcars_language.md), which is exactly what an Enum or
        # a Literal union wants.
        choices = list(plan.choices)
        if plan.nullable:
            choices.insert(0, ChoicePlan(token=EMPTY_CHOICE_TOKEN, label="None", value=None))
        default_token = _choice_token_for_default(plan)
        select_widget = select(
            plan.label,
            [SelectOption(label=choice.label, value=choice.token) for choice in choices],
            value=default_token,
            id=widget_id,
            settings=ChoiceOptions(description=plan.description),
        )
        assert select_widget.settings is not None
        return ModelFormField(
            name=plan.name,
            widget_id=widget_id,
            kind=plan.kind,
            nullable=plan.nullable,
            options_key="settings",
            base_options=select_widget.settings.model_dump(mode="json"),
            choices=tuple((choice.token, choice.value) for choice in choices),
        )

    text_widget = text_input(
        plan.label,
        value=plan.default if isinstance(plan.default, str) else "",
        id=widget_id,
        options=TextInputOptions(
            description=plan.description,
            validation=ValidationOptions(
                required=plan.required,
                min_length=plan.min_length,
                max_length=plan.max_length,
                pattern=plan.pattern,
            ),
        ),
    )
    assert text_widget.options is not None
    return ModelFormField(
        name=plan.name,
        widget_id=widget_id,
        kind=plan.kind,
        nullable=plan.nullable,
        options_key="options",
        base_options=text_widget.options.model_dump(mode="json"),
    )


def _choice_token_for_default(plan: FieldPlan) -> str:
    if plan.default is None:
        return EMPTY_CHOICE_TOKEN if plan.nullable else (
            plan.choices[0].token if plan.choices else EMPTY_CHOICE_TOKEN
        )
    for choice in plan.choices:
        if choice.value == plan.default or choice.token == choice_token(plan.default):
            return choice.token
    return plan.choices[0].token if plan.choices else EMPTY_CHOICE_TOKEN


def _model_backed_form(
    *,
    model: type[BaseModel],
    action_id: str | None,
    submit_label: str,
    color: str | None,
    id: str | None,
    options: FormOptions | None,
    hint: str | Hint | None,
    zone: ZoneHint | None,
    span: tuple[int, int] | None,
    weight: int | None,
    aspect: PanelAspect | None,
    group: str | None,
    disabled: bool,
    visible: bool,
) -> Form:
    if action_id is None:
        raise TypeError("lcars.form(model) requires an action_id.")
    # Plan first: an unsupported field must raise before anything is declared.
    plan = plan_model_form(model)
    form_options = options if options is not None else FormOptions()
    form_widget = _declare_form_widget(
        label=plan.label,
        action_id=action_id,
        submit_label=submit_label,
        color=color,
        id=id,
        options=form_options,
        hint=hint,
        zone=zone,
        span=span,
        weight=weight,
        aspect=aspect,
        group=group,
        disabled=disabled,
        visible=visible,
    )
    fields: list[ModelFormField] = []
    with _form_scope(form_widget):
        for field_plan in plan.fields:
            widget_id = f"{form_widget.id}-{field_plan.name.replace('_', '-')}"
            fields.append(_declare_model_field(field_plan, widget_id=widget_id))
    _get_context_app().register_form_model(
        ModelFormBinding(
            model=model,
            form_id=form_widget.id,
            action_id=action_id,
            form_base_options=form_options.model_dump(mode="json"),
            fields=tuple(fields),
        )
    )
    return form_widget


@overload
def form(
    label: type[BaseModel],
    action_id: str | None = ...,
    *,
    submit_label: str = ...,
    color: str | None = ...,
    id: str | None = ...,
    options: FormOptions | None = ...,
    hint: str | Hint | None = ...,
    zone: ZoneHint | None = ...,
    span: tuple[int, int] | None = ...,
    weight: int | None = ...,
    aspect: PanelAspect | None = ...,
    group: str | None = ...,
    disabled: bool = ...,
    visible: bool = ...,
) -> Form: ...


@overload
def form(
    label: str,
    action_id: str,
    *,
    submit_label: str = ...,
    color: str | None = ...,
    id: str | None = ...,
    options: FormOptions | None = ...,
    hint: str | Hint | None = ...,
    zone: ZoneHint | None = ...,
    span: tuple[int, int] | None = ...,
    weight: int | None = ...,
    aspect: PanelAspect | None = ...,
    group: str | None = ...,
    disabled: bool = ...,
    visible: bool = ...,
) -> AbstractContextManager[Form]: ...


def form(
    label: str | type[BaseModel],
    action_id: str | None = None,
    *,
    submit_label: str = "Submit",
    color: str | None = None,
    id: str | None = None,
    options: FormOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Form | AbstractContextManager[Form]:
    """Declare a form, either field-by-field or from a Pydantic model.

    Pass a label to compose the fields yourself; this returns a context manager
    holding nested input widgets::

        with lcars.form("Configure Warp", action_id="warp-submit"):
            lcars.number_input("Warp Factor", value=5.0, id="warp-factor")

    Pass a Pydantic model instead and the fields are generated from the model's
    own metadata — title/description become the label and help text, ``ge``/
    ``le``/``max_length`` become widget bounds, defaults become initial values —
    and the form is returned directly::

        lcars.form(ConfigureSensor, action_id="save", submit_label="Apply")

    On submit the payload is validated against the model. A valid submission
    reaches ``@app.action("save")`` as ``ctx.value``, already a parsed model
    instance; an invalid one never reaches the handler and instead renders
    field-level errors beside the offending fields.

    ``str``, ``bool``, ``int``, ``float``, ``Enum``, ``Literal`` and
    ``Optional`` of those are supported. Any other annotation raises at
    declaration time, naming the field — compose that part by hand instead.
    """
    if isinstance(label, type) and issubclass(label, BaseModel):
        return _model_backed_form(
            model=label,
            action_id=action_id,
            submit_label=submit_label,
            color=color,
            id=id,
            options=options,
            hint=hint,
            zone=zone,
            span=span,
            weight=weight,
            aspect=aspect,
            group=group,
            disabled=disabled,
            visible=visible,
        )
    if action_id is None:
        raise TypeError("lcars.form() requires an action_id.")
    form_widget = _declare_form_widget(
        label=label,
        action_id=action_id,
        submit_label=submit_label,
        color=color,
        id=id,
        options=options,
        hint=hint,
        zone=zone,
        span=span,
        weight=weight,
        aspect=aspect,
        group=group,
        disabled=disabled,
        visible=visible,
    )
    return _form_scope(form_widget)


def command_input(
    label: str = "Command",
    *,
    action_id: str | None = None,
    submit_label: str = "Send",
    placeholder: str = "Enter command…",
    value: str = "",
    actions: list[ActionSpec] | None = None,
    multiline: bool = False,
    rows: int = 3,
    required: bool = True,
    autocomplete: bool = False,
    clear_on_submit: bool = True,
    color: str | None = None,
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Form:
    """Declare a chat/command composer.

    A single-line composer submits with Enter. A multiline composer uses
    Ctrl+Enter or Command+Enter, preserving plain Enter for a new line.
    Secondary ``actions`` render as a compact bank attached to the composer.
    """
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    input_id = f"{widget_id}-value"
    effective_action_id = action_id or f"{widget_id}-submit"

    if input_id in ctx.registered_ids:
        raise ValueError(f"Duplicate widget id {input_id!r}.")
    ctx.registered_ids.add(input_id)

    input_widget = TextInput(
        id=input_id,
        label=label,
        placeholder=placeholder or None,
        password=False,
        autocomplete=autocomplete,
        value=value,
        color=color,
        options=TextInputOptions(
            multiline=multiline,
            rows=rows,
            commit="enter",
            validation=ValidationOptions(required=required),
        ),
        disabled=disabled,
        visible=visible,
    )
    form_widget = Form(
        id=widget_id,
        label=None,
        submit_label=submit_label,
        action_id=effective_action_id,
        color=color,
        children=[input_widget],
        options=FormOptions(
            layout="row",
            actions=list(actions or []),
            variant="composer",
            clear_on_submit=clear_on_submit,
        ),
        strict_role="primary",
        strict_title="",
        disabled=disabled,
        visible=visible,
    )
    form_widget.zone = zone or "dock"
    form_widget.hint = _coerce_hint(hint)
    form_widget.span = span
    form_widget.weight = weight
    form_widget.aspect = aspect or "wide"
    form_widget.group = group
    form_widget.sizing = "content"
    # The composer already owns its LCARS geometry. Mark it raw so strict-mode
    # normalization does not wrap this compact strip in a generic growing panel
    # and turn the rest of the dock into an empty black rectangle.
    builder = _require_builder(ctx)
    with builder.raw_context():
        builder.add_widget(form_widget)
    return form_widget


def header(
    text_value: str,
    *,
    size: Literal["h1", "h2", "h3", "h4", "h5", "h6"] = "h2",
    color: str | None = None,
    id: str | None = None,
    options: HeaderOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> LcarsHeader:
    """Render an LCARS section header widget."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(text_value, id)
    builder = _require_builder(ctx)
    widget = LcarsHeader(
        id=widget_id,
        text=text_value,
        size=size,
        color=(color or "orange"),
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


def bar(
    text_value: str | None = None,
    *,
    color: str = "orange",
    caps: Literal["none", "start", "end", "both"] = "none",
    label_mode: Literal["embedded", "cutout"] = "embedded",
    align: Literal["start", "center", "end"] = "end",
    thickness: int = 10,
    id: str | None = None,
    visible: bool = True,
) -> LcarsBar:
    """Render a structural LCARS bar with optional terminals and label."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(text_value or "bar", id)
    widget = LcarsBar(
        id=widget_id,
        label=text_value,
        text=text_value,
        color=color,
        caps=caps,
        label_mode=label_mode,
        align=align,
        thickness=thickness,
        visible=visible,
    )
    _require_builder(ctx).add_widget(widget)
    return widget


def text(
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
    """Render a text block."""
    return _add_text(
        content,
        size=size,
        align=align,
        color=color,
        id=id,
        options=options,
        hint=hint,
        zone=zone,
        span=span,
        weight=weight,
        aspect=aspect,
        group=group,
        visible=visible,
    )


def markdown(
    content: str,
    *,
    color: str | None = None,
    id: str | None = None,
    options: MarkdownOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> Markdown:
    """Render a markdown block."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id("markdown", id)
    builder = _require_builder(ctx)
    widget = Markdown(
        id=widget_id,
        content=content,
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


def metric(
    label: str,
    value: str,
    *,
    status: Literal["ok", "warn", "crit"] = "ok",
    color: str | None = None,
    id: str | None = None,
    options: MetricOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> StatusTile:
    """Render a StatusTile metric readout."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    widget = StatusTile(
        id=widget_id,
        label=label,
        value=value,
        status=status,
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


def alert(
    message: str,
    *,
    level: Literal["red", "yellow", "info", "success"] = "yellow",
    blink: bool = False,
    id: str | None = None,
    color: str | None = None,
    options: AlertOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Alert:
    """Declare an alert banner."""
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    widget_id = _resolve_id(message[:30], id)
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=AlertState(),
    )
    builder = _require_builder(ctx)
    widget = Alert(
        id=widget_id,
        message=message,
        severity=level,
        blink=blink,
        color=color,
        options=options,
        disabled=disabled,
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


def progress(
    label: str,
    value: float,
    *,
    color: str | None = None,
    show_label: bool = True,
    id: str | None = None,
    options: MeterOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> ProgressBar:
    """Render a progress bar."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    widget = ProgressBar(
        id=widget_id,
        label=label,
        value=float(value),
        color=color,
        show_label=show_label,
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


def chart(
    data: Any,
    *,
    title: str | None = None,
    color: str | None = None,
    id: str | None = None,
    options: ChartOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> LineChart:
    """Declare a LineChart. data: list[float] | dict[str, list[float]] | pd.DataFrame."""
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    widget_id = _resolve_id(title or "chart", id)
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=ChartState(),
    )
    series, x_labels = _to_series_and_labels(data)
    builder = _require_builder(ctx)
    widget = LineChart(
        id=widget_id,
        label=title,
        series=series,
        x_labels=x_labels,
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


def sparkline(
    data: Any,
    *,
    title: str | None = None,
    color: str | None = None,
    id: str | None = None,
    options: SparklineOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> Sparkline:
    """Render a Sparkline."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "sparkline", id)
    series, x_labels = _to_series_and_labels(data)
    builder = _require_builder(ctx)
    widget = Sparkline(
        id=widget_id,
        label=title,
        series=series,
        x_labels=x_labels,
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


def candlestick(
    data: Any,
    *,
    title: str | None = None,
    markers: list[dict[str, Any]] | None = None,
    up_color: str | None = None,
    down_color: str | None = None,
    color: str | None = None,
    id: str | None = None,
    options: FinancialChartOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> Candlestick:
    """Render a live, zoomable OHLC candlestick chart.

    data: list[dict] with time/open/high/low/close(/volume) keys, or a
    pandas DataFrame with Open/High/Low/Close columns and a DatetimeIndex.
    markers: optional list of dicts with time/position/shape/color/text,
    rendered as annotations on the chart (e.g. trade entries/exits).
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    widget_id = _resolve_id(title or "candlestick", id)
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=ChartState(),
    )
    builder = _require_builder(ctx)
    widget = Candlestick(
        id=widget_id,
        label=title,
        data=_to_ohlc_data(data),
        markers=_to_chart_markers(markers),
        up_color=up_color,
        down_color=down_color,
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


def renko(
    data: Any,
    brick_size: float,
    *,
    title: str | None = None,
    markers: list[dict[str, Any]] | None = None,
    up_color: str | None = None,
    down_color: str | None = None,
    color: str | None = None,
    id: str | None = None,
    options: FinancialChartOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> Renko:
    """Render a live, zoomable Renko brick chart computed from a price series.

    data: list[float] | list[dict] (with a "close" or "price" key) | pd.Series
    of prices. Bricks are computed with the given `brick_size`.
    markers: optional list of dicts with time/position/shape/color/text.
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    widget_id = _resolve_id(title or "renko", id)
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=ChartState(),
    )
    builder = _require_builder(ctx)
    widget = Renko(
        id=widget_id,
        label=title,
        data=_to_renko_bricks(data, brick_size),
        markers=_to_chart_markers(markers),
        up_color=up_color,
        down_color=down_color,
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


def shader(
    fragment_shader: str,
    *,
    title: str | None = None,
    uniforms: dict[str, float | list[float]] | None = None,
    aspect_ratio: float | None = None,
    color: str | None = None,
    id: str | None = None,
    options: ShaderOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> Shader:
    """Render an animated WebGL fragment-shader viewport.

    `fragment_shader` is GLSL ES 1.00 source. It receives `uniform float
    u_time` (seconds since mount), `uniform vec2 u_resolution` (canvas pixels),
    `varying vec2 v_uv` (0..1 UV coordinates), plus any custom `uniforms`.
    """
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "shader", id)
    builder = _require_builder(ctx)
    widget = Shader(
        id=widget_id,
        label=title,
        fragment_shader=fragment_shader,
        uniforms=uniforms or {},
        aspect_ratio=aspect_ratio,
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


def gauge(
    label: str,
    value: float,
    *,
    min: float = 0.0,
    max: float = 100.0,
    unit: str | None = None,
    color: str | None = None,
    warn_threshold: float | None = None,
    crit_threshold: float | None = None,
    id: str | None = None,
    options: MeterOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> Gauge:
    """Render a circular gauge readout."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    widget = Gauge(
        id=widget_id,
        label=label,
        value=float(value),
        min=float(min),
        max=float(max),
        unit=unit,
        color=color,
        warn_threshold=warn_threshold,
        crit_threshold=crit_threshold,
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


def table(
    data: Any,
    *,
    title: str | None = None,
    color: str | None = None,
    id: str | None = None,
    options: TableOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Table:
    """Declare a Table. data: list[list] | list[dict] | pd.DataFrame."""
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    server = interaction is not None and interaction.mode == "server"
    data_server = options is not None and options.data_mode == "server"
    emit = options is not None and options.emit_state_changes
    # Python receives typed state actions whenever the table emits them: explicit
    # opt-in, a server data_mode, or the legacy server interaction shorthand.
    receives_state = emit or data_server or server
    widget_id = _resolve_id(title or "table", id)
    pagination = options.pagination if options is not None else None
    selection = options.selection if options is not None else None
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        emit=receives_state,
        default=TableState(
            sort=options.sort if options is not None else [],
            filters=options.filters if options is not None else [],
            page=pagination.page if pagination is not None else 1,
            page_size=pagination.page_size if pagination is not None else 25,
            selected_ids=selection.selected_ids if selection is not None else [],
            expanded_ids=options.expanded_ids if options is not None else [],
        ),
    )
    headers, rows = _to_table_data(data, options=options)
    builder = _require_builder(ctx)
    widget = Table(
        id=widget_id,
        label=title,
        headers=headers,
        rows=rows,
        color=color,
        options=options,
        disabled=disabled,
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


def log(
    stream_id: str,
    *,
    max_lines: int = 1000,
    title: str | None = None,
    color: str | None = None,
    auto_scroll: bool = True,
    id: str | None = None,
    options: LogOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> LogViewer:
    """Render a LogViewer.

    When `auto_scroll` is true (the default), the viewer follows new lines as
    long as the reader is already scrolled to the bottom; scrolling up to
    read history disables following until they scroll back down.
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    widget_id = _resolve_id(stream_id, id)
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=LogState(
            levels=options.levels if options is not None else [],
            paused=options.paused if options is not None else False,
            following=auto_scroll,
        ),
    )
    builder = _require_builder(ctx)
    widget = LogViewer(
        id=widget_id,
        label=title,
        stream_id=stream_id,
        max_lines=max_lines,
        auto_scroll=auto_scroll,
        color=color,
        options=options,
        disabled=disabled,
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


def video_hls(
    src: str,
    *,
    title: str | None = None,
    autoplay: bool = False,
    muted: bool = False,
    color: str | None = None,
    id: str | None = None,
    options: VideoOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> VideoHls:
    """Render an HLS video player descriptor."""
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    widget_id = _resolve_id(title or "video-hls", id)
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=VideoState(playing=autoplay),
    )
    builder = _require_builder(ctx)
    widget = VideoHls(
        id=widget_id,
        label=title,
        src=src,
        autoplay=autoplay,
        muted=muted,
        color=color,
        options=options,
        disabled=disabled,
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


def node_canvas(
    document: GraphDocument | dict[str, Any],
    *,
    title: str | None = None,
    execution: GraphExecutionState | None = None,
    color: str | None = None,
    id: str | None = None,
    options: NodeCanvasOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> NodeCanvas:
    """Render an editable node-graph canvas.

    `document` is a :class:`~lcars_ui.widgets.graph.GraphDocument` (or a dict in
    the same shape) declaring the node templates available and the graph as it
    currently stands. `execution` carries run status and is kept separate from
    the document so status can stream in while the user is editing.

    Server interaction state is retained per session at transaction boundaries —
    a drag ending, a connection completing, or a field committing.

    Running a graph is the application's job: the library emits ``run``,
    ``queue`` and ``cancel`` events with the current graph and does not execute
    anything itself.
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    widget_id = _resolve_id(title or "node-canvas", id)
    parsed = (
        document if isinstance(document, GraphDocument) else GraphDocument.model_validate(document)
    )
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=NodeCanvasState(document=parsed),
    )
    builder = _require_builder(ctx)
    widget = NodeCanvas(
        id=widget_id,
        label=title,
        document=parsed,
        execution=execution,
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


def graph_workspace(
    workspace: GraphWorkspaceDocument | dict[str, Any],
    *,
    title: str | None = None,
    color: str | None = None,
    id: str | None = None,
    options: GraphWorkspaceOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> GraphWorkspace:
    """Render a canonical graph and its distinct proposal working plane."""
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    widget_id = _resolve_id(title or "graph-workspace", id)
    parsed = (
        workspace
        if isinstance(workspace, GraphWorkspaceDocument)
        else GraphWorkspaceDocument.model_validate(workspace)
    )
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=GraphWorkspaceState(workspace=parsed),
    )
    builder = _require_builder(ctx)
    widget = GraphWorkspace(
        id=widget_id,
        label=title,
        workspace=parsed,
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


def three_scene(
    module: str,
    *,
    title: str | None = None,
    props: dict[str, Any] | None = None,
    aspect_ratio: float | None = None,
    color: str | None = None,
    id: str | None = None,
    options: ThreeSceneOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    visible: bool = True,
) -> ThreeScene:
    """Render a managed Three.js viewport driven by a project scene module.

    `module` is a path relative to the application's ``assets_dir``, served
    from ``/lcars/assets/``. The module
    default-exports ``setup(context)``; LCARS owns the canvas, camera, controls,
    frame loop and disposal, and hands the module a scene to populate.

    `props` is JSON-serializable data delivered to that ``setup`` call and to a
    later ``updateProps``, so the scene can be re-configured from Python without
    being torn down.

    Server interaction state retains camera pose and the last module event.
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    widget_id = _resolve_id(title or "three-scene", id)
    _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=ThreeSceneState(),
    )
    payload = props or {}
    # Caught here rather than at serialization time: a set or a datetime in
    # props otherwise surfaces as a manifest-wide encoding failure naming
    # neither the widget nor the offending key.
    try:
        json.dumps(payload)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"three_scene props must be JSON-serializable (widget {widget_id!r}): {exc}"
        ) from exc
    builder = _require_builder(ctx)
    widget = ThreeScene(
        id=widget_id,
        label=title,
        module=module,
        props=payload,
        aspect_ratio=aspect_ratio,
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


def mic_button(
    action_id: str,
    *,
    title: str | None = None,
    upload_url: str = "/lcars/upload/audio",
    timeout_ms: int = 5000,
    continuous: bool = False,
    silence_ms: int = 900,
    color: str | None = None,
    id: str | None = None,
    options: MicOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> MicButton:
    """Render a microphone capture action button.

    By default this is push-to-talk: click to start recording, click again
    (or wait timeout_ms) to stop and upload. Pass continuous=True for
    hands-free mode: the mic stays armed after the first click and
    auto-detects when the user starts/stops speaking (energy-based voice
    activity detection), uploading each utterance automatically. In
    continuous mode, timeout_ms instead acts as a maximum-utterance safety
    cap, and silence_ms controls how long a pause must last before an
    utterance is considered finished.
    """
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or action_id, id)
    builder = _require_builder(ctx)
    widget = MicButton(
        id=widget_id,
        label=title,
        upload_url=upload_url,
        action_id=action_id,
        timeout_ms=timeout_ms,
        continuous=continuous,
        silence_ms=silence_ms,
        color=color,
        options=options,
        disabled=disabled,
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


def file_upload(
    label: str = "Upload Files",
    *,
    action_id: str | None = None,
    upload_url: str = "/lcars/upload/files",
    accept: str | list[str] | None = None,
    multiple: bool = True,
    max_files: int = 10,
    max_bytes: int = 25_000_000,
    color: str | None = None,
    id: str | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    sizing: LayoutSizing | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> FileUpload:
    """Declare a drag/drop file uploader.

    Uploaded file payloads arrive through the matching explicit action handler.
    """

    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    effective_action_id = action_id or widget_id

    accepted = (
        [item.strip() for item in accept.split(",") if item.strip()]
        if isinstance(accept, str)
        else list(accept or [])
    )
    builder = _require_builder(ctx)
    widget = FileUpload(
        id=widget_id,
        label=label,
        action_id=effective_action_id,
        upload_url=upload_url,
        accept=accepted,
        multiple=multiple,
        max_files=max_files,
        max_bytes=max_bytes,
        color=color,
        disabled=disabled,
        visible=visible,
    )
    widget.zone = zone
    widget.hint = _coerce_hint(hint)
    widget.span = span
    widget.weight = weight
    widget.aspect = aspect
    widget.group = group
    widget.sizing = sizing
    builder.add_widget(widget)
    return widget


# ---------------------------------------------------------------------------
# Input widget declarations
# ---------------------------------------------------------------------------


def button(
    label: str,
    *,
    color: str | None = None,
    id: str | None = None,
    options: ButtonOptions | None = None,
    presentation: Literal["button", "data_tile"] = "button",
    symbol: str | None = None,
    detail: str | None = None,
    glyph: AtomGlyph | dict[str, int] | None = None,
    terminal: Literal["none", "start", "end", "both"] = "both",
    density: Literal["normal", "compact", "micro"] = "normal",
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Button:
    """Declare a button."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    widget = Button(
        id=widget_id,
        label=label,
        color=color,
        action_id=widget_id,
        options=options,
        presentation=presentation,
        symbol=symbol,
        detail=detail,
        glyph=AtomGlyph.model_validate(glyph) if isinstance(glyph, dict) else glyph,
        terminal=terminal,
        density=density,
        disabled=disabled,
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


def toggle(
    label: str,
    *,
    value: bool = False,
    color: str | None = None,
    id: str | None = None,
    options: ToggleOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Toggle:
    """Declare a toggle."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    widget = Toggle(
        id=widget_id,
        label=label,
        color=color,
        checked=value,
        action_id=widget_id,
        options=options,
        disabled=disabled,
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


def checkbox(
    label: str,
    *,
    value: bool = False,
    color: str | None = None,
    id: str | None = None,
    options: ToggleOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Checkbox:
    """Declare a checkbox."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    widget = Checkbox(
        id=widget_id,
        label=label,
        color=color,
        checked=value,
        action_id=widget_id,
        options=options,
        disabled=disabled,
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


def select(
    label: str,
    options: list[str | SelectOption | dict[str, Any]],
    *,
    value: str | list[str] | None = None,
    color: str | None = None,
    id: str | None = None,
    settings: ChoiceOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Select:
    """Declare a select dropdown."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    select_options = _normalize_choice_options(options)
    multiple = settings.multiple if settings is not None else False
    first_value = select_options[0].value if select_options else ""
    if multiple:
        default: str | list[str] = (
            value if isinstance(value, list) else ([value] if isinstance(value, str) else [])
        )
    else:
        default = (
            value
            if isinstance(value, str)
            else (value[0] if isinstance(value, list) and value else first_value)
        )
    builder = _require_builder(ctx)
    widget = Select(
        id=widget_id,
        label=label,
        color=color,
        options=select_options,
        value=default,
        action_id=widget_id,
        settings=settings,
        disabled=disabled,
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


def radio(
    label: str,
    options: list[str | SelectOption | dict[str, Any]],
    *,
    value: str | None = None,
    color: str | None = None,
    id: str | None = None,
    settings: ChoiceOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> Radio:
    """Declare a radio button group."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    radio_options = _normalize_choice_options(options)
    default = value if value is not None else (radio_options[0].value if radio_options else "")
    builder = _require_builder(ctx)
    widget = Radio(
        id=widget_id,
        label=label,
        color=color,
        options=radio_options,
        value=default,
        action_id=widget_id,
        settings=settings,
        disabled=disabled,
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


def radio_toggle(
    label: str,
    options: list[str | SelectOption | dict[str, Any]],
    *,
    value: str | None = None,
    color: str | None = None,
    id: str | None = None,
    settings: ChoiceOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> RadioToggle:
    """Declare a segmented radio toggle group."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    toggle_options = _normalize_choice_options(options)
    default = value if value is not None else (toggle_options[0].value if toggle_options else "")
    builder = _require_builder(ctx)
    widget = RadioToggle(
        id=widget_id,
        label=label,
        color=color,
        options=toggle_options,
        value=default,
        action_id=widget_id,
        settings=settings,
        disabled=disabled,
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


def text_input(
    label: str,
    *,
    value: str = "",
    placeholder: str = "",
    password: bool = False,
    autocomplete: bool = True,
    color: str | None = None,
    id: str | None = None,
    options: TextInputOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> TextInput:
    """Declare a text input.

    Set ``autocomplete=False`` to suppress the browser's autocomplete/history
    dropdown — useful for command-style inputs where suggestions from prior
    entries are noise rather than help.
    """
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    widget = TextInput(
        id=widget_id,
        label=label,
        placeholder=placeholder or None,
        password=password,
        autocomplete=autocomplete,
        value=value,
        regex=(
            options.validation.pattern
            if options is not None and options.validation is not None
            else None
        ),
        color=color,
        options=options,
        disabled=disabled,
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


def number_input(
    label: str,
    *,
    value: float = 0.0,
    min: float | None = None,
    max: float | None = None,
    step: float = 1.0,
    placeholder: str | None = None,
    color: str | None = None,
    id: str | None = None,
    options: NumberInputOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> NumberInput:
    """Declare a numeric input."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    widget = NumberInput(
        id=widget_id,
        label=label,
        value=float(value),
        min=min,
        max=max,
        step=step,
        placeholder=placeholder,
        color=color,
        options=options,
        disabled=disabled,
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


# ---------------------------------------------------------------------------
# Effects (only meaningful in action, session-start, and live handlers)
# ---------------------------------------------------------------------------


def _route_to_context(
    ctx: _LCARSContext,
    envelope: Envelope,
    audience: Audience | None,
) -> None:
    """Resolve ``audience`` against the active context and mark ``envelope``.

    ``None`` inherits ``ctx.default_audience`` — "session" (private to the
    one real session running the handler) for actions and session-start
    hooks, or a LIVE job's own declared audience while it is running.
    """
    resolved = audience if audience is not None else ctx.default_audience
    if resolved == "all":
        envelope.route_to_all()
    else:
        envelope.route_to_session(ctx.session_id)


def update(
    widget_id: str,
    *,
    audience: Audience | None = None,
    **kwargs: Any,
) -> None:
    """Publish a widget update while an effect handler is active.

    Private to the originating session by default — pass ``audience="all"``
    to broadcast it to every connected session instead.
    """
    ctx = _get_or_init_ctx()
    if ctx.pending_events is None:
        return
    envelope = make_envelope(
        "widget_update",
        WidgetUpdatePayload(id=widget_id, data=kwargs),
    )
    _route_to_context(ctx, envelope, audience)
    ctx.pending_events.append(envelope)


def show_hint(widget_id: str) -> None:
    """Open a widget's hint from Python while an effect handler is active.

    Only meaningful for hints declared with ``trigger="manual"``.
    """
    update(widget_id, hint={"open": True})


def hide_hint(widget_id: str) -> None:
    """Close a widget's hint from Python while an effect handler is active."""
    update(widget_id, hint={"open": False})


def notify(
    message: str,
    *,
    level: Literal["info", "success", "warning", "error"] = "info",
    title: str | None = None,
    duration_ms: int | None = None,
    dismissible: bool = True,
    movable: bool = True,
    audience: Audience | None = None,
) -> None:
    """Publish a configurable notification while an effect handler is active.

    Private to the originating session by default — pass ``audience="all"``
    to broadcast it to every connected session instead.
    """
    ctx = _get_or_init_ctx()
    if ctx.pending_events is None:
        return
    envelope = make_envelope(
        "notification",
        NotificationPayload(
            message=message,
            level=level,
            title=title,
            duration_ms=duration_ms,
            dismissible=dismissible,
            movable=movable,
        ),
    )
    _route_to_context(ctx, envelope, audience)
    ctx.pending_events.append(envelope)


def append_log(stream_id: str, *lines: str, audience: Audience | None = None) -> None:
    """Publish a log chunk while an effect handler is active.

    Private to the originating session by default — pass ``audience="all"``
    to broadcast it to every connected session instead.
    """
    ctx = _get_or_init_ctx()
    if ctx.pending_events is None:
        return
    envelope = make_envelope(
        "log_chunk",
        LogChunkPayload(stream_id=stream_id, lines=list(lines)),
    )
    _route_to_context(ctx, envelope, audience)
    ctx.pending_events.append(envelope)


def set_alert_condition(
    level: Literal["normal", "yellow", "red"],
    *,
    audience: Audience | None = None,
) -> None:
    """Set the shipwide alert condition from an active effect handler.

    Patches ``meta.alert_condition`` so connected clients re-tint the whole UI —
    e.g. a button handler calling ``lcars.set_alert_condition("red")`` flashes the
    entire console to red alert in real time. This is shipwide by nature, so
    it broadcasts to every session by default; pass ``audience="session"`` to
    scope it to the acting session instead.
    """
    ctx = _get_or_init_ctx()
    if ctx.pending_events is None:
        return
    envelope = make_envelope(
        "manifest_update",
        ManifestUpdatePayload(path="meta.alert_condition", value=level),
    )
    _route_to_context(ctx, envelope, audience if audience is not None else "all")
    ctx.pending_events.append(envelope)


def set_theme(
    theme: str,
    *,
    audience: Audience | None = None,
) -> None:
    """Switch the active theme from an active effect handler.

    Patches ``meta.theme`` so connected clients re-tint the palette without a
    reload. This is shipwide by nature, so it broadcasts to every session by
    default; pass ``audience="session"`` to scope it to the acting session
    instead (e.g. a personal theme preview).
    """
    ctx = _get_or_init_ctx()
    if ctx.pending_events is None:
        return
    _get_context_app()._validate_theme_name(theme)
    envelope = make_envelope(
        "manifest_update",
        ManifestUpdatePayload(path="meta.theme", value=theme),
    )
    _route_to_context(ctx, envelope, audience if audience is not None else "all")
    ctx.pending_events.append(envelope)


__all__ = [
    "config",
    "live",
    "nav",
    "page",
    "row",
    "col",
    "columns",
    "section",
    "surface",
    "edge_anchor",
    "box",
    "sweep",
    "bracket",
    "console",
    "padd",
    "diagnostic",
    "data_panel",
    "control_panel",
    "input_column",
    "raw",
    "form",
    "command_input",
    "support_panel",
    "tri_state",
    "header",
    "text",
    "markdown",
    "metric",
    "alert",
    "progress",
    "chart",
    "sparkline",
    "gauge",
    "table",
    "log",
    "candlestick",
    "renko",
    "shader",
    "video_hls",
    "mic_button",
    "button",
    "toggle",
    "checkbox",
    "radio",
    "radio_toggle",
    "select",
    "text_input",
    "number_input",
    "update",
    "notify",
    "append_log",
    "set_alert_condition",
    "set_theme",
]
