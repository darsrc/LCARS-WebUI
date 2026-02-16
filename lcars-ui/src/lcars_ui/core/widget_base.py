"""Widget base class."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class BaseWidget(BaseModel):
    """Common fields shared by all LCARS widgets."""

    id: str = Field(description="Unique widget identifier used for event targeting.")
    type: str = Field(description="Widget type discriminator.")
    label: str | None = Field(default=None, description="Optional display or accessibility label.")
    color: Literal["orange", "red", "blue", "purple", "white", "yellow"] | None = Field(
        default=None,
        description="Optional LCARS palette color.",
    )
    disabled: bool = Field(default=False, description="If true, interaction is disabled.")
    visible: bool = Field(default=True, description="If false, widget is removed from layout flow.")


__all__ = ["BaseWidget"]
