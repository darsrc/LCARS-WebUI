export type LcarsAudioCue = "ack" | "negative" | "alert" | "ready" | "toggle_on" | "toggle_off";

export interface LcarsAudioManager {
  setEnabled: (enabled: boolean) => void;
  unlock: () => Promise<void>;
  play: (cue: LcarsAudioCue) => void;
  dispose: () => void;
}

type AudioContextConstructor = new () => AudioContext;

type Tone = {
  frequency: number;
  duration: number;
  gain: number;
};

const CUES: Record<LcarsAudioCue, Tone[]> = {
  ack: [
    { frequency: 740, duration: 0.055, gain: 0.04 },
    { frequency: 980, duration: 0.05, gain: 0.035 },
  ],
  negative: [
    { frequency: 280, duration: 0.08, gain: 0.05 },
    { frequency: 220, duration: 0.1, gain: 0.05 },
  ],
  alert: [
    { frequency: 640, duration: 0.08, gain: 0.06 },
    { frequency: 520, duration: 0.08, gain: 0.06 },
    { frequency: 640, duration: 0.1, gain: 0.06 },
  ],
  ready: [
    { frequency: 520, duration: 0.06, gain: 0.04 },
    { frequency: 700, duration: 0.06, gain: 0.04 },
    { frequency: 880, duration: 0.08, gain: 0.04 },
  ],
  toggle_on: [
    { frequency: 620, duration: 0.05, gain: 0.035 },
    { frequency: 780, duration: 0.05, gain: 0.035 },
  ],
  toggle_off: [
    { frequency: 520, duration: 0.05, gain: 0.035 },
    { frequency: 400, duration: 0.06, gain: 0.035 },
  ],
};

const resolveAudioContextCtor = (): AudioContextConstructor | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const maybeCtor = window.AudioContext || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  return maybeCtor ?? null;
};

class WebAudioManager implements LcarsAudioManager {
  private enabled = true;
  private context: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const Ctor = resolveAudioContextCtor();
    if (!Ctor) {
      return null;
    }

    this.context = new Ctor();
    return this.context;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async unlock(): Promise<void> {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
    }
  }

  play(cue: LcarsAudioCue): void {
    if (!this.enabled) {
      return;
    }

    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    let cursor = context.currentTime;
    for (const tone of CUES[cue]) {
      const oscillator = context.createOscillator();
      oscillator.type = cue === "negative" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(tone.frequency, cursor);

      const gainNode = context.createGain();
      gainNode.gain.setValueAtTime(0, cursor);
      gainNode.gain.linearRampToValueAtTime(tone.gain, cursor + 0.005);
      gainNode.gain.linearRampToValueAtTime(0.0001, cursor + tone.duration);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(cursor);
      oscillator.stop(cursor + tone.duration + 0.01);

      cursor += tone.duration + 0.01;
    }
  }

  dispose(): void {
    if (!this.context) {
      return;
    }
    void this.context.close();
    this.context = null;
  }
}

export const createLcarsAudioManager = (): LcarsAudioManager => {
  return new WebAudioManager();
};
