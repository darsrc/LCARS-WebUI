"""Truth-led operational examples for the Surface Engine.

The gallery demonstrates irregular and radial instruments inside canonical LCARS
composition. Every visible element is authored through the public ``lcars_ui`` API;
no screenshot, raster backdrop, canvas, or external visual asset participates in the UI.
"""

from __future__ import annotations

import os
import warnings
from collections.abc import Callable

import lcars_ui as lcars


def _config(name: str, theme: str) -> None:
    lcars.config(
        f"Surface Gallery - {name}",
        subtitle="Truth-led operational Surface Engine showcase",
        theme=theme,
        settings_page=False,
    )


def _waveform(
    values: list[int], *, x: int, step: int, baseline: int, scale: float = 1.0
) -> list[dict[str, object]]:
    return [
        {
            "op": "move" if index == 0 else "line",
            "x": x + index * step,
            "y": baseline - int(value * scale),
        }
        for index, value in enumerate(values)
    ]


def _seismic_monitor() -> None:
    _config("Seismic Monitor", "tng")
    with lcars.page(
        "Seismic Monitor",
        id="seismic-monitor",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(
            design_size=(1200, 900),
            min_width=800,
            narrow="scale",
            id="seismic-surface",
        ) as surface:
            surface.rect(0, 0, 1200, 900, color="#000", id="seismic-viewport-base")
            surface.elbow(
                0,
                0,
                530,
                245,
                148,
                30,
                "top-left",
                outer_radius=55,
                inner_radius=30,
                color="#d6a98f",
                id="seismic-primary-elbow",
            )
            surface.rect(530, 210, 670, 30, color="lilac", id="seismic-transfer-band")
            surface.rect(555, 210, 12, 30, color="#000", id="seismic-band-gap-a")
            surface.rect(710, 210, 12, 30, color="#000", id="seismic-band-gap-b")
            surface.rect(1135, 210, 12, 30, color="#000", id="seismic-band-gap-c")
            surface.elbow(
                0,
                250,
                535,
                650,
                148,
                30,
                "top-left",
                outer_radius=55,
                inner_radius=30,
                color="lilac",
                id="seismic-data-elbow",
            )
            for index, color in enumerate(["#d6a98f", "lilac", "golden-tanoi", "#d6a98f"]):
                surface.rect(
                    0,
                    315 + index * 105,
                    145,
                    100,
                    color=color,
                    id=f"seismic-event-segment-{index + 1}",
                )
            surface.rect(0, 525, 145, 100, color="golden-tanoi", id="seismic-selected-event")

            graph_left, graph_top, graph_width, graph_height = 160, 390, 1005, 445
            for index in range(15):
                x = graph_left + index * 67
                surface.rect(
                    x,
                    graph_top,
                    2,
                    graph_height,
                    color="pale-canary",
                    id=f"seismic-grid-v-{index}",
                )
            for index in range(7):
                y = graph_top + index * 74
                surface.rect(
                    graph_left,
                    y,
                    graph_width,
                    2,
                    color="golden-tanoi",
                    id=f"seismic-grid-h-{index}",
                )
            amplitudes = [
                14,
                20,
                8,
                31,
                48,
                17,
                9,
                22,
                71,
                105,
                63,
                34,
                17,
                12,
                27,
                56,
                28,
                13,
                38,
                92,
                133,
                86,
                41,
                18,
                14,
                23,
                65,
                103,
                54,
                21,
                12,
                35,
                76,
                42,
                18,
                9,
                24,
                58,
                31,
                13,
                7,
                19,
                49,
                24,
                10,
                6,
            ]
            for index, amplitude in enumerate(amplitudes):
                x = graph_left + 12 + index * 21
                surface.rect(
                    x,
                    612 - amplitude,
                    7,
                    amplitude * 2,
                    color="#d6a98f",
                    id=f"seismic-sample-{index}",
                )
            surface.path(
                _waveform(
                    [0, 8, -7, 18, -14, 9, -5, 21, -28, 37, -19, 11, -8, 6, 0],
                    x=graph_left,
                    step=67,
                    baseline=612,
                    scale=1.5,
                ),
                filled=False,
                color="white",
                id="seismic-waveform",
            )
            surface.ellipse(1115, 612, 24, 9, color="white", id="seismic-event-marker")

            with surface.region("seismic-title", x=395, y=5, w=770, h=78):
                lcars.text(
                    "PENTHARA IV SEISMIC ACTIVITY MONITOR",
                    size="h2",
                    align="center",
                    id="seismic-title-text",
                )
            with surface.region("seismic-data-bank", x=205, y=92, w=955, h=105):
                lcars.text(
                    "3055  25054800  02  1541  4031  2118  1261  5039  8064  1345",
                    size="micro",
                    id="seismic-bank-row-a",
                )
                lcars.text(
                    "7187  67599654  06  6460  5726  7955  6170  8971  3860  9595",
                    size="micro",
                    id="seismic-bank-row-b",
                )
                lcars.text(
                    "2735  82165938  04  2282  6853  4180  6294  8325  6598  7796",
                    size="micro",
                    id="seismic-bank-row-c",
                )
            with surface.region("seismic-controls", x=4, y=330, w=136, h=385):
                lcars.text("01-4501765", size="label", id="seismic-event-a")
                lcars.text("02-4171065", size="label", id="seismic-event-b")
                lcars.text("04-4755260", size="label", id="seismic-event-c")
                lcars.text("05-4788265", size="label", id="seismic-event-d")
                if lcars.button(
                    "ANALYZE EVENT",
                    color="golden-tanoi",
                    density="compact",
                    id="seismic-analyze",
                ):
                    lcars.update("seismic-array-state", content="ARRAY RESOLVED")
                    lcars.update("seismic-event-id", content="EVENT 04-4755260 / MAG 5.8")
                    lcars.update("seismic-selected-event", color="pale-canary")
                    lcars.update("seismic-event-marker", color="golden-tanoi")
                    lcars.notify("Seismic event resolved across the planetary sensor array.")
            with surface.region("seismic-status", x=560, y=265, w=600, h=94):
                lcars.text(
                    "PLANETARY SENSOR ARRAY ONLINE",
                    size="h1",
                    align="end",
                    id="seismic-array-state",
                )
                lcars.text(
                    "EVENT 04-4755260 / PENDING ANALYSIS",
                    size="label",
                    align="end",
                    id="seismic-event-id",
                )
            with surface.region("seismic-footer", x=170, y=845, w=980, h=44):
                lcars.text(
                    "TECTONIC GRID 07  /  SAMPLE WINDOW 47.2 SEC  /  SENSOR GAIN 0.884",
                    size="micro",
                    align="end",
                    id="seismic-footer-text",
                )


def _tactical_sensor() -> None:
    _config("Tactical Sensor", "tng")
    with lcars.page(
        "Tactical Sensor",
        id="tactical-sensor",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(
            design_size=(960, 840),
            min_width=600,
            narrow="scale",
            id="tactical-surface",
        ) as surface:
            surface.rect(0, 0, 960, 840, color="#000", id="tactical-viewport-base")
            surface.elbow(
                0,
                0,
                610,
                205,
                145,
                32,
                "top-left",
                outer_radius=52,
                inner_radius=28,
                color="atomic-tangerine",
                id="tactical-header-elbow",
            )
            surface.rect(610, 0, 350, 32, color="lilac", id="tactical-header-band")
            surface.elbow(
                0,
                610,
                620,
                230,
                145,
                32,
                "bottom-left",
                outer_radius=52,
                inner_radius=28,
                color="mariner",
                id="tactical-footer-elbow",
            )
            surface.rect(620, 808, 340, 32, color="golden-tanoi", id="tactical-footer-band")
            for index, color in enumerate(["lilac", "atomic-tangerine", "golden-tanoi", "mariner"]):
                surface.rounded_rect(
                    0,
                    215 + index * 92,
                    140,
                    84,
                    radius=12,
                    color=color,
                    id=f"tactical-command-segment-{index}",
                )

            surface.ring(500, 430, 205, 215, 0, 360, color="lilac", id="tactical-scan-rim")
            surface.ring(500, 430, 132, 139, 0, 360, color="mariner", id="tactical-range-ring")
            surface.wedge(
                500,
                430,
                0,
                200,
                336,
                352,
                color="anakiwa",
                id="tactical-scan-sweep",
            )
            surface.effect("tactical-scan-sweep", "sweep", period_ms=3600, direction="cw")
            surface.circle(500, 430, 21, color="pale-canary", id="tactical-scan-core")
            surface.ticks(
                500,
                430,
                230,
                0,
                360,
                17,
                tick_length=13,
                inward=True,
                color="atomic-tangerine",
                id="tactical-bearing-ticks",
            )
            for contact_id, cx, cy, color in [
                ("alpha", 438, 345, "pale-canary"),
                ("beta", 575, 380, "hopbush"),
                ("gamma", 534, 522, "anakiwa"),
            ]:
                surface.circle(cx, cy, 8, color=color, id=f"tactical-contact-{contact_id}")
            surface.capsule(735, 210, 190, 22, color="lilac", id="tactical-contact-terminal")
            surface.capsule(735, 590, 190, 22, color="golden-tanoi", id="tactical-range-terminal")

            with surface.region("tactical-title", x=220, y=18, w=690, h=150):
                lcars.text(
                    "TACTICAL SENSOR ANALYSIS 47-A",
                    size="h1",
                    align="end",
                    id="tactical-title-text",
                )
                lcars.text(
                    "SECTOR 031 / PASSIVE MULTIPHASIC ARRAY",
                    size="micro",
                    align="end",
                    id="tactical-subtitle",
                )
            with surface.region("tactical-controls", x=8, y=228, w=124, h=350):
                lcars.text("ARRAY 01", size="label", id="tactical-array-a")
                lcars.text("ARRAY 02", size="label", id="tactical-array-b")
                lcars.text("ARRAY 03", size="label", id="tactical-array-c")
                if lcars.button(
                    "DEEP SCAN",
                    color="atomic-tangerine",
                    density="compact",
                    id="tactical-deep-scan",
                ):
                    lcars.update("tactical-contact-count", content="06")
                    lcars.update("tactical-contact-state", content="06 CONTACTS TRACKED")
                    lcars.update("tactical-range", content="RANGE 31.8 AU")
                    lcars.update("tactical-scan-sweep", color="pale-canary")
                    lcars.notify("Six contacts resolved and placed under active track.")
                lcars.toggle("AUTO TRACK", value=True, color="mariner", id="tactical-auto-track")
            with surface.region("tactical-center-readout", x=425, y=380, w=150, h=110):
                lcars.text("BEARING", size="micro", align="center", id="tactical-bearing-label")
                lcars.text("047.2", size="h1", align="center", id="tactical-bearing-value")
            with surface.region("tactical-contact-readout", x=750, y=250, w=170, h=310):
                lcars.text("CONTACTS", size="label", id="tactical-contact-label")
                lcars.text("03", size="display", id="tactical-contact-count")
                lcars.text("PASSIVE TRACK", size="h2", id="tactical-contact-state")
                lcars.text("RANGE 12.4 AU", size="label", id="tactical-range")
                lcars.text("GAIN 94.7%", size="micro", id="tactical-gain")
                lcars.text("PHASE LOCK 0.002", size="micro", id="tactical-phase")
            with surface.region("tactical-footer", x=190, y=740, w=700, h=54):
                lcars.text(
                    "THREAT INDEX 00  /  SHIELD INTERCEPT STANDBY  /  WEAPONS HOLD",
                    size="micro",
                    align="end",
                    id="tactical-footer-text",
                )


def _eps_distribution_padd() -> None:
    _config("EPS Distribution PADD", "galaxy")
    with lcars.page(
        "EPS Distribution PADD",
        id="eps-distribution-padd",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(
            design_size=(640, 1080),
            min_width=400,
            narrow="scale",
            id="eps-padd-surface",
        ) as surface:
            surface.polygon(
                [
                    (70, 0),
                    (565, 0),
                    (640, 75),
                    (640, 1000),
                    (560, 1080),
                    (75, 1080),
                    (0, 1005),
                    (0, 75),
                ],
                color="#000",
                id="eps-viewport-base",
            )
            surface.elbow(
                0,
                0,
                465,
                240,
                145,
                32,
                "top-left",
                outer_radius=48,
                inner_radius=25,
                color="golden-tanoi",
                id="eps-header-elbow",
            )
            surface.rect(465, 0, 100, 32, color="hopbush", id="eps-header-terminal")
            surface.elbow(
                0,
                830,
                470,
                250,
                145,
                32,
                "bottom-left",
                outer_radius=48,
                inner_radius=25,
                color="mariner",
                id="eps-footer-elbow",
            )
            surface.rect(470, 1048, 90, 32, color="lilac", id="eps-footer-terminal")
            for index, color in enumerate(
                ["lilac", "hopbush", "atomic-tangerine", "mariner", "golden-tanoi"]
            ):
                surface.rounded_rect(
                    0,
                    260 + index * 105,
                    140,
                    94,
                    radius=12,
                    color=color,
                    id=f"eps-command-segment-{index}",
                )

            nodes = [
                ("eps-feed", 270, 270, "golden-tanoi"),
                ("eps-junction", 270, 445, "lilac"),
                ("eps-regulator", 270, 620, "mariner"),
                ("eps-load", 270, 795, "atomic-tangerine"),
            ]
            for node_id, cx, cy, color in nodes:
                surface.rounded_rect(
                    cx - 85,
                    cy - 34,
                    170,
                    68,
                    radius=14,
                    color=color,
                    id=node_id,
                )
            surface.connector(
                "eps-feed", "eps-junction", style="elbow", color="golden-tanoi", id="eps-route-a"
            )
            surface.connector(
                "eps-junction", "eps-regulator", style="elbow", color="lilac", id="eps-route-b"
            )
            surface.connector(
                "eps-regulator", "eps-load", style="elbow", color="mariner", id="eps-route-c"
            )
            surface.effect("eps-route-b", "flow", period_ms=1500, direction="cw")
            surface.capsule(450, 250, 160, 24, color="pale-canary", id="eps-monitor-terminal")
            surface.capsule(450, 760, 160, 24, color="anakiwa", id="eps-load-terminal")

            with surface.region("eps-title", x=145, y=18, w=440, h=180):
                lcars.text("EPS POWER DISTRIBUTION", size="h1", id="eps-title-text")
                lcars.text("PADD 03 / DECK 12", size="label", id="eps-subtitle")
                lcars.text("ROUTING BUS 7-ALPHA", size="micro", id="eps-route-name")
            with surface.region("eps-controls", x=4, y=275, w=140, h=500):
                lcars.text("FEED 01", size="label", id="eps-control-a")
                lcars.text("BUS 7A", size="label", id="eps-control-b")
                if lcars.button(
                    "ISOLATE 7A",
                    color="atomic-tangerine",
                    density="compact",
                    id="eps-isolate",
                ):
                    lcars.update("eps-route-b", color="hopbush")
                    lcars.update("eps-junction", color="hopbush")
                    lcars.update("eps-load-metric", value="41%", status="ok")
                    lcars.update("eps-bus-progress", value=41)
                    lcars.update("eps-route-status", content="ALTERNATE FEED ONLINE")
                    lcars.notify("EPS branch 7A isolated. Alternate feed is holding.")
                lcars.toggle("AUTO", value=True, color="mariner", id="eps-auto-reroute")
            for region_id, y, label in [
                ("eps-feed-label", 248, "EPS FEED 12.4 TW"),
                ("eps-junction-label", 423, "JUNCTION 7A"),
                ("eps-regulator-label", 598, "REGULATOR 76%"),
                ("eps-load-label", 773, "DECK LOAD 8.9 TW"),
            ]:
                with surface.region(region_id, x=195, y=y, w=150, h=44):
                    lcars.text(
                        label, size="micro", color="white", align="center", id=f"{region_id}-text"
                    )
            with surface.region("eps-readouts", x=425, y=300, w=190, h=405):
                lcars.text("BUS MONITOR", size="label", id="eps-monitor-label")
                lcars.metric(
                    "LOAD", "76%", status="warn", color="pale-canary", id="eps-load-metric"
                )
                lcars.progress("FLOW", 76, color="anakiwa", id="eps-bus-progress")
                lcars.text("ROUTE OPEN", size="h2", id="eps-route-status")
                lcars.text("TEMP 311 K", size="micro", id="eps-temperature")
                lcars.text("HARMONIC 0.004", size="micro", id="eps-harmonic")
            with surface.region("eps-footer", x=145, y=900, w=440, h=100):
                lcars.text("POWER TRANSFER NOMINAL", size="h2", id="eps-footer-state")
                lcars.text("GRID 12 / RELAY 07 / RETURN 99.4%", size="micro", id="eps-footer-data")


def _warp_field_diagnostic() -> None:
    _config("Warp Field Diagnostic", "nemesis")
    with lcars.page(
        "Warp Field Diagnostic",
        id="warp-field-diagnostic",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(
            design_size=(900, 900),
            min_width=600,
            narrow="scale",
            id="warp-field-surface",
        ) as surface:
            surface.rect(0, 0, 900, 900, color="#000", id="warp-viewport-base")
            surface.elbow(
                0,
                0,
                600,
                205,
                145,
                32,
                "top-left",
                outer_radius=52,
                inner_radius=28,
                color="lilac",
                id="warp-header-elbow",
            )
            surface.rect(600, 0, 300, 32, color="mariner", id="warp-header-band")
            surface.elbow(
                0,
                650,
                600,
                250,
                145,
                32,
                "bottom-left",
                outer_radius=52,
                inner_radius=28,
                color="golden-tanoi",
                id="warp-footer-elbow",
            )
            surface.rect(600, 868, 300, 32, color="hopbush", id="warp-footer-band")
            for index, color in enumerate(["lilac", "mariner", "golden-tanoi", "hopbush"]):
                surface.rect(
                    0, 220 + index * 98, 140, 90, color=color, id=f"warp-command-segment-{index}"
                )

            surface.ring(510, 455, 220, 231, 0, 360, color="pale-canary", id="warp-field-rim")
            surface.ring(510, 455, 155, 165, 0, 360, color="mariner", id="warp-core-ring")
            surface.ring(510, 455, 105, 116, 18, 342, color="lilac", id="warp-phase-ring")
            with surface.group(
                repeat_radial={
                    "count": 16,
                    "center": (510, 455),
                    "start_angle": 0,
                    "end_angle": 337.5,
                },
                id="warp-phase-tick-group",
            ) as group:
                group.rect(504, 198, 12, 34, color="atomic-tangerine", id="warp-phase-tick")
            surface.wedge(
                510, 455, 35, 148, 266, 277, color="atomic-tangerine", id="warp-field-pointer"
            )
            surface.effect("warp-field-pointer", "sweep", period_ms=5200, direction="cw")
            surface.circle(510, 455, 72, color="golden-tanoi", id="warp-field-core")
            surface.capsule(710, 225, 165, 22, color="lilac", id="warp-metric-terminal-a")
            surface.capsule(710, 585, 165, 22, color="golden-tanoi", id="warp-metric-terminal-b")

            with surface.region("warp-title", x=230, y=18, w=630, h=140):
                lcars.text("WARP FIELD DIAGNOSTIC 04", size="h1", align="end", id="warp-title-text")
                lcars.text(
                    "NACELLE PHASE / COIL GEOMETRY", size="micro", align="end", id="warp-subtitle"
                )
            with surface.region("warp-controls", x=4, y=235, w=140, h=370):
                lcars.text("PORT COIL", size="label", id="warp-control-a")
                lcars.text("STBD COIL", size="label", id="warp-control-b")
                if lcars.button(
                    "BALANCE FIELD",
                    color="atomic-tangerine",
                    density="compact",
                    id="warp-balance",
                ):
                    lcars.update("warp-output-value", content="96%")
                    lcars.update("warp-phase-value", content="+00.4")
                    lcars.update("warp-variance-value", content="0.7%")
                    lcars.update("warp-sector-state", content="PHASE VARIANCE 0.7%")
                    lcars.update("warp-field-pointer", color="pale-canary")
                    lcars.notify("Warp field balanced. Phase variance below one percent.")
                lcars.toggle("AUTO TRIM", value=True, color="mariner", id="warp-auto-trim")
            with surface.region("warp-core-readout", x=455, y=405, w=110, h=120):
                lcars.text(
                    "OUTPUT", size="micro", color="#000", align="center", id="warp-output-label"
                )
                lcars.text("87%", size="h1", color="#000", align="center", id="warp-output-value")
                lcars.text(
                    "STABLE", size="micro", color="#000", align="center", id="warp-core-state"
                )
            with surface.region("warp-port-readout", x=710, y=270, w=165, h=145):
                lcars.text("PORT PHASE", size="label", id="warp-port-label")
                lcars.text("+03.7", size="h1", id="warp-phase-value")
                lcars.text("COIL LOAD 84%", size="micro", id="warp-coil-load")
            with surface.region("warp-starboard-readout", x=710, y=440, w=165, h=135):
                lcars.text("VARIANCE", size="label", id="warp-variance-label")
                lcars.text("4.8%", size="h1", id="warp-variance-value")
                lcars.text("SECTOR 11 WARN", size="micro", id="warp-sector-state")
            with surface.region("warp-footer", x=220, y=790, w=640, h=58):
                lcars.text(
                    "FIELD CONTAINMENT 98.2%  /  SUBSPACE HARMONIC 0.004",
                    size="micro",
                    align="end",
                    id="warp-footer-text",
                )


def _neural_bioscan() -> None:
    _config("Neural Bioscan", "tng")
    with lcars.page(
        "Neural Bioscan",
        id="neural-bioscan",
        layout="authored",
        chrome="none",
        fillers=False,
        sizing="content",
    ):
        with lcars.surface(
            design_size=(1200, 600),
            min_width=720,
            narrow="scale",
            id="neural-bioscan-surface",
        ) as surface:
            surface.rect(0, 0, 1200, 600, color="#000", id="neural-viewport-base")
            surface.elbow(
                0,
                0,
                610,
                155,
                145,
                30,
                "top-left",
                outer_radius=48,
                inner_radius=25,
                color="mariner",
                id="neural-header-elbow",
            )
            surface.rect(610, 0, 590, 30, color="lilac", id="neural-header-band")
            surface.elbow(
                0,
                445,
                690,
                155,
                145,
                30,
                "bottom-left",
                outer_radius=48,
                inner_radius=25,
                color="golden-tanoi",
                id="neural-footer-elbow",
            )
            surface.rect(690, 570, 510, 30, color="mariner", id="neural-footer-band")
            for index, color in enumerate(["mariner", "lilac", "golden-tanoi"]):
                surface.rect(
                    0, 170 + index * 88, 140, 80, color=color, id=f"neural-command-segment-{index}"
                )

            plot_left, plot_top, plot_width, plot_height = 210, 185, 650, 270
            for index in range(11):
                surface.rect(
                    plot_left + index * 65,
                    plot_top,
                    2,
                    plot_height,
                    color="mariner",
                    id=f"neural-grid-v-{index}",
                )
            for index in range(5):
                surface.rect(
                    plot_left,
                    plot_top + index * 67,
                    plot_width,
                    2,
                    color="lilac",
                    id=f"neural-grid-h-{index}",
                )
            surface.path(
                _waveform(
                    [12, 31, 20, 48, 26, 67, 39, 78, 43, 70, 51, 82, 58, 74, 64],
                    x=plot_left,
                    step=46,
                    baseline=415,
                    scale=2.2,
                ),
                filled=False,
                color="anakiwa",
                id="neural-coherence-wave",
            )
            surface.ellipse(620, 320, 72, 54, color="pale-canary", id="neural-focus-reticle")
            surface.ellipse(620, 320, 58, 42, color="#000", id="neural-focus-field")
            surface.wedge(620, 320, 0, 38, 345, 15, color="hopbush", id="neural-focus-sweep")
            surface.effect("neural-focus-sweep", "sweep", period_ms=3200, direction="cw")
            surface.capsule(900, 175, 255, 22, color="anakiwa", id="neural-metric-terminal-a")
            surface.capsule(900, 430, 255, 22, color="golden-tanoi", id="neural-metric-terminal-b")

            with surface.region("neural-title", x=220, y=14, w=930, h=110):
                lcars.text(
                    "NEURAL BIO-SCAN / CORTICAL MAP", size="h2", align="end", id="neural-title-text"
                )
                lcars.text(
                    "PATIENT 8472 / MEDICAL ARRAY 03",
                    size="micro",
                    align="end",
                    id="neural-subtitle",
                )
            with surface.region("neural-controls", x=4, y=182, w=140, h=245):
                lcars.text("SCAN 01", size="label", id="neural-control-a")
                lcars.text("SCAN 02", size="label", id="neural-control-b")
                if lcars.button(
                    "REFINE SCAN",
                    color="golden-tanoi",
                    density="compact",
                    id="neural-refine",
                ):
                    lcars.update("neural-coherence-value", content="99.8%")
                    lcars.update("neural-focus-progress", value=98)
                    lcars.update("neural-lock-state", content="FOCAL LOCK 99.8%")
                    lcars.update("neural-focus-reticle", color="anakiwa")
                    lcars.notify("Neural focus acquired at 99.8 percent coherence.")
            with surface.region("neural-plot-label", x=220, y=135, w=620, h=80):
                lcars.text("NEURAL COHERENCE", size="h2", id="neural-waveform-title")
                lcars.text("SYNAPTIC PATTERN / 74 HZ", size="micro", id="neural-waveform-subtitle")
            with surface.region("neural-readouts", x=900, y=200, w=255, h=270):
                lcars.text("COHERENCE", size="label", id="neural-coherence-label")
                lcars.text("91.2%", size="h1", id="neural-coherence-value")
                lcars.progress("FOCUS", 72, color="golden-tanoi", id="neural-focus-progress")
                lcars.text("FOCAL SEARCH", size="h2", id="neural-lock-state")
                lcars.text("PATTERN STABLE", size="micro", id="neural-pattern-state")
            with surface.region("neural-footer", x=210, y=500, w=930, h=55):
                lcars.text(
                    "CORTICAL RESPONSE NOMINAL  /  SYNAPTIC DELAY 0.004 SEC",
                    size="micro",
                    align="end",
                    id="neural-footer-text",
                )


SCREEN_BUILDERS: dict[str, Callable[[], None]] = {
    "seismic_monitor": _seismic_monitor,
    "tactical_sensor": _tactical_sensor,
    "eps_distribution_padd": _eps_distribution_padd,
    "warp_field_diagnostic": _warp_field_diagnostic,
    "neural_bioscan": _neural_bioscan,
}

LEGACY_SCREEN_ALIASES = {
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

SCREENS = tuple(SCREEN_BUILDERS)
SCREEN = os.getenv("LCARS_GAUNTLET_SCREEN", "seismic_monitor").lower()


def build() -> None:
    selected = SCREEN
    if selected in LEGACY_SCREEN_ALIASES:
        replacement = LEGACY_SCREEN_ALIASES[selected]
        warnings.warn(
            f"LCARS_GAUNTLET_SCREEN={selected!r} is deprecated; use {replacement!r}.",
            DeprecationWarning,
            stacklevel=2,
        )
        selected = replacement
    try:
        builder = SCREEN_BUILDERS[selected]
    except KeyError as exc:
        raise ValueError(
            f"Unknown LCARS_GAUNTLET_SCREEN={SCREEN!r}; choose one of {SCREENS}"
        ) from exc
    builder()


if __name__ == "__main__":
    lcars.run(
        build,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8078")),
        open_browser=False,
    )
