"""Typed application and framework keyboard-binding behavior."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from lcars_ui import App, KeyBinding
from lcars_ui.core.models import key_chords_conflict, normalize_key_chord


def test_key_chords_normalize_to_one_portable_shape() -> None:
    assert normalize_key_chord("Shift + Primary + K") == "mod+shift+k"
    assert normalize_key_chord("alt+f12") == "alt+f12"
    assert normalize_key_chord("mod+plus") == "mod+plus"
    assert KeyBinding(
        id="action.search",
        label="Search",
        chord="Control + K",
        action_id="search",
    ).chord == "ctrl+k"
    assert key_chords_conflict("mod+k", "ctrl+k")
    assert key_chords_conflict("mod+k", "meta+k")
    assert not key_chords_conflict("mod+k", "alt+k")


@pytest.mark.parametrize(
    "chord",
    ["ctrl", "ctrl++k", "ctrl+k+j", "ctrl+ctrl+k", "ctrl+launch"],
)
def test_key_chords_reject_ambiguous_or_unsupported_shapes(chord: str) -> None:
    with pytest.raises((ValueError, ValidationError)):
        KeyBinding(
            id="action.search",
            label="Search",
            chord=chord,
            action_id="search",
        )


def test_app_binding_joins_framework_defaults_and_dispatch_metadata() -> None:
    app = App()
    app.config("Key Console")
    binding = app.bind_key("mod+k", "search", label="Search records")

    manifest = app.build_manifest()
    by_id = {item.id: item for item in manifest.meta.key_bindings}

    assert binding.id == "action.search"
    assert by_id["interface.open_options"].chord == "mod+,"
    assert by_id["graph.undo"].scope == "graph_canvas"
    assert by_id["action.search"].action_id == "search"
    assert by_id["action.search"].chord == "mod+k"


def test_app_can_override_or_disable_a_framework_default_by_id() -> None:
    app = App()
    app.config(
        "Override Console",
        key_bindings=[
            KeyBinding(
                id="graph.copy",
                label="Copy graph selection",
                chord=None,
                command="graph_copy",
                scope="graph_canvas",
            )
        ],
    )

    manifest = app.build_manifest()
    copies = [item for item in manifest.meta.key_bindings if item.id == "graph.copy"]
    assert len(copies) == 1
    assert copies[0].chord is None


def test_same_chord_in_one_scope_is_rejected_instead_of_dispatching_ambiguously() -> None:
    app = App()
    app.config("Conflict Console")
    app.bind_key("mod+,", "search", label="Search records")

    with pytest.raises(ValidationError, match="duplicate key chord"):
        app.build_manifest()


def test_binding_target_and_scope_must_agree() -> None:
    with pytest.raises(ValidationError, match="graph commands require"):
        KeyBinding(
            id="graph.copy",
            label="Copy graph selection",
            chord="mod+c",
            command="graph_copy",
            scope="global",
        )
    with pytest.raises(ValidationError, match="exactly one"):
        KeyBinding(
            id="action.invalid",
            label="Invalid",
            chord="mod+i",
            action_id="invalid",
            command="open_options",
        )
