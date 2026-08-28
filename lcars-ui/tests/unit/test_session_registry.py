"""Unit coverage for SessionRegistry: identity, cloned tabs, and retention.

These exercise lcars_ui.server.sessions.SessionRegistry directly (no FastAPI,
no asyncio) with an injectable clock, so the 30-minute retention window is
proven by advancing a fake clock rather than sleeping. Wire-level routing
(does a private envelope actually only reach its own session's WebSocket/SSE
connection) is covered separately in tests/integration/test_session_routing.py.
"""

from __future__ import annotations

from lcars_ui.server.sessions import SessionRegistry


def test_resolving_without_a_token_always_mints_an_independent_session() -> None:
    registry = SessionRegistry(clock=lambda: 0.0)

    first = registry.resolve(token=None, principal_subject="anonymous")
    second = registry.resolve(token=None, principal_subject="anonymous")

    assert first.session_id != second.session_id
    assert first.token != second.token
    assert first.rotated is True
    assert second.rotated is True


def test_resolving_a_known_token_with_a_matching_principal_reuses_the_session() -> None:
    registry = SessionRegistry(clock=lambda: 0.0)

    first = registry.resolve(token=None, principal_subject="anonymous")
    second = registry.resolve(token=first.token, principal_subject="anonymous")

    assert second.session_id == first.session_id
    assert second.token == first.token
    assert second.rotated is False


def test_unknown_token_yields_a_fresh_session_with_no_link_to_any_prior_state() -> None:
    registry = SessionRegistry(clock=lambda: 0.0)

    resolved = registry.resolve(token="a-token-nobody-ever-issued", principal_subject="anonymous")

    # The made-up token is never honored — a real, server-minted one is
    # returned instead, unrelated to the bogus one presented.
    assert resolved.token != "a-token-nobody-ever-issued"
    assert resolved.rotated is True


def test_cloned_token_on_a_live_connection_is_rotated_to_an_independent_session() -> None:
    """Duplicating a tab copies its token; opening a second live stream with it is a clone."""
    registry = SessionRegistry(clock=lambda: 0.0)

    original = registry.resolve(token=None, principal_subject="anonymous", live=True)
    clone = registry.resolve(token=original.token, principal_subject="anonymous", live=True)

    assert clone.rotated is True
    assert clone.session_id != original.session_id
    assert clone.token != original.token


def test_a_plain_http_request_alongside_a_live_connection_is_not_treated_as_a_clone() -> None:
    """Only opening a second *live* connection with the same token is a clone.

    An HTTP fallback action or upload happening while a WS/SSE connection is
    already open under the same token is normal (hybrid transport use), not
    a duplicated tab, so it must resolve to the very same session.
    """
    registry = SessionRegistry(clock=lambda: 0.0)

    original = registry.resolve(token=None, principal_subject="anonymous", live=True)
    fallback = registry.resolve(token=original.token, principal_subject="anonymous", live=False)

    assert fallback.session_id == original.session_id
    assert fallback.rotated is False


def test_principal_mismatch_yields_a_fresh_session_with_no_access_to_the_old_one() -> None:
    registry = SessionRegistry(clock=lambda: 0.0)

    original = registry.resolve(token=None, principal_subject="alice")
    mismatched = registry.resolve(token=original.token, principal_subject="bob")

    assert mismatched.rotated is True
    assert mismatched.session_id != original.session_id
    assert mismatched.token != original.token


def test_session_state_survives_reconnect_inside_the_retention_window() -> None:
    clock = {"now": 0.0}
    registry = SessionRegistry(retention_seconds=1800.0, clock=lambda: clock["now"])

    original = registry.resolve(token=None, principal_subject="anonymous", live=True)
    registry.mark_disconnected(original.session_id)

    clock["now"] = 1799.0  # comfortably inside the 30-minute window
    reconnected = registry.resolve(token=original.token, principal_subject="anonymous", live=True)

    assert reconnected.session_id == original.session_id
    assert reconnected.token == original.token
    assert reconnected.rotated is False


def test_session_is_gone_once_the_retention_window_has_elapsed() -> None:
    clock = {"now": 0.0}
    registry = SessionRegistry(retention_seconds=1800.0, clock=lambda: clock["now"])

    original = registry.resolve(token=None, principal_subject="anonymous", live=True)
    registry.mark_disconnected(original.session_id)

    clock["now"] = 1800.5  # comfortably past the 30-minute window
    reconnected = registry.resolve(token=original.token, principal_subject="anonymous", live=True)

    assert reconnected.session_id != original.session_id
    assert reconnected.token != original.token
    assert reconnected.rotated is True


def test_retention_is_configurable() -> None:
    clock = {"now": 0.0}
    registry = SessionRegistry(retention_seconds=5.0, clock=lambda: clock["now"])

    original = registry.resolve(token=None, principal_subject="anonymous", live=True)
    registry.mark_disconnected(original.session_id)

    clock["now"] = 5.5
    reconnected = registry.resolve(token=original.token, principal_subject="anonymous", live=True)

    assert reconnected.session_id != original.session_id


def test_purge_expired_returns_purged_session_ids_and_is_idempotent() -> None:
    clock = {"now": 0.0}
    registry = SessionRegistry(retention_seconds=100.0, clock=lambda: clock["now"])

    original = registry.resolve(token=None, principal_subject="anonymous", live=True)
    registry.mark_disconnected(original.session_id)

    assert registry.purge_expired() == []  # nothing expired yet

    clock["now"] = 100.5
    assert registry.purge_expired() == [original.session_id]
    assert registry.purge_expired() == []  # already gone; nothing left to purge


def test_a_still_connected_session_is_never_purged_regardless_of_age() -> None:
    clock = {"now": 0.0}
    registry = SessionRegistry(retention_seconds=10.0, clock=lambda: clock["now"])

    original = registry.resolve(token=None, principal_subject="anonymous", live=True)

    clock["now"] = 10_000.0
    assert registry.purge_expired() == []

    reconnected = registry.resolve(token=original.token, principal_subject="anonymous", live=False)
    assert reconnected.session_id == original.session_id
