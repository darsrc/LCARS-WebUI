"""Session identity: opaque tokens, principal binding, and disconnect retention.

A *token* is the client-facing credential — minted here, stored by the
browser in ``sessionStorage``, and presented back on every request (an HTTP
header, or a query parameter for WebSocket/SSE, which cannot carry custom
headers). A *session id* is the server-internal identifier threaded through
dispatch, widget state, and connection routing.

Keeping the two distinct means the session id is safe to log or hand to a
plugin handler: knowing it alone grants no access, since only the token
resolves to it. The token itself must never be logged.
"""

from __future__ import annotations

import secrets
from collections.abc import Callable
from dataclasses import dataclass
from time import monotonic
from uuid import uuid4

SESSION_TOKEN_HEADER = "X-Lcars-Session"
SESSION_TOKEN_QUERY = "session"

DEFAULT_SESSION_RETENTION_SECONDS = 1800.0


@dataclass(slots=True)
class SessionRecord:
    """One issued session: its stable id, its credential, and its owner."""

    session_id: str
    token: str
    principal_subject: str
    connected: bool = False
    disconnected_at: float | None = None


@dataclass(frozen=True, slots=True)
class ResolvedSession:
    """Outcome of resolving a client-presented token to a live session."""

    session_id: str
    token: str
    rotated: bool
    """True when the presented token could not be reused as-is: it was
    missing, expired (already purged), bound to a different principal, or
    (for a ``live`` resolution) already bound to another live connection —
    a cloned tab. A fresh, unrelated session/token pair was minted instead.
    """


class SessionRegistry:
    """Own opaque session tokens for one :class:`~lcars_ui.application.App`.

    Not a module-level singleton: each ``App`` instance owns exactly one
    registry, matching how it already owns its session store and connection
    manager.
    """

    def __init__(
        self,
        *,
        retention_seconds: float = DEFAULT_SESSION_RETENTION_SECONDS,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self._retention_seconds = retention_seconds
        self._clock = clock or monotonic
        self._records: dict[str, SessionRecord] = {}
        self._by_session_id: dict[str, SessionRecord] = {}

    def resolve(
        self,
        *,
        token: str | None,
        principal_subject: str,
        live: bool = False,
    ) -> ResolvedSession:
        """Find-or-mint the session for one (token, principal) presentation.

        ``live`` marks a persistent-connection attempt (WebSocket or SSE).
        A token already bound to a live connection at that moment is a
        cloned tab: the newcomer is issued a fresh, unrelated session
        instead of joining the one already live. Plain HTTP requests
        (``live=False``) never trigger this check — a stateless action or
        upload happening alongside an already-open stream is normal, not a
        clone.

        A token that is missing, unknown (never issued or already expired),
        or bound to a different principal always yields a fresh session
        with no access to whatever the old one held.
        """
        self.purge_expired()
        record = self._records.get(token) if token else None
        rotated = False

        if record is None or record.principal_subject != principal_subject:
            record = self._mint(principal_subject)
            rotated = True
        elif live and record.connected:
            record = self._mint(principal_subject)
            rotated = True

        if live:
            record.connected = True
            record.disconnected_at = None

        return ResolvedSession(
            session_id=record.session_id,
            token=record.token,
            rotated=rotated,
        )

    def lookup(self, *, token: str | None, principal_subject: str) -> ResolvedSession | None:
        """Resolve an already-issued token without ever minting a new session.

        The counterpart to :meth:`resolve` for endpoints where find-or-mint is
        the wrong behaviour. An action, input, form submit or upload applies an
        effect *to* a session; minting one for a caller that presented no token
        would apply the effect to a session nobody is connected to and then
        answer ``ok``, discarding the work silently. Those endpoints call this
        and reject ``None`` instead — only ``/lcars/manifest`` issues.

        Returns ``None`` when the token is missing, unknown (never issued or
        already expired), or bound to a different principal. Expiry is purged
        by the caller (``App.require_session``) so that releasing the
        associated application state stays in one place.
        """
        if not token:
            return None
        record = self._records.get(token)
        if record is None or record.principal_subject != principal_subject:
            return None
        return ResolvedSession(
            session_id=record.session_id,
            token=record.token,
            rotated=False,
        )

    def mark_disconnected(self, session_id: str) -> None:
        """Release one live connection without discarding retained session state.

        The session's widget state and scoped services stay in
        :class:`~lcars_ui.application.App` until :meth:`purge_expired` finds
        it past the retention window (or another live connection for the
        same token reconnects first).
        """
        record = self._by_session_id.get(session_id)
        if record is None:
            return
        record.connected = False
        record.disconnected_at = self._clock()

    def purge_expired(self) -> list[str]:
        """Drop sessions disconnected longer than the retention window.

        Returns the purged session ids so the caller (``App``) can release
        their associated application state. Called lazily on every
        resolution rather than from a background sleep loop, so tests can
        drive it deterministically with an injected clock.
        """
        now = self._clock()
        expired_tokens = [
            token
            for token, record in self._records.items()
            if not record.connected
            and record.disconnected_at is not None
            and (now - record.disconnected_at) > self._retention_seconds
        ]
        expired_session_ids: list[str] = []
        for token in expired_tokens:
            record = self._records.pop(token)
            self._by_session_id.pop(record.session_id, None)
            expired_session_ids.append(record.session_id)
        return expired_session_ids

    def _mint(self, principal_subject: str) -> SessionRecord:
        record = SessionRecord(
            session_id=f"sess_{uuid4().hex}",
            token=secrets.token_urlsafe(32),
            principal_subject=principal_subject,
            # Start the retention clock immediately: a session that never
            # opens a live connection is bounded by the same window rather
            # than living forever.
            disconnected_at=self._clock(),
        )
        self._records[record.token] = record
        self._by_session_id[record.session_id] = record
        return record


__all__ = [
    "SESSION_TOKEN_HEADER",
    "SESSION_TOKEN_QUERY",
    "DEFAULT_SESSION_RETENTION_SECONDS",
    "SessionRecord",
    "ResolvedSession",
    "SessionRegistry",
]
