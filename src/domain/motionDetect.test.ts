import { describe, expect, it } from 'vitest';
import { DEFAULT_DETECT, detectMovements, type RawSample } from './motionDetect';

const G = 9.81;

/** Build a regular sample stream from a per-sample generator. */
function stream(
  n: number,
  hz: number,
  gen: (i: number, t: number) => { x: number; y: number; z: number },
  startMs = 0,
): RawSample[] {
  const dt = 1000 / hz;
  return Array.from({ length: n }, (_, i) => {
    const t = startMs + i * dt;
    return { t, ...gen(i, t) };
  });
}

describe('detectMovements — rest', () => {
  it('fires nothing when the phone lies still (gravity on Z)', () => {
    const s = stream(50 * 60, 1, () => ({ x: 0, y: 0, z: G }));
    expect(detectMovements(s, 0)).toEqual([]);
  });

  it('fires nothing at rest in any orientation (gravity on X)', () => {
    const s = stream(50 * 60, 1, () => ({ x: G, y: 0, z: 0 }));
    expect(detectMovements(s, 0)).toEqual([]);
  });

  it('ignores small sensor noise below threshold', () => {
    let seed = 1;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff - 0.5) * 0.6; // ±0.3 m/s², below 1.2
    };
    const s = stream(60 * 50, 50, () => ({ x: rand(), y: rand(), z: G + rand() }));
    expect(detectMovements(s, 0)).toEqual([]);
  });
});

describe('detectMovements — gravity tracking', () => {
  it('does not fire on a slow re-tilt (gravity migrates axes)', () => {
    // Over 20s, gravity rotates from +Z to +X. Each step is tiny.
    const n = 20 * 50;
    const s = stream(n, 50, (i) => {
      const a = (Math.PI / 2) * (i / (n - 1)); // 0 → 90°
      return { x: G * Math.sin(a), y: 0, z: G * Math.cos(a) };
    });
    expect(detectMovements(s, 0)).toEqual([]);
  });

  it('passes gravity-excluded input straight through (no false rest signal)', () => {
    // iOS userAcceleration: ~0 at rest, no gravity component.
    const s = stream(30 * 50, 50, () => ({ x: 0, y: 0, z: 0 }));
    expect(detectMovements(s, 0)).toEqual([]);
  });
});

describe('detectMovements — movement', () => {
  /** A still baseline with a sharp spike injected at sample `at`. */
  function withSpike(n: number, hz: number, at: number[], mag = 4): RawSample[] {
    return stream(n, hz, (i) =>
      at.includes(i)
        ? { x: mag, y: 0, z: G }
        : { x: 0, y: 0, z: G },
    );
  }

  it('detects a single roll-over as one movement', () => {
    const s = withSpike(30 * 50, 50, [10 * 50]);
    const m = detectMovements(s, 0);
    expect(m).toHaveLength(1);
    expect(m[0].magnitude).toBeGreaterThanOrEqual(DEFAULT_DETECT.threshold);
  });

  it('debounces a burst of jitter into a single movement', () => {
    // Ten spikes within ~0.2s — one physical roll-over.
    const at = Array.from({ length: 10 }, (_, k) => 10 * 50 + k);
    const s = withSpike(30 * 50, 50, at);
    expect(detectMovements(s, 0)).toHaveLength(1);
  });

  it('counts well-separated movements separately', () => {
    // Spikes 5s apart — beyond the 4s debounce → distinct events.
    const at = [5 * 50, 10 * 50, 15 * 50];
    const s = withSpike(20 * 50, 50, at);
    expect(detectMovements(s, 0)).toHaveLength(3);
  });

  it('keys movements to minutes since start', () => {
    // One spike at t = 7 minutes.
    const s = withSpike(10 * 60, 1, [7 * 60]); // 1 Hz, 10 min
    const m = detectMovements(s, 0);
    expect(m).toHaveLength(1);
    expect(m[0].t).toBe(7);
  });
});

describe('MotionDetector — sample rate independence', () => {
  it('treats 10 Hz and 50 Hz the same for the same physical event', () => {
    const spike10 = detectMovements(
      stream(10 * 10, 10, (i) => (i === 50 ? { x: 4, y: 0, z: G } : { x: 0, y: 0, z: G })),
      0,
    );
    const spike50 = detectMovements(
      stream(10 * 50, 50, (i) => (i === 250 ? { x: 4, y: 0, z: G } : { x: 0, y: 0, z: G })),
      0,
    );
    expect(spike10).toHaveLength(1);
    expect(spike50).toHaveLength(1);
  });

  it('survives an irregular stream with a long gap (clamped dt)', () => {
    const samples: RawSample[] = [
      { t: 0, x: 0, y: 0, z: G },
      { t: 100, x: 0, y: 0, z: G },
      { t: 60_000, x: 0, y: 0, z: G }, // a 60s stall — must not fire
      { t: 60_100, x: 4, y: 0, z: G }, // then a real spike
    ];
    const m = detectMovements(samples, 0);
    expect(m).toHaveLength(1);
    expect(m[0].t).toBe(1); // ~60s → minute 1
  });
});
