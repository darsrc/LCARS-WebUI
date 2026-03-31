"""Beta 1.0 Widget Showcase - Multi-page demo of all supported widgets.

Run with:
    cd lcars-ui && LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/beta1_showcase.py
"""

from __future__ import annotations

import os

import lcars_ui as lcars

# Sample data for charts
POWER_SERIES = [52, 55, 58, 61, 60, 64, 68, 71, 69, 73, 75, 78]
THERMAL_SERIES = [0.14, 0.18, 0.17, 0.19, 0.22, 0.21, 0.23, 0.24, 0.22, 0.20]
SPARK_SERIES = [10, 12, 11, 14, 13, 15, 16, 14, 13, 15]

# Table data
SYSTEMS_TABLE = [
    {"System": "Warp Core", "Status": "Online", "Load": "72%"},
    {"System": "Deflector", "Status": "Online", "Load": "45%"},
    {"System": "Shields", "Status": "Standby", "Load": "28%"},
    {"System": "Sensors", "Status": "Online", "Load": "61%"},
]


def dashboard_page() -> None:
    """Dashboard page - Status overview with metrics, charts, and controls."""
    with lcars.console("Operations Dashboard"):
        with lcars.data_panel("Status Overview", color="blue"):
            lcars.header("Ship Status", size="h3", color="pale-canary")
            lcars.metric("Warp Core", "Nominal", status="ok", color="anakiwa")
            lcars.metric("Shield Grid", "96%", status="ok", color="orange")
            lcars.metric("Docking Queue", "03", status="warn", color="yellow")
            lcars.metric("Relay Faults", "01", status="crit", color="red")
            lcars.progress("Maintenance", 68.0, color="anakiwa")
            lcars.gauge("Deflector Load", 72.4, unit="%", warn_threshold=75.0, crit_threshold=90.0, color="orange")
            lcars.alert("EPS relay margin below reserve threshold.", level="yellow")

        with lcars.data_panel("Telemetry", color="anakiwa"):
            lcars.header("Power Routing", size="h3", color="pale-canary")
            lcars.chart(POWER_SERIES, title="Transfer Rate", color="melrose")
            lcars.sparkline(SPARK_SERIES, title="Thermal Drift")

        with lcars.control_panel("Operator Actions", color="orange"):
            lcars.button("Dispatch Scan", color="anakiwa")
            lcars.button("Acknowledge Alert", color="orange")


def inputs_page() -> None:
    """Inputs page - All input widget types."""
    with lcars.console("Input Widgets"):
        with lcars.data_panel("Buttons & Toggle", color="blue"):
            lcars.header("Button Controls", size="h3", color="pale-canary")
            lcars.button("Primary Action", color="orange")
            lcars.button("Secondary Action", color="anakiwa")
            lcars.button("Destructive", color="red")
            lcars.toggle("Enable Auto-Balance", value=True)

        with lcars.data_panel("Selection", color="anakiwa"):
            lcars.header("Selection Controls", size="h3", color="pale-canary")
            lcars.checkbox("Enable Notifications", value=True)
            lcars.checkbox("Enable Audio", value=False)
            alert_posture = lcars.radio_toggle(
                "Alert Posture",
                ["Green", "Yellow", "Red"],
                value="Yellow",
                color="orange",
            )
            scan_mode = lcars.select(
                "Scan Mode",
                ["Local", "Sector", "Deep"],
                value="Sector",
                color="anakiwa",
            )

        with lcars.data_panel("Text Input", color="blue"):
            lcars.header("Text Fields", size="h3", color="pale-canary")
            operator_id = lcars.text_input("Operator ID", placeholder="Enter ID...")
            sensor_gain = lcars.number_input(
                "Sensor Gain",
                value=6.5,
                min=1.0,
                max=10.0,
                step=0.1,
            )
            lcars.text(f"Operator: {operator_id or 'Not set'}", size="body")
            lcars.text(f"Gain: {sensor_gain}", size="body")

        with lcars.data_panel("Form Composite", color="orange"):
            lcars.header("Form Widget", size="h3", color="pale-canary")
            with lcars.form("Login Form", "login-action"):
                lcars.text_input("username", placeholder="Username")
                lcars.text_input("password", placeholder="Password", password=True)
                lcars.button("Submit", color="orange")


def data_page() -> None:
    """Data page - Display widgets for tables, charts, logs, markdown."""
    with lcars.console("Data Display"):
        with lcars.data_panel("Table", color="blue"):
            lcars.header("System Status", size="h3", color="pale-canary")
            lcars.table(SYSTEMS_TABLE, title="Active Systems")

        with lcars.data_panel("Charts", color="anakiwa"):
            lcars.header("Telemetry", size="h3", color="pale-canary")
            lcars.chart(POWER_SERIES, title="Power Transfer", color="melrose")
            lcars.sparkline(SPARK_SERIES, title="Quick Trend")

        with lcars.data_panel("Markdown", color="blue"):
            lcars.header("Documentation", size="h3", color="pale-canary")
            lcars.markdown(
                "## System Overview\n"
                "- **Warp Core**: Operating at nominal efficiency\n"
                "- **Shields**: Standby mode active\n"
                "- **Sensors**: Scanning sector 7G\n\n"
                "> All systems within normal parameters."
            )

        with lcars.data_panel("Log Viewer", color="orange"):
            lcars.header("Event Log", size="h3", color="pale-canary")
            lcars.log("system-log", max_lines=50, title="System Events")


def containers_page() -> None:
    """Containers page - All container widget types."""
    with lcars.console("Container Widgets"):
        with lcars.box("LCARS Box", color="blue"):
            lcars.text("This is a basic LCARS box container.", size="body")
            lcars.metric("Metric 1", "100", color="anakiwa")
            lcars.metric("Metric 2", "200", color="orange")

        with lcars.sweep("LCARS Sweep", color="anakiwa"):
            lcars.text("This is a sweep container with sidebar.", size="body")
            lcars.button("Action 1", color="orange")
            lcars.button("Action 2", color="blue")

        with lcars.bracket(color="orange"):
            lcars.text("Bracket container for grouped content.", size="body")
            lcars.progress("Progress", 45.0, color="anakiwa")

        lcars.header("Standalone Header", size="h2", color="pale-canary")
        lcars.text("Header widget for section titles.", size="body")


def inputs_page() -> None:
    """Inputs page - All input widget types."""
    with lcars.console("Input Widgets"):
        with lcars.data_panel("Buttons & Toggle", color="blue"):
            lcars.header("Button Controls", size="h3", color="pale-canary")
            lcars.button("Primary Action", color="orange")
            lcars.button("Secondary Action", color="anakiwa")
            lcars.button("Destructive", color="red")
            lcars.toggle("Enable Auto-Balance", value=True)

        with lcars.data_panel("Selection", color="anakiwa"):
            lcars.header("Selection Controls", size="h3", color="pale-canary")
            lcars.checkbox("Enable Notifications", value=True)
            lcars.checkbox("Enable Audio", value=False)
            alert_posture = lcars.radio_toggle(
                "Alert Posture",
                ["Green", "Yellow", "Red"],
                value="Yellow",
                color="orange",
            )
            scan_mode = lcars.select(
                "Scan Mode",
                ["Local", "Sector", "Deep"],
                value="Sector",
                color="anakiwa",
            )

        with lcars.data_panel("Text Input", color="blue"):
            lcars.header("Text Fields", size="h3", color="pale-canary")
            operator_id = lcars.text_input("Operator ID", placeholder="Enter ID...")
            sensor_gain = lcars.number_input(
                "Sensor Gain",
                value=6.5,
                min=1.0,
                max=10.0,
                step=0.1,
            )
            lcars.text(f"Operator: {operator_id or 'Not set'}", size="body")
            lcars.text(f"Gain: {sensor_gain}", size="body")

        with lcars.data_panel("Form Composite", color="orange"):
            lcars.header("Form Widget", size="h3", color="pale-canary")
            with lcars.form("Login Form", "login-action"):
                lcars.text_input("username", placeholder="Username")
                lcars.text_input("password", placeholder="Password", password=True)
                lcars.button("Submit", color="orange")


def data_page() -> None:
    """Data page - Display widgets for tables, charts, logs, markdown."""
    with lcars.console("Data Display"):
        with lcars.data_panel("Table", color="blue"):
            lcars.header("System Status", size="h3", color="pale-canary")
            lcars.table(SYSTEMS_TABLE, title="Active Systems")

        with lcars.data_panel("Charts", color="anakiwa"):
            lcars.header("Telemetry", size="h3", color="pale-canary")
            lcars.chart(POWER_SERIES, title="Power Transfer", color="melrose")
            lcars.sparkline(SPARK_SERIES, title="Quick Trend")

        with lcars.data_panel("Markdown", color="blue"):
            lcars.header("Documentation", size="h3", color="pale-canary")
            lcars.markdown(
                "## System Overview\n"
                "- **Warp Core**: Operating at nominal efficiency\n"
                "- **Shields**: Standby mode active\n"
                "- **Sensors**: Scanning sector 7G\n\n"
                "> All systems within normal parameters."
            )

        with lcars.data_panel("Log Viewer", color="orange"):
            lcars.header("Event Log", size="h3", color="pale-canary")
            lcars.log("system-log", max_lines=50, title="System Events")


def containers_page() -> None:
    """Containers page - All container widget types."""
    with lcars.console("Container Widgets"):
        with lcars.box("LCARS Box", color="blue"):
            lcars.text("This is a basic LCARS box container.", size="body")
            lcars.metric("Metric 1", "100", color="anakiwa")
            lcars.metric("Metric 2", "200", color="orange")

        with lcars.sweep("LCARS Sweep", color="anakiwa"):
            lcars.text("This is a sweep container with sidebar.", size="body")
            lcars.button("Action 1", color="orange")
            lcars.button("Action 2", color="blue")

        with lcars.bracket(color="orange"):
            lcars.text("Bracket container for grouped content.", size="body")
            lcars.progress("Progress", 45.0, color="anakiwa")

        lcars.header("Standalone Header", size="h2", color="pale-canary")
        lcars.text("Header widget for section titles.", size="body")


def ui() -> None:
    """Main UI entry point."""
    lcars.config(
        "Beta 1.0 Showcase",
        theme="galaxy",
        subtitle="Widget Demo",
        header_color="orange",
        visual_language="strict",
    )

    # Navigation
    lcars.nav("Dashboard", page="dashboard")
    lcars.nav("Inputs", page="inputs")
    lcars.nav("Data", page="data")
    lcars.nav("Containers", page="containers")

    # Pages
    with lcars.page("Dashboard", id="dashboard"):
        dashboard_page()

    with lcars.page("Inputs", id="inputs"):
        inputs_page()

    with lcars.page("Data", id="data"):
        data_page()

    with lcars.page("Containers", id="containers"):
        containers_page()


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8104")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )