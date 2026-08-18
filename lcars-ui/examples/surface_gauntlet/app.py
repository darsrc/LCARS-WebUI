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
"""

from __future__ import annotations

import os

import lcars_ui as lcars

SCREEN = os.getenv("LCARS_GAUNTLET_SCREEN", "stacked_consoles").lower()


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


def ui() -> None:
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


def build() -> None:
    if SCREEN != "stacked_consoles":
        raise ValueError(f"Unknown LCARS_GAUNTLET_SCREEN={SCREEN!r}; choose: stacked_consoles")
    ui()


if __name__ == "__main__":
    lcars.run(
        build,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8078")),
        open_browser=False,
    )
