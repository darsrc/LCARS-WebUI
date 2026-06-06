import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { applyManifestUpdate, applyWidgetUpdate, getLogViewerByStream } from "./runtime/manifest";
import { createProtocolTransport, type TransportStatus } from "./runtime/transport";
import type { Manifest } from "./types/contract";
import { isManifest } from "./types/contract";
import type { Envelope } from "./types/protocol";

/**
 * Phase 0 — the clean slate.
 *
 * The visual frontend has been burned to bare black. What lives here now is only the
 * proven, invisible plumbing the rebuild stands on: fetch the manifest, open the live
 * transport, and route downstream telemetry into state. Nothing is drawn but a black
 * field — the rebuilt LCARS renderer lands on top of this from Phase 1 onward. The
 * transport status, page count, log streams, pending actions, and notifications are
 * surfaced only through data attributes and an accessible live region, so the data
 * path is observable and tested without putting a single uncomposed shape on screen.
 */

type Notification = { id: number; level: "info" | "error"; message: string };

export default function App() {
  const authToken = import.meta.env.VITE_LCARS_TOKEN as string | undefined;
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>({
    mode: "offline",
    attempt: 0,
  });
  const [logsByStream, setLogsByStream] = useState<Record<string, string[]>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actionStatus, setActionStatus] = useState<Record<string, "pending" | "ok" | "fail">>({});

  const notificationCounterRef = useRef<number>(1);
  const manifestRef = useRef<Manifest | null>(null);

  const pushNotification = useCallback((level: "info" | "error", message: string) => {
    setNotifications((current) => {
      const next = [...current, { id: notificationCounterRef.current, level, message }];
      notificationCounterRef.current += 1;
      return next.slice(-6);
    });
  }, []);

  const authHeaders = useMemo<Record<string, string> | undefined>(() => {
    if (!authToken) {
      return undefined;
    }
    return { Authorization: `Bearer ${authToken}` };
  }, [authToken]);

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
        case "action_ack": {
          const payload = envelope.payload as { action_id?: unknown; status?: unknown };
          if (typeof payload.action_id !== "string" || (payload.status !== "ok" && payload.status !== "fail")) {
            pushNotification("error", "Rejected action_ack: invalid payload");
            return;
          }
          const actionId = payload.action_id;
          const status = payload.status;
          setActionStatus((current) => ({ ...current, [actionId]: status }));
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
        const response = await axios.get<unknown>("/lcars/manifest", { headers: authHeaders });
        const parsed = response.data;
        if (!isManifest(parsed)) {
          throw new Error("Manifest payload shape is invalid");
        }
        if (!cancelled) {
          setManifest(parsed);
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
    return () => {
      transport.close();
    };
  }, [manifestReady, applyDownstreamEnvelope, pushNotification, authToken]);

  if (loading) {
    return <div className="boot-status">Loading LCARS manifest…</div>;
  }

  if (error || !manifest) {
    return <div className="boot-status error">Failed to load manifest: {error ?? "Unknown error"}</div>;
  }

  return (
    <main
      className="lcars-boot-field"
      data-transport={transportStatus.mode}
      data-page-count={Object.keys(manifest.pages).length}
      data-log-streams={Object.keys(logsByStream).length}
      data-pending-actions={Object.keys(actionStatus).length}
    >
      <div className="lcars-boot-live" aria-live="polite">
        {notifications.map((notification) => (
          <p key={notification.id} data-level={notification.level}>
            {notification.message}
          </p>
        ))}
      </div>
    </main>
  );
}
