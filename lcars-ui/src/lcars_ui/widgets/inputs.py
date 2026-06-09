"""Input widgets."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from lcars_ui.core.widget_base import BaseWidget, StrictSurfaceVariant, StrictWidgetRole


class SelectOption(BaseModel):
    """Selectable option entry."""

    label: str = Field(description="Human-readable option label.")
    value: str = Field(description="Machine option value.")


class Button(BaseWidget):
    """Momentary action button."""

    type: Literal["button"] = "button"
    action_id: str = Field(description="Action id emitted when clicked.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class Toggle(BaseWidget):
    """Boolean ON/OFF control."""

    type: Literal["toggle"] = "toggle"
    checked: bool = Field(default=False, description="Initial checked state.")
    action_id: str = Field(description="Action id emitted on value change.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class Checkbox(BaseWidget):
    """LCARS-styled checkbox control."""

    type: Literal["lcars_checkbox"] = "lcars_checkbox"
    checked: bool = Field(default=False, description="Initial checked state.")
    action_id: str = Field(description="Action id emitted on value change.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class Select(BaseWidget):
    """Single-select control."""

    type: Literal["select"] = "select"
    options: list[SelectOption] = Field(description="Available options.")
    value: str = Field(description="Current selected value.")
    action_id: str = Field(description="Action id emitted on selection change.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class Radio(BaseWidget):
    """Single-select radio control with LCARS styling."""

    type: Literal["lcars_radio"] = "lcars_radio"
    options: list[SelectOption] = Field(description="Available options.")
    value: str = Field(description="Current selected value.")
    action_id: str = Field(description="Action id emitted on selection change.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class RadioToggle(BaseWidget):
    """Segmented LCARS radio toggle control."""

    type: Literal["lcars_radio_toggle"] = "lcars_radio_toggle"
    options: list[SelectOption] = Field(description="Available options.")
    value: str = Field(description="Current selected value.")
    action_id: str = Field(description="Action id emitted on selection change.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class TextInput(BaseWidget):
    """Text entry control."""

    type: Literal["text_input"] = "text_input"
    placeholder: str | None = Field(default=None, description="Placeholder hint text.")
    value: str = Field(default="", description="Current text value.")
    password: bool = Field(default=False, description="If true, masks entered characters.")
    regex: str | None = Field(default=None, description="Optional validation regex hint.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class NumberInput(BaseWidget):
    """Numeric entry control."""

    type: Literal["number_input"] = "number_input"
    value: float = Field(default=0.0, description="Current numeric value.")
    min: float | None = Field(default=None, description="Optional minimum allowed value.")
    max: float | None = Field(default=None, description="Optional maximum allowed value.")
    step: float = Field(default=1.0, description="Increment/decrement step.")
    placeholder: str | None = Field(default=None, description="Placeholder hint text.")
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


InputWidget = Annotated[
    Button | Toggle | Checkbox | Select | Radio | RadioToggle | TextInput | NumberInput,
    Field(discriminator="type"),
]


class Form(BaseWidget):
    """Logical container for grouped input widgets."""

    type: Literal["form"] = "form"
    submit_label: str = Field(description="Submit button label.")
    action_id: str = Field(description="Action id emitted on submit.")
    children: list[InputWidget] = Field(
        default_factory=list,
        description="Nested input widgets aggregated into form submit payload.",
    )
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


__all__ = [
    "SelectOption",
    "Button",
    "Toggle",
    "Checkbox",
    "Select",
    "Radio",
    "RadioToggle",
    "TextInput",
    "NumberInput",
    "Form",
    "InputWidget",
]
