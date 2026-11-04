"""Soil-sample analysis lab scene with deterministic demonstration readings."""

import os

from lcars_ui import ActionContext, App, ui

HOURS = ["00", "02", "04", "06", "08", "10", "12"]
SAMPLE_A_MOISTURE = [18.4, 18.1, 17.9, 17.6, 17.2, 17.0, 16.8]
SAMPLE_B_MOISTURE = [22.1, 22.0, 21.8, 21.7, 21.4, 21.2, 21.1]
DEMO_READINGS = [
    ["00:00", "16.8%", "6.4", "Neutral"],
    ["02:00", "17.0%", "6.5", "Neutral"],
    ["04:00", "17.2%", "6.4", "Neutral"],
    ["06:00", "17.6%", "6.3", "Neutral"],
    ["08:00", "17.9%", "6.4", "Neutral"],
]

app = App()
app.config("Sample Analysis", theme="galaxy", subtitle="SOIL SAMPLE LAB")


@app.page("Sample Analysis", id="sample-analysis", layout="scene")
def sample_analysis() -> None:
    """Build the sample analysis scene and its task modes."""
    with ui.scene(initial_mode="inspect") as scene:
        with scene.region(
            "sample-a", label="SAMPLE A · DEMO DATA", role="instrument", subject="plot-041"
        ):
            ui.chart(
                {"Moisture %": SAMPLE_A_MOISTURE},
                title="Moisture over 12 hours (%) · Demo data",
                id="sample-a-moisture",
            )
        with scene.region(
            "sample-b", label="SAMPLE B · DEMO DATA", role="instrument", subject="plot-058"
        ):
            ui.chart(
                {"Moisture %": SAMPLE_B_MOISTURE},
                title="Moisture over 12 hours (%) · Demo data",
                id="sample-b-moisture",
            )
        with scene.region("commands-a", label="ANALYSIS COMMANDS", role="commands"):
            ui.button("COMPARE", id="compare-samples")
            ui.button("ANNOTATE", id="annotate-sample")
            ui.button("SIMULATE FAULT", id="simulate-fault")
            ui.button("DONE", id="finish-mode")
        with scene.region("notes-a", label="SAMPLE NOTES", role="detail"):
            ui.text_input("Analyst note", value="", id="sample-note")
            ui.text("Demo note: sandy loam, collected at 08:00.", id="sample-note-help")
        with scene.region("readings", label="RECENT READINGS · DEMO DATA", role="data"):
            ui.table(
                DEMO_READINGS,
                title="Five-hour sample readings",
                id="demo-readings",
            )
        with scene.region("fault", label="SENSOR FAULT", role="alert", fold="never"):
            ui.alert("Moisture probe drift detected in this simulated fault.", level="yellow")
            ui.button("RECALIBRATE", id="recalibrate-probe")

        scene.controls("commands-a", "sample-a")
        scene.details("notes-a", "sample-a")
        scene.compares("sample-a", "sample-b")
        scene.recovers("fault", "sample-a")
        scene.feeds("readings", "sample-a")

        scene.mode(
            "inspect",
            "INSPECT",
            focal=["sample-a"],
            required=["sample-a", "commands-a"],
            optional=["notes-a", "readings"],
            families=["wrap", "branch", "focus"],
        )
        scene.mode(
            "compare",
            "COMPARE",
            focal=["sample-a", "sample-b"],
            required=["sample-a", "sample-b", "commands-a"],
            families=["fork", "focus"],
            returns_to="inspect",
        )
        scene.mode(
            "annotate",
            "ANNOTATE",
            focal=["notes-a"],
            required=["notes-a", "sample-a", "commands-a"],
            families=["contour", "focus"],
            returns_to="inspect",
        )
        scene.mode(
            "fault",
            "FAULT",
            focal=["fault", "sample-a"],
            required=["fault", "sample-a", "commands-a"],
            families=["branch", "focus"],
            returns_to="inspect",
        )
        scene.transition(on="compare-samples", to="compare")
        scene.transition(on="annotate-sample", to="annotate")


@app.action("finish-mode")
def finish_mode(ctx: ActionContext[None]) -> None:
    """Return from the active scene mode to its declared parent mode."""
    ctx.end_mode()


@app.action("simulate-fault")
def simulate_fault(ctx: ActionContext[None]) -> None:
    """Show the simulated probe-fault scene mode."""
    ctx.set_mode("fault")


@app.action("recalibrate-probe")
def recalibrate_probe(ctx: ActionContext[None]) -> None:
    """Clear the simulated fault and return to sample inspection."""
    ctx.set_mode("inspect")


if __name__ == "__main__":
    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
