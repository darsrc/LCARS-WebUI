"""Color-system coverage: the ``color=`` enum is exactly what the renderer paints."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from lcars_ui.core.models import Header
from lcars_ui.core.widget_base import RENDERED_COLOR_TOKENS, RETIRED_COLOR_TOKENS
from lcars_ui.widgets.primitives import Text

ROOT = Path(__file__).resolve().parents[2]
RENDERER_SHARED = ROOT / "frontend" / "src" / "widgets" / "rendererShared.ts"


@pytest.mark.parametrize("color", RENDERED_COLOR_TOKENS)
def test_all_named_colors_validate_for_widgets(color: str) -> None:
    widget = Text(id=f"text-{color}", type="text", content="ok", color=color)
    assert widget.color == color


def test_hex_colors_validate_for_widgets() -> None:
    widget = Text(id="hex-color", type="text", content="ok", color="#1A2b3C")
    assert widget.color == "#1A2b3C"


def test_invalid_color_rejected() -> None:
    with pytest.raises(ValidationError):
        Header(title="Invalid", color="not-a-color")


def test_named_color_enum_is_exactly_the_renderer_color_var_table() -> None:
    """The schema's enum and the renderer's COLOR_VAR keys are the same set.

    A token in the schema but not in COLOR_VAR would validate and then paint
    nothing — the silent no-op this enum exists to prevent. A token in
    COLOR_VAR but not in the schema is unreachable dead code.
    """
    source = RENDERER_SHARED.read_text(encoding="utf-8")
    table = source.split("const COLOR_VAR: Record<string, string> = {", 1)[1]
    table = table.split("};", 1)[0]

    resolved: set[str] = set()
    for line in table.splitlines():
        key, _, value = line.strip().partition(":")
        if "var(--" not in value:
            continue
        resolved.add(key.strip().strip('"'))

    assert resolved, "failed to parse COLOR_VAR out of rendererShared.ts"
    assert resolved == set(RENDERED_COLOR_TOKENS)


@pytest.mark.parametrize("color", RETIRED_COLOR_TOKENS)
def test_retired_tokens_are_rejected_and_the_message_names_the_token(color: str) -> None:
    """A token that renders nothing must fail loudly, naming itself and the alternatives."""
    with pytest.raises(ValidationError) as excinfo:
        Text(id="retired", type="text", content="ok", color=color)

    message = str(excinfo.value)
    assert repr(color) in message, "the rejection must name the offending token"
    for accepted in RENDERED_COLOR_TOKENS:
        assert accepted in message, "the rejection must list every accepted token"
    assert "hex" in message


def test_malformed_hex_is_rejected_with_a_hex_specific_message() -> None:
    with pytest.raises(ValidationError) as excinfo:
        Text(id="bad-hex", type="text", content="ok", color="#12345")

    message = str(excinfo.value)
    assert "'#12345'" in message
    assert "#rgb or #rrggbb" in message


def test_committed_schema_enum_matches_the_narrowed_token_list() -> None:
    schema = json.loads(
        (ROOT / "fixtures" / "golden" / "schema.v2.json").read_text(encoding="utf-8")
    )
    color_property = schema["$defs"]["Text"]["properties"]["color"]
    enum_branch = next(
        branch for branch in color_property["anyOf"] if "enum" in branch
    )
    assert enum_branch["enum"] == list(RENDERED_COLOR_TOKENS)
