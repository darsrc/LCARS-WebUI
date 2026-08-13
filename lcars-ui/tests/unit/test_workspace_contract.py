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
    WorkspaceAction,
    WorkspaceCompleteness,
    WorkspaceFieldSchema,
    WorkspaceReaderState,
    WorkspaceRecord,
    WorkspaceRecordAppearance,
    WorkspaceRecordSchema,
    WorkspaceSearchField,
    WorkspaceTreeNode,
    WorkspaceTreePartSchema,
    WorkspaceTreeSchema,
    WorkspaceTreeSlotSchema,
    WorkspaceTreeValue,
    WorkspaceValidationRule,
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


def expression_schema() -> WorkspaceTreeSchema:
    return WorkspaceTreeSchema(
        id="expression",
        label="Expression",
        root_parts=["symbol", "operation"],
        parts=[
            WorkspaceTreePartSchema(
                id="symbol",
                label="Symbol",
                token="SYM",
                fields=[
                    WorkspaceFieldSchema(
                        id="name", label="Name", value_kind="text", required=True
                    )
                ],
            ),
            WorkspaceTreePartSchema(
                id="operation",
                label="Operation",
                token="OP",
                fields=[
                    WorkspaceFieldSchema(
                        id="operator",
                        label="Operator",
                        value_kind="choice",
                        choices=[{"value": "multiply", "label": "Multiply"}],
                    )
                ],
                slots=[
                    WorkspaceTreeSlotSchema(
                        id="operands",
                        label="Operands",
                        accepts=["symbol", "operation"],
                        cardinality="many",
                    )
                ],
            ),
        ],
        unsupported_parts=["opaque"],
        limitation="Only caller-declared parts can be represented.",
    )


def test_record_shapes_search_fields_and_tree_vocabulary_are_caller_supplied() -> None:
    schema = WorkspaceRecordSchema(
        kind="calculation",
        label="Calculation",
        appearance=WorkspaceRecordAppearance(shape="gate", token="CALC"),
        fields=[
            WorkspaceFieldSchema(
                id="expression",
                label="Expression",
                value_kind="tree",
                required=True,
                tree_schema="expression",
            )
        ],
        search_fields=[
            WorkspaceSearchField(
                id="expression-search",
                label="Expression structure",
                path="trees.expression",
                match="structural",
            )
        ],
    )
    workspace = GraphWorkspaceDocument(
        workspace_id="workspace-1",
        record_schemas=[schema],
        tree_schemas=[expression_schema()],
        canonical=CanonicalPlane(graph=graph()),
    )

    assert workspace.record_schemas[0].kind == "calculation"
    assert workspace.record_schemas[0].appearance.shape == "gate"
    assert workspace.record_schemas[0].search_fields[0].label == "Expression structure"


def test_record_schema_rejects_an_unknown_tree_vocabulary() -> None:
    with pytest.raises(ValidationError, match="unknown tree schema"):
        GraphWorkspaceDocument(
            workspace_id="workspace-1",
            record_schemas=[
                WorkspaceRecordSchema(
                    kind="record",
                    label="Record",
                    appearance=WorkspaceRecordAppearance(shape="card", token="REC"),
                    fields=[
                        WorkspaceFieldSchema(
                            id="tree",
                            label="Tree",
                            value_kind="tree",
                            tree_schema="missing",
                        )
                    ],
                )
            ],
            canonical=CanonicalPlane(graph=graph()),
        )


def test_tree_schema_rejects_unknown_slot_parts() -> None:
    with pytest.raises(ValidationError, match="accepts unknown parts"):
        WorkspaceTreeSchema(
            id="tree",
            label="Tree",
            root_parts=["root"],
            parts=[
                WorkspaceTreePartSchema(
                    id="root",
                    label="Root",
                    token="ROOT",
                    slots=[
                        WorkspaceTreeSlotSchema(
                            id="child", label="Child", accepts=["missing"]
                        )
                    ],
                )
            ],
        )


def test_custom_semantic_validation_remains_server_owned() -> None:
    with pytest.raises(ValidationError, match="custom semantic validation"):
        WorkspaceValidationRule(
            id="semantic-rule",
            label="Caller semantic rule",
            scope="record",
            evaluator="custom",
            message="The caller decides this rule.",
        )

    rule = WorkspaceValidationRule(
        id="semantic-rule",
        label="Caller semantic rule",
        scope="submission",
        evaluator="custom",
        message="The caller decides this rule.",
    )
    assert rule.scope == "submission"


def test_action_labels_commands_and_transport_are_caller_supplied() -> None:
    action = WorkspaceAction(
        id="handoff",
        label="Send proposed package",
        scope="submission",
        transport="server",
        command="caller.submit",
        confirmation="Review the structural diff first.",
    )
    workspace = GraphWorkspaceDocument(
        workspace_id="workspace-1",
        actions=[action],
        canonical=CanonicalPlane(graph=graph()),
    )

    assert workspace.actions[0].command == "caller.submit"
    assert workspace.actions[0].label == "Send proposed package"
