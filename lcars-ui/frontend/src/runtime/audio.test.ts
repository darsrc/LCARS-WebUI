import { createLcarsAudioManager } from "./audio";

class MockGainNode {
  public gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };

  connect = vi.fn();
}

class MockOscillatorNode {
  public type: OscillatorType = "sine";
  public frequency = {
    setValueAtTime: vi.fn(),
  };

  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  public currentTime = 0;
  public state: AudioContextState = "running";
  public destination = {} as AudioDestinationNode;

  createGain = vi.fn(() => new MockGainNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  resume = vi.fn(async () => undefined);
  close = vi.fn(async () => undefined);
}

describe("lcars audio manager", () => {
  const originalAudioContext = window.AudioContext;

  afterEach(() => {
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: originalAudioContext,
    });
    vi.restoreAllMocks();
  });

  test("is safe when AudioContext is unavailable", async () => {
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: undefined,
    });

    const manager = createLcarsAudioManager();
    manager.setEnabled(true);
    await expect(manager.unlock()).resolves.toBeUndefined();
    expect(() => manager.play("ack")).not.toThrow();
    expect(() => manager.dispose()).not.toThrow();
  });

  test("plays tones when enabled", () => {
    const context = new MockAudioContext();
    const contextCtor = vi.fn(() => context);
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: contextCtor,
    });

    const manager = createLcarsAudioManager();
    manager.setEnabled(true);
    manager.play("ack");

    expect(contextCtor).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).toHaveBeenCalled();
    expect(context.createGain).toHaveBeenCalled();
  });

  test("does not play tones when disabled", () => {
    const context = new MockAudioContext();
    const contextCtor = vi.fn(() => context);
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: contextCtor,
    });

    const manager = createLcarsAudioManager();
    manager.setEnabled(false);
    manager.play("alert");

    expect(context.createOscillator).not.toHaveBeenCalled();
    manager.dispose();
  });
});
