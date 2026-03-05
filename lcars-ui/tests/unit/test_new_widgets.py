"""Unit tests for Phase 10 widget models."""

from __future__ import annotations

from lcars_ui.widgets.data import Gauge
from lcars_ui.widgets.inputs import NumberInput
from lcars_ui.widgets.primitives import Markdown, ProgressBar


def test_progress_bar_model_roundtrip() -> None:
    widget = ProgressBar.model_validate(
        {
            "id": "prog_1",
            "type": "progress_bar",
            "label": "Rebuild",
            "value": 42.5,
            "show_label": True,
        }
    )

    assert widget.type == "progress_bar"
    assert widget.value == 42.5
    assert widget.show_label is True


def test_gauge_model_roundtrip() -> None:
    widget = Gauge.model_validate(
        {
            "id": "gauge_1",
            "type": "gauge",
            "label": "Warp Output",
            "value": 87.2,
            "min": 0.0,
            "max": 100.0,
            "unit": "%",
            "warn_threshold": 70.0,
            "crit_threshold": 90.0,
        }
    )

    assert widget.type == "gauge"
    assert widget.value == 87.2
    assert widget.warn_threshold == 70.0


def test_markdown_model_roundtrip() -> None:
    widget = Markdown.model_validate(
        {
            "id": "md_1",
            "type": "markdown",
            "content": "## Report\n\nNominal",
        }
    )

    assert widget.type == "markdown"
    assert "Report" in widget.content


def test_number_input_model_roundtrip() -> None:
    widget = NumberInput.model_validate(
        {
            "id": "num_1",
            "type": "number_input",
            "label": "Warp Factor",
            "value": 5.0,
            "min": 1.0,
            "max": 9.99,
            "step": 0.01,
            "placeholder": "5.0",
        }
    )

    assert widget.type == "number_input"
    assert widget.value == 5.0
    assert widget.min == 1.0
    assert widget.max == 9.99
