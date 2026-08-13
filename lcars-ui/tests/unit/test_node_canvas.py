"""Unit tests for the node_canvas widget and lcars-node-graph formats."""

from __future__ import annotations

import pytest
from pydantic import TypeAdapter, ValidationError

import lcars_ui as lcars
from lcars_ui.core.models import Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _Config, _LCARSContext, set_ctx
from lcars_ui.widgets.graph import (
    GraphComment,
    GraphDocument,
    GraphEdge,
    GraphExecutionState,
    GraphField,
    GraphGroup,
    GraphLayer,
    GraphLayerState,
    GraphNode,
    GraphNodeExecution,
    GraphPort,
    GraphReroute,
    NodeCanvas,
    NodeCanvasOptions,
    NodeCanvasState,
    NodeTemplate,
    ports_compatible,
)
from lcars_ui.widgets.options import InteractionOptions


def _templates() -> list[NodeTemplate]:
    return [
        NodeTemplate(id="source", outputs=[GraphPort(id="out", type="num")]),
        NodeTemplate(
            id="sink",
            inputs=[GraphPort(id="in", type="num")],
            fields=[GraphField(id="gain", kind="number", default=1)],
        ),
        NodeTemplate(id="merge", inputs=[GraphPort(id="any_in", type="any", capacity=2)]),
        NodeTemplate(id="text", outputs=[GraphPort(id="out", type="str")]),
    ]


def _nodes() -> list[GraphNode]:
    return [
        GraphNode(id="n1", template="source"),
        GraphNode(id="n2", template="sink", position=(200.0, 0.0), values={"gain": 3}),
    ]


def _document(**overrides: object) -> GraphDocument:
    payload: dict[str, object] = {"templates": _templates(), "nodes": _nodes()}
    payload.update(overrides)
    return GraphDocument(**payload)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Format
# ---------------------------------------------------------------------------


def test_empty_document_defaults() -> None:
    document = GraphDocument()

    assert document.format == "lcars-node-graph"
    assert document.version == 1
    assert document.nodes == []
    assert document.layers == []
    assert document.viewport.zoom == 1.0


def test_document_accepts_a_valid_graph() -> None:
    document = _document(
        edges=[GraphEdge(id="e1", source="n1", source_port="out", target="n2", target_port="in")]
    )

    assert len(document.edges) == 1
    assert document.node("n2") is not None
    assert document.template("sink") is not None


def test_version_two_requires_declared_caller_defined_layers() -> None:
    layer = GraphLayer(
        id="causal",
        label="Causal flow",
        token="CF",
        pattern="dashed",
        marker="arrow_open",
        description="Caller supplied semantics",
    )
    document = _document(
        version=2,
        layers=[layer],
        edges=[
            GraphEdge(
                id="e1",
                source="n1",
                source_port="out",
                target="n2",
                target_port="in",
                layer="causal",
                label="requires",
                relation="REQUIRES",
            )
        ],
    )

    assert document.version == 2
    assert document.layers[0].pattern == "dashed"
    assert document.edges[0].relation == "REQUIRES"


def test_version_two_rejects_unlayered_and_unknown_layer_edges() -> None:
    edge = GraphEdge(id="e1", source="n1", source_port="out", target="n2", target_port="in")
    with pytest.raises(ValidationError, match="must declare a layer"):
        _document(version=2, layers=[GraphLayer(id="known")], edges=[edge])
    with pytest.raises(ValidationError, match="unknown layer"):
        _document(edges=[edge.model_copy(update={"layer": "missing"})])


def test_version_two_preserves_parallel_connections() -> None:
    parallel = GraphEdge(
        id="e1",
        source="n1",
        source_port="out",
        target="m",
        target_port="any_in",
        layer="one",
    )
    document = _document(
        version=2,
        layers=[GraphLayer(id="one"), GraphLayer(id="two", pattern="dotted")],
        nodes=[*_nodes(), GraphNode(id="m", template="merge")],
        edges=[parallel, parallel.model_copy(update={"id": "e2", "layer": "two"})],
    )

    assert [edge.layer for edge in document.edges] == ["one", "two"]


def test_layer_reader_state_cannot_emphasize_a_hidden_layer() -> None:
    with pytest.raises(ValidationError, match="hidden layer"):
        GraphLayerState(visible=False, emphasized=True)


def test_ports_compatible_matches_types_or_any() -> None:
    num = GraphPort(id="a", type="num")
    other = GraphPort(id="b", type="str")
    anything = GraphPort(id="c", type="any")

    assert ports_compatible(num, num)
    assert not ports_compatible(num, other)
    assert ports_compatible(num, anything)
    assert ports_compatible(anything, other)


def test_document_rejects_unknown_template() -> None:
    with pytest.raises(ValidationError, match="unknown template"):
        _document(nodes=[GraphNode(id="x", template="ghost")])


def test_document_rejects_values_not_declared_by_the_template() -> None:
    with pytest.raises(ValidationError, match="values not declared"):
        _document(nodes=[GraphNode(id="n1", template="sink", values={"nope": 1})])


def test_document_rejects_duplicate_node_ids() -> None:
    with pytest.raises(ValidationError, match="duplicate node ids"):
        _document(
            nodes=[GraphNode(id="n1", template="source"), GraphNode(id="n1", template="sink")]
        )


def test_document_rejects_a_dangling_edge() -> None:
    with pytest.raises(ValidationError, match="node that does not exist"):
        _document(
            edges=[
                GraphEdge(id="e1", source="ghost", source_port="out", target="n2", target_port="in")
            ]
        )


def test_document_rejects_an_unknown_port() -> None:
    with pytest.raises(ValidationError, match="unknown output port"):
        _document(
            edges=[
                GraphEdge(id="e1", source="n1", source_port="nope", target="n2", target_port="in")
            ]
        )


def test_document_rejects_incompatible_types() -> None:
    with pytest.raises(ValidationError, match="incompatible types"):
        _document(
            nodes=[*_nodes(), GraphNode(id="n3", template="text")],
            edges=[
                GraphEdge(id="e1", source="n3", source_port="out", target="n2", target_port="in")
            ],
        )


def test_document_rejects_a_duplicate_connection() -> None:
    with pytest.raises(ValidationError, match="duplicates an existing connection"):
        _document(
            edges=[
                GraphEdge(id="e1", source="n1", source_port="out", target="n2", target_port="in"),
                GraphEdge(id="e2", source="n1", source_port="out", target="n2", target_port="in"),
            ]
        )


def test_an_input_accepts_one_connection_by_default() -> None:
    with pytest.raises(ValidationError, match="accepts 1 connection"):
        _document(
            nodes=[*_nodes(), GraphNode(id="n3", template="source")],
            edges=[
                GraphEdge(id="e1", source="n1", source_port="out", target="n2", target_port="in"),
                GraphEdge(id="e2", source="n3", source_port="out", target="n2", target_port="in"),
            ],
        )


def test_an_input_may_declare_a_larger_capacity() -> None:
    document = _document(
        nodes=[
            *_nodes(),
            GraphNode(id="m", template="merge"),
            GraphNode(id="n3", template="source"),
        ],
        edges=[
            GraphEdge(id="e1", source="n1", source_port="out", target="m", target_port="any_in"),
            GraphEdge(id="e2", source="n3", source_port="out", target="m", target_port="any_in"),
        ],
    )

    assert len(document.edges) == 2


def test_an_output_fans_out_without_limit() -> None:
    document = _document(
        nodes=[*_nodes(), GraphNode(id="n3", template="sink")],
        edges=[
            GraphEdge(id="e1", source="n1", source_port="out", target="n2", target_port="in"),
            GraphEdge(id="e2", source="n1", source_port="out", target="n3", target_port="in"),
        ],
    )

    assert len(document.edges) == 2


def test_document_rejects_a_non_finite_position() -> None:
    with pytest.raises(ValidationError, match="non-finite position"):
        GraphNode(id="n", template="source", position=(float("inf"), 0.0))


def test_document_rejects_a_reroute_on_a_missing_edge() -> None:
    with pytest.raises(ValidationError, match="unknown edge"):
        _document(reroutes=[GraphReroute(id="r1", edge="ghost")])


def test_document_rejects_a_node_in_a_missing_group() -> None:
    with pytest.raises(ValidationError, match="unknown group"):
        _document(nodes=[GraphNode(id="n1", template="source", group="ghost")])


def test_group_and_comment_require_a_positive_size() -> None:
    with pytest.raises(ValidationError, match="positive, finite size"):
        GraphGroup(id="g", size=(0.0, 100.0))
    with pytest.raises(ValidationError, match="positive, finite size"):
        GraphComment(id="c", size=(100.0, -1.0))


def test_template_rejects_duplicate_port_and_field_ids() -> None:
    with pytest.raises(ValidationError, match="duplicate input port ids"):
        NodeTemplate(id="t", inputs=[GraphPort(id="a"), GraphPort(id="a")])
    with pytest.raises(ValidationError, match="duplicate field ids"):
        NodeTemplate(id="t", fields=[GraphField(id="f"), GraphField(id="f")])


def test_select_field_requires_options() -> None:
    with pytest.raises(ValidationError, match="must declare at least one option"):
        GraphField(id="f", kind="select")


def test_non_select_field_rejects_options() -> None:
    with pytest.raises(ValidationError, match="has options but kind is"):
        GraphField(id="f", kind="text", options=[{"value": "a"}])  # type: ignore[list-item]


def test_document_round_trips_through_json() -> None:
    original = _document(
        edges=[GraphEdge(id="e1", source="n1", source_port="out", target="n2", target_port="in")],
        groups=[GraphGroup(id="g1", label="Stage 1")],
        comments=[GraphComment(id="c1", text="note")],
    )

    restored = GraphDocument.model_validate_json(original.model_dump_json())

    assert restored == original


# ---------------------------------------------------------------------------
# Execution state
# ---------------------------------------------------------------------------


def test_execution_state_is_separate_from_the_document() -> None:
    execution = GraphExecutionState(
        status="running",
        nodes={"n2": GraphNodeExecution(status="error", message="divide by zero")},
    )

    assert "document" not in execution.model_dump()
    assert execution.nodes["n2"].status == "error"


def test_execution_progress_is_bounded() -> None:
    with pytest.raises(ValidationError):
        GraphNodeExecution(progress=1.5)


# ---------------------------------------------------------------------------
# Options
# ---------------------------------------------------------------------------


def test_node_canvas_options_defaults() -> None:
    options = NodeCanvasOptions()

    assert options.editable is True
    assert options.minimap is True
    assert options.history_limit == 50
    assert options.show_run is False


def test_node_canvas_options_reject_inverted_zoom() -> None:
    with pytest.raises(ValidationError, match="max_zoom must be greater"):
        NodeCanvasOptions(min_zoom=3.0, max_zoom=1.0)


def test_visible_edge_window_is_reader_only_and_keeps_stable_ids() -> None:
    options = NodeCanvasOptions(visible_edge_ids=["edge-20", "edge-21"])

    assert options.visible_edge_ids == ["edge-20", "edge-21"]


def test_port_geometry_is_caller_selected_from_code_rendered_shapes() -> None:
    port = GraphPort(id="input", type="generic", shape="notch")

    assert port.shape == "notch"
    with pytest.raises(ValidationError):
        GraphPort(id="input", type="generic", shape="caller-raster")


# ---------------------------------------------------------------------------
# Widget and DSL
# ---------------------------------------------------------------------------


def test_node_canvas_discriminates_in_the_union() -> None:
    widget = TypeAdapter(Widget).validate_python(
        {"id": "g1", "type": "node_canvas", "document": _document().model_dump()}
    )

    assert isinstance(widget, NodeCanvas)
    assert len(widget.document.nodes) == 2


def test_node_canvas_defaults_to_an_empty_graph() -> None:
    widget = NodeCanvas(id="g1")

    assert widget.document.nodes == []
    assert widget.execution is None


def _build_ctx() -> _LCARSContext:
    ctx = _LCARSContext(mode=Mode.BUILD, session_id="test", builder=_ManifestBuilder())
    set_ctx(ctx)
    return ctx


def _only_canvas(ctx: _LCARSContext) -> NodeCanvas:
    assert ctx.builder is not None
    manifest = ctx.builder.build(_Config(name="T"))
    found = [
        child
        for column in manifest.pages["main"].rows[0].columns
        for widget in column.widgets
        for child in getattr(widget, "children", [])
        if isinstance(child, NodeCanvas)
    ]
    assert len(found) == 1
    return found[0]


def test_node_canvas_dsl_declares_the_widget() -> None:
    ctx = _build_ctx()
    lcars.node_canvas(_document(), title="Pipeline")

    widget = _only_canvas(ctx)
    assert widget.label == "Pipeline"
    assert len(widget.document.nodes) == 2


def test_node_canvas_dsl_accepts_a_plain_dict() -> None:
    ctx = _build_ctx()
    lcars.node_canvas(_document().model_dump(), title="Pipeline")

    assert len(_only_canvas(ctx).document.nodes) == 2


def test_node_canvas_dsl_rejects_an_invalid_dict() -> None:
    _build_ctx()
    with pytest.raises(ValidationError):
        lcars.node_canvas(
            {
                "format": "lcars-node-graph",
                "version": 1,
                "nodes": [{"id": "x", "template": "ghost"}],
            }
        )


def test_node_canvas_dsl_returns_none_without_server_interaction() -> None:
    _build_ctx()
    assert lcars.node_canvas(_document()) is None


def test_node_canvas_dsl_returns_state_for_server_interaction() -> None:
    _build_ctx()
    state = lcars.node_canvas(
        _document(),
        id="graph",
        options=NodeCanvasOptions(interaction=InteractionOptions(mode="server")),
    )

    assert isinstance(state, NodeCanvasState)
    assert len(state.document.nodes) == 2


def test_node_canvas_state_reflects_an_edit_from_the_renderer() -> None:
    edited = _document(
        edges=[GraphEdge(id="e1", source="n1", source_port="out", target="n2", target_port="in")]
    )
    ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id="test",
        active_action_id="graph",
        active_action_value={
            "kind": "connect",
            "state": {"document": edited.model_dump(), "selection": ["n2"]},
        },
    )
    set_ctx(ctx)

    state = lcars.node_canvas(
        _document(),
        id="graph",
        options=NodeCanvasOptions(interaction=InteractionOptions(mode="server")),
    )

    assert isinstance(state, NodeCanvasState)
    assert len(state.document.edges) == 1
    assert state.selection == ["n2"]
    assert state.last_event == "connect"


def test_node_canvas_run_event_carries_the_current_graph() -> None:
    ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id="test",
        active_action_id="graph",
        active_action_value={
            "kind": "run",
            "state": {"document": _document().model_dump(), "selection": []},
        },
    )
    set_ctx(ctx)

    state = lcars.node_canvas(
        _document(),
        id="graph",
        options=NodeCanvasOptions(interaction=InteractionOptions(mode="server")),
    )

    assert isinstance(state, NodeCanvasState)
    assert state.last_event == "run"
    assert len(state.document.nodes) == 2


def test_a_malformed_state_from_the_renderer_is_ignored() -> None:
    # The stored default must survive a payload that would not validate,
    # rather than the handler raising into the websocket loop.
    ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id="test",
        active_action_id="graph",
        active_action_value={"kind": "connect", "state": {"document": {"format": "nope"}}},
    )
    set_ctx(ctx)

    state = lcars.node_canvas(
        _document(),
        id="graph",
        options=NodeCanvasOptions(interaction=InteractionOptions(mode="server")),
    )

    assert isinstance(state, NodeCanvasState)
    assert len(state.document.nodes) == 2


def test_execution_status_streams_without_touching_the_document() -> None:
    # Status arrives through the ordinary widget_update path, carrying only the
    # `execution` field. That is what lets it stream continuously while the user
    # is mid-edit: the document is not in the payload, so it cannot be clobbered.
    ctx = _LCARSContext(mode=Mode.HANDLE, session_id="test")
    set_ctx(ctx)

    lcars.update(
        "graph",
        execution=GraphExecutionState(
            status="running",
            nodes={"n2": GraphNodeExecution(status="running", progress=0.4)},
        ),
    )

    assert len(ctx.pending_events) == 1
    payload = ctx.pending_events[0].payload
    assert payload.id == "graph"
    assert set(payload.data) == {"execution"}
    assert payload.data["execution"].status == "running"
    assert payload.data["execution"].nodes["n2"].progress == 0.4
