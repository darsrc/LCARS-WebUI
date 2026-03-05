"""Tests for data normalisation adapters."""

from __future__ import annotations

import pytest

from lcars_ui.dsl._adapters import _to_series_and_labels, _to_table_data
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
