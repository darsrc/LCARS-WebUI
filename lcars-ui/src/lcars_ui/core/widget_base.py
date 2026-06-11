"""Widget base class and shared color primitives."""

from __future__ import annotations

from typing import Annotated, Literal, TypeAlias

from pydantic import BaseModel, Field, StringConstraints

LcarsNamedColor = Literal[
    # Legacy aliases (kept for DSL backwards compatibility).
    "orange",
    "red",
    "blue",
    "purple",
    "white",
    "yellow",
    # 2357 era
    "pale-canary",
    "tanoi",
    "golden-tanoi",
    "neon-carrot",
    "eggplant",
    "lilac",
    "anakiwa",
    "mariner",
    # 2369 era
    "bahama-blue",
    "blue-bell",
    "melrose",
    "hopbush",
    "chestnut-rose",
    "orange-peel",
    "atomic-tangerine",
    "danub",
    # 2375 era
    "indigo",
    "lavender-purple",
    "cosmic",
    "red-damask",
    "medium-carmine",
    "bourbon",
    "sandy-brown",
    "periwinkle",
    # 2379 era
    "dodger-pale",
    "dodger-soft",
    "near-blue",
    "navy-blue",
    "husk",
    "rust",
    "tamarillo",
]

HexColor = Annotated[str, StringConstraints(pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")]
LcarsColor: TypeAlias = LcarsNamedColor | HexColor
StrictWidgetRole = Literal["primary", "secondary", "terminal"]
StrictSurfaceVariant = Literal["readout_frame", "chart_frame"]


class BaseWidget(BaseModel):
    """Common fields shared by all LCARS widgets."""

    id: str = Field(description="Unique widget identifier used for event targeting.")
    type: str = Field(description="Widget type discriminator.")
    label: str | None = Field(default=None, description="Optional display or accessibility label.")
    strict_title: str | None = Field(
        default=None,
        description=(
            "Optional explicit strict-surface title override; "
            "blank suppresses the strict title band."
        ),
    )
    color: LcarsColor | None = Field(
        default=None,
        description="Optional LCARS palette color.",
    )
    strict_role: StrictWidgetRole | None = Field(
        default=None,
        description="Optional explicit strict composition role hint for manifest-native renderers.",
    )
    zone: Literal["primary", "side", "readout", "dock", "rail", "full"] | None = Field(
        default=None,
        description=(
            "Optional adaptive-layout placement hint overriding auto-placement: "
            "primary (main lane), side (support column), readout (metric strip), "
            "dock (controls), rail (into the menu spine), full (span the field)."
        ),
    )
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None,
        description="Optional strict surface rendering variant for manifest-native renderers.",
    )
    disabled: bool = Field(default=False, description="If true, interaction is disabled.")
    visible: bool = Field(default=True, description="If false, widget is removed from layout flow.")


__all__ = [
    "LcarsNamedColor",
    "HexColor",
    "LcarsColor",
    "StrictWidgetRole",
    "StrictSurfaceVariant",
    "BaseWidget",
]
