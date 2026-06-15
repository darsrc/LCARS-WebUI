"""Game Planner — campaign ops on the menu + grid + console archetypes.

Run with:
    cd lcars-ui && python examples/game_planner/app.py
"""

import itertools
import os

import lcars_ui as lcars

BOARD = [
    ("Goblin Ambush", "red", "Active"),
    ("Merchant Escort", "anakiwa", "Planned"),
    ("Dragons Lair", "golden-tanoi", "Planned"),
    ("Town Festival", "pale-canary", "Done"),
    ("Smugglers Den", "lilac", "Planned"),
    ("Border Skirmish", "hopbush", "Active"),
]

STATUS_LEVEL = {"Active": "ok", "Planned": "warn", "Done": "ok"}


def ui() -> None:
    lcars.config(
        "Game Planner",
        theme="galaxy",
        subtitle="CAMPAIGN OPS",
        header_color="purple",
    )

    lcars.nav("Home", page="home")
    lcars.nav("Board", page="board")
    lcars.nav("Session", page="session")

    # Home — menu archetype: sparse landing page, generous negative space.
    with lcars.page("Home", id="home", layout="menu"):
        with lcars.console("Campaign Control", color="purple", id="game-home"):
            lcars.header("Welcome back, Game Master", size="h2", color="pale-canary")
            lcars.text(
                "Select a console to plan encounters, manage the campaign board, "
                "or run tonight's session.",
                size="body",
                id="game-home-text",
            )
            if lcars.button("Open Board", color="anakiwa", id="game-open-board"):
                lcars.notify("Switch to the Board tab to manage encounters.")
            if lcars.button("Start Session", color="orange", id="game-open-session"):
                lcars.notify("Switch to the Session tab to begin.")

    # Board — grid archetype: one cell per encounter.
    with lcars.page("Board", id="board", layout="grid"):
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
    with lcars.page("Session", id="session", layout="console"):
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
            if lcars.button("Roll Initiative", color="anakiwa", id="game-roll"):
                lcars.notify("Initiative rolled.")
                lcars.append_log("game-log", "[ROLL] initiative order set")
            if lcars.button("Next Turn", color="orange", id="game-next"):
                lcars.append_log("game-log", "[TURN] advancing to next combatant")
            lcars.select(
                "Encounter", [name for name, _, _ in BOARD], value=BOARD[0][0], id="game-encounter"
            )


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

    @lcars.live(interval=5.0)
    def _session_tick() -> None:
        """Autonomous live stream: simulate ongoing combat log."""
        n = next(_tick)
        lcars.append_log("game-log", f"[{n:04d}] {next(_events)}")

    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
