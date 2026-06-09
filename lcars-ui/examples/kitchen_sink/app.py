"""Comprehensive LCARS widget and layout showcase.

Run with:
    python examples/kitchen_sink/app.py
"""

from __future__ import annotations

import os

import lcars_ui as lcars

POWER_SERIES = {
    "EPS A": [18, 21, 26, 34, 42, 51, 57, 61, 67, 64, 70, 74],
    "EPS B": [12, 17, 24, 29, 35, 43, 46, 52, 49, 58, 62, 68],
}

SYSTEM_ROWS = [
    {"System": "Warp Core", "State": "Nominal", "Load": "87%"},
    {"System": "Deflector", "State": "Aligned", "Load": "64%"},
    {"System": "Computer", "State": "Synced", "Load": "42%"},
    {"System": "Life Support", "State": "Green", "Load": "31%"},
]


def ui() -> None:
    """Declare the showcase manifest."""
    lcars.config(
        "LCARS Kitchen Sink",
        theme="galaxy",
        subtitle="Widget and Layout Verification",
        header_color="pale-canary",
        visual_language="strict",
    )

    lcars.nav(
        "Overview",
        page="overview",
        color="pale-canary",
        segments=[
            {"label": "OPS", "color": "pale-canary"},
            {"label": "AUX", "color": "anakiwa"},
        ],
    )
    lcars.nav("Widgets", page="widgets", color="anakiwa")
    lcars.nav("Layouts", page="layouts", color="lilac")

    with lcars.page("Overview", id="overview"):
        with lcars.console("Command Console", color="pale-canary", id="ks-console") as console:
            with console.header():
                lcars.header("Operational Summary", size="h3", color="pale-canary")
                lcars.text(
                    "All public LCARS widgets are represented in this application.", size="body"
                )

            with console.column_inputs():
                if lcars.button("Acknowledge", color="orange", id="ks-ack"):
                    lcars.notify("Command acknowledgement recorded.")
                    lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")
                if lcars.button("Refresh Telemetry", color="anakiwa", id="ks-refresh"):
                    lcars.update("ks-core-output", value="91%", status="warn")
                    lcars.append_log("ops-log", "Telemetry refresh requested")
                lcars.toggle("Autocycle", value=True, color="hopbush", id="ks-autocycle")
                lcars.select(
                    "Operating Mode",
                    ["Cruise", "Alert", "Diagnostics"],
                    value="Cruise",
                    color="lilac",
                    id="ks-mode",
                )

            with console.left():
                with lcars.data_panel("Primary Readouts", color="anakiwa", id="ks-primary"):
                    lcars.metric(
                        "Core Output",
                        "87%",
                        status="ok",
                        color="pale-canary",
                        id="ks-core-output",
                    )
                    lcars.progress(
                        "Shield Grid",
                        74,
                        color="anakiwa",
                        id="ks-shield-progress",
                    )
                    lcars.gauge(
                        "Inertial Load",
                        62,
                        unit="%",
                        warn_threshold=70,
                        crit_threshold=90,
                        id="ks-inertial-load",
                    )

            with console.right():
                with lcars.data_panel("Telemetry", color="lilac", id="ks-telemetry"):
                    lcars.chart(POWER_SERIES, title="EPS Flow", color="anakiwa", id="ks-eps-chart")
                    lcars.sparkline([4, 7, 6, 9, 12, 10, 13, 16], title="Sensor Gain", id="ks-gain")
                    lcars.table(SYSTEM_ROWS, title="System Matrix", id="ks-system-table")

        with lcars.bracket(color="golden-tanoi", orientation="both", id="ks-overview-bracket"):
            lcars.alert(
                "Yellow alert simulation channel armed.", level="yellow", id="ks-yellow-alert"
            )
            lcars.markdown(
                "**Reference rule:** this showcase is rendered from code and does not embed "
                "LCARS_TRUTH screenshots or screenshot derivatives.",
                id="ks-reference-note",
            )

    with lcars.page("Widgets", id="widgets"):
        with lcars.box(
            "Display Widgets",
            subtitle="Readouts",
            color="pale-canary",
            id="ks-display-box",
        ) as display_box:
            with display_box.main():
                lcars.header("Text and Markdown", size="h3", color="pale-canary")
                lcars.text("LCARS H1 SAMPLE", size="h1", color="pale-canary", id="ks-text-h1")
                lcars.text("LCARS H2 SAMPLE", size="h2", color="anakiwa", id="ks-text-h2")
                lcars.text("Body text sample with operational copy.", id="ks-text-body")
                lcars.text("MONO 1701-D // 47.23", size="mono", color="lilac", id="ks-text-mono")
                lcars.markdown(
                    "### Markdown Panel\n\n- Rendered markdown\n- Sanitized HTML", id="ks-md"
                )

            with display_box.side():
                lcars.metric("Ready", "TRUE", status="ok", id="ks-ready")
                lcars.metric("Thermal", "CAUTION", status="warn", id="ks-thermal")
                lcars.metric("Fault Bus", "LOCKED", status="crit", id="ks-fault")
                lcars.alert("Red alert banner sample.", level="red", blink=True, id="ks-red-alert")
                lcars.progress("Decode", 42, color="golden-tanoi", id="ks-decode")
                lcars.gauge(
                    "Containment", 91, unit="%", warn_threshold=70, crit_threshold=90, id="ks-gauge"
                )

        with lcars.box(
            "Input Widgets",
            subtitle="Controls",
            color="anakiwa",
            id="ks-input-box",
        ) as input_box:
            with input_box.left_inputs():
                if lcars.button("Execute", color="orange", id="ks-execute"):
                    lcars.notify("Execute pressed.")
                lcars.toggle("Toggle", value=True, color="hopbush", id="ks-toggle")
                lcars.checkbox("Checkbox", value=True, color="lilac", id="ks-checkbox")
                lcars.radio("Radio", ["A", "B", "C"], value="B", color="anakiwa", id="ks-radio")
                lcars.radio_toggle(
                    "Segmented",
                    ["Low", "Mid", "High"],
                    value="Mid",
                    color="pale-canary",
                    id="ks-radio-toggle",
                )
                lcars.select(
                    "Select",
                    ["Alpha", "Beta", "Gamma"],
                    value="Beta",
                    color="golden-tanoi",
                    id="ks-select",
                )
                lcars.text_input("Text Input", placeholder="operator code", id="ks-text-input")
                lcars.number_input(
                    "Number Input",
                    value=5.5,
                    min=0,
                    max=9.99,
                    step=0.1,
                    id="ks-number-input",
                )

            with input_box.main():
                with lcars.form(
                    "Composite Form",
                    action_id="ks-form-submit",
                    submit_label="Commit",
                    id="ks-form",
                ):
                    lcars.text_input("Form Text", placeholder="entry", id="ks-form-text")
                    lcars.number_input("Form Number", value=3, min=0, max=10, id="ks-form-number")
                    lcars.toggle("Form Toggle", value=False, id="ks-form-toggle")
                    lcars.select("Form Select", ["One", "Two"], value="One", id="ks-form-select")
                lcars.log("ops-log", title="Operations Log", max_lines=8, id="ks-log")
                # Local descriptor per the examples' no-remote-media policy. The
                # video_hls widget loads hls.js on demand and plays any HLS source
                # (remote streams require the app's CSP connect-src to allow them).
                lcars.video_hls(
                    "/media/demo/manifest.m3u8",
                    title="Local HLS Descriptor",
                    autoplay=True,
                    muted=True,
                    id="ks-video",
                )
                lcars.mic_button("ks-mic-command", title="Mic Command", id="ks-mic")

    with lcars.page("Layouts", id="layouts"):
        with lcars.padd("PADD Recipe", color="golden-tanoi", id="ks-padd") as padd:
            with padd.column_inputs():
                lcars.button("PADD Action", id="ks-padd-action")
            with padd.left():
                lcars.text("PADD left region", id="ks-padd-left")
            with padd.right():
                lcars.metric("PADD Status", "ONLINE", id="ks-padd-status")

        with lcars.diagnostic("Diagnostic Recipe", color="blue", id="ks-diagnostic") as diag:
            with diag.left_inputs():
                lcars.button("Left Input", id="ks-diag-left-input")
            with diag.right_inputs():
                lcars.button("Right Input", id="ks-diag-right-input")
            with diag.main():
                lcars.chart([2, 4, 8, 16, 12, 18], title="Diagnostic Trace", id="ks-diag-chart")
            with diag.side():
                lcars.metric("Diagnostic", "PASS", status="ok", id="ks-diag-pass")

        with lcars.sweep(
            "Reverse Sweep",
            subtitle="Explicit Regions",
            color="lilac",
            reverse=True,
            left_width=0.45,
            id="ks-reverse-sweep",
        ) as sweep:
            with sweep.header():
                lcars.header("Sweep Header Slot", size="h4", id="ks-sweep-header")
            with sweep.column_inputs():
                lcars.button("Sweep Input", id="ks-sweep-input")
            with sweep.left():
                lcars.text("Left sweep content", id="ks-sweep-left")
            with sweep.right():
                lcars.text("Right sweep content", id="ks-sweep-right")

        with lcars.box("Input Column Helper", color="orange", id="ks-input-column-box"):
            with lcars.input_column(side="left"):
                lcars.button("Column Button", id="ks-input-column-button")
                lcars.toggle("Column Toggle", id="ks-input-column-toggle")
            lcars.metric("Main Content", "ATTACHED", id="ks-input-column-main")

        with lcars.row(height="auto"):
            with lcars.col("1fr"):
                with lcars.bracket(color="anakiwa", orientation="left", id="ks-bracket-left"):
                    lcars.text("Row/column left bracket", id="ks-row-left")
            with lcars.col("1fr"):
                with lcars.bracket(color="hopbush", orientation="right", id="ks-bracket-right"):
                    lcars.text("Row/column right bracket", id="ks-row-right")

        first_col, second_col = lcars.columns(["1fr", "1fr"])
        with first_col:
            with lcars.section("Section Helper", color="pale-canary"):
                lcars.metric("Section Metric", "1", id="ks-section-metric")
        with second_col:
            with lcars.raw(reason="show raw transport without strict auto-paneling"):
                lcars.header("Raw Scope", size="h4", id="ks-raw-header")
                lcars.text("Raw text remains outside automatic panel wrapping.", id="ks-raw-text")


if __name__ == "__main__":
    import itertools

    _frame = itertools.count(1)
    _levels = itertools.cycle([86, 88, 91, 89, 92, 87, 90, 85])

    # Registered only when run as a script (never on import) so the test that
    # imports `ui` doesn't pollute the never-reset global @lcars.live registry.
    @lcars.live(interval=2.0)
    def _telemetry_tick() -> None:
        """Autonomous live stream: push widget_update + log_chunk over the WS every 2s."""
        frame = next(_frame)
        level = next(_levels)
        lcars.update("ks-core-output", value=f"{level}%", status="warn" if level >= 90 else "ok")
        lcars.update("ks-inertial-load", value=float(level))
        lcars.append_log("ops-log", f"[{frame:04d}] live telemetry frame · core {level}%")

    lcars.run(
        ui,
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
