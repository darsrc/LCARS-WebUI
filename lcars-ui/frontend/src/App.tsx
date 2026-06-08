import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { Frame } from "./lcars/Frame";
import { PageView } from "./compose/PageView";
import {
  applyManifestUpdate,
  applyWidgetUpdate,
  getLogViewerByStream,
  resolveDefaultPageId,
} from "./runtime/manifest";
import { createProtocolTransport, type TransportStatus } from "./runtime/transport";
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

type Notification = { id: number; level: "info" | "error"; message: string };

const resolveInitialPageId = (manifest: Manifest): string => {
  const requested = new URLSearchParams(window.location.search).get("page");
  if (requested && manifest.pages[requested]) {
    return requested;
  }
  return resolveDefaultPageId(manifest);
};

export default function App() {
  const authToken = import.meta.env.VITE_LCARS_TOKEN as string | undefined;
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string>("");
  const [transportStatus, setTransportStatus] = useState<TransportStatus>({ mode: "offline", attempt: 0 });
  const [logsByStream, setLogsByStream] = useState<Record<string, string[]>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const transportRef = useRef<ReturnType<typeof createProtocolTransport> | null>(null);
  const notificationCounterRef = useRef<number>(1);
  const manifestRef = useRef<Manifest | null>(null);

  const pushNotification = useCallback((level: "info" | "error", message: string) => {
    setNotifications((current) => {
      const next = [...current, { id: notificationCounterRef.current, level, message }];
      notificationCounterRef.current += 1;
      return next.slice(-5);
    });
  }, []);

  const authHeaders = useMemo<Record<string, string> | undefined>(
    () => (authToken ? { Authorization: `Bearer ${authToken}` } : undefined),
    [authToken],
  );

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
          setManifest((current) => {
            if (!current) return current;
            const result = applyManifestUpdate(current, path, payload.value);
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
            return { ...current, [streamId]: merged.slice(-maxLines) };
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
        case "action_ack":
          return;
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
        const response = await axios.get<unknown>("/lcars/manifest", { headers: authHeaders });
        if (!isManifest(response.data)) {
          throw new Error("Manifest payload shape is invalid");
        }
        if (!cancelled) {
          setManifest(response.data);
          setActivePageId(resolveInitialPageId(response.data));
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
  }, [authHeaders]);

  const manifestReady = manifest !== null;

  useEffect(() => {
    if (!manifestReady) {
      return;
    }
    const transport = createProtocolTransport({
      onEnvelope: applyDownstreamEnvelope,
      onModeChange: setTransportStatus,
      onTransportError: (message) => pushNotification("error", message),
      token: authToken,
    });
    transportRef.current = transport;
    return () => {
      transport.close();
      transportRef.current = null;
    };
  }, [manifestReady, applyDownstreamEnvelope, pushNotification, authToken]);

  useEffect(() => {
    if (manifest && !manifest.pages[activePageId]) {
      setActivePageId(resolveInitialPageId(manifest));
    }
  }, [manifest, activePageId]);

  const sendWithTransport = useCallback(
    (envelope: UpstreamEnvelope): boolean => transportRef.current?.send(envelope) ?? false,
    [],
  );

  const onAction = useCallback(
    (actionId: string, value: unknown) => {
      if (sendWithTransport(makeActionEnvelope(actionId, value))) {
        return;
      }
      void (async () => {
        try {
          const response = await axios.post(
            `/lcars/action/${encodeURIComponent(actionId)}`,
            { value },
            { headers: authHeaders },
          );
          applyDownstreamEnvelope(parseEnvelope(response.data));
        } catch (requestError) {
          pushNotification("error", requestError instanceof Error ? requestError.message : `Action "${actionId}" failed`);
        }
      })();
    },
    [applyDownstreamEnvelope, authHeaders, pushNotification, sendWithTransport],
  );

  const onInput = useCallback(
    (id: string, value: string) => {
      if (!sendWithTransport(makeInputEnvelope(id, value))) {
        pushNotification("error", `Input "${id}" requires an active session`);
      }
    },
    [pushNotification, sendWithTransport],
  );

  const onFormSubmit = useCallback(
    (id: string, data: Record<string, unknown>) => {
      if (!sendWithTransport(makeFormSubmitEnvelope(id, data))) {
        pushNotification("error", `Form "${id}" requires an active session`);
      }
    },
    [pushNotification, sendWithTransport],
  );

  if (loading) {
    return <div className="boot-status">Loading LCARS manifest…</div>;
  }

  if (error || !manifest) {
    return <div className="boot-status error">Failed to load manifest: {error ?? "Unknown error"}</div>;
  }

  const page =
    manifest.pages[activePageId] ?? manifest.pages[resolveDefaultPageId(manifest)] ?? Object.values(manifest.pages)[0];

  return (
    <div className="lcars-root">
      <Frame
        manifest={manifest}
        activePageId={activePageId}
        onSelectPage={setActivePageId}
        transportStatus={transportStatus}
      >
        {page ? (
          <PageView page={page} logsByStream={logsByStream} onAction={onAction} onInput={onInput} onFormSubmit={onFormSubmit} />
        ) : (
          <div className="lcars-empty">No page</div>
        )}
      </Frame>

      {notifications.length > 0 ? (
        <div className="lcars-notes" aria-live="polite">
          {notifications.map((note) => (
            <div className="lcars-note" data-level={note.level} key={note.id}>
              {note.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
