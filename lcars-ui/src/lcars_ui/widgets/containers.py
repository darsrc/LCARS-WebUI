"""Composable LCARS container and section widgets."""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from pydantic import Field, field_validator

from lcars_ui.core.widget_base import BaseWidget, LcarsColor

if TYPE_CHECKING:
    from lcars_ui.core.models import Widget

_BOX_EDGE_INDEXES = {1, 2, 3, 4}


def _normalize_edge_indexes(values: list[int]) -> list[int]:
    seen: set[int] = set()
    normalized: list[int] = []
    for value in values:
        if value not in _BOX_EDGE_INDEXES:
            raise ValueError("Edge indexes must be in [1, 2, 3, 4].")
        if value in seen:
            continue
        seen.add(value)
        normalized.append(value)
    return normalized


class LcarsBox(BaseWidget):
    """Composable LCARS container with configurable corners and side bars."""

    type: Literal["lcars_box"] = "lcars_box"
    title: str | None = Field(
        default=None,
        description="Optional embedded title for the top bar.",
    )
    subtitle: str | None = Field(
        default=None,
        description="Optional embedded subtitle for the bottom bar.",
    )
    corners: list[int] = Field(
        default_factory=lambda: [1, 2, 3, 4],
        description="Corner elbows to render, using [1,2,3,4]=[TL,TR,BR,BL].",
    )
    sides: list[int] = Field(
        default_factory=lambda: [1, 2, 3, 4],
        description="Side bars to render, using [1,2,3,4]=[top,right,bottom,left].",
    )
    color: LcarsColor = Field(
        default="orange",
        description="Base color inherited by corners and bars.",
    )
    corner_colors: list[LcarsColor] | None = Field(
        default=None,
        min_length=4,
        max_length=4,
        description="Per-corner color override [TL,TR,BR,BL].",
    )
    side_colors: list[LcarsColor] | None = Field(
        default=None,
        min_length=4,
        max_length=4,
        description="Per-side color override [top,right,bottom,left].",
    )
    title_color: LcarsColor | None = Field(
        default=None,
        description="Optional title color override.",
    )
    subtitle_color: LcarsColor | None = Field(
        default=None,
        description="Optional subtitle color override.",
    )
    width_left: int = Field(default=150, ge=48, description="Left sidebar width in px.")
    width_right: int = Field(default=150, ge=48, description="Right sidebar width in px.")
    left_inputs: list[Widget] | None = Field(
        default=None,
        description="Widgets rendered in the left sidebar input column.",
    )
    right_inputs: list[Widget] | None = Field(
        default=None,
        description="Widgets rendered in the right sidebar input column.",
    )
    children: list[Widget] = Field(
        default_factory=list,
        description="Main content children rendered inside the box.",
    )

    @field_validator("corners", "sides")
    @classmethod
    def _validate_edges(cls, values: list[int]) -> list[int]:
        return _normalize_edge_indexes(values)


class LcarsSweep(BaseWidget):
    """LCARS sweep container: curved transition with one sidebar and content area."""

    type: Literal["lcars_sweep"] = "lcars_sweep"
    title: str | None = Field(default=None, description="Optional sweep title.")
    color: LcarsColor = Field(default="orange", description="Sweep accent color.")
    reverse: bool = Field(
        default=False,
        description="If true, render the sweep reversed vertically.",
    )
    width_sidebar: int = Field(default=150, ge=48, description="Sweep sidebar width in px.")
    children: list[Widget] = Field(default_factory=list, description="Sweep content children.")


class LcarsBracket(BaseWidget):
    """LCARS bracket container for grouping related content."""

    type: Literal["lcars_bracket"] = "lcars_bracket"
    color: LcarsColor = Field(default="orange", description="Bracket accent color.")
    orientation: Literal["left", "right", "both"] = Field(
        default="both",
        description="Bracket side orientation.",
    )
    children: list[Widget] = Field(default_factory=list, description="Bracket content children.")


class LcarsHeader(BaseWidget):
    """LCARS section header with bar-and-pill presentation."""

    type: Literal["lcars_header"] = "lcars_header"
    text: str = Field(description="Header text content.")
    color: LcarsColor = Field(default="orange", description="Header accent color.")
    size: Literal["h1", "h2", "h3", "h4", "h5", "h6"] = Field(
        default="h2",
        description="Header size token.",
    )


__all__ = ["LcarsBox", "LcarsSweep", "LcarsBracket", "LcarsHeader"]
