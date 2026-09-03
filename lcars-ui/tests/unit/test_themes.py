"""Project-local TOML themes are small, strict, and selectable end to end."""

from __future__ import annotations

from pathlib import Path

import pytest

from lcars_ui import ActionContext, App, ui
from lcars_ui.core.models import BUILT_IN_THEMES
from lcars_ui.themes import ThemeError, load_theme_catalog


def _write_theme(directory: Path, name: str = "bridge-night", body: str | None = None) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{name}.toml"
    path.write_text(
        body
        or """\
version = 1
label = "Bridge Night"
extends = "galaxy"

[colors]
field = "#010203"
orange = "#e58b17"

[fonts]
interface = '\"Aptos Narrow\", \"Rajdhani\", sans-serif'
""",
        encoding="utf-8",
    )
    return path


def test_missing_theme_directory_yields_built_ins_only(tmp_path: Path) -> None:
    catalog = load_theme_catalog(tmp_path / "missing")

    assert [definition.id for definition in catalog] == [item[0] for item in BUILT_IN_THEMES]
    assert all(definition.id == definition.base for definition in catalog)


def test_custom_themes_load_after_built_ins_in_filename_order(tmp_path: Path) -> None:
    themes = tmp_path / "themes"
    _write_theme(themes, "zulu", 'version = 1\nlabel = "Zulu"\nextends = "tng"\n')
    _write_theme(themes, "alpha", 'version = 1\nlabel = "Alpha"\nextends = "galaxy"\n')

    dumped = [item.model_dump(mode="json") for item in load_theme_catalog(themes)]

    assert [item["id"] for item in dumped[-2:]] == ["alpha", "zulu"]
    assert dumped[-2] == {
        "id": "alpha",
        "label": "Alpha",
        "base": "galaxy",
        "colors": {},
        "fonts": {},
    }


def test_app_resolves_relative_themes_from_current_directory(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _write_theme(tmp_path / "themes")
    monkeypatch.chdir(tmp_path)
    app = App()
    app.config("Theme Test", theme="bridge-night")

    manifest = app.build_manifest()

    assert manifest.meta.theme == "bridge-night"
    custom = manifest.meta.theme_catalog[-1]
    assert custom.id == "bridge-night"
    assert custom.colors.field == "#010203"


def test_absolute_themes_directory_supports_embedded_apps(tmp_path: Path) -> None:
    themes = tmp_path / "somewhere" / "palettes"
    _write_theme(themes)
    app = App(themes_dir=themes)
    app.config("Embedded", theme="bridge-night")

    assert app.build_manifest().meta.theme == "bridge-night"


def test_unknown_configured_theme_fails_manifest_construction(tmp_path: Path) -> None:
    app = App(themes_dir=tmp_path / "themes")
    app.config("Bad Theme", theme="missing")

    with pytest.raises(ValueError, match="unknown theme id 'missing'"):
        app.build_manifest()


def test_custom_theme_can_be_selected_by_runtime_effect(tmp_path: Path) -> None:
    themes = tmp_path / "themes"
    _write_theme(themes)
    app = App(themes_dir=themes)
    app.config("Runtime Theme", settings_page=False)

    @app.page("Bridge")
    def bridge() -> None:
        ui.button("Night mode", id="night-mode")

    @app.action("night-mode")
    def night_mode(ctx: ActionContext[None]) -> None:
        ctx.set_theme("bridge-night", audience="session")

    with app.test_client() as client:
        effects = client.session().action("night-mode")

    theme_effect = next(effect for effect in effects if effect.type == "manifest_update")
    assert theme_effect.payload.model_dump(mode="json") == {
        "path": "meta.theme",
        "value": "bridge-night",
    }


def test_runtime_theme_validation_uses_the_catalog_shipped_in_the_manifest(
    tmp_path: Path,
) -> None:
    themes = tmp_path / "themes"
    _write_theme(themes)
    app = App(themes_dir=themes)
    app.config("Stable Catalogue", settings_page=False)

    @app.page("Bridge")
    def bridge() -> None:
        ui.button("Theme", id="theme")

    @app.action("theme")
    def switch_theme(ctx: ActionContext[None]) -> None:
        ctx.set_theme("added-after-build", audience="session")

    with app.test_client() as client:
        _write_theme(
            themes,
            "added-after-build",
            'version = 1\nlabel = "Too Late"\nextends = "galaxy"\n',
        )
        with pytest.raises(ValueError, match="unknown theme id 'added-after-build'"):
            client.session().action("theme")


@pytest.mark.parametrize(
    ("name", "body", "message"),
    [
        ("Bad Name", 'version = 1\nlabel = "Bad"\nextends = "galaxy"\n', "filename"),
        ("galaxy", 'version = 1\nlabel = "Collision"\nextends = "galaxy"\n', "reserved"),
        ("bad-version", 'version = 2\nlabel = "Bad"\nextends = "galaxy"\n', "version"),
        ("bad-base", 'version = 1\nlabel = "Bad"\nextends = "custom"\n', "extends"),
        (
            "bad-color",
            'version = 1\nlabel = "Bad"\nextends = "galaxy"\n[colors]\nfield = "black"\n',
            "colors.field",
        ),
        (
            "bad-key",
            'version = 1\nlabel = "Bad"\nextends = "galaxy"\n[colors]\ngeometry = "#000000"\n',
            "colors.geometry",
        ),
        (
            "bad-font",
            'version = 1\nlabel = "Bad"\nextends = "galaxy"\n'
            '[fonts]\ninterface = "url(font.woff)"\n',
            "fonts.interface",
        ),
        (
            "bad-top-level",
            'version = 1\nlabel = "Bad"\nextends = "galaxy"\ncss = "body {}"\n',
            "css",
        ),
    ],
)
def test_invalid_theme_reports_file_and_field(
    tmp_path: Path,
    name: str,
    body: str,
    message: str,
) -> None:
    path = _write_theme(tmp_path / "themes", name, body)

    with pytest.raises(ThemeError) as error:
        load_theme_catalog(path.parent)

    assert str(path) in str(error.value)
    assert message in str(error.value)


def test_malformed_toml_reports_source_file(tmp_path: Path) -> None:
    path = _write_theme(tmp_path / "themes", body="label = [")

    with pytest.raises(ThemeError, match="invalid TOML") as error:
        load_theme_catalog(path.parent)

    assert str(path) in str(error.value)


def test_non_directory_theme_path_fails_clearly(tmp_path: Path) -> None:
    path = tmp_path / "themes"
    path.write_text("not a directory", encoding="utf-8")

    with pytest.raises(ThemeError, match="not a directory"):
        load_theme_catalog(path)
