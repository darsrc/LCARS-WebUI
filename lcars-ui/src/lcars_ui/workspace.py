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

    format: Literal["lcars-structured-value"]
    version: Literal[1]
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

    @model_validator(mode="after")
    def _keep_projection_canonical(self) -> CanonicalPlane:
        if any(binding.plane != "canonical" for binding in self.projection.bindings):
            raise ValueError("canonical projections may contain only canonical bindings")
        return self


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


class WorkspaceChoice(WorkspaceModel):
    """One caller-supplied choice for a declarative field."""

    value: JsonValue
    label: str = Field(min_length=1)


class WorkspaceFieldSchema(WorkspaceModel):
    """How the library may present one caller-owned record or tree-part field."""

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    value_kind: Literal[
        "text",
        "number",
        "boolean",
        "choice",
        "reference",
        "reference_list",
        "object",
        "list",
        "tree",
        "unknown",
    ]
    required: bool = False
    structural: bool = True
    choices: list[WorkspaceChoice] = Field(default_factory=list)
    reference_kinds: list[str] = Field(default_factory=list)
    tree_schema: str | None = None
    description: str | None = None

    @model_validator(mode="after")
    def _validate_field_shape(self) -> WorkspaceFieldSchema:
        if self.value_kind == "choice" and not self.choices:
            raise ValueError(f"choice field {self.id!r} requires choices")
        if self.value_kind != "choice" and self.choices:
            raise ValueError(f"non-choice field {self.id!r} cannot declare choices")
        if self.value_kind == "tree" and not self.tree_schema:
            raise ValueError(f"tree field {self.id!r} requires tree_schema")
        if self.value_kind != "tree" and self.tree_schema is not None:
            raise ValueError(f"non-tree field {self.id!r} cannot declare tree_schema")
        if self.value_kind not in {"reference", "reference_list"} and self.reference_kinds:
            raise ValueError(
                f"non-reference field {self.id!r} cannot declare reference_kinds"
            )
        return self


class WorkspaceSearchField(WorkspaceModel):
    """A caller-declared searchable path and its diagnostic match label."""

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    path: str = Field(min_length=1)
    match: Literal["exact", "text", "token", "structural"] = "text"


class WorkspaceRecordAppearance(WorkspaceModel):
    """Caller-selected key into library-supported code-rendered geometry."""

    shape: str = Field(min_length=1)
    token: str = Field(min_length=1)
    color: str | None = None


class WorkspaceRecordSchema(WorkspaceModel):
    """One caller-owned record kind; LCARS assigns no meaning to its id."""

    kind: str = Field(min_length=1)
    label: str = Field(min_length=1)
    appearance: WorkspaceRecordAppearance
    fields: list[WorkspaceFieldSchema] = Field(default_factory=list)
    search_fields: list[WorkspaceSearchField] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_schema_ids(self) -> WorkspaceRecordSchema:
        for description, values in (
            ("field", [field.id for field in self.fields]),
            ("search field", [field.id for field in self.search_fields]),
        ):
            if len(values) != len(set(values)):
                raise ValueError(f"record kind {self.kind!r} has duplicate {description} ids")
        return self


class WorkspaceTreeSlotSchema(WorkspaceModel):
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    accepts: list[str] = Field(min_length=1)
    cardinality: Literal["one", "optional", "many"] = "one"
    ordered: bool = True


class WorkspaceTreePartSchema(WorkspaceModel):
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    token: str = Field(min_length=1)
    fields: list[WorkspaceFieldSchema] = Field(default_factory=list)
    slots: list[WorkspaceTreeSlotSchema] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_part_ids(self) -> WorkspaceTreePartSchema:
        field_ids = [field.id for field in self.fields]
        slot_ids = [slot.id for slot in self.slots]
        if len(field_ids) != len(set(field_ids)):
            raise ValueError(f"tree part {self.id!r} has duplicate field ids")
        if len(slot_ids) != len(set(slot_ids)):
            raise ValueError(f"tree part {self.id!r} has duplicate slot ids")
        return self


class WorkspaceTreeSchema(WorkspaceModel):
    """Caller-supplied structural vocabulary for one typed value editor."""

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    root_parts: list[str] = Field(min_length=1)
    parts: list[WorkspaceTreePartSchema] = Field(min_length=1)
    unsupported_parts: list[str] = Field(default_factory=list)
    limitation: str | None = None

    @model_validator(mode="after")
    def _validate_part_references(self) -> WorkspaceTreeSchema:
        part_ids = [part.id for part in self.parts]
        if len(part_ids) != len(set(part_ids)):
            raise ValueError(f"tree schema {self.id!r} has duplicate part ids")
        available = set(part_ids)
        for root in self.root_parts:
            if root not in available:
                raise ValueError(f"tree schema {self.id!r} has unknown root part {root!r}")
        for part in self.parts:
            for slot in part.slots:
                unknown = set(slot.accepts) - available
                if unknown:
                    raise ValueError(
                        f"tree schema {self.id!r} slot {part.id}.{slot.id} accepts "
                        f"unknown parts {sorted(unknown)!r}"
                    )
        return self


class WorkspaceValidationRule(WorkspaceModel):
    """Caller-owned declarative rule or server-validation declaration."""

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    scope: Literal["record", "field", "tree", "connection", "proposal", "submission"]
    severity: Literal["info", "warning", "error"] = "error"
    evaluator: Literal[
        "required", "allowed_values", "reference_kind", "tree_shape", "server", "custom"
    ]
    target_kinds: list[str] = Field(default_factory=list)
    field: str | None = None
    parameters: dict[str, JsonValue] = Field(default_factory=dict)
    message: str = Field(min_length=1)
    blocking: bool = True

    @model_validator(mode="after")
    def _keep_custom_semantics_server_owned(self) -> WorkspaceValidationRule:
        if self.evaluator == "custom" and self.scope not in {"proposal", "submission"}:
            raise ValueError("custom semantic validation must run at proposal or submission scope")
        return self


class WorkspaceAction(WorkspaceModel):
    """Caller-supplied action surfaced by later workspace render phases."""

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    scope: Literal["reader", "proposal", "submission"]
    transport: Literal["local", "server"] = "server"
    command: str = Field(min_length=1)
    confirmation: str | None = None
    metadata: dict[str, JsonValue] = Field(default_factory=dict)


class WorkspaceInteractionPolicy(WorkspaceModel):
    """Fixed counting convention for reproducible authoring-density tests.

    One unit is one intentional proposal command or one committed proposal
    field/group edit.  A command counts once even when it changes several
    records.  Every committed semantic choice counts, including accepting a
    suggestion.  Typing, pointer motion, implementation-level events,
    intermediate edits, reader commands, and passive previews count zero.
    """

    unit: Literal["committed_proposal_command_or_edit"] = Field(
        default="committed_proposal_command_or_edit",
        description=(
            "One intentional proposal command or one committed proposal field/group edit."
        ),
    )
    compound_command_units: Literal[1] = Field(
        default=1,
        description="A committed command counts once regardless of affected record count.",
    )
    committed_semantic_choices_count: Literal[True] = Field(
        default=True,
        description="A semantic decision counts even when accepting a supplied suggestion.",
    )
    keystrokes_count: Literal[False] = False
    pointer_moves_count: Literal[False] = False
    implementation_events_count: Literal[False] = Field(
        default=False,
        description="Individual DOM, React, React Flow, and transport events do not count.",
    )
    intermediate_edits_count: Literal[False] = False
    reader_commands_count: Literal[False] = False
    passive_previews_count: Literal[False] = False


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
        if any(binding.plane != "proposal" for binding in self.projection.bindings):
            raise ValueError("proposal projections may contain only proposal bindings")
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

    format: Literal["lcars-graph-workspace"]
    version: Literal[1]
    workspace_id: str = Field(min_length=1)
    interaction_policy: WorkspaceInteractionPolicy = Field(
        default_factory=WorkspaceInteractionPolicy
    )
    record_schemas: list[WorkspaceRecordSchema] = Field(default_factory=list)
    tree_schemas: list[WorkspaceTreeSchema] = Field(default_factory=list)
    validation_rules: list[WorkspaceValidationRule] = Field(default_factory=list)
    actions: list[WorkspaceAction] = Field(default_factory=list)
    canonical: CanonicalPlane
    proposal: ProposalPlane | None = None
    reader: WorkspaceReaderState = Field(default_factory=WorkspaceReaderState)
    receipt: IngestionReceipt | None = None

    @model_validator(mode="after")
    def _validate_plane_ownership(self) -> GraphWorkspaceDocument:
        for description, values in (
            ("record schema kinds", [schema.kind for schema in self.record_schemas]),
            ("tree schema ids", [schema.id for schema in self.tree_schemas]),
            ("validation rule ids", [rule.id for rule in self.validation_rules]),
            ("action ids", [action.id for action in self.actions]),
        ):
            if len(values) != len(set(values)):
                raise ValueError(f"workspace {description} must be unique")

        tree_schema_ids = {schema.id for schema in self.tree_schemas}
        for schema in self.record_schemas:
            for field in schema.fields:
                if field.tree_schema is not None and field.tree_schema not in tree_schema_ids:
                    raise ValueError(
                        f"record kind {schema.kind!r} references unknown tree schema "
                        f"{field.tree_schema!r}"
                    )

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


class WorkspaceCommand(WorkspaceModel):
    """Versioned upstream command emitted for one caller-supplied action."""

    format: Literal["lcars-graph-workspace-command"]
    version: Literal[1]
    command_id: str = Field(min_length=1)
    workspace_id: str = Field(min_length=1)
    action_id: str = Field(min_length=1)
    scope: Literal["reader", "proposal", "submission"]
    base: GraphRevision
    proposal_id: str | None = None
    proposal_revision: int | None = Field(default=None, ge=0)
    reader_revision: int = Field(ge=0)
    payload: dict[str, JsonValue] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validate_scope_revision(self) -> WorkspaceCommand:
        if self.scope in {"proposal", "submission"}:
            if self.proposal_id is None or self.proposal_revision is None:
                raise ValueError(
                    f"{self.scope} commands require proposal_id and proposal_revision"
                )
        elif self.proposal_id is not None or self.proposal_revision is not None:
            raise ValueError("reader commands cannot carry proposal identity or revision")
        return self


class WorkspaceResponse(WorkspaceModel):
    """Versioned mocked-or-real server response to a workspace command."""

    format: Literal["lcars-graph-workspace-response"]
    version: Literal[1]
    command_id: str = Field(min_length=1)
    workspace_id: str = Field(min_length=1)
    status: Literal["ok", "rejected", "conflict"]
    workspace: GraphWorkspaceDocument | None = None
    findings: list[ValidationFinding] = Field(default_factory=list)
    receipt: IngestionReceipt | None = None
    message: str | None = None

    @model_validator(mode="after")
    def _validate_result(self) -> WorkspaceResponse:
        if self.status == "ok" and self.workspace is None:
            raise ValueError("ok workspace responses require the authoritative workspace")
        if self.status in {"rejected", "conflict"} and not self.message:
            raise ValueError(f"{self.status} workspace responses require a message")
        if self.workspace is not None and self.workspace.workspace_id != self.workspace_id:
            raise ValueError("response workspace_id must match the returned workspace")
        return self


WorkspaceWireMessage: TypeAlias = Annotated[
    GraphWorkspaceDocument | WorkspaceCommand | WorkspaceResponse,
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
    "WorkspaceAction",
    "WorkspaceChoice",
    "WorkspaceCommand",
    "WorkspaceCompleteness",
    "WorkspaceElementKind",
    "WorkspaceFieldSchema",
    "WorkspaceInteractionPolicy",
    "WorkspaceModel",
    "WorkspacePlane",
    "WorkspaceProjection",
    "WorkspaceProjectionBinding",
    "WorkspaceReaderState",
    "WorkspaceRecord",
    "WorkspaceRecordAppearance",
    "WorkspaceRecordSchema",
    "WorkspaceResponse",
    "WorkspaceSearchField",
    "WorkspaceSelection",
    "WorkspaceTreeNode",
    "WorkspaceTreePartSchema",
    "WorkspaceTreeSchema",
    "WorkspaceTreeSlotSchema",
    "WorkspaceTreeValue",
    "WorkspaceValidationRule",
    "WorkspaceWireMessage",
]
