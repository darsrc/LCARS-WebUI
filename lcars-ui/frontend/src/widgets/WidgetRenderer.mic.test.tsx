import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MicButtonWidget } from "../types/contract";
import { WidgetRenderer } from "./WidgetRenderer";

class MockMediaStreamTrack {
  stop = vi.fn();
}

class MockMediaStream {
  private tracks = [new MockMediaStreamTrack()];
  getTracks() {
    return this.tracks;
  }
}

class MockAnalyserNode {
  fftSize = 2048;
  getByteTimeDomainData(arr: Uint8Array) {
    arr.fill(128);
  }
}

class MockAudioContext {
  state = "running";
  createMediaStreamSource() {
    return { connect: vi.fn() };
  }
  createAnalyser() {
    return new MockAnalyserNode();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

class MockMediaRecorder {
  state: "inactive" | "recording" = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: MediaStream) {}
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

const baseWidget: MicButtonWidget = {
  id: "mic-continuous",
  type: "mic_button",
  label: "Hands-Free Listening",
  upload_url: "/lcars/upload/audio",
  action_id: "voice-command",
  timeout_ms: 5000,
  continuous: true,
  silence_ms: 900,
};

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
  vi.stubGlobal("AudioContext", MockAudioContext);
  getUserMedia = vi.fn().mockResolvedValue(new MockMediaStream());
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ContinuousMicButtonControl", () => {
  test("arms on first click, requesting permission exactly once", async () => {
    const user = userEvent.setup();
    render(
      <WidgetRenderer
        widget={baseWidget}
        logsByStream={{}}
        onAction={vi.fn()}
        onFormSubmit={vi.fn()}
        onInput={vi.fn()}
        onAudioUpload={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByText("LISTENING…")).toBeInTheDocument());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  test("clicking again while armed disarms without a second getUserMedia call", async () => {
    const user = userEvent.setup();
    render(
      <WidgetRenderer
        widget={baseWidget}
        logsByStream={{}}
        onAction={vi.fn()}
        onFormSubmit={vi.fn()}
        onInput={vi.fn()}
        onAudioUpload={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const button = screen.getByRole("button");
    await user.click(button);
    await waitFor(() => expect(screen.getByText("LISTENING…")).toBeInTheDocument());

    await user.click(button);

    await waitFor(() => expect(screen.getByText("Hands-Free Listening")).toBeInTheDocument());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  test("unmounting while armed releases the mic track without a click", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <WidgetRenderer
        widget={baseWidget}
        logsByStream={{}}
        onAction={vi.fn()}
        onFormSubmit={vi.fn()}
        onInput={vi.fn()}
        onAudioUpload={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("LISTENING…")).toBeInTheDocument());

    const stream: MockMediaStream = await getUserMedia.mock.results[0].value;
    const track = stream.getTracks()[0];

    unmount();

    expect(track.stop).toHaveBeenCalled();
  });
});
