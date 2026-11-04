"""Vibe Coder — AI pair-programming console on the console + grid archetypes.

Run with:
    cd lcars-ui && python examples/vibe_coder/app.py
"""

import itertools
import os

import lcars_ui as lcars
from lcars_ui import ActionContext, App, ui

TASKS = [
    ("Auth Refactor", "anakiwa", 80, "ok"),
    ("Billing API", "lilac", 45, "warn"),
    ("Onboarding UI", "pale-canary", 95, "ok"),
    ("Search Index", "golden-tanoi", 20, "warn"),
    ("CI Pipeline", "blue", 100, "ok"),
    ("Docs Site", "hopbush", 60, "ok"),
]


app = App()


def _register_pages() -> None:
    app.config(
        "Vibe Coder",
        theme="tng",
        subtitle="DEV CONSOLE",
        header_color="blue",
    )

    # Session — console archetype: build log lane, project status rail, action dock.
    @app.page("Session", id="session", layout="scene")
    def session() -> None:
        """Build the session scene."""
        with ui.scene(id="vibe-session-scene", initial_mode="session") as scene:
            with scene.region("vibe-build-region", label="BUILD OUTPUT", role="data"):
                ui.log("vibe-log", max_lines=300, title="Agent Activity", id="vibe-build-log")
            with scene.region("vibe-status-region", label="PROJECT STATUS", role="detail"):
                ui.metric(
                    "Tests Passing", "217 / 217", status="ok", color="anakiwa", id="vibe-tests"
                )
                ui.progress("Coverage", 86.0, color="anakiwa", id="vibe-coverage")
                ui.metric("Lint", "Clean", status="ok", color="blue", id="vibe-lint")
                ui.metric(
                    "Branch",
                    "feat/layout-v2",
                    status="ok",
                    color="pale-canary",
                    id="vibe-branch",
                )
            with scene.region("vibe-command-region", label="SESSION CONTROLS", role="commands"):
                ui.toggle("Auto-format on Save", value=True, color="anakiwa", id="vibe-fmt")
                ui.button("Run Tests", color="anakiwa", id="vibe-run-tests")
                ui.button("Run Lint", color="blue", id="vibe-run-lint")
                ui.button("Deploy Preview", color="orange", id="vibe-deploy")
            scene.controls("vibe-command-region", "vibe-build-region")
            scene.details("vibe-status-region", "vibe-build-region")
            scene.mode(
                "session",
                "SESSION",
                focal=["vibe-build-region"],
                required=["vibe-build-region", "vibe-status-region", "vibe-command-region"],
                families=["wrap", "focus"],
            )

    # Tasks — grid archetype: one cell per in-flight task.
    @app.page("Tasks", id="tasks", layout="scene")
    def tasks() -> None:
        """Build the tasks scene."""
        with ui.scene(id="vibe-tasks-scene", initial_mode="tasks") as scene:
            with scene.region("vibe-tasks-region", label="IN-FLIGHT TASKS", role="data"):
                for name, color, progress, status in TASKS:
                    slug = name.lower().replace(" ", "-")
                    with ui.data_panel(name, color=color, id=f"vibe-task-{slug}"):
                        ui.metric(
                            "Status",
                            status.upper(),
                            status=status,
                            color=color,
                            id=f"vibe-task-{slug}-m",
                        )
                        ui.progress("Progress", progress, color=color, id=f"vibe-task-{slug}-p")
            scene.mode(
                "tasks",
                "TASKS",
                focal=["vibe-tasks-region"],
                required=["vibe-tasks-region"],
                families=["wrap", "focus"],
            )

    def record_command(ctx: ActionContext[None], message: str, command: str) -> None:
        """Record command."""
        ctx.notify(message)
        ctx.append_log("vibe-log", command)

    @app.action("vibe-run-tests")
    def run_tests(ctx: ActionContext[None]) -> None:
        """Run tests."""
        record_command(ctx, "Test suite started.", "[RUN] pytest -q")

    @app.action("vibe-run-lint")
    def run_lint(ctx: ActionContext[None]) -> None:
        """Run lint."""
        record_command(ctx, "Lint started.", "[RUN] ruff check src/ tests/")

    @app.action("vibe-deploy")
    def deploy(ctx: ActionContext[None]) -> None:
        """Deploy."""
        record_command(ctx, "Deploy triggered.", "[DEPLOY] preview build queued")


_register_pages()

if __name__ == "__main__":
    _tick = itertools.count(1)
    _events = itertools.cycle(
        [
            "edit src/lcars_ui/dsl/api.py",
            "run pytest -q (217 passed)",
            "ruff check src/ tests/ (clean)",
            "git commit -m 'wip'",
        ]
    )

    @app.live(interval=4.0)
    def _agent_tick() -> None:
        """Autonomous live stream: simulate ongoing agent activity."""
        frame = next(_tick)
        lcars.append_log("vibe-log", f"[{frame:04d}] {next(_events)}")

    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
