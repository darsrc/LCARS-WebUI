import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { LcarsColor, MicButtonWidget } from "../types/contract";

type MicState = "idle" | "requesting" | "recording" | "uploading" | "done" | "error";

interface MicButtonControlProps {
  widget: MicButtonWidget;
  onAudioUpload: (widget: MicButtonWidget, file: File) => Promise<void>;
  cardClass: (color?: LcarsColor | null) => string;
  style?: CSSProperties;
}

const stateText = (state: MicState, errorMessage: string | null): string => {
  if (state === "requesting") {
    return "Requesting permission";
  }
  if (state === "recording") {
    return "Recording";
  }
  if (state === "uploading") {
    return "Uploading";
  }
  if (state === "done") {
    return "Transmission queued";
  }
  if (state === "error") {
    return errorMessage ?? "Microphone error";
  }
  return "Hold to speak";
};

const createAudioFile = (blob: Blob): File => {
  const ext = blob.type.includes("ogg") ? "ogg" : "webm";
  return new File([blob], `mic-${Date.now()}.${ext}`, {
    type: blob.type || "audio/webm",
  });
};

const stopTracks = (stream: MediaStream | null): void => {
  if (!stream) {
    return;
  }
  for (const track of stream.getTracks()) {
    track.stop();
  }
};

const stateClass = (state: MicState): string => {
  return `lcars-mic-state ${state}`;
};

export const MicButtonControl = ({ widget, onAudioUpload, cardClass, style }: MicButtonControlProps) => {
  const [state, setState] = useState<MicState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  const clearStopTimer = (): void => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const resetRecorder = (): void => {
    recorderRef.current = null;
    clearStopTimer();
    stopTracks(streamRef.current);
    streamRef.current = null;
    chunksRef.current = [];
  };

  const stopRecording = (): void => {
    const recorder = recorderRef.current;
    if (!recorder) {
      return;
    }
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const startRecording = async (): Promise<void> => {
    if (widget.disabled || state === "recording" || state === "requesting" || state === "uploading") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setErrorMessage("Microphone requires HTTPS or localhost.");
      return;
    }

    setErrorMessage(null);
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setState("error");
        setErrorMessage("Recording failed");
        resetRecorder();
      };

      recorder.onstop = () => {
        void (async () => {
          clearStopTimer();
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          resetRecorder();

          if (blob.size === 0) {
            setState("error");
            setErrorMessage("No audio captured");
            return;
          }

          setState("uploading");
          try {
            await onAudioUpload(widget, createAudioFile(blob));
            setState("done");
            window.setTimeout(() => setState("idle"), 950);
          } catch {
            setState("error");
            setErrorMessage("Upload failed");
          }
        })();
      };

      recorder.start();
      setState("recording");
      stopTimerRef.current = window.setTimeout(stopRecording, widget.timeout_ms || 5000);
    } catch {
      setState("error");
      setErrorMessage("Microphone permission denied");
      resetRecorder();
    }
  };

  useEffect(() => {
    return () => {
      resetRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mediaUnavailable = !navigator.mediaDevices?.getUserMedia;

  return (
    <div className={`${cardClass(widget.color)} lcars-mic`} style={style}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <div className="lcars-mic-controls">
        <button
          className={cardClass(widget.color).replace("lcars-widget", "lcars-pill-button")}
          disabled={widget.disabled || state === "requesting" || state === "uploading"}
          onPointerCancel={stopRecording}
          onPointerDown={(event) => {
            event.preventDefault();
            void startRecording();
          }}
          onPointerLeave={stopRecording}
          onPointerUp={(event) => {
            event.preventDefault();
            stopRecording();
          }}
          type="button"
        >
          Hold to Speak
        </button>
        <span aria-live="polite" className={stateClass(state)}>
          {stateText(state, errorMessage)}
        </span>
      </div>
      {mediaUnavailable ? <p className="lcars-mic-warning">Microphone requires HTTPS or localhost.</p> : null}
    </div>
  );
};
