"""Bridge Operations — LCARS reference app on the adaptive console.

Panels are declared as flat page-level siblings; the renderer's adaptive layout
places them into zones (primary data lane / side readouts / control dock) and
fills the viewport — no page scroll.

Run with:
    cd lcars-ui && python examples/bridge_ops/app.py
"""

import os

import lcars_ui as lcars

STABILITY = [0.82, 0.84, 0.87, 0.89, 0.91, 0.93, 0.95, 0.94, 0.92, 0.93]
SYSTEMS_DATA = [
    {"System": "Impulse Drive", "Status": "Online", "Load": "42%"},
    {"System": "Life Support", "Status": "Online", "Load": "18%"},
    {"System": "Sensors", "Status": "Degraded", "Load": "67%"},
    {"System": "Communications", "Status": "Online", "Load": "5%"},
]


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

    # Main View — console archetype: telemetry lane, status rail, command dock.
    with lcars.page("Main View", id="main", layout="console"):
        with lcars.data_panel("Core Telemetry", color="blue", id="bridge-telemetry"):
            lcars.chart(
                STABILITY, title="Warp Field Stability", color="blue", id="bridge-stability"
            )
            lcars.metric("Warp Core", "Nominal", status="ok", color="blue", id="bridge-warp")
            lcars.metric(
                "Shield Integrity", "94%", status="ok", color="orange", id="bridge-shield"
            )
            lcars.metric(
                "Hull Temperature", "WARN", status="warn", color="yellow", id="bridge-hull"
            )
        with lcars.data_panel("Ship Status", color="lilac", id="bridge-status", zone="side"):
            lcars.metric(
                "Alert", "CONDITION GREEN", status="ok", color="anakiwa", id="bridge-alert"
            )
            lcars.progress("Power Reserve", 78, color="pale-canary", id="bridge-power")
            lcars.progress("Crew Readiness", 91, color="anakiwa", id="bridge-crew")
        with lcars.control_panel("Tactical Actions", color="orange", id="bridge-tactical"):
            if lcars.button("Red Alert", color="red", id="bridge-red"):
                lcars.set_alert_condition("red")
                lcars.notify("Red Alert! All hands to battle stations!", level="error")
            if lcars.button("Yellow Alert", color="yellow", id="bridge-yellow"):
                lcars.set_alert_condition("yellow")
                lcars.notify("Yellow alert. Shields to standby.")
            if lcars.button("Stand Down", color="anakiwa", id="bridge-standdown"):
                lcars.set_alert_condition("normal")
                lcars.notify("Alert condition cleared. Resuming normal operations.")
            shields_up = lcars.toggle("Shields Up", value=True, id="bridge-shields")
            mode = lcars.select(
                "Tactical Mode", ["Passive", "Active", "Combat"], value="Passive", id="bridge-mode"
            )
            lcars.metric("Active Mode", mode.upper(), color="blue", id="bridge-activemode")
            lcars.metric(
                "Shield Status",
                "ACTIVE" if shields_up else "DOWN",
                status="ok" if shields_up else "warn",
                color="blue" if shields_up else "yellow",
                id="bridge-shieldstatus",
            )

    # Systems — table lane, diagnostic rail, scan dock.
    with lcars.page("Systems", id="systems", layout="console"):
        with lcars.data_panel("Ship Systems", color="blue", id="sys-table-panel"):
            lcars.table(SYSTEMS_DATA, title="System Status", id="sys-table")
        with lcars.data_panel("Diagnostics", color="lilac", id="sys-diag", zone="side"):
            lcars.gauge(
                "Core Output",
                87.2,
                unit="%",
                warn_threshold=80.0,
                crit_threshold=95.0,
                id="sys-core",
            )
            lcars.progress("Repair Queue", 42.0, color="orange", id="sys-repair")
            lcars.metric("Antimatter", "STABLE", status="ok", color="anakiwa", id="sys-antimatter")
        with lcars.control_panel("Scan Controls", color="orange", id="sys-controls"):
            if lcars.button("Run Scan", color="anakiwa", id="sys-scan"):
                lcars.notify("Systems scan dispatched.")
                lcars.append_log("bridge", "[SCAN] Full systems diagnostic initiated.")
            online = lcars.toggle("Emergency Power", value=False, id="sys-emergency")
            if online:
                lcars.alert(
                    "Emergency power engaged!", level="yellow", blink=True, id="sys-emerg-alert"
                )

    # Logs — a single primary log lane.
    with lcars.page("Logs", id="logs", layout="console"):
        with lcars.data_panel("Bridge Log", color="lilac", id="logs-panel"):
            lcars.log("bridge", max_lines=500, title="Bridge Log", id="logs-viewer")
            if lcars.button("Append Test Entry", color="anakiwa", id="logs-append"):
                lcars.append_log("bridge", "[LCARS] Manual log entry triggered.")


if __name__ == "__main__":
    import itertools

    _frame = itertools.count(1)
    _readiness = itertools.cycle([91, 88, 93, 90, 87, 92])

    @lcars.live(interval=3.0)
    def _bridge_tick() -> None:
        frame = next(_frame)
        lcars.update("bridge-crew", value=float(next(_readiness)))
        lcars.append_log("bridge", f"[{frame:04d}] bridge telemetry sync")

    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
