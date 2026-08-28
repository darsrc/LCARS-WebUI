"""Unit tests for widget hints (floating tooltips/popovers)."""

from __future__ import annotations

import pytest

from lcars_ui import advanced, ui
from lcars_ui.core.widget_base import BaseWidget, Hint
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _Config, _LCARSContext, set_ctx


def _build_ctx() -> _LCARSContext:
    ctx = _LCARSContext(session_id="test", builder=_ManifestBuilder())
    set_ctx(ctx)
    return ctx


def _find(ctx: _LCARSContext, widget_id: str) -> BaseWidget:
    assert ctx.builder is not None
    found = ctx.builder.find_widget(widget_id)
    assert found is not None, f"widget {widget_id!r} not found"
    return found


def test_hint_kwarg_accepts_a_bare_string() -> None:
    ctx = _build_ctx()
    ui.text("Hello", id="greet", hint="A greeting")

    hint = _find(ctx, "greet").hint
    assert isinstance(hint, Hint)
    assert hint.text == "A greeting"
    # Defaults: a plain hint behaves like a classic tooltip.
    assert hint.trigger == ["hover", "focus"]
    assert hint.placement == "auto"


def test_hint_kwarg_survives_serialization_as_an_object() -> None:
    """A raw string assigned post-construction would break the contract."""
    ctx = _build_ctx()
    ui.text("Hello", id="greet", hint="A greeting")

    assert ctx.builder is not None
    dumped = ctx.builder.build(_Config(name="T")).model_dump(mode="json")

    hints: list[dict] = []

    def walk(node: object) -> None:
        if isinstance(node, dict):
            if isinstance(node.get("hint"), dict):
                hints.append(node["hint"])
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(dumped)
    assert any(h["text"] == "A greeting" for h in hints)


def test_hint_widget_defaults_to_none() -> None:
    ctx = _build_ctx()
    ui.text("Plain", id="plain")
    assert _find(ctx, "plain").hint is None


def test_hint_block_attaches_widget_children() -> None:
    ctx = _build_ctx()
    ui.button("Engage", id="engage")
    with ui.hint("engage", trigger="click", placement="right", title="Warp"):
        ui.text("Core status", id="core-status")
        advanced.video_hls(src="/media/core.m3u8", id="core-video")

    hint = _find(ctx, "engage").hint
    assert isinstance(hint, Hint)
    assert hint.title == "Warp"
    assert hint.trigger == ["click"]
    assert hint.placement == "right"
    assert [child.type for child in hint.children] == ["text", "video_hls"]


def test_hint_block_without_target_attaches_to_the_last_widget() -> None:
    ctx = _build_ctx()
    ui.toggle("Shields", id="shields")
    with ui.hint():
        ui.text("Raises deflector", id="deflector")

    hint = _find(ctx, "shields").hint
    assert isinstance(hint, Hint)
    assert [child.id for child in hint.children] == ["deflector"]


def test_hint_block_preserves_text_from_the_kwarg() -> None:
    ctx = _build_ctx()
    ui.button("Engage", id="engage", hint="Initiates warp drive")
    with ui.hint("engage", trigger="click"):
        ui.text("Detail", id="detail")

    hint = _find(ctx, "engage").hint
    assert isinstance(hint, Hint)
    assert hint.text == "Initiates warp drive"
    assert hint.trigger == ["click"]
    assert len(hint.children) == 1


def test_hint_block_accepts_a_trigger_list() -> None:
    ctx = _build_ctx()
    ui.button("Engage", id="engage")
    with ui.hint("engage", trigger=["hover", "press"]):
        ui.text("Detail", id="detail")

    hint = _find(ctx, "engage").hint
    assert isinstance(hint, Hint)
    assert hint.trigger == ["hover", "press"]


def test_hint_block_rejects_an_unknown_target() -> None:
    _build_ctx()
    with pytest.raises(ValueError, match="has not been declared"):
        with ui.hint("nope"):
            ui.text("Detail", id="detail")


def test_hint_block_without_any_widget_declared_is_an_error() -> None:
    _build_ctx()
    with pytest.raises(ValueError, match="must follow a widget declaration"):
        with ui.hint():
            ui.text("Detail", id="detail")


def test_hint_attaches_to_a_widget_nested_in_a_container() -> None:
    ctx = _build_ctx()
    with ui.box("Systems"):
        ui.button("Engage", id="engage")
        with ui.hint("engage"):
            ui.text("Detail", id="detail")

    hint = _find(ctx, "engage").hint
    assert isinstance(hint, Hint)
    assert [child.id for child in hint.children] == ["detail"]


def test_hint_children_do_not_leak_into_the_page() -> None:
    """Widgets declared in a hint belong to the hint, not the surrounding column."""
    ctx = _build_ctx()
    ui.button("Engage", id="engage")
    with ui.hint("engage"):
        ui.text("Detail", id="detail")

    assert ctx.builder is not None
    manifest = ctx.builder.build(_Config(name="T"))
    top_level_ids = [
        widget.id
        for row in manifest.pages["main"].rows
        for column in row.columns
        for widget in column.widgets
    ]
    assert "detail" not in top_level_ids


def test_show_and_hide_hint_emit_widget_updates() -> None:
    ctx = _LCARSContext(session_id="test", pending_events=[])
    set_ctx(ctx)

    ui.show_hint("engage")
    ui.hide_hint("engage")

    payloads = [event.payload for event in ctx.pending_events]
    assert [p.data for p in payloads] == [{"hint": {"open": True}}, {"hint": {"open": False}}]
    assert all(p.id == "engage" for p in payloads)
