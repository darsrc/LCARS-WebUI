"""Reconnect Transcript — proves out protocol v2 session hydration end to end.

The motivating problem this example exists to demonstrate: without reconnect
hydration, a persistent-looking log (a chat transcript, a build log, a
comms relay — anything built from ``append_log()``) only ever lives in the
*browser's* React state. A page refresh, a dropped WebSocket, a laptop
sleeping and waking — any of it wipes the tab's local state, and the only
way an application can recover is to re-send everything it has from
scratch. One real application on this machine does exactly that: it
re-broadcasts its *entire* chat transcript over the wire every 45 seconds,
purely because there was nothing on the server side a reconnecting client
could hydrate from.

As of protocol v2, that workaround is unnecessary. This app:

  * appends to a **private** per-session transcript (``audience="session"``,
    the default) every time you send a message — nothing here is ever
    broadcast or re-sent on a timer;
  * appends to a **shared** relay log (``audience="all"``, via ``@app.live``)
    that every connected session sees identically;
  * never once re-sends history. Refresh the page, or kill the process
    supervising your WS connection and let it reconnect — the server's
    bounded, per-stream log tails (``ProjectionStore`` — see
    ``lcars_ui.server.projection``) are replayed to the *newly connecting*
    client as one ``log_snapshot`` per stream, and only once, on connect.

Run:
    python examples/reconnect_transcript/app.py

Then open two browser tabs. Send a message from one; refresh the *other* —
notice the shared relay log is there immediately, and refresh the *same*
tab that sent the message — its own private transcript survives too, while
a brand new tab never sees it.
"""

import itertools
import os

import lcars_ui as lcars
from lcars_ui import ActionContext, App, ui

app = App()


def _register_pages() -> None:
    app.config(
        "Reconnect Transcript",
        theme="galaxy",
        subtitle="COMMS",
        header_color="orange",
    )

    @app.page("Comms", id="comms", layout="console")
    def comms() -> None:
        with ui.data_panel("Private Transcript", color="anakiwa", id="transcript-panel"):
            ui.log(
                "transcript",
                id="transcript-log",
                max_lines=200,
                title="This Session Only",
                auto_scroll=True,
            )
        with ui.data_panel("Shipwide Relay", color="lilac", id="relay-panel", zone="side"):
            ui.log(
                "relay",
                id="relay-log",
                max_lines=100,
                title="Every Connected Session",
                auto_scroll=True,
            )
        with ui.control_panel("Composer", color="orange", id="composer-panel"):
            ui.command_input("Message", id="composer", submit_label="Send")

    @app.action("composer-submit")
    def send_message(ctx: ActionContext[dict]) -> None:
        message = str(ctx.value.get("composer-value", "")).strip()
        if not message:
            return
        # Private by default: this line lives only in this session's own
        # bounded transcript tail. Reconnecting *this* session hydrates it
        # back; no other session — and no periodic resync loop — ever sees
        # it, and it is never sent as a broadcast.
        ctx.append_log("transcript", f"you: {message}")
        ctx.append_log("transcript", f"relay: message received — {len(message)} chars")


_register_pages()

if __name__ == "__main__":
    _tick = itertools.count(1)
    _traffic = itertools.cycle(
        [
            "sensor sweep nominal",
            "docking clamp status: green",
            "relay handshake ok",
            "power grid balanced",
        ]
    )

    @app.live(interval=5.0, audience="all")
    def _relay_heartbeat() -> None:
        """Shared telemetry every connected session sees, bounded server-side.

        This is the shared counterpart to the private transcript above —
        broadcast on purpose (``audience="all"`` is this decorator's
        default), and, like the transcript, never replayed as a burst on
        reconnect: a new connection gets exactly the current bounded tail
        via one ``log_snapshot``, not the history of every tick since boot.
        """
        n = next(_tick)
        lcars.append_log("relay", f"[{n:04d}] {next(_traffic)}", audience="all")

    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
