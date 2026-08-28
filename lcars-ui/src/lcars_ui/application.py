"""Application-owned runtime state and service lifecycles."""

from __future__ import annotations

import asyncio
import inspect
from collections.abc import Awaitable, Callable, Iterator
from contextlib import (
    AbstractAsyncContextManager,
    AbstractContextManager,
    AsyncExitStack,
    contextmanager,
)
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Generic, Literal, TypeVar, cast, get_type_hints

from lcars_ui.server.events import Envelope
from lcars_ui.server.stream import ConnectionManager, EventBus

if TYPE_CHECKING:
    from lcars_ui.core.models import Manifest
    from lcars_ui.testing import TestClient

ServiceScope = Literal["app", "session"]
LiveAudience = Literal["session", "all"]
LiveJob = tuple[Callable[[], Any], float, LiveAudience]
ServiceFactory = Callable[[], object | Awaitable[object]]
ActionHandler = Callable[..., Awaitable[None] | None]
RegisteredHandler = Callable[..., Any]
PageFunction = Callable[[], None]
T = TypeVar("T")
ThemeName = Literal[
    "galaxy",
    "nemesis",
    "tng",
    "outpost",
    "cardassian",
    "klingon",
    "romulan",
    "ferengi",
    "gruvbox",
]


@dataclass
class ActionContext(Generic[T]):
    """Context passed to explicit action and session-start handlers.

    Effects are collected on ``pending_events`` and published through the
    application's existing broadcast event bus after the handler returns.
    """

    session_id: str
    action_id: str
    value: T
    pending_events: list[Envelope] = field(default_factory=list, init=False)
    _app: App | None = field(default=None, init=False, repr=False)
    _effect_context: Any = field(default=None, init=False, repr=False)

    @property
    def id(self) -> str:
        """Return the action id (a concise alias for ``action_id``)."""
        return self.action_id

    def _bind_effects(self, app: App, effect_context: Any) -> None:
        self._app = app
        self._effect_context = effect_context

    def _emit(self, effect: Callable[..., None], *args: Any, **kwargs: Any) -> None:
        if self._app is None or self._effect_context is None:
            raise RuntimeError(
                "ActionContext effects are only available while a handler is running"
            )
        with self._app._activate_context(self._effect_context):
            effect(*args, **kwargs)

    def update(self, widget_id: str, **kwargs: Any) -> None:
        """Queue a widget update using the ordinary DSL effect implementation."""
        from lcars_ui.dsl.api import update  # noqa: PLC0415

        self._emit(update, widget_id, **kwargs)

    def notify(
        self,
        message: str,
        *,
        level: Literal["info", "success", "warning", "error"] = "info",
        title: str | None = None,
        duration_ms: int | None = None,
        dismissible: bool = True,
        movable: bool = True,
    ) -> None:
        """Queue a notification using the ordinary DSL effect implementation."""
        from lcars_ui.dsl.api import notify  # noqa: PLC0415

        self._emit(
            notify,
            message,
            level=level,
            title=title,
            duration_ms=duration_ms,
            dismissible=dismissible,
            movable=movable,
        )

    def append_log(self, stream_id: str, *lines: str) -> None:
        """Queue log lines using the ordinary DSL effect implementation."""
        from lcars_ui.dsl.api import append_log  # noqa: PLC0415

        self._emit(append_log, stream_id, *lines)

    def set_theme(self, theme: ThemeName) -> None:
        """Queue a theme change using the ordinary DSL effect implementation."""
        from lcars_ui.dsl.api import set_theme  # noqa: PLC0415

        self._emit(set_theme, theme)

    def set_alert_condition(self, level: Literal["normal", "yellow", "red"]) -> None:
        """Queue an alert-condition change using the ordinary DSL effect implementation."""
        from lcars_ui.dsl.api import set_alert_condition  # noqa: PLC0415

        self._emit(set_alert_condition, level)

    def show_hint(self, widget_id: str) -> None:
        """Queue opening a manual hint using the ordinary DSL effect implementation."""
        from lcars_ui.dsl.api import show_hint  # noqa: PLC0415

        self._emit(show_hint, widget_id)

    def hide_hint(self, widget_id: str) -> None:
        """Queue closing a manual hint using the ordinary DSL effect implementation."""
        from lcars_ui.dsl.api import hide_hint  # noqa: PLC0415

        self._emit(hide_hint, widget_id)


@dataclass(frozen=True)
class _PageRegistration:
    title: str
    path: str
    nav: bool
    page_id: str | None
    layout: Literal["auto", "console", "telemetry", "grid", "menu", "authored"]
    chrome: Literal["console", "none"]
    fillers: bool
    sizing: Literal["fill", "content"]
    fn: PageFunction


@dataclass(frozen=True)
class _ServiceRegistration:
    factory: ServiceFactory
    scope: ServiceScope


_active_app: ContextVar[Any] = ContextVar("_lcars_active_app")


class App:
    """Own the mutable runtime state for one LCARS application."""

    def __init__(self) -> None:
        self.session_store: dict[str, dict[str, Any]] = {}
        self.connection_manager = ConnectionManager()
        self.event_bus = EventBus()
        self.live_jobs: list[LiveJob] = []
        self.plugin_action_handlers: dict[str, ActionHandler] = {}

        self._context_var: ContextVar[Any] = ContextVar(f"_lcars_ctx_{id(self)}")
        self._page_registrations: list[_PageRegistration] = []
        self._session_start_handlers: list[RegisteredHandler] = []
        self._started_sessions: set[str] = set()
        self._manifest_config: Any = None
        self._service_registrations: dict[type[Any], _ServiceRegistration] = {}
        self._app_services: dict[type[Any], object] = {}
        self._session_services: dict[str, dict[type[Any], object]] = {}
        self._app_exit_stack = AsyncExitStack()
        self._session_exit_stacks: dict[str, AsyncExitStack] = {}
        self._service_lock: asyncio.Lock | None = None
        self._cleanup_tasks: set[asyncio.Task[None]] = set()
        self._live_tasks: set[asyncio.Task[None]] = set()
        self._widget_state_registrations: dict[str, dict[str, object]] = {}
        self._widget_state_fallbacks: set[str] = set()

    def config(
        self,
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
        """Set application-level manifest configuration."""
        from lcars_ui.dsl._state import _Config  # noqa: PLC0415

        configured = _Config(
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
        self._manifest_config = configured
        try:
            ctx = self.context_var.get()
        except LookupError:
            return
        if getattr(ctx, "builder", None) is not None:
            ctx.config = configured

    @property
    def context_var(self) -> ContextVar[Any]:
        """Return this application's isolated DSL context variable."""
        return self._context_var

    @property
    def action_handlers(self) -> dict[str, ActionHandler]:
        """Alias for the application-owned plugin action handler registry."""
        return self.plugin_action_handlers

    @contextmanager
    def _activate_context(self, ctx: Any) -> Iterator[None]:
        app_token = _active_app.set(self)
        context_token = self._context_var.set(ctx)
        try:
            yield
        finally:
            self._context_var.reset(context_token)
            _active_app.reset(app_token)

    def page(
        self,
        title: str,
        *,
        path: str = "/",
        nav: bool = True,
        id: str | None = None,
        layout: Literal["auto", "console", "telemetry", "grid", "menu", "authored"] = "auto",
        chrome: Literal["console", "none"] = "console",
        fillers: bool = True,
        sizing: Literal["fill", "content"] = "fill",
    ) -> Callable[[PageFunction], PageFunction]:
        """Register a declarative page function for manifest construction.

        ``path`` is retained as application routing metadata for later routing
        waves; today's manifest continues to identify pages by ``id``.
        """

        def decorator(fn: PageFunction) -> PageFunction:
            self._page_registrations.append(
                _PageRegistration(
                    title,
                    path,
                    nav,
                    id,
                    layout,
                    chrome,
                    fillers,
                    sizing,
                    fn,
                )
            )
            return fn

        return decorator

    def serve(
        self,
        *,
        host: str = "127.0.0.1",
        port: int = 8000,
        open_browser: bool = False,
    ) -> None:
        """Build the manifest and serve this application on one process.

        This is the ordinary way to run an app, so that application code never
        has to import FastAPI or uvicorn::

            if __name__ == "__main__":
                app.serve(port=8077)

        To deploy behind an existing ASGI server, build the underlying
        application with ``create_app(manifest=app.build_manifest(), app=app)``
        and serve that yourself.
        """
        import threading  # noqa: PLC0415
        import webbrowser  # noqa: PLC0415

        import uvicorn  # noqa: PLC0415

        from lcars_ui.app import create_app  # noqa: PLC0415

        server = create_app(manifest=self.build_manifest(), app=self)
        if open_browser:
            threading.Timer(1.0, lambda: webbrowser.open(f"http://{host}:{port}/")).start()
        uvicorn.run(server, host=host, port=port)

    def build_manifest(self) -> Manifest:
        """Execute registered pages once and return their declared Manifest."""
        from lcars_ui.dsl._builder import _ManifestBuilder  # noqa: PLC0415
        from lcars_ui.dsl._state import (  # noqa: PLC0415
            _Config,
            _LCARSContext,
            auto_id,
        )

        self._clear_widget_state_registrations()
        builder = _ManifestBuilder()
        build_ctx = _LCARSContext(
            session_id="build",
            builder=builder,
            config=self._manifest_config or _Config(),
        )
        registered_page_ids: set[str] = set()
        with self._activate_context(build_ctx):
            for registration in self._page_registrations:
                if registration.page_id is None:
                    page_id = auto_id(registration.title, registered_page_ids)
                else:
                    page_id = registration.page_id
                    if page_id in registered_page_ids:
                        raise ValueError(f"Duplicate page id {page_id!r}")
                    registered_page_ids.add(page_id)

                if registration.nav:
                    builder.add_sidebar_item(
                        item_id=f"nav-{page_id}",
                        label=registration.title,
                        target_page=page_id,
                    )
                with builder.page_context(
                    registration.title,
                    page_id,
                    archetype=registration.layout,
                    chrome=registration.chrome,
                    fillers=registration.fillers,
                    sizing=registration.sizing,
                ):
                    registration.fn()

        self._manifest_config = build_ctx.config
        return builder.build(build_ctx.config)

    def action(
        self,
        widget_id: str,
    ) -> Callable[[RegisteredHandler], RegisteredHandler]:
        """Register a sync or async explicit handler for one exact widget id."""

        def decorator(fn: RegisteredHandler) -> RegisteredHandler:
            async def adapter(
                action_id: str,
                value: Any,
                session_id: str = "http_fallback",
            ) -> None:
                self._store_widget_state(action_id, value, session_id)
                await self._run_effect_handler(
                    fn,
                    session_id=session_id,
                    action_id=action_id,
                    value=value,
                )

            # Plugin dispatch is first-match in dictionary insertion order. Rebuild
            # this same mapping object so exact ids precede plugin patterns.
            existing = [
                (pattern, handler)
                for pattern, handler in self.plugin_action_handlers.items()
                if pattern != widget_id
            ]
            self._widget_state_fallbacks.discard(widget_id)
            self.plugin_action_handlers.clear()
            self.plugin_action_handlers[widget_id] = adapter
            self.plugin_action_handlers.update(existing)
            return fn

        return decorator

    def register_widget_state(
        self,
        *,
        action_id: str,
        widget_id: str,
        default: object,
    ) -> None:
        """Register typed server-owned interaction state for one declared widget."""
        registrations = self._widget_state_registrations.setdefault(action_id, {})
        registrations[widget_id] = default
        if action_id in self.plugin_action_handlers:
            return

        async def state_only_handler(
            received_action_id: str,
            value: Any,
            session_id: str = "http_fallback",
        ) -> None:
            self._store_widget_state(received_action_id, value, session_id)

        self.plugin_action_handlers[action_id] = state_only_handler
        self._widget_state_fallbacks.add(action_id)

    def test_client(self) -> TestClient:
        """Build and return the public in-process application test harness.

        The client does not create a FastAPI server, open a socket, or run
        uvicorn. Actions still pass through the same registry, upstream event
        dispatcher, effect bus, and acknowledgement path as browser actions.
        """
        from lcars_ui.testing import TestClient  # noqa: PLC0415

        return TestClient(self)

    def session_start(self, fn: RegisteredHandler) -> RegisteredHandler:
        """Register a hook that runs once when each session connects.

        The hook receives an ``ActionContext[None]`` and may emit the same
        effects as an action handler. In this wave those effects use the
        existing broadcast path; they are not private to the new session yet.
        """
        self._session_start_handlers.append(fn)
        return fn

    async def run_session_start(self, session_id: str) -> None:
        """Run registered session-start hooks once before session hydration."""
        if session_id in self._started_sessions:
            return
        self._started_sessions.add(session_id)
        for handler in self._session_start_handlers:
            await self._run_effect_handler(
                handler,
                session_id=session_id,
                action_id="session_start",
                value=None,
            )

    def get_session_state(self, session_id: str) -> dict[str, Any]:
        """Get or create the widget state mapping for one session."""
        return self.session_store.setdefault(session_id, {})

    async def clear_session_state(self, session_id: str) -> None:
        """Clear a session and close all of its scoped services."""
        async with self._get_service_lock():
            self.session_store.pop(session_id, None)
            self._started_sessions.discard(session_id)
            self._session_services.pop(session_id, None)
            exit_stack = self._session_exit_stacks.pop(session_id, None)
        if exit_stack is not None:
            await exit_stack.aclose()

    def _clear_session_state_compat(self, session_id: str) -> None:
        """Clear a session for the legacy synchronous module-level helper."""
        self.session_store.pop(session_id, None)
        self._started_sessions.discard(session_id)
        self._session_services.pop(session_id, None)
        exit_stack = self._session_exit_stacks.pop(session_id, None)
        if exit_stack is None:
            return

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(exit_stack.aclose())
            return

        task = loop.create_task(exit_stack.aclose())
        self._cleanup_tasks.add(task)
        task.add_done_callback(self._cleanup_tasks.discard)

    def register_live(
        self,
        fn: Callable[[], Any],
        interval: float = 5.0,
        audience: LiveAudience = "all",
    ) -> Callable[[], Any]:
        """Register a LIVE job; applications may register any number of jobs."""
        if audience not in ("session", "all"):
            raise ValueError("LIVE audience must be 'session' or 'all'")
        self.live_jobs.append((fn, interval, audience))
        return fn

    def live(
        self,
        interval: float = 5.0,
        audience: LiveAudience = "all",
    ) -> Callable[[Callable[[], Any]], Callable[[], Any]]:
        """Return an application-scoped LIVE decorator."""

        def decorator(fn: Callable[[], Any]) -> Callable[[], Any]:
            return self.register_live(fn, interval, audience)

        return decorator

    async def start_live_jobs(self) -> None:
        """Start every registered LIVE job as an independently cancellable task."""
        if self._live_tasks:
            return
        for fn, interval, _audience in self.live_jobs:
            task = asyncio.create_task(
                self._run_live_job(fn, interval),
                name=f"lcars-live-{getattr(fn, '__name__', 'job')}",
            )
            self._live_tasks.add(task)
            task.add_done_callback(self._live_tasks.discard)

    async def stop_live_jobs(self) -> None:
        """Cancel and await all LIVE tasks owned by this application."""
        tasks = tuple(self._live_tasks)
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._live_tasks.clear()

    def provide(
        self,
        service_type: type[Any],
        factory: ServiceFactory,
        scope: ServiceScope = "app",
    ) -> None:
        """Register a service factory for type-based asynchronous resolution."""
        if scope not in ("app", "session"):
            raise ValueError("Service scope must be 'app' or 'session'")
        if service_type in self._app_services or any(
            service_type in services for services in self._session_services.values()
        ):
            raise RuntimeError(f"Service already resolved: {service_type!r}")
        self._service_registrations[service_type] = _ServiceRegistration(factory, scope)

    async def resolve(self, service_type: type[Any], *, session_id: str | None = None) -> Any:
        """Resolve a registered service by type and scope."""
        registration = self._service_registrations.get(service_type)
        if registration is None:
            raise KeyError(f"No service registered for {service_type!r}")
        if registration.scope == "session" and session_id is None:
            raise ValueError("session_id is required for session-scoped services")

        async with self._get_service_lock():
            if registration.scope == "app":
                if service_type not in self._app_services:
                    self._app_services[service_type] = await self._create_service(
                        registration.factory,
                        self._app_exit_stack,
                    )
                return self._app_services[service_type]

            assert session_id is not None
            session_services = self._session_services.setdefault(session_id, {})
            if service_type not in session_services:
                exit_stack = self._session_exit_stacks.setdefault(session_id, AsyncExitStack())
                session_services[service_type] = await self._create_service(
                    registration.factory,
                    exit_stack,
                )
            return session_services[service_type]

    async def shutdown(self) -> None:
        """Close all resolved services for the current application lifecycle."""
        await self.stop_live_jobs()
        if self._cleanup_tasks:
            await asyncio.gather(*tuple(self._cleanup_tasks))

        async with self._get_service_lock():
            session_stacks = list(self._session_exit_stacks.values())
            self._session_exit_stacks.clear()
            self._session_services.clear()
            self._started_sessions.clear()
            app_stack = self._app_exit_stack
            self._app_exit_stack = AsyncExitStack()
            self._app_services.clear()

        for exit_stack in reversed(session_stacks):
            await exit_stack.aclose()
        await app_stack.aclose()

    async def _run_live_job(self, fn: Callable[[], Any], interval: float) -> None:
        from lcars_ui.dsl._state import _Config, _LCARSContext  # noqa: PLC0415

        while True:
            await asyncio.sleep(interval)
            pending_events: list[Envelope] = []
            live_ctx = _LCARSContext(
                session_id="live",
                config=self._manifest_config or _Config(),
                pending_events=pending_events,
            )
            with self._activate_context(live_ctx):
                try:
                    result = fn()
                    if inspect.isawaitable(result):
                        await result
                except Exception:
                    pass
            for envelope in pending_events:
                await self.event_bus.publish(envelope)

    async def _run_effect_handler(
        self,
        handler: RegisteredHandler,
        *,
        session_id: str,
        action_id: str,
        value: Any,
    ) -> None:
        from lcars_ui.dsl._state import _Config, _LCARSContext  # noqa: PLC0415

        action_context: ActionContext[Any] = ActionContext(
            session_id=session_id,
            action_id=action_id,
            value=value,
        )
        handle_ctx = _LCARSContext(
            session_id=session_id,
            pending_events=action_context.pending_events,
            config=self._manifest_config or _Config(),
        )
        action_context._bind_effects(self, handle_ctx)

        with self._activate_context(handle_ctx):
            result = await self._call_handler(handler, action_context)
            if inspect.isawaitable(result):
                await result
        for envelope in action_context.pending_events:
            await self.event_bus.publish(envelope)

    def _clear_widget_state_registrations(self) -> None:
        for action_id in self._widget_state_fallbacks:
            self.plugin_action_handlers.pop(action_id, None)
        self._widget_state_fallbacks.clear()
        self._widget_state_registrations.clear()

    def _store_widget_state(self, action_id: str, value: Any, session_id: str) -> None:
        if not isinstance(value, dict):
            return
        raw_state = value.get("state")
        if not isinstance(raw_state, dict):
            return

        for widget_id, default in self._widget_state_registrations.get(action_id, {}).items():
            model_type = type(default)
            model_validate = getattr(model_type, "model_validate", None)
            if not callable(model_validate):
                continue
            try:
                candidate = model_validate(raw_state)
            except ValueError:
                continue
            kind = value.get("kind")
            model_fields = getattr(candidate.__class__, "model_fields", {})
            if isinstance(kind, str) and "last_event" in model_fields:
                candidate = candidate.model_copy(update={"last_event": kind})
            store_key = f"__lcars_widget_state__:{widget_id}"
            self.get_session_state(session_id)[store_key] = candidate.model_dump(mode="json")

    async def _call_handler(
        self,
        handler: RegisteredHandler,
        action_context: ActionContext[Any],
    ) -> Any:
        parameters = list(inspect.signature(handler).parameters.values())
        args: list[Any] = []
        kwargs: dict[str, Any] = {}
        if parameters:
            self._add_argument(parameters[0], action_context, args, kwargs)

        for parameter in parameters[1:]:
            if parameter.kind in (
                inspect.Parameter.VAR_POSITIONAL,
                inspect.Parameter.VAR_KEYWORD,
            ):
                raise TypeError("Action handlers do not support variadic service parameters")
            service_type = self._service_type_for(handler, parameter)
            service = await self.resolve(service_type, session_id=action_context.session_id)
            self._add_argument(parameter, service, args, kwargs)
        return handler(*args, **kwargs)

    @staticmethod
    def _add_argument(
        parameter: inspect.Parameter,
        value: Any,
        args: list[Any],
        kwargs: dict[str, Any],
    ) -> None:
        if parameter.kind is inspect.Parameter.KEYWORD_ONLY:
            kwargs[parameter.name] = value
        elif parameter.kind in (
            inspect.Parameter.POSITIONAL_ONLY,
            inspect.Parameter.POSITIONAL_OR_KEYWORD,
        ):
            args.append(value)
        else:
            raise TypeError(f"Unsupported handler parameter {parameter.name!r}")

    def _service_type_for(
        self,
        handler: RegisteredHandler,
        parameter: inspect.Parameter,
    ) -> type[Any]:
        try:
            annotation = get_type_hints(handler).get(parameter.name, parameter.annotation)
        except (NameError, TypeError):
            annotation = parameter.annotation
        if annotation is inspect.Parameter.empty:
            raise TypeError(
                f"Service parameter {parameter.name!r} must be annotated with a registered type"
            )
        if isinstance(annotation, str):
            annotation_name = annotation.strip("'\"")
            for service_type in self._service_registrations:
                qualified_name = f"{service_type.__module__}.{service_type.__qualname__}"
                if annotation_name in (
                    service_type.__name__,
                    service_type.__qualname__,
                    qualified_name,
                ):
                    return service_type
        if isinstance(annotation, type):
            return annotation
        raise TypeError(
            f"Service parameter {parameter.name!r} must be annotated with a registered type"
        )

    def _get_service_lock(self) -> asyncio.Lock:
        if self._service_lock is None:
            self._service_lock = asyncio.Lock()
        return self._service_lock

    @staticmethod
    async def _create_service(factory: ServiceFactory, exit_stack: AsyncExitStack) -> object:
        created = factory()
        if inspect.isawaitable(created):
            created = await cast(Awaitable[object], created)
        if isinstance(created, AbstractAsyncContextManager):
            return await exit_stack.enter_async_context(created)
        if isinstance(created, AbstractContextManager):
            return exit_stack.enter_context(created)
        return created


_default_app: App | None = None


def get_default_app() -> App:
    """Return the process-compatible default application, creating it lazily."""
    global _default_app  # noqa: PLW0603
    if _default_app is None:
        _default_app = App()
    return _default_app


def _get_context_app() -> App:
    """Return the App active for DSL work, falling back to legacy process state."""
    try:
        return cast(App, _active_app.get())
    except LookupError:
        return get_default_app()


__all__ = ["ActionContext", "App"]
