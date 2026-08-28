"""Bridge Operations — LCARS reference app on the adaptive console.

Panels are declared as flat page-level siblings; the renderer's adaptive layout
places them into zones (primary data lane / side readouts / control dock) and
fills the viewport — no page scroll.

Run with:
    cd lcars-ui && python examples/bridge_ops/app.py
"""

import os
from typing import Literal

import lcars_ui as lcars
from lcars_ui import ActionContext, App, ui

STABILITY = [0.82, 0.84, 0.87, 0.89, 0.91, 0.93, 0.95, 0.94, 0.92, 0.93]
SYSTEMS_DATA = [
    {"System": "Impulse Drive", "Status": "Online", "Load": "42%"},
    {"System": "Life Support", "Status": "Online", "Load": "18%"},
    {"System": "Sensors", "Status": "Degraded", "Load": "67%"},
    {"System": "Communications", "Status": "Online", "Load": "5%"},
]



app = App()


def _register_pages() -> None:
    app.config(
        "Bridge Operations",
        theme="galaxy",
        subtitle="NCC-1701-D",
        header_color="orange",
    )


    # Main View — console archetype: telemetry lane, status rail, command dock.
    @app.page("Main View", id="main", layout="console")
    def main() -> None:
        with ui.data_panel("Core Telemetry", color="blue", id="bridge-telemetry"):
            ui.chart(
                STABILITY, title="Warp Field Stability", color="blue", id="bridge-stability"
            )
            ui.metric("Warp Core", "Nominal", status="ok", color="blue", id="bridge-warp")
            ui.metric(
                "Shield Integrity", "94%", status="ok", color="orange", id="bridge-shield"
            )
            ui.metric(
                "Hull Temperature", "WARN", status="warn", color="yellow", id="bridge-hull"
            )
        with ui.data_panel("Ship Status", color="lilac", id="bridge-status", zone="side"):
            ui.metric(
                "Alert", "CONDITION GREEN", status="ok", color="anakiwa", id="bridge-alert"
            )
            ui.progress("Power Reserve", 78, color="pale-canary", id="bridge-power")
            ui.progress("Crew Readiness", 91, color="anakiwa", id="bridge-crew")
        with ui.control_panel("Tactical Actions", color="orange", id="bridge-tactical"):
            ui.button("Red Alert", color="red", id="bridge-red")
            ui.button("Yellow Alert", color="yellow", id="bridge-yellow")
            ui.button("Stand Down", color="anakiwa", id="bridge-standdown")
            ui.toggle("Shields Up", value=True, id="bridge-shields")
            ui.select(
                "Tactical Mode", ["Passive", "Active", "Combat"], value="Passive", id="bridge-mode"
            )
            ui.metric("Active Mode", "PASSIVE", color="blue", id="bridge-activemode")
            ui.metric(
                "Shield Status",
                "ACTIVE",
                status="ok",
                color="blue",
                id="bridge-shieldstatus",
            )

    # Systems — table lane, diagnostic rail, scan dock.
    @app.page("Systems", id="systems", layout="console")
    def systems() -> None:
        with ui.data_panel("Ship Systems", color="blue", id="sys-table-panel"):
            ui.table(SYSTEMS_DATA, title="System Status", id="sys-table")
        with ui.data_panel("Diagnostics", color="lilac", id="sys-diag", zone="side"):
            ui.gauge(
                "Core Output",
                87.2,
                unit="%",
                warn_threshold=80.0,
                crit_threshold=95.0,
                id="sys-core",
            )
            ui.progress("Repair Queue", 42.0, color="orange", id="sys-repair")
            ui.metric("Antimatter", "STABLE", status="ok", color="anakiwa", id="sys-antimatter")
        with ui.control_panel("Scan Controls", color="orange", id="sys-controls"):
            ui.button("Run Scan", color="anakiwa", id="sys-scan")
            ui.toggle("Emergency Power", value=False, id="sys-emergency")
            ui.alert(
                "Emergency power engaged!",
                level="yellow",
                blink=True,
                id="sys-emerg-alert",
                visible=False,
            )

    # Logs — a single primary log lane.
    @app.page("Logs", id="logs", layout="console")
    def logs() -> None:
        with ui.data_panel("Bridge Log", color="lilac", id="logs-panel"):
            ui.log("bridge", max_lines=500, title="Bridge Log", id="logs-viewer")
            ui.button("Append Test Entry", color="anakiwa", id="logs-append")

    def set_condition(
        ctx: ActionContext[None],
        level: Literal["normal", "yellow", "red"],
        message: str,
        *,
        error: bool = False,
    ) -> None:
        ctx.set_alert_condition(level)
        ctx.notify(message, level="error" if error else "info")

    @app.action("bridge-red")
    def red_alert(ctx: ActionContext[None]) -> None:
        set_condition(ctx, "red", "Red Alert! All hands to battle stations!", error=True)

    @app.action("bridge-yellow")
    def yellow_alert(ctx: ActionContext[None]) -> None:
        set_condition(ctx, "yellow", "Yellow alert. Shields to standby.")

    @app.action("bridge-standdown")
    def stand_down(ctx: ActionContext[None]) -> None:
        set_condition(ctx, "normal", "Alert condition cleared. Resuming normal operations.")

    @app.action("bridge-shields")
    def shields(ctx: ActionContext[bool]) -> None:
        ctx.update(
            "bridge-shieldstatus",
            value="ACTIVE" if ctx.value else "DOWN",
            status="ok" if ctx.value else "warn",
            color="blue" if ctx.value else "yellow",
        )

    @app.action("bridge-mode")
    def tactical_mode(ctx: ActionContext[str]) -> None:
        ctx.update("bridge-activemode", value=ctx.value.upper())

    @app.action("sys-scan")
    def run_scan(ctx: ActionContext[None]) -> None:
        ctx.notify("Systems scan dispatched.")
        ctx.append_log("bridge", "[SCAN] Full systems diagnostic initiated.")

    @app.action("sys-emergency")
    def emergency_power(ctx: ActionContext[bool]) -> None:
        ctx.update("sys-emerg-alert", visible=ctx.value)

    @app.action("logs-append")
    def append_test_entry(ctx: ActionContext[None]) -> None:
        ctx.append_log("bridge", "[LCARS] Manual log entry triggered.")




_register_pages()

if __name__ == "__main__":
    import itertools

    _frame = itertools.count(1)
    _readiness = itertools.cycle([91, 88, 93, 90, 87, 92])

    @app.live(interval=3.0)
    def _bridge_tick() -> None:
        frame = next(_frame)
        lcars.update("bridge-crew", value=float(next(_readiness)))
        lcars.append_log("bridge", f"[{frame:04d}] bridge telemetry sync")


    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
