"""Core manifest models for LCARS contract."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from lcars_ui.widgets.data import Gauge, LineChart, Sparkline, Table
from lcars_ui.widgets.inputs import Button, Form, NumberInput, Select, TextInput, Toggle
from lcars_ui.widgets.media import LogViewer, MicButton, VideoHls
from lcars_ui.widgets.primitives import Alert, Markdown, ProgressBar, StatusTile, Text


class Meta(BaseModel):
    """Global manifest metadata."""

    version: str = Field(description="Schema semantic version.")
    app_name: str = Field(description="Application display name.")
    theme: Literal["galaxy", "nemesis", "tng"] = Field(description="Theme token.")
    lang: str = Field(description="Language locale code (e.g. en-US).")
    sound_enabled: bool = Field(default=True, description="Frontend hint for sound effects.")


class Header(BaseModel):
    """Shell header configuration."""

    title: str = Field(description="Primary header title.")
    subtitle: str | None = Field(default=None, description="Optional header subtitle.")
    color: Literal["orange", "red", "blue", "purple", "white", "yellow"] = Field(
        default="orange",
        description="Header accent color.",
    )


class SidebarItem(BaseModel):
    """Sidebar navigation item."""

    id: str = Field(description="Unique nav item identifier.")
    label: str = Field(description="Visible nav label.")
    target_page: str = Field(description="Destination page id.")
    color: Literal["orange", "red", "blue", "purple", "white", "yellow"] | None = Field(
        default=None,
        description="Optional item color override.",
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
    | MicButton,
    Field(discriminator="type"),
]


class Column(BaseModel):
    """A page column."""

    id: str = Field(description="Unique column identifier.")
    width: str = Field(default="1fr", description="Layout width hint (e.g. 1fr, 300px).")
    widgets: list[Widget] = Field(default_factory=list, description="Widgets in this column.")


class Row(BaseModel):
    """A page row."""

    id: str = Field(description="Unique row identifier.")
    height: str = Field(default="auto", description="Layout height hint (e.g. auto, 1fr, 200px).")
    columns: list[Column] = Field(default_factory=list, description="Columns in this row.")


class Page(BaseModel):
    """A logical application page."""

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
    "SidebarItem",
    "Sidebar",
    "Layout",
    "Widget",
    "Column",
    "Row",
    "Page",
    "Manifest",
]
