"""Phase 2 coverage and behavior assertions."""

from __future__ import annotations

import lcars_ui.app as app_module
from fastapi import FastAPI
from fastapi.testclient import TestClient

from lcars_ui.app import _default_fixtures_dir, _parse_cors_origins, create_app


def test_create_app_returns_fastapi_instance() -> None:
    assert isinstance(create_app(), FastAPI)


def test_phase2_routes_are_registered() -> None:
    app = create_app()
    route_methods = {
        route.path: set(route.methods or [])
        for route in app.routes
        if hasattr(route, "methods")
    }

    assert "GET" in route_methods["/lcars/manifest"]
    assert "GET" in route_methods["/lcars/schema"]


def test_parse_cors_origins_defaults_to_wildcard() -> None:
    assert _parse_cors_origins(None) == ["*"]
    assert _parse_cors_origins("") == ["*"]
    assert _parse_cors_origins("  ") == ["*"]


def test_parse_cors_origins_from_csv() -> None:
    assert _parse_cors_origins("https://a.example, https://b.example") == [
        "https://a.example",
        "https://b.example",
    ]


def test_root_returns_html_landing_page(monkeypatch) -> None:
    """GET / returns the status page with useful links when no static bundle is present."""
    monkeypatch.setattr(app_module, "_STATIC_AVAILABLE", False)
    with TestClient(create_app()) as client:
        response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "/lcars/manifest" in response.text
    assert "/docs" in response.text


def test_default_fixtures_dir_points_to_repo_fixtures() -> None:
    fixtures_dir = _default_fixtures_dir()

    assert fixtures_dir.name == "golden"
    assert (fixtures_dir / "manifest.v1.json").exists()
    assert (fixtures_dir / "schema.v1.json").exists()
