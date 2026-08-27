"""Application-owned runtime state and service lifecycles."""

from __future__ import annotations

import asyncio
import inspect
from collections.abc import Awaitable, Callable
from contextlib import AbstractAsyncContextManager, AbstractContextManager, AsyncExitStack
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any, Literal, cast

from lcars_ui.server.stream import ConnectionManager, EventBus

ServiceScope = Literal["app", "session"]
LiveAudience = Literal["session", "all"]
LiveJob = tuple[Callable[[], Any], float, LiveAudience]
ServiceFactory = Callable[[], object | Awaitable[object]]
ActionHandler = Callable[..., Awaitable[None] | None]


@dataclass(frozen=True)
class _ServiceRegistration:
    factory: ServiceFactory
    scope: ServiceScope


class App:
    """Own the mutable runtime state for one LCARS application."""

    def __init__(self) -> None:
        self.session_store: dict[str, dict[str, Any]] = {}
        self.connection_manager = ConnectionManager()
        self.event_bus = EventBus()
        self.live_jobs: list[LiveJob] = []
        self.plugin_action_handlers: dict[str, ActionHandler] = {}

        self._context_var: ContextVar[Any] = ContextVar(f"_lcars_ctx_{id(self)}")
        self._service_registrations: dict[type[Any], _ServiceRegistration] = {}
        self._app_services: dict[type[Any], object] = {}
        self._session_services: dict[str, dict[type[Any], object]] = {}
        self._app_exit_stack = AsyncExitStack()
        self._session_exit_stacks: dict[str, AsyncExitStack] = {}
        self._service_lock: asyncio.Lock | None = None
        self._cleanup_tasks: set[asyncio.Task[None]] = set()

    @property
    def context_var(self) -> ContextVar[Any]:
        """Return this application's isolated DSL context variable."""
        return self._context_var

    @property
    def action_handlers(self) -> dict[str, ActionHandler]:
        """Alias for the application-owned plugin action handler registry."""
        return self.plugin_action_handlers

    def get_session_state(self, session_id: str) -> dict[str, Any]:
        """Get or create the widget state mapping for one session."""
        return self.session_store.setdefault(session_id, {})

    async def clear_session_state(self, session_id: str) -> None:
        """Clear a session and close all of its scoped services."""
        async with self._get_service_lock():
            self.session_store.pop(session_id, None)
            self._session_services.pop(session_id, None)
            exit_stack = self._session_exit_stacks.pop(session_id, None)
        if exit_stack is not None:
            await exit_stack.aclose()

    def _clear_session_state_compat(self, session_id: str) -> None:
        """Clear a session for the legacy synchronous module-level helper."""
        self.session_store.pop(session_id, None)
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
        if self._cleanup_tasks:
            await asyncio.gather(*tuple(self._cleanup_tasks))

        async with self._get_service_lock():
            session_stacks = list(self._session_exit_stacks.values())
            self._session_exit_stacks.clear()
            self._session_services.clear()
            app_stack = self._app_exit_stack
            self._app_exit_stack = AsyncExitStack()
            self._app_services.clear()

        for exit_stack in reversed(session_stacks):
            await exit_stack.aclose()
        await app_stack.aclose()

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


__all__ = ["App"]
