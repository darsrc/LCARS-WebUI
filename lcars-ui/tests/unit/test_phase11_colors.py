"""Phase 11A color-system coverage tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from lcars_ui.core.models import Header
from lcars_ui.widgets.primitives import Text

ALL_NAMED_COLORS = [
    "orange",
    "red",
    "blue",
    "purple",
    "white",
    "yellow",
    "pale-canary",
    "tanoi",
    "golden-tanoi",
    "neon-carrot",
    "eggplant",
    "lilac",
    "anakiwa",
    "mariner",
    "bahama-blue",
    "blue-bell",
    "melrose",
    "hopbush",
    "chestnut-rose",
    "orange-peel",
    "atomic-tangerine",
    "danub",
    "indigo",
    "lavender-purple",
    "cosmic",
    "red-damask",
    "medium-carmine",
    "bourbon",
    "sandy-brown",
    "periwinkle",
    "dodger-pale",
    "dodger-soft",
    "near-blue",
    "navy-blue",
    "husk",
    "rust",
    "tamarillo",
]


@pytest.mark.parametrize("color", ALL_NAMED_COLORS)
def test_all_named_colors_validate_for_widgets(color: str) -> None:
    widget = Text(id=f"text-{color}", type="text", content="ok", color=color)
    assert widget.color == color


def test_hex_colors_validate_for_widgets() -> None:
    widget = Text(id="hex-color", type="text", content="ok", color="#1A2b3C")
    assert widget.color == "#1A2b3C"


def test_invalid_color_rejected() -> None:
    with pytest.raises(ValidationError):
        Header(title="Invalid", color="not-a-color")
