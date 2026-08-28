"""DSL context state management."""

from __future__ import annotations

import re
from collections.abc import Iterator, MutableMapping
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Literal, cast

from lcars_ui.application import _get_context_app, get_default_app

if TYPE_CHECKING:
    from lcars_ui.dsl._builder import _ManifestBuilder
    from lcars_ui.server.events import Envelope


@dataclass
class _Config:
    name: str = "LCARS App"
    theme: str = "galaxy"
    subtitle: str | None = None
    header_color: str = "orange"
    sound_enabled: bool = True
    lang: str = "en-US"
    force_uppercase: bool = True
    label_uppercase: bool = True
    lcars_font_headers: bool = True
    lcars_font_labels: bool = True
    lcars_font_text: bool = False
    settings_page: bool = True
    visual_language: Literal["strict"] = "strict"
    strict_renderer: Literal["legacy"] = "legacy"


@dataclass
class _LCARSContext:
    session_id: str = "build"
    pending_events: list[Envelope] | None = None
    config: _Config = field(default_factory=_Config)
    builder: _ManifestBuilder | None = None
    registered_ids: set[str] = field(default_factory=set)


class _ContextVarProxy:
    """Delegate DSL context state to the active App or the legacy default."""

    def get(self) -> _LCARSContext:
        return cast(_LCARSContext, _get_context_app().context_var.get())

    def set(self, ctx: _LCARSContext) -> object:
        return _get_context_app().context_var.set(ctx)


class _WidgetStateProxy(MutableMapping[str, dict[str, Any]]):
    """Expose the default App session store through the legacy mapping global."""

    @staticmethod
    def _store() -> dict[str, dict[str, Any]]:
        return get_default_app().session_store

    def __getitem__(self, key: str) -> dict[str, Any]:
        return self._store()[key]

    def __setitem__(self, key: str, value: dict[str, Any]) -> None:
        self._store()[key] = value

    def __delitem__(self, key: str) -> None:
        del self._store()[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self._store())

    def __len__(self) -> int:
        return len(self._store())


_ctx_var: ContextVar[_LCARSContext] | _ContextVarProxy = _ContextVarProxy()

# Compatibility view of the default App's session_id -> widget_id -> value store.
_widget_state: MutableMapping[str, dict[str, Any]] = _WidgetStateProxy()


def get_ctx() -> _LCARSContext:
    try:
        return _ctx_var.get()
    except LookupError:
        ctx = _LCARSContext()
        _ctx_var.set(ctx)
        return ctx


def set_ctx(ctx: _LCARSContext) -> None:
    _ctx_var.set(ctx)


def get_session_state(session_id: str) -> dict[str, Any]:
    """Get or initialize widget state storage for a session."""
    return _get_context_app().get_session_state(session_id)


def clear_session_state(session_id: str) -> None:
    """Drop all widget state for a disconnected session."""
    _get_context_app()._clear_session_state_compat(session_id)


def auto_id(label: str, registered_ids: set[str]) -> str:
    """Derive a stable kebab-case ID from a label, with collision suffix."""
    base = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-") or "widget"
    candidate = base
    counter = 2
    while candidate in registered_ids:
        candidate = f"{base}-{counter}"
        counter += 1
    registered_ids.add(candidate)
    return candidate


__all__ = [
    "_Config",
    "_LCARSContext",
    "_widget_state",
    "get_ctx",
    "set_ctx",
    "get_session_state",
    "clear_session_state",
    "auto_id",
]
