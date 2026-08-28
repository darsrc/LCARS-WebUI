"""Realtime protocol models for LCARS protocol v1.0."""

from __future__ import annotations

from time import time
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, model_serializer, model_validator

PROTOCOL_VERSION = "1.0"

Audience = Literal["session", "all"]
"""Server-internal delivery scope for one downstream envelope.

Never part of the wire protocol — see :class:`Envelope`'s private routing
attributes below. ``"session"`` is private to one originating session;
``"all"`` is an explicit broadcast opt-in.
"""


class StrictModel(BaseModel):
    """Base model that forbids unknown fields for protocol strictness."""

    model_config = ConfigDict(extra="forbid")


class ManifestUpdatePayload(StrictModel):
    path: str
    value: Any


class WidgetUpdatePayload(StrictModel):
    id: str
    data: dict[str, Any] = Field(default_factory=dict)


class LogChunkPayload(StrictModel):
    stream_id: str
    lines: list[str] = Field(default_factory=list)


class NotificationPayload(StrictModel):
    message: str
    level: Literal["info", "success", "warning", "error"] = "info"
    title: str | None = None
    duration_ms: int | None = Field(default=None, ge=0, le=300_000)
    dismissible: bool = True
    movable: bool = True

    @model_serializer(mode="wrap")
    def _serialize_compatibly(self, handler: Any) -> dict[str, Any]:
        data: dict[str, Any] = handler(self)
        if self.title is None:
            data.pop("title", None)
        if self.duration_ms is None:
            data.pop("duration_ms", None)
        if self.dismissible:
            data.pop("dismissible", None)
        if self.movable:
            data.pop("movable", None)
        return data


class ActionAckPayload(StrictModel):
    action_id: str
    status: Literal["ok", "fail"]


class ActionPayload(StrictModel):
    id: str
    value: Any = None


class InputPayload(StrictModel):
    id: str
    value: str


class FormSubmitPayload(StrictModel):
    id: str
    data: dict[str, Any] = Field(default_factory=dict)


PayloadType = (
    ManifestUpdatePayload
    | WidgetUpdatePayload
    | LogChunkPayload
    | NotificationPayload
    | ActionAckPayload
    | ActionPayload
    | InputPayload
    | FormSubmitPayload
)


PAYLOAD_MODEL_BY_TYPE: dict[str, type[BaseModel]] = {
    "manifest_update": ManifestUpdatePayload,
    "widget_update": WidgetUpdatePayload,
    "log_chunk": LogChunkPayload,
    "notification": NotificationPayload,
    "action_ack": ActionAckPayload,
    "action": ActionPayload,
    "input": InputPayload,
    "form_submit": FormSubmitPayload,
}


class Envelope(StrictModel):
    """Typed realtime protocol envelope using spec-compatible top-level fields."""

    v: Literal["1.0"] = Field(default="1.0")
    ts: float = Field(default_factory=time)
    type: Literal[
        "manifest_update",
        "widget_update",
        "log_chunk",
        "notification",
        "action_ack",
        "action",
        "input",
        "form_submit",
    ]
    payload: Any

    # Delivery routing is server-internal state, never wire content: it is
    # attached to the live Python object after construction (by dsl/api.py's
    # effect functions, or directly by app.py for action_ack) and read back
    # by the bus forwarder. PrivateAttr keeps it out of model_dump/schema/
    # extra="forbid" validation entirely, so it cannot widen the protocol.
    _audience: Audience = PrivateAttr(default="all")
    _target_session_id: str | None = PrivateAttr(default=None)

    @model_validator(mode="after")
    def _validate_payload_type(self) -> Envelope:
        expected = PAYLOAD_MODEL_BY_TYPE[self.type]
        if isinstance(self.payload, expected):
            return self
        if isinstance(self.payload, dict):
            self.payload = expected.model_validate(self.payload)
            return self
        raise ValueError(f"payload type mismatch for event '{self.type}'")

    @property
    def audience(self) -> Audience:
        """Return this envelope's resolved delivery scope."""
        return self._audience

    @property
    def target_session_id(self) -> str | None:
        """Return the originating session id for a ``"session"``-scoped envelope."""
        return self._target_session_id

    def route_to_session(self, session_id: str) -> Envelope:
        """Mark this envelope private to one session, in place. Returns ``self``."""
        self._audience = "session"
        self._target_session_id = session_id
        return self

    def route_to_all(self) -> Envelope:
        """Mark this envelope for broadcast to every session, in place. Returns ``self``."""
        self._audience = "all"
        self._target_session_id = None
        return self


DownstreamType = Literal[
    "manifest_update",
    "widget_update",
    "log_chunk",
    "notification",
    "action_ack",
]
UpstreamType = Literal["action", "input", "form_submit"]


def make_envelope(event_type: str, payload: PayloadType, *, ts: float | None = None) -> Envelope:
    kwargs: dict[str, Any] = {"type": event_type, "payload": payload}
    if ts is not None:
        kwargs["ts"] = ts
    return Envelope(**kwargs)


__all__ = [
    "PROTOCOL_VERSION",
    "Audience",
    "ManifestUpdatePayload",
    "WidgetUpdatePayload",
    "LogChunkPayload",
    "NotificationPayload",
    "ActionAckPayload",
    "ActionPayload",
    "InputPayload",
    "FormSubmitPayload",
    "PayloadType",
    "PAYLOAD_MODEL_BY_TYPE",
    "DownstreamType",
    "UpstreamType",
    "Envelope",
    "make_envelope",
]
