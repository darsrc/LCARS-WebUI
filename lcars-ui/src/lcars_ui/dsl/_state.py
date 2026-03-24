"""DSL context state management."""

from __future__ import annotations

import re
from contextvars import ContextVar
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from lcars_ui.dsl._builder import _ManifestBuilder
    from lcars_ui.server.events import Envelope


class Mode(str, Enum):
    BUILD = "build"
    HANDLE = "handle"
    LIVE = "live"


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
    visual_language: Literal["strict", "classic"] = "strict"
    strict_renderer: Literal["legacy", "joern"] = "legacy"


@dataclass
class _LCARSContext:
    mode: Mode = Mode.BUILD
    session_id: str = "build"
    active_action_id: str | None = None
    active_action_value: Any = None
    pending_events: list[Envelope] = field(default_factory=list)
    config: _Config = field(default_factory=_Config)
    builder: _ManifestBuilder | None = None
    registered_ids: set[str] = field(default_factory=set)


_ctx_var: ContextVar[_LCARSContext] = ContextVar("_lcars_ctx")

# session_id -> widget_id -> value
_widget_state: dict[str, dict[str, Any]] = {}


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
    if session_id not in _widget_state:
        _widget_state[session_id] = {}
    return _widget_state[session_id]


def clear_session_state(session_id: str) -> None:
    """Drop all widget state for a disconnected session."""
    _widget_state.pop(session_id, None)


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
    "Mode",
    "_Config",
    "_LCARSContext",
    "_widget_state",
    "get_ctx",
    "set_ctx",
    "get_session_state",
    "clear_session_state",
    "auto_id",
]
