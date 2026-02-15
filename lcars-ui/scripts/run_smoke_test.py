"""Smoke-test helper for Phase 0 scaffold integrity."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


REQUIRED_PATHS = [
    ROOT / "pyproject.toml",
    ROOT / "Makefile",
    ROOT / "README.md",
    ROOT / "scripts" / "generate_golden.py",
    ROOT / "fixtures" / "golden" / "manifest.v1.json",
    ROOT / "fixtures" / "golden" / "protocol.v1.json",
    ROOT / "fixtures" / "golden" / "schema.v1.json",
]


def main() -> int:
    missing = [str(path.relative_to(ROOT)) for path in REQUIRED_PATHS if not path.exists()]
    if missing:
        print(f"Phase 0 smoke FAILED: missing required paths: {missing}")
        return 1

    for fixture in REQUIRED_PATHS[-3:]:
        payload = json.loads(fixture.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            print(f"Phase 0 smoke FAILED: fixture is not a JSON object: {fixture.name}")
            return 1

    print("Phase 0 smoke OK: scaffold files and placeholder fixtures are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
