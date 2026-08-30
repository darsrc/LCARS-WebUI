import { useEffect, useRef, useState } from "react";

import type { Widget } from "../types/contract";
import type { WidgetHandlers } from "./rendererShared";
import { computeRms, defaultVadConfig, SilenceTracker } from "./vad";

export function MicButtonControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "mic_button" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  if (widget.continuous) {
    return <ContinuousMicButtonControl widget={widget} label={label} handlers={handlers} />;
  }
  return <PushToTalkMicButtonControl widget={widget} label={label} handlers={handlers} />;
}

const microphoneConstraints = (widget: Extract<Widget, { type: "mic_button" }>): MediaTrackConstraints | boolean =>
  widget.options?.device_id ? { deviceId: { exact: widget.options.device_id } } : true;

const recorderOptions = (widget: Extract<Widget, { type: "mic_button" }>): MediaRecorderOptions | undefined => {
  const mimeType = widget.options?.mime_types.find((candidate) => MediaRecorder.isTypeSupported(candidate));
  return mimeType ? { mimeType } : undefined;
};

function PushToTalkMicButtonControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "mic_button" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const [mode, setMode] = useState<"idle" | "recording" | "uploading" | "error">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const finishRecording = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    if (!handlers.onAudioUpload || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      handlers.onAction(widget.action_id, null, widget.id);
      setMode("error");
      return;
    }

    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints(widget) });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, recorderOptions(widget));
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const durationMs = Math.max(0, Math.round(performance.now() - startedAtRef.current));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (
          durationMs < (widget.options?.min_duration_ms ?? 0) ||
          (widget.options?.max_bytes != null && audio.size > widget.options.max_bytes)
        ) {
          setMode("error");
          return;
        }
        setMode("uploading");
        void handlers.onAudioUpload?.(widget, audio)
          .then(() => {
            setMode("idle");
            handlers.onAction(
              widget.action_id,
              { bytes: audio.size, mime_type: audio.type || null, duration_ms: durationMs },
              widget.id,
            );
          })
          .catch(() => setMode("error"));
      };
      recorder.start();
      startedAtRef.current = performance.now();
      setMode("recording");
      timeoutRef.current = window.setTimeout(finishRecording, widget.timeout_ms);
    } catch {
      setMode("error");
    }
  };

  const modeLabel = mode === "recording" ? "RECORDING…" : mode === "uploading" ? "UPLOADING…" : mode === "error" ? "ERROR" : null;
  // The push-to-talk phase machine (idle/recording/uploading/error) is real,
  // multi-phase state the shared pending/ok/fail contract can't fully carry
  // (recording has no equivalent there) — it wins whenever it has an
  // opinion; the externally-tracked actionStatus only shows through while
  // this control is at rest, so it still surfaces the shared contract.
  const derivedStatus = mode === "error" ? "fail" : mode === "uploading" ? "pending" : undefined;
  const externalStatus = handlers.actionStatus?.[widget.action_id];

  return (
    <button
      className="lcars-btn"
      data-action-status={derivedStatus ?? externalStatus ?? undefined}
      data-on={mode === "recording"}
      disabled={widget.disabled}
      onClick={() => {
        if (mode === "recording") {
          finishRecording();
          return;
        }
        void startRecording();
      }}
      type="button"
    >
      <span>{modeLabel ?? (label || "Record")}</span>
    </button>
  );
}

type ContinuousMicState = "standby" | "listening" | "capturing" | "uploading" | "error";

function ContinuousMicButtonControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "mic_button" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const [state, setState] = useState<ContinuousMicState>("standby");
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const trackerRef = useRef<SilenceTracker | null>(null);
  const lastPollTimeRef = useRef<number>(0);
  const safetyCapTimeoutRef = useRef<number | null>(null);
  const discardCurrentRef = useRef<boolean>(false);
  const byteBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const startedAtRef = useRef(0);

  const teardown = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (safetyCapTimeoutRef.current !== null) {
      window.clearTimeout(safetyCapTimeoutRef.current);
      safetyCapTimeoutRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      discardCurrentRef.current = true;
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    trackerRef.current = null;
  };

  useEffect(() => {
    return () => {
      teardown();
    };
  }, []);

  useEffect(() => {
    if (!widget.continuous) {
      teardown();
      setState("standby");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.continuous]);

  const finishCapture = ({ discard }: { discard: boolean }) => {
    discardCurrentRef.current = discard;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const beginCapture = () => {
    const stream = streamRef.current;
    if (!stream || recorderRef.current?.state === "recording") return;
    chunksRef.current = [];
    discardCurrentRef.current = false;
    const recorder = new MediaRecorder(stream, recorderOptions(widget));
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const shouldDiscard = discardCurrentRef.current;
      discardCurrentRef.current = false;
      if (safetyCapTimeoutRef.current !== null) {
        window.clearTimeout(safetyCapTimeoutRef.current);
        safetyCapTimeoutRef.current = null;
      }
      if (shouldDiscard) {
        setState("listening");
        return;
      }
      const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const durationMs = Math.max(0, Math.round(performance.now() - startedAtRef.current));
      if (
        durationMs < (widget.options?.min_duration_ms ?? 0) ||
        (widget.options?.max_bytes != null && audio.size > widget.options.max_bytes)
      ) {
        setState("error");
        return;
      }
      setState("uploading");
      void handlers.onAudioUpload?.(widget, audio)
        .then(() => {
          handlers.onAction(
            widget.action_id,
            { bytes: audio.size, mime_type: audio.type || null, duration_ms: durationMs },
            widget.id,
          );
          setState("listening");
        })
        .catch(() => setState("error"));
    };
    recorder.start();
    startedAtRef.current = performance.now();
    setState("capturing");
    safetyCapTimeoutRef.current = window.setTimeout(() => {
      finishCapture({ discard: false });
    }, widget.timeout_ms);
  };

  const pollTick = (nowMs: number) => {
    const analyser = analyserRef.current;
    const tracker = trackerRef.current;
    if (!analyser || !tracker) return;

    if (!byteBufferRef.current || byteBufferRef.current.length !== analyser.fftSize) {
      byteBufferRef.current = new Uint8Array(analyser.fftSize);
    }
    analyser.getByteTimeDomainData(byteBufferRef.current);
    const rms = computeRms(byteBufferRef.current);

    const deltaMs = lastPollTimeRef.current === 0 ? 0 : nowMs - lastPollTimeRef.current;
    lastPollTimeRef.current = nowMs;

    const event = tracker.update(rms, deltaMs);
    if (event.kind === "speech-start") {
      beginCapture();
    } else if (event.kind === "speech-end") {
      finishCapture({ discard: false });
    } else if (event.kind === "noise-discarded") {
      finishCapture({ discard: true });
    }

    rafRef.current = window.requestAnimationFrame(pollTick);
  };

  const arm = async () => {
    if (
      !handlers.onAudioUpload ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined" ||
      typeof AudioContext === "undefined"
    ) {
      handlers.onAction(widget.action_id, null, widget.id);
      setState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints(widget) });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      const vadConfig = defaultVadConfig(widget.silence_ms);
      if (widget.options?.vad_threshold != null) vadConfig.threshold = widget.options.vad_threshold;
      if (widget.options?.min_duration_ms) vadConfig.minUtteranceMs = widget.options.min_duration_ms;
      trackerRef.current = new SilenceTracker(vadConfig);
      lastPollTimeRef.current = 0;
      setState("listening");
      rafRef.current = window.requestAnimationFrame(pollTick);
    } catch {
      setState("error");
    }
  };

  const modeLabel =
    state === "capturing"
      ? "CAPTURING…"
      : state === "uploading"
        ? "UPLOADING…"
        : state === "listening"
          ? "LISTENING…"
          : state === "error"
            ? "ERROR"
            : null;
  // Same merge policy as the push-to-talk variant: the continuous VAD phase
  // machine (standby/listening/capturing/uploading/error) wins when it has
  // an opinion; the shared actionStatus shows through only at rest.
  const derivedStatus = state === "error" ? "fail" : state === "uploading" ? "pending" : undefined;
  const externalStatus = handlers.actionStatus?.[widget.action_id];

  return (
    <button
      className="lcars-btn"
      data-action-status={derivedStatus ?? externalStatus ?? undefined}
      data-on={state === "capturing"}
      data-listening={state === "listening"}
      disabled={widget.disabled}
      onClick={() => {
        if (state === "standby" || state === "error") {
          void arm();
          return;
        }
        teardown();
        setState("standby");
      }}
      type="button"
    >
      <span>{modeLabel ?? (label || "Record")}</span>
    </button>
  );
}


