"""The node-graph widget: a typed, editable graph document plus its run status.

The format here is native rather than borrowed. The library stays engine-
agnostic — it never executes a workflow — so a document describes only what a
graph *is*: the node types available, the nodes placed, and how they are wired.
Mapping that onto whatever actually runs the work is the application's job, and
is done in Python where it can be typed.

Two separations matter and are load-bearing elsewhere:

* Templates are declared once and referenced by nodes, so a palette of node
  types costs one description rather than one per placed node.

* Execution status lives in ``GraphExecutionState``, deliberately *outside* the
  editable document. Status streams in continuously while the user is dragging
  nodes around; if it shared a model with the document, every progress tick
  would race the edit in the user's hands.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from lcars_ui.core.widget_base import BaseWidget, LcarsColor, StrictSurfaceVariant, StrictWidgetRole
from lcars_ui.widgets.options import BaseOptions, InteractionOptions, ScalarValue

GraphFieldKind = Literal["text", "number", "boolean", "select"]
GraphStatus = Literal["idle", "queued", "running", "success", "error", "cancelled"]
GraphLayerPattern = Literal["solid", "dashed", "dotted", "double"]
GraphLayerMarker = Literal["arrow_closed", "arrow_open", "none"]

#: A port type that connects to anything. Two ports are compatible when their
#: types match exactly or either side is this.
ANY_TYPE = "any"


class GraphPort(BaseModel):
    """One connection point on a node template."""

    id: str = Field(description="Port identifier, unique within its side of the template.")
    label: str | None = Field(default=None, description="Display label; defaults to the id.")
    type: str = Field(default=ANY_TYPE, description="Port data type; 'any' matches everything.")
    capacity: int | None = Field(
        default=None,
        ge=1,
        description=(
            "Maximum simultaneous connections. Defaults by side when unset: one for "
            "an input, unlimited for an output."
        ),
    )


class GraphFieldOption(BaseModel):
    """One choice in a select field."""

    value: str
    label: str | None = None


class GraphField(BaseModel):
    """An editable value carried by a node."""

    id: str = Field(description="Field identifier, unique within the template.")
    label: str | None = None
    kind: GraphFieldKind = "text"
    default: ScalarValue = None
    options: list[GraphFieldOption] = Field(
        default_factory=list, description="Choices for kind='select'."
    )
    min: float | None = None
    max: float | None = None
    step: float | None = None
    placeholder: str | None = None

    @model_validator(mode="after")
    def _validate_kind(self) -> GraphField:
        if self.kind == "select" and not self.options:
            raise ValueError(f"select field {self.id!r} must declare at least one option")
        if self.kind != "select" and self.options:
            raise ValueError(f"field {self.id!r} has options but kind is {self.kind!r}")
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError(f"field {self.id!r} has min greater than max")
        return self


class NodeTemplate(BaseModel):
    """A node type: what it is called, what it carries, and how it wires up."""

    id: str
    label: str | None = None
    category: str | None = Field(default=None, description="Palette grouping.")
    color: LcarsColor | None = Field(default=None, description="LCARS accent for this type.")
    inputs: list[GraphPort] = Field(default_factory=list)
    outputs: list[GraphPort] = Field(default_factory=list)
    fields: list[GraphField] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_unique_ids(self) -> NodeTemplate:
        for side, ports in (("input", self.inputs), ("output", self.outputs)):
            ids = [port.id for port in ports]
            if len(ids) != len(set(ids)):
                raise ValueError(f"template {self.id!r} has duplicate {side} port ids")
        field_ids = [field.id for field in self.fields]
        if len(field_ids) != len(set(field_ids)):
            raise ValueError(f"template {self.id!r} has duplicate field ids")
        return self

    def input(self, port_id: str) -> GraphPort | None:
        return next((port for port in self.inputs if port.id == port_id), None)

    def output(self, port_id: str) -> GraphPort | None:
        return next((port for port in self.outputs if port.id == port_id), None)


class GraphNode(BaseModel):
    """A placed instance of a template."""

    id: str
    template: str = Field(description="Id of the NodeTemplate this instantiates.")
    position: tuple[float, float] = Field(default=(0.0, 0.0), description="Absolute x, y.")
    label: str | None = Field(default=None, description="Per-instance title override.")
    values: dict[str, ScalarValue] = Field(
        default_factory=dict, description="Field values, keyed by field id."
    )
    group: str | None = Field(default=None, description="Id of the group this belongs to.")

    @model_validator(mode="after")
    def _validate_position(self) -> GraphNode:
        if not all(_is_finite(value) for value in self.position):
            raise ValueError(f"node {self.id!r} has a non-finite position")
        return self


class GraphLayer(BaseModel):
    """Caller-defined visual grammar for one edge layer.

    Layer ids and meanings belong to the application. LCARS only knows how to
    render the supplied visual treatment and expose it as reader state.
    """

    id: str = Field(min_length=1)
    label: str | None = Field(default=None, description="Legend label; defaults to the id.")
    token: str | None = Field(
        default=None,
        min_length=1,
        description="Compact label used below the edge's zoom threshold.",
    )
    color: LcarsColor | None = Field(default=None, description="Optional redundant color cue.")
    pattern: GraphLayerPattern = Field(
        default="solid", description="Non-color line treatment for this layer."
    )
    marker: GraphLayerMarker = Field(default="arrow_closed", description="Terminal marker.")
    default_visible: bool = True
    default_emphasized: bool = False
    label_zoom_threshold: float = Field(default=0.65, gt=0.0)
    description: str | None = Field(
        default=None, description="Meaning announced in the legend and edge details."
    )

    @model_validator(mode="after")
    def _validate_default_state(self) -> GraphLayer:
        if self.default_emphasized and not self.default_visible:
            raise ValueError(f"layer {self.id!r} cannot be emphasized while hidden")
        return self


class GraphEdge(BaseModel):
    """A wire from one node's output to another node's input."""

    id: str
    source: str = Field(description="Source node id.")
    source_port: str
    target: str = Field(description="Target node id.")
    target_port: str
    layer: str | None = Field(default=None, description="Id of the caller-defined edge layer.")
    label: str | None = Field(default=None, description="Persistent edge label.")
    relation: str | None = Field(
        default=None, description="Machine-stable or human-readable relation identifier."
    )
    accessible_label: str | None = Field(
        default=None,
        description=(
            "Optional complete accessible name; a deterministic name is generated if absent."
        ),
    )


class GraphReroute(BaseModel):
    """A waypoint that bends an edge without changing what it connects."""

    id: str
    edge: str = Field(description="Id of the edge this reroute sits on.")
    position: tuple[float, float] = (0.0, 0.0)


class GraphGroup(BaseModel):
    """A titled frame drawn behind a set of nodes."""

    id: str
    label: str | None = None
    position: tuple[float, float] = (0.0, 0.0)
    size: tuple[float, float] = (320.0, 200.0)
    color: LcarsColor | None = None

    @model_validator(mode="after")
    def _validate_size(self) -> GraphGroup:
        if not all(value > 0 and _is_finite(value) for value in self.size):
            raise ValueError(f"group {self.id!r} must have a positive, finite size")
        return self


class GraphComment(BaseModel):
    """Free text pinned to the canvas."""

    id: str
    text: str = ""
    position: tuple[float, float] = (0.0, 0.0)
    size: tuple[float, float] = (240.0, 120.0)

    @model_validator(mode="after")
    def _validate_size(self) -> GraphComment:
        if not all(value > 0 and _is_finite(value) for value in self.size):
            raise ValueError(f"comment {self.id!r} must have a positive, finite size")
        return self


class GraphViewport(BaseModel):
    """Where the canvas was last looking."""

    x: float = 0.0
    y: float = 0.0
    zoom: float = Field(default=1.0, gt=0.0)


def _is_finite(value: float) -> bool:
    return value == value and value not in (float("inf"), float("-inf"))


def ports_compatible(source: GraphPort, target: GraphPort) -> bool:
    """Whether an output may connect to an input."""
    return source.type == target.type or ANY_TYPE in (source.type, target.type)


class GraphDocument(BaseModel):
    """A complete node graph.

    Version 1 remains the original unlayered workflow document. Version 2
    requires every edge to identify a declared layer. Optional fields keep
    existing version-1 callers source- and wire-compatible.
    """

    format: Literal["lcars-node-graph"] = "lcars-node-graph"
    version: Literal[1, 2] = 1
    layers: list[GraphLayer] = Field(default_factory=list)
    templates: list[NodeTemplate] = Field(default_factory=list)
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    reroutes: list[GraphReroute] = Field(default_factory=list)
    groups: list[GraphGroup] = Field(default_factory=list)
    comments: list[GraphComment] = Field(default_factory=list)
    viewport: GraphViewport = Field(default_factory=GraphViewport)

    def template(self, template_id: str) -> NodeTemplate | None:
        return next((item for item in self.templates if item.id == template_id), None)

    def node(self, node_id: str) -> GraphNode | None:
        return next((item for item in self.nodes if item.id == node_id), None)

    @model_validator(mode="after")
    def _validate_graph(self) -> GraphDocument:
        _require_unique("template", [item.id for item in self.templates])
        _require_unique("node", [item.id for item in self.nodes])
        _require_unique("edge", [item.id for item in self.edges])
        _require_unique("layer", [item.id for item in self.layers])
        _require_unique("group", [item.id for item in self.groups])
        _require_unique("comment", [item.id for item in self.comments])
        _require_unique("reroute", [item.id for item in self.reroutes])

        templates = {item.id: item for item in self.templates}
        group_ids = {item.id for item in self.groups}
        for node in self.nodes:
            if node.template not in templates:
                raise ValueError(f"node {node.id!r} references unknown template {node.template!r}")
            known_fields = {field.id for field in templates[node.template].fields}
            unknown = set(node.values) - known_fields
            if unknown:
                raise ValueError(
                    f"node {node.id!r} sets values not declared by template "
                    f"{node.template!r}: {sorted(unknown)}"
                )
            if node.group is not None and node.group not in group_ids:
                raise ValueError(f"node {node.id!r} references unknown group {node.group!r}")

        nodes = {item.id: item for item in self.nodes}
        layer_ids = {item.id for item in self.layers}
        seen: set[tuple[str, str, str, str]] = set()
        for edge in self.edges:
            source_node = nodes.get(edge.source)
            target_node = nodes.get(edge.target)
            if source_node is None or target_node is None:
                raise ValueError(f"edge {edge.id!r} references a node that does not exist")
            source_port = templates[source_node.template].output(edge.source_port)
            target_port = templates[target_node.template].input(edge.target_port)
            if source_port is None:
                raise ValueError(
                    f"edge {edge.id!r} references unknown output port {edge.source_port!r}"
                )
            if target_port is None:
                raise ValueError(
                    f"edge {edge.id!r} references unknown input port {edge.target_port!r}"
                )
            if not ports_compatible(source_port, target_port):
                raise ValueError(
                    f"edge {edge.id!r} connects incompatible types "
                    f"{source_port.type!r} -> {target_port.type!r}"
                )
            if edge.layer is not None and edge.layer not in layer_ids:
                raise ValueError(f"edge {edge.id!r} references unknown layer {edge.layer!r}")
            if self.version == 2 and edge.layer is None:
                raise ValueError(f"version 2 edge {edge.id!r} must declare a layer")
            key = (edge.source, edge.source_port, edge.target, edge.target_port)
            if self.version == 1 and key in seen:
                raise ValueError(f"edge {edge.id!r} duplicates an existing connection")
            seen.add(key)

        _validate_capacities(self.edges, nodes, templates)

        edge_ids = {item.id for item in self.edges}
        for reroute in self.reroutes:
            if reroute.edge not in edge_ids:
                raise ValueError(f"reroute {reroute.id!r} references unknown edge {reroute.edge!r}")
        return self


def _require_unique(kind: str, ids: list[str]) -> None:
    if len(ids) != len(set(ids)):
        duplicates = sorted({item for item in ids if ids.count(item) > 1})
        raise ValueError(f"duplicate {kind} ids: {duplicates}")


def _validate_capacities(
    edges: list[GraphEdge],
    nodes: dict[str, GraphNode],
    templates: dict[str, NodeTemplate],
) -> None:
    """Enforce per-port connection limits, defaulting by side."""
    incoming: dict[tuple[str, str], int] = {}
    outgoing: dict[tuple[str, str], int] = {}
    for edge in edges:
        target = (edge.target, edge.target_port)
        source = (edge.source, edge.source_port)
        incoming[target] = incoming.get(target, 0) + 1
        outgoing[source] = outgoing.get(source, 0) + 1

    for (node_id, port_id), count in incoming.items():
        port = templates[nodes[node_id].template].input(port_id)
        # An unset input capacity means one: an input taking two values has no
        # defined meaning unless the node type says otherwise.
        limit = port.capacity if port is not None and port.capacity is not None else 1
        if count > limit:
            raise ValueError(
                f"input {port_id!r} on node {node_id!r} accepts {limit} connection(s), got {count}"
            )

    for (node_id, port_id), count in outgoing.items():
        port = templates[nodes[node_id].template].output(port_id)
        # An unset output capacity means unlimited: fanning one result out to
        # several consumers is the normal shape of a graph.
        out_limit = port.capacity if port is not None else None
        if out_limit is not None and count > out_limit:
            raise ValueError(
                f"output {port_id!r} on node {node_id!r} accepts "
                f"{out_limit} connection(s), got {count}"
            )


class GraphNodeExecution(BaseModel):
    """How one node is faring in the current run."""

    status: GraphStatus = "idle"
    progress: float | None = Field(default=None, ge=0.0, le=1.0)
    message: str | None = None


class GraphExecutionState(BaseModel):
    """Run status for the graph. Owned by the application, never by the library."""

    status: GraphStatus = "idle"
    nodes: dict[str, GraphNodeExecution] = Field(default_factory=dict)
    message: str | None = None


class NodeCanvasOptions(BaseOptions):
    """Editor capabilities."""

    editable: bool = True
    interaction: InteractionOptions | None = None
    min_zoom: float = Field(default=0.25, gt=0.0)
    max_zoom: float = Field(default=2.5, gt=0.0)
    snap_to_grid: bool = False
    grid_size: int = Field(default=16, ge=1)
    minimap: bool = True
    allow_import_export: bool = True
    history_limit: int = Field(default=50, ge=0)
    show_palette: bool = True
    show_run: bool = False
    show_queue: bool = False
    show_cancel: bool = False

    @model_validator(mode="after")
    def _validate_zoom(self) -> NodeCanvasOptions:
        if self.max_zoom <= self.min_zoom:
            raise ValueError("max_zoom must be greater than min_zoom")
        return self


class GraphLayerState(BaseModel):
    """Reader-only visibility state for one caller-defined layer."""

    visible: bool = True
    emphasized: bool = False

    @model_validator(mode="after")
    def _validate_state(self) -> GraphLayerState:
        if self.emphasized and not self.visible:
            raise ValueError("a hidden layer cannot be emphasized")
        return self


class NodeCanvasState(BaseModel):
    """What Python receives back at a transaction boundary."""

    document: GraphDocument = Field(default_factory=GraphDocument)
    selection: list[str] = Field(default_factory=list)
    layer_state: dict[str, GraphLayerState] = Field(default_factory=dict)
    last_event: str | None = None


class NodeCanvas(BaseWidget):
    """A full LCARS-styled node-graph editor."""

    type: Literal["node_canvas"] = "node_canvas"
    document: GraphDocument = Field(default_factory=GraphDocument)
    execution: GraphExecutionState | None = Field(
        default=None, description="Application-owned run status; never set by the library."
    )
    options: NodeCanvasOptions | None = None
    strict_role: StrictWidgetRole | None = Field(
        default=None, description="Strict composition role."
    )
    strict_title: str | None = Field(default=None, description="Strict surface title override.")
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None, description="Strict surface variant."
    )


__all__ = [
    "ANY_TYPE",
    "GraphFieldKind",
    "GraphStatus",
    "GraphLayerPattern",
    "GraphLayerMarker",
    "GraphPort",
    "GraphFieldOption",
    "GraphField",
    "NodeTemplate",
    "GraphNode",
    "GraphLayer",
    "GraphEdge",
    "GraphReroute",
    "GraphGroup",
    "GraphComment",
    "GraphViewport",
    "GraphDocument",
    "GraphNodeExecution",
    "GraphExecutionState",
    "NodeCanvasOptions",
    "GraphLayerState",
    "NodeCanvasState",
    "NodeCanvas",
    "ports_compatible",
]
