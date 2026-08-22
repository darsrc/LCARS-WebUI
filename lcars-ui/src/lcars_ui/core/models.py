"""Core manifest models for LCARS contract."""

from __future__ import annotations

from typing import Annotated, Literal, get_args

from pydantic import BaseModel, Field

from lcars_ui.core.widget_base import BaseWidget, Hint, LayoutSizing, LcarsColor, StrictWidgetRole
from lcars_ui.widgets.containers import (
    AuthoredComposition,
    CompositionArea,
    LcarsBar,
    LcarsBox,
    LcarsBracket,
    LcarsHeader,
    LcarsSweep,
    Popup,
)
from lcars_ui.widgets.data import Candlestick, Gauge, LineChart, Renko, Shader, Sparkline, Table
from lcars_ui.widgets.graph import NodeCanvas
from lcars_ui.widgets.inputs import (
    Button,
    Checkbox,
    FileUpload,
    Form,
    NumberInput,
    Radio,
    RadioToggle,
    Select,
    TextInput,
    Toggle,
)
from lcars_ui.widgets.media import LogViewer, MicButton, ThreeScene, VideoHls
from lcars_ui.widgets.primitives import (
    Alert,
    Markdown,
    ProgressBar,
    StatusTile,
    Text,
    WebUISettings,
)
from lcars_ui.widgets.web import (
    AnchorCard,
    AssertionCard,
    CommitmentSelector,
    ConstraintBand,
    Frontier,
    GapPanel,
    SupportPanel,
    TriState,
)
from lcars_ui.widgets.workspace import GraphWorkspace

StrictBandRole = Literal["page_title", "content"]
StrictLaneMode = Literal["follow_columns", "split_single_column"]
StrictLaneRole = Literal["title", "content", "core", "support"]


class Meta(BaseModel):
    """Global manifest metadata."""

    version: str = Field(description="Schema semantic version.")
    app_name: str = Field(description="Application display name.")
    theme: Literal[
        "galaxy",
        "nemesis",
        "tng",
        "outpost",
        "cardassian",
        "klingon",
        "romulan",
        "ferengi",
        "gruvbox",
    ] = Field(description="Theme token.")
    alert_condition: Literal["normal", "yellow", "red"] = Field(
        default="normal",
        description="Shipwide alert condition; tints the whole UI (normal/yellow/red).",
    )
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
    visual_language: Literal["strict"] = Field(
        default="strict",
        description="Frontend LCARS visual mode: strict.",
    )
    strict_renderer: Literal["legacy"] = Field(
        default="legacy",
        description="Strict visual renderer family selector.",
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


class Surface(BaseWidget):
    """Surface container for arbitrary-topology LCARS screens."""

    type: Literal["surface"] = "surface"
    design_width: int = Field(default=1920, ge=320, le=8192)
    design_height: int = Field(default=1080, ge=240, le=8192)
    min_width: int = Field(default=960, ge=320, le=8192)
    narrow: Literal["scroll", "scale", "fluid"] = Field(
        default="scroll", description="Behavior below min_width."
    )
    narrow_design_width: int | None = Field(
        default=None, ge=240, le=8192,
        description="Second design width constraints are also resolved against, for narrow=fluid.",
    )
    narrow_design_height: int | None = Field(
        default=None, ge=240, le=8192,
        description="Second design height constraints are also resolved against, for narrow=fluid.",
    )
    children: list[Widget] = Field(default_factory=list, description="Surface content widgets.")


class SurfaceRegion(BaseWidget):
    """A bounded region inside a surface with explicit layering and geometry children."""

    type: Literal["surface_region"] = "surface_region"
    x: int = Field(default=0, ge=0, description="Horizontal position in surface coordinates.")
    y: int = Field(default=0, ge=0, description="Vertical position in surface coordinates.")
    w: int = Field(default=100, ge=1, description="Width in surface coordinates.")
    h: int = Field(default=100, ge=1, description="Height in surface coordinates.")
    narrow_x: int | None = Field(default=None, ge=0, description="x resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_y: int | None = Field(default=None, ge=0, description="y resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_w: int | None = Field(default=None, ge=1, description="w resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_h: int | None = Field(default=None, ge=1, description="h resolved against the surface's narrow_design_size, when narrow=fluid.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="content", description="Render layer for this region."
    )
    children: list[Widget] = Field(
        default_factory=list, description="Widgets rendered in this region."
    )


# Geometry node models (SVG-rendered primitives, never host widgets).
class RectNode(BaseWidget):
    """Simple rectangular geometry primitive."""

    type: Literal["rect"] = "rect"
    x: int = Field(default=0, ge=0, description="X coordinate in surface coordinates.")
    y: int = Field(default=0, ge=0, description="Y coordinate in surface coordinates.")
    w: int = Field(default=100, ge=1, description="Width in surface coordinates.")
    h: int = Field(default=100, ge=1, description="Height in surface coordinates.")
    narrow_x: int | None = Field(default=None, ge=0, description="x resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_y: int | None = Field(default=None, ge=0, description="y resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_w: int | None = Field(default=None, ge=1, description="w resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_h: int | None = Field(default=None, ge=1, description="h resolved against the surface's narrow_design_size, when narrow=fluid.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class RoundedRectNode(BaseWidget):
    """Rectangle with rounded corners geometry primitive."""

    type: Literal["rounded_rect"] = "rounded_rect"
    x: int = Field(default=0, ge=0, description="X coordinate in surface coordinates.")
    y: int = Field(default=0, ge=0, description="Y coordinate in surface coordinates.")
    w: int = Field(default=100, ge=1, description="Width in surface coordinates.")
    h: int = Field(default=100, ge=1, description="Height in surface coordinates.")
    narrow_x: int | None = Field(default=None, ge=0, description="x resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_y: int | None = Field(default=None, ge=0, description="y resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_w: int | None = Field(default=None, ge=1, description="w resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_h: int | None = Field(default=None, ge=1, description="h resolved against the surface's narrow_design_size, when narrow=fluid.")
    radius: int = Field(default=24, ge=0, le=500, description="Corner radius in px.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class CapsuleNode(BaseWidget):
    """Capsule (stadium) shape geometry primitive."""

    type: Literal["capsule"] = "capsule"
    x: int = Field(default=0, ge=0, description="X coordinate in surface coordinates.")
    y: int = Field(default=0, ge=0, description="Y coordinate in surface coordinates.")
    w: int = Field(default=100, ge=1, description="Width in surface coordinates.")
    h: int = Field(default=100, ge=1, description="Height in surface coordinates.")
    narrow_x: int | None = Field(default=None, ge=0, description="x resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_y: int | None = Field(default=None, ge=0, description="y resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_w: int | None = Field(default=None, ge=1, description="w resolved against the surface's narrow_design_size, when narrow=fluid.")
    narrow_h: int | None = Field(default=None, ge=1, description="h resolved against the surface's narrow_design_size, when narrow=fluid.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class CircleNode(BaseWidget):
    """Circular geometry primitive."""

    type: Literal["circle"] = "circle"
    cx: int = Field(default=0, ge=0, description="Center X coordinate in surface coordinates.")
    cy: int = Field(default=0, ge=0, description="Center Y coordinate in surface coordinates.")
    r: int = Field(default=50, ge=1, le=1000, description="Radius in px.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class EllipseNode(BaseWidget):
    """Elliptical geometry primitive."""

    type: Literal["ellipse"] = "ellipse"
    cx: int = Field(default=0, ge=0, description="Center X coordinate in surface coordinates.")
    cy: int = Field(default=0, ge=0, description="Center Y coordinate in surface coordinates.")
    rx: int = Field(default=50, ge=1, le=1000, description="Horizontal radius in px.")
    ry: int = Field(default=50, ge=1, le=1000, description="Vertical radius in px.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class ArcNode(BaseWidget):
    """Arc (pie slice) geometry primitive."""

    type: Literal["arc"] = "arc"
    center_x: int = Field(default=0, ge=0, description="Center X coordinate in surface coordinates.")
    center_y: int = Field(default=0, ge=0, description="Center Y coordinate in surface coordinates.")
    radius: int = Field(default=50, ge=1, le=1000, description="Radius in px.")
    start_angle: float = Field(default=0.0, description="Start angle in degrees, 0=east, clockwise.")
    end_angle: float = Field(default=90.0, description="End angle in degrees, 0=east, clockwise.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class RingNode(BaseWidget):
    """Ring (annulus segment) geometry primitive."""

    type: Literal["ring"] = "ring"
    center_x: int = Field(default=0, ge=0, description="Center X coordinate in surface coordinates.")
    center_y: int = Field(default=0, ge=0, description="Center Y coordinate in surface coordinates.")
    inner_radius: int = Field(default=0, ge=0, le=1000, description="Inner radius in px; 0 collapses to a true pie slice.")
    outer_radius: int = Field(default=50, ge=1, le=1000, description="Outer radius in px.")
    start_angle: float = Field(default=0.0, description="Start angle in degrees, 0=east, clockwise.")
    end_angle: float = Field(default=90.0, description="End angle in degrees, 0=east, clockwise.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class WedgeNode(BaseWidget):
    """Wedge (pie slice with hole) geometry primitive."""

    type: Literal["wedge"] = "wedge"
    center_x: int = Field(default=0, ge=0, description="Center X coordinate in surface coordinates.")
    center_y: int = Field(default=0, ge=0, description="Center Y coordinate in surface coordinates.")
    inner_radius: int = Field(default=0, ge=0, le=1000, description="Inner radius in px; 0 collapses to a true pie slice.")
    outer_radius: int = Field(default=50, ge=1, le=1000, description="Outer radius in px.")
    start_angle: float = Field(default=0.0, description="Start angle in degrees, 0=east, clockwise.")
    end_angle: float = Field(default=90.0, description="End angle in degrees, 0=east, clockwise.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class ElbowNode(BaseWidget):
    """Elbow bracket geometry primitive (rounded outer corner + concave inner notch)."""

    type: Literal["elbow"] = "elbow"
    x: int = Field(default=0, ge=0, description="X coordinate of the bounding box in surface coordinates.")
    y: int = Field(default=0, ge=0, description="Y coordinate of the bounding box in surface coordinates.")
    w: int = Field(default=100, ge=1, description="Width of the bounding box in surface coordinates.")
    h: int = Field(default=100, ge=1, description="Height of the bounding box in surface coordinates.")
    arm_thickness_x: int = Field(default=20, ge=1, description="Width of the vertical arm in px.")
    arm_thickness_y: int = Field(default=20, ge=1, description="Height of the horizontal arm in px.")
    corner: Literal["top-left", "top-right", "bottom-left", "bottom-right"] = Field(
        default="top-left", description="Which corner the elbow's outer bracket sits in."
    )
    outer_radius: int = Field(default=24, ge=0, le=500, description="Outer (convex) corner radius in px.")
    inner_radius: int = Field(default=16, ge=0, le=500, description="Inner (concave) notch radius in px.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class PolygonPoint(BaseModel):
    """A single (x, y) vertex in a polygon."""

    x: float
    y: float


class PolygonNode(BaseWidget):
    """Closed polygon geometry primitive."""

    type: Literal["polygon"] = "polygon"
    points: list[PolygonPoint] = Field(default_factory=list, description="Polygon vertices, in order.")
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class MoveCommand(BaseModel):
    """Path command: move the pen to (x, y) without drawing."""

    op: Literal["move"] = "move"
    x: float
    y: float


class LineCommand(BaseModel):
    """Path command: draw a straight line to (x, y)."""

    op: Literal["line"] = "line"
    x: float
    y: float


class ArcCommand(BaseModel):
    """Path command: draw an elliptical arc to (x, y), matching the SVG `A` command."""

    op: Literal["arc"] = "arc"
    rx: float
    ry: float
    rotation: float = 0
    large_arc: Literal[0, 1] = 0
    sweep: Literal[0, 1] = 1
    x: float
    y: float


class CloseCommand(BaseModel):
    """Path command: close the current subpath, matching the SVG `Z` command."""

    op: Literal["close"] = "close"


PathCommand = Annotated[
    MoveCommand | LineCommand | ArcCommand | CloseCommand,
    Field(discriminator="op"),
]


class PathNode(BaseWidget):
    """Arbitrary path geometry primitive built from typed move/line/arc/close commands."""

    type: Literal["path"] = "path"
    commands: list[PathCommand] = Field(default_factory=list, description="Ordered path commands.")
    filled: bool = Field(
        default=True,
        description="If true, fill the enclosed region; if false, render as a stroked outline only.",
    )
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="geometry", description="Render layer for this node."
    )


class ConnectorNode(BaseWidget):
    """A routed path between two points, resolved from node-id references at build time."""

    type: Literal["connector"] = "connector"
    from_x: float = Field(description="Resolved anchor X of the connector's start endpoint.")
    from_y: float = Field(description="Resolved anchor Y of the connector's start endpoint.")
    to_x: float = Field(description="Resolved anchor X of the connector's end endpoint.")
    to_y: float = Field(description="Resolved anchor Y of the connector's end endpoint.")
    style: Literal["straight", "elbow", "bezier"] = Field(
        default="straight", description="Routing style between the two endpoints."
    )
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="overlay", description="Render layer for this node."
    )


class TextPathNode(BaseWidget):
    """Text rendered along an existing path-shaped geometry node's curve."""

    type: Literal["text_path"] = "text_path"
    path_ref: str = Field(description="Id of the path-rendering geometry node to follow.")
    text: str = Field(description="Text content to render along the path.")
    start_offset: float = Field(
        default=0.0, ge=0, le=100, description="Start position along the path, as a percentage."
    )
    layer: Literal["geometry", "content", "overlay", "effects"] = Field(
        default="overlay", description="Render layer for this node."
    )


class EffectNode(BaseWidget):
    """A CSS animation attached to another already-declared surface node, by id.

    Carries no visual output of its own - purely a pointer (target id + preset + params) that
    the renderer resolves into inline animation/CSS-custom-property styling on the TARGET
    element. See surfaceEffects in SurfaceControl.tsx and the `lcars-surface-*` keyframes in
    lcars.css (fixed/reusable, parameterized per-effect via CSS custom properties rather than
    dynamic per-effect <style> injection).
    """

    type: Literal["effect"] = "effect"
    target: str = Field(description="Id of the surface node this effect animates.")
    kind: Literal["sweep", "pulse", "flow"] = Field(
        description="sweep=rotate around a pivot, pulse=opacity or fill-color pulse, "
        "flow=dash-offset animation along a stroked path."
    )
    period_ms: int = Field(default=2000, ge=50, description="Duration of one animation cycle.")
    direction: Literal["cw", "ccw"] = Field(
        default="cw", description="Playback direction; 'ccw' reverses the animation."
    )
    from_angle: float | None = Field(
        default=None, description="sweep only: bounded-sweep start angle. Omit with to_angle for a continuous 360 spin."
    )
    to_angle: float | None = Field(default=None, description="sweep only: bounded-sweep end angle.")
    pivot_x: float | None = Field(default=None, description="sweep only: rotation pivot, resolved from the target's own anchor if not given.")
    pivot_y: float | None = Field(default=None, description="sweep only: rotation pivot, resolved from the target's own anchor if not given.")
    colors: tuple[LcarsColor, LcarsColor] | None = Field(
        default=None, description="pulse only: fill-color pulse between these two colors; omit for a plain opacity pulse."
    )
    layer: Literal["effects"] = "effects"


class MirrorSpec(BaseModel):
    """Reflects a group's copies across a line (axis="x"/"y") or a point (axis="xy")."""

    axis: Literal["x", "y", "xy"]
    axis_x: float | None = Field(default=None, description="Vertical mirror line; defaults to the surface's own center.")
    axis_y: float | None = Field(default=None, description="Horizontal mirror line; defaults to the surface's own center.")


class RepeatRadialSpec(BaseModel):
    """Fans a group's copies around a center point, rotating each one by an increasing angle."""

    count: int = Field(ge=1, description="Number of copies.")
    center_x: float
    center_y: float
    start_angle: float = Field(description="Rotation angle (degrees) of the first copy.")
    end_angle: float = Field(description="Rotation angle (degrees) of the last copy (inclusive when count > 1).")


class RepeatLinearSpec(BaseModel):
    """Offsets a group's copies along a line by increasing multiples of (dx, dy)."""

    count: int = Field(ge=1, description="Number of copies.")
    dx: float = Field(description="X offset per copy.")
    dy: float = Field(description="Y offset per copy.")


class SurfaceGroup(BaseWidget):
    """A transform wrapper (mirror/repeat/rotate) around nested surface geometry and regions.

    Transforms are NOT resolved into repeated nodes here - the manifest carries this spec as-is
    and the renderer expands it into per-copy SVG <g transform="matrix(...)"> wrappers (geometry
    children) or repositioned overlays (region children) at render time, so the JSON payload
    stays small regardless of repeat count.
    """

    type: Literal["surface_group"] = "surface_group"
    mirror: MirrorSpec | None = None
    repeat_radial: RepeatRadialSpec | None = None
    repeat_linear: RepeatLinearSpec | None = None
    rotate: float | None = Field(default=None, description="Extra rotation (degrees) composed onto every copy.")
    rotate_pivot_x: float | None = Field(default=None, description="Defaults to the surface's own center.")
    rotate_pivot_y: float | None = Field(default=None, description="Defaults to the surface's own center.")
    children: list[Widget] = Field(default_factory=list, description="Geometry/region template, drawn once per copy.")


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
    | FileUpload
    | Form
    | Table
    | LineChart
    | Sparkline
    | Candlestick
    | Renko
    | Shader
    | Gauge
    | ProgressBar
    | Markdown
    | LogViewer
    | VideoHls
    | ThreeScene
    | NodeCanvas
    | GraphWorkspace
    | MicButton
    | LcarsBox
    | LcarsSweep
    | LcarsBracket
    | LcarsHeader
    | LcarsBar
    | CompositionArea
    | AuthoredComposition
    | Surface
    | SurfaceRegion
    | SurfaceGroup
    | RectNode
    | RoundedRectNode
    | CapsuleNode
    | CircleNode
    | EllipseNode
    | ArcNode
    | RingNode
    | WedgeNode
    | ElbowNode
    | PolygonNode
    | PathNode
    | ConnectorNode
    | TextPathNode
    | EffectNode
    | Popup
    | WebUISettings
    | SupportPanel
    | Frontier
    | AssertionCard
    | AnchorCard
    | TriState
    | ConstraintBand
    | GapPanel
    | CommitmentSelector,
    Field(discriminator="type"),
]

# Resolve recursive container references once Widget union is defined.
_RECURSIVE_WIDGET_NAMESPACE = {"Widget": Widget, "Literal": Literal}
# Hint.children is a Widget subtree, and BaseWidget.hint puts that reference on
# every widget — so each concrete widget class needs rebuilding too, not just Hint.
Hint.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)
for _widget_cls in get_args(Widget)[0].__args__:
    _widget_cls.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)
LcarsBox.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)
LcarsSweep.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)
LcarsBracket.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)
CompositionArea.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)
AuthoredComposition.model_rebuild(_types_namespace=_RECURSIVE_WIDGET_NAMESPACE)


class Column(BaseModel):
    """A page column.

    In strict mode this remains a transport envelope for compatibility; LCARS
    composition truth is compiled into container widgets within ``widgets``.
    """

    id: str = Field(description="Unique column identifier.")
    width: str = Field(default="1fr", description="Layout width hint (e.g. 1fr, 300px).")
    strict_lane_role: StrictLaneRole | None = Field(
        default=None,
        description="Optional strict lane role annotation emitted by the compiler.",
    )
    widgets: list[Widget] = Field(default_factory=list, description="Widgets in this column.")


class Row(BaseModel):
    """A page row.

    In strict mode this remains a compatibility band boundary, while interior
    composition is container-driven after normalization.
    """

    id: str = Field(description="Unique row identifier.")
    height: str = Field(default="auto", description="Layout height hint (e.g. auto, 1fr, 200px).")
    strict_band_role: StrictBandRole | None = Field(
        default=None,
        description="Optional strict band role annotation emitted by the compiler.",
    )
    strict_lane_mode: StrictLaneMode | None = Field(
        default=None,
        description="Optional strict lane scaffold mode emitted by the compiler.",
    )
    columns: list[Column] = Field(default_factory=list, description="Columns in this row.")


class Page(BaseModel):
    """A logical application page.

    Strict mode still serializes rows/columns for manifest compatibility, but
    rendering semantics are expected to follow normalized LCARS containers.
    """

    id: str = Field(description="Unique page identifier.")
    title: str = Field(description="Page title.")
    archetype: Literal["auto", "console", "telemetry", "grid", "menu", "authored"] = Field(
        default="auto",
        description=(
            "Adaptive LCARS layout archetype. 'auto' lets the renderer choose by "
            "content; console/telemetry/grid/menu select an explicit layout family."
        ),
    )
    chrome: Literal["console", "none"] = Field(
        default="console",
        description="Application chrome treatment. Authored pages may suppress the console shell.",
    )
    fillers: bool = Field(
        default=True,
        description=(
            "Fill leftover adaptive-layout cells with decorative LCARS reference "
            "blocks. Set False on dense pages where the decoration competes with data."
        ),
    )
    sizing: LayoutSizing = Field(
        default="fill",
        description=(
            "Default adaptive panel sizing. 'fill' distributes free deck space among "
            "expanded panels; 'content' keeps panels at intrinsic size."
        ),
    )
    rows: list[Row] = Field(default_factory=list, description="Page row layout.")


class Manifest(BaseModel):
    """Root LCARS manifest contract."""

    meta: Meta = Field(description="Application metadata.")
    layout: Layout = Field(description="Application shell layout.")
    pages: dict[str, Page] = Field(
        min_length=1,
        description="Non-empty map of page id to page configuration.",
    )


__all__ = [
    "Meta",
    "Header",
    "SidebarSegment",
    "SidebarItem",
    "Sidebar",
    "Layout",
    "Widget",
    "Surface",
    "SurfaceRegion",
    "RectNode",
    "RoundedRectNode",
    "CapsuleNode",
    "CircleNode",
    "EllipseNode",
    "Column",
    "Row",
    "Page",
    "Manifest",
    "StrictBandRole",
    "StrictLaneMode",
    "StrictLaneRole",
]
