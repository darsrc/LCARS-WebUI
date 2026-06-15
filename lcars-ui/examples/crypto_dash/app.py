"""LCARS Exchange — a crypto-trading console.

A Phase 5 real target: dense tickers, price charts, an order book, and live
controls. Telemetry density is LCARS's native tongue.

Run with:
    cd lcars-ui && PYTHONPATH=src python examples/crypto_dash/app.py
"""

from __future__ import annotations

import math
import os

import lcars_ui as lcars


def _wave(base: float, amp: float, n: int = 48, phase: float = 0.0) -> list[float]:
    return [
        round(base + amp * math.sin(i / 4.0 + phase) + amp * 0.3 * math.sin(i / 1.7), 2)
        for i in range(n)
    ]


def ui() -> None:
    lcars.config(
        "LCARS Exchange",
        theme="galaxy",
        subtitle="QUADRANT MARKETS",
        header_color="orange",
    )

    lcars.nav("Markets", page="markets")
    lcars.nav("Portfolio", page="portfolio")
    lcars.nav("Ledger", page="ledger")

    btc = _wave(67000, 1400)
    vol = _wave(820, 260, phase=1.2)

    with lcars.page("Markets", id="markets"):
        with lcars.row():
            with lcars.col("320px"):
                with lcars.data_panel("Ticker Feed", color="blue"):
                    lcars.metric("BTC / USD", "67,420.18", status="ok", color="blue")
                    lcars.metric("ETH / USD", "3,512.44", status="ok", color="blue")
                    lcars.metric("SOL / USD", "182.07", status="warn", color="yellow")
                    lcars.metric("XRP / USD", "0.6231", status="crit", color="red")
                    lcars.metric("LTC / USD", "84.19", status="ok", color="blue")

            with lcars.col("1fr"):
                with lcars.data_panel("BTC / USD — 24H", color="orange"):
                    lcars.chart(btc, title="Price", color="orange")
                    lcars.sparkline(vol, title="Volume")
                with lcars.data_panel("Order Book — BTC", color="blue"):
                    lcars.table(
                        [
                            {
                                "Side": "ASK",
                                "Price": "67,512.0",
                                "Size": "1.84",
                                "Total": "124,221",
                            },
                            {
                                "Side": "ASK",
                                "Price": "67,468.5",
                                "Size": "0.92",
                                "Total": "62,071",
                            },
                            {
                                "Side": "BID",
                                "Price": "67,401.0",
                                "Size": "2.41",
                                "Total": "162,436",
                            },
                            {
                                "Side": "BID",
                                "Price": "67,355.5",
                                "Size": "3.07",
                                "Total": "206,781",
                            },
                        ],
                        title="Depth",
                    )

            with lcars.col("300px"):
                with lcars.control_panel("Execute Order", color="orange"):
                    if lcars.button("Buy Market", color="anakiwa"):
                        lcars.notify("Buy order submitted to exchange.")
                    if lcars.button("Sell Market", color="red"):
                        lcars.notify("Sell order submitted.", level="error")
                    size = lcars.select(
                        "Order Size", ["0.10", "0.50", "1.00", "2.50"], value="0.50"
                    )
                    lcars.text(f"SIZE {size} BTC", size="mono")
                    lcars.gauge(
                        "Margin Used", 62.0, unit="%", warn_threshold=70.0, crit_threshold=90.0
                    )
                    lcars.progress("Order Fill", 38.0, color="orange")
                    lcars.metric("Account Equity", "$128,402", status="ok", color="blue")
                    lcars.metric("24H P/L", "+4,118", status="ok", color="blue")

    with lcars.page("Portfolio", id="portfolio"):
        with lcars.row():
            with lcars.col("1fr"):
                with lcars.data_panel("Holdings", color="blue"):
                    lcars.table(
                        [
                            {
                                "Asset": "BTC",
                                "Units": "1.842",
                                "Value": "$124,221",
                                "Weight": "62%",
                            },
                            {"Asset": "ETH", "Units": "9.40", "Value": "$33,016", "Weight": "16%"},
                            {"Asset": "SOL", "Units": "84.0", "Value": "$15,294", "Weight": "8%"},
                            {"Asset": "USD", "Units": "—", "Value": "$28,871", "Weight": "14%"},
                        ],
                        title="Allocation",
                    )
            with lcars.col("340px"):
                with lcars.data_panel("Risk", color="orange"):
                    lcars.gauge(
                        "Exposure", 78.0, unit="%", warn_threshold=75.0, crit_threshold=92.0
                    )
                    lcars.gauge("Volatility", 41.0, unit="σ", warn_threshold=60.0)
                    lcars.metric("Total Value", "$201,402", status="ok", color="blue")

    with lcars.page("Ledger", id="ledger"):
        with lcars.padd("Trade Ledger"):
            lcars.log("ledger", max_lines=500, title="Execution Log")
            if lcars.button("Replay Last Fill", color="anakiwa"):
                lcars.append_log("ledger", "[FILL] BTC 0.50 @ 67,420.18  fee 3.21")


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
