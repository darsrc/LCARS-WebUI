"""Realtime protocol models for LCARS protocol v1.0."""

from __future__ import annotations

from time import time
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

PROTOCOL_VERSION = "1.0"


class ManifestUpdatePayload(BaseModel):
    path: str
    value: Any


class WidgetUpdatePayload(BaseModel):
    id: str
    data: dict[str, Any] = Field(default_factory=dict)


class LogChunkPayload(BaseModel):
    stream_id: str
    lines: list[str] = Field(default_factory=list)


class NotificationPayload(BaseModel):
    message: str
    level: Literal["info", "error"]


class ActionAckPayload(BaseModel):
    action_id: str
    status: Literal["ok", "fail"]


class ActionPayload(BaseModel):
    id: str
    value: Any = None


class InputPayload(BaseModel):
    id: str
    value: str


class FormSubmitPayload(BaseModel):
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


class Envelope(BaseModel):
    """Typed realtime protocol envelope using spec-compatible top-level fields."""

    v: Literal[PROTOCOL_VERSION] = Field(default=PROTOCOL_VERSION)
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
    payload: PayloadType

    @model_validator(mode="after")
    def _validate_payload_type(self) -> "Envelope":
        mapping: dict[str, type[BaseModel]] = {
            "manifest_update": ManifestUpdatePayload,
            "widget_update": WidgetUpdatePayload,
            "log_chunk": LogChunkPayload,
            "notification": NotificationPayload,
            "action_ack": ActionAckPayload,
            "action": ActionPayload,
            "input": InputPayload,
            "form_submit": FormSubmitPayload,
        }
        expected = mapping[self.type]
        if not isinstance(self.payload, expected):
            raise ValueError(f"payload type mismatch for event '{self.type}'")
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
    "ManifestUpdatePayload",
    "WidgetUpdatePayload",
    "LogChunkPayload",
    "NotificationPayload",
    "ActionAckPayload",
    "ActionPayload",
    "InputPayload",
    "FormSubmitPayload",
    "PayloadType",
    "DownstreamType",
    "UpstreamType",
    "Envelope",
    "make_envelope",
]
