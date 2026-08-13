"""Versioned contracts for a canonical graph and its proposal workspace.

This module is deliberately independent of the graph renderer.  Applications
own record kinds and semantics; LCARS owns the separation between immutable
canonical data, mutable proposal data, reader state, and ingestion outcomes.
"""

from __future__ import annotations

from typing import Annotated, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator

from lcars_ui.widgets.graph import GraphDocument, GraphLayerState, GraphViewport


class WorkspaceModel(BaseModel):
    """Strict base for every workspace wire object."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


WorkspacePlane = Literal["canonical", "proposal"]
WorkspaceElementKind = Literal["record", "node", "edge", "group", "capsule"]
CompletenessState = Literal["loading", "complete", "partial", "failed", "cancelled"]


class GraphRevision(WorkspaceModel):
    """Identity of one immutable canonical graph revision."""

    graph_id: str = Field(min_length=1)
    revision: str = Field(min_length=1)


class WorkspaceCompleteness(WorkspaceModel):
    """How much of a revision-bound result or plane is currently available."""

    state: CompletenessState = "complete"
    loaded_records: int = Field(default=0, ge=0)
    known_records: int | None = Field(default=None, ge=0)
    stage: str | None = None
    reason: str | None = None

    @model_validator(mode="after")
    def _validate_counts(self) -> WorkspaceCompleteness:
        if self.known_records is not None and self.loaded_records > self.known_records:
            raise ValueError("loaded_records cannot exceed known_records")
        if self.state == "complete" and self.known_records is not None:
            if self.loaded_records != self.known_records:
                raise ValueError("complete data must load every known record")
        if self.state in {"failed", "cancelled", "partial"} and not self.reason:
            raise ValueError(f"{self.state} completeness requires a reason")
        return self


class WorkspaceTreeNode(WorkspaceModel):
    """One caller-defined structured value node.

    Slot values are always ordered lists.  A schema may later constrain a slot
    to zero, one, or many children without changing the stored tree shape.
    """

    id: str = Field(min_length=1)
    part: str = Field(min_length=1)
    fields: dict[str, JsonValue] = Field(default_factory=dict)
    slots: dict[str, list[WorkspaceTreeNode]] = Field(default_factory=dict)


class WorkspaceTreeValue(WorkspaceModel):
    """A losslessly versioned typed tree held by a record field."""

    format: Literal["lcars-structured-value"] = "lcars-structured-value"
    version: Literal[1] = 1
    schema_id: str = Field(alias="schema", serialization_alias="schema", min_length=1)
    root: WorkspaceTreeNode


class WorkspaceRecord(WorkspaceModel):
    """A caller-owned record represented without domain-specific fields."""

    id: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    label: str | None = None
    fields: dict[str, JsonValue] = Field(default_factory=dict)
    trees: dict[str, WorkspaceTreeValue] = Field(default_factory=dict)
    structural_key: JsonValue | None = None


class WorkspaceProjectionBinding(WorkspaceModel):
    """Bind code-rendered graph geometry to a record in one plane."""

    element_kind: Literal["node", "edge", "group"]
    element_id: str = Field(min_length=1)
    record_id: str = Field(min_length=1)
    plane: WorkspacePlane


class WorkspaceProjection(WorkspaceModel):
    """Renderer-neutral graph projection; viewport remains reader state."""

    document: GraphDocument = Field(default_factory=GraphDocument)
    bindings: list[WorkspaceProjectionBinding] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_bindings(self) -> WorkspaceProjection:
        seen: set[tuple[str, str]] = set()
        available = {
            "node": {item.id for item in self.document.nodes},
            "edge": {item.id for item in self.document.edges},
            "group": {item.id for item in self.document.groups},
        }
        for binding in self.bindings:
            key = (binding.element_kind, binding.element_id)
            if key in seen:
                raise ValueError(f"duplicate projection binding {key!r}")
            seen.add(key)
            if binding.element_id not in available[binding.element_kind]:
                raise ValueError(
                    f"projection binding references unknown {binding.element_kind} "
                    f"{binding.element_id!r}"
                )
        return self


class CanonicalPlane(WorkspaceModel):
    """Immutable application-supplied records from one graph revision."""

    graph: GraphRevision
    completeness: WorkspaceCompleteness = Field(default_factory=WorkspaceCompleteness)
    records: list[WorkspaceRecord] = Field(default_factory=list)
    projection: WorkspaceProjection = Field(default_factory=WorkspaceProjection)


ProposalOperation = Literal["addition", "replacement", "retirement", "reference", "unresolved"]


class ProposalChange(WorkspaceModel):
    """One proposal-local operation; canonical data is referred to, never edited."""

    id: str = Field(min_length=1)
    operation: ProposalOperation
    record_id: str = Field(min_length=1)
    base_record_id: str | None = None
    record: WorkspaceRecord | None = None
    dependencies: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_operation_shape(self) -> ProposalChange:
        if self.operation in {"addition", "replacement", "unresolved"} and self.record is None:
            raise ValueError(f"{self.operation} requires proposal record content")
        if self.operation in {"replacement", "retirement", "reference"} and not self.base_record_id:
            raise ValueError(f"{self.operation} requires base_record_id")
        if self.operation == "addition" and self.base_record_id is not None:
            raise ValueError("addition cannot declare base_record_id")
        if self.record is not None and self.record.id != self.record_id:
            raise ValueError("proposal record id must equal record_id")
        return self


class ValidationTarget(WorkspaceModel):
    plane: WorkspacePlane
    element_kind: WorkspaceElementKind
    element_id: str = Field(min_length=1)
    path: str | None = None


class ValidationFinding(WorkspaceModel):
    """A caller, server, or generic client validator result."""

    id: str = Field(min_length=1)
    rule_id: str | None = None
    severity: Literal["info", "warning", "error"]
    message: str = Field(min_length=1)
    target: ValidationTarget
    blocking: bool = False
    source: Literal["client", "caller", "server"] = "caller"


class ProposalPlane(WorkspaceModel):
    """Mutable proposal state based on, but separate from, canonical content."""

    proposal_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    base: GraphRevision
    status: Literal["draft", "ready", "submitted", "historical"] = "draft"
    revision: int = Field(default=0, ge=0)
    interaction_count: int = Field(default=0, ge=0)
    changes: list[ProposalChange] = Field(default_factory=list)
    projection: WorkspaceProjection = Field(default_factory=WorkspaceProjection)
    findings: list[ValidationFinding] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_change_ids(self) -> ProposalPlane:
        ids = [change.id for change in self.changes]
        if len(ids) != len(set(ids)):
            raise ValueError("proposal change ids must be unique")
        return self


class WorkspaceSelection(WorkspaceModel):
    plane: WorkspacePlane
    element_kind: WorkspaceElementKind
    element_id: str = Field(min_length=1)


class ReaderFilter(WorkspaceModel):
    facet: str = Field(min_length=1)
    values: list[str] = Field(min_length=1)


class ReaderFocus(WorkspaceModel):
    record_id: str = Field(min_length=1)
    radius: int = Field(ge=1, le=5)
    direction: Literal["incoming", "outgoing", "both"] = "both"


class ReaderNavigationEntry(WorkspaceModel):
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    selection: WorkspaceSelection | None = None
    step: str | None = None


class WorkspaceReaderState(WorkspaceModel):
    """Local navigation state that is neither canonical nor a proposal."""

    revision: int = Field(default=0, ge=0)
    selection: list[WorkspaceSelection] = Field(default_factory=list)
    viewport: GraphViewport = Field(default_factory=GraphViewport)
    positions: dict[str, tuple[float, float]] = Field(default_factory=dict)
    layer_state: dict[str, GraphLayerState] = Field(default_factory=dict)
    collapsed: list[str] = Field(default_factory=list)
    focus: ReaderFocus | None = None
    filters: list[ReaderFilter] = Field(default_factory=list)
    search: str = ""
    current_step: str | None = None
    step_selections: dict[str, WorkspaceSelection] = Field(default_factory=dict)
    history: list[ReaderNavigationEntry] = Field(default_factory=list)
    history_index: int = Field(default=-1, ge=-1)
    breadcrumb: list[ReaderNavigationEntry] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_history_index(self) -> WorkspaceReaderState:
        if not self.history and self.history_index != -1:
            raise ValueError("empty reader history requires history_index -1")
        if self.history and self.history_index >= len(self.history):
            raise ValueError("history_index is outside reader history")
        return self


ReceiptOutcome = Literal["accepted", "rejected", "partial", "pending"]


class ReceiptObject(WorkspaceModel):
    proposal_record_id: str = Field(min_length=1)
    outcome: ReceiptOutcome
    canonical_id: str | None = None
    reason: str | None = None
    dependencies: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_outcome(self) -> ReceiptObject:
        if self.outcome == "rejected" and not self.reason:
            raise ValueError("rejected receipt objects require a reason")
        if self.outcome == "accepted" and not self.canonical_id:
            raise ValueError("accepted receipt objects require the returned canonical id")
        return self


class IngestionReceipt(WorkspaceModel):
    """Ingestion outcome; canonical styling still requires a fresh read."""

    receipt_id: str = Field(min_length=1)
    proposal_id: str = Field(min_length=1)
    outcome: ReceiptOutcome
    objects: list[ReceiptObject] = Field(default_factory=list)
    fresh_canonical_read_required: Literal[True] = True


class GraphWorkspaceDocument(WorkspaceModel):
    """Top-level workspace wire document inherited by all authoring phases."""

    format: Literal["lcars-graph-workspace"] = "lcars-graph-workspace"
    version: Literal[1] = 1
    workspace_id: str = Field(min_length=1)
    canonical: CanonicalPlane
    proposal: ProposalPlane | None = None
    reader: WorkspaceReaderState = Field(default_factory=WorkspaceReaderState)
    receipt: IngestionReceipt | None = None

    @model_validator(mode="after")
    def _validate_plane_ownership(self) -> GraphWorkspaceDocument:
        canonical_ids = [record.id for record in self.canonical.records]
        if len(canonical_ids) != len(set(canonical_ids)):
            raise ValueError("canonical record ids must be unique")
        if self.proposal is not None:
            if self.proposal.base != self.canonical.graph:
                raise ValueError("proposal base must match the loaded canonical graph revision")
            if self.receipt is not None and self.receipt.proposal_id != self.proposal.proposal_id:
                raise ValueError("receipt proposal_id must match the workspace proposal")
        elif self.receipt is not None:
            raise ValueError("a receipt requires its proposal to remain in the workspace")
        return self


WorkspaceWireMessage: TypeAlias = Annotated[
    GraphWorkspaceDocument,
    Field(discriminator="format"),
]


__all__ = [
    "CanonicalPlane",
    "CompletenessState",
    "GraphRevision",
    "GraphWorkspaceDocument",
    "IngestionReceipt",
    "ProposalChange",
    "ProposalOperation",
    "ProposalPlane",
    "ReaderFilter",
    "ReaderFocus",
    "ReaderNavigationEntry",
    "ReceiptObject",
    "ReceiptOutcome",
    "ValidationFinding",
    "ValidationTarget",
    "WorkspaceCompleteness",
    "WorkspaceElementKind",
    "WorkspaceModel",
    "WorkspacePlane",
    "WorkspaceProjection",
    "WorkspaceProjectionBinding",
    "WorkspaceReaderState",
    "WorkspaceRecord",
    "WorkspaceSelection",
    "WorkspaceTreeNode",
    "WorkspaceTreeValue",
    "WorkspaceWireMessage",
]
