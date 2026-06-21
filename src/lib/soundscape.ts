/**
 * Ambient soundscapes for the pre-sleep wind-down, synthesised with the Web
 * Audio API so nothing needs bundling. Each preset is shaped noise — rain,
 * waves, a soft hush — meant to quieten the room and ease the mind toward
 * sleep. Foreground-only (started from a user gesture), like the alarm tones.
 */

export interface Soundscape {
  /** Stable id; the display label is resolved in the UI via `sound.<id>`. */
  id: string;
}

/** 'off' is a real option — silence is the gentle default. */
export const SOUNDSCAPES: Soundscape[] = [
  { id: 'off' },
  { id: 'rain' },
  { id: 'waves' },
  { id: 'hush' },
];

export const DEFAULT_SOUNDSCAPE = 'off';

type WindowWithWebkit = Window &
  typeof globalThis & { webkitAudioContext?: typeof AudioContext };

/** A few seconds of looping noise is plenty — the ear can't hear the seam. */
const NOISE_SECONDS = 4;

/** Fill a buffer with white noise. */
function fillWhite(data: Float32Array): void {
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

/** Brown (red) noise — integrated white, softer and deeper, like distant surf. */
function fillBrown(data: Float32Array): void {
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    data[i] = last * 3.5;
  }
}

/**
 * Plays a looping ambient soundscape with a gentle fade. Reuses one
 * AudioContext; building a preset tears down any previous graph first.
 */
export class SoundscapePlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private current: string | null = null;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const w = window as WindowWithWebkit;
      const AC = w.AudioContext ?? w.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private noiseSource(ctx: AudioContext, kind: 'white' | 'brown'): AudioBufferSourceNode {
    const buf = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
    const data = buf.getChannelData(0);
    if (kind === 'brown') fillBrown(data);
    else fillWhite(data);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  /** Build the per-preset graph and connect it to the (faded) master gain. */
  private build(ctx: AudioContext, id: string): void {
    const master = this.master as GainNode;
    if (id === 'rain') {
      // White noise, band-limited to a soft patter, with a slow shimmer.
      const src = this.noiseSource(ctx, 'white');
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 600;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7000;
      src.connect(hp);
      hp.connect(lp);
      lp.connect(master);
      src.start();
      this.sources.push(src);
    } else if (id === 'waves') {
      // Brown noise through a low filter, swelling with a slow LFO — surf.
      const src = this.noiseSource(ctx, 'brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      const swell = ctx.createGain();
      swell.gain.value = 0.6;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1; // ~10s swell
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.4;
      lfo.connect(lfoGain);
      lfoGain.connect(swell.gain);
      src.connect(lp);
      lp.connect(swell);
      swell.connect(master);
      src.start();
      lfo.start();
      this.sources.push(src, lfo);
    } else {
      // 'hush' — soft, steady low-passed noise. A quiet, even hush.
      const src = this.noiseSource(ctx, 'white');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1100;
      src.connect(lp);
      lp.connect(master);
      src.start();
      this.sources.push(src);
    }
  }

  private teardownSources(): void {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
      s.disconnect();
    }
    this.sources = [];
  }

  /** Start (or switch to) a soundscape. 'off' (or unknown) just stops. */
  start(id: string): void {
    if (id === this.current) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    this.teardownSources();
    if (id === 'off' || !SOUNDSCAPES.some((s) => s.id === id) || id === undefined) {
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      this.current = 'off';
      return;
    }
    this.build(ctx, id);
    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.linearRampToValueAtTime(0.5, now + 1.2);
    this.current = id;
  }

  /** Fade out and stop, keeping the context for reuse. */
  stop(): void {
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.linearRampToValueAtTime(0, now + 0.6);
    }
    // Let the fade play out before cutting the sources.
    setTimeout(() => this.teardownSources(), 700);
    this.current = null;
  }

  /** Tear down the AudioContext entirely. */
  dispose(): void {
    this.teardownSources();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
    this.current = null;
  }
}
