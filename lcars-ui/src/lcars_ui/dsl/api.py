"""Public lcars.* DSL functions.

All functions read from / write to the thread-local _LCARSContext.
In BUILD mode they declare widgets and return defaults.
In HANDLE mode they return current widget values and enqueue events.
"""

from __future__ import annotations

import asyncio
import threading
import webbrowser
from collections.abc import Callable, Generator
from contextlib import contextmanager
from typing import Any

from lcars_ui.dsl._adapters import _to_series_and_labels, _to_table_data
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import (
    Mode,
    _Config,
    _LCARSContext,
    _widget_state,
    auto_id,
    get_ctx,
    set_ctx,
)
from lcars_ui.server.events import (
    LogChunkPayload,
    NotificationPayload,
    WidgetUpdatePayload,
    make_envelope,
)
from lcars_ui.widgets.data import LineChart, Sparkline, Table
from lcars_ui.widgets.inputs import Button, Select, SelectOption, TextInput, Toggle
from lcars_ui.widgets.media import LogViewer
from lcars_ui.widgets.primitives import Alert, StatusTile, Text

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Registry for @lcars.live decorated functions
_live_fn: Callable[[], None] | None = None
_live_interval: float = 5.0

# NOTE: _widget_state is intentionally a module-level dict (imported from _state).
# It is NOT thread-safe for concurrent action reruns from multiple browser sessions.
# The DSL rerun model is designed for single-user dashboards. Multi-user scenarios
# require a session-keyed state store (out of scope for Phase 6).


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
    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder(), config=pre_run_config)
    set_ctx(build_ctx)
    ui_fn()

    assert build_ctx.builder is not None
    manifest = build_ctx.builder.build(build_ctx.config)

    # --- Wire up DSL action handler ---
    fastapi_app = create_app(manifest=manifest)
    event_bus = fastapi_app.state.event_bus

    async def _dsl_action_handler(action_id: str, value: Any) -> None:
        handle_ctx = _LCARSContext(
            mode=Mode.HANDLE,
            active_action_id=action_id,
            active_action_value=value,
            config=build_ctx.config,
            builder=_ManifestBuilder(),
        )
        set_ctx(handle_ctx)
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
    if open_browser:
        url = f"http://{host}:{port}"
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
# Navigation / pages
# ---------------------------------------------------------------------------


def nav(
    label: str,
    *,
    page: str | None = None,
    color: str | None = None,
) -> None:
    """Add a sidebar navigation item."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    builder = _require_builder(ctx)
    target = page or auto_id(label, ctx.registered_ids)
    item_id = f"nav-{target}"
    builder.add_sidebar_item(
        item_id=item_id,
        label=label,
        target_page=target,
        color=color,
    )


@contextmanager
def page(
    title: str,
    *,
    id: str | None = None,
) -> Generator[None, None, None]:
    """Context manager: declare a named page."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        yield
        return
    builder = _require_builder(ctx)
    page_id = id or auto_id(title, ctx.registered_ids)
    with builder.page_context(title, page_id):
        yield


def columns(widths: list[str]) -> list[Any]:
    """Declare a multi-column layout row; returns list of context managers."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        # Return dummy context managers in HANDLE/LIVE modes
        return [_NoOpColumnContext() for _ in widths]
    return _require_builder(ctx).add_columns(widths)


class _NoOpColumnContext:
    def __enter__(self) -> _NoOpColumnContext:
        return self

    def __exit__(self, *_: Any) -> None:
        pass


# ---------------------------------------------------------------------------
# Display widgets (always return None)
# ---------------------------------------------------------------------------


def text(
    content: str,
    *,
    size: str = "body",
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render a text block."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(content[:30], id)
    builder = _require_builder(ctx)
    builder.add_widget(
        Text(id=widget_id, content=content, size=size, color=color)  # type: ignore[arg-type]
    )


def metric(
    label: str,
    value: str,
    *,
    status: str = "ok",
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
        StatusTile(id=widget_id, label=label, value=value, status=status, color=color)  # type: ignore[arg-type]
    )


def alert(
    message: str,
    *,
    level: str = "yellow",
    blink: bool = False,
    id: str | None = None,
) -> None:
    """Render an alert banner."""
    ctx = _get_or_init_ctx()
    if ctx.mode != Mode.BUILD:
        return
    widget_id = _resolve_id(message[:30], id)
    builder = _require_builder(ctx)
    builder.add_widget(
        Alert(id=widget_id, message=message, severity=level, blink=blink)  # type: ignore[arg-type]
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
        LineChart(id=widget_id, label=title, series=series, x_labels=x_labels, color=color)  # type: ignore[arg-type]
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
    builder.add_widget(
        Sparkline(id=widget_id, label=title, series=series, x_labels=x_labels)
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
    builder.add_widget(
        Table(id=widget_id, label=title, headers=headers, rows=rows)
    )


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
        builder.add_widget(
            Button(id=widget_id, label=label, color=color, action_id=widget_id)  # type: ignore[arg-type]
        )
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
    stored: bool = bool(_widget_state.get(widget_id, value))

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        builder.add_widget(
            Toggle(id=widget_id, label=label, color=color, checked=stored, action_id=widget_id)  # type: ignore[arg-type]
        )
        return stored

    if widget_id == ctx.active_action_id:
        new_val = bool(ctx.active_action_value)
        _widget_state[widget_id] = new_val
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
    stored: str = str(_widget_state.get(widget_id, default))

    select_options = [SelectOption(label=o, value=o) for o in options]

    if ctx.mode == Mode.BUILD:
        builder = _require_builder(ctx)
        builder.add_widget(
            Select(
                id=widget_id,
                label=label,
                color=color,  # type: ignore[arg-type]
                options=select_options,
                value=stored,
                action_id=widget_id,
            )
        )
        return stored

    if widget_id == ctx.active_action_id:
        new_val = str(ctx.active_action_value) if ctx.active_action_value is not None else stored
        _widget_state[widget_id] = new_val
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
    stored: str = str(_widget_state.get(widget_id, ""))

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
        _widget_state[widget_id] = new_val
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


def notify(message: str, *, level: str = "info") -> None:
    """Publish a notification event (HANDLE/LIVE only; no-op in BUILD)."""
    ctx = _get_or_init_ctx()
    if ctx.mode == Mode.BUILD:
        return
    envelope = make_envelope(
        "notification",
        NotificationPayload(message=message, level=level),  # type: ignore[arg-type]
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


__all__ = [
    "config",
    "run",
    "live",
    "nav",
    "page",
    "columns",
    "text",
    "metric",
    "alert",
    "chart",
    "sparkline",
    "table",
    "log",
    "button",
    "toggle",
    "select",
    "text_input",
    "update",
    "notify",
    "append_log",
]
