"""Strict parity-family console with overview + systems sweep pages."""

from __future__ import annotations

import os

import lcars_ui as lcars


def ui() -> None:
    lcars.config(
        "LCARS Console",
        theme="galaxy",
        subtitle="",
        header_color="orange",
        visual_language="strict",
    )

    with lcars.page("TITLE", id="overview"):
        with lcars.sweep(
            "TITLE",
            subtitle="SUBTITLE",
            color="pale-canary",
            width_sidebar=150,
            left_width=0.30,
            id="overview_sweep_top",
        ) as top_sweep:
            with top_sweep.column_inputs():
                if lcars.button("BUTTON", color="orange"):
                    lcars.notify("Command input acknowledged.")
                lcars.button(" ", color="hopbush", id="overview_top_rect")

            with top_sweep.left():
                lcars.markdown(
                    "NOTE: YOU CAN USE `expand` TO EXTEND THE NEGATIVE TOP OR BOTTOM "
                    "MARGIN OF A LEFT OR RIGHT CONTENT PANEL, E.G., `expand = c(0, 350)`.\n\n"
                    "THIS EXPANDS THE AVAILABLE VERTICAL SPACE FOR THE LEFT AND RIGHT "
                    "CONTENT BOXES, RESPECTIVELY, IN THE DIRECTION WHERE THERE IS NO "
                    "SWEEP FORMATION.",
                )

            with top_sweep.right():
                lcars.chart(
                    [
                        1,
                        0,
                        0,
                        1,
                        3,
                        7,
                        14,
                        27,
                        44,
                        52,
                        71,
                        72,
                        54,
                        52,
                        33,
                        30,
                        19,
                        11,
                        5,
                        1,
                    ],
                    title="",
                    color="melrose",
                    id="overview_chart_alpha",
                )

        with lcars.sweep(
            "TITLE 2",
            subtitle="SUBTITLE 2",
            color="anakiwa",
            reverse=True,
            width_sidebar=150,
            left_width=0.30,
            id="overview_sweep_bottom",
        ) as bottom_sweep:
            with bottom_sweep.column_inputs():
                if lcars.button("BUTTON A", color="orange"):
                    lcars.notify("Auxiliary control A engaged.")
                if lcars.button("BUTTON B", color="orange"):
                    lcars.notify("Auxiliary control B engaged.")
                lcars.button(" ", color="lilac", id="overview_bottom_rect")

            with bottom_sweep.left():
                lcars.markdown(
                    "THIS IS USEFUL IF YOU WANT TO FILL THE ENTIRE PERCEPTUAL SPACE "
                    "FORMED BY A STACKED SWEEP AND REVERSE SWEEP WITH A SINGLE CONTENT DIV "
                    "RATHER THAN BE FORCED TO SPLIT CONTENT INTO TWO PIECES ALIGNED TO "
                    "EACH SWEEP.\n\nSEE THE `lcarsSweep` EXAMPLE IN THE HELP DOCS.",
                )

            with bottom_sweep.right():
                lcars.chart(
                    [
                        1,
                        0,
                        0,
                        1,
                        3,
                        7,
                        14,
                        27,
                        44,
                        52,
                        73,
                        72,
                        54,
                        52,
                        33,
                        29,
                        19,
                        11,
                        5,
                        1,
                    ],
                    title="",
                    color="golden-tanoi",
                    id="overview_chart_beta",
                )

    with lcars.page("SYSTEMS", id="systems"):
        with lcars.sweep(
            "SYSTEMS",
            subtitle="PRIMARY ARRAY",
            color="pale-canary",
            width_sidebar=150,
            left_width=0.30,
            id="systems_sweep_top",
        ) as top_sweep:
            with top_sweep.column_inputs():
                if lcars.button("LINK", color="orange"):
                    lcars.notify("Systems uplink synchronized.")
                lcars.button(" ", color="hopbush", id="systems_top_rect")

            with top_sweep.left():
                lcars.markdown(
                    "PRIMARY SYSTEM BUS SUMMARY.\n\n"
                    "WARP CORE FLOW IS STABLE.\n"
                    "DEFLECTOR CONTROL LOOP IS PHASE-LOCKED.\n"
                    "SHIELD MODULATION IS HOLDING NOMINAL TOLERANCE.",
                )

            with top_sweep.right():
                lcars.chart(
                    [
                        2,
                        1,
                        1,
                        2,
                        4,
                        8,
                        15,
                        24,
                        39,
                        48,
                        63,
                        68,
                        60,
                        51,
                        36,
                        28,
                        21,
                        13,
                        7,
                        3,
                    ],
                    title="",
                    color="melrose",
                    id="systems_chart_alpha",
                )

        with lcars.sweep(
            "SYSTEMS 2",
            subtitle="AUXILIARY ARRAY",
            color="anakiwa",
            reverse=True,
            width_sidebar=150,
            left_width=0.30,
            id="systems_sweep_bottom",
        ) as bottom_sweep:
            with bottom_sweep.column_inputs():
                if lcars.button("SCAN", color="orange"):
                    lcars.notify("Diagnostic sweep complete.")
                if lcars.button("SYNC", color="orange"):
                    lcars.notify("Auxiliary matrix synced.")
                lcars.button(" ", color="lilac", id="systems_bottom_rect")

            with bottom_sweep.left():
                lcars.markdown(
                    "AUXILIARY SYSTEMS ARE BOUND TO THE SAME SWEEP GEOMETRY FAMILY.\n\n"
                    "THIS PAGE EXISTS TO PROVE REUSE OF THE PARITY PRIMITIVES,\n"
                    "NOT TO TARGET A DIFFERENT SCREENSHOT SPECIMEN.",
                )

            with bottom_sweep.right():
                lcars.chart(
                    [
                        3,
                        2,
                        1,
                        2,
                        5,
                        9,
                        16,
                        25,
                        38,
                        47,
                        61,
                        69,
                        58,
                        49,
                        34,
                        27,
                        18,
                        12,
                        8,
                        4,
                    ],
                    title="",
                    color="golden-tanoi",
                    id="systems_chart_beta",
                )


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8101")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
