"""Build-mode regression guards for every shipped example."""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from pathlib import Path

import pytest

from lcars_ui import App
from lcars_ui.core.models import Manifest

EXAMPLES_ROOT = Path(__file__).resolve().parents[2] / "examples"
SURFACE_GAUNTLET = "examples.surface_gauntlet.app"


@dataclass(frozen=True)
class ExampleCase:
    module_name: str
    screen: str | None = None

    def test_id(self) -> str:
        example_name = self.module_name.removeprefix("examples.").removesuffix(".app")
        return f"{example_name}-{self.screen}" if self.screen is not None else example_name


def _module_name(path: Path) -> str:
    return ".".join(path.relative_to(EXAMPLES_ROOT.parent).with_suffix("").parts)


def _discover_example_modules() -> tuple[str, ...]:
    root_examples = (
        path for path in EXAMPLES_ROOT.glob("*.py") if path.name != "__init__.py"
    )
    package_examples = EXAMPLES_ROOT.rglob("app.py")
    return tuple(sorted(_module_name(path) for path in (*root_examples, *package_examples)))


def _example_cases() -> tuple[ExampleCase, ...]:
    modules = _discover_example_modules()
    gauntlet = importlib.import_module(SURFACE_GAUNTLET)
    screens = gauntlet.SCREENS

    return tuple(
        ExampleCase(module_name, screen)
        for module_name in modules
        for screen in (screens if module_name == SURFACE_GAUNTLET else (None,))
    )


@pytest.mark.parametrize("case", _example_cases(), ids=ExampleCase.test_id)
def test_example_builds_nonempty_manifest(
    case: ExampleCase,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    module = importlib.import_module(case.module_name)
    if case.screen is not None:
        monkeypatch.setenv("LCARS_GAUNTLET_SCREEN", case.screen)
        monkeypatch.setattr(module, "SCREEN", case.screen)

    app = getattr(module, "app", None)
    assert isinstance(app, App), f"{module.__name__} must expose app = App()"
    manifest = app.build_manifest()
    assert isinstance(manifest, Manifest)
    assert manifest.pages
