"""Public lcars.* DSL functions.

All functions read from / write to the thread-local _LCARSContext.
In BUILD mode they declare widgets and return defaults.
In HANDLE mode they return current widget values and enqueue events.
"""

from __future__ import annotations

import asyncio
import threading
import warnings
import webbrowser
from collections.abc import Callable, Generator
from contextlib import contextmanager
from typing import Any, Literal

from lcars_ui.core.models import SidebarSegment
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
from lcars_ui.widgets.containers import LcarsBox, LcarsBracket, LcarsHeader, LcarsSweep
from lcars_ui.widgets.data import Candlestick, Gauge, LineChart, Renko, Shader, Sparkline, Table
from lcars_ui.widgets.inputs import (
    Button,
    Checkbox,
    Form,
    NumberInput,
    Radio,
    RadioToggle,
    Select,
    SelectOption,
    TextInput,
    Toggle,
)
from lcars_ui.widgets.media import LogViewer, MicButton, VideoHls
from lcars_ui.widgets.primitives import Alert, Markdown, ProgressBar, StatusTile, Text

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Adaptive-layout placement hint (override for the renderer's auto-placement)
ZoneHint = Literal["primary", "side", "readout", "dock", "rail", "full"]

# Registry for @lcars.live decorated functions
_live_fn: Callable[[], None] | None = None
_live_interval: float = 5.0
_STRICT_COLUMN_MIN_WIDTH = 48
_STRICT_COLUMN_MAX_WIDTH = 150


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
        visual_language=visual_language,
        strict_renderer=strict_renderer,
    )


def run(
    ui_fn: Callable[[], None],
    *,
    host: str = "127.0.0.1",
    port: int = 8000,
    open_browser: bool = True,
) -> None:
    """Build the manifest from ui_fn, start uvicorn, open the browser."""
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
    fastapi_app = create_app(manifest=manifest)
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
) -> Generator[None, None, None]:
    """Context manager: declare a named page.

    ``layout`` selects the adaptive LCARS archetype: ``auto`` lets the renderer
    choose by content, or pin ``console`` / ``telemetry`` / ``grid`` / ``menu``.
    """
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield
        return
    builder = _require_builder(ctx)
    page_id = id or auto_id(title, ctx.registered_ids)
    with builder.page_context(title, page_id, archetype=layout):
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
    def __init__(self, builder: _ManifestBuilder, widget: LcarsBox) -> None:
        self._builder = builder
        self._widget = widget

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
    def __init__(self, builder: _ManifestBuilder, widget: LcarsSweep) -> None:
        self._builder = builder
        self._widget = widget

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
    zone: ZoneHint | None = None,
) -> Generator[_LcarsBoxContext | _NoOpBoxContext, None, None]:
    """Context manager: compose an lcars_box container."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield _NoOpBoxContext()
        return

    widget_id = _resolve_id(title or "box", id)
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
    )
    box_widget.zone = zone
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
    zone: ZoneHint | None = None,
) -> Generator[_LcarsSweepContext | _NoOpSweepContext, None, None]:
    """Context manager: compose an lcars_sweep container."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield _NoOpSweepContext()
        return

    widget_id = _resolve_id(title or "sweep", id)
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
    )
    sweep_widget.zone = zone
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
    zone: ZoneHint | None = None,
) -> Generator[None, None, None]:
    """Context manager: compose an lcars_bracket container."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield
        return

    widget_id = _resolve_id("bracket", id)
    builder = _require_builder(ctx)
    bracket_widget = LcarsBracket(
        id=widget_id,
        color=color,
        orientation=orientation,
        children=[],
    )
    bracket_widget.zone = zone
    builder.add_widget(bracket_widget)
    with builder.container_context(bracket_widget, target="children"):
        yield


@contextmanager
def console(
    title: str,
    *,
    color: str = "orange",
    id: str | None = None,
    zone: ZoneHint | None = None,
) -> Generator[_LcarsSweepContext | _NoOpSweepContext, None, None]:
    """Phase 13 layout recipe: sweep-led console composition."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield _NoOpSweepContext()
        return

    widget_id = _resolve_id(title or "console", id)
    builder = _require_builder(ctx)
    sweep_widget = make_console_sweep(widget_id=widget_id, title=title, color=color)
    sweep_widget.zone = zone
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
    zone: ZoneHint | None = None,
) -> Generator[_LcarsSweepContext | _NoOpSweepContext, None, None]:
    """Phase 13 layout recipe: dense single-column PADD sweep."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield _NoOpSweepContext()
        return

    widget_id = _resolve_id(title or "padd", id)
    builder = _require_builder(ctx)
    sweep_widget = make_padd_sweep(widget_id=widget_id, title=title, color=color)
    sweep_widget.zone = zone
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
    zone: ZoneHint | None = None,
) -> Generator[_LcarsBoxContext | _NoOpBoxContext, None, None]:
    """Phase 13 layout recipe: full-frame diagnostic container."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield _NoOpBoxContext()
        return

    widget_id = _resolve_id(title or "diagnostic", id)
    builder = _require_builder(ctx)
    box_widget = make_diagnostic_box(widget_id=widget_id, title=title, color=color)
    box_widget.zone = zone
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
    zone: ZoneHint | None = None,
) -> Generator[_LcarsBoxContext | _NoOpBoxContext, None, None]:
    """Phase 13 layout recipe: data-focused LCARS box panel."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield _NoOpBoxContext()
        return

    widget_id = _resolve_id(title or "data-panel", id)
    builder = _require_builder(ctx)
    box_widget = make_data_panel_box(widget_id=widget_id, title=title, color=color)
    box_widget.zone = zone
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
    zone: ZoneHint | None = None,
) -> Generator[_LcarsBoxContext | _NoOpBoxContext, None, None]:
    """Phase 13 layout recipe: control-focused panel with right input column default."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield _NoOpBoxContext()
        return

    widget_id = _resolve_id(title or "control-panel", id)
    builder = _require_builder(ctx)
    box_widget = make_control_panel_box(widget_id=widget_id, title=title, color=color)
    box_widget.zone = zone
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
    )
    builder.add_widget(form_widget)
    with builder.form_context(form_widget):
        yield


# ---------------------------------------------------------------------------
# Display widgets (always return None)
# ---------------------------------------------------------------------------


def header(
    text_value: str,
    *,
    size: Literal["h1", "h2", "h3", "h4", "h5", "h6"] = "h2",
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render an LCARS section header widget."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(text_value, id)
    builder = _require_builder(ctx)
    builder.add_widget(
        LcarsHeader(
            id=widget_id,
            text=text_value,
            size=size,
            color=(color or "orange"),
        )
    )


def text(
    content: str,
    *,
    size: Literal["h1", "h2", "body", "mono"] = "body",
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render a text block."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(content[:30], id)
    builder = _require_builder(ctx)
    builder.add_widget(Text(id=widget_id, content=content, size=size, color=color))


def markdown(
    content: str,
    *,
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render a markdown block."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id("markdown", id)
    builder = _require_builder(ctx)
    builder.add_widget(Markdown(id=widget_id, content=content, color=color))


def metric(
    label: str,
    value: str,
    *,
    status: Literal["ok", "warn", "crit"] = "ok",
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render a StatusTile metric readout."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    builder.add_widget(
        StatusTile(id=widget_id, label=label, value=value, status=status, color=color)
    )


def alert(
    message: str,
    *,
    level: Literal["red", "yellow"] = "yellow",
    blink: bool = False,
    id: str | None = None,
) -> None:
    """Render an alert banner."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(message[:30], id)
    builder = _require_builder(ctx)
    builder.add_widget(Alert(id=widget_id, message=message, severity=level, blink=blink))


def progress(
    label: str,
    value: float,
    *,
    color: str | None = None,
    show_label: bool = True,
    id: str | None = None,
) -> None:
    """Render a progress bar."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    builder.add_widget(
        ProgressBar(
            id=widget_id,
            label=label,
            value=float(value),
            color=color,
            show_label=show_label,
        )
    )


def chart(
    data: Any,
    *,
    title: str | None = None,
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render a LineChart. data: list[float] | dict[str, list[float]] | pd.DataFrame."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(title or "chart", id)
    series, x_labels = _to_series_and_labels(data)
    builder = _require_builder(ctx)
    builder.add_widget(
        LineChart(id=widget_id, label=title, series=series, x_labels=x_labels, color=color)
    )


def sparkline(
    data: Any,
    *,
    title: str | None = None,
    id: str | None = None,
) -> None:
    """Render a Sparkline."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(title or "sparkline", id)
    series, x_labels = _to_series_and_labels(data)
    builder = _require_builder(ctx)
    builder.add_widget(Sparkline(id=widget_id, label=title, series=series, x_labels=x_labels))


def candlestick(
    data: Any,
    *,
    title: str | None = None,
    markers: list[dict[str, Any]] | None = None,
    up_color: str | None = None,
    down_color: str | None = None,
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render a live, zoomable OHLC candlestick chart.

    data: list[dict] with time/open/high/low/close(/volume) keys, or a
    pandas DataFrame with Open/High/Low/Close columns and a DatetimeIndex.
    markers: optional list of dicts with time/position/shape/color/text,
    rendered as annotations on the chart (e.g. trade entries/exits).
    """
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(title or "candlestick", id)
    builder = _require_builder(ctx)
    builder.add_widget(
        Candlestick(
            id=widget_id,
            label=title,
            data=_to_ohlc_data(data),
            markers=_to_chart_markers(markers),
            up_color=up_color,
            down_color=down_color,
            color=color,
        )
    )


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
) -> None:
    """Render a live, zoomable Renko brick chart computed from a price series.

    data: list[float] | list[dict] (with a "close" or "price" key) | pd.Series
    of prices. Bricks are computed with the given `brick_size`.
    markers: optional list of dicts with time/position/shape/color/text.
    """
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(title or "renko", id)
    builder = _require_builder(ctx)
    builder.add_widget(
        Renko(
            id=widget_id,
            label=title,
            data=_to_renko_bricks(data, brick_size),
            markers=_to_chart_markers(markers),
            up_color=up_color,
            down_color=down_color,
            color=color,
        )
    )


def shader(
    fragment_shader: str,
    *,
    title: str | None = None,
    uniforms: dict[str, float | list[float]] | None = None,
    aspect_ratio: float | None = None,
    color: str | None = None,
    id: str | None = None,
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
    builder.add_widget(
        Shader(
            id=widget_id,
            label=title,
            fragment_shader=fragment_shader,
            uniforms=uniforms or {},
            aspect_ratio=aspect_ratio,
            color=color,
        )
    )


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
) -> None:
    """Render a circular gauge readout."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(label, id)
    builder = _require_builder(ctx)
    builder.add_widget(
        Gauge(
            id=widget_id,
            label=label,
            value=float(value),
            min=float(min),
            max=float(max),
            unit=unit,
            color=color,
            warn_threshold=warn_threshold,
            crit_threshold=crit_threshold,
        )
    )


def table(
    data: Any,
    *,
    title: str | None = None,
    id: str | None = None,
) -> None:
    """Render a Table. data: list[list] | list[dict] | pd.DataFrame."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(title or "table", id)
    headers, rows = _to_table_data(data)
    builder = _require_builder(ctx)
    builder.add_widget(Table(id=widget_id, label=title, headers=headers, rows=rows))


def log(
    stream_id: str,
    *,
    max_lines: int = 1000,
    title: str | None = None,
    id: str | None = None,
) -> None:
    """Render a LogViewer."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(stream_id, id)
    builder = _require_builder(ctx)
    builder.add_widget(
        LogViewer(id=widget_id, label=title, stream_id=stream_id, max_lines=max_lines)
    )


def video_hls(
    src: str,
    *,
    title: str | None = None,
    autoplay: bool = False,
    muted: bool = False,
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render an HLS video player descriptor."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(title or "video-hls", id)
    builder = _require_builder(ctx)
    builder.add_widget(
        VideoHls(
            id=widget_id,
            label=title,
            src=src,
            autoplay=autoplay,
            muted=muted,
            color=color,
        )
    )


def mic_button(
    action_id: str,
    *,
    title: str | None = None,
    upload_url: str = "/lcars/upload/audio",
    timeout_ms: int = 5000,
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render a microphone capture action button."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(title or action_id, id)
    builder = _require_builder(ctx)
    builder.add_widget(
        MicButton(
            id=widget_id,
            label=title,
            upload_url=upload_url,
            action_id=action_id,
            timeout_ms=timeout_ms,
            color=color,
        )
    )


# ---------------------------------------------------------------------------
# Input widgets (return current value)
# ---------------------------------------------------------------------------


def button(
    label: str,
    *,
    color: str | None = None,
    id: str | None = None,
) -> bool:
    """Render a button. Returns True only in the rerun triggered by this click."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        builder.add_widget(Button(id=widget_id, label=label, color=color, action_id=widget_id))
        return False

    return widget_id == ctx.active_action_id


def toggle(
    label: str,
    *,
    value: bool = False,
    color: str | None = None,
    id: str | None = None,
) -> bool:
    """Render a toggle. Returns current bool state."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    session_state = _get_session_store(ctx)
    stored: bool = bool(session_state.get(widget_id, value))

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        builder.add_widget(
            Toggle(id=widget_id, label=label, color=color, checked=stored, action_id=widget_id)
        )
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
) -> bool:
    """Render a checkbox. Returns current bool state."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    session_state = _get_session_store(ctx)
    stored: bool = bool(session_state.get(widget_id, value))

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        builder.add_widget(
            Checkbox(
                id=widget_id,
                label=label,
                color=color,
                checked=stored,
                action_id=widget_id,
            )
        )
        return stored

    if widget_id == ctx.active_action_id:
        new_val = bool(ctx.active_action_value)
        session_state[widget_id] = new_val
        return new_val
    return stored


def select(
    label: str,
    options: list[str],
    *,
    value: str | None = None,
    color: str | None = None,
    id: str | None = None,
) -> str:
    """Render a select dropdown. Returns current selected value."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    default = value if value is not None else (options[0] if options else "")
    session_state = _get_session_store(ctx)
    stored: str = str(session_state.get(widget_id, default))

    select_options = [SelectOption(label=o, value=o) for o in options]

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        builder.add_widget(
            Select(
                id=widget_id,
                label=label,
                color=color,
                options=select_options,
                value=stored,
                action_id=widget_id,
            )
        )
        return stored

    if widget_id == ctx.active_action_id:
        new_val = str(ctx.active_action_value) if ctx.active_action_value is not None else stored
        session_state[widget_id] = new_val
        return new_val
    return stored


def radio(
    label: str,
    options: list[str],
    *,
    value: str | None = None,
    color: str | None = None,
    id: str | None = None,
) -> str:
    """Render a radio button group. Returns current selected value."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    default = value if value is not None else (options[0] if options else "")
    session_state = _get_session_store(ctx)
    stored: str = str(session_state.get(widget_id, default))

    radio_options = [SelectOption(label=o, value=o) for o in options]

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        builder.add_widget(
            Radio(
                id=widget_id,
                label=label,
                color=color,
                options=radio_options,
                value=stored,
                action_id=widget_id,
            )
        )
        return stored

    if widget_id == ctx.active_action_id:
        new_val = str(ctx.active_action_value) if ctx.active_action_value is not None else stored
        session_state[widget_id] = new_val
        return new_val
    return stored


def radio_toggle(
    label: str,
    options: list[str],
    *,
    value: str | None = None,
    color: str | None = None,
    id: str | None = None,
) -> str:
    """Render a segmented radio toggle group. Returns current selected value."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    default = value if value is not None else (options[0] if options else "")
    session_state = _get_session_store(ctx)
    stored: str = str(session_state.get(widget_id, default))

    toggle_options = [SelectOption(label=o, value=o) for o in options]

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        builder.add_widget(
            RadioToggle(
                id=widget_id,
                label=label,
                color=color,
                options=toggle_options,
                value=stored,
                action_id=widget_id,
            )
        )
        return stored

    if widget_id == ctx.active_action_id:
        new_val = str(ctx.active_action_value) if ctx.active_action_value is not None else stored
        session_state[widget_id] = new_val
        return new_val
    return stored


def text_input(
    label: str,
    *,
    placeholder: str = "",
    password: bool = False,
    id: str | None = None,
) -> str:
    """Render a text input. Returns current text value."""
    ctx = _get_or_init_ctx()
    widget_id = _resolve_id(label, id)
    session_state = _get_session_store(ctx)
    stored: str = str(session_state.get(widget_id, ""))

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        builder.add_widget(
            TextInput(
                id=widget_id,
                label=label,
                placeholder=placeholder or None,
                password=password,
                value=stored,
            )
        )
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
    id: str | None = None,
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
        builder.add_widget(
            NumberInput(
                id=widget_id,
                label=label,
                value=stored,
                min=min,
                max=max,
                step=step,
                placeholder=placeholder,
            )
        )
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


def notify(message: str, *, level: Literal["info", "error"] = "info") -> None:
    """Publish a notification event (HANDLE/LIVE only; no-op in BUILD)."""
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
        return
    envelope = make_envelope(
        "notification",
        NotificationPayload(message=message, level=level),
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
