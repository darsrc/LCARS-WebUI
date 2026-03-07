"""Canonical Phase 13 LCARS console example."""

from __future__ import annotations

import os

import lcars_ui as lcars


def ui() -> None:
    lcars.config(
        "LCARS Console",
        theme="galaxy",
        subtitle="Overview",
        header_color="orange",
        visual_language="strict",
    )

    with lcars.page("Overview", id="overview"):
        with lcars.console("Overview", color="orange"):
            with lcars.box("Field", color="anakiwa", width_left=56, width_right=72):
                lcars.sparkline([44, 46, 45, 47, 48, 49, 50, 49], title="Background Load")
                lcars.table(
                    [
                        {"Channel": "Command", "State": "Open"},
                        {"Channel": "Tactical", "State": "Monitoring"},
                    ],
                    title="Watch Channels",
                )

            with lcars.box("Telemetry", color="blue", width_left=130, width_right=96) as telemetry:
                with telemetry.left_inputs():
                    if lcars.button("Red Alert", color="red"):
                        lcars.notify("Red Alert initiated.", level="error")
                    if lcars.button("Run Scan", color="anakiwa"):
                        lcars.notify("Long-range scan started.")
                    mode = lcars.select("Mode", ["Passive", "Active", "Combat"], value="Passive")
                    warp = lcars.number_input("Warp Factor", value=6.2, min=1.0, max=9.9, step=0.1)
                    lcars.text(f"Mode {mode}, Warp {warp:.1f}", size="body")

                lcars.chart(
                    [89, 91, 90, 92, 94, 95, 96, 95, 94, 95],
                    title="Field Stability",
                    color="blue",
                )
                lcars.table(
                    [
                        {"Subsystem": "Sensors", "Status": "Online"},
                        {"Subsystem": "Transporters", "Status": "Online"},
                        {"Subsystem": "Deflector", "Status": "Standby"},
                        {"Subsystem": "Life Support", "Status": "Online"},
                    ],
                    title="Subsystem Matrix",
                )
                lcars.metric("Shields", "100%", status="ok")
                lcars.metric("Warp Drive", "Ready", status="ok")
                lcars.metric("Tactical", "Standby", status="warn")
                lcars.progress("Repair Queue", 42.0, color="orange")


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8101")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
