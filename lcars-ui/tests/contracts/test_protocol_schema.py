"""Contract anti-drift tests for protocol schema (Phase 3)."""

from __future__ import annotations

import json
from pathlib import Path


def test_protocol_golden_file_exists_and_is_json_object() -> None:
    protocol_path = Path(__file__).resolve().parents[2] / "fixtures" / "golden" / "protocol.v1.json"
    payload = json.loads(protocol_path.read_text(encoding="utf-8"))
    assert isinstance(payload, dict)


def test_manifest_schema_file_exists_and_is_json_object() -> None:
    schema_path = Path(__file__).resolve().parents[2] / "fixtures" / "golden" / "schema.v1.json"
    payload = json.loads(schema_path.read_text(encoding="utf-8"))
    assert isinstance(payload, dict)
