"""Semantic widgets for knowledge-graph clients."""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field, model_validator

from lcars_ui.core.widget_base import BaseWidget, StrictWidgetRole

if TYPE_CHECKING:
    from lcars_ui.core.models import Widget

AtomType = Literal["empirical", "formal", "assumption"]
TriStateResult = Literal["YES", "NO", "UNKNOWN"]
EvaluationMode = Literal["FAST", "EXACT"]
TriStateReason = Literal["label_truncated", "no_compatible_environment", "complete"]
CompletenessState = Literal["complete", "partial"]


class WebRef(BaseModel):
    """An identified, human-readable entity in a knowledge graph."""

    id: str
    label: str


class SupportAtom(WebRef):
    type: AtomType


class SupportEnvironment(BaseModel):
    atoms: list[SupportAtom] = Field(default_factory=list)


class SupportCompleteness(BaseModel):
    """Structured completeness metadata for a :class:`SupportData` result.

    ``state`` is the source of truth. ``SupportData.truncated`` is kept as a
    read-only compatibility projection (``state == "partial"``) for older
    consumers that only understand the boolean.
    """

    state: CompletenessState = "complete"
    returned: int | None = Field(default=None, ge=0)
    total: int | None = Field(default=None, ge=0)
    reason: str | None = None

    @property
    def unsafe_for_negative_conclusions(self) -> bool:
        """Whether an absence/negative conclusion drawn from this result may be wrong."""
        return self.state == "partial"


class SupportData(BaseModel):
    node: str
    truncated: bool = False
    completeness: SupportCompleteness = Field(default_factory=SupportCompleteness)
    environments: list[SupportEnvironment] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _derive_completeness_or_truncated(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        has_completeness = data.get("completeness") is not None
        has_truncated = "truncated" in data
        if has_completeness and not has_truncated:
            completeness = data["completeness"]
            completeness_state = (
                completeness.get("state", "complete")
                if isinstance(completeness, dict)
                else getattr(completeness, "state", "complete")
            )
            data = {**data, "truncated": completeness_state == "partial"}
        elif has_truncated and not has_completeness:
            truncated_state: CompletenessState = "partial" if data["truncated"] else "complete"
            data = {**data, "completeness": {"state": truncated_state}}
        return data

    @model_validator(mode="after")
    def _completeness_truncated_consistent(self) -> SupportData:
        if (self.completeness.state == "partial") != self.truncated:
            raise ValueError(
                "SupportData.truncated must match completeness.state == 'partial'"
            )
        return self


class TriStateData(BaseModel):
    query: str
    target: str
    scope: str
    result: TriStateResult
    mode: EvaluationMode
    reason: TriStateReason


class SupportPanel(BaseWidget):
    """Alternative support environments for one node."""

    type: Literal["support_panel"] = "support_panel"
    title: str
    data: SupportData
    show_environments: bool = True
    show_legend: bool = False
    children: list[Widget] = Field(default_factory=list)
    strict_role: StrictWidgetRole | None = "primary"


class TriState(BaseWidget):
    """Neutral three-valued query result."""

    type: Literal["tri_state"] = "tri_state"
    data: TriStateData
    on_escalate: Literal["EXACT"] | None = None
    strict_role: StrictWidgetRole | None = "secondary"


__all__ = [
    "SupportCompleteness",
    "SupportData",
    "SupportPanel",
    "TriState",
    "TriStateData",
]
