"""Canonical strict Overview page tuned to a literal sweep composition."""

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


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8101")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
