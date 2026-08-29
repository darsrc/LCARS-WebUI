"""Widget base class and shared color primitives."""

from __future__ import annotations

from typing import TYPE_CHECKING, Annotated, Any, Literal, TypeAlias, get_args

from pydantic import (
    BaseModel,
    Field,
    StringConstraints,
    ValidationError,
    WrapValidator,
    field_validator,
    model_serializer,
)
from pydantic_core.core_schema import ValidatorFunctionWrapHandler

if TYPE_CHECKING:
    from lcars_ui.core.models import Widget

LcarsNamedColor = Literal[
    # Every token here resolves to a themed CSS accent in the renderer's
    # COLOR_VAR table (frontend/src/widgets/rendererShared.ts), and that is the
    # whole membership rule. A name the renderer cannot resolve would validate
    # cleanly and then paint nothing, which is the exact silent no-op this
    # release exists to remove — so the schema rejects it instead.
    #
    # Narrowing is the safe direction: adding a token back once the renderer
    # resolves it is a non-breaking schema widening, while shipping a name that
    # does nothing is permanent.
    "orange",
    "golden-tanoi",
    "pale-canary",
    "neon-carrot",
    "atomic-tangerine",
    "blue",
    "anakiwa",
    "mariner",
    "bahama-blue",
    "lilac",
    "hopbush",
    "eggplant",
    "red",
    "yellow",
    "white",
]

RENDERED_COLOR_TOKENS: tuple[str, ...] = get_args(LcarsNamedColor)
"""The named tokens ``color=`` accepts, in renderer order."""

# Okuda-era names that earlier releases accepted and the renderer never
# resolved. Kept only so the rejection message and ``lcars migrate`` can name
# them; they are not part of the schema.
RETIRED_COLOR_TOKENS: tuple[str, ...] = (
    "blue-bell",
    "bourbon",
    "chestnut-rose",
    "cosmic",
    "danub",
    "dodger-pale",
    "dodger-soft",
    "husk",
    "indigo",
    "lavender-purple",
    "medium-carmine",
    "melrose",
    "navy-blue",
    "near-blue",
    "orange-peel",
    "periwinkle",
    "purple",
    "red-damask",
    "rust",
    "sandy-brown",
    "tamarillo",
    "tanoi",
)

_HEX_COLOR_PATTERN = r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"

HexColor = Annotated[str, StringConstraints(pattern=_HEX_COLOR_PATTERN)]


def _describe_color_rejection(value: object) -> str:
    accepted = ", ".join(RENDERED_COLOR_TOKENS)
    if isinstance(value, str) and value.startswith("#"):
        return (
            f"{value!r} is not a valid LCARS color: a hex value must be "
            f"#rgb or #rrggbb. Named tokens accepted instead: {accepted}."
        )
    suffix = ""
    if isinstance(value, str) and value in RETIRED_COLOR_TOKENS:
        suffix = (
            " That token was accepted before v7 but never resolved to a themed"
            " accent, so it painted nothing; it was removed rather than left"
            " silently inert."
        )
    return (
        f"{value!r} is not a valid LCARS color. Accepted named tokens: "
        f"{accepted}. A hex value (#rgb or #rrggbb) is also accepted.{suffix}"
    )


def _validate_lcars_color(value: Any, handler: ValidatorFunctionWrapHandler) -> Any:
    """Replace the union's stacked branch errors with one message naming the token.

    Without this, a rejected ``color=`` surfaces as a two-branch union error
    (a literal mismatch plus a hex pattern mismatch) that buries the offending
    value. The wrap validator leaves the generated JSON Schema untouched — the
    enum and the hex pattern are still what a client validates against.
    """
    try:
        return handler(value)
    except ValidationError:
        raise ValueError(_describe_color_rejection(value)) from None


LcarsColor: TypeAlias = Annotated[
    LcarsNamedColor | HexColor, WrapValidator(_validate_lcars_color)
]
StrictWidgetRole = Literal["primary", "secondary", "terminal"]
StrictSurfaceVariant = Literal["readout_frame", "chart_frame"]
PanelAspect = Literal["wide", "tall", "square", "flex"]
LayoutSizing = Literal["fill", "content"]
HintTrigger = Literal["hover", "focus", "click", "press", "always", "manual"]
HintPlacement = Literal["auto", "top", "bottom", "left", "right"]


def _default_hint_triggers() -> list[HintTrigger]:
    return ["hover", "focus"]


class Hint(BaseModel):
    """A floating surface attached to a widget.

    A hint carries either plain ``text`` (the common case) or a full ``children``
    widget subtree, so the same field covers a one-line label and a pop-up video.
    """

    text: str | None = Field(default=None, description="Plain-text hint body.")
    title: str | None = Field(default=None, description="Optional hint head band title.")
    children: list[Widget] = Field(
        default_factory=list,
        description="Widgets rendered inside the hint surface, declared via lcars.hint().",
    )
    trigger: list[HintTrigger] = Field(
        default_factory=_default_hint_triggers,
        description=(
            "How the hint opens: hover (pointer, after delay_ms), focus (keyboard), "
            "click (tap to pin open), press (touch long-press), always (pinned open), "
            "manual (server-driven via lcars.show_hint/hide_hint)."
        ),
    )
    placement: HintPlacement = Field(
        default="auto",
        description=(
            "Preferred side relative to the widget. auto picks the side with room; "
            "any explicit side still flips and shifts to stay on screen."
        ),
    )
    delay_ms: int = Field(default=250, ge=0, le=5000, description="Hover open delay.")
    hide_delay_ms: int = Field(
        default=120,
        ge=0,
        le=5000,
        description="Grace period before closing so the pointer can travel into the hint.",
    )
    max_width: int | None = Field(
        default=None,
        ge=80,
        le=1200,
        description="Optional px cap on hint width; defaults to the stylesheet value.",
    )
    dismissible: bool = Field(
        default=True, description="If true, a pinned hint shows a close affordance."
    )
    open: bool | None = Field(
        default=None,
        description=(
            "Manual open state for trigger='manual'. None leaves the hint under "
            "renderer control."
        ),
    )


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
    span: tuple[int, int] | None = Field(
        default=None,
        description=(
            "Optional explicit mosaic footprint as [columns, rows]. Overrides the "
            "size the renderer derives from the panel's content."
        ),
    )
    weight: int | None = Field(
        default=None,
        ge=1,
        le=12,
        description=(
            "Optional 1-12 importance. Heavier panels anchor the mosaic first and "
            "are sized up relative to their neighbours."
        ),
    )
    aspect: PanelAspect | None = Field(
        default=None,
        description=(
            "Optional aspect override for adaptive placement: wide (spans columns), "
            "tall (spans rows), square, or flex."
        ),
    )
    group: str | None = Field(
        default=None,
        description=(
            "Optional cluster key. Panels sharing a group are packed adjacent so a "
            "control sits beside the instrument it drives."
        ),
    )
    sizing: LayoutSizing | None = Field(
        default=None,
        description=(
            "Optional adaptive-layout sizing override. 'fill' lets a top-level panel "
            "absorb free deck space; 'content' keeps it at its intrinsic size."
        ),
    )
    hint: Hint | None = Field(
        default=None,
        description=(
            "Optional floating hint shown on hover, focus, tap or on demand. A bare "
            "string is accepted as shorthand for a text-only hint."
        ),
    )
    strict_surface_variant: StrictSurfaceVariant | None = Field(
        default=None,
        description="Optional strict surface rendering variant for manifest-native renderers.",
    )
    disabled: bool = Field(default=False, description="If true, interaction is disabled.")
    visible: bool = Field(default=True, description="If false, widget is removed from layout flow.")

    @field_validator("hint", mode="before")
    @classmethod
    def _coerce_hint(cls, value: Any) -> Any:
        """Accept ``hint="text"`` as shorthand for a text-only hint."""
        if isinstance(value, str):
            return Hint(text=value)
        return value

    @model_serializer(mode="wrap")
    def _omit_unused_v4_options(self, handler: Any) -> dict[str, Any]:
        """Keep legacy widget payloads stable when enhanced options are unused."""
        data: dict[str, Any] = handler(self)
        if data.get("options") is None:
            data.pop("options", None)
        if data.get("settings") is None:
            data.pop("settings", None)
        return data


__all__ = [
    "LcarsNamedColor",
    "RENDERED_COLOR_TOKENS",
    "RETIRED_COLOR_TOKENS",
    "HexColor",
    "LcarsColor",
    "StrictWidgetRole",
    "StrictSurfaceVariant",
    "PanelAspect",
    "LayoutSizing",
    "HintTrigger",
    "HintPlacement",
    "Hint",
    "BaseWidget",
]
