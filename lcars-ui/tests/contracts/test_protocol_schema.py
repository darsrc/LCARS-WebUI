"""Contract anti-drift tests for protocol/schema placeholders (Phase 0)."""

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


def test_manifest_schema_file_has_minimum_json_schema_shape() -> None:
    schema_path = Path(__file__).resolve().parents[2] / "fixtures" / "golden" / "schema.v1.json"
    payload = json.loads(schema_path.read_text(encoding="utf-8"))

    assert payload["$schema"] == "https://json-schema.org/draft/2020-12/schema"
    assert payload["title"] == "LCARSManifestPhase0Placeholder"
    assert payload["type"] == "object"
    assert payload["additionalProperties"] is True
