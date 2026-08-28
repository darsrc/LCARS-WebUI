"""Phase 11 DSL coverage for containers and new input controls."""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx
from lcars_ui.widgets.inputs import FileUpload


def _build_manifest(ui_fn):
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)
    ui_fn()
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config)


def test_box_container_dsl_builds_children_and_side_inputs() -> None:
    def ui() -> None:
        lcars.config("Phase11")
        with lcars.box(title="Systems", corners=[1, 4], color="golden-tanoi") as box:
            with box.left_inputs():
                lcars.button("Run Scan", id="run-scan")
            with box.right_inputs():
                lcars.checkbox("Auto", id="auto-checkbox")
            lcars.header("Subsystems", size="h3", color="pale-canary")
            lcars.metric("Warp Core", "Online")

    manifest = _build_manifest(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    container = next(widget for widget in widgets if widget.type == "lcars_box")
    assert container.title == "Systems"
    assert container.color == "golden-tanoi"
    assert len(container.children) == 2
    assert len(container.left_inputs or []) == 1
    assert len(container.right_inputs or []) == 1
    assert container.children[0].type == "lcars_header"


def test_sweep_and_bracket_contexts_build_nested_children() -> None:
    def ui() -> None:
        lcars.config("Phase11")
        with lcars.sweep(title="Ops", color="anakiwa"):
            lcars.text("Sweep body")
        with lcars.bracket(color="lilac", orientation="both"):
            lcars.text("Bracket body")

    manifest = _build_manifest(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    sweep = next(widget for widget in widgets if widget.type == "lcars_sweep")
    bracket = next(widget for widget in widgets if widget.type == "lcars_bracket")
    assert len(sweep.children) == 1
    assert len(bracket.children) == 1


def test_mic_button_dsl_passes_continuous_and_silence_ms() -> None:
    def ui() -> None:
        lcars.config("Phase11")
        lcars.mic_button("voice-command", id="mic", continuous=True, silence_ms=600)

    manifest = _build_manifest(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    bracket = next(widget for widget in widgets if widget.type == "lcars_bracket")
    mic = next(widget for widget in bracket.children if widget.type == "mic_button")
    assert mic.continuous is True
    assert mic.silence_ms == 600


def test_text_input_dsl_passes_autocomplete() -> None:
    def ui() -> None:
        lcars.config("Phase11")
        lcars.text_input("Command", id="command-input", autocomplete=False)

    manifest = _build_manifest(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    bracket = next(widget for widget in widgets if widget.type == "lcars_bracket")
    text_input = next(widget for widget in bracket.children if widget.type == "text_input")
    assert text_input.autocomplete is False


def test_log_dsl_passes_auto_scroll() -> None:
    def ui() -> None:
        lcars.config("Phase11")
        lcars.log("ops-log", id="ops-log-widget", auto_scroll=False)

    manifest = _build_manifest(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    bracket = next(widget for widget in widgets if widget.type == "lcars_bracket")
    log_widget = next(widget for widget in bracket.children if widget.type == "log_viewer")
    assert log_widget.auto_scroll is False


def test_file_upload_builds_and_returns_declared_widget() -> None:
    def ui() -> FileUpload:
        lcars.config("Phase11", settings_page=False)
        return lcars.file_upload(
            "Training Data",
            action_id="receive-training-data",
            accept=".json, application/json",
            max_files=2,
            id="training-upload",
        )

    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)
    widget = ui()
    assert isinstance(widget, FileUpload)
    assert ctx.builder is not None
    manifest = ctx.builder.build(ctx.config)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    bracket = next(widget for widget in widgets if widget.type == "lcars_bracket")
    upload = next(widget for widget in bracket.children if widget.type == "file_upload")
    assert upload.accept == [".json", "application/json"]
    assert upload.max_files == 2

def test_popup_is_a_top_level_overlay_with_normalized_children() -> None:
    def ui() -> None:
        lcars.config("Phase11", settings_page=False)
        with lcars.popup(
            "Transfer Details",
            modal=False,
            position=(72, 96),
            close_action_id="close-transfer",
            id="transfer-popup",
        ):
            lcars.text("Payload accepted.", id="transfer-copy")

    manifest = _build_manifest(ui)
    widgets = manifest.pages["main"].rows[0].columns[0].widgets
    popup = next(widget for widget in widgets if widget.type == "popup")

    assert popup.modal is False
    assert popup.position == (72, 96)
    assert popup.close_action_id == "close-transfer"
    assert popup.children


def test_notify_supports_levels_titles_and_window_behaviour() -> None:
    ctx = _LCARSContext(pending_events=[])
    set_ctx(ctx)

    lcars.notify(
        "Transfer complete.",
        level="success",
        title="Files",
        duration_ms=2400,
        dismissible=False,
        movable=False,
    )

    payload = ctx.pending_events[0].payload
    assert payload.model_dump(mode="json") == {
        "message": "Transfer complete.",
        "level": "success",
        "title": "Files",
        "duration_ms": 2400,
        "dismissible": False,
        "movable": False,
    }
