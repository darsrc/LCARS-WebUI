"""Higher-confidence semantic checks for Phase 0 scaffold quality."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_makefile_targets_dry_run_success() -> None:
    safe_targets = [
        "install",
        "dev",
        "test",
        "contracts-check",
        "contracts-update",
        "lint",
        "clean",
        "ci",
    ]
    for target in safe_targets:
        result = subprocess.run(
            ["make", "-n", target],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"make -n {target} failed: {result.stdout}\n{result.stderr}"


def test_generate_golden_script_is_deterministic() -> None:
    script = ROOT / "scripts" / "generate_golden.py"
    first = subprocess.run(
        [sys.executable, str(script)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert first.returncode == 0
    assert "Generated deterministic golden" in first.stdout

    fixture_paths = [
        ROOT / "fixtures" / "golden" / "manifest.v1.json",
        ROOT / "fixtures" / "golden" / "protocol.v1.json",
        ROOT / "fixtures" / "golden" / "schema.v1.json",
    ]
    before = [path.read_text(encoding="utf-8") for path in fixture_paths]

    second = subprocess.run(
        [sys.executable, str(script)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert second.returncode == 0

    after = [path.read_text(encoding="utf-8") for path in fixture_paths]
    assert before == after


def test_smoke_script_performs_real_checks() -> None:
    script = ROOT / "scripts" / "run_smoke_test.py"
    result = subprocess.run(
        [sys.executable, str(script)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "smoke OK" in result.stdout


def test_pyproject_declares_required_dependencies_once() -> None:
    contents = (ROOT / "pyproject.toml").read_text(encoding="utf-8")

    # Pull the package name out of every quoted PEP 508 requirement (those carrying a
    # version specifier), e.g. "fastapi>=0.110.0,<0.116" -> "fastapi" and
    # "uvicorn[standard]>=0.29.0,<1.0" -> "uvicorn". Keyed to package identity, not
    # version strings, so a deliberate re-pin can't break this guard — the point is
    # that each dependency is declared exactly once.
    names = [
        re.split(r"[<>=!~;\[\s]", spec, maxsplit=1)[0].strip().lower()
        for spec in re.findall(r'"([A-Za-z][A-Za-z0-9._-]*(?:\[[^\]]*\])?[<>=!~][^"]*)"', contents)
    ]

    required = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "python-multipart",
        "pytest",
        "pytest-asyncio",
        "pytest-cov",
        "httpx",
        "ruff",
        "mypy",
        "jsonschema",
        "pip-audit",
    ]
    for name in required:
        assert names.count(name) == 1, f"{name} should be declared exactly once"

    assert "strict = true" in contents


def test_placeholder_fixtures_are_valid_json_objects() -> None:
    for name in ("manifest.v1.json", "protocol.v1.json", "schema.v1.json"):
        payload = json.loads((ROOT / "fixtures" / "golden" / name).read_text(encoding="utf-8"))
        assert isinstance(payload, dict)
        assert payload, f"{name} should be non-empty to prevent trivial placeholders"
