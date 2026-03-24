"""Phase 12 visual-language contract tests."""

from __future__ import annotations

from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _Config
from lcars_ui.widgets.containers import LcarsBracket
from lcars_ui.widgets.primitives import StatusTile, Text


def test_visual_language_defaults_to_strict() -> None:
    builder = _ManifestBuilder()
    builder.add_widget(Text(id="txt_1", content="Bridge"))

    manifest = builder.build(_Config(name="Phase 12"))

    assert manifest.meta.visual_language == "strict"
    assert manifest.meta.strict_renderer == "legacy"
    main_widgets = manifest.pages["main"].rows[0].columns[0].widgets
    assert main_widgets[0].type == "lcars_bracket"
    assert main_widgets[0].children[0].id == "txt_1"


def test_classic_visual_language_preserves_unwrapped_widgets() -> None:
    builder = _ManifestBuilder()
    builder.add_widget(Text(id="txt_2", content="Classic"))

    manifest = builder.build(_Config(name="Classic", visual_language="classic"))

    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    assert manifest.meta.visual_language == "classic"
    assert manifest.meta.strict_renderer == "legacy"
    assert widgets[0].type == "text"


def test_strict_auto_wrap_respects_existing_structural_widgets() -> None:
    builder = _ManifestBuilder()
    builder.add_widget(Text(id="txt_left", content="Left block"))
    builder.add_widget(
        LcarsBracket(
            id="existing_bracket",
            color="anakiwa",
            orientation="both",
            children=[Text(id="txt_inside", content="Inside existing")],
        )
    )
    builder.add_widget(StatusTile(id="status_right", value="READY", status="ok"))

    manifest = builder.build(_Config(name="Strict"))

    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    assert [widget.type for widget in widgets] == [
        "lcars_bracket",
        "lcars_bracket",
        "lcars_bracket",
    ]
    assert widgets[1].id == "existing_bracket"
    assert widgets[0].children[0].id == "txt_left"
    assert widgets[2].children[0].id == "status_right"
