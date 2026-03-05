import { createProtocolTransport } from "./transport";
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
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
      MockWebSocket as unknown as typeof WebSocket;
    (globalThis as unknown as { EventSource: typeof EventSource }).EventSource =
      MockEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
    (globalThis as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource;
  });

  test("uses websocket as primary transport and sends upstream events", () => {
    const modeChanges: string[] = [];
    const transport = createProtocolTransport({
      onEnvelope: () => undefined,
      onModeChange: (mode) => modeChanges.push(mode),
      onTransportError: () => undefined,
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain("/lcars/ws");
    ws.open();

    const sent = transport.send(makeActionEnvelope("btn_1", null));
    expect(sent).toBe(true);
    expect(modeChanges).toContain("ws");
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
    const modeChanges: string[] = [];
    const transport = createProtocolTransport({
      onEnvelope: (envelope) => envelopes.push({ type: envelope.type }),
      onModeChange: (mode) => modeChanges.push(mode),
      onTransportError: () => undefined,
    });

    const ws = MockWebSocket.instances[0];
    ws.open();
    ws.fail();

    expect(modeChanges).toContain("sse");
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
});
