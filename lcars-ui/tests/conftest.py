"""Shared pytest fixtures and options."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))



def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--check-golden",
        action="store_true",
        default=False,
        help="Enable strict golden contract checks (placeholder in Phase 0).",
    )
