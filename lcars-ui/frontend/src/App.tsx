import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { WidgetRenderer } from "./components/WidgetRenderer";
import { LcarsFrame } from "./components/shell/LcarsFrame";
import {
  applyManifestUpdate,
  applyWidgetUpdate,
  getLogViewerByStream,
  resolveDefaultPageId,
} from "./runtime/manifest";
import { createLcarsAudioManager, type LcarsAudioCue } from "./runtime/audio";
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
import { isTheme } from "./theme/colorTokens";

const isLiveTransportMode = (mode: TransportStatus["mode"]): boolean => {
  return mode === "ws" || mode === "sse";
};

export default function App() {
  const authToken = import.meta.env.VITE_LCARS_TOKEN as string | undefined;
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string>("");
  const [transportStatus, setTransportStatus] = useState<TransportStatus>({
    mode: "offline",
    attempt: 0,
  });
  const [logsByStream, setLogsByStream] = useState<Record<string, string[]>>({});
  const [notifications, setNotifications] = useState<
    Array<{ id: number; level: "info" | "error"; message: string }>
  >([]);
  const [actionStatus, setActionStatus] = useState<Record<string, "pending" | "ok" | "fail">>({});

  const transportRef = useRef<ReturnType<typeof createProtocolTransport> | null>(null);
  const notificationCounterRef = useRef<number>(1);
  const manifestRef = useRef<Manifest | null>(null);
  const previousTransportModeRef = useRef<TransportStatus["mode"]>("offline");
  const suppressAutomatedAudioRef = useRef<boolean>(true);
  const hasSeenManifestRef = useRef<boolean>(false);
  const audioEnabledRef = useRef<boolean>(true);
  const audioRef = useRef(createLcarsAudioManager());

  const playCue = useCallback((cue: LcarsAudioCue, automated = false) => {
    if (automated && suppressAutomatedAudioRef.current) {
      return;
    }
    if (!audioEnabledRef.current) {
      return;
    }
    audioRef.current.play(cue);
  }, []);

  const pushNotification = useCallback(
    (level: "info" | "error", message: string) => {
      if (level === "error") {
        playCue("alert", true);
      }
      setNotifications((current) => {
        const next = [...current, { id: notificationCounterRef.current, level, message }];
        notificationCounterRef.current += 1;
        return next.slice(-6);
      });
    },
    [playCue],
  );

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

          const data = payload.data as Record<string, unknown>;
          if (
            typeof data.severity === "string" &&
            (data.severity === "red" || data.severity === "yellow")
          ) {
            playCue("alert", true);
          }

          const widgetId = payload.id;
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
          if (status === "fail") {
            playCue("negative");
          }
          return;
        }
        default:
          return;
      }
    },
    [playCue, pushNotification],
  );

  useEffect(() => {
    const unlockAudio = () => {
      void audioRef.current.unlock();
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      audioRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    manifestRef.current = manifest;
    if (!manifest) {
      return;
    }

    document.title = manifest.meta.app_name;
    audioEnabledRef.current = manifest.meta.sound_enabled;
    audioRef.current.setEnabled(manifest.meta.sound_enabled);

    if (!hasSeenManifestRef.current) {
      hasSeenManifestRef.current = true;
      window.setTimeout(() => {
        suppressAutomatedAudioRef.current = false;
      }, 0);
    }
  }, [manifest]);

  useEffect(() => {
    const previous = previousTransportModeRef.current;
    const next = transportStatus.mode;
    if (!isLiveTransportMode(previous) && isLiveTransportMode(next)) {
      playCue("ready", true);
    }
    previousTransportModeRef.current = next;
  }, [playCue, transportStatus.mode]);

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
      if (typeof value === "boolean") {
        playCue(value ? "toggle_on" : "toggle_off");
      } else {
        playCue("ack");
      }
      void (async () => {
        setActionStatus((current) => ({ ...current, [actionId]: "pending" }));
        if (sendWithTransport(makeActionEnvelope(actionId, value))) {
          return;
        }
        try {
          const response = await axios.post(
            `/lcars/action/${encodeURIComponent(actionId)}`,
            { value },
            { headers: authHeaders },
          );
          applyDownstreamEnvelope(parseEnvelope(response.data));
        } catch (requestError) {
          playCue("negative");
          setActionStatus((current) => ({ ...current, [actionId]: "fail" }));
          pushNotification(
            "error",
            requestError instanceof Error ? requestError.message : `Action "${actionId}" failed`,
          );
        }
      })();
    },
    [applyDownstreamEnvelope, authHeaders, playCue, pushNotification, sendWithTransport],
  );

  const onInput = useCallback(
    (id: string, value: string) => {
      const sent = sendWithTransport(makeInputEnvelope(id, value));
      if (!sent) {
        playCue("negative");
        pushNotification("error", `Input "${id}" requires an active WebSocket session`);
      }
    },
    [playCue, pushNotification, sendWithTransport],
  );

  const onFormSubmit = useCallback(
    (id: string, data: Record<string, unknown>) => {
      playCue("ack");
      const sent = sendWithTransport(makeFormSubmitEnvelope(id, data));
      if (!sent) {
        playCue("negative");
        pushNotification("error", `Form "${id}" requires an active WebSocket session`);
      }
    },
    [playCue, pushNotification, sendWithTransport],
  );

  const onAudioUpload = useCallback(
    async (widget: { upload_url: string; action_id: string }, file: File) => {
      const body = new FormData();
      body.append("file", file);
      await axios.post(widget.upload_url, body, {
        headers: {
          ...(authHeaders ?? {}),
          "Content-Type": "multipart/form-data",
        },
      });
      pushNotification("info", `Audio upload queued for action "${widget.action_id}"`);
    },
    [pushNotification, authHeaders],
  );

  if (loading) {
    return <div className="boot-status">Loading LCARS manifest...</div>;
  }

  if (error || !manifest) {
    return <div className="boot-status error">Failed to load manifest: {error ?? "Unknown error"}</div>;
  }

  const page = manifest.pages[activePageId];
  const theme = isTheme(manifest.meta.theme) ? manifest.meta.theme : "galaxy";

  return (
    <main
      className="lcars-ui"
      data-sound-enabled={manifest.meta.sound_enabled ? "true" : "false"}
      data-theme={theme}
      data-force-uppercase={manifest.meta.force_uppercase ? "true" : "false"}
      data-label-uppercase={manifest.meta.label_uppercase ? "true" : "false"}
      data-font-headers={manifest.meta.lcars_font_headers ? "true" : "false"}
      data-font-labels={manifest.meta.lcars_font_labels ? "true" : "false"}
      data-font-text={manifest.meta.lcars_font_text ? "true" : "false"}
    >
      <LcarsFrame
        actionStatus={actionStatus}
        activePageId={activePageId}
        manifest={manifest}
        onSelectPage={setActivePageId}
        transportStatus={transportStatus}
      >
        <section className="lcars-page-enter" key={activePageId}>
          <h2 className="lcars-page-title">{page?.title ?? activePageId}</h2>
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
      </LcarsFrame>

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
