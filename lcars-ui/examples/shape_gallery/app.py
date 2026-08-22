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
            with surface.region("hex-content", x=280, y=250, w=240, h=200):
                lcars.text("SENSOR ARRAY", size="label", align="center", id="hex-title")
                lcars.text("HEXAGONAL", size="h2", align="center", id="hex-value")
                lcars.button("SCAN", color="atomic-tangerine", id="hex-scan")


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
            surface.circle(400, 350, 55, color="orange", id="star-core")
            surface.effect("star-core", "pulse", period_ms=1200, colors=("orange", "red"))
            with surface.region("star-content", x=340, y=560, w=120, h=40):
                lcars.text("RED ALERT", size="micro", align="center", id="star-label")


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
            with surface.region("vase-content", x=280, y=350, w=140, h=100):
                lcars.text("ARCHIVE", size="label", align="center", id="vase-title")
                lcars.text("VESSEL 04", size="micro", align="center", id="vase-value")


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
            surface.circle(400, 400, 200, color="mariner", id="gear-body")
            with surface.group(
                repeat_radial={"count": 12, "center": (400, 400), "start_angle": 0, "end_angle": 330},
                id="teeth-group",
            ) as group:
                group.rect(380, 140, 40, 70, color="mariner", id="tooth")
            surface.circle(400, 400, 70, color="atomic-tangerine", id="gear-hub")
            with surface.region("gear-content", x=310, y=340, w=180, h=120):
                lcars.text("ENGINEERING", size="micro", color="white", align="center", id="gear-title")
                lcars.text("GEAR 04", size="label", color="white", align="center", id="gear-value")


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
            with surface.region("lens-content", x=340, y=310, w=120, h=80):
                lcars.text("ORACLE", size="micro", align="center", id="lens-title")
                lcars.text("LENS", size="label", align="center", id="lens-value")


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
