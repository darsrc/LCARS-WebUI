"""Shared strict contract defaults for active DSL and compatibility fallback."""

from __future__ import annotations

from typing import Literal, TypeVar

from lcars_ui.core.widget_base import BaseWidget, StrictSurfaceVariant, StrictWidgetRole

_WidgetT = TypeVar("_WidgetT", bound=BaseWidget)

StrictContractScope = Literal[
    "page",
    "box_content",
    "bracket_content",
    "sweep_content",
    "rail",
    "header",
    "form",
]

# Widgets that are considered legacy input controls
_INPUT_WIDGET_TYPES = {
    "button",
    "select",
    "toggle",
    "lcars_radio",
    "text_input",
    "number_input",
    "lcars_checkbox",
    "lcars_radio_toggle",
    "mic_button",
}

# Widgets that are considered secondary content
_SECONDARY_WIDGET_TYPES = {
    "alert",
    "gauge",
    "status_tile",
    "progress_bar",
    "table",
    "video_hls",
    "log_viewer",
    "text",
    "markdown",
}

# Widgets where title comes from label field
_TITLE_FROM_LABEL_WIDGET_TYPES = {
    "button",
    "toggle",
    "lcars_checkbox",
    "lcars_radio",
    "lcars_radio_toggle",
    "select",
    "text_input",
    "number_input",
    "form",
    "mic_button",
}

# Widgets where title comes from label OR id
_TITLE_FROM_LABEL_OR_ID_WIDGET_TYPES = {
    "gauge",
    "status_tile",
    "progress_bar",
    "table",
    "video_hls",
    "log_viewer",
    "text",
    "markdown",
    "alert",
}

# Widgets where title comes from container
_TITLE_FROM_CONTAINER_WIDGET_TYPES = {
    "lcars_box",
    "lcars_sweep",
    "lcars_bracket",
    "lcars_header",
}

# Widgets that render in readout frame
_READOUT_FRAME_WIDGET_TYPES = {
    "status_tile",
    "gauge",
    "progress_bar",
    "text",
    "markdown",
}

# Widgets that render in chart frame
_CHART_FRAME_WIDGET_TYPES = {
    "line_chart",
    "sparkline",
    "candlestick",
    "renko",
    "shader",
    "table",
}


def normalize_strict_title_text(widget: BaseWidget) -> str | None:
    """Extract and normalize title text from widget."""
    label = getattr(widget, "label", None)
    title = getattr(widget, "title", None)
    content = getattr(widget, "content", None)
    message = getattr(widget, "message", None)

    if title:
        return title.strip() if isinstance(title, str) else None
    if label:
        return label.strip() if isinstance(label, str) else None
    if content:
        return content.strip() if isinstance(content, str) else None
    if message:
        return message.strip() if isinstance(message, str) else None
    return None


def is_legacy_input_widget(widget: BaseWidget) -> bool:
    """Check if widget is a legacy input control type."""
    widget_type = getattr(widget, "type", None)
    return widget_type in _INPUT_WIDGET_TYPES


def default_strict_role_for_widget(
    widget: _WidgetT,
    scope: StrictContractScope | None = None,
) -> StrictWidgetRole:
    """Determine default strict_role for a widget based on its type."""
    widget_type = getattr(widget, "type", None)

    if widget_type in _INPUT_WIDGET_TYPES:
        return "terminal"

    if widget_type in _SECONDARY_WIDGET_TYPES:
        return "secondary"

    return "primary"


def default_strict_title_for_widget(widget: BaseWidget) -> str | None:
    """Determine default strict_title for a widget based on its type."""
    widget_type = getattr(widget, "type", None)

    if widget_type in _TITLE_FROM_CONTAINER_WIDGET_TYPES:
        return None

    if widget_type in _TITLE_FROM_LABEL_WIDGET_TYPES:
        return getattr(widget, "label", None)

    if widget_type in _TITLE_FROM_LABEL_OR_ID_WIDGET_TYPES:
        return (
            getattr(widget, "label", None)
            or getattr(widget, "title", None)
            or getattr(widget, "id", None)
        )

    return None


def default_strict_surface_variant_for_widget(
    widget: BaseWidget,
) -> StrictSurfaceVariant | None:
    """Determine default strict_surface_variant for a widget based on its type."""
    widget_type = getattr(widget, "type", None)

    if widget_type in _READOUT_FRAME_WIDGET_TYPES:
        return "readout_frame"

    if widget_type in _CHART_FRAME_WIDGET_TYPES:
        return "chart_frame"

    return None


def apply_default_strict_contract(
    widget: BaseWidget,
    scope: StrictContractScope | None = None,
) -> BaseWidget:
    """Apply default strict contract values to a widget if not already set."""
    if getattr(widget, "strict_role", None) is None:
        widget.strict_role = default_strict_role_for_widget(widget, scope=scope)

    if getattr(widget, "strict_title", None) is None:
        widget.strict_title = default_strict_title_for_widget(widget)

    if getattr(widget, "strict_surface_variant", None) is None:
        widget.strict_surface_variant = default_strict_surface_variant_for_widget(widget)

    return widget


__all__ = [
    "StrictContractScope",
    "default_strict_role_for_widget",
    "default_strict_title_for_widget",
    "default_strict_surface_variant_for_widget",
    "is_legacy_input_widget",
    "apply_default_strict_contract",
    "normalize_strict_title_text",
]
