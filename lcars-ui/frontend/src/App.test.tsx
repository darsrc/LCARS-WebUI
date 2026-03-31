import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

import App from "./App";
import { manifestFixture } from "./test/manifestFixture";
import type { Envelope } from "./types/protocol";

const createProtocolTransportMock = vi.fn();

vi.mock("./runtime/transport", () => ({
  createProtocolTransport: (...args: unknown[]) => createProtocolTransportMock(...args),
}));

vi.mock("axios");

describe("App", () => {
  const mockedAxios = axios as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    createProtocolTransportMock.mockReset();
    mockedAxios.get = vi.fn().mockResolvedValue({ data: manifestFixture });
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { v: "1.0", type: "action_ack", payload: { action_id: "ping_action", status: "ok" } },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const transportStub = () => ({
    send: vi.fn().mockReturnValue(true),
    close: vi.fn(),
    mode: vi.fn().mockReturnValue({ mode: "ws", attempt: 0 }),
  });

  test("loads manifest and renders page title", async () => {
    createProtocolTransportMock.mockReturnValue(transportStub());

    render(<App />);

    expect(screen.getByText("Loading LCARS manifest...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("USS Test")).toBeInTheDocument();
      expect(screen.getByText("Main Deck")).toBeInTheDocument();
    });
  });

  test("uses HTTP fallback for action when websocket send is unavailable", async () => {
    createProtocolTransportMock.mockReturnValue({
      send: vi.fn().mockReturnValue(false),
      close: vi.fn(),
      mode: vi.fn().mockReturnValue({ mode: "offline", attempt: 0 }),
    });

    render(<App />);
    const pingButton = await screen.findByRole("button", { name: "Ping" });

    fireEvent.click(pingButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/lcars/action/ping_action",
        { value: null },
        expect.objectContaining({ headers: undefined }),
      );
    });
  });

  test("passes auth header to manifest fetch and transport when VITE_LCARS_TOKEN is set", async () => {
    vi.stubEnv("VITE_LCARS_TOKEN", "secret-token-123");

    createProtocolTransportMock.mockReturnValue(transportStub());

    render(<App />);
    await screen.findByText("USS Test");

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/lcars/manifest",
      expect.objectContaining({ headers: { Authorization: "Bearer secret-token-123" } }),
    );
    expect(createProtocolTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: "secret-token-123" }),
    );
  });

  test("applies downstream notification envelope from transport", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;

    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await screen.findByText("Main Deck");

    await act(async () => {
      onEnvelope?.({
        v: "1.0",
        type: "notification",
        payload: { message: "Transport check", level: "info" },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Transport check")).toBeInTheDocument();
    });
  });

  test("does not recreate transport after root manifest_update", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;

    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await screen.findByText("Main Deck");

    await act(async () => {
      onEnvelope?.({
        v: "1.0",
        type: "manifest_update",
        payload: { path: "", value: manifestFixture },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Main Deck")).toBeInTheDocument();
    });
    expect(createProtocolTransportMock).toHaveBeenCalledTimes(1);
  });

  test("applies manifest theme to root container", async () => {
    createProtocolTransportMock.mockReturnValue(transportStub());

    render(<App />);
    await screen.findByText("USS Test");

    const root = document.querySelector(".lcars-ui");
    expect(root).toHaveAttribute("data-theme", "galaxy");
    expect(root).toHaveAttribute("data-visual-language", "strict");
    expect(root).toHaveAttribute("data-strict-renderer", "legacy");
    expect(root).toHaveAttribute("data-product-renderer-base", "legacy_strict");
  });

  test("renders right sidebar orientation from manifest", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        ...manifestFixture,
        layout: {
          ...manifestFixture.layout,
          sidebar: {
            ...manifestFixture.layout.sidebar,
            position: "right",
          },
        },
      },
    });
    createProtocolTransportMock.mockReturnValue(transportStub());

    render(<App />);
    await screen.findByRole("button", { name: /MAIN/i });

    const frame = document.querySelector(".lcars-shell-frame");
    expect(frame).toHaveClass("lcars-sidebar-right");
  });

  test("hides sidebar when manifest sets position hidden", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        ...manifestFixture,
        layout: {
          ...manifestFixture.layout,
          sidebar: {
            ...manifestFixture.layout.sidebar,
            position: "hidden",
          },
        },
      },
    });
    createProtocolTransportMock.mockReturnValue(transportStub());

    render(<App />);
    await screen.findByText("Main Deck");

    expect(screen.queryByRole("button", { name: /MAIN/i })).not.toBeInTheDocument();
  });
});
