"""Generate the standalone graph-workspace v1 JSON schema."""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import TypeAdapter

from lcars_ui.workspace import WorkspaceWireMessage

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "fixtures" / "golden" / "workspace.v1.schema.json"


def build_workspace_schema() -> dict[str, object]:
    return TypeAdapter(WorkspaceWireMessage).json_schema()


def main() -> int:
    OUTPUT.write_text(
        json.dumps(build_workspace_schema(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
