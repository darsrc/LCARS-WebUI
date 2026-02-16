"""Data widgets."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from lcars_ui.core.widget_base import BaseWidget


class TableRow(BaseModel):
    """A single table row."""

    id: str = Field(description="Unique row identifier.")
    cells: list[str] = Field(description="Ordered row cell values.")


class SeriesPointSet(BaseModel):
    """A named timeseries dataset."""

    name: str = Field(description="Series display name.")
    data: list[float] = Field(description="Numeric series values.")
    color: Literal["orange", "red", "blue", "purple", "white", "yellow"] | None = Field(
        default=None,
        description="Optional series color override.",
    )


class Table(BaseWidget):
    """Strict row/column data table."""

    type: Literal["table"] = "table"
    headers: list[str] = Field(description="Column headers.")
    rows: list[TableRow] = Field(description="Table row objects.")


class LineChart(BaseWidget):
    """Time-series line chart."""

    type: Literal["line_chart"] = "line_chart"
    series: list[SeriesPointSet] = Field(description="Series datasets for plotting.")
    x_labels: list[str] = Field(description="X-axis labels aligned to series length.")


class Sparkline(BaseWidget):
    """Compact line chart without full axes/grid."""

    type: Literal["sparkline"] = "sparkline"
    series: list[SeriesPointSet] = Field(description="Series datasets for plotting.")
    x_labels: list[str] = Field(description="X-axis labels aligned to series length.")


__all__ = ["TableRow", "SeriesPointSet", "Table", "LineChart", "Sparkline"]
