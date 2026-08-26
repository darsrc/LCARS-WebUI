"""Keep package version declarations synchronized across backend and frontend metadata."""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _pyproject_version() -> str:
    contents = (ROOT / "pyproject.toml").read_text(encoding="utf-8")
    project_section = re.search(r"(?ms)^\[project\]\s*(.*?)(?=^\[|\Z)", contents)
    assert project_section is not None, "pyproject.toml has no [project] section"
    match = re.search(r'^version\s*=\s*"([^"]+)"\s*$', project_section.group(1), re.MULTILINE)
    assert match is not None, "pyproject.toml [project] section has no version"
    return match.group(1)


def _module_version() -> str:
    tree = ast.parse((ROOT / "src/lcars_ui/__init__.py").read_text(encoding="utf-8"))
    versions = [
        node.value.value
        for node in tree.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "__version__"
            for target in node.targets
        )
        and isinstance(node.value, ast.Constant)
        and isinstance(node.value.value, str)
    ]
    assert len(versions) == 1, "expected one string __version__ assignment"
    return versions[0]


def _fastapi_version() -> str:
    tree = ast.parse((ROOT / "src/lcars_ui/app.py").read_text(encoding="utf-8"))
    versions = [
        keyword.value.value
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "FastAPI"
        for keyword in node.keywords
        if keyword.arg == "version"
        and isinstance(keyword.value, ast.Constant)
        and isinstance(keyword.value.value, str)
    ]
    assert len(versions) == 1, "expected one FastAPI version string"
    return versions[0]


def _frontend_version() -> str:
    contents = (ROOT / "frontend/package.json").read_text(encoding="utf-8")
    version = json.loads(contents).get("version")
    assert isinstance(version, str), "frontend/package.json has no string version"
    return version


def test_package_versions_agree() -> None:
    versions = {
        "pyproject.toml": _pyproject_version(),
        "src/lcars_ui/__init__.py": _module_version(),
        "src/lcars_ui/app.py": _fastapi_version(),
        "frontend/package.json": _frontend_version(),
    }

    assert len(set(versions.values())) == 1, f"package version mismatch: {versions}"
