"""v6.0 Surface Engine acceptance gauntlet.

Each screen exercises one geometric category of canon LCARS composition using
only the public ``lcars_ui`` Python API - no bespoke CSS, JS, or React. Category
descriptions are loose/eyeballed proportions derived by inspection, never
precise measurements taken from any reference image (see project memory
``feedback_ip_reference_handling``). No reference image is served to, loaded
by, or bundled with the application.

Select a screen with ``LCARS_GAUNTLET_SCREEN``. Currently implemented:

``stacked_consoles``
    Two stacked rounded-frame console housings, each with a schematic-style
    readout region and a control-bank region - the "PADD/console-shaped
    canvas" category (Milestone 1).

``annular_helm``
    Two mirrored radial dials (ring + wedge pointer + fanned polar-track
    readouts) joined by a spine bar - the "wide annular helm console"
    category (Milestone 2: ring/wedge geometry + polar tracks).

``polar_scan``
    A full-bleed polar visualization: concentric rings, radial spoke wedges,
    a bright core, and polar-track compass labels - the "full-bleed polar
    visualization" category (Milestone 2).
"""

from __future__ import annotations

import os

import lcars_ui as lcars

SCREEN = os.getenv("LCARS_GAUNTLET_SCREEN", "stacked_consoles").lower()
SCREENS = ("stacked_consoles", "annular_helm", "polar_scan")


def _console_panel(
    *,
    surface: object,
    panel_id: str,
    x: int,
    y: int,
    w: int,
    h: int,
    housing_color: str,
    accent_color: str,
    title: str,
) -> None:
    surface.rounded_rect(x, y, w, h, radius=32, color=housing_color, id=f"{panel_id}-housing")
    surface.capsule(x + 40, y + 20, 320, 24, color=accent_color, id=f"{panel_id}-titlebar")
    surface.circle(x + w - 50, y + 32, 14, color="red", id=f"{panel_id}-accent-dot")

    with surface.region(
        f"{panel_id}-readout",
        x=x + 40,
        y=y + 60,
        w=w - 80,
        h=140,
    ):
        lcars.text(title, size="h2", color=accent_color, id=f"{panel_id}-title-text")
        lcars.text("PRIMARY SEQ    20   720   0203451", size="mono", id=f"{panel_id}-seq-1")
        lcars.text("SECONDARY SEQ  00   891   0019281", size="mono", id=f"{panel_id}-seq-2")
        lcars.text("AUXILIARY SEQ  00   451   0019281", size="mono", id=f"{panel_id}-seq-3")

    with surface.region(
        f"{panel_id}-controls",
        x=x + 40,
        y=y + h - 120,
        w=w - 80,
        h=90,
    ):
        for index in range(4):
            lcars.button(f"SYS {index + 1:02d}", color=accent_color, id=f"{panel_id}-btn-{index}")


def _stacked_consoles() -> None:
    lcars.config(
        "Surface Gauntlet - Stacked Consoles",
        subtitle="Milestone 1 acceptance example",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Stacked Consoles",
        id="stacked-consoles",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(960, 780), min_width=760, narrow="scale") as surface:
            _console_panel(
                surface=surface,
                panel_id="upper",
                x=20,
                y=20,
                w=920,
                h=380,
                housing_color="golden-tanoi",
                accent_color="neon-carrot",
                title="GALAXY CLASS FIRST OFFICER CONSOLE",
            )
            _console_panel(
                surface=surface,
                panel_id="lower",
                x=20,
                y=420,
                w=920,
                h=340,
                housing_color="mariner",
                accent_color="lilac",
                title="AUXILIARY SEQUENCE CONTROL",
            )


def _radial_dial(
    *,
    surface: object,
    dial_id: str,
    cx: int,
    cy: int,
    housing_color: str,
    accent_color: str,
    pointer_start: float,
    pointer_end: float,
    label: str,
    readout_span: tuple[float, float],
) -> None:
    surface.ring(cx, cy, 70, 150, 0, 360, color=housing_color, id=f"{dial_id}-ring")
    surface.wedge(cx, cy, 0, 140, pointer_start, pointer_end, color=accent_color, id=f"{dial_id}-pointer")
    surface.circle(cx, cy, 18, color=housing_color, id=f"{dial_id}-hub")

    with surface.region(f"{dial_id}-label", x=cx - 90, y=cy + 160, w=180, h=24):
        lcars.text(label, size="label", color=accent_color, align="center", id=f"{dial_id}-label-text")

    start_angle, end_angle = readout_span
    readouts = surface.polar(
        center_x=cx, center_y=cy, inner_radius=170, outer_radius=230,
        start_angle=start_angle, end_angle=end_angle, tracks=3, gap_deg=10, id=f"{dial_id}-readouts",
    )
    for index, value in enumerate(["04-171065", "03-783556", "02-417106"]):
        with readouts.track(index, color=accent_color, id=f"{dial_id}-readout-{index}"):
            lcars.text(value, size="micro", align="center", id=f"{dial_id}-readout-text-{index}")


def _annular_helm() -> None:
    lcars.config(
        "Surface Gauntlet - Annular Helm",
        subtitle="Milestone 2 acceptance example",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Annular Helm",
        id="annular-helm",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(1000, 600), min_width=800, narrow="scale") as surface:
            surface.capsule(60, 540, 880, 28, color="orange", id="spine")
            with surface.region("spine-label", x=60, y=546, w=880, h=18):
                lcars.text(
                    "HELM CONTROL - ANNULAR CONSOLE", size="micro", align="center",
                    id="spine-label-text",
                )

            _radial_dial(
                surface=surface,
                dial_id="left-dial",
                cx=260,
                cy=280,
                housing_color="golden-tanoi",
                accent_color="neon-carrot",
                pointer_start=200,
                pointer_end=240,
                label="HEADING",
                readout_span=(125, 235),  # fans outward (west), away from the other dial
            )
            _radial_dial(
                surface=surface,
                dial_id="right-dial",
                cx=740,
                cy=280,
                housing_color="mariner",
                accent_color="lilac",
                pointer_start=300,
                pointer_end=340,
                label="VELOCITY",
                readout_span=(-55, 55),  # fans outward (east), away from the other dial
            )


def _polar_scan() -> None:
    lcars.config(
        "Surface Gauntlet - Polar Scan",
        subtitle="Milestone 2 acceptance example",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Polar Scan",
        id="polar-scan",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(900, 900), min_width=700, narrow="scale") as surface:
            cx, cy = 450, 450

            surface.capsule(60, 20, 780, 28, color="orange", id="top-bar")
            with surface.region("top-label", x=60, y=26, w=780, h=18):
                lcars.text(
                    "GRAVIMETRIC DISTORTION - LOCAL SCAN", size="micro", align="center",
                    id="top-label-text",
                )
            surface.capsule(60, 852, 780, 28, color="orange", id="bottom-bar")
            with surface.region("bottom-label", x=60, y=858, w=780, h=18):
                lcars.text(
                    "CONSOLE 54 2004", size="micro", align="center", id="bottom-label-text",
                )

            ring_bands = [
                (60, 75, "mariner"),
                (140, 155, "lilac"),
                (230, 245, "mariner"),
                (340, 355, "lilac"),
            ]
            for index, (inner, outer, color) in enumerate(ring_bands):
                surface.ring(cx, cy, inner, outer, 0, 360, color=color, id=f"ring-{index}")

            for spoke in range(6):
                angle = spoke * 60
                surface.wedge(
                    cx, cy, 75, 355, angle - 1, angle + 1, color="eggplant", id=f"spoke-{spoke}",
                )

            surface.circle(cx, cy, 50, color="red", id="core-outer")
            surface.circle(cx, cy, 25, color="white", id="core-inner")

            compass = surface.polar(
                center_x=cx, center_y=cy, inner_radius=360, outer_radius=400,
                start_angle=0, end_angle=360, tracks=4, gap_deg=8, id="compass",
            )
            for index, label in enumerate(["000", "090", "180", "270"]):
                with compass.track(index, color="orange", id=f"compass-{index}"):
                    lcars.text(label, size="micro", align="center", id=f"compass-text-{index}")


def build() -> None:
    if SCREEN not in SCREENS:
        raise ValueError(f"Unknown LCARS_GAUNTLET_SCREEN={SCREEN!r}; choose one of {SCREENS}")
    if SCREEN == "stacked_consoles":
        _stacked_consoles()
    elif SCREEN == "annular_helm":
        _annular_helm()
    else:
        _polar_scan()


if __name__ == "__main__":
    lcars.run(
        build,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8078")),
        open_browser=False,
    )
