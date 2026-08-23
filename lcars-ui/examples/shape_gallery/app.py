"""Surface Engine shape gallery.

Each screen showcases a creative, unusual shape using only the public
``lcars_ui`` Python API.

Select a screen with ``LCARS_GAUNTLET_SCREEN``. Currently implemented:

``hexagonal_array``
    A hexagonal sensor housing built with polygon geometry and containing a
    centered readout region with text and a scan control.

``star_beacon``
    A ten-point star beacon built with polygon and circle primitives, plus a
    pulse effect on its central alert core.

``vase_archive``
    A symmetrical archive vessel silhouette built with a detailed polygon
    primitive and a compact embedded readout region.

``gear_assembly``
    A cog assembly built with circles and a radial repeat group of rectangular
    teeth surrounding a contrasting central hub.

``lens_viewport``
    An eye-shaped lens built with a filled path of paired arc operations and a
    centered viewport readout region.
"""

from __future__ import annotations

import os

import lcars_ui as lcars

SCREEN = os.getenv("LCARS_GAUNTLET_SCREEN", "hexagonal_array").lower()
SCREENS = (
    "hexagonal_array",
    "star_beacon",
    "vase_archive",
    "gear_assembly",
    "lens_viewport",
)


def _hexagonal_array() -> None:
    lcars.config(
        "Shape Gallery - Hexagonal Array",
        subtitle="Surface Engine shape showcase",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Hexagonal Array",
        id="hexagonal-array",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(800, 700), min_width=600, narrow="scale") as surface:
            surface.polygon(
                [(700, 350), (550, 610), (250, 610), (100, 350), (250, 90), (550, 90)],
                color="mariner",
                id="hex-housing",
            )
            with surface.region("hex-title", x=250, y=140, w=300, h=50):
                lcars.text("HEXAGONAL SENSOR ARRAY", size="label", align="center", id="hex-title-text")
            with surface.region("hex-readout-left", x=210, y=210, w=170, h=160):
                lcars.text("PORT SENSOR", size="micro", align="center", id="hex-left-label")
                lcars.text("94%", size="h1", align="center", id="hex-left-value")
                lcars.text("NOMINAL", size="micro", align="center", id="hex-left-status")
            with surface.region("hex-readout-right", x=420, y=210, w=170, h=160):
                lcars.text("STBD SENSOR", size="micro", align="center", id="hex-right-label")
                lcars.text("87%", size="h1", align="center", id="hex-right-value")
                lcars.text("NOMINAL", size="micro", align="center", id="hex-right-status")
            with surface.region("hex-controls", x=250, y=400, w=300, h=140):
                lcars.button("SCAN", color="atomic-tangerine", id="hex-btn-scan")
                lcars.button("CALIBRATE", color="atomic-tangerine", id="hex-btn-calibrate")
                lcars.button("LOCK TARGET", color="atomic-tangerine", id="hex-btn-lock")


def _star_beacon() -> None:
    lcars.config(
        "Shape Gallery - Star Beacon",
        subtitle="Surface Engine shape showcase",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Star Beacon",
        id="star-beacon",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(800, 700), min_width=600, narrow="scale") as surface:
            surface.polygon(
                [
                    (400, 70), (465, 261), (666, 263), (505, 384), (565, 577),
                    (400, 460), (235, 577), (295, 384), (134, 263), (335, 261),
                ],
                color="red",
                id="star-housing",
            )
            with surface.region("star-readout-top", x=340, y=265, w=120, h=50):
                lcars.text("CONDITION", size="micro", align="center", id="star-condition-label")
                lcars.text("RED ALERT", size="label", align="center", id="star-condition-value")
            surface.circle(400, 350, 45, color="orange", id="star-core")
            surface.effect("star-core", "pulse", period_ms=1200, colors=("orange", "red"))
            with surface.region("star-readout-bottom", x=340, y=400, w=120, h=45):
                lcars.text("SHIELDS 94%", size="micro", align="center", id="star-shields")


def _vase_archive() -> None:
    lcars.config(
        "Shape Gallery - Vase Archive",
        subtitle="Surface Engine shape showcase",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Vase Archive",
        id="vase-archive",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(700, 700), min_width=600, narrow="scale") as surface:
            surface.polygon(
                [
                    (460, 70), (495, 95), (530, 150), (510, 220), (570, 300), (630, 380),
                    (625, 460), (590, 540), (550, 610), (570, 650), (540, 660), (260, 660),
                    (230, 650), (250, 610), (210, 540), (175, 460), (170, 380), (230, 300),
                    (290, 220), (270, 150), (305, 95), (340, 70),
                ],
                color="golden-tanoi",
                id="vase-housing",
            )
            with surface.region("vase-title", x=260, y=310, w=280, h=50):
                lcars.text("ARCHIVE VESSEL 04", size="label", color="white", align="center", id="vase-title-text")
            with surface.region("vase-readout-left", x=215, y=370, w=150, h=100):
                lcars.text("CARGO", size="micro", color="white", align="center", id="vase-cargo-label")
                lcars.text("142 UNITS", size="label", color="white", align="center", id="vase-cargo-value")
            with surface.region("vase-readout-right", x=435, y=370, w=150, h=100):
                lcars.text("AGE", size="micro", color="white", align="center", id="vase-age-label")
                lcars.text("2.3K YRS", size="label", color="white", align="center", id="vase-age-value")
            with surface.region("vase-controls", x=270, y=490, w=260, h=100):
                lcars.button("CATALOG", color="atomic-tangerine", id="vase-btn-catalog")
                lcars.button("RESTORE", color="atomic-tangerine", id="vase-btn-restore")


def _gear_assembly() -> None:
    lcars.config(
        "Shape Gallery - Gear Assembly",
        subtitle="Surface Engine shape showcase",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Gear Assembly",
        id="gear-assembly",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(800, 800), min_width=600, narrow="scale") as surface:
            surface.circle(400, 400, 180, color="mariner", id="gear-body")
            with surface.group(
                repeat_radial={"count": 12, "center": (400, 400), "start_angle": 0, "end_angle": 330},
                id="teeth-group",
            ) as group:
                group.rect(380, 170, 40, 60, color="mariner", id="tooth")
            surface.circle(400, 400, 130, color="atomic-tangerine", id="gear-hub")
            with surface.region("gear-content", x=315, y=315, w=170, h=170):
                lcars.text("ENGINEERING", size="micro", color="white", align="center", id="gear-title")
                lcars.text("94%", size="h1", color="white", align="center", id="gear-power-value")
                lcars.text("POWER OUTPUT", size="micro", color="white", align="center", id="gear-power-label")
                lcars.button("ENGAGE", color="mariner", id="gear-btn-engage")


def _lens_viewport() -> None:
    lcars.config(
        "Shape Gallery - Lens Viewport",
        subtitle="Surface Engine shape showcase",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Lens Viewport",
        id="lens-viewport",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(800, 700), min_width=600, narrow="scale") as surface:
            surface.path(
                [
                    {"op": "move", "x": 400, "y": 175},
                    {"op": "arc", "rx": 220, "ry": 220, "x": 400, "y": 525, "large_arc": 0, "sweep": 1},
                    {"op": "arc", "rx": 220, "ry": 220, "x": 400, "y": 175, "large_arc": 0, "sweep": 1},
                ],
                filled=True,
                color="lilac",
                id="lens-housing",
            )
            with surface.region("lens-title", x=357, y=225, w=86, h=45):
                lcars.text("ORACLE SCAN", size="micro", color="white", align="center", id="lens-title-text")
            with surface.region("lens-readout", x=335, y=280, w=130, h=50):
                lcars.text("COHERENCE", size="micro", color="white", align="center", id="lens-readout-label")
                lcars.text("98%", size="h2", color="white", align="center", id="lens-readout-value")
            with surface.region("lens-controls", x=330, y=335, w=140, h=70):
                lcars.button("REFOCUS", color="atomic-tangerine", id="lens-btn-refocus")
            with surface.region("lens-status", x=352, y=410, w=96, h=55):
                lcars.text("FOCAL LOCK", size="micro", color="white", align="center", id="lens-status-label")
                lcars.text("ACQUIRED", size="micro", color="white", align="center", id="lens-status-value")


def build() -> None:
    if SCREEN not in SCREENS:
        raise ValueError(f"Unknown LCARS_GAUNTLET_SCREEN={SCREEN!r}; choose one of {SCREENS}")
    if SCREEN == "hexagonal_array":
        _hexagonal_array()
    elif SCREEN == "star_beacon":
        _star_beacon()
    elif SCREEN == "vase_archive":
        _vase_archive()
    elif SCREEN == "gear_assembly":
        _gear_assembly()
    else:
        _lens_viewport()


if __name__ == "__main__":
    lcars.run(
        build,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8078")),
        open_browser=False,
    )
