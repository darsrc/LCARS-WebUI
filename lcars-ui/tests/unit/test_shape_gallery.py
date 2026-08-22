"""Contract guardrails for the truth-led Surface Engine gallery."""

from __future__ import annotations

import warnings
from collections.abc import Callable, Iterable

import pytest

from examples.shape_gallery.app import LEGACY_SCREEN_ALIASES, SCREEN_BUILDERS
from lcars_ui.core.models import Manifest, Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, set_ctx


def _build(screen: str) -> Manifest:
    ctx = _LCARSContext(
        mode=Mode.BUILD,
        session_id=f"shape-gallery-{screen}",
        builder=_ManifestBuilder(),
    )
    set_ctx(ctx)
    builder: Callable[[], None] = SCREEN_BUILDERS[screen]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        builder()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def _walk(widgets: Iterable[Widget]) -> Iterable[Widget]:
    for widget in widgets:
        yield widget
        yield from _walk(getattr(widget, "children", []))


def _surface(manifest: Manifest) -> Widget:
    page = next(iter(manifest.pages.values()))
    widgets = [widget for row in page.rows for column in row.columns for widget in column.widgets]
    assert [widget.type for widget in widgets] == ["surface"]
    return widgets[0]


@pytest.mark.parametrize(
    ("screen", "theme", "design_size", "min_width", "action_id", "required_ids"),
    [
        (
            "seismic_monitor",
            "tng",
            (1200, 900),
            800,
            "seismic-analyze",
            {"seismic-viewport-base", "seismic-primary-elbow", "seismic-data-elbow"},
        ),
        (
            "tactical_sensor",
            "tng",
            (960, 840),
            600,
            "tactical-deep-scan",
            {"tactical-viewport-base", "tactical-header-elbow", "tactical-scan-rim"},
        ),
        (
            "eps_distribution_padd",
            "galaxy",
            (640, 1080),
            400,
            "eps-isolate",
            {"eps-viewport-base", "eps-header-elbow", "eps-route-b"},
        ),
        (
            "warp_field_diagnostic",
            "nemesis",
            (900, 900),
            600,
            "warp-balance",
            {"warp-viewport-base", "warp-header-elbow", "warp-field-rim"},
        ),
        (
            "neural_bioscan",
            "tng",
            (1200, 600),
            720,
            "neural-refine",
            {"neural-viewport-base", "neural-header-elbow", "neural-coherence-wave"},
        ),
    ],
)
def test_shape_gallery_screen_is_a_distinct_operational_surface(
    screen: str,
    theme: str,
    design_size: tuple[int, int],
    min_width: int,
    action_id: str,
    required_ids: set[str],
) -> None:
    manifest = _build(screen)
    page = next(iter(manifest.pages.values()))
    surface = _surface(manifest)
    widgets = list(_walk([surface]))

    assert manifest.meta.theme == theme
    assert page.archetype == "authored"
    assert page.chrome == "none"
    assert (surface.design_width, surface.design_height) == design_size
    assert surface.min_width == min_width
    assert surface.narrow == "scale"
    assert len(surface.children) >= 18
    assert {action_id, *required_ids} <= {widget.id for widget in widgets}
    assert "surface_region" in {widget.type for widget in widgets}
    assert len({widget.id for widget in widgets}) == len(widgets)

    payload = manifest.model_dump_json()
    assert not {"shader", "three_scene", "video_hls"} & {widget.type for widget in widgets}
    assert "data:image" not in payload
    assert ".png" not in payload
    assert "background-image" not in payload
    assert "http://" not in payload
    assert "https://" not in payload


def test_shape_gallery_uses_five_unique_viewport_proportions() -> None:
    manifests = [_build(screen) for screen in SCREEN_BUILDERS]
    surfaces = [_surface(manifest) for manifest in manifests]
    proportions = {round(surface.design_width / surface.design_height, 3) for surface in surfaces}

    assert len(proportions) == len(SCREEN_BUILDERS) == 5
    assert {manifest.meta.theme for manifest in manifests} == {"tng", "galaxy", "nemesis"}


def test_legacy_screen_names_map_to_the_new_operational_gallery() -> None:
    assert LEGACY_SCREEN_ALIASES == {
        "hexagonal_array": "tactical_sensor",
        "hex_sensor_tile": "tactical_sensor",
        "star_beacon": "seismic_monitor",
        "astrometrics_viewport": "seismic_monitor",
        "vase_archive": "eps_distribution_padd",
        "maintenance_padd": "eps_distribution_padd",
        "gear_assembly": "warp_field_diagnostic",
        "engineering_rotor": "warp_field_diagnostic",
        "lens_viewport": "neural_bioscan",
        "medical_lens": "neural_bioscan",
    }
    assert set(LEGACY_SCREEN_ALIASES.values()) == set(SCREEN_BUILDERS)
