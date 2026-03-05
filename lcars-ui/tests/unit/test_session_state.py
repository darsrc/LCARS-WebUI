"""Session-scoped widget state tests."""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import (
    Mode,
    _LCARSContext,
    clear_session_state,
    get_session_state,
    set_ctx,
)


def _run_toggle(*, session_id: str, value: bool) -> bool:
    ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id=session_id,
        active_action_id="shared-toggle",
        active_action_value=value,
        builder=_ManifestBuilder(),
    )
    set_ctx(ctx)
    return lcars.toggle("Shared Toggle", id="shared-toggle")


def test_widget_state_isolated_by_session_id() -> None:
    clear_session_state("session-a")
    clear_session_state("session-b")

    a_value = _run_toggle(session_id="session-a", value=True)
    b_value = _run_toggle(session_id="session-b", value=False)

    assert a_value is True
    assert b_value is False
    assert get_session_state("session-a")["shared-toggle"] is True
    assert get_session_state("session-b")["shared-toggle"] is False


def test_clear_session_state_removes_values() -> None:
    state = get_session_state("session-clear")
    state["field"] = "value"

    clear_session_state("session-clear")
    assert get_session_state("session-clear") == {}
