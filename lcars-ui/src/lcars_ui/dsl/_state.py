"""DSL context state management."""

from __future__ import annotations

import re
from contextvars import ContextVar
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any

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


@dataclass
class _LCARSContext:
    mode: Mode = Mode.BUILD
    active_action_id: str | None = None
    active_action_value: Any = None
    pending_events: list[Envelope] = field(default_factory=list)
    config: _Config = field(default_factory=_Config)
    builder: _ManifestBuilder | None = None
    registered_ids: set[str] = field(default_factory=set)


_ctx_var: ContextVar[_LCARSContext] = ContextVar("_lcars_ctx")

# Module-level persistent widget state (survives across reruns)
_widget_state: dict[str, Any] = {}


def get_ctx() -> _LCARSContext:
    try:
        return _ctx_var.get()
    except LookupError:
        ctx = _LCARSContext()
        _ctx_var.set(ctx)
        return ctx


def set_ctx(ctx: _LCARSContext) -> None:
    _ctx_var.set(ctx)


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


__all__ = ["Mode", "_Config", "_LCARSContext", "_widget_state", "get_ctx", "set_ctx", "auto_id"]
