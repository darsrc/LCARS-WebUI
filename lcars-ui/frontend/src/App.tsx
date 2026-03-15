import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { HolodeckFamilyScene } from "./components/phase14/HolodeckFamilyScene";
import { PeriodicTableFamilyScene } from "./components/phase14/PeriodicTableFamilyScene";
import { WidgetRenderer } from "./components/WidgetRenderer";
import { SeismographicFamilyScene } from "./components/phase14/SeismographicFamilyScene";
import { getHolodeckSceneSpec } from "./components/phase14/holodeckFamilyData";
import { getPeriodicTableSceneSpec } from "./components/phase14/periodicTableFamilyData";
import { getSeismographicSceneSpec } from "./components/phase14/seismographicFamilyData";
import { LcarsBar } from "./components/shapes/LcarsBar";
import { LcarsFrame } from "./components/shell/LcarsFrame";
import { JoernStrictPageRenderer } from "./components/strict/JoernStrictPageRenderer";
import { LegacyStrictPageRenderer } from "./components/strict/LegacyStrictPageRenderer";
import {
  applyManifestUpdate,
  applyWidgetUpdate,
  getLogViewerByStream,
  resolveDefaultPageId,
} from "./runtime/manifest";
import { createLcarsAudioManager, type LcarsAudioCue } from "./runtime/audio";
import { createProtocolTransport, type TransportStatus } from "./runtime/transport";
import { VisualLanguageProvider } from "./context/VisualLanguageContext";
import type { Manifest, Widget } from "./types/contract";
import { isManifest } from "./types/contract";
import { buildPhase14FixtureManifest, resolvePhase14FixtureFamilyId } from "./fixtures/phase14TargetFixtures";
import {
  makeActionEnvelope,
  makeFormSubmitEnvelope,
  makeInputEnvelope,
  parseEnvelope,
  type Envelope,
  type UpstreamEnvelope,
} from "./types/protocol";
import { isTheme } from "./theme/colorTokens";
import {
  parseRendererBakeoffRequest,
  RENDERER_BAKEOFF_MODE,
  resolveRendererBakeoff,
} from "./fixtures/rendererBakeoffHarness";

const PRODUCT_RENDERER_BASE = "legacy_strict";
const ACCEPTANCE_FIXTURE_ENGINE = "phase14_family";
const DEPRECATED_RENDERER = "joern_strict";

const isLiveTransportMode = (mode: TransportStatus["mode"]): boolean => {
  return mode === "ws" || mode === "sse";
};

const resolvePageIdFromQuery = (manifest: Manifest): string | null => {
  const params = new URLSearchParams(window.location.search);
  const requestedPage = params.get("page");
  if (!requestedPage) {
    return null;
  }
  if (manifest.pages[requestedPage]) {
    return requestedPage;
  }
  return null;
};

const resolveInitialPageId = (manifest: Manifest): string => {
  return resolvePageIdFromQuery(manifest) ?? resolveDefaultPageId(manifest);
};

const resolvePhase14FixtureTargetId = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("fixtureManifest") !== "phase14") {
    return null;
  }
  const requestedTarget = params.get("target");
  return requestedTarget && requestedTarget.length > 0 ? requestedTarget : null;
};

const comparisonRootStateClassName = (status: "unsupported" | "error"): string => {
  return status === "error" ? "boot-status error" : "boot-status";
};

export default function App() {
  const authToken = import.meta.env.VITE_LCARS_TOKEN as string | undefined;
  const bakeoffRequest = useMemo(() => parseRendererBakeoffRequest(window.location.search), []);
  const bakeoffResolution = useMemo(() => {
    if (bakeoffRequest.mode !== "active" || !bakeoffRequest.request) {
      return null;
    }
    return resolveRendererBakeoff(bakeoffRequest.request);
  }, [bakeoffRequest]);
  const phase14FixtureTargetId = useMemo(() => resolvePhase14FixtureTargetId(), []);
  const phase14FamilySceneTargetId = useMemo(() => {
    if (bakeoffResolution) {
      return bakeoffResolution.entryKind === "holodeck_scene" ||
        bakeoffResolution.entryKind === "periodic_table_scene" ||
        bakeoffResolution.entryKind === "seismographic_scene"
        ? bakeoffResolution.probeId
        : null;
    }
    return phase14FixtureTargetId;
  }, [bakeoffResolution, phase14FixtureTargetId]);
  const phase14FixtureFamilyId = useMemo(() => {
    if (!phase14FamilySceneTargetId) {
      return null;
    }
    return resolvePhase14FixtureFamilyId(phase14FamilySceneTargetId);
  }, [phase14FamilySceneTargetId]);
  const phase14SeismographicScene = useMemo(() => {
    if (bakeoffResolution?.entryKind === "seismographic_scene") {
      return bakeoffResolution.scene as NonNullable<ReturnType<typeof getSeismographicSceneSpec>>;
    }
    if (!phase14FamilySceneTargetId || bakeoffRequest.mode === "active") {
      return null;
    }
    return getSeismographicSceneSpec(phase14FamilySceneTargetId);
  }, [bakeoffRequest.mode, bakeoffResolution, phase14FamilySceneTargetId]);
  const phase14HolodeckScene = useMemo(() => {
    if (bakeoffResolution?.entryKind === "holodeck_scene") {
      return bakeoffResolution.scene as NonNullable<ReturnType<typeof getHolodeckSceneSpec>>;
    }
    if (!phase14FamilySceneTargetId || bakeoffRequest.mode === "active") {
      return null;
    }
    return getHolodeckSceneSpec(phase14FamilySceneTargetId);
  }, [bakeoffRequest.mode, bakeoffResolution, phase14FamilySceneTargetId]);
  const phase14PeriodicTableScene = useMemo(() => {
    if (bakeoffResolution?.entryKind === "periodic_table_scene") {
      return bakeoffResolution.scene as NonNullable<ReturnType<typeof getPeriodicTableSceneSpec>>;
    }
    if (!phase14FamilySceneTargetId || bakeoffRequest.mode === "active") {
      return null;
    }
    return getPeriodicTableSceneSpec(phase14FamilySceneTargetId);
  }, [bakeoffRequest.mode, bakeoffResolution, phase14FamilySceneTargetId]);
  const phase14FixtureManifest = useMemo(() => {
    if (bakeoffResolution?.entryKind === "manifest") {
      return bakeoffResolution.manifest;
    }
    if (!phase14FixtureTargetId || bakeoffRequest.mode === "active") {
      return null;
    }
    return buildPhase14FixtureManifest(phase14FixtureTargetId);
  }, [bakeoffRequest.mode, bakeoffResolution, phase14FixtureTargetId]);
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
      if (bakeoffRequest.mode === "error") {
        if (!cancelled) {
          setManifest(null);
          setActivePageId("");
          setError(bakeoffRequest.message ?? "Invalid renderer bake-off request");
          setLoading(false);
        }
        return;
      }
      if (bakeoffResolution && bakeoffResolution.entryKind !== "manifest") {
        if (!cancelled) {
          setManifest(null);
          setActivePageId("");
          setError(bakeoffResolution.entryKind === "error" ? bakeoffResolution.message : null);
          setLoading(false);
        }
        return;
      }
      if (bakeoffResolution?.entryKind === "manifest" && phase14FixtureManifest) {
        if (!cancelled) {
          setManifest(phase14FixtureManifest);
          setActivePageId(bakeoffResolution.activePageId);
          setLoading(false);
        }
        return;
      }
      if (phase14FixtureTargetId) {
        if (!phase14FixtureManifest) {
          if (!cancelled) {
            setError(`Unknown Phase 14 target fixture: ${phase14FixtureTargetId}`);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setManifest(phase14FixtureManifest);
          setActivePageId(resolveInitialPageId(phase14FixtureManifest));
          setLoading(false);
        }
        return;
      }
      try {
        const response = await axios.get<unknown>("/lcars/manifest", { headers: authHeaders });
        const parsed = response.data;
        if (!isManifest(parsed)) {
          throw new Error("Manifest payload shape is invalid");
        }
        if (!cancelled) {
          setManifest(parsed);
          setActivePageId(resolveInitialPageId(parsed));
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
  }, [authHeaders, bakeoffRequest, bakeoffResolution, phase14FixtureManifest, phase14FixtureTargetId]);

  const manifestReady = manifest !== null;

  useEffect(() => {
    if (!manifestReady || phase14FixtureTargetId || bakeoffRequest.mode === "active") {
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
  }, [manifestReady, applyDownstreamEnvelope, pushNotification, authToken, phase14FixtureTargetId, bakeoffRequest.mode]);

  useEffect(() => {
    if (!manifest) {
      return;
    }
    if (manifest.pages[activePageId]) {
      return;
    }
    setActivePageId(resolveInitialPageId(manifest));
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

  if (bakeoffRequest.mode === "active" && bakeoffResolution && bakeoffResolution.entryKind !== "manifest") {
    const strictRendererAttr =
      bakeoffResolution.rendererId === "legacy_strict"
        ? "legacy"
        : bakeoffResolution.rendererId === "joern_strict"
          ? "joern"
          : undefined;
    return (
      <main
        className="lcars-ui"
        data-product-renderer-base={PRODUCT_RENDERER_BASE}
        data-acceptance-fixture-engine={ACCEPTANCE_FIXTURE_ENGINE}
        data-deprecated-renderer={DEPRECATED_RENDERER}
        data-comparison-harness={RENDERER_BAKEOFF_MODE}
        data-comparison-probe-id={bakeoffResolution.probeId}
        data-comparison-probe-kind={bakeoffResolution.probeKind}
        data-comparison-renderer-id={bakeoffResolution.rendererId}
        data-comparison-status={bakeoffResolution.status}
        data-phase14-target-family={bakeoffResolution.familyId ?? undefined}
        data-strict-renderer={strictRendererAttr}
        data-theme="galaxy"
        data-visual-language="strict"
      >
        {bakeoffResolution.entryKind === "error" ? (
          <section className={comparisonRootStateClassName("error")} data-comparison-state="error">
            Renderer bake-off request failed: {bakeoffResolution.message}
          </section>
        ) : bakeoffResolution.entryKind === "unsupported" ? (
          <section className={comparisonRootStateClassName("unsupported")} data-comparison-state="unsupported">
            Renderer bake-off unsupported: {bakeoffResolution.message}
          </section>
        ) : phase14SeismographicScene ? (
          <SeismographicFamilyScene scene={phase14SeismographicScene} />
        ) : phase14HolodeckScene ? (
          <HolodeckFamilyScene scene={phase14HolodeckScene} />
        ) : phase14PeriodicTableScene ? (
          <PeriodicTableFamilyScene scene={phase14PeriodicTableScene} />
        ) : (
          <section className={comparisonRootStateClassName("error")} data-comparison-state="error">
            Renderer bake-off request failed: no scene resolved for {bakeoffResolution.probeId}
          </section>
        )}
      </main>
    );
  }

  if (error || !manifest) {
    return (
      <div
        className="boot-status error"
        data-product-renderer-base={PRODUCT_RENDERER_BASE}
        data-acceptance-fixture-engine={ACCEPTANCE_FIXTURE_ENGINE}
        data-deprecated-renderer={DEPRECATED_RENDERER}
        data-comparison-harness={bakeoffRequest.mode === "active" ? RENDERER_BAKEOFF_MODE : undefined}
        data-comparison-probe-id={bakeoffResolution?.probeId ?? undefined}
        data-comparison-probe-kind={bakeoffResolution?.probeKind ?? undefined}
        data-comparison-renderer-id={bakeoffResolution?.rendererId ?? undefined}
        data-comparison-status={bakeoffResolution?.status ?? (bakeoffRequest.mode === "error" ? "error" : undefined)}
      >
        Failed to load manifest: {error ?? "Unknown error"}
      </div>
    );
  }

  const page =
    manifest.pages[activePageId] ??
    manifest.pages[resolveDefaultPageId(manifest)] ??
    Object.values(manifest.pages)[0];
  const theme = isTheme(manifest.meta.theme) ? manifest.meta.theme : "galaxy";
  const visualLanguage = manifest.meta.visual_language === "classic" ? "classic" : "strict";
  const pageTitleColor = manifest.layout.header.color ?? "orange";
  const pageRows = page?.rows ?? [];
  const isPageTitleSweep = (widget: Widget): boolean => {
    return (
      widget.type === "lcars_sweep" &&
      typeof widget.title === "string" &&
      widget.title === page?.title
    );
  };
  const hasPageTitleSweep =
    pageRows.some((row) =>
      row.columns.some((column) =>
        column.widgets.some(
          (widget) => isPageTitleSweep(widget),
        ),
      ),
    ) ?? false;
  const showPageTitleBar = visualLanguage === "classic" || !hasPageTitleSweep;
  const joernDeprecatedCompatibilityMode =
    visualLanguage === "strict" &&
    manifest.meta.strict_renderer === "joern" &&
    bakeoffRequest.mode !== "active";
  // Post-bake-off: live product pages run through legacy_strict; Joern remains only for archived comparison mode.
  const strictRenderer =
    visualLanguage === "strict" &&
    manifest.meta.strict_renderer === "joern" &&
    !joernDeprecatedCompatibilityMode
      ? "joern"
      : "legacy";
  const renderWidget = (widget: Widget) => (
    <WidgetRenderer
      key={widget.id}
      logsByStream={logsByStream}
      onAction={onAction}
      onAudioUpload={onAudioUpload}
      onFormSubmit={onFormSubmit}
      onInput={onInput}
      widget={widget}
    />
  );
  const phase14FamilyRecipeId =
    phase14SeismographicScene?.familyId ??
    phase14HolodeckScene?.familyId ??
    phase14PeriodicTableScene?.familyId ??
    undefined;
  return (
    <main
      className="lcars-ui"
      data-sound-enabled={manifest.meta.sound_enabled ? "true" : "false"}
      data-theme={theme}
      data-visual-language={visualLanguage}
      data-strict-renderer={strictRenderer}
      data-force-uppercase={manifest.meta.force_uppercase ? "true" : "false"}
      data-label-uppercase={manifest.meta.label_uppercase ? "true" : "false"}
      data-font-headers={manifest.meta.lcars_font_headers ? "true" : "false"}
      data-font-labels={manifest.meta.lcars_font_labels ? "true" : "false"}
      data-font-text={manifest.meta.lcars_font_text ? "true" : "false"}
      data-product-renderer-base={PRODUCT_RENDERER_BASE}
      data-acceptance-fixture-engine={ACCEPTANCE_FIXTURE_ENGINE}
      data-deprecated-renderer={DEPRECATED_RENDERER}
      data-deprecated-renderer-request={joernDeprecatedCompatibilityMode ? "joern" : undefined}
      data-fixture-manifest={phase14FixtureTargetId ? "phase14" : undefined}
      data-comparison-harness={bakeoffRequest.mode === "active" ? RENDERER_BAKEOFF_MODE : undefined}
      data-comparison-probe-id={bakeoffResolution?.probeId ?? undefined}
      data-comparison-probe-kind={bakeoffResolution?.probeKind ?? undefined}
      data-comparison-renderer-id={bakeoffResolution?.rendererId ?? undefined}
      data-comparison-status={bakeoffResolution?.status ?? undefined}
      data-phase14-target-id={phase14FixtureTargetId ?? undefined}
      data-phase14-target-family={bakeoffResolution?.familyId ?? phase14FixtureFamilyId ?? undefined}
      data-phase14-family-recipe={phase14FamilyRecipeId}
    >
      <VisualLanguageProvider value={visualLanguage}>
        {phase14SeismographicScene ? (
          <SeismographicFamilyScene scene={phase14SeismographicScene} />
        ) : phase14HolodeckScene ? (
          <HolodeckFamilyScene scene={phase14HolodeckScene} />
        ) : phase14PeriodicTableScene ? (
          <PeriodicTableFamilyScene scene={phase14PeriodicTableScene} />
        ) : (
          <LcarsFrame
            actionStatus={actionStatus}
            activePageId={activePageId}
            manifest={manifest}
            onSelectPage={setActivePageId}
            transportStatus={transportStatus}
          >
            <section className="lcars-page-enter" key={activePageId}>
              {joernDeprecatedCompatibilityMode ? (
                <section className="boot-status" data-renderer-deprecation="joern">
                  Joern strict renderer is deprecated. Live product pages now render through legacy_strict while
                  phase14_family remains the target-bank acceptance engine.
                </section>
              ) : null}
              {showPageTitleBar ? (
                <div className="lcars-page-title" role="heading" aria-level={2}>
                  <LcarsBar
                    className="lcars-page-title-bar"
                    color={pageTitleColor}
                    label={page?.title ?? activePageId}
                    roundedEnd
                    roundedStart
                  />
                </div>
              ) : null}
              {visualLanguage === "strict" ? (
                strictRenderer === "joern" ? (
                  <JoernStrictPageRenderer onAction={onAction} page={page} />
                ) : (
                  <LegacyStrictPageRenderer
                    page={page}
                    pageTitleColor={pageTitleColor}
                    renderWidget={renderWidget}
                  />
                )
              ) : (
                pageRows.map((row) => (
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
                ))
              )}
            </section>
          </LcarsFrame>
        )}
      </VisualLanguageProvider>

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
