"""Semantic scene authoring DSL."""

from collections.abc import Generator, Sequence
from contextlib import contextmanager
from typing import Literal

from lcars_ui.core.models import (
    Family,
    SceneMode,
    ScenePolicy,
    SceneRegion,
    SceneRelation,
    SceneWidget,
)
from lcars_ui.dsl._api_helpers import _get_or_init_ctx, _require_builder, _resolve_id
from lcars_ui.dsl._builder import _ManifestBuilder


class _SceneContext:
    def __init__(self, builder: _ManifestBuilder) -> None:
        self._builder = builder
        self.regions: list[SceneRegion] = []
        self.relations: list[SceneRelation] = []
        self.modes: list[SceneMode] = []

    @contextmanager
    def region(
        self,
        region_id: str,
        *,
        label: str,
        role: Literal[
            "instrument", "commands", "context", "data", "detail", "alert", "viewer"
        ] = "instrument",
        subject: str | None = None,
        fold: Literal["never", "summary", "terminal"] = "summary",
        summary: str | None = None,
        slot: str | None = None,
        color: str | None = None,
    ) -> Generator[None, None, None]:
        widget = SceneRegion(
            id=region_id,
            label=label,
            role=role,
            subject=subject,
            fold=fold,
            summary=summary,
            slot=slot,
            color=color,
        )
        self.regions.append(widget)
        with self._builder.container_context(widget, target="children"):
            yield

    def _relation(
        self,
        kind: Literal["controls", "details", "compares", "feeds", "part_of", "recovers"],
        source: str,
        target: str,
        label: str | None,
        id: str | None,
    ) -> None:
        self.relations.append(
            SceneRelation(
                id=id if id is not None else f"{kind}-{source}-{target}",
                kind=kind,
                source=source,
                target=target,
                label=label,
            )
        )

    def controls(
        self, source: str, target: str, *, label: str | None = None, id: str | None = None
    ) -> None:
        self._relation("controls", source, target, label, id)

    def details(
        self, source: str, target: str, *, label: str | None = None, id: str | None = None
    ) -> None:
        self._relation("details", source, target, label, id)

    def compares(self, a: str, b: str, *, label: str | None = None, id: str | None = None) -> None:
        self._relation("compares", a, b, label, id)

    def feeds(
        self, source: str, target: str, *, label: str | None = None, id: str | None = None
    ) -> None:
        self._relation("feeds", source, target, label, id)

    def part_of(
        self, member: str, group: str, *, label: str | None = None, id: str | None = None
    ) -> None:
        self._relation("part_of", member, group, label, id)

    def recovers(
        self, source: str, target: str, *, label: str | None = None, id: str | None = None
    ) -> None:
        self._relation("recovers", source, target, label, id)

    def mode(
        self,
        mode_id: str,
        label: str,
        *,
        focal: Sequence[str],
        required: Sequence[str],
        optional: Sequence[str] = (),
        families: Sequence[Family] = ("wrap", "branch", "focus"),
        returns_to: str | None = None,
    ) -> None:
        self.modes.append(
            SceneMode(
                id=mode_id,
                label=label,
                focal=list(focal),
                required=list(required),
                optional=list(optional),
                families=list(families),
                returns_to=returns_to,
            )
        )


@contextmanager
def scene(
    *,
    initial_mode: str,
    id: str = "scene",
    context_terminal: bool = True,
    policy: ScenePolicy | None = None,
) -> Generator[_SceneContext, None, None]:
    """Declare a scene and validate its topology when the block completes."""
    builder = _require_builder(_get_or_init_ctx())
    scope = _SceneContext(builder)
    yield scope
    widget = SceneWidget(
        id=_resolve_id(id, id),
        initial_mode=initial_mode,
        context_terminal=context_terminal,
        policy=policy if policy is not None else ScenePolicy(),
        regions=scope.regions,
        relations=scope.relations,
        modes=scope.modes,
    )
    builder.add_widget(widget)
