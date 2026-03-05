import type { Envelope, EventType, UpstreamEnvelope } from "../types/protocol";
import { parseEnvelope } from "../types/protocol";

const SSE_EVENT_TYPES: EventType[] = [
  "manifest_update",
  "widget_update",
  "log_chunk",
  "notification",
  "action_ack",
];

export type TransportMode = "ws" | "sse" | "offline";

export interface ProtocolTransportCallbacks {
  onEnvelope: (envelope: Envelope) => void;
  onModeChange: (mode: TransportMode) => void;
  onTransportError: (message: string) => void;
}

export interface ProtocolTransport {
  send: (envelope: UpstreamEnvelope) => boolean;
  close: () => void;
  mode: () => TransportMode;
}

const wsUrl = (): string => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/lcars/ws`;
};

export const createProtocolTransport = (callbacks: ProtocolTransportCallbacks): ProtocolTransport => {
  let closing = false;
  let currentMode: TransportMode = "offline";
  let ws: WebSocket | null = null;
  let sse: EventSource | null = null;
  const sseListeners: Array<{ type: string; handler: EventListener }> = [];

  const setMode = (next: TransportMode): void => {
    currentMode = next;
    callbacks.onModeChange(next);
  };

  const handleRawEnvelope = (raw: unknown): void => {
    try {
      callbacks.onEnvelope(parseEnvelope(raw));
    } catch (error) {
      callbacks.onTransportError(error instanceof Error ? error.message : "Invalid envelope");
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

  const connectSse = (): void => {
    cleanupSse();
    sse = new EventSource("/lcars/events");
    setMode("sse");
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
      setMode("offline");
    };
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
    ws = new WebSocket(wsUrl());
    ws.onopen = () => {
      cleanupSse();
      setMode("ws");
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
      if (!closing) {
        connectSse();
      }
    };
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
      cleanupWs();
      cleanupSse();
      setMode("offline");
    },
    mode: () => currentMode,
  };
};
