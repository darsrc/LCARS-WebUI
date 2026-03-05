import {
  BASE_DELAY_MS,
  MAX_DELAY_MS,
  createProtocolTransport,
} from "./transport";
import { makeActionEnvelope } from "../types/protocol";

class MockWebSocket {
  public static CONNECTING = 0;
  public static OPEN = 1;
  public static CLOSED = 3;
  public static instances: MockWebSocket[] = [];

  public readonly url: string;
  public readyState: number = MockWebSocket.CONNECTING;
  public sent: string[] = [];
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new Event("close"));
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  emit(payload: unknown): void {
    this.onmessage?.(
      new MessageEvent("message", {
        data: JSON.stringify(payload),
      }),
    );
  }

  fail(): void {
    this.onerror?.(new Event("error"));
    this.close();
  }
}

class MockEventSource {
  public static instances: MockEventSource[] = [];
  public readonly url: string;
  public onerror: ((event: Event) => void) | null = null;
  private listeners = new Map<string, Array<(event: MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    const current = this.listeners.get(type) ?? [];
    current.push(listener as (event: MessageEvent) => void);
    this.listeners.set(type, current);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const current = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      current.filter((item) => item !== listener),
    );
  }

  close(): void {}

  emit(type: string, payload: unknown): void {
    const current = this.listeners.get(type) ?? [];
    const event = new MessageEvent(type, { data: JSON.stringify(payload) });
    for (const listener of current) {
      listener(event);
    }
  }

  fail(): void {
    this.onerror?.(new Event("error"));
  }
}

describe("protocol transport", () => {
  const originalWebSocket = globalThis.WebSocket;
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    MockWebSocket.instances = [];
    MockEventSource.instances = [];
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
      MockWebSocket as unknown as typeof WebSocket;
    (globalThis as unknown as { EventSource: typeof EventSource }).EventSource =
      MockEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
    (globalThis as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource;
  });

  test("uses websocket as primary transport and sends upstream events", () => {
    const statuses: Array<{ mode: string; attempt: number }> = [];
    const transport = createProtocolTransport({
      onEnvelope: () => undefined,
      onModeChange: (status) => statuses.push(status),
      onTransportError: () => undefined,
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain("/lcars/ws");
    ws.open();

    const sent = transport.send(makeActionEnvelope("btn_1", null));
    expect(sent).toBe(true);
    expect(statuses).toContainEqual({ mode: "ws", attempt: 0 });
    expect(ws.sent).toHaveLength(1);
    expect(JSON.parse(ws.sent[0]).type).toBe("action");

    transport.close();
  });

  test("propagates auth token to websocket and sse fallback urls", () => {
    const transport = createProtocolTransport({
      onEnvelope: () => undefined,
      onModeChange: () => undefined,
      onTransportError: () => undefined,
      token: "token-123",
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain("token=token-123");
    ws.fail();

    const sse = MockEventSource.instances[0];
    expect(sse.url).toContain("token=token-123");
    transport.close();
  });

  test("falls back to sse when websocket closes", () => {
    const envelopes: Array<{ type: string }> = [];
    const statuses: Array<{ mode: string; attempt: number }> = [];

    const transport = createProtocolTransport({
      onEnvelope: (envelope) => envelopes.push({ type: envelope.type }),
      onModeChange: (status) => statuses.push(status),
      onTransportError: () => undefined,
    });

    const ws = MockWebSocket.instances[0];
    ws.open();
    ws.fail();

    expect(statuses).toContainEqual({ mode: "reconnecting", attempt: 1 });
    expect(statuses).toContainEqual({ mode: "sse", attempt: 0 });

    const sse = MockEventSource.instances[0];
    sse.emit("notification", {
      v: "1.0",
      type: "notification",
      payload: { message: "Fallback active", level: "info" },
    });

    expect(envelopes).toContainEqual({ type: "notification" });
    transport.close();
  });

  test("returns false for upstream send when websocket is unavailable", () => {
    const transport = createProtocolTransport({
      onEnvelope: () => undefined,
      onModeChange: () => undefined,
      onTransportError: () => undefined,
    });

    const sent = transport.send(makeActionEnvelope("btn_2", true));
    expect(sent).toBe(false);

    transport.close();
  });

  test("reconnect backoff doubles and caps", () => {
    const statuses: Array<{ mode: string; attempt: number }> = [];
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");

    const transport = createProtocolTransport({
      onEnvelope: () => undefined,
      onModeChange: (status) => statuses.push(status),
      onTransportError: () => undefined,
    });

    const firstWs = MockWebSocket.instances[0];
    firstWs.fail();
    const firstDelay = setTimeoutSpy.mock.calls.at(-1)?.[1] as number;
    expect(firstDelay).toBe(BASE_DELAY_MS);
    expect(statuses).toContainEqual({ mode: "reconnecting", attempt: 1 });

    vi.runOnlyPendingTimers();
    const secondWs = MockWebSocket.instances[1];
    secondWs.fail();
    const secondDelay = setTimeoutSpy.mock.calls.at(-1)?.[1] as number;
    expect(secondDelay).toBe(BASE_DELAY_MS * 2);

    for (let i = 0; i < 10; i += 1) {
      vi.runOnlyPendingTimers();
      const latestWs = MockWebSocket.instances.at(-1);
      latestWs?.fail();
    }

    const lastDelay = setTimeoutSpy.mock.calls.at(-1)?.[1] as number;
    expect(lastDelay).toBe(MAX_DELAY_MS);
    transport.close();
  });
});
