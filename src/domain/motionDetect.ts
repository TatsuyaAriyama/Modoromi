import type { Movement } from './types';
import { MOVE_THRESHOLD, magnitude } from './motion';

/**
 * Platform-independent body-movement detection from a raw accelerometer stream.
 *
 * Both the live JS recorder and the native background recorders (iOS
 * CMSensorRecorder, Android foreground sensor service) ultimately produce a
 * stream of acceleration samples. Funnelling all of them through one tested
 * detector means the *algorithm* is identical everywhere — only the sample
 * source differs — so behaviour can't drift between iOS, Android and web.
 *
 * The detector is robust to two things a naïve threshold gets wrong:
 *  - Orientation / gravity: it estimates gravity with a time-aware low-pass
 *    filter and subtracts it, so a phone lying at any angle reads ~0 at rest
 *    and a slow re-tilt doesn't fire. (Samples that already exclude gravity —
 *    iOS `userAcceleration` — pass straight through, since the estimate stays
 *    near zero.)
 *  - Irregular sample rates: the filter coefficient is derived from each
 *    sample's actual dt, so 10 Hz batched data and 50 Hz live data behave the
 *    same.
 */

export interface RawSample {
  /** Timestamp in milliseconds (any consistent epoch; only deltas matter). */
  t: number;
  x: number;
  y: number;
  z: number;
}

export interface DetectConfig {
  /** Linear-acceleration magnitude (m/s²) above which a sample is movement. */
  threshold: number;
  /** Collapse a burst (one roll-over) into a single movement, in ms. */
  debounceMs: number;
  /** Gravity low-pass time constant (ms). Larger = slower to chase tilt. */
  gravityTauMs: number;
}

export const DEFAULT_DETECT: DetectConfig = {
  threshold: MOVE_THRESHOLD,
  debounceMs: 4000,
  gravityTauMs: 600,
};

/** Bound a sample dt so a long gap (sensor stall) can't distort the filter. */
const MAX_DT_MS = 1000;

/**
 * Streaming detector: feed it samples in time order; it returns a movement
 * timestamp (ms) when one is detected, else null. Stateful (keeps the gravity
 * estimate and debounce clock) so it suits a live listener; the batch helpers
 * below wrap it for recorded data and tests.
 */
export class MotionDetector {
  private gx = 0;
  private gy = 0;
  private gz = 0;
  private primed = false;
  private prevT = 0;
  private lastEventT = Number.NEGATIVE_INFINITY;

  constructor(private readonly cfg: DetectConfig = DEFAULT_DETECT) {}

  /** Push one sample; returns its movement magnitude when it fires, else null. */
  push(s: RawSample): number | null {
    if (!this.primed) {
      // Seed gravity with the first sample so we don't fire on startup.
      this.gx = s.x;
      this.gy = s.y;
      this.gz = s.z;
      this.primed = true;
      this.prevT = s.t;
      return null;
    }
    const dt = Math.min(MAX_DT_MS, Math.max(1, s.t - this.prevT));
    this.prevT = s.t;

    // Time-aware exponential low-pass → gravity estimate.
    const alpha = dt / (this.cfg.gravityTauMs + dt);
    this.gx += alpha * (s.x - this.gx);
    this.gy += alpha * (s.y - this.gy);
    this.gz += alpha * (s.z - this.gz);

    const mag = magnitude(s.x - this.gx, s.y - this.gy, s.z - this.gz);
    if (mag < this.cfg.threshold) return null;
    if (s.t - this.lastEventT < this.cfg.debounceMs) return null;
    this.lastEventT = s.t;
    return mag;
  }
}

/**
 * Detect movements from a recorded sample batch (e.g. an iOS CMSensorRecorder
 * read-back), returning {@link Movement}s keyed to minutes since `startMs`.
 * Pure given the inputs.
 */
export function detectMovements(
  samples: RawSample[],
  startMs: number,
  cfg: DetectConfig = DEFAULT_DETECT,
): Movement[] {
  const det = new MotionDetector(cfg);
  const out: Movement[] = [];
  for (const s of samples) {
    const mag = det.push(s);
    if (mag != null) {
      out.push({
        t: Math.max(0, Math.round((s.t - startMs) / 60000)),
        magnitude: Math.round(mag * 100) / 100,
      });
    }
  }
  return out;
}
