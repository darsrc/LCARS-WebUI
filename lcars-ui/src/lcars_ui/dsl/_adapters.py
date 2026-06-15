"""Data normalisation adapters: DataFrame/list/dict → widget data types."""

from __future__ import annotations

from typing import Any

from lcars_ui.widgets.data import ChartMarker, OhlcPoint, SeriesPointSet, TableRow


def _to_series_and_labels(data: Any) -> tuple[list[SeriesPointSet], list[str]]:
    """Normalise chart data to (series, x_labels).

    Accepts: list[float], dict[str, list[float]], pd.DataFrame, pd.Series.
    """
    try:
        import pandas as pd  # noqa: PLC0415

        if isinstance(data, pd.DataFrame):
            series: list[SeriesPointSet] = []
            for col in data.columns:
                vals = [float(v) for v in data[col].tolist()]
                series.append(SeriesPointSet(name=str(col), data=vals))
            try:
                x_labels = [str(v) for v in data.index.tolist()]
            except Exception:
                x_labels = [str(i) for i in range(len(data))]
            return series, x_labels

        if isinstance(data, pd.Series):
            vals = [float(v) for v in data.tolist()]
            name = str(data.name) if data.name is not None else "series"
            x_labels = [str(i) for i in range(len(vals))]
            return [SeriesPointSet(name=name, data=vals)], x_labels
    except ImportError:
        pass

    if isinstance(data, list):
        if not data:
            return [SeriesPointSet(name="series", data=[])], []
        if isinstance(data[0], (int, float)):
            vals = [float(v) for v in data]
            return [SeriesPointSet(name="series", data=vals)], [str(i) for i in range(len(vals))]
        raise TypeError(
            f"chart() list elements must be numeric, got {type(data[0]).__name__}"
        )

    if isinstance(data, dict):
        series_d: list[SeriesPointSet] = []
        x_labels_d: list[str] = []
        for name, vals in data.items():
            float_vals = [float(v) for v in vals]
            series_d.append(SeriesPointSet(name=str(name), data=float_vals))
            if not x_labels_d:
                x_labels_d = [str(i) for i in range(len(float_vals))]
        return series_d, x_labels_d

    raise TypeError(
        f"chart() data must be list, dict, or DataFrame, got {type(data).__name__}"
    )


def _to_table_data(data: Any) -> tuple[list[str], list[TableRow]]:
    """Normalise table data to (headers, rows).

    Accepts: list[list], list[dict], pd.DataFrame.
    """
    try:
        import pandas as pd  # noqa: PLC0415

        if isinstance(data, pd.DataFrame):
            headers = [str(c) for c in data.columns.tolist()]
            rows: list[TableRow] = []
            for i, (_, row) in enumerate(data.iterrows()):
                cells = [str(v) for v in row.tolist()]
                rows.append(TableRow(id=str(i), cells=cells))
            return headers, rows
    except ImportError:
        pass

    if isinstance(data, list):
        if not data:
            return [], []
        first = data[0]
        if isinstance(first, dict):
            headers = list(first.keys())
            rows = []
            for i, item in enumerate(data):
                cells = [str(item.get(h, "")) for h in headers]
                rows.append(TableRow(id=str(i), cells=cells))
            return headers, rows
        if isinstance(first, (list, tuple)):
            n_cols = len(first)
            headers = [f"col_{i}" for i in range(n_cols)]
            rows = []
            for i, row in enumerate(data):
                cells = [str(v) for v in row]
                rows.append(TableRow(id=str(i), cells=cells))
            return headers, rows
        # flat list → single column
        headers = ["value"]
        rows = [TableRow(id=str(i), cells=[str(v)]) for i, v in enumerate(data)]
        return headers, rows

    raise TypeError(
        f"table() data must be list or DataFrame, got {type(data).__name__}"
    )


def _to_ohlc_data(data: Any) -> list[OhlcPoint]:
    """Normalise OHLC data to a list of OhlcPoint.

    Accepts: list[dict] with time/open/high/low/close(/volume) keys, or a
    pandas DataFrame with Open/High/Low/Close (+ Volume) columns and a
    DatetimeIndex.
    """
    try:
        import pandas as pd  # noqa: PLC0415

        if isinstance(data, pd.DataFrame):
            cols = {str(c).lower(): c for c in data.columns}
            points: list[OhlcPoint] = []
            for idx, row in data.iterrows():
                time: int | str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)
                points.append(
                    OhlcPoint(
                        time=time,
                        open=float(row[cols["open"]]),
                        high=float(row[cols["high"]]),
                        low=float(row[cols["low"]]),
                        close=float(row[cols["close"]]),
                        volume=float(row[cols["volume"]]) if "volume" in cols else None,
                    )
                )
            return points
    except ImportError:
        pass

    if isinstance(data, list):
        points = []
        for i, item in enumerate(data):
            if not isinstance(item, dict):
                raise TypeError("candlestick() list items must be dicts with OHLC keys")
            volume = item.get("volume")
            points.append(
                OhlcPoint(
                    time=item.get("time", i),
                    open=float(item["open"]),
                    high=float(item["high"]),
                    low=float(item["low"]),
                    close=float(item["close"]),
                    volume=float(volume) if volume is not None else None,
                )
            )
        return points

    raise TypeError(
        f"candlestick() data must be list[dict] or DataFrame, got {type(data).__name__}"
    )


def _to_renko_bricks(data: Any, brick_size: float) -> list[OhlcPoint]:
    """Compute Renko bricks from a flat price series.

    Accepts: list[float], list[dict] with a "close" or "price" key, or a
    pandas Series of prices. Sequential bricks are timed 0, 1, 2, ...
    """
    if brick_size <= 0:
        raise ValueError("renko() brick_size must be positive")

    try:
        import pandas as pd  # noqa: PLC0415

        if isinstance(data, pd.Series):
            prices = [float(v) for v in data.tolist()]
        else:
            prices = None
    except ImportError:
        prices = None

    if prices is None:
        if isinstance(data, list) and data and isinstance(data[0], dict):
            prices = [float(item["close"] if "close" in item else item["price"]) for item in data]
        else:
            prices = [float(v) for v in data]

    if not prices:
        return []

    bricks: list[OhlcPoint] = []
    anchor = prices[0]
    t = 0
    for price in prices[1:]:
        while price - anchor >= brick_size:
            bricks.append(
                OhlcPoint(
                    time=t,
                    open=anchor,
                    high=anchor + brick_size,
                    low=anchor,
                    close=anchor + brick_size,
                )
            )
            anchor += brick_size
            t += 1
        while anchor - price >= brick_size:
            bricks.append(
                OhlcPoint(
                    time=t,
                    open=anchor,
                    high=anchor,
                    low=anchor - brick_size,
                    close=anchor - brick_size,
                )
            )
            anchor -= brick_size
            t += 1
    return bricks


def _to_chart_markers(markers: list[dict[str, Any]] | None) -> list[ChartMarker]:
    """Normalise marker dicts to ChartMarker models."""
    if not markers:
        return []
    return [
        ChartMarker(
            time=m["time"],
            position=m.get("position", "above"),
            shape=m.get("shape", "circle"),
            color=m.get("color"),
            text=m.get("text"),
        )
        for m in markers
    ]


__all__ = [
    "_to_series_and_labels",
    "_to_table_data",
    "_to_ohlc_data",
    "_to_renko_bricks",
    "_to_chart_markers",
]
