"""Locate the :class:`~lcars_ui.application.App` a ``lcars`` command should run.

Every command that needs a live application (``dev``, ``check``, ``run``)
resolves it through :func:`discover_app`, so they all accept the same targets
and fail with the same message naming exactly what was searched.
"""

from __future__ import annotations

import importlib
import sys
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from lcars_ui.application import App

#: Attribute names tried, in order, when a target names no attribute.
ATTRIBUTE_CANDIDATES = ("app", "application")

#: Human-readable search order, used verbatim in the failure message.
SEARCH_ORDER = (
    "./app.py",
    "./main.py",
    "./src/<package>/app.py",
    "./<package>/app.py",
)


class AppDiscoveryError(Exception):
    """Raised when discovery cannot resolve exactly one application."""


@dataclass(frozen=True)
class DiscoveredApp:
    """One resolved application, plus everything needed to re-import it."""

    app: App
    module_name: str
    attribute: str
    module_path: Path | None
    sys_path_entry: Path
    root: Path

    @property
    def import_string(self) -> str:
        """Return the ``module:attribute`` string that re-imports this app."""
        return f"{self.module_name}:{self.attribute}"

    def describe(self) -> str:
        """Return a one-line human description of where this app came from."""
        location = self.module_path if self.module_path is not None else self.module_name
        return f"{self.attribute} in {location}"


def discover_app(
    target: str | None = None,
    root: Path | str | None = None,
    *,
    command: str = "run",
) -> DiscoveredApp:
    """Import and return the application named by ``target``, or search for one.

    ``target`` accepts ``package.module``, ``package.module:attribute``,
    ``path/to/app.py`` and ``path/to/app.py:attribute``. When it is omitted,
    :data:`SEARCH_ORDER` is walked under ``root``. ``command`` only names the
    calling subcommand in the examples inside failure messages.
    """
    resolved_root = Path(root).resolve() if root is not None else Path.cwd().resolve()
    attribute: str | None = None
    module_path: Path | None = None

    if target:
        module_spec, attribute = _split_target(target)
        if _looks_like_path(module_spec):
            module_path = _resolve_target_path(module_spec, resolved_root)
            module_name, sys_path_entry = _module_name_for_path(module_path)
        else:
            module_name = module_spec
            sys_path_entry = resolved_root
    else:
        module_path = _search(resolved_root, command)
        module_name, sys_path_entry = _module_name_for_path(module_path)

    module = _import_module(module_name, sys_path_entry)
    app, resolved_attribute = _select_app(module, attribute, command)
    app._set_project_root(resolved_root)
    if module_path is None:
        module_file = getattr(module, "__file__", None)
        module_path = Path(module_file).resolve() if module_file else None
    return DiscoveredApp(
        app=app,
        module_name=module_name,
        attribute=resolved_attribute,
        module_path=module_path,
        sys_path_entry=sys_path_entry,
        root=resolved_root,
    )


def _split_target(target: str) -> tuple[str, str | None]:
    module_spec, separator, attribute = target.rpartition(":")
    if not separator:
        return target, None
    if not module_spec:
        raise AppDiscoveryError(f"target {target!r} names an attribute but no module")
    if not attribute.isidentifier():
        raise AppDiscoveryError(
            f"target {target!r} is not a valid module:attribute reference "
            f"({attribute!r} is not an identifier)"
        )
    return module_spec, attribute


def _looks_like_path(module_spec: str) -> bool:
    return module_spec.endswith(".py") or "/" in module_spec or "\\" in module_spec


def _resolve_target_path(module_spec: str, root: Path) -> Path:
    candidate = Path(module_spec)
    if not candidate.is_absolute():
        candidate = root / candidate
    candidate = candidate.resolve()
    if not candidate.is_file():
        raise AppDiscoveryError(f"no such application file: {candidate}")
    if candidate.suffix != ".py":
        raise AppDiscoveryError(f"not a Python module: {candidate}")
    return candidate


def _module_name_for_path(path: Path) -> tuple[str, Path]:
    """Map a file to its dotted module name and the directory that imports it."""
    parts = [path.stem]
    directory = path.parent
    while (directory / "__init__.py").is_file() and directory.parent != directory:
        parts.insert(0, directory.name)
        directory = directory.parent
    return ".".join(parts), directory


def _search(root: Path, command: str) -> Path:
    """Return the single application file found under ``root``, or explain."""
    for label, matches in _search_tiers(root):
        if not matches:
            continue
        if len(matches) > 1:
            listed = "\n".join(f"  {match}" for match in matches)
            raise AppDiscoveryError(
                f"found more than one {label} under {root}:\n{listed}\n"
                "name one explicitly, for example: "
                f"lcars {command} {_relative(matches[0], root)}"
            )
        return matches[0]

    searched = "\n".join(f"  {entry}" for entry in SEARCH_ORDER)
    raise AppDiscoveryError(
        f"no LCARS application found under {root}\n"
        f"searched:\n{searched}\n"
        "pass an explicit target instead, for example: "
        f"lcars {command} src/myapp/app.py, or lcars {command} myapp.app:app"
    )


def _search_tiers(root: Path) -> list[tuple[str, list[Path]]]:
    packages_in_src = _packages(root / "src")
    packages_in_root = _packages(root)
    return [
        (SEARCH_ORDER[0], _existing([root / "app.py"])),
        (SEARCH_ORDER[1], _existing([root / "main.py"])),
        (SEARCH_ORDER[2], _existing(package / "app.py" for package in packages_in_src)),
        (SEARCH_ORDER[3], _existing(package / "app.py" for package in packages_in_root)),
    ]


def _packages(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    return sorted(
        child
        for child in directory.iterdir()
        if child.is_dir() and (child / "__init__.py").is_file()
    )


def _existing(paths: Iterable[Path]) -> list[Path]:
    return [path for path in paths if path.is_file()]


def _relative(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def _import_module(module_name: str, sys_path_entry: Path) -> ModuleType:
    entry = str(sys_path_entry)
    if entry not in sys.path:
        sys.path.insert(0, entry)
    try:
        return importlib.import_module(module_name)
    except ModuleNotFoundError as error:
        if error.name and not module_name.startswith(error.name):
            raise
        raise AppDiscoveryError(
            f"could not import {module_name!r} (searched {entry}): {error}"
        ) from error


def _select_app(module: ModuleType, attribute: str | None, command: str) -> tuple[App, str]:
    from lcars_ui.application import App

    module_name = module.__name__
    if attribute is not None:
        if not hasattr(module, attribute):
            raise AppDiscoveryError(
                f"module {module_name!r} has no attribute {attribute!r}"
            )
        candidate = getattr(module, attribute)
        if not isinstance(candidate, App):
            raise AppDiscoveryError(
                f"{module_name}:{attribute} is a {type(candidate).__name__}, "
                "not an lcars_ui.App"
            )
        return candidate, attribute

    for name in ATTRIBUTE_CANDIDATES:
        candidate = getattr(module, name, None)
        if isinstance(candidate, App):
            return candidate, name

    found = sorted(
        name
        for name, value in vars(module).items()
        if isinstance(value, App) and not name.startswith("_")
    )
    if len(found) == 1:
        return getattr(module, found[0]), found[0]
    if not found:
        raise AppDiscoveryError(
            f"module {module_name!r} declares no lcars_ui.App\n"
            "searched for attributes: "
            f"{', '.join(ATTRIBUTE_CANDIDATES)}, then any module-level App instance\n"
            f"name one explicitly, for example: lcars {command} {module_name}:app"
        )
    raise AppDiscoveryError(
        f"module {module_name!r} declares several App objects ({', '.join(found)})\n"
        f"name one explicitly, for example: lcars {command} {module_name}:{found[0]}"
    )


__all__ = [
    "ATTRIBUTE_CANDIDATES",
    "SEARCH_ORDER",
    "AppDiscoveryError",
    "DiscoveredApp",
    "discover_app",
]
