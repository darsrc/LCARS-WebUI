"""Unit tests for Phase 4 STT adapter determinism."""

from __future__ import annotations

from lcars_ui.server.stt import MockSTTAdapter


def test_mock_stt_adapter_is_deterministic_for_same_input() -> None:
    adapter = MockSTTAdapter()
    payload = b"test_audio_bytes"

    first = adapter.transcribe(payload)
    second = adapter.transcribe(payload)

    assert first == second
    assert first.startswith("processed_")


def test_mock_stt_adapter_changes_for_different_inputs() -> None:
    adapter = MockSTTAdapter()

    first = adapter.transcribe(b"alpha")
    second = adapter.transcribe(b"beta")

    assert first != second
