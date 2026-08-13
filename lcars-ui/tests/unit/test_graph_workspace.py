"""Contract tests for the proposal workspace widget."""

from __future__ import annotations

import pytest
from pydantic import TypeAdapter, ValidationError

import lcars_ui as lcars
from lcars_ui.core.models import Widget
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _Config, _LCARSContext, set_ctx
from lcars_ui.widgets.workspace import GraphWorkspace, GraphWorkspaceOptions
from lcars_ui.workspace import CanonicalPlane, GraphRevision, GraphWorkspaceDocument, ProposalPlane


def workspace(*, proposal: bool = True) -> GraphWorkspaceDocument:
    graph = GraphRevision(graph_id="graph", revision="r1")
    return GraphWorkspaceDocument(
        format="lcars-graph-workspace",
        version=1,
        workspace_id="workspace-1",
        canonical=CanonicalPlane(graph=graph),
        proposal=(
            ProposalPlane(proposal_id="proposal-1", title="Draft", base=graph)
            if proposal
            else None
        ),
    )


def test_workspace_widget_keeps_generic_density_options_bounded() -> None:
    widget = GraphWorkspace(
        id="workspace",
        workspace=workspace(),
        options=GraphWorkspaceOptions(fan_page_size=20, virtual_row_height=44),
    )

    assert widget.type == "graph_workspace"
    assert widget.options is not None
    assert widget.options.canonical_title == "Canonical · read only"
    assert widget.options.fan_page_size == 20


def test_workspace_contract_is_available_from_the_public_package() -> None:
    revision = lcars.GraphRevision(graph_id="public", revision="r1")
    document = lcars.GraphWorkspaceDocument(
        format="lcars-graph-workspace",
        version=1,
        workspace_id="public-workspace",
        canonical=lcars.CanonicalPlane(graph=revision),
        proposal=lcars.ProposalPlane(proposal_id="draft", title="Draft", base=revision),
    )

    assert document.workspace_id == "public-workspace"


def test_workspace_widget_requires_an_explicit_proposal_plane() -> None:
    with pytest.raises(ValidationError, match="requires a proposal plane"):
        GraphWorkspace(id="workspace", workspace=workspace(proposal=False))


@pytest.mark.parametrize(("field", "value"), [("fan_page_size", 0), ("virtual_row_height", 12)])
def test_workspace_density_options_reject_unusable_sizes(field: str, value: int) -> None:
    with pytest.raises(ValidationError):
        GraphWorkspaceOptions.model_validate({field: value})


def test_workspace_widget_is_manifest_discriminated() -> None:
    parsed = TypeAdapter(Widget).validate_python(
        {"id": "workspace", "type": "graph_workspace", "workspace": workspace().model_dump()}
    )

    assert isinstance(parsed, GraphWorkspace)


def test_workspace_dsl_declares_server_driven_widget() -> None:
    ctx = _LCARSContext(mode=Mode.BUILD, session_id="test", builder=_ManifestBuilder())
    set_ctx(ctx)

    lcars.graph_workspace(workspace(), title="Proposal workbench")

    assert ctx.builder is not None
    manifest = ctx.builder.build(_Config(name="T"))
    widgets = [
        child
        for column in manifest.pages["main"].rows[0].columns
        for parent in column.widgets
        for child in getattr(parent, "children", [])
    ]
    rendered = next(item for item in widgets if isinstance(item, GraphWorkspace))
    assert rendered.label == "Proposal workbench"
