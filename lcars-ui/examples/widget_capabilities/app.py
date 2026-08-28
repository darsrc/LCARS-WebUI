"""LCARS UI v4 capability showcase.

Run:
    python examples/widget_capabilities/app.py
"""

from __future__ import annotations

import os

import lcars_ui as lcars
from lcars_ui import ActionContext, App, advanced, ui

SERVER = lcars.InteractionOptions(mode="server")
OHLC = [
    {"time": "2380-01-01", "open": 100, "high": 108, "low": 98, "close": 106, "volume": 42},
    {"time": "2380-01-02", "open": 106, "high": 111, "low": 103, "close": 104, "volume": 67},
    {"time": "2380-01-03", "open": 104, "high": 116, "low": 102, "close": 114, "volume": 81},
]
TABLE_ROWS = [
    lcars.TableRow(
        id="alpha",
        cells=[
            lcars.TableCell(
                value="Alpha Array",
                link=lcars.LinkSpec(href="#alpha", label="Alpha Array"),
                status="ok",
            ),
            72,
            "2380-01-03",
        ],
        children=[
            lcars.TableRow(id="alpha-a", cells=["Emitter A", 38, "2380-01-03"]),
            lcars.TableRow(id="alpha-b", cells=["Emitter B", 34, "2380-01-02"]),
        ],
    ),
    lcars.TableRow(id="beta", cells=["Beta Array", 54, "2380-01-02"]),
    lcars.TableRow(id="gamma", cells=["Gamma Array", 91, "2380-01-01"]),
]

SHADER = """
void main() {
  float band = step(0.5, fract((v_uv.x + u_time * 0.08) * 12.0));
  gl_FragColor = vec4(mix(vec3(0.1, 0.2, 0.45), u_color, band), 1.0);
}
"""



app = App()


def _register_pages() -> None:
    app.config("LCARS UI v4", subtitle="Expanded Widget Capabilities")

    @app.page("Data", id="data", layout="console")
    def data() -> None:
        with ui.data_panel(
            "Search Results",
            id="results-panel",
            options=lcars.ContainerOptions(
                collapsible=True,
                interaction=SERVER,
            ),
        ):
            ui.table(
                TABLE_ROWS,
                id="results",
                options=lcars.TableOptions(
                    columns=[
                        lcars.TableColumn(
                            key="name",
                            label="Array",
                            sortable=True,
                            filter="text",
                        ),
                        lcars.TableColumn(
                            key="load",
                            label="Load",
                            value_type="number",
                            sortable=True,
                            filter="number",
                            align="end",
                            value_format=lcars.ValueFormat(suffix="%"),
                        ),
                        lcars.TableColumn(
                            key="updated",
                            label="Updated",
                            value_type="date",
                            sortable=True,
                        ),
                    ],
                    expandable=True,
                    sticky_header=True,
                    pagination=lcars.TablePagination(page_size=10),
                    selection=lcars.TableSelection(mode="multiple"),
                    interaction=SERVER,
                ),
            )
        with ui.data_panel("Telemetry", id="telemetry-panel"):
            ui.chart(
                {"Primary": [12, 18, 15, 24, 31], "Reserve": [8, 11, 14, 13, 19]},
                title="EPS Flow",
                id="eps-flow",
                options=lcars.ChartOptions(
                    x_axis=lcars.AxisOptions(label="Cycle"),
                    y_axis=lcars.AxisOptions(label="MW", min=0),
                    reference_lines=[lcars.ReferenceLine(value=25, label="Nominal")],
                    zoom=True,
                    interaction=SERVER,
                ),
            )
            ui.sparkline(
                [4, 7, 6, 9, 12],
                id="gain",
                options=lcars.SparklineOptions(
                    tooltip=True,
                    show_latest=True,
                    reference_value=8,
                ),
            )
            advanced.candlestick(
                OHLC,
                id="ohlc",
                options=lcars.FinancialChartOptions(
                    show_volume=True,
                    price_precision=2,
                ),
            )
            advanced.renko(
                [100, 103, 108, 111, 106, 101, 109],
                brick_size=4,
                id="renko",
                options=lcars.FinancialChartOptions(legend=True),
            )
            advanced.shader(
                SHADER,
                uniforms={"u_color": [0.95, 0.55, 0.15]},
                id="scan-field",
                options=lcars.ShaderOptions(fps_limit=30),
            )
        with ui.data_panel("Readouts", zone="side"):
            ui.metric(
                "Core Output",
                "8700",
                options=lcars.MetricOptions(
                    secondary_value="Stable",
                    trend="up",
                    value_format=lcars.ValueFormat(thousands=True, suffix=" MW"),
                ),
            )
            ui.progress(
                "Repair",
                62,
                options=lcars.MeterOptions(segments=16, ticks=True),
            )
            ui.gauge(
                "Thermal",
                78,
                options=lcars.MeterOptions(
                    unit="%",
                    warn_threshold=70,
                    crit_threshold=90,
                ),
            )
            ui.alert(
                "Diagnostic packet ready",
                level="success",
                id="packet-ready",
                options=lcars.AlertOptions(
                    dismissible=True,
                    action=lcars.ActionSpec(label="Open", action_id="open-packet"),
                    interaction=SERVER,
                ),
            )
            ui.log(
                "ops",
                id="ops-log",
                options=lcars.LogOptions(
                    toolbar=True,
                    search=True,
                    line_numbers=True,
                    levels=["INFO", "WARN"],
                    interaction=SERVER,
                ),
            )

    @app.page("Controls", id="controls", layout="console")
    def controls() -> None:
        with ui.control_panel(
            "Command Inputs",
            options=lcars.ContainerOptions(density="compact"),
        ):
            ui.header(
                "Command Authorization",
                size="h3",
                options=lcars.HeaderOptions(
                    subtitle="Command deck",
                    anchor="authorization",
                    actions=[lcars.ActionSpec(label="Audit", action_id="audit")],
                ),
            )
            ui.text(
                "NCC-1701-D / COMMAND",
                size="mono",
                options=lcars.TextOptions(copyable=True, wrap="nowrap"),
            )
            ui.markdown(
                "`authorization = alpha`",
                options=lcars.MarkdownOptions(copy_code=True),
            )
            with ui.form(
                "Authorization",
                "authorize",
                options=lcars.FormOptions(
                    layout="grid",
                    columns=2,
                    reset_label="Reset",
                    coerce_values=True,
                ),
            ):
                ui.text_input(
                    "Orders",
                    options=lcars.TextInputOptions(
                        multiline=True,
                        rows=4,
                        validation=lcars.ValidationOptions(required=True, min_length=4),
                    ),
                )
                ui.number_input(
                    "Warp",
                    value=6,
                    min=1,
                    max=9.99,
                    options=lcars.NumberInputOptions(precision=2, suffix=" wf"),
                )
                ui.toggle(
                    "Shields",
                    options=lcars.ToggleOptions(on_label="Raised", off_label="Lowered"),
                )
                ui.select(
                    "Teams",
                    [
                        lcars.SelectOption(label="Alpha", value="alpha", group="Primary"),
                        lcars.SelectOption(label="Beta", value="beta", group="Primary"),
                        lcars.SelectOption(label="Gamma", value="gamma", group="Reserve"),
                    ],
                    value=["alpha"],
                    settings=lcars.ChoiceOptions(
                        multiple=True,
                        searchable=True,
                        placeholder="Filter teams",
                    ),
                )
            ui.radio(
                "Priority",
                ["Routine", "Urgent"],
                settings=lcars.ChoiceOptions(),
            )
            ui.radio_toggle(
                "Mode",
                ["Cruise", "Tactical"],
                settings=lcars.ChoiceOptions(),
            )
            ui.checkbox("Confirm", options=lcars.ToggleOptions(on_label="Yes", off_label="No"))
            ui.button(
                "Execute",
                options=lcars.ButtonOptions(
                    payload={"source": "showcase"},
                    confirm="Execute command?",
                    debounce_ms=500,
                    busy_label="Executing",
                ),
            )
            advanced.mic_button(
                "voice-command",
                options=lcars.MicOptions(
                    mime_types=["audio/webm;codecs=opus", "audio/webm"],
                    min_duration_ms=250,
                    max_bytes=2_000_000,
                ),
            )
        with ui.data_panel("Media", zone="side"):
            advanced.video_hls(
                "/media/demo/manifest.m3u8",
                muted=True,
                options=lcars.VideoOptions(
                    loop=True,
                    playback_rates=[0.5, 1.0, 1.5],
                    interaction=SERVER,
                ),
            )

    def log_state(ctx: ActionContext[dict[str, object]]) -> None:
        event = ctx.value.get("kind")
        if isinstance(event, str):
            ctx.append_log("ops", f"INFO {event}")

    for action_id in (
        "results-panel",
        "results",
        "eps-flow",
        "packet-ready",
        "ops",
        "video-hls",
    ):
        app.action(action_id)(log_state)




_register_pages()

if __name__ == "__main__":

    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
