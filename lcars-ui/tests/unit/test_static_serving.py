"""Phase 9: static asset serving with and without bundled frontend."""
from fastapi.testclient import TestClient

import lcars_ui.app as app_module
from lcars_ui.app import create_app


def test_root_falls_back_to_status_page_when_no_bundle(monkeypatch):
    """When _static/index.html is absent, GET / returns the HTML status page."""
    monkeypatch.setattr(app_module, "_STATIC_AVAILABLE", False)
    with TestClient(create_app()) as client:
        response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "/lcars/manifest" in response.text


def test_spa_catch_all_returns_404_when_no_bundle(monkeypatch):
    """When no bundle, unknown paths return 404."""
    monkeypatch.setattr(app_module, "_STATIC_AVAILABLE", False)
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        response = client.get("/some/random/path")
    assert response.status_code == 404


def test_root_serves_index_html_when_bundle_present(tmp_path, monkeypatch):
    """When _static/index.html exists, GET / serves it."""
    fake_html = "<html><body>LCARS APP</body></html>"
    (tmp_path / "index.html").write_text(fake_html)
    monkeypatch.setattr(app_module, "_STATIC_AVAILABLE", True)
    monkeypatch.setattr(app_module, "_STATIC_DIR", tmp_path)
    with TestClient(create_app()) as client:
        response = client.get("/")
    assert response.status_code == 200
    assert response.text == fake_html


def test_spa_catch_all_serves_index_html_when_bundle_present(tmp_path, monkeypatch):
    """Arbitrary paths are served index.html for SPA routing."""
    fake_html = "<html><body>LCARS APP</body></html>"
    (tmp_path / "index.html").write_text(fake_html)
    monkeypatch.setattr(app_module, "_STATIC_AVAILABLE", True)
    monkeypatch.setattr(app_module, "_STATIC_DIR", tmp_path)
    with TestClient(create_app()) as client:
        response = client.get("/some/deep/route")
    assert response.status_code == 200
    assert response.text == fake_html


def test_api_routes_not_shadowed_by_catch_all():
    """/lcars/* routes still work when catch-all is registered."""
    with TestClient(create_app()) as client:
        response = client.get("/lcars/manifest")
    assert response.status_code == 200
