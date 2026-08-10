"""Semantic widgets for The Web knowledge-graph client."""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field, model_validator

from lcars_ui.core.widget_base import BaseWidget, StrictWidgetRole

if TYPE_CHECKING:
    from lcars_ui.core.models import Widget

AtomType = Literal["empirical", "formal", "assumption"]
FrontierEdge = Literal["JUSTIFICATION", "DOMAIN", "PREREQUISITE", "PROVENANCE"]
NodeKind = Literal["assertion", "anchor", "gap", "framework", "quantity"]
ContextRole = Literal[
    "SEMANTIC_FRAMEWORK",
    "APPLICABILITY_DOMAIN",
    "SYSTEM_CLASS",
    "STATE_CONDITION",
    "PARAMETER_RESTRICTION",
]
AnchorType = Literal["empirical", "formal"]
AnchorPolarity = Literal["SUPPORTS", "EXCLUDES"]
TriStateResult = Literal["YES", "NO", "UNKNOWN"]
EvaluationMode = Literal["FAST", "EXACT"]
TriStateReason = Literal["label_truncated", "no_compatible_environment", "complete"]
ConstraintRepresentation = Literal[
    "INTERVAL",
    "INEQUALITY",
    "COVARIANCE",
    "LIKELIHOOD",
    "CONTOUR",
    "FUNCTION",
    "SAMPLES",
]
GapType = Literal["RELATIONAL", "MECHANISTIC", "REDUCTION", "EVIDENTIAL", "ONTOLOGICAL"]


class WebRef(BaseModel):
    """An identified, human-readable entity in The Web."""

    id: str
    label: str


class SupportAtom(WebRef):
    type: AtomType


class SupportEnvironment(BaseModel):
    atoms: list[SupportAtom] = Field(default_factory=list)


class SupportData(BaseModel):
    node: str
    truncated: bool = False
    environments: list[SupportEnvironment] = Field(default_factory=list)


class FrontierCurrent(WebRef):
    pass


class FrontierItem(WebRef):
    edge: FrontierEdge
    kind: NodeKind
    terminal: bool


class FrontierData(BaseModel):
    current: FrontierCurrent
    path: list[WebRef] = Field(default_factory=list)
    frontier: list[FrontierItem] = Field(default_factory=list)


class FrameworkRef(WebRef):
    pass


class ContextQualifier(BaseModel):
    qualifier: str
    label: str
    roles: list[ContextRole] = Field(min_length=1)


class AssertionData(BaseModel):
    id: str
    gloss: str
    canonical: bool
    framework: FrameworkRef
    context: list[ContextQualifier] = Field(default_factory=list)
    status: list[str] = Field(default_factory=list)


class SourceRef(BaseModel):
    id: str
    citation: str


class AnchorData(BaseModel):
    id: str
    type: AnchorType
    label: str
    polarity: AnchorPolarity
    source: SourceRef
    sibling_anchors: list[str] = Field(default_factory=list)
    inspectable: str
    status: list[Literal["retracted", "superseded"]] = Field(default_factory=list)


class TriStateData(BaseModel):
    query: str
    subject: str
    commitment: str
    result: TriStateResult
    mode: EvaluationMode
    reason: TriStateReason


class QuantityRef(WebRef):
    unit: str


class NumericInterval(BaseModel):
    min: float | None = None
    max: float | None = None

    @model_validator(mode="after")
    def _ordered_bounds(self) -> NumericInterval:
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("interval min must not exceed max")
        return self


class ConstraintCondition(NumericInterval):
    quantity: str
    unit: str


class PositionedClaim(WebRef):
    position: float | None = None


class ConstraintData(BaseModel):
    quantity: QuantityRef
    representation: ConstraintRepresentation
    excluded: NumericInterval
    confidence: str
    conditions: list[ConstraintCondition] = Field(default_factory=list)
    source: SourceRef
    claims: list[PositionedClaim] = Field(default_factory=list)


class GapContender(WebRef):
    environments: int = Field(ge=0)


class GapData(BaseModel):
    id: str
    type: GapType
    endpoints: list[WebRef] = Field(min_length=2, max_length=2)
    known_dependency: str
    missing: str
    contenders: list[GapContender] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)


class CommitmentOption(WebRef):
    assumptions: list[str] = Field(default_factory=list)


class CommitmentData(BaseModel):
    available: list[CommitmentOption] = Field(min_length=1)
    active: str
    supported_under: list[str] = Field(default_factory=list)
    empirically_grounded: list[str] = Field(default_factory=list)
    conflict_set: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _active_is_available(self) -> CommitmentData:
        if self.active not in {option.id for option in self.available}:
            raise ValueError("active commitment must occur in available")
        return self


class SupportPanel(BaseWidget):
    """Alternative support environments for one node."""

    type: Literal["support_panel"] = "support_panel"
    title: str
    data: SupportData
    show_atom_legend: bool = False
    children: list[Widget] = Field(default_factory=list)
    strict_role: StrictWidgetRole | None = "primary"


class Frontier(BaseWidget):
    """One-hop traversal control for a node and its immediate neighbours."""

    type: Literal["frontier"] = "frontier"
    data: FrontierData
    layer_filter: list[FrontierEdge] | None = None
    strict_role: StrictWidgetRole | None = "primary"


class AssertionCard(BaseWidget):
    """Primary assertion view with optional context qualifier rendering."""

    type: Literal["assertion_card"] = "assertion_card"
    data: AssertionData
    show_context: bool = False
    children: list[Widget] = Field(default_factory=list)
    strict_role: StrictWidgetRole | None = "primary"


class AnchorCard(BaseWidget):
    """Empirical or formal anchor and its source."""

    type: Literal["anchor_card"] = "anchor_card"
    data: AnchorData
    strict_role: StrictWidgetRole | None = "secondary"


class TriState(BaseWidget):
    """Neutral three-valued query result."""

    type: Literal["tri_state"] = "tri_state"
    data: TriStateData
    on_escalate: Literal["EXACT"] | None = None
    strict_role: StrictWidgetRole | None = "secondary"


class ConstraintBand(BaseWidget):
    """An excluded interval with positioned and uncommitted claims."""

    type: Literal["constraint_band"] = "constraint_band"
    data: ConstraintData
    strict_role: StrictWidgetRole | None = "primary"


class GapPanel(BaseWidget):
    """A missing explanatory bridge and optional contenders."""

    type: Literal["gap_panel"] = "gap_panel"
    data: GapData
    show_contenders: bool = False
    children: list[Widget] = Field(default_factory=list)
    strict_role: StrictWidgetRole | None = "primary"


class CommitmentSelector(BaseWidget):
    """Commitment-set selector with separate consequence sets."""

    type: Literal["commitment_selector"] = "commitment_selector"
    data: CommitmentData
    strict_role: StrictWidgetRole | None = "terminal"


__all__ = [
    "AnchorCard",
    "AnchorData",
    "AssertionCard",
    "AssertionData",
    "CommitmentData",
    "CommitmentSelector",
    "ConstraintBand",
    "ConstraintData",
    "Frontier",
    "FrontierData",
    "GapData",
    "GapPanel",
    "SupportData",
    "SupportPanel",
    "TriState",
    "TriStateData",
]
