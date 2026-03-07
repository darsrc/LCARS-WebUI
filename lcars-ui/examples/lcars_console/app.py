"""Canonical Phase 13 strict Overview page (Slice 2)."""

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
        with lcars.sweep(
            "Overview",
            color="orange",
            width_sidebar=132,
            left_width=0.74,
        ) as overview:
            with overview.column_inputs():
                if lcars.button("Red Alert", color="red"):
                    lcars.notify("Red Alert initiated.", level="error")
                if lcars.button("Run Scan", color="anakiwa"):
                    lcars.notify("Long-range scan started.")
                mode = lcars.radio_toggle(
                    "Mode",
                    ["Passive", "Active", "Combat"],
                    value="Passive",
                    color="orange",
                )
                warp = lcars.number_input("Warp", value=6.2, min=1.0, max=9.9, step=0.1)
                shield_grid = lcars.toggle("Shield Grid", value=True, color="anakiwa")
                lcars.text(f"Mode {mode} | Warp {warp:.1f}", size="mono")
                lcars.text(
                    "Shield Grid Armed" if shield_grid else "Shield Grid Standby",
                    size="body",
                    color="anakiwa" if shield_grid else "yellow",
                )

            with overview.left():
                with lcars.box("Upper Field", color="anakiwa", width_left=56, width_right=72) as upper_field:
                    with upper_field.main():
                        lcars.sparkline([44, 46, 45, 47, 48, 49, 50, 49], title="Background Load")
                        lcars.table(
                            [
                                {"Channel": "Command", "State": "Open"},
                                {"Channel": "Tactical", "State": "Monitoring"},
                                {"Channel": "Long Range", "State": "Queued"},
                            ],
                            title="Watch Channels",
                        )
                    with upper_field.side():
                        lcars.metric("Comms", "Nominal", status="ok")
                        lcars.metric("Sensors", "Calibrating", status="warn")

                with lcars.box("Telemetry Matrix", color="blue", width_left=96, width_right=96) as telemetry:
                    with telemetry.main():
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
                    with telemetry.side():
                        lcars.metric("Shields", "100%", status="ok")
                        lcars.metric("Warp Drive", "Ready", status="ok")
                        lcars.metric("Tactical", "Standby", status="warn")
                        lcars.progress("Repair Queue", 42.0, color="orange")

            with overview.right():
                with lcars.box("Status Stack", color="pale-canary", width_left=56, width_right=64) as status_stack:
                    with status_stack.main():
                        lcars.metric("EPS Grid", "Stable", status="ok")
                        lcars.metric("Docking", "Hold", status="warn")
                        lcars.metric("Comms Relay", "Green", status="ok")
                        lcars.metric("Navigation", "Locked", status="ok")
                        lcars.gauge("Core Output", 87.2, unit="%", warn_threshold=80.0, crit_threshold=95.0)
                        lcars.progress("Vector Sync", 76.0, color="anakiwa")
                        lcars.text("Tractor path reserved.", size="mono")
                        if shield_grid:
                            lcars.alert("Shield lattice synchronized.", level="yellow")
                    with status_stack.side():
                        lcars.progress("Dock Queue", 28.0, color="anakiwa")


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8101")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
