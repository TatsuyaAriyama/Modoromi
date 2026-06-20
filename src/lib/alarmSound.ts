/**
 * In-app alarm tones, synthesised with the Web Audio API so no audio assets
 * need bundling and every tone stays tiny. Tones are gentle and melodic — a
 * sleep app should coax you awake, not jangle. The loop escalates volume
 * slowly so a light sleeper wakes before it gets loud.
 */

export interface AlarmSound {
  /** Stable id; the display label is resolved in the UI via `sound.<id>`. */
  id: string;
}

export const ALARM_SOUNDS: AlarmSound[] = [
  { id: 'chime' },
  { id: 'bell' },
  { id: 'marimba' },
  { id: 'dawn' },
];

export const DEFAULT_ALARM_SOUND = 'chime';

/** Normalise a stored sound id (tolerating legacy "default"). */
export function normalizeSound(id: string | undefined): string {
  return ALARM_SOUNDS.some((s) => s.id === id)
    ? (id as string)
    : DEFAULT_ALARM_SOUND;
}

/** [frequencyHz, startSec, durationSec] notes within one loop cycle. */
type Note = [number, number, number];

const PATTERNS: Record<string, Note[]> = {
  chime: [
    [880, 0, 0.4],
    [1320, 0.45, 0.5],
  ],
  bell: [
    [659, 0, 0.7],
    [659, 0.85, 0.7],
  ],
  marimba: [
    [523, 0, 0.22],
    [659, 0.24, 0.22],
    [784, 0.48, 0.34],
  ],
  dawn: [
    [440, 0, 0.6],
    [554, 0.5, 0.6],
    [659, 1.0, 0.8],
  ],
};

const CYCLE_SEC: Record<string, number> = {
  chime: 1.4,
  bell: 1.9,
  marimba: 1.2,
  dawn: 2.2,
};

type WindowWithWebkit = Window &
  typeof globalThis & { webkitAudioContext?: typeof AudioContext };

/**
 * Plays a looping alarm tone with a slow volume ramp. Foreground-only — relies
 * on the page having had a prior user gesture (the session was started by tap).
 */
export class AlarmPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private startedAtMs = 0;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const w = window as WindowWithWebkit;
      const AC = w.AudioContext ?? w.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private playCycle(id: string, volume: number): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const notes = PATTERNS[id] ?? PATTERNS[DEFAULT_ALARM_SOUND];
    const t0 = ctx.currentTime;
    for (const [freq, start, dur] of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.linearRampToValueAtTime(volume, t0 + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.05);
    }
  }

  /** Begin looping the tone, escalating from quiet to loud over ~30s. */
  start(id: string): void {
    this.stop();
    const sound = normalizeSound(id);
    this.startedAtMs = Date.now();
    const cycleMs = (CYCLE_SEC[sound] ?? 1.5) * 1000;
    const loop = () => {
      const elapsed = (Date.now() - this.startedAtMs) / 1000;
      const volume = Math.min(0.9, 0.15 + (elapsed / 30) * 0.75);
      this.playCycle(sound, volume);
      this.timer = setTimeout(loop, cycleMs);
    };
    loop();
  }

  /** Play a single cycle at a moderate volume — for the editor's preview. */
  preview(id: string): void {
    this.playCycle(normalizeSound(id), 0.5);
  }

  /** Stop the loop (keeps the AudioContext alive for reuse). */
  stop(): void {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Tear down the AudioContext entirely. */
  dispose(): void {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
  }
}
