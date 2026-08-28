"""Thin LCARS dashboard demo and smoke client.

Run with:
    cd lcars-ui && LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/dashboard.py
"""

from __future__ import annotations

import os

import lcars_ui as lcars
from lcars_ui import ActionContext, App

POWER_TRANSFER_SERIES = [52, 55, 58, 61, 60, 64, 68, 71, 69, 73, 75, 78]
THERMAL_DRIFT_SERIES = [0.14, 0.18, 0.17, 0.19, 0.22, 0.21, 0.23, 0.24, 0.22, 0.20]
REPAIR_QUEUE = [
    {"System": "Sensor Grid", "State": "Queued", "ETA": "04:20"},
    {"System": "EPS Relay 4", "State": "In Progress", "ETA": "01:35"},
    {"System": "Deflector Lattice", "State": "Review", "ETA": "00:45"},
    {"System": "Aux Nav Bus", "State": "Scheduled", "ETA": "08:10"},
]



app = App()


def _register_pages() -> None:
    app.config(
        "Operations Dashboard",
        theme="galaxy",
        subtitle="Demo / Smoke Client",
        header_color="orange",
        visual_language="strict",
    )


    @app.page("Dashboard", id="dashboard")
    def dashboard() -> None:
        with lcars.console("Operations Dashboard"):
            with lcars.data_panel("Status Overview", color="blue"):
                lcars.header("Shift Snapshot", size="h3", color="pale-canary")
                lcars.metric("Warp Core", "Nominal", status="ok", color="anakiwa")
                lcars.metric("Shield Grid", "96%", status="ok", color="orange")
                lcars.metric("Docking Queue", "03", status="warn", color="yellow")
                lcars.metric("Relay Faults", "01", status="crit", color="red")
                lcars.progress("Maintenance Completion", 68.0, color="anakiwa")
                lcars.gauge(
                    "Deflector Load",
                    72.4,
                    unit="%",
                    warn_threshold=75.0,
                    crit_threshold=90.0,
                    color="orange",
                )
                lcars.alert("EPS relay margin below reserve threshold.", level="yellow")

            with lcars.data_panel("Telemetry Trends", color="anakiwa"):
                lcars.header("Power Routing", size="h3", color="pale-canary")
                lcars.chart(
                    POWER_TRANSFER_SERIES,
                    title="Transfer Rate",
                    color="melrose",
                )
                lcars.sparkline(
                    THERMAL_DRIFT_SERIES,
                    title="Thermal Drift",
                )
                lcars.markdown(
                    "- Transfer throughput is trending upward.\n"
                    "- Thermal drift remains inside watch tolerance.\n"
                    "- Use the action lane to append operator events to the feed."
                )

            with lcars.data_panel("Operations Queue", color="blue"):
                lcars.header("Repair Dispatch", size="h3", color="pale-canary")
                lcars.table(REPAIR_QUEUE, title="Active Queue")
                lcars.log("operations-feed", max_lines=60, title="Event Feed")

            with lcars.control_panel("Operator Actions", color="orange"):
                with lcars.form(
                    "Scan Dispatch",
                    action_id="dashboard-dispatch",
                    submit_label="Dispatch Scan",
                    id="dashboard-scan-form",
                ):
                    lcars.toggle("Auto Balance", value=True, id="dashboard-auto-balance")
                    lcars.select(
                        "Scan Profile",
                        ["Local", "Sector", "Deep"],
                        value="Sector",
                        color="anakiwa",
                        id="dashboard-scan-profile",
                    )
                    lcars.number_input(
                        "Sensor Gain",
                        value=6.5,
                        min=1.0,
                        max=10.0,
                        step=0.1,
                        id="dashboard-sensor-gain",
                    )
                    lcars.text_input(
                        "Operator Tag",
                        placeholder="OPS-01",
                        id="dashboard-operator-tag",
                    )
                lcars.radio_toggle(
                    "Alert Posture",
                    ["Green", "Yellow", "Red"],
                    value="Yellow",
                    color="orange",
                    id="dashboard-alert-posture",
                )
                lcars.button(
                    "Acknowledge Alert",
                    color="orange",
                    id="dashboard-acknowledge",
                )
                lcars.text(
                    "Use the action buttons to send a notification and append an event-log entry.",
                    size="body",
                )

    @app.action("dashboard-dispatch")
    def dispatch_scan(ctx: ActionContext[dict[str, object]]) -> None:
        operator_name = str(ctx.value.get("dashboard-operator-tag") or "OPS-DEFAULT")
        profile = str(ctx.value.get("dashboard-scan-profile") or "Sector")
        gain = float(ctx.value.get("dashboard-sensor-gain") or 6.5)
        balance = bool(ctx.value.get("dashboard-auto-balance", True))
        ctx.notify(f"{profile} scan dispatched by {operator_name}.")
        ctx.append_log(
            "operations-feed",
            (
                f"[OPS] scan={profile} gain={gain:.1f} "
                f"balance={'on' if balance else 'off'} operator={operator_name}"
            ),
        )

    @app.action("dashboard-acknowledge")
    def acknowledge_alert(ctx: ActionContext[None]) -> None:
        ctx.notify("Alert posture acknowledged by operator.")
        ctx.append_log("operations-feed", "[OPS] alert posture acknowledged")




_register_pages()

if __name__ == "__main__":
    import uvicorn

    from lcars_ui.app import create_app

    uvicorn.run(
        create_app(manifest=app.build_manifest(), app=app),
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8104")),
    )
