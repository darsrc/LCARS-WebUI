"""Data normalisation adapters: DataFrame/list/dict → widget data types."""

from __future__ import annotations

from typing import Any

from lcars_ui.widgets.data import SeriesPointSet, TableRow


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


__all__ = ["_to_series_and_labels", "_to_table_data"]
