"""In-memory current-state projection powering reconnect hydration.

Two pieces of state, both holding *current values only* — never a journal of
past events:

- :class:`SharedProjection` — one canonical, mutable copy of the manifest
  that every ``audience="all"`` effect patches in place, plus bounded
  per-stream log tails for broadcast log lines. This is what
  ``ConnectionManager`` used to skip entirely: every new connection used to
  receive the frozen build-time manifest (``app.state.manifest``) instead of
  this.
- :class:`PrivateOverlay` — one per session, holding the latest *merged*
  ``audience="session"`` widget/manifest patches and log tails for that
  session alone. Applied on top of the shared snapshot at hydration time so
  private state wins.

Nothing here ever grows without bound and nothing here is ever replayed
event-by-event to a client: ``widget_overrides``/``manifest_overrides`` keep
only the latest merged value per key (repeated private updates to the same
widget collapse via the same shallow-merge ``{**old, **new}`` semantics the
widget patch itself uses — provably identical to applying each update in
sequence), and log tails are capped ``deque``s.

Patch semantics (:func:`apply_widget_patch`, :func:`apply_manifest_patch`,
:data:`WIDGET_CHILD_KEYS`) intentionally mirror
``frontend/src/runtime/manifest.ts`` (``applyWidgetUpdate``/
``applyManifestUpdate``/``WIDGET_CHILD_KEYS``) field-for-field, so a manifest
patched here and one patched by the browser's own optimistic update agree.
``tests/unit/test_reconnect_projection.py`` and
``frontend/src/runtime/manifest.test.ts`` exercise the same fixture shapes
from both sides.
"""

from __future__ import annotations

import copy
import re
from collections import deque
from typing import Any

WIDGET_CHILD_KEYS: tuple[str, ...] = (
    "children",
    "header_children",
    "column_inputs",
    "left_children",
    "right_children",
    "rail_children",
    "content_children",
    "main_children",
    "side_children",
    "left_inputs",
    "right_inputs",
)

DEFAULT_LOG_TAIL_CAP = 200

_PATH_TOKEN = re.compile(r"([^\[.\]]+)|\[(\d+)\]")


def _parse_path(path: str) -> list[str | int]:
    segments: list[str | int] = []
    for match in _PATH_TOKEN.finditer(path):
        key, index = match.groups()
        segments.append(int(index) if index is not None else key)
    return segments


def _set_by_path(target: dict[str, Any], path: str, value: Any) -> bool:
    segments = _parse_path(path)
    if not segments:
        return False

    node: Any = target
    for segment in segments[:-1]:
        if isinstance(segment, int):
            if not isinstance(node, list) or segment < 0 or segment >= len(node):
                return False
            node = node[segment]
        else:
            if not isinstance(node, dict) or segment not in node:
                return False
            node = node[segment]

    last = segments[-1]
    if isinstance(last, int):
        if not isinstance(node, list) or last < 0 or last >= len(node):
            return False
        node[last] = value
        return True
    if not isinstance(node, dict):
        return False
    node[last] = value
    return True


def apply_manifest_patch(
    manifest: dict[str, Any] | None, path: str, value: Any
) -> tuple[dict[str, Any], bool]:
    """Apply one ``manifest_update`` patch. Mirrors ``applyManifestUpdate`` in manifest.ts."""
    if path == "":
        if not isinstance(value, dict):
            return (manifest if manifest is not None else {}), False
        return value, True

    base = copy.deepcopy(manifest) if manifest is not None else {}
    applied = _set_by_path(base, path, value)
    return base, applied


def _update_widget(widget: Any, target_id: str, data: dict[str, Any]) -> Any:
    if not isinstance(widget, dict):
        return widget
    if widget.get("id") == target_id:
        return {**widget, **data}

    changed = False
    next_widget = dict(widget)
    for key in WIDGET_CHILD_KEYS:
        children = widget.get(key)
        if not isinstance(children, list):
            continue
        updated_children = [_update_widget(child, target_id, data) for child in children]
        if any(updated_children[i] is not children[i] for i in range(len(children))):
            next_widget[key] = updated_children
            changed = True

    hint = widget.get("hint")
    if isinstance(hint, dict) and isinstance(hint.get("children"), list):
        hint_children = hint["children"]
        updated_hint_children = [_update_widget(child, target_id, data) for child in hint_children]
        if any(
            updated_hint_children[i] is not hint_children[i] for i in range(len(hint_children))
        ):
            next_widget["hint"] = {**hint, "children": updated_hint_children}
            changed = True

    return next_widget if changed else widget


def _each_widget_list(manifest: dict[str, Any]) -> list[list[Any]]:
    """Return every top-level ``column["widgets"]`` list in ``manifest``, in place."""
    pages = manifest.get("pages")
    if not isinstance(pages, dict):
        return []
    lists: list[list[Any]] = []
    for page in pages.values():
        rows = page.get("rows") if isinstance(page, dict) else None
        if not isinstance(rows, list):
            continue
        for row in rows:
            columns = row.get("columns") if isinstance(row, dict) else None
            if not isinstance(columns, list):
                continue
            for column in columns:
                widgets = column.get("widgets") if isinstance(column, dict) else None
                if isinstance(widgets, list):
                    lists.append(widgets)
    return lists


def apply_widget_patch(
    manifest: dict[str, Any] | None, widget_id: str, data: dict[str, Any]
) -> dict[str, Any]:
    """Apply one ``widget_update`` patch. Mirrors ``applyWidgetUpdate`` in manifest.ts."""
    if manifest is None:
        return {}
    base = copy.deepcopy(manifest)
    pages = base.get("pages")
    if not isinstance(pages, dict):
        return base
    for page in pages.values():
        rows = page.get("rows") if isinstance(page, dict) else None
        if not isinstance(rows, list):
            continue
        for row in rows:
            columns = row.get("columns") if isinstance(row, dict) else None
            if not isinstance(columns, list):
                continue
            for column in columns:
                widgets = column.get("widgets") if isinstance(column, dict) else None
                if not isinstance(widgets, list):
                    continue
                column["widgets"] = [_update_widget(w, widget_id, data) for w in widgets]
    return base


def _flatten_widgets(widgets: list[Any]) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for widget in widgets:
        if not isinstance(widget, dict):
            continue
        nested: list[dict[str, Any]] = []
        for key in WIDGET_CHILD_KEYS:
            children = widget.get(key)
            if isinstance(children, list):
                nested.extend(_flatten_widgets(children))
        hint = widget.get("hint")
        hint_children = hint.get("children") if isinstance(hint, dict) else None
        if isinstance(hint_children, list) and hint_children:
            nested.extend(_flatten_widgets(hint_children))
        flat.append(widget)
        flat.extend(nested)
    return flat


def collect_widget_ids(manifest: dict[str, Any] | None) -> set[str]:
    """Return every widget id in ``manifest``. Mirrors ``collectWidgets`` (manifest.ts)."""
    if not isinstance(manifest, dict):
        return set()
    ids: set[str] = set()
    for widgets in _each_widget_list(manifest):
        for widget in _flatten_widgets(widgets):
            widget_id = widget.get("id")
            if isinstance(widget_id, str):
                ids.add(widget_id)
    return ids


def _new_tail(cap: int) -> deque[str]:
    return deque(maxlen=cap)


class SharedProjection:
    """Canonical app-wide current state: one manifest plus bounded shared log tails."""

    def __init__(self, *, log_tail_cap: int = DEFAULT_LOG_TAIL_CAP) -> None:
        self.log_tail_cap = log_tail_cap
        self._manifest: dict[str, Any] | None = None
        self._seeded = False
        self._log_tails: dict[str, deque[str]] = {}

    @property
    def seeded(self) -> bool:
        return self._seeded

    def seed(self, manifest: dict[str, Any]) -> None:
        """Set the base manifest once. A later call is a no-op so live mutations survive."""
        if self._seeded:
            return
        self._manifest = copy.deepcopy(manifest)
        self._seeded = True

    def reset(self) -> None:
        self._manifest = None
        self._seeded = False
        self._log_tails.clear()

    def snapshot(self) -> dict[str, Any]:
        return copy.deepcopy(self._manifest) if self._manifest is not None else {}

    def apply_widget_update(self, widget_id: str, data: dict[str, Any]) -> set[str]:
        """Patch the shared manifest and return any widget ids the patch made unreachable."""
        before = collect_widget_ids(self._manifest)
        self._manifest = apply_widget_patch(self._manifest, widget_id, data)
        after = collect_widget_ids(self._manifest)
        return before - after

    def apply_manifest_update(self, path: str, value: Any) -> set[str]:
        """Patch the shared manifest and return any widget ids the patch made unreachable."""
        before = collect_widget_ids(self._manifest)
        patched, applied = apply_manifest_patch(self._manifest, path, value)
        if applied:
            self._manifest = patched
        after = collect_widget_ids(self._manifest)
        return before - after

    def append_log(self, stream_id: str, lines: list[str]) -> None:
        tail = self._log_tails.setdefault(stream_id, _new_tail(self.log_tail_cap))
        tail.extend(lines)

    def log_tail(self, stream_id: str) -> list[str]:
        tail = self._log_tails.get(stream_id)
        return list(tail) if tail is not None else []

    def log_stream_ids(self) -> set[str]:
        return set(self._log_tails)


class PrivateOverlay:
    """One session's private current state, applied on top of the shared snapshot."""

    def __init__(self, *, log_tail_cap: int = DEFAULT_LOG_TAIL_CAP) -> None:
        self.log_tail_cap = log_tail_cap
        self.widget_overrides: dict[str, dict[str, Any]] = {}
        self.manifest_overrides: dict[str, Any] = {}
        self._log_tails: dict[str, deque[str]] = {}

    def apply_widget_update(self, widget_id: str, data: dict[str, Any]) -> None:
        merged = {**self.widget_overrides.get(widget_id, {}), **data}
        self.widget_overrides[widget_id] = merged

    def apply_manifest_update(self, path: str, value: Any) -> None:
        if path == "":
            # A private full-manifest replace would blow away the shared
            # projection for one session; nothing in this DSL emits one
            # privately today, so refuse rather than guess at semantics.
            return
        self.manifest_overrides[path] = value

    def append_log(self, stream_id: str, lines: list[str]) -> None:
        tail = self._log_tails.setdefault(stream_id, _new_tail(self.log_tail_cap))
        tail.extend(lines)

    def log_tail(self, stream_id: str) -> list[str]:
        tail = self._log_tails.get(stream_id)
        return list(tail) if tail is not None else []

    def log_stream_ids(self) -> set[str]:
        return set(self._log_tails)

    def prune_widget(self, widget_id: str) -> None:
        self.widget_overrides.pop(widget_id, None)

    def apply_to(self, manifest: dict[str, Any]) -> dict[str, Any]:
        patched = manifest
        for path, value in self.manifest_overrides.items():
            candidate, applied = apply_manifest_patch(patched, path, value)
            if applied:
                patched = candidate
        for widget_id, data in self.widget_overrides.items():
            patched = apply_widget_patch(patched, widget_id, data)
        return patched

    def is_empty(self) -> bool:
        return not (self.widget_overrides or self.manifest_overrides or self._log_tails)


class ProjectionStore:
    """Owns the shared projection and every session's private overlay."""

    def __init__(self, *, log_tail_cap: int = DEFAULT_LOG_TAIL_CAP) -> None:
        self.log_tail_cap = log_tail_cap
        self.shared = SharedProjection(log_tail_cap=log_tail_cap)
        self._overlays: dict[str, PrivateOverlay] = {}

    def reset(self) -> None:
        self.shared.reset()
        self._overlays.clear()

    def _overlay(self, session_id: str) -> PrivateOverlay:
        return self._overlays.setdefault(
            session_id, PrivateOverlay(log_tail_cap=self.log_tail_cap)
        )

    def _prune_removed(self, removed: set[str]) -> None:
        if not removed:
            return
        for overlay in self._overlays.values():
            for widget_id in removed:
                overlay.prune_widget(widget_id)

    def apply_widget_update(
        self, *, audience: str, session_id: str | None, widget_id: str, data: dict[str, Any]
    ) -> None:
        if audience == "all":
            self._prune_removed(self.shared.apply_widget_update(widget_id, data))
        elif session_id is not None:
            self._overlay(session_id).apply_widget_update(widget_id, data)

    def apply_manifest_update(
        self, *, audience: str, session_id: str | None, path: str, value: Any
    ) -> None:
        if audience == "all":
            self._prune_removed(self.shared.apply_manifest_update(path, value))
        elif session_id is not None:
            self._overlay(session_id).apply_manifest_update(path, value)

    def append_log(
        self, *, audience: str, session_id: str | None, stream_id: str, lines: list[str]
    ) -> None:
        if audience == "all":
            self.shared.append_log(stream_id, lines)
        elif session_id is not None:
            self._overlay(session_id).append_log(stream_id, lines)

    def snapshot_for_session(self, session_id: str) -> dict[str, Any]:
        base = self.shared.snapshot()
        overlay = self._overlays.get(session_id)
        if overlay is None:
            return base
        return overlay.apply_to(base)

    def log_snapshots_for_session(self, session_id: str) -> list[tuple[str, list[str]]]:
        overlay = self._overlays.get(session_id)
        overlay_streams = overlay.log_stream_ids() if overlay is not None else set()
        stream_ids = self.shared.log_stream_ids() | overlay_streams
        snapshots: list[tuple[str, list[str]]] = []
        for stream_id in sorted(stream_ids):
            if overlay is not None and stream_id in overlay_streams:
                snapshots.append((stream_id, overlay.log_tail(stream_id)))
            else:
                snapshots.append((stream_id, self.shared.log_tail(stream_id)))
        return snapshots

    def clear_session(self, session_id: str) -> None:
        self._overlays.pop(session_id, None)

    def has_overlay(self, session_id: str) -> bool:
        overlay = self._overlays.get(session_id)
        return overlay is not None and not overlay.is_empty()


__all__ = [
    "DEFAULT_LOG_TAIL_CAP",
    "WIDGET_CHILD_KEYS",
    "apply_manifest_patch",
    "apply_widget_patch",
    "collect_widget_ids",
    "SharedProjection",
    "PrivateOverlay",
    "ProjectionStore",
]
