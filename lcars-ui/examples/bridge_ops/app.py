"""Bridge Operations — LCARS DSL reference app (Phase 6).

Run with:
    cd lcars-ui && python examples/bridge_ops/app.py
"""

import random

import lcars_ui as lcars


def ui() -> None:
    lcars.config(
        "Bridge Operations",
        theme="galaxy",
        subtitle="NCC-1701-D",
        header_color="orange",
    )

    lcars.nav("Main View", page="main")
    lcars.nav("Systems", page="systems")
    lcars.nav("Logs", page="logs")

    with lcars.page("Main View", id="main"):
        lcars.metric("Warp Core", "Nominal", status="ok", color="blue")
        lcars.metric("Shield Integrity", "94%", status="ok", color="orange")
        lcars.metric("Hull Temperature", "WARN", status="warn", color="yellow")

        data = [random.uniform(0.8, 1.0) for _ in range(30)]
        lcars.chart(data, title="Warp Field Stability", color="blue")

        if lcars.button("Red Alert", color="red"):
            lcars.notify("Red Alert! All hands to battle stations!", level="error")

        if lcars.button("Shields Up"):
            lcars.notify("Shields raised to maximum.")

        mode = lcars.select(
            "Tactical Mode",
            ["Passive", "Active", "Combat"],
            value="Passive",
        )
        lcars.text(f"Current mode: {mode}", size="body")

    with lcars.page("Systems", id="systems"):
        headers_data = [
            {"System": "Impulse Drive", "Status": "Online", "Load": "42%"},
            {"System": "Life Support", "Status": "Online", "Load": "18%"},
            {"System": "Sensors", "Status": "Degraded", "Load": "67%"},
            {"System": "Communications", "Status": "Online", "Load": "5%"},
        ]
        lcars.table(headers_data, title="System Status")

        online = lcars.toggle("Emergency Power", value=False)
        if online:
            lcars.alert("Emergency power engaged!", level="yellow", blink=True)

    with lcars.page("Logs", id="logs"):
        lcars.log("bridge", max_lines=500, title="Bridge Log")
        if lcars.button("Append Test Entry"):
            lcars.append_log("bridge", "[LCARS] Manual log entry triggered.")


if __name__ == "__main__":
    lcars.run(ui, host="127.0.0.1", port=8000)
