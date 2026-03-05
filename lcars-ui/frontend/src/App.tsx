import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { WidgetRenderer } from "./components/WidgetRenderer";
import {
  applyManifestUpdate,
  applyWidgetUpdate,
  getLogViewerByStream,
  resolveDefaultPageId,
} from "./runtime/manifest";
import { createProtocolTransport } from "./runtime/transport";
import type { Manifest } from "./types/contract";
import { isManifest } from "./types/contract";
import {
  makeActionEnvelope,
  makeFormSubmitEnvelope,
  makeInputEnvelope,
  parseEnvelope,
  type Envelope,
  type UpstreamEnvelope,
} from "./types/protocol";

export default function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string>("");
  const [transportMode, setTransportMode] = useState<"ws" | "sse" | "offline">("offline");
  const [logsByStream, setLogsByStream] = useState<Record<string, string[]>>({});
  const [notifications, setNotifications] = useState<
    Array<{ id: number; level: "info" | "error"; message: string }>
  >([]);
  const [actionStatus, setActionStatus] = useState<Record<string, "pending" | "ok" | "fail">>({});
  const transportRef = useRef<ReturnType<typeof createProtocolTransport> | null>(null);
  const notificationCounterRef = useRef<number>(1);
  const manifestRef = useRef<Manifest | null>(null);

  const pushNotification = useCallback((level: "info" | "error", message: string) => {
    setNotifications((current) => {
      const next = [...current, { id: notificationCounterRef.current, level, message }];
      notificationCounterRef.current += 1;
      return next.slice(-6);
    });
  }, []);

  const applyDownstreamEnvelope = useCallback(
    (envelope: Envelope) => {
      switch (envelope.type) {
        case "manifest_update": {
          const payload = envelope.payload as { path?: unknown; value?: unknown };
          if (typeof payload.path !== "string") {
            pushNotification("error", "Rejected manifest_update: invalid path");
            return;
          }
          const path = payload.path;
          const patchValue = payload.value;
          setManifest((current) => {
            if (!current) {
              return current;
            }
            const result = applyManifestUpdate(current, path, patchValue);
            if (!result.applied) {
              pushNotification("error", `Manifest patch failed at path: ${path}`);
              return current;
            }
            return result.manifest;
          });
          return;
        }
        case "widget_update": {
          const payload = envelope.payload as { id?: unknown; data?: unknown };
          if (typeof payload.id !== "string" || typeof payload.data !== "object" || payload.data === null) {
            pushNotification("error", "Rejected widget_update: invalid payload");
            return;
          }
          const widgetId = payload.id;
          const data = payload.data as Record<string, unknown>;
          setManifest((current) => (current ? applyWidgetUpdate(current, widgetId, data) : current));
          return;
        }
        case "log_chunk": {
          const payload = envelope.payload as { stream_id?: unknown; lines?: unknown };
          if (typeof payload.stream_id !== "string" || !Array.isArray(payload.lines)) {
            pushNotification("error", "Rejected log_chunk: invalid payload");
            return;
          }
          const streamId = payload.stream_id;
          const maxLines = manifestRef.current
            ? (getLogViewerByStream(manifestRef.current, streamId)?.max_lines ?? 1000)
            : 1000;
          const nextLines = payload.lines.filter((line): line is string => typeof line === "string");
          setLogsByStream((current) => {
            const merged = [...(current[streamId] ?? []), ...nextLines];
            return {
              ...current,
              [streamId]: merged.slice(-maxLines),
            };
          });
          return;
        }
        case "notification": {
          const payload = envelope.payload as { message?: unknown; level?: unknown };
          if (typeof payload.message !== "string" || (payload.level !== "info" && payload.level !== "error")) {
            pushNotification("error", "Rejected notification: invalid payload");
            return;
          }
          pushNotification(payload.level, payload.message);
          return;
        }
        case "action_ack": {
          const payload = envelope.payload as { action_id?: unknown; status?: unknown };
          if (typeof payload.action_id !== "string" || (payload.status !== "ok" && payload.status !== "fail")) {
            pushNotification("error", "Rejected action_ack: invalid payload");
            return;
          }
          const actionId = payload.action_id;
          const status = payload.status;
          setActionStatus((current) => ({
            ...current,
            [actionId]: status,
          }));
          return;
        }
        default:
          return;
      }
    },
    [pushNotification],
  );

  useEffect(() => {
    manifestRef.current = manifest;
    if (manifest) {
      document.title = manifest.meta.app_name;
    }
  }, [manifest]);

  useEffect(() => {
    let cancelled = false;
    const loadManifest = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<unknown>("/lcars/manifest");
        const parsed = response.data;
        if (!isManifest(parsed)) {
          throw new Error("Manifest payload shape is invalid");
        }
        if (!cancelled) {
          setManifest(parsed);
          setActivePageId(resolveDefaultPageId(parsed));
        }
      } catch (manifestError) {
        if (!cancelled) {
          setError(manifestError instanceof Error ? manifestError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadManifest();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!manifest) {
      return;
    }
    const transport = createProtocolTransport({
      onEnvelope: applyDownstreamEnvelope,
      onModeChange: setTransportMode,
      onTransportError: (message) => pushNotification("error", message),
    });
    transportRef.current = transport;
    return () => {
      transport.close();
      transportRef.current = null;
    };
  }, [manifest, applyDownstreamEnvelope, pushNotification]);

  useEffect(() => {
    if (!manifest) {
      return;
    }
    if (manifest.pages[activePageId]) {
      return;
    }
    setActivePageId(resolveDefaultPageId(manifest));
  }, [manifest, activePageId]);

  const sendWithTransport = useCallback((envelope: UpstreamEnvelope): boolean => {
    return transportRef.current?.send(envelope) ?? false;
  }, []);

  const onAction = useCallback(
    (actionId: string, value: unknown) => {
      void (async () => {
        setActionStatus((current) => ({ ...current, [actionId]: "pending" }));
        if (sendWithTransport(makeActionEnvelope(actionId, value))) {
          return;
        }
        try {
          const response = await axios.post(`/lcars/action/${encodeURIComponent(actionId)}`, { value });
          applyDownstreamEnvelope(parseEnvelope(response.data));
        } catch (requestError) {
          setActionStatus((current) => ({ ...current, [actionId]: "fail" }));
          pushNotification(
            "error",
            requestError instanceof Error ? requestError.message : `Action "${actionId}" failed`,
          );
        }
      })();
    },
    [applyDownstreamEnvelope, pushNotification, sendWithTransport],
  );

  const onInput = useCallback(
    (id: string, value: string) => {
      const sent = sendWithTransport(makeInputEnvelope(id, value));
      if (!sent) {
        pushNotification("error", `Input "${id}" requires an active WebSocket session`);
      }
    },
    [pushNotification, sendWithTransport],
  );

  const onFormSubmit = useCallback(
    (id: string, data: Record<string, unknown>) => {
      const sent = sendWithTransport(makeFormSubmitEnvelope(id, data));
      if (!sent) {
        pushNotification("error", `Form "${id}" requires an active WebSocket session`);
      }
    },
    [pushNotification, sendWithTransport],
  );

  const onAudioUpload = useCallback(
    async (widget: { upload_url: string; action_id: string }, file: File) => {
      const body = new FormData();
      body.append("file", file);
      await axios.post(widget.upload_url, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      pushNotification("info", `Audio upload queued for action "${widget.action_id}"`);
    },
    [pushNotification],
  );

  const headerColorClass = useMemo(() => {
    if (!manifest) {
      return "widget-default";
    }
    const color = manifest.layout.header.color;
    if (color === "orange" || color === "red" || color === "blue" || color === "purple" || color === "white" || color === "yellow") {
      return `widget-${color}`;
    }
    return "widget-default";
  }, [manifest]);

  if (loading) {
    return <div className="boot-status">Loading LCARS manifest...</div>;
  }

  if (error || !manifest) {
    return <div className="boot-status error">Failed to load manifest: {error ?? "Unknown error"}</div>;
  }

  const page = manifest.pages[activePageId];

  return (
    <main className="lcars-shell">
      <header className={`lcars-header ${headerColorClass}`}>
        <div>
          <h1>{manifest.layout.header.title}</h1>
          <p>{manifest.layout.header.subtitle ?? manifest.meta.app_name}</p>
        </div>
        <div className="header-status">
          <span>Protocol: {transportMode.toUpperCase()}</span>
          <span>Schema: {manifest.meta.version}</span>
        </div>
      </header>

      <div className="lcars-body">
        <aside className="lcars-sidebar">
          {manifest.layout.sidebar.items.map((item) => (
            <button
              className={`sidebar-item widget-${item.color ?? "default"} ${activePageId === item.target_page ? "active" : ""}`}
              key={item.id}
              onClick={() => setActivePageId(item.target_page)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </aside>

        <section className="lcars-page">
          <h2>{page?.title ?? activePageId}</h2>
          {page?.rows.map((row) => (
            <div
              className="lcars-row"
              key={row.id}
              style={{
                gridTemplateColumns: row.columns.map((column) => column.width).join(" "),
                minHeight: row.height,
              }}
            >
              {row.columns.map((column) => (
                <div className="lcars-column" key={column.id}>
                  {column.widgets.map((widget) => (
                    <WidgetRenderer
                      key={widget.id}
                      logsByStream={logsByStream}
                      onAction={onAction}
                      onAudioUpload={onAudioUpload}
                      onFormSubmit={onFormSubmit}
                      onInput={onInput}
                      widget={widget}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </section>
      </div>

      <footer className="lcars-footer">
        {Object.entries(actionStatus).map(([actionId, status]) => (
          <span className={`action-status ${status}`} key={actionId}>
            {actionId}: {status}
          </span>
        ))}
      </footer>

      {notifications.length > 0 ? (
        <section className="notification-stack" aria-live="polite">
          {notifications.map((notification) => (
            <div className={`notice ${notification.level}`} key={notification.id}>
              {notification.message}
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
