"""Primitive widgets."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from lcars_ui.core.widget_base import BaseWidget


class Text(BaseWidget):
    """Simple text content widget."""

    type: Literal["text"] = "text"
    content: str = Field(description="Text content to render.")
    size: Literal["h1", "h2", "body", "mono"] = Field(
        default="body",
        description="Typography style token.",
    )


class StatusTile(BaseWidget):
    """Status and readout tile."""

    type: Literal["status_tile"] = "status_tile"
    status: Literal["ok", "warn", "crit"] = Field(description="Current status severity.")
    value: str = Field(description="Large status value readout.")


class Alert(BaseWidget):
    """High-visibility alert banner."""

    type: Literal["alert"] = "alert"
    severity: Literal["red", "yellow"] = Field(description="Alert severity level.")
    message: str = Field(description="Alert message.")
    blink: bool = Field(default=False, description="If true, alert pulses opacity.")


__all__ = ["Text", "StatusTile", "Alert"]
