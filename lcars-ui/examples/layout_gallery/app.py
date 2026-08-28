"""Code-rendered LCARS container gallery used by documentation captures."""

import lcars_ui as lcars
from lcars_ui import ActionContext, App

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
        with lcars.data_panel("Data Panel", color="anakiwa"):
            lcars.metric("Warp Output", "87%", status="ok", color="anakiwa")
            lcars.chart(POWER_LEVELS, title="Power Transfer", color="anakiwa")
        with lcars.control_panel("Control Panel", color="pale-canary"):
            lcars.button("Acknowledge", color="pale-canary")
            lcars.toggle("Auto Cycle", value=True, color="anakiwa")
            lcars.select("Operating Mode", ["Cruise", "Alert", "Diagnostic"])
        with lcars.box("Box Container", subtitle="MAIN + SIDE", color="lilac") as box:
            with box.main():
                lcars.table(FLEET_ROWS, title="Fleet Registry")
            with box.side():
                lcars.metric("Readiness", "82%", status="ok", color="lilac")
                lcars.gauge("Capacity", 73, unit="%", color="pale-canary")
        with lcars.bracket(color="hopbush", orientation="both"):
            lcars.text("Bracketed status content")
            lcars.progress("Subspace Link", 91, color="hopbush")

    @app.page("Sweep", id="sweep")
    def sweep() -> None:
        with lcars.sweep(
            "Long Range Sensor Sweep",
            subtitle="SECTOR 001",
            color="anakiwa",
        ) as sweep:
            with sweep.header():
                lcars.header("Subspace Telemetry", size="h3", color="anakiwa")
            with sweep.column_inputs():
                lcars.button("Deep Scan", color="anakiwa")
                lcars.toggle("Track Contacts", value=True, color="lilac")
            with sweep.left():
                lcars.chart(POWER_LEVELS, title="Field Density", color="anakiwa")
                lcars.sparkline(POWER_LEVELS[::-1], title="Variance", color="pale-canary")
            with sweep.right():
                lcars.metric("Sensor Lock", "ACQUIRED", status="ok", color="anakiwa")
                lcars.metric("Contacts", "07", status="warn", color="pale-canary")
                lcars.gauge("Resolution", 88, unit="%", color="lilac")

    @app.page("PADD", id="padd")
    def padd() -> None:
        with lcars.padd("Mission Operations PADD", color="lilac") as padd:
            with padd.header():
                lcars.header("Command Authorization", size="h3", color="lilac")
            with padd.column_inputs():
                lcars.button("Transmit", color="lilac")
                lcars.button("Archive", color="pale-canary")
            with padd.left():
                lcars.metric("Mission Clock", "14:32:08", status="ok", color="lilac")
                lcars.table(FLEET_ROWS, title="Assigned Vessels")
                lcars.text_input("Command Code", placeholder="ALPHA-1")
            with padd.right():
                lcars.metric("Clearance", "LEVEL 7", status="ok", color="anakiwa")
                lcars.progress("Packet Integrity", 96, color="pale-canary")

    @app.page("Diagnostic", id="diagnostic")
    def diagnostic() -> None:
        with lcars.diagnostic("Warp Core Diagnostic", color="hopbush") as diagnostic:
            with diagnostic.main():
                lcars.chart(POWER_LEVELS, title="Intermix Stability", color="hopbush")
                lcars.table(FLEET_ROWS, title="Diagnostic Queue")
            with diagnostic.side():
                lcars.metric("Core State", "NOMINAL", status="ok", color="hopbush")
                lcars.gauge("Containment", 94, unit="%", color="pale-canary")
                lcars.progress("Scan Complete", 78, color="anakiwa")
            with diagnostic.right_inputs():
                lcars.button("Run Level One", color="hopbush")
                lcars.toggle("Live Sampling", value=True, color="anakiwa")




_register_pages()

if __name__ == "__main__":
    import uvicorn

    from lcars_ui.app import create_app

    uvicorn.run(create_app(manifest=app.build_manifest(), app=app), host="127.0.0.1", port=8000)
