import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";

import type { FileUploadWidget } from "../types/contract";
import type { ActionStatus } from "./rendererShared";

export type FileUploadHandler = (
  widget: FileUploadWidget,
  files: File[],
  onProgress?: (percent: number) => void,
) => Promise<void>;

interface FileUploadControlProps {
  /** The shared action-status contract every busy control surfaces
   * (`data-action-status`, driven by `WidgetHandlers.actionStatus`). Merged
   * with — never replacing — the richer local upload state below: this
   * control tracks its own idle/uploading/ok/error phases plus byte
   * progress, which the three-state shared contract cannot express on its
   * own, so the local state wins whenever it has an opinion. */
  actionStatus?: ActionStatus;
  onUpload?: FileUploadHandler;
  widget: FileUploadWidget;
}

type UploadState = "idle" | "uploading" | "ok" | "error";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
};

const acceptsFile = (file: File, accepted: readonly string[]): boolean => {
  if (accepted.length === 0) return true;
  const filename = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return accepted.some((raw) => {
    const token = raw.trim().toLowerCase();
    if (!token) return false;
    if (token.startsWith(".")) return filename.endsWith(token);
    if (token.endsWith("/*")) return mime.startsWith(token.slice(0, -1));
    return mime === token;
  });
};

export function FileUploadControl({ actionStatus, onUpload, widget }: FileUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (incoming: File[]) => {
    if (widget.disabled) return;
    const selected = incoming.slice(0, widget.multiple ? widget.max_files : 1);
    if (incoming.length > selected.length) {
      setState("error");
      setError(`Select no more than ${widget.multiple ? widget.max_files : 1} file(s).`);
      return;
    }
    const unsupported = selected.find((file) => !acceptsFile(file, widget.accept));
    if (unsupported) {
      setState("error");
      setError(`${unsupported.name} is not an accepted file type.`);
      return;
    }
    const oversized = selected.find((file) => file.size > widget.max_bytes);
    if (oversized) {
      setState("error");
      setError(`${oversized.name} exceeds ${formatBytes(widget.max_bytes)}.`);
      return;
    }
    if (selected.length === 0) return;
    if (!onUpload) {
      setState("error");
      setError("File upload transport is unavailable.");
      return;
    }

    setFiles(selected);
    setError(null);
    setProgress(0);
    setState("uploading");
    try {
      await onUpload(widget, selected, (percent) =>
        setProgress(Math.min(100, Math.max(0, Math.round(percent)))),
      );
      setProgress(100);
      setState("ok");
    } catch (uploadError) {
      setState("error");
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    }
  };

  const choose = () => {
    if (!widget.disabled && state !== "uploading") inputRef.current?.click();
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    choose();
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    void upload([...event.currentTarget.files ?? []]);
    event.currentTarget.value = "";
  };

  const enter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (widget.disabled) return;
    dragDepth.current += 1;
    setDragging(true);
  };

  const leave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void upload([...event.dataTransfer.files]);
  };

  const status =
    state === "uploading"
      ? `Uploading ${progress}%`
      : state === "ok"
        ? `${files.length} file${files.length === 1 ? "" : "s"} transferred`
        : error;

  // The real, richer local phase machine wins whenever it has an opinion;
  // the shared actionStatus (server ack of the dispatched action) only shows
  // through once this control is back at rest.
  const derivedActionStatus: ActionStatus | undefined =
    state === "uploading" ? "pending" : state === "ok" ? "ok" : state === "error" ? "fail" : undefined;

  return (
    <div className="lcars-upload" data-state={state}>
      <input
        accept={widget.accept.join(",") || undefined}
        aria-label={widget.label ?? "Choose files"}
        className="lcars-upload-input"
        disabled={widget.disabled}
        multiple={widget.multiple}
        onChange={handleInput}
        ref={inputRef}
        type="file"
      />
      <div
        aria-disabled={widget.disabled || undefined}
        className="lcars-upload-drop"
        data-action-status={derivedActionStatus ?? actionStatus ?? undefined}
        data-dragging={dragging || undefined}
        onClick={choose}
        onDragEnter={enter}
        onDragLeave={leave}
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
        onKeyDown={handleKey}
        role="button"
        tabIndex={widget.disabled ? -1 : 0}
      >
        <span className="lcars-upload-mark" aria-hidden="true">
          ↑
        </span>
        <span>
          <strong>{widget.label ?? "Upload Files"}</strong>
          <small>Drop here or select from this device</small>
        </span>
      </div>
      {state === "uploading" ? (
        <div
          aria-label="Upload progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          className="lcars-upload-progress"
          role="progressbar"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {files.length > 0 ? (
        <ul className="lcars-upload-files">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`}>
              <span>{file.name}</span>
              <b>{formatBytes(file.size)}</b>
            </li>
          ))}
        </ul>
      ) : null}
      {status ? (
        <p aria-live="polite" className="lcars-upload-status" data-error={state === "error" || undefined}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
