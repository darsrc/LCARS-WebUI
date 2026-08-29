"""Widget-union capability catalogue and generated-fixture ratchets."""

from __future__ import annotations

import json
from pathlib import Path
from typing import get_args

import pytest
from pydantic import TypeAdapter

from lcars_ui.core.models import Widget
from lcars_ui.dsl._strict_contract import (
    WIDGET_CAPABILITIES,
    WIDGET_CAPABILITY_FAMILIES,
    WIDGET_TYPES,
    validate_widget_capability_catalogue,
)
from scripts.generate_golden import _build_widget_catalogue

ROOT = Path(__file__).resolve().parents[2]
CATALOGUE_PATH = ROOT / "fixtures" / "golden" / "widget-catalog.v2.json"


def _union_widget_types() -> tuple[str, ...]:
    widget_classes = get_args(get_args(Widget)[0])
    return tuple(
        get_args(widget_class.model_fields["type"].annotation)[0]
        for widget_class in widget_classes
    )


def test_widget_type_list_is_derived_from_discriminated_union() -> None:
    assert WIDGET_TYPES == _union_widget_types()
    assert len(WIDGET_TYPES) == len(set(WIDGET_TYPES))


def test_every_widget_union_member_is_explicitly_catalogued() -> None:
    validate_widget_capability_catalogue()
    assert set(WIDGET_CAPABILITIES) == set(_union_widget_types())


def test_catalogue_only_uses_declared_capability_families() -> None:
    allowed = set(WIDGET_CAPABILITY_FAMILIES)
    for widget_type, capabilities in WIDGET_CAPABILITIES.items():
        assert capabilities <= allowed, widget_type


def test_every_generated_widget_fixture_validates_through_union() -> None:
    adapter = TypeAdapter(Widget)
    fixtures = _build_widget_catalogue()["fixtures"]
    assert isinstance(fixtures, dict)
    assert set(fixtures) == set(WIDGET_TYPES)
    for widget_type, fixture in fixtures.items():
        assert adapter.validate_python(fixture).type == widget_type


def test_widget_catalogue_golden_matches_union(
    request: pytest.FixtureRequest,
) -> None:
    if not request.config.getoption("--check-golden", default=False):
        pytest.skip("pass --check-golden to enforce strict widget catalogue drift check")
    committed = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    assert committed == _build_widget_catalogue(), (
        "widget-catalog.v2.json has drifted — run: make contracts-update"
    )
