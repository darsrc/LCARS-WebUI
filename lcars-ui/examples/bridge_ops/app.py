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
    @app.page("Main View", id="main", layout="scene")
    def main() -> None:
        """Build the main view scene."""
        with ui.scene(id="bridge-scene", initial_mode="monitor") as scene:
            with scene.region("bridge-core", label="CORE TELEMETRY", role="instrument"):
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
            with scene.region("bridge-ship", label="SHIP STATUS", role="detail"):
                ui.metric(
                    "Alert", "CONDITION GREEN", status="ok", color="anakiwa", id="bridge-alert"
                )
                ui.progress("Power Reserve", 78, color="pale-canary", id="bridge-power")
                ui.progress("Crew Readiness", 91, color="anakiwa", id="bridge-crew")
            with scene.region("bridge-actions", label="TACTICAL ACTIONS", role="commands"):
                ui.button("Red Alert", color="red", id="bridge-red")
                ui.button("Yellow Alert", color="yellow", id="bridge-yellow")
                ui.button("Stand Down", color="anakiwa", id="bridge-standdown")
                ui.toggle("Shields Up", value=True, id="bridge-shields")
                ui.select(
                    "Tactical Mode",
                    ["Passive", "Active", "Combat"],
                    value="Passive",
                    id="bridge-mode",
                )
                ui.metric("Active Mode", "PASSIVE", color="blue", id="bridge-activemode")
                ui.metric(
                    "Shield Status",
                    "ACTIVE",
                    status="ok",
                    color="blue",
                    id="bridge-shieldstatus",
                )
            with scene.region("bridge-commands", label="SCENE COMMANDS", role="commands"):
                ui.button("ALERT VIEW", id="bridge-alert-view")
            with scene.region("bridge-recovery", label="ALERT RECOVERY", role="alert"):
                ui.button("RETURN", id="bridge-return")
            scene.controls("bridge-commands", "bridge-core")
            scene.details("bridge-ship", "bridge-core")
            scene.recovers("bridge-recovery", "bridge-core")
            scene.mode(
                "monitor",
                "MONITOR",
                focal=["bridge-core"],
                required=["bridge-core", "bridge-ship", "bridge-actions", "bridge-commands"],
                families=["wrap", "focus"],
            )
            scene.mode(
                "alert",
                "ALERT",
                focal=["bridge-core", "bridge-recovery"],
                required=["bridge-core", "bridge-recovery", "bridge-actions"],
                optional=["bridge-ship", "bridge-commands"],
                families=["branch", "focus"],
                returns_to="monitor",
            )
            scene.transition(on="bridge-alert-view", to="alert")

    # Systems — table lane, diagnostic rail, scan dock.
    @app.page("Systems", id="systems", layout="scene")
    def systems() -> None:
        """Build the systems scene."""
        with ui.scene(id="systems-scene", initial_mode="overview") as scene:
            with scene.region("systems-table", label="SHIP SYSTEMS", role="data"):
                ui.table(SYSTEMS_DATA, title="System Status", id="sys-table")
            with scene.region("systems-diagnostics", label="DIAGNOSTICS", role="instrument"):
                ui.gauge(
                    "Core Output",
                    87.2,
                    unit="%",
                    warn_threshold=80.0,
                    crit_threshold=95.0,
                    id="sys-core",
                )
                ui.progress("Repair Queue", 42.0, color="orange", id="sys-repair")
                ui.metric(
                    "Antimatter", "STABLE", status="ok", color="anakiwa", id="sys-antimatter"
                )
            with scene.region("systems-scan", label="SCAN CONTROLS", role="commands"):
                ui.button("Run Scan", color="anakiwa", id="sys-scan")
                ui.toggle("Emergency Power", value=False, id="sys-emergency")
                ui.alert(
                    "Emergency power engaged!",
                    level="yellow",
                    blink=True,
                    id="sys-emerg-alert",
                    visible=False,
                )
            with scene.region("systems-modes", label="SYSTEMS MODES", role="commands"):
                ui.button("COMPARE", id="systems-compare")
                ui.button("DONE", id="systems-done")
            scene.controls("systems-modes", "systems-table")
            scene.controls("systems-scan", "systems-table")
            with scene.region("systems-impulse", label="IMPULSE DRIVE", role="instrument"):
                ui.metric("Status", "Online", status="ok")
                ui.progress("Load", 42)
            with scene.region("systems-sensors", label="SENSORS", role="instrument"):
                ui.metric("Status", "Degraded", status="warn")
                ui.progress("Load", 67)
            scene.feeds("systems-table", "systems-impulse")
            scene.feeds("systems-table", "systems-sensors")
            scene.compares("systems-impulse", "systems-sensors")
            scene.mode(
                "overview",
                "OVERVIEW",
                focal=["systems-table"],
                required=["systems-table", "systems-diagnostics", "systems-scan", "systems-modes"],
                families=["wrap", "focus"],
            )
            scene.mode(
                "compare",
                "COMPARE",
                focal=["systems-impulse", "systems-sensors"],
                required=["systems-impulse", "systems-sensors", "systems-modes"],
                optional=["systems-table", "systems-diagnostics", "systems-scan"],
                families=["fork", "focus"],
                returns_to="overview",
            )
            scene.transition(on="systems-compare", to="compare")

    # Logs — a single primary log lane.
    @app.page("Logs", id="logs", layout="scene")
    def logs() -> None:
        """Build the logs scene."""
        with ui.scene(id="logs-scene", initial_mode="stream") as scene:
            with scene.region("logs-stream", label="BRIDGE LOG", role="data"):
                ui.log("bridge", max_lines=500, title="Bridge Log", id="logs-viewer")
                ui.button("Append Test Entry", color="anakiwa", id="logs-append")
            with scene.region("logs-filters", label="LOG CONTROLS", role="commands"):
                ui.button("FOCUS ENTRY", id="logs-focus")
            with scene.region("logs-detail", label="ENTRY DETAIL", role="detail"):
                ui.text("Review the latest bridge log entries in the stream.")
                ui.button("RETURN", id="logs-return")
            scene.controls("logs-filters", "logs-stream")
            scene.details("logs-detail", "logs-stream")
            scene.mode(
                "stream",
                "STREAM",
                focal=["logs-stream"],
                required=["logs-stream", "logs-filters"],
                families=["wrap", "focus"],
            )
            scene.mode(
                "focus-entry",
                "FOCUS ENTRY",
                focal=["logs-detail"],
                required=["logs-detail", "logs-stream", "logs-filters"],
                families=["branch", "focus"],
                returns_to="stream",
            )
            scene.transition(on="logs-focus", to="focus-entry")

    @app.action("bridge-return")
    def return_from_alert(ctx: ActionContext[None]) -> None:
        """Return to bridge monitoring."""
        ctx.end_mode(scene="bridge-scene")

    @app.action("systems-done")
    def finish_comparison(ctx: ActionContext[None]) -> None:
        """Return to the systems overview."""
        ctx.end_mode(scene="systems-scene")

    @app.action("logs-return")
    def return_to_stream(ctx: ActionContext[None]) -> None:
        """Return to the bridge log stream."""
        ctx.end_mode(scene="logs-scene")

    def set_condition(
        ctx: ActionContext[None],
        level: Literal["normal", "yellow", "red"],
        message: str,
        *,
        error: bool = False,
    ) -> None:
        """Set condition."""
        ctx.set_alert_condition(level)
        ctx.notify(message, level="error" if error else "info")

    @app.action("bridge-red")
    def red_alert(ctx: ActionContext[None]) -> None:
        """Red alert."""
        set_condition(ctx, "red", "Red Alert! All hands to battle stations!", error=True)

    @app.action("bridge-yellow")
    def yellow_alert(ctx: ActionContext[None]) -> None:
        """Yellow alert."""
        set_condition(ctx, "yellow", "Yellow alert. Shields to standby.")

    @app.action("bridge-standdown")
    def stand_down(ctx: ActionContext[None]) -> None:
        """Stand down."""
        set_condition(ctx, "normal", "Alert condition cleared. Resuming normal operations.")

    @app.action("bridge-shields")
    def shields(ctx: ActionContext[bool]) -> None:
        """Shields."""
        ctx.update(
            "bridge-shieldstatus",
            value="ACTIVE" if ctx.value else "DOWN",
            status="ok" if ctx.value else "warn",
            color="blue" if ctx.value else "yellow",
        )

    @app.action("bridge-mode")
    def tactical_mode(ctx: ActionContext[str]) -> None:
        """Tactical mode."""
        ctx.update("bridge-activemode", value=ctx.value.upper())

    @app.action("sys-scan")
    def run_scan(ctx: ActionContext[None]) -> None:
        """Run scan."""
        ctx.notify("Systems scan dispatched.")
        ctx.append_log("bridge", "[SCAN] Full systems diagnostic initiated.")

    @app.action("sys-emergency")
    def emergency_power(ctx: ActionContext[bool]) -> None:
        """Emergency power."""
        ctx.update("sys-emerg-alert", visible=ctx.value)

    @app.action("logs-append")
    def append_test_entry(ctx: ActionContext[None]) -> None:
        """Append test entry."""
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
