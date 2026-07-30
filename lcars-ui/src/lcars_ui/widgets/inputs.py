"""Input widgets."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, model_serializer

from lcars_ui.core.widget_base import BaseWidget, StrictSurfaceVariant, StrictWidgetRole
from lcars_ui.widgets.options import (
    ButtonOptions,
    ChoiceOptions,
    FormOptions,
    NumberInputOptions,
    TextInputOptions,
    ToggleOptions,
)


class SelectOption(BaseModel):
    """Selectable option entry."""

    label: str = Field(description="Human-readable option label.")
    value: str = Field(description="Machine option value.")
    disabled: bool = Field(default=False, description="Whether this option is unavailable.")
    description: str | None = Field(default=None, description="Optional option description.")
    group: str | None = Field(default=None, description="Optional option group label.")

    @model_serializer(mode="wrap")
    def _serialize_compatibly(self, handler: Any) -> dict[str, Any]:
        data: dict[str, Any] = handler(self)
        if not self.disabled:
            data.pop("disabled", None)
        if self.description is None:
            data.pop("description", None)
        if self.group is None:
            data.pop("group", None)
        return data


class Button(BaseWidget):
    """Momentary action button."""

    type: Literal["button"] = "button"
    action_id: str = Field(description="Action id emitted when clicked.")
    options: ButtonOptions | None = Field(default=None, description="Enhanced button capabilities.")
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
    options: ToggleOptions | None = Field(default=None, description="Enhanced toggle capabilities.")
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
    options: ToggleOptions | None = Field(
        default=None, description="Enhanced checkbox capabilities."
    )
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
    value: str | list[str] = Field(description="Current selected value or values.")
    action_id: str = Field(description="Action id emitted on selection change.")
    settings: ChoiceOptions | None = Field(
        default=None, description="Enhanced select capabilities."
    )
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
    settings: ChoiceOptions | None = Field(default=None, description="Enhanced radio capabilities.")
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
    settings: ChoiceOptions | None = Field(
        default=None, description="Enhanced segmented choice capabilities."
    )
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
    autocomplete: bool = Field(
        default=True, description="If false, suppresses the browser's autocomplete/history dropdown"
    )
    options: TextInputOptions | None = Field(
        default=None, description="Enhanced text-input capabilities."
    )
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
    options: NumberInputOptions | None = Field(
        default=None, description="Enhanced number-input capabilities."
    )
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class FileUpload(BaseWidget):
    """Drag/drop file picker that uploads multipart data to an application endpoint."""

    type: Literal["file_upload"] = "file_upload"
    action_id: str = Field(description="Action id dispatched after a successful upload.")
    upload_url: str = Field(
        default="/lcars/upload/files",
        description=(
            "Multipart upload endpoint. The built-in endpoint dispatches action_id with "
            "the uploaded bytes available during the HANDLE rerun."
        ),
    )
    accept: list[str] = Field(
        default_factory=list,
        description=(
            "Accepted MIME types or filename extensions, e.g. ['application/json', '.yaml']."
        ),
    )
    multiple: bool = Field(default=True, description="Allow more than one file per upload.")
    max_files: int = Field(default=10, ge=1, le=50, description="Maximum files per upload.")
    max_bytes: int = Field(
        default=25_000_000,
        ge=1,
        description="Maximum size of each selected file in bytes (client-side guard).",
    )
    strict_role: StrictWidgetRole | None = Field(
        default="terminal", description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


class UploadedFile(BaseModel):
    """One file delivered to a ``file_upload`` HANDLE rerun.

    The payload lives only for the request that accepted it. Consume or persist
    ``data`` inside that rerun; LCARS does not retain uploaded files afterward.
    """

    name: str = Field(description="Sanitized client filename.")
    size: int = Field(ge=0, description="Payload size in bytes.")
    content_type: str | None = Field(default=None, description="Browser-provided MIME type.")
    data: bytes = Field(repr=False, description="Raw uploaded bytes.")

    def read(self) -> bytes:
        """Return the complete in-memory payload."""

        return self.data


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
    options: FormOptions | None = Field(default=None, description="Enhanced form capabilities.")
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
    "FileUpload",
    "UploadedFile",
    "Form",
    "InputWidget",
]
