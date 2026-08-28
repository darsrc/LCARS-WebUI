"""Unit tests for Phase 1 widget modeling and discrimination."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from lcars_ui.core.models import Column
from lcars_ui.widgets.containers import LcarsBox, LcarsBracket, LcarsHeader, LcarsSweep, Popup
from lcars_ui.widgets.data import LineChart, Sparkline, Table
from lcars_ui.widgets.inputs import (
    Button,
    Checkbox,
    FileUpload,
    Form,
    Radio,
    RadioToggle,
    Select,
    TextInput,
    Toggle,
)
from lcars_ui.widgets.media import LogViewer, MicButton, VideoHls
from lcars_ui.widgets.primitives import Alert, StatusTile, Text, WebUISettings
from lcars_ui.widgets.web import SupportPanel, TriState


def _widget_type(model: type) -> str:
    return model.model_fields["type"].default


def test_widget_type_literals_are_unique_across_all_widgets() -> None:
    widget_models = [
        Text,
        StatusTile,
        Alert,
        Button,
        Toggle,
        Checkbox,
        Select,
        Radio,
        RadioToggle,
        TextInput,
        FileUpload,
        Form,
        Table,
        LineChart,
        Sparkline,
        LogViewer,
        VideoHls,
        MicButton,
        LcarsBox,
        LcarsSweep,
        LcarsBracket,
        LcarsHeader,
        Popup,
        WebUISettings,
        SupportPanel,
        TriState,
    ]

    type_values = [_widget_type(model) for model in widget_models]

    assert len(type_values) == len(set(type_values))


def test_file_upload_defaults_are_bounded_and_terminal() -> None:
    upload = FileUpload(id="upload", action_id="receive-files")

    assert upload.upload_url == "/lcars/upload/files"
    assert upload.multiple is True
    assert upload.max_files == 10
    assert upload.max_bytes == 25_000_000
    assert upload.strict_role == "terminal"


def test_popup_validates_recursive_children() -> None:
    popup = Popup.model_validate(
        {
            "id": "popup",
            "type": "popup",
            "title": "Transfer Details",
            "children": [
                {"id": "copy", "type": "text", "content": "Payload accepted."},
            ],
        }
    )

    assert popup.draggable is True
    assert popup.resizable is True
    assert popup.children[0].type == "text"


def test_form_children_validate_with_input_widget_discriminator() -> None:
    form = Form.model_validate(
        {
            "id": "form_1",
            "type": "form",
            "submit_label": "Submit",
            "action_id": "submit_form",
            "children": [
                {
                    "id": "btn_1",
                    "type": "button",
                    "action_id": "press",
                },
                {
                    "id": "txt_1",
                    "type": "text_input",
                    "value": "alpha",
                },
            ],
        }
    )

    assert form.children[0].type == "button"
    assert form.children[1].type == "text_input"


def test_column_widgets_validate_mixed_discriminated_widgets() -> None:
    column = Column.model_validate(
        {
            "id": "col_1",
            "width": "1fr",
            "widgets": [
                {
                    "id": "txt",
                    "type": "text",
                    "content": "hello",
                },
                {
                    "id": "tbl",
                    "type": "table",
                    "headers": ["A"],
                    "rows": [{"id": "r1", "cells": ["1"]}],
                },
                {
                    "id": "mic",
                    "type": "mic_button",
                    "upload_url": "/lcars/upload/audio",
                    "action_id": "mic_action",
                },
            ],
        }
    )

    assert [widget.type for widget in column.widgets] == ["text", "table", "mic_button"]


def test_mic_button_continuous_defaults() -> None:
    mic = MicButton(id="mic", upload_url="/u", action_id="a")
    assert mic.continuous is False
    assert mic.silence_ms == 900
    assert mic.timeout_ms == 5000


def test_mic_button_continuous_explicit() -> None:
    mic = MicButton(
        id="mic",
        upload_url="/u",
        action_id="a",
        continuous=True,
        silence_ms=500,
        timeout_ms=8000,
    )
    assert mic.continuous is True
    assert mic.silence_ms == 500


def test_mic_button_silence_ms_floor() -> None:
    with pytest.raises(ValidationError):
        MicButton(id="mic", upload_url="/u", action_id="a", silence_ms=199)


def test_mic_button_silence_ms_floor_boundary_ok() -> None:
    mic = MicButton(id="mic", upload_url="/u", action_id="a", silence_ms=200)
    assert mic.silence_ms == 200


def test_log_viewer_auto_scroll_default_and_explicit() -> None:
    default = LogViewer(id="log", stream_id="ops")
    assert default.auto_scroll is True

    explicit = LogViewer(id="log", stream_id="ops", auto_scroll=False)
    assert explicit.auto_scroll is False


def test_mic_button_continuous_timeout_must_exceed_silence() -> None:
    with pytest.raises(ValidationError):
        MicButton(
            id="mic",
            upload_url="/u",
            action_id="a",
            continuous=True,
            timeout_ms=500,
            silence_ms=900,
        )


def test_mic_button_noncontinuous_ignores_timeout_silence_relationship() -> None:
    mic = MicButton(
        id="mic",
        upload_url="/u",
        action_id="a",
        continuous=False,
        timeout_ms=100,
        silence_ms=900,
    )
    assert mic.timeout_ms == 100
