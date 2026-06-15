"""Vibe Coder — AI pair-programming console on the console + grid archetypes.

Run with:
    cd lcars-ui && python examples/vibe_coder/app.py
"""

import itertools
import os

import lcars_ui as lcars

TASKS = [
    ("Auth Refactor", "anakiwa", 80, "ok"),
    ("Billing API", "lilac", 45, "warn"),
    ("Onboarding UI", "pale-canary", 95, "ok"),
    ("Search Index", "golden-tanoi", 20, "warn"),
    ("CI Pipeline", "blue", 100, "ok"),
    ("Docs Site", "hopbush", 60, "ok"),
]


def ui() -> None:
    lcars.config(
        "Vibe Coder",
        theme="tng",
        subtitle="DEV CONSOLE",
        header_color="blue",
    )

    lcars.nav("Session", page="session")
    lcars.nav("Tasks", page="tasks")

    # Session — console archetype: build log lane, project status rail, action dock.
    with lcars.page("Session", id="session", layout="console"):
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
            if lcars.button("Run Tests", color="anakiwa", id="vibe-run-tests"):
                lcars.notify("Test suite started.")
                lcars.append_log("vibe-log", "[RUN] pytest -q")
            if lcars.button("Run Lint", color="blue", id="vibe-run-lint"):
                lcars.notify("Lint started.")
                lcars.append_log("vibe-log", "[RUN] ruff check src/ tests/")
            if lcars.button("Deploy Preview", color="orange", id="vibe-deploy"):
                lcars.notify("Deploy triggered.")
                lcars.append_log("vibe-log", "[DEPLOY] preview build queued")

    # Tasks — grid archetype: one cell per in-flight task.
    with lcars.page("Tasks", id="tasks", layout="grid"):
        for name, color, progress, status in TASKS:
            slug = name.lower().replace(" ", "-")
            with lcars.data_panel(name, color=color, id=f"vibe-task-{slug}"):
                lcars.metric(
                    "Status", status.upper(), status=status, color=color, id=f"vibe-task-{slug}-m"
                )
                lcars.progress("Progress", progress, color=color, id=f"vibe-task-{slug}-p")


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

    @lcars.live(interval=4.0)
    def _agent_tick() -> None:
        """Autonomous live stream: simulate ongoing agent activity."""
        n = next(_tick)
        lcars.append_log("vibe-log", f"[{n:04d}] {next(_events)}")

    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
