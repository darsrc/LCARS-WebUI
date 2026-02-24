"""Input widgets."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from lcars_ui.core.widget_base import BaseWidget


class SelectOption(BaseModel):
    """Selectable option entry."""

    label: str = Field(description="Human-readable option label.")
    value: str = Field(description="Machine option value.")


class Button(BaseWidget):
    """Momentary action button."""

    type: Literal["button"] = "button"
    action_id: str = Field(description="Action id emitted when clicked.")


class Toggle(BaseWidget):
    """Boolean ON/OFF control."""

    type: Literal["toggle"] = "toggle"
    checked: bool = Field(default=False, description="Initial checked state.")
    action_id: str = Field(description="Action id emitted on value change.")


class Select(BaseWidget):
    """Single-select control."""

    type: Literal["select"] = "select"
    options: list[SelectOption] = Field(description="Available options.")
    value: str = Field(description="Current selected value.")
    action_id: str = Field(description="Action id emitted on selection change.")


class TextInput(BaseWidget):
    """Text entry control."""

    type: Literal["text_input"] = "text_input"
    placeholder: str | None = Field(default=None, description="Placeholder hint text.")
    value: str = Field(default="", description="Current text value.")
    password: bool = Field(default=False, description="If true, masks entered characters.")
    regex: str | None = Field(default=None, description="Optional validation regex hint.")


InputWidget = Annotated[Button | Toggle | Select | TextInput, Field(discriminator="type")]


class Form(BaseWidget):
    """Logical container for grouped input widgets."""

    type: Literal["form"] = "form"
    submit_label: str = Field(description="Submit button label.")
    action_id: str = Field(description="Action id emitted on submit.")
    children: list[InputWidget] = Field(
        default_factory=list,
        description="Nested input widgets aggregated into form submit payload.",
    )


__all__ = ["SelectOption", "Button", "Toggle", "Select", "TextInput", "Form", "InputWidget"]
