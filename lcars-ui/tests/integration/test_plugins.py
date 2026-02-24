"""Plugin integration tests for Phase 5."""

from __future__ import annotations

import json
import sys
import textwrap
from pathlib import Path
from types import ModuleType

from fastapi.testclient import TestClient

from lcars_ui.app import create_app
from lcars_ui.core.models import Manifest
from lcars_ui.plugins.loader import PluginCollisionError, PluginError, PluginLoader


def _write_plugin(path: Path, content: str) -> None:
    path.write_text(textwrap.dedent(content), encoding="utf-8")


def _base_manifest() -> Manifest:
    root = Path(__file__).resolve().parents[2]
    fixture = root / "fixtures" / "golden" / "manifest.v1.json"
    payload = json.loads(fixture.read_text(encoding="utf-8"))
    return Manifest.model_validate(payload)


def test_entrypoint_plugin_is_discovered(monkeypatch) -> None:
    plugin_module = ModuleType("test_entrypoint_plugin_module")
    plugin_module.PLUGIN = {
        "name": "entry_plugin",
        "pages": {},
        "sidebar_items": [],
    }
    sys.modules[plugin_module.__name__] = plugin_module

    class FakeEP:
        name = "entry_plugin"

        def load(self) -> ModuleType:
            return plugin_module

    loader = PluginLoader()
    monkeypatch.setattr(loader, "_entry_points", lambda: [FakeEP()])
    plugins = loader.discover()

    assert [plugin.source for plugin in plugins] == ["entry_point:entry_plugin"]
    assert plugins[0].definition.name == "entry_plugin"


def test_filesystem_plugin_is_discovered_and_merged(monkeypatch, tmp_path: Path) -> None:
    plugins_dir = tmp_path / "plugins"
    plugins_dir.mkdir()

    _write_plugin(
        plugins_dir / "ops_plugin.py",
        """
        PLUGIN = {
          "name": "ops_plugin",
          "pages": {
            "ops_tools": {
              "id": "ops_tools",
              "title": "Operations Tools",
              "rows": []
            }
          },
          "sidebar_items": [
            {
              "id": "nav_ops_tools",
              "label": "OPS TOOLS",
              "target_page": "ops_tools",
              "color": "blue"
            }
          ]
        }
        """,
    )

    monkeypatch.chdir(tmp_path)
    loader = PluginLoader()
    plugins = loader.discover()

    assert [plugin.definition.name for plugin in plugins] == ["ops_plugin"]

    merged = loader.merge_manifest(_base_manifest(), plugins)
    assert "ops_tools" in merged.pages
    assert any(item.id == "nav_ops_tools" for item in merged.layout.sidebar.items)


def test_plugin_page_id_collision_raises_value_error(monkeypatch, tmp_path: Path) -> None:
    plugins_dir = tmp_path / "plugins"
    plugins_dir.mkdir()

    _write_plugin(
        plugins_dir / "bad_collision.py",
        """
        PLUGIN = {
          "name": "bad_collision",
          "pages": {
            "main": {
              "id": "main",
              "title": "Duplicate Main",
              "rows": []
            }
          }
        }
        """,
    )

    monkeypatch.chdir(tmp_path)
    loader = PluginLoader()
    plugins = loader.discover()

    try:
        loader.merge_manifest(_base_manifest(), plugins)
    except PluginCollisionError as exc:
        assert "page_id_collision" in str(exc)
    else:
        raise AssertionError("Expected duplicate page id collision to raise PluginCollisionError")


def test_invalid_plugin_capability_is_rejected(monkeypatch, tmp_path: Path) -> None:
    plugins_dir = tmp_path / "plugins"
    plugins_dir.mkdir()

    _write_plugin(
        plugins_dir / "bad_capability.py",
        """
        PLUGIN = {
          "name": "bad_capability",
          "pages": {},
          "protocol": {"new_event": True}
        }
        """,
    )

    monkeypatch.chdir(tmp_path)
    loader = PluginLoader()

    try:
        loader.discover()
    except PluginError as exc:
        assert "plugin_forbidden_capability" in str(exc)
    else:
        raise AssertionError("Expected forbidden capability plugin to be rejected")


def test_plugin_action_handler_routing_via_http_fallback(monkeypatch, tmp_path: Path) -> None:
    plugins_dir = tmp_path / "plugins"
    plugins_dir.mkdir()
    state_file = tmp_path / "action_log.txt"

    _write_plugin(
        plugins_dir / "handler_plugin.py",
        f'''
        def _handler(action_id, value):
            with open(r"{state_file}", "a", encoding="utf-8") as fp:
                fp.write(f"{{action_id}}={{value}}\\n")

        PLUGIN = {{
          "name": "handler_plugin",
          "pages": {{}},
          "action_handlers": {{
            "sensors_*": _handler
          }}
        }}
        ''',
    )

    monkeypatch.chdir(tmp_path)

    with TestClient(create_app()) as client:
        response = client.post("/lcars/action/sensors_scan", json={"value": "now"})

    assert response.status_code == 200
    assert state_file.exists()
    assert state_file.read_text(encoding="utf-8") == "sensors_scan=now\n"
