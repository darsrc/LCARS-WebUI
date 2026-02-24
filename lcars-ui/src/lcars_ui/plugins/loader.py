"""Plugin discovery and merge logic for Phase 5."""

from __future__ import annotations

import fnmatch
import importlib.util
import inspect
import logging
import os
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from importlib.metadata import EntryPoint, entry_points
from pathlib import Path
from types import ModuleType
from typing import Any

from lcars_ui.core.models import Manifest, Page, SidebarItem

LOGGER = logging.getLogger(__name__)

PLUGIN_ENTRYPOINT_GROUP = "lcars_ui.plugins"

ActionHandler = Callable[[str, Any], Awaitable[None] | None]


@dataclass(slots=True)
class PluginDefinition:
    """Normalized plugin contribution payload."""

    name: str
    pages: dict[str, Page] = field(default_factory=dict)
    sidebar_items: list[SidebarItem] = field(default_factory=list)
    action_handlers: dict[str, ActionHandler] = field(default_factory=dict)


@dataclass(slots=True)
class LoadedPlugin:
    """Plugin + source metadata used for deterministic merge and diagnostics."""

    definition: PluginDefinition
    source: str


class PluginError(ValueError):
    """Base plugin loading/validation error."""


class PluginCollisionError(PluginError):
    """Raised when plugin merge would overwrite an existing identifier."""


class PluginLoader:
    """Discover, validate, and merge lcars-ui plugins."""

    def __init__(
        self,
        *,
        entrypoint_group: str = PLUGIN_ENTRYPOINT_GROUP,
        plugins_dir: Path | None = None,
    ) -> None:
        self._entrypoint_group = entrypoint_group
        self._plugins_dir = plugins_dir or (Path(os.getcwd()) / "plugins")

    def discover(self) -> list[LoadedPlugin]:
        loaded: list[LoadedPlugin] = []

        for ep in self._entry_points():
            module = ep.load()
            loaded.append(self._load_from_module(module, source=f"entry_point:{ep.name}"))

        for path in sorted(self._plugins_dir.glob("*.py")):
            if path.name.startswith("_"):
                continue
            module = self._import_file_module(path)
            loaded.append(self._load_from_module(module, source=f"filesystem:{path.name}"))

        loaded.sort(key=lambda item: (item.definition.name, item.source))
        return loaded

    def merge_manifest(self, base_manifest: Manifest, plugins: list[LoadedPlugin]) -> Manifest:
        merged = base_manifest.model_copy(deep=True)
        for plugin in plugins:
            for page_id, page in plugin.definition.pages.items():
                if page_id in merged.pages:
                    raise PluginCollisionError(
                        f"page_id_collision: '{page_id}' from plugin '{plugin.definition.name}'"
                    )
                merged.pages[page_id] = page

            existing_sidebar_ids = {item.id for item in merged.layout.sidebar.items}
            for item in plugin.definition.sidebar_items:
                if item.id in existing_sidebar_ids:
                    raise PluginCollisionError(
                        f"sidebar_item_id_collision: '{item.id}' from plugin "
                        f"'{plugin.definition.name}'"
                    )
                merged.layout.sidebar.items.append(item)
                existing_sidebar_ids.add(item.id)

        return merged

    def collect_action_handlers(self, plugins: list[LoadedPlugin]) -> dict[str, ActionHandler]:
        handlers: dict[str, ActionHandler] = {}
        for plugin in plugins:
            for pattern, callback in plugin.definition.action_handlers.items():
                if pattern in handlers:
                    raise PluginCollisionError(
                        f"action_handler_collision: '{pattern}' already registered "
                        f"before plugin '{plugin.definition.name}'"
                    )
                handlers[pattern] = callback
        return handlers

    def _entry_points(self) -> list[EntryPoint]:
        discovered = entry_points()
        if hasattr(discovered, "select"):
            selected = discovered.select(group=self._entrypoint_group)
            return sorted(selected, key=lambda ep: ep.name)

        legacy: list[EntryPoint] = discovered.get(self._entrypoint_group, [])
        return sorted(legacy, key=lambda ep: ep.name)

    def _import_file_module(self, path: Path) -> ModuleType:
        module_name = f"lcars_ui_plugin_{path.stem}"
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            raise PluginError(f"unable_to_import_plugin_file: {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def _load_from_module(self, module: ModuleType, *, source: str) -> LoadedPlugin:
        raw = self._extract_plugin_object(module)
        definition = self._normalize_plugin(raw)
        self._validate_plugin(definition)
        LOGGER.info(
            "plugin_loaded",
            extra={"plugin_name": definition.name, "source": source},
        )
        return LoadedPlugin(definition=definition, source=source)

    def _extract_plugin_object(self, module: ModuleType) -> Any:
        plugin_obj = getattr(module, "PLUGIN", None)
        if plugin_obj is None:
            factory = getattr(module, "get_plugin", None)
            if callable(factory):
                plugin_obj = factory()

        if plugin_obj is None:
            raise PluginError(f"plugin_missing_entrypoint_object: module={module.__name__}")
        return plugin_obj

    def _normalize_plugin(self, raw: Any) -> PluginDefinition:
        if isinstance(raw, PluginDefinition):
            return raw

        if not isinstance(raw, dict):
            raise PluginError("plugin_must_be_mapping_or_PluginDefinition")

        allowed_keys = {"name", "pages", "sidebar_items", "action_handlers"}
        forbidden_keys = {"widgets", "widget_types", "protocol", "protocol_types"}
        for key in forbidden_keys:
            if key in raw:
                raise PluginError(f"plugin_forbidden_capability: field={key}")

        unknown = set(raw) - allowed_keys
        if unknown:
            raise PluginError(f"plugin_unknown_fields: {sorted(unknown)}")

        name = raw.get("name")
        if not isinstance(name, str) or not name.strip():
            raise PluginError("plugin_name_required")

        pages = self._normalize_pages(raw.get("pages", {}), plugin_name=name)
        sidebar_items = self._normalize_sidebar_items(
            raw.get("sidebar_items", []),
            plugin_name=name,
        )
        action_handlers = self._normalize_action_handlers(
            raw.get("action_handlers", {}), plugin_name=name
        )

        return PluginDefinition(
            name=name,
            pages=pages,
            sidebar_items=sidebar_items,
            action_handlers=action_handlers,
        )

    def _normalize_pages(self, raw: Any, *, plugin_name: str) -> dict[str, Page]:
        if not isinstance(raw, dict):
            raise PluginError(f"plugin_pages_must_be_mapping: plugin={plugin_name}")

        normalized: dict[str, Page] = {}
        for page_id, page_data in raw.items():
            if not isinstance(page_id, str) or not page_id:
                raise PluginError(f"plugin_page_id_invalid: plugin={plugin_name}")

            page = page_data if isinstance(page_data, Page) else Page.model_validate(page_data)
            if page.id != page_id:
                raise PluginError(
                    "plugin_page_id_mismatch: "
                    f"plugin={plugin_name}, key={page_id}, page.id={page.id}"
                )
            normalized[page_id] = page

        return normalized

    def _normalize_sidebar_items(self, raw: Any, *, plugin_name: str) -> list[SidebarItem]:
        if not isinstance(raw, list):
            raise PluginError(f"plugin_sidebar_items_must_be_list: plugin={plugin_name}")

        normalized: list[SidebarItem] = []
        for item_data in raw:
            item = (
                item_data
                if isinstance(item_data, SidebarItem)
                else SidebarItem.model_validate(item_data)
            )
            normalized.append(item)
        return normalized

    def _normalize_action_handlers(
        self,
        raw: Any,
        *,
        plugin_name: str,
    ) -> dict[str, ActionHandler]:
        if not isinstance(raw, dict):
            raise PluginError(f"plugin_action_handlers_must_be_mapping: plugin={plugin_name}")

        normalized: dict[str, ActionHandler] = {}
        for pattern, callback in raw.items():
            if not isinstance(pattern, str) or not pattern:
                raise PluginError(f"plugin_action_pattern_invalid: plugin={plugin_name}")
            if not callable(callback):
                raise PluginError(
                    f"plugin_action_handler_not_callable: plugin={plugin_name}, pattern={pattern}"
                )
            normalized[pattern] = callback

        return normalized

    def _validate_plugin(self, plugin: PluginDefinition) -> None:
        if not plugin.name.strip():
            raise PluginError("plugin_name_required")


async def dispatch_plugin_action(
    *,
    handlers: dict[str, ActionHandler],
    action_id: str,
    value: Any,
) -> bool:
    """Dispatch an action to first matching handler pattern.

    Returns True if any handler matched the action id.
    """

    for pattern, callback in handlers.items():
        if not fnmatch.fnmatch(action_id, pattern):
            continue

        result = callback(action_id, value)
        if inspect.isawaitable(result):
            await result
        return True

    return False


__all__ = [
    "PLUGIN_ENTRYPOINT_GROUP",
    "ActionHandler",
    "PluginDefinition",
    "LoadedPlugin",
    "PluginError",
    "PluginCollisionError",
    "PluginLoader",
    "dispatch_plugin_action",
]
