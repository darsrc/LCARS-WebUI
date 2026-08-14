"""Guardrails for the LCARS_TRUTH recreation example."""

from __future__ import annotations

import warnings
from collections.abc import Iterable

import pytest

import lcars_ui as lcars
from examples.canon_recreation.app import BUILDERS
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx

NESTED_WIDGET_FIELDS = (
    "children",
    "left_inputs",
    "right_inputs",
    "main_children",
    "side_children",
    "header_children",
    "column_inputs",
    "left_children",
    "right_children",
    "rail_children",
    "content_children",
)


def _widgets(widgets: Iterable[Widget]) -> Iterable[Widget]:
    for widget in widgets:
        yield widget
        for field in NESTED_WIDGET_FIELDS:
            nested = getattr(widget, field, None)
            if isinstance(nested, list):
                yield from _widgets(nested)


def _build(design: str) -> Manifest:
    ctx = _LCARSContext(mode=Mode.BUILD, session_id=f"canon-{design}", builder=_ManifestBuilder())
    set_ctx(ctx)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        BUILDERS[design]()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


@pytest.mark.parametrize(
    ("design", "required_types"),
    [
        ("seismic", {"lcars_bar", "text"}),
        ("periodic", {"button", "lcars_bar", "text"}),
        ("holodeck", {"button", "lcars_bar", "text"}),
        ("access", {"lcars_bar", "text"}),
    ],
)
def test_canon_recreation_is_a_native_image_free_manifest(
    design: str,
    required_types: set[str],
) -> None:
    manifest = _build(design)
    page = manifest.pages["screen"]
    widgets = [
        widget for row in page.rows for column in row.columns for widget in _widgets(column.widgets)
    ]

    assert page.archetype == "authored"
    assert page.chrome == "none"
    assert sum(widget.type == "authored_composition" for widget in widgets) == 1
    assert required_types <= {widget.type for widget in widgets}
    assert not {"shader", "three_scene", "video_hls"} & {widget.type for widget in widgets}

    payload = manifest.model_dump_json()
    assert "LCARS_TRUTH" not in payload
    assert ".png" not in payload
    assert "data:image" not in payload
    assert "http://" not in payload
    assert "https://" not in payload


def test_periodic_recreation_declares_the_full_authored_element_control_bank() -> None:
    manifest = _build("periodic")
    page = manifest.pages["screen"]
    widgets = [
        widget for row in page.rows for column in row.columns for widget in _widgets(column.widgets)
    ]

    assert page.archetype == "authored"
    assert page.chrome == "none"
    assert sum(widget.type == "authored_composition" for widget in widgets) == 1
    assert sum(widget.type == "button" for widget in widgets) == 75
    assert all(
        widget.presentation == "data_tile" and widget.glyph is not None
        for widget in widgets
        if widget.type == "button"
    )
    assert sum(widget.type == "lcars_bar" for widget in widgets) == 13


@pytest.mark.parametrize(
    ("design", "design_size", "area_count", "bar_count", "button_count", "text_count"),
    [
        ("seismic", (984, 750), 162, 146, 0, 16),
        ("periodic", (1476, 1080), 90, 13, 75, 2),
        ("holodeck", (1388, 1080), 60, 26, 18, 16),
        ("access", (1682, 1080), 68, 37, 0, 31),
    ],
)
def test_canon_recreation_preserves_native_authored_geometry_and_density(
    design: str,
    design_size: tuple[int, int],
    area_count: int,
    bar_count: int,
    button_count: int,
    text_count: int,
) -> None:
    manifest = _build(design)
    page = manifest.pages["screen"]
    widgets = [
        widget for row in page.rows for column in row.columns for widget in _widgets(column.widgets)
    ]
    composition = next(widget for widget in widgets if widget.type == "authored_composition")

    assert (composition.design_width, composition.design_height) == design_size
    assert len(composition.children) == area_count
    assert sum(widget.type == "lcars_bar" for widget in widgets) == bar_count
    assert sum(widget.type == "button" for widget in widgets) == button_count
    assert sum(widget.type == "text" for widget in widgets) == text_count


def test_authored_composition_bypasses_normalization_and_rejects_implicit_overlap() -> None:
    ctx = _LCARSContext(mode=Mode.BUILD, session_id="authored", builder=_ManifestBuilder())
    set_ctx(ctx)
    lcars.config("Authored Test", settings_page=False)
    with lcars.page("Authored", id="authored", layout="authored", chrome="none"):
        with lcars.composition(columns=["1fr", "2fr"], rows=["1fr"], id="stage") as stage:
            with stage.area("first", row=1, column=1):
                lcars.text("FIRST", id="first-text")
            with pytest.raises(ValueError, match="overlap"):
                with stage.area("collision", row=1, column=1):
                    lcars.text("COLLISION", id="collision-text")

    assert ctx.builder is not None
    manifest = ctx.builder.build(ctx.config)
    page = manifest.pages["authored"]
    top_level = [widget for row in page.rows for column in row.columns for widget in column.widgets]
    assert [widget.type for widget in top_level] == ["authored_composition"]
    assert all(not row.id.startswith("phase13-title") for row in page.rows)


def test_authored_track_helpers_emit_safe_css_track_values() -> None:
    assert lcars.px(24) == "24px"
    assert lcars.fr() == "1fr"
    assert lcars.fr(2.5) == "2.5fr"
    assert lcars.auto() == "auto"
    assert lcars.minmax(lcars.px(120), lcars.fr(1)) == "minmax(120px, 1fr)"

    with pytest.raises(ValueError, match="positive"):
        lcars.fr(0)
    with pytest.raises(ValueError, match="non-negative"):
        lcars.px(-1)
    with pytest.raises(ValueError, match="Invalid authored composition"):
        lcars.minmax("0; color: red", "1fr")
