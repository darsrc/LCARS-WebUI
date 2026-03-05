"""Contract checks for protocol fixture and schema document presence."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from lcars_ui.server.events import Envelope

ROOT = Path(__file__).resolve().parents[2]


def test_protocol_golden_file_is_json_schema_document() -> None:
    """protocol.v1.json must be a real JSON Schema object describing the Envelope."""
    protocol_path = ROOT / "fixtures" / "golden" / "protocol.v1.json"
    payload = json.loads(protocol_path.read_text(encoding="utf-8"))

    assert payload["type"] == "object"
    assert payload["title"] == "Envelope"
    assert "properties" in payload
    assert "type" in payload["properties"]
    assert "payload" in payload["properties"]


def test_protocol_golden_file_matches_envelope_model_json_schema(
    request: pytest.FixtureRequest,
) -> None:
    """Strict drift check: protocol.v1.json must match Envelope.model_json_schema()."""
    if not request.config.getoption("--check-golden", default=False):
        pytest.skip("pass --check-golden to enforce strict protocol schema drift check")

    protocol_path = ROOT / "fixtures" / "golden" / "protocol.v1.json"
    committed = protocol_path.read_text(encoding="utf-8")

    regenerated = json.dumps(Envelope.model_json_schema(), indent=2, sort_keys=True) + "\n"
    assert regenerated == committed, "protocol.v1.json has drifted — run: make contracts-update"


def test_manifest_schema_file_is_json_schema_document() -> None:
    schema_path = ROOT / "fixtures" / "golden" / "schema.v1.json"
    payload = json.loads(schema_path.read_text(encoding="utf-8"))

    assert payload["type"] == "object"
    assert payload["title"] == "Manifest"
    assert "properties" in payload
