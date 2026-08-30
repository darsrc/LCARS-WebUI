"""Project templates rendered by ``lcars new``.

The generated project is deliberately small: two pages, one action handler and
one test. It must run and its test must pass with no editing, so nothing here
is a placeholder that a newcomer has to fill in first.
"""

from __future__ import annotations

import keyword
from dataclasses import dataclass
from pathlib import Path
from string import Template

#: The port a generated project serves on. Never 8000 — it is too commonly taken.
DEFAULT_DEV_PORT = 8077


class ScaffoldError(Exception):
    """Raised when a project cannot be scaffolded at the requested location."""


@dataclass(frozen=True)
class ScaffoldedProject:
    """One generated project: where it landed and what was written."""

    root: Path
    package: str
    files: tuple[Path, ...]


_PYPROJECT = Template(
    """\
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "$project"
version = "0.1.0"
description = "$title, an LCARS application."
readme = "README.md"
requires-python = ">=3.10"
dependencies = ["lcars-ui>=$library_version"]

[project.optional-dependencies]
dev = ["pytest>=8.0"]

[tool.setuptools]
package-dir = {"" = "src"}

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
addopts = "-ra"
testpaths = ["tests"]
pythonpath = ["src"]
"""
)

_PACKAGE_INIT = Template(
    '''\
"""$title, an LCARS application."""

from $package.app import app

__all__ = ["app"]
'''
)

_APP_MODULE = Template(
    '''\
"""$title, an LCARS application.

Run it with ``lcars dev`` from the project root, or directly with
``python -m $package.app --port $port``.
"""

from lcars_ui import ActionContext, App, advanced, ui

app = App()
app.config("$title", subtitle="OPERATIONS", theme="galaxy")


@app.page("Overview", id="overview", layout="console")
def overview() -> None:
    """The main console: readouts on one side, controls on the other."""
    with ui.data_panel("Systems", id="systems"):
        ui.metric("Warp Core", "Standby", status="warn", id="warp-core")
        ui.progress("Shield Integrity", 100.0, id="shields")

    with ui.control_panel("Commands", id="commands"):
        ui.button("Engage", id="engage")
        ui.toggle("Automatic Diagnostics", value=True, id="auto-diagnostics")


@app.page("Diagnostics", id="diagnostics", layout="telemetry")
def diagnostics() -> None:
    """A second page, to show navigation and a live log stream."""
    advanced.sweep("Systems Log", subtitle="Realtime", color="lilac", id="log-sweep")
    with ui.data_panel("Activity", id="activity"):
        ui.log("activity", title="Recent Activity", id="activity-log")


@app.action("engage")
def engage(ctx: ActionContext[None]) -> None:
    """Handle the Engage button.

    Handlers never re-run the page. They mutate whatever state they own and
    push the effects the browser should apply.
    """
    ctx.update("warp-core", value="Online", status="ok")
    ctx.append_log("activity", "Warp core engaged.")
    ctx.notify("Warp core online.", level="success")


if __name__ == "__main__":
    app.serve(port=$port, open_browser=True)
'''
)

_TEST_MODULE = Template(
    '''\
"""Smoke tests for $title.

``app.test_client()`` builds the manifest and dispatches real actions in
process: no server, no browser, no sockets.
"""

from $package.app import app


def test_declared_pages_are_in_order() -> None:
    with app.test_client() as client:
        session = client.session()

        assert session.pages[:2] == ["overview", "diagnostics"]


def test_engage_updates_the_readout_and_writes_the_log() -> None:
    with app.test_client() as client:
        session = client.session()

        effects = session.action("engage")

        assert session.widget("warp-core").value == "Online"
        assert session.logs("activity") == ["Warp core engaged."]
        assert effects[-1].type == "action_ack"
'''
)

_README = Template(
    """\
# $title

An LCARS application built with [lcars-ui](https://pypi.org/project/lcars-ui/).

## Install

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .\\.venv\\Scripts\\Activate.ps1
pip install -e ".[dev]"
```

## Run

```bash
lcars dev                          # reloads on save, http://127.0.0.1:$port/
lcars run --port $port             # one production process, no reload
python -m $package.app --port $port # direct run; also accepts --ip/--host
lcars check                        # build and validate without serving
```

`lcars dev` finds `src/$package/app.py` on its own. Pass a target explicitly
when you move it: `lcars dev $package.app:app`.

## Test

```bash
pytest -q
```

## Where things live

| Path | What it is |
| --- | --- |
| `src/$package/app.py` | pages, widgets and action handlers |
| `tests/test_app.py` | in-process tests using `app.test_client()` |

Pages are declared with `@app.page`, ordinary widgets come from `ui.`, and
specialist surfaces from `advanced.`. An `@app.action` handler receives an
`ActionContext` and pushes effects with `ctx.update`, `ctx.append_log`,
`ctx.notify` and friends.
"""
)

_GITIGNORE = """\
__pycache__/
*.py[cod]
.venv/
venv/
build/
dist/
*.egg-info/
.pytest_cache/
.mypy_cache/
.ruff_cache/
.coverage
htmlcov/
.DS_Store
"""


def package_name_for(name: str) -> str:
    """Return the Python package name for a project called ``name``."""
    if "/" in name or "\\" in name or name in (".", ".."):
        raise ScaffoldError(f"{name!r} is a path, not a project name")
    package = name.strip().replace("-", "_").replace(" ", "_")
    if not package.isidentifier() or keyword.iskeyword(package):
        raise ScaffoldError(
            f"{name!r} does not produce a usable Python package name "
            f"({package!r}); use letters, digits, hyphens and underscores"
        )
    return package


def title_for(name: str) -> str:
    """Return a human-facing title for a project called ``name``."""
    words = name.strip().replace("-", " ").replace("_", " ").split()
    return " ".join(word[:1].upper() + word[1:] for word in words) or name


def scaffold_project(
    name: str,
    parent: Path | str | None = None,
    *,
    library_version: str,
    port: int = DEFAULT_DEV_PORT,
) -> ScaffoldedProject:
    """Write a ready-to-run project directory and return what was created."""
    package = package_name_for(name)
    title = title_for(name)
    root = (Path(parent).resolve() if parent is not None else Path.cwd().resolve()) / name
    if root.exists() and any(root.iterdir()):
        raise ScaffoldError(f"{root} already exists and is not empty")

    fields = {
        "project": name,
        "package": package,
        "title": title,
        "port": str(port),
        "library_version": library_version,
    }
    contents = {
        "pyproject.toml": _PYPROJECT.substitute(fields),
        "README.md": _README.substitute(fields),
        ".gitignore": _GITIGNORE,
        f"src/{package}/__init__.py": _PACKAGE_INIT.substitute(fields),
        f"src/{package}/app.py": _APP_MODULE.substitute(fields),
        "tests/test_app.py": _TEST_MODULE.substitute(fields),
    }

    written: list[Path] = []
    for relative, text in contents.items():
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        written.append(path)
    return ScaffoldedProject(root=root, package=package, files=tuple(written))


__all__ = [
    "DEFAULT_DEV_PORT",
    "ScaffoldError",
    "ScaffoldedProject",
    "package_name_for",
    "scaffold_project",
    "title_for",
]
