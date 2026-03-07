"""Core manifest models for LCARS contract."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from lcars_ui.core.widget_base import LcarsColor
from lcars_ui.widgets.containers import LcarsBox, LcarsBracket, LcarsHeader, LcarsSweep
from lcars_ui.widgets.data import Gauge, LineChart, Sparkline, Table
from lcars_ui.widgets.inputs import (
    Button,
    Checkbox,
    Form,
    NumberInput,
    Radio,
    RadioToggle,
    Select,
    TextInput,
    Toggle,
)
from lcars_ui.widgets.media import LogViewer, MicButton, VideoHls
from lcars_ui.widgets.primitives import Alert, Markdown, ProgressBar, StatusTile, Text


class Meta(BaseModel):
    """Global manifest metadata."""

    version: str = Field(description="Schema semantic version.")
    app_name: str = Field(description="Application display name.")
    theme: Literal["galaxy", "nemesis", "tng"] = Field(description="Theme token.")
    lang: str = Field(description="Language locale code (e.g. en-US).")
    sound_enabled: bool = Field(default=True, description="Frontend hint for sound effects.")
    force_uppercase: bool = Field(
        default=True,
        description="Force uppercase across shell/chrome text.",
    )
    label_uppercase: bool = Field(
        default=True,
        description="Force uppercase for labels specifically.",
    )
    lcars_font_headers: bool = Field(default=True, description="Use LCARS header typeface.")
    lcars_font_labels: bool = Field(default=True, description="Use LCARS label typeface.")
    lcars_font_text: bool = Field(default=False, description="Use LCARS font for body text.")
    visual_language: Literal["strict", "classic"] = Field(
        default="strict",
        description="Frontend LCARS visual mode: strict (default) or classic compatibility.",
    )


class Header(BaseModel):
    """Shell header configuration."""

    title: str = Field(description="Primary header title.")
    subtitle: str | None = Field(default=None, description="Optional header subtitle.")
    color: LcarsColor = Field(
        default="orange",
        description="Header accent color.",
    )


class SidebarSegment(BaseModel):
    """Sidebar segment configuration for authentic LCARS stacked bars."""

    label: str | None = Field(default=None, description="Optional segment label.")
    color: LcarsColor = Field(default="orange", description="Segment color.")


class SidebarItem(BaseModel):
    """Sidebar navigation item."""

    id: str = Field(description="Unique nav item identifier.")
    label: str = Field(description="Visible nav label.")
    target_page: str = Field(description="Destination page id.")
    color: LcarsColor | None = Field(
        default=None,
        description="Optional item color override.",
    )
    segments: list[SidebarSegment] | None = Field(
        default=None,
        description="Optional stacked segment render instructions.",
    )


class Sidebar(BaseModel):
    """Sidebar shell config."""

    position: Literal["left", "right", "hidden"] = Field(
        default="left",
        description="Sidebar placement.",
    )
    items: list[SidebarItem] = Field(default_factory=list, description="Always-visible nav items.")


class Layout(BaseModel):
    """Global shell layout."""

    header: Header = Field(description="Shell header block.")
    sidebar: Sidebar = Field(description="Shell sidebar block.")


Widget = Annotated[
    Text
    | StatusTile
    | Alert
    | Button
    | Toggle
    | Checkbox
    | Radio
    | RadioToggle
    | Select
    | TextInput
    | NumberInput
    | Form
    | Table
    | LineChart
    | Sparkline
    | Gauge
    | ProgressBar
    | Markdown
    | LogViewer
    | VideoHls
    | MicButton
    | LcarsBox
    | LcarsSweep
    | LcarsBracket
    | LcarsHeader,
    Field(discriminator="type"),
]

# Resolve recursive container references once Widget union is defined.
_RECURSIVE_WIDGET_NAMESPACE = {"Widget": Widget, "Literal": Literal}
LcarsBox.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)
LcarsSweep.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)
LcarsBracket.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)


class Column(BaseModel):
    """A page column.

    In strict mode this remains a transport envelope for compatibility; LCARS
    composition truth is compiled into container widgets within ``widgets``.
    """

    id: str = Field(description="Unique column identifier.")
    width: str = Field(default="1fr", description="Layout width hint (e.g. 1fr, 300px).")
    widgets: list[Widget] = Field(default_factory=list, description="Widgets in this column.")


class Row(BaseModel):
    """A page row.

    In strict mode this remains a compatibility band boundary, while interior
    composition is container-driven after normalization.
    """

    id: str = Field(description="Unique row identifier.")
    height: str = Field(default="auto", description="Layout height hint (e.g. auto, 1fr, 200px).")
    columns: list[Column] = Field(default_factory=list, description="Columns in this row.")


class Page(BaseModel):
    """A logical application page.

    Strict mode still serializes rows/columns for manifest compatibility, but
    rendering semantics are expected to follow normalized LCARS containers.
    """

    id: str = Field(description="Unique page identifier.")
    title: str = Field(description="Page title.")
    rows: list[Row] = Field(default_factory=list, description="Page row layout.")


class Manifest(BaseModel):
    """Root LCARS manifest contract."""

    meta: Meta = Field(description="Application metadata.")
    layout: Layout = Field(description="Application shell layout.")
    pages: dict[str, Page] = Field(description="Map of page id to page configuration.")


__all__ = [
    "Meta",
    "Header",
    "SidebarSegment",
    "SidebarItem",
    "Sidebar",
    "Layout",
    "Widget",
    "Column",
    "Row",
    "Page",
    "Manifest",
]
