"""Contract anti-drift tests for manifest schema (Phase 1)."""

from __future__ import annotations

import json
from pathlib import Path


def test_manifest_golden_file_exists_and_is_json_object() -> None:
    manifest_path = Path(__file__).resolve().parents[2] / "fixtures" / "golden" / "manifest.v1.json"
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert isinstance(payload, dict)
