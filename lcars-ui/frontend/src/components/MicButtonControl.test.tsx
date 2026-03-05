import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { MicButtonControl } from "./MicButtonControl";
import type { MicButtonWidget } from "../types/contract";

class MockMediaRecorder {
  public state: "inactive" | "recording" = "inactive";
  public mimeType = "audio/webm";
  public ondataavailable: ((event: BlobEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onstop: (() => void) | null = null;

  constructor(_: MediaStream) {}

  start(): void {
    this.state = "recording";
  }

  stop(): void {
    this.state = "inactive";
    this.ondataavailable?.(
      {
        data: new Blob(["audio"], { type: "audio/webm" }),
      } as BlobEvent,
    );
    this.onstop?.();
  }
}

const widget: MicButtonWidget = {
  id: "mic_1",
  type: "mic_button",
  label: "Push to Talk",
  color: null,
  disabled: false,
  visible: true,
  upload_url: "/lcars/upload/audio",
  action_id: "mic_command",
  timeout_ms: 5000,
};

describe("MicButtonControl", () => {
  const originalMediaDevices = navigator.mediaDevices;
  const originalMediaRecorder = globalThis.MediaRecorder;

  beforeEach(() => {
    (globalThis as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder =
      MockMediaRecorder as unknown as typeof MediaRecorder;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices,
    });
    (globalThis as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder =
      originalMediaRecorder;
  });

  test("records and uploads when held then released", async () => {
    const onAudioUpload = vi.fn().mockResolvedValue(undefined);

    render(
      <MicButtonControl
        cardClass={() => "lcars-card"}
        onAudioUpload={onAudioUpload}
        widget={widget}
      />,
    );

    const button = screen.getByRole("button", { name: "Hold to Speak" });
    fireEvent.pointerDown(button);
    await screen.findByText("Recording");
    fireEvent.pointerUp(button);

    await waitFor(() => {
      expect(onAudioUpload).toHaveBeenCalledTimes(1);
    });
  });

  test("shows HTTPS warning when media devices are unavailable", () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });

    render(
      <MicButtonControl
        cardClass={() => "lcars-card"}
        onAudioUpload={vi.fn()}
        widget={widget}
      />,
    );

    expect(screen.getByText("Microphone requires HTTPS or localhost.")).toBeInTheDocument();
  });
});
