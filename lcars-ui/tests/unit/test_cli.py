"""The `lcars` command surface: scaffolding, discovery, and check."""

from __future__ import annotations

import sys
from collections.abc import Iterator
from pathlib import Path

import pytest

from lcars_ui._cli_discovery import SEARCH_ORDER, AppDiscoveryError, discover_app
from lcars_ui._cli_scaffold import scaffold_project
from lcars_ui.cli import SYS_PATH_ENV, TARGET_ENV, asgi_from_environment, main

EXPECTED_FILES = (
    "pyproject.toml",
    "README.md",
    ".gitignore",
    "src/{package}/__init__.py",
    "src/{package}/app.py",
    "tests/test_app.py",
)


@pytest.fixture(autouse=True)
def _restore_import_state() -> Iterator[None]:
    """Undo the sys.path and sys.modules edits discovery makes on import."""
    original_path = list(sys.path)
    original_modules = set(sys.modules)
    yield
    sys.path[:] = original_path
    for name in set(sys.modules) - original_modules:
        del sys.modules[name]


def _write(path: Path, source: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source, encoding="utf-8")
    return path


def _package(root: Path, name: str, source: str) -> Path:
    _write(root / "src" / name / "__init__.py", "")
    return _write(root / "src" / name / "app.py", source)


# --------------------------------------------------------------------------
# lcars new
# --------------------------------------------------------------------------


def test_new_writes_every_expected_file(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    code = main(["new", "warp-console", "--dir", str(tmp_path)])

    assert code == 0
    root = tmp_path / "warp-console"
    for relative in EXPECTED_FILES:
        assert (root / relative.format(package="warp_console")).is_file(), relative
    assert "pythonpath = [\"src\"]" in (root / "pyproject.toml").read_text(encoding="utf-8")
    assert "lcars dev" in capsys.readouterr().out


def test_new_refuses_a_non_empty_destination(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _write(tmp_path / "demo" / "keep.txt", "existing work")

    code = main(["new", "demo", "--dir", str(tmp_path)])

    assert code == 2
    assert "already exists and is not empty" in capsys.readouterr().err
    assert (tmp_path / "demo" / "keep.txt").read_text(encoding="utf-8") == "existing work"


def test_new_rejects_a_name_that_is_not_a_package(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    code = main(["new", "9-lives", "--dir", str(tmp_path)])

    assert code == 2
    assert "usable Python package name" in capsys.readouterr().err


def test_scaffolded_project_builds_a_manifest_with_its_declared_pages(tmp_path: Path) -> None:
    project = scaffold_project("nacelle", tmp_path, library_version="0.0.0")

    discovered = discover_app(root=project.root)
    manifest = discovered.app.build_manifest()

    assert discovered.module_name == "nacelle.app"
    assert discovered.attribute == "app"
    assert list(manifest.pages)[:2] == ["overview", "diagnostics"]
    assert "engage" in discovered.app.action_handlers


def test_scaffolded_action_runs_through_the_test_client(tmp_path: Path) -> None:
    project = scaffold_project("impulse", tmp_path, library_version="0.0.0")
    app = discover_app(root=project.root).app

    with app.test_client() as client:
        session = client.session()
        session.action("engage")

        assert session.widget("warp-core").value == "Online"  # type: ignore[attr-defined]
        assert session.logs("activity") == ["Warp core engaged."]


# --------------------------------------------------------------------------
# lcars check
# --------------------------------------------------------------------------


GOOD_APP = """\
from lcars_ui import App, ui

app = App()


@app.page("Bridge", id="bridge")
def bridge() -> None:
    ui.metric("Warp Core", "Standby", id="warp-core")
"""

BROKEN_BUILD_APP = """\
from lcars_ui import App, ui

app = App()


@app.page("Bridge", id="bridge")
def bridge() -> None:
    ui.metric("Warp Core", "Standby", id="warp-core")


@app.page("Bridge Again", id="bridge")
def bridge_again() -> None:
    ui.metric("Warp Core", "Standby", id="warp-core-2")
"""

BROKEN_IMPORT_APP = """\
raise RuntimeError("plasma conduit rupture")
"""


def test_check_exits_zero_and_reports_what_it_built(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _package(tmp_path, "good_ship", GOOD_APP)

    code = main(["check", "--dir", str(tmp_path)])

    out = capsys.readouterr().out
    assert code == 0
    assert "lcars check: ok" in out
    assert "bridge" in out
    assert "widget(s)" in out


def test_check_exits_non_zero_when_the_manifest_cannot_be_built(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _package(tmp_path, "broken_ship", BROKEN_BUILD_APP)

    code = main(["check", "--dir", str(tmp_path)])

    assert code == 1
    assert "manifest construction failed" in capsys.readouterr().err


def test_check_exits_non_zero_when_the_module_cannot_be_imported(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _package(tmp_path, "exploding_ship", BROKEN_IMPORT_APP)

    code = main(["check", "--dir", str(tmp_path)])

    assert code == 2
    assert "failed to import the application" in capsys.readouterr().err


# --------------------------------------------------------------------------
# shared discovery
# --------------------------------------------------------------------------


def test_discovery_finds_a_flat_app_module(tmp_path: Path) -> None:
    _write(tmp_path / "app.py", GOOD_APP)

    discovered = discover_app(root=tmp_path)

    assert discovered.module_name == "app"
    assert discovered.import_string == "app:app"
    assert discovered.sys_path_entry == tmp_path


def test_discovery_finds_a_src_layout_package(tmp_path: Path) -> None:
    module = _package(tmp_path, "src_ship", GOOD_APP)

    discovered = discover_app(root=tmp_path)

    assert discovered.module_path == module
    assert discovered.import_string == "src_ship.app:app"
    assert discovered.sys_path_entry == tmp_path / "src"


def test_discovery_accepts_an_explicit_module_and_attribute(tmp_path: Path) -> None:
    _package(tmp_path, "named_ship", GOOD_APP + "\nconsole = app\n")

    discovered = discover_app("named_ship.app:console", root=tmp_path / "src")

    assert discovered.attribute == "console"
    assert discovered.import_string == "named_ship.app:console"


def test_discovery_accepts_an_explicit_file_path(tmp_path: Path) -> None:
    _package(tmp_path, "path_ship", GOOD_APP)

    discovered = discover_app("src/path_ship/app.py", root=tmp_path)

    assert discovered.import_string == "path_ship.app:app"


def test_discovery_failure_names_every_location_it_searched(tmp_path: Path) -> None:
    with pytest.raises(AppDiscoveryError) as error:
        discover_app(root=tmp_path, command="dev")

    message = str(error.value)
    assert str(tmp_path) in message
    for entry in SEARCH_ORDER:
        assert entry in message
    assert "lcars dev src/myapp/app.py" in message


def test_discovery_failure_names_the_attributes_it_looked_for(tmp_path: Path) -> None:
    _write(tmp_path / "app.py", "value = 1\n")

    with pytest.raises(AppDiscoveryError) as error:
        discover_app(root=tmp_path, command="check")

    message = str(error.value)
    assert "declares no lcars_ui.App" in message
    assert "app, application" in message
    assert "lcars check app:app" in message


def test_discovery_reports_an_ambiguous_source_layout(tmp_path: Path) -> None:
    _package(tmp_path, "alpha_ship", GOOD_APP)
    _package(tmp_path, "beta_ship", GOOD_APP)

    with pytest.raises(AppDiscoveryError) as error:
        discover_app(root=tmp_path, command="run")

    message = str(error.value)
    assert "more than one ./src/<package>/app.py" in message
    assert "alpha_ship" in message and "beta_ship" in message


def test_discovery_reports_a_missing_or_mistyped_attribute(tmp_path: Path) -> None:
    _write(tmp_path / "app.py", GOOD_APP + "\nnot_an_app = object()\n")

    with pytest.raises(AppDiscoveryError, match="has no attribute 'missing'"):
        discover_app("app:missing", root=tmp_path)

    with pytest.raises(AppDiscoveryError, match="not an lcars_ui.App"):
        discover_app("app:not_an_app", root=tmp_path)


def test_discovery_reports_an_unimportable_dotted_target(tmp_path: Path) -> None:
    with pytest.raises(AppDiscoveryError, match="could not import 'no_such_ship.app'"):
        discover_app("no_such_ship.app", root=tmp_path)


def test_discovery_reports_a_missing_target_file(tmp_path: Path) -> None:
    with pytest.raises(AppDiscoveryError, match="no such application file"):
        discover_app("src/ghost/app.py", root=tmp_path)


# --------------------------------------------------------------------------
# lcars dev / lcars run
# --------------------------------------------------------------------------


@pytest.mark.parametrize("command", ["dev", "run"])
def test_serving_commands_report_discovery_failure_without_binding_a_port(
    command: str,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    code = main([command, "--dir", str(tmp_path)])

    error = capsys.readouterr().err
    assert code == 2
    assert f"lcars {command}: error: no LCARS application found" in error
    for entry in SEARCH_ORDER:
        assert entry in error


def test_reload_factory_rebuilds_the_asgi_app_from_the_environment(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """`lcars dev`'s worker process re-imports the target through this factory."""
    _package(tmp_path, "reload_ship", GOOD_APP)
    monkeypatch.setenv(TARGET_ENV, "reload_ship.app:app")
    monkeypatch.setenv(SYS_PATH_ENV, str(tmp_path / "src"))

    server = asgi_from_environment()

    assert {route.path for route in server.routes} >= {"/lcars/manifest"}


def test_reload_factory_refuses_to_run_outside_lcars_dev(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(TARGET_ENV, raising=False)

    with pytest.raises(RuntimeError, match="only for `lcars dev`"):
        asgi_from_environment()
