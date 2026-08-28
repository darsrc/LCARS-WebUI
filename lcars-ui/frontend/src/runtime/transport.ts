import { SESSION_TOKEN_QUERY } from "./sessionToken";
import type { Envelope, EventType, UpstreamEnvelope } from "../types/protocol";
import { parseEnvelope } from "../types/protocol";

const SSE_EVENT_TYPES: EventType[] = [
  "manifest_update",
  "widget_update",
  "log_chunk",
  "session_hydration",
  "log_snapshot",
  "notification",
  "action_ack",
];

export type TransportMode = "ws" | "sse" | "reconnecting" | "offline";

export interface TransportStatus {
  mode: TransportMode;
  attempt: number;
}

export interface ProtocolTransportCallbacks {
  onEnvelope: (envelope: Envelope) => void;
  onModeChange: (status: TransportStatus) => void;
  onTransportError: (message: string) => void;
  /** Bearer auth token (principal/scopes) — unrelated to session identity. */
  token?: string;
  /**
   * This tab's session token (see runtime/sessionToken.ts). WebSocket and
   * EventSource cannot set custom headers, so it travels as a query
   * parameter here — the one place this module intentionally puts it.
   */
  sessionToken?: string;
}

export interface ProtocolTransport {
  send: (envelope: UpstreamEnvelope) => boolean;
  close: () => void;
  mode: () => TransportStatus;
}

export const BASE_DELAY_MS = 500;
export const MAX_DELAY_MS = 30_000;

export const nextDelay = (attempt: number): number => {
  const exp = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return exp * (0.8 + Math.random() * 0.4);
};

const buildQuery = (params: Record<string, string | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
};

const wsUrl = (token?: string, sessionToken?: string): string => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const query = buildQuery({ token, [SESSION_TOKEN_QUERY]: sessionToken });
  return `${protocol}://${window.location.host}/lcars/ws${query}`;
};

export const createProtocolTransport = (callbacks: ProtocolTransportCallbacks): ProtocolTransport => {
  let closing = false;
  let currentStatus: TransportStatus = { mode: "offline", attempt: 0 };
  let ws: WebSocket | null = null;
  let sse: EventSource | null = null;
  let reconnectTimer: number | null = null;
  let attempt = 0;
  const sseListeners: Array<{ type: string; handler: EventListener }> = [];

  const setStatus = (mode: TransportMode, nextAttempt: number = attempt): void => {
    currentStatus = { mode, attempt: nextAttempt };
    callbacks.onModeChange(currentStatus);
  };

  const handleRawEnvelope = (raw: unknown): void => {
    try {
      callbacks.onEnvelope(parseEnvelope(raw));
    } catch (error) {
      callbacks.onTransportError(error instanceof Error ? error.message : "Invalid envelope");
    }
  };

  const clearReconnectTimer = (): void => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const cleanupSse = (): void => {
    if (!sse) {
      return;
    }
    for (const listener of sseListeners) {
      sse.removeEventListener(listener.type, listener.handler);
    }
    sseListeners.length = 0;
    sse.close();
    sse = null;
  };

  const cleanupWs = (): void => {
    if (!ws) {
      return;
    }
    ws.onopen = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
  };

  const connectWs = (): void => {
    cleanupWs();
    ws = new WebSocket(wsUrl(callbacks.token, callbacks.sessionToken));
    ws.onopen = () => {
      attempt = 0;
      clearReconnectTimer();
      cleanupSse();
      setStatus("ws", 0);
    };
    ws.onmessage = (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      try {
        handleRawEnvelope(JSON.parse(event.data));
      } catch (error) {
        callbacks.onTransportError(
          error instanceof Error ? error.message : "Unable to parse WS payload",
        );
      }
    };
    ws.onerror = () => {
      callbacks.onTransportError("WebSocket transport error");
    };
    ws.onclose = () => {
      if (closing) {
        return;
      }
      if (!sse) {
        connectSse();
      }
      scheduleReconnect();
    };
  };

  const connectSse = (): void => {
    cleanupSse();
    if (typeof EventSource === "undefined") {
      setStatus("offline", attempt);
      return;
    }

    const query = buildQuery({ token: callbacks.token, [SESSION_TOKEN_QUERY]: callbacks.sessionToken });
    sse = new EventSource(`/lcars/events${query}`);
    setStatus("sse", attempt);
    for (const eventType of SSE_EVENT_TYPES) {
      const listener: EventListener = (event) => {
        const data = (event as MessageEvent).data;
        if (typeof data !== "string") {
          return;
        }
        try {
          handleRawEnvelope(JSON.parse(data));
        } catch (error) {
          callbacks.onTransportError(
            error instanceof Error ? error.message : "Unable to parse SSE payload",
          );
        }
      };
      sse.addEventListener(eventType, listener);
      sseListeners.push({ type: eventType, handler: listener });
    }
    sse.onerror = () => {
      cleanupSse();
      if (!closing) {
        setStatus("offline", attempt);
      }
    };
  };

  const scheduleReconnect = (): void => {
    if (closing || reconnectTimer !== null) {
      return;
    }

    const nextAttempt = attempt + 1;
    const delay = nextDelay(attempt);
    setStatus("reconnecting", nextAttempt);

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      attempt = nextAttempt;
      connectWs();
    }, delay);
  };

  connectWs();

  return {
    send: (envelope: UpstreamEnvelope): boolean => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(envelope));
        return true;
      }
      return false;
    },
    close: () => {
      closing = true;
      clearReconnectTimer();
      cleanupWs();
      cleanupSse();
      setStatus("offline", attempt);
    },
    mode: () => currentStatus,
  };
};
