import { describe, expect, it } from 'vitest';
import { detectMovements, type RawSample } from './motionDetect';

/**
 * Screen-off verification harness.
 *
 * We can't run the native recorders here, but we *can* verify the thing that
 * actually decides whether motion is captured screen-off: the detection
 * algorithm fed through a model of each platform's sample delivery. We
 * synthesise a night with known roll-over events, push it through per-platform
 * delivery models (continuous iOS, batched Android, and the failure modes —
 * screen-on-only and an OEM kill), then score how many true events survive.
 *
 * This is the executable half of the verify→implement loop: tighten the model
 * or the detector, re-run, and watch recall/precision against the thresholds.
 */

const G = 9.81;

/** Deterministic PRNG (mulberry32) so the synthetic night is reproducible. */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface NightOpts {
  durationMin: number;
  /** Minute marks where a body movement (roll-over) happens. */
  eventMins: number[];
  hz: number;
  seed?: number;
  /** Peak noise amplitude (m/s²), well under the 1.2 threshold. */
  noise?: number;
}

/**
 * A ground-truth night: gravity on Z, low baseline noise, and a ~0.6s
 * acceleration transient at each event minute (a smooth half-sine so it looks
 * like a real roll-over, not a single impulse).
 */
function simulateNight(o: NightOpts): RawSample[] {
  const rand = rng(o.seed ?? 1);
  const noise = o.noise ?? 0.3;
  const dtMs = 1000 / o.hz;
  const n = Math.round(o.durationMin * 60 * o.hz);
  const burstMs = 600;
  const out: RawSample[] = [];
  for (let i = 0; i < n; i++) {
    const t = i * dtMs;
    let x = (rand() - 0.5) * 2 * noise;
    let y = (rand() - 0.5) * 2 * noise;
    let z = G + (rand() - 0.5) * 2 * noise;
    for (const m of o.eventMins) {
      const start = m * 60000;
      if (t >= start && t < start + burstMs) {
        const p = (t - start) / burstMs; // 0..1
        const amp = (4 + rand() * 3) * Math.sin(Math.PI * p);
        x += amp;
        y += amp * 0.5;
      }
    }
    out.push({ t, x, y, z });
  }
  return out;
}

/** iOS coprocessor: every sample survives, screen on or off. */
function deliverContinuous(samples: RawSample[]): RawSample[] {
  return samples;
}

/**
 * Android foreground service: the accelerometer FIFO batches samples and the
 * system flushes before it overflows, so timestamps are preserved and nothing
 * is dropped under normal load. (Delivery order changes, but the detector keys
 * off timestamps, so the result is identical.)
 */
function deliverBatched(samples: RawSample[]): RawSample[] {
  return samples;
}

/** The old screen-on-only path: the stream dies when the screen locks. */
function deliverScreenOnly(samples: RawSample[], cutoffMin: number): RawSample[] {
  const cutoff = cutoffMin * 60000;
  return samples.filter((s) => s.t < cutoff);
}

/** An OEM battery manager kills the service partway through the night. */
function deliverUntilKilled(samples: RawSample[], killMin: number): RawSample[] {
  const kill = killMin * 60000;
  return samples.filter((s) => s.t < kill);
}

interface Score {
  recall: number;
  precision: number;
}

/** Match detected movement minutes against the true event minutes (±1 min). */
function score(detectedMin: number[], truthMin: number[], tol = 1): Score {
  const hit = (a: number, set: number[]) =>
    set.some((b) => Math.abs(a - b) <= tol);
  const recalled = truthMin.filter((e) => hit(e, detectedMin)).length;
  const precise = detectedMin.filter((d) => hit(d, truthMin)).length;
  return {
    recall: truthMin.length ? recalled / truthMin.length : 1,
    precision: detectedMin.length ? precise / detectedMin.length : 1,
  };
}

const EVENTS = [5, 14, 23, 32, 41, 50, 59, 68, 77, 86];
const DURATION = 90;

function run(
  deliver: (s: RawSample[]) => RawSample[],
  hz: number,
  seed = 7,
): Score {
  const night = simulateNight({ durationMin: DURATION, eventMins: EVENTS, hz, seed });
  const movements = detectMovements(deliver(night), 0);
  return score(movements.map((m) => m.t), EVENTS);
}

describe('screen-off detection — platform delivery models', () => {
  it('iOS coprocessor (50 Hz, continuous): catches the whole night', () => {
    const s = run((x) => deliverContinuous(x), 50);
    expect(s.recall).toBeGreaterThanOrEqual(0.95);
    expect(s.precision).toBeGreaterThanOrEqual(0.9);
  });

  it('Android foreground service (10 Hz, batched): catches the whole night', () => {
    const s = run((x) => deliverBatched(x), 10);
    expect(s.recall).toBeGreaterThanOrEqual(0.9);
    expect(s.precision).toBeGreaterThanOrEqual(0.9);
  });

  it('Android battery-saver low rate (5 Hz): still reliable', () => {
    const s = run((x) => deliverBatched(x), 5);
    expect(s.recall).toBeGreaterThanOrEqual(0.8);
  });

  it('stays robust across many random nights (50 Hz continuous)', () => {
    let worst = 1;
    for (let seed = 1; seed <= 20; seed++) {
      worst = Math.min(worst, run((x) => deliverContinuous(x), 50, seed).recall);
    }
    expect(worst).toBeGreaterThanOrEqual(0.9);
  });
});

describe('screen-off detection — failure modes (negative controls)', () => {
  it('screen-on-only loses almost the whole night (why background matters)', () => {
    const night = simulateNight({ durationMin: DURATION, eventMins: EVENTS, hz: 50 });
    // Screen sleeps a minute in — only the first event can be caught.
    const movements = detectMovements(deliverScreenOnly(night, 1), 0);
    const s = score(movements.map((m) => m.t), EVENTS);
    expect(s.recall).toBeLessThanOrEqual(0.2);
  });

  it('an OEM kill caps recall — every event up to the kill is caught, none after', () => {
    const killMin = 45;
    const night = simulateNight({ durationMin: DURATION, eventMins: EVENTS, hz: 10 });
    const movements = detectMovements(deliverUntilKilled(night, killMin), 0);
    const detected = movements.map((m) => m.t);

    const before = EVENTS.filter((e) => e < killMin);
    const after = EVENTS.filter((e) => e >= killMin);
    // Everything before the kill is captured…
    expect(score(detected, before).recall).toBeGreaterThanOrEqual(0.9);
    // …and nothing after (this is the residual Android risk a battery-
    // optimization exemption is meant to remove).
    expect(score(detected, after).recall).toBe(0);
  });
});
