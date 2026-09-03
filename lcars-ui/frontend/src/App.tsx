import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { Console } from "./lcars/Console";
import { useAnimatedPresence } from "./lcars/motion";
import {
  applyManifestUpdate,
  applyWidgetUpdate,
  getLogViewerByStream,
  getWidgetById,
  resolveDefaultPageId,
} from "./runtime/manifest";
import {
  clearPreferences,
  defaultPreferences,
  loadPreferences,
  savePreferences,
  type WebUIPreferences,
} from "./runtime/preferences";
import { resolveThemeDefinition, themeRootStyle } from "./runtime/themes";
import {
  bindingsForScope,
  eventTargetsEditableControl,
  matchesChord,
  resolveKeyBindingDefinitions,
} from "./runtime/keybindings";
import {
  loadSessionToken,
  saveSessionToken,
  sessionTokenFromResponseHeaders,
  SESSION_TOKEN_HEADER,
} from "./runtime/sessionToken";
import { createProtocolTransport, type TransportStatus } from "./runtime/transport";
import type { Manifest, Widget } from "./types/contract";
import { assertManifestVersion, isManifest, ManifestVersionError } from "./types/contract";
import {
  makeActionEnvelope,
  makeFormSubmitEnvelope,
  makeInputEnvelope,
  parseEnvelope,
  type Envelope,
  type UpstreamEnvelope,
} from "./types/protocol";
import type { ActionStatus } from "./widgets/WidgetRenderer";
import {
  NotificationCenter,
  type NotificationItem,
  type NotificationLevel,
} from "./widgets/NotificationCenter";

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [actionStatus, setActionStatus] = useState<Record<string, ActionStatus>>({});
  const [uiStateByWidget, setUiStateByWidget] = useState<Record<string, unknown>>({});
  const [webUIPreferences, setWebUIPreferences] = useState<WebUIPreferences | null>(null);
  // This tab's session identity (see runtime/sessionToken.ts) — separate
  // from authToken, which is the bearer principal/scopes credential.
  // sessionTokenRef holds the value actually used on the next request; the
  // state mirror re-renders dependents (headers/transport) once it settles.
  const sessionTokenRef = useRef<string | null>(loadSessionToken());
  const [sessionToken, setSessionToken] = useState<string | null>(() => sessionTokenRef.current);

  const transportRef = useRef<ReturnType<typeof createProtocolTransport> | null>(null);
  const notificationCounterRef = useRef<number>(1);
  const manifestRef = useRef<Manifest | null>(null);
  const previousManifestThemeRef = useRef<string | null>(null);
  const actionStatusTimeoutsRef = useRef<Record<string, number>>({});
  const notificationTimeoutsRef = useRef<Record<number, number>>({});

  const pushNotification = useCallback((
    level: NotificationLevel,
    message: string,
    options: {
      title?: string | null;
      durationMs?: number | null;
      dismissible?: boolean;
      movable?: boolean;
    } = {},
  ) => {
    const id = notificationCounterRef.current;
    notificationCounterRef.current += 1;
    const durationMs =
      typeof options.durationMs === "number"
        ? Math.min(300_000, Math.max(0, options.durationMs))
        : level === "error"
          ? 0
          : 6000;
    setNotifications((current) =>
      [
        ...current,
        {
          id,
          level,
          message,
          title: options.title,
          durationMs,
          dismissible: options.dismissible ?? true,
          movable: options.movable ?? true,
        },
      ].slice(-5),
    );
    if (durationMs > 0) {
      notificationTimeoutsRef.current[id] = window.setTimeout(() => {
        setNotifications((current) => current.filter((note) => note.id !== id));
        delete notificationTimeoutsRef.current[id];
      }, durationMs);
    }
  }, []);

  const dismissNotification = useCallback((id: number) => {
    const timeout = notificationTimeoutsRef.current[id];
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
      delete notificationTimeoutsRef.current[id];
    }
    setNotifications((current) => current.filter((note) => note.id !== id));
  }, []);

  // Presence keeps a dismissed/expired toast mounted for its exit sweep.
  const notePresence = useAnimatedPresence(notifications, (note) => String(note.id));

  const markActionStatus = useCallback((actionId: string, status: ActionStatus) => {
    setActionStatus((current) => ({ ...current, [actionId]: status }));
    const previousTimeout = actionStatusTimeoutsRef.current[actionId];
    if (previousTimeout !== undefined) {
      window.clearTimeout(previousTimeout);
      delete actionStatusTimeoutsRef.current[actionId];
    }
    if (status !== "pending") {
      actionStatusTimeoutsRef.current[actionId] = window.setTimeout(() => {
        setActionStatus((current) => {
          const next = { ...current };
          delete next[actionId];
          return next;
        });
        delete actionStatusTimeoutsRef.current[actionId];
      }, 1800);
    }
  }, []);

  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(actionStatusTimeoutsRef.current)) {
        window.clearTimeout(timeoutId);
      }
      actionStatusTimeoutsRef.current = {};
      for (const timeoutId of Object.values(notificationTimeoutsRef.current)) {
        window.clearTimeout(timeoutId);
      }
      notificationTimeoutsRef.current = {};
    };
  }, []);

  const authHeaders = useMemo<Record<string, string> | undefined>(
    () => (authToken ? { Authorization: `Bearer ${authToken}` } : undefined),
    [authToken],
  );

  // Reactive mirror of sessionTokenRef, for requests that fire after mount
  // (action/input/form/upload) — by then the manifest fetch below has
  // already settled the initial value.
  const sessionHeaders = useMemo<Record<string, string> | undefined>(
    () => (sessionToken ? { [SESSION_TOKEN_HEADER]: sessionToken } : undefined),
    [sessionToken],
  );

  // The server hands back a session token whenever it mints or rotates one
  // (manifest fetch, or any HTTP endpoint that had to mint a fresh session —
  // e.g. an expired or cloned token). Persist it and update state so later
  // requests and the transport pick it up.
  const applyRotatedSessionToken = useCallback((response: { headers: Record<string, unknown> }) => {
    const nextToken = sessionTokenFromResponseHeaders(response.headers);
    if (nextToken && nextToken !== sessionTokenRef.current) {
      sessionTokenRef.current = nextToken;
      saveSessionToken(nextToken);
      setSessionToken(nextToken);
    }
  }, []);

  const applyDownstreamEnvelope = useCallback(
    (envelope: Envelope) => {
      switch (envelope.type) {
        case "session_hydration": {
          // Reconnect hydration: the server's fully-merged current-state
          // manifest (shared projection + this session's own private
          // overlay), sent once on connect in place of the old frozen
          // build-time bootstrap. Always a full replace, like a
          // manifest_update at the root path — and any log_snapshot
          // messages that follow will repopulate logsByStream from scratch,
          // so it is cleared here rather than left holding stale streams
          // from a prior session.
          const payload = envelope.payload as { manifest?: unknown };
          try {
            assertManifestVersion(payload.manifest);
          } catch (versionError) {
            pushNotification(
              "error",
              versionError instanceof ManifestVersionError
                ? versionError.message
                : "Rejected session_hydration: unsupported manifest version",
            );
            return;
          }
          if (!isManifest(payload.manifest)) {
            pushNotification("error", "Rejected session_hydration: invalid manifest");
            return;
          }
          setManifest(payload.manifest);
          setLogsByStream({});
          return;
        }
        case "log_snapshot": {
          // Bounded log tail delivered on hydration: REPLACES the buffer
          // for this stream, unlike log_chunk which appends.
          const payload = envelope.payload as { stream_id?: unknown; lines?: unknown };
          if (typeof payload.stream_id !== "string" || !Array.isArray(payload.lines)) {
            pushNotification("error", "Rejected log_snapshot: invalid payload");
            return;
          }
          const streamId = payload.stream_id;
          const maxLines = manifestRef.current
            ? (getLogViewerByStream(manifestRef.current, streamId)?.max_lines ?? 1000)
            : 1000;
          const nextLines = payload.lines.filter((line): line is string => typeof line === "string");
          setLogsByStream((current) => ({ ...current, [streamId]: nextLines.slice(-maxLines) }));
          return;
        }
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
          const payload = envelope.payload as {
            message?: unknown;
            level?: unknown;
            title?: unknown;
            duration_ms?: unknown;
            dismissible?: unknown;
            movable?: unknown;
          };
          const levels = new Set<unknown>(["info", "success", "warning", "error"]);
          if (typeof payload.message !== "string" || !levels.has(payload.level)) {
            pushNotification("error", "Rejected notification: invalid payload");
            return;
          }
          if (
            payload.title !== undefined &&
            payload.title !== null &&
            typeof payload.title !== "string"
          ) {
            pushNotification("error", "Rejected notification: invalid title");
            return;
          }
          if (
            payload.duration_ms !== undefined &&
            payload.duration_ms !== null &&
            (typeof payload.duration_ms !== "number" ||
              !Number.isFinite(payload.duration_ms) ||
              payload.duration_ms < 0 ||
              payload.duration_ms > 300_000)
          ) {
            pushNotification("error", "Rejected notification: invalid duration");
            return;
          }
          pushNotification(payload.level as NotificationLevel, payload.message, {
            title: payload.title as string | null | undefined,
            durationMs: payload.duration_ms as number | null | undefined,
            dismissible:
              typeof payload.dismissible === "boolean" ? payload.dismissible : undefined,
            movable: typeof payload.movable === "boolean" ? payload.movable : undefined,
          });
          return;
        }
        case "action_ack": {
          const payload = envelope.payload as { action_id?: unknown; status?: unknown };
          if (
            typeof payload.action_id !== "string" ||
            (payload.status !== "ok" && payload.status !== "fail")
          ) {
            pushNotification("error", "Rejected action_ack: invalid payload");
            return;
          }
          markActionStatus(payload.action_id, payload.status);
          return;
        }
        default:
          return;
      }
    },
    [markActionStatus, pushNotification],
  );

  useEffect(() => {
    manifestRef.current = manifest;
    if (manifest) {
      document.title = manifest.meta.app_name;
    }
  }, [manifest]);

  useEffect(() => {
    if (!manifest) {
      previousManifestThemeRef.current = null;
      return;
    }
    const previousTheme = previousManifestThemeRef.current;
    previousManifestThemeRef.current = manifest.meta.theme;
    const availableThemes = new Set(manifest.meta.theme_catalog.map((theme) => theme.id));
    setWebUIPreferences((current) => {
      if (!current) return current;
      if (previousTheme !== null && previousTheme !== manifest.meta.theme) {
        return { ...current, theme: manifest.meta.theme };
      }
      if (availableThemes.has(current.theme)) return current;
      const next = { ...current, theme: manifest.meta.theme };
      savePreferences(manifest.meta.app_name, next);
      return next;
    });
  }, [manifest]);

  useEffect(() => {
    let cancelled = false;
    const loadManifest = async () => {
      setLoading(true);
      setError(null);
      try {
        // Read sessionTokenRef directly (not the sessionToken state/memo):
        // this effect must not re-fire when the token rotates as a result
        // of its own response below, or it would refetch in a loop.
        const requestHeaders = {
          ...authHeaders,
          ...(sessionTokenRef.current ? { [SESSION_TOKEN_HEADER]: sessionTokenRef.current } : {}),
        };
        const response = await axios.get<unknown>("/lcars/manifest", { headers: requestHeaders });
        applyRotatedSessionToken(response);
        // Version before shape: a v1 server's manifest can be structurally
        // valid and still carry widgets this bundle cannot render, so the
        // mismatch has to be reported as a mismatch, naming both versions.
        assertManifestVersion(response.data);
        if (!isManifest(response.data)) {
          throw new Error("Manifest payload shape is invalid");
        }
        if (!cancelled) {
          setManifest(response.data);
          setWebUIPreferences(loadPreferences(response.data.meta));
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
  }, [authHeaders, applyRotatedSessionToken]);

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
      sessionToken: sessionToken ?? undefined,
    });
    transportRef.current = transport;
    return () => {
      transport.close();
      transportRef.current = null;
    };
  }, [manifestReady, applyDownstreamEnvelope, pushNotification, authToken, sessionToken]);

  useEffect(() => {
    if (manifest && !manifest.pages[activePageId]) {
      setActivePageId(resolveInitialPageId(manifest));
    }
  }, [manifest, activePageId]);

  const sendWithTransport = useCallback(
    (envelope: UpstreamEnvelope): boolean => transportRef.current?.send(envelope) ?? false,
    [],
  );

  const dataForWidgetValue = (widget: Widget | undefined, value: unknown): Record<string, unknown> | null => {
    if (!widget) {
      return null;
    }
    switch (widget.type) {
      case "toggle":
      case "lcars_checkbox":
        return typeof value === "boolean" ? { checked: value } : null;
      case "select":
      case "lcars_radio":
      case "lcars_radio_toggle":
      case "text_input":
      case "number_input":
        return { value };
      default:
        return null;
    }
  };

  const applyOptimisticWidgetValue = useCallback((widgetId: string, value: unknown) => {
    setManifest((current) => {
      if (!current) {
        return current;
      }
      const widget = getWidgetById(current, widgetId);
      const data = dataForWidgetValue(widget, value);
      if (!data) {
        return current;
      }
      return applyWidgetUpdate(current, widgetId, data);
    });
  }, []);

  const applyOptimisticFormValues = useCallback((data: Record<string, unknown>) => {
    for (const [widgetId, value] of Object.entries(data)) {
      applyOptimisticWidgetValue(widgetId, value);
    }
  }, [applyOptimisticWidgetValue]);

  const onAction = useCallback(
    (actionId: string, value: unknown, widgetId?: string) => {
      markActionStatus(actionId, "pending");
      if (widgetId) {
        applyOptimisticWidgetValue(widgetId, value);
      }
      if (sendWithTransport(makeActionEnvelope(actionId, value))) {
        return;
      }
      void (async () => {
        try {
          const response = await axios.post(
            `/lcars/action/${encodeURIComponent(actionId)}`,
            { value },
            { headers: { ...authHeaders, ...sessionHeaders } },
          );
          applyRotatedSessionToken(response);
          applyDownstreamEnvelope(parseEnvelope(response.data));
        } catch (requestError) {
          markActionStatus(actionId, "fail");
          pushNotification("error", requestError instanceof Error ? requestError.message : `Action "${actionId}" failed`);
        }
      })();
    },
    [
      applyDownstreamEnvelope,
      applyOptimisticWidgetValue,
      applyRotatedSessionToken,
      authHeaders,
      markActionStatus,
      pushNotification,
      sendWithTransport,
      sessionHeaders,
    ],
  );

  useEffect(() => {
    if (!manifest) return;
    const overrides = (webUIPreferences ?? defaultPreferences(manifest.meta)).keyBindings;
    const definitions = resolveKeyBindingDefinitions(
      manifest.meta.key_bindings,
      Boolean(manifest.pages["lcars-options"]),
    );
    const bindings = bindingsForScope(definitions, overrides, "global");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const binding = bindings.find((candidate) =>
        (!eventTargetsEditableControl(event) || candidate.allow_in_inputs)
        && matchesChord(event, candidate.effectiveChord),
      );
      if (!binding) return;
      if (binding.prevent_default) event.preventDefault();
      if (binding.command === "open_options") {
        if (manifest.pages["lcars-options"]) setActivePageId("lcars-options");
        return;
      }
      if (binding.action_id) {
        onAction(binding.action_id, {
          binding_id: binding.id,
          chord: binding.effectiveChord,
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [manifest, onAction, webUIPreferences]);

  const onInput = useCallback(
    (id: string, value: string) => {
      markActionStatus(id, "pending");
      applyOptimisticWidgetValue(id, value);
      if (sendWithTransport(makeInputEnvelope(id, value))) {
        return;
      }
      void (async () => {
        try {
          const response = await axios.post(
            `/lcars/input/${encodeURIComponent(id)}`,
            { value },
            { headers: { ...authHeaders, ...sessionHeaders } },
          );
          applyRotatedSessionToken(response);
          applyDownstreamEnvelope(parseEnvelope(response.data));
        } catch (requestError) {
          markActionStatus(id, "fail");
          pushNotification("error", requestError instanceof Error ? requestError.message : `Input "${id}" failed`);
        }
      })();
    },
    [
      applyDownstreamEnvelope,
      applyOptimisticWidgetValue,
      applyRotatedSessionToken,
      authHeaders,
      markActionStatus,
      pushNotification,
      sendWithTransport,
      sessionHeaders,
    ],
  );

  const onFormSubmit = useCallback(
    (id: string, data: Record<string, unknown>) => {
      markActionStatus(id, "pending");
      applyOptimisticFormValues(data);
      if (sendWithTransport(makeFormSubmitEnvelope(id, data))) {
        return;
      }
      void (async () => {
        try {
          const response = await axios.post(
            `/lcars/form/${encodeURIComponent(id)}`,
            { data },
            { headers: { ...authHeaders, ...sessionHeaders } },
          );
          applyRotatedSessionToken(response);
          applyDownstreamEnvelope(parseEnvelope(response.data));
        } catch (requestError) {
          markActionStatus(id, "fail");
          pushNotification("error", requestError instanceof Error ? requestError.message : `Form "${id}" failed`);
        }
      })();
    },
    [
      applyDownstreamEnvelope,
      applyOptimisticFormValues,
      applyRotatedSessionToken,
      authHeaders,
      markActionStatus,
      pushNotification,
      sendWithTransport,
      sessionHeaders,
    ],
  );

  const onAudioUpload = useCallback(
    async (widget: Extract<Widget, { type: "mic_button" }>, audio: Blob) => {
      const formData = new FormData();
      formData.append("file", audio, "lcars-command.webm");
      const response = await axios.post(widget.upload_url, formData, {
        headers: {
          ...(authHeaders ?? {}),
          ...(sessionHeaders ?? {}),
          "Content-Type": "multipart/form-data",
        },
      });
      applyRotatedSessionToken(response);
      pushNotification("info", `Audio upload queued for "${widget.action_id}"`);
    },
    [applyRotatedSessionToken, authHeaders, pushNotification, sessionHeaders],
  );

  const onFileUpload = useCallback(
    async (
      widget: Extract<Widget, { type: "file_upload" }>,
      files: File[],
      onProgress?: (percent: number) => void,
    ) => {
      markActionStatus(widget.action_id, "pending");
      const formData = new FormData();
      formData.append("action_id", widget.action_id);
      for (const file of files) formData.append("files", file, file.name);
      try {
        const response = await axios.post(widget.upload_url, formData, {
          headers: { ...authHeaders, ...sessionHeaders },
          onUploadProgress: (event) => {
            if (event.total && event.total > 0) onProgress?.((event.loaded / event.total) * 100);
          },
        });
        applyRotatedSessionToken(response);
        const payload =
          response.data && typeof response.data === "object"
            ? (response.data as Record<string, unknown>)
            : {};
        if (payload.action_dispatched === true) {
          markActionStatus(widget.action_id, "ok");
        } else {
          const metadata = files.map((file) => ({
            name: file.name,
            size: file.size,
            content_type: file.type || null,
          }));
          onAction(
            widget.action_id,
            { files: metadata, response: response.data ?? null },
            widget.id,
          );
        }
        pushNotification(
          "success",
          `${files.length} file${files.length === 1 ? "" : "s"} transferred.`,
          { title: widget.label ?? "Upload complete" },
        );
      } catch (requestError) {
        markActionStatus(widget.action_id, "fail");
        pushNotification(
          "error",
          requestError instanceof Error ? requestError.message : "File upload failed",
          { title: widget.label ?? "Upload failed" },
        );
        throw requestError;
      }
    },
    [applyRotatedSessionToken, authHeaders, markActionStatus, onAction, pushNotification, sessionHeaders],
  );

  const onWebUIPreferencesChange = useCallback((patch: Partial<WebUIPreferences>) => {
    const meta = manifestRef.current?.meta;
    if (!meta) return;
    setWebUIPreferences((current) => {
      const next = { ...(current ?? defaultPreferences(meta)), ...patch };
      savePreferences(meta.app_name, next);
      return next;
    });
  }, []);

  const onWebUIPreferencesReset = useCallback(() => {
    const meta = manifestRef.current?.meta;
    if (!meta) return;
    clearPreferences(meta.app_name);
    setWebUIPreferences(defaultPreferences(meta));
    pushNotification("info", "Application interface defaults restored.", {
      title: "Options",
    });
  }, [pushNotification]);

  const onUiStateChange = useCallback((widgetId: string, value: unknown) => {
    setUiStateByWidget((current) => ({ ...current, [widgetId]: value }));
  }, []);

  if (loading) {
    return <div className="boot-status">Loading LCARS manifest…</div>;
  }

  if (error || !manifest) {
    return <div className="boot-status error">Failed to load manifest: {error ?? "Unknown error"}</div>;
  }

  const page =
    manifest.pages[activePageId] ?? manifest.pages[resolveDefaultPageId(manifest)] ?? Object.values(manifest.pages)[0];
  const preferences = webUIPreferences ?? defaultPreferences(manifest.meta);
  const activeTheme = resolveThemeDefinition(manifest.meta, preferences.theme);
  const keyBindings = resolveKeyBindingDefinitions(
    manifest.meta.key_bindings,
    Boolean(manifest.pages["lcars-options"]),
  );

  return (
    <div
      className="lcars-root"
      data-alert={manifest.meta.alert_condition}
      data-font-text={preferences.lcarsFontText}
      data-motion={preferences.motion}
      data-sound={preferences.soundEnabled}
      data-theme={activeTheme.base}
      data-theme-id={activeTheme.id}
      data-uppercase={preferences.uppercase}
      style={themeRootStyle(activeTheme)}
    >
      {page ? (
        <Console
          actionStatus={actionStatus}
          activePageId={activePageId}
          logsByStream={logsByStream}
          keyBindings={keyBindings}
          manifest={manifest}
          onAction={onAction}
          onAudioUpload={onAudioUpload}
          onFileUpload={onFileUpload}
          onFormSubmit={onFormSubmit}
          onInput={onInput}
          onSelectPage={setActivePageId}
          onUiStateChange={onUiStateChange}
          onWebUIPreferencesChange={onWebUIPreferencesChange}
          onWebUIPreferencesReset={onWebUIPreferencesReset}
          page={page}
          transportStatus={transportStatus}
          uiStateByWidget={uiStateByWidget}
          webUIPreferences={preferences}
          themeCatalog={manifest.meta.theme_catalog}
        />
      ) : (
        <div className="lcars-empty">No page</div>
      )}

      {notePresence.length > 0 ? (
        <NotificationCenter entries={notePresence} onDismiss={dismissNotification} />
      ) : null}
    </div>
  );
}
