"""Higher-confidence semantic checks for Phase 0 scaffold quality."""

from __future__ import annotations

import json
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

    required_deps = [
        '"fastapi>=0.110.0,<1.0"',
        '"uvicorn[standard]>=0.29.0,<1.0"',
        '"pydantic>=2.0,<3.0"',
        '"python-multipart>=0.0.9,<1.0"',
        '"pytest>=8.0.0"',
        '"pytest-asyncio>=0.23.0"',
        '"pytest-cov>=5.0.0"',
        '"httpx>=0.27.0"',
        '"ruff>=0.6.0"',
        '"mypy>=1.10.0"',
        '"jsonschema>=4.22.0"',
        '"pip-audit>=2.7.0"',
    ]

    for dep in required_deps:
        assert contents.count(dep) == 1

    assert "strict = true" in contents


def test_placeholder_fixtures_are_valid_json_objects() -> None:
    for name in ("manifest.v1.json", "protocol.v1.json", "schema.v1.json"):
        payload = json.loads((ROOT / "fixtures" / "golden" / name).read_text(encoding="utf-8"))
        assert isinstance(payload, dict)
        assert payload, f"{name} should be non-empty to prevent trivial placeholders"
