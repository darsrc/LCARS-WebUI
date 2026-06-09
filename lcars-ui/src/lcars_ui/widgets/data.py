"""Data widgets."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from lcars_ui.core.widget_base import BaseWidget, LcarsColor, StrictSurfaceVariant, StrictWidgetRole


class TableRow(BaseModel):
    """A single table row."""

    id: str = Field(description="Unique row identifier.")
    cells: list[str] = Field(description="Ordered row cell values.")


class SeriesPointSet(BaseModel):
    """A named timeseries dataset."""

    name: str = Field(description="Series display name.")
    data: list[float] = Field(description="Numeric series values.")
    color: LcarsColor | None = Field(
        default=None,
        description="Optional series color override.",
    )


class Table(BaseWidget):
    """Strict row/column data table."""

    type: Literal["table"] = "table"
    headers: list[str] = Field(description="Column headers.")
    rows: list[TableRow] = Field(description="Table row objects.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class LineChart(BaseWidget):
    """Time-series line chart."""

    type: Literal["line_chart"] = "line_chart"
    series: list[SeriesPointSet] = Field(description="Series datasets for plotting.")
    x_labels: list[str] = Field(description="X-axis labels aligned to series length.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class Sparkline(BaseWidget):
    """Compact line chart without full axes/grid."""

    type: Literal["sparkline"] = "sparkline"
    series: list[SeriesPointSet] = Field(description="Series datasets for plotting.")
    x_labels: list[str] = Field(description="X-axis labels aligned to series length.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class Gauge(BaseWidget):
    """Circular gauge for single-value telemetry."""

    type: Literal["gauge"] = "gauge"
    value: float = Field(description="Current value.")
    min: float = Field(default=0.0, description="Lower bound.")
    max: float = Field(default=100.0, description="Upper bound.")
    unit: str | None = Field(default=None, description="Unit suffix shown beside value.")
    warn_threshold: float | None = Field(
        default=None,
        description="Optional warning threshold for style changes.",
    )
    crit_threshold: float | None = Field(
        default=None,
        description="Optional critical threshold for style changes.",
    )
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


__all__ = ["TableRow", "SeriesPointSet", "Table", "LineChart", "Sparkline", "Gauge"]
