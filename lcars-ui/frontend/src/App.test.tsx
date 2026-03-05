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

  test("loads manifest and renders page title", async () => {
    createProtocolTransportMock.mockReturnValue({
      send: vi.fn().mockReturnValue(true),
      close: vi.fn(),
      mode: vi.fn().mockReturnValue("ws"),
    });

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
      mode: vi.fn().mockReturnValue("offline"),
    });

    render(<App />);
    await screen.findByText("Ping");

    fireEvent.click(screen.getByText("Ping"));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith("/lcars/action/ping_action", { value: null });
    });
  });

  test("applies downstream notification envelope from transport", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;

    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return {
        send: vi.fn().mockReturnValue(true),
        close: vi.fn(),
        mode: vi.fn().mockReturnValue("ws"),
      };
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
});
