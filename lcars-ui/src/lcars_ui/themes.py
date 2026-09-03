"""Project-local TOML theme discovery and validation."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Literal

import tomli
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from lcars_ui.core.models import (
    BUILT_IN_THEMES,
    BuiltInTheme,
    ThemeColors,
    ThemeDefinition,
    ThemeFonts,
    built_in_theme_catalog,
)

_THEME_ID = re.compile(r"^[a-z0-9][a-z0-9_-]*$")


class ThemeError(ValueError):
    """Raised when a project theme file is not safe or valid."""


class _ThemeFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1]
    label: str
    extends: BuiltInTheme
    colors: ThemeColors = Field(default_factory=ThemeColors)
    fonts: ThemeFonts = Field(default_factory=ThemeFonts)

    @field_validator("label")
    @classmethod
    def _nonempty_label(cls, value: str) -> str:
        label = value.strip()
        if not label:
            raise ValueError("must not be blank")
        return label

def load_theme_catalog(directory: Path) -> list[ThemeDefinition]:
    """Load custom ``*.toml`` themes after the immutable built-in catalogue."""
    catalog = built_in_theme_catalog()
    if not directory.exists():
        return catalog
    if not directory.is_dir():
        raise ThemeError(f"{directory}: themes path is not a directory")

    reserved_ids = {theme_id for theme_id, _label in BUILT_IN_THEMES}
    for path in sorted(directory.glob("*.toml"), key=lambda candidate: candidate.name):
        if path.name.startswith("."):
            continue
        theme_id = path.stem
        if not _THEME_ID.fullmatch(theme_id):
            raise ThemeError(
                f"{path}: filename must produce a lowercase theme id matching "
                "[a-z0-9][a-z0-9_-]*"
            )
        if theme_id in reserved_ids:
            raise ThemeError(f"{path}: theme id {theme_id!r} is reserved by a built-in theme")

        try:
            with path.open("rb") as stream:
                raw = tomli.load(stream)
        except (OSError, tomli.TOMLDecodeError) as error:
            raise ThemeError(f"{path}: invalid TOML: {error}") from error

        try:
            parsed = _ThemeFile.model_validate(raw)
        except ValidationError as error:
            details: list[str] = []
            for item in error.errors(include_url=False):
                field = ".".join(str(part) for part in item["loc"])
                message = str(item["msg"])
                if message.startswith("Value error, "):
                    message = message.removeprefix("Value error, ")
                details.append(f"{field}: {message}")
            raise ThemeError(f"{path}: " + "; ".join(details)) from error

        catalog.append(
            ThemeDefinition(
                id=theme_id,
                label=parsed.label,
                base=parsed.extends,
                colors=parsed.colors,
                fonts=parsed.fonts,
            )
        )
    return catalog


__all__ = ["ThemeError", "load_theme_catalog"]
