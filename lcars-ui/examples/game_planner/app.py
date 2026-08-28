"""Game Planner — campaign ops on the menu + grid + console archetypes.

Run with:
    cd lcars-ui && python examples/game_planner/app.py
"""

import itertools
import os

import lcars_ui as lcars
from lcars_ui import ActionContext, App

BOARD = [
    ("Goblin Ambush", "red", "Active"),
    ("Merchant Escort", "anakiwa", "Planned"),
    ("Dragons Lair", "golden-tanoi", "Planned"),
    ("Town Festival", "pale-canary", "Done"),
    ("Smugglers Den", "lilac", "Planned"),
    ("Border Skirmish", "hopbush", "Active"),
]

STATUS_LEVEL = {"Active": "ok", "Planned": "warn", "Done": "ok"}



app = App()


def _register_pages() -> None:
    app.config(
        "Game Planner",
        theme="galaxy",
        subtitle="CAMPAIGN OPS",
        header_color="purple",
    )


    # Home — menu archetype: sparse landing page, generous negative space.
    @app.page("Home", id="home", layout="menu")
    def home() -> None:
        with lcars.console("Campaign Control", color="purple", id="game-home"):
            lcars.header("Welcome back, Game Master", size="h2", color="pale-canary")
            lcars.text(
                "Select a console to plan encounters, manage the campaign board, "
                "or run tonight's session.",
                size="body",
                id="game-home-text",
            )
            lcars.button("Open Board", color="anakiwa", id="game-open-board")
            lcars.button("Start Session", color="orange", id="game-open-session")

    # Board — grid archetype: one cell per encounter.
    @app.page("Board", id="board", layout="grid")
    def board() -> None:
        for name, color, status in BOARD:
            slug = name.lower().replace(" ", "-")
            with lcars.data_panel(name, color=color, id=f"game-cell-{slug}"):
                lcars.metric(
                    "Status",
                    status,
                    status=STATUS_LEVEL[status],
                    color=color,
                    id=f"game-cell-{slug}-m",
                )

    # Session — console archetype: encounter log, party status rail, DM tools dock.
    @app.page("Session", id="session", layout="console")
    def session() -> None:
        with lcars.data_panel("Encounter Log", color="purple", id="game-log-panel"):
            lcars.log("game-log", max_lines=300, title="Session Log", id="game-log")
        with lcars.data_panel("Party Status", color="lilac", id="game-party", zone="side"):
            lcars.gauge(
                "Party HP", 78.0, unit="%", warn_threshold=40.0, crit_threshold=20.0, id="game-hp"
            )
            lcars.metric("Round", "3", status="ok", color="anakiwa", id="game-round")
            lcars.metric(
                "Initiative", "Lyra", status="ok", color="pale-canary", id="game-initiative"
            )
        with lcars.control_panel("DM Tools", color="orange", id="game-controls"):
            lcars.button("Roll Initiative", color="anakiwa", id="game-roll")
            lcars.button("Next Turn", color="orange", id="game-next")
            lcars.select(
                "Encounter", [name for name, _, _ in BOARD], value=BOARD[0][0], id="game-encounter"
            )

    @app.action("game-open-board")
    def open_board(ctx: ActionContext[None]) -> None:
        ctx.notify("Switch to the Board tab to manage encounters.")

    @app.action("game-open-session")
    def open_session(ctx: ActionContext[None]) -> None:
        ctx.notify("Switch to the Session tab to begin.")

    @app.action("game-roll")
    def roll_initiative(ctx: ActionContext[None]) -> None:
        ctx.notify("Initiative rolled.")
        ctx.append_log("game-log", "[ROLL] initiative order set")

    @app.action("game-next")
    def next_turn(ctx: ActionContext[None]) -> None:
        ctx.append_log("game-log", "[TURN] advancing to next combatant")




_register_pages()

if __name__ == "__main__":
    _tick = itertools.count(1)
    _events = itertools.cycle(
        [
            "Lyra casts Fireball — 28 damage to the goblin warband",
            "Goblin shaman retreats behind the ridge",
            "Thane the Bold lands a critical hit",
            "Party rests for one minute",
        ]
    )

    @app.live(interval=5.0)
    def _session_tick() -> None:
        """Autonomous live stream: simulate ongoing combat log."""
        n = next(_tick)
        lcars.append_log("game-log", f"[{n:04d}] {next(_events)}")

    import uvicorn

    from lcars_ui.app import create_app

    uvicorn.run(
        create_app(manifest=app.build_manifest(), app=app),
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
    )
