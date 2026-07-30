"""Typed capability and interaction models shared by LCARS widgets."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from lcars_ui.core.widget_base import LcarsColor

ScalarValue = str | int | float | bool | None
InteractionMode = Literal["local", "server"]
FeedbackState = Literal["ready", "loading", "empty", "error"]
CommitMode = Literal["blur", "enter", "change"]


class WidgetFeedback(BaseModel):
    """Optional loading, empty, or error presentation for a widget."""

    state: FeedbackState = "ready"
    message: str | None = None


class InteractionOptions(BaseModel):
    """Choose client-local or Python-controlled interaction state."""

    mode: InteractionMode = "local"
    action_id: str | None = None


class LinkSpec(BaseModel):
    """A safe, code-rendered hyperlink."""

    href: str
    label: str | None = None
    target: Literal["_self", "_blank"] = "_self"
    rel: str | None = None


class ActionSpec(BaseModel):
    """A typed action rendered by a display widget."""

    label: str
    action_id: str
    value: Any = None


class ValueFormat(BaseModel):
    """Portable numeric display formatting."""

    precision: int | None = Field(default=None, ge=0, le=12)
    prefix: str = ""
    suffix: str = ""
    thousands: bool = False
    compact: bool = False


class BaseOptions(BaseModel):
    """Capabilities that are meaningful across widget families."""

    description: str | None = None
    feedback: WidgetFeedback | None = None


class TextOptions(BaseOptions):
    semantic: Literal["div", "p", "span"] = "div"
    wrap: Literal["wrap", "pre", "nowrap"] = "wrap"
    max_lines: int | None = Field(default=None, ge=1)
    selectable: bool = True
    copyable: bool = False
    link: LinkSpec | None = None


class MarkdownOptions(BaseOptions):
    link_target: Literal["_self", "_blank"] = "_self"
    max_height: int | None = Field(default=None, ge=80)
    copy_code: bool = False


class HeaderOptions(BaseOptions):
    subtitle: str | None = None
    anchor: str | None = None
    actions: list[ActionSpec] = Field(default_factory=list)


class MetricOptions(BaseOptions):
    secondary_value: str | None = None
    trend: Literal["up", "down", "flat"] | None = None
    value_format: ValueFormat | None = None


class AlertOptions(BaseOptions):
    dismissible: bool = False
    action: ActionSpec | None = None
    live: Literal["polite", "assertive"] = "assertive"
    interaction: InteractionOptions | None = None


class AlertState(BaseModel):
    dismissed: bool = False
    last_event: str | None = None


class MeterOptions(BaseOptions):
    min: float = 0.0
    max: float = 100.0
    unit: str | None = None
    value_format: ValueFormat | None = None
    indeterminate: bool = False
    segments: int = Field(default=20, ge=1, le=100)
    ticks: bool = False
    warn_threshold: float | None = None
    crit_threshold: float | None = None

    @model_validator(mode="after")
    def _validate_bounds(self) -> MeterOptions:
        if self.max <= self.min:
            raise ValueError("max must be greater than min")
        return self


class ValidationOptions(BaseModel):
    required: bool = False
    min_length: int | None = Field(default=None, ge=0)
    max_length: int | None = Field(default=None, ge=0)
    pattern: str | None = None
    message: str | None = None

    @model_validator(mode="after")
    def _validate_lengths(self) -> ValidationOptions:
        if (
            self.min_length is not None
            and self.max_length is not None
            and self.min_length > self.max_length
        ):
            raise ValueError("min_length must be <= max_length")
        return self


class ButtonOptions(BaseOptions):
    payload: Any = None
    confirm: str | None = None
    debounce_ms: int = Field(default=0, ge=0)
    busy_label: str | None = None


class ToggleOptions(BaseOptions):
    on_label: str | None = None
    off_label: str | None = None


class ChoiceOptions(BaseOptions):
    searchable: bool = False
    multiple: bool = False
    placeholder: str | None = None


class TextInputOptions(BaseOptions):
    multiline: bool = False
    rows: int = Field(default=3, ge=1, le=24)
    input_type: Literal["text", "search", "email", "url", "tel"] = "text"
    commit: CommitMode = "blur"
    debounce_ms: int = Field(default=250, ge=0)
    validation: ValidationOptions | None = None


class NumberInputOptions(BaseOptions):
    precision: int | None = Field(default=None, ge=0, le=12)
    prefix: str = ""
    suffix: str = ""
    commit: CommitMode = "blur"
    debounce_ms: int = Field(default=250, ge=0)
    required: bool = False


class FormOptions(BaseOptions):
    layout: Literal["stack", "row", "grid"] = "stack"
    columns: int = Field(default=2, ge=1, le=6)
    reset_label: str | None = None
    cancel_action: ActionSpec | None = None
    coerce_values: bool = False


class TableColumn(BaseModel):
    """Enhanced table column definition."""

    key: str
    label: str | None = None
    value_type: Literal["auto", "text", "number", "date", "boolean"] = "auto"
    sortable: bool = False
    first_sort_direction: Literal["asc", "desc"] = "asc"
    filter: Literal["none", "text", "select", "number"] = "none"
    align: Literal["start", "center", "end"] = "start"
    value_format: ValueFormat | None = None


class TableSort(BaseModel):
    key: str
    direction: Literal["asc", "desc"] = "asc"


class TableFilter(BaseModel):
    key: str
    value: str | float | bool
    operator: Literal["contains", "equals", "gt", "gte", "lt", "lte"] = "contains"


class TablePagination(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=1000)
    total_rows: int | None = Field(default=None, ge=0)


class TableSelection(BaseModel):
    mode: Literal["none", "single", "multiple"] = "none"
    selected_ids: list[str] = Field(default_factory=list)


class TableOptions(BaseOptions):
    columns: list[TableColumn] | None = None
    row_key: str | None = None
    sort: list[TableSort] = Field(default_factory=list)
    filters: list[TableFilter] = Field(default_factory=list)
    pagination: TablePagination | None = None
    selection: TableSelection = Field(default_factory=TableSelection)
    expanded_ids: list[str] = Field(default_factory=list)
    expandable: bool = False
    sticky_header: bool = False
    density: Literal["compact", "normal"] = "normal"
    interaction: InteractionOptions | None = None
    data_mode: Literal["client", "server"] = "client"
    """Where sort/filter/pagination run. ``client`` = LCARS does it locally."""
    sort_cycle: Literal["auto", "two-state", "three-state"] = "auto"
    """Header-click cycle. ``auto`` uses two states for server-controlled tables."""
    emit_state_changes: bool = False
    """Emit a typed ``{kind, state}`` action whenever table state changes."""
    row_click_select: bool = False
    """Toggle row selection on whole-row click (ignores links/actions/copy/expand)."""
    expansion_motion: Literal["auto", "none"] = "auto"
    """``auto`` animates expand/collapse; ``none`` disables the renderer transition."""


class TableState(BaseModel):
    sort: list[TableSort] = Field(default_factory=list)
    filters: list[TableFilter] = Field(default_factory=list)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1)
    selected_ids: list[str] = Field(default_factory=list)
    expanded_ids: list[str] = Field(default_factory=list)
    last_event: str | None = None


class AxisOptions(BaseModel):
    show: bool = True
    label: str | None = None
    min: float | None = None
    max: float | None = None


class ReferenceLine(BaseModel):
    value: float
    label: str | None = None
    color: LcarsColor | None = None


class ChartOptions(BaseOptions):
    x_axis: AxisOptions = Field(default_factory=AxisOptions)
    y_axis: AxisOptions = Field(default_factory=AxisOptions)
    legend: bool = True
    tooltip: bool = True
    curve: Literal["linear", "step"] = "linear"
    reference_lines: list[ReferenceLine] = Field(default_factory=list)
    zoom: bool = False
    interaction: InteractionOptions | None = None


class SparklineOptions(BaseOptions):
    tooltip: bool = False
    show_latest: bool = False
    min: float | None = None
    max: float | None = None
    reference_value: float | None = None


class FinancialChartOptions(BaseOptions):
    show_volume: bool = False
    legend: bool = True
    tooltip: bool = True
    fit_content: bool = True
    price_precision: int | None = Field(default=None, ge=0, le=12)
    interaction: InteractionOptions | None = None


class ChartState(BaseModel):
    visible_from: int | str | None = None
    visible_to: int | str | None = None
    selected_series: list[str] = Field(default_factory=list)
    selected_time: int | str | None = None
    last_event: str | None = None


class ShaderOptions(BaseOptions):
    paused: bool = False
    fps_limit: int = Field(default=60, ge=1, le=120)
    honor_reduced_motion: bool = True
    fallback: str = "Shader unavailable"


class LogOptions(BaseOptions):
    wrap: bool = True
    line_numbers: bool = False
    timestamps: bool = False
    search: bool = False
    levels: list[str] = Field(default_factory=list)
    toolbar: bool = False
    paused: bool = False
    interaction: InteractionOptions | None = None


class LogState(BaseModel):
    search: str = ""
    levels: list[str] = Field(default_factory=list)
    paused: bool = False
    following: bool = True
    last_event: str | None = None


class VideoOptions(BaseOptions):
    controls: bool = True
    loop: bool = False
    preload: Literal["none", "metadata", "auto"] = "metadata"
    playback_rates: list[float] = Field(default_factory=lambda: [0.5, 1.0, 1.5, 2.0])
    show_source: bool = True
    interaction: InteractionOptions | None = None


class VideoState(BaseModel):
    playing: bool = False
    current_time: float = Field(default=0.0, ge=0)
    playback_rate: float = Field(default=1.0, gt=0)
    quality: str | None = None
    last_event: str | None = None


Vec3 = tuple[float, float, float]


class ThreeSceneCamera(BaseModel):
    """Initial perspective-camera placement for a managed Three.js scene."""

    position: Vec3 = (4.0, 3.0, 6.0)
    target: Vec3 = (0.0, 0.0, 0.0)
    fov: float = Field(default=50.0, gt=0.0, lt=180.0)
    near: float = Field(default=0.1, gt=0.0)
    far: float = Field(default=1000.0, gt=0.0)

    @model_validator(mode="after")
    def _validate_clip_planes(self) -> ThreeSceneCamera:
        if self.far <= self.near:
            raise ValueError("camera far plane must be beyond the near plane")
        return self


class ThreeSceneControls(BaseModel):
    """Orbit/pan/zoom behaviour. The renderer owns the controls; this configures them."""

    enabled: bool = True
    orbit: bool = True
    pan: bool = True
    zoom: bool = True
    damping: bool = True
    auto_rotate: bool = False
    auto_rotate_speed: float = Field(default=2.0, ge=0.0)
    min_distance: float = Field(default=0.5, gt=0.0)
    max_distance: float = Field(default=200.0, gt=0.0)

    @model_validator(mode="after")
    def _validate_distances(self) -> ThreeSceneControls:
        if self.max_distance <= self.min_distance:
            raise ValueError("max_distance must be greater than min_distance")
        return self


class ThreeSceneOptions(BaseOptions):
    """Renderer-owned scene settings. Mirrors ShaderOptions where the concerns overlap."""

    camera: ThreeSceneCamera = Field(default_factory=ThreeSceneCamera)
    controls: ThreeSceneControls = Field(default_factory=ThreeSceneControls)
    paused: bool = False
    fps_limit: int = Field(default=60, ge=1, le=120)
    honor_reduced_motion: bool = True
    # Retina panels quadruple the pixels a scene has to fill for no legibility
    # gain on a console readout, so the device ratio is capped rather than honored.
    max_pixel_ratio: float = Field(default=2.0, ge=0.5, le=4.0)
    transparent: bool = True
    fallback: str = "Scene unavailable"
    interaction: InteractionOptions | None = None


class ThreeSceneState(BaseModel):
    """Camera pose plus whatever the scene module last emitted."""

    camera_position: Vec3 = (0.0, 0.0, 0.0)
    camera_target: Vec3 = (0.0, 0.0, 0.0)
    zoom: float = Field(default=1.0, gt=0.0)
    last_event: str | None = None
    payload: dict[str, Any] | None = None


class MicOptions(BaseOptions):
    device_id: str | None = None
    mime_types: list[str] = Field(default_factory=list)
    vad_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    min_duration_ms: int = Field(default=0, ge=0)
    max_bytes: int | None = Field(default=None, ge=1)


class MicResult(BaseModel):
    bytes: int = Field(ge=0)
    mime_type: str | None = None
    duration_ms: int | None = Field(default=None, ge=0)


class ContainerOptions(BaseOptions):
    density: Literal["compact", "normal"] = "normal"
    overflow: Literal["visible", "auto", "hidden"] = "visible"
    collapsible: bool = False
    initial_collapsed: bool = False
    interaction: InteractionOptions | None = None


class ContainerState(BaseModel):
    collapsed: bool = False
    last_event: str | None = None


__all__ = [
    "ScalarValue",
    "InteractionMode",
    "FeedbackState",
    "CommitMode",
    "WidgetFeedback",
    "InteractionOptions",
    "LinkSpec",
    "ActionSpec",
    "ValueFormat",
    "BaseOptions",
    "TextOptions",
    "MarkdownOptions",
    "HeaderOptions",
    "MetricOptions",
    "AlertOptions",
    "AlertState",
    "MeterOptions",
    "ValidationOptions",
    "ButtonOptions",
    "ToggleOptions",
    "ChoiceOptions",
    "TextInputOptions",
    "NumberInputOptions",
    "FormOptions",
    "TableColumn",
    "TableSort",
    "TableFilter",
    "TablePagination",
    "TableSelection",
    "TableOptions",
    "TableState",
    "AxisOptions",
    "ReferenceLine",
    "ChartOptions",
    "SparklineOptions",
    "FinancialChartOptions",
    "ChartState",
    "ShaderOptions",
    "LogOptions",
    "LogState",
    "VideoOptions",
    "VideoState",
    "Vec3",
    "ThreeSceneCamera",
    "ThreeSceneControls",
    "ThreeSceneOptions",
    "ThreeSceneState",
    "MicOptions",
    "MicResult",
    "ContainerOptions",
    "ContainerState",
]
