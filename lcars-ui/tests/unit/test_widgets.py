"""Unit tests for Phase 1 widget modeling and discrimination."""

from __future__ import annotations

from lcars_ui.core.models import Column
from lcars_ui.widgets.data import LineChart, Sparkline, Table
from lcars_ui.widgets.inputs import Button, Form, Select, TextInput, Toggle
from lcars_ui.widgets.media import LogViewer, MicButton, VideoHls
from lcars_ui.widgets.primitives import Alert, StatusTile, Text


def _widget_type(model: type) -> str:
    return model.model_fields["type"].default


def test_widget_type_literals_are_unique_across_all_widgets() -> None:
    widget_models = [
        Text,
        StatusTile,
        Alert,
        Button,
        Toggle,
        Select,
        TextInput,
        Form,
        Table,
        LineChart,
        Sparkline,
        LogViewer,
        VideoHls,
        MicButton,
    ]

    type_values = [_widget_type(model) for model in widget_models]

    assert len(type_values) == len(set(type_values))


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
