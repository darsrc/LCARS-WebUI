"""Smoke-test helper for Phase 2 FastAPI endpoint integrity."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from lcars_ui.app import create_app

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "fixtures" / "golden"

REQUIRED_PATHS = [
    ROOT / "pyproject.toml",
    ROOT / "Makefile",
    ROOT / "README.md",
    ROOT / "scripts" / "generate_golden.py",
    FIXTURES / "manifest.v1.json",
    FIXTURES / "protocol.v1.json",
    FIXTURES / "schema.v1.json",
]


def _read_json(path: Path) -> dict[str, object]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Fixture is not a JSON object: {path}")
    return payload


def main() -> int:
    missing = [str(path.relative_to(ROOT)) for path in REQUIRED_PATHS if not path.exists()]
    if missing:
        print(f"Phase 2 smoke FAILED: missing required paths: {missing}")
        return 1

    expected_manifest = _read_json(FIXTURES / "manifest.v1.json")
    expected_schema = _read_json(FIXTURES / "schema.v1.json")

    with TestClient(create_app()) as client:
        manifest_response = client.get("/lcars/manifest")
        schema_response = client.get("/lcars/schema")

    if manifest_response.status_code != 200:
        print(f"Phase 2 smoke FAILED: /lcars/manifest returned {manifest_response.status_code}")
        return 1
    if schema_response.status_code != 200:
        print(f"Phase 2 smoke FAILED: /lcars/schema returned {schema_response.status_code}")
        return 1

    if manifest_response.json() != expected_manifest:
        print("Phase 2 smoke FAILED: /lcars/manifest payload drifted from golden fixture")
        return 1
    if schema_response.json() != expected_schema:
        print("Phase 2 smoke FAILED: /lcars/schema payload drifted from golden fixture")
        return 1

    print("Phase 2 smoke OK: app boots and serves deterministic manifest/schema artifacts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
