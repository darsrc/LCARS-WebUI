"""Shared pytest fixtures and options."""

import pytest


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--check-golden",
        action="store_true",
        default=False,
        help="Enable strict golden contract checks (placeholder in Phase 0).",
    )
