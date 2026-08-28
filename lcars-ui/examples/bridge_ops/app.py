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
from lcars_ui import ActionContext, App

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
            lcars.button("Red Alert", color="red", id="bridge-red")
            lcars.button("Yellow Alert", color="yellow", id="bridge-yellow")
            lcars.button("Stand Down", color="anakiwa", id="bridge-standdown")
            lcars.toggle("Shields Up", value=True, id="bridge-shields")
            lcars.select(
                "Tactical Mode", ["Passive", "Active", "Combat"], value="Passive", id="bridge-mode"
            )
            lcars.metric("Active Mode", "PASSIVE", color="blue", id="bridge-activemode")
            lcars.metric(
                "Shield Status",
                "ACTIVE",
                status="ok",
                color="blue",
                id="bridge-shieldstatus",
            )

    # Systems — table lane, diagnostic rail, scan dock.
    @app.page("Systems", id="systems", layout="console")
    def systems() -> None:
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
            lcars.button("Run Scan", color="anakiwa", id="sys-scan")
            lcars.toggle("Emergency Power", value=False, id="sys-emergency")
            lcars.alert(
                "Emergency power engaged!",
                level="yellow",
                blink=True,
                id="sys-emerg-alert",
                visible=False,
            )

    # Logs — a single primary log lane.
    @app.page("Logs", id="logs", layout="console")
    def logs() -> None:
        with lcars.data_panel("Bridge Log", color="lilac", id="logs-panel"):
            lcars.log("bridge", max_lines=500, title="Bridge Log", id="logs-viewer")
            lcars.button("Append Test Entry", color="anakiwa", id="logs-append")

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

    import uvicorn

    from lcars_ui.app import create_app

    uvicorn.run(
        create_app(manifest=app.build_manifest(), app=app),
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
    )
