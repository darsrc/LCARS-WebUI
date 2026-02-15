"""Phase 0 pyproject configuration checks."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_pyproject_phase0_dependencies_and_strict_mypy_config() -> None:
    contents = (ROOT / "pyproject.toml").read_text(encoding="utf-8")

    expected_snippets = [
        'requires-python = ">=3.10"',
        'python_version = "3.10"',
        'target-version = "py310"',
        '"fastapi>=0.110.0"',
        '"uvicorn[standard]>=0.29.0"',
        '"pydantic>=2.0"',
        '"python-multipart>=0.0.9"',
        '"pytest>=8.0.0"',
        '"pytest-asyncio>=0.23.0"',
        '"httpx>=0.27.0"',
        '"ruff>=0.6.0"',
        '"mypy>=1.10.0"',
        '"jsonschema>=4.22.0"',
        "strict = true",
    ]

    for snippet in expected_snippets:
        assert snippet in contents
