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
    """Strict drift check: manifest.v1.json must match _build_manifest() output."""
    if not request.config.getoption("--check-golden", default=False):
        pytest.skip("pass --check-golden to enforce strict manifest drift check")

    manifest_path = ROOT / "fixtures" / "golden" / "manifest.v1.json"
    expected = _read_text(manifest_path)

    regenerated_manifest = _build_manifest().model_dump(mode="json")
    actual = _to_stable_json(regenerated_manifest)

    assert actual == expected, "manifest.v1.json has drifted — run: make contracts-update"


def test_schema_fixture_matches_manifest_model_json_schema(
    request: pytest.FixtureRequest,
) -> None:
    """Strict drift check: schema.v1.json must match Manifest.model_json_schema()."""
    if not request.config.getoption("--check-golden", default=False):
        pytest.skip("pass --check-golden to enforce strict schema drift check")

    schema_path = ROOT / "fixtures" / "golden" / "schema.v1.json"
    expected = _read_text(schema_path)

    regenerated_schema = Manifest.model_json_schema()
    actual = _to_stable_json(regenerated_schema)

    assert actual == expected, "schema.v1.json has drifted — run: make contracts-update"


def test_manifest_fixture_validates_against_committed_schema_when_jsonschema_available() -> None:
    jsonschema = pytest.importorskip("jsonschema")

    manifest_path = ROOT / "fixtures" / "golden" / "manifest.v1.json"
    schema_path = ROOT / "fixtures" / "golden" / "schema.v1.json"

    manifest_payload = json.loads(_read_text(manifest_path))
    schema_payload = json.loads(_read_text(schema_path))

    jsonschema.validate(instance=manifest_payload, schema=schema_payload)
