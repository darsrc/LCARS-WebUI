"""Thin LCARS dashboard demo and smoke client.

Run with:
    cd lcars-ui && LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/dashboard.py
"""

from __future__ import annotations

import os

import lcars_ui as lcars

POWER_TRANSFER_SERIES = [52, 55, 58, 61, 60, 64, 68, 71, 69, 73, 75, 78]
THERMAL_DRIFT_SERIES = [0.14, 0.18, 0.17, 0.19, 0.22, 0.21, 0.23, 0.24, 0.22, 0.20]
REPAIR_QUEUE = [
    {"System": "Sensor Grid", "State": "Queued", "ETA": "04:20"},
    {"System": "EPS Relay 4", "State": "In Progress", "ETA": "01:35"},
    {"System": "Deflector Lattice", "State": "Review", "ETA": "00:45"},
    {"System": "Aux Nav Bus", "State": "Scheduled", "ETA": "08:10"},
]


def ui() -> None:
    lcars.config(
        "Operations Dashboard",
        theme="galaxy",
        subtitle="Demo / Smoke Client",
        header_color="orange",
        visual_language="strict",
    )

    lcars.nav("Dashboard", page="dashboard")

    with lcars.page("Dashboard", id="dashboard"):
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
                with lcars.input_column(side="left"):
                    dispatch_scan = lcars.button("Dispatch Scan", color="anakiwa")
                    acknowledge_alert = lcars.button("Acknowledge Alert", color="orange")

                auto_balance = lcars.toggle("Auto Balance", value=True)
                alert_posture = lcars.radio_toggle(
                    "Alert Posture",
                    ["Green", "Yellow", "Red"],
                    value="Yellow",
                    color="orange",
                )
                scan_profile = lcars.select(
                    "Scan Profile",
                    ["Local", "Sector", "Deep"],
                    value="Sector",
                    color="anakiwa",
                )
                sensor_gain = lcars.number_input(
                    "Sensor Gain",
                    value=6.5,
                    min=1.0,
                    max=10.0,
                    step=0.1,
                )
                operator_tag = lcars.text_input("Operator Tag", placeholder="OPS-01")
                lcars.text(
                    "Use the action buttons to send a notification and append an event-log entry.",
                    size="body",
                )

                operator_name = operator_tag or "OPS-DEFAULT"
                if dispatch_scan:
                    lcars.notify(
                        f"{scan_profile} scan dispatched by {operator_name}.",
                    )
                    lcars.append_log(
                        "operations-feed",
                        (
                            "[OPS] "
                            f"scan={scan_profile} gain={sensor_gain:.1f} "
                            f"balance={'on' if auto_balance else 'off'} "
                            f"operator={operator_name}"
                        ),
                    )

                if acknowledge_alert:
                    lcars.notify(f"{alert_posture} posture acknowledged by {operator_name}.")
                    lcars.append_log(
                        "operations-feed",
                        f"[OPS] posture={alert_posture} acknowledged by {operator_name}",
                    )


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8104")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
