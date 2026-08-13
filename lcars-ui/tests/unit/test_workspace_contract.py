"""Ownership and restoration invariants for graph-workspace contract v1."""

from __future__ import annotations

import pytest
from pydantic import TypeAdapter, ValidationError

from lcars_ui.workspace import (
    CanonicalPlane,
    GraphRevision,
    GraphWorkspaceDocument,
    IngestionReceipt,
    ProposalChange,
    ProposalPlane,
    ReceiptObject,
    WorkspaceCompleteness,
    WorkspaceReaderState,
    WorkspaceRecord,
    WorkspaceTreeNode,
    WorkspaceTreeValue,
    WorkspaceWireMessage,
)


def graph() -> GraphRevision:
    return GraphRevision(graph_id="graph", revision="r1")


def record(record_id: str, *, kind: str = "record") -> WorkspaceRecord:
    return WorkspaceRecord(id=record_id, kind=kind, fields={"name": record_id})


def test_workspace_keeps_canonical_proposal_reader_and_receipt_separate() -> None:
    canonical = CanonicalPlane(
        graph=graph(),
        completeness=WorkspaceCompleteness(
            state="complete", loaded_records=1, known_records=1
        ),
        records=[record("canonical-1")],
    )
    change = ProposalChange(
        id="change-1",
        operation="replacement",
        record_id="draft-1",
        base_record_id="canonical-1",
        record=record("draft-1"),
    )
    proposal = ProposalPlane(
        proposal_id="proposal-1",
        title="Proposed change",
        base=graph(),
        revision=1,
        interaction_count=3,
        changes=[change],
    )
    reader = WorkspaceReaderState(search="local query", collapsed=["module-1"])
    receipt = IngestionReceipt(
        receipt_id="receipt-1",
        proposal_id="proposal-1",
        outcome="accepted",
        objects=[
            ReceiptObject(
                proposal_record_id="draft-1",
                canonical_id="canonical-2",
                outcome="accepted",
            )
        ],
    )

    workspace = GraphWorkspaceDocument(
        workspace_id="workspace-1",
        canonical=canonical,
        proposal=proposal,
        reader=reader,
        receipt=receipt,
    )

    assert workspace.canonical.records[0].id == "canonical-1"
    assert workspace.proposal is not None
    assert workspace.proposal.changes[0].record_id == "draft-1"
    assert workspace.reader.search == "local query"
    assert workspace.receipt is not None
    assert workspace.receipt.fresh_canonical_read_required is True


def test_structured_value_round_trips_without_becoming_a_scalar() -> None:
    tree = WorkspaceTreeValue(
        schema="expression",
        root=WorkspaceTreeNode(
            id="root",
            part="operation",
            fields={"operator": "multiply"},
            slots={
                "operands": [
                    WorkspaceTreeNode(id="left", part="symbol", fields={"name": "x"}),
                    WorkspaceTreeNode(id="right", part="number", fields={"value": "3"}),
                ]
            },
        ),
    )
    workspace = GraphWorkspaceDocument(
        workspace_id="workspace-1",
        canonical=CanonicalPlane(
            graph=graph(),
            records=[WorkspaceRecord(id="r1", kind="record", trees={"value": tree})],
        ),
    )

    restored = TypeAdapter(WorkspaceWireMessage).validate_json(
        TypeAdapter(WorkspaceWireMessage).dump_json(workspace)
    )

    assert restored.canonical.records[0].trees["value"].root.slots["operands"][1].part == "number"


def test_proposal_base_must_match_loaded_canonical_revision() -> None:
    with pytest.raises(ValidationError, match="proposal base must match"):
        GraphWorkspaceDocument(
            workspace_id="workspace-1",
            canonical=CanonicalPlane(graph=graph()),
            proposal=ProposalPlane(
                proposal_id="proposal-1",
                title="Draft",
                base=GraphRevision(graph_id="graph", revision="r2"),
            ),
        )


def test_reader_state_cannot_point_outside_its_history() -> None:
    with pytest.raises(ValidationError, match="history_index"):
        WorkspaceReaderState(history_index=0)


def test_partial_and_failed_completeness_require_an_explanation() -> None:
    with pytest.raises(ValidationError, match="requires a reason"):
        WorkspaceCompleteness(state="partial", loaded_records=4, known_records=5)


def test_rejected_receipt_content_and_reason_are_preserved() -> None:
    item = ReceiptObject(
        proposal_record_id="draft-1",
        outcome="rejected",
        reason="Caller validation failed",
        dependencies=["draft-2"],
    )
    assert item.reason == "Caller validation failed"
    assert item.dependencies == ["draft-2"]


def test_extra_wire_fields_are_rejected_instead_of_silently_ignored() -> None:
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        GraphRevision.model_validate({"graph_id": "g", "revision": "r", "other": True})
