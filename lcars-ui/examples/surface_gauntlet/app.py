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

``trapezoidal_frame``
    A converging trapezoidal viewscreen frame (polygon) with a diagonal
    elbow-swoop accent, a graduated tick scale, and a control bank - the
    "trapezoidal instrument enclosure" category (Milestone 3: elbow/polygon/
    ticks geometry).

``connector_diagram``
    A central core with peripheral labeled nodes joined by routed connectors
    (straight/elbow/bezier), a ring of decorative ticks, and text following
    an arc - the "diagram with routed connectors" category (Milestone 3:
    connector/text_path geometry).

``tactical_display``
    A full-width status bar over two fixed-width instrument rails flanking a
    stretchy central viewscreen - the "balanced orthogonal tactical display"
    category (Milestone 4: anchor/constraint engine + narrow="fluid"). Resize
    the browser below 1200px to see the rails hold their width while the
    viewscreen reflows via a second server-resolved bounds pass, instead of
    the whole screen scaling down uniformly.

``mirrored_console``
    A mirrored bowtie console: one octagonal lobe polygon declared once and
    reflected into its twin via `surface.group(mirror="x")`, with a nested
    readout panel in the waist between them and a row of identical status
    tabs placed with `surface.group(repeat_linear=...)` - the "mirrored
    irregular polygonal console" category (Milestone 5: mirror/repeat/rotate
    transform groups). Only ONE lobe and ONE tab are ever declared in Python;
    the manifest never carries duplicated geometry, and the frontend expands
    both groups into their mirrored/repeated copies at render time.
"""

from __future__ import annotations

import os

import lcars_ui as lcars

SCREEN = os.getenv("LCARS_GAUNTLET_SCREEN", "stacked_consoles").lower()
SCREENS = (
    "stacked_consoles",
    "annular_helm",
    "polar_scan",
    "trapezoidal_frame",
    "connector_diagram",
    "tactical_display",
    "mirrored_console",
)


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


def _trapezoidal_frame() -> None:
    lcars.config(
        "Surface Gauntlet - Trapezoidal Frame",
        subtitle="Milestone 3 acceptance example",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Trapezoidal Frame",
        id="trapezoidal-frame",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(900, 700), min_width=760, narrow="scale") as surface:
            # Converging viewscreen housing: wider at top, narrower at bottom.
            surface.polygon(
                [(60, 30), (840, 30), (700, 640), (200, 640)],
                color="mariner",
                id="frame-housing",
            )
            # Diagonal elbow-swoop accent in the lower-right, echoing a bold LCARS numeral sweep.
            surface.elbow(
                520, 350, 280, 250, 90, 70, "bottom-right",
                outer_radius=40, inner_radius=24, color="neon-carrot", id="swoop-accent",
            )

            with surface.region("title", x=120, y=50, w=660, h=40):
                lcars.text(
                    "GRAVIMETRIC ANALYSIS", size="h1", color="pale-canary", align="center",
                    id="title-text",
                )

            with surface.region("schematic", x=140, y=110, w=460, h=170):
                lcars.text("REFERENCE FRAME 43274", size="label", color="orange", id="schematic-label")
                lcars.text("6738  784505", size="mono", id="schematic-1")
                lcars.text("32853  637748  982635", size="mono", id="schematic-2")

            # A graduated tick scale, tucked below the schematic text and well clear of both the
            # control bank and the swoop accent's bounding box (x:520-800, y:350-600).
            surface.ticks(
                300, 350, 50, 140, 220, 5,
                tick_length=10, label_offset=14,
                labels=["300", "451", "53", "88", "011"],
                color="atomic-tangerine",
                id="scale",
            )

            with surface.region("controls", x=180, y=440, w=330, h=140):
                for index, label in enumerate(["AL RDT", "EL WRD", "RG STR", "JA VAN"]):
                    lcars.button(label, color="atomic-tangerine", id=f"ctrl-btn-{index}")


def _connector_diagram() -> None:
    lcars.config(
        "Surface Gauntlet - Connector Diagram",
        subtitle="Milestone 3 acceptance example",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Connector Diagram",
        id="connector-diagram",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(design_size=(900, 700), min_width=760, narrow="scale") as surface:
            cx, cy = 450, 350

            surface.ticks(cx, cy, 150, 0, 360, 12, tick_length=14, color="hopbush", id="core-ring")
            surface.circle(cx, cy, 90, color="mariner", id="core")
            surface.arc(cx, cy, 130, 200, 340, color="lilac", id="core-label-arc")
            surface.text_path("core-label-arc", "WARP FIELD DECOHESION", start_offset=8, color="lilac")

            with surface.region("core-label", x=cx - 60, y=cy - 12, w=120, h=24):
                lcars.text("CORE", size="label", color="white", align="center", id="core-text")

            nodes = [
                ("node-a", 120, 100, "straight", "golden-tanoi", "PLASMA"),
                ("node-b", 700, 100, "elbow", "atomic-tangerine", "INJECTOR"),
                ("node-c", 780, 400, "bezier", "lilac", "COIL C"),
                ("node-d", 620, 600, "elbow", "hopbush", "COIL B"),
                ("node-e", 150, 560, "bezier", "golden-tanoi", "COIL A"),
            ]
            for node_id, nx, ny, style, color, label in nodes:
                surface.rounded_rect(nx - 55, ny - 25, 110, 50, radius=10, color=color, id=node_id)
                with surface.region(f"{node_id}-label", x=nx - 55, y=ny - 25, w=110, h=50):
                    lcars.text(label, size="micro", color="white", align="center", id=f"{node_id}-text")
                surface.connector(node_id, "core", style=style, color=color, id=f"wire-{node_id}")


def _tactical_display() -> None:
    lcars.config(
        "Surface Gauntlet - Tactical Display",
        subtitle="Milestone 4 acceptance example",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Tactical Display",
        id="tactical-display",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(
            design_size=(1600, 900),
            min_width=1200,
            narrow="fluid",
            narrow_design_size=(800, 900),
        ) as surface:
            # Full-width status bar: anchored to the parent on both sides with no explicit
            # width, so it fills the gap - the same "near+far, fill" mode a rail-to-rail
            # viewscreen uses below, just anchored to the surface itself instead of siblings.
            surface.rect(anchor_left=0, anchor_right=0, anchor_top=0, h=50, color="pale-canary", id="status-bar")
            with surface.region("status-bar-label", anchor_left=0, anchor_right=0, anchor_top=0, h=50):
                lcars.text("TACTICAL DISPLAY", size="label", align="center", id="status-text")

            # Fixed-width instrument rails - plain absolute placement, unaffected by the
            # narrow pass, so they hold their width while the center reflows around them.
            surface.rounded_rect(0, 60, 220, 840, radius=16, color="mariner", id="rail-left")
            with surface.region("rail-left-controls", x=20, y=80, w=180, h=800):
                for index, label in enumerate(["SHIELDS", "WEAPONS", "SENSORS", "COMMS"]):
                    lcars.button(label, color="atomic-tangerine", id=f"rail-left-btn-{index}")

            # Anchored to the surface's own right edge (not a plain absolute x) so it still
            # sits flush against the right side under the narrower design size too, instead
            # of staying at its wide-design x and running off the narrow canvas.
            surface.rounded_rect(anchor_right=0, y=60, w=220, h=840, radius=16, color="mariner", id="rail-right")
            with surface.region("rail-right-controls", anchor_right=20, y=80, w=180, h=800):
                for index, label in enumerate(["TRANSPORT", "LIFE SUPPORT", "POWER", "HAIL"]):
                    lcars.button(label, color="atomic-tangerine", id=f"rail-right-btn-{index}")

            # The stretchy center: anchored to the rails' inner edges rather than given an
            # absolute width, so it fills whatever gap is left between them - at design
            # width that's 1112px, at the narrow design width only 312px, and the resolver
            # computes both without any client-side layout math.
            viewscreen_anchors = dict(
                anchor_left=lcars.edge_anchor("rail-left", "right", offset=24),
                anchor_right=lcars.edge_anchor("rail-right", "left", offset=24),
                anchor_top=70,
                anchor_bottom=20,
            )
            surface.rounded_rect(radius=16, color="lilac", id="viewscreen", **viewscreen_anchors)
            with surface.region("viewscreen-content", **viewscreen_anchors):
                lcars.text("MAIN VIEWSCREEN", size="h1", align="center", id="viewscreen-title")
                lcars.text("NO SIGNAL", size="label", align="center", id="viewscreen-status")


def _mirrored_console() -> None:
    lcars.config(
        "Surface Gauntlet - Mirrored Console",
        subtitle="Milestone 5 acceptance example",
        theme="galaxy",
        settings_page=False,
    )
    with lcars.page(
        "Mirrored Console",
        id="mirrored-console",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        # design_size center (500, 300) is the default mirror axis for the lobe group below -
        # left blank on purpose, rather than passed explicitly, to exercise that default path.
        with lcars.surface(design_size=(1000, 600), min_width=800, narrow="scale") as surface:
            # One octagonal lobe, declared ONCE - its mirror twin is never written in Python at
            # all, only expanded client-side from this same node tree at render time.
            with surface.group(mirror="x", id="lobe-group") as g:
                g.polygon(
                    [
                        (110, 60), (430, 60), (460, 90),
                        (460, 490), (430, 520), (110, 520),
                        (40, 450), (40, 130),
                    ],
                    color="golden-tanoi",
                    id="lobe",
                )
                with g.region("lobe-readout", x=90, y=250, w=280, h=80):
                    lcars.text("PRIMARY SYSTEMS", size="label", color="bahama-blue", align="center", id="lobe-readout-title")
                    lcars.text("STATUS NOMINAL", size="micro", color="bahama-blue", align="center", id="lobe-readout-status")

            # The waist: a single non-mirrored panel straddling the console's centerline.
            surface.rect(460, 220, 80, 160, color="mariner", id="waist-housing")
            with surface.region("waist-readout", x=460, y=270, w=80, h=60):
                lcars.text("MSD", size="micro", align="center", id="waist-text")

            # A row of identical status tabs, declared ONCE and repeated 5 times via
            # repeat_linear - a second transform mode alongside the lobe's mirror, in the same
            # screen, so both get real gauntlet coverage.
            with surface.group(repeat_linear={"count": 5, "dx": 150, "dy": 0}, id="tab-group") as g:
                g.capsule(20, 16, 100, 24, color="atomic-tangerine", id="tab")


def build() -> None:
    if SCREEN not in SCREENS:
        raise ValueError(f"Unknown LCARS_GAUNTLET_SCREEN={SCREEN!r}; choose one of {SCREENS}")
    if SCREEN == "stacked_consoles":
        _stacked_consoles()
    elif SCREEN == "annular_helm":
        _annular_helm()
    elif SCREEN == "polar_scan":
        _polar_scan()
    elif SCREEN == "trapezoidal_frame":
        _trapezoidal_frame()
    elif SCREEN == "connector_diagram":
        _connector_diagram()
    elif SCREEN == "tactical_display":
        _tactical_display()
    else:
        _mirrored_console()


if __name__ == "__main__":
    lcars.run(
        build,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8078")),
        open_browser=False,
    )
