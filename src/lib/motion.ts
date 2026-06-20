import { Motion } from '@capacitor/motion';
import type { Movement } from '../domain/types';
import { MOVE_THRESHOLD, magnitude } from '../domain/motion';

/** Collapse a burst of jitter from a single roll-over into one movement. */
const DEBOUNCE_MS = 4000;

/**
 * Records body movements during a sleep session via the accelerometer.
 *
 * Subscribes to gravity-excluded acceleration; when a sample exceeds
 * MOVE_THRESHOLD (and the debounce has elapsed) it appends a Movement keyed by
 * minutes since `start()`. On platforms without motion (most desktop browsers,
 * or a denied iOS permission) it simply records nothing — an empty array,
 * which the score treats as a perfectly still night.
 */
export class MotionRecorder {
  private movements: Movement[] = [];
  private startMs = 0;
  private lastMs = 0;
  private remove: (() => void) | null = null;

  /** Begin listening. Resolves true if the listener attached. */
  async start(): Promise<boolean> {
    this.startMs = Date.now();
    this.lastMs = 0;
    this.movements = [];
    try {
      const handle = await Motion.addListener('accel', (event) => {
        const a = event.acceleration ?? event.accelerationIncludingGravity;
        if (!a) return;
        const mag = magnitude(a.x ?? 0, a.y ?? 0, a.z ?? 0);
        if (mag < MOVE_THRESHOLD) return;
        const now = Date.now();
        if (now - this.lastMs < DEBOUNCE_MS) return;
        this.lastMs = now;
        this.movements.push({
          t: Math.round((now - this.startMs) / 60000),
          magnitude: Math.round(mag * 100) / 100,
        });
      });
      this.remove = () => void handle.remove();
      return true;
    } catch {
      this.remove = null;
      return false;
    }
  }

  /** Movements detected so far (live reference is fine; callers read length). */
  get current(): Movement[] {
    return this.movements;
  }

  /** Stop listening and return the collected movements. */
  stop(): Movement[] {
    if (this.remove) {
      this.remove();
      this.remove = null;
    }
    return this.movements;
  }
}

/**
 * iOS Safari gates DeviceMotion behind a user-gesture permission prompt.
 * Call this from a tap handler before starting a session in the browser.
 * On native and permissionless platforms it resolves true.
 */
export async function ensureMotionPermission(): Promise<boolean> {
  type MotionPerm = {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  const DME = (
    globalThis as unknown as { DeviceMotionEvent?: MotionPerm }
  ).DeviceMotionEvent;
  if (DME && typeof DME.requestPermission === 'function') {
    try {
      return (await DME.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}
