"""Algo Trading — strategy desk on the telemetry + console archetypes.

Run with:
    cd lcars-ui && python examples/algo_trading/app.py
"""

import itertools
import os

import lcars_ui as lcars

EQUITY = [
    100000, 100420, 100180, 100850, 101200, 101050, 101680, 102140, 101900, 102500, 102950, 103100,
]
DRAWDOWN = [0.0, -0.4, -0.9, -0.3, -0.1, -0.5, -0.1, 0.0, -0.2, 0.0, -0.1, 0.0]

SIGNAL_LOG = [
    {"Time": "09:31", "Symbol": "ES", "Side": "BUY", "Qty": "4", "Reason": "MA cross"},
    {"Time": "09:47", "Symbol": "NQ", "Side": "SELL", "Qty": "2", "Reason": "RSI > 70"},
    {"Time": "10:03", "Symbol": "ES", "Side": "SELL", "Qty": "4", "Reason": "Target hit"},
]


def _build_ohlc() -> list[dict]:
    """Synthesize daily OHLC bars whose closes track the equity curve."""
    bars = []
    prev = EQUITY[0]
    for i, close in enumerate(EQUITY):
        bar_open = prev
        bars.append(
            {
                "time": f"2024-01-{i + 1:02d}",
                "open": bar_open,
                "high": max(bar_open, close) + 80,
                "low": min(bar_open, close) - 80,
                "close": close,
            }
        )
        prev = close
    return bars


OHLC = _build_ohlc()

TRADE_MARKERS = [
    {"time": OHLC[1]["time"], "position": "below", "shape": "arrow_up", "color": "anakiwa", "text": "BUY ES x4"},
    {"time": OHLC[5]["time"], "position": "above", "shape": "arrow_down", "color": "hopbush", "text": "SELL NQ x2"},
    {"time": OHLC[9]["time"], "position": "above", "shape": "arrow_down", "color": "pale-canary", "text": "SELL ES x4"},
]


def ui() -> None:
    lcars.config(
        "Algo Trading",
        theme="nemesis",
        subtitle="QUANT DESK",
        header_color="orange",
    )

    lcars.nav("Strategy", page="strategy")
    lcars.nav("Signals", page="signals")

    # Strategy — telemetry archetype: dominant equity curve + a narrow performance rail.
    with lcars.page("Strategy", id="strategy", layout="telemetry"):
        with lcars.data_panel("Equity Curve", color="anakiwa", id="algo-equity"):
            lcars.chart(EQUITY, title="Portfolio Value", color="anakiwa", id="algo-equity-chart")
            lcars.sparkline(DRAWDOWN, title="Drawdown %", id="algo-drawdown")
        with lcars.data_panel("Price Action", color="pale-canary", id="algo-candles", zone="dock"):
            lcars.candlestick(
                OHLC,
                title="ES Futures (Daily)",
                markers=TRADE_MARKERS,
                up_color="anakiwa",
                down_color="hopbush",
                id="algo-candlestick",
            )
            lcars.renko(
                EQUITY,
                300.0,
                title="Equity Renko (300pt bricks)",
                up_color="pale-canary",
                down_color="hopbush",
                id="algo-renko",
            )
        with lcars.data_panel("Performance", color="lilac", id="algo-perf", zone="side"):
            lcars.metric("Net P/L", "+$3,100", status="ok", color="anakiwa", id="algo-pnl")
            lcars.metric("Sharpe", "1.84", status="ok", color="blue", id="algo-sharpe")
            lcars.progress("Win Rate", 62.0, color="pale-canary", id="algo-winrate")
            lcars.gauge(
                "Exposure",
                48.0,
                unit="%",
                warn_threshold=75.0,
                crit_threshold=90.0,
                id="algo-exposure",
            )

    # Signals — console archetype: signal table + log lane, with bot controls in the dock.
    with lcars.page("Signals", id="signals", layout="console"):
        with lcars.data_panel("Signal Log", color="blue", id="algo-signals"):
            lcars.table(SIGNAL_LOG, title="Recent Signals", id="algo-signal-table")
            lcars.log("algo-feed", max_lines=200, title="Strategy Feed", id="algo-feed-log")
        with lcars.control_panel("Bot Controls", color="orange", id="algo-controls"):
            lcars.toggle("Auto-Execute", value=True, color="anakiwa", id="algo-auto")
            lcars.select(
                "Risk Profile",
                ["Conservative", "Balanced", "Aggressive"],
                value="Balanced",
                id="algo-risk",
            )
            if lcars.button("Pause Strategy", color="yellow", id="algo-pause"):
                lcars.notify("Strategy paused.")
                lcars.append_log("algo-feed", "[CTRL] strategy paused by operator")
            if lcars.button("Flatten All", color="red", id="algo-flatten"):
                lcars.notify("All positions flattened.", level="error")
                lcars.append_log("algo-feed", "[CTRL] flatten-all executed")


if __name__ == "__main__":
    _equity = itertools.cycle(EQUITY[3:] + EQUITY[:3])
    _tick = itertools.count(1)

    @lcars.live(interval=3.0)
    def _market_tick() -> None:
        """Autonomous live stream: nudge the P/L readout and feed."""
        n = next(_tick)
        value = next(_equity)
        lcars.update("algo-pnl", value=f"+${value - 100000:,.0f}")
        lcars.append_log("algo-feed", f"[{n:04d}] mark-to-market ${value:,.0f}")

    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
