import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

import App from "./App";
import { manifestFixture, themeCatalog } from "./test/manifestFixture";
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

  const transportStub = () => ({
    send: vi.fn().mockReturnValue(true),
    close: vi.fn(),
  });

  beforeEach(() => {
    window.localStorage.clear();
    createProtocolTransportMock.mockReset();
    createProtocolTransportMock.mockReturnValue(transportStub());
    mockedAxios.get = vi.fn().mockResolvedValue({ data: manifestFixture });
    mockedAxios.post = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const frame = () => document.querySelector(".lcars-frame") as HTMLElement | null;

  test("loads the manifest and renders the LCARS frame with the header title", async () => {
    render(<App />);
    expect(screen.getByText(/Loading LCARS manifest/i)).toBeInTheDocument();

    await waitFor(() => expect(frame()).not.toBeNull());
    expect(screen.getByText(manifestFixture.layout.header.title)).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(manifestFixture.meta.app_name));
  });

  test("dispatches an application key binding through the ordinary action transport", async () => {
    const send = vi.fn().mockReturnValue(true);
    createProtocolTransportMock.mockReturnValue({ send, close: vi.fn() });
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        ...manifestFixture,
        meta: {
          ...manifestFixture.meta,
          key_bindings: [{
            id: "action.search",
            label: "Search",
            chord: "mod+k",
            action_id: "search",
            command: null,
            scope: "global",
            allow_in_inputs: false,
            prevent_default: true,
          }],
        },
      },
    });

    render(<App />);
    await waitFor(() => expect(frame()).not.toBeNull());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));

    expect(send).toHaveBeenCalledWith({
      v: "2.0",
      type: "action",
      payload: {
        id: "search",
        value: { binding_id: "action.search", chord: "mod+k" },
      },
    });
  });

  test("the default Options binding opens the settings page for an older manifest", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        ...manifestFixture,
        meta: { ...manifestFixture.meta, key_bindings: undefined },
        layout: {
          ...manifestFixture.layout,
          sidebar: {
            ...manifestFixture.layout.sidebar,
            items: [
              ...manifestFixture.layout.sidebar.items,
              { id: "nav-lcars-options", label: "Options", target_page: "lcars-options" },
            ],
          },
        },
        pages: {
          ...manifestFixture.pages,
          "lcars-options": {
            ...manifestFixture.pages.main,
            id: "lcars-options",
            title: "Options",
          },
        },
      },
    });

    render(<App />);
    const options = await screen.findByRole("button", { name: "Options" });
    expect(options).not.toHaveAttribute("aria-current", "page");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: ",", ctrlKey: true }));

    await waitFor(() => expect(options).toHaveAttribute("aria-current", "page"));
  });

  test("renders the sidebar nav as rail buttons", async () => {
    render(<App />);
    const firstItem = manifestFixture.layout.sidebar.items[0];
    expect(await screen.findByRole("button", { name: firstItem.label })).toBeInTheDocument();
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
    await waitFor(() => expect(frame()).not.toBeNull());

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/lcars/manifest",
      expect.objectContaining({ headers: { Authorization: "Bearer secret-token-123" } }),
    );
    expect(createProtocolTransportMock).toHaveBeenCalledWith(expect.objectContaining({ token: "secret-token-123" }));
  });

  test("routes a downstream notification into the notice stack", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;
    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await waitFor(() => expect(frame()).not.toBeNull());

    await act(async () => {
      onEnvelope?.({ v: "1.0", type: "notification", payload: { message: "WARP CORE NOMINAL", level: "info" } });
    });

    expect(await screen.findByText("WARP CORE NOMINAL")).toBeInTheDocument();
  });

  test("optimistically updates controls and falls back to HTTP when transport cannot send", async () => {
    const user = userEvent.setup();
    const send = vi.fn().mockReturnValue(false);
    createProtocolTransportMock.mockReturnValue({
      send,
      close: vi.fn(),
    });
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: {
        v: "1.0",
        type: "action_ack",
        payload: { action_id: "toggle_alert", status: "ok" },
      },
    });

    render(<App />);
    const toggle = await screen.findByRole("button", { name: /Toggle/i });

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/lcars/action/toggle_alert",
        { value: true },
        expect.any(Object),
      );
    });
  });

  test("does not recreate the transport after a root manifest_update", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;
    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await waitFor(() => expect(frame()).not.toBeNull());

    await act(async () => {
      onEnvelope?.({ v: "1.0", type: "manifest_update", payload: { path: "", value: manifestFixture } });
    });

    await waitFor(() => expect(frame()).not.toBeNull());
    expect(createProtocolTransportMock).toHaveBeenCalledTimes(1);
  });

  test("applies a runtime custom theme even when a different theme is saved locally", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;
    const customTheme = {
      id: "bridge-night",
      label: "Bridge Night",
      base: "nemesis" as const,
      colors: { frame: "#123456" },
      fonts: { interface: "Operator Sans, sans-serif" },
    };
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        ...manifestFixture,
        meta: { ...manifestFixture.meta, theme_catalog: [...themeCatalog, customTheme] },
      },
    });
    window.localStorage.setItem(
      `lcars.webui.preferences.v1:${encodeURIComponent(manifestFixture.meta.app_name)}`,
      JSON.stringify({ theme: "galaxy" }),
    );
    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await waitFor(() => expect(document.querySelector(".lcars-root")).not.toBeNull());
    const root = document.querySelector(".lcars-root") as HTMLElement;
    expect(root).toHaveAttribute("data-theme-id", "galaxy");

    await act(async () => {
      onEnvelope?.({
        v: "2.0",
        type: "manifest_update",
        payload: { path: "meta.theme", value: "bridge-night" },
      });
    });

    await waitFor(() => expect(root).toHaveAttribute("data-theme-id", "bridge-night"));
    expect(root).toHaveAttribute("data-theme", "nemesis");
    expect(root.style.getPropertyValue("--theme-role-frame")).toBe("#123456");
    expect(root.style.getPropertyValue("--role-frame")).toBe("");
  });

  test("log_snapshot replaces a stream's buffer instead of appending to it", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;
    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await waitFor(() => expect(frame()).not.toBeNull());

    await act(async () => {
      onEnvelope?.({
        v: "2.0",
        type: "log_chunk",
        payload: { stream_id: "syslog", lines: ["boot line one", "boot line two"] },
      });
    });
    expect(await screen.findByText("boot line one")).toBeInTheDocument();
    expect(screen.getByText("boot line two")).toBeInTheDocument();

    await act(async () => {
      onEnvelope?.({
        v: "2.0",
        type: "log_snapshot",
        payload: { stream_id: "syslog", lines: ["reconnect line"] },
      });
    });

    expect(await screen.findByText("reconnect line")).toBeInTheDocument();
    // Replaced, not appended: neither prior line survives the snapshot.
    expect(screen.queryByText("boot line one")).not.toBeInTheDocument();
    expect(screen.queryByText("boot line two")).not.toBeInTheDocument();
  });

  test("session_hydration replaces the manifest and clears stale log buffers", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;
    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await waitFor(() => expect(frame()).not.toBeNull());

    await act(async () => {
      onEnvelope?.({
        v: "2.0",
        type: "log_chunk",
        payload: { stream_id: "syslog", lines: ["stale from before hydration"] },
      });
    });
    expect(await screen.findByText("stale from before hydration")).toBeInTheDocument();

    const hydratedManifest = {
      ...manifestFixture,
      meta: { ...manifestFixture.meta, app_name: "Reconnected LCARS" },
    };

    await act(async () => {
      onEnvelope?.({ v: "2.0", type: "session_hydration", payload: { manifest: hydratedManifest } });
    });

    await waitFor(() => expect(document.title).toBe("Reconnected LCARS"));
    // The hydration snapshot itself carries no log_snapshot in this test, so
    // the pre-hydration buffer must have been cleared rather than left stale.
    expect(screen.queryByText("stale from before hydration")).not.toBeInTheDocument();
  });

  test("rejects a session_hydration envelope carrying an invalid manifest", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;
    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await waitFor(() => expect(frame()).not.toBeNull());

    await act(async () => {
      onEnvelope?.({
        v: "2.0",
        type: "session_hydration",
        // Correct contract version, wrong shape: the shape guard is what must
        // reject this one, not the version guard.
        payload: { manifest: { meta: { version: "2.0" }, bogus: true } },
      });
    });

    expect(await screen.findByText(/Rejected session_hydration/i)).toBeInTheDocument();
    // The last-known-good manifest must still be showing.
    expect(screen.getByText(manifestFixture.layout.header.title)).toBeInTheDocument();
  });

  test("rejects a v1 manifest hydration and names both contract versions", async () => {
    let onEnvelope: ((envelope: Envelope) => void) | null = null;
    createProtocolTransportMock.mockImplementation((callbacks: { onEnvelope: (envelope: Envelope) => void }) => {
      onEnvelope = callbacks.onEnvelope;
      return transportStub();
    });

    render(<App />);
    await waitFor(() => expect(frame()).not.toBeNull());

    await act(async () => {
      onEnvelope?.({
        v: "2.0",
        type: "session_hydration",
        payload: { manifest: { ...manifestFixture, meta: { ...manifestFixture.meta, version: "1.1.0" } } },
      });
    });

    const notice = await screen.findByText(/Unsupported manifest version/i);
    expect(notice).toBeInTheDocument();
    expect(notice.textContent).toContain('"1.1.0"');
    expect(notice.textContent).toContain('"2.0"');
    // The last-known-good manifest must still be showing.
    expect(screen.getByText(manifestFixture.layout.header.title)).toBeInTheDocument();
  });

  test("renders the error state when the manifest payload is invalid", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { meta: { version: "2.0" }, bogus: true } });
    render(<App />);
    await waitFor(() => expect(document.querySelector(".boot-status.error")).not.toBeNull());
    expect(frame()).toBeNull();
  });

  test("refuses to boot on a v1 manifest and shows both versions in the error", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { ...manifestFixture, meta: { ...manifestFixture.meta, version: "1.1.0" } },
    });
    render(<App />);

    const status = await waitFor(() => {
      const node = document.querySelector(".boot-status.error");
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    expect(status.textContent).toContain("Unsupported manifest version");
    expect(status.textContent).toContain('"1.1.0"');
    expect(status.textContent).toContain('"2.0"');
    // Nothing is rendered from a contract this bundle does not implement.
    expect(frame()).toBeNull();
  });
});
