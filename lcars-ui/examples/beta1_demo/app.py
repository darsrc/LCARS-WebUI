"""Beta 1.0 Widget Demo - Uses all 20 widgets + 4 containers interactively."""

import lcars_ui as lcars
import random
import time


# Sample data for widgets
SAMPLE_TABLE_DATA = [
    {"system": "Warp Core", "status": "Online", "power": "98%"},
    {"system": "Shields", "status": "Online", "power": "100%"},
    {"system": "Sensors", "status": "Online", "power": "95%"},
    {"system": "Weapons", "status": "Standby", "power": "87%"},
]

SAMPLE_CHART_DATA = [45, 52, 78, 65, 89, 72]

SPARKLINE_DATA = [random.randint(20, 80) for _ in range(12)]

# DSL select/radio expects list[str]
SELECT_OPTIONS = ["Red Alert", "Yellow Alert", "Green", "Blue"]
RADIO_OPTIONS = ["Impulse", "Warp 1", "Warp 5", "Warp 9"]


def demo_ui() -> None:
    """Demonstrates all Beta 1.0 widgets interactively."""
    
    lcars.config(
        "Beta 1.0 Widget Demo",
        subtitle="All 20 widgets + 4 containers",
        visual_language="strict",
        theme="galaxy",
    )

    # Navigation
    lcars.nav("Dashboard", page="main")
    lcars.nav("Controls", page="controls")
    lcars.nav("Data", page="data")

    # ===== MAIN PAGE =====
    with lcars.page("main", id="main"):
        with lcars.console("Beta 1.0 Widget Showcase"):
            
            # === PRIMITIVES (5) ===
            with lcars.data_panel("Primitives"):
                lcars.text("This is a text widget - basic content display", size="body")
                lcars.metric("Status", "Operational", status="ok")
                lcars.alert("This is an alert - yellow level", level="yellow")
                lcars.progress("Progress", 67.5)
                lcars.markdown("**Markdown** supports *formatting* and `code`")

            # === INPUTS (9) ===
            with lcars.control_panel("Input Controls"):
                # Button returns True on click
                if lcars.button("Click Me"):
                    lcars.notify("Button clicked!", level="info")
                
                # Toggle returns bool
                power_state = lcars.toggle("Aux Power", value=False)
                if power_state:
                    lcars.notify("Aux Power: ON", level="info")
                
                # Checkbox returns bool
                lcars.checkbox("Enable Auto-Pilot", value=False)
                
                # Select returns str
                alert_level = lcars.select("Alert Level", options=SELECT_OPTIONS, value="green")
                if alert_level != "green":
                    lcars.notify(f"Alert: {alert_level}", level="info")
                
                # Radio returns str
                warp_drive = lcars.radio("Warp Drive", options=RADIO_OPTIONS, value="impulse")
                if warp_drive != "impulse":
                    lcars.notify(f"Warp: {warp_drive}", level="info")
                
                # RadioToggle returns str
                lcars.radio_toggle("Speed", options=RADIO_OPTIONS, value="warp1")
                
                # TextInput returns str
                ship_name = lcars.text_input("Ship Name", placeholder="Enter designation...")
                if ship_name and len(ship_name) > 2:
                    lcars.notify(f"Ship: {ship_name}", level="info")
                
                # NumberInput returns float
                warp_factor = lcars.number_input("Warp Factor", value=1.0, min=0.0, max=9.99, step=0.1)
                if warp_factor > 1.0:
                    lcars.notify(f"Engaging warp {warp_factor:.1f}", level="info")

            # === DATA WIDGETS (4) ===
            with lcars.data_panel("Data Displays"):
                lcars.table(SAMPLE_TABLE_DATA, title="System Status")
                lcars.chart(SAMPLE_CHART_DATA, title="Power Usage")
                lcars.sparkline(SPARKLINE_DATA, title="Reactor Output")
                lcars.gauge("Core Temperature", 72.3, min=0.0, max=100.0, unit="°C", warn_threshold=80.0, crit_threshold=95.0)

            # === MEDIA WIDGETS (3) ===
            with lcars.data_panel("Media"):
                lcars.log("main_log", title="Event Log", max_lines=50)

    # ===== CONTROLS PAGE =====
    with lcars.page("controls", id="controls"):
        with lcars.console("Container & Form Demo"):
            
            # === CONTAINERS (4) ===
            with lcars.box(title="LCARS Box Container", color="orange"):
                with lcars.input_column(side="left"):
                    lcars.button("Box Button 1")
                    lcars.button("Box Button 2")
                lcars.text("Box main content area")
            
            with lcars.sweep(title="LCARS Sweep Container", color="blue"):
                lcars.text("Sweep header content")
                lcars.text("Sweep rail content")
                lcars.text("Sweep main content")
            
            with lcars.bracket(color="purple"):
                lcars.text("Bracket grouped content")
            
            lcars.header("Section Header", size="h2", color="orange")  # type: ignore

            # === FORM ===
            with lcars.form("System Configuration", action_id="config_submit", submit_label="Apply"):
                lcars.text_input("Host Name")
                lcars.number_input("Port", value=8080, min=1, max=65535)
                lcars.select("Protocol", options=["HTTP", "HTTPS"])

    # ===== DATA PAGE =====
    with lcars.page("data", id="data"):
        with lcars.console("Advanced Data"):
            
            # More complex data displays
            lcars.table([
                {"col1": "Row 1", "col2": "Data A", "col3": "Value 1"},
                {"col1": "Row 2", "col2": "Data B", "col3": "Value 2"},
                {"col1": "Row 3", "col2": "Data C", "col3": "Value 3"},
            ], title="Complex Table")
            
            lcars.gauge("Pressure", 45.0, unit="PSI", warn_threshold=60.0, crit_threshold=80.0)
            lcars.gauge("Flow Rate", 88.5, unit="L/min", warn_threshold=70.0, crit_threshold=90.0)
            
            lcars.progress("Download", 33.0)
            lcars.progress("Upload", 77.0)


if __name__ == "__main__":
    lcars.run(demo_ui, host="127.0.0.1", port=8000, open_browser=True)