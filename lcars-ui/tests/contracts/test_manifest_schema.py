"""Contract anti-drift tests for manifest and schema fixtures."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from lcars_ui.core.models import Manifest
from scripts.generate_golden import _build_manifest

ROOT = Path(__file__).resolve().parents[2]


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _to_stable_json(payload: dict[str, object]) -> str:
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def test_manifest_fixture_matches_in_memory_phase1_manifest_generation(
    request: pytest.FixtureRequest,
) -> None:
    """Strict drift check: manifest.v2.json must match _build_manifest() output."""
    if not request.config.getoption("--check-golden", default=False):
        pytest.skip("pass --check-golden to enforce strict manifest drift check")

    manifest_path = ROOT / "fixtures" / "golden" / "manifest.v2.json"
    expected = _read_text(manifest_path)

    regenerated_manifest = _build_manifest().model_dump(mode="json")
    actual = _to_stable_json(regenerated_manifest)

    assert actual == expected, "manifest.v2.json has drifted — run: make contracts-update"


def test_schema_fixture_matches_manifest_model_json_schema(
    request: pytest.FixtureRequest,
) -> None:
    """Strict drift check: schema.v2.json must match Manifest.model_json_schema()."""
    if not request.config.getoption("--check-golden", default=False):
        pytest.skip("pass --check-golden to enforce strict schema drift check")

    schema_path = ROOT / "fixtures" / "golden" / "schema.v2.json"
    expected = _read_text(schema_path)

    regenerated_schema = Manifest.model_json_schema()
    actual = _to_stable_json(regenerated_schema)

    assert actual == expected, "schema.v2.json has drifted — run: make contracts-update"


def test_manifest_fixture_validates_against_committed_schema_when_jsonschema_available() -> None:
    jsonschema = pytest.importorskip("jsonschema")

    manifest_path = ROOT / "fixtures" / "golden" / "manifest.v2.json"
    schema_path = ROOT / "fixtures" / "golden" / "schema.v2.json"

    manifest_payload = json.loads(_read_text(manifest_path))
    schema_payload = json.loads(_read_text(schema_path))

    jsonschema.validate(instance=manifest_payload, schema=schema_payload)


def test_v7_0_0_manifest_still_validates_against_current_schema() -> None:
    """7.1.0's additive claim, asserted rather than taken on faith.

    `fixtures/golden/manifest.v7.0.0.json` is a frozen copy of the manifest
    committed at the `v7.0.0` tag (byte-identical to
    `git show v7.0.0:lcars-ui/fixtures/golden/manifest.v2.json`) — captured as
    its own file, not read from the live `manifest.v2.json` fixture, because
    `make contracts-update` regenerates that one and a later widget addition
    could quietly change what it represents. The 7.1.0 `ScrollOptions` mixin
    adds `max_height`/`overflow`/`auto_scroll` to several options classes;
    every added field is optional with a `None` default, so a manifest that
    predates them entirely must still satisfy the current schema.
    """
    jsonschema = pytest.importorskip("jsonschema")

    old_manifest_path = ROOT / "fixtures" / "golden" / "manifest.v7.0.0.json"
    schema_path = ROOT / "fixtures" / "golden" / "schema.v2.json"

    old_manifest_payload = json.loads(_read_text(old_manifest_path))
    schema_payload = json.loads(_read_text(schema_path))

    assert old_manifest_payload["meta"]["version"] == "2.0"
    jsonschema.validate(instance=old_manifest_payload, schema=schema_payload)


def test_manifest_fixture_includes_phase11_widget_types() -> None:
    manifest_path = ROOT / "fixtures" / "golden" / "manifest.v2.json"
    manifest_payload = json.loads(_read_text(manifest_path))

    widget_types: set[str] = set()
    for page in manifest_payload["pages"].values():
        for row in page["rows"]:
            for column in row["columns"]:
                for widget in column["widgets"]:
                    widget_types.add(widget["type"])
                    if widget["type"] == "form":
                        for child in widget.get("children", []):
                            widget_types.add(child["type"])

    assert "progress_bar" in widget_types
    assert "gauge" in widget_types
    assert "markdown" in widget_types
    assert "number_input" in widget_types
    assert "lcars_checkbox" in widget_types
    assert "lcars_radio" in widget_types
    assert "lcars_radio_toggle" in widget_types
    assert "lcars_box" in widget_types
    assert "lcars_sweep" in widget_types
    assert "lcars_bracket" in widget_types
    assert "lcars_header" in widget_types
