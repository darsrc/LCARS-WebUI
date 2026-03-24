import random
import lcars_ui as lcars

@lcars.live(interval=5.0)
def ui():
    lcars.config(
        "My Dashboard",
        theme="tng",
        subtitle="v1.0",
        force_uppercase=True,
        label_uppercase=True,
        lcars_font_headers=True,
        lcars_font_labels=True,
        lcars_font_text=False,
    )

    lcars.nav("OVERVIEW", page="overview", color="orange")
    lcars.nav("SYSTEMS", page="systems", color="orange")

    with lcars.page("Overview", id="overview"):
        lcars.header("SHIP STATUS", size="h1", color="orange")

        with lcars.box("CORE TELEMETRY", subtitle="LIVE FEED", color="orange", width_left=190, width_right=190) as b:
            with b.left_inputs():
                if lcars.button("RUN DIAGNOSTICS", color="blue"):
                    lcars.notify("DIAGNOSTICS COMPLETE.")
                lcars.toggle("EMERGENCY POWER", color="yellow")

            with b.right_inputs():
                lcars.select("MODE", ["CRUISE", "ALERT", "COMBAT"], value="CRUISE", color="purple")

            lcars.metric("CPU", f"{random.randint(20, 80)}%", status="ok", color="orange")
            lcars.metric("MEMORY", f"{random.uniform(2.5, 7.5):.1f} GB", status="warn", color="yellow")
            lcars.chart([random.random() for _ in range(24)], title="SIGNAL STRENGTH", color="orange")

    with lcars.page("Systems", id="systems"):
        lcars.header("SYSTEM STATUS", size="h2", color="orange")

        with lcars.sweep("SUBSYSTEMS", color="orange", width_sidebar=210):
            lcars.table(
                [
                    {"System": "Impulse Drive", "Status": "Online"},
                    {"System": "Life Support", "Status": "Online"},
                    {"System": "Sensors", "Status": "Degraded"},
                ],
                title="SYSTEMS",
            )

            with lcars.bracket(color="orange"):
                if lcars.toggle("SENSORS CALIBRATION", color="purple"):
                    lcars.alert("CALIBRATION ACTIVE", level="yellow", blink=True)

lcars.run(ui)
