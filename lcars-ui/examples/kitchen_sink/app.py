"""Comprehensive LCARS widget + adaptive-layout showcase.

Each page pins a different layout archetype so the adaptive console engine can be
seen choosing zones for the same widget vocabulary:

    console   — primary data lane + side readouts + control dock
    telemetry — one dominant data scope + a readout rail
    grid      — a periodic-table-style wall of equal cells
    widgets   — the full widget set, console-arranged

Run with:
    python examples/kitchen_sink/app.py
"""

from __future__ import annotations

import os
from pathlib import Path

import lcars_ui as lcars

POWER_SERIES = {
    "EPS A": [18, 21, 26, 34, 42, 51, 57, 61, 67, 64, 70, 74],
    "EPS B": [12, 17, 24, 29, 35, 43, 46, 52, 49, 58, 62, 68],
}
FIELD_SERIES = [12, 18, 22, 30, 41, 39, 47, 55, 60, 58, 66, 72, 70, 78, 83]
SYSTEM_ROWS = [
    {"System": "Warp Core", "State": "Nominal", "Load": "87%"},
    {"System": "Deflector", "State": "Aligned", "Load": "64%"},
    {"System": "Computer", "State": "Synced", "Load": "42%"},
    {"System": "Life Support", "State": "Green", "Load": "31%"},
]
SUBSYSTEMS = [
    ("Warp Core", "anakiwa", 87, "ok"),
    ("Impulse", "pale-canary", 54, "ok"),
    ("Shields", "lilac", 74, "ok"),
    ("Sensors", "golden-tanoi", 67, "warn"),
    ("Deflector", "anakiwa", 64, "ok"),
    ("Transporter", "hopbush", 41, "ok"),
    ("Computer", "pale-canary", 42, "ok"),
    ("Life Support", "anakiwa", 31, "ok"),
    ("Comms", "lilac", 22, "ok"),
]

# A pulsing warp-core glow: radial bands of `u_color` breathing outward from
# centre, driven entirely by u_time/u_resolution + one custom uniform.
WARP_CORE_SHADER = """
void main() {
  vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float r = length(uv);
  float pulse = 0.5 + 0.5 * sin(u_time * 2.0 - r * 10.0);
  float core = smoothstep(0.9, 0.0, r) * pulse;
  vec3 color = u_color * (0.15 + core);
  gl_FragColor = vec4(color, 1.0);
}
"""


def _signal_graph() -> lcars.GraphDocument:
    """A small sensor pipeline, declaring its node types alongside its nodes."""
    port = lcars.GraphPort
    return lcars.GraphDocument(
        templates=[
            lcars.NodeTemplate(
                id="sensor",
                label="Sensor",
                category="Input",
                color="pale-canary",
                outputs=[port(id="signal", label="Signal", type="stream")],
                fields=[
                    lcars.GraphField(
                        id="array",
                        label="Array",
                        kind="select",
                        default="lateral",
                        options=[
                            lcars.GraphFieldOption(value="lateral", label="Lateral"),
                            lcars.GraphFieldOption(value="dorsal", label="Dorsal"),
                        ],
                    )
                ],
            ),
            lcars.NodeTemplate(
                id="filter",
                label="Filter",
                category="Process",
                color="anakiwa",
                inputs=[port(id="input", label="In", type="stream")],
                outputs=[port(id="output", label="Out", type="stream")],
                fields=[
                    lcars.GraphField(id="cutoff", label="Cutoff", kind="number", default=42.0),
                    lcars.GraphField(id="invert", label="Invert", kind="boolean", default=False),
                ],
            ),
            lcars.NodeTemplate(
                id="merge",
                label="Merge",
                category="Process",
                color="lilac",
                # Two inputs on one port, rather than two ports.
                inputs=[port(id="sources", label="Sources", type="stream", capacity=2)],
                outputs=[port(id="output", label="Out", type="stream")],
            ),
            lcars.NodeTemplate(
                id="display",
                label="Display",
                category="Output",
                color="hopbush",
                inputs=[port(id="input", label="In", type="any")],
            ),
        ],
        nodes=[
            lcars.GraphNode(id="lateral", template="sensor", position=(0, 0)),
            lcars.GraphNode(
                id="dorsal", template="sensor", position=(0, 220), values={"array": "dorsal"}
            ),
            lcars.GraphNode(
                id="filter",
                template="filter",
                position=(260, 0),
                values={"cutoff": 42.0, "invert": False},
            ),
            lcars.GraphNode(id="merge", template="merge", position=(520, 110)),
            lcars.GraphNode(id="display", template="display", position=(760, 110)),
        ],
        edges=[
            lcars.GraphEdge(
                id="e1",
                source="lateral",
                source_port="signal",
                target="filter",
                target_port="input",
            ),
            lcars.GraphEdge(
                id="e2",
                source="filter",
                source_port="output",
                target="merge",
                target_port="sources",
            ),
            lcars.GraphEdge(
                id="e3",
                source="dorsal",
                source_port="signal",
                target="merge",
                target_port="sources",
            ),
            lcars.GraphEdge(
                id="e4", source="merge", source_port="output", target="display", target_port="input"
            ),
        ],
    )


SIGNAL_GRAPH = _signal_graph()


def ui() -> None:
    """Declare the adaptive showcase manifest."""
    lcars.config(
        "LCARS Kitchen Sink",
        theme="galaxy",
        subtitle="Adaptive Layout Showcase",
        header_color="pale-canary",
        visual_language="strict",
    )

    lcars.nav("Console", page="console", color="pale-canary")
    lcars.nav("Telemetry", page="telemetry", color="anakiwa")
    lcars.nav("Grid", page="grid", color="lilac")
    lcars.nav("Widgets", page="widgets", color="golden-tanoi")
    lcars.nav("Scene", page="scene", color="hopbush")
    lcars.nav("Graph", page="graph", color="anakiwa")

    # ---- console archetype: primary data lane + side readouts + control dock ----
    with lcars.page("Console", id="console", layout="console"):
        with lcars.data_panel("Core Telemetry", color="anakiwa", id="ks-telemetry"):
            lcars.chart(POWER_SERIES, title="EPS Flow", color="anakiwa", id="ks-eps")
            lcars.sparkline([4, 7, 6, 9, 12, 10, 13, 16], title="Sensor Gain", id="ks-gain")
            lcars.table(SYSTEM_ROWS, title="System Matrix", id="ks-table")
        with lcars.data_panel("Readouts", color="pale-canary", id="ks-readouts", zone="side"):
            lcars.metric(
                "Core Output", "87%", status="ok", color="pale-canary", id="ks-core-output"
            )
            lcars.gauge(
                "Inertial Load",
                62,
                unit="%",
                warn_threshold=70,
                crit_threshold=90,
                id="ks-inertial",
            )
            lcars.progress("Shield Grid", 74, color="anakiwa", id="ks-shield")
        with lcars.control_panel("Command", color="orange", id="ks-command"):
            if lcars.button("Acknowledge", color="orange", id="ks-ack"):
                lcars.notify("Command acknowledgement recorded.")
                lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")
            if lcars.button("Red Alert", color="red", id="ks-red"):
                lcars.set_alert_condition("red")
                lcars.notify("Red Alert!", level="error")
            # A rich hint: click to pin open a briefing panel with live telemetry.
            with lcars.hint(
                "ks-red",
                trigger="click",
                placement="right",
                title="Red Alert Briefing",
            ):
                lcars.text(
                    "Sets shipwide alert condition to RED and re-tints every panel.",
                    id="ks-red-hint-text",
                )
                lcars.sparkline(
                    FIELD_SERIES,
                    title="Core Pressure",
                    color="red",
                    id="ks-red-hint-spark",
                )
            if lcars.button("Stand Down", color="anakiwa", id="ks-standdown"):
                lcars.set_alert_condition("normal")
                lcars.notify("Alert condition cleared.")
            lcars.toggle(
                "Autocycle",
                value=True,
                color="hopbush",
                id="ks-autocycle",
                hint="Advances the demo telemetry automatically.",
            )
            lcars.select(
                "Mode",
                ["Cruise", "Alert", "Diagnostics"],
                value="Cruise",
                color="lilac",
                id="ks-mode",
            )

    # ---- telemetry archetype: one dominant scope + a readout rail ----
    with lcars.page("Telemetry", id="telemetry", layout="telemetry"):
        with lcars.data_panel("Subspace Field Density", color="anakiwa", id="ks-scope"):
            lcars.chart(FIELD_SERIES, title="Field Density", color="anakiwa", id="ks-bigchart")
            lcars.sparkline(FIELD_SERIES[::-1], title="Variance", id="ks-variance")
        with lcars.data_panel("Lock Status", color="lilac", id="ks-lock-status", zone="side"):
            lcars.metric("Lock", "ACQUIRED", status="ok", color="anakiwa", id="ks-lock")
            lcars.metric("Drift", "0.002", status="ok", color="pale-canary", id="ks-drift")
            lcars.gauge(
                "Resolution", 88, unit="%", warn_threshold=80, crit_threshold=95, id="ks-resolution"
            )
            lcars.progress("Buffer", 56, color="lilac", id="ks-buffer")
        with lcars.data_panel("Warp Core Viewport", color="orange", id="ks-warp-core", zone="dock"):
            lcars.shader(
                WARP_CORE_SHADER,
                title="Warp Core",
                uniforms={"u_color": [0.973, 0.6, 0.0]},
                aspect_ratio=2.0,
                color="orange",
                id="ks-warp-shader",
            )

    # ---- grid archetype: a wall of equal subsystem cells ----
    with lcars.page("Grid", id="grid", layout="grid"):
        for name, color, load, status in SUBSYSTEMS:
            slug = name.lower().replace(" ", "-")
            with lcars.data_panel(name, color=color, id=f"ks-cell-{slug}"):
                lcars.metric(
                    "Status", status.upper(), status=status, color=color, id=f"ks-cell-{slug}-m"
                )
                lcars.gauge(
                    "Load",
                    load,
                    unit="%",
                    warn_threshold=75,
                    crit_threshold=92,
                    id=f"ks-cell-{slug}-g",
                )

    # ---- widgets: the full vocabulary, console-arranged ----
    with lcars.page("Widgets", id="widgets", layout="console"):
        with lcars.box(
            "Display Widgets", subtitle="Readouts", color="pale-canary", id="ks-display"
        ):
            lcars.header("Text & Markdown", size="h3", color="pale-canary")
            lcars.text("LCARS H1 SAMPLE", size="h1", color="pale-canary", id="ks-h1")
            lcars.text("LCARS H2 SAMPLE", size="h2", color="anakiwa", id="ks-h2")
            lcars.text("Body copy sample for the operations console.", id="ks-body")
            lcars.text("MONO 1701-D // 47.23", size="mono", color="lilac", id="ks-mono")
            lcars.markdown("### Markdown\n\n- Rendered markdown\n- Sanitized HTML", id="ks-md")
            lcars.metric("Ready", "TRUE", status="ok", id="ks-ready")
            lcars.metric("Thermal", "CAUTION", status="warn", id="ks-thermal")
            lcars.metric("Fault Bus", "LOCKED", status="crit", id="ks-fault")
            lcars.alert("Yellow alert simulation channel armed.", level="yellow", id="ks-yellow")
        with lcars.box("Feeds", color="lilac", id="ks-feeds", zone="side"):
            lcars.log("ops-log", title="Operations Log", max_lines=8, id="ks-log")
            lcars.video_hls(
                "/media/demo/manifest.m3u8",
                title="Local HLS Descriptor",
                autoplay=True,
                muted=True,
                id="ks-video",
            )
            lcars.mic_button("ks-mic-command", title="Voice Command", id="ks-mic")
            lcars.mic_button(
                "ks-mic-hands-free",
                title="Hands-Free Listening",
                continuous=True,
                silence_ms=900,
                id="ks-mic-continuous",
            )
            with lcars.bracket(color="hopbush", orientation="right", id="ks-bracket"):
                lcars.text(
                    "Reference rule: rendered from code, no embedded screenshots.",
                    id="ks-bracket-text",
                )
        with lcars.box("Input Widgets", subtitle="Controls", color="anakiwa", id="ks-inputs"):
            with lcars.form(
                "Composite Form", action_id="ks-form-submit", submit_label="Commit", id="ks-form"
            ):
                lcars.text_input("Form Text", placeholder="entry", id="ks-form-text")
                lcars.number_input("Form Number", value=3, min=0, max=10, id="ks-form-number")
                lcars.toggle("Form Toggle", value=False, id="ks-form-toggle")
                lcars.select("Form Select", ["One", "Two"], value="One", id="ks-form-select")
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
                id="ks-segmented",
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
                "Number Input", value=5.5, min=0, max=9.99, step=0.1, id="ks-number-input"
            )
            received = lcars.file_upload(
                "Import Configuration",
                accept=[".json", ".yaml", ".yml"],
                max_files=2,
                color="anakiwa",
                id="ks-file-upload",
            )
            if received:
                lcars.notify(
                    f"{len(received)} configuration file(s) received.",
                    level="success",
                    title="Import",
                )

        with lcars.popup(
            "Movable Window",
            modal=False,
            width=440,
            height=250,
            position=(320, 180),
            color="lilac",
            id="ks-popup",
        ):
            lcars.text(
                "Drag this head band or use its corner handle to resize the window.",
                id="ks-popup-copy",
            )

    # ---- immersive surfaces: a 3D viewport and a graph editor ----
    with lcars.page("Scene", id="scene", layout="telemetry"):
        with lcars.data_panel("Warp Core", color="hopbush", id="ks-scene-panel"):
            lcars.three_scene(
                "scenes/warp_core.js",
                title="Core Assembly",
                props={"accent": "#f89800", "cool": "#9897fc", "level": 0.85},
                color="hopbush",
                id="ks-scene",
            )
        with lcars.data_panel("Core Status", color="pale-canary", id="ks-scene-side", zone="side"):
            lcars.metric("Intermix", "NOMINAL", color="pale-canary", id="ks-scene-intermix")
            lcars.gauge("Output", 85, unit="%", color="hopbush", id="ks-scene-output")
            lcars.text(
                "Drag to orbit, scroll to zoom. The scene is procedural — no "
                "textures, no external assets.",
                id="ks-scene-note",
            )

    with lcars.page("Graph", id="graph", layout="telemetry"):
        with lcars.data_panel("Signal Routing", color="anakiwa", id="ks-graph-panel"):
            lcars.node_canvas(
                SIGNAL_GRAPH,
                title="Sensor Pipeline",
                execution=lcars.GraphExecutionState(
                    status="idle",
                    nodes={"filter": lcars.GraphNodeExecution(status="success", progress=1.0)},
                ),
                options=lcars.NodeCanvasOptions(show_run=True, show_cancel=True),
                color="anakiwa",
                id="ks-graph",
            )


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
        lcars.update("ks-inertial", value=float(level))
        lcars.append_log("ops-log", f"[{frame:04d}] live telemetry frame · core {level}%")

    lcars.run(
        ui,
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
        # Where three_scene resolves "scenes/warp_core.js" from.
        assets_dir=Path(__file__).parent / "assets",
    )
