"""LCARS UI v4 capability showcase.

Run:
    python examples/widget_capabilities/app.py
"""

from __future__ import annotations

import lcars_ui as lcars

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


def ui() -> None:
    lcars.config("LCARS UI v4", subtitle="Expanded Widget Capabilities")
    lcars.nav("Data", page="data", color="anakiwa")
    lcars.nav("Controls", page="controls", color="atomic-tangerine")

    with lcars.page("Data", id="data", layout="console"):
        with lcars.data_panel(
            "Search Results",
            id="results-panel",
            options=lcars.ContainerOptions(
                collapsible=True,
                interaction=SERVER,
            ),
        ) as panel:
            table_state = lcars.table(
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
        with lcars.data_panel("Telemetry", id="telemetry-panel"):
            chart_state = lcars.chart(
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
            lcars.sparkline(
                [4, 7, 6, 9, 12],
                id="gain",
                options=lcars.SparklineOptions(
                    tooltip=True,
                    show_latest=True,
                    reference_value=8,
                ),
            )
            lcars.candlestick(
                OHLC,
                id="ohlc",
                options=lcars.FinancialChartOptions(
                    show_volume=True,
                    price_precision=2,
                ),
            )
            lcars.renko(
                [100, 103, 108, 111, 106, 101, 109],
                brick_size=4,
                id="renko",
                options=lcars.FinancialChartOptions(legend=True),
            )
            lcars.shader(
                SHADER,
                uniforms={"u_color": [0.95, 0.55, 0.15]},
                id="scan-field",
                options=lcars.ShaderOptions(fps_limit=30),
            )
        with lcars.data_panel("Readouts", zone="side"):
            lcars.metric(
                "Core Output",
                "8700",
                options=lcars.MetricOptions(
                    secondary_value="Stable",
                    trend="up",
                    value_format=lcars.ValueFormat(thousands=True, suffix=" MW"),
                ),
            )
            lcars.progress(
                "Repair",
                62,
                options=lcars.MeterOptions(segments=16, ticks=True),
            )
            lcars.gauge(
                "Thermal",
                78,
                options=lcars.MeterOptions(
                    unit="%",
                    warn_threshold=70,
                    crit_threshold=90,
                ),
            )
            alert_state = lcars.alert(
                "Diagnostic packet ready",
                level="success",
                id="packet-ready",
                options=lcars.AlertOptions(
                    dismissible=True,
                    action=lcars.ActionSpec(label="Open", action_id="open-packet"),
                    interaction=SERVER,
                ),
            )
            lcars.log(
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

        if panel.state.last_event:
            lcars.append_log("ops", f"INFO panel {panel.state.last_event}")
        for state in (table_state, chart_state, alert_state):
            if state and state.last_event:
                lcars.append_log("ops", f"INFO {state.last_event}")

    with lcars.page("Controls", id="controls", layout="console"):
        with lcars.control_panel(
            "Command Inputs",
            options=lcars.ContainerOptions(density="compact"),
        ):
            lcars.header(
                "Command Authorization",
                size="h3",
                options=lcars.HeaderOptions(
                    subtitle="Command deck",
                    anchor="authorization",
                    actions=[lcars.ActionSpec(label="Audit", action_id="audit")],
                ),
            )
            lcars.text(
                "NCC-1701-D / COMMAND",
                size="mono",
                options=lcars.TextOptions(copyable=True, wrap="nowrap"),
            )
            lcars.markdown(
                "`authorization = alpha`",
                options=lcars.MarkdownOptions(copy_code=True),
            )
            with lcars.form(
                "Authorization",
                "authorize",
                options=lcars.FormOptions(
                    layout="grid",
                    columns=2,
                    reset_label="Reset",
                    coerce_values=True,
                ),
            ):
                lcars.text_input(
                    "Orders",
                    options=lcars.TextInputOptions(
                        multiline=True,
                        rows=4,
                        validation=lcars.ValidationOptions(required=True, min_length=4),
                    ),
                )
                lcars.number_input(
                    "Warp",
                    value=6,
                    min=1,
                    max=9.99,
                    options=lcars.NumberInputOptions(precision=2, suffix=" wf"),
                )
                lcars.toggle(
                    "Shields",
                    options=lcars.ToggleOptions(on_label="Raised", off_label="Lowered"),
                )
                lcars.select(
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
            lcars.radio(
                "Priority",
                ["Routine", "Urgent"],
                settings=lcars.ChoiceOptions(),
            )
            lcars.radio_toggle(
                "Mode",
                ["Cruise", "Tactical"],
                settings=lcars.ChoiceOptions(),
            )
            lcars.checkbox("Confirm", options=lcars.ToggleOptions(on_label="Yes", off_label="No"))
            lcars.button(
                "Execute",
                options=lcars.ButtonOptions(
                    payload={"source": "showcase"},
                    confirm="Execute command?",
                    debounce_ms=500,
                    busy_label="Executing",
                ),
            )
            lcars.mic_button(
                "voice-command",
                options=lcars.MicOptions(
                    mime_types=["audio/webm;codecs=opus", "audio/webm"],
                    min_duration_ms=250,
                    max_bytes=2_000_000,
                ),
            )
        with lcars.data_panel("Media", zone="side"):
            lcars.video_hls(
                "/media/demo/manifest.m3u8",
                muted=True,
                options=lcars.VideoOptions(
                    loop=True,
                    playback_rates=[0.5, 1.0, 1.5],
                    interaction=SERVER,
                ),
            )


if __name__ == "__main__":
    lcars.run(ui)
