"""Server-driven graph proposal workspace widget."""

from __future__ import annotations

from typing import Literal

from pydantic import Field, model_validator

from lcars_ui.core.widget_base import (
    BaseWidget,
    LcarsColor,
    StrictSurfaceVariant,
    StrictWidgetRole,
)
from lcars_ui.widgets.options import BaseOptions, InteractionOptions
from lcars_ui.workspace import GraphWorkspaceDocument, WorkspaceModel


class GraphWorkspaceOptions(BaseOptions):
    """General presentation and interaction capabilities for a workspace."""

    interaction: InteractionOptions | None = None
    canonical_title: str = "Canonical · read only"
    proposal_title: str = "Proposal · working plane"
    canonical_collapsed: bool = False
    fan_page_size: int = Field(default=20, ge=1, le=200)
    virtual_row_height: int = Field(default=40, ge=24, le=120)
    autosave_key: str | None = None
    autosave_delay_ms: int = Field(default=500, ge=0, le=60_000)


class GraphWorkspaceState(WorkspaceModel):
    """Serializable state emitted at a workspace transaction boundary."""

    type: Literal["graph_workspace_state"] = "graph_workspace_state"
    workspace: GraphWorkspaceDocument
    last_event: str | None = None


class GraphWorkspace(BaseWidget):
    """Canonical graph plus a visually and transactionally separate proposal."""

    type: Literal["graph_workspace"] = "graph_workspace"
    workspace: GraphWorkspaceDocument
    options: GraphWorkspaceOptions | None = None
    color: LcarsColor | None = None
    strict_role: StrictWidgetRole | None = None
    strict_title: str | None = None
    strict_surface_variant: StrictSurfaceVariant | None = None

    @model_validator(mode="after")
    def _require_proposal_for_editing(self) -> GraphWorkspace:
        if self.workspace.proposal is None:
            raise ValueError("graph_workspace requires a proposal plane")
        return self


__all__ = ["GraphWorkspace", "GraphWorkspaceOptions", "GraphWorkspaceState"]
