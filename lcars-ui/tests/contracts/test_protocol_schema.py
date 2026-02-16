"""Contract checks for protocol fixture and schema document presence."""

from __future__ import annotations

import json
from pathlib import Path


def test_protocol_golden_file_matches_phase0_placeholder_contract() -> None:
    protocol_path = Path(__file__).resolve().parents[2] / "fixtures" / "golden" / "protocol.v1.json"
    payload = json.loads(protocol_path.read_text(encoding="utf-8"))

    assert payload == {
        "kind": "protocol",
        "phase": 0,
        "status": "placeholder",
    }


def test_manifest_schema_file_is_json_schema_document() -> None:
    schema_path = Path(__file__).resolve().parents[2] / "fixtures" / "golden" / "schema.v1.json"
    payload = json.loads(schema_path.read_text(encoding="utf-8"))

    assert payload["type"] == "object"
    assert payload["title"] == "Manifest"
    assert "properties" in payload
