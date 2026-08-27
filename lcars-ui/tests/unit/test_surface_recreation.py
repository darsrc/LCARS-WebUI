"""Guardrails for the measured, single-screen Surface example."""

from __future__ import annotations

from collections.abc import Iterable

from examples.surface_recreation.app import DESIGN_SIZE, SCREENS, _seismic_monitor
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx


def _build() -> Manifest:
    ctx = _LCARSContext(
        mode=Mode.BUILD,
        session_id="surface-recreation-seismic",
        builder=_ManifestBuilder(),
    )
    set_ctx(ctx)
    _seismic_monitor()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _walk(widgets: Iterable[Widget]) -> Iterable[Widget]:
    for widget in widgets:
        yield widget
        yield from _walk(getattr(widget, "children", []))


def _surface(manifest: Manifest) -> Widget:
    page = manifest.pages["seismic-monitor"]
    widgets = [widget for row in page.rows for column in row.columns for widget in column.widgets]
    assert [widget.type for widget in widgets] == ["surface"]
    return widgets[0]


def test_recreation_is_one_measured_seismic_surface() -> None:
    manifest = _build()
    page = manifest.pages["seismic-monitor"]
    surface = _surface(manifest)
    widgets = list(_walk([surface]))
    by_id = {widget.id: widget for widget in widgets}

    assert SCREENS == ("seismic_monitor",)
    assert DESIGN_SIZE == (984, 750)
    assert manifest.meta.theme == "tng"
    assert page.archetype == "authored"
    assert page.chrome == "none"
    assert (surface.design_width, surface.design_height) == DESIGN_SIZE
    assert surface.min_width == 720
    assert surface.narrow == "scale"

    assert by_id["seismic-upper-elbow"].type == "path"
    assert len(by_id["seismic-upper-elbow"].commands) == 10
    assert (by_id["seismic-grid-v-00"].x, by_id["seismic-grid-v-00"].y) == (128, 347)
    assert (by_id["seismic-grid-v-00"].w, by_id["seismic-grid-v-00"].h) == (3, 399)
    assert (by_id["seismic-grid-h-06"].x, by_id["seismic-grid-h-06"].y) == (128, 742)
    assert (by_id["seismic-grid-h-06"].w, by_id["seismic-grid-h-06"].h) == (850, 4)
    assert len([widget for widget in widgets if widget.id.startswith("seismic-sample-")]) >= 70


def test_recreation_payload_is_code_rendered_only() -> None:
    payload = _build().model_dump_json().lower()

    for forbidden in (
        "data:image",
        ".png",
        ".jpg",
        ".jpeg",
        "background-image",
        "mask-image",
        "image-set",
        "http://",
        "https://",
    ):
        assert forbidden not in payload
