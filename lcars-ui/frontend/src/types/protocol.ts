export type EventType =
  | "manifest_update"
  | "widget_update"
  | "log_chunk"
  | "session_hydration"
  | "log_snapshot"
  | "notification"
  | "action_ack"
  | "action"
  | "input"
  | "form_submit";

/** The realtime envelope's `v` field. See server/events.py's PROTOCOL_VERSION docstring:
 * bumped from "1.0" to "2.0" alongside the two new downstream types above. */
export const PROTOCOL_VERSION = "2.0" as const;

export interface Envelope<TPayload = unknown> {
  v?: "2.0";
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

/** Full merged current-state manifest for one session, sent once on connect
 * in place of the old frozen-manifest `manifest_update` bootstrap. */
export interface SessionHydrationPayload {
  manifest: unknown;
}

/** A bounded log tail for one stream, sent on hydration. Unlike `log_chunk`,
 * a client applies this by REPLACING its buffer for `stream_id`, not
 * appending — see App.tsx's applyDownstreamEnvelope. */
export interface LogSnapshotPayload {
  stream_id: string;
  lines: string[];
}

export interface NotificationPayload {
  message: string;
  level: "info" | "success" | "warning" | "error";
  title?: string | null;
  duration_ms?: number | null;
  dismissible?: boolean;
  movable?: boolean;
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
  | Envelope<SessionHydrationPayload>
  | Envelope<LogSnapshotPayload>
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
  "session_hydration",
  "log_snapshot",
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
  if (raw.v !== undefined && raw.v !== PROTOCOL_VERSION) {
    throw new Error(
      `Unsupported protocol version: received ${JSON.stringify(raw.v)}, expected "${PROTOCOL_VERSION}"`,
    );
  }
  return {
    type: type as EventType,
    payload: raw.payload,
    v: raw.v as "2.0" | undefined,
    ts: typeof raw.ts === "number" ? raw.ts : undefined,
  };
};

export const makeActionEnvelope = (id: string, value: unknown): UpstreamEnvelope => ({
  v: PROTOCOL_VERSION,
  type: "action",
  payload: { id, value },
});

export const makeInputEnvelope = (id: string, value: string): UpstreamEnvelope => ({
  v: PROTOCOL_VERSION,
  type: "input",
  payload: { id, value },
});

export const makeFormSubmitEnvelope = (
  id: string,
  data: Record<string, unknown>,
): UpstreamEnvelope => ({
  v: PROTOCOL_VERSION,
  type: "form_submit",
  payload: { id, data },
});
