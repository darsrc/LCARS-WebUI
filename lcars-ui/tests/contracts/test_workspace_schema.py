"""Anti-drift and validation coverage for graph-workspace contract v1."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import TypeAdapter

from lcars_ui.workspace import WorkspaceWireMessage
from scripts.generate_workspace_contract import build_workspace_schema

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "fixtures" / "golden" / "workspace.v1.schema.json"


def _stable(payload: dict[str, object]) -> str:
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def test_workspace_schema_fixture_has_no_drift(request: pytest.FixtureRequest) -> None:
    if not request.config.getoption("--check-golden", default=False):
        pytest.skip("pass --check-golden to enforce strict workspace schema drift")
    assert SCHEMA.read_text(encoding="utf-8") == _stable(build_workspace_schema())


def test_workspace_schema_accepts_the_minimal_versioned_document() -> None:
    jsonschema = pytest.importorskip("jsonschema")
    instance = TypeAdapter(WorkspaceWireMessage).validate_python(
        {
            "format": "lcars-graph-workspace",
            "version": 1,
            "workspace_id": "workspace-1",
            "canonical": {
                "graph": {"graph_id": "graph", "revision": "r1"},
                "completeness": {
                    "state": "complete",
                    "loaded_records": 0,
                    "known_records": 0,
                },
            },
        }
    ).model_dump(mode="json")

    jsonschema.validate(instance=instance, schema=json.loads(SCHEMA.read_text(encoding="utf-8")))
