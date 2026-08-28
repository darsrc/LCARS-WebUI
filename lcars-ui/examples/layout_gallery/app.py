"""Code-rendered LCARS container gallery used by documentation captures."""

import os

from lcars_ui import App, advanced, ui

POWER_LEVELS = [42, 48, 53, 51, 66, 72, 69, 81, 87]
FLEET_ROWS = [
    {"Vessel": "USS Enterprise", "Registry": "NCC-1701-D", "State": "ACTIVE"},
    {"Vessel": "USS Defiant", "Registry": "NX-74205", "State": "PATROL"},
    {"Vessel": "USS Voyager", "Registry": "NCC-74656", "State": "REMOTE"},
]



app = App()


def _register_pages() -> None:
    app.config(
        "LCARS Layout Gallery",
        theme="galaxy",
        subtitle="CODE-RENDERED CONTAINER PATTERNS",
        header_color="orange",
    )


    @app.page("Layouts", id="layouts", layout="grid")
    def layouts() -> None:
        with ui.data_panel("Data Panel", color="anakiwa"):
            ui.metric("Warp Output", "87%", status="ok", color="anakiwa")
            ui.chart(POWER_LEVELS, title="Power Transfer", color="anakiwa")
        with ui.control_panel("Control Panel", color="pale-canary"):
            ui.button("Acknowledge", color="pale-canary")
            ui.toggle("Auto Cycle", value=True, color="anakiwa")
            ui.select("Operating Mode", ["Cruise", "Alert", "Diagnostic"])
        with ui.box("Box Container", subtitle="MAIN + SIDE", color="lilac") as box:
            with box.main():
                ui.table(FLEET_ROWS, title="Fleet Registry")
            with box.side():
                ui.metric("Readiness", "82%", status="ok", color="lilac")
                ui.gauge("Capacity", 73, unit="%", color="pale-canary")
        with advanced.bracket(color="hopbush", orientation="both"):
            ui.text("Bracketed status content")
            ui.progress("Subspace Link", 91, color="hopbush")

    @app.page("Sweep", id="sweep")
    def sweep() -> None:
        with advanced.sweep(
            "Long Range Sensor Sweep",
            subtitle="SECTOR 001",
            color="anakiwa",
        ) as sweep:
            with sweep.header():
                ui.header("Subspace Telemetry", size="h3", color="anakiwa")
            with sweep.column_inputs():
                ui.button("Deep Scan", color="anakiwa")
                ui.toggle("Track Contacts", value=True, color="lilac")
            with sweep.left():
                ui.chart(POWER_LEVELS, title="Field Density", color="anakiwa")
                ui.sparkline(POWER_LEVELS[::-1], title="Variance", color="pale-canary")
            with sweep.right():
                ui.metric("Sensor Lock", "ACQUIRED", status="ok", color="anakiwa")
                ui.metric("Contacts", "07", status="warn", color="pale-canary")
                ui.gauge("Resolution", 88, unit="%", color="lilac")

    @app.page("PADD", id="padd")
    def padd() -> None:
        with advanced.padd("Mission Operations PADD", color="lilac") as padd:
            with padd.header():
                ui.header("Command Authorization", size="h3", color="lilac")
            with padd.column_inputs():
                ui.button("Transmit", color="lilac")
                ui.button("Archive", color="pale-canary")
            with padd.left():
                ui.metric("Mission Clock", "14:32:08", status="ok", color="lilac")
                ui.table(FLEET_ROWS, title="Assigned Vessels")
                ui.text_input("Command Code", placeholder="ALPHA-1")
            with padd.right():
                ui.metric("Clearance", "LEVEL 7", status="ok", color="anakiwa")
                ui.progress("Packet Integrity", 96, color="pale-canary")

    @app.page("Diagnostic", id="diagnostic")
    def diagnostic() -> None:
        with advanced.diagnostic("Warp Core Diagnostic", color="hopbush") as diagnostic:
            with diagnostic.main():
                ui.chart(POWER_LEVELS, title="Intermix Stability", color="hopbush")
                ui.table(FLEET_ROWS, title="Diagnostic Queue")
            with diagnostic.side():
                ui.metric("Core State", "NOMINAL", status="ok", color="hopbush")
                ui.gauge("Containment", 94, unit="%", color="pale-canary")
                ui.progress("Scan Complete", 78, color="anakiwa")
            with diagnostic.right_inputs():
                ui.button("Run Level One", color="hopbush")
                ui.toggle("Live Sampling", value=True, color="anakiwa")




_register_pages()

if __name__ == "__main__":

    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
