"""API integration tests for Phase 2 endpoints."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi.testclient import TestClient
from pydantic import ValidationError

from lcars_ui.app import create_app

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "fixtures" / "golden"


def _load_fixture(filename: str) -> dict[str, object]:
    return json.loads((FIXTURES / filename).read_text(encoding="utf-8"))


def test_get_manifest_returns_golden_payload() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/lcars/manifest")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    payload = response.json()
    assert set(("meta", "layout", "pages")).issubset(payload)
    assert payload == _load_fixture("manifest.v1.json")


def test_get_schema_returns_golden_payload() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/lcars/schema")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    payload = response.json()
    assert payload.get("title") == "Manifest"
    assert payload == _load_fixture("schema.v1.json")


def test_manifest_endpoint_is_deterministic() -> None:
    with TestClient(create_app()) as client:
        first = client.get("/lcars/manifest")
        second = client.get("/lcars/manifest")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()


def test_schema_endpoint_returns_structured_error_for_missing_file(
    monkeypatch,
    tmp_path: Path,
) -> None:
    schema_path = tmp_path / "schema.v1.json"
    manifest_path = tmp_path / "manifest.v1.json"
    manifest_path.write_text((FIXTURES / "manifest.v1.json").read_text(encoding="utf-8"), encoding="utf-8")
    schema_path.write_text("{}", encoding="utf-8")

    monkeypatch.setenv("LCARS_FIXTURES_DIR", str(tmp_path))

    with TestClient(create_app()) as client:
        schema_path.unlink()
        response = client.get("/lcars/schema")

    assert response.status_code == 500
    detail = response.json()["detail"]
    assert detail["error"] == "artifact_read_failed"
    assert detail["path"] == str(schema_path)


def test_manifest_endpoint_returns_structured_error_for_malformed_json(
    monkeypatch,
    tmp_path: Path,
) -> None:
    manifest_path = tmp_path / "manifest.v1.json"
    schema_path = tmp_path / "schema.v1.json"
    manifest_path.write_text((FIXTURES / "manifest.v1.json").read_text(encoding="utf-8"), encoding="utf-8")
    schema_path.write_text("{}", encoding="utf-8")

    monkeypatch.setenv("LCARS_FIXTURES_DIR", str(tmp_path))

    with TestClient(create_app()) as client:
        manifest_path.write_text("{ bad-json", encoding="utf-8")
        response = client.get("/lcars/manifest")

    assert response.status_code == 500
    detail = response.json()["detail"]
    assert detail["error"] == "artifact_read_failed"
    assert detail["path"] == str(manifest_path)


def test_app_startup_fails_fast_when_required_artifact_missing_and_logs_error(
    monkeypatch,
    tmp_path: Path,
    caplog,
) -> None:
    manifest_path = tmp_path / "manifest.v1.json"
    schema_path = tmp_path / "schema.v1.json"
    manifest_path.write_text((FIXTURES / "manifest.v1.json").read_text(encoding="utf-8"), encoding="utf-8")

    monkeypatch.setenv("LCARS_FIXTURES_DIR", str(tmp_path))

    with caplog.at_level(logging.ERROR, logger="lcars_ui.app"):
        try:
            with TestClient(create_app()):
                pass
        except RuntimeError as exc:
            assert "Artifact file not found" in str(exc)
        else:
            raise AssertionError("Expected startup failure when schema artifact is missing")

    matching = [
        record
        for record in caplog.records
        if record.message == "startup_artifact_validation_failed"
    ]
    assert matching, "Expected startup artifact validation log record"

    record = matching[-1]
    assert getattr(record, "artifact", None) == "schema"
    assert getattr(record, "path", None) == str(schema_path)
    assert "Artifact file not found" in getattr(record, "error", "")


def test_app_startup_fails_fast_when_manifest_schema_invalid(
    monkeypatch,
    tmp_path: Path,
    caplog,
) -> None:
    manifest_path = tmp_path / "manifest.v1.json"
    schema_path = tmp_path / "schema.v1.json"
    manifest_path.write_text('{"meta": {}}', encoding="utf-8")
    schema_path.write_text("{}", encoding="utf-8")

    monkeypatch.setenv("LCARS_FIXTURES_DIR", str(tmp_path))

    with caplog.at_level(logging.ERROR, logger="lcars_ui.app"):
        try:
            with TestClient(create_app()):
                pass
        except ValidationError as exc:
            assert "validation error" in str(exc).lower()
        else:
            raise AssertionError("Expected startup failure for schema-invalid manifest")

    matching = [
        record
        for record in caplog.records
        if record.message == "startup_manifest_validation_failed"
    ]
    assert matching, "Expected startup manifest validation log record"

    record = matching[-1]
    assert getattr(record, "artifact", None) == "manifest"
    assert getattr(record, "path", None) == str(manifest_path)
