"""Realtime protocol models for LCARS protocol v1.0."""

from __future__ import annotations

from time import time
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

PROTOCOL_VERSION = "1.0"


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
    level: Literal["info", "error"]


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
    payload: Any

    @model_validator(mode="after")
    def _validate_payload_type(self) -> "Envelope":
        expected = PAYLOAD_MODEL_BY_TYPE[self.type]
        if isinstance(self.payload, expected):
            return self
        if isinstance(self.payload, dict):
            self.payload = expected.model_validate(self.payload)
            return self
        raise ValueError(f"payload type mismatch for event '{self.type}'")


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
    "PAYLOAD_MODEL_BY_TYPE",
    "DownstreamType",
    "UpstreamType",
    "Envelope",
    "make_envelope",
]
