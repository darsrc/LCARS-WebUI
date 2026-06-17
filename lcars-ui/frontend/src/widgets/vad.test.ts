import { describe, expect, test } from "vitest";
import { computeRms, defaultVadConfig, SilenceTracker } from "./vad";

describe("computeRms", () => {
  test("silence (all-128 buffer) is ~0", () => {
    expect(computeRms(new Uint8Array(64).fill(128))).toBeCloseTo(0, 5);
  });

  test("full-scale square wave is close to 1", () => {
    const buf = new Uint8Array(64);
    for (let i = 0; i < buf.length; i += 1) buf[i] = i % 2 === 0 ? 0 : 255;
    expect(computeRms(buf)).toBeGreaterThan(0.9);
  });

  test("empty buffer returns 0", () => {
    expect(computeRms(new Uint8Array(0))).toBe(0);
  });
});

describe("SilenceTracker", () => {
  test("emits speech-start on first above-threshold sample", () => {
    const tracker = new SilenceTracker({ threshold: 0.1, silenceMs: 500, minUtteranceMs: 100 });
    expect(tracker.update(0.5, 0).kind).toBe("speech-start");
  });

  test("emits speech-end after silenceMs of continuous quiet, with correct duration", () => {
    const tracker = new SilenceTracker({ threshold: 0.1, silenceMs: 300, minUtteranceMs: 100 });
    tracker.update(0.5, 0); // speech-start
    tracker.update(0.5, 200); // still speaking, 200ms elapsed
    tracker.update(0.01, 150); // below threshold, 150ms silence
    const ev = tracker.update(0.01, 150); // 300ms silence total -> speech-end
    expect(ev).toEqual({ kind: "speech-end", durationMs: 200 });
  });

  test("discards a blip shorter than minUtteranceMs", () => {
    const tracker = new SilenceTracker({ threshold: 0.1, silenceMs: 100, minUtteranceMs: 250 });
    tracker.update(0.5, 0); // speech-start
    tracker.update(0.01, 50); // 50ms silence
    const ev = tracker.update(0.01, 60); // 110ms silence -> ends, but only 0ms speech < 250ms min
    expect(ev.kind).toBe("noise-discarded");
  });

  test("a sustained above-threshold run resets the silence counter", () => {
    const tracker = new SilenceTracker({ threshold: 0.1, silenceMs: 200, minUtteranceMs: 50 });
    tracker.update(0.5, 0);
    tracker.update(0.01, 150); // 150ms silence, not yet 200
    tracker.update(0.5, 50); // back above threshold -> silence counter resets
    const ev = tracker.update(0.01, 199);
    expect(ev.kind).toBe("none"); // only 199ms silence since reset, not yet 200
  });

  test("reset() returns tracker to non-speaking state", () => {
    const tracker = new SilenceTracker(defaultVadConfig(900));
    tracker.update(0.5, 0);
    tracker.reset();
    expect(tracker.update(0.01, 0).kind).toBe("none");
  });
});
