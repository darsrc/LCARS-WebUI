"""Tests for _ManifestBuilder."""

from __future__ import annotations

from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _Config
from lcars_ui.widgets.primitives import Text


def _default_config() -> _Config:
    return _Config(name="Test App")


def test_build_creates_default_page() -> None:
    b = _ManifestBuilder()
    manifest = b.build(_default_config())
    assert "main" in manifest.pages
    assert manifest.pages["main"].title == ""


def test_add_widget_goes_to_default_column() -> None:
    b = _ManifestBuilder()
    b.add_widget(Text(id="t1", content="hello"))
    manifest = b.build(_default_config())
    page = manifest.pages["main"]
    widgets = page.rows[0].columns[0].widgets
    assert len(widgets) == 1
    assert widgets[0].type == "lcars_bracket"
    assert widgets[0].children[0].id == "t1"


def test_page_context_creates_named_page() -> None:
    b = _ManifestBuilder()
    with b.page_context("Dashboard", "dashboard"):
        b.add_widget(Text(id="t2", content="hi"))
    manifest = b.build(_default_config())
    assert "dashboard" in manifest.pages
    assert manifest.pages["dashboard"].title == "Dashboard"
    col = manifest.pages["dashboard"].rows[0].columns[0]
    assert col.widgets[0].type == "lcars_bracket"
    assert col.widgets[0].children[0].id == "t2"


def test_columns_creates_two_columns() -> None:
    b = _ManifestBuilder()
    b._ensure_default_page()
    ctxs = b.add_columns(["2fr", "1fr"])
    assert len(ctxs) == 2

    with ctxs[0]:
        b.add_widget(Text(id="left", content="left"))
    with ctxs[1]:
        b.add_widget(Text(id="right", content="right"))

    manifest = b.build(_default_config())
    page = manifest.pages["main"]
    # The last row should be the columns row
    col_row = page.rows[-1]
    assert len(col_row.columns) == 2
    assert col_row.columns[0].widgets[0].type == "lcars_bracket"
    assert col_row.columns[0].widgets[0].children[0].id == "left"
    assert col_row.columns[1].widgets[0].type == "lcars_bracket"
    assert col_row.columns[1].widgets[0].children[0].id == "right"


def test_build_meta_and_layout() -> None:
    b = _ManifestBuilder()
    cfg = _Config(
        name="My App",
        theme="nemesis",
        lang="fr-FR",
        header_color="blue",
        visual_language="classic",
    )
    manifest = b.build(cfg)
    assert manifest.meta.app_name == "My App"
    assert manifest.meta.theme == "nemesis"
    assert manifest.meta.lang == "fr-FR"
    assert manifest.meta.visual_language == "classic"
    assert manifest.layout.header.color == "blue"


def test_sidebar_items_added() -> None:
    b = _ManifestBuilder()
    b.add_sidebar_item(item_id="nav-home", label="Home", target_page="main")
    manifest = b.build(_default_config())
    items = manifest.layout.sidebar.items
    assert len(items) == 1
    assert items[0].label == "Home"
