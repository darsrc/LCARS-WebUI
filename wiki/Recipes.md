# Recipes

Copy these patterns into your app and adjust ids, labels, and data sources. Each recipe
below is a declaration/handler pair — every one was assembled into one file and run
through `app.build_manifest()` and `app.test_client()` while writing this page.

## Button updates a metric

```python
ui.metric("Core Output", "87%", status="ok", id="core-output")
ui.button("Refresh", id="refresh")


@app.action("refresh")
def refresh(ctx: ActionContext[None]) -> None:
    ctx.update("core-output", value="91%", status="warn")
    ctx.notify("Telemetry refreshed.")
```

## Handler reacts to one control among several

```python
with ui.control_panel("Commands", id="commands"):
    ui.select("Scan Profile", ["Local", "Sector", "Deep"], value="Sector", id="scan-profile")
    ui.number_input("Sensor Gain", value=6.5, min=1.0, max=10.0, step=0.1, id="sensor-gain")
    ui.text_input("Operator", placeholder="OPS-01", id="operator")
    ui.button("Dispatch Scan", id="dispatch-scan")


@app.action("dispatch-scan")
def dispatch_scan(ctx: ActionContext[None]) -> None:
    ctx.append_log("ops-log", "dispatched")
```

A `dispatch-scan` click carries `ctx.value=None` — it cannot see `scan-profile`'s current
value directly. If the handler genuinely needs several controls' values together at
once, group them with `ui.form(...)` (see [Grouped form](#grouped-form) below) instead of
trying to read sibling widgets.

## Validate choice input

```python
ui.select("Mode", ["Cruise", "Alert", "Diagnostics"], value="Cruise", id="mode")


@app.action("mode")
def on_mode(ctx: ActionContext[str]) -> None:
    allowed = {"Cruise", "Alert", "Diagnostics"}
    mode = ctx.value if ctx.value in allowed else "Cruise"
    ctx.append_log("ops-log", f"mode={mode}")
```

## Require text before acting

```python
ui.text_input("Operator Code", placeholder="OPS-01", id="operator-code")


@app.action("operator-code")
def on_operator_code(ctx: ActionContext[str]) -> None:
    code = ctx.value.strip()
    if not code:
        ctx.notify("Operator code required.", level="error")
    else:
        ctx.notify(f"Operator {code} authenticated.")
```

`text_input` fires its action on every committed change, not on a separate submit click —
if you want a deliberate "go" moment instead, pair the input with a button and read the
input's own action for validation feedback, or group both into a form.

## Round numeric input

```python
ui.number_input("Deck Count", value=12, min=1, max=42, step=1, id="deck-count")


@app.action("deck-count")
def on_deck_count(ctx: ActionContext[float]) -> None:
    deck_count = int(round(ctx.value))
    ctx.append_log("ops-log", f"allocated_decks={deck_count}")
```

## Append to a log

```python
ui.log("ops-log", title="Operations Log", max_lines=50, id="ops-log-widget")
ui.button("Acknowledge", id="ack")


@app.action("ack")
def ack(ctx: ActionContext[None]) -> None:
    ctx.append_log("ops-log", "ACKNOWLEDGE command accepted")
```

## Global alert controls

```python
ui.button("Red Alert", color="red", id="red-alert")
ui.button("Stand Down", color="anakiwa", id="stand-down")


@app.action("red-alert")
def red_alert(ctx: ActionContext[None]) -> None:
    ctx.set_alert_condition("red")
    ctx.notify("Red Alert!", level="error")


@app.action("stand-down")
def stand_down(ctx: ActionContext[None]) -> None:
    ctx.set_alert_condition("normal")
    ctx.notify("Alert condition cleared.")
```

## Live telemetry

```python
import itertools

import lcars_ui

levels = itertools.cycle([86, 88, 91, 89, 92])

if __name__ == "__main__":
    @app.live(interval=2.0)
    def poll() -> None:
        level = next(levels)
        lcars_ui.update("core-output", value=f"{level}%", status="warn" if level >= 90 else "ok")
        lcars_ui.append_log("ops-log", f"[LIVE] core={level}%")

    app.serve(port=8077)
```

Register the decorated function inside `if __name__ == "__main__":`, immediately before
`app.serve(...)`, so importing the module (e.g. from a test) doesn't also start it. An
app can register more than one `@app.live(...)` job — each runs independently on its own
`interval` — but each still needs this same guard.

## Rich inspect hint

```python
ui.button("Inspect Core", id="inspect-core")

with ui.hint("inspect-core", trigger="click", placement="right", title="Core Detail"):
    ui.metric("Output", "87%", status="ok", id="inspect-core-output")
    ui.sparkline([82, 84, 87, 86, 89], title="Five-frame trend", id="inspect-core-trend")
```

Controls declared inside the hint dispatch normal actions.

## Movable detail window

```python
with advanced.popup(
    "Transfer Details",
    modal=False,
    draggable=True,
    resizable=True,
    width=620,
    height=420,
    close_action_id="close-transfer",
    id="transfer-details",
):
    ui.markdown("### Cargo\n\nThree containers accepted.")


@app.action("close-transfer")
def close_transfer(ctx: ActionContext[None]) -> None:
    pass
```

## Consume uploaded files

```python
ui.file_upload(
    "Mission Data",
    accept=[".json", "application/json"],
    max_files=3,
    max_bytes=5_000_000,
    id="mission-data",
)


@app.action("mission-data")
def mission_data(ctx: ActionContext[dict]) -> None:
    for uploaded in ctx.value["files"]:
        process_json(uploaded["data"])
        ctx.notify(f"Processed {uploaded['name']}", level="success")
```

The library does not persist uploads. Consume or store them during this one handler call.

## Knowledge-graph escalation

```python
advanced.tri_state(result_data, on_escalate="EXACT", id="support-query-n07")


@app.action("support-query-n07")
def escalate(ctx: ActionContext[str]) -> None:
    if ctx.value == "EXACT":
        run_exact_query()
```

For complete payloads and semantic edge cases, see [Knowledge Graph](Knowledge-Graph).

## Multi-page app

```python
@app.page("Overview", id="overview", layout="console")
def overview() -> None:
    with ui.data_panel("Summary", id="summary"):
        ui.metric("Core", "Nominal", id="core-summary")

@app.page("Diagnostics", id="diagnostics", layout="telemetry")
def diagnostics() -> None:
    with ui.data_panel("Trace", id="trace-panel"):
        ui.chart([2, 4, 8, 16], title="Diagnostic Trace", id="trace")
```

Each `@app.page(..., nav=True)` (the default) adds its own sidebar entry — there is no
separate navigation call to make.

## Grouped form

```python
with ui.form("Configure Warp", action_id="warp-submit", submit_label="Commit", id="warp-form"):
    ui.number_input("Warp Factor", value=5.0, min=0, max=9.99, id="warp-factor")
    ui.toggle("Inertial Dampeners", value=True, id="dampeners")


@app.action("warp-submit")
def warp_submit(ctx: ActionContext[dict]) -> None:
    ctx.append_log("ops-log", f"warp={ctx.value['warp-factor']:.2f}")
```

Use a normal input plus a button when you want a direct commit action instead of a form:

```python
ui.number_input("Warp Factor", value=5.0, min=0, max=9.99, id="warp-factor")
ui.button("Commit Warp", id="commit-warp")


@app.action("commit-warp")
def commit_warp(ctx: ActionContext[None]) -> None:
    ctx.append_log("ops-log", "warp committed")
```

## Console layout

```python
@app.page("Ops", id="ops", layout="console")
def ops() -> None:
    with ui.data_panel("Telemetry", id="telemetry"):
        ui.chart([1, 3, 5, 8], title="EPS Flow", id="eps")

    with ui.data_panel("Readouts", zone="side", id="readouts"):
        ui.metric("Core", "87%", status="ok", id="readout-core")

    with ui.control_panel("Actions", id="actions"):
        ui.button("Refresh", id="refresh-console")
```

## PADD detail page

```python
@app.page("PADD", id="padd", layout="menu")
def padd_page() -> None:
    with advanced.padd("Crew Transfer", color="golden-tanoi", id="crew-transfer") as padd:
        with padd.column_inputs():
            ui.button("Approve", id="approve-transfer")
        with padd.left():
            ui.markdown("### Transfer\n\nPending command review.")
        with padd.right():
            ui.metric("Status", "READY", status="ok", id="transfer-status")


@app.action("approve-transfer")
def approve_transfer(ctx: ActionContext[None]) -> None:
    ctx.update("transfer-status", value="APPROVED")
```

## Candlestick chart with trade markers

```python
ohlc = [
    {"time": "2024-01-01", "open": 100.0, "high": 110.0, "low": 95.0, "close": 105.0},
    {"time": "2024-01-02", "open": 105.0, "high": 115.0, "low": 100.0, "close": 108.0},
    {"time": "2024-01-03", "open": 108.0, "high": 109.0, "low": 100.0, "close": 102.0},
]

with ui.data_panel("Price Action", color="pale-canary", id="price-action"):
    advanced.candlestick(
        ohlc,
        title="ES Futures",
        markers=[
            {"time": "2024-01-01", "position": "below", "shape": "arrow_up", "color": "anakiwa", "text": "BUY x4"},
            {"time": "2024-01-03", "position": "above", "shape": "arrow_down", "color": "hopbush", "text": "SELL x4"},
        ],
        up_color="anakiwa",
        down_color="hopbush",
        id="es-candles",
    )
```

Marker `position`: `"above"`, `"below"`, `"in"`. Marker `shape`: `"arrow_up"`, `"arrow_down"`, `"circle"`, `"square"`.

## Renko bricks from a price series

```python
prices = [100_000, 100_420, 100_180, 100_850, 101_200, 101_050, 101_680, 102_140]

with ui.data_panel("Trend", color="lilac", id="renko-panel"):
    advanced.renko(
        prices,
        brick_size=300.0,
        title="Equity Renko (300pt bricks)",
        up_color="pale-canary",
        down_color="hopbush",
        id="equity-renko",
    )
```

`brick_size` must be positive. Bricks render without wicks by convention.

## Animated shader viewport

```python
PULSE = """
void main() {
  vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float r = length(uv);
  float pulse = 0.5 + 0.5 * sin(u_time * 2.0 - r * 10.0);
  float core = smoothstep(0.9, 0.0, r) * pulse;
  gl_FragColor = vec4(u_color * (0.15 + core), 1.0);
}
"""

advanced.shader(
    PULSE,
    title="Warp Core",
    uniforms={"u_color": [0.973, 0.6, 0.0]},  # LCARS orange
    aspect_ratio=2.0,
    id="warp-core",
)
```

Built-in uniforms available in every shader: `u_time` (float, seconds), `u_resolution` (vec2, pixels), `v_uv` (varying vec2, 0–1). Shader compile errors render as an inline error banner.

## Repository browser (enhanced table)

Client-side sorting/filtering with emitted state events, linked-and-copyable names,
controlled selection, and expandable rows with lazy child files. The full runnable
version lives at `examples/table_repositories/app.py`.

```python
import lcars_ui

def repo_row(repo_id, lang, stars, *, loaded_files=None, error=None):
    row = lcars_ui.TableRow(
        id=repo_id,
        cells=[
            lcars_ui.TableCell(
                value=repo_id, display=repo_id.split("/")[-1],
                link=lcars_ui.LinkSpec(href=f"https://example.com/{repo_id}", target="_blank"),
                copyable=True, copy_value=repo_id,   # COPY the exact owner/repo id
            ),
            lang, stars,
        ],
    )
    if loaded_files is not None:
        row.expanded_content = [lcars_ui.TableDetailTable(
            headers=["File", "Size"],
            rows=[lcars_ui.TableRow(id=f"{repo_id}:{n}", cells=[n, s]) for n, s in loaded_files],
        )]
    elif error is not None:
        row.error = error          # inline error + Retry that re-emits the expansion
    else:
        row.loading = True         # shown while the app fetches the file manifest
    return row

@app.page("Repositories", id="repos", layout="console")
def repos_page() -> None:
    ui.table(
        [repo_row("acme/widget", "Python", 128, loaded_files=[("main.py", "2.1 kB")]),
         repo_row("hera/probe", "Go", 57, error="Could not fetch files.")],
        id="repos",
        options=lcars_ui.TableOptions(
            columns=[
                lcars_ui.TableColumn(key="name", label="Repository", sortable=True, filter="text"),
                lcars_ui.TableColumn(key="lang", label="Language", sortable=True, filter="select"),
                lcars_ui.TableColumn(key="stars", label="Stars", value_type="number", sortable=True, align="end"),
            ],
            data_mode="client", emit_state_changes=True,
            selection=lcars_ui.TableSelection(mode="single", selected_ids=["acme/widget"]),
            row_click_select=True, expandable=True, density="compact",
            interaction=lcars_ui.InteractionOptions(action_id="repos"),
        ),
    )

@app.action("repos")
def on_repos_event(ctx: ActionContext[dict]) -> None:
    # ctx.value is {"kind": "selection" | "expansion" | "sort" | "filter" | "page", "state": {...}}
    if ctx.value["kind"] == "expansion":
        for repo_id in ctx.value["state"]["expansion"]["expanded_ids"]:
            ...  # fetch child files, then ctx.update("repos", data=...) with them loaded
```

---

**See Also:** [Widgets](Widgets) · [Actions and State](Actions-and-State) · [Reference](Reference)
