"""LCARS Dashboard Demo — Starfleet Operations Console"""

import lcars_ui as lcars


def ui() -> None:
    lcars.config(
        "Starfleet Operations",
        theme="galaxy",
        subtitle="SECTOR 001 — EARTH SPACEDOCK",
        header_color="orange",
    )

    lcars.nav("Operations", page="ops")
    lcars.nav("Fleet Status", page="fleet")
    lcars.nav("Sensors", page="sensors")

    # --- Operations Page ---
    with lcars.page("Operations", id="ops"):
        with lcars.console("Operations Center"):
            lcars.header("Primary Systems", size="h3", color="pale-canary")

            with lcars.data_panel("Core Telemetry", color="blue"):
                lcars.metric("Reactor Output", "97.3%", status="ok", color="blue")
                lcars.metric("Shield Grid", "Online", status="ok", color="orange")
                lcars.metric("Subspace Array", "DEGRADED", status="warn", color="yellow")
                lcars.metric("Docking Clamps", "Engaged", status="ok", color="anakiwa")

                power_readings = [88, 91, 94, 89, 92, 95, 93, 96, 97, 95]
                lcars.chart(power_readings, title="Reactor Output Trend", color="blue")
                lcars.sparkline([42, 45, 41, 48, 52, 49, 55, 53], title="Comm Traffic")

            with lcars.control_panel("Command Actions", color="orange"):
                with lcars.input_column(side="left"):
                    if lcars.button("Yellow Alert", color="golden-tanoi"):
                        lcars.notify("Yellow Alert — all stations report readiness.", level="info")
                    if lcars.button("Red Alert", color="red"):
                        lcars.notify("RED ALERT — All hands to battle stations!", level="error")
                    if lcars.button("Launch Probe", color="anakiwa"):
                        lcars.notify("Class-III probe launched to bearing 147 mark 3.")

                docking = lcars.toggle("Docking Clamps", value=True)
                mode = lcars.select("Operations Mode", ["Standard", "Combat", "Emergency", "Silent Running"], value="Standard")
                lcars.text(f"MODE: {mode.upper()}", size="mono")
                if not docking:
                    lcars.alert("WARNING: Docking clamps disengaged!", level="yellow", blink=True)

    # --- Fleet Status Page ---
    with lcars.page("Fleet Status", id="fleet"):
        with lcars.diagnostic("Fleet Disposition", color="hopbush") as diag:
            fleet_data = [
                {"Vessel": "USS Enterprise", "Registry": "NCC-1701-D", "Status": "Active", "Sector": "001"},
                {"Vessel": "USS Defiant", "Registry": "NX-74205", "Status": "Active", "Sector": "007"},
                {"Vessel": "USS Voyager", "Registry": "NCC-74656", "Status": "MIA", "Sector": "---"},
                {"Vessel": "USS Titan", "Registry": "NCC-80102", "Status": "Patrol", "Sector": "023"},
                {"Vessel": "USS Prometheus", "Registry": "NX-59650", "Status": "Refit", "Sector": "001"},
            ]
            lcars.table(fleet_data, title="Active Fleet Registry")
            lcars.gauge("Spacedock Capacity", 73.0, min=0, max=100, unit="%", warn_threshold=85, crit_threshold=95)
            lcars.progress("Fleet Readiness", 82.0, color="orange")

            with diag.right_inputs():
                if lcars.button("Refresh Registry", color="anakiwa"):
                    lcars.notify("Fleet registry refresh initiated.")
                lcars.toggle("Show Classified", value=False)

    # --- Sensors Page ---
    with lcars.page("Sensors", id="sensors"):
        with lcars.padd("Long Range Sensors"):
            lcars.metric("Sensor Range", "14.2 LY", status="ok", color="blue")
            lcars.metric("Active Contacts", "7", status="ok", color="orange")
            lcars.metric("Anomalies", "2", status="warn", color="yellow")

            sensor_sweep = [30, 35, 42, 38, 55, 62, 48, 41, 37, 33, 29, 31]
            lcars.chart(sensor_sweep, title="Subspace Activity (24h)", color="anakiwa")

            lcars.log("sensor_log", max_lines=200, title="Sensor Log")
            if lcars.button("Run Deep Scan", color="blue"):
                lcars.append_log("sensor_log", "[LCARS] Deep scan initiated — estimated time: 4.7 minutes")
                lcars.notify("Deep scan running...")


if __name__ == "__main__":
    lcars.run(ui, host="127.0.0.1", port=8000, open_browser=False)
