"""Canonical Phase 13 LCARS PADD example."""

from __future__ import annotations

import os

import lcars_ui as lcars


def ui() -> None:
    lcars.config(
        "LCARS PADD",
        theme="galaxy",
        subtitle="Duty Roster",
        header_color="orange",
        visual_language="strict",
    )
    lcars.nav("Roster", page="roster")

    with lcars.page("Roster", id="roster"):
        with lcars.padd("Duty Roster"):
            lcars.header("Roster Intake", size="h4", color="pale-canary")
            lcars.select("Deck", ["Bridge", "Engineering", "Medical"], value="Bridge")
            lcars.metric("Shift", "Alpha", status="ok", color="anakiwa")
            lcars.metric("Crew Online", "42", status="ok", color="blue")
            lcars.table(
                [
                    {"Name": "Picard", "Station": "Bridge"},
                    {"Name": "Riker", "Station": "Bridge"},
                    {"Name": "Data", "Station": "Ops"},
                    {"Name": "Worf", "Station": "Tactical"},
                    {"Name": "Crusher", "Station": "Med Bay"},
                ],
                title="Manifest",
            )
            lcars.log("padd-feed", max_lines=120, title="Orders")
            lcars.append_log(
                "padd-feed",
                "[LCARS] Briefing packet received.",
                "[LCARS] Duty transfer approved.",
            )


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8102")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
