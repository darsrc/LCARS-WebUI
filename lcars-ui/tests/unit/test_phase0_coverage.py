"""Exhaustive Phase 0 implementation-plan coverage checks."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_phase0_package_init_files_exist() -> None:
    init_files = [
        "src/lcars_ui/__init__.py",
        "src/lcars_ui/core/__init__.py",
        "src/lcars_ui/widgets/__init__.py",
        "src/lcars_ui/server/__init__.py",
        "src/lcars_ui/plugins/__init__.py",
        "tests/__init__.py",
        "tests/contracts/__init__.py",
        "tests/unit/__init__.py",
        "tests/integration/__init__.py",
        "examples/__init__.py",
        "examples/bridge_ops/__init__.py",
    ]
    missing = [path for path in init_files if not (ROOT / path).exists()]
    assert not missing, f"Missing __init__.py files: {missing}"


def test_phase0_makefile_commands_match_plan() -> None:
    contents = (ROOT / "Makefile").read_text(encoding="utf-8")
    required_commands = [
        'pip install --no-build-isolation -e ".[dev]"',
        "uvicorn examples.bridge_ops.app:app --reload",
        "pytest tests/ -v",
        "pytest tests/contracts/ --check-golden",
        "python scripts/generate_golden.py",
        "ruff check src/ tests/",
        "mypy src/",
        'find . -not -path "./.venv/*" -type d -name "__pycache__"',
        "ci: clean lint contracts-check test",
    ]
    for command in required_commands:
        assert command in contents


def test_phase0_scripts_execute_successfully() -> None:
    scripts = [
        "scripts/generate_golden.py",
        "scripts/run_smoke_test.py",
    ]
    for script in scripts:
        result = subprocess.run(
            [sys.executable, str(ROOT / script)],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"{script} failed: {result.stdout}\n{result.stderr}"



def test_phase0_compliance_matrix_documented() -> None:
    doc = (ROOT / "docs" / "phase0_coverage.md")
    assert doc.exists()
    contents = doc.read_text(encoding="utf-8")
    required_sections = [
        "# Phase 0 Coverage Matrix",
        "## Directory setup and skeleton",
        "## Dependencies and configuration",
        "## Tooling",
        "## Environment bootstrap",
        "## Contract placeholders and scripts",
    ]
    for section in required_sections:
        assert section in contents
