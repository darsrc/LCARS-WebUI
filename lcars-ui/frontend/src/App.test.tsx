import { act, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

import App from "./App";
import { manifestFixture } from "./test/manifestFixture";
import type { Envelope } from "./types/protocol";

const createProtocolTransportMock = vi.fn();

vi.mock("./runtime/transport", () => ({
  createProtocolTransport: (...args: unknown[]) => createProtocolTransportMock(...args),
}));

vi.mock("axios");

/**
 * Phase 0 — the boot shell.
 *
 * These tests guard the surviving data path: the manifest still loads, the live
 * transport still opens, and downstream telemetry still routes into state — all into a
 * bare black field, before any LCARS shape is drawn.
 */
describe("App (Phase 0 boot shell)", () => {
  const mockedAxios = axios as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  const transportStub = () => ({
    send: vi.fn().mockReturnValue(true),
    close: vi.fn(),
  });

  beforeEach(() => {
    createProtocolTransportMock.mockReset();
    createProtocolTransportMock.mockReturnValue(transportStub());
    mockedAxios.get = vi.fn().mockResolvedValue({ data: manifestFixture });
    mockedAxios.post = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const bootField = () => document.querySelector(".lcars-boot-field") as HTMLElement | null;

  test("loads the manifest and renders the bare black field", async () => {
    render(<App />);

    expect(screen.getByText(/Loading LCARS manifest/i)).toBeInTheDocument();

    await waitFor(() => expect(bootField()).not.toBeNull());
    expect(bootField()?.dataset.pageCount).toBe(String(Object.keys(manifestFixture.pages).length));
    expect(bootField()?.dataset.transport).toBe("offline");
    expect(document.title).toBe(manifestFixture.meta.app_name);
  });

  test("opens the live transport once the manifest is ready", async () => {
    render(<App />);

    await waitFor(() => expect(createProtocolTransportMock).toHaveBeenCalledTimes(1));
    expect(createProtocolTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onEnvelope: expect.any(Function),
        onModeChange: expect.any(Function),
        onTransportError: expect.any(Function),
      }),
    );
  });

  test("passes the auth header to manifest fetch and transport when VITE_LCARS_TOKEN is set", async () => {
    vi.stubEnv("VITE_LCARS_TOKEN", "secret-token-123");

    render(<App />);
    await waitFor(() => expect(bootField()).not.toBeNull());

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/lcars/manifest",
      expect.objectContaining({ headers: { Authorization: "Bearer secret-token-123" } }),
    );
    expect(createProtocolTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: "secret-token-123" }),
    );
  });

  test("routes a downstream notification into the live region", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;
    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await waitFor(() => expect(bootField()).not.toBeNull());

    await act(async () => {
      onEnvelope?.({ v: "1.0", type: "notification", payload: { message: "WARP CORE NOMINAL", level: "info" } });
    });

    expect(await screen.findByText("WARP CORE NOMINAL")).toBeInTheDocument();
  });

  test("does not recreate the transport after a root manifest_update", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;
    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await waitFor(() => expect(bootField()).not.toBeNull());

    await act(async () => {
      onEnvelope?.({ v: "1.0", type: "manifest_update", payload: { path: "", value: manifestFixture } });
    });

    await waitFor(() => expect(bootField()).not.toBeNull());
    expect(createProtocolTransportMock).toHaveBeenCalledTimes(1);
  });

  test("renders the error state when the manifest payload is invalid", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { bogus: true } });

    render(<App />);

    await waitFor(() => expect(document.querySelector(".boot-status.error")).not.toBeNull());
    expect(bootField()).toBeNull();
  });
});
