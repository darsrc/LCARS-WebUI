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


class OhlcPoint(BaseModel):
    """A single open/high/low/close bar (or Renko brick)."""

    time: int | str = Field(
        description=(
            "Bar time: unix seconds (UTC) for intraday/live data, or a 'YYYY-MM-DD' "
            "string for daily data."
        )
    )
    open: float = Field(description="Open price.")
    high: float = Field(description="High price.")
    low: float = Field(description="Low price.")
    close: float = Field(description="Close price.")
    volume: float | None = Field(default=None, description="Optional volume.")


class ChartMarker(BaseModel):
    """An annotation/marker plotted on a candlestick or Renko chart."""

    time: int | str = Field(description="Marker time, matching a bar's `time`.")
    position: Literal["above", "below", "in"] = Field(
        default="above", description="Marker placement relative to the bar."
    )
    shape: Literal["arrow_up", "arrow_down", "circle", "square"] = Field(
        default="circle", description="Marker glyph shape."
    )
    color: LcarsColor | None = Field(default=None, description="Optional marker color.")
    text: str | None = Field(default=None, description="Optional marker label text.")


class Candlestick(BaseWidget):
    """Live OHLC candlestick chart with pan/zoom and trade markers."""

    type: Literal["candlestick"] = "candlestick"
    data: list[OhlcPoint] = Field(description="Ordered OHLC bars.")
    markers: list[ChartMarker] = Field(
        default_factory=list, description="Optional annotation markers."
    )
    up_color: LcarsColor | None = Field(default=None, description="Bullish bar color.")
    down_color: LcarsColor | None = Field(default=None, description="Bearish bar color.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class Renko(BaseWidget):
    """Live Renko brick chart with pan/zoom and trade markers."""

    type: Literal["renko"] = "renko"
    data: list[OhlcPoint] = Field(description="Ordered Renko bricks.")
    markers: list[ChartMarker] = Field(
        default_factory=list, description="Optional annotation markers."
    )
    up_color: LcarsColor | None = Field(default=None, description="Up-brick color.")
    down_color: LcarsColor | None = Field(default=None, description="Down-brick color.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class Shader(BaseWidget):
    """Animated WebGL fragment-shader viewport."""

    type: Literal["shader"] = "shader"
    fragment_shader: str = Field(
        description=(
            "GLSL ES 1.00 fragment shader source. Receives `uniform float u_time`, "
            "`uniform vec2 u_resolution`, `varying vec2 v_uv`, plus any custom "
            "uniforms declared in `uniforms`."
        )
    )
    uniforms: dict[str, float | list[float]] = Field(
        default_factory=dict,
        description="Custom uniform values (float, or vec2/vec3/vec4 as a list).",
    )
    aspect_ratio: float | None = Field(
        default=None, description="Optional fixed width/height ratio; fills the panel otherwise."
    )
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


__all__ = [
    "TableRow",
    "SeriesPointSet",
    "Table",
    "LineChart",
    "Sparkline",
    "OhlcPoint",
    "ChartMarker",
    "Candlestick",
    "Renko",
    "Shader",
    "Gauge",
]
