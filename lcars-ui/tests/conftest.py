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


@pytest.fixture(autouse=True)
def _clear_dsl_widget_state() -> None:
    """Reset _widget_state before every test to prevent cross-test pollution."""
    from lcars_ui.dsl._state import _widget_state

    _widget_state.clear()
