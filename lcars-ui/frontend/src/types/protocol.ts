export type EventType =
  | "manifest_update"
  | "widget_update"
  | "log_chunk"
  | "notification"
  | "action_ack"
  | "action"
  | "input"
  | "form_submit";

export interface Envelope<TPayload = unknown> {
  v?: "1.0";
  ts?: number;
  type: EventType;
  payload: TPayload;
}

export interface ManifestUpdatePayload {
  path: string;
  value: unknown;
}

export interface WidgetUpdatePayload {
  id: string;
  data: Record<string, unknown>;
}

export interface LogChunkPayload {
  stream_id: string;
  lines: string[];
}

export interface NotificationPayload {
  message: string;
  level: "info" | "error";
}

export interface ActionAckPayload {
  action_id: string;
  status: "ok" | "fail";
}

export interface ActionPayload {
  id: string;
  value: unknown;
}

export interface InputPayload {
  id: string;
  value: string;
}

export interface FormSubmitPayload {
  id: string;
  data: Record<string, unknown>;
}

export type DownstreamEnvelope =
  | Envelope<ManifestUpdatePayload>
  | Envelope<WidgetUpdatePayload>
  | Envelope<LogChunkPayload>
  | Envelope<NotificationPayload>
  | Envelope<ActionAckPayload>;

export type UpstreamEnvelope =
  | Envelope<ActionPayload>
  | Envelope<InputPayload>
  | Envelope<FormSubmitPayload>;

const VALID_TYPES: Set<EventType> = new Set([
  "manifest_update",
  "widget_update",
  "log_chunk",
  "notification",
  "action_ack",
  "action",
  "input",
  "form_submit",
]);

export const parseEnvelope = (value: unknown): Envelope => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Envelope must be an object");
  }
  const raw = value as Record<string, unknown>;
  const type = raw.type;
  if (typeof type !== "string" || !VALID_TYPES.has(type as EventType)) {
    throw new Error("Envelope type is invalid");
  }
  if (!("payload" in raw)) {
    throw new Error("Envelope payload is required");
  }
  if (raw.v !== undefined && raw.v !== "1.0") {
    throw new Error("Unsupported protocol version");
  }
  return {
    type: type as EventType,
    payload: raw.payload,
    v: raw.v as "1.0" | undefined,
    ts: typeof raw.ts === "number" ? raw.ts : undefined,
  };
};

export const makeActionEnvelope = (id: string, value: unknown): UpstreamEnvelope => ({
  v: "1.0",
  type: "action",
  payload: { id, value },
});

export const makeInputEnvelope = (id: string, value: string): UpstreamEnvelope => ({
  v: "1.0",
  type: "input",
  payload: { id, value },
});

export const makeFormSubmitEnvelope = (
  id: string,
  data: Record<string, unknown>,
): UpstreamEnvelope => ({
  v: "1.0",
  type: "form_submit",
  payload: { id, data },
});
