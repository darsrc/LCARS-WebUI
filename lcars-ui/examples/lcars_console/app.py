"""Canonical Phase 13 LCARS console example."""

from __future__ import annotations

import os

import lcars_ui as lcars


def ui() -> None:
    lcars.config(
        "LCARS Console",
        theme="galaxy",
        subtitle="Bridge Command Surface",
        header_color="orange",
        visual_language="strict",
    )

    lcars.nav("Console", page="console")
    lcars.nav("Diagnostics", page="diagnostics")

    with lcars.page("Console", id="console"):
        with lcars.console("Bridge Operations", color="orange"):
            with lcars.data_panel("Systems", color="blue"):
                lcars.metric("Shields", "100%", status="ok")
                lcars.metric("Weapons", "Armed", status="warn")
                lcars.chart(
                    [89, 91, 90, 92, 94, 95, 96, 95, 94, 95],
                    title="Warp Stability",
                    color="blue",
                )
                lcars.table(
                    [
                        {"Subsystem": "Sensors", "Status": "Online"},
                        {"Subsystem": "Transporters", "Status": "Online"},
                        {"Subsystem": "Deflector", "Status": "Standby"},
                    ],
                    title="Subsystem Matrix",
                )

            with lcars.control_panel("Actions", color="orange"):
                if lcars.button("Red Alert", color="red"):
                    lcars.notify("Red Alert initiated.", level="error")
                if lcars.button("Scan", color="anakiwa"):
                    lcars.notify("Long-range scan started.")
                lcars.toggle("Auto-Target", value=True)
                profile = lcars.radio_toggle("Profile", ["Alpha", "Beta", "Gamma"], value="Alpha")
                lcars.text(f"PROFILE {profile}", size="mono")
                lcars.number_input("Warp Factor", value=6.2, min=1.0, max=9.9, step=0.1)

    with lcars.page("Diagnostics", id="diagnostics"):
        with lcars.diagnostic("Warp Core Diagnostics", color="blue") as box:
            lcars.gauge("Core Output", 87.2, unit="%", warn_threshold=80.0, crit_threshold=95.0)
            lcars.progress("Containment Integrity", 72.0, color="orange")
            lcars.markdown("### Plasma Notes\nContainment field stable across all rings.")
            with box.right_inputs():
                lcars.select("Diagnostic Mode", ["Passive", "Scan", "Emergency"], value="Scan")
                lcars.text_input("Command")


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8101")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
