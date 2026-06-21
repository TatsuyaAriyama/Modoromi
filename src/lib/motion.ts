import { Motion } from '@capacitor/motion';
import type { Movement } from '../domain/types';
import { MotionDetector } from '../domain/motionDetect';

/**
 * Records body movements during a sleep session via the accelerometer.
 *
 * Subscribes to the device-motion stream and funnels every sample through the
 * shared {@link MotionDetector}, so the detection (gravity removal, threshold,
 * debounce) is byte-for-byte the same as the native background recorders. On
 * platforms without motion (most desktop browsers, or a denied iOS permission)
 * it records nothing and reports `sampleCount === 0`, which lets the caller
 * tell "tracked and still" apart from "never tracked".
 */
export class MotionRecorder {
  private movements: Movement[] = [];
  private detector = new MotionDetector();
  private startMs = 0;
  private samples = 0;
  private remove: (() => void) | null = null;

  /** Begin listening. Resolves true if the listener attached. */
  async start(): Promise<boolean> {
    this.startMs = Date.now();
    this.movements = [];
    this.detector = new MotionDetector();
    this.samples = 0;
    try {
      const handle = await Motion.addListener('accel', (event) => {
        // Prefer gravity-excluded acceleration; the detector copes with either.
        const a = event.acceleration ?? event.accelerationIncludingGravity;
        if (!a) return;
        this.samples += 1;
        const mag = this.detector.push({
          t: Date.now(),
          x: a.x ?? 0,
          y: a.y ?? 0,
          z: a.z ?? 0,
        });
        if (mag != null) {
          this.movements.push({
            t: Math.round((Date.now() - this.startMs) / 60000),
            magnitude: Math.round(mag * 100) / 100,
          });
        }
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

  /** Raw samples seen so far. 0 means the sensor never delivered any data. */
  get sampleCount(): number {
    return this.samples;
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
