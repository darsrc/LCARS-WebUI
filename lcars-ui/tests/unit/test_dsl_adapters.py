"""Tests for data normalisation adapters."""

from __future__ import annotations

import pytest

from lcars_ui.dsl._adapters import (
    _to_chart_markers,
    _to_ohlc_data,
    _to_renko_bricks,
    _to_series_and_labels,
    _to_table_data,
)
from lcars_ui.widgets.data import SeriesPointSet

# ---------------------------------------------------------------------------
# _to_series_and_labels
# ---------------------------------------------------------------------------


def test_series_from_float_list() -> None:
    series, labels = _to_series_and_labels([1.0, 2.0, 3.0])
    assert len(series) == 1
    assert series[0].data == [1.0, 2.0, 3.0]
    assert series[0].name == "series"
    assert labels == ["0", "1", "2"]


def test_series_from_dict() -> None:
    data = {"close": [1.0, 2.0], "volume": [100.0, 200.0]}
    series, labels = _to_series_and_labels(data)
    names = {s.name for s in series}
    assert names == {"close", "volume"}
    assert labels == ["0", "1"]


def test_series_from_empty_list() -> None:
    series, labels = _to_series_and_labels([])
    assert series == [SeriesPointSet(name="series", data=[])]
    assert labels == []


def test_series_invalid_type_raises() -> None:
    with pytest.raises(TypeError):
        _to_series_and_labels("not-a-valid-type")


def test_series_list_of_non_numeric_raises() -> None:
    with pytest.raises(TypeError):
        _to_series_and_labels(["a", "b", "c"])


# ---------------------------------------------------------------------------
# _to_table_data
# ---------------------------------------------------------------------------


def test_table_from_list_of_dicts() -> None:
    data = [{"name": "Alice", "age": "30"}, {"name": "Bob", "age": "25"}]
    headers, rows = _to_table_data(data)
    assert headers == ["name", "age"]
    assert len(rows) == 2
    assert rows[0].cells == ["Alice", "30"]


def test_table_from_list_of_lists() -> None:
    data = [[1, 2], [3, 4]]
    headers, rows = _to_table_data(data)
    assert headers == ["col_0", "col_1"]
    assert rows[0].cells == ["1", "2"]


def test_table_from_flat_list() -> None:
    data = ["alpha", "beta", "gamma"]
    headers, rows = _to_table_data(data)
    assert headers == ["value"]
    assert [r.cells[0] for r in rows] == ["alpha", "beta", "gamma"]


def test_table_from_empty_list() -> None:
    headers, rows = _to_table_data([])
    assert headers == []
    assert rows == []


def test_table_invalid_type_raises() -> None:
    with pytest.raises(TypeError):
        _to_table_data(42)


# ---------------------------------------------------------------------------
# Optional pandas integration (skipped if not installed)
# ---------------------------------------------------------------------------


def test_series_from_dataframe() -> None:
    pd = pytest.importorskip("pandas")
    df = pd.DataFrame({"a": [1.0, 2.0], "b": [3.0, 4.0]})
    series, labels = _to_series_and_labels(df)
    names = {s.name for s in series}
    assert names == {"a", "b"}
    assert len(labels) == 2


def test_table_from_dataframe() -> None:
    pd = pytest.importorskip("pandas")
    df = pd.DataFrame({"x": [10, 20], "y": [30, 40]})
    headers, rows = _to_table_data(df)
    assert headers == ["x", "y"]
    assert rows[0].cells == ["10", "30"]


# ---------------------------------------------------------------------------
# _to_ohlc_data
# ---------------------------------------------------------------------------


def test_ohlc_from_list_of_dicts() -> None:
    data = [
        {"time": "2024-01-01", "open": 100.0, "high": 110.0, "low": 95.0, "close": 105.0},
        {
            "time": "2024-01-02",
            "open": 105.0,
            "high": 115.0,
            "low": 100.0,
            "close": 108.0,
            "volume": 1200.0,
        },
    ]
    bars = _to_ohlc_data(data)
    assert len(bars) == 2
    assert bars[0].time == "2024-01-01"
    assert bars[0].close == 105.0
    assert bars[0].volume is None
    assert bars[1].volume == 1200.0


def test_ohlc_auto_time_index() -> None:
    data = [
        {"open": 1.0, "high": 2.0, "low": 0.5, "close": 1.5},
        {"open": 1.5, "high": 2.5, "low": 1.0, "close": 2.0},
    ]
    bars = _to_ohlc_data(data)
    assert bars[0].time == 0
    assert bars[1].time == 1


def test_ohlc_invalid_type_raises() -> None:
    with pytest.raises(TypeError):
        _to_ohlc_data(42)


def test_ohlc_list_of_non_dicts_raises() -> None:
    with pytest.raises(TypeError):
        _to_ohlc_data([1.0, 2.0, 3.0])


# ---------------------------------------------------------------------------
# _to_renko_bricks
# ---------------------------------------------------------------------------


def test_renko_basic() -> None:
    prices = [100.0, 102.0, 104.0, 106.0, 104.0, 102.0, 100.0]
    bricks = _to_renko_bricks(prices, 2.0)
    up = [b for b in bricks if b.close > b.open]
    down = [b for b in bricks if b.close < b.open]
    assert len(up) == 3
    assert len(down) == 3
    assert bricks[0].time == 0
    assert bricks[-1].time == len(bricks) - 1


def test_renko_bricks_have_no_wick_spread() -> None:
    prices = [100.0, 105.0, 110.0]
    bricks = _to_renko_bricks(prices, 5.0)
    for b in bricks:
        assert b.high == max(b.open, b.close)
        assert b.low == min(b.open, b.close)


def test_renko_zero_brick_size_raises() -> None:
    with pytest.raises(ValueError, match="brick_size"):
        _to_renko_bricks([100.0, 102.0], 0.0)


def test_renko_empty_list() -> None:
    assert _to_renko_bricks([], 1.0) == []


# ---------------------------------------------------------------------------
# _to_chart_markers
# ---------------------------------------------------------------------------


def test_chart_markers_from_dicts() -> None:
    markers = _to_chart_markers([
        {
            "time": "2024-01-02",
            "position": "below",
            "shape": "arrow_up",
            "color": "anakiwa",
            "text": "BUY",
        },
        {"time": "2024-01-05", "position": "above", "shape": "arrow_down"},
    ])
    assert len(markers) == 2
    assert markers[0].position == "below"
    assert markers[0].shape == "arrow_up"
    assert markers[0].color == "anakiwa"
    assert markers[0].text == "BUY"
    assert markers[1].position == "above"
    assert markers[1].color is None
    assert markers[1].text is None


def test_chart_markers_defaults() -> None:
    markers = _to_chart_markers([{"time": 0}])
    assert markers[0].position == "above"
    assert markers[0].shape == "circle"


def test_chart_markers_none_returns_empty() -> None:
    assert _to_chart_markers(None) == []
