"""Session-scoped application state tests."""

from __future__ import annotations

from lcars_ui import App


def test_clear_session_state_removes_values() -> None:
    app = App()
    state = app.get_session_state("session-clear")
    state["field"] = "value"

    app._clear_session_state_compat("session-clear")
    assert app.get_session_state("session-clear") == {}
