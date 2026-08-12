"""Public lcars.* DSL functions.

All functions read from / write to the thread-local _LCARSContext.
In BUILD mode they declare widgets and return defaults.
In HANDLE mode they return current widget values and enqueue events.
"""

from __future__ import annotations

import asyncio
import json
import threading
import warnings
import webbrowser
from collections.abc import Callable, Generator
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Literal, TypeVar

from pydantic import BaseModel, ValidationError

from lcars_ui.core.models import SidebarSegment
from lcars_ui.core.widget_base import Hint, HintPlacement, HintTrigger
from lcars_ui.dsl._adapters import (
    _to_chart_markers,
    _to_ohlc_data,
    _to_renko_bricks,
    _to_series_and_labels,
    _to_table_data,
)
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._recipes import (
    make_console_sweep,
    make_control_panel_box,
    make_data_panel_box,
    make_diagnostic_box,
    make_padd_sweep,
)
from lcars_ui.dsl._state import (
    Mode,
    _Config,
    _LCARSContext,
    auto_id,
    get_ctx,
    get_session_state,
    set_ctx,
)
from lcars_ui.server.events import (
    LogChunkPayload,
    ManifestUpdatePayload,
    NotificationPayload,
    WidgetUpdatePayload,
    make_envelope,
)
from lcars_ui.widgets.containers import LcarsBox, LcarsBracket, LcarsHeader, LcarsSweep, Popup
from lcars_ui.widgets.data import Candlestick, Gauge, LineChart, Renko, Shader, Sparkline, Table
from lcars_ui.widgets.graph import (
    GraphDocument,
    GraphExecutionState,
    NodeCanvas,
    NodeCanvasOptions,
    NodeCanvasState,
)
from lcars_ui.widgets.inputs import (
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
    UploadedFile,
)
from lcars_ui.widgets.media import LogViewer, MicButton, ThreeScene, VideoHls
from lcars_ui.widgets.options import (
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
    MicResult,
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
    VideoOptions,
    VideoState,
)
from lcars_ui.widgets.primitives import Alert, Markdown, ProgressBar, StatusTile, Text
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

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Adaptive-layout placement hint (override for the renderer's auto-placement)
ZoneHint = Literal["primary", "side", "readout", "dock", "rail", "full"]
PanelAspect = Literal["wide", "tall", "square", "flex"]
LayoutSizing = Literal["fill", "content"]

# Registry for @lcars.live decorated functions
_live_fn: Callable[[], None] | None = None
_live_interval: float = 5.0
_STRICT_COLUMN_MIN_WIDTH = 48
_STRICT_COLUMN_MAX_WIDTH = 150
_StateModel = TypeVar("_StateModel", bound=BaseModel)


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
    """Return the current builder or raise a clear error if called outside run()."""
    if ctx.builder is None:
        raise RuntimeError(
            "lcars widget functions must be called inside a ui_fn passed to lcars.run(). "
            "Example: lcars.run(my_ui_function)"
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


def _get_session_store(ctx: _LCARSContext) -> dict[str, Any]:
    return get_session_state(ctx.session_id)


def _server_interaction_state(
    *,
    ctx: _LCARSContext,
    widget_id: str,
    interaction: InteractionOptions | None,
    default: _StateModel,
    emit: bool = False,
) -> _StateModel | None:
    """Return validated per-session state for an opt-in server interaction.

    ``emit`` lets a client-side widget (which performs its own data operations)
    still receive typed state-change actions from the renderer, so Python can
    react to selection/expansion without owning sort/filter/pagination.
    """
    server = interaction is not None and interaction.mode == "server"
    if not server and not emit:
        return None

    store = _get_session_store(ctx)
    store_key = f"__lcars_widget_state__:{widget_id}"
    model_type = type(default)
    try:
        current = model_type.model_validate(store.get(store_key, default.model_dump()))
    except ValidationError:
        current = default

    action_id = (interaction.action_id if interaction is not None else None) or widget_id
    if ctx.active_action_id != action_id or not isinstance(ctx.active_action_value, dict):
        return current

    raw_state = ctx.active_action_value.get("state")
    if not isinstance(raw_state, dict):
        return current
    try:
        candidate = model_type.model_validate(raw_state)
    except ValidationError:
        return current

    kind = ctx.active_action_value.get("kind")
    if isinstance(kind, str) and "last_event" in candidate.__class__.model_fields:
        candidate = candidate.model_copy(update={"last_event": kind})
    store[store_key] = candidate.model_dump(mode="json")
    return candidate


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


def _container_interaction_state(
    *,
    ctx: _LCARSContext,
    widget_id: str,
    options: ContainerOptions | None,
) -> ContainerState:
    default = ContainerState(collapsed=options.initial_collapsed if options is not None else False)
    state = _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=options.interaction if options is not None else None,
        default=default,
    )
    return state or default


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


def _iter_widgets_in_tree(widgets: list[Any]) -> Generator[Any, None, None]:
    for widget in widgets:
        yield widget
        if hasattr(widget, "children"):
            children = widget.children
            if isinstance(children, list):
                yield from _iter_widgets_in_tree(children)
        if hasattr(widget, "left_inputs"):
            left_inputs = widget.left_inputs
            if isinstance(left_inputs, list):
                yield from _iter_widgets_in_tree(left_inputs)
        if hasattr(widget, "right_inputs"):
            right_inputs = widget.right_inputs
            if isinstance(right_inputs, list):
                yield from _iter_widgets_in_tree(right_inputs)
        if hasattr(widget, "main_children"):
            main_children = widget.main_children
            if isinstance(main_children, list):
                yield from _iter_widgets_in_tree(main_children)
        if hasattr(widget, "side_children"):
            side_children = widget.side_children
            if isinstance(side_children, list):
                yield from _iter_widgets_in_tree(side_children)
        if hasattr(widget, "header_children"):
            header_children = widget.header_children
            if isinstance(header_children, list):
                yield from _iter_widgets_in_tree(header_children)
        if hasattr(widget, "column_inputs"):
            column_inputs = widget.column_inputs
            if isinstance(column_inputs, list):
                yield from _iter_widgets_in_tree(column_inputs)
        if hasattr(widget, "left_children"):
            left_children = widget.left_children
            if isinstance(left_children, list):
                yield from _iter_widgets_in_tree(left_children)
        if hasattr(widget, "right_children"):
            right_children = widget.right_children
            if isinstance(right_children, list):
                yield from _iter_widgets_in_tree(right_children)
        if hasattr(widget, "rail_children"):
            rail_children = widget.rail_children
            if isinstance(rail_children, list):
                yield from _iter_widgets_in_tree(rail_children)
        if hasattr(widget, "content_children"):
            content_children = widget.content_children
            if isinstance(content_children, list):
                yield from _iter_widgets_in_tree(content_children)


def _index_form_children(manifest: Any) -> dict[str, list[str]]:
    mapping: dict[str, list[str]] = {}
    for page in manifest.pages.values():
        for row in page.rows:
            for column in row.columns:
                for widget in _iter_widgets_in_tree(column.widgets):
                    if isinstance(widget, Form):
                        mapping[widget.action_id] = [child.id for child in widget.children]
    return mapping


# ---------------------------------------------------------------------------
# App entry point
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
        settings_page=settings_page,
        visual_language=visual_language,
        strict_renderer=strict_renderer,
    )


def run(
    ui_fn: Callable[[], None],
    *,
    host: str = "127.0.0.1",
    port: int = 8000,
    open_browser: bool = True,
    assets_dir: str | Path | None = None,
) -> None:
    """Build the manifest from ui_fn, start uvicorn, open the browser.

    ``assets_dir`` is served read-only at ``/lcars/assets/`` and is where
    ``three_scene`` resolves its scene modules from.
    """
    import uvicorn  # noqa: PLC0415

    from lcars_ui.app import create_app  # noqa: PLC0415

    # --- BUILD phase ---
    # Preserve any config set via lcars.config() before run() was called.
    pre_run_config = get_ctx().config
    build_ctx = _LCARSContext(
        mode=Mode.BUILD,
        session_id="build",
        builder=_ManifestBuilder(),
        config=pre_run_config,
    )
    set_ctx(build_ctx)
    ui_fn()

    assert build_ctx.builder is not None
    manifest = build_ctx.builder.build(build_ctx.config)
    form_children_by_action = _index_form_children(manifest)

    # --- Wire up DSL action handler ---
    fastapi_app = create_app(manifest=manifest, assets_dir=assets_dir)
    event_bus = fastapi_app.state.event_bus

    async def _dsl_action_handler(
        action_id: str,
        value: Any,
        session_id: str = "http_fallback",
    ) -> None:
        handle_ctx = _LCARSContext(
            mode=Mode.HANDLE,
            session_id=session_id,
            active_action_id=action_id,
            active_action_value=value,
            config=build_ctx.config,
            builder=_ManifestBuilder(),
        )
        set_ctx(handle_ctx)

        # Hydrate form child values into per-session state before rerendering.
        if isinstance(value, dict):
            session_state = get_session_state(session_id)
            child_ids = form_children_by_action.get(action_id)
            if child_ids is None:
                for key, item_value in value.items():
                    if isinstance(key, str):
                        session_state[key] = item_value
            else:
                for child_id in child_ids:
                    if child_id in value:
                        session_state[child_id] = value[child_id]

        ui_fn()
        for envelope in handle_ctx.pending_events:
            await event_bus.publish(envelope)

    fastapi_app.state.plugin_action_handlers["*"] = _dsl_action_handler

    # --- Live polling (wired into lifespan via app.state, not deprecated on_event) ---
    if _live_fn is not None:
        live_fn = _live_fn
        interval = _live_interval

        async def _live_loop() -> None:
            while True:
                await asyncio.sleep(interval)
                live_ctx = _LCARSContext(
                    mode=Mode.LIVE,
                    session_id="live",
                    config=build_ctx.config,
                    builder=_ManifestBuilder(),
                )
                set_ctx(live_ctx)
                try:
                    live_fn()
                except Exception:
                    pass
                for envelope in live_ctx.pending_events:
                    await event_bus.publish(envelope)

        fastapi_app.state._live_coro_factory = _live_loop

    # --- Open browser ---
    # Open the landing page (/) rather than a raw API path so the first
    # thing a developer sees is a readable status page, not a JSON blob.
    if open_browser:
        url = f"http://{host}:{port}/"
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()

    uvicorn.run(fastapi_app, host=host, port=port)


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
    if ctx.mode != Mode.BUILD:
        return
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
    layout: Literal["auto", "console", "telemetry", "grid", "menu"] = "auto",
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
    if ctx.mode != Mode.BUILD:
        yield
        return
    builder = _require_builder(ctx)
    page_id = id or auto_id(title, ctx.registered_ids)
    with builder.page_context(
        title,
        page_id,
        archetype=layout,
        fillers=fillers,
        sizing=sizing,
    ):
        yield


def columns(widths: list[str]) -> list[Any]:
    """Declare a multi-column layout row; returns list of context managers."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        # Return dummy context managers in HANDLE/LIVE modes
        return [_NoOpContext() for _ in widths]
    return _require_builder(ctx).add_columns(widths)


@contextmanager
def row(*, height: str = "auto") -> Generator[None, None, None]:
    """Context manager: start a row block that contains one or more cols."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield
        return
    builder = _require_builder(ctx)
    _warn_strict_page_level_layout(ctx=ctx, builder=builder, primitive="row")
    with builder.row_context(height=height):
        yield


@contextmanager
def col(width: str = "1fr") -> Generator[None, None, None]:
    """Context manager: start a column block inside a row."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield
        return
    builder = _require_builder(ctx)
    _warn_strict_page_level_layout(ctx=ctx, builder=builder, primitive="col")
    with builder.col_context(width=width):
        yield


@contextmanager
def section(label: str, *, color: str | None = None) -> Generator[None, None, None]:
    """Visual grouping helper with a heading and nested body widgets."""
    if _get_or_init_ctx().mode == Mode.BUILD:
        header(label, size="h2", color=color)
    yield


class _NoOpContext:
    def __enter__(self) -> _NoOpContext:
        return self

    def __exit__(self, *_: Any) -> None:
        pass


class _NoOpBoxContext:
    def __init__(self, state: ContainerState | None = None) -> None:
        self.state = state or ContainerState()

    @contextmanager
    def left_inputs(self) -> Generator[None, None, None]:
        yield

    @contextmanager
    def right_inputs(self) -> Generator[None, None, None]:
        yield

    @contextmanager
    def main(self) -> Generator[None, None, None]:
        yield

    @contextmanager
    def side(self) -> Generator[None, None, None]:
        yield


class _LcarsBoxContext:
    def __init__(
        self,
        builder: _ManifestBuilder,
        widget: LcarsBox,
        state: ContainerState | None = None,
    ) -> None:
        self._builder = builder
        self._widget = widget
        self.state = state or ContainerState()

    @contextmanager
    def left_inputs(self) -> Generator[None, None, None]:
        with self._builder.container_context(self._widget, target="left_inputs"):
            yield

    @contextmanager
    def right_inputs(self) -> Generator[None, None, None]:
        with self._builder.container_context(self._widget, target="right_inputs"):
            yield

    @contextmanager
    def main(self) -> Generator[None, None, None]:
        with self._builder.container_context(self._widget, target="main_children"):
            yield

    @contextmanager
    def side(self) -> Generator[None, None, None]:
        with self._builder.container_context(self._widget, target="side_children"):
            yield


class _NoOpSweepContext:
    def __init__(self, state: ContainerState | None = None) -> None:
        self.state = state or ContainerState()

    @contextmanager
    def header(self) -> Generator[None, None, None]:
        yield

    @contextmanager
    def column_inputs(self) -> Generator[None, None, None]:
        yield

    @contextmanager
    def left(self) -> Generator[None, None, None]:
        yield

    @contextmanager
    def right(self) -> Generator[None, None, None]:
        yield


class _LcarsSweepContext:
    def __init__(
        self,
        builder: _ManifestBuilder,
        widget: LcarsSweep,
        state: ContainerState | None = None,
    ) -> None:
        self._builder = builder
        self._widget = widget
        self.state = state or ContainerState()

    @contextmanager
    def header(self) -> Generator[None, None, None]:
        with self._builder.container_context(self._widget, target="header_children"):
            yield

    @contextmanager
    def column_inputs(self) -> Generator[None, None, None]:
        with self._builder.container_context(self._widget, target="column_inputs"):
            yield

    @contextmanager
    def left(self) -> Generator[None, None, None]:
        with self._builder.container_context(self._widget, target="left_children"):
            yield

    @contextmanager
    def right(self) -> Generator[None, None, None]:
        with self._builder.container_context(self._widget, target="right_children"):
            yield


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
    if ctx.mode != Mode.BUILD:
        yield None
        return

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
) -> Generator[_LcarsBoxContext | _NoOpBoxContext, None, None]:
    """Context manager: compose an lcars_box container."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "box", id)
    state = _container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)
    if ctx.mode != Mode.BUILD:
        yield _NoOpBoxContext(state)
        return

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
    scope = _LcarsBoxContext(builder, box_widget, state)
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
) -> Generator[_LcarsSweepContext | _NoOpSweepContext, None, None]:
    """Context manager: compose an lcars_sweep container."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "sweep", id)
    state = _container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)
    if ctx.mode != Mode.BUILD:
        yield _NoOpSweepContext(state)
        return

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
    scope = _LcarsSweepContext(builder, sweep_widget, state)
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
) -> Generator[ContainerState, None, None]:
    """Context manager: compose an lcars_bracket container."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id("bracket", id)
    state = _container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)
    if ctx.mode != Mode.BUILD:
        yield state
        return

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
        yield state


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
) -> Generator[None, None, None]:
    """Context manager: declare a movable window above the page deck.

    Popups are overlay widgets, so they never consume a mosaic cell. Their
    position and size are local UI state; ``lcars.update(id, open=...)`` remains
    the server control for opening or closing them.
    """

    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "popup", id)
    if ctx.mode != Mode.BUILD:
        yield
        return

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
        yield


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
) -> Generator[_LcarsSweepContext | _NoOpSweepContext, None, None]:
    """Phase 13 layout recipe: sweep-led console composition."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "console", id)
    state = _container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)
    if ctx.mode != Mode.BUILD:
        yield _NoOpSweepContext(state)
        return

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
    scope = _LcarsSweepContext(builder, sweep_widget, state)
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
) -> Generator[_LcarsSweepContext | _NoOpSweepContext, None, None]:
    """Phase 13 layout recipe: dense single-column PADD sweep."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "padd", id)
    state = _container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)
    if ctx.mode != Mode.BUILD:
        yield _NoOpSweepContext(state)
        return

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
    scope = _LcarsSweepContext(builder, sweep_widget, state)
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
) -> Generator[_LcarsBoxContext | _NoOpBoxContext, None, None]:
    """Phase 13 layout recipe: full-frame diagnostic container."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "diagnostic", id)
    state = _container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)
    if ctx.mode != Mode.BUILD:
        yield _NoOpBoxContext(state)
        return

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
    scope = _LcarsBoxContext(builder, box_widget, state)
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
) -> Generator[_LcarsBoxContext | _NoOpBoxContext, None, None]:
    """Phase 13 layout recipe: data-focused LCARS box panel."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "data-panel", id)
    state = _container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)
    if ctx.mode != Mode.BUILD:
        yield _NoOpBoxContext(state)
        return

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
    scope = _LcarsBoxContext(builder, box_widget, state)
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
) -> Generator[_LcarsBoxContext | _NoOpBoxContext, None, None]:
    """Phase 13 layout recipe: control-focused panel with right input column default."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title or "control-panel", id)
    state = _container_interaction_state(ctx=ctx, widget_id=widget_id, options=options)
    if ctx.mode != Mode.BUILD:
        yield _NoOpBoxContext(state)
        return

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
    scope = _LcarsBoxContext(builder, box_widget, state)
    with builder.container_context(box_widget, target="right_inputs"):
        yield scope


@contextmanager
def input_column(
    *,
    side: Literal["left", "right"] = "left",
) -> Generator[None, None, None]:
    """Route nested widgets into the nearest enclosing lcars.box() input column."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield
        return

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
    if ctx.mode != Mode.BUILD:
        yield
        return
    if ctx.config.visual_language != "strict":
        yield
        return

    builder = _require_builder(ctx)
    with builder.raw_context():
        yield


@contextmanager
def form(
    label: str,
    action_id: str,
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
) -> Generator[None, None, None]:
    """Context manager: define a grouped form with nested input widgets."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield
        return

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
    with builder.form_context(form_widget):
        yield


# ---------------------------------------------------------------------------
# Knowledge-graph semantic widgets
# ---------------------------------------------------------------------------


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
) -> Generator[None, None, None]:
    """Compose alternative support environments for ``node``."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(title, id)
    if ctx.mode != Mode.BUILD:
        yield
        return
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
        yield


def environments(data: SupportData | dict[str, Any]) -> None:
    """Populate the alternative environments of an enclosing support panel."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    builder = _require_builder(ctx)
    panel = _enclosing_web_panel(builder, "support_panel")
    parsed = data if isinstance(data, SupportData) else SupportData.model_validate(data)
    if parsed.node != panel.data.node:
        raise ValueError(
            f"support environment node {parsed.node!r} does not match panel node "
            f"{panel.data.node!r}"
        )
    panel.data = parsed


def atom_legend() -> None:
    """Show the empirical/formal/assumption legend in a support panel."""
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
        _enclosing_web_panel(_require_builder(ctx), "support_panel").show_atom_legend = True


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
) -> str | None:
    """Render one-hop traversal and return the clicked neighbour id."""
    parsed = data if isinstance(data, FrontierData) else FrontierData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(f"frontier-{parsed.current.id}", id)
    if ctx.mode != Mode.BUILD:
        if ctx.active_action_id != widget_id or not isinstance(ctx.active_action_value, str):
            return None
        allowed = {
            item.id
            for item in parsed.frontier
            if layer_filter is None or item.edge in layer_filter
        }
        return ctx.active_action_value if ctx.active_action_value in allowed else None
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
    return None


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
) -> Generator[None, None, None]:
    """Compose the primary assertion view."""
    parsed = data if isinstance(data, AssertionData) else AssertionData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(parsed.id, id or parsed.id)
    if ctx.mode != Mode.BUILD:
        yield
        return
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
        yield


def context_tags() -> None:
    """Render all context roles on the enclosing assertion card."""
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
        _enclosing_web_panel(_require_builder(ctx), "assertion_card").show_context = True


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
) -> None:
    """Render an empirical or formal evidence anchor."""
    parsed = data if isinstance(data, AnchorData) else AnchorData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(parsed.id, id or parsed.id)
    if ctx.mode != Mode.BUILD:
        return
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
) -> bool:
    """Render YES/NO/UNKNOWN; return true when EXACT escalation is requested."""
    parsed = data if isinstance(data, TriStateData) else TriStateData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(f"{parsed.query}-{parsed.subject}", id)
    if ctx.mode != Mode.BUILD:
        return bool(
            on_escalate
            and ctx.active_action_id == widget_id
            and ctx.active_action_value == on_escalate
        )
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
    return False


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
) -> None:
    """Render an interval constraint, or an explicit unrendered representation."""
    parsed = data if isinstance(data, ConstraintData) else ConstraintData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(f"constraint-{parsed.quantity.id}", id)
    if ctx.mode != Mode.BUILD:
        return
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
) -> Generator[None, None, None]:
    """Compose a missing explanatory bridge and its contenders."""
    parsed = data if isinstance(data, GapData) else GapData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(parsed.id, id or parsed.id)
    if ctx.mode != Mode.BUILD:
        yield
        return
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
        yield


def contender_list() -> None:
    """Render contenders, including the valid empty state, on a gap panel."""
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
        _enclosing_web_panel(_require_builder(ctx), "gap_panel").show_contenders = True


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
) -> str | None:
    """Render commitment choices and return the newly selected id."""
    parsed = data if isinstance(data, CommitmentData) else CommitmentData.model_validate(data)
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id("commitment-selector", id)
    if ctx.mode != Mode.BUILD:
        if ctx.active_action_id != widget_id or not isinstance(ctx.active_action_value, str):
            return None
        available = {option.id for option in parsed.available}
        return ctx.active_action_value if ctx.active_action_value in available else None
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
    return None


# ---------------------------------------------------------------------------
# Display widgets (always return None)
# ---------------------------------------------------------------------------


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
) -> None:
    """Render an LCARS section header widget."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
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


def text(
    content: str,
    *,
    size: Literal["h1", "h2", "body", "mono"] = "body",
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
) -> None:
    """Render a text block."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(content[:30], id)
    builder = _require_builder(ctx)
    widget = Text(
        id=widget_id,
        content=content,
        size=size,
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
) -> None:
    """Render a markdown block."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
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
) -> None:
    """Render a StatusTile metric readout."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
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
) -> AlertState | None:
    """Render an alert banner and return state for server-controlled interactions."""
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    if ctx.mode != Mode.BUILD and (interaction is None or interaction.mode != "server"):
        return None
    widget_id = _resolve_id(message[:30], id)
    state = _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=AlertState(),
    )
    if ctx.mode != Mode.BUILD:
        return state
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
    return state


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
) -> None:
    """Render a progress bar."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
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
) -> ChartState | None:
    """Render a LineChart. data: list[float] | dict[str, list[float]] | pd.DataFrame."""
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    if ctx.mode != Mode.BUILD and (interaction is None or interaction.mode != "server"):
        return None
    widget_id = _resolve_id(title or "chart", id)
    state = _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=ChartState(),
    )
    if ctx.mode != Mode.BUILD:
        return state
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
    return state


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
) -> None:
    """Render a Sparkline."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
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
) -> ChartState | None:
    """Render a live, zoomable OHLC candlestick chart.

    data: list[dict] with time/open/high/low/close(/volume) keys, or a
    pandas DataFrame with Open/High/Low/Close columns and a DatetimeIndex.
    markers: optional list of dicts with time/position/shape/color/text,
    rendered as annotations on the chart (e.g. trade entries/exits).
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    if ctx.mode != Mode.BUILD and (interaction is None or interaction.mode != "server"):
        return None
    widget_id = _resolve_id(title or "candlestick", id)
    state = _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=ChartState(),
    )
    if ctx.mode != Mode.BUILD:
        return state
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
    return state


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
) -> ChartState | None:
    """Render a live, zoomable Renko brick chart computed from a price series.

    data: list[float] | list[dict] (with a "close" or "price" key) | pd.Series
    of prices. Bricks are computed with the given `brick_size`.
    markers: optional list of dicts with time/position/shape/color/text.
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    if ctx.mode != Mode.BUILD and (interaction is None or interaction.mode != "server"):
        return None
    widget_id = _resolve_id(title or "renko", id)
    state = _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=ChartState(),
    )
    if ctx.mode != Mode.BUILD:
        return state
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
    return state


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
) -> None:
    """Render an animated WebGL fragment-shader viewport.

    `fragment_shader` is GLSL ES 1.00 source. It receives `uniform float
    u_time` (seconds since mount), `uniform vec2 u_resolution` (canvas pixels),
    `varying vec2 v_uv` (0..1 UV coordinates), plus any custom `uniforms`.
    """
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
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
) -> None:
    """Render a circular gauge readout."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
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
) -> TableState | None:
    """Render a Table. data: list[list] | list[dict] | pd.DataFrame."""
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    server = interaction is not None and interaction.mode == "server"
    data_server = options is not None and options.data_mode == "server"
    emit = options is not None and options.emit_state_changes
    # Python receives typed state actions whenever the table emits them: explicit
    # opt-in, a server data_mode, or the legacy server interaction shorthand.
    receives_state = emit or data_server or server
    if ctx.mode != Mode.BUILD and not receives_state:
        return None
    widget_id = _resolve_id(title or "table", id)
    pagination = options.pagination if options is not None else None
    selection = options.selection if options is not None else None
    state = _server_interaction_state(
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
    if ctx.mode != Mode.BUILD:
        return state
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
    return state


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
) -> LogState | None:
    """Render a LogViewer.

    When `auto_scroll` is true (the default), the viewer follows new lines as
    long as the reader is already scrolled to the bottom; scrolling up to
    read history disables following until they scroll back down.
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    if ctx.mode != Mode.BUILD and (interaction is None or interaction.mode != "server"):
        return None
    widget_id = _resolve_id(stream_id, id)
    state = _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=LogState(
            levels=options.levels if options is not None else [],
            paused=options.paused if options is not None else False,
            following=auto_scroll,
        ),
    )
    if ctx.mode != Mode.BUILD:
        return state
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
    return state


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
) -> VideoState | None:
    """Render an HLS video player descriptor."""
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    if ctx.mode != Mode.BUILD and (interaction is None or interaction.mode != "server"):
        return None
    widget_id = _resolve_id(title or "video-hls", id)
    state = _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=VideoState(playing=autoplay),
    )
    if ctx.mode != Mode.BUILD:
        return state
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
    return state


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
) -> NodeCanvasState | None:
    """Render an editable node-graph canvas.

    `document` is a :class:`~lcars_ui.widgets.graph.GraphDocument` (or a dict in
    the same shape) declaring the node templates available and the graph as it
    currently stands. `execution` carries run status and is kept separate from
    the document so status can stream in while the user is editing.

    Returns the edited graph, the current selection and the last event when
    ``options.interaction.mode == "server"``, otherwise ``None``. State arrives
    at transaction boundaries — a drag ending, a connection completing, a field
    committing — not continuously while the pointer moves.

    Running a graph is the application's job: the library emits ``run``,
    ``queue`` and ``cancel`` events with the current graph and does not execute
    anything itself.
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    if ctx.mode != Mode.BUILD and (interaction is None or interaction.mode != "server"):
        return None
    widget_id = _resolve_id(title or "node-canvas", id)
    parsed = (
        document if isinstance(document, GraphDocument) else GraphDocument.model_validate(document)
    )
    state = _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=NodeCanvasState(document=parsed),
    )
    if ctx.mode != Mode.BUILD:
        return state
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
    return state


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
) -> ThreeSceneState | None:
    """Render a managed Three.js viewport driven by a project scene module.

    `module` is a path relative to the app's ``assets_dir`` (see
    :func:`lcars_ui.run`), served from ``/lcars/assets/``. The module
    default-exports ``setup(context)``; LCARS owns the canvas, camera, controls,
    frame loop and disposal, and hands the module a scene to populate.

    `props` is JSON-serializable data delivered to that ``setup`` call and to a
    later ``updateProps``, so the scene can be re-configured from Python without
    being torn down.

    Returns camera pose and the last module-emitted event when
    ``options.interaction.mode == "server"``, otherwise ``None``.
    """
    ctx = _get_or_init_ctx()
    interaction = options.interaction if options is not None else None
    if ctx.mode != Mode.BUILD and (interaction is None or interaction.mode != "server"):
        return None
    widget_id = _resolve_id(title or "three-scene", id)
    state = _server_interaction_state(
        ctx=ctx,
        widget_id=widget_id,
        interaction=interaction,
        default=ThreeSceneState(),
    )
    if ctx.mode != Mode.BUILD:
        return state
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
    return state


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
) -> MicResult | None:
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
    if ctx.mode != Mode.BUILD:
        if ctx.active_action_id != action_id or not isinstance(ctx.active_action_value, dict):
            return None
        try:
            return MicResult.model_validate(ctx.active_action_value)
        except ValidationError:
            return None
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
    return None


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
) -> list[UploadedFile]:
    """Render a drag/drop file uploader and return files during its HANDLE rerun.

    The built-in endpoint keeps payloads in memory only for the action dispatch;
    callers should consume or persist ``UploadedFile.data`` immediately.
    """

    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    effective_action_id = action_id or widget_id

    if ctx.mode != Mode.BUILD:
        if ctx.active_action_id != effective_action_id:
            return []
        raw_value = ctx.active_action_value
        raw_files = raw_value.get("files") if isinstance(raw_value, dict) else None
        if not isinstance(raw_files, list):
            return []
        uploaded: list[UploadedFile] = []
        for raw_file in raw_files:
            try:
                uploaded.append(UploadedFile.model_validate(raw_file))
            except ValidationError:
                continue
        return uploaded

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
    return []


# ---------------------------------------------------------------------------
# Input widgets (return current value)
# ---------------------------------------------------------------------------


def button(
    label: str,
    *,
    color: str | None = None,
    id: str | None = None,
    options: ButtonOptions | None = None,
    hint: str | Hint | None = None,
    zone: ZoneHint | None = None,
    span: tuple[int, int] | None = None,
    weight: int | None = None,
    aspect: PanelAspect | None = None,
    group: str | None = None,
    disabled: bool = False,
    visible: bool = True,
) -> bool:
    """Render a button. Returns True only in the rerun triggered by this click."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        widget = Button(
            id=widget_id,
            label=label,
            color=color,
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
        return False

    return widget_id == ctx.active_action_id


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
) -> bool:
    """Render a toggle. Returns current bool state."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    session_state = _get_session_store(ctx)
    stored: bool = bool(session_state.get(widget_id, value))

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        widget = Toggle(
            id=widget_id,
            label=label,
            color=color,
            checked=stored,
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
        return stored

    if widget_id == ctx.active_action_id:
        new_val = bool(ctx.active_action_value)
        session_state[widget_id] = new_val
        return new_val
    return stored


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
) -> bool:
    """Render a checkbox. Returns current bool state."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    session_state = _get_session_store(ctx)
    stored: bool = bool(session_state.get(widget_id, value))

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        widget = Checkbox(
            id=widget_id,
            label=label,
            color=color,
            checked=stored,
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
        return stored

    if widget_id == ctx.active_action_id:
        new_val = bool(ctx.active_action_value)
        session_state[widget_id] = new_val
        return new_val
    return stored


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
) -> str | list[str]:
    """Render a select dropdown. Returns current selected value."""
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
    session_state = _get_session_store(ctx)
    raw_stored = session_state.get(widget_id, default)
    stored: str | list[str]
    if multiple:
        stored = [str(item) for item in raw_stored] if isinstance(raw_stored, list) else []
    else:
        stored = str(raw_stored)

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        widget = Select(
            id=widget_id,
            label=label,
            color=color,
            options=select_options,
            value=stored,
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
        return stored

    if widget_id == ctx.active_action_id:
        if multiple:
            new_val: str | list[str] = (
                [str(item) for item in ctx.active_action_value]
                if isinstance(ctx.active_action_value, list)
                else stored
            )
        else:
            new_val = (
                str(ctx.active_action_value) if ctx.active_action_value is not None else stored
            )
        session_state[widget_id] = new_val
        return new_val
    return stored


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
) -> str:
    """Render a radio button group. Returns current selected value."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    radio_options = _normalize_choice_options(options)
    default = value if value is not None else (radio_options[0].value if radio_options else "")
    session_state = _get_session_store(ctx)
    stored: str = str(session_state.get(widget_id, default))

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        widget = Radio(
            id=widget_id,
            label=label,
            color=color,
            options=radio_options,
            value=stored,
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
        return stored

    if widget_id == ctx.active_action_id:
        new_val = str(ctx.active_action_value) if ctx.active_action_value is not None else stored
        session_state[widget_id] = new_val
        return new_val
    return stored


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
) -> str:
    """Render a segmented radio toggle group. Returns current selected value."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    toggle_options = _normalize_choice_options(options)
    default = value if value is not None else (toggle_options[0].value if toggle_options else "")
    session_state = _get_session_store(ctx)
    stored: str = str(session_state.get(widget_id, default))

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        widget = RadioToggle(
            id=widget_id,
            label=label,
            color=color,
            options=toggle_options,
            value=stored,
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
        return stored

    if widget_id == ctx.active_action_id:
        new_val = str(ctx.active_action_value) if ctx.active_action_value is not None else stored
        session_state[widget_id] = new_val
        return new_val
    return stored


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
) -> str:
    """Render a text input. Returns current text value.

    Set ``autocomplete=False`` to suppress the browser's autocomplete/history
    dropdown — useful for command-style inputs where suggestions from prior
    entries are noise rather than help.
    """
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    session_state = _get_session_store(ctx)
    stored: str = str(session_state.get(widget_id, value))

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        widget = TextInput(
            id=widget_id,
            label=label,
            placeholder=placeholder or None,
            password=password,
            autocomplete=autocomplete,
            value=stored,
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
        return stored

    if widget_id == ctx.active_action_id:
        new_val = str(ctx.active_action_value) if ctx.active_action_value is not None else stored
        session_state[widget_id] = new_val
        return new_val
    return stored


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
) -> float:
    """Render a numeric input. Returns current float value."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    session_state = _get_session_store(ctx)

    raw_stored = session_state.get(widget_id, value)
    try:
        stored = float(raw_stored)
    except (TypeError, ValueError):
        stored = float(value)

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        widget = NumberInput(
            id=widget_id,
            label=label,
            value=stored,
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
        return stored

    if widget_id == ctx.active_action_id:
        try:
            new_val = float(ctx.active_action_value)
        except (TypeError, ValueError):
            new_val = stored

        if min is not None and new_val < min:
            new_val = min
        if max is not None and new_val > max:
            new_val = max

        session_state[widget_id] = new_val
        return new_val

    return stored


# ---------------------------------------------------------------------------
# Effects (only meaningful in HANDLE / LIVE mode)
# ---------------------------------------------------------------------------


def update(widget_id: str, **kwargs: Any) -> None:
    """Publish a widget_update event (HANDLE/LIVE only; no-op in BUILD)."""
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
        return
    envelope = make_envelope(
        "widget_update",
        WidgetUpdatePayload(id=widget_id, data=kwargs),
    )
    ctx.pending_events.append(envelope)


def show_hint(widget_id: str) -> None:
    """Open a widget's hint from Python (HANDLE/LIVE only; no-op in BUILD).

    Only meaningful for hints declared with ``trigger="manual"``.
    """
    update(widget_id, hint={"open": True})


def hide_hint(widget_id: str) -> None:
    """Close a widget's hint from Python (HANDLE/LIVE only; no-op in BUILD)."""
    update(widget_id, hint={"open": False})


def notify(
    message: str,
    *,
    level: Literal["info", "success", "warning", "error"] = "info",
    title: str | None = None,
    duration_ms: int | None = None,
    dismissible: bool = True,
    movable: bool = True,
) -> None:
    """Publish a configurable notification event (HANDLE/LIVE only)."""
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
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
    ctx.pending_events.append(envelope)


def append_log(stream_id: str, *lines: str) -> None:
    """Publish a log_chunk event (HANDLE/LIVE only; no-op in BUILD)."""
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
        return
    envelope = make_envelope(
        "log_chunk",
        LogChunkPayload(stream_id=stream_id, lines=list(lines)),
    )
    ctx.pending_events.append(envelope)


def set_alert_condition(level: Literal["normal", "yellow", "red"]) -> None:
    """Set the shipwide alert condition live (HANDLE/LIVE only; no-op in BUILD).

    Patches ``meta.alert_condition`` so connected clients re-tint the whole UI —
    e.g. a button handler calling ``lcars.set_alert_condition("red")`` flashes the
    entire console to red alert in real time.
    """
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
        return
    envelope = make_envelope(
        "manifest_update",
        ManifestUpdatePayload(path="meta.alert_condition", value=level),
    )
    ctx.pending_events.append(envelope)


def set_theme(theme: Literal["galaxy", "nemesis", "tng"]) -> None:
    """Switch the active theme live (HANDLE/LIVE only; no-op in BUILD).

    Patches ``meta.theme`` so connected clients re-tint the palette without a
    reload.
    """
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
        return
    envelope = make_envelope(
        "manifest_update",
        ManifestUpdatePayload(path="meta.theme", value=theme),
    )
    ctx.pending_events.append(envelope)


__all__ = [
    "config",
    "run",
    "live",
    "nav",
    "page",
    "row",
    "col",
    "columns",
    "section",
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
