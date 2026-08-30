"""Shared strict contract defaults for active DSL and compatibility fallback."""

from __future__ import annotations

from typing import Literal, TypeVar, get_args

from lcars_ui.core.models import Widget
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
    "file_upload",
    "webui_settings",
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
    "tri_state",
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
    "file_upload",
    "webui_settings",
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
    "three_scene",
    "node_canvas",
    "support_panel",
    "tri_state",
}

# Widgets where title comes from container
_TITLE_FROM_CONTAINER_WIDGET_TYPES = {
    "lcars_box",
    "lcars_sweep",
    "lcars_bracket",
    "lcars_header",
    "popup",
}

# Widgets that render in readout frame
_READOUT_FRAME_WIDGET_TYPES = {
    "status_tile",
    "gauge",
    "progress_bar",
    "text",
    "markdown",
    "tri_state",
}

# Widgets that render in chart frame
_CHART_FRAME_WIDGET_TYPES = {
    "line_chart",
    "sparkline",
    "candlestick",
    "renko",
    "shader",
    "table",
    # Immersive surfaces: they own their panel the way a chart does, so they
    # take the chart frame rather than a readout band. Role falls through to
    # "primary" — these are never secondary content on a page that has one.
    "three_scene",
    "node_canvas",
    "support_panel",
}

WidgetCapability = Literal["accent", "scrollable", "copyable", "feedback", "busy"]

WIDGET_CAPABILITY_FAMILIES: tuple[WidgetCapability, ...] = (
    "accent",
    "scrollable",
    "copyable",
    "feedback",
    "busy",
)


def _widget_type_token(widget_class: type[BaseWidget]) -> str:
    """Return the discriminator literal declared by one Widget union member."""
    discriminator = get_args(widget_class.model_fields["type"].annotation)
    if len(discriminator) != 1 or not isinstance(discriminator[0], str):
        raise TypeError(f"{widget_class.__name__}.type must be a single string Literal")
    return discriminator[0]


# The order and membership come from Widget itself. Adding a union member therefore
# changes this tuple immediately; the hand-classified catalogue below must then be
# updated deliberately rather than allowing the new type to inherit silent defaults.
WIDGET_TYPES: tuple[str, ...] = tuple(
    _widget_type_token(widget_class) for widget_class in get_args(get_args(Widget)[0])
)


# Capability membership is intentionally explicit for every union member. Empty
# sets are meaningful classifications: composition and surface grouping nodes own
# layout, while geometry nodes use direct SVG paint rather than the CSS --accent
# contract exercised by host widgets.
WIDGET_CAPABILITIES: dict[str, frozenset[WidgetCapability]] = {
    "text": frozenset({"accent", "scrollable", "copyable", "feedback"}),
    "status_tile": frozenset({"accent", "feedback"}),
    "alert": frozenset({"feedback"}),
    "button": frozenset({"accent", "feedback", "busy"}),
    "toggle": frozenset({"accent", "feedback", "busy"}),
    "lcars_checkbox": frozenset({"feedback", "busy"}),
    "lcars_radio": frozenset({"feedback", "busy"}),
    "lcars_radio_toggle": frozenset({"feedback", "busy"}),
    "select": frozenset({"accent", "feedback", "busy"}),
    "text_input": frozenset({"accent", "feedback"}),
    "number_input": frozenset({"accent", "feedback"}),
    "file_upload": frozenset({"accent", "busy"}),
    "form": frozenset({"accent", "feedback", "busy"}),
    "table": frozenset({"accent", "scrollable", "copyable", "feedback"}),
    "line_chart": frozenset({"scrollable", "feedback"}),
    "sparkline": frozenset({"scrollable", "feedback"}),
    "candlestick": frozenset({"scrollable", "feedback"}),
    "renko": frozenset({"scrollable", "feedback"}),
    "shader": frozenset({"feedback"}),
    "gauge": frozenset({"accent", "feedback"}),
    "progress_bar": frozenset({"accent", "feedback"}),
    "markdown": frozenset({"scrollable", "copyable", "feedback"}),
    "log_viewer": frozenset({"accent", "scrollable", "copyable", "feedback"}),
    "video_hls": frozenset({"accent", "feedback"}),
    "three_scene": frozenset({"feedback"}),
    "node_canvas": frozenset({"feedback"}),
    "graph_workspace": frozenset({"feedback"}),
    "mic_button": frozenset({"accent", "feedback", "busy"}),
    "lcars_box": frozenset({"accent", "feedback"}),
    "lcars_sweep": frozenset({"accent", "feedback"}),
    "lcars_bracket": frozenset({"accent", "feedback"}),
    "lcars_header": frozenset({"accent", "feedback"}),
    "lcars_bar": frozenset({"accent"}),
    "composition_area": frozenset(),
    "authored_composition": frozenset(),
    "surface": frozenset(),
    "surface_region": frozenset({"accent"}),
    "surface_group": frozenset(),
    "rect": frozenset(),
    "rounded_rect": frozenset(),
    "capsule": frozenset(),
    "circle": frozenset(),
    "ellipse": frozenset(),
    "arc": frozenset(),
    "ring": frozenset(),
    "wedge": frozenset(),
    "elbow": frozenset(),
    "polygon": frozenset(),
    "path": frozenset(),
    "connector": frozenset(),
    "text_path": frozenset(),
    "effect": frozenset(),
    "popup": frozenset({"accent"}),
    "webui_settings": frozenset(),
    "support_panel": frozenset({"accent"}),
    "tri_state": frozenset({"accent"}),
}


def validate_widget_capability_catalogue() -> None:
    """Raise with an actionable diff when Widget and its catalogue diverge."""
    union_types = set(WIDGET_TYPES)
    catalogued_types = set(WIDGET_CAPABILITIES)
    missing = sorted(union_types - catalogued_types)
    extra = sorted(catalogued_types - union_types)
    if missing or extra:
        raise AssertionError(
            "Widget capability catalogue does not match Widget union: "
            f"missing={missing}, extra={extra}"
        )


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
    "WidgetCapability",
    "WIDGET_CAPABILITY_FAMILIES",
    "WIDGET_CAPABILITIES",
    "WIDGET_TYPES",
    "default_strict_role_for_widget",
    "default_strict_title_for_widget",
    "default_strict_surface_variant_for_widget",
    "is_legacy_input_widget",
    "apply_default_strict_contract",
    "normalize_strict_title_text",
    "validate_widget_capability_catalogue",
]
