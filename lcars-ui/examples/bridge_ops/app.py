"""Bridge Operations — LCARS-native Phase 13 reference app.

Run with:
    cd lcars-ui && python examples/bridge_ops/app.py
"""

import os

import lcars_ui as lcars


def ui() -> None:
    lcars.config(
        "Bridge Operations",
        theme="galaxy",
        subtitle="NCC-1701-D",
        header_color="orange",
    )

    lcars.nav("Main View", page="main")
    lcars.nav("Systems", page="systems")
    lcars.nav("Logs", page="logs")

    stability = [0.82, 0.84, 0.87, 0.89, 0.91, 0.93, 0.95, 0.94, 0.92, 0.93]

    with lcars.page("Main View", id="main"):
        with lcars.console("Bridge Operations"):
            with lcars.data_panel("Core Telemetry", color="blue"):
                lcars.metric("Warp Core", "Nominal", status="ok", color="blue")
                lcars.metric("Shield Integrity", "94%", status="ok", color="orange")
                lcars.metric("Hull Temperature", "WARN", status="warn", color="yellow")
                lcars.chart(stability, title="Warp Field Stability", color="blue")
            with lcars.control_panel("Tactical Actions", color="orange"):
                with lcars.input_column(side="left"):
                    if lcars.button("Red Alert", color="red"):
                        lcars.notify("Red Alert! All hands to battle stations!", level="error")
                    if lcars.button("Run Threat Scan", color="anakiwa"):
                        lcars.notify("Threat scan dispatched.")
                shields_up = lcars.toggle("Shields Up", value=True)
                mode = lcars.select(
                    "Tactical Mode", ["Passive", "Active", "Combat"], value="Passive"
                )
                lcars.metric("Active Mode", mode.upper(), color="blue")
                lcars.metric(
                    "Shield Status",
                    "ACTIVE" if shields_up else "DOWN",
                    status="ok" if shields_up else "warn",
                    color="blue" if shields_up else "yellow",
                )

    with lcars.page("Systems", id="systems"):
        systems_data = [
            {"System": "Impulse Drive", "Status": "Online", "Load": "42%"},
            {"System": "Life Support", "Status": "Online", "Load": "18%"},
            {"System": "Sensors", "Status": "Degraded", "Load": "67%"},
            {"System": "Communications", "Status": "Online", "Load": "5%"},
        ]
        with lcars.diagnostic("Ship Systems", color="blue") as diag:
            lcars.table(systems_data, title="System Status")
            lcars.gauge("Core Output", 87.2, unit="%", warn_threshold=80.0, crit_threshold=95.0)
            lcars.progress("Repair Queue", 42.0, color="orange")
            with diag.right_inputs():
                if lcars.button("Run Scan", color="anakiwa"):
                    lcars.notify("Systems scan dispatched.")
                online = lcars.toggle("Emergency Power", value=False)
                if online:
                    lcars.alert("Emergency power engaged!", level="yellow", blink=True)

    with lcars.page("Logs", id="logs"):
        with lcars.padd("Bridge Log"):
            lcars.log("bridge", max_lines=500, title="Bridge Log")
            if lcars.button("Append Test Entry"):
                lcars.append_log("bridge", "[LCARS] Manual log entry triggered.")


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
