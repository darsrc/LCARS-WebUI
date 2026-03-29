"""Primitive widgets."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from lcars_ui.core.widget_base import BaseWidget, StrictSurfaceVariant, StrictWidgetRole


class Text(BaseWidget):
    """Simple text content widget."""

    type: Literal["text"] = "text"
    content: str = Field(description="Text content to render.")
    size: Literal["h1", "h2", "body", "mono"] = Field(
        default="body",
        description="Typography style token.",
    )
    strict_role: StrictWidgetRole | None = Field(default=None, description="Strict composition role.")
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(default=None, description="Strict surface variant.")


class StatusTile(BaseWidget):
    """Status and readout tile."""

    type: Literal["status_tile"] = "status_tile"
    status: Literal["ok", "warn", "crit"] = Field(description="Current status severity.")
    value: str = Field(description="Large status value readout.")
    strict_role: StrictWidgetRole | None = Field(default=None, description="Strict composition role.")
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(default=None, description="Strict surface variant.")


class Alert(BaseWidget):
    """High-visibility alert banner."""

    type: Literal["alert"] = "alert"
    severity: Literal["red", "yellow"] = Field(description="Alert severity level.")
    message: str = Field(description="Alert message.")
    blink: bool = Field(default=False, description="If true, alert pulses opacity.")
    strict_role: StrictWidgetRole | None = Field(default=None, description="Strict composition role.")
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(default=None, description="Strict surface variant.")


class ProgressBar(BaseWidget):
    """Horizontal progress meter."""

    type: Literal["progress_bar"] = "progress_bar"
    value: float = Field(description="Progress percentage in range 0.0-100.0.")
    show_label: bool = Field(default=True, description="Show percentage text overlay.")
    strict_role: StrictWidgetRole | None = Field(default=None, description="Strict composition role.")
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(default=None, description="Strict surface variant.")


class Markdown(BaseWidget):
    """Rich markdown content block."""

    type: Literal["markdown"] = "markdown"
    content: str = Field(description="Markdown content.")
    strict_role: StrictWidgetRole | None = Field(default=None, description="Strict composition role.")
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(default=None, description="Strict surface variant.")


__all__ = ["Text", "StatusTile", "Alert", "ProgressBar", "Markdown"]
