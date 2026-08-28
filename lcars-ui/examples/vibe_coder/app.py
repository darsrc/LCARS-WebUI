"""Vibe Coder — AI pair-programming console on the console + grid archetypes.

Run with:
    cd lcars-ui && python examples/vibe_coder/app.py
"""

import itertools
import os

import lcars_ui as lcars
from lcars_ui import ActionContext, App

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
    @app.page("Session", id="session", layout="console")
    def session() -> None:
        with lcars.data_panel("Build Output", color="blue", id="vibe-build"):
            lcars.log("vibe-log", max_lines=300, title="Agent Activity", id="vibe-build-log")
        with lcars.data_panel("Project Status", color="lilac", id="vibe-status", zone="side"):
            lcars.metric(
                "Tests Passing", "217 / 217", status="ok", color="anakiwa", id="vibe-tests"
            )
            lcars.progress("Coverage", 86.0, color="anakiwa", id="vibe-coverage")
            lcars.metric("Lint", "Clean", status="ok", color="blue", id="vibe-lint")
            lcars.metric(
                "Branch", "feat/layout-v2", status="ok", color="pale-canary", id="vibe-branch"
            )
        with lcars.control_panel("Session Controls", color="orange", id="vibe-controls"):
            lcars.toggle("Auto-format on Save", value=True, color="anakiwa", id="vibe-fmt")
            lcars.button("Run Tests", color="anakiwa", id="vibe-run-tests")
            lcars.button("Run Lint", color="blue", id="vibe-run-lint")
            lcars.button("Deploy Preview", color="orange", id="vibe-deploy")

    # Tasks — grid archetype: one cell per in-flight task.
    @app.page("Tasks", id="tasks", layout="grid")
    def tasks() -> None:
        for name, color, progress, status in TASKS:
            slug = name.lower().replace(" ", "-")
            with lcars.data_panel(name, color=color, id=f"vibe-task-{slug}"):
                lcars.metric(
                    "Status", status.upper(), status=status, color=color, id=f"vibe-task-{slug}-m"
                )
                lcars.progress("Progress", progress, color=color, id=f"vibe-task-{slug}-p")

    def record_command(ctx: ActionContext[None], message: str, command: str) -> None:
        ctx.notify(message)
        ctx.append_log("vibe-log", command)

    @app.action("vibe-run-tests")
    def run_tests(ctx: ActionContext[None]) -> None:
        record_command(ctx, "Test suite started.", "[RUN] pytest -q")

    @app.action("vibe-run-lint")
    def run_lint(ctx: ActionContext[None]) -> None:
        record_command(ctx, "Lint started.", "[RUN] ruff check src/ tests/")

    @app.action("vibe-deploy")
    def deploy(ctx: ActionContext[None]) -> None:
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
        n = next(_tick)
        lcars.append_log("vibe-log", f"[{n:04d}] {next(_events)}")

    import uvicorn

    from lcars_ui.app import create_app

    uvicorn.run(
        create_app(manifest=app.build_manifest(), app=app),
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
    )
