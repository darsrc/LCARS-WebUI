/*
 * Pure energy-based voice activity detection (VAD) math, kept dependency-free
 * from the DOM/MediaRecorder/AudioContext so it can be unit tested directly
 * with plain typed arrays. The stateful threshold-crossing tracker
 * (SilenceTracker) is also pure — it advances on (rms, deltaMs) pairs fed to
 * it by the component's polling loop, with no knowledge of audio APIs.
 */

/**
 * Compute the RMS (root-mean-square) amplitude of a time-domain byte buffer
 * as returned by AnalyserNode.getByteTimeDomainData(). Byte values are
 * centered at 128 (silence); this normalizes to a 0..1 range where 0 is
 * perfect silence and ~1 is full-scale signal.
 */
export function computeRms(byteTimeDomainData: Uint8Array): number {
  if (byteTimeDomainData.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < byteTimeDomainData.length; i += 1) {
    const normalized = (byteTimeDomainData[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / byteTimeDomainData.length);
}

export type VadEvent =
  | { kind: "speech-start" }
  | { kind: "speech-end"; durationMs: number }
  | { kind: "noise-discarded"; durationMs: number }
  | { kind: "none" };

export type VadConfig = {
  /** RMS threshold above which audio is considered speech. */
  threshold: number;
  /** Continuous below-threshold duration (ms) required to end an utterance. */
  silenceMs: number;
  /** Minimum speech duration (ms) for an utterance to be uploaded, not discarded as a blip. */
  minUtteranceMs: number;
};

const DEFAULT_VAD_THRESHOLD = 0.02;
const DEFAULT_MIN_UTTERANCE_MS = 250;

export function defaultVadConfig(silenceMs: number): VadConfig {
  return {
    threshold: DEFAULT_VAD_THRESHOLD,
    silenceMs,
    minUtteranceMs: DEFAULT_MIN_UTTERANCE_MS,
  };
}

/**
 * Stateful (but DOM-free) tracker that turns a stream of (rms, deltaMs)
 * samples into speech-start / speech-end / noise-discarded events. One
 * instance per armed listening session; call reset() when re-arming.
 */
export class SilenceTracker {
  private config: VadConfig;
  private speaking = false;
  private speechElapsedMs = 0;
  private silenceElapsedMs = 0;

  constructor(config: VadConfig) {
    this.config = config;
  }

  reset(): void {
    this.speaking = false;
    this.speechElapsedMs = 0;
    this.silenceElapsedMs = 0;
  }

  /** Feed one polling sample. Returns the VAD event triggered by this sample, if any. */
  update(rms: number, deltaMs: number): VadEvent {
    const aboveThreshold = rms >= this.config.threshold;

    if (!this.speaking) {
      if (aboveThreshold) {
        this.speaking = true;
        this.speechElapsedMs = 0;
        this.silenceElapsedMs = 0;
        return { kind: "speech-start" };
      }
      return { kind: "none" };
    }

    if (aboveThreshold) {
      this.speechElapsedMs += deltaMs;
      this.silenceElapsedMs = 0;
      return { kind: "none" };
    }

    this.silenceElapsedMs += deltaMs;
    if (this.silenceElapsedMs >= this.config.silenceMs) {
      const totalMs = this.speechElapsedMs;
      this.speaking = false;
      this.speechElapsedMs = 0;
      this.silenceElapsedMs = 0;
      if (totalMs < this.config.minUtteranceMs) {
        return { kind: "noise-discarded", durationMs: totalMs };
      }
      return { kind: "speech-end", durationMs: totalMs };
    }
    return { kind: "none" };
  }
}
