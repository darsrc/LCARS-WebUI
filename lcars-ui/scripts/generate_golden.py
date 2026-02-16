"""Generate deterministic Phase 0 placeholder golden artifacts."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOLDEN_DIR = ROOT / "fixtures" / "golden"

MANIFEST_PLACEHOLDER = {
    "phase": 0,
    "status": "placeholder",
    "kind": "manifest",
}

PROTOCOL_PLACEHOLDER = {
    "phase": 0,
    "status": "placeholder",
    "kind": "protocol",
}

SCHEMA_PLACEHOLDER = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": "LCARSManifestPhase0Placeholder",
    "description": "Phase 0 placeholder schema until Phase 1 contract freeze.",
    "type": "object",
    "additionalProperties": True,
}


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    GOLDEN_DIR.mkdir(parents=True, exist_ok=True)
    _write_json(GOLDEN_DIR / "manifest.v1.json", MANIFEST_PLACEHOLDER)
    _write_json(GOLDEN_DIR / "protocol.v1.json", PROTOCOL_PLACEHOLDER)
    _write_json(GOLDEN_DIR / "schema.v1.json", SCHEMA_PLACEHOLDER)
    print("Phase 0 scaffold: wrote deterministic placeholder golden artifacts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
